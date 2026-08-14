# opencode-plugin-question-force-close

English | [简体中文](./README.zh-CN.md)

An [opencode](https://opencode.ai) **TUI plugin** that forces a clickable **close button** while the `question` tool is waiting for input.

opencode's built-in question dialog has no close affordance of its own — it can normally only be dismissed by pressing <kbd>esc</kbd>. When the dialog is off-screen (scrolled away) or you're on a setup where hitting <kbd>esc</kbd> is awkward, there is no visible way to abort the question. This plugin renders a prominent `✕ Force close question` button that calls `question.reject` on click, aborting the tool — equivalent to pressing <kbd>esc</kbd>, but always visible and clickable.

<img src="./screenshot.png" alt="Screenshot showing the force close button" width="600">

---

## Install

### From npm (recommended)

Add the plugin to your opencode **TUI** config:

```jsonc
// .opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-plugin-question-force-close"]
}
```

opencode installs npm plugins automatically via Bun on startup.

### From a local file

```jsonc
// .opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["../path/to/plugin.tsx"]
}
```

Then install the plugin's runtime dependencies at the project root:

```bash
bun install   # or: bun add solid-js@1.9.12 @opentui/solid@0.4.5
```

---

## Usage

1. Start the **interactive** TUI:

   ```bash
   opencode
   ```

   > `opencode run "..."` runs headless and does **not** load TUI plugins. You must use the interactive TUI.

2. Trigger any agent call that invokes the `question` tool.

3. A red `✕ Force close question` button appears at the bottom-right, directly beneath the question dialog. Click it (mouse) to dismiss the question and abort the tool. The button auto-hides once the question is answered or dismissed.

---

## How it works

The plugin subscribes to the question lifecycle via the TUI event bus:

| Event               | Action                                   |
| ------------------- | ---------------------------------------- |
| `question.asked`    | record the pending request id, show button |
| `question.replied`  | clear pending, hide button               |
| `question.rejected` | clear pending, hide button               |

On click, it calls `api.client.question.reject({ requestID, directory })`, the same SDK call the built-in <kbd>esc</kbd> keybinding uses.

The button is rendered through opencode's host-slot system (`api.slots.register`) using SolidJS, the same reactivity framework the opencode TUI is built on.

---

## Limitations

- **Position is bottom-right, not top-right.** opencode's TUI uses a relative box layout with no native floating-overlay slot. The question dialog itself (and its `esc dismiss` hint) is hard-coded inside opencode's source and cannot be injected into by plugins. The `app_bottom` host slot — wrapped in a `flexShrink: 0` box directly beneath the session area — is the closest slot that is guaranteed visible while a question is pending. A true top-right floating button would require patching opencode itself.
- **Requires the interactive TUI.** Headless mode (`opencode run`) does not load TUI plugins.
- **Uses an undocumented API.** opencode's official plugin docs only cover *server* plugins (hooks). TUI rendering plugins (`{ id, tui }` modules, `api.slots`, the TUI event bus) are internal/undocumented as of opencode 1.18.x. This plugin may need updates if those internals change.

---

## Requirements

| Package             | Version  | Notes                                                |
| ------------------- | -------- | ---------------------------------------------------- |
| opencode            | ≥ 1.18.0 | TUI plugin + host-slot system                        |
| `@opentui/solid`    | 0.4.5    | pinned exact; interlocked with the opencode 1.18.x host |
| `solid-js`          | 1.9.12   | pinned exact; peerDependency of `@opentui/solid@0.4.5`  |
| `@opencode-ai/plugin` | 1.18.13 | optional peer (types only at runtime)                |

> opencode bundles its own copies of `solid-js` and `@opentui/solid` and redirects plugin imports to the host instance at runtime, so there is no "double SolidJS instance" problem even though the plugin ships its own copies.

---

## Project layout

```
opencode-plugin-question-force-close/
├── plugin.tsx              # the plugin (default exports { id, tui })
├── package.json            # npm metadata + pinned deps
├── README.md
├── LICENSE
└── .opencode/              # local dev / test harness (NOT published)
    ├── opencode.json
    └── tui.json            # loads the plugin via "../plugin.tsx"
```

---

## Develop

```bash
git clone https://github.com/zylcold/opencode-plugin-question-force-close.git
cd opencode-plugin-question-force-close
bun install                # install solid-js + @opentui/solid at root
opencode                   # interactive TUI; trigger a question to test
```

The `.opencode/tui.json` in this repo already points at `../plugin.tsx`, so cloning + `bun install` + `opencode` is enough to run the plugin locally.

### Debugging tips

TUI plugin failures are **silent** by default — the interactive renderer swallows `console.*`. If nothing renders, inject a disk probe inside `plugin.tsx`:

```ts
import { appendFileSync } from "node:fs"
const diag = (stage: string, data?: unknown) =>
  appendFileSync("/tmp/qfc.log", `${stage} ${JSON.stringify(data ?? "")}\n`)
diag("module-imported")  // trace each lifecycle stage
```

---

## License

[MIT](./LICENSE)
