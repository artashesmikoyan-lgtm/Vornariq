import { describe, expect, it } from "vitest";

import type {
  Agent,
  ExecutionMetrics,
  ExecutionResult,
  Provider,
  ProviderAdapter,
  ProviderExecutionRequest,
  Task,
} from "../../src/core/contracts/index.js";
import {
  ComparisonError,
  ComparisonRunner,
} from "../../src/comparison/index.js";
import type {
  ComparisonClock,
  ComparisonRequest,
} from "../../src/comparison/index.js";

const task = {
  schemaVersion: 1,
  id: "task-comparison-001",
  title: "Compare providers",
  objective: "Return deterministic evidence.",
  input: { nested: { values: [1, true, null] } },
  constraints: ["Do not mutate inputs."],
  createdAt: "2026-10-04T12:00:00.000Z",
} satisfies Task;

const agent = {
  schemaVersion: 1,
  id: "agent-comparison-001",
  name: "Comparison Agent",
  description: "Produces deterministic comparison evidence.",
  capabilities: ["testing"],
  metadata: { nested: { enabled: true } },
} satisfies Agent;

class IncrementingClock implements ComparisonClock {
  #offset = 0;

  now(): Date {
    const value = new Date(Date.UTC(2026, 9, 4, 12, 0, this.#offset));
    this.#offset += 1;
    return value;
  }
}

type AdapterBehavior = (
  request: ProviderExecutionRequest,
) => Promise<ExecutionResult>;

class TestProviderAdapter implements ProviderAdapter {
  readonly provider: Provider;
  readonly requests: ProviderExecutionRequest[] = [];
  readonly #behavior: AdapterBehavior;

  constructor(providerId: string, behavior: AdapterBehavior) {
    this.provider = {
      schemaVersion: 1,
      id: providerId,
      displayName: `Provider ${providerId}`,
      capabilities: ["text-output"],
      metadata: { nested: { providerId } },
    };
    this.#behavior = behavior;
  }

  execute(request: ProviderExecutionRequest): Promise<ExecutionResult> {
    this.requests.push(request);
    return this.#behavior(request);
  }
}

function success(
  providerId: string,
  options?: {
    readonly metrics?: ExecutionMetrics;
    readonly events?: string[];
  },
): TestProviderAdapter {
  return new TestProviderAdapter(providerId, (request) => {
    options?.events?.push(providerId);
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
      ...(options?.metrics === undefined ? {} : { metrics: options.metrics }),
      output: {
        message: `Output from ${providerId}.`,
        nested: { retained: true },
      },
      metadata: { nested: { providerId } },
    });
  });
}

function failure(providerId: string, events?: string[]): TestProviderAdapter {
  return new TestProviderAdapter(providerId, (request) => {
    events?.push(providerId);
    return Promise.resolve({
      schemaVersion: 1,
      id: request.executionId,
      taskId: request.task.id,
      agentId: request.agent.id,
      providerId,
      status: "failed",
      createdAt: "2026-10-04T12:00:00.000Z",
      startedAt: "2026-10-04T12:00:00.000Z",
      completedAt: "2026-10-04T12:00:01.000Z",
      error: {
        code: `${providerId.toUpperCase()}_FAILED`,
        message: `Provider ${providerId} failed safely.`,
        retryable: false,
        details: { nested: { retained: true } },
      },
    });
  });
}

function request(
  adapters: readonly ProviderAdapter[],
  comparisonId = "comparison-test-001",
): ComparisonRequest {
  return {
    schemaVersion: 1,
    id: comparisonId,
    task,
    agent,
    participants: adapters.map((adapter) => ({ adapter })),
  };
}

describe("ComparisonRunner", () => {
  it("rejects fewer than two providers", async () => {
    for (const adapters of [[], [success("provider-a")]]) {
      await expect(
        new ComparisonRunner(new IncrementingClock()).run(request(adapters)),
      ).rejects.toMatchObject({
        code: "COMPARISON_INSUFFICIENT_PROVIDERS",
      });
    }
  });

  it("rejects duplicate and invalid provider identities", async () => {
    await expect(
      new ComparisonRunner(new IncrementingClock()).run(
        request([success("duplicate"), success("duplicate")]),
      ),
    ).rejects.toMatchObject({ code: "COMPARISON_DUPLICATE_PROVIDER" });

    await expect(
      new ComparisonRunner(new IncrementingClock()).run(
        request([success("provider-a"), success("   ")]),
      ),
    ).rejects.toMatchObject({ code: "COMPARISON_INVALID_CONFIGURATION" });
  });

  it("rejects an empty comparison id with a comparison-layer error", async () => {
    const promise = new ComparisonRunner(new IncrementingClock()).run(
      request([success("provider-a"), success("provider-b")], "   "),
    );

    await expect(promise).rejects.toBeInstanceOf(ComparisonError);
    await expect(promise).rejects.toMatchObject({
      code: "COMPARISON_INVALID_CONFIGURATION",
    });
  });

  it("executes sequentially and preserves participant order", async () => {
    const events: string[] = [];
    const providerB = success("provider-b", { events });
    const providerA = success("provider-a", { events });
    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request([providerB, providerA]),
    );

    expect(events).toEqual(["provider-b", "provider-a"]);
    expect(report.runs.map((run) => run.providerId)).toEqual([
      "provider-b",
      "provider-a",
    ]);
    expect(report.runs.map((run) => run.id)).toEqual([
      "comparison-test-001:run:1:provider-b",
      "comparison-test-001:run:2:provider-a",
    ]);
  });

  it("executes only the participants present when comparison starts", async () => {
    const providerA = success("provider-a");
    const providerB = success("provider-b");
    const providerLate = success("provider-late");
    const participants = [
      { adapter: providerA as ProviderAdapter },
      { adapter: providerB as ProviderAdapter },
    ];
    const runPromise = new ComparisonRunner(new IncrementingClock()).run({
      schemaVersion: 1,
      id: "comparison-snapshot-001",
      task,
      agent,
      participants,
    });

    participants.push({ adapter: providerLate });
    const report = await runPromise;

    expect(report.runs.map((run) => run.providerId)).toEqual([
      "provider-a",
      "provider-b",
    ]);
    expect(providerLate.requests).toHaveLength(0);
  });

  it("passes the identical Task and Agent object to every provider", async () => {
    const providerA = success("provider-a");
    const providerB = success("provider-b");

    await new ComparisonRunner(new IncrementingClock()).run(
      request([providerA, providerB]),
    );

    for (const provider of [providerA, providerB]) {
      expect(provider.requests).toHaveLength(1);
      expect(provider.requests[0]?.task).toBe(task);
      expect(provider.requests[0]?.agent).toBe(agent);
    }
  });

  it.each([
    ["succeeded", "succeeded"],
    ["succeeded", "failed"],
    ["failed", "succeeded"],
    ["failed", "failed"],
  ] as const)("retains %s plus %s as evidence", async (first, second) => {
    const adapters = [
      first === "succeeded" ? success("provider-a") : failure("provider-a"),
      second === "succeeded" ? success("provider-b") : failure("provider-b"),
    ];
    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request(adapters),
    );

    expect(report.runs.map((run) => run.status)).toEqual([first, second]);
  });

  it("continues after a provider returns failure", async () => {
    const events: string[] = [];
    const providerA = failure("provider-a", events);
    const providerB = success("provider-b", { events });

    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request([providerA, providerB]),
    );

    expect(events).toEqual(["provider-a", "provider-b"]);
    expect(report.runs.map((run) => run.status)).toEqual([
      "failed",
      "succeeded",
    ]);
  });

  it("sanitizes thrown adapter exceptions and continues without retrying", async () => {
    let throwAttempts = 0;
    const throwing = new TestProviderAdapter("provider-throw", () => {
      throwAttempts += 1;
      throw new Error(
        "FAKE_SECRET_DO_NOT_PERSIST fake-token-12345 stack payload",
      );
    });
    const later = success("provider-later");

    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request([throwing, later]),
    );

    expect(throwAttempts).toBe(1);
    expect(later.requests).toHaveLength(1);
    expect(report.runs[0]).toMatchObject({
      providerId: "provider-throw",
      status: "failed",
      error: {
        code: "COMPARISON_PROVIDER_EXCEPTION",
        message: "Provider adapter threw unexpectedly during comparison.",
        retryable: false,
      },
      metadata: { source: "comparison-runner" },
    });
    expect(JSON.stringify(report)).not.toContain("FAKE_SECRET_DO_NOT_PERSIST");
    expect(JSON.stringify(report)).not.toContain("fake-token-12345");
    expect(report.runs[1]?.status).toBe("succeeded");
  });

  it("preserves factual metrics and leaves missing metrics absent", async () => {
    const withMetrics = success("provider-metrics", {
      metrics: {
        durationMs: 25,
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        estimatedCost: { amount: "0.01", currency: "USD" },
      },
    });
    const withoutMetrics = success("provider-no-metrics");

    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request([withMetrics, withoutMetrics]),
    );

    expect(report.runs[0]?.metrics).toEqual({
      durationMs: 25,
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      estimatedCost: { amount: "0.01", currency: "USD" },
    });
    expect(report.runs[1]).not.toHaveProperty("metrics");
    expect(report).not.toHaveProperty("metrics");
  });

  it("does not mutate Task or Agent inputs", async () => {
    const taskSnapshot = JSON.stringify(task);
    const agentSnapshot = JSON.stringify(agent);

    await new ComparisonRunner(new IncrementingClock()).run(
      request([success("provider-a"), success("provider-b")]),
    );

    expect(JSON.stringify(task)).toBe(taskSnapshot);
    expect(JSON.stringify(agent)).toBe(agentSnapshot);
  });

  it("produces ordered ISO UTC comparison timestamps", async () => {
    const report = await new ComparisonRunner(new IncrementingClock()).run(
      request([success("provider-a"), success("provider-b")]),
    );

    expect(report.startedAt).toBe("2026-10-04T12:00:00.000Z");
    expect(report.completedAt).toBe("2026-10-04T12:00:03.000Z");
    expect(Date.parse(report.startedAt)).toBeLessThanOrEqual(
      Date.parse(report.completedAt),
    );
  });
});
