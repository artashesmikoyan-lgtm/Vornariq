import { describe, expect, it } from "vitest";

import {
  codexProvider,
  CodexProviderAdapter,
} from "../../../src/providers/codex/index.js";
import {
  executionRequest,
  FakeCodexClock,
  FakeCodexProcessRunner,
  readFixture,
  workingDirectory,
} from "./test-support.js";

function createAdapter(
  processRunner: FakeCodexProcessRunner,
  options?: {
    readonly sandbox?: "read-only" | "workspace-write";
    readonly executable?: string;
  },
): CodexProviderAdapter {
  return new CodexProviderAdapter({
    workingDirectory,
    processRunner,
    clock: new FakeCodexClock(),
    ...options,
  });
}

describe("Codex provider adapter", () => {
  it("publishes honest provider metadata", () => {
    expect(codexProvider).toEqual({
      schemaVersion: 1,
      id: "codex",
      displayName: "OpenAI Codex CLI",
      capabilities: ["text-output", "local-repository"],
      metadata: { transport: "codex-exec-jsonl" },
    });
  });

  it("defaults to read-only and delivers the prompt over stdin", async () => {
    const runner = new FakeCodexProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
    });

    await createAdapter(runner).execute(executionRequest);

    expect(runner.requests).toHaveLength(1);
    expect(runner.requests[0]?.executable).toBe("codex");
    expect(runner.requests[0]?.args).toContain("read-only");
    expect(runner.requests[0]?.args.at(-1)).toBe("-");
    expect(runner.requests[0]?.stdin).toContain(
      "Objective:\nReturn a deterministic result.",
    );
  });

  it("uses workspace-write only when explicitly selected", async () => {
    const runner = new FakeCodexProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
    });

    await createAdapter(runner, { sandbox: "workspace-write" }).execute(
      executionRequest,
    );

    expect(runner.requests[0]?.args).toContain("workspace-write");
  });

  it("allows an explicit executable override", async () => {
    const runner = new FakeCodexProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
    });

    await createAdapter(runner, { executable: "codex-custom" }).execute(
      executionRequest,
    );

    expect(runner.requests[0]?.executable).toBe("codex-custom");
  });

  it("maps a completed run to a successful ExecutionResult", async () => {
    const runner = new FakeCodexProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
      result: { stderr: "diagnostic progress" },
    });

    const result = await createAdapter(runner).execute(executionRequest);

    expect(result).toMatchObject({
      schemaVersion: 1,
      id: "execution-codex-001",
      taskId: "task-codex-001",
      agentId: "agent-codex-001",
      providerId: "codex",
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
      output: {
        message: "Vornariq task completed.",
        threadId: "thread-test-001",
      },
    });
  });

  it("maps a missing executable without leaking spawn details", async () => {
    const spawnError = Object.assign(new Error("spawn secret-path ENOENT"), {
      code: "ENOENT",
    });
    const result = await createAdapter(
      new FakeCodexProcessRunner({ error: spawnError }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "CODEX_NOT_AVAILABLE",
        message: "Codex CLI executable could not be started.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("secret-path");
  });

  it("maps other spawn failures", async () => {
    const result = await createAdapter(
      new FakeCodexProcessRunner({ error: new Error("spawn failed") }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "CODEX_PROCESS_FAILED" },
    });
  });

  it("maps non-zero exit status even when JSONL looks complete", async () => {
    const runner = new FakeCodexProcessRunner({
      stdout: readFixture("successful-run.jsonl"),
      result: { exitCode: 2, stderr: "safe diagnostic" },
    });

    const result = await createAdapter(runner).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "CODEX_PROCESS_FAILED",
        details: {
          exitCode: 2,
          stderrCaptured: true,
          stderrTruncated: false,
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("safe diagnostic");
  });

  it("maps turn.failed and error events to sanitized failures", async () => {
    for (const fixture of ["failed-turn.jsonl", "error-event.jsonl"]) {
      const result = await createAdapter(
        new FakeCodexProcessRunner({ stdout: readFixture(fixture) }),
      ).execute(executionRequest);

      expect(result).toMatchObject({
        status: "failed",
        error: { code: "CODEX_TURN_FAILED" },
      });
    }
  });

  it("maps authentication diagnostics without preserving raw stderr", async () => {
    const runner = new FakeCodexProcessRunner({
      result: {
        exitCode: 1,
        stderr: "Authentication required; token=do-not-persist",
      },
    });

    const result = await createAdapter(runner).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "CODEX_AUTH_FAILED",
        message: "Codex CLI authentication failed.",
      },
    });
    expect(JSON.stringify(result)).not.toContain("do-not-persist");
  });

  it("maps malformed JSONL to a protocol failure", async () => {
    const result = await createAdapter(
      new FakeCodexProcessRunner({ stdout: '{"type":' }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "CODEX_PROTOCOL_ERROR" },
    });
  });

  it("requires terminal completion", async () => {
    const result = await createAdapter(
      new FakeCodexProcessRunner({
        stdout:
          '{"type":"item.completed","item":{"type":"agent_message","text":"partial"}}',
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "CODEX_PROTOCOL_ERROR" },
    });
  });

  it("maps empty protocol output to a terminal-completion failure", async () => {
    const result = await createAdapter(new FakeCodexProcessRunner()).execute(
      executionRequest,
    );

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "CODEX_PROTOCOL_ERROR" },
    });
  });

  it("requires a completed final agent message", async () => {
    const result = await createAdapter(
      new FakeCodexProcessRunner({
        stdout: '{"type":"turn.completed"}',
      }),
    ).execute(executionRequest);

    expect(result).toMatchObject({
      status: "failed",
      error: { code: "CODEX_NO_RESULT" },
    });
  });

  it("rejects relative working directories and unsupported sandboxes", () => {
    expect(
      () =>
        new CodexProviderAdapter({
          workingDirectory: "relative/path",
        }),
    ).toThrow("absolute path");

    expect(
      () =>
        new CodexProviderAdapter({
          workingDirectory,
          sandbox: "danger-full-access" as "read-only",
        }),
    ).toThrow("read-only or workspace-write");
  });
});
