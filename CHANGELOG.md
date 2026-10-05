# Changelog

All notable changes to Vornariq will be documented in this file.

## [Unreleased]

### Fixed

- Gemini execution resolves Windows npm launchers through the same shell-free
  resolver as Doctor, preserving arguments, stdin, and approval settings.

- Doctor smoke failures retain the adapter's sanitized code, message, and
  retryable flag without exposing error details or raw process output.

### Added

- TASK-013 Antigravity read-only security gate: SECURITY_BLOCKED pending a
  reproducible Windows isolation boundary; documents evidence limits and future
  denial tests without provider implementation or model execution.

- TASK-012 Antigravity discovery/security assessment with conditional
  integration prerequisites; no Antigravity provider implementation or live
  model execution.

- Local `vornariq doctor` environment/provider diagnostics, feature-based CLI
  checks, JSON/human output, and visible unverified E2E gates.
- Explicit single-provider read-only `doctor --live` smoke paths with response
  verification, no retry/fallback, and safe invocation-only reports.
- Bounded shell-free probes and fake-only tests; no real model usage or provider
  installation during TASK-010.

- `vornariq run` executable reusing routed execution, with explicit
  capabilities, ordered provider selection, cwd validation, human/JSON output,
  and exit codes.
- Read-only Codex default with explicit workspace-write opt-in, and read-only
  Gemini available only through an explicit provider list.
- CLI parsing, security, output, and integration tests using fake process seams;
  dependency-free help/version and local CLI quick-start documentation.

- Provider-neutral RouteAndExecuteOrchestrator connecting deterministic routing
  to exactly one selected adapter, with preserved routing/execution evidence,
  deterministic execution IDs, and injectable orchestration timestamps.
- Unroutable outcomes with zero execution, provider failures retained as data,
  and sanitized unexpected exceptions without retry or fallback.
- Focused orchestration tests and real Codex/Gemini integration through fake
  process runners, including read/write permission boundaries.

- Deterministic provider-neutral Router v1 with explicit effective capabilities,
  eligibility filters, ordered rules, documented preference precedence, and
  JSON-safe selected/unroutable decisions with rejection reasons.
- Router validation, determinism, immutable-input, and real-adapter integration
  tests proving selection without provider execution or security changes.
- Example routing policy and documented caller capability trust boundary;
  routing does not infer requirements or consume comparison evidence.

- Provider-neutral, sequential comparison runner that preserves ordered
  execution evidence without selecting or ranking a provider.
- Deterministic comparison tests covering validation, failure isolation,
  exception sanitization, JSON safety, metrics, immutable inputs, and real
  Codex/Gemini adapters through fake process seams.
- Read-only Gemini CLI provider using headless `stream-json`, stdin prompt
  delivery, default approval policy, bounded process I/O, and sanitized
  provider-neutral result mapping.
- Deterministic Gemini fixtures and tests for command safety, prompt generation,
  stream parsing, failures, usage, process cleanup, public exports, and shared
  provider conformance.
- Reusable provider conformance harness covering portable success and failure
  results, JSON safety, immutable inputs, timestamps, metrics, and secret
  sanitization.
- Codex CLI adapter conformance coverage using deterministic fake process and
  clock seams with no live provider calls.
- Initial Codex CLI provider using local `codex exec --json`, deterministic
  prompts, bounded process I/O, JSONL event parsing, and provider-neutral result
  mapping.
- Deterministic Codex fixtures and tests for command security, success,
  failures, usage, protocol evolution, and public exports.
- Initial provider-neutral core contracts for tasks, agents, providers,
  executions, evaluations, metrics, errors, and JSON-safe values.
- Deterministic contract, serialization, provider-boundary, and type-safety
  tests.
- Initial open-source repository foundation.
- Strict TypeScript package with truthful pre-alpha project metadata.
- Formatting, linting, type-checking, testing, and build quality gates.
- Public project, architecture, roadmap, contribution, security, and governance
  documentation.
- GitHub issue templates, pull request template, and continuous integration.
