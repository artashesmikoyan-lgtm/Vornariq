# Vornariq

**Intelligent orchestration for coding agents.**

Vornariq is a local-first, open-source orchestration layer for coding-agent
providers. **PRE-ALPHA:** experimental, intended for reviewed local workflows.

It gives provider differences a common TypeScript interface: explicit capability
requirements select a configured provider, and the orchestrator executes that
provider once. Provider authentication stays with the installed CLI.

## What works today

- Provider-neutral Task, Agent, ExecutionResult, and evaluation data contracts.
- Codex and Gemini CLI adapters with offline provider conformance tests.
- Deterministic rule-based routing and single-provider execution.
- Sequential comparison reports, without winner selection or quality scoring.
- Human/JSON output through `vornariq run` and free `vornariq doctor`
  diagnostics.

There is no evaluation engine, agent registry, MCP integration, persistence,
benchmark engine, cost optimization, or automatic fallback/retry. Future work
belongs in [ROADMAP.md](ROADMAP.md).

## Provider status

Validation record supplied for TASK-014, dated 2026-10-05; no live call was
repeated by the release audit. Local validation covers Windows only.

| Provider    | Adapter | CLI compatibility | Live E2E                          | Notes                                                                                                     |
| ----------- | ------- | ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Codex       | Yes     | Verified, 0.154.0 | Verified, authenticated read-only | Default provider; Windows validation only.                                                                |
| Gemini CLI  | Yes     | Verified, 0.62.0  | Not verified                      | Personal OAuth blocked upstream for this use case; API-key/enterprise paths not E2E-verified in Vornariq. |
| Antigravity | No      | Researched        | N/A                               | Security-blocked; not exposed by the CLI or routing factory.                                              |

These are specific validation results, not guarantees for every version or
platform. Gemini authentication documentation and observed upstream behavior can
conflict; see the [readiness record](docs/V0_1_READINESS.md) for scope and
sources. Antigravity research is retained in its
[security gate](docs/ANTIGRAVITY_SECURITY_GATE.md).

## Current architecture

`CLI → RouteAndExecuteOrchestrator → RuleBasedRouter → selected ProviderAdapter`

The orchestrator owns selection and execution. The router does not execute;
comparison is a separate library operation. Doctor's free probes are separate
from model execution; explicit live smoke uses the orchestrator. See
[ARCHITECTURE.md](ARCHITECTURE.md).

## Quick Start

Install the public [npm package](https://www.npmjs.com/package/vornariq)
(Node.js >=22):

```sh
npm install -g vornariq
vornariq --help
vornariq --version
```

Or run `npx vornariq@0.1.0 --help` without a global installation. Version 0.1.0
is published; a clean registry install and CLI/ESM import smoke passed on
Windows. Vornariq remains PRE-ALPHA.

From a source checkout, use Node.js 22.13+ on the 22 LTS line or Node.js 24 LTS
and pnpm 11.19.0. The runtime engine remains Node.js >=22; local validation used
24.19.0.
[Hosted Linux and Windows CI](https://github.com/artashesmikoyan-lgtm/Vornariq/actions)
passes offline quality gates; live-provider validation remains Windows-only.
macOS is unverified.

```sh
git clone https://github.com/artashesmikoyan-lgtm/Vornariq.git
cd Vornariq
pnpm install
pnpm build
node dist/cli.js --help
node dist/cli.js --version
```

To execute a task, first configure/authenticate your local Codex CLI, then run:

```sh
node dist/cli.js run "Review this repository architecture" --require local-repository-read
```

This invokes a real provider and may consume account quota. Automated tests and
help/version commands require no provider installation, network, or model calls.
The installed npm package exposes the `vornariq` binary; the equivalent command
is:

```sh
vornariq run "Review this repository architecture" --require local-repository-read
```

### CLI options and security

- `--require <capability>` is repeatable. Identifiers remain open strings;
  duplicates are removed in first-seen order. `text-output` is always required
  by this command. Objective text never implies requirements or permissions.
- `--providers <list>` selects candidates in order, e.g. `gemini,codex` or
  `codex,gemini`. Default: `codex`. Gemini is opt-in pending live
  authentication-path validation. Unknown, empty, and duplicate provider IDs are
  errors.
- `--cwd <path>` selects an existing directory, defaulting to the current
  directory. Relative paths resolve against the caller's current directory; a
  Git repository is not required by the CLI.
- `--codex-workspace-write` explicitly allows Codex to modify files in the
  selected workspace. **Codex defaults to read-only.** A requirement such as
  `--require local-repository-write` does **not** grant permission. Without the
  flag, a write requirement is unroutable. Gemini remains read-only.
- `--json` prints exactly the durable orchestration result to stdout, including
  unroutable and provider-failure outcomes. Configuration/infrastructure errors
  instead use stderr and leave stdout empty.
- `--help`, `run --help`, and `--version` do not execute providers.

Quote the objective as one argument. Options take separate values, not `=`
syntax. Only `--require` may repeat; use `--` before a dash-prefixed objective.
The write grant requires Codex in the provider list and an explicit
`--require local-repository-write`. Both flags are required; neither alone
enables write execution. Vornariq delegates enforcement to the provider and does
not create an independent OS sandbox. Provider settings, customizations, and
inherited environment remain trust boundaries; see [SECURITY.md](SECURITY.md).

```sh
node dist/cli.js run "Update the tests" --require local-repository-write --codex-workspace-write
node dist/cli.js run "Review auth" --providers gemini,codex --require local-repository-read --json
```

There is no retry or fallback if the selected provider fails or is unavailable.

| Exit code | Meaning                                                           |
| --------- | ----------------------------------------------------------------- |
| 0         | Provider succeeded, or help/version displayed                     |
| 1         | CLI configuration or orchestration infrastructure error           |
| 2         | Unroutable; no provider executed                                  |
| 3         | Provider did not succeed: failed, cancelled, or incomplete result |

### Provider diagnostics and live E2E

```sh
node dist/cli.js doctor
node dist/cli.js doctor --json
node dist/cli.js doctor --help
```

Installed-package equivalent: `vornariq doctor`. Default doctor is free local
diagnostics only: Node/platform detection and pnpm, Git, Codex, and Gemini
version/help probes. It makes no model/API calls, reads no credentials, installs
nothing, and stores no history. It reports cwd and bounded versions, but never
prints PATH, environment variables, raw help, stderr, or exceptions.

`ready` means required CLI features were observed, not authentication or E2E
success. Other statuses are `warning`, `unavailable`, `incompatible`, and
`unverified`. Authentication is `not-tested`; E2E starts `unverified` on every
invocation. Missing optional Gemini and pnpm/Git issues warn without failing an
otherwise compatible default Codex check. Unavailable/incompatible/unverified
required providers exit 2; CLI/internal errors exit 1; compatible checks exit 0.

These commands are **explicit opt-ins that consume provider/account resources**:

```sh
vornariq doctor --live codex
vornariq doctor --live gemini --json
```

Each performs at most one read-only request through the existing orchestrator,
after checking the selected provider's CLI interface. It requests exactly
`Vornariq Codex E2E OK` or `Vornariq Gemini E2E OK`, instructs the provider not
to use tools, and verifies the response. Codex stays read-only; Gemini retains
default approval mode. There is no retry, fallback, second-provider execution,
or installation. Failed/incorrect responses exit 3; unavailable/incompatible
providers exit 2 without a request. Reports include factual duration, execution
status, and fixed safe error codes, not provider output or raw diagnostics.

Live success applies only to the current report; it is not persisted. JSON mode
outputs one report even for ordinary probe failures. Help checks cannot prove
stream protocol or authentication behavior. Historical release evidence is
recorded above; free Doctor checks do not persist or reproduce it. See the
[release checklist](docs/RELEASE_CHECKLIST.md).

### Library entry point

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

This adapter exposes read-only operation with no write opt-in. It explicitly
uses Gemini's non-interactive `approval-mode default`; it does not enable YOLO,
auto-edit, skip-trust, raw output, or Plan Mode. Optional `sandbox: true` is
available only when the local Gemini installation has a working sandbox runtime.

Personal Google OAuth is blocked upstream for the validated use case. API-key or
enterprise authentication is a possible path but has not passed Vornariq live
E2E. The adapter remains experimental; do not assume a successful login or help
probe proves model access.

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
