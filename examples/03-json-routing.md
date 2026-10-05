# 03 — JSON routing and provider choice

## No-model example

Both configured adapters lack this deliberately unsupported capability:

```sh
vornariq run "Inspect routing without execution" --providers gemini,codex --require example-unsupported-capability --json
```

Expected exit code: **2**. stdout contains one orchestration result with
`status: "unroutable"`, a `routingDecision`, and `consideredProviders` in
Gemini/Codex order. Each rejection has `code: "MISSING_REQUIRED_CAPABILITY"` and
`capability: "example-unsupported-capability"`. No provider executes and no
model quota is consumed. This is not a dry-run flag: the explicit impossible
requirement prevents execution.

For free structured diagnostics, use `vornariq doctor --json`.

## Real execution — quota-consuming

With installed/authenticated Codex in a trusted repository:

```sh
vornariq run "Review this repository architecture" --providers codex,gemini --require local-repository-read --json
```

Both adapters declare read capability, so Codex wins by list order. stdout
includes `routingDecision.selectedProviderId` and `executionResult.status`.
`status: "executed"` means execution was attempted; check the nested status for
success. CLI configuration/infrastructure errors instead use stderr, leaving
stdout empty. JSON output can include private source in successful responses;
sanitize before sharing.

Illustrative alternative, **also a real model invocation**:

```sh
vornariq run "Review this repository architecture" --providers gemini,codex --require local-repository-read --json
```

Gemini now wins by order, not by quality or authentication readiness. Its live
execution remains unverified and may fail depending on authentication; the
validated personal OAuth path was constrained upstream. **Codex will not run if
Gemini fails.** One selected provider executes once, with no automatic fallback
or retry. Real calls were not run during TASK-016.
