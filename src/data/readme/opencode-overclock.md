# opencode-overclock

Power-ups for [opencode](https://opencode.ai): background tasks, cron-style scheduling,
sandboxed bash, quality-gate hooks, cost telemetry, checkpoints — and an ASCII pet.

Everything is a separate module you can turn off individually, so you can take one feature and
ignore the rest. When opencode ships a native equivalent, the matching module goes away.

```sh
opencode plugin opencode-overclock       # this project
opencode plugin -g opencode-overclock    # every project
```

## What you get

| Module        | What it does                                                                                                                                          | Tools it adds                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `tasks`       | Run shell commands in the background. The agent gets the result posted back into the session when they finish, and a nudge if one blocks on a prompt. | `task_run` `task_status` `task_output` `task_kill`         |
| `sched`       | Recurring prompts on a cron expression or an interval (`"5m"`). Survives restarts; an interval on the current session makes a loop.                   | `schedule_create` `schedule_list` `schedule_delete`        |
| `guard`       | Your own quality gates: run a command after the agent edits files, and feed failures back to it once the session goes idle.                           | —                                                          |
| `usage`       | Per-day and per-session cost and token totals, collected from the event bus.                                                                          | `usage_report`                                             |
| `checkpoints` | Rewind a session to any earlier message, files included, on top of opencode's own snapshots. Reverting asks for permission first.                     | `checkpoint_list` `checkpoint_revert` `checkpoint_restore` |
| `sandbox`     | Wrap every bash call in bwrap: read-only `/`, writable project and `/tmp`, network off by default. Off unless you enable it.                          | `bash_unsandboxed` (escape hatch)                          |
| `buddy`       | An ASCII pet next to the prompt that reacts to what the session is doing. Purely cosmetic.                                                            | —                                                          |

On top of the tools, the TUI side adds desktop notifications when a turn finishes or the agent
needs you, plus `/oc-tasks`, `/oc-usage`, `/oc-schedules` and `/oc-buddy`.

**Please read this before installing:** overclock gives the agent the ability to run shell
commands in the background (`task_run`) and to schedule recurring prompts (`schedule_create`).
That is the point of the plugin, but it is worth an explicit yes rather than a surprise. It
tells you what it enabled on a project's first run. The tool definitions cost roughly 800
tokens of context.

## Install

The command at the top of this page is the reliable way to install, because one package ships
**two** surfaces that register in two different config files:

```jsonc
// opencode.json  -> server surface: the tools and hooks
{ "plugin": ["opencode-overclock"] }
// tui.json       -> TUI surface: notifications, slash commands, the buddy
{ "plugin": ["opencode-overclock"] }
```

Adding only the `opencode.json` entry by hand is the most common mistake: the tools work and
the notifications silently never load.

Requires **opencode >= 1.18.4**. That floor comes from the buddy sprite, which renders against
the `@opentui/solid` version opencode bundles from 1.18.4 onward. If you don't care about the
buddy, the server surface alone works back to 1.15.11 — the first release where opencode calls
a plugin's `dispose` hook, without which this plugin's timers and watchers are never cleaned up.

## Configuration

Everything is optional. With no config file you get every module except `sandbox`, and `guard`
sits inert until you give it hooks — so the one thing worth configuring on day one is a quality
gate. A reasonable `.opencode/overclock.json` to start from:

```json
{
  "features": {
    "guard": {
      "hooks": [
        {
          "name": "typecheck",
          "tools": ["edit", "write"],
          "run": "npm run typecheck",
          "pathFilter": "src/**/*.ts"
        }
      ]
    },
    "tasks": { "killOnExit": true }
  }
}
```

That gives you a typecheck after every edit (reported back to the agent when the session goes
idle), background tasks that don't outlive the session, plus scheduling, telemetry, checkpoints
and the buddy on their defaults. Swap `run` for whatever your project uses.

Each entry is `true`, `false`, or an object of options (which also means "on"). To turn
something off:

```json
{ "features": { "buddy": false } }
```

| Module                          | Options                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `tasks`                         | `killOnExit` bool · `stallDetection` bool · `stallThresholdMs` num · `stallCheckIntervalMs` num |
| `sched`                         | `skipIfBusy` bool                                                                               |
| `sandbox`                       | `net` bool                                                                                      |
| `guard`                         | `hooks` array                                                                                   |
| `usage`, `checkpoints`, `buddy` | —                                                                                               |

Typos are reported at startup with a "did you mean", because a misspelled key like
`killOnExist` would otherwise read as "not set" and quietly run the default. A bad config never
takes the plugin down; the affected setting falls back to its default.

### Quality gate options (`guard`)

Each hook runs a command after the agent uses one of the tools it watches, and reports failures
back to the agent. `name`, `tools` and `run` are required. Also available: `pathFilter` (glob), `mode` (`inject`,
the default, waits for the session to be idle before reporting; `append` reports immediately),
`debounceMs` (2000), `timeoutMs` (60000), `onSuccess` (`silent` or `notify`), and `maxDeferMs`
(300000, how long `inject` waits for an idle session before reporting anyway).

### Restricting tool names

If your setup only accepts certain tool names, list them in `toolAllowlist`. Any tool whose
name isn't permitted is withheld from the model rather than offered and refused, since a single
unrecognised name can fail an entire request.

```json
{
  "toolAllowlist": ["TaskCreate", "TaskList", "TaskOutput", "TaskStop", "MyExtraTool"],
  "toolNames": { "task_run": "TaskCreate", "task_status": "TaskList" }
}
```

`toolNames` maps this plugin's tools onto names you allow. Keys are declared names (the table
under [What you get](#what-you-get)); values are what the model sees.

Startup tells you exactly where you stand: what was renamed, what was withheld and which of
your allowed names are still free to use for it, and any name that collides with an opencode
built-in (`bash`, `task`, …) or differs from one only by capitalisation — the first replaces
that built-in, the second reads as a duplicate to anything matching case-insensitively.
Descriptions mentioning a renamed tool are rewritten too, so the agent never gets instructions
naming a tool it wasn't given. Permission ids keep their declared names, so existing permission
config still applies.

#### Named lists

`toolAllowlist` entries can also name a bundled list, which expands to every name it permits.
Mix and match freely — `["claude-code", "MyExtraTool"]` is a bundled list plus one of your own.

`claude-code` is the tool set Claude Code registers. opencode's ids are snake_case and Claude
Code's are PascalCase, so the two vocabularies don't overlap and these names are free to use.
A bundled list also supplies default names for tools where it contains the same operation:

| Module  | Declared          | Sent as      |
| ------- | ----------------- | ------------ |
| `tasks` | `task_run`        | `TaskCreate` |
| `tasks` | `task_status`     | `TaskList`   |
| `tasks` | `task_output`     | `TaskOutput` |
| `tasks` | `task_kill`       | `TaskStop`   |
| `sched` | `schedule_create` | `CronCreate` |
| `sched` | `schedule_list`   | `CronList`   |
| `sched` | `schedule_delete` | `CronDelete` |

That's the whole table, and it stops there on purpose. Nothing in the `claude-code` set means
"revert a session checkpoint" or "report token spend", so `checkpoints`, `usage` and
`bash_unsandboxed` get no default name: handing them an unrelated one would tell the model the
wrong thing about what they do. They're withheld until you choose a name yourself, and startup
says which names are free:

```json
{
  "toolAllowlist": "claude-code",
  "toolNames": { "usage_report": "StructuredOutput" }
}
```

`toolNames` overrides any row above too, if a different name reads better for you. The table is
checked against the source by a test, so the two can't drift apart.

## Notes on the TUI surface

The TUI plugin sends a desktop notification (with sound) when a turn completes or the agent
needs permission, asks a question, or errors — each individually switchable through plugin
options. Its slash commands read the state files under `.opencode/overclock/`, so they work
without going through the model.

The buddy hatches once per install with a random species, rarity and name, persists in the
TUI's key-value store, hides itself below 100 columns, and needs `@opentui/solid` resolvable at
runtime. If it isn't, the buddy quietly sits out and the rest of the TUI plugin still loads.

## Contributing

```
src/
  index.ts          entry: load config, init modules, merge hooks
  tui.ts            TUI plugin (notifications + slash commands), separate export
  types.ts          FeatureModule contract
  config.ts         config loader
  merge.ts          hook composition (many modules, same hook -> sequential)
  tools.ts          gateway tool policy: alias presets, allowlists, rename/withhold
  validate.ts       overclock.json checks + startup summary
  lib/              state dir + json, session inject + toast
  features/         one file per module + registry
test/               bun test
```

Adding a feature:

1. Write `src/features/<name>.ts` exporting a `FeatureModule`.
2. Register it in `src/features/index.ts`.
3. If it adds tools, add each one to the `claude-code` table in `src/tools.ts`. A test fails
   otherwise, since an unmapped tool is invisible behind a whitelisting gateway.

Background reading:
[docs/opencode-plugin-surface.md](docs/opencode-plugin-surface.md) maps opencode's
plugin/hook/event surface and tracks upstream drift.

```sh
bun install
bun test          # unit
bun run check     # typecheck + format check
bun run format
bun run verify    # packaging: tarball contents, server+tui targets, manifest metadata
```

### Release

```sh
bun run check && bun test && bun run verify
npm publish
bun run verify:published    # runtime load, by name, from the registry
```

`verify` can't exercise the runtime load path: opencode resolves `plugin` entries by npm name
from the registry, and a miss is silent. `verify:published` is the only check that proves an
installed-from-npm session actually gets the tools, so run it after every publish.

### Working on it locally

`.opencode/plugins/dev.ts` re-exports `src/index.ts` and `dev-tui.ts` re-exports `src/tui.ts`,
so an opencode session in this repo runs both surfaces from source. Note that only this
auto-loaded directory accepts a path — `plugin` array entries resolve by npm name from the
registry, and an unpublished name fails silently.

1. Run `opencode` here. The plugin is live.
2. Edit `src/`. There's no hot reload, so restart opencode.
3. Inspect state under `.opencode/overclock/` (gitignored).

Gotcha: if `~/.config/opencode/tui.json` also loads `opencode-overclock` from npm, that copy
wins the `overclock-tui` id and your local dev TUI plugin (along with any unpublished feature)
silently never loads. Remove the global entry while developing, or point `XDG_CONFIG_HOME`
somewhere else.

### Headless end-to-end

```sh
timeout 90 opencode run -m anthropic/claude-sonnet-5 "Use task_run to run 'echo hi' ..." < /dev/null
```

- `< /dev/null` is required; an open stdin hangs.
- A dev build can hang on exit after the work is done, so wrap it in `timeout` and judge by
  artifacts (`.opencode/overclock/`, log tails) rather than the exit code.
- Plugin stderr goes to `opencode run --print-logs` or `~/.local/share/opencode/log/`. Grep for
  `[overclock]`.

## License

MIT
