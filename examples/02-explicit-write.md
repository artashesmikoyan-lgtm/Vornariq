# 02 — A write requirement is not permission

The following is a routing-only rejection. Neither read-only CLI candidate
declares effective write capability without an explicit grant:

```sh
vornariq run "Add a small regression test for an existing bug." --require local-repository-write
```

Expected: no eligible provider, exit code 2, and **no provider execution**.
Prompt wording and `--require local-repository-write` do not grant permission.

## Explicit Codex write grant — destructive-capable

The next command **can modify workspace files and consume provider quota**. Use
a trusted disposable checkout or clean Git working tree. Check
`git status --short` first, preserve your work, and understand the task before
granting access.

```sh
vornariq run "Add a small regression test for an existing bug." --require local-repository-write --codex-workspace-write
```

Both flags are required. The CLI now configures Codex with `workspace-write` and
declares matching effective write capability. Gemini has no write opt-in.
Vornariq does not create its own OS sandbox; provider settings and inherited
environment remain trust boundaries. No automatic retry/fallback occurs.

After execution, inspect `git status --short` and `git diff`, then run the
appropriate checks before accepting changes. Do not automatically commit output.
This write command was **not executed during TASK-016**.
