# Vornariq

**Intelligent orchestration for coding agents.**

> **Status: PRE-ALPHA.** This repository currently provides the project
> foundation, provider-neutral TypeScript contracts, and local Codex and Gemini
> CLI adapters, a sequential comparison harness, and deterministic provider
> routing with single-provider execution. Evaluation is not implemented yet.

## What is Vornariq?

Vornariq is a local-first orchestration and evaluation layer for coding agents.
It is intended to complement coding agents—not replace them—by providing a
provider-neutral place to route tasks, execute work, review results
independently, and compare quality, cost, and latency.

Codex CLI and Gemini CLI are the first two implemented provider boundaries. The
target ecosystem also includes OpenRouter, local providers, specialized agents,
controlled skills, MCP tools, and reproducible evaluation.

## Why Vornariq?

Coding agents expose different capabilities, costs, and operating models.
Vornariq aims to make those differences explicit through:

- task, model, and agent routing;
- provider-neutral execution;
- independent verification;
- reproducible agent benchmarks;
- quality, cost, and latency comparison;
- Codex-native workflows; and
- controlled skills and MCP integration.

Vornariq is not an LLM, IDE, SaaS product, autonomous company, generic chatbot
framework, or replacement for Codex.

## Status

The project is in **PRE-ALPHA**. Milestones M0 through M2 establish the
open-source repository, initial core contracts, and local Codex CLI provider; M3
adds the shared provider conformance harness, read-only Gemini CLI provider, and
first multi-provider comparison primitive. M4 adds explicit, rule-based provider
selection. TASK-008 connects routing to exactly one provider execution. An
evaluator and the CLI remain planned; this is not a complete product MVP.

## Planned Architecture

The target flow is:

```text
User Task
   ↓
Task Router
   ↓
Agent / Model Selection
   ↓
Execution
   ↓
Independent Review
   ↓
Result + Metrics
```

The planned core separates routing, execution, evaluation, and policy from
agent, provider, skill, and MCP registries. Codex will be a first-class provider
without binding the core to Codex. See [ARCHITECTURE.md](ARCHITECTURE.md) for
the target boundaries; they remain subject to validation in later milestones.

## Quick Start

Prerequisites: Node.js 22 or newer and pnpm 11.19.0.

```sh
pnpm install
pnpm check
```

Runtime exports include project identity, provider adapters, comparison,
routing, and routed execution; core contracts are exported as TypeScript types:

```ts
import { project } from "vornariq";

console.log(project.status); // "pre-alpha"
```

## Codex CLI Provider

The initial provider invokes the locally installed `codex exec --json`. Codex
CLI retains ownership of authentication and user configuration; Vornariq does
not read Codex auth files or accept API keys for this adapter.

```ts
import { CodexProviderAdapter } from "vornariq";

const provider = new CodexProviderAdapter({
  workingDirectory: process.cwd(),
});
```

The sandbox defaults to `read-only`. Callers must explicitly select
`workspace-write` when a task needs repository changes. Session resume is not
implemented.

## Gemini CLI Provider

The second provider invokes a locally installed and authenticated Gemini CLI in
headless `stream-json` mode. Vornariq sends the full deterministic task prompt
over stdin and does not manage Google credentials.

```ts
import { GeminiProviderAdapter } from "vornariq";

const provider = new GeminiProviderAdapter({
  workingDirectory: process.cwd(),
});
```

This adapter is read-only. It explicitly uses Gemini's non-interactive
`approval-mode default`; it does not enable YOLO, auto-edit, skip-trust, raw
output, or Plan Mode. Optional `sandbox: true` is available only when the local
Gemini installation has a working sandbox runtime.

## Provider Comparison

`ComparisonRunner` executes two or more adapters sequentially with the same Task
and Agent, then returns an ordered JSON-safe report of their provider-neutral
execution results.

```ts
import { ComparisonRunner } from "vornariq";

const report = await new ComparisonRunner().run({
  schemaVersion: 1,
  id: "comparison-001",
  task,
  agent,
  participants: [{ adapter: codex }, { adapter: gemini }],
});
```

The report is evidence only: it contains no winner, ranking, quality judgment,
retry, fallback, or aggregate pricing calculation. Provider failures are
retained as runs, while unexpected adapter exceptions are sanitized so later
participants can still execute.

## Deterministic Provider Routing

`RuleBasedRouter` selects an already configured candidate without executing it.
The caller supplies effective capabilities; the router trusts these declarations
and does not inspect CLI permissions or change security settings. Requirements
are explicit, never inferred from Task text or Agent capabilities.

This **example policy** illustrates configurable preference, not a claim about
provider quality, price, or speed. Given existing `task` and `agent` values:

```ts
import {
  CodexProviderAdapter,
  GeminiProviderAdapter,
  RuleBasedRouter,
} from "vornariq";
import type { RoutingPolicy } from "vornariq";

const policy: RoutingPolicy = {
  schemaVersion: 1,
  rules: [
    {
      id: "workspace-write",
      when: { requiredCapabilitiesAll: ["local-repository-write"] },
      preferProviders: ["codex"],
    },
    {
      id: "repository-read",
      when: { requiredCapabilitiesAll: ["local-repository-read"] },
      preferProviders: ["gemini", "codex"],
    },
  ],
  defaultProviderOrder: ["codex", "gemini"],
};

const decision = new RuleBasedRouter().route(
  {
    schemaVersion: 1,
    id: "route-001",
    createdAt: "2026-10-05T00:00:00.000Z",
    task,
    agent,
    requiredCapabilities: ["text-output", "local-repository-read"],
    candidates: [
      {
        providerId: "codex",
        adapter: new CodexProviderAdapter({
          workingDirectory: process.cwd(),
          sandbox: "workspace-write",
        }),
        capabilities: [
          "text-output",
          "local-repository-read",
          "local-repository-write",
        ],
      },
      {
        providerId: "gemini",
        adapter: new GeminiProviderAdapter({ workingDirectory: process.cwd() }),
        capabilities: ["text-output", "local-repository-read"],
      },
    ],
  },
  policy,
);
// selectedProviderId: "gemini"; no provider invocation.
```

Adding `local-repository-write` to requirements selects the configured Codex
candidate and rejects read-only Gemini. A read-only Codex candidate must also
omit write from its effective capabilities. The router never grants permissions.

Eligibility uses exact ALL capability matching plus enabled/allowed/excluded
filters. Selection tries the first matching rule, request preferences, policy
defaults, then original candidate order. Unavailable or ineligible preferences
are skipped; later matching rules are never used. Decisions explain selection
and rejections, survive JSON round-trip, and use caller-supplied IDs/timestamps
for determinism. No eligible candidate returns `status: "unroutable"`. See
[routing semantics](ARCHITECTURE.md#implemented-routing-flow-m4) for input
validation, empty-list behavior, and the capability trust boundary.

## Routed Execution

`RouteAndExecuteOrchestrator` runs the router, then invokes exactly the selected
adapter once. Supply an existing RoutingRequest and the example policy above:

```ts
import { RouteAndExecuteOrchestrator } from "vornariq";

const result = await new RouteAndExecuteOrchestrator().run({
  ...routingRequest,
  policy,
});

if (result.status === "executed") {
  console.log(result.routingDecision.selectedProviderId);
  console.log(result.executionResult.status); // Provider success or failure.
}
```

Unlike selection-only routing, this operation executes the configured provider
and can consume its quota. The request ID identifies the orchestration; the
execution ID is `${id}:execution`. One shared candidate list supplies both
routing and execution, with the same Task and Agent objects.

An unroutable result invokes no adapter. Provider failures remain unchanged
execution data, and unexpected adapter exceptions become sanitized failures.
There is no fallback, retry, comparison, quality scoring, or permission
escalation. Effective capabilities must truthfully describe adapter
configuration. The result retains the actual routing decision and provider
result as JSON-safe evidence under the existing provider contract. See
[routed execution architecture](ARCHITECTURE.md#implemented-routed-execution-task-008)
for identity, timestamps, and error semantics.

## Development

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm check` before submitting a pull request. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the contributor workflow.

## Roadmap

The roadmap progresses from core contracts and a Codex provider through routing,
evaluation, controlled skills/MCP integration, and public validation. See
[ROADMAP.md](ROADMAP.md) for milestone details.

## Security

Credentials must stay outside source control. Treat agent-generated shell
commands, future tool access, and provider integrations as security-sensitive.
See [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## Contributing

Issues and focused pull requests are welcome while expectations are still taking
shape. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

Vornariq is available under the [MIT License](LICENSE).
