# Progress Tool — live task trees for OpenCode (TUI + desktop/web)

<img src="https://raw.githubusercontent.com/jakedowns/progress-tool/master/screenshots/1.png" width="300" alt="Progress pill showing a live task tree">
<img src="https://raw.githubusercontent.com/jakedowns/progress-tool/master/screenshots/subagents.png" width="300" alt="Progress pill showing subagent rows">

A non-blocking twin of `question` so coding agents can signal long-running work
without looking dead, plus a **zero-token-burn out-of-band relay** so the agent
never has to poll `stdout` just to keep the UI alive. Token cost scales with
milestones, not with task duration.

Two MCP tools back this: `progress` (write) and `list` (read-only companion:
your session's trees as text, with dismissed entries hidden). **The tree is the
glance-able layer above the transcript** — thought traces and command output are
a wall of text; the rollup is the live view of what is happening, what is
blocked, and what is next.

Implements the [Agent Progress Tool proposal](https://gist.github.com/jakedowns/ddc4eb4817184a074c82c61dc6e7228c)
for OpenCode 2, and is written as a portable reference implementation any
harness can copy or adapt.

**Versions:** MCP server `2.10.1` · OpenCode plugin `2.18.7`

> **Advanced docs:** [schema, relay internals, state store, architecture, all
> options, file map →](./README-advanced.md)

---

## Install from npm

- Plugin — [`@jakedowns/progress-tool-opencode-plugin`](https://www.npmjs.com/package/@jakedowns/progress-tool-opencode-plugin)
- MCP server + relay — [`@jakedowns/progress-tool-mcp`](https://www.npmjs.com/package/@jakedowns/progress-tool-mcp)

```bash
opencode plugin add @jakedowns/progress-tool-opencode-plugin@latest
```

`@latest` makes OpenCode check for and install new versions automatically
(startup and every 24h). Use `@^2.18` instead for automatic updates capped to
major 2; a bare package name stays on the installed version until you run
`opencode plugin update`.

The plugin depends on the MCP package and **registers `progress-server` for
you** (`autoRegisterMcp: false` to opt out), so that one command is the whole
install. It spawns the server with a detected `node`/`bun` runtime — never
`process.execPath`, which is the `opencode` binary under Desktop. Pin one with
`{ "options": { "mcpRuntime": "/absolute/path/to/node" } }` if needed.

Restart the service or reload the window. The pill appears above the composer,
and `progress`, `list`, `progress-relay`, and `progress-emit` become available.

> If the MCP server fails to start, the plugin withholds its injected progress
> rules and strict-mode nudges until the `progress` tool actually appears in the
> model's tool set, so agents are never told to call a missing tool.

Manual configuration, if you prefer:

```jsonc
{
  "plugins": ["@jakedowns/progress-tool-opencode-plugin@latest"],
  "mcp": {
    "servers": {
      "progress-server": {
        "type": "local",
        "command": ["npx", "-y", "@jakedowns/progress-tool-mcp"]
      }
    }
  }
}
```

**No `AGENTS.md` edits required.** The plugin injects the progress and relay
rules into every session's system instructions, and the `progress` tool response
reinforces them at the moment work starts. Disable with
`{ "options": { "injectInstructions": false } }`.

Skills: `progress-tool` and `delegation` register automatically. The two demo
skills ship in `optional-skills/` and stay off unless you set
`{ "options": { "demoSkills": true } }`. Disable the default pair with
`{ "options": { "registerSkills": false } }`.

Want a demo now? Ask the agent to **"demo OSC 9;4 support"** or **"demo the task
tree"**, or run `bash demo/tree-demo.sh` (`PROGRESS_TREE_DEMO_FAIL=1` shows the
error roll-up).

---

## Quick start

Agents call `progress` at milestones:

```js
progress({
  id: "build-1",
  status: "running",
  title: "Running npm build",
  detail: "Starting",
  progress: 0
})
```

The response includes the exact relay command. Wrap the long command once and
the OS streams the output — no model polling:

```bash
progress-relay --id build-1 --title "Running npm build" -- npm run build
```

Exit `0` marks it `done`; non-zero marks it `error` with the code in `detail`.
Nesting a task is just `parentId`:

```js
progress({ id: "link-lib", status: "running", title: "Linking libSDL2.a", parentId: "build-1" })
```

Multi-line titles and details accept real newlines, `\n` / `\r\n`, or `<br>`.

---

## What the views do

- **Desktop/web pill:** one row per root, with `(N · agg%)` when several roots
  exist, hover details, and a menu with the full tree.
- **TUI:** compact tree above the composer, roots collapsed, capped at
  `tuiMaxRows` (default 8) so long lists never push the prompt away. `/progress`
  opens a dialog to expand a tree or dismiss tasks.
- Running and waiting tasks stay visible; errors stay until dismissed or
  updated; completed tasks stay unless dismissed (or `autoHideDone` is on).
- Dismissal is view-plane, not a status change: a dismissed tree stays hidden
  through relay telemetry and sibling activity. An **agent update clears the
  dismissal** on that entry and its ancestors — except a terminal dismissal
  (dismissed while done/error), which later done/error re-reports do not revive;
  a restart or a child failure does.
- **Subagents:** child sessions are mapped to their parent automatically
  (`session.created` → `~/.opencode-progress-sessions.json`), and the parent id
  is stamped into subagent prompts as a fallback. Roots created by a child
  render as `[Subagent (Explore)]: Title`.
- Entries are retained by default so the store doubles as a report. Opt into
  pruning with `PROGRESS_AUTO_PRUNE_S` (and `PROGRESS_STALE_MS` for orphans).

### Common options

| Option | Meaning |
|---|---|
| `scope` | `"session"` (default) or `"all"` |
| `tuiMaxRows` | TUI tree row cap (default 8, max 50) |
| `expandRootsByDefault` | Expand trees by default (default collapsed) |
| `strictMode` | `"nudge"` / `"force"` / `"off"` silent-work nudges |
| `idleReminder` | Turn-end nudge when tasks remain (default on) |
| `demoSkills` | Register the demo skills (default off) |
| `barStyle` | `"blocks"` or `"emoji"` |
| `refreshMs` | View refresh interval (default 1000) |

[Full option list →](./README-advanced.md#plugin-options-full-list)

---

## From a source checkout

```bash
cd plugin
npm install
npm run build          # compiles dist/gui-experimental.cjs + dist/tui.js

cd ../mcp-server && npm link   # optional: progress-relay / progress-emit on PATH
```

Register the checkout (desktop/browsers read the **global** config):

```jsonc
{
  "plugins": [{ "package": "/absolute/path/to/progress-tool/plugin" }]
}
```

For the TUI, add the same entry to `~/.config/opencode/cli.json`. `opencode
plugin add` only accepts npm/Git specifiers, so a local checkout must be
registered via config. Build details and the precompiled-TUI rationale live in
the [advanced guide](./README-advanced.md#build-notes).

Verify with `opencode plugin list` (features `server`, `tui`, `rpc`, `gui`).

**Standalone GUI:** `./launch-gui.sh`, then open `http://localhost:8765`.

<details>
<summary>Web tabs (experimental host support)</summary>

On builds with web GUI plugin support, the pill loads in a browser tab when
enabled in the config that applies to that directory:

```json
{ "experimental": { "plugin_gui_web": ["opencode-progress"] } }
```

The value is the plugin id, not the package name. Only `setup` runs on the web
(no `main`, no `Ipc`). Upstream tracking:
[anomalyco/opencode#60976](https://github.com/anomalyco/opencode/issues/60976).

</details>

---

## Uninstall

```bash
opencode mcp remove progress-server
```

Remove the plugin entry from `~/.config/opencode/opencode.json` and, if used,
`~/.config/opencode/cli.json`. For a published package,
`opencode plugin remove <package>` also works. If you linked the relay:
`cd mcp-server && npm unlink -g progress-mcp-server`.

---

## Docs

- [Advanced guide](./README-advanced.md) — schema, relay flags, state store, architecture, testing, file map.
- [Relay specification](./docs/out-of-band-relay-spec.md) — harness-agnostic contract.
- [Desktop status shim](./docs/desktop-status-shim.md) — append progress beside the native status text.
- [TUI/CLI guide](./tui-progress-guide.md) — text-mode progress bars.
- [Plugin README](./plugin/README.md) — skills, options, and packaging.

License: MIT.
