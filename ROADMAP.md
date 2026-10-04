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

## M3 — Additional Providers (in progress)

Validate the provider boundary with additional adapters:

- [x] Provider Conformance Harness
- [ ] Gemini CLI Provider (next)
- [ ] OpenRouter Provider (later)

## M4 — Router v1

Route tasks using explicit capabilities and deterministic policy.

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
