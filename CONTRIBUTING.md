# Contributing

Vornariq is PRE-ALPHA. Focused issues and pull requests that preserve its
local-first, provider-neutral direction are welcome.

## Prerequisites

- Node.js 22 or newer
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
