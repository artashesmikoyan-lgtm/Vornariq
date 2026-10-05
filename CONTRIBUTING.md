# Contributing

Vornariq is PRE-ALPHA. Focused issues and pull requests that preserve its
local-first, provider-neutral direction are welcome.

## Prerequisites

- Node.js 22.13+ on the 22 LTS line, or Node.js 24 LTS, for development tooling
- pnpm 11.19.0 (the version declared in `package.json`)
- Git

Corepack may be used to activate the declared pnpm version when it is available
in your Node.js installation.

## Setup

```sh
pnpm install
pnpm check
```

Individual development commands are:

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

Use `pnpm test:watch` during test-driven development and `pnpm lint:fix` or
`pnpm format` for safe mechanical fixes.

## Issues

Search existing issues before opening one. For bugs, include a minimal
reproduction, expected and actual behavior, environment details, and sanitized
logs. Feature requests should explain the use case and its fit with the roadmap.

Do not place credentials, private source, or exploitable vulnerability details
in a public issue. Follow [SECURITY.md](SECURITY.md) for security reports.

## Pull Requests

Keep changes focused and explain their motivation. Add tests for behavior
changes, update relevant documentation, and make `pnpm check` pass. Describe
security and documentation impact explicitly. Avoid unrelated refactors and new
dependencies unless the change requires them.

Provider changes must preserve the provider-neutral contracts and pass the
offline conformance harness. Automated tests must never call real Codex, Gemini,
or another model service; use fake process seams and synthetic fixtures. Live
checks require separate explicit approval and are not part of `pnpm check`.

Provider credentials must remain external to the repository, fixtures, and PRs.
Read [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries: routing selects,
orchestration executes one provider without retry/fallback, and comparison
reports evidence without choosing a winner. Capability requirements never grant
permissions. New adapters must pass the offline provider conformance harness.

## Good first contributions

- Clarify documentation or add a focused example from a real first-run problem.
- Document provider compatibility with version/platform and evidence limits.
- Add deterministic tests using fake providers or harmless local Node fixtures.
- Improve actionable error messages without exposing process diagnostics.
- Improve CLI help/UX while preserving behavior and permission boundaries.

See [adoption backlog](docs/ADOPTION_BACKLOG.md) for small scoped candidates;
these are proposals, not assigned GitHub issues. Complex provider integrations
need separate design/security work. Prefer one small, focused PR.
