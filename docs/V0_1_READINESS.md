# v0.1 readiness audit — TASK-014

Date: 2026-10-05. Target: **public PRE-ALPHA repository**, followed by
separately authorized 0.1.0 release preparation. Version remains **0.0.1**.
Baseline: `add2a37`, clean. This document records that baseline plus the focused
TASK-014 hardening commit containing this file; no self-referential commit hash
is required.

## Scope and evidence

Audited all 107 baseline tracked files: source, contracts, tests/fixtures,
package and lockfile, build settings, guides/research, GitHub
workflow/templates, license, and exclusion rules. Scanned all 170 reachable
unique historical blobs across 14 commits for credential patterns, sensitive
assignments, personal paths, email addresses, and obsolete branding. No known
credential material was found. This is a scoped audit, not a proof that
arbitrary secrets cannot exist.

Two current research documents contained a personal Windows executable path;
they now use `%LOCALAPPDATA%`. Older commits retain those paths and normal Git
author attribution. No serious private information or credential requiring
history rewriting was identified; history was preserved. No binaries, caches,
generated dist, node_modules, logs, or database files are tracked. The largest
historical blob is the approximately 49 KB lockfile. No obsolete branding or
release-blocking TODO was found.

## Provider status and evidence provenance

| Provider    | Adapter     | CLI compatibility        | Live E2E                                           | Release scope                                                              |
| ----------- | ----------- | ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Codex       | Implemented | Windows 0.154.0 verified | Authenticated read-only passed in prior validation | Default provider, read-only by default.                                    |
| Gemini CLI  | Implemented | Windows 0.62.0 verified  | Not verified                                       | Personal OAuth blocked for this use case; API-key/enterprise path pending. |
| Antigravity | Absent      | Researched               | N/A                                                | Security-blocked; no runtime integration.                                  |

Prior provider results above are the maintainer's explicit TASK-014 validation
record. The audit did not reproduce them with live calls or inspect credentials.
Offline tests do not constitute live-provider evidence. Free Doctor E2E fields
correctly remain unverified for each new invocation.

Gemini's generic
[authentication guide](https://geminicli.com/docs/get-started/authentication/)
still describes Google login and API-key/Vertex alternatives. An upstream
[personal OAuth failure report](https://github.com/google-gemini/gemini-cli/issues/28846)
describes `UNSUPPORTED_CLIENT` and is closed as not planned. That report
concerns an older macOS version; it corroborates the limitation, not Windows
0.62.0 success or universal account behavior. Vornariq does not promise personal
OAuth support or live success on API-key/enterprise authentication.

## Hardening and architecture

- CLI write access now requires both `--require local-repository-write` and
  `--codex-workspace-write`; flag-only requests fail before provider
  construction.
- Built-in adapter failures no longer copy arbitrary protocol error codes into
  public details. Regression tests cover human and JSON output for both
  providers.
- npm contents allow only built JavaScript/declarations plus automatically
  included README, LICENSE, and package metadata. Source/declaration maps are
  disabled for release builds and excluded even if stale local maps exist.
- Public positioning, provider status, research paths, roadmap, security policy,
  agent/contributor guidance, and release checklist were corrected.
- Ignore rules cover common local provider credential directories/files and
  tarballs.
- CI retains offline quality gates and adds Windows coverage alongside Linux on
  Node 22.13.0. No hosted CI run has been claimed.

Core contracts are unchanged. Router selection, one-provider orchestration, and
comparison remain separate; no fallback or retry was added. Root exports contain
intended library APIs and existing process-runner injection seams. Parser
helpers, fixtures, and CLI internals are not root exports; no public API was
removed. Low-level runners return diagnostics and are not safe logging surfaces.

## Package, dependencies, platforms

Name remains `vornariq`; version 0.0.1; ESM; MIT; bin `dist/cli.js`; declaration
entry `dist/index.d.ts`. Keywords added. No remote exists yet, so repository,
bugs, and homepage URLs remain unset rather than invented. Configure them in
TASK-015 after the repository exists. No runtime dependencies; existing pinned
development dependencies and lockfile retained.

On 2026-10-05, a direct npm registry tooling lookup returned E404 for
`vornariq`: no public package collision found, not a reservation or guarantee of
publication rights. `pnpm audit --json` reported zero vulnerabilities across 155
dependencies.

Runtime metadata remains Node >=22. Code uses compatible Node built-ins and
ES2022/NodeNext output; this does not claim every Node release was executed.
Development requires Node 22.13+ on the 22 LTS line or Node 24 LTS because
ESLint and Vitest have stricter engine ranges than the runtime. Local validation
uses Windows, Node 24.19.0, pnpm 11.19.0. Linux is configured in CI but not yet
verified by hosted CI; macOS is unverified. POSIX shebang/ESM structure can be
inspected on Windows without claiming POSIX execution.

## Validation results

Targeted regression run: **73 tests passed**. One sandboxed attempt hit a Vitest
temporary-cache ENOENT; the same offline tests passed outside that sandbox. The
single final `pnpm check` passed formatting, lint, type checking, **240 tests
across 23 files**, and build. `git diff --check` and local Markdown link-target
checks passed. No core-contract diff exists.

`pnpm pack --dry-run` and the actual tarball inventory contain **85 files**: 41
built JavaScript files, 41 declarations, README, LICENSE, and package.json. The
inspected tarball is 34,911 bytes. Tests, sources, maps, research, logs,
credentials, and fixtures are excluded. An offline temporary npm install passed
the generated Windows shim's help, version, run-help, and doctor-help checks,
plus the installed ESM root import. The POSIX shebang was inspected, not
executed on POSIX. All temporary tarball/install artifacts were removed.

Built help, version, run-help, doctor-help, Doctor human output, and Doctor JSON
all exited 0 without stderr. JSON parsed successfully. Free Doctor confirmed
Codex 0.154.0 and Gemini 0.62.0 feature compatibility; authentication remained
not-tested and both invocation-only E2E fields remained unverified. CLI JSON
success/failure/unroutable behavior is additionally covered by offline tests.

Real model invocations during TASK-014: Codex **0**, Gemini **0**, Antigravity
**0**.

## Limitations and release actions

Vornariq delegates permissions to installed provider CLIs; it does not create an
OS sandbox or isolate inherited hooks/MCP/settings/environment. Successful model
content is not automatically secret-redacted. Provider execution has no Vornariq
timeout/cancellation contract; free diagnostic probes are bounded.
Provider-internal retries are outside the orchestration no-retry guarantee.

Gemini live authentication, Antigravity security, macOS verification, future
evaluation/benchmark/registry work, and unrun hosted CI are documented
limitations, not evidence of completed functionality. Public CI and
security-reporting setup, real repository metadata, version/changelog
finalization, tag, GitHub release, npm publication, and post-publication smoke
remain TASK-015 actions requiring separate authorization. See
[release checklist](RELEASE_CHECKLIST.md).

## Decision

**READY_FOR_PUBLIC_REPO.** No release-critical blocker remains in the audited
content. This means ready for separately authorized public repository creation,
not that v0.1.0 is published or production-ready. The final working-tree status
and commit identity are reported after committing the audit.

No repository, push, tag, release, publication, global package replacement, or
real provider invocation was performed by TASK-014.
