# Security Policy

Vornariq is PRE-ALPHA and does not yet have supported release lines. Security
reports are still welcome.

## Reporting a Vulnerability

Do not publish exploitable details in a public issue. If GitHub private
vulnerability reporting is enabled for the repository, use it to contact the
maintainers privately. If it is not enabled, open a public issue that requests a
private reporting channel without including the vulnerability details.

Include affected versions, impact, reproduction steps, and any suggested
mitigation only through the private channel. Remove credentials and unrelated
private data from all reports and logs.

## Security Expectations

Provider processes execute locally and own authentication and user
configuration. Vornariq does not intentionally read or persist provider
credentials. Processes inherit the caller's environment, and provider tools may
access local files or network services. Vornariq does not create its own OS
sandbox or isolate arbitrary provider customizations. Use trusted workspaces and
review provider settings.

Codex uses its read-only sandbox by default. CLI write execution requires both
`--require local-repository-write` and `--codex-workspace-write`. Library
callers must explicitly configure `sandbox: "workspace-write"` and declare
matching effective capabilities when routing. Gemini stays in default approval
mode with no write opt-in; its live authentication path remains unverified.
Antigravity is not an available provider.

Built-in adapter failures and Doctor diagnostics omit raw stderr and exceptions.
Successful assistant content is user output, not a secret-redaction service.
Low-level exported process runners return captured diagnostics to library
callers; do not log them as safe execution results. Provider execution currently
has no Vornariq timeout/cancellation contract; Doctor's free probes are bounded.

- Provider credentials must remain outside source control.
- Secrets must not appear in issues, logs, fixtures, examples, or benchmark
  output.
- Future MCP servers and tools must use least privilege and explicit
  authorization.
- Agent-generated shell operations are security-sensitive and require
  constrained, reviewable execution.
- Third-party integrations and dependency additions require security review.
- Telemetry must remain disabled by default unless a future, documented opt-in
  is introduced.

There is currently no private security email address; do not invent or guess
one.
