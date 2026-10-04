# Target Architecture

This document separates Vornariq's implemented contract layer from its target
runtime architecture. M1 implements only the initial provider-neutral core
contracts; routing, provider adapters, execution, and evaluation behavior remain
planned.

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

## Core Contracts (Implemented in M1)

The initial contract layer is exported from `src/core/contracts`:

- **Task** describes requested work, structured input, constraints, and creation
  time without provider or routing choices.
- **Agent** describes a logical worker role and open, portable capability
  identifiers. It does not contain prompts or process state.
- **Provider** contains provider identity and capability metadata. The separate
  **ProviderAdapter** interface is the behavioral boundary for future adapters.
- **ExecutionResult** is a discriminated lifecycle union for pending, running,
  succeeded, failed, and cancelled attempts. Successful output and structured
  failure data remain provider-neutral.
- **EvaluationResult** records a separate assessment, optional ranged score, and
  qualitative findings.

Every top-level durable M1 object has `schemaVersion: 1`. Durable timestamps are
ISO 8601 UTC strings, IDs are stable strings within their owning scope, and
metadata, input, output, and details use the recursive `JsonValue` model. These
values require ordinary JSON data: no functions, `Date`, `BigInt`, `Map`, `Set`,
or provider SDK instances.

The contracts are TypeScript compile-time boundaries; M1 does not add runtime
schema validation. Provider implementations must explicitly translate SDK
requests, responses, errors, and usage into these types. No provider SDK type is
part of the core.

These are initial pre-1.0 contracts and may evolve before Vornariq 1.0.

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
