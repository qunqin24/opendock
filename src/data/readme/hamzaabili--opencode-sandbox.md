# opencode-sandbox

[![CI](https://github.com/Hamza-Abili/opencode-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/Hamza-Abili/opencode-sandbox/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40hamzaabili/opencode-sandbox)](https://www.npmjs.com/package/@hamzaabili/opencode-sandbox)
[![npm downloads](https://img.shields.io/npm/dt/%40hamzaabili/opencode-sandbox)](https://www.npmjs.com/package/@hamzaabili/opencode-sandbox)
[![GitHub stars](https://img.shields.io/github/stars/Hamza-Abili/opencode-sandbox?style=social)](https://github.com/Hamza-Abili/opencode-sandbox/stargazers)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Hamza-Abili/opencode-sandbox/blob/main/LICENSE)

**Native command sandbox for OpenCode V1 and V2.**

Every shell command runs inside the OS sandbox: [bubblewrap](https://github.com/containers/bubblewrap)
on Linux and **Seatbelt** (`sandbox-exec`) on macOS. The workspace is writable,
the system is read-only, `$HOME` is synthetic, ambient secrets are cleared, and
the network is denied by default. **Fail-closed**: if the sandbox cannot be
created, commands are refused — never silently run unsandboxed.

Zero runtime dependencies. No helper daemon. No proxy. No SRT.

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
- **Windows**: not supported; the plugin fails closed.

The plugin probes a **real** sandbox at startup and reports the exact failure
instead of assuming the binary is usable. The sandbox binary is resolved from
fixed root-owned absolute locations, never through `PATH`.

## Install (OpenCode V2)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@hamzaabili/opencode-sandbox",
      "options": {
        "network": "deny"
      }
    }
  ]
}
```

Restart OpenCode. On load the plugin logs:

```
[opencode-sandbox] ready (platform=linux, sandbox=bwrap, network=deny, mode=enforce, toolGuard=enforce, webfetch=allow, workspace=/path/to/project)
```

## Install (OpenCode V1)

V1 uses the same package; the default export exposes both `setup()` for V2 and
`server()` for V1. Enable it with the V1 plugin list (an options tuple is
optional):

```jsonc
{
  "plugin": [
    ["@hamzaabili/opencode-sandbox", { "network": "deny" }]
  ]
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
API (tested on 2.2.7; the package declares `>=1.19 <2 || >=2.0`).

## Options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `network` | `"deny" \| "allow"` | `"deny"` | `deny` removes the network namespace (Linux) / denies all network operations (macOS). `allow` shares the host network. There is intentionally no shell-network domain allowlist: a real one needs a TLS-intercepting proxy, which would add a dependency and a certificate authority to trust. `webfetchAllowlist` is a separate application-level hostname filter for the `webfetch` tool, not a proxy and not shell egress. |
| `mode` | `"enforce" \| "permissive"` | `"enforce"` | `enforce` refuses shell commands when the sandbox is unavailable. `permissive` runs shell commands unsandboxed with a warning; when the shell sandbox cannot be installed it also skips the tool guard. Explicit opt-out only. |
| `writablePaths` | `string[]` | `[]` | Extra host paths read-write inside the sandbox. Must exist; canonicalised (symlinks resolved); `/`, the host home and its ancestors, credential directories and host system paths are rejected. A path cannot also be listed in `readablePaths`. |
| `readablePaths` | `string[]` | `[]` | Extra host paths read-only inside the sandbox. Root, host home and ancestors are rejected; explicit credential/system paths are allowed read-only as a trust decision. A more specific readable path overrides a broader writable mount; the workspace and any path also listed as writable are rejected. |
| `passEnv` | `string[]` | `[]` | Environment variables copied from the plugin process into the sandbox. Reserved keys (`HOME`, `PATH`, `TMPDIR`, `XDG_*`, …) cannot be overridden. |
| `shell` | `string` | `/bin/bash` (or `/bin/sh`) | Absolute shell used **inside** the sandbox. |
| `toolGuard` | `"enforce" \| "off"` | `"enforce"` | V2 in-process policy for file tools and `webfetch`. It reuses the same workspace, `writablePaths` and `readablePaths`, resolves symlinks and denies paths outside that policy. `off` disables the whole in-process layer; `webfetch: "deny"` and `webfetchAllowlist` then require `"enforce"` and are rejected. This is a policy layer, not an OS boundary; see [Tool guard](#tool-guard-v2). |
| `webfetch` | `"allow" \| "deny"` | `"allow"` | `deny` blocks every `webfetch` call. Requires `toolGuard: "enforce"`. |
| `webfetchAllowlist` | `string[]` | `[]` | If non-empty, only these hostnames are allowed. `*.example.com` matches the apex and subdomains. The `webfetch` tool checks every redirect through the same hook on V2; `image_generate` checks only its initial image URL. Requires `toolGuard: "enforce"`. |

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
  synthetic home, temp dirs and explicit writable paths.
- **Environment**: cleared and rebuilt from `PATH`, `TERM`, locale, `TZ`, a
  synthetic `HOME` plus `passEnv`. `--clearenv` is used on Linux; `env -i` on
  macOS.
- **Process**: `--unshare-all`, `--cap-drop ALL`, `--die-with-parent`,
  `--new-session` (Linux); Seatbelt confinement is inherited by every child
  (macOS).
- **Network**: denied by default.
- **File tools and `webfetch` on V2 (in-process policy)**: `read`, `write`,
  `edit`, `patch`, `glob` and `grep` are checked against the same workspace
  policy, and `webfetch` follows `webfetch`/`webfetchAllowlist`. This is a
  policy guard, not an OS boundary; see [Tool guard](#tool-guard-v2).

## Tool guard (V2)

The shell sandbox cannot see OpenCode's file tools or `webfetch`; they run in
the server process. With `toolGuard: "enforce"` (default), the plugin installs
a V2 permission hook that applies the same workspace policy:

- reads and searches (`read`, `glob`, `grep`) may touch the workspace,
  `readablePaths`, `writablePaths`, the read-only system runtime, OpenCode's
  temp directory (`<os.tmpdir>/opencode`, used for generated images) and its
  retained tool-output directory (used for truncated results);
- writes (`write`, `edit`, `patch`, and V1 `apply_patch`) may touch only the
  workspace and `writablePaths`; OpenCode's image generator may still write its
  default output under its own temp directory when no model-selected path is
  given;
- `webfetch` is allow, deny, or hostname-allowlisted; the `webfetch` tool
  checks every redirect through the same hook, while `image_generate` checks
  only its initial image URL;
- symlinks are resolved component by component, including broken links, so a
  link inside the workspace cannot point the tool at `~/.ssh`;
- a denied path fails with a readable message naming the path and the option
  that widens the policy;
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

Set `toolGuard: "off"` to keep the 0.1 behavior (shell sandbox only). If a
supported OpenCode build does not expose the permission hook, the plugin keeps
the shell sandbox and blocks the guarded tools through the tool hook instead of
silently dropping the guard. If neither hook is available, the shell sandbox
stays active and the plugin logs that file tools remain unguarded. A malformed
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
- `network: "allow"`, `writablePaths`, `readablePaths` and `passEnv` widen the
  boundary by explicit user decision.
- V1 `webfetch` redirects: the V1 adapter checks the initial URL only.
- OpenCode management tools that do not assert a permission, such as
  `worktree_create` and `session_move`, remain outside the tool policy.
- OpenCode's project instruction/config loader (`AGENTS.md`,
  `.opencode/opencode.json`, project plugins) runs in the host process outside
  the tool guard. The read tool's `AGENTS.md` discovery is checked, but
  bootstrap and reload reads are not; use a whole-process sandbox for that
  threat.
- Windows.

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
| Defaults | permissive/enforce modes | fail-closed, network denied, env cleared |

The project deliberately stays small: the shell is OS-sandboxed, file tools and
`webfetch` get a boundary policy in the server process, and there is no
management UI, proxy, credential vault or container runtime.

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
- Live smoke: an ephemeral `opencode serve` runs a real shell command through the
  V2 hook, asserts the tool guard is registered and history kept the original
  command, and verifies a host-home secret and the server password stay outside
  the sandbox.
- Unit tests: profile construction, path validation (root/home/symlink
  escapes), option parsing, tool policy (symlink escapes, mount policy,
  webfetch allowlist), fail-closed paths, V1 adapter and idempotence.

```bash
bun install
bun run ci      # biome + tsc + 152 tests (real sandbox integration included)
bun run smoke   # live OpenCode 2.x shell + boundary check (OPENCODE_BIN to override)
bun run compat  # ci + smoke; the daily upstream-watch runs this before moving the tested-on anchor
```

CI makes a working sandbox a hard requirement
(`SANDBOX_REQUIRE_BWRAP=1` on Linux,
`SANDBOX_REQUIRE_SANDBOX_EXEC=1` on macOS), so integration tests cannot silently
skip. The tagged release is gated on the same Ubuntu+macOS matrix before npm
publish.

## Other OpenCode plugins by the same author

Same constraints: MIT, zero runtime dependencies, OpenCode V1 + V2.

- [opencode-agent-plugins](https://github.com/Hamza-Abili/opencode-agent-plugins) — Agent Plugins 1.0 client: discovery from `.agents/plugins` and npm packages, native skills, trust-first MCP registration.
- [opencode-telegram-notify](https://github.com/Hamza-Abili/opencode-telegram-notify) — Telegram notifications for permission prompts, questions and idle sessions, with tap-only inline buttons.

## Support

- Bugs: [open an issue](https://github.com/Hamza-Abili/opencode-sandbox/issues/new/choose)
  with the matching template and redact secrets or private paths.
- Setup and design questions: use
  [Discussions](https://github.com/Hamza-Abili/opencode-sandbox/discussions).
- Security: [private advisory](https://github.com/Hamza-Abili/opencode-sandbox/security/advisories/new),
  never a public issue.

## Development

```
src/
  app.ts       V2 shell hook, fail-closed paths
  legacy.ts    V1 adapter (documented caveat)
  mounts.ts    deterministic broad-to-narrow mount plan
  paths.ts     workspace/home/mount validation
  quote.ts     POSIX shell quoting
  trace.ts     optional JSONL debug trace
  types.ts     options, layout and profile types
  profile.ts   Linux bwrap profile
  darwin.ts    macOS Seatbelt profile
  wrapper.ts   generated wrapper + runtime directory
  binary.ts    trusted absolute binary resolution
  probe.ts     real sandbox probe
  options.ts   secure defaults
  index.ts     dual V1/V2 entrypoint
```

MIT licensed.
