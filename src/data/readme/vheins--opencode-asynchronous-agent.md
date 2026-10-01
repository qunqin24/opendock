# @vheins/opencode-asynchronous-agent

An [OpenCode](https://opencode.ai) plugin that makes every subagent call run
**asynchronously in the background** — automatically — **plus a TUI sidebar
monitor** for those background subagents.

Works on **both** OpenCode V1 (`>=1.18.0`) and V2 (`>=2.0.0`):

- **`./server`** — the tool hook that forces `background = true`
- **`./tui`** — the sidebar monitor: running/done/error counts, per-subagent
  elapsed time, **total tokens + tokens/sec**, and a status-bar line when the
  sidebar is collapsed

```
▼ Subagents 0.1.0
● 1 run · ✓ 0 done · ✕ 0 err · Σ 1
 [ ] Write a single short para…
    ↳  00:07  48.0k tok  16.3 t/s
    executor · high
```

OpenCode V2 ships a keybind (`ctrl+b`, command `session.background`) that moves a
*running* foreground subagent into background observation. This plugin gives you the
same outcome **without pressing anything**: the moment the parent agent invokes the
subagent tool, the call is forced into background mode, so the parent returns
immediately with a "working in the background" notice and is notified when the child
finishes.

> **Why:** blocking on a subagent stalls the parent for the entire duration of the
> child's work. Launching it in the background lets the parent keep working on
> non-overlapping tasks and get pinged on completion — the async pattern the
> `background` flag was designed for.

---

## How it works

The plugin registers a single tool hook:

```js
await ctx.tool.hook("execute.before", (event) => {
  if (event.tool === "subagent" || event.tool === "task") {
    event.input.background = true
  }
})
```

`execute.before` runs right before a tool executes and hands the callback a **mutable**
event. Replacing or mutating `event.input` changes the arguments the tool actually
executes with — the official V2 plugin docs describe this hook as *"inspect or replace
tool input before execution."* OpenCode relies on this itself: the built-in
`opencode.tool.input.repair` plugin rewrites `event.input` for every tool, and another
built-in fixup rewrites `event.input` for the subagent tool. Setting
`event.input.background = true` is therefore all that is needed.

There is **no experimental flag** involved. In OpenCode `v2.0.x`, `background` is a
first-class, always-available field of the subagent tool schema:

```
{ agent, description, prompt, model, sessionID, background }
```

Only *nested* subagents are gated (by `experimental.subagent_depth`), which is a
separate concern.

### Tool id across versions

The subagent tool is named **`subagent`** in current V2 builds. Older builds named it
**`task`**. The plugin matches **both** ids so it keeps working across versions.

---

## Install

### From npm (recommended)

```sh
opencode plugin @vheins/opencode-asynchronous-agent --global
```

That installs the **server** hook (subagents run in the background). For the
**TUI monitor**, add the same package to `~/.config/opencode/tui.json` as well:

```jsonc
// opencode.json — server hook (V1 uses `plugin`; V2 uses `plugins`)
{ "plugin": ["@vheins/opencode-asynchronous-agent"] }

// tui.json — TUI monitor (V1 TUI config; V1 does not read cli.json)
{ "$schema": "https://opencode.ai/tui.json", "plugin": ["@vheins/opencode-asynchronous-agent"] }
```

One package, two entrypoints: the loader resolves `./server` for the server
config and `./tui` for the TUI config (a single module may not export both).

### From a local checkout

Clone this repo somewhere stable, e.g.:

```sh
git clone https://github.com/vheins/opencode-asynchronous-agent.git \
  ~/.config/opencode/plugins/opencode-asynchronous-agent
```

### 2. Register it

Add the plugin directory to the top-level `plugins` array in your OpenCode config
(`~/.config/opencode/opencode.json` for a global install):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "~/.config/opencode/plugins/opencode-asynchronous-agent"
  ]
}
```

Use an absolute path if your OpenCode build does not expand `~`.

### 3. Restart the service

Plugin and config changes are picked up on restart:

```sh
opencode service restart
```

That's it. The next time the parent agent spawns a subagent, it will run in the
background.

---

## Configuration

All configuration is optional and read from environment variables at setup time.

| Variable | Default | Description |
| --- | --- | --- |
| `OPENCODE_AUTO_BG_SUBAGENT` | *(enabled)* | Set to `0`, `false`, `off`, or `no` to disable the plugin entirely. |
| `OPENCODE_AUTO_BG_AGENTS` | *(all)* | Comma-separated allowlist of **parent** agent ids. When set, only these parents auto-background their subagents. |
| `OPENCODE_AUTO_BG_EXCEPT` | *(none)* | Comma-separated denylist of **parent** agent ids. These parents never auto-background their subagents. |
| `OPENCODE_AUTO_BG_DEBUG` | *(off)* | Set to `1` to log each rewrite to stderr. |

### Examples

Only let the `orchestrator` parent fan out into background subagents:

```sh
export OPENCODE_AUTO_BG_AGENTS=orchestrator
```

Background everything **except** the `debugger` parent:

```sh
export OPENCODE_AUTO_BG_EXCEPT=debugger
```

Temporarily disable:

```sh
export OPENCODE_AUTO_BG_SUBAGENT=0
```

> The allowlist/denylist match the **parent** agent — the one calling the subagent
> tool — because `execute.before`'s `event.agent` is the caller. The child's own agent
> type is not known at call time.

---

## Behaviour notes

- **Explicit wins.** If the caller already set `background` on the tool input, the
  plugin leaves it untouched. It only forces `background: true` when it is not already
  `true`.
- **Idempotent.** Re-running the hook on an already-backgrounded call is a no-op.
- **Non-destructive.** Only the `background` field is added; every other field
  (`agent`, `prompt`, `description`, `model`, `sessionID`, …) is preserved.
- **Clean unload.** Setup returns a cleanup that disposes the hook registration, so
  reloading the plugin does not stack duplicate hooks.
- **No child session changes.** Backgrounding is a property of the *parent's* subagent
  tool call, not of the child session. The child runs normally; the parent just stops
  blocking on it.

---

## Files

| File | Purpose |
| --- | --- |
| `src/index.js` | The plugin implementation (`id`, `setup`, hook logic). |
| `server.js` | V2 entrypoint — re-exports `src/index.js`. |
| `index.js` | Alternate directory entrypoint — mirrors `server.js`. |
| `package.json` | Package metadata and entrypoint exports. |

OpenCode V2 resolves a plugin directory through its `server` entrypoint (root
`server.js` or the `./server` export). Both `server.js` and `index.js` are provided so
either resolution path works.

---

## Requirements

- OpenCode **V2** (`>=2.0.0`). The plugin API used here (`ctx.tool.hook`,
  `execute.before`) is V2-only.

---

## License

MIT — see [LICENSE](./LICENSE).
