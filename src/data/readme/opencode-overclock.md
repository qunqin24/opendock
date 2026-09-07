# opencode-overclock

The modular workflow suite and power-ups for [opencode](https://opencode.ai): background
tasks, cron-style scheduling, quality-gate hooks, cost telemetry — and an ASCII companion.

Everything is a separate module you can turn off individually, so you can take one feature and
ignore the rest. When opencode ships a native equivalent, the matching module goes away.

```sh
opencode plugin opencode-overclock       # this project
opencode plugin -g opencode-overclock    # every project
```

## What you get

| Module      | What it does                                                                                                                                                  | Tools it adds                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `tasks`     | Run shell commands in the background. The agent gets the result posted back into the session when they finish, and a nudge if one blocks on a prompt.         | `task_run` `task_status` `task_output` `task_kill`  |
| `sched`     | Recurring prompts on a cron expression or an interval (`"5m"`). Survives restarts; an interval on the current session makes a loop.                           | `schedule_create` `schedule_list` `schedule_delete` |
| `guard`     | Your own quality gates: run a command after the agent edits files, and feed failures back to it once the session goes idle. Built-in recipes & edit recovery. | —                                                   |
| `recovery`  | Automatically heal provider errors (missing tool results, thinking block sequencing, context limit) and auto-resume sessions.                                 | —                                                   |
| `truncator` | Context-protecting smart output truncation for high-volume tools (`task_output`, `bash`, `grep`, `glob`, `webfetch`) preserving header & tail diagnostics.    | —                                                   |
| `usage`     | Per-day and per-session cost and token totals, collected from the event bus (accessible via TUI `/oc-usage`).                                                 | —                                                   |
| `buddy`     | An ASCII pet next to the prompt that reacts to what the session is doing. Purely cosmetic.                                                                    | —                                                   |

On top of the tools, the TUI side adds desktop notifications when a turn finishes or the agent
needs you, plus `/oc-tasks`, `/oc-usage`, `/oc-schedules`, `/oc-buddy` (pet), `/oc-buddy-switch` (choose species), and `/oc-buddy-cycle` (next species).

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

Everything is optional. With no options configured, overclock runs with sensible defaults: background
tasks, cron-style scheduling, quality gates, usage telemetry, and the buddy are active immediately.

Configure options directly in your project or global `opencode.json`:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "tasks": { "killOnExit": true },
        "guard": { "auto": true },
      },
    ],
  ],
}
```

To turn an individual feature off:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "buddy": false,
      },
    ],
  ],
}
```

| Module           | Options                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `tasks`          | `killOnExit` bool · `stallDetection` bool · `stallThresholdMs` num · `stallCheckIntervalMs` num · `tmux` bool    |
| `sched`          | `skipIfBusy` bool                                                                                                |
| `guard`          | `hooks` array · `recipes` array (`["tsc", "eslint", "cargo", "ruff", "go"]`) · `auto` bool · `editRecovery` bool |
| `recovery`       | `maxAttempts` num · `cooldownMs` num · `autoResume` bool                                                         |
| `truncator`      | `maxChars` num · `tools` array · `headLines` num · `tailLines` num                                               |
| `usage`, `buddy` | —                                                                                                                |

### Quality gates (`guard`)

Quality gates let you define automated feedback loops. Whenever the agent modifies code with `edit`
or `write`, the guard runs your project's verification command in the background. If the command fails,
the error output is automatically fed back into the session once the agent finishes its turn, prompting
it to self-correct.

Because verification commands vary by language and repository, configure hooks in your project's
local `opencode.json`:

#### Stack recipes

##### TypeScript / JavaScript

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "typecheck",
        "tools": ["edit", "write"],
        "pathFilter": "src/**/*.ts",
        "run": "npm run typecheck",
      },
    ],
  },
}
```

##### Python (Ruff / Pytest)

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "lint",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.py",
        "run": "ruff check .",
      },
    ],
  },
}
```

##### Rust (Cargo)

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "cargo-check",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.rs",
        "run": "cargo check",
      },
    ],
  },
}
```

##### Go

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "go-test",
        "tools": ["edit", "write"],
        "pathFilter": "**/*.go",
        "run": "go test ./...",
      },
    ],
  },
}
```

##### Generic / Make

```jsonc
{
  "guard": {
    "hooks": [
      {
        "name": "check",
        "tools": ["edit", "write"],
        "run": "make check",
      },
    ],
  },
}
```

#### Hook options

| Field        | Default     | Description                                                                   |
| ------------ | ----------- | ----------------------------------------------------------------------------- |
| `name`       | _required_  | Identifier displayed in failure reports                                       |
| `tools`      | _required_  | Tools to trigger on, e.g. `["edit", "write"]`                                 |
| `run`        | _required_  | Shell command to execute (receives `$GUARD_TOOL` and `$GUARD_FILE` in env)    |
| `pathFilter` | `undefined` | Optional glob pattern to limit triggers to relevant files (e.g. `**/*.py`)    |
| `mode`       | `"inject"`  | `"inject"` waits for the session to go idle; `"append"` reports immediately   |
| `debounceMs` | `2000`      | Debounce duration for rapid successive edits                                  |
| `timeoutMs`  | `60000`     | Execution timeout before killing the command                                  |
| `maxDeferMs` | `300000`    | Maximum time `"inject"` will wait for an idle session before reporting anyway |
| `onSuccess`  | `"silent"`  | `"silent"` or `"notify"`                                                      |

### Restricting and remapping tool names

If your setup only accepts certain tool names, list them in `toolAllowlist`. Any tool whose
name isn't permitted is withheld from the model rather than offered and refused:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "toolAllowlist": ["task_run", "task_status", "schedule_create"],
      },
    ],
  ],
}
```

`toolNames` maps this plugin's tools onto custom names you want the model to see:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "toolNames": { "task_run": "run_background_task" },
      },
    ],
  ],
}
```

### Running OpenCode V2 plugins on OpenCode V1

OpenCode V1 distributions cannot natively load V2 plugins (which export `{ id, setup }` or `{ id, effect }` instead of a server function). Overclock provides an embedded V2 host engine that runs V2 plugins side-by-side with V1 tools:

```jsonc
{
  "plugin": [
    [
      "opencode-overclock",
      {
        "plugins": ["./plugins/custom-agent.ts", ["opencode-plugin-review", { "strict": true }]],
      },
    ],
  ],
}
```

Overclock synthesizes a spec-compliant `PluginContext`, adapting V2 domain transforms (`agent`, `command`, `catalog`, `reference`, `skill`, `aisdk`) to live V1 config and chat hooks while keeping all V1 power tools active.

Startup tells you what was renamed, what was withheld, and warns on collisions with opencode
built-in tools. Descriptions mentioning a renamed tool are rewritten automatically.

## Notes on the TUI surface

The TUI plugin sends a desktop notification (with sound) when a turn completes or the agent
needs permission, asks a question, or errors — each individually switchable through plugin
options (`notifyIdle`, `notifyPermission`, `notifyQuestion`, `notifyError`, `buddy` in `tui.json`).
Its slash commands read the state files under `.opencode/overclock/`, so they work
without going through the model.

The buddy hatches once per install with a random species, rarity and name, persists in the
TUI's key-value store, hides itself below 100 columns, and needs `@opentui/solid` resolvable at
runtime. If it isn't, the buddy quietly sits out and the rest of the TUI plugin still loads.
Switch buddy on demand via `/oc-buddy-switch` (opens an interactive species picker or rolls a fresh companion)
or `/oc-buddy-cycle` (advances directly to the next species in rotation).

## Contributing

```
src/
  index.ts          entry: init enabled modules, merge hooks, hybrid V1/V2 export
  tui.ts            TUI plugin (notifications + slash commands), separate export
  core/             types, lifecycle/hook merging, tool policy, capability summary, bridge
  platform/         host adapters: process (exec/tmux), session (busy/inject/notify), storage (state/store), probe
  buddy/            ASCII companion state, sprites, and TUI slot integration
  v2/               embedded V2 plugin host, synthetic context, and dynamic loader
  features/         feature modules (tasks, sched, guard, recovery, truncator, usage, buddy)
test/               bun test
```

Adding a feature:

1. Write `src/features/<name>.ts` exporting a `FeatureModule`.
2. Register it in `src/features/index.ts`.

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
timeout 90 opencode run -m <provider>/<model> "Use task_run to run 'echo hi' ..." < /dev/null
```

- `< /dev/null` is required; an open stdin hangs.
- A dev build can hang on exit after the work is done, so wrap it in `timeout` and judge by
  artifacts (`.opencode/overclock/`, log tails) rather than the exit code.
- Plugin stderr goes to `opencode run --print-logs` or `~/.local/share/opencode/log/`. Grep for
  `[overclock]`.

## License

MIT
