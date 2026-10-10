# opencode-hooks-plugin

Runs Claude Code `SessionStart` hooks in [opencode](https://opencode.ai), which has no hook system of its own.

One package serves **both opencode generations**: the dual entrypoint runs on opencode V2 and on opencode V1
(1.18.29 or newer), with the same bridged behaviour in each.

If you maintain a Claude Code plugin (or a `.claude/settings.json`) that bootstraps a session — installs
dependencies, warms a cache, syncs config — that work silently does nothing under opencode. This plugin
executes those same commands and forwards their output the way Claude Code would.

## Why this is needed

opencode has no hooks. That is not an oversight in the docs — it is verifiable:

- The config schema at <https://opencode.ai/config.json> contains **zero** occurrences of the string `hook`.
  There is no top-level `hooks` key and no `experimental.hook`.
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
| `type: "command"`                  | `sh -c` via opencode's shell                    | `sh -c` via `node:child_process`                 |
| `${CLAUDE_PLUGIN_ROOT}`            | the `root` option                               | the `root` option                                |
| stdout `{ "systemMessage": "…" }`  | `experimental.chat.system.transform`            | session `context`/`compaction`/`generate`/`title` hooks |
| stdout `{ "continue": false }`     | remaining commands are skipped                  | remaining commands are skipped                   |

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
| `matchers`             | `string[]`               | `["startup", "resume", ""]`              | Matcher values to honour. An entry with no matcher always runs.              |
| `skip`                 | `string[]`               | `[]`                                     | Substrings; a command containing any of them is not run.                    |
| `timeoutMs`            | `number`                 | `20000`                                  | How long the **first model call** waits for the commands as a whole.        |
| `commandTimeoutMs`     | `number`                 | `120000`                                 | How long **one command** is waited for before moving on to the next.        |
| `injectSystemMessages` | `boolean`                | `true`                                   | Whether `systemMessage` directives reach the system prompt.                  |
| `reportFailures`       | `boolean`                | `true`                                   | Whether a failed command adds a one-line notice to the system prompt.        |
| `env`                  | `Record<string, string>` | `{}`                                     | Extra environment variables exported to every command.                      |

## Behaviour

**Startup is not blocked.** opencode awaits the plugin function, so awaiting the hook commands there would
add their full runtime to every launch. They are started and left to run; the first model call waits up to
`timeoutMs` for their `systemMessage` output, and they keep going in the background past that.

**Commands run sequentially,** in the order declared in the hooks file. Each one is waited for up to
`commandTimeoutMs`; past that the next command starts anyway, so one command that never returns cannot
starve the rest. The two timeouts are easy to confuse: `commandTimeoutMs` bounds each command, `timeoutMs`
bounds how long the first model call waits for all of them. Bun's shell exposes no way to kill a running
command, so an overrunning one is left to finish on its own.

**Commands get no stdin.** They run with stdin from `/dev/null`, so a hook that reads it by accident sees
EOF instead of hanging.

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

**`CLAUDE_PLUGIN_ROOT` is exported** to every command, since hook scripts often read it directly.
**`CLAUDE_CODE_ENTRYPOINT` is deliberately not set** — scripts use it to gate Claude-Code-only behaviour, and
this is not Claude Code. If one of your hooks is a no-op without it, that hook was written to only run under
Claude Code; put it in `skip`.

## Limitations

- **Only `SessionStart` is bridged.** The other Claude Code events have opencode counterparts you can wire up
  directly in a plugin of your own, and doing so needs no `hooks.json`: `PreToolUse` → `tool.execute.before`,
  `PostToolUse` → `tool.execute.after`, `Stop` → the `session.idle` event, `SessionEnd` → `session.deleted`.
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
bun test        # unit + plugin-level tests, no real commands executed
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
