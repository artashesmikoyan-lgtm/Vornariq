import { describe, expect, it, vi } from "vitest";
import {
  CodexProviderAdapter,
  GeminiProviderAdapter,
  RoutingError,
  RuleBasedRouter,
} from "../../src/index.js";
import type {
  RoutingCandidate,
  RoutingDecision,
  RoutingErrorCode,
  RoutingPolicy,
  RoutingRequest,
  RoutingRule,
} from "../../src/index.js";
import * as routingApi from "../../src/router/index.js";

const router = new RuleBasedRouter();
const emptyPolicy: RoutingPolicy = { schemaVersion: 1, rules: [] };

function candidate(
  providerId: string,
  capabilities: readonly string[] = ["read", "text"],
): RoutingCandidate {
  return {
    providerId,
    capabilities,
    adapter: {
      provider: {
        schemaVersion: 1,
        id: providerId,
        displayName: providerId,
        capabilities: ["theoretical-write"],
      },
      execute: vi.fn(() => {
        throw new Error("Routing must never execute an adapter.");
      }),
    },
  };
}

function request(overrides: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    schemaVersion: 1,
    id: "route-1",
    createdAt: "2026-10-05T00:00:00.000Z",
    task: {
      schemaVersion: 1,
      id: "task-1",
      objective: "Edit and write every file",
      input: { nested: ["retained"] },
      createdAt: "2026-10-05T00:00:00.000Z",
    },
    agent: {
      schemaVersion: 1,
      id: "agent-1",
      name: "Test agent",
      description: "Routing fixture",
      capabilities: ["write"],
    },
    candidates: [candidate("zeta"), candidate("alpha"), candidate("beta")],
    requiredCapabilities: ["read"],
    ...overrides,
  };
}

function rule(
  id: string,
  preferProviders: readonly string[],
  requiredCapabilitiesAll: readonly string[] = ["read"],
): RoutingRule {
  return { id, when: { requiredCapabilitiesAll }, preferProviders };
}

function freeze(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
}

function expectError(
  input: RoutingRequest,
  policy: RoutingPolicy,
  code: RoutingErrorCode,
): void {
  expect(() => router.route(input, policy)).toThrow(RoutingError);
  expect(() => router.route(input, policy)).toThrow(
    expect.objectContaining({ code }),
  );
}

describe("routing validation", () => {
  it("requires candidates and rejects duplicate ids", () => {
    expectError(
      request({ candidates: [] }),
      emptyPolicy,
      "ROUTER_INSUFFICIENT_PROVIDERS",
    );
    expectError(
      request({ candidates: [candidate("same"), candidate("same")] }),
      emptyPolicy,
      "ROUTER_DUPLICATE_PROVIDER",
    );
  });

  it.each(["", "  "])("rejects empty request id %j", (id) => {
    expectError(request({ id }), emptyPolicy, "ROUTER_INVALID_CONFIGURATION");
  });

  it("rejects candidate identity mismatches and empty ids", () => {
    expectError(
      request({ candidates: [{ ...candidate("alpha"), providerId: "other" }] }),
      emptyPolicy,
      "ROUTER_INVALID_CONFIGURATION",
    );
    expectError(
      request({ candidates: [candidate(" ")] }),
      emptyPolicy,
      "ROUTER_INVALID_CONFIGURATION",
    );
  });

  it("rejects duplicate rule ids and duplicate list entries", () => {
    expectError(
      request(),
      { schemaVersion: 1, rules: [rule("same", []), rule("same", [])] },
      "ROUTER_DUPLICATE_RULE",
    );
    for (const field of [
      "preferredProviderIds",
      "allowedProviderIds",
      "excludedProviderIds",
      "requiredCapabilities",
    ] as const) {
      expectError(
        request({ [field]: ["same", "same"] }),
        emptyPolicy,
        "ROUTER_INVALID_CONFIGURATION",
      );
    }
    expectError(
      request(),
      { ...emptyPolicy, defaultProviderOrder: ["same", "same"] },
      "ROUTER_INVALID_CONFIGURATION",
    );
    expectError(
      request(),
      { ...emptyPolicy, rules: [rule("r", ["same", "same"])] },
      "ROUTER_INVALID_CONFIGURATION",
    );
    expectError(
      request({ candidates: [candidate("a", ["read", "read"])] }),
      emptyPolicy,
      "ROUTER_INVALID_CONFIGURATION",
    );
  });

  it.each([
    null,
    {},
    { schemaVersion: 2, rules: [] },
    { schemaVersion: 1, rules: null },
    { schemaVersion: 1, rules: [null] },
    { schemaVersion: 1, rules: [{ id: "r", when: {}, preferProviders: [] }] },
    { schemaVersion: 1, rules: [rule(" ", [])] },
    { schemaVersion: 1, rules: [rule("r", [], [""])] },
    { schemaVersion: 1, rules: [], defaultProviderOrder: "alpha" },
  ])("rejects malformed policy %j", (policy) => {
    expectError(
      request(),
      policy as unknown as RoutingPolicy,
      "ROUTER_INVALID_CONFIGURATION",
    );
  });

  it.each(["invalid", "2026-10-05", "2026-10-05T01:00:00.000+01:00"])(
    "rejects noncanonical timestamp %s",
    (createdAt) => {
      expectError(
        request({ createdAt }),
        emptyPolicy,
        "ROUTER_INVALID_CONFIGURATION",
      );
    },
  );

  it("rejects malformed runtime requests through RoutingError", () => {
    const invalid = [
      null,
      { ...request(), schemaVersion: 2 },
      { ...request(), task: null },
      { ...request(), agent: { id: "" } },
      { ...request(), candidates: null },
      { ...request(), candidates: [null] },
      { ...request(), requiredCapabilities: [2] },
      { ...request(), candidates: [{ ...candidate("a"), enabled: "false" }] },
    ];
    for (const input of invalid)
      expectError(
        input as unknown as RoutingRequest,
        emptyPolicy,
        "ROUTER_INVALID_CONFIGURATION",
      );
  });

  it("rejects sparse routing lists rather than emitting non-JSON values", () => {
    const sparse: string[] = [];
    sparse.length = 1;
    expectError(
      request({ requiredCapabilities: sparse }),
      emptyPolicy,
      "ROUTER_INVALID_CONFIGURATION",
    );
    expectError(
      request(),
      { ...emptyPolicy, defaultProviderOrder: sparse },
      "ROUTER_INVALID_CONFIGURATION",
    );
  });
});

describe("eligibility and explainability", () => {
  it("records all rejection reasons in stable order and each missing capability", () => {
    const result = router.route(
      request({
        candidates: [
          { ...candidate("zeta", []), enabled: false },
          candidate("alpha"),
        ],
        allowedProviderIds: ["alpha"],
        excludedProviderIds: ["zeta"],
        requiredCapabilities: ["read", "text"],
      }),
      emptyPolicy,
    );
    expect(result.consideredProviders).toEqual([
      {
        providerId: "zeta",
        eligible: false,
        selected: false,
        rejectionReasons: [
          { code: "PROVIDER_DISABLED" },
          { code: "PROVIDER_NOT_ALLOWED" },
          { code: "PROVIDER_EXCLUDED" },
          { code: "MISSING_REQUIRED_CAPABILITY", capability: "read" },
          { code: "MISSING_REQUIRED_CAPABILITY", capability: "text" },
        ],
      },
      {
        providerId: "alpha",
        eligible: true,
        selected: true,
        rejectionReasons: [],
      },
    ]);
  });

  it.each([
    {
      candidates: [
        { ...candidate("zeta"), enabled: false },
        candidate("alpha"),
      ],
    },
    { allowedProviderIds: ["alpha"] },
    { allowedProviderIds: ["zeta", "alpha"], excludedProviderIds: ["zeta"] },
  ])("applies each filter independently", (overrides) => {
    expect(router.route(request(overrides), emptyPolicy)).toMatchObject({
      status: "selected",
      selectedProviderId: "alpha",
    });
  });

  it("uses exact ALL matching, including future capabilities, with no implications", () => {
    const result = router.route(
      request({
        candidates: [
          candidate("zeta", ["read"]),
          candidate("alpha", ["read", "future:feature"]),
        ],
        requiredCapabilities: ["read", "future:feature"],
      }),
      emptyPolicy,
    );
    expect(result).toMatchObject({ selectedProviderId: "alpha" });
    for (const capabilities of [
      ["write"],
      ["READ"],
      ["read-more"],
      ["theoretical-write"],
    ]) {
      expect(
        router.route(
          request({ candidates: [candidate("zeta", capabilities)] }),
          emptyPolicy,
        ).status,
      ).toBe("unroutable");
    }
  });

  it("uses effective capabilities rather than adapter metadata", () => {
    expect(
      router.route(
        request({ requiredCapabilities: ["theoretical-write"] }),
        emptyPolicy,
      ).status,
    ).toBe("unroutable");
  });

  it("returns unroutable normally, without selected fields, for an empty eligible set", () => {
    const result = router.route(request({ allowedProviderIds: [] }), {
      ...emptyPolicy,
      rules: [rule("matched", ["zeta"])],
    });
    expect(result).toMatchObject({
      status: "unroutable",
      matchedRuleId: "matched",
    });
    expect(result).not.toHaveProperty("selectedProviderId");
    expect(result).not.toHaveProperty("selectionSource");
    expect(
      result.consideredProviders.every(
        (item) => !item.eligible && !item.selected,
      ),
    ).toBe(true);
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  });

  it("does not infer requirements from task text or agent capabilities", () => {
    const input = request();
    const result = router.route(input, emptyPolicy);
    expect(result).toMatchObject({
      status: "selected",
      requiredCapabilities: ["read"],
    });
    expect(
      router.route(
        { ...input, task: { ...input.task, objective: "read only" } },
        emptyPolicy,
      ),
    ).toStrictEqual(result);
    expect(
      router.route(
        request({
          requiredCapabilities: [],
          candidates: [candidate("zeta", [])],
        }),
        emptyPolicy,
      ).status,
    ).toBe("selected");
  });
});

describe("ordered selection", () => {
  it("uses only the first matching rule, with ALL conditions, ahead of request preference", () => {
    const policy: RoutingPolicy = {
      schemaVersion: 1,
      rules: [
        rule("not-matching", ["zeta"], ["read", "write"]),
        rule("first", ["beta"]),
        rule("second", ["alpha"]),
      ],
      defaultProviderOrder: ["zeta"],
    };
    expect(
      router.route(request({ preferredProviderIds: ["alpha"] }), policy),
    ).toMatchObject({
      selectedProviderId: "beta",
      matchedRuleId: "first",
      selectionSource: "rule",
    });
  });

  it("does not try later matching rules when the first rule has no eligible preference", () => {
    expect(
      router.route(request({ preferredProviderIds: ["alpha"] }), {
        schemaVersion: 1,
        rules: [rule("first", ["absent"]), rule("second", ["beta"])],
      }),
    ).toMatchObject({
      selectedProviderId: "alpha",
      matchedRuleId: "first",
      selectionSource: "request-preference",
    });
  });

  it("request preference beats default; unknown or ineligible preferences are skipped", () => {
    expect(
      router.route(
        request({
          preferredProviderIds: ["absent", "beta", "alpha"],
          excludedProviderIds: ["beta"],
        }),
        { ...emptyPolicy, defaultProviderOrder: ["zeta"] },
      ),
    ).toMatchObject({
      selectedProviderId: "alpha",
      selectionSource: "request-preference",
    });
  });

  it("skips preferred candidates lacking capabilities at every preference level", () => {
    const input = request({
      candidates: [candidate("zeta", []), candidate("alpha")],
      preferredProviderIds: ["zeta", "alpha"],
    });
    expect(router.route(input, emptyPolicy)).toMatchObject({
      selectedProviderId: "alpha",
      selectionSource: "request-preference",
    });
    expect(
      router.route(input, {
        ...emptyPolicy,
        rules: [rule("r", ["zeta", "alpha"])],
      }),
    ).toMatchObject({ selectedProviderId: "alpha", selectionSource: "rule" });
    expect(
      router.route(
        { ...input, preferredProviderIds: [] },
        { ...emptyPolicy, defaultProviderOrder: ["zeta", "alpha"] },
      ),
    ).toMatchObject({
      selectedProviderId: "alpha",
      selectionSource: "policy-default",
    });
  });

  it("uses defaults before candidate order and falls back when preferences are unusable", () => {
    expect(
      router.route(request(), {
        ...emptyPolicy,
        defaultProviderOrder: ["absent", "beta", "alpha"],
      }),
    ).toMatchObject({
      selectedProviderId: "beta",
      selectionSource: "policy-default",
    });
    const fallback = router.route(
      request({ preferredProviderIds: ["absent"] }),
      { ...emptyPolicy, defaultProviderOrder: ["absent"] },
    );
    expect(fallback).toMatchObject({
      selectedProviderId: "zeta",
      selectionSource: "candidate-order",
    });
    expect(fallback).not.toHaveProperty("matchedRuleId");
    expect(fallback.consideredProviders[1]).toEqual({
      providerId: "alpha",
      eligible: true,
      selected: false,
      rejectionReasons: [],
    });
  });

  it("permits unconditional rules and empty preference lists", () => {
    expect(
      router.route(request(), {
        ...emptyPolicy,
        rules: [rule("always", [], [])],
      }),
    ).toMatchObject({
      selectedProviderId: "zeta",
      matchedRuleId: "always",
      selectionSource: "candidate-order",
    });
  });
});

describe("durability and isolation", () => {
  it("preserves deeply frozen inputs, never executes, and returns deterministic JSON data", () => {
    const input = request();
    const policy: RoutingPolicy = {
      ...emptyPolicy,
      rules: [rule("read", ["alpha"])],
    };
    const before = JSON.stringify({ input, policy });
    const executions = input.candidates.map((item) =>
      vi.spyOn(item.adapter, "execute"),
    );
    freeze(input);
    freeze(policy);
    const decision: RoutingDecision = router.route(input, policy);
    for (let i = 0; i < 5; i += 1)
      expect(router.route(input, policy)).toStrictEqual(decision);
    expect(JSON.parse(JSON.stringify(decision))).toStrictEqual(decision);
    expect(JSON.stringify({ input, policy })).toBe(before);
    expect(decision.requiredCapabilities).not.toBe(input.requiredCapabilities);
    expect(Object.keys(decision).sort()).toEqual(
      [
        "schemaVersion",
        "id",
        "taskId",
        "agentId",
        "createdAt",
        "requiredCapabilities",
        "matchedRuleId",
        "status",
        "selectedProviderId",
        "selectionSource",
        "consideredProviders",
      ].sort(),
    );
    for (const execute of executions) expect(execute).not.toHaveBeenCalled();
    router.route({ ...input, allowedProviderIds: [] }, policy);
    for (const execute of executions) expect(execute).not.toHaveBeenCalled();
  });

  it("exports only the intended runtime routing API", () => {
    expect(Object.keys(routingApi).sort()).toEqual([
      "RoutingError",
      "RuleBasedRouter",
    ]);
    expect(routingApi.RuleBasedRouter).toBe(RuleBasedRouter);
    expect(routingApi.RoutingError).toBe(RoutingError);
  });

  it("routes real configured Codex/Gemini adapters without calling execute or process runners", () => {
    const run = vi.fn(() => {
      throw new Error("No CLI invocation allowed");
    });
    const codexOptions = {
      workingDirectory: process.cwd(),
      sandbox: "workspace-write" as const,
      processRunner: { run },
    };
    const geminiOptions = {
      workingDirectory: process.cwd(),
      processRunner: { run },
    };
    const codex = new CodexProviderAdapter(codexOptions);
    const gemini = new GeminiProviderAdapter(geminiOptions);
    const codexExecute = vi.spyOn(codex, "execute");
    const geminiExecute = vi.spyOn(gemini, "execute");
    const read = ["text-output", "local-repository-read"];
    const write = [...read, "local-repository-write"];
    const input = request({
      candidates: [
        { providerId: "codex", adapter: codex, capabilities: write },
        { providerId: "gemini", adapter: gemini, capabilities: read },
      ],
      requiredCapabilities: read,
      preferredProviderIds: ["gemini", "codex"],
    });
    const policy: RoutingPolicy = {
      schemaVersion: 1,
      rules: [
        rule("workspace-write", ["codex"], ["local-repository-write"]),
        rule("repository-read", ["gemini", "codex"], ["local-repository-read"]),
      ],
      defaultProviderOrder: ["codex", "gemini"],
    };
    freeze(input);
    freeze(policy);
    freeze(codexOptions);
    freeze(geminiOptions);
    expect(router.route(input, policy)).toMatchObject({
      selectedProviderId: "gemini",
      matchedRuleId: "repository-read",
    });
    const writeResult = router.route(
      { ...input, requiredCapabilities: write },
      policy,
    );
    expect(writeResult).toMatchObject({
      selectedProviderId: "codex",
      matchedRuleId: "workspace-write",
    });
    expect(writeResult.consideredProviders[1]).toEqual({
      providerId: "gemini",
      eligible: false,
      selected: false,
      rejectionReasons: [
        {
          code: "MISSING_REQUIRED_CAPABILITY",
          capability: "local-repository-write",
        },
      ],
    });
    const readOnlyCodex = new CodexProviderAdapter({
      workingDirectory: process.cwd(),
      sandbox: "read-only",
      processRunner: { run },
    });
    expect(
      router.route(
        {
          ...input,
          requiredCapabilities: write,
          candidates: [
            { providerId: "codex", adapter: readOnlyCodex, capabilities: read },
          ],
        },
        policy,
      ).status,
    ).toBe("unroutable");
    expect(codexExecute).not.toHaveBeenCalled();
    expect(geminiExecute).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(codexOptions.sandbox).toBe("workspace-write");
    expect(geminiOptions).not.toHaveProperty("sandbox");
  });
});
