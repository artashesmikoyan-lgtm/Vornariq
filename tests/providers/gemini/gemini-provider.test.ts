import { describe, expect, it } from "vitest";

import {
  geminiProvider,
  GeminiProviderAdapter,
} from "../../../src/providers/gemini/index.js";
import {
  executionRequest,
  FakeGeminiClock,
  FakeGeminiProcessRunner,
  readFixture,
  workingDirectory,
} from "./test-support.js";

function createAdapter(
  processRunner: FakeGeminiProcessRunner,
  options?: {
    readonly sandbox?: boolean;
    readonly executable?: string;
  },
): GeminiProviderAdapter {
  return new GeminiProviderAdapter({
    workingDirectory,
    processRunner,
    clock: new FakeGeminiClock(),
    ...options,
  });
}

describe("Gemini provider adapter", () => {
  it("publishes truthful read-only provider metadata", () => {
    expect(geminiProvider).toEqual({
      schemaVersion: 1,
      id: "gemini",
      displayName: "Google Gemini CLI",
      capabilities: [
        "text-output",
        "local-repository-read",
        "structured-execution-events",
      ],
      metadata: {
        transport: "gemini-cli-stream-json",
        access: "read-only",
      },
    });
  });

  it("uses the configured cwd and delivers the full prompt over stdin", async () => {
    const runner = new FakeGeminiProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
    });

    await createAdapter(runner).execute(executionRequest);

    expect(runner.requests).toHaveLength(1);
    expect(runner.requests[0]?.executable).toBe("gemini");
    expect(runner.requests[0]?.cwd).toBe(workingDirectory);
    expect(runner.requests[0]?.args).toContain("default");
    expect(runner.requests[0]?.args).toContain("stream-json");
    expect(runner.requests[0]?.stdin).toContain(
      "Objective:\nReturn a deterministic read-only result.",
    );
    expect(runner.requests[0]?.stdin).toContain(
      "Do not modify repository files.",
    );
  });

  it("allows explicit sandbox and executable options", async () => {
    const runner = new FakeGeminiProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
    });

    await createAdapter(runner, {
      sandbox: true,
      executable: "gemini-custom",
    }).execute(executionRequest);

    expect(runner.requests[0]?.args).toContain("--sandbox");
    expect(runner.requests[0]?.executable).toBe("gemini-custom");
  });

  it("maps a completed stream to a successful ExecutionResult", async () => {
    const runner = new FakeGeminiProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
      result: { stderr: "diagnostic progress" },
    });

    const result = await createAdapter(runner).execute(executionRequest);

    expect(result).toMatchObject({
      schemaVersion: 1,
      id: "execution-gemini-001",
      taskId: "task-gemini-001",
      agentId: "agent-gemini-001",
      providerId: "gemini",
      status: "succeeded",
      createdAt: "2026-10-04T12:00:00.000Z",
      startedAt: "2026-10-04T12:00:00.000Z",
      completedAt: "2026-10-04T12:00:02.000Z",
      metrics: {
        durationMs: 1500,
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      },
      output: { message: "Vornariq task analyzed." },
      metadata: {
        transport: "gemini-cli-stream-json",
        sessionId: "session-test-001",
        model: "gemini-test-model",
      },
    });
    expect(JSON.stringify(result)).not.toContain("diagnostic progress");
    expect(JSON.stringify(result)).not.toContain("private reasoning");
  });

  it("does not fail successful runs because of warning events or stderr", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({
        stdout: readFixture("warning-run.jsonl"),
        result: { stderr: "non-fatal diagnostic" },
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "succeeded",
      output: { message: "The requested write was not performed." },
    });
    expect(JSON.stringify(result)).not.toContain("synthetic.txt");
    expect(JSON.stringify(result)).not.toContain("non-fatal diagnostic");
  });

  it("maps a missing executable without leaking spawn details", async () => {
    const spawnError = Object.assign(new Error("spawn secret-path ENOENT"), {
      code: "ENOENT",
    });
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ error: spawnError }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "GEMINI_NOT_AVAILABLE",
        message: "Gemini CLI executable could not be started.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("secret-path");
  });

  it("maps other spawn failures", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ error: new Error("spawn failed") }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_PROCESS_FAILED" },
    });
  });

  it("maps non-zero exit status even when the stream looks complete", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({
        stdout: readFixture("successful-run.jsonl"),
        result: { exitCode: 1, stderr: "safe diagnostic" },
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "GEMINI_PROCESS_FAILED",
        details: {
          exitCode: 1,
          stderrCaptured: true,
          stderrTruncated: false,
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("safe diagnostic");
  });

  it("maps terminal errors to sanitized turn failures", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ stdout: readFixture("failed-run.jsonl") }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "GEMINI_TURN_FAILED",
        details: {
          eventType: "error_event",
          providerCode: "TURN_FAILED",
        },
      },
      metadata: {
        sessionId: "session-test-002",
        model: "gemini-test-model",
      },
    });
    expect(JSON.stringify(result)).not.toContain("synthetic turn failed");
  });

  it("maps a terminal error result without a preceding error event", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({
        stdout: JSON.stringify({ type: "result", status: "error" }),
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "GEMINI_TURN_FAILED",
        details: { eventType: "result_error" },
      },
    });
  });

  it("maps policy denials without exposing provider diagnostics", async () => {
    const stdout = [
      JSON.stringify({
        type: "error",
        severity: "error",
        code: "POLICY_DENIED",
        message: "Tool blocked; fake-token-12345",
      }),
      JSON.stringify({ type: "result", status: "error" }),
    ].join("\n");
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ stdout }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_POLICY_DENIED" },
    });
    expect(JSON.stringify(result)).not.toContain("fake-token-12345");
  });

  it("maps authentication failures without persisting diagnostics", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({
        result: {
          exitCode: 1,
          stderr: "Authentication required; token=FAKE_SECRET_DO_NOT_PERSIST",
        },
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "GEMINI_AUTH_FAILED",
        message: "Gemini CLI authentication failed.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("FAKE_SECRET_DO_NOT_PERSIST");
  });

  it("recognizes structured authentication error codes", async () => {
    const stdout = [
      JSON.stringify({
        type: "error",
        severity: "error",
        code: "AUTHENTICATION_FAILED",
        message: "OAuth token fake-token-12345 was rejected.",
      }),
      JSON.stringify({ type: "result", status: "error" }),
    ].join("\n");
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ stdout }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_AUTH_FAILED" },
    });
    expect(JSON.stringify(result)).not.toContain("fake-token-12345");
  });

  it("maps malformed stream-json to a protocol failure", async () => {
    const result = await createAdapter(
      new FakeGeminiProcessRunner({
        stdout: readFixture("malformed-run.jsonl"),
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_PROTOCOL_ERROR" },
    });
  });

  it("requires a terminal result event", async () => {
    const stdout = [
      JSON.stringify({ type: "init", session_id: "session-test" }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: "partial",
        delta: true,
      }),
    ].join("\n");
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ stdout }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_PROTOCOL_ERROR" },
    });
  });

  it("requires a usable final assistant message", async () => {
    const stdout = JSON.stringify({ type: "result", status: "success" });
    const result = await createAdapter(
      new FakeGeminiProcessRunner({ stdout }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "GEMINI_NO_RESULT" },
    });
  });

  it("rejects invalid working directories and empty executables", () => {
    expect(
      () => new GeminiProviderAdapter({ workingDirectory: "relative/path" }),
    ).toThrow("absolute path");

    expect(
      () =>
        new GeminiProviderAdapter({
          workingDirectory,
          executable: "   ",
        }),
    ).toThrow("must not be empty");
  });
});
