# Target Architecture

This document separates Vornariq's implemented contracts and provider adapters
from its target runtime architecture. Routing, provider selection, execution
orchestration, and evaluation behavior remain planned.

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

Implemented adapters include:

- Codex;
- Gemini.

Planned adapters include:

- OpenRouter; and
- local model providers.

Provider-specific authentication, SDKs, and response formats belong behind
adapter boundaries. The core must not require Codex-specific types even though
Codex is the first planned provider.

### Initial Codex CLI Transport (Implemented in M2)

The first provider adapter uses the locally installed Codex CLI through
`codex exec --json`. This is the initial transport decision, not a permanent
restriction; another Codex SDK or API transport may coexist later if
requirements justify it.

The adapter:

- passes a deterministic Task + Agent prompt over stdin without shell
  interpolation;
- consumes JSONL execution events and captures only the completed agent message;
- combines process exit state with terminal events before reporting success;
- maps portable token usage when Codex supplies it and measures duration with a
  monotonic clock (total tokens are derived only when both input and output
  counts are present);
- defaults to the `read-only` sandbox and requires callers to select
  `workspace-write` explicitly; and
- bounds incomplete JSONL lines and final messages to 1 MiB and stderr capture
  to 64 KiB.

Codex CLI owns authentication and user configuration. Vornariq does not read
Codex authentication files, accept API keys for this adapter, bypass local
rules, or depend directly on the OpenAI API. Session resume, output schemas,
routing, and public streaming APIs remain out of scope.

### Initial Gemini CLI Transport (Implemented in M3)

The second provider adapter invokes the locally installed Gemini CLI in headless
mode with `--approval-mode default --output-format stream-json`. A small
deterministic instruction is passed with `-p`; the complete Task + Agent prompt
is written directly to stdin to avoid shell interpolation and Windows
command-line length limits.

The adapter consumes newline-delimited stream events, retains only assistant
message content, requires both a successful process exit and terminal result,
and maps reported token usage plus locally measured duration. Session and model
identifiers from the init event may appear as provider-specific JSON-safe
metadata. Tool arguments, tool results, raw stderr, and internal reasoning do
not become public output.

TASK-005 intentionally exposes Gemini as read-only. In headless mode, the
`default` approval policy denies tool operations that would otherwise require
interactive confirmation. Vornariq does not default to `plan`, because current
non-interactive Plan Mode may transition into YOLO when implementation begins.
It also does not pass YOLO, auto-edit, skip-trust, or raw-output flags. An
optional `sandbox: true` adds `--sandbox` for installations with a configured
sandbox runtime; sandboxing is not assumed to be universally available.

Gemini CLI owns authentication, configuration, folder trust, and its inherited
process environment. Vornariq does not read Gemini credential files, accept or
persist Google API keys, change user settings, or install the CLI. Model
selection, session resume, write mode, and direct Google API transports remain
out of scope.

### Provider Conformance Harness (Implemented)

Every provider adapter is expected to pass the shared test-only conformance
harness before it is treated as supported. The harness exercises deterministic
success and failure seams without credentials, network access, or provider
executables. It verifies stable provider identity, portable execution fields,
JSON-safe durable values, normalized UTC timestamps, input immutability,
optional metrics discipline, structured failures, and removal of sensitive
diagnostics.

The harness intentionally permits provider-specific JSON metadata and output
fields. It does not expose provider SDK or process types, require every provider
to report the same metrics, or replace focused tests for provider-specific
transport and protocol behavior.

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
