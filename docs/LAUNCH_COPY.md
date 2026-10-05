# Launch drafts — unpublished

Prepared 2026-10-05. Review target, community rules, final copy, and
authorization before sharing. Nothing here has been posted or submitted. These
drafts claim no external traction, production readiness, or endorsement.

## 1. Short GitHub/social announcement

Vornariq v0.1.0 is an open-source, local-first orchestration layer for coding
agents. It provides deterministic routing, common execution contracts, and
diagnostics around Codex/Gemini CLI adapters.

PRE-ALPHA: Codex is the default and read-only by default; prior authenticated
read-only E2E was verified on Windows. Gemini live execution remains unverified.
No quality ranking, evaluation engine, or automatic fallback/retry.

Try `npm install -g vornariq`, then `vornariq doctor`. A real run needs an
installed/authenticated provider and may consume quota. I'd value feedback on
whether the first-run path is clear.

[Source and quick start](https://github.com/artashesmikoyan-lgtm/Vornariq) ·
[Demo](https://github.com/artashesmikoyan-lgtm/Vornariq/blob/main/docs/DEMO.md)

## 2. Show HN style post

Title: Show HN: Vornariq – local orchestration for coding-agent CLIs

I'm building Vornariq, a MIT-licensed TypeScript CLI/library that puts explicit
capability requirements and a common execution contract around coding-agent
providers. Direct provider CLIs remain useful; this layer is for workflows that
need consistent contracts, eligibility/routing, and diagnostics.

v0.1.0 supports Codex/Gemini adapters. Routing is deterministic: select an
eligible provider, execute it once. It does not infer requirements from prompts,
rank model quality, or retry/fall back. Codex defaults to read-only; writes need
both a requirement and an explicit permission flag.

It's PRE-ALPHA. Codex read-only E2E has been verified on Windows; Gemini live
execution remains unverified because of authentication constraints. Hosted
Linux/Windows CI uses offline tests, not live model calls.

Install with `npm install -g vornariq`, run `vornariq doctor`, then follow the
[five-minute demo](https://github.com/artashesmikoyan-lgtm/Vornariq/blob/main/docs/DEMO.md).
Doctor is free without `--live`; real runs need provider setup and may consume
quota. I'm looking for first-run feedback: does this layer solve a workflow
problem for you, and what blocks trying it?

[Repository](https://github.com/artashesmikoyan-lgtm/Vornariq)

## 3. Reddit-style technical introduction

Title: Vornariq: a PRE-ALPHA common execution layer around coding-agent CLIs

Disclosure: I maintain Vornariq. It's open-source (MIT), local-first, and
available as `vornariq@0.1.0` on npm.

The use case is explicit provider eligibility and consistent execution results:
declare required capabilities, choose the first eligible provider in a
deterministic order, execute once. There is no prompt-based capability
inference, automatic fallback/retry, quality ranking, or evaluation engine.

Codex and Gemini CLI adapters are implemented. Codex is the default, with prior
authenticated read-only E2E verified on Windows. Gemini live execution remains
unverified and its validated personal OAuth path was constrained upstream.
Vornariq leaves authentication with providers. Default doctor probes are free;
actual runs may consume provider quota. Writes require an explicit grant in
addition to a capability requirement.

[Source](https://github.com/artashesmikoyan-lgtm/Vornariq) and
[demo](https://github.com/artashesmikoyan-lgtm/Vornariq/blob/main/docs/DEMO.md).
If this fits your workflow, I'd like feedback on installation, doctor, routing,
and whether you would keep it installed. Please share sanitized results only.

Posting note: use only where current rules permit this introduction; obtain
moderator guidance if unclear. This draft is not evidence of that permission.

## 4. Developer-community message

I've released Vornariq v0.1.0, an OSS local-first TypeScript CLI/library for
coding-agent orchestration. It wraps Codex/Gemini CLIs in common contracts,
explicit capabilities, deterministic routing, and diagnostics. Direct CLIs are
still useful; Vornariq is a layer around them.

It's PRE-ALPHA: Codex is default/read-only and has prior Windows E2E evidence;
Gemini live E2E remains unverified. No automatic fallback/retry or evaluation
engine. `vornariq doctor` invokes no model without `--live`; real runs require
provider installation/authentication and may consume quota.

If you evaluate developer tools, could you try the
[short demo](https://github.com/artashesmikoyan-lgtm/Vornariq/blob/main/docs/DEMO.md)
and report what worked or confused you through
[usage feedback](https://github.com/artashesmikoyan-lgtm/Vornariq/issues/new?template=usage_feedback.md)?
[Repository](https://github.com/artashesmikoyan-lgtm/Vornariq).
