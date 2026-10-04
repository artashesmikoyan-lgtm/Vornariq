import type {
  GeminiParsedRun,
  GeminiStreamFailure,
  GeminiUsage,
} from "./gemini-types.js";

export const GEMINI_MAX_FINAL_MESSAGE_BYTES = 1024 * 1024;

type UnknownRecord = Record<string, unknown>;

export class GeminiProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiProtocolError";
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

function parseUsage(event: UnknownRecord): GeminiUsage | undefined {
  const stats = asRecord(event.stats);
  if (stats === undefined) {
    return undefined;
  }

  const inputTokens = readTokenCount(stats, "input_tokens");
  const outputTokens = readTokenCount(stats, "output_tokens");
  const totalTokens = readTokenCount(stats, "total_tokens");

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

export class GeminiStreamJsonParser {
  readonly #maxFinalMessageBytes: number;
  #sessionId: string | undefined;
  #model: string | undefined;
  #finalMessage: string | undefined;
  #usage: GeminiUsage | undefined;
  #terminalStatus: "success" | "error" | undefined;
  #failure: GeminiStreamFailure | undefined;
  #warningCount = 0;

  constructor(maxFinalMessageBytes = GEMINI_MAX_FINAL_MESSAGE_BYTES) {
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
      throw new GeminiProtocolError("Gemini CLI emitted malformed JSONL.");
    }

    const event = asRecord(parsed);
    const type = readString(event, "type");
    if (event === undefined || type === undefined) {
      throw new GeminiProtocolError(
        "Gemini CLI emitted an invalid stream-json event.",
      );
    }

    switch (type) {
      case "init":
        this.#sessionId = readString(event, "session_id");
        this.#model = readString(event, "model");
        break;
      case "message":
        this.#acceptMessage(event);
        break;
      case "error":
        this.#acceptError(event);
        break;
      case "result":
        this.#acceptResult(event);
        break;
      case "tool_use":
      case "tool_result":
        // Tool arguments and results are intentionally not retained.
        break;
      default:
        // Unknown event types are ignored for forward compatibility.
        break;
    }
  }

  result(): GeminiParsedRun {
    return {
      ...(this.#sessionId === undefined ? {} : { sessionId: this.#sessionId }),
      ...(this.#model === undefined ? {} : { model: this.#model }),
      ...(this.#finalMessage === undefined
        ? {}
        : { finalMessage: this.#finalMessage }),
      ...(this.#usage === undefined ? {} : { usage: this.#usage }),
      ...(this.#terminalStatus === undefined
        ? {}
        : { terminalStatus: this.#terminalStatus }),
      ...(this.#failure === undefined ? {} : { failure: this.#failure }),
      warningCount: this.#warningCount,
    };
  }

  #acceptMessage(event: UnknownRecord): void {
    if (readString(event, "role") !== "assistant") {
      return;
    }

    const content = readString(event, "content");
    if (content === undefined) {
      throw new GeminiProtocolError(
        "Gemini assistant message omitted text content.",
      );
    }

    this.#finalMessage =
      event.delta === true ? `${this.#finalMessage ?? ""}${content}` : content;

    if (
      Buffer.byteLength(this.#finalMessage, "utf8") > this.#maxFinalMessageBytes
    ) {
      throw new GeminiProtocolError(
        "Gemini final assistant message exceeded the configured limit.",
      );
    }
  }

  #acceptError(event: UnknownRecord): void {
    const severity = readString(event, "severity");
    if (severity === "warning") {
      this.#warningCount += 1;
      return;
    }

    if (severity !== "error") {
      throw new GeminiProtocolError(
        "Gemini error event used an unsupported severity.",
      );
    }

    const code = readString(event, "code");
    const message = readString(event, "message");
    this.#failure = {
      kind: "error_event",
      ...(code === undefined ? {} : { code }),
      ...(message === undefined ? {} : { message }),
    };
  }

  #acceptResult(event: UnknownRecord): void {
    const status = readString(event, "status");
    if (status !== "success" && status !== "error") {
      throw new GeminiProtocolError(
        "Gemini result event used an unsupported status.",
      );
    }

    this.#terminalStatus = status;
    this.#usage = parseUsage(event);
    if (status === "error" && this.#failure === undefined) {
      this.#failure = { kind: "result_error" };
    }
  }
}
