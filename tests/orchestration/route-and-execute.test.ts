import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CodexProviderAdapter,
  GeminiProviderAdapter,
  OrchestrationError,
  RouteAndExecuteOrchestrator,
  RoutingError,
  RuleBasedRouter,
} from "../../src/index.js";
import type {
  ExecutionResult,
  OrchestrationClock,
  ProviderExecutionRequest,
  RouteAndExecuteRequest,
  RouteAndExecuteResult,
  RoutingCandidate,
} from "../../src/index.js";
import * as orchestrationApi from "../../src/orchestration/index.js";
import {
  FakeCodexClock,
  FakeCodexProcessRunner,
  readFixture as codexFixture,
  workingDirectory,
} from "../providers/codex/test-support.js";
import {
  FakeGeminiClock,
  FakeGeminiProcessRunner,
  readFixture as geminiFixture,
} from "../providers/gemini/test-support.js";

const start = "2026-10-05T00:00:00.000Z";
const end = "2026-10-05T00:00:02.000Z";
const clock: OrchestrationClock = { now: () => new Date(start) };

function execution(
  input: ProviderExecutionRequest,
  providerId: string,
  failed = false,
): ExecutionResult {
  const base = {
    schemaVersion: 1 as const,
    id: input.executionId,
    taskId: input.task.id,
    agentId: input.agent.id,
    providerId,
    createdAt: start,
    startedAt: start,
    completedAt: end,
    metrics: {
      inputTokens: 3,
      estimatedCost: { amount: "0.001", currency: "USD" },
    },
    metadata: { custom: { retained: true } },
  };
  return failed
    ? {
        ...base,
        status: "failed",
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required",
          retryable: true,
          details: { retained: true },
        },
      }
    : {
        ...base,
        status: "succeeded",
        output: { message: "done", nested: [true] },
      };
}

function candidate(providerId: string, failed = false) {
  const execute = vi.fn((input: ProviderExecutionRequest) =>
    Promise.resolve(execution(input, providerId, failed)),
  );
  return {
    providerId,
    capabilities: ["read"],
    adapter: {
      provider: {
        schemaVersion: 1 as const,
        id: providerId,
        displayName: providerId,
        capabilities: ["read"],
      },
      execute,
    },
  } satisfies RoutingCandidate;
}

function request(
  candidates: readonly RoutingCandidate[],
  overrides: Partial<RouteAndExecuteRequest> = {},
): RouteAndExecuteRequest {
  return {
    schemaVersion: 1,
    id: "orchestration-1",
    createdAt: start,
    task: {
      schemaVersion: 1,
      id: "task-1",
      objective: "Edit, write, review, and analyze",
      input: { nested: [1, true] },
      createdAt: start,
    },
    agent: {
      schemaVersion: 1,
      id: "agent-1",
      name: "Agent",
      description: "Fixture",
      capabilities: ["write"],
    },
    candidates,
    requiredCapabilities: ["read"],
    policy: { schemaVersion: 1, rules: [] },
    ...overrides,
  };
}

function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RouteAndExecuteOrchestrator", () => {
  it.each(["a", "b"])(
    "routes first and invokes only %s once, preserving exact inputs and results",
    async (preferred) => {
      const a = candidate("a");
      const b = candidate("b");
      const input = request([a, b], { preferredProviderIds: [preferred] });
      const route = vi.spyOn(RuleBasedRouter.prototype, "route");
      const before = JSON.stringify(input);
      freeze(input);
      const result: RouteAndExecuteResult =
        await new RouteAndExecuteOrchestrator(clock).run(input);
      const selected = preferred === "a" ? a : b;
      const other = preferred === "a" ? b : a;
      expect(route).toHaveBeenCalledExactlyOnceWith(input, input.policy);
      expect(selected.adapter.execute).toHaveBeenCalledExactlyOnceWith({
        schemaVersion: 1,
        executionId: "orchestration-1:execution",
        task: input.task,
        agent: input.agent,
      });
      expect(route.mock.invocationCallOrder[0]).toBeLessThan(
        selected.adapter.execute.mock.invocationCallOrder[0] ?? 0,
      );
      expect(selected.adapter.execute.mock.calls[0]?.[0].task).toBe(input.task);
      expect(selected.adapter.execute.mock.calls[0]?.[0].agent).toBe(
        input.agent,
      );
      expect(other.adapter.execute).not.toHaveBeenCalled();
      expect(result.status).toBe("executed");
      if (result.status !== "executed") throw new Error("Expected execution");
      expect(result.routingDecision).toBe(route.mock.results[0]?.value);
      expect(result.executionResult).toBe(
        await selected.adapter.execute.mock.results[0]?.value,
      );
      expect(result).toMatchObject({
        id: input.id,
        taskId: input.task.id,
        agentId: input.agent.id,
        startedAt: start,
        completedAt: start,
      });
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it("preserves provider failure and metrics without retry or fallback even when retryable", async () => {
    const a = candidate("a", true);
    const b = candidate("b");
    const result = await new RouteAndExecuteOrchestrator(clock).run(
      request([a, b]),
    );
    expect(result.status).toBe("executed");
    if (result.status !== "executed") throw new Error("Expected execution");
    expect(result.executionResult).toBe(
      await a.adapter.execute.mock.results[0]?.value,
    );
    expect(result.executionResult).toMatchObject({
      status: "failed",
      error: { code: "AUTH_REQUIRED", retryable: true },
      metrics: { inputTokens: 3 },
      metadata: { custom: { retained: true } },
    });
    expect(a.adapter.execute).toHaveBeenCalledTimes(1);
    expect(b.adapter.execute).not.toHaveBeenCalled();
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  });

  it.each(["sync", "async"])(
    "sanitizes %s adapter exceptions without retry or fallback",
    async (mode) => {
      const a = candidate("a");
      const b = candidate("b");
      const secret = new Error("secret-token-123 environment and raw stack");
      a.adapter.execute.mockImplementation(() => {
        if (mode === "sync") throw secret;
        return Promise.reject(secret);
      });
      const now = vi
        .fn()
        .mockReturnValueOnce(new Date(start))
        .mockReturnValueOnce(new Date(end));
      const result = await new RouteAndExecuteOrchestrator({ now }).run(
        request([a, b]),
      );
      expect(result).toMatchObject({
        status: "executed",
        startedAt: start,
        completedAt: end,
        executionResult: {
          id: "orchestration-1:execution",
          taskId: "task-1",
          agentId: "agent-1",
          providerId: "a",
          status: "failed",
          startedAt: start,
          completedAt: end,
          error: { code: "ORCHESTRATION_PROVIDER_EXCEPTION", retryable: false },
        },
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("secret-token");
      expect(serialized).not.toContain("stack");
      expect(serialized).not.toContain("metrics");
      expect(JSON.parse(serialized)).toStrictEqual(result);
      expect(a.adapter.execute).toHaveBeenCalledTimes(1);
      expect(b.adapter.execute).not.toHaveBeenCalled();
    },
  );

  it("returns the actual unroutable decision and invokes no provider", async () => {
    const a = candidate("a");
    const b = candidate("b");
    const route = vi.spyOn(RuleBasedRouter.prototype, "route");
    const result = await new RouteAndExecuteOrchestrator(clock).run(
      request([a, b], { requiredCapabilities: ["write"] }),
    );
    expect(result.status).toBe("unroutable");
    expect(result.routingDecision).toBe(route.mock.results[0]?.value);
    expect(result).not.toHaveProperty("executionResult");
    expect(a.adapter.execute).not.toHaveBeenCalled();
    expect(b.adapter.execute).not.toHaveBeenCalled();
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  });

  it("propagates routing configuration errors before any execution", async () => {
    const a = candidate("a");
    await expect(
      new RouteAndExecuteOrchestrator(clock).run(request([a], { id: "" })),
    ).rejects.toBeInstanceOf(RoutingError);
    expect(a.adapter.execute).not.toHaveBeenCalled();
  });

  it("guards an inconsistent selected provider with a stable infrastructure error", async () => {
    const a = candidate("a");
    const input = request([a]);
    const decision = new RuleBasedRouter().route(input, input.policy);
    if (decision.status !== "selected") throw new Error("Expected selection");
    vi.spyOn(RuleBasedRouter.prototype, "route").mockReturnValue({
      ...decision,
      selectedProviderId: "missing",
    });
    await expect(
      new RouteAndExecuteOrchestrator(clock).run(input),
    ).rejects.toMatchObject({
      name: "OrchestrationError",
      code: "ORCHESTRATION_SELECTED_PROVIDER_MISSING",
    });
    expect(a.adapter.execute).not.toHaveBeenCalled();
  });

  it("is deterministic with controlled provider results and clock", async () => {
    const a = candidate("a");
    const input = request([a]);
    const orchestrator = new RouteAndExecuteOrchestrator(clock);
    expect(await orchestrator.run(input)).toStrictEqual(
      await orchestrator.run(input),
    );
    expect(a.adapter.execute).toHaveBeenCalledTimes(2); // One attempt per explicit call.
  });

  it("normalizes timestamps and clamps backward wall-clock movement", async () => {
    const now = vi
      .fn()
      .mockReturnValueOnce(new Date(end))
      .mockReturnValueOnce(new Date(start));
    const result = await new RouteAndExecuteOrchestrator({ now }).run(
      request([candidate("a")]),
    );
    expect(result.startedAt).toBe(end);
    expect(result.completedAt).toBe(end);
  });

  it("rejects an invalid clock before provider execution", async () => {
    const a = candidate("a");
    await expect(
      new RouteAndExecuteOrchestrator({ now: () => new Date(NaN) }).run(
        request([a]),
      ),
    ).rejects.toMatchObject({ code: "ORCHESTRATION_INVALID_CLOCK" });
    expect(a.adapter.execute).not.toHaveBeenCalled();
  });

  it("exports only the deliberate runtime API", () => {
    expect(Object.keys(orchestrationApi).sort()).toEqual([
      "OrchestrationError",
      "RouteAndExecuteOrchestrator",
    ]);
    expect(orchestrationApi.OrchestrationError).toBe(OrchestrationError);
    expect(orchestrationApi.RouteAndExecuteOrchestrator).toBe(
      RouteAndExecuteOrchestrator,
    );
  });
});

describe("real adapters through fake process runners", () => {
  it.each(["read", "write", "unroutable"])(
    "handles %s without permission escalation or real CLI calls",
    async (scenario) => {
      const codexRunner = new FakeCodexProcessRunner({
        stdout: codexFixture("successful-run.jsonl"),
      });
      const geminiRunner = new FakeGeminiProcessRunner({
        stdout: geminiFixture("successful-run.jsonl"),
      });
      const codex = new CodexProviderAdapter({
        workingDirectory,
        sandbox: scenario === "unroutable" ? "read-only" : "workspace-write",
        processRunner: codexRunner,
        clock: new FakeCodexClock(),
      });
      const gemini = new GeminiProviderAdapter({
        workingDirectory,
        processRunner: geminiRunner,
        clock: new FakeGeminiClock(),
      });
      const codexExecute = vi.spyOn(codex, "execute");
      const geminiExecute = vi.spyOn(gemini, "execute");
      const read = ["text-output", "local-repository-read"];
      const input = request(
        [
          { providerId: "gemini", adapter: gemini, capabilities: read },
          {
            providerId: "codex",
            adapter: codex,
            capabilities:
              scenario === "unroutable"
                ? read
                : [...read, "local-repository-write"],
          },
        ],
        {
          requiredCapabilities: [
            scenario === "read"
              ? "local-repository-read"
              : "local-repository-write",
          ],
          policy: {
            schemaVersion: 1,
            rules: [
              {
                id: "prefer-gemini",
                when: { requiredCapabilitiesAll: [] },
                preferProviders: ["gemini", "codex"],
              },
            ],
          },
        },
      );
      freeze(input.task);
      freeze(input.agent);
      freeze(input.policy);
      const result = await new RouteAndExecuteOrchestrator(clock).run(input);
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
      if (scenario === "unroutable") {
        expect(result.status).toBe("unroutable");
        expect(codexExecute).not.toHaveBeenCalled();
        expect(geminiExecute).not.toHaveBeenCalled();
        expect(codexRunner.requests).toHaveLength(0);
        expect(geminiRunner.requests).toHaveLength(0);
        return;
      }
      expect(result.status).toBe("executed");
      if (result.status !== "executed") throw new Error("Expected execution");
      const selected = scenario === "read" ? geminiExecute : codexExecute;
      const other = scenario === "read" ? codexExecute : geminiExecute;
      expect(selected).toHaveBeenCalledTimes(1);
      expect(other).not.toHaveBeenCalled();
      expect(result.executionResult).toBe(
        await selected.mock.results[0]?.value,
      );
      expect(result.executionResult.status).toBe("succeeded");
      expect(codexRunner.requests).toHaveLength(scenario === "write" ? 1 : 0);
      expect(geminiRunner.requests).toHaveLength(scenario === "read" ? 1 : 0);
      if (scenario === "write") {
        expect(result.routingDecision.consideredProviders[0]).toMatchObject({
          providerId: "gemini",
          eligible: false,
          rejectionReasons: [
            {
              code: "MISSING_REQUIRED_CAPABILITY",
              capability: "local-repository-write",
            },
          ],
        });
        expect(codexRunner.requests[0]?.args).toContain("workspace-write");
      } else {
        expect(geminiRunner.requests[0]?.args).toContain("default");
        expect(geminiRunner.requests[0]?.args).not.toContain("yolo");
      }
    },
  );
});
