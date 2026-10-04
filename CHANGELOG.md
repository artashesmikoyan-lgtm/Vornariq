# Changelog

All notable changes to Vornariq will be documented in this file.

## [Unreleased]

### Added

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
