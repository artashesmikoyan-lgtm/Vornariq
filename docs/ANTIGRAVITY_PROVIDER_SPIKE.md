# TASK-012: Antigravity provider discovery and security spike

Assessment date: 2026-10-05. Decision: **CONDITIONAL_GO**. No Antigravity
provider, parser, routing candidate, or Doctor integration was implemented.
Model invocations: Antigravity 0, Codex 0, Gemini 0.

Subsequent TASK-013 decision: **SECURITY_BLOCKED**. The
[read-only security gate](ANTIGRAVITY_SECURITY_GATE.md) supersedes this conditional
architecture recommendation for repository execution. No safe runtime profile
has been established.

## 1. Executive conclusion

The transport is a credible adapter target, but the installed CLI is not a
read-only provider by default. Do not enable a candidate merely because its
prompt prohibits edits. TASK-013 must fail closed unless an effective deny
policy and trusted customization boundary can be established. Authentication for
this specific account and actual inference remain unverified.

This is conditional approval of the architecture, not approval to execute
against the user's repository or spend model quota. If the prerequisites below
cannot be met, downgrade the integration to NO_GO.

## 2. Installed/version information

Local observation: stable installer delivered **1.2.16**, also marked latest on
the
[official releases page](https://github.com/google-antigravity/antigravity-cli/releases).
Binary SHA256 at inspection:
`871E1EEB205DD3269B762E81808B7A86FE7CF73B59DA51B14E3D8AC005581BFE`. The official
installer states that the binary self-updates. Recheck version at execution
time; this hash records an observation, not a permanent pin.

Baseline was `616a9c6` plus only the known TASK-011B changes. Those changes were
reviewed and committed separately as `35fb805`, producing a clean spike
baseline. Their existing verification was 81 targeted tests, typecheck, lint,
build, free Gemini launcher checks, and whitespace validation; no expensive
rerun was needed.

## 3. Official migration context

Google explicitly connects Gemini CLI migration to Antigravity's shared agent
harness in its
[launch announcement](https://www.antigravity.google/blog/introducing-google-antigravity-cli).
The [migration guide](https://www.antigravity.google/docs/cli/gcli-migration/)
describes optional import of old configuration and customizations. Migration is
not protocol compatibility: the Gemini parser cannot be reused unchanged. No
settings or plugins were imported during this spike.

## 4. Installation method

Executed the documented Windows command:

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

Source:
[installation and authentication](https://www.antigravity.google/docs/cli/install/).
The official script downloads a manifest-selected native binary, checks SHA512,
and runs its setup. Installation completed successfully; the installer
registered the user PATH entry. No unrelated package was changed. Downloading
initially appeared stalled; a bounded HTTPS check succeeded and final installer
output confirmed completion. No second installation was performed.

## 5. Authentication model

Official installation documentation describes Google browser sign-in with native
keyring reuse, remote OAuth, and an explicitly configured Gemini API-key mode.
No credential file, keyring, environment secret, or token was inspected.

Local authentication: **unknown**, method not locally established. Installed
help does not expose a dedicated login-status command. Interactive startup was
not needed for the version/help probes and was not performed: startup can load
customizations. This avoids conflating an existing IDE login with a proven CLI
session. Normal browser authentication may be completed later without a prompt.

## 6. Windows executable resolution

Direct native executable: `C:\Users\artas\AppData\Local\agy\bin\agy.exe`. No npm
shim is required. `Get-Command agy` and `where.exe agy` did not resolve it in
the current inherited environment, even after installation. The installer
reported that a terminal restart is needed. No manual PATH changes were made.
Future configuration can use the verified absolute executable path.

## 7. Headless invocation and installed help

Local help advertises the following surface:

| Area          | Installed 1.2.16 flags                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| One shot      | `-p`, `--print`, `--prompt`                                                                            |
| Output        | `--output-format`: text, json, stream-json; `--json-schema`                                            |
| Input         | `--input-format`: text or stream-json; latter reads NDJSON stdin and requires stream-json output       |
| Time          | `--print-timeout`, default `0s` (unlimited)                                                            |
| Selection     | optional `--model`, `--effort`: low, medium, high, xhigh, max; `--agent`                               |
| Permissions   | `--sandbox`, `--mode` accept-edits/plan; dangerous skip-permissions flag exists and must never be used |
| Customization | `--disable-slash-commands` disables print-mode slash/skill expansion only                              |
| Workspace     | repeatable `--add-dir`, `--project`, `--new-project`; no cwd flag shown                                |
| Sessions      | `--continue`/`-c`, `--conversation`; remote-control options exist                                      |

Design recommendation: Node `spawn` with `shell:false`, absolute executable,
explicit `cwd`, pipes, bounded capture, and one-shot semantics. Avoid project
creation, resume, and remote control. Argument prompts are simplest but can be
visible in process listings. Prefer a single stdin message and EOF after its
transport contract has been tested; do not assume Gemini-style stdin appending.
No example prompt was executed. Leave model selection optional; do not hardcode
a model or effort. `--mode plan` is not accepted as proof of read-only security.

## 8. Structured output schema

Documentation evidence, not a captured live fixture:
[headless protocol](https://www.antigravity.google/docs/cli/headless/).

| Discriminator `event` | Relevant payload                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `init`                | top-level `conversation_id`; `init.cwd`, `tools`, `permission_mode`; optional `model` and `agent`                |
| `step_update`         | `step_update`: conversation ID, step index, state, step type, text delta, usage, duration, tool/subagent details |
| `result`              | `result`: conversation ID, status, response, error, duration_seconds, num_turns, usage                           |

Extract the final answer from `result.response`, not concatenated tool/thinking
updates. Status vocabulary: SUCCESS, ERROR, CANCELED, INTERRUPTED, INVALID,
WAITING, RUNNING. Only SUCCESS is a success candidate. Usage fields include
input_tokens, output_tokens, total_tokens, thinking_tokens, cache_read_tokens.
Tool details include parameters/output/error; subagents include child IDs and
log locations. Streaming stdin accepts a `user` event with `message.content`;
close stdin after one message. Session counters are cumulative.

Design: require a terminal result, successful exit, usable final text, and no
timeout evidence. Unknown events may be ignored within bounded input limits;
malformed required fields must fail. No parser was written.

## 9. Permission model

[Official CLI permissions](https://www.antigravity.google/docs/permissions/)
define deny/ask/allow precedence. Explicit rules override defaults; workspace
reads AND writes are normally allowed. Global wildcard targets exist for
write_file, command, unsandboxed, read_url, execute_url, and mcp. Windows paths
are normalized during matching. Therefore default approval behavior is not
equivalent to read-only access.

Proposed prerequisite policy, not applied here:

```json
{
  "permissions": {
    "deny": [
      "write_file(*)",
      "command(*)",
      "unsandboxed(*)",
      "read_url(*)",
      "execute_url(*)",
      "mcp(*)"
    ]
  }
}
```

Design caveat: verify the effective merged policy, not just one file. Scope
reads to the requested repository and exclude secrets. Read-only does not
authorize uploading credentials. Account/model transport still requires network
access; denying agent web tools is not equivalent to denying all process
networking. Do not silently mutate the user's global/IDE settings for an adapter
call.

## 10. Sandbox behavior

[Sandbox documentation](https://www.antigravity.google/docs/sandbox/) describes
OS isolation for terminal commands but writable workspace mounts. Windows
retains older preview behavior; the page names Linux namespaces and macOS
sandbox-exec, but does not establish the Windows primitive for this build.
`--sandbox` alone is insufficient. Network restrictions derive from policy;
unsandboxed grants are escape hatches. No universal default protection of `.git`
was established. Deny all writes and commands rather than relying on
Git-specific protection. No sandboxed agent action was tested.

## 11. Read-only feasibility

Inference: explicit denials can provide the needed tool-layer restriction,
provided every mutation route and inherited customization is covered. A verified
policy profile is a prerequisite, not an implementation detail to defer after
launch. Denying commands entirely avoids claiming an unverified Windows terminal
sandbox boundary. If hooks or startup components can bypass that profile, use a
documented isolated configuration or an external OS boundary before proceeding.
Do not advertise `local-repository-read` until scope and enforcement are
verified.

## 12. Non-TTY/subprocess behavior

Local Node `spawn`, absolute executable, `shell:false`, `windowsHide:true`, all
stdio piped, stdin closed; a 15-second diagnostic watchdog did not fire:

| Command     | Exit | stdout                  | stderr                |
| ----------- | ---- | ----------------------- | --------------------- |
| `--version` | 0    | 7 bytes, version 1.2.16 | 0 bytes               |
| `--help`    | 0    | 0 bytes                 | 2905 bytes, help text |

Important future Doctor incompatibility: current probes discard stderr, but agy
help is on stderr. Plan a bounded help-only capture path; never expose arbitrary
provider stderr. These probes prove launch/capture, not live stream reliability.

## 13. Retry semantics

[Official changelog](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)
reports automatic transient retries; 1.2.13 improves server-delay handling and
quota-cap stopping. No retry-disable flag was found in local help. Retry counts
are not established as structured fields. Design: one adapter call means one
process attempt, not one model request; document possible extra cost/latency.
Never promise an exact API-call count or add Vornariq retries implicitly.

## 14. Timeout semantics

Installed help confirms unlimited default. Changelog 1.1.28 permits partial
timeout output with exit zero; 1.2.6 removes the default deadline. The headless
guide's five-minute default is stale against local help.

Proposal: configurable 10-minute wall-clock budget for ordinary one-shot work,
reviewable by callers, with an independent runner deadline and bounded process
tree termination. This is a starting policy, not a measured latency guarantee.
Do not allow an earlier CLI deadline to turn partial output into success. Prove
how timeout/truncation is detected before accepting terminal SUCCESS.

## 15. Conversation/history behavior

[Conversation documentation](https://www.antigravity.google/docs/cli/conversations/)
describes workspace-scoped histories and resume. New execution context does not
mean no persistence. No no-history flag appears in installed help. Assume
prompt, response, and tool history may remain in CLI-managed storage. Avoid
resume flags; document retention separately from Vornariq's sanitized
ExecutionResult. Do not delete CLI history or access its databases in this
spike.

## 16. Skills/MCP/customization behavior

The migration guide documents inherited global rules, workspace AGENTS.md and
GEMINI.md, `.agents/skills`, and global/project MCP settings.
[Hooks](https://www.antigravity.google/docs/hooks/) can execute commands around
tool/model lifecycle events; individual hooks have an enabled setting.
[MCP documentation](https://www.antigravity.google/docs/mcp/) describes
configured servers and tool permissions. Denying an MCP call does not establish
that server startup is prevented.

No comprehensive no-customizations flag was found. Slash expansion disablement
is not a global off switch. Treat user/project/parent configuration, plugins,
hooks, and server startup as part of the trusted runtime. Future v1 must audit
or isolate them and prevent automatic subagent delegation. No configs were read
or changed here, and no CLI agent session was started.

## 17. Security risks and output handling

Proposed adapter allowlist: final assistant answer, validated terminal status,
safe version/model identifiers, locally measured duration, and reported numeric
usage. Treat the final answer as potentially sensitive user content too.

Discard reasoning, raw tool arguments/results, commands, file bodies, MCP
payloads, child trajectories/log URIs, raw exceptions, and stderr. Do not
persist the full init tools/workspace payload. Map known errors to fixed
messages; unrecognized diagnostics get a generic failure. Sanitize before
persistence, not only before terminal rendering. Redaction cannot undo CLI's own
history.

## 18. Known upstream issues and fixes

Version/status evidence is upstream reporting, not local reproduction:

| Issue                                                                                               | Affected/reported version | Current evidence                                       | Impact / mitigation                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| [Windows output loss #76](https://github.com/google-antigravity/antigravity-cli/issues/76)          | 1.0.0                     | Closed; changelog fix 1.0.15                           | Local free probes pass; still require later live E2E               |
| [No-console hang #508](https://github.com/google-antigravity/antigravity-cli/issues/508)            | 1.0.13                    | Closed                                                 | Do not infer prompt reliability from help                          |
| Headless auto-approval / settings                                                                   | before 1.1.3 / 1.1.4      | Changelog fixes in those versions                      | Require modern build and effective policy check                    |
| Sandbox propagation                                                                                 | older releases            | Changelog fix 1.0.6                                    | Does not prove Windows isolation                                   |
| [Long Windows turn #841](https://github.com/google-antigravity/antigravity-cli/issues/841)          | 1.1.17                    | Open, awaiting response                                | Applicability to 1.2.16 unknown; external deadline                 |
| [Exit hang #947](https://github.com/google-antigravity/antigravity-cli/issues/947)                  | 1.1.26                    | Open                                                   | Bounded shutdown; never wait forever                               |
| [Individual quota retries #1018](https://github.com/google-antigravity/antigravity-cli/issues/1018) | 1.2.2                     | Open; newer release mitigation is not proof of closure | Budget awareness; no automatic orchestration retry                 |
| [Scoped permissions #627](https://github.com/google-antigravity/antigravity-cli/issues/627)         | 1.1.4, macOS              | Open feature request                                   | No per-run settings flag in installed help; verify merge/isolation |

Old fixed issues do not justify automatic rejection. Open reports do not prove
the installed build is affected. No exposed runtime implementation was available
in the inspected public repository listing to independently audit enforcement.

## 19. Proposed Vornariq capabilities

Conditional metadata: providerId `antigravity`, displayName
`Google Antigravity CLI`; `text-output`, `structured-execution-events`, and
`local-repository-read` only after prerequisites. Never include
`local-repository-write` in v1. No candidate should be available when safety
preflight fails.

## 20. Proposed adapter architecture

Reuse core contracts unchanged. Future modules under
`src/providers/antigravity/`: `antigravity-provider.ts`,
`antigravity-process.ts`, `antigravity-stream-json.ts`, `antigravity-prompt.ts`,
`antigravity-types.ts`, `index.ts`. Adapter -> injectable runner -> native
shell-free subprocess -> bounded parser -> ExecutionResult. No SDK dependency,
shell wrapper, fallback, or retry is needed.

## 21. Proposed error mapping

Use fixed provider-neutral messages with prefix `ANTIGRAVITY_`: NOT_AVAILABLE
for spawn ENOENT; PROCESS_FAILED for unsuccessful process completion;
AUTH_FAILED only for reliably identified authentication failure; POLICY_DENIED
for failed safety preflight or identified blocking denial; TURN_FAILED for
terminal ERROR; PROTOCOL_ERROR for malformed/missing terminal; NO_RESULT for
empty final content; TIMEOUT for runner deadline expiry. Map cancellation into
the existing cancelled result where justified. A denied optional tool can
coexist with a successful answer: do not classify every denial as a failed turn.
Do not mark errors retryable merely because upstream retries.

## 22. Conformance/testing and Doctor plan

Existing `tests/conformance/provider-conformance.ts` can remain unchanged: fake
success/failure adapters, stable identity, valid timestamps, immutable requests,
JSON-safe results, finite metrics, and secret exclusion apply directly. Add
deterministic synthetic fixtures explicitly labelled documentation-derived,
parser tests, fake clock/process tests, missing/duplicate terminal cases,
truncated streams, timeout-with-exit-zero, policy denial, and rich-payload
redaction. No automated tests may invoke a model. Future live E2E needs separate
approval.

Doctor plan: free version/help with bounded stderr help capture, required flags,
compatible version check, policy preflight separate from protocol compatibility,
authentication not-tested unless a documented safe status exists, E2E
unverified. Do not persist gate success or auto-run an agent prompt.

## 23. Remaining unknowns

Account-specific OAuth eligibility; Windows sandbox primitive/enforcement;
complete mutation-tool coverage; startup hook and MCP isolation; merged profile
precedence/drift; reliable timeout-vs-completion signal; retry count visibility;
effective default model; history opt-out; live stream behavior. Static documents
cannot close these runtime gates. Individual accounts are officially supported
by the [plans page](https://www.antigravity.google/docs/plans/), but this user's
account was not authenticated or quota-tested in TASK-012.

## 24. Decision

**CONDITIONAL_GO** for a guarded architecture. Not GO for the current default
configuration. A documented explicit-deny mechanism makes the safety
prerequisite plausible; absence of isolation or effective-policy verification
must instead produce NO_GO. Do not weaken the capability claim to hide this
requirement.

## 25. Exact prerequisites for TASK-013

1. Establish a dedicated, verifiable effective policy with all
   write/command/web/ MCP routes denied and repository reads appropriately
   scoped. No silent global edits, temporary broad grants, or dangerous bypass.
2. Document and verify how hooks, inherited rules, plugins, MCP startup, and
   subagents are disabled or confined. Reject unaudited customizations.
3. Define version drift handling and accept help on stderr without leaking raw
   runtime diagnostics. Use the native executable directly.
4. Resolve timeout-success ambiguity and implement independent bounded shutdown;
   represent one execution as one process attempt, not one model request.
5. Complete normal personal-account sign-in before any future live validation.
6. Keep fixtures/conformance offline; obtain separate approval for live E2E.

TASK-012 validation: version/help direct and Node pipe checks, official-source
review, document formatting, and `git diff --check`. No full test suite needed
for this documentation-only spike. TASK-013 was not started.
