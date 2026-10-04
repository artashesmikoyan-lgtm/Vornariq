# Vornariq

**Intelligent orchestration for coding agents.**

> **Status: PRE-ALPHA.** This repository currently provides the project
> foundation only. Routing, provider integrations, execution, and evaluation are
> planned and are not implemented yet.

## What is Vornariq?

Vornariq is a local-first orchestration and evaluation layer for coding agents.
It is intended to complement coding agents—not replace them—by providing a
provider-neutral place to route tasks, execute work, review results
independently, and compare quality, cost, and latency.

Codex-native workflows are an initial priority. The target ecosystem also
includes Gemini, OpenRouter, local providers, specialized agents, controlled
skills, MCP tools, and reproducible evaluation.

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

The project is in **PRE-ALPHA**. Milestone M0 establishes the open-source
repository, TypeScript package, quality gates, documentation, and CI. It does
not include an agent router or any provider adapter.

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

The only current runtime export is truthful project identity metadata:

```ts
import { project } from "vornariq";

console.log(project.status); // "pre-alpha"
```

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
