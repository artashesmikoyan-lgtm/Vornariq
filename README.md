# Vornariq

**Intelligent orchestration for coding agents.**

> **Status: PRE-ALPHA.** This repository currently provides the project
> foundation, provider-neutral TypeScript contracts, and local Codex and Gemini
> CLI adapters. Routing, provider selection, and evaluation behavior are not
> implemented yet.

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
adds the shared provider conformance harness and read-only Gemini CLI provider.
The package does not include an agent router, provider selection, an execution
engine, or an evaluator.

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

The runtime export remains truthful project identity metadata; core contracts
are exported as TypeScript types:

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
`workspace-write` when a task needs repository changes. General routing and
session resume are not implemented.

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
