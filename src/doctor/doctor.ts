import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { RouteAndExecuteOrchestrator } from "../orchestration/index.js";
import type { RouteAndExecuteResult } from "../orchestration/index.js";
import { createCandidates } from "../cli/provider-factory.js";
import type { CliProviderId } from "../cli/cli-args.js";
import { probeProcess } from "./doctor-process.js";
import type { Probe, ProbeResult } from "./doctor-process.js";

type Status =
  "ready" | "warning" | "unavailable" | "incompatible" | "unverified";
interface ToolReport {
  readonly status: Status;
  readonly version: string | null;
  readonly probeStatus: ProbeResult["status"];
}
interface ProviderReport extends ToolReport {
  readonly id: CliProviderId;
  readonly helpProbeStatus: ProbeResult["status"];
  readonly features: Readonly<Record<string, boolean>>;
  readonly missingFeatures: readonly string[];
  readonly compatibility: "verified" | "incompatible" | "unverified";
  readonly authentication: "not-tested";
  e2eStatus: "unverified" | "passed" | "failed";
}
export interface DoctorReport {
  readonly schemaVersion: 1;
  readonly timestamp: string;
  readonly environment: {
    readonly platform: string;
    readonly cwd: string;
    readonly node: { readonly version: string; readonly status: Status };
    readonly pnpm: ToolReport;
    readonly git: ToolReport;
  };
  readonly providers: readonly ProviderReport[];
  readonly overallStatus: Status;
  readonly liveSmoke?: {
    readonly providerId: CliProviderId;
    readonly success: boolean;
    readonly durationMs: number;
    readonly executionStatus: string;
    readonly errorCode?: string;
    readonly providerFailure?: {
      readonly code: string;
      readonly message: string;
      readonly retryable: boolean;
    };
  };
}
export interface DoctorDependencies {
  readonly probe: Probe;
  readonly createCandidates: typeof createCandidates;
}

const definitions = [
  {
    id: "codex",
    helpArgs: ["exec", "--help"],
    required: {
      exec: /\bexec\b/,
      "--json": /--json\b/,
      "--sandbox": /--sandbox\b/,
      "--cd": /--cd\b/,
    },
    optional: { stdin: /\bstdin\b|standard input/i },
  },
  {
    id: "gemini",
    helpArgs: ["--help"],
    required: {
      prompt: /--prompt\b|(?:^|\s)-p(?:\s|,)/m,
      "--output-format": /--output-format\b/,
      "stream-json": /\bstream-json\b/,
      "--approval-mode": /--approval-mode\b/,
    },
    optional: { sandbox: /--sandbox\b/ },
  },
] as const;

function safeVersion(output: string): string | null {
  const line = output
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => /\d+\.\d+/.test(part));
  return line !== undefined && /^[a-zA-Z0-9 ._+()-]{1,160}$/.test(line)
    ? line
    : null;
}

export async function diagnose(
  cwd: string,
  live?: CliProviderId,
  overrides: Partial<DoctorDependencies> = {},
): Promise<{ report: DoctorReport; exitCode: number }> {
  const dependencies = { probe: probeProcess, createCandidates, ...overrides };
  const probe: Probe = async (executable, args, directory) => {
    try {
      return await dependencies.probe(executable, args, directory);
    } catch {
      return { status: "failed", stdout: "" };
    }
  };
  const tool = async (id: string): Promise<ToolReport> => {
    const result = await probe(id, ["--version"], cwd);
    const version = result.status === "ok" ? safeVersion(result.stdout) : null;
    return {
      status:
        result.status === "ok"
          ? version === null
            ? "warning"
            : "ready"
          : result.status === "unavailable"
            ? "unavailable"
            : "warning",
      version,
      probeStatus: result.status,
    };
  };
  const pnpm = await tool("pnpm");
  const git = await tool("git");
  const providers: ProviderReport[] = [];
  for (const definition of definitions) {
    const version = await tool(definition.id);
    const help =
      version.probeStatus === "unavailable"
        ? { status: "unavailable" as const, stdout: "" }
        : await probe(definition.id, definition.helpArgs, cwd);
    const features: Record<string, boolean> = {};
    for (const [feature, pattern] of Object.entries({
      ...definition.required,
      ...definition.optional,
    }))
      features[feature] = help.status === "ok" && pattern.test(help.stdout);
    const missingFeatures = Object.keys(definition.required).filter(
      (feature) => !features[feature],
    );
    const compatibility =
      help.status !== "ok"
        ? "unverified"
        : missingFeatures.length > 0
          ? "incompatible"
          : "verified";
    providers.push({
      ...version,
      id: definition.id,
      helpProbeStatus: help.status,
      status:
        version.status === "unavailable"
          ? "unavailable"
          : compatibility === "incompatible"
            ? "incompatible"
            : compatibility === "unverified"
              ? "unverified"
              : version.status,
      features,
      missingFeatures,
      compatibility,
      authentication: "not-tested",
      e2eStatus: "unverified",
    });
  }
  const nodeReady = Number(process.versions.node.split(".")[0]) >= 22;
  let exitCode = providers.some(
    (provider) =>
      (live === undefined ? provider.id === "codex" : provider.id === live) &&
      (provider.compatibility !== "verified" ||
        provider.status === "unavailable"),
  )
    ? 2
    : 0;
  if (!nodeReady) exitCode = 1;
  let liveSmoke: DoctorReport["liveSmoke"];
  if (live !== undefined) {
    const selected = providers.find((provider) => provider.id === live);
    if (exitCode === 0 && selected !== undefined) {
      const started = performance.now();
      let result: RouteAndExecuteResult | undefined;
      try {
        const marker = `Vornariq ${live === "codex" ? "Codex" : "Gemini"} E2E OK`;
        const createdAt = new Date().toISOString();
        result = await new RouteAndExecuteOrchestrator().run({
          schemaVersion: 1,
          id: randomUUID(),
          createdAt,
          task: {
            schemaVersion: 1,
            id: randomUUID(),
            objective: `Return exactly: ${marker}`,
            constraints: [
              "Do not modify files. Do not use tools or access credentials.",
            ],
            createdAt,
          },
          agent: {
            schemaVersion: 1,
            id: "doctor-smoke",
            name: "Doctor smoke",
            description: "Minimal read-only response verification.",
            capabilities: [],
          },
          requiredCapabilities: ["text-output"],
          candidates: dependencies.createCandidates(
            {
              objective: `Return exactly: ${marker}`,
              requiredCapabilities: ["text-output"],
              providers: [live],
              codexWorkspaceWrite: false,
              json: false,
            },
            cwd,
          ),
          policy: { schemaVersion: 1, rules: [], defaultProviderOrder: [live] },
        });
        const execution =
          result.status === "executed" ? result.executionResult : undefined;
        const output =
          execution?.status === "succeeded" ? execution.output : null;
        const message =
          typeof output === "string"
            ? output
            : output !== null &&
                typeof output === "object" &&
                "message" in output &&
                typeof output.message === "string"
              ? output.message
              : "";
        const success =
          execution?.status === "succeeded" && message.trim() === marker;
        liveSmoke = {
          providerId: live,
          success,
          durationMs: Math.max(0, performance.now() - started),
          executionStatus: execution?.status ?? "unroutable",
          ...(execution?.status === "failed"
            ? {
                providerFailure: {
                  code: execution.error.code,
                  message: execution.error.message,
                  retryable: execution.error.retryable,
                },
              }
            : {}),
          ...(success
            ? {}
            : {
                errorCode:
                  execution?.status === "failed"
                    ? "DOCTOR_PROVIDER_FAILED"
                    : "DOCTOR_RESPONSE_MISMATCH",
              }),
        };
      } catch {
        liveSmoke = {
          providerId: live,
          success: false,
          durationMs: Math.max(0, performance.now() - started),
          executionStatus: "not-executed",
          errorCode: "DOCTOR_SMOKE_ERROR",
        };
      }
      selected.e2eStatus = liveSmoke.success ? "passed" : "failed";
      if (!liveSmoke.success) exitCode = 3;
    } else {
      liveSmoke = {
        providerId: live,
        success: false,
        durationMs: 0,
        executionStatus: "not-executed",
        errorCode: "DOCTOR_PROVIDER_NOT_READY",
      };
    }
  }
  return {
    exitCode,
    report: {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        cwd,
        node: {
          version: process.version,
          status: nodeReady ? "ready" : "incompatible",
        },
        pnpm,
        git,
      },
      providers,
      overallStatus:
        exitCode !== 0
          ? "incompatible"
          : providers.some((provider) => provider.status !== "ready") ||
              pnpm.status !== "ready" ||
              git.status !== "ready"
            ? "warning"
            : "ready",
      ...(liveSmoke === undefined ? {} : { liveSmoke }),
    },
  };
}

export function doctorOutput(report: DoctorReport): string {
  return [
    "Vornariq Doctor",
    "",
    `Environment: ${report.environment.platform}`,
    `  Node: ${report.environment.node.status} ${report.environment.node.version}`,
    `  pnpm: ${report.environment.pnpm.status} ${report.environment.pnpm.version ?? ""}`,
    `  Git: ${report.environment.git.status} ${report.environment.git.version ?? ""}`,
    "",
    "Providers (authentication: not-tested)",
    ...report.providers.map(
      (provider) =>
        `  ${provider.id}: ${provider.status.toUpperCase()} ${provider.version ?? ""}; protocol ${provider.compatibility}${provider.missingFeatures.length ? `; missing/unverified: ${provider.missingFeatures.join(", ")}` : ""}`,
    ),
    "",
    "Release gates",
    ...report.providers.map(
      (provider) => `  ${provider.id} E2E: ${provider.e2eStatus.toUpperCase()}`,
    ),
    ...(report.liveSmoke === undefined
      ? []
      : [
          `Live smoke: ${report.liveSmoke.success ? "passed" : "failed"} (${report.liveSmoke.executionStatus}) ${report.liveSmoke.errorCode ?? ""}`,
          ...(report.liveSmoke.providerFailure === undefined
            ? []
            : [`Provider failure: ${report.liveSmoke.providerFailure.code}`]),
        ]),
    "Install missing providers manually; verify required flags with their help command.",
    "Live smoke requires explicit --live and consumes provider/account resources.",
    "",
  ].join("\n");
}

export const doctorHelp = `Usage: vornariq doctor [--json] [--live codex|gemini]
Default: free local version/help diagnostics only; no model calls or credential inspection.
--json     Output only the diagnostic report as JSON.
--live     Explicitly spend provider/account resources on ONE read-only smoke request.
--help     Show this help. No retry, fallback, installation, or history persistence.
Exit: 0 compatible (optional Gemini/tools may warn), 1 CLI/internal error,
2 requested provider unavailable/incompatible/unverified, 3 live smoke failed.
Authentication is not tested. E2E is unverified unless passed in this invocation.
`;
