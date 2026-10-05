# Roadmap

Vornariq is PRE-ALPHA. Completed milestones describe implemented and
offline-tested behavior, not production readiness or universal provider
compatibility.

| Milestone                      | Status   | Evidence/scope                                                                                               |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| M0 — OSS foundation            | COMPLETE | MIT license, repository guides, TypeScript tooling, CI workflow. Hosted Linux and Windows offline CI passes. |
| M1 — Core contracts            | COMPLETE | Provider-neutral task, agent, execution, evaluation data contracts and tests.                                |
| M2 — Codex provider            | COMPLETE | CLI adapter, offline conformance, prior Windows 0.154.0 authenticated read-only E2E.                         |
| M3 — Multi-provider foundation | COMPLETE | Gemini adapter, conformance suite, sequential comparison report. Gemini live E2E is separately pending.      |
| M4 — Router v1                 | COMPLETE | Deterministic selection without execution or inferred permissions.                                           |
| M5 — Routed execution CLI      | COMPLETE | TASK-008 orchestrator and TASK-009 CLI; one selected provider, no retry/fallback.                            |
| M6 — Diagnostics / validation  | COMPLETE | TASK-010 free Doctor, explicit live-smoke support, safe failure reporting; no persisted gate history.        |
| M7 — Public v0.1               | NEXT     | Public repository and initial hosted CI complete; TASK-015A prepares the GitHub pre-release.                 |

## Pre-v0.1 live release gates

The TASK-014 validation record reports Codex CLI 0.154.0 compatibility,
authentication, and read-only E2E passed locally on Windows. The audit does not
repeat a live invocation. Free Doctor reports remain invocation-only and always
start with E2E unverified.

Gemini CLI 0.62.0 compatibility and Windows npm launcher support are verified.
Personal OAuth is blocked upstream for this use case. API-key/enterprise paths
remain possible but not live-verified in Vornariq. This is a documented
limitation, not a blocker to publishing the experimental repository.

Antigravity integration is **BLOCKED** pending a defensible read-only security
boundary. There is no production adapter or routing candidate. Preserve the
[discovery spike](docs/ANTIGRAVITY_PROVIDER_SPIKE.md) and
[security gate](docs/ANTIGRAVITY_SECURITY_GATE.md) as research, not runtime
support.

## Release preparation — IN PROGRESS

The [public repository](https://github.com/artashesmikoyan-lgtm/Vornariq) exists
and initial Linux/Windows CI passed. TASK-015A prepares version 0.1.0 and its
GitHub pre-release, gated on the release commit's hosted CI. npm publication
remains separately authorized TASK-015B work. See
[readiness](docs/V0_1_READINESS.md) and [checklist](docs/RELEASE_CHECKLIST.md).

## Future work — FUTURE

- OpenRouter or local provider expansion after scoped provider/security work.
- Agent registry; controlled skills and MCP integrations.
- Independent evaluation and reproducible benchmark suites.
- GitHub maintainer automation and community validation.

These are directions, not implemented features or commitments. Evaluation data
contracts and comparison reports do not establish an evaluation or benchmark
engine. No persistence, UI, new authentication layer, fallback, or automatic
retries are part of the current release candidate.
