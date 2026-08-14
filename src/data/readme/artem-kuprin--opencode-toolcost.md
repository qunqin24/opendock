<div align="center">

# 💰 opencode-toolcost

### See exactly how much each tool is costing you — live in the OpenCode TUI sidebar

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@artem-kuprin/opencode-toolcost)](https://www.npmjs.com/package/@artem-kuprin/opencode-toolcost)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-blue)](https://opencode.ai)

</div>

---

## ⚡ Quick Start

```bash
npm install -g @artem-kuprin/opencode-toolcost
```

Then add `"@artem-kuprin/opencode-toolcost"` to the `plugin` array in your `opencode.json` and `tui.json`, then restart OpenCode.

---

## ✨ Why opencode-toolcost?

Other cost trackers show you the **total bill**. This one tells you **what exactly you're paying for**:

> Is `read` eating your budget? Is `edit` more expensive than `bash`? Is `task` running away with your tokens?

**opencode-toolcost** breaks down every dollar by tool — live, in your sidebar, while you work. No guesswork, no math.

| Compared to | opencode-toolcost |
|---|---|
| Generic cost dashboards | ❌ Show total only | ✅ **Per-tool breakdown** |
| Manual log analysis | ❌ Retrospective | ✅ **Live in TUI sidebar** |
| Built-in OpenCode stats | ❌ No per-tool view | ✅ **Granular attribution** |

---

## 🚀 Features

- **📊 Live TUI sidebar** — top 5 costliest tools with visual bars, updated automatically
- **🎯 Per-tool attribution** — knows exactly which tool caused each step's cost
- **💬 `/toolcost` command** — saves a detailed text report to `toolcost-output.txt`
- **🔄 Auto-refresh** — panel updates as new messages arrive, no manual reload
- **🆓 Works with any model/provider** — reads cost from API metadata, falls back to built-in pricing table

---

## 📦 Install

### Prerequisites

- **Node.js** >= 18
- **npm** (comes with Node.js)
- **OpenCode** >= 1.2.15

### Step 1 — Install the package

```bash
npm install -g @artem-kuprin/opencode-toolcost
```

> Or install locally in your project: `npm install @artem-kuprin/opencode-toolcost`

### Step 2 — Configure

Add the plugin to OpenCode config files. Server plugins go in `opencode.json`, TUI plugins in `tui.json`:

**`opencode.json`** (server plugin — enables `/toolcost` command & cost tracking):
```json
{
  "plugin": ["@artem-kuprin/opencode-toolcost"]
}
```

**`tui.json`** (TUI plugin — enables the live sidebar panel):
```json
{
  "plugin": ["@artem-kuprin/opencode-toolcost"]
}
```

### Step 3 — Restart

Restart OpenCode. You should see the `TOOL COST` block in the sidebar and be able to use `/toolcost` in chat.

### Verify it works

In any conversation, run `/toolcost`. If the plugin is loaded, a detailed report will be saved to `toolcost-output.txt`. You'll also see the `TOOL COST` sidebar panel during active LLM sessions.

---

## 🎮 Usage

The TUI sidebar will show a `TOOL COST` block during active sessions. Before any tool calls, it shows:

```
TOOL COST
  waiting for tool calls...
```

Once the LLM starts calling tools, it switches to the live breakdown:

```
TOOL COST
  edit     ████████████ $0.0123
  read     ████████     $0.0081
  bash     ██████       $0.0060
  grep     ████         $0.0042
  task     ██           $0.0021
  ────────────────────
  Total                $0.0327
  12 steps
```

For a detailed report, run `/toolcost` in chat. The report is saved to `toolcost-output.txt`.

---

## ⚙️ How It Works

1. Each LLM step emits a `step-finish` part with `tokens` and `cost` metadata
2. All tool calls in that message are collected
3. Output tokens are **split equally** across the tools called in that step
4. Cost is attributed using the same split
5. Results accumulate across the entire session

---

## 📐 What The Sidebar Shows

| Block | Description |
|---|---|
| **Top 5 tools** | Costliest tools ranked, others grouped as "other" |
| **Visual bar** | Proportional to tool's cost share |
| **Total cost** | Cumulative session cost |
| **Step count** | Number of LLM steps processed |

---

<div align="center">

Created with ❤️ by [Artem K.](https://github.com/ArtemKx1)

**Feedback? Ideas?** [Open an issue](https://github.com/ArtemKx1/opencode-toolcost/issues)

</div>

## License

MIT
