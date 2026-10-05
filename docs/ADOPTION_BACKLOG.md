# Small adoption contribution candidates

Proposals, not created/assigned GitHub issues. Each candidate preserves current
contracts and security boundaries: **no architecture expansion**, no new
providers/services/dependencies, and no live calls in automated tests. Use one
focused PR with relevant checks; confirm a real gap before implementation.

| Title                                           | Why it matters                                             | Expected scope                                                                                                                  | Difficulty |
| ----------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Document Windows pnpm diagnostic resolution     | Explain warning cases to source contributors.              | Reproduce a PATH/launcher edge case with a harmless fixture; clarify docs or minimally fix detection if demonstrated.           | medium     |
| Add Linux provider-validation instructions      | Hosted offline CI does not prove live Linux compatibility. | Document a separately authorized manual read-only validation checklist; label unverified results accurately.                    | easy       |
| Document shell quoting edge cases               | Prevent malformed objectives on first use.                 | Add PowerShell/Bash/zsh examples with spaces, quotes, and dash-prefixed objectives; use fake/no-model checks.                   | easy       |
| Add a sanitized successful JSON walkthrough     | Help scripts distinguish attempted execution from success. | Use a clearly labeled fixture to explain selected provider, nested execution status, and exit codes; no fabricated live result. | easy       |
| Make unsupported-capability guidance actionable | An unroutable result may confuse new users.                | Assess one error/help wording improvement with deterministic fake tests; preserve exit/status semantics.                        | medium     |
| Explain ready versus authenticated              | Compatibility probes can be mistaken for model access.     | Improve one diagnostic explanation/help line; preserve all readiness fields and probe behavior.                                 | easy       |
| Cover an additional safe argument edge case     | Prevent CLI regressions without model usage.               | Inspect existing parser coverage; add one missing case using fake dependencies or help-only execution.                          | easy       |
| Document a custom ProviderAdapter               | Explain library extensibility without shipping a provider. | Add a complete offline fake-adapter example following existing contracts and conformance harness.                               | medium     |
| Add a runnable offline package API example      | Existing library snippets assume task/agent variables.     | Compose valid Task/Agent/candidates with fake adapters using current ESM exports; verify locally without a model.               | medium     |
| Improve missing-provider troubleshooting        | Reduce time spent interpreting installation failures.      | Document one confirmed version/help failure and supported remediation; no auth-log collection or bypass flags.                  | easy       |

Related: [contributor workflow](../CONTRIBUTING.md),
[architecture](../ARCHITECTURE.md), [validation framework](ADOPTION.md).
