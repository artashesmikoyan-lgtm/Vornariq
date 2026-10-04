import { describe, expect, it } from "vitest";

import {
  CodexJsonlParser,
  CodexProtocolError,
} from "../../../src/providers/codex/codex-jsonl.js";
import { readFixture } from "./test-support.js";

function parseFixture(name: string) {
  const parser = new CodexJsonlParser();
  for (const line of readFixture(name).trim().split(/\r?\n/)) {
    parser.acceptLine(line);
  }
  return parser.result();
}

describe("Codex JSONL parser", () => {
  it("captures thread ID, final message, completion, and portable usage", () => {
    expect(parseFixture("successful-run.jsonl")).toEqual({
      threadId: "thread-test-001",
      finalMessage: "Vornariq task completed.",
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
      turnCompleted: true,
    });
  });

  it("ignores unknown future event types", () => {
    expect(parseFixture("unknown-event.jsonl")).toMatchObject({
      threadId: "thread-test-004",
      finalMessage: "Unknown event tolerated.",
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      turnCompleted: true,
    });
  });

  it("captures turn.failed without exposing provider-local types to core", () => {
    expect(parseFixture("failed-turn.jsonl").failure).toEqual({
      kind: "turn_failed",
      code: "tool_failure",
      message: "The turn could not complete.",
    });
  });

  it("captures top-level error events", () => {
    expect(parseFixture("error-event.jsonl").failure).toEqual({
      kind: "error_event",
      message: "The provider reported an error.",
    });
  });

  it("rejects malformed JSONL", () => {
    const parser = new CodexJsonlParser();

    expect(() => {
      parser.acceptLine('{"type":');
    }).toThrow(CodexProtocolError);
  });

  it("rejects final messages beyond the configured bound", () => {
    const parser = new CodexJsonlParser(8);

    expect(() => {
      parser.acceptLine(
        JSON.stringify({
          type: "item.completed",
          item: { type: "agent_message", text: "more than eight bytes" },
        }),
      );
    }).toThrow("exceeded the configured limit");
  });

  it("does not treat reasoning items as final output", () => {
    const parser = new CodexJsonlParser();
    parser.acceptLine(
      JSON.stringify({
        type: "item.completed",
        item: { type: "reasoning", text: "private reasoning" },
      }),
    );

    expect(parser.result().finalMessage).toBeUndefined();
  });
});
