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
| M7 — Public v0.1               | COMPLETE | GitHub v0.1.0 pre-release and npm 0.1.0 published; clean Windows registry install and CLI/ESM smoke passed.  |

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

## Release preparation — COMPLETE

The [public repository](https://github.com/artashesmikoyan-lgtm/Vornariq) exists
and Linux/Windows CI passed on the release commit. TASK-015A published the
[GitHub v0.1.0 pre-release](https://github.com/artashesmikoyan-lgtm/Vornariq/releases/tag/v0.1.0).
TASK-015B.1 published [vornariq@0.1.0](https://www.npmjs.com/package/vornariq)
to npm on 2026-10-05, with `latest` pointing to 0.1.0. A clean registry install,
CLI version/help, and root ESM import passed on Windows with zero model calls.
The GitHub release and tag are unchanged. See
[readiness](docs/V0_1_READINESS.md) and [checklist](docs/RELEASE_CHECKLIST.md).

## Post-release adoption — TASK-016

The [first-run demo](docs/DEMO.md), [examples](examples/README.md), usage
feedback template, and [small contribution backlog](docs/ADOPTION_BACKLOG.md)
establish the public adoption foundation. [ADOPTION.md](docs/ADOPTION.md)
records sourced baseline metrics and a 2–4 week validation window: review around
2026-10-19 and 2026-11-02 before choosing the next major feature.

[Distribution candidates](docs/DISTRIBUTION.md) and
[launch copy](docs/LAUNCH_COPY.md) are prepared, not posted. The
[Codex for OSS log](docs/CODEX_FOR_OSS.md) contains factual evidence and
internal targets, not an application or eligibility claim. Next priority is
deliberate distribution and external install/execution feedback; future features
remain conditional on that evidence. Version stays 0.1.0.

## Future work — FUTURE

- OpenRouter or local provider expansion after scoped provider/security work.
- Agent registry; controlled skills and MCP integrations.
- Independent evaluation and reproducible benchmark suites.
- GitHub maintainer automation and community validation.

These are directions, not implemented features or commitments. Evaluation data
contracts and comparison reports do not establish an evaluation or benchmark
engine. No persistence, UI, new authentication layer, fallback, or automatic
retries are part of the current release candidate.
