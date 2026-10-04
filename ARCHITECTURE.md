# Target Architecture

This document describes Vornariq's intended architecture. It is a design
direction, not a statement of implemented capability. TASK-001 implements only
package identity metadata and repository tooling.

## Principles

- Local-first operation and no telemetry by default.
- A provider-neutral core with Codex as the first planned integration.
- Explicit boundaries between tasks, agents, providers, execution, and
  evaluation.
- Human-readable configuration and reproducible benchmarks.
- Least-privilege tools and credentials kept outside source control.
- Minimal dependencies and abstractions introduced only when requirements
  justify them.

## Target Flow

```text
User Task
   │
   ▼
Task Router ─── Policy Layer
   │
   ▼
Agent / Model Selection ◄── Registries
   │
   ▼
Execution Engine ◄── Provider Adapter
   │
   ▼
Evaluation Engine
   │
   ▼
Result + Metrics
```

## Core

- **Task Router** will choose an eligible agent/model route from task
  requirements, policy, and registry capabilities.
- **Execution Engine** will run an approved route and normalize provider output.
- **Evaluation Engine** will review results independently using deterministic
  checks where possible and model-based review only when justified.
- **Policy Layer** will constrain providers, tools, credentials, budgets, and
  other security-sensitive operations.

These components should depend on contracts rather than concrete provider SDKs.

## Registries

- **Agent Registry**: named agent roles and their declared capabilities.
- **Provider Registry**: available provider adapters and model capabilities.
- **Skill Registry**: reviewed skills that may be offered to an execution.
- **MCP Registry**: reviewed MCP servers/tools and their permissions.

Registries describe availability and capability. They should not absorb routing
or execution behavior, and TASK-001 does not implement them.

## Providers

Planned adapters include:

- Codex;
- Gemini;
- OpenRouter; and
- local model providers.

Provider-specific authentication, SDKs, and response formats belong behind
adapter boundaries. The core must not require Codex-specific types even though
Codex is the first planned provider.

## Conceptual Contracts

The following names guide M1 design and are deliberately not final interfaces:

- **Task**: requested outcome, inputs, constraints, and acceptance checks.
- **Agent**: an execution role plus declared capabilities and allowed resources.
- **Provider**: an adapter that can execute supported agent/model requests.
- **ExecutionResult**: normalized output, status, diagnostics, and observed
  metrics.
- **EvaluationResult**: independent checks, findings, and a reasoned outcome.

M1 will validate fields, lifecycle, error semantics, and serialization before
these contracts become public API.

## Observability

Executions are expected to record locally, when available:

- execution duration;
- token usage;
- estimated cost;
- success or failure; and
- deterministic test results.

Unknown metrics must remain unknown rather than being guessed. No telemetry will
be sent by default.

## Security Boundaries

Provider credentials remain external to configuration committed to Git. Tool and
MCP access must be explicit and least-privilege. Shell execution, third-party
integrations, and agent-generated actions require reviewable policy decisions
and auditable results.
