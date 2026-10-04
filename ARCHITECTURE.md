# Target Architecture

This document separates Vornariq's implemented contracts and provider adapters
from its target runtime architecture. Deterministic provider selection and
sequential comparison and routed execution are implemented; evaluation remains
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

## Implemented Routing Flow (M4)

```text
Task + Agent + explicit RoutingRequest requirements
     │
     ├── configured RoutingCandidates (effective capabilities)
     └── ordered RoutingPolicy
     ▼
RuleBasedRouter
     ▼
RoutingDecision
     └── selectedProviderId (e.g. Codex or Gemini), or unroutable
```

`RuleBasedRouter.route(request, policy)` is synchronous selection only, above
the unchanged core contracts. It does not inspect Task natural language or Agent
capabilities to infer requirements, execute adapters, call ComparisonRunner,
consume comparison results, rank model quality, estimate cost or latency, or
infer provider capabilities. There are no built-in provider preferences.

Candidates contain a unique `providerId` matching `adapter.provider.id`, a
runtime adapter, explicit effective `capabilities`, and optional `enabled`
(omission means enabled). **The router trusts these declarations.** It does not
verify CLI permissions or copy theoretical adapter metadata into effective
capabilities. A read-only configured adapter must not be declared write-capable.
Future factories may derive declarations from configuration. Routing never
changes sandboxes, approval modes, credentials, trust, or environment settings.

Eligibility is evaluated first, in candidate order. Every required capability
must occur exactly in the candidate's effective capabilities. Identifiers are
open, case-sensitive strings: unknown future capabilities work, and write does
not imply read. Disabled candidates, excluded providers, and providers outside
an existing allow-list are ineligible. An empty allow-list permits none;
exclusion still applies to allowed providers. Empty requirements impose no
capability restriction. All applicable rejection reasons are recorded, in
disabled/allow-list/exclusion/missing-capability order; missing capabilities
follow request order. Preference never overrides eligibility.

Rules are evaluated in declared order. `when.requiredCapabilitiesAll` matches
against explicit request requirements with ALL semantics; an empty list is
unconditional. The first matching rule alone supplies preferences. Selection
tries the following ordered lists, skipping unknown and ineligible provider IDs:

1. The first matching rule's `preferProviders`.
2. The request's `preferredProviderIds`.
3. The policy's `defaultProviderOrder`.
4. Original candidate order.

If a matched rule has no usable preference, routing continues at step 2, never
tries another rule, and retains `matchedRuleId`. Empty or omitted preference
lists fall through. There is no sorting, weighting, execution fallback, retry,
or hidden provider-specific behavior.

The request supplies `schemaVersion: 1`, stable `id`, normalized ISO UTC
`createdAt`, Task, Agent, candidates, and required capabilities. The policy uses
`schemaVersion: 1`, rules, and an optional default order. All routing lists must
contain unique non-empty strings. Empty request/candidate/rule IDs, duplicate
candidate or rule IDs, malformed policy or routing fields, mismatched adapter
identity, and zero candidates throw `RoutingError`. Core Task/Agent payload
validation remains the caller's responsibility; routing only consumes their IDs.

Decisions copy the request ID and timestamp; there is no internal clock or
randomness. Identical inputs produce identical decisions. `status: selected`
includes `selectedProviderId` and `selectionSource`; `status: unroutable` is a
normal result when no candidate is eligible and has neither field. Both include
schema version, Task/Agent IDs, required capabilities, optional matched rule ID,
and ordered considered-provider records with eligibility, selected state, and
stable rejection codes. Eligible unselected candidates have no rejection
reasons. Decisions contain only JSON data, never adapters, Task/Agent payloads,
executable objects, or configuration secrets. Inputs are not mutated.

See the [README example policy](README.md#deterministic-provider-routing).
TASK-008 connects this selection-only router to execution in a separate layer.

## Implemented Routed Execution (TASK-008)

```text
Task + Agent + explicit requirements + configured candidates + policy
     │
     ▼
RuleBasedRouter
     │
     ▼
RoutingDecision
     │
     ▼
RouteAndExecuteOrchestrator
     │
     ▼
selected ProviderAdapter (one attempt)
     │
     ▼
ExecutionResult
```

`RouteAndExecuteOrchestrator.run(request)` owns this complete flow. Its request
extends RoutingRequest with `policy`, keeping one Task, Agent, and candidate
list. It invokes the existing router once, resolves `selectedProviderId`
directly from that same candidate list, and passes the exact Task and Agent
references to the selected adapter. Routing semantics are not duplicated. No
input is mutated by orchestration; providers remain responsible for respecting
their readonly input contract.

The caller's routing request `id` also identifies the orchestration. The
provider execution ID is deterministically `${id}:execution`. Callers should use
a new ID for each distinct operation. There is no random ID generation,
persistence, or cross-call deduplication: explicitly calling `run` again creates
another attempt. Routing `createdAt` remains caller-supplied. Orchestration
`startedAt` and `completedAt` use an injectable `{ now(): Date }` clock and
normalized ISO UTC strings; completion is clamped to the start if the wall clock
moves backward. Invalid Date values produce `ORCHESTRATION_INVALID_CLOCK`.

The durable result is a discriminated union:

- `unroutable`: includes the actual unroutable RoutingDecision, IDs, and
  timestamps; has no ExecutionResult and invokes zero providers.
- `executed`: includes the actual selected RoutingDecision and the adapter's
  unchanged ExecutionResult, plus IDs and timestamps. It means one attempt
  returned, not that the provider succeeded.

Provider-returned failure is retained as data, including its error, metrics,
metadata, and retryable flag, without another attempt. Unexpected synchronous
throws or rejected promises are converted into a failed ExecutionResult using
the same sanitization pattern as ComparisonRunner: a fixed
`ORCHESTRATION_PROVIDER_EXCEPTION` code/message, `retryable: false`, and no raw
exception, stack, environment, or fabricated metrics. ComparisonRunner itself is
never invoked. Router configuration errors propagate as RoutingError; an
unresolvable selection throws `ORCHESTRATION_SELECTED_PROVIDER_MISSING` as an
internal invariant failure. Infrastructure errors are outside the provider
exception catch boundary.

Results contain no runtime candidates, adapters, or provider configuration. JSON
safety of provider-returned values relies on the existing ExecutionResult
contract and provider conformance; orchestration preserves these values rather
than rewriting or repairing them. Provider execution, unlike routing, need not
be deterministic; deterministic fakes and clocks provide reproducible tests.

This is the first complete routed execution flow, not a complete product MVP. It
executes one provider only, with deterministic routing, no fallback, no retry,
no parallel execution, no comparison, and no quality scoring. It does not infer
requirements from natural language or escalate permissions. Effective capability
declarations remain the caller's trust boundary, and adapters arrive already
configured. Timeout and cancellation behavior remain with the existing adapters.

## Implemented CLI (TASK-009)

`src/cli.ts` is the Node-shebang executable exposed by the package `bin` mapping
to `dist/cli.js`. npm/pnpm installations generate platform command shims. It
delegates to CLI command logic and sets `process.exitCode`, without an immediate
`process.exit` that could truncate output.

```text
CLI arguments → Task + built-in CLI Agent + explicit requirements
             → RouteAndExecuteOrchestrator → RuleBasedRouter
             → selected configured ProviderAdapter → ExecutionResult → output
```

The parser supports `run`, `doctor`, help, and version. It validates the
objective, option values, provider IDs, and duplicate options before
constructing adapters. Requirements are deduplicated with an explicit
`text-output` command invariant; there is no natural-language inference. The CLI
resolves and validates one working directory before construction. Node's
randomUUID supplies a Task ID and a shared routing/orchestration ID; routing
itself remains deterministic.

Only the CLI provider factory knows concrete provider names. Codex is the
temporary pre-release default and uses read-only sandboxing. The explicit
`--codex-workspace-write` flag controls both its configuration and effective
write capability; a write requirement cannot enable permission. Explicitly
selected Gemini remains read-only with its existing approval behavior. Both
candidates declare text output, repository read, and structured execution
events. Caller provider order becomes candidate order and policy default order,
with no rules or hidden preferences. Existing router/orchestrator code is
unchanged.

Human output shows the provider and final message, sanitized failure
code/message, or useful rejection facts. JSON mode writes only the durable
result to stdout; configuration/infrastructure errors produce a safe stderr
message. Error output does not include raw exceptions or process diagnostics.
Provider-returned messages retain the existing adapter sanitization boundary.
Exit codes are 0 success, 1 configuration/infrastructure error, 2 unroutable,
and 3 unsuccessful provider result (including cancellation or incomplete state).

Command tests inject IO and provider factories, or intercept the existing
process runner seams beneath real adapters. Help/version never construct
candidates. There are no config files, new dependencies, dynamic provider
discovery, retries, fallback, comparison commands, or implicit model calls
during validation.

## Provider Doctor and Live Gate (TASK-010)

The CLI delegates diagnostics to `src/doctor`. A small data table defines help
commands and required features. Default probes are pnpm/Git version,
`codex --version`, `codex exec --help`, `gemini --version`, and `gemini --help`.
Node/platform come from the running process. No adapter is constructed/executed
on this path, and no credential files are inspected.

Codex requires exec, JSON, sandbox, and cwd flags; stdin support is reported
when detectable. Gemini requires prompt, output-format, stream-json, and
approval-mode; sandbox availability is optional. Versions are bounded and
character-checked, not compared to a pinned version. This is help-text evidence,
not live protocol verification. Provider statuses distinguish ready, warning,
unavailable, incompatible, and unverified; authentication remains not-tested.

Probes use spawn with shell false, closed stdin, hidden Windows windows, a
15-second timeout, and a combined 128 KiB stdout/stderr limit. Only successful
stdout is inspected; stderr/raw exceptions are discarded. On Windows, PATH
lookup resolves native executables or recognized Node cmd launchers directly to
Node. Shim text is never shell-evaluated; unsupported wrappers remain
unverified. Only launcher files are inspected, not provider configuration or
credentials. PATH is used for lookup, never reported.

DoctorReport contains JSON environment/provider facts and invocation-only gates.
Default Codex incompatibility/unavailability/unverified checks exit 2; optional
Gemini and pnpm/Git issues warn. Explicit live selection makes that provider
required. Unsupported Node produces an environment error. Internal/CLI errors
exit 1. E2E is always initially unverified.

Only explicit `--live codex|gemini` constructs a read-only candidate via the
existing factory and calls RouteAndExecuteOrchestrator once. Failed
compatibility checks prevent execution. The task requests a fixed marker and
prohibits tool use; success requires the matching final response. Failures exit
3 without retry/fallback. Reports expose duration, execution status, and safe
fixed error codes, never raw execution output or metadata. No installation,
persistence, credential management, or monitoring is introduced. Automated tests
use fake processes/adapters; TASK-010 runs only free diagnostics on the local
environment.

## Implemented Comparison Flow

```text
Task + Agent
     │
     ▼
ComparisonRunner
     │
     ├── ProviderAdapter ──► Codex
     └── ProviderAdapter ──► Gemini
     │
     ▼
ComparisonReport
```

The v1 comparison runner is the first multi-provider orchestration primitive. It
requires at least two uniquely identified adapters, executes them sequentially
in caller-supplied order, and passes the same Task and Agent to each. Sequential
execution is deliberate for reproducibility and controlled resource use;
parallel execution is not implicit.

Each report retains the existing provider-neutral `ExecutionResult` values
rather than introducing a second execution schema. Provider-reported output,
failures, metadata, metrics, and legitimate estimated cost therefore remain
available without fabricated aggregates. Returned provider failures are
evidence, not comparison infrastructure failures. Unexpected adapter exceptions
become sanitized failed runs so later participants still execute.

Comparison is not routing or fallback. Reports contain no winner, ranking,
quality score, retry, or model judgment. The runner performs exactly one attempt
per requested participant and currently has no timeout or cancellation policy.

## Core

- **Task Router** selects an eligible configured provider from explicit
  requirements and policy. Agent/model selection and registry integration remain
  planned.
- **Routed Execution** invokes the selected adapter once; adapters normalize
  provider output. Broader execution-engine policy remains planned.
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
