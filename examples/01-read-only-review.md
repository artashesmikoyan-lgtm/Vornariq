# 01 — Read-only repository review

Prerequisites: installed Vornariq, a trusted repository, and
installed/authenticated Codex CLI. Follow
[Codex setup](https://learn.chatgpt.com/docs/codex/cli) and
[authentication](https://learn.chatgpt.com/docs/auth); Vornariq does not manage
login.

```sh
vornariq doctor
vornariq run "Review this repository architecture and identify the three highest-risk areas." --require local-repository-read
```

Doctor without `--live` performs free version/help probes, not a model call.
`ready` confirms interface compatibility, not authentication or E2E success. The
review **invokes a real model and may consume provider quota**.

The CLI adds `text-output` to the explicit read requirement. Its default
candidate is Codex, which declares both capabilities in read-only configuration;
the deterministic order therefore selects Codex and executes it once. No
capabilities are inferred from the review prompt.

No write grant is supplied, so the adapter uses Codex's read-only sandbox.
Vornariq relies on provider enforcement and does not add an independent OS
sandbox; review provider configuration and use trusted workspaces. Human output
starts with `Provider: codex`, followed by the response or a sanitized failure.
There is no retry/fallback. See
[exit codes](../README.md#cli-options-and-security).
