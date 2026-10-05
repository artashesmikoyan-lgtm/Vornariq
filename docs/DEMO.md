# Five-minute evaluation demo

Budget roughly five minutes after provider setup; installation, authentication,
and model response time vary. This guide is documentation: TASK-016 ran no live
calls. Use a trusted repository you can share with your chosen provider.

## 1. Install and identify the package (about 30 seconds)

Requires Node.js >=22. For the published release:

```sh
npm install -g vornariq@0.1.0
vornariq --version
```

Expected version: `0.1.0`. Commands below are single lines for PowerShell, Bash,
or zsh. Run them from your repository directory.

## 2. Inspect provider readiness (about 30 seconds)

```sh
vornariq doctor
```

Free local diagnostics invoke no model. Look at the Codex version, missing
features, compatibility, authentication, and E2E fields. `ready` only confirms
the CLI interface: authentication is `not-tested` and E2E `unverified` unless a
separate explicit live smoke succeeds in that invocation. Missing optional
Gemini does not prevent an otherwise compatible default Codex check.

If Codex is absent, follow
[official CLI setup](https://learn.chatgpt.com/docs/codex/cli). Before
proceeding, authenticate in Codex itself with `codex login` and complete the
browser flow; see
[official authentication](https://learn.chatgpt.com/docs/auth). Vornariq does
not install providers or manage credentials. If you cannot or do not want to
spend quota, stop here and use the
[no-model JSON example](../examples/03-json-routing.md).

## 3. Run one safe read-only task (about 1–2 minutes)

This invokes Codex once and **may consume account quota**:

```sh
vornariq run "Review this repository architecture and identify the three highest-risk areas." --require local-repository-read
```

Human output starts with `Provider: codex`, followed by response or sanitized
error. Codex stays read-only because no write grant is given. Provider settings
remain a trust boundary; Vornariq does not create an independent OS sandbox.

## 4. Repeat with structured output (about 1–2 minutes)

This is a **second independent quota-consuming request**, not reuse of the
first:

```sh
vornariq run "Review this repository architecture and identify the three highest-risk areas." --require local-repository-read --json
```

Inspect `routingDecision.selectedProviderId` and `executionResult.status`.
Top-level `executed` is not proof of success. Exit 0 means provider success, 2
means unroutable, 3 means provider did not succeed, and 1 means CLI
configuration or infrastructure error (stderr instead of result JSON). Responses
need not match because provider output is not deterministic.

## 5. Explain and report (about 30 seconds)

Explicit read plus automatically required `text-output` matched Codex's
effective capabilities. Default order selected Codex; the orchestrator executed
it once. No capability inference, quality ranking, fallback, or retry occurred.

Tell us whether install → doctor → execution worked using
[I tried Vornariq](https://github.com/artashesmikoyan-lgtm/Vornariq/issues/new?template=usage_feedback.md).
Share minimal sanitized excerpts, never auth logs, credentials, or private
source.
