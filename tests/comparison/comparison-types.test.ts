import { describe, expect, it } from "vitest";

import { ComparisonRunner } from "../../src/comparison/index.js";
import type {
  ExecutionResult,
  ProviderAdapter,
  ProviderExecutionRequest,
} from "../../src/core/contracts/index.js";
import { agent, IncrementingComparisonClock, task } from "./test-support.js";

function adapter(providerId: string, result: "succeeded" | "failed") {
  return {
    provider: {
      schemaVersion: 1,
      id: providerId,
      displayName: providerId,
      capabilities: ["text-output"],
      metadata: { nested: { providerId } },
    },
    execute(request: ProviderExecutionRequest): Promise<ExecutionResult> {
      if (result === "failed") {
        return Promise.resolve({
          schemaVersion: 1,
          id: request.executionId,
          taskId: request.task.id,
          agentId: request.agent.id,
          providerId,
          status: "failed",
          createdAt: "2026-10-04T12:00:00.000Z",
          completedAt: "2026-10-04T12:00:01.000Z",
          error: {
            code: "PROVIDER_FAILED",
            message: "Provider failed safely.",
            retryable: false,
            details: { nested: { safe: true } },
          },
        });
      }

      return Promise.resolve({
        schemaVersion: 1,
        id: request.executionId,
        taskId: request.task.id,
        agentId: request.agent.id,
        providerId,
        status: "succeeded",
        createdAt: "2026-10-04T12:00:00.000Z",
        startedAt: "2026-10-04T12:00:00.000Z",
        completedAt: "2026-10-04T12:00:01.000Z",
        metrics: { durationMs: 10, totalTokens: 5 },
        output: { nested: { safe: true } },
        metadata: { nested: { providerId } },
      });
    },
  } satisfies ProviderAdapter;
}

describe("ComparisonReport", () => {
  it.each([
    ["succeeded", "succeeded"],
    ["succeeded", "failed"],
    ["failed", "failed"],
  ] as const)(
    "round-trips %s plus %s evidence through JSON",
    async (first, second) => {
      const report = await new ComparisonRunner(
        new IncrementingComparisonClock(),
      ).run({
        schemaVersion: 1,
        id: "comparison-json-001",
        task,
        agent,
        participants: [
          { adapter: adapter("provider-a", first) },
          { adapter: adapter("provider-b", second) },
        ],
      });

      expect(JSON.parse(JSON.stringify(report)) as unknown).toStrictEqual(
        report,
      );
    },
  );

  it("contains evidence without winner, ranking, or adapter objects", async () => {
    const providerA = adapter("provider-a", "succeeded");
    const providerB = adapter("provider-b", "succeeded");
    const report = await new ComparisonRunner(
      new IncrementingComparisonClock(),
    ).run({
      schemaVersion: 1,
      id: "comparison-evidence-001",
      task,
      agent,
      participants: [{ adapter: providerA }, { adapter: providerB }],
    });

    expect(report).not.toHaveProperty("winner");
    expect(report).not.toHaveProperty("bestProvider");
    expect(report).not.toHaveProperty("recommendedProvider");
    expect(report).not.toHaveProperty("ranking");
    expect(report).not.toHaveProperty("participants");
    expect(report.runs[0]).not.toHaveProperty("adapter");
    expect(report.runs[1]).not.toHaveProperty("adapter");
    expect(report.runs).toHaveLength(2);
  });
});
