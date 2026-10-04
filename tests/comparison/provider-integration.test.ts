import { describe, expect, it } from "vitest";

import { ComparisonRunner } from "../../src/comparison/index.js";
import { CodexProviderAdapter } from "../../src/providers/codex/index.js";
import { GeminiProviderAdapter } from "../../src/providers/gemini/index.js";
import {
  FakeCodexClock,
  FakeCodexProcessRunner,
  readFixture as readCodexFixture,
  workingDirectory as codexWorkingDirectory,
} from "../providers/codex/test-support.js";
import {
  FakeGeminiClock,
  FakeGeminiProcessRunner,
  readFixture as readGeminiFixture,
  workingDirectory as geminiWorkingDirectory,
} from "../providers/gemini/test-support.js";
import { agent, IncrementingComparisonClock, task } from "./test-support.js";

describe("ComparisonRunner provider integration", () => {
  it("runs real Codex and Gemini adapters through deterministic process seams", async () => {
    const codexRunner = new FakeCodexProcessRunner({
      stdout: readCodexFixture("successful-run.jsonl"),
    });
    const geminiRunner = new FakeGeminiProcessRunner({
      stdout: readGeminiFixture("successful-run.jsonl"),
    });
    const codex = new CodexProviderAdapter({
      workingDirectory: codexWorkingDirectory,
      processRunner: codexRunner,
      clock: new FakeCodexClock(),
    });
    const gemini = new GeminiProviderAdapter({
      workingDirectory: geminiWorkingDirectory,
      processRunner: geminiRunner,
      clock: new FakeGeminiClock(),
    });

    const report = await new ComparisonRunner(
      new IncrementingComparisonClock(),
    ).run({
      schemaVersion: 1,
      id: "comparison-real-adapters-001",
      task,
      agent,
      participants: [{ adapter: codex }, { adapter: gemini }],
    });

    expect(report.runs.map((run) => [run.providerId, run.status])).toEqual([
      ["codex", "succeeded"],
      ["gemini", "succeeded"],
    ]);
    expect(codexRunner.requests).toHaveLength(1);
    expect(geminiRunner.requests).toHaveLength(1);
    expect(codexRunner.requests[0]?.stdin).toContain(task.objective);
    expect(geminiRunner.requests[0]?.stdin).toContain(task.objective);
  });
});
