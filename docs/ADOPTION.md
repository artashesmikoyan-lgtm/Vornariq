# Public adoption and validation

Baseline date: **2026-10-05**. Goal: reduce friction across discover →
understand → install → try → report feedback, then use evidence to choose
development work. No telemetry or analytics SDK is added. Public counts are
snapshots, not users.

## Release baseline

| Signal                        | Verified baseline                        | Evidence / limits                                                                                                                                                                                         |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version                       | 0.1.0, PRE-ALPHA                         | Local package metadata and public npm registry metadata agree.                                                                                                                                            |
| GitHub                        | Public                                   | [Repository API](https://api.github.com/repos/artashesmikoyan-lgtm/Vornariq).                                                                                                                             |
| GitHub release                | v0.1.0 pre-release, published 2026-10-05 | [Release](https://github.com/artashesmikoyan-lgtm/Vornariq/releases/tag/v0.1.0); API reports published at 11:22:47 UTC, not draft.                                                                        |
| npm                           | Published                                | [0.1.0 registry metadata](https://registry.npmjs.org/vornariq/0.1.0); prior clean Windows install recorded in [readiness](V0_1_READINESS.md).                                                             |
| External users / repeat users | Unknown / not yet measured               | Installs and public counts cannot identify unique external users.                                                                                                                                         |
| External contributors         | 0 visible in contributor list            | [Contributors API](https://api.github.com/repos/artashesmikoyan-lgtm/Vornariq/contributors) returned only maintainer `artashesmikoyan-lgtm` (19 contributions); not evidence about uncredited help.       |
| External PRs                  | 0                                        | [All-state issues/PR API](https://api.github.com/repos/artashesmikoyan-lgtm/Vornariq/issues?state=all&per_page=100) returned an empty list.                                                               |
| External issues / feedback    | 0 public issues; other feedback unknown  | Same all-state API; no inferred private feedback.                                                                                                                                                         |
| GitHub stars                  | 0                                        | Repository API snapshot.                                                                                                                                                                                  |
| GitHub forks                  | 0                                        | Repository API snapshot.                                                                                                                                                                                  |
| npm downloads                 | Unknown / not yet measured               | [Downloads endpoint](https://api.npmjs.org/downloads/point/2026-10-05:2026-10-05/vornariq) returned `package vornariq not found`; registry confirms publication, but this response is not zero downloads. |
| README/demo engagement        | Unknown / not yet measured               | No page analytics installed or traffic data retrieved.                                                                                                                                                    |

GitHub and registry reads were performed during TASK-016 on 2026-10-05.
Discussions is disabled, so feedback links use Issues. No fabricated issue
numbers, users, installations, or usage claims are included.

The published npm 0.1.0 tarball and its bundled README remain unchanged. This
adoption update lives on GitHub main; README link improvements apply to the
repository now and to any separately authorized future package release.

To refresh, read the repository, all-state issues/PRs (paginate when nonempty),
contributors, releases, and registry endpoints above. Retry downloads after the
public metric becomes available; record its exact start/end interval and update
date. Counts can include bots, maintainer activity, mirrors, and CI downloads.
Keep confirmed external installs/executions separate from those proxies.

## Actionable first-time-user audit

Reviewed README, package metadata/npm-facing surface, roadmap, contributor and
security guides, architecture, `.github/`, `docs/`, and CLI help. Existing
contracts and CLI flags need no runtime change for this task.

| Adoption blocker                                                                     | TASK-016 response                                                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| The first real installed-package command appears after provider/architecture detail. | Put install → doctor → read-only run at the top; separate source checkout instructions.                                              |
| Codex authentication is assumed; free readiness may be mistaken for live success.    | Link official setup/login guidance and explain `ready`, quota, and unverified E2E next to the command.                               |
| Detailed library routing obscures the CLI's simple selection rule.                   | Add a 30-second routing explanation and direct-provider positioning.                                                                 |
| No short worked examples or reproducible demo.                                       | Add three examples and a five-minute evaluation guide, including an unroutable no-model path.                                        |
| Public feedback asks for bugs/features but not first-run experience.                 | Add usage feedback, provider/install context in bug reports, and troubleshooting/security chooser links.                             |
| No small contributor task list or evidence-led adoption plan.                        | Add good first contributions, a scoped backlog, this baseline, evidence log, distribution candidates, and unpublished launch drafts. |
| npm ships README/license/build outputs, not repository docs/examples.                | Use absolute GitHub document links in README; keep the published 0.1.0 artifact unchanged.                                           |
| Documentation index calls the completed release checklist actions still required.    | Update the index and add discoverable adoption/demo links.                                                                           |

## Adoption signals

Prioritize confirmed external install and first successful provider execution,
then useful issues/feedback, repeat usage, and external PRs. Record volunteered
OS, versions, provider, install method, result, and blocking step through the
usage template; remove secrets/private data. One feedback report is not a
population estimate.

Track npm downloads, stars, and forks as secondary context, with intervals and
sources. README/demo engagement proxies may include GitHub traffic if later
available to maintainers, or explicit user reports; none is measured now.
Downloads do not equal users, and stars alone should not drive feature choices.
A real user successfully running Vornariq matters more than superficial
engagement.

## Validation window

Use **2–4 weeks after public v0.1.0**, released 2026-10-05: review evidence
around **2026-10-19**, then decide by **2026-11-02** if enough evidence exists.
These are review targets, not scheduled automations. Distribute deliberately
after separate authorization; [candidates](DISTRIBUTION.md) and
[drafts](LAUNCH_COPY.md) are ready for review. This task posts nothing.

At each review, summarize actual feedback, refresh public counts, and identify
the smallest response to recurring blockers. Ask:

1. Are users installing it?
2. Do they understand its value proposition?
3. Does doctor help or confuse?
4. Do they successfully execute Codex?
5. What errors block first-time usage?
6. Do they request another provider?
7. Do they request routing improvements?
8. Do they request evaluation/benchmarking?
9. Do they use Vornariq as a CLI or library?
10. Would they use it repeatedly?

## Feature decision framework

| Repeated evidence                              | Candidate response (requires separate scoped work)                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Specific provider requests, such as OpenRouter | Assess provider expansion and its security/conformance requirements.                 |
| Users ask which provider is better             | Assess an independent evaluation engine; comparison currently reports evidence only. |
| Setup failures or confusing readiness          | Improve doctor/onboarding before expanding features.                                 |
| Eligibility/order is hard to express           | Clarify routing or assess a narrow deterministic improvement.                        |
| Automation demand with concrete workflows      | Explore agent/skill/MCP work with explicit permissions and security design.          |
| Little or no confirmed usage                   | Revisit positioning, distribution, and onboarding; do not add random features.       |

Tie a decision to concrete reports and successful workflows. A single request
can motivate investigation; it does not automatically commit the roadmap.

## First-user interview questions

- What made you try Vornariq, and what problem did you expect it to solve?
- Was installation clear? Did doctor help?
- Did routing make sense?
- What did you expect that was missing?
- Which provider do you use most?
- Would you use it again? What would make it useful enough to keep installed?
