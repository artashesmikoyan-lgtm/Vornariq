# TASK-013: Antigravity read-only security gate

Assessment date: 2026-10-05. Installed Windows CLI: **1.2.16**.
Decision: **SECURITY_BLOCKED**. Model invocations: **0**.

This gate supersedes TASK-012's conditional architecture recommendation for
repository execution. No adapter, process runner, parser, routing candidate,
Doctor support, configuration changes, installation, or upgrade is included.

## 1. Threat model and required guarantee

Treat repository instructions, model-generated commands, customizations, and
tool results as potentially hostile or mistaken. A prompt requesting read-only
behavior is not an access boundary. The process must be able to read the selected
repository while being unable to mutate its working tree, Git metadata, or
unrelated host files. Commands, child processes, agents, hooks, and MCP must not
bypass that boundary. Runtime scratch writes are acceptable only in an explicitly
isolated disposable area, without write-back to the host repository.

Network isolation is not currently a Vornariq capability promise, but arbitrary
external tools must not introduce uncontrolled side effects. Protecting integrity
does not establish confidentiality: readable repository secrets can still leak.

Evidence labels below distinguish **observed** local free probes,
**documented** upstream intentions, **reported** issue claims, and **assessment**
security conclusions. No enforcement claim was established by a model test.

## 2. Baseline and installed observations

Initial Git status was clean at `5fc23db`; the preceding launcher fix is
`35fb805`. Free probes used the existing native executable:

`C:\Users\artas\AppData\Local\agy\bin\agy.exe`

**Observed:** `--version` returned `1.2.16`; `--help` completed. Help includes
headless print, stream-json, sandbox, project selection, new-project,
disable-slash-commands, and print-timeout options. Its timeout default is `0s`
(unlimited). No settings-file, isolated config-directory, no-hooks, no-MCP, or
no-tools option was exposed. Absence from help is not proof no internal mechanism
exists; no supported complete isolation mechanism was established.

The public release list now includes **1.2.17**, with changed Windows sandbox
behavior. Those changes are not evidence about installed 1.2.16. No upgrade was
performed. Future testing must recheck the actual version because the installer
documents automatic updates. [Official releases](https://github.com/google-antigravity/antigravity-cli/releases)

## 3. Permission engine and default rejection

**Documented:** permission precedence is deny, then ask, then allow; explicit
rules override defaults. Workspace reads and writes are permitted by default.
Recognized action categories include `read_file`, `write_file`, `command`,
`unsandboxed`, URL operations, and `mcp`. Global `*` is documented. Windows paths
are normalized; Windows command matching needs special care.
[Permissions](https://www.antigravity.google/docs/permissions/)

**Assessment:** default configuration cannot advertise repository-read-only.
Denial of file writing and all terminal/MCP execution is a plausible policy
direction, not a verified complete mutation boundary. Mapping of patch, move,
delete, artifact, and subagent operations to these categories remains unproved.
A global read deny combined with a narrower allow is not a solution: deny wins.
An empty allow list is not necessarily default-deny.

Interactive review modes also do not establish immutable filesystem access.
The modes documentation describes interactive review before edits, accept-edits
autoapproval, and plan mode as an instruction prefix. These describe a different
layer from default file permissions; do not infer that an interactive pause will
protect a headless run. No independently enforcing strict read-only mode was
identified. [Execution modes](https://www.antigravity.google/docs/cli/modes/)

## 4. Configuration locations and precedence

Paths below are documentation references, not credential/config contents read
from this user's profile. This is the discovered configuration surface, not a
verified exhaustive load-order contract.

| Surface | Documented location or mechanism | Isolation consequence |
| --- | --- | --- |
| CLI settings and permissions | `~/.gemini/antigravity-cli/settings.json` | User state can affect a run. |
| Shared settings | `~/.gemini/config/config.json` | Separate shared configuration surface. |
| Project settings | `~/.gemini/config/projects/` | Project configuration can override CLI global settings. |
| Instructions | Global/workspace `GEMINI.md`, workspace `AGENTS.md`, project rules | Fresh conversation does not imply fresh instructions. |
| Skills and agents | User CLI skills; project `.agents/skills/`, agents/rules, parent manifests | Repository and ancestor discovery matter. |
| Hooks | `.agents/hooks.json`, `~/.gemini/config/hooks.json`, CLI settings, plugins | Lifecycle commands can execute. |
| MCP | `.agents/mcp_config.json`, `~/.gemini/config/mcp_config.json`, plugins | Processes or remote connections may initialize. |
| Plugins | Installed plugin state and bundled customizations | A new project is not proof of isolation. |
| Conversation state | CLI data/history under `~/.gemini/antigravity-cli/`; resume options | Avoid resume, but fresh sessions still inherit configuration. |

The settings reference documents `allowNonWorkspaceAccess` and terminal settings;
these are tool controls, not restrictions on every process in the tree.
[CLI reference](https://www.antigravity.google/docs/cli/reference/)
The migration guide describes compatibility/customization locations.
[Migration guide](https://www.antigravity.google/docs/cli/gcli-migration/)

Release notes document project-over-global precedence and, in 1.2.16, parent
`.agents/` discovery from the working directory toward the project root.
No complete merge order across plugins, hooks, shared settings, project grants,
and session overrides was established. `--project` selects project context;
`--new-project` is not documented as excluding user/global customizations.
Do not invent environment overrides or temporarily rewrite the user's settings.

## 5. Customization isolation

Built-in/user/project skills, agents, rules, and plugins are relevant discovery
surfaces. Their complete headless activation order and a comprehensive disable
mechanism remain unknown. `--disable-slash-commands` suppresses slash expansion
in print mode; it does not promise to disable hooks, MCP, rules, or plugins.

Hooks have lifecycle triggers including invocation and tool events; they can
execute scripts. Individual hook disabling exists, but no isolated per-run
all-hooks-off boundary was found. Whether every hook inherits terminal sandbox
and permission restrictions is unverified, not a demonstrated bypass.
[Hooks](https://www.antigravity.google/docs/hooks/)

**Assessment:** Vornariq cannot currently claim it avoids arbitrary inherited
customizations through a supported reproducible invocation. This independently
blocks the initial provider.

## 6. MCP isolation

MCP configuration can launch local stdio servers or connect to remote servers;
workspace, global, and plugin sources matter. Individual enable/disable commands
exist, but no complete per-run exclusion mechanism was found. Tool permission
denial does not prove a server was never launched or connected. Server startup
itself can have side effects. [MCP documentation](https://www.antigravity.google/docs/mcp/)

Headless execution waits for MCP initialization according to release notes.
Neither selection of a fresh project nor denying MCP tool calls proves startup
is isolated. Do not alter the user's global MCP state for a smoke test. Prefer
blocking v1 until an empty controlled configuration or external boundary exists.

## 7. Sandbox and Windows-specific behavior

**Documented:** sandbox workspace mounts are read-write; temporary/build areas
can be writable. System locations may be readable while unmounted locations are
inaccessible. Sensitive-path protections and domain-based networking rules are
described. `proceed-in-sandbox` permits sandboxed commands without review; it does
not make the workspace immutable.
[Sandbox documentation](https://www.antigravity.google/docs/sandbox/)

| Resource | Intended/documented behavior | Windows 1.2.16 evidence limit |
| --- | --- | --- |
| Workspace | Readable and writable | Not a read-only mount. |
| `.git` | Added dangerous-path protection | No local enforcement test; scope/tool coverage unknown. |
| Parent directories | Depends on mounted/allowed paths | No universal parent-directory denial established. |
| User profile | Sensitive paths restricted; not equivalent to whole-profile isolation | Exact readable/writable set unproved. |
| Temp/cache | Some runtime writes allowed | Not a universal host write prohibition. |
| Network | Sandbox domain controls documented | CLI transport, hooks, MCP, and subprocess coverage unproved. |
| Subprocesses | Terminal sandbox is intended to restrict commands | Windows primitive and inheritance across all child types unestablished. |

The published material does not sufficiently define the Windows 1.2.16 OS
primitive or exact Windows 10/11 enforcement behavior. Do not transfer Linux or
macOS implementation details to Windows, or later Windows fixes to this binary.
No native source audit established the missing guarantees.

## 8. Terminal and filesystem risks

PowerShell, cmd, Python, Node, Git, redirection, and ordinary utilities can all
mutate files. Denying direct edits while allowing general commands is inadequate.
Avoid a long command allowlist: quoting, scripts, interpreters, and command
matching make it fragile. A future profile should deny terminal execution
entirely unless every command is inside an independently read-only OS boundary.

Outside-workspace restrictions do not prevent workspace writes. Protection of
`.git` does not protect source files. Reparse points, junctions, symlinks, hard
links, and inherited write handles need explicit treatment at the OS boundary.

## 9. OS-level alternatives and disposable copies

| Option | Feasibility assessment | Missing prerequisite |
| --- | --- | --- |
| Windows Sandbox | Read-only mapped host folder offers a credible separate OS boundary. Automatable `.wsb` configuration. | Host support, controlled guest settings/authentication, output channel, subprocess/network behavior, and reproducibility must be verified. |
| Docker/Podman-style container | Read-only bind mounts plus isolated home and no privileged access are candidates. | No implementation or runtime installed/required here; Linux image would assess a different binary. Podman-specific behavior not verified. |
| Separate restricted Windows identity and ACLs | OS access checks can deny writes to protected objects. | Must cover all paths and children; same-owner ACL changes or an administrative token are inadequate. Do not change source ACLs here. |
| Disposable copy alone | Useful for limiting accidental edits to the copy. | Same-user process can still reach the real source through absolute paths unless independently restricted. |

Windows Sandbox supports read-only mapped folders, but mapping defaults must be
set explicitly; network and clipboard are enabled by default. Disable clipboard,
avoid mapping host home/secrets, and design narrowly scoped output retrieval.
Model access still needs a controlled authentication/network arrangement.
[Microsoft Windows Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file)

Container bind mounts support read-only mode; recursive mount restrictions have
platform/kernel caveats. Never expose the container engine socket, host home,
privileged mode, or a writable original repository.
[Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
Windows ACL enforcement depends on process tokens and object permissions;
designing a restricted identity is distinct from flipping a directory attribute.
[Microsoft access-control model](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-model)

A copied workspace must not preserve escaping links or Git pointers to external
gitdir/commondir/alternates. Git hooks, configuration, and filters are additional
execution surfaces. Copy only selected regular files, exclude secrets, account
for size/disk cost, and prevent write-back. Even that does not prevent reads or
writes elsewhere by an unrestricted process. No copy or sandbox was created.

## 10. Git, network, headless denial, retries, and timeout

The changelog records `.git` dangerous-path hardening, headless soft-denial fixes,
MCP startup waiting, timeout partial-output behavior, transient transport retries,
and improved handling of denied operations. None establishes universal Windows
read-only enforcement. The 1.2.15 denial change discourages alternate-tool
workarounds; it is not proof of a bounded denial retry count.
[Official changelog](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)

Headless approval-required actions are documented as soft-denied rather than
autoapproved. Denials can produce stderr notices; stream tool information can
carry an error. The run can continue and finish successfully, including exit 0.
No universal dedicated policy-denial event was established.
[Headless documentation](https://www.antigravity.google/docs/cli/headless/)

A later adapter must not turn every denied optional tool into whole-turn failure,
or treat exit 0 as proof that the requested work succeeded. Map a reliably
identified denial that blocks the objective to sanitized
`ANTIGRAVITY_POLICY_DENIED`; do not expose raw stderr or protocol data. Active
event/terminal evidence is still needed. Internal transport retries also mean one
CLI launch need not equal one model request; no proven retry-off control was found.

Design recommendation only: set `--print-timeout 10m` and a separate process hard
deadline of 10m15s with process-tree termination. Once the hard deadline fires,
Vornariq must return timeout failure regardless of late/partial success output.
CLI timeout can yield partial output and exit 0, so its expiry must also fail
validation. If expiry cannot be identified reliably, use a shorter outer deadline
and fail closed. No timeout implementation was added.

## 11. Relevant upstream issues

Status checked 2026-10-05. Reports are evidence of uncertainty, not reproduced
defects in this installation.

| Issue | Scope/status | Installed-version consequence and workaround |
| --- | --- | --- |
| [#798](https://github.com/google-antigravity/antigravity-cli/issues/798) | Open, awaiting author response; file/path denials reported on Linux 1.1.13. | Windows 1.2.16 impact unconfirmed; no confirmed current fix/workaround found. Parts of the report expect allow to override deny or an empty allow list to deny everything, contrary to documented semantics. Reported `/**` patterns are not proof documented global `*` fails. Path-enforcement concerns still need targeted evidence. |
| [#627](https://github.com/google-antigravity/antigravity-cli/issues/627) | Open; scoped invocation settings/matching concerns on macOS 1.1.4. | No supported full per-run isolation discovered. Older project-config assertions are not authoritative for current releases; project configuration now exists. Do not adopt proposed undocumented environment variables. |
| [#955](https://github.com/google-antigravity/antigravity-cli/issues/955) | Open; Windows 11 headless command matching report on 1.1.27. | Current docs discuss regex/exact matching, but that does not prove every runtime issue fixed in 1.2.16. Avoid broad command allows. Denying commands entirely is a design mitigation, not verified complete enforcement. |

No issue above alone proves this Windows binary vulnerable. Conversely, related
changelog improvements do not close unresolved enforcement questions.

## 12. Safe Profile v1 and capability consequence

**No approved Safe Profile v1 can be specified from current evidence.** These are
requirements for a candidate, not runnable configuration or imaginary flags:

| Aspect | Candidate requirement | Status |
| --- | --- | --- |
| Transport | Headless print with `--output-format stream-json` | Supported flags; no model test here. |
| Sandbox | Enable `--sandbox` as defense in depth | Does not provide immutable workspace alone. |
| Permission mode | No accept-edits or skip-permissions; no reliance on plan prompts | Complete enforcing policy unproved. |
| Files | Read selected snapshot; deny every mutation path | Needs OS read-only mount or verified complete denies. |
| Terminal | Deny entirely initially | Category exists; universal coverage unproved. |
| MCP/hooks/plugins/skills/agents | Controlled empty/trusted state, no unexpected startup | Supported complete isolation missing. |
| Sessions | Fresh conversation, no continue/resume | Does not reset configuration. |
| Timeout | CLI limit and authoritative hard deadline | Future implementation only. |
| Working directory | Dedicated controlled snapshot outside real source | Does not itself isolate ancestor/home state. |
| Environment | Minimal explicit nonsecret environment; normal supported auth inside boundary | No invented config overrides or copied credential files. |

Do not register any Antigravity candidate now. After this gate passes, a future
adapter may advertise `text-output`, `local-repository-read`, and
`structured-execution-events`, never initial `local-repository-write`. A text-only
option also requires evidence of a supported no-tools boundary; none was established.

## 13. Future active write-denial smoke design — not executed

First establish the isolation profile offline. Then obtain separate explicit
approval for one controlled invocation, with internal retry/quota uncertainty
disclosed. Use a dedicated temporary fixture outside the Vornariq source tree:

```text
antigravity-security-smoke/
  readable.txt                 # unique harmless marker
  forbidden-write-target.txt   # existing canary, hash recorded
```

Record fixture hashes, parent canaries, source Git status, binary version, and
effective nonsecret policy. Request reading and reporting the exact marker, then
attempting to create a new `write-attempt-marker.txt`. No retry, fallback, alternate
tool workaround, or resumed session. Enforce the external deadline.

Pass only when the read succeeds, an actual attempted write is demonstrably
denied by the boundary, the new file is absent, and existing fixture/source
content is unchanged. Model refusal, missing file alone, or prose claiming denial
is inconclusive. Capture sanitized denial/terminal evidence and independent
filesystem checks, not raw streams or secrets. Stop after the approved attempt.

## 14. Escape-test plan — not executed

Prefer deterministic OS/process tests before scarce live requests. Use only
controlled synthetic targets; never attempt writes to the real profile/source.

| Vector | Future fixture/evidence |
| --- | --- |
| Direct file tools | Create, overwrite, patch, rename, delete canaries; each denied. |
| Parent/outside paths | Synthetic sibling canary inaccessible for writes. |
| Profile/temp | Synthetic isolated home/temp; only declared guest scratch writable. |
| Git | Synthetic repository metadata unchanged after mutation attempt. |
| Terminal | Verify outright command denial or independent read-only enforcement for interpreters and Git. |
| Links | Controlled junction/symlink/reparse/hardlink targets; deny escape without touching real files. |
| Subagents | Verify inherited boundary offline; live invocation needs separate resource approval. |
| MCP/hooks | Prefer proving they never start. If unavoidable, controlled fake local side-effect canaries only; fail gate if startup cannot be contained. |

One model smoke cannot prove this entire matrix. Expand live testing only for
remaining evidence gaps and only with separate approval.

## 15. Remaining unknowns and next task

Unknown: exhaustive configuration precedence and isolation, all tool-to-permission
mappings, Windows 1.2.16 sandbox primitive/inheritance, exact denial events,
bounded denial/internal transport retries, and reliable CLI timeout detection.
No credential inspection or account authentication verification was needed.

Recommend a narrowly scoped, zero-model Windows isolation feasibility task:
check availability of Windows Sandbox or a restricted test identity, establish
read-only source mapping plus controlled guest customization/authentication,
and verify denial using ordinary processes. Do not install dependencies, alter
ACLs, upgrade Antigravity, implement the provider, or run the model without the
corresponding new task authorization.

## 16. Final security decision

**SECURITY_BLOCKED.** Defaults and sandbox permit workspace writes, complete
per-run customization/MCP isolation is not established, and Windows enforcement
is insufficiently defined to promise repository-read-only. This is a failure to
establish the required guarantee, not a claim that an untested issue reproduces
on this binary. OS isolation is a viable investigation direction, not an approved
or implemented Safe Profile v1.

Validation for this documentation-only task: local version/help, primary-source
review, manual Markdown review, and `git diff --check`. The optional targeted
Prettier check could not run because its executable was unavailable; no dependency
installation was performed. No full suite or model call.
