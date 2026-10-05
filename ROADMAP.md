# Roadmap

Vornariq is PRE-ALPHA. Milestone scope may change as contracts are validated,
but the provider-neutral and local-first principles remain durable.

## M0 — OSS Foundation (complete)

Establish the TypeScript package, repository structure, public documentation,
quality gates, deterministic baseline test, and CI. No orchestration behavior is
in scope.

## M1 — Core Contracts (complete)

Validate and implement minimal contracts for tasks, agents, providers, execution
results, and evaluation results.

## M2 — Codex Provider (complete)

Implement the first provider adapter while preserving provider-neutral core
contracts.

## M3 — Multi-provider foundation (in progress)

Validate provider-neutral execution across multiple adapters:

- [x] Provider Conformance Harness
- [x] Gemini CLI Provider implementation
- [x] Provider Comparison Harness
- [ ] Gemini real CLI compatibility smoke (public v0.1 release gate)

Before public v0.1, install a supported Gemini CLI, verify its version/help and
required flags, and run one explicitly approved read-only end-to-end smoke.
Deterministic fake-process integration tests do not close this gate.

OpenRouter remains a future provider expansion after routing semantics are
established.

## M4 — Router v1 (complete)

Select configured providers using explicit effective capabilities, eligibility
filters, and ordered deterministic policy. Decisions are explainable and
JSON-safe; routing does not execute providers or consume comparison results.

## TASK-008 — Route-and-Execute Orchestrator v1 (complete)

The first complete routed execution flow reuses RuleBasedRouter and executes
exactly one selected ProviderAdapter from the same runtime candidate list.
Unroutable decisions execute nothing; provider failures and sanitized exceptions
never trigger fallback or retry. This does not mark the entire MVP complete. The
Gemini real CLI smoke remains a public v0.1 release gate under M3.

## TASK-009 — Router/Orchestrator CLI command (complete)

`vornariq run` exposes existing routed execution with explicit requirements,
ordered provider selection, working-directory validation, human/JSON output, and
stable exit codes. Codex is read-only by default; write access requires an
explicit grant. Gemini remains opt-in. Packaging and built help/version smoke
checks do not establish live provider compatibility or imply publication.

## TASK-010 — Provider Doctor and Live E2E Gate (complete)

`vornariq doctor` checks local CLI availability and features without model
usage. Explicit `--live codex|gemini` supports one read-only smoke through
production orchestration, tested only with fakes during TASK-010. Reports
describe the current invocation; they do not persist gate history.

Failed smoke reports retain sanitized provider failure reasons. Live Codex
validation remains an open gate; offline diagnostic tests do not close it.

Gemini's Windows npm launcher resolution is covered offline. Live Gemini
validation still requires successful CLI authentication and an approved smoke.

## Pre-v0.1 live release gates

TASK-012 assessed Antigravity CLI as CONDITIONAL_GO. See
[the security spike](docs/ANTIGRAVITY_PROVIDER_SPIKE.md) for the required
read-only policy, customization isolation, and timeout safeguards before
TASK-013. No Antigravity provider is implemented or enabled.

- [ ] Codex CLI compatibility verified in the release environment
- [ ] Codex real read-only E2E passed
- [ ] Gemini CLI installed
- [ ] Gemini required flags verified
- [ ] Gemini real read-only E2E passed

Help/fixture validation is not live E2E evidence. No live gate was marked passed
in TASK-010, and Gemini was not installed.

## Next task — TASK-011: Explicit real provider E2E validation

After separate resource approval, perform real Codex read-only E2E, then
install/verify Gemini CLI and perform Gemini read-only E2E. TASK-010 does not
perform this work.

## M5 — Agent Registry

Register specialized agent roles and capabilities without creating a plugin
marketplace.

## M6 — Evaluation Harness

Run independent and reproducible checks against execution results.

## M7 — Skills + MCP

Introduce controlled skill and MCP registries with explicit permissions.

## M8 — GitHub/Codex Maintainer Automation

Evaluate narrowly scoped maintainer automation after core security boundaries
are proven.

## M9 — Public v0.1 Release

Prepare a documented pre-1.0 release with supported workflows and upgrade notes.

## M10 — Community Validation

Collect reproducible use cases, failures, and compatibility feedback.

## M11 — Codex for OSS Application Readiness

Assess project maturity, governance, security, and evidence required for an
application.
