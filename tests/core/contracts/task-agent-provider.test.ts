import { describe, expect, it } from "vitest";

import type {
  Agent,
  Provider,
  ProviderAdapter,
  ProviderExecutionRequest,
  SucceededExecutionResult,
  Task,
} from "../../../src/core/contracts/index.js";

const task = {
  schemaVersion: 1,
  id: "task-contracts-001",
  title: "Establish contracts",
  objective: "Define provider-neutral core contracts.",
  input: {
    repository: "vornariq",
    checks: ["typecheck", "test"],
  },
  constraints: ["no-network", "deterministic"],
  createdAt: "2026-10-04T12:00:00.000Z",
} satisfies Task;

const agent = {
  schemaVersion: 1,
  id: "agent-implementer",
  name: "Implementer",
  description: "Implements a scoped engineering task.",
  capabilities: ["implementation", "community:contract-review"],
  metadata: {
    maintainedBy: "community",
    preferences: { deterministic: true },
  },
} satisfies Agent;

const provider = {
  schemaVersion: 1,
  id: "provider-test-double",
  displayName: "Deterministic test provider",
  capabilities: ["text-output"],
  metadata: { networkRequired: false },
} satisfies Provider;

const adapter: ProviderAdapter = {
  provider,
  execute(
    request: ProviderExecutionRequest,
  ): Promise<SucceededExecutionResult> {
    return Promise.resolve({
      schemaVersion: 1,
      id: request.executionId,
      taskId: request.task.id,
      agentId: request.agent.id,
      providerId: provider.id,
      status: "succeeded",
      createdAt: "2026-10-04T12:01:00.000Z",
      startedAt: "2026-10-04T12:01:01.000Z",
      completedAt: "2026-10-04T12:01:02.000Z",
      output: { accepted: true },
    });
  },
};

describe("task, agent, and provider contracts", () => {
  it("keeps task input structured and routing-neutral", () => {
    expect(task.input).toEqual({
      repository: "vornariq",
      checks: ["typecheck", "test"],
    });
    expect(task).not.toHaveProperty("providerId");
    expect(task).not.toHaveProperty("model");
  });

  it("accepts open capability identifiers and nested metadata", () => {
    expect(agent.capabilities).toContain("community:contract-review");
    expect(agent.metadata.preferences).toEqual({ deterministic: true });
  });

  it("uses a provider-neutral execution boundary", async () => {
    const result = await adapter.execute({
      schemaVersion: 1,
      executionId: "execution-001",
      task,
      agent,
    });

    expect(adapter.provider).toEqual(provider);
    expect(result).toMatchObject({
      id: "execution-001",
      taskId: task.id,
      agentId: agent.id,
      providerId: provider.id,
      status: "succeeded",
    });
  });
});
