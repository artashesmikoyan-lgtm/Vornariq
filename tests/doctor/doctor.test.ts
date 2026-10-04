import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { diagnose } from "../../src/doctor/doctor.js";
import type { Probe, ProbeResult } from "../../src/doctor/doctor-process.js";
import { runCli } from "../../src/cli/run-cli.js";
import { parseArgs } from "../../src/cli/cli-args.js";
import type { RunOptions } from "../../src/cli/cli-args.js";
import type { ProviderExecutionRequest } from "../../src/core/contracts/index.js";

vi.mock("node:fs", () => ({ readFileSync: vi.fn(), statSync: vi.fn() }));
const cwd = process.cwd();
const help: Record<string, string> = {
  codex: "Usage: codex exec --json --sandbox --cd PROMPT from stdin",
  gemini: "--prompt -p --output-format stream-json --approval-mode --sandbox",
};
function probes(changes: Record<string, ProbeResult> = {}) {
  return vi.fn<Probe>((id, args) =>
    Promise.resolve(
      changes[`${id} ${args.join(" ")}`] ?? {
        status: "ok",
        stdout: args.includes("--help") ? (help[id] ?? "") : `${id} 12.34.56`,
      },
    ),
  );
}
function factory(failed = false, mismatch = false) {
  const execute = vi.fn((input: ProviderExecutionRequest) => {
    const base = {
      schemaVersion: 1 as const,
      id: input.executionId,
      taskId: input.task.id,
      agentId: input.agent.id,
      providerId: "fixture",
      createdAt: input.task.createdAt,
      startedAt: input.task.createdAt,
      completedAt: input.task.createdAt,
    };
    return Promise.resolve(
      failed
        ? {
            ...base,
            status: "failed" as const,
            error: {
              code: "RAW_SECRET_CODE",
              message: "secret diagnostic",
              retryable: true,
            },
          }
        : {
            ...base,
            status: "succeeded" as const,
            output: {
              message: mismatch
                ? "wrong response"
                : input.task.objective.replace("Return exactly: ", ""),
            },
          },
    );
  });
  const createCandidates = vi.fn((options: RunOptions) =>
    options.providers.map((id) => ({
      providerId: id,
      capabilities: ["text-output", "local-repository-read"],
      adapter: {
        provider: {
          schemaVersion: 1 as const,
          id,
          displayName: id,
          capabilities: [],
        },
        execute,
      },
    })),
  );
  return { execute, createCandidates };
}
afterEach(() => {
  vi.clearAllMocks();
});

describe("doctor diagnostics", () => {
  it("collects local versions and features without constructing/executing adapters or reading credentials", async () => {
    const probe = probes();
    const fake = factory();
    const { report, exitCode } = await diagnose(cwd, undefined, {
      probe,
      ...fake,
    });
    expect(exitCode).toBe(0);
    expect(report.environment).toMatchObject({
      cwd,
      platform: process.platform,
      node: { version: process.version, status: "ready" },
      pnpm: { version: "pnpm 12.34.56" },
      git: { version: "git 12.34.56" },
    });
    expect(
      report.providers.map((provider) => [
        provider.status,
        provider.compatibility,
        provider.authentication,
        provider.e2eStatus,
      ]),
    ).toEqual([
      ["ready", "verified", "not-tested", "unverified"],
      ["ready", "verified", "not-tested", "unverified"],
    ]);
    expect(probe.mock.calls.map(([id, args]) => [id, args])).toEqual([
      ["pnpm", ["--version"]],
      ["git", ["--version"]],
      ["codex", ["--version"]],
      ["codex", ["exec", "--help"]],
      ["gemini", ["--version"]],
      ["gemini", ["--help"]],
    ]);
    expect(fake.createCandidates).not.toHaveBeenCalled();
    expect(fake.execute).not.toHaveBeenCalled();
    expect(readFileSync).not.toHaveBeenCalled();
    expect(statSync).not.toHaveBeenCalled();
    expect(report).not.toHaveProperty("liveSmoke");
    expect(JSON.parse(JSON.stringify(report))).toStrictEqual(report);
  });
  it.each(["exec", "--json", "--sandbox", "--cd"])(
    "requires Codex %s",
    async (flag) => {
      const { report, exitCode } = await diagnose(cwd, undefined, {
        probe: probes({
          "codex exec --help": {
            status: "ok",
            stdout: help.codex?.replace(flag, "") ?? "",
          },
        }),
      });
      expect(exitCode).toBe(2);
      expect(report.providers[0]).toMatchObject({
        status: "incompatible",
        missingFeatures: [flag],
        e2eStatus: "unverified",
      });
    },
  );
  it.each(["--output-format", "stream-json", "--approval-mode", "prompt"])(
    "requires Gemini %s for explicit live use",
    async (flag) => {
      const fake = factory();
      const output =
        flag === "prompt"
          ? "--output-format stream-json --approval-mode"
          : (help.gemini?.replace(flag, "") ?? "");
      const { report, exitCode } = await diagnose(cwd, "gemini", {
        probe: probes({ "gemini --help": { status: "ok", stdout: output } }),
        ...fake,
      });
      expect(exitCode).toBe(2);
      expect(report.providers[1]).toMatchObject({
        status: "incompatible",
        missingFeatures: [flag],
      });
      expect(fake.execute).not.toHaveBeenCalled();
    },
  );
  it("treats Gemini sandbox and Codex stdin detection as optional", async () => {
    const { report, exitCode } = await diagnose(cwd, undefined, {
      probe: probes({
        "gemini --help": {
          status: "ok",
          stdout: "-p --output-format stream-json --approval-mode",
        },
        "codex exec --help": {
          status: "ok",
          stdout: "exec --json --sandbox --cd",
        },
      }),
    });
    expect(exitCode).toBe(0);
    expect(report.providers[1]).toMatchObject({
      compatibility: "verified",
      features: { sandbox: false },
    });
    expect(report.providers[0]).toMatchObject({ features: { stdin: false } });
  });
  it.each(["codex", "gemini"])(
    "reports missing %s without installation",
    async (id) => {
      const fake = factory();
      const { report, exitCode } = await diagnose(cwd, undefined, {
        probe: probes({
          [`${id} --version`]: { status: "unavailable", stdout: "" },
        }),
        ...fake,
      });
      expect(exitCode).toBe(id === "codex" ? 2 : 0);
      expect(
        report.providers.find((provider) => provider.id === id)?.status,
      ).toBe("unavailable");
      expect(fake.createCandidates).not.toHaveBeenCalled();
    },
  );
  it("does not execute or install an explicitly requested missing Gemini", async () => {
    const fake = factory();
    const { exitCode } = await diagnose(cwd, "gemini", {
      probe: probes({
        "gemini --version": { status: "unavailable", stdout: "" },
      }),
      ...fake,
    });
    expect(exitCode).toBe(2);
    expect(fake.createCandidates).not.toHaveBeenCalled();
  });
  it("reports failures as unverified without publishing raw diagnostics", async () => {
    const probe = probes({
      "codex exec --help": { status: "timeout", stdout: "SECRET_TOKEN" },
      "git --version": { status: "failed", stdout: "SECRET_TOKEN" },
    });
    const { report, exitCode } = await diagnose(cwd, undefined, { probe });
    expect(exitCode).toBe(2);
    expect(report.providers[0]?.status).toBe("unverified");
    expect(JSON.stringify(report)).not.toContain("SECRET_TOKEN");
    probe.mockRejectedValue(new Error("secret raw exception"));
    const result = await diagnose(cwd, undefined, { probe });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("does not require an exact version and suppresses unsafe version lines", async () => {
    const { report } = await diagnose(cwd, undefined, {
      probe: probes({
        "codex --version": { status: "ok", stdout: "codex-cli 99.12.1-beta.2" },
        "gemini --version": { status: "ok", stdout: "1.2.3\u001b[31m" },
      }),
    });
    expect(report.providers[0]?.status).toBe("ready");
    expect(report.providers[1]).toMatchObject({
      status: "warning",
      version: null,
    });
  });
  it.each(["codex", "gemini"] as const)(
    "runs exactly one explicit %s live smoke using read-only injected candidates",
    async (id) => {
      const fake = factory();
      const { report, exitCode } = await diagnose(cwd, id, {
        probe: probes(),
        ...fake,
      });
      expect(exitCode).toBe(0);
      expect(fake.createCandidates).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          providers: [id],
          codexWorkspaceWrite: false,
          requiredCapabilities: ["text-output"],
        }),
        cwd,
      );
      expect(fake.execute).toHaveBeenCalledTimes(1);
      expect(fake.execute.mock.calls[0]?.[0].task.constraints).toContain(
        "Do not modify files. Do not use tools or access credentials.",
      );
      expect(report.liveSmoke).toMatchObject({
        providerId: id,
        success: true,
        executionStatus: "succeeded",
      });
      expect(report.liveSmoke?.durationMs).toBeGreaterThanOrEqual(0);
      expect(
        report.providers.find((provider) => provider.id === id)?.e2eStatus,
      ).toBe("passed");
      expect(
        report.providers.find((provider) => provider.id !== id)?.e2eStatus,
      ).toBe("unverified");
      expect(JSON.stringify(report)).not.toContain("Return exactly");
      expect(JSON.parse(JSON.stringify(report))).toStrictEqual(report);
    },
  );
  it.each([false, true])(
    "failed or incorrect live response never retries/falls back (mismatch=%s)",
    async (mismatch) => {
      const fake = factory(!mismatch, mismatch);
      const { report, exitCode } = await diagnose(cwd, "codex", {
        probe: probes(),
        ...fake,
      });
      expect(exitCode).toBe(3);
      expect(report.liveSmoke?.success).toBe(false);
      expect(report.providers[0]?.e2eStatus).toBe("failed");
      expect(fake.execute).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(report)).not.toContain("SECRET");
      expect(JSON.stringify(report)).not.toContain("secret diagnostic");
    },
  );
});

describe("doctor CLI", () => {
  it.each([["doctor"], ["doctor", "--json"], ["doctor", "--help"]])(
    "handles %j with no model execution",
    async (...args) => {
      const stdout = vi.fn();
      const stderr = vi.fn();
      const fake = factory();
      const diagnostic = vi.fn((directory: string, live?: "codex" | "gemini") =>
        diagnose(directory, live, { probe: probes(), ...fake }),
      );
      expect(await runCli(args, { stdout, stderr, diagnose: diagnostic })).toBe(
        0,
      );
      const output: unknown = stdout.mock.calls[0]?.[0];
      expect(typeof output).toBe("string");
      if (typeof output !== "string") throw new Error("Expected text");
      if (args.includes("--json"))
        expect(JSON.parse(output)).toMatchObject({
          schemaVersion: 1,
          overallStatus: "ready",
        });
      else
        expect(output).toContain(
          args.includes("--help") ? "--live" : "UNVERIFIED",
        );
      if (args.includes("--help")) expect(diagnostic).not.toHaveBeenCalled();
      expect(fake.execute).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["--live"],
    ["--live", "other"],
    ["--live", "codex", "--live", "gemini"],
    ["--json", "--json"],
    ["--providers", "gemini"],
    ["prompt"],
  ])("rejects invalid doctor arguments %j", async (...args) => {
    const diagnose = vi.fn();
    expect(
      await runCli(["doctor", ...args], {
        diagnose,
        stdout: vi.fn(),
        stderr: vi.fn(),
      }),
    ).toBe(1);
    expect(diagnose).not.toHaveBeenCalled();
  });
  it("requires exact explicit live syntax", () => {
    expect(parseArgs(["doctor", "--live", "gemini", "--json"])).toEqual({
      command: "doctor",
      live: "gemini",
      json: true,
    });
    expect(parseArgs(["doctor"])).toEqual({ command: "doctor", json: false });
  });
});
