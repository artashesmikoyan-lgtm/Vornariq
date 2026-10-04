import { describe, expect, it } from "vitest";

import type {
  ExecutionResult,
  FailedExecutionResult,
  SucceededExecutionResult,
} from "../../../src/core/contracts/index.js";

describe("execution contracts", () => {
  it("represents a successful execution with portable optional metrics", () => {
    const result: SucceededExecutionResult = {
      schemaVersion: 1,
      id: "execution-success-001",
      taskId: "task-001",
      agentId: "agent-001",
      providerId: "provider-001",
      status: "succeeded",
      createdAt: "2026-10-04T12:00:00.000Z",
      startedAt: "2026-10-04T12:00:01.000Z",
      completedAt: "2026-10-04T12:00:02.500Z",
      output: {
        summary: "Contracts implemented",
        files: ["src/core/contracts/task.ts"],
      },
      metrics: {
        durationMs: 1500,
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        estimatedCost: {
          amount: "0.0125",
          currency: "USD",
        },
      },
    };

    expect(result.metrics?.estimatedCost).toEqual({
      amount: "0.0125",
      currency: "USD",
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("represents a failed execution without provider error classes or stacks", () => {
    const result: FailedExecutionResult = {
      schemaVersion: 1,
      id: "execution-failure-001",
      taskId: "task-001",
      agentId: "agent-001",
      providerId: "provider-001",
      status: "failed",
      createdAt: "2026-10-04T12:00:00.000Z",
      startedAt: "2026-10-04T12:00:01.000Z",
      completedAt: "2026-10-04T12:00:02.000Z",
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "The provider was unavailable.",
        retryable: true,
        details: { attempt: 1, region: null },
      },
    };

    expect(result.error).toEqual({
      code: "PROVIDER_UNAVAILABLE",
      message: "The provider was unavailable.",
      retryable: true,
      details: { attempt: 1, region: null },
    });
    expect(result.error).not.toHaveProperty("stack");
  });

  it("does not invent metrics when they are unavailable", () => {
    const result: ExecutionResult = {
      schemaVersion: 1,
      id: "execution-pending-001",
      taskId: "task-001",
      agentId: "agent-001",
      providerId: "provider-001",
      status: "pending",
      createdAt: "2026-10-04T12:00:00.000Z",
    };

    expect(result.metrics).toBeUndefined();
  });
});
