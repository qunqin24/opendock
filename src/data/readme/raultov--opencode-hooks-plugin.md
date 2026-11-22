# opencode-hooks-plugin

Runs Claude Code `SessionStart`, `PreToolUse` and `PostToolUse` hooks in [opencode](https://opencode.ai), which
does not read Claude Code's hooks files.

One package serves **both opencode generations**: the dual entrypoint runs on opencode V2 and on opencode V1
(1.18.29 or newer), with the same bridged behaviour in each.

If you maintain a Claude Code plugin (or a `.claude/settings.json`) that bootstraps a session — installs
dependencies, warms a cache, syncs config — that work silently does nothing under opencode. This plugin
executes those same commands and forwards their output the way Claude Code would.

## Why this is needed

opencode has hooks for its own plugins, but it does not read Claude Code's. That is verifiable:

- The config schema at <https://opencode.ai/config.json> contains **zero** occurrences of the string `hook`.
  There is no top-level `hooks` key and no `experimental.hook`, so a hooks file cannot be declared in config.
- There is no `SessionStart` event. The [plugin event list](https://opencode.ai/docs/plugins/#events) exposes
  `session.created`, `session.idle`, `tool.execute.before`, and friends — nothing that fires at startup with
  Claude Code's semantics.
- opencode's [Claude Code compatibility](https://opencode.ai/docs/rules/#claude-code-compatibility) covers
  `CLAUDE.md` and `~/.claude/skills/` only. `settings.json` and hook definitions are ignored.

So a Claude Code `hooks.json` is inert under opencode. The only startup extension point is the plugin
entrypoint — the plugin function body in V1, `setup` in V2 — which runs once when the plugin loads. This
package maps one onto the other.

## Mapping

| Claude Code                       | opencode V1                                     | opencode V2                                      |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `SessionStart` + `matcher`         | the plugin function body (runs once at load)    | the `setup` body (runs once at load)             |
| `PreToolUse` + `matcher`           | `tool.execute.before`                           | `tool.hook("execute.before")`                     |
| `PostToolUse` + `matcher`          | `tool.execute.after`                            | `tool.hook("execute.after")`, completed calls    |
| `type: "command"`                  | `sh -c` via opencode's shell                    | `sh -c` via `node:child_process`                 |
| `${CLAUDE_PLUGIN_ROOT}`            | the `root` option                               | the `root` option                                |
| `$CLAUDE_PROJECT_DIR`              | the project directory                           | the project directory                            |
| stdout `{ "systemMessage": "…" }`  | `experimental.chat.system.transform`            | session `context`/`compaction`/`generate`/`title` hooks |
| stdout `{ "continue": false }`     | remaining commands are skipped                  | remaining commands are skipped                   |
| `PreToolUse` deny / exit 2 (opt-in) | `tool.execute.before` throws                   | `tool.hook("execute.before")` rejects (2.0.29+)  |

Claude Code's stdout control contract is honoured: hook scripts routinely interleave the JSON directive with
ordinary log lines, so stdout is scanned line by line rather than parsed as one document.

## Install

### opencode V2

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@raultov/opencode-hooks-plugin"]
}
```

With options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@raultov/opencode-hooks-plugin",
      "options": {
        "root": "/path/to/your/claude-plugin",
        "skip": ["some-claude-only-hook.sh"]
      }
    }
  ]
}
```

### opencode V1

```sh
opencode plugin @raultov/opencode-hooks-plugin
```

Or add it to `opencode.json` yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@raultov/opencode-hooks-plugin"]
}
```

With options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@raultov/opencode-hooks-plugin",
      {
        "root": "/path/to/your/claude-plugin",
        "skip": ["some-claude-only-hook.sh"]
      }
    ]
  ]
}
```

### Notes

- **opencode V1 older than 1.18.29** cannot load the dual entrypoint (it predates object entrypoints).
  Pin `@raultov/opencode-hooks-plugin@0.2.0` there.
- **Loading from a local path** (development, or a checkout): point the config at the built `dist/`
  directory, which contains `index.js`. npm package names resolve `dist/index.js` on their own.
  On V2, plugins are keyed by `id` and the first one loaded wins, so a local build is ignored while the
  published package is also configured (in the global config, say): remove one of the two.
- The `./v1` and `./v2` package exports expose each generation's entrypoint in isolation, mostly for
  tests and wrappers; the default export already serves both.

## Which hooks file is used

With no `hooksFile` set, these are probed under `root`, in order, and the first that exists wins:

1. `hooks/hooks.json` — the Claude Code *plugin* manifest layout
2. `.claude/settings.json` — the user/project settings layout

The file is read at **runtime**, not baked in at install time, so edits to your hooks are picked up on the
next start without touching this plugin. That matters when the hooks file is maintained by someone else: a
hardcoded command list goes stale the moment upstream renames a script.

Both layouts share the same shape, so either works:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/install-deps.sh\"" }
        ]
      }
    ]
  }
}
```

## Options

| Option                 | Type                     | Default                                 | Description                                                                 |
| ---------------------- | ------------------------ | --------------------------------------- | --------------------------------------------------------------------------- |
| `root`                 | `string`                 | `$OPENCODE_HOOKS_ROOT`, else project dir | What `${CLAUDE_PLUGIN_ROOT}` expands to, and where the hooks file is probed. |
| `hooksFile`            | `string`                 | `$OPENCODE_HOOKS_FILE`, else probed      | Explicit path to a hooks file.                                              |
| `matchers`             | `string[]`               | `["startup", "resume", ""]`              | `SessionStart` matcher values to honour. A group with no matcher counts as `""`, so it runs with the defaults but not with a list that leaves `""` out. `startup\|resume` runs when either is honoured. |
| `skip`                 | `string[]`               | `[]`                                     | Substrings; a command containing any of them is not run.                    |
| `timeoutMs`            | `number`                 | `20000`                                  | How long the **first model call** waits for the commands as a whole.        |
| `commandTimeoutMs`     | `number`                 | `120000`                                 | How long **one command** is waited for before moving on to the next.        |
| `injectSystemMessages` | `boolean`                | `true`                                   | Whether `systemMessage` directives reach the system prompt.                  |
| `reportFailures`       | `boolean`                | `true`                                   | Whether a failed command adds a one-line notice to the system prompt.        |
| `env`                  | `Record<string, string>` | `{}`                                     | Extra environment variables exported to every command.                      |
| `preToolDecisions`     | `boolean`                | `false`                                  | Whether `PreToolUse` commands can block or rewrite a call. See [PreToolUse decisions](#pretooluse-decisions-opt-in). |
| `failClosed`           | `boolean`                | `false`                                  | With `preToolDecisions`, whether a `PreToolUse` command that times out, fails to start or exits other than 0 or 2 blocks the call. |
| `killOnTimeout`        | `boolean`                | `false`                                  | Whether a command that outlives `commandTimeoutMs` is killed, with every process it started. |
| `trust`                | `"all"` \| `"approved"`  | `"all"`                                  | `"approved"` runs a project's own hooks only once approved. See [Approving project hooks](#approving-project-hooks-opt-in). |
| `approvalsFile`        | `string`                 | `~/.config/opencode-hooks/approved.json` | Where approvals are kept (`$XDG_CONFIG_HOME` is honoured).                  |

Every option added after 0.6.0 is off by default: without them the plugin behaves exactly as it did.

## PreToolUse

Before each opencode tool call, the `PreToolUse` commands whose `matcher` selects the Claude Code tool name run,
in order. The tool mapping, matcher rules and payload are the same as for `PostToolUse` below, with
`hook_event_name: "PreToolUse"`.

Each command is awaited, so a hook that inspects the working tree sees it as the tool found it. By default, unlike
in Claude Code, a `PreToolUse` hook cannot block or change the call: its exit code and stdout are ignored, and a
failure is logged only. Set `preToolDecisions` to change that.

### PreToolUse decisions (opt-in)

With `"preToolDecisions": true`, `PreToolUse` commands decide about the call the way Claude Code reads them:

| The command                                                       | The call                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| exits 2                                                           | is blocked; stderr is the reason the model reads                |
| exits 0 with `permissionDecision: "deny"`                         | is blocked, with `permissionDecisionReason`                     |
| exits 0 with the deprecated `decision: "block"`, or `continue: false` | is blocked, with `reason` / `stopReason`                    |
| exits 0 with `updatedInput`                                       | runs with the changed fields written back to opencode's arguments |
| exits 0 with `additionalContext`                                  | runs, and the text is appended to its result for the model      |
| exits 0 with `permissionDecision: "ask"`                          | runs: a plugin cannot prompt, so opencode's own permission rules decide; a warning is logged |
| exits 0 with `allow`, or nothing                                  | runs                                                            |
| exits with any other code, times out or fails to start            | runs, unless `failClosed` is on, then it is blocked             |

stdout is parsed as one JSON document first, as Claude Code does, and line by line when that fails, so a directive
printed among log lines still counts. The most restrictive decision wins; the first block stops the remaining
commands. Every command is sent the call as the model made it, not as an earlier hook rewrote it.

A blocked call fails with `Blocked by PreToolUse hook <script>: <reason>`. opencode V1 does this through
`tool.execute.before` throwing, as its own `.env` protection example does. opencode V2 fails a call from a plugin hook
from **2.0.29** on; on an older V2 the denial is logged and the call goes ahead, and a warning says so at startup.

`updatedInput` is mapped back field by field (`file_path` → `filePath`/`path`, `old_string` → `oldString`,
`run_in_background` → `background`, …), and only the fields whose value changed are written. A patch reaches hooks as
one `Edit` per file, so an `updatedInput` for it cannot be written back: it is ignored with a warning. A shell call's
`workdir` stays as it was: the `cd '<dir>' && ` the hook was shown is stripped back off the new command.

`allow` does not skip opencode's permission prompts.

## PostToolUse

After each opencode tool call that changes files, the `PostToolUse` commands whose `matcher` selects the
Claude Code tool name run, in order. The matcher follows Claude Code: empty or `*` selects every tool,
anything else is a regular expression over the whole name.

| opencode V1   | opencode V2 | Claude Code `tool_name` | `tool_input`                                                       |
| ------------- | ----------- | ----------------------- | ------------------------------------------------------------------ |
| `write`       | `write`     | `Write`                 | `file_path`, `content`                                             |
| `edit`        | `edit`      | `Edit`                  | `file_path`, `old_string`, `new_string`, `replace_all`             |
| `bash`        | `shell`     | `Bash`                  | `command`, `description`, `timeout`, `run_in_background`           |
| `apply_patch` | `patch`     | `Edit`, once per file   | `file_path` of each file the patch adds, updates or moves to        |

Every other tool runs no command: there is no Claude Code payload this plugin could vouch for. A `write` or
`edit` with no file path runs none either. A patch's deleted files, and the source of a move, are left out: they
no longer exist, and Claude Code never reports an `Edit` on a missing file. `file_path` is always absolute,
resolved against the project directory. The payload also carries `session_id`, `cwd` and `hook_event_name`; it
carries no `transcript_path` and no `tool_response`.

A shell call's `workdir` becomes a `cd` in front of `command`: `{ command: "ls", workdir: "/other" }` arrives as
`cd '/other' && ls`. Claude Code's `Bash` has no `workdir`, so an agent there writes that `cd` itself, and hooks
read the directory from the command. A `workdir` equal to the project directory leaves the command unchanged.

It also carries `model`: the id of the model the session last called, as Claude Code puts it in its
`SessionStart` payload. opencode can switch models mid-session, so it is read from the latest call (V1
`chat.params`, V2 `model.request`), and a subagent's calls carry its own. Calls opencode makes on the
session's behalf are left out: its title, summary and compaction requests share the session id, often on a
smaller model, and no tool call comes from them. Before a session's first model call there is no `model` key.

Each command is awaited, as Claude Code does, so a hook that inspects the working tree sees the tool's effect.
It is bounded by `commandTimeoutMs`. A failure is logged only: it never reaches the system prompt and never
fails the tool call. stdout directives are not honoured.

## Behaviour

**Startup is not blocked.** opencode awaits the plugin function, so awaiting the hook commands there would
add their full runtime to every launch. They are started and left to run; the first model call waits up to
`timeoutMs` for their `systemMessage` output, and they keep going in the background past that.

**Commands run sequentially,** in the order declared in the hooks file. Each one is waited for up to
`commandTimeoutMs`; past that the next command starts anyway, so one command that never returns cannot
starve the rest. The two timeouts are easy to confuse: `commandTimeoutMs` bounds each command, `timeoutMs`
bounds how long the first model call waits for all of them. By default an overrunning command is left to finish
on its own: Bun's shell exposes no way to kill it, and killing an install or a sync half-way can leave it worse off.
Set `killOnTimeout` to kill it instead: the command then runs in a process group of its own, through
`node:child_process` on both generations, and the whole group gets `SIGTERM`, then `SIGKILL` two seconds later.

**Commands get the event payload on stdin,** as in Claude Code, and stdin then ends, so a hook that reads it
sees EOF instead of hanging. `SessionStart` gets `hook_event_name`, `source: "startup"` and `cwd`; there is no
`session_id` (no session exists when the plugin loads) and no `transcript_path` (there is no Claude Code
transcript).

**Failures are soft.** A missing script, a non-zero exit, or a network timeout produces a log entry and the
next command still runs. A broken hook never breaks your session. The model is told too: each failed command
adds a one-line notice to the system prompt, so it knows its context is incomplete rather than assuming it is
whole. The notice names the command and how it failed, never its stderr, which stays in the log. Set
`reportFailures: false` to keep failures in the log only. Inspect what happened with:

```sh
opencode --print-logs --log-level DEBUG
```

opencode V1 entries are tagged `service=opencode-hooks`; opencode V2 logs to the console with an
`[opencode-hooks]` prefix.

**Hooks it will not run are named once,** at `info` level when the plugin loads: events it does not bridge
(`Stop: 2`) and entries that are not a `command` (`PreToolUse type prompt: 1`).

**`CLAUDE_PLUGIN_ROOT` is exported** to every command, since hook scripts often read it directly.
**`CLAUDE_CODE_ENTRYPOINT` is deliberately not set** — scripts use it to gate Claude-Code-only behaviour, and
this is not Claude Code. If one of your hooks is a no-op without it, that hook was written to only run under
Claude Code; put it in `skip`.

## Approving project hooks (opt-in)

By default every bridged command runs. A repository that ships a `.claude/settings.json` therefore runs its commands,
with your environment, as soon as opencode starts in it. With `"trust": "approved"`, a command from a hooks file
**inside the project directory** runs only once it has been approved; a hooks file outside it (a `root` or
`hooksFile` your own config points at, such as an installed Claude Code plugin) is trusted as before.

Approvals are kept outside every repository, in `~/.config/opencode-hooks/approved.json` (mode `0600`), so a
repository cannot approve itself. Review and approve a project's commands from its directory:

```sh
npx @raultov/opencode-hooks-plugin status    # lists each command and whether it is approved
npx @raultov/opencode-hooks-plugin approve   # asks, then approves the ones that are not
```

Both take `--root`, `--hooks-file` and `--approvals-file`, resolved as the plugin resolves them; `approve --yes`
skips the question. When the plugin skips unapproved commands it logs a warning with the exact `approve` command line.

An approval covers the hooks file, the event, the matcher and the command line. Editing the command or widening its
matcher needs a new approval. **The content of a script the command calls is not covered:** approve a command that
runs `./.claude/hooks/x.sh` only if you trust whoever can change that script.

An unknown `trust` value is read as `"approved"`, so a typo cannot quietly run everything.

## Limitations

- **Only `SessionStart`, `PreToolUse` and `PostToolUse` are bridged.** The other Claude Code events have
  opencode counterparts you can wire up directly in a plugin of your own: `Stop` → the `session.idle` event,
  `SessionEnd` → `session.deleted`.
- **By default a `PreToolUse` hook cannot block or change a call,** and no tool hook's stdout reaches the model.
  `preToolDecisions` makes `PreToolUse` honour exit code 2, `permissionDecision`, `updatedInput` and
  `additionalContext`; `ask` cannot prompt, and `PostToolUse` output is still not read.
- **`SessionStart` runs once per opencode process,** when the plugin loads, not once per session. Its payload's
  `source` is always `startup`: no session exists yet at that point, so the plugin cannot tell a resumed one apart.
- **`systemMessage` injection differs per generation.** opencode V2 uses the stable session request
  hooks, offering the block to every request kind that carries a system prompt (`context`, `compaction`,
  `generate`, `title`). opencode V1 uses an experimental hook (`experimental.chat.system.transform`)
  that may change without notice; if injected messages ever stop appearing there, that is the first
  thing to check — the log output is unaffected. Set `injectSystemMessages: false` to opt out and rely
  on logs only.
- **`continue: false` skips the remaining commands** but cannot abort the session the way Claude Code does;
  opencode has no equivalent control channel.

## Development

```sh
bun install
bun test        # unit + plugin-level tests; only the process tests run real (local) sh commands
bun run typecheck
bun run lint
bun run build
```

## Publishing (maintainers)

`prepublishOnly` runs the full check suite, so a broken package cannot be published
by accident:

```sh
npm login                 # one-time, if not already authenticated
npm run build             # regenerate dist/
npm publish               # runs prepublishOnly, then publishes with provenance
```

Cut a release by bumping `version` in `package.json`, updating `CHANGELOG.md`, and
pushing a tag — the npm tarball contains `dist/`, `README.md` and `LICENSE` only.

## License

MIT
