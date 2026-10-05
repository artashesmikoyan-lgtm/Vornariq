import { isAbsolute } from "node:path";
import { performance } from "node:perf_hooks";

import type {
  ExecutionError,
  ExecutionMetrics,
  ExecutionResult,
  JsonObject,
  ProviderAdapter,
  ProviderExecutionRequest,
} from "../../core/contracts/index.js";
import { buildGeminiPrompt } from "./gemini-prompt.js";
import {
  buildGeminiExecArgs,
  NodeGeminiProcessRunner,
} from "./gemini-process.js";
import type {
  GeminiProcessResult,
  GeminiProcessRunner,
} from "./gemini-process.js";
import {
  GeminiProtocolError,
  GeminiStreamJsonParser,
} from "./gemini-stream-json.js";
import { geminiProvider } from "./gemini-types.js";
import type { GeminiParsedRun, GeminiUsage } from "./gemini-types.js";

export interface GeminiClock {
  now(): Date;
  monotonicNow(): number;
}

export interface GeminiProviderOptions {
  readonly workingDirectory: string;
  readonly sandbox?: boolean;
  readonly executable?: string;
  readonly processRunner?: GeminiProcessRunner;
  readonly clock?: GeminiClock;
}

const systemClock: GeminiClock = {
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

function isMissingExecutableError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isAuthenticationFailure(
  ...diagnostics: (string | undefined)[]
): boolean {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic !== undefined &&
      /(?:^|[^a-z0-9])(?:oauth|credentials?|auth(?:entication|orization)?|unauthorized|not logged in|login(?: required)?|log in|sign in|401)(?:$|[^a-z0-9])/i.test(
        diagnostic,
      ),
  );
}

function isPolicyDenied(...diagnostics: (string | undefined)[]): boolean {
  return diagnostics.some(
    (diagnostic) =>
      diagnostic !== undefined &&
      /(?:policy|approval|tool).*(?:denied|blocked)|(?:denied|blocked).*(?:policy|approval|tool)|untrusted|folder trust/i.test(
        diagnostic,
      ),
  );
}

function mapUsage(
  durationMs: number,
  usage: GeminiUsage | undefined,
): ExecutionMetrics {
  return {
    durationMs,
    ...(usage?.inputTokens === undefined
      ? {}
      : { inputTokens: usage.inputTokens }),
    ...(usage?.outputTokens === undefined
      ? {}
      : { outputTokens: usage.outputTokens }),
    ...(usage?.totalTokens === undefined
      ? {}
      : { totalTokens: usage.totalTokens }),
  };
}

function processDetails(
  result: GeminiProcessResult,
): Record<string, string | number | boolean | null> {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    stderrCaptured: result.stderr.length > 0,
    stderrTruncated: result.stderrTruncated,
  };
}

function resultMetadata(parsed?: GeminiParsedRun): JsonObject {
  return {
    transport: "gemini-cli-stream-json",
    ...(parsed?.sessionId === undefined ? {} : { sessionId: parsed.sessionId }),
    ...(parsed?.model === undefined ? {} : { model: parsed.model }),
  };
}

function failure(
  request: ProviderExecutionRequest,
  timestamps: {
    readonly createdAt: string;
    readonly startedAt: string;
    readonly completedAt: string;
  },
  metrics: ExecutionMetrics,
  error: ExecutionError,
  metadata: JsonObject,
): ExecutionResult {
  return {
    schemaVersion: 1,
    id: request.executionId,
    taskId: request.task.id,
    agentId: request.agent.id,
    providerId: geminiProvider.id,
    status: "failed",
    ...timestamps,
    metrics,
    error,
    metadata,
  };
}

export class GeminiProviderAdapter implements ProviderAdapter {
  readonly provider = geminiProvider;
  readonly #workingDirectory: string;
  readonly #sandbox: boolean;
  readonly #executable: string;
  readonly #processRunner: GeminiProcessRunner;
  readonly #clock: GeminiClock;

  constructor(options: GeminiProviderOptions) {
    if (
      options.workingDirectory.trim().length === 0 ||
      !isAbsolute(options.workingDirectory)
    ) {
      throw new TypeError(
        "Gemini workingDirectory must be a non-empty absolute path.",
      );
    }

    const executable = options.executable ?? "gemini";
    if (executable.trim().length === 0) {
      throw new TypeError("Gemini executable must not be empty.");
    }

    this.#workingDirectory = options.workingDirectory;
    this.#sandbox = options.sandbox ?? false;
    this.#executable = executable;
    this.#processRunner =
      options.processRunner ?? new NodeGeminiProcessRunner();
    this.#clock = options.clock ?? systemClock;
  }

  async execute(request: ProviderExecutionRequest): Promise<ExecutionResult> {
    const parser = new GeminiStreamJsonParser();
    const createdAt = this.#clock.now().toISOString();
    const startedAt = createdAt;
    const monotonicStart = this.#clock.monotonicNow();
    let processResult: GeminiProcessResult;

    try {
      processResult = await this.#processRunner.run({
        executable: this.#executable,
        args: buildGeminiExecArgs({ sandbox: this.#sandbox }),
        cwd: this.#workingDirectory,
        stdin: buildGeminiPrompt(request.task, request.agent),
        onStdoutLine: (line) => {
          parser.acceptLine(line);
        },
      });
    } catch (error) {
      const completedAt = this.#clock.now().toISOString();
      const metrics = mapUsage(
        Math.max(0, Math.round(this.#clock.monotonicNow() - monotonicStart)),
        undefined,
      );
      const timestamps = { createdAt, startedAt, completedAt };

      if (isMissingExecutableError(error)) {
        return failure(
          request,
          timestamps,
          metrics,
          {
            code: "GEMINI_NOT_AVAILABLE",
            message: "Gemini CLI executable could not be started.",
            retryable: false,
          },
          resultMetadata(),
        );
      }

      return failure(
        request,
        timestamps,
        metrics,
        {
          code:
            error instanceof GeminiProtocolError
              ? "GEMINI_PROTOCOL_ERROR"
              : "GEMINI_PROCESS_FAILED",
          message:
            error instanceof GeminiProtocolError
              ? error.message
              : "Gemini CLI process could not be completed.",
          retryable: false,
        },
        resultMetadata(),
      );
    }

    const completedAt = this.#clock.now().toISOString();
    const parsed = parser.result();
    const durationMs = Math.max(
      0,
      Math.round(this.#clock.monotonicNow() - monotonicStart),
    );
    const metrics = mapUsage(durationMs, parsed.usage);
    const timestamps = { createdAt, startedAt, completedAt };
    const metadata = resultMetadata(parsed);
    const terminalFailure = this.#terminalFailure(parsed, processResult);

    if (terminalFailure !== undefined) {
      return failure(request, timestamps, metrics, terminalFailure, metadata);
    }

    const finalMessage = parsed.finalMessage;
    if (finalMessage === undefined || finalMessage.trim().length === 0) {
      return failure(
        request,
        timestamps,
        metrics,
        {
          code: "GEMINI_NO_RESULT",
          message: "Gemini completed without a final assistant message.",
          retryable: false,
        },
        metadata,
      );
    }

    return {
      schemaVersion: 1,
      id: request.executionId,
      taskId: request.task.id,
      agentId: request.agent.id,
      providerId: geminiProvider.id,
      status: "succeeded",
      ...timestamps,
      metrics,
      output: { message: finalMessage },
      metadata,
    };
  }

  #terminalFailure(
    parsed: GeminiParsedRun,
    processResult: GeminiProcessResult,
  ): ExecutionError | undefined {
    if (
      isAuthenticationFailure(
        parsed.failure?.code,
        parsed.failure?.message,
        processResult.stderr,
      )
    ) {
      return {
        code: "GEMINI_AUTH_FAILED",
        message: "Gemini CLI authentication failed.",
        retryable: false,
      };
    }

    if (
      isPolicyDenied(
        parsed.failure?.code,
        parsed.failure?.message,
        processResult.stderr,
      )
    ) {
      return {
        code: "GEMINI_POLICY_DENIED",
        message: "Gemini CLI denied an operation under its approval policy.",
        retryable: false,
      };
    }

    if (parsed.failure !== undefined || parsed.terminalStatus === "error") {
      return {
        code: "GEMINI_TURN_FAILED",
        message: "The Gemini turn failed.",
        retryable: false,
        details: {
          eventType: parsed.failure?.kind ?? "result_error",
        },
      };
    }

    if (processResult.exitCode !== 0) {
      return {
        code: "GEMINI_PROCESS_FAILED",
        message: "Gemini CLI exited without successful completion.",
        retryable: false,
        details: processDetails(processResult),
      };
    }

    if (parsed.terminalStatus === undefined) {
      return {
        code: "GEMINI_PROTOCOL_ERROR",
        message: "Gemini CLI did not emit a terminal result event.",
        retryable: false,
      };
    }

    return undefined;
  }
}
