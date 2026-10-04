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
