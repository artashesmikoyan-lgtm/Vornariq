import { isAbsolute } from "node:path";
import { performance } from "node:perf_hooks";

import type {
  ExecutionError,
  ExecutionMetrics,
  ExecutionResult,
  ProviderAdapter,
  ProviderExecutionRequest,
} from "../../core/contracts/index.js";
import { CodexJsonlParser, CodexProtocolError } from "./codex-jsonl.js";
import { buildCodexPrompt } from "./codex-prompt.js";
import { buildCodexExecArgs, NodeCodexProcessRunner } from "./codex-process.js";
import type {
  CodexProcessResult,
  CodexProcessRunner,
} from "./codex-process.js";
import { codexProvider } from "./codex-types.js";
import type {
  CodexFailure,
  CodexParsedRun,
  CodexSandboxMode,
  CodexUsage,
} from "./codex-types.js";

export interface CodexClock {
  now(): Date;
  monotonicNow(): number;
}

export interface CodexProviderOptions {
  readonly workingDirectory: string;
  readonly sandbox?: CodexSandboxMode;
  readonly executable?: string;
  readonly processRunner?: CodexProcessRunner;
  readonly clock?: CodexClock;
}

const systemClock: CodexClock = {
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

function isSupportedSandbox(value: string): value is CodexSandboxMode {
  return value === "read-only" || value === "workspace-write";
}

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
      /\b(auth(?:entication|orization)?|unauthorized|not logged in|login required|401)\b/i.test(
        diagnostic,
      ),
  );
}

function mapUsage(
  durationMs: number,
  usage: CodexUsage | undefined,
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
  result: CodexProcessResult,
): Record<string, string | number | boolean | null> {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    stderrCaptured: result.stderr.length > 0,
    stderrTruncated: result.stderrTruncated,
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
): ExecutionResult {
  return {
    schemaVersion: 1,
    id: request.executionId,
    taskId: request.task.id,
    agentId: request.agent.id,
    providerId: codexProvider.id,
    status: "failed",
    ...timestamps,
    metrics,
    error,
  };
}

function mapCodexFailure(
  codexFailure: CodexFailure,
  stderr: string,
): ExecutionError {
  if (
    isAuthenticationFailure(codexFailure.message, codexFailure.code, stderr)
  ) {
    return {
      code: "CODEX_AUTH_FAILED",
      message: "Codex CLI authentication failed.",
      retryable: false,
    };
  }

  return {
    code: "CODEX_TURN_FAILED",
    message:
      codexFailure.kind === "error_event"
        ? "Codex reported an execution error."
        : "The Codex turn failed.",
    retryable: false,
    details: {
      eventType: codexFailure.kind,
    },
  };
}

export class CodexProviderAdapter implements ProviderAdapter {
  readonly provider = codexProvider;
  readonly #workingDirectory: string;
  readonly #sandbox: CodexSandboxMode;
  readonly #executable: string;
  readonly #processRunner: CodexProcessRunner;
  readonly #clock: CodexClock;

  constructor(options: CodexProviderOptions) {
    if (
      options.workingDirectory.trim().length === 0 ||
      !isAbsolute(options.workingDirectory)
    ) {
      throw new TypeError(
        "Codex workingDirectory must be a non-empty absolute path.",
      );
    }

    const sandbox = options.sandbox ?? "read-only";
    if (!isSupportedSandbox(sandbox)) {
      throw new TypeError(
        "Codex sandbox must be read-only or workspace-write.",
      );
    }

    const executable = options.executable ?? "codex";
    if (executable.trim().length === 0) {
      throw new TypeError("Codex executable must not be empty.");
    }

    this.#workingDirectory = options.workingDirectory;
    this.#sandbox = sandbox;
    this.#executable = executable;
    this.#processRunner = options.processRunner ?? new NodeCodexProcessRunner();
    this.#clock = options.clock ?? systemClock;
  }

  async execute(request: ProviderExecutionRequest): Promise<ExecutionResult> {
    const parser = new CodexJsonlParser();
    const createdAt = this.#clock.now().toISOString();
    const startedAt = createdAt;
    const monotonicStart = this.#clock.monotonicNow();
    let processResult: CodexProcessResult;

    try {
      processResult = await this.#processRunner.run({
        executable: this.#executable,
        args: buildCodexExecArgs({
          sandbox: this.#sandbox,
          workingDirectory: this.#workingDirectory,
        }),
        cwd: this.#workingDirectory,
        stdin: buildCodexPrompt(request.task, request.agent),
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

      if (isMissingExecutableError(error)) {
        return failure(
          request,
          { createdAt, startedAt, completedAt },
          metrics,
          {
            code: "CODEX_NOT_AVAILABLE",
            message: "Codex CLI executable could not be started.",
            retryable: false,
          },
        );
      }

      return failure(request, { createdAt, startedAt, completedAt }, metrics, {
        code:
          error instanceof CodexProtocolError
            ? "CODEX_PROTOCOL_ERROR"
            : "CODEX_PROCESS_FAILED",
        message:
          error instanceof CodexProtocolError
            ? error.message
            : "Codex CLI process could not be completed.",
        retryable: false,
      });
    }

    const completedAt = this.#clock.now().toISOString();
    const parsed = parser.result();
    const durationMs = Math.max(
      0,
      Math.round(this.#clock.monotonicNow() - monotonicStart),
    );
    const metrics = mapUsage(durationMs, parsed.usage);
    const timestamps = { createdAt, startedAt, completedAt };

    const terminalFailure = this.#terminalFailure(parsed, processResult);
    if (terminalFailure !== undefined) {
      return failure(request, timestamps, metrics, terminalFailure);
    }

    const finalMessage = parsed.finalMessage;
    if (finalMessage === undefined) {
      return failure(request, timestamps, metrics, {
        code: "CODEX_NO_RESULT",
        message: "Codex completed without a final agent message.",
        retryable: false,
      });
    }

    return {
      schemaVersion: 1,
      id: request.executionId,
      taskId: request.task.id,
      agentId: request.agent.id,
      providerId: codexProvider.id,
      status: "succeeded",
      ...timestamps,
      metrics,
      output: {
        message: finalMessage,
        ...(parsed.threadId === undefined ? {} : { threadId: parsed.threadId }),
      },
      metadata: {
        transport: "codex-exec-jsonl",
      },
    };
  }

  #terminalFailure(
    parsed: CodexParsedRun,
    processResult: CodexProcessResult,
  ): ExecutionError | undefined {
    if (
      isAuthenticationFailure(
        parsed.failure?.message,
        parsed.failure?.code,
        processResult.stderr,
      )
    ) {
      return {
        code: "CODEX_AUTH_FAILED",
        message: "Codex CLI authentication failed.",
        retryable: false,
      };
    }

    if (parsed.failure !== undefined) {
      return mapCodexFailure(parsed.failure, processResult.stderr);
    }

    if (processResult.exitCode !== 0) {
      return {
        code: "CODEX_PROCESS_FAILED",
        message: "Codex CLI exited without successful completion.",
        retryable: false,
        details: processDetails(processResult),
      };
    }

    if (!parsed.turnCompleted) {
      return {
        code: "CODEX_PROTOCOL_ERROR",
        message: "Codex did not emit a terminal turn.completed event.",
        retryable: false,
      };
    }

    return undefined;
  }
}
