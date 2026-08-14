<div align="center">

# opencode-optmem

_Give OpenCode permanent memory through [OptMem](https://github.com/VictorTaelin/OptMem)_

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenCode plugin](https://img.shields.io/badge/OpenCode-plugin-111?style=flat-square)](https://opencode.ai/docs/plugins/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#features) | [Installation](#installation) | [Usage](#usage) | [Troubleshooting](#troubleshooting)

</div>

`opencode-optmem` connects an existing OptMem installation to OpenCode. It recalls memory at the start of each primary session, gives the agent native `optmem_*` tools, and adds a memory browser to the TUI. Agents installing the plugin can follow [`INSTALL.txt`](INSTALL.txt).

One OptMem store is shared across sessions, projects, and models. OptMem owns that store; the plugin doesn't create a second database or require an `AGENTS.md` file.

> [!NOTE]
> OptMem is a separate project and isn't bundled with this plugin. Install and initialize it before starting OpenCode.

## Features

- **Permanent memory**: Keep useful facts across agent sessions, projects, models, and context compaction.
- **Native agent tools**: Record, search, reload, summarize, and repair memories without shell commands.
- **TUI memory browser**: Read the current memory document or inspect OptMem's summary tree.
- **Safe process boundary**: Pass arguments directly to OptMem without evaluating shell strings or editing its data files.
- **Subagent guards**: Keep built-in and configured subagents from loading or writing the same memory again.

## Installation

### 1. Install and initialize OptMem

Run the [official installer](https://github.com/VictorTaelin/OptMem#install):

```bash
curl -fsSL https://raw.githubusercontent.com/VictorTaelin/OptMem/main/install.sh | sh
~/.optmem/memo init
```

The installer prints an `AGENTS.md` block for clients that need manual instructions. OpenCode doesn't need that block when this plugin is enabled.

### 2. Enable the server plugin

Add the package to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-optmem"]
}
```

### 3. Enable the TUI dashboard

Add the TUI export to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-optmem/tui"]
}
```

Restart OpenCode after changing either file. The server integration works without the TUI entry, so the dashboard is optional.

## Usage

### Let OpenCode remember

Use OpenCode normally. The agent receives recalled OptMem content at session startup and must call `optmem_note` when it learns a durable, non-redundant fact. It skips routine details and duplicates.

You can also ask directly:

```text
Remember that this repository deploys to Linux and stores timestamps in UTC.
```

OptMem may request a summary as its tree grows. The plugin exposes that request to the agent, which submits the summary with `optmem_nap` before continuing.

### Search memory

Ask the agent to search previous notes, or open the dashboard and press `/`. Searches accept a case-insensitive regular expression through OptMem's native recall command.

```text
What do you remember about deployment or release settings?
```

### Open the dashboard

Open the OptMem dashboard from any of these entry points:

- Run `/optmem` in OpenCode.
- Choose **Open OptMem Dashboard** from the command palette.
- Click **OptMem /optmem** in the sidebar.

The **Memory** view displays the current `memo wake` document. The **Tree** view opens summary nodes through `memo zoom`; leaf nodes show the original dated memories.

| Key | Action |
| --- | --- |
| `t` / `m` | Open Tree or Memory view |
| `Up` / `Down`, `j` / `k` | Select a tree node |
| `Enter`, `Right`, `l` | Open a summary node |
| `Left`, `Backspace`, `h` | Return to the parent node |
| `Up` / `Down`, `PageUp` / `PageDown` | Scroll a long Memory document |
| `Home` / `End` | Jump to the start or end of Memory |
| `r` | Refresh memory |
| `n` | Add a memory |
| `/` | Search with a regular expression |
| `Esc` | Close the dashboard |

## Native Tools

| Tool | What it does |
| --- | --- |
| `optmem_note` | Saves one durable, non-redundant memory. |
| `optmem_wake` | Reloads permanent memory. |
| `optmem_recall` | Searches every raw memory with a regular expression. |
| `optmem_zoom` | Opens a summary block into its two children. |
| `optmem_nap` | Submits a summary requested by OptMem. |
| `optmem_forget` | Deletes a bad cached summary after permission. Raw memories remain. |
| `optmem_status` | Checks whether the OptMem executable is available. |

OptMem validates command input and reports pending compression through these tools. The plugin doesn't duplicate OptMem's limits or configuration.

## How It Works

1. At primary-session startup, the server plugin runs `memo wake` and adds the result to the system context as untrusted remembered data.
2. OpenCode calls native `optmem_*` tools to interact with memory. The plugin invokes `~/.optmem/memo` with argument arrays, never shell command strings.
3. OptMem stores raw notes and maintains its binary summary tree. The plugin follows paged wake output and passes summary requests back to the agent.
4. The TUI reads memory through the same OptMem commands. It never edits `LOG.txt`, `TREE/`, or OptMem configuration files directly.

OpenCode's built-in `general` and `explore` subagents, along with configured subagents, receive neither memory context nor access to the tools.

## Storage and Configuration

OptMem owns the executable and permanent store in its standard directory:

```text
~/.optmem/
|-- memo
`-- memory/
    |-- LOG.txt
    |-- TREE/
    `-- config
```

Use OptMem itself to inspect or change memory settings:

```bash
~/.optmem/memo config
~/.optmem/memo config WAKE_LINES=300
```

The plugin inherits the OpenCode process environment, so OptMem's native `MEMORY_DIR` override works without plugin-specific configuration.

## Local Development

```bash
bun install
bun run check
```

`bun run check` type-checks the project, runs its tests, and builds `dist/server.js` and `dist/tui.js`.

Point both OpenCode configuration files at a local build while developing:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-optmem/dist/server.js"]
}
```

```json
{
  "plugin": ["file:///absolute/path/to/opencode-optmem/dist/tui.js"]
}
```

The dashboard ships as runtime `.tsx` so it shares OpenCode's Solid renderer. Tests call a fake external `memo` executable instead of copying OptMem source into this repository.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| `OptMem executable not found or not executable` | Install OptMem and confirm `~/.optmem/memo` is executable. |
| `No memory at ~/.optmem/memory` | Run `~/.optmem/memo init`, then restart OpenCode. |
| Memory isn't loaded in a session | Confirm `opencode.json` contains `opencode-optmem`, then restart OpenCode. |
| `/optmem` is unavailable | Confirm `tui.json` contains `opencode-optmem/tui`, then restart OpenCode. |
| A note or block is rejected | Read the returned OptMem error; your installed OptMem version owns validation and limits. |
| New memory isn't visible | Press `r` in the dashboard or ask the agent to call `optmem_wake`. |

## Resources

- [OptMem](https://github.com/VictorTaelin/OptMem)
- [OpenCode](https://opencode.ai/)
- [OpenCode plugin documentation](https://opencode.ai/docs/plugins/)
- [OpenCode configuration](https://opencode.ai/docs/config/)
