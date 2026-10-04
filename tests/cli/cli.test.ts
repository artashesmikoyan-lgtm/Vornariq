import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CliError, parseArgs } from "../../src/cli/cli-args.js";
import { runCli } from "../../src/cli/run-cli.js";
import type { CliDependencies } from "../../src/cli/run-cli.js";
import { createCandidates } from "../../src/cli/provider-factory.js";
import { RouteAndExecuteOrchestrator } from "../../src/orchestration/index.js";
import { NodeCodexProcessRunner } from "../../src/providers/codex/index.js";
import { NodeGeminiProcessRunner } from "../../src/providers/gemini/index.js";
import { project } from "../../src/index.js";
import {
  FakeCodexProcessRunner,
  readFixture as codexFixture,
} from "../providers/codex/test-support.js";
import {
  FakeGeminiProcessRunner,
  readFixture as geminiFixture,
} from "../providers/gemini/test-support.js";

async function invoke(
  args: readonly string[],
  dependencies: Partial<CliDependencies> = {},
) {
  const stdout = vi.fn<(text: string) => void>();
  const stderr = vi.fn<(text: string) => void>();
  const code = await runCli(args, { stdout, stderr, ...dependencies });
  return {
    code,
    out: stdout.mock.calls.map(([text]) => text).join(""),
    err: stderr.mock.calls.map(([text]) => text).join(""),
    stdout,
  };
}

let codex: FakeCodexProcessRunner;
let gemini: FakeGeminiProcessRunner;
beforeEach(() => {
  codex = new FakeCodexProcessRunner({
    stdout: codexFixture("successful-run.jsonl"),
  });
  gemini = new FakeGeminiProcessRunner({
    stdout: geminiFixture("successful-run.jsonl"),
  });
  // Every CLI test uses production adapters but intercepts the process boundary.
  vi.spyOn(NodeCodexProcessRunner.prototype, "run").mockImplementation(
    (request) => codex.run(request),
  );
  vi.spyOn(NodeGeminiProcessRunner.prototype, "run").mockImplementation(
    (request) => gemini.run(request),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("argument parsing", () => {
  it.each([
    [],
    ["init"],
    ["run"],
    ["run", ""],
    ["run", "  "],
    ["run", "one", "two"],
    ["run", "x", "--require"],
    ["run", "x", "--require", "--json"],
    ["run", "x", "--cwd", ""],
    ["run", "x", "--providers", "foo"],
    ["run", "x", "--providers", "codex,"],
    ["run", "x", "--providers", "codex,codex"],
    ["run", "x", "--providers", "codex", "--providers", "gemini"],
    ["run", "x", "--json", "--json"],
    ["run", "x", "--wat"],
    ["run", "x", "--providers", "gemini", "--codex-workspace-write"],
  ])(
    "rejects invalid arguments %j before construction or execution",
    async (...args) => {
      expect(() => parseArgs(args)).toThrow(CliError);
      const factory = vi.fn(createCandidates);
      const result = await invoke(args, { createCandidates: factory });
      expect(result.code).toBe(1);
      expect(result.out).toBe("");
      expect(result.err).toContain("CLI_CONFIGURATION_ERROR");
      expect(factory).not.toHaveBeenCalled();
      expect(codex.requests).toHaveLength(0);
      expect(gemini.requests).toHaveLength(0);
    },
  );

  it("deduplicates explicit requirements with the text-output invariant", () => {
    expect(
      parseArgs([
        "run",
        "x",
        "--require",
        "future:feature",
        "--require",
        "text-output",
        "--require",
        "future:feature",
      ]),
    ).toMatchObject({
      command: "run",
      options: {
        providers: ["codex"],
        requiredCapabilities: ["text-output", "future:feature"],
        codexWorkspaceWrite: false,
      },
    });
  });

  it("supports options before the objective and -- for literal dash-prefixed objectives", () => {
    expect(
      parseArgs(["run", "--json", "--", "--literal objective"]),
    ).toMatchObject({
      options: { objective: "--literal objective", json: true },
    });
  });
});

describe("CLI production flow with fake process runners", () => {
  it.each([["--help"], ["run", "--help"], ["--version"]])(
    "serves %j without providers",
    async (...args) => {
      const factory = vi.fn(createCandidates);
      const result = await invoke(args, { createCandidates: factory });
      expect(result.code).toBe(0);
      expect(result.err).toBe("");
      if (args[0] === "--version")
        expect(result.out).toBe(`${project.version}\n`);
      else
        for (const text of [
          "run <objective>",
          "--require",
          "--providers",
          "--cwd",
          "--codex-workspace-write",
          "--json",
          "--help",
          "--version",
          "Explicitly allow Codex to modify files",
        ])
          expect(result.out).toContain(text);
      expect(factory).not.toHaveBeenCalled();
    },
  );

  it("defaults to Codex read-only without inferring capabilities from objective text", async () => {
    const run = vi.spyOn(RouteAndExecuteOrchestrator.prototype, "run");
    const result = await invoke(["run", "Edit the file"]);
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/^Provider: codex\n\n/);
    expect(result.err).toBe("");
    expect(codex.requests).toHaveLength(1);
    expect(gemini.requests).toHaveLength(0);
    expect(codex.requests[0]?.args).toContain("read-only");
    expect(run).toHaveBeenCalledTimes(1);
    const input = run.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      requiredCapabilities: ["text-output"],
      policy: { rules: [], defaultProviderOrder: ["codex"] },
      task: { objective: "Edit the file" },
      agent: { id: "cli-agent" },
    });
    expect(input?.candidates[0]?.capabilities).toEqual([
      "text-output",
      "local-repository-read",
      "structured-execution-events",
    ]);
    expect(input?.task.id).not.toBe(input?.id);
    expect(input?.task.createdAt).toBe(input?.createdAt);
  });

  it.each([false, true])(
    "write requirement without permission is unroutable (json=%s)",
    async (json) => {
      const result = await invoke([
        "run",
        "Fix it",
        "--require",
        "local-repository-write",
        ...(json ? ["--json"] : []),
      ]);
      expect(result.code).toBe(2);
      expect(result.err).toBe("");
      if (json)
        expect(JSON.parse(result.out)).toMatchObject({ status: "unroutable" });
      else {
        expect(result.out).toContain("No eligible provider");
        expect(result.out).toContain(
          "MISSING_REQUIRED_CAPABILITY: local-repository-write",
        );
      }
      expect(codex.requests).toHaveLength(0);
      expect(gemini.requests).toHaveLength(0);
    },
  );

  it("explicit write permission enables Codex while Gemini remains ineligible", async () => {
    const run = vi.spyOn(RouteAndExecuteOrchestrator.prototype, "run");
    const result = await invoke([
      "run",
      "Fix it",
      "--providers",
      "gemini,codex",
      "--require",
      "local-repository-write",
      "--codex-workspace-write",
      "--json",
    ]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toMatchObject({
      status: "executed",
      routingDecision: { selectedProviderId: "codex" },
      executionResult: { status: "succeeded" },
    });
    expect(codex.requests).toHaveLength(1);
    expect(codex.requests[0]?.args).toContain("workspace-write");
    expect(gemini.requests).toHaveLength(0);
    expect(run.mock.calls[0]?.[0].candidates[1]?.capabilities).toContain(
      "local-repository-write",
    );
    expect(run.mock.calls[0]?.[0].candidates[0]?.capabilities).not.toContain(
      "local-repository-write",
    );
  });

  it.each(["gemini", "gemini,codex", "codex,gemini"])(
    "preserves provider order %s without hidden preferences",
    async (providers) => {
      const run = vi.spyOn(RouteAndExecuteOrchestrator.prototype, "run");
      const result = await invoke([
        "run",
        "Review",
        "--providers",
        providers,
        "--require",
        "local-repository-read",
        "--json",
      ]);
      const ids = providers.split(",");
      expect(result.code).toBe(0);
      expect(JSON.parse(result.out)).toMatchObject({
        routingDecision: { selectedProviderId: ids[0] },
      });
      expect(
        run.mock.calls[0]?.[0].candidates.map(
          (candidate) => candidate.providerId,
        ),
      ).toEqual(ids);
      expect(codex.requests).toHaveLength(ids[0] === "codex" ? 1 : 0);
      expect(gemini.requests).toHaveLength(ids[0] === "gemini" ? 1 : 0);
      if (ids[0] === "gemini") {
        expect(gemini.requests[0]?.args).toContain("default");
        for (const forbidden of [
          "yolo",
          "auto_edit",
          "plan",
          "--skip-trust",
          "--raw-output",
        ])
          expect(gemini.requests[0]?.args).not.toContain(forbidden);
      }
    },
  );

  it("resolves cwd consistently for all candidates, without requiring a repository", async () => {
    const factory = vi.fn(createCandidates);
    const result = await invoke(
      [
        "run",
        "Review",
        "--providers",
        "codex,gemini",
        "--cwd",
        "tests/fixtures",
      ],
      { createCandidates: factory },
    );
    expect(result.code).toBe(0);
    expect(factory.mock.calls[0]?.[1]).toBe(resolve("tests/fixtures"));
    expect(codex.requests[0]?.cwd).toBe(resolve("tests/fixtures"));
  });

  it.each(["does-not-exist-cli-test", "package.json"])(
    "rejects invalid cwd %s before constructing providers",
    async (cwd) => {
      const factory = vi.fn(createCandidates);
      const result = await invoke(["run", "Review", "--cwd", cwd], {
        createCandidates: factory,
      });
      expect(result.code).toBe(1);
      expect(result.err).toContain("CLI_CONFIGURATION_ERROR");
      expect(factory).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "returns failure exit code and sanitized output (json=%s) without fallback",
    async (json) => {
      codex = new FakeCodexProcessRunner({
        error: new Error("raw-secret-stack-123"),
      });
      const result = await invoke([
        "run",
        "Review",
        "--providers",
        "codex,gemini",
        ...(json ? ["--json"] : []),
      ]);
      expect(result.code).toBe(3);
      expect(result.out).not.toContain("raw-secret");
      expect(result.err).toBe("");
      if (json)
        expect(JSON.parse(result.out)).toMatchObject({
          status: "executed",
          executionResult: { status: "failed" },
        });
      else expect(result.out).toContain("CODEX_");
      expect(codex.requests).toHaveLength(1);
      expect(gemini.requests).toHaveLength(0);
    },
  );

  it("JSON stdout is exactly the durable result, without decorations or adapters", async () => {
    const run = vi.spyOn(RouteAndExecuteOrchestrator.prototype, "run");
    const result = await invoke(["run", "Review", "--json"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toHaveBeenCalledTimes(1);
    expect(JSON.parse(result.out)).toStrictEqual(
      await run.mock.results[0]?.value,
    );
    expect(result.out).not.toContain('"adapter"');
    expect(result.out).not.toContain("Provider:");
  });

  it("sanitizes unexpected infrastructure exceptions and keeps JSON stdout empty", async () => {
    const result = await invoke(["run", "Review", "--json"], {
      createCandidates: () => {
        throw new Error("secret-stack-environment");
      },
    });
    expect(result.code).toBe(1);
    expect(result.out).toBe("");
    expect(result.err).toBe(
      "CLI_INFRASTRUCTURE_ERROR: Unable to complete routed execution.\n",
    );
  });
});
