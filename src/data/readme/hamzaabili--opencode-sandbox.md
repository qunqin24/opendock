# opencode-sandbox

[![CI](https://github.com/Hamza-Abili/opencode-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamza-Abili/opencode-sandbox/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40hamzaabili/opencode-sandbox)](https://www.npmjs.com/package/@hamzaabili/opencode-sandbox)
[![npm downloads](https://img.shields.io/npm/dt/%40hamzaabili/opencode-sandbox)](https://www.npmjs.com/package/@hamzaabili/opencode-sandbox)
[![GitHub stars](https://img.shields.io/github/stars/Hamza-Abili/opencode-sandbox?style=social)](https://github.com/Hamza-Abili/opencode-sandbox/stargazers)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Hamza-Abili/opencode-sandbox/blob/main/LICENSE)

**Native command sandbox for OpenCode V1 and V2.**

Agent shell commands run inside the OS sandbox by default:
[bubblewrap](https://github.com/containers/bubblewrap) on Linux and
**Seatbelt** (`sandbox-exec`) on macOS. V2 also covers the terminal shell; V1
covers the agent's bash tool. The trusted policy can authorize exact commands
through `unsandboxedCommands`, or the global `mode: "permissive"` opt-out can
disable the sandbox. The workspace is writable, the system is read-only,
`$HOME` is synthetic, ambient secrets are cleared, and the network is denied by
default. **Fail-closed in enforce mode**: if the sandbox cannot be created,
commands are refused — never silently run unsandboxed.

Zero runtime dependencies. No helper daemon. No proxy. No SRT.

Security policy comes from a **trusted file outside the workspace**. A
repository's `opencode.json` can only tighten it, never set `network: "allow"`,
add `~/.ssh` as readable, pass a provider token, or disable the tool guard
(once the plugin is loaded; see the plugin-removal limitation below).
OpenCode/Git configuration and execution hooks (`.opencode`, `opencode.json`,
`.git/hooks`, `.git/config`, `.envrc`) are read-only inside the sandbox, so a
prompt-injected command cannot persist code that runs on the host after a
restart or `git commit` through those existing paths. Platform limits
(macOS rename/hardlinks, Linux missing paths) are documented below.

On V2, an in-process tool guard applies the same workspace policy to OpenCode's
file tools and `webfetch`, including a hostname allowlist. It is a policy layer,
not a second OS sandbox; see [Tool guard](#tool-guard-v2).

The V2 path uses `ctx.shell.hook("create.before")` and replaces **only the
shell executable** with a generated wrapper. The command, working directory,
timeout, permission rules and session history keep their original values.
The V1 path uses the legacy `tool.execute.before` hook; see [V1](#opencode-v1)
for its documented limitations.

## Requirements

- **Linux**: `bubblewrap` installed system-wide. Debian/Ubuntu:
  `sudo apt install bubblewrap`.
  On Ubuntu 24.04+ unprivileged user namespaces are restricted by AppArmor;
  enable the `bwrap-userns-restrict` profile as documented by bubblewrap.
- **macOS**: built-in `/usr/bin/sandbox-exec` (Seatbelt). Works on current
  macOS releases; the CI matrix runs the real macOS integration tests on a
  GitHub macOS runner.
- **Windows**: run OpenCode inside **WSL2**. The WSL distro is a normal Linux
  host, so bubblewrap and this plugin work unchanged. Keep projects under the
  Linux filesystem (`~/...`, not `/mnt/c/...`) for correct permissions and
  performance. Native Windows (PowerShell) is not supported and fails closed;
  it would need a native helper backend, which is outside this zero-dependency
  package.

The plugin probes a **real** sandbox at startup and reports the exact failure
instead of assuming the binary is usable. The sandbox binary is resolved from
fixed root-owned absolute locations, never through `PATH`.

### Windows via WSL2

Native Windows is not supported. Use WSL2, where OpenCode is a normal Linux
process:

1. Install OpenCode **inside the WSL distro**, not on Windows.
2. `sudo apt install bubblewrap`. On Ubuntu 24.04+, install/enable the
   `bwrap-userns-restrict` AppArmor profile (see the bubblewrap documentation).
3. Keep projects under the Linux filesystem (`~/src/...`), not `/mnt/c/...`.
4. Verify with `bunx --bun @hamzaabili/opencode-sandbox doctor`.
5. Start OpenCode from the WSL shell. If you use the Desktop app, point it at
   the WSL server as usual; the sandbox runs where the server runs.

The startup log adds `wsl=<distro>` when it detects WSL. `doctor` reports the
same and points at the AppArmor/userns check when the probe fails.

## Install (OpenCode V2)

Add the plugin to your config. Security options do **not** belong here; see
[Trusted policy](#trusted-policy).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@hamzaabili/opencode-sandbox"]
}
```

Restart OpenCode. On load the plugin logs:

```
[opencode-sandbox] ready (platform=linux, sandbox=bwrap, network=deny, mode=enforce, toolGuard=enforce,
webfetch=allow, workspace=/path/to/project, protected=14, denied=0, unsandboxed=0)
```

If you run OpenCode inside WSL2, the same line adds `wsl=<distro>`.
`protected` and `denied` count policy entries, not necessarily active mounts
(Linux cannot bind a missing protected path).

## Install (OpenCode V1)

V1 uses the same package; the default export exposes both `setup()` for V2 and
`server()` for V1. Enable it with the V1 plugin list:

```jsonc
{
  "plugin": ["@hamzaabili/opencode-sandbox"]
}
```

### OpenCode V1

V1 has no shell-executable hook. The adapter rewrites the command string to

```
'/path/to/opencode-sandbox-wrapper' -c '<original command>'
```

The sandbox boundary is identical, and the wrapper re-validates the real
working directory. The limitation is V1's own parser: OpenCode V1 evaluates
its permission rules and records history against the rewritten command string,
not the original one, so command-level deny/ask rules on the original command
are not preserved. The V1 tool guard checks file arguments (including
`apply_patch`) and the initial `webfetch` URL, but V1 has no redirect hook.
Use V2 when permission-rule fidelity matters. The adapter is tested against
OpenCode 1.19.5. The V2 path is contract-checked against the OpenCode v2 plugin
API (tested on 2.3.2; the package declares `>=1.19 <2 || >=2.0`). A V1 wrapper
replay is identified by OpenCode's call ID, not by trusting a command string
that merely starts with the wrapper prefix.

## Trusted policy

Security-widening settings are read only from files outside the workspace:

| Scope | Path |
| --- | --- |
| User | `$OPENCODE_CONFIG_DIR/opencode-sandbox.json`, or `$XDG_CONFIG_HOME/opencode/opencode-sandbox.json`, or `~/.config/opencode/opencode-sandbox.json` |
| System (Linux) | `/etc/opencode/opencode-sandbox.json` |
| System (macOS) | `/Library/Application Support/opencode/opencode-sandbox.json` |

The system file must be root-owned; user and system files must not be
group/world-writable or inside the workspace. Keep the user file outside paths
the sandbox can write (on macOS, not under `/tmp` or `/var/folders`). Invalid
JSON, unknown keys, and malformed values make the plugin **ignore that file**.
If a **system** policy is present but invalid, the user file is ignored too and
the secure defaults apply, so an administrator typo cannot silently remove the
cap. Errors are logged. The file is strict JSON (no comments).

The user file may widen the defaults; the system file is a complete baseline
that caps the user file; plugin options can only tighten the result. This is
the precedence:

```
defaults (deny network, enforce, cleared env)
  → user trusted file        may widen
  → system trusted file      may only cap
  → plugin options           may only tighten
```

A `network: "allow"`, `mode: "permissive"`, `toolGuard: "off"`, `writablePaths`,
`readablePaths`, `passEnv`, `shell`, `deniedPaths`, or
`unsandboxedCommands` in a repository's `opencode.json` is ignored with a
warning. To use one, put it in the trusted file.

Example `~/.config/opencode/opencode-sandbox.json`:

```json
{
  "network": "allow",
  "writablePaths": ["/tmp/build-cache"],
  "readablePaths": ["~/.config/gh"],
  "passEnv": ["NODE_OPTIONS"]
}
```

### Migrating from 0.2.x

If a repository or your OpenCode config used `network: "allow"`,
`mode: "permissive"`, `toolGuard: "off"`, `writablePaths`, `readablePaths`,
`passEnv`, `shell`, `deniedPaths` or `unsandboxedCommands` in the plugin entry,
move those values to the trusted user file. From 0.3.0 they are ignored with a
warning; tightening values (`network: "deny"`, `mode: "enforce"`,
`toolGuard: "enforce"`, `webfetch: "deny"`, `webfetchAllowlist`) keep working
in the plugin entry. A symlinked `.git/hooks` directory must be replaced with a
real directory; it is rejected at setup.

### Options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `network` | `"deny" \| "allow"` | `"deny"` | `deny` removes the network namespace (Linux) / denies all network operations (macOS). `allow` shares the host network. There is intentionally no shell-network domain allowlist: a real one needs a TLS-intercepting proxy, which would add a dependency and a certificate authority to trust. `webfetchAllowlist` is a separate application-level hostname filter for the `webfetch` tool, not a proxy and not shell egress. |
| `mode` | `"enforce" \| "permissive"` | `"enforce"` | `enforce` refuses shell commands when the sandbox is unavailable. `permissive` runs shell commands unsandboxed with a warning. Explicit opt-out only. |
| `writablePaths` | `string[]` | `[]` | Extra host paths read-write inside the sandbox. Must exist; canonicalised (symlinks resolved); `/`, the host home and its ancestors, credential directories and host system paths are rejected. A path cannot also be listed in `readablePaths`. |
| `readablePaths` | `string[]` | `[]` | Extra host paths read-only inside the sandbox. Root, host home and ancestors are rejected; explicit credential/system paths are allowed read-only as a trust decision. A more specific readable path overrides a broader writable mount; the workspace and any path also listed as writable are rejected. |
| `passEnv` | `string[]` | `[]` | Environment variables copied from the plugin process into the sandbox. Reserved keys (`HOME`, `PATH`, `TMPDIR`, `XDG_*`, …) cannot be overridden. |
| `shell` | `string` | `/bin/bash` (or `/bin/sh`) | Absolute shell used **inside** the sandbox. |
| `toolGuard` | `"enforce" \| "off"` | `"enforce"` | V2 in-process policy for file tools and `webfetch`. It reuses the same workspace, `writablePaths` and `readablePaths`, resolves symlinks and denies paths outside that policy. `off` disables the whole in-process layer; `webfetch: "deny"` and `webfetchAllowlist` then require `"enforce"` and are rejected. This is a policy layer, not an OS boundary; see [Tool guard](#tool-guard-v2). |
| `webfetch` | `"allow" \| "deny"` | `"allow"` | `deny` blocks every `webfetch` call. Requires `toolGuard: "enforce"`. |
| `webfetchAllowlist` | `string[]` | `[]` | If non-empty, only these hostnames are allowed. `*.example.com` matches the apex and subdomains. The `webfetch` tool checks every redirect through the same hook on V2; `image_generate` checks only its initial image URL. Requires `toolGuard: "enforce"`. |
| `deniedPaths` | `string[]` | `[]` | Paths hidden from the sandbox. Existing files are masked (including files in system roots such as `/etc/hosts`), existing directories become empty tmpfs mounts (writes there are ephemeral), and the tool guard denies reads and writes, including missing paths resolved through the nearest existing ancestor and broken final symlink targets. Relative paths resolve against the workspace. On Linux a missing or broken target cannot be masked until it exists; the tool guard still denies it. Trusted policy only. |
| `unsandboxedCommands` | `string[]` | `[]` | Exact commands or `prefix *` patterns that run outside the sandbox. A `prefix *` pattern authorizes **all arguments** of that command, and the command runs with the host environment and cwd; keep entries exact where possible. The matcher rejects `;`, `&`, `\|`, backtick, `$`, `(`, `)`, `<`, `>`, and newlines, so an entry cannot authorize a chained command. Logged in `OSB_TRACE` by pattern index. Trusted policy only. |

Plugin options (the `options` object on the plugin entry) are still accepted
for **tightening only**: `network: "deny"`, `mode: "enforce"`,
`toolGuard: "enforce"`, `webfetch: "deny"` or `webfetchAllowlist`. Everything
else is ignored with a warning. Put security policy in the trusted file.

Paths are canonicalised when the layout is built. Missing paths are an error,
not a silent skip: a sandbox with a mistyped mount would otherwise look
protected while the path is invisible. Writable host system paths are rejected;
projects under `/opt`, `/usr/local`, `/System`, `/Library`, `/nix/store`, `/run`
or a protected `/var` subtree must be moved (read-only access can be granted
with `readablePaths`). `/tmp`, `/var/tmp`, `/private/var/tmp`, `/var/folders`,
`/private/var/folders` and `/var/www` are the explicit writable exceptions.
`/var/www` is a convenience exception: do not mount it writable if a host web
server executes files from that tree.

Mounts are applied from the broadest to the narrowest path. A more specific
mount wins: the workspace and `writablePaths` are read-write, `readablePaths`
are read-only, including when they are a subdirectory of the workspace. A
readable path that is only an ancestor of the workspace does not make the
workspace read-only. The same path cannot be both writable and readable, and
the workspace cannot be listed as readable; such a configuration is rejected
at setup.

## What is sandboxed

- **All shell-service commands on V2**: the agent's `shell` tool and the
  terminal/TUI shell both go through `Shell.create`, which is where the hook
  is installed.
- **V1**: the agent's `bash` tool (`shell` on newer V1 builds). The terminal
  shell bypasses the V1 tool hook; that is a V1 API limitation.
- **Filesystem (Linux)**: only the system runtime (`/usr`, `/bin`, `/sbin`,
  `/lib*`, `/etc`, `/usr/local`, `/opt`, `/nix/store`), the runtime mounts
  (`/proc`, `/dev`, a private `/tmp` and `/run`), a synthetic `/home/sandbox`
  and the explicitly allowed paths are visible. The workspace is read-write;
  everything else is read-only or invisible; the host home is not mounted.
- **Filesystem (macOS)**: Seatbelt allowlist for the system runtime, the
  workspace, the synthetic home and explicit paths. Contents of the host home
  are denied (metadata is still readable); writes are limited to the workspace,
  synthetic home (including its `tmp`) and explicit writable paths; host temp
  dirs are not visible. `TMPDIR` points at the synthetic home temp.
- **Environment**: cleared and rebuilt from `PATH`, `TERM`, locale, `TZ`, a
  synthetic `HOME` plus `passEnv`. `--clearenv` is used on Linux; `env -i` on
  macOS.
- **Process**: `--unshare-all`, `--cap-drop ALL`, `--die-with-parent`,
  `--new-session` (Linux); Seatbelt confinement is inherited by every child
  (macOS).
- **Network**: denied by default.
- **Workspace config**: `.opencode`, `opencode.json`, `opencode.jsonc`,
  `.claude`, `.agents`, `.git/config`, `.git/config.worktree`, `.git/hooks`,
  `.git/info/attributes`, `.git/modules`, `.git/worktrees`, `.gitmodules`, `.gitattributes` and
  `.envrc` are readable but not writable inside the sandbox. Existing
  linked-worktree `config.worktree` files are covered too. The tool guard also
  denies writes to paths that do not exist yet. Every symlink inside a
  repository-controlled protected tree (`.opencode`, `.claude`, `.agents`) is
  rejected at setup; a real `node_modules` directory is skipped, but a symlink
  named `node_modules` is rejected. A protected path with a symlinked parent is
  rejected. A bounded workspace scan protects every existing nested `.git`
  entry: submodule pointer files, absorbed worktrees and nested repositories.
  A `.git` file pointer may target the main repository's `.git/modules` or
  `.git/worktrees` outside the workspace (outside the sandbox and not inside a
  writable mount); a pointer to another in-workspace path outside those trees,
  a pointer whose raw path traverses a mutable workspace child, or one into a
  configured writable mount, is rejected. Symlinks inside a nested `.git` are
  rejected. The root `.git` stays
  writable for Git; the file tools refuse writes to any nested `.git`. On
  Linux, every ancestor directory of a protected path is pinned as a mountpoint
  so it cannot be renamed around the read-only bind; macOS emits entry-deny
  rules for the same ancestors. `.gitmodules` itself is protected. A submodule not checked out at setup
  (missing `.git` pointer) is a Linux shell missing-path residual. Sibling
  submodules outside a subdirectory workspace are trusted-repository input and
  are not writable by the sandbox. `.git/hooks`, `.git/modules` and
  `.git/worktrees` are protected as roots but not recursively scanned: they are
  host-owned, and a user hook symlink may point at a workspace path. On Linux,
  a missing path cannot be bind-mounted;
  the shell gap is documented below. On macOS, Seatbelt denies the directory
  entry and existing paths, and denies `file-link` to protected/denied paths;
  pre-existing hardlink aliases remain (see below). Nested `.gitattributes`
  files are not individually protected. Git submodule/worktree metadata is
  read-only, so run submodule and worktree updates outside the sandbox. A nested `.git`
  created after setup is denied to the file tools but remains a shell
  missing-path residual. If you symlink a Git
  hook into the workspace, that target is writable by the sandbox; keep hook
  targets outside the workspace.
- **Denied paths**: files listed in `deniedPaths` are masked (empty on Linux,
  denied on macOS), directories become empty, and the tool guard denies reads
  and writes. Use it for `.env`, `secrets/` or other workspace credentials.
- **Unsandboxed commands**: only exact `unsandboxedCommands` patterns from the
  trusted file run on the host shell. Any command containing `;`, `&`, `|`, a
  backtick, `$`, `(`, `)`, `<`, `>` or a newline is refused by the matcher, and
  a `prefix *` entry authorizes all arguments of that command.
- **File tools and `webfetch` on V2 (in-process policy)**: `read`, `write`,
  `edit`, `patch`, `glob` and `grep` are checked against the same workspace
  policy, and `webfetch` follows `webfetch`/`webfetchAllowlist`. This is a
  policy guard, not an OS boundary; see [Tool guard](#tool-guard-v2).

## Tool guard (V2)

The shell sandbox cannot see OpenCode's file tools or `webfetch`; they run in
the server process. With `toolGuard: "enforce"` (default), the plugin installs
a V2 permission hook that applies the same workspace policy:

- reads and searches (`read`, `glob`, `grep`) may touch the workspace,
  `readablePaths`, `writablePaths` and the read-only system runtime. Host temp
  and OpenCode's retained tool-output directory are **not** readable by default;
  add a directory to `readablePaths` if you need generated images or truncated
  output outside the workspace;
- writes (`write`, `edit`, `patch`, and V1 `apply_patch`) may touch only the
  workspace and `writablePaths`;
- `webfetch` is allow, deny, or hostname-allowlisted; the `webfetch` tool
  checks every redirect through the same hook, while `image_generate` checks
  only its initial image URL;
- symlinks are resolved component by component, including broken links, so a
  link inside the workspace cannot point the tool at `~/.ssh`;
- protected workspace config (`opencode.json`, `.opencode`, `.git/hooks`, …)
  and `deniedPaths` are refused for writes even when the path does not exist;
- a denied path fails with a readable message naming the path and the option
  that widens the policy; protected/denied paths say why they cannot be
  widened;
- destructive tools that use the `edit` permission follow the same write
  policy; OpenCode's `worktree_remove` operates outside the workspace under the
  OpenCode data directory, so it is denied while the guard is enforced.

This is a **policy** layer, not an OS boundary. It protects against a
prompt-injected agent; it cannot contain a compromised OpenCode process or a
malicious plugin running in the same process. MCP, LSP, `websearch`, image
generation and non-shell subprocesses remain outside. On V1 the guard is
best-effort: `tool.execute.before` checks file arguments (including
`apply_patch`) and the initial `webfetch` URL, but V1 has no redirect hook.

`webfetch` defaults to `"allow"`. Set `"deny"` or a non-empty
`webfetchAllowlist` when exfiltration through an allowed tool is in scope.

Set `toolGuard: "off"` in the trusted policy to keep the 0.1 behavior (shell
sandbox only). A repository config cannot turn the guard off. If a supported
OpenCode build does not expose the permission hook, the plugin keeps the shell
sandbox and blocks the guarded tools through the tool hook instead of silently
dropping the guard. If neither hook is available, the shell sandbox stays
active and the plugin logs that file tools remain unguarded. A malformed
security option is logged and falls back to `toolGuard: "enforce"`/
`webfetch: "deny"`; it never removes the shell sandbox. `mode: "permissive"`
skips the guard only when the shell sandbox itself cannot be installed.

## What is **not** sandboxed

- MCP servers, LSP servers, formatters, `websearch`, the image-generation
  provider call, subagents' non-shell/non-file tools and any process that does
  not go through the shell service. Local image inputs and image URLs go
  through the same `read`/`webfetch` checks, but `image_generate` redirects
  are not re-checked per hop. Shell commands run by a subagent still go
  through the same shell service and are sandboxed. File tools are
  policy-guarded on V2, not OS-sandboxed; OpenCode's own permission system
  remains an additional control.
- The kernel: this is isolation, not virtualization.
- The workspace contents: a malicious `package.json` script is sandboxed when
  it runs through the shell, but the files themselves are trusted input.
- `network: "allow"`, `writablePaths`, `readablePaths`, `passEnv` and
  `unsandboxedCommands` widen the boundary by explicit user decision in the
  trusted policy. A repository config cannot set them.
- V1 `webfetch` redirects: the V1 adapter checks the initial URL only.
- OpenCode management tools that do not assert a permission, such as
  `worktree_create` and `session_move`, remain outside the tool policy.
- OpenCode's project instruction/config loader (`AGENTS.md`,
  `.opencode/opencode.json`, project plugins) runs in the host process outside
  the tool guard. The read tool's `AGENTS.md` discovery is checked, but
  bootstrap and reload reads are not. The sandbox protects those files from
  writes by a sandboxed command, but a repository that already ships a
  malicious project plugin or config is trusted code before the plugin loads;
  use a whole-process sandbox for that threat.
- **Plugin removal**: an OpenCode project config can remove a plugin
  (`"plugins": []` or `"-@hamzaabili/opencode-sandbox"`) before it runs. No
  plugin can make itself non-removable today
  ([opencode#57687](https://github.com/anomalyco/opencode/issues/57687)).
  Managed hosts can pin the plugin in `/etc/opencode/opencode.json`; for
  hostile repositories use a whole-process sandbox.
- Windows native (PowerShell). Use WSL2; the plugin fails closed on `win32`.
- When OpenCode is opened in a **subdirectory** of a repository, sibling
  submodules outside that subdirectory are repository content the sandbox cannot
  write; they are not individually protected and remain trusted-repository
  input. Open the repository root if you need them covered.
- A submodule `.git` pointer that does not exist at setup is a missing protected
  path on Linux (the tool guard still denies it). Create the pointer before
  relying on shell protection.
- A workspace with more than 50,000 entries (excluding `node_modules`) fails
  closed rather than skipping nested `.git` protection.
- An allowed `.git/modules` or `.git/worktrees` pointer target that does not
  exist at setup is the same Linux missing-path class; the tool guard denies
  writes, but the shell can create the target until it exists.
- A nested repository with its own checked-out submodules/worktrees is not
  supported: pointers are allowed only under the opened repository's root
  `.git/modules`/`.git/worktrees`. Open the nested repository at its root.
- Missing config paths on Linux: `bwrap` cannot bind a read-only source that
  does not exist. The tool guard still denies writes to them, but a shell
  command can create e.g. a new `opencode.json`; on macOS this gap does not
  exist. Create the file (or the `.opencode` directory) before relying on the
  gap being closed on Linux.
- macOS Seatbelt rules are **path-based**. The profile denies `file-link` to
  protected/denied paths and denies the `.git` and protected directory entries
  against rename, but pre-existing hardlink aliases and nested `.gitattributes`
  are out of scope. Use a whole-process sandbox for a hostile repository on
  macOS.
- The protected/denied sets are path-based on both platforms: pre-existing
  hardlinks or aliases outside the named paths are not detected. Symlinks
  inside a real `node_modules` directory are skipped as a package-manager
  exception. On Linux the
  protected files are separate mounts, so creating a new hardlink across them
  fails (`EXDEV`); existing aliases remain a limitation.

## Why this one

| | opencode-sandbox (V1) | this plugin |
| --- | --- | --- |
| OpenCode V2 | ❌ ([#91](https://github.com/isanchez31/opencode-sandbox-plugin/issues/91)) | ✅ native `ctx.shell.hook` |
| OpenCode V1 | ✅ | ✅ legacy adapter |
| Runtime dependencies | `@anthropic-ai/sandbox-runtime` | **zero** |
| Linux engine | bwrap via SRT | bwrap directly |
| macOS engine | Seatbelt via SRT | Seatbelt profile generated natively |
| V2 permissions/history | n/a | original command preserved |
| Network | proxy + domain allowlist | deny or allow (no proxy) |
| Policy trust | project config can weaken it | trusted file outside the workspace; project config only tightens |
| Workspace config | writable | `.opencode`, `opencode.json`, Git hooks/config, `.envrc` read-only |
| Secret paths | deny list | masked `deniedPaths` + tool-guard denial |
| Defaults | permissive/enforce modes | fail-closed, network denied, env cleared |

The project deliberately stays small: the shell is OS-sandboxed, file tools and
`webfetch` get a boundary policy in the server process, and there is no
management UI, proxy, credential vault or container runtime.

## OpenCode sandbox without Docker

A container sandbox runs a second userland: build or pull an image, keep a
daemon running, and decide what to mount into it. This plugin uses the boundary
the host already has:

| | Docker or VM sandbox | this plugin |
| --- | --- | --- |
| Isolation | container namespaces and cgroups (a VM on macOS) | bwrap namespaces or Seatbelt policy (same kernel) |
| Setup | image pull, daemon, container start | one generated wrapper at OpenCode startup |
| Project files | bind mount or copy | the real workspace, writable in place |
| Secrets | injected or mounted into the container | ambient environment cleared |
| Network | container network policy | denied by default |

Use a VM for full process isolation, a container for a separate userland, or
this plugin when the shell commands of your existing OpenCode session should
stay confined without changing how OpenCode starts. The two compose: this shell
boundary can run inside a whole-process sandbox.

## Whole-process sandboxes (nono, OpenShell)

Tools such as [nono](https://nono.sh/docs/cli/clients/opencode) and
[OpenShell](https://docs.nvidia.com/openshell/) run the whole agent inside the
boundary and therefore cover more than this plugin: file tools, MCP, LSP,
`webfetch` and the rest of the process. The tradeoff is the launch model.

As of November 2026, nono's V2 docs call for `--standalone` when you need full
containment: OpenCode normally connects its client to a background daemon that
owns tool execution, plugins and model requests. Sandboxing only the client
leaves that daemon outside the boundary. Launching a fresh daemon inside the
same sandbox meets the containment goal. nono's profile has also used
`OPENCODE_DISABLE_PROJECT_CONFIG=1` as a startup workaround; that behavior can
change as OpenCode fixes project discovery, so check the current profile.
OpenShell runs the agent in a container with a gateway, network proxy and
credential policy.

This plugin does not relaunch OpenCode: it stays a server plugin, so project
configuration and Desktop's local server keep working. Choose whole-process
containment when you need it; choose this plugin when you want OS-sandboxed
shell commands plus an in-process tool policy without changing how OpenCode is
launched. They are complementary, and the shell boundary here can be layered
under a whole-process sandbox.

## Verification

The integration suite runs real sandboxes; unit tests use fakes only for host
surfaces that are not the sandbox itself:

- Linux: workspace writes, host-path denial, host-home invisibility, environment
  scrubbing, network denial, extra mount opt-in, readable/writable mount
  precedence, working-directory handling and wrapper escape refusal.
- macOS: the same suite on a real GitHub macOS runner via `/usr/bin/sandbox-exec`.
- Policy trust: a hostile `opencode.json` cannot widen the sandbox; a trusted
  file can; malformed/unsafe policy files are ignored in favour of defaults.
- Workspace hardening: `.opencode`, `opencode.json`, Git hooks/config and
  `.envrc` are read-only; `deniedPaths` are hidden; normal writes still work.
- Live smoke: an ephemeral `opencode serve` runs a real shell command through the
  V2 hook, asserts the tool guard is registered and history kept the original
  command, verifies a host-home secret and the server password stay outside
  the sandbox, and checks protected/denied paths with a hostile project config.
- Unit tests: profile construction, path validation (root/home/symlink
  escapes), option parsing, policy precedence, unsandboxed patterns, tool
  policy (symlink escapes, mount policy, webfetch allowlist), fail-closed
  paths, V1 adapter and idempotence.

```bash
bun install
bun run ci      # biome + tsc + 216 tests (real sandbox integration included)
bun run smoke   # live OpenCode 2.x shell + boundary check (OPENCODE_BIN to override)
bun run doctor  # non-destructive policy/bwrap/Seatbelt/WSL diagnostics
bun run compat  # ci + smoke; the daily upstream-watch runs this before moving the tested-on anchor
```

CI makes a working sandbox a hard requirement
(`SANDBOX_REQUIRE_BWRAP=1` on Linux,
`SANDBOX_REQUIRE_SANDBOX_EXEC=1` on macOS), so integration tests cannot silently
skip. The tagged release is gated on the same Ubuntu+macOS matrix before npm
publish.

## Diagnostics

The package ships a non-destructive doctor. It creates and removes a temporary
runtime directory for the probe (and may create the user cache directory if it
is absent), but does not modify the workspace or policy. It prints the
platform/WSL state, the trusted policy files and their `active`/`invalid`/
`absent` status, the effective policy, mount counts, the trusted binary and a
**real generated-wrapper probe** with the configured shell. It never starts a
model or a server:

```bash
bunx --bun @hamzaabili/opencode-sandbox doctor
bunx --bun @hamzaabili/opencode-sandbox doctor --json
bunx --bun @hamzaabili/opencode-sandbox doctor --workspace /path/to/project
```

Exit codes: `0` ready, `1` policy/layout/probe problem, `2` usage error. The
doctor needs Bun (OpenCode's own runtime); it does not start a model or a
server. It never prints environment values; `--json` includes local paths and
environment variable names but not `unsandboxedCommands` values.

## Other OpenCode plugins by the same author

Same constraints: MIT, zero runtime dependencies, OpenCode V1 + V2.

- [opencode-agent-plugins](https://github.com/Hamza-Abili/opencode-agent-plugins) — Agent Plugins 1.0 client: portable skills and MCP servers from standard directories and npm, trusted before enabled.
- [opencode-telegram-notify](https://github.com/Hamza-Abili/opencode-telegram-notify) — Telegram notifications for permissions, questions and idle sessions, with tap-only inline buttons.
- [opencode-claude-hooks](https://github.com/Hamza-Abili/opencode-claude-hooks) — run existing Claude Code hooks natively in OpenCode, with trust, timeouts and a compatibility doctor.
- [opencode-integrity](https://github.com/Hamza-Abili/opencode-integrity) — lock plugins, MCP tool definitions and skills; detect drift, tool poisoning and rug pulls.

## Support

- Bugs: [open an issue](https://github.com/Hamza-Abili/opencode-sandbox/issues/new/choose)
  with the matching template and redact secrets or private paths.
- Setup and design questions: use
  [Discussions](https://github.com/Hamza-Abili/opencode-sandbox/discussions).
- Security: [private advisory](https://github.com/Hamza-Abili/opencode-sandbox/security/advisories/new),
  never a public issue.
- If this saves you time, a [star](https://github.com/Hamza-Abili/opencode-sandbox/stargazers)
  helps other OpenCode users find it.

## Development

```
src/
  app.ts        V2 shell hook, fail-closed paths
  legacy.ts     V1 adapter (documented caveat)
  policy.ts     trusted policy file, precedence and audit warnings
  protected.ts  OpenCode/Git workspace paths that must stay read-only
  escape.ts     trusted unsandboxed command patterns
  mounts.ts     deterministic broad-to-narrow mount plan
  paths.ts      workspace/home/mount/denied validation
  quote.ts      POSIX shell quoting
  trace.ts      optional JSONL debug trace
  types.ts      options, layout and profile types
  profile.ts    Linux bwrap profile
  darwin.ts     macOS Seatbelt profile
  wrapper.ts    generated wrapper + runtime directory
  binary.ts     trusted absolute binary resolution
  probe.ts      real sandbox probe
  wsl.ts        WSL2 detection
  options.ts    secure defaults
  index.ts      dual V1/V2 entrypoint
```

MIT licensed.
