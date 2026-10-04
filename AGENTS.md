# Agent Guidelines

- Read the relevant documentation and nearby code before making changes.
- Treat build, fix, and configure requests as implementation tasks: make the
  change, test it, and report the result.
- Preserve provider-neutral boundaries; Codex is first-class, not hard-wired.
- Prefer minimal dependencies and the simplest change that fits the
  architecture.
- Never commit secrets or silently add cloud services, telemetry, or external
  state.
- Add or update tests for behavior changes and run the relevant quality gates.
- Keep documentation truthful; never claim unimplemented features.
- Update `CHANGELOG.md` and `ROADMAP.md` when the change affects them.
- Avoid broad refactors unrelated to the task and preserve user work.
