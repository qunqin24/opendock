# opencode-plugin-dcg

An [opencode](https://opencode.ai) plugin that checks every shell command with
[dcg](https://github.com/Dicklesworthstone/destructive_command_guard)
(destructive command guard) before it runs, and aborts the tool call when dcg
flags it.

> **Guardrail, not a security boundary.** dcg matches command patterns —
> env-var prefixes, `sh -c` wrappers and shell aliases can slip past it. This
> catches mistakes. It is not containment for a hostile agent, and nothing here
> should be trusted as such.

## Prerequisite: the dcg binary

The plugin does **not** install dcg, and does not track its version. Install it
first — see the [dcg installation docs](https://github.com/Dicklesworthstone/destructive_command_guard#installation):

```bash
# Homebrew, from the upstream tap (macOS and Linux):
brew install dicklesworthstone/tap/dcg

# or the install script:
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/destructive_command_guard/main/install.sh" | bash -s -- --easy-mode

dcg --version
dcg --robot test "rm -rf /"   # prints JSON with a deny decision
```

Either way is enough for this plugin: it asks the binary directly, so `dcg` on
`PATH` (or `DCG_PLUGIN_BINARY` pointing at it) is all that is needed. dcg's own
`dcg install` step wires dcg into *other* agents' hook systems — opencode is not
one of them, which is what this plugin is for — so it is optional here.

If dcg is missing, the plugin says so once and then follows
`DCG_PLUGIN_FAIL_MODE` — it never silently passes commands through while
looking installed.

## Install

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-dcg@0.2.0"]
}
```

Plugins load at startup, so restart opencode afterwards. opencode caches by the
full spec string and never re-checks it, which is why the version is pinned.

## Configuration

Rules are dcg's, not the plugin's. Which commands count as destructive, the
severity levels and the allowlists all live in `~/.config/dcg/config.toml` or a
project-level `.dcg.toml` — see the
[dcg configuration docs](https://github.com/Dicklesworthstone/destructive_command_guard#configuration).
dcg's own `DCG_BYPASS=1` works as usual: the plugin asks dcg, and dcg answers
allow.

The plugin reads two layers. `opencode.json` is the durable one — pass options
by replacing the plugin string with a `[spec, options]` pair:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-plugin-dcg@0.2.0", { "failMode": "closed", "tools": ["bash", "my-shell-tool"] }]
  ]
}
```

Environment variables override those, so a single session can be re-pointed
without editing config:

| Option | Variable | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `DCG_PLUGIN_ENABLED` | `true` | `false` disables the plugin entirely |
| `failMode` | `DCG_PLUGIN_FAIL_MODE` | `open` | `open` runs the command when dcg cannot be consulted; `closed` blocks it |
| `timeoutMs` | `DCG_PLUGIN_TIMEOUT_MS` | `5000` | Timeout for a single dcg invocation |
| `tools` | `DCG_PLUGIN_TOOLS` | `bash` | Tool names to check, case-insensitive — a JSON array in config, comma-separated in the environment. Only tools whose arguments carry a `command` string can be checked — a listed tool without one passes through unchecked |
| `binary` | `DCG_PLUGIN_BINARY` | `dcg` | Binary name to resolve on `PATH`, or an absolute path |

An unusable value is reported at startup and ignored, leaving the layer beneath
it standing — a `failMode: "close"` typo will not quietly leave you fail-open.

```bash
export DCG_PLUGIN_FAIL_MODE=closed   # block whenever dcg cannot answer
export DCG_PLUGIN_TIMEOUT_MS=3000
# bash is the only built-in tool with a `command` argument; widen this only for
# a custom or MCP tool that also takes one.
export DCG_PLUGIN_TOOLS=bash,my-shell-tool
```

## How it works

```
agent calls a shell tool
        │
        ▼
  tool.execute.before          read output.args.command
        │
        ▼
  dcg --robot test -- <cmd>    spawned without a shell; parse JSON stdout
        │
   ┌────┴─────┐
   ▼          ▼
allow/log   deny/ask/warn
   │              │
   │              ▼
   │        throw → tool call aborted, dcg's reason shown to the agent
   ▼
command runs
```

Three decisions worth knowing about:

- **`ask` and `warn` block.** There is no interactive operator inside a plugin
  hook to answer an `ask`, which is dcg's own "fails closed on unsupported
  clients" case; and a warning an agent is free to ignore is not a guard.
- **The exit code never decides.** dcg exits non-zero on a deny *and* on a
  usage error, so only the `decision` field in its JSON is trusted. Output that
  cannot be read is a failure, resolved by `DCG_PLUGIN_FAIL_MODE` — never an
  accidental allow.
- **A missing binary is detected on first use, not by a probe at startup.** An
  init probe races the first tool calls, and whichever commands arrive before it
  resolves would go unchecked.

The command is passed to dcg as a single argument vector element with no shell
involved, so quoting, `$(…)`, backticks and newlines in the candidate command
are inert.

## Development

```bash
npm ci --ignore-scripts
npm run build   # tsc --noEmit
npm test        # typecheck + node --test
```

The suite stubs the spawn, so it runs without dcg installed. With dcg on
`PATH`, `test/integration.test.ts` additionally exercises the real binary — the
only check that catches dcg changing its robot-mode contract.

## Acknowledgements

Prior art for the opencode↔dcg integration pattern:
[jms830/opencode-dcg-plugin](https://github.com/jms830/opencode-dcg-plugin),
[Bouska/opencode-dcg-plugin](https://github.com/Bouska/opencode-dcg-plugin),
and [Alex Mikhalev's gist](https://gist.github.com/AlexMikhalev/bc7cc0f237bdb2a6fade347aba203acb).
The environment variable names match Bouska's so an existing setup carries over
unchanged.

## License

MIT
