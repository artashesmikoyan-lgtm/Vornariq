import type {
  CodexFailure,
  CodexParsedRun,
  CodexUsage,
} from "./codex-types.js";

export const MAX_FINAL_MESSAGE_BYTES = 1024 * 1024;

type UnknownRecord = Record<string, unknown>;

export class CodexProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexProtocolError";
  }
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function readString(
  record: UnknownRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function readTokenCount(
  record: UnknownRecord | undefined,
  key: string,
): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function parseUsage(event: UnknownRecord): CodexUsage | undefined {
  const turn = asRecord(event.turn);
  const usage = asRecord(event.usage) ?? asRecord(turn?.usage);
  if (usage === undefined) {
    return undefined;
  }

  const inputTokens = readTokenCount(usage, "input_tokens");
  const outputTokens = readTokenCount(usage, "output_tokens");
  const reportedTotal = readTokenCount(usage, "total_tokens");
  const totalTokens =
    reportedTotal ??
    (inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined);

  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }

  return {
    ...(inputTokens === undefined ? {} : { inputTokens }),
    ...(outputTokens === undefined ? {} : { outputTokens }),
    ...(totalTokens === undefined ? {} : { totalTokens }),
  };
}

function parseFailure(
  event: UnknownRecord,
  kind: CodexFailure["kind"],
): CodexFailure {
  const error = asRecord(event.error);
  const errorText = typeof event.error === "string" ? event.error : undefined;
  const code = readString(error, "code");
  const message =
    readString(error, "message") ?? readString(event, "message") ?? errorText;

  return {
    kind,
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
  };
}

export class CodexJsonlParser {
  readonly #maxFinalMessageBytes: number;
  #threadId: string | undefined;
  #finalMessage: string | undefined;
  #usage: CodexUsage | undefined;
  #turnCompleted = false;
  #failure: CodexFailure | undefined;

  constructor(maxFinalMessageBytes = MAX_FINAL_MESSAGE_BYTES) {
    this.#maxFinalMessageBytes = maxFinalMessageBytes;
  }

  acceptLine(line: string): void {
    if (line.trim().length === 0) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      throw new CodexProtocolError("Codex emitted malformed JSONL.");
    }

    const event = asRecord(parsed);
    const type = readString(event, "type");
    if (event === undefined || type === undefined) {
      throw new CodexProtocolError("Codex emitted an invalid JSONL event.");
    }

    switch (type) {
      case "thread.started": {
        const threadId = readString(event, "thread_id");
        if (threadId === undefined) {
          throw new CodexProtocolError(
            "Codex thread.started event omitted thread_id.",
          );
        }
        this.#threadId = threadId;
        break;
      }
      case "item.completed": {
        const item = asRecord(event.item);
        if (readString(item, "type") !== "agent_message") {
          break;
        }

        const message = readString(item, "text");
        if (message === undefined) {
          throw new CodexProtocolError(
            "Codex agent_message item omitted final text.",
          );
        }
        if (Buffer.byteLength(message, "utf8") > this.#maxFinalMessageBytes) {
          throw new CodexProtocolError(
            "Codex final agent message exceeded the configured limit.",
          );
        }
        this.#finalMessage = message;
        break;
      }
      case "turn.completed":
        this.#turnCompleted = true;
        this.#usage = parseUsage(event);
        break;
      case "turn.failed":
        this.#failure = parseFailure(event, "turn_failed");
        break;
      case "error":
        this.#failure = parseFailure(event, "error_event");
        break;
      default:
        // Unknown event types are ignored for forward compatibility.
        break;
    }
  }

  result(): CodexParsedRun {
    return {
      ...(this.#threadId === undefined ? {} : { threadId: this.#threadId }),
      ...(this.#finalMessage === undefined
        ? {}
        : { finalMessage: this.#finalMessage }),
      ...(this.#usage === undefined ? {} : { usage: this.#usage }),
      turnCompleted: this.#turnCompleted,
      ...(this.#failure === undefined ? {} : { failure: this.#failure }),
    };
  }
}
