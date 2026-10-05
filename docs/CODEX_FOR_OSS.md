# Codex for OSS — factual project evidence log

Date: **2026-10-05**. Internal-public evidence log, not an application
submission. No OpenAI endorsement or eligibility is claimed. Internal targets
below are not official OpenAI requirements.

## Project evidence

| Area                         | Evidence and limits                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                   | [Public MIT-licensed Vornariq](https://github.com/artashesmikoyan-lgtm/Vornariq).                                                                                                                                               |
| npm package                  | [vornariq@0.1.0](https://www.npmjs.com/package/vornariq); registry metadata verified during TASK-016.                                                                                                                           |
| Release history              | [v0.1.0](https://github.com/artashesmikoyan-lgtm/Vornariq/releases/tag/v0.1.0), 2026-10-05, pre-release; only release returned by API at baseline. No new release in TASK-016.                                                  |
| Tests                        | 240 offline tests across 23 files recorded at release in [readiness](V0_1_READINESS.md). TASK-016 does not change runtime/tests or repeat the full local suite.                                                                 |
| CI platforms                 | [Workflow](../.github/workflows/ci.yml): Linux Node 22.13.0 and Windows Node 24; release hosted checks passed. Hosted checks are offline, not live-provider validation.                                                         |
| Codex integration            | CodexProviderAdapter invokes local `codex exec --json`; default read-only, explicit workspace-write option, common provider contracts, offline conformance tests.                                                               |
| Verified Codex E2E           | Prior TASK-014 validation record: Windows Codex 0.154.0 authenticated read-only execution passed. Historical evidence, not a new live call or a cross-platform guarantee.                                                       |
| Other providers              | Gemini adapter/CLI compatibility implemented; live E2E unverified and personal OAuth constrained upstream. Antigravity security-blocked with no adapter.                                                                        |
| External usage/contributors  | External users unknown; 0 external contributors visible in the GitHub contributor list at baseline.                                                                                                                             |
| Issues / PRs / stars / forks | 0 public issues, 0 PRs, 0 stars, 0 forks at baseline; see sourced [adoption snapshot](ADOPTION.md#release-baseline).                                                                                                            |
| npm usage                    | Downloads unknown: public metric endpoint returned package-not-found despite verified registry publication. No inferred zero.                                                                                                   |
| Ecosystem integrations       | npm CLI and TypeScript/ESM library surface; local Codex/Gemini CLI adapters. No MCP, agent marketplace, evaluation engine, or other external integration claimed.                                                               |
| Maintenance activity         | [Commit history](https://github.com/artashesmikoyan-lgtm/Vornariq/commits/main/): `35fb805` Windows Gemini launcher fix, `2e8e54c` v0.1.0 preparation, `fb0277c` GitHub release verification, `5cd596f` npm publication record. |

Refresh public metrics via [ADOPTION.md](ADOPTION.md) and add dated evidence
after actual usage, releases, or integrations. Unknown activity stays unknown.

## Codex used to maintain Vornariq

TASK-016 is executed in Codex: it audited the first-run path, prepared the
documentation/examples and feedback templates, and ran offline/local validation.
The focused commit `docs: establish public adoption foundation` provides a
reviewable diff in repository history. This is a Codex-assisted maintenance
example, not a live invocation of Vornariq's Codex adapter. Prior commits listed
above demonstrate repository activity; Git history alone does not establish
which assistant produced those changes.

## Potential API credit usage

Future candidates, not implemented jobs or approved spending:

- Regression evaluation across providers.
- Codex-assisted PR review.
- Security regression analysis.
- Release validation.
- Reproducible agent/provider evaluation.

Each needs a scoped method, explicit budget, permission boundaries, and a clear
distinction between local CLI/plan quota and API-funded work. Current offline
checks need no API credits. No application is submitted by TASK-016.

## Informal application readiness gate

Internal project targets, **not official OpenAI requirements**:

- Active maintenance continues with reviewable changes and passing CI.
- Collect 2–4 weeks of public activity after 2026-10-05.
- Obtain some confirmed external usage; aim for 1–2 real external users if
  achievable.
- Collect genuine issues or feedback and respond to actual blockers.
- Prefer another meaningful release based on usage, when justified.
- Obtain reliable npm usage data with measurement interval and caveats.
- Explain ecosystem value through common contracts, routing, diagnostics, and
  extensibility.
- Define a concrete Codex/API credit use case with a bounded resource plan.

No arbitrary star count gates the project forever. Current external usage and
download evidence are incomplete; no eligibility judgment is made. Application
preparation/submission needs separate authorization and a fresh review of the
official program criteria at that time.
