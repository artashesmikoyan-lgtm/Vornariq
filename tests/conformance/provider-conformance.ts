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

export const providerConformanceSecretMarkers = [
  "FAKE_SECRET_DO_NOT_PERSIST",
  "fake-token-12345",
] as const;

export interface ProviderConformanceFactoryContext {
  readonly sensitiveDiagnostics: readonly string[];
}

export interface ProviderConformanceOptions {
  readonly name: string;
  readonly provider: Provider;
  readonly task: Task;
  readonly agent: Agent;
  readonly createSuccessAdapter: () => ProviderAdapter;
  readonly createFailureAdapter: (
    context: ProviderConformanceFactoryContext,
  ) => ProviderAdapter;
  /** Explicit opt-in for providers that report or derive an approved cost. */
  readonly allowEstimatedCost?: boolean;
}

const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  Object.freeze(value);
}

function serialize(value: unknown): string {
  const serialized = JSON.stringify(value);
  expect(serialized).toBeTypeOf("string");
  return serialized;
}

function expectJsonSafe(value: unknown): void {
  const serialized = serialize(value);
  const roundTripped: unknown = JSON.parse(serialized);
  expect(roundTripped).toStrictEqual(value);
}

function expectNonEmpty(value: string): void {
  expect(value.trim().length).toBeGreaterThan(0);
}

function expectTimestamp(value: string): void {
  expect(value).toMatch(ISO_8601_UTC);
  expect(Number.isNaN(Date.parse(value))).toBe(false);
  expect(new Date(value).toISOString()).toBe(value);
}

function expectMetrics(
  metrics: ExecutionMetrics | undefined,
  allowEstimatedCost: boolean,
): void {
  if (metrics === undefined) {
    return;
  }

  expectJsonSafe(metrics);

  if (metrics.durationMs !== undefined) {
    expect(Number.isFinite(metrics.durationMs)).toBe(true);
    expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
  }

  for (const tokenCount of [
    metrics.inputTokens,
    metrics.outputTokens,
    metrics.totalTokens,
  ]) {
    if (tokenCount !== undefined) {
      expect(Number.isSafeInteger(tokenCount)).toBe(true);
      expect(tokenCount).toBeGreaterThanOrEqual(0);
    }
  }

  if (!allowEstimatedCost) {
    expect(metrics).not.toHaveProperty("estimatedCost");
    return;
  }

  if (metrics.estimatedCost !== undefined) {
    expect(metrics.estimatedCost.amount).toMatch(/^\d+(?:\.\d+)?$/);
    expect(metrics.estimatedCost.currency).toMatch(/^[A-Z]{3}$/);
  }
}

function makeRequest(
  options: ProviderConformanceOptions,
): ProviderExecutionRequest {
  return {
    schemaVersion: 1,
    executionId: "execution-test-001",
    task: options.task,
    agent: options.agent,
  };
}

async function executeSuccess(options: ProviderConformanceOptions): Promise<{
  readonly adapter: ProviderAdapter;
  readonly result: ExecutionResult;
}> {
  const adapter = options.createSuccessAdapter();
  const result = await adapter.execute(makeRequest(options));
  expect(result.status).toBe("succeeded");
  return { adapter, result };
}

async function executeFailure(options: ProviderConformanceOptions): Promise<{
  readonly adapter: ProviderAdapter;
  readonly result: ExecutionResult;
}> {
  const adapter = options.createFailureAdapter({
    sensitiveDiagnostics: providerConformanceSecretMarkers,
  });
  const result = await adapter.execute(makeRequest(options));
  expect(result.status).toBe("failed");
  return { adapter, result };
}

/**
 * Registers provider-neutral contract tests for an adapter. Each factory must
 * return a fresh, deterministic adapter and must not perform live I/O.
 */
export function providerConformanceSuite(
  options: ProviderConformanceOptions,
): void {
  deepFreeze(options.task);
  deepFreeze(options.agent);

  describe(`${options.name} provider conformance`, () => {
    it("exposes stable, JSON-safe provider identity", async () => {
      expect(options.provider.schemaVersion).toBe(1);
      expectNonEmpty(options.provider.id);
      expectNonEmpty(options.provider.displayName);
      expectJsonSafe(options.provider);

      const providerSnapshot = serialize(options.provider);
      const success = await executeSuccess(options);
      const failure = await executeFailure(options);

      expect(success.adapter.provider).toStrictEqual(options.provider);
      expect(failure.adapter.provider).toStrictEqual(options.provider);
      expect(serialize(success.adapter.provider)).toBe(providerSnapshot);
      expect(serialize(failure.adapter.provider)).toBe(providerSnapshot);
    });

    it("returns a portable successful result", async () => {
      const { result } = await executeSuccess(options);

      if (result.status !== "succeeded") {
        throw new TypeError("Expected a succeeded execution result.");
      }

      expect(result).toMatchObject({
        schemaVersion: 1,
        id: "execution-test-001",
        taskId: options.task.id,
        agentId: options.agent.id,
        providerId: options.provider.id,
        status: "succeeded",
      });
      expectJsonSafe(result.output);
      expectJsonSafe(result);
    });

    it("returns a structured, sanitized failure", async () => {
      const { result } = await executeFailure(options);
      const repeated = await executeFailure(options);

      if (result.status !== "failed") {
        throw new TypeError("Expected a failed execution result.");
      }

      if (repeated.result.status !== "failed") {
        throw new TypeError("Expected a repeated failed execution result.");
      }

      expect(result).toMatchObject({
        schemaVersion: 1,
        id: "execution-test-001",
        taskId: options.task.id,
        agentId: options.agent.id,
        providerId: options.provider.id,
        status: "failed",
      });
      expectNonEmpty(result.error.code);
      expectNonEmpty(result.error.message);
      expect(repeated.result.error.code).toBe(result.error.code);
      expect(repeated.result.error.message).toBe(result.error.message);
      expect(result.error.retryable).toBeTypeOf("boolean");
      expect(result).not.toHaveProperty("output");
      expect(result.error).not.toHaveProperty("stack");
      expectJsonSafe(result.error);
      expectJsonSafe(result);

      const serialized = serialize(result);
      for (const marker of providerConformanceSecretMarkers) {
        expect(serialized).not.toContain(marker);
      }
    });

    it("does not mutate frozen Task or Agent inputs", async () => {
      const taskSnapshot = serialize(options.task);
      const agentSnapshot = serialize(options.agent);

      await executeSuccess(options);
      await executeFailure(options);

      expect(serialize(options.task)).toBe(taskSnapshot);
      expect(serialize(options.agent)).toBe(agentSnapshot);
    });

    it("uses normalized UTC timestamps in chronological order", async () => {
      for (const { result } of [
        await executeSuccess(options),
        await executeFailure(options),
      ]) {
        expectTimestamp(result.createdAt);

        if (result.startedAt !== undefined) {
          expectTimestamp(result.startedAt);
          expect(Date.parse(result.createdAt)).toBeLessThanOrEqual(
            Date.parse(result.startedAt),
          );
        }

        if (result.completedAt !== undefined) {
          expectTimestamp(result.completedAt);
        }

        if (
          result.startedAt !== undefined &&
          result.completedAt !== undefined
        ) {
          expect(Date.parse(result.startedAt)).toBeLessThanOrEqual(
            Date.parse(result.completedAt),
          );
        }
      }
    });

    it("keeps optional metrics portable and non-fabricated", async () => {
      const allowEstimatedCost = options.allowEstimatedCost ?? false;
      const success = await executeSuccess(options);
      const failure = await executeFailure(options);

      expectMetrics(success.result.metrics, allowEstimatedCost);
      expectMetrics(failure.result.metrics, allowEstimatedCost);
    });
  });
}
