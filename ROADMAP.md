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

OpenRouter remains a future provider expansion after routing semantics are
established.

## M4 — Router v1 (complete)

Select configured providers using explicit effective capabilities, eligibility
filters, and ordered deterministic policy. Decisions are explainable and
JSON-safe; routing does not execute providers or consume comparison results.

## Next task — TASK-008: Route-and-Execute Orchestrator v1

Consume a RoutingDecision and runtime candidate map, invoking exactly the
selected ProviderAdapter. Routed execution is not implemented yet. The Gemini
real CLI compatibility smoke remains a public v0.1 release gate under M3.

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
