import { describe, expect, it } from "vitest";

import {
  GeminiProtocolError,
  GeminiStreamJsonParser,
} from "../../../src/providers/gemini/gemini-stream-json.js";
import { readFixture } from "./test-support.js";

function parseFixture(name: string) {
  const parser = new GeminiStreamJsonParser();
  for (const line of readFixture(name).trim().split(/\r?\n/)) {
    parser.acceptLine(line);
  }
  return parser.result();
}

describe("Gemini stream-json parser", () => {
  it("captures init metadata, assistant deltas, terminal status, and usage", () => {
    expect(parseFixture("successful-run.jsonl")).toEqual({
      sessionId: "session-test-001",
      model: "gemini-test-model",
      finalMessage: "Vornariq task analyzed.",
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
      terminalStatus: "success",
      warningCount: 0,
    });
  });

  it("captures terminal errors without exposing raw tool events", () => {
    expect(parseFixture("failed-run.jsonl")).toEqual({
      sessionId: "session-test-002",
      model: "gemini-test-model",
      usage: {
        inputTokens: 20,
        outputTokens: 0,
        totalTokens: 20,
      },
      terminalStatus: "error",
      failure: {
        kind: "error_event",
        code: "TURN_FAILED",
        message: "The synthetic turn failed.",
      },
      warningCount: 0,
    });
  });

  it("allows warning events and discards tool arguments and results", () => {
    const result = parseFixture("warning-run.jsonl");

    expect(result).toMatchObject({
      finalMessage: "The requested write was not performed.",
      terminalStatus: "success",
      warningCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain("synthetic.txt");
    expect(JSON.stringify(result)).not.toContain("must not be retained");
  });

  it("ignores unknown future event types", () => {
    expect(parseFixture("unknown-event.jsonl")).toMatchObject({
      sessionId: "session-test-004",
      finalMessage: "Unknown event tolerated.",
      terminalStatus: "success",
    });
  });

  it("replaces a complete assistant message and ignores user echoes", () => {
    const parser = new GeminiStreamJsonParser();
    parser.acceptLine(
      JSON.stringify({ type: "message", role: "user", content: "ignore" }),
    );
    parser.acceptLine(
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "partial",
        delta: true,
      }),
    );
    parser.acceptLine(
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "complete",
        delta: false,
      }),
    );

    expect(parser.result().finalMessage).toBe("complete");
  });

  it("rejects malformed JSONL and invalid event shapes", () => {
    const malformed = new GeminiStreamJsonParser();
    expect(() => {
      for (const line of readFixture("malformed-run.jsonl")
        .trim()
        .split(/\r?\n/)) {
        malformed.acceptLine(line);
      }
    }).toThrow(GeminiProtocolError);

    const invalid = new GeminiStreamJsonParser();
    expect(() => {
      invalid.acceptLine(JSON.stringify({ role: "assistant" }));
    }).toThrow("invalid stream-json event");
  });

  it("rejects assistant output beyond the configured bound", () => {
    const parser = new GeminiStreamJsonParser(8);

    expect(() => {
      parser.acceptLine(
        JSON.stringify({
          type: "message",
          role: "assistant",
          content: "more than eight bytes",
          delta: true,
        }),
      );
    }).toThrow("exceeded the configured limit");
  });
});
