# Muse Bridge for OpenCode

Use your Muse Code subscription inside [opencode](https://opencode.ai). Muse
appears as the `muse` provider; every request runs through the signed-in `muse`
CLI.

[![npm version](https://img.shields.io/npm/v/@jonathand34/opencode-plugin-muse?label=npm)](https://www.npmjs.com/package/@jonathand34/opencode-plugin-muse)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jond34/opencode-plugin-muse/blob/main/LICENSE)
![tested pair](https://img.shields.io/badge/tested-opencode%202.4.1%20%C2%B7%20muse%201.4.25-lightgrey)

## Install

```bash
muse login
opencode plugin add @jonathand34/opencode-plugin-muse@1.2.0
```

Restart opencode and pick a Muse model:

```bash
opencode run -m muse/muse-ember-1.0 "hello"
```

Or pin it in `opencode.jsonc`:

```jsonc
{ "plugins": ["@jonathand34/opencode-plugin-muse@1.2.0"] }
```

Needs opencode 2.x and Muse Code CLI 1.4.25 or newer, already logged in. If the
installer fails with `NpmInstallFailedError`, install the package and point a
plugin file at it:

```js
// ~/.config/opencode/plugins/muse.js
export { default } from "@jonathand34/opencode-plugin-muse";
```

Unofficial: not affiliated with, endorsed by, or supported by Meta or opencode.
MIT.

![opencode's model picker filtered to Muse Ember, then a turn that reads notes.md, runs ./count.sh through opencode's shell tool, and answers "notes.md has 7 lines"](https://raw.githubusercontent.com/jond34/opencode-plugin-muse/main/media/muse-bridge-demo.gif)

## What you don't get

opencode owns the loop, tools, permissions, transcript, and history; Muse
supplies inference. A setting opencode would send to another provider but Muse's
protocol has no field for is not forwarded. Nothing is silently approximated.

| Setting | What happens |
|---|---|
| `temperature`, `topP`, `topK`, penalties, `seed`, `stop` | Not settable: Muse's protocol has no such field, and opencode 2.x has no surface that delivers one to a plugin provider. |
| `provider.<id>.options.timeout` | opencode enforces it above the provider, so it never reaches the plugin. Use the watchdog variables below instead. |
| `maxOutputTokens` | Not forwarded. The host fits its own output. |
| Titles | Answered locally by the plugin; no Muse turn is spent. |
| Model catalog | A snapshot taken at startup. A newly entitled model appears after a restart. |
| Accounts | One signed-in identity per host. Switching means `muse logout`, a fresh login, and an opencode restart. |
| Attachments | Images only. No PDF or text-file surface. |
| Offline | None. A turn needs a live host and the vendor. |
| Windows | Best-effort. The offline suite passes, but the shutdown ladder has no graceful rung and the vendor's sandbox may ask for UAC consent at startup. |

## Options

`sessionLog` is the one option. It keeps Muse's native transcript and is on by
default, so leaving it out changes nothing.

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "@jonathand34/opencode-plugin-muse@1.2.0",
      "options": { "sessionLog": true }
    }
  ]
}
```

`false` passes `--no-session-log`, which removes warm resume: every turn reseeds
from the full prompt. On a two-turn recall the second turn took 1,456 input
tokens with the log and 10,770 without, and the gap grows with history. A project
config entry naming this package replaces the global entry wholesale, so
`MUSE_HOST_SESSION_LOG=0` is the override a repo file cannot erase. An
unparseable value is ignored with a warning.

## How it works

- opencode executes every tool call and keeps the permissions, transcript, and
  history. Muse is a `LanguageModelV3` provider, not an agent.
- The plugin spawns `muse serve` over stdio and talks MSP to it. No Muse
  credential leaves the CLI: the API key opencode sees is a placeholder that is
  never sent to Muse.
- A loopback-only MCP server (`127.0.0.1`, random port, per-start bearer token)
  carries opencode's tools to Muse. Muse's own tools, workflows, subagents,
  observer reminders, and skill catalog are off, and its toolset is pinned to
  `mcp__opencode__*`, so spawning belongs to opencode.
- Contributor mode is off on every run (`--contributor-mode off`), so no request
  this plugin sends is a contributor request. That flag is a per-run override: it
  does not change the saved switch, `contributor_mode_enabled` in
  `~/.config/muse/settings.json`, and Muse saves that switch per computer. Muse
  defaults a subscription to Contributor mode, which trades more usage for
  training on your content, and that default covers every model.
- At an agent's step limit the plugin closes the running turn and delivers
  opencode's text-only instruction as a turn of its own, so the cap produces a
  summary instead of a refused tool call.
- Reasoning effort maps from opencode's model variants. `museAgent` and
  `museInstructions` become session developer instructions.

The MSP host is handed a private config directory, so these choices are per
plugin run and do not touch your Muse config.

## Safety

opencode's base policy allows everything except `.env` reads, and every agent
starts there. A fresh install therefore stops nothing a bridged call might do.
Two mechanisms stop it, and they are not interchangeable.

`policies` is the recommended one: binary, never prompts, applied after agent
rules and saved approvals.

```jsonc
// opencode.jsonc
{
  "policies": [
    { "action": "tool.use", "resource": "shell:*", "effect": "deny" }
  ]
}
```

A denied call fails with `Blocked by configuration policy`, the model receives it
as a tool error, and the turn continues. Expect a refusal the model can route
around, not a wall, and not a content boundary: `grep` can read what `read` was
refused.

`permissions` is the per-agent form, ordered with last match winning, and can
`ask`. An `ask` rule is a prompt only when a person is attached; unattended turns
settle it as a deny. To make a session unable to write, put the rules at the top
level, where a deny removes the tool from the model's list:

```jsonc
{
  "permissions": [
    { "action": "edit",  "resource": "*", "effect": "deny" },
    { "action": "shell", "resource": "*", "effect": "deny" }
  ]
}
```

Use the tool's own action name (`edit`, `shell`, `read`), not the bridged
`<server>_<tool>` form: a bridged call executes as opencode's own tool.
Measured on 2026-11-26: `{"action":"opencode_bash",...}` did not stop a shell
write, while `{"action":"shell",...}` did. A per-agent ruleset alone is not
enough if the agent can spawn a subagent, since the child inherits the default
agent's rules; add a `subagent` deny to that agent.

Two containment caveats. First, the plugin grants workspace trust because the
bridge does not start without it, so a repo's `.muse/hooks.json` commands and
project skills can load outside opencode's permissions, and
`.agents/memory/MEMORY.md` can enter the prompt in an untrusted workspace.
Repo-supplied hooks are refused at session open unless their hash is recorded
with `bun run doctor --trust-hooks`; `MUSE_ALLOW_PROJECT_HOOKS=1` accepts one for
a run. Second, the plugin pins no permission profile and cannot read the posture
its own session runs under; no stable MSP method exposes that state to a client.

The measured posture is in [docs/approval.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/approval.md).

## Native history

`MUSE_NATIVE_HISTORY=1` lets the compaction hook return a native replacement
window, so the next turn continues the same Muse session instead of reseeding.
It is off by default and stays opt-in: no value has been measured in the unit the
subscription bills.

The split is deliberate. opencode owns session ids, forks, rewinds, and the
compaction decision; Muse owns the native inference transcript between
compactions. The native session is a cache, and the digest is both the portable
fallback and the summary, so a model switch, a dropped window, or a refused
resume still has the facts. A dropped native session costs a reseed, not the
conversation. Evidence: [docs/native-history-evidence.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/native-history-evidence.md).

## Environment

Read at startup, so a change takes effect on the next opencode start.

| Variable | Default | Effect |
|---|---|---|
| `MUSE_BIN` | `muse` | CLI the plugin spawns |
| `MUSE_PRESET` | private config dir | preset the host runs with |
| `MUSE_CONTAINMENT` | `warn` | `strict` refuses to start on a critical containment failure; `off` skips the checks |
| `MUSE_CONTRIBUTOR_MODE` | off | `1`, `true`, or `on` restores Muse's contributor routing |
| `MUSE_NATIVE_HISTORY` | off | same values; installs native compaction windows |
| `MUSE_STRICT_HOST` | off | `1` refuses a host whose schema drifted, including a newer CLI |
| `MUSE_PROBE_PROMPT` | off | `1` probes developer-prompt delivery at startup |
| `MUSE_CONTEXT_LIMIT` | model field, then 128k | overrides the model's context limit |
| `MUSE_OUTPUT_LIMIT` | model field, then 8,192 | overrides the model's output limit |
| `MUSE_SESSIONS_ROOT` | host home | where the containment report reads the host's toolset record |
| `MUSE_DEBUG_CONTAINMENT` | off | `1` prints the containment report at startup |
| `MUSE_ALLOW_PROJECT_HOOKS` | off | `1` runs the repo's `.muse/hooks.json` handlers for this run |
| `MUSE_FIRST_BYTE_TIMEOUT_MS` | `900000` | how long a turn may go without a first frame; `0` disables |
| `MUSE_IDLE_TIMEOUT_MS` | `180000` | silence after frames start; suspended while a bridged call is in flight; `0` disables |
| `MUSE_IDLE_WARN_MS` | `90000` | silence before a warning is logged; `0` disables |
| `MUSE_TOOL_CEILING_MS` | `0` (off) | longest one bridged tool call may run before the host is ended |
| `MUSE_RETRY_CAP_MS` | `600000` | most a provider retry may extend the idle clock |
| `MUSE_ALLOWANCE_WARN_PERCENT` | `90` | warn once per allowance window at or above this percentage; `0` disables |
| `MUSE_HOST_SESSION_LOG` | on | `0`, `false`, or `off` passes `--no-session-log`; wins over `options.sessionLog` |

`NODE_EXTRA_CA_CERTS` is inherited by the host child process, so a corporate CA
works when set for opencode.

## Troubleshooting

- **No models.** The CLI is missing or signed out; the log says
  `model discovery failed` with the reason.
- **The plugin seems not to load.** Two entries for one package is a trap:
  opencode loads one instance per package name and the first wins, so a global
  install can shadow a checkout while the log still prints `loading plugin`.
  Drop one entry, or point `XDG_CONFIG_HOME` at a config that lists only the one
  you want.
- **Headless runs.** `opencode run` needs one entry for this package and
  `steps` above 1 if the turn has anything to do. `steps` is opencode's own
  per-agent ceiling, unset by default and enforced in its prompt loop; one step
  is one model request, so N tool calls need N+1 steps.
- **A turn stops responding.** A host that goes silent is ended, not waited on:
  900 s without a first frame or 180 s of silence fails the turn, interrupts the
  host, and the next turn resumes the same native session. A warning is logged
  after 90 s. Each budget is tunable and `0` disables it.
- **A denial did nothing.** A policy statement that fails validation is dropped,
  not rejected, so check the log after editing one and prove a deny by its
  effect. `bun run doctor` reports each dropped statement by pointer and action.

## Development

```bash
npm run build            # compile
npm run check:offline    # typecheck plus the offline suite
bun run doctor           # versions, host, hooks, policies, ledger
bash scripts/repro.sh    # rebuild and compare against the recorded hash
```

`bun test` adds the live suites, which spawn a real `muse serve` host and need a
logged-in CLI. The reproducible build and publish gates are in
[docs/release.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/release.md).

## Credit

MIT throughout. The base is
[`@rasyid_rafi/opencode-muse`](https://www.npmjs.com/package/@rasyid_rafi/opencode-muse)
0.1.9; [CREDITS.md](https://github.com/jond34/opencode-plugin-muse/blob/main/CREDITS.md)
records the base commit, each diff, and why the differences live in
a separate package. The effort handling follows
[pgquiles/opencode-muse](https://github.com/pgquiles/opencode-muse); the session
protocol is [muse-code-sdk](https://github.com/meta-models/muse-code-sdk).

Best-effort maintenance by one person, no support commitment. The plugin never
holds Muse credentials and writes one file of its own, the token ledger
(`usage-*.jsonl` under `$XDG_STATE_HOME/opencode-muse`, mode 0600, counts only —
no prompt text, tool output, or file contents). No telemetry.

## Licence

MIT, same as upstream. See `LICENSE` and [CREDITS.md](https://github.com/jond34/opencode-plugin-muse/blob/main/CREDITS.md).
