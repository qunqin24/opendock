# opencode-context-insights

[简体中文](https://github.com/LyricsYo/opencode-context-insights/blob/main/README.md) · English

[![npm version](https://img.shields.io/npm/v/opencode-context-insights)](https://www.npmjs.com/package/opencode-context-insights) [![GitHub stars](https://img.shields.io/github/stars/LyricsYo/opencode-context-insights?style=social)](https://github.com/LyricsYo/opencode-context-insights) [![license](https://img.shields.io/npm/l/opencode-context-insights)](LICENSE)

**A context insight plugin for [OpenCode](https://opencode.ai) Desktop: see what each request is made of, how full the window is, how the context evolves and compacts step by step, and how the sub-agent fleet divides the work.** Inspired by [dsh-context](https://github.com/bowenliang123/dsh-context).

[`opencode-context-insights`](https://www.npmjs.com/package/opencode-context-insights) provides a session-level view of the context lifecycle, all in one resizable panel in the Desktop sidebar:

- **Overview** — session totals for turns, steps, tokens, cache hits, cost and timing, plus the current request's window usage and auto-compaction threshold.
- **Details** — pick **Live** or any retained step to expand what that request actually assembled, with the context trend, timing trend, events, compactions, file activity and command executions.
- **Fleet** — walk up to the root session and expand the whole sub-agent tree: fleet tree, shared timeline, inspector and delegation links.
- **`/context` command** — open or close the panel without leaving the chat.

[![Context insights panel](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/overview.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/overview.png)

## Install / update

### Install in OpenCode

```bash
opencode plugin add opencode-context-insights
```

Or add it to the global `~/.config/opencode/opencode.json(c)`; OpenCode installs missing packages in the background on startup:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-context-insights"]
}
```

Pin a version with `opencode-context-insights@0.1.0`; install from Git with `opencode plugin add github:LyricsYo/opencode-context-insights`.

Requires **OpenCode 2.2.6 or newer**. Desktop reads the global config; an entry in a project config only affects windows for that project. The web build (OpenCode in a browser) never loads the GUI part and only sees the server RPC.

### From source

```bash
corepack enable
pnpm install
pnpm build
```

`dist/` is a build artifact and is not committed, so build after cloning. Then add this directory to `plugins` in `opencode.json(c)` (use your actual path):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["<path-to-opencode-context-insights>"]
}
```

After changing `src/client/`, rebuild with `pnpm exec vite build --watch` and Desktop hot-reloads the panel. After changing `src/host/`, `src/shared/` or `src/index.ts`, run `pnpm build` and restart OpenCode.

[![Context entry in the sidebar + menu](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/entry.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/entry.png)

## Usage

Five entry points, one story:

| Entry | What it does |
| --- | --- |
| **Overview** tab | Session totals, token split, timing distribution, current context and the subagent list. |
| **Details** tab | The context browser draws any request's composition, plus trends, events, file activity and commands. |
| **Fleet** tab | The whole agent family: tree, timeline, inspector and delegation links. |
| **`/context` command** | Toggles the panel from the chat; also listed as **Open context insights** in the command palette. |
| **Sidebar + menu** | Pick **Context** to open the panel as a resizable sidebar page. |

[![Overview tab upper half](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/stats.png)

## 📊 Overview tab

### Context Stats

Three summary blocks at the top: **input / output**, **cache hit** (read / write) and **cost** (estimated from models.dev list prices, falling back to provider-reported cost when the model is not listed). Below them is the stat grid: turns, steps, model replies (model responses with visible text; tool-call-only steps don't count), skill loads, tool calls, command executions, file reads / writes / searches and events, followed by tool-call and event chips.

[![Context Stats card](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/context-stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/context-stats.png)

### Token Stats

Session token total (including cache reads) and category shares. The total comes from provider usage; the category split is estimated and scaled to that total. Cache hit rate sits in the corner of the card.

[![Token Stats card](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/token-stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/token-stats.png)

### Timing

Seven timing segments: TTFT (model wait), model reasoning, model reply, tool arguments, tool execution, waiting for answers, and overhead. The top highlights active time (excluding answer waits), average output speed and average TTFT, followed by the distribution bar, numbers and slowest tools.

- **Waiting for answers** counts only blocking time in the `question` tool, and is the only segment excluded from active time.
- **TTFT** runs from request start to the first content block; OpenCode does not store first-token time, so it is an approximation.
- Per-step / per-turn breakdowns live in the timing trend on the **Details** tab.

[![Timing card](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing.png)

### Current Context

Current request context overview: provider-reported prompt as a share of the model window, remaining window, output reserve, auto-compaction threshold (red vertical line with a percentage label, with the trigger value and share repeated in the legend), and a stacked bar plus legend broken down by category.

- The compaction line is computed from `compaction.buffer` (default 15% of the window, at least 16k); `compaction.auto=false` shows as "Off".
- The total always comes from the latest **completed** step's provider-reported prompt. While a request is running, the card keeps showing the previous request's total and split instead of an estimate for the new one.

[![Current Context card](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/current-context.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/current-context.png)

### Subagents

Child sessions spawned by the current session, oldest first, showing status, cost and input / output tokens. The list caps at 420px and scrolls, rendering 50 rows at a time. Clicking a row switches to the **Fleet** tab and focuses that agent; you can also press **Open** in the inspector to open the child session in the current window.

[![Subagents list](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/subagents.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/subagents.png)

## 🧱 Details tab

### Context Browser

Pick **Live** (the next request) or any retained step to see what that request actually assembled. Nine categories are collapsed by default: system prompt, tool definitions, user messages, injected context, skill injections, assistant messages, reasoning, tool calls and tool results. Each shows item count, estimated tokens and share; expanding reveals every item's full content.

- **Tool rows** show call counts and source chips (`core` / `mcp:<server>` / tool namespace; the request payload has no source field, so it is inferred from the name), sortable by size / call count / name.
- **Tool calls / results**: expanding a call row shows its arguments; expanding a result row shows arguments, status, result body and line count, with a **Raw / Markdown** toggle.
- **Attachments**: images and files in messages render as cards with dimensions, openable in Desktop preview or the system opener, and are excluded from the token split.
- **Compare**: category rows can switch to "vs previous step / vs previous turn", showing ±items and ±tokens.
- **Flat**: lays every item out in request order, tagged with `#position` and `Tturn Sstep`.
- Steps recorded before the plugin was installed have no system / tools snapshot and only show messages; tool results truncated by the host are marked "Truncated".

[![Context Browser](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser.png)

[![Expanded tool result](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser-tool-result.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser-tool-result.png)

### Context trend

One horizontal stacked bar per step or turn, split into the nine categories.

- Expanding a category in the browser keeps only that category and rescales the axis; collapsing restores all.
- Switch **by step / by turn** and **total / delta**; the **duration curve** overlays a high-contrast pink line whose right-hand scale matches the peak (active time only, excluding answer waits).
- **Adaptive** scales bars and axis to the visible range and follows scrolling; **Overview** squeezes the whole session into one stacked ribbon.
- Hover highlights input / output / cache rate and lists the category split; clicking a bar pins it to the browser; hovering a bar or turn label previews that step in the browser below and scrolls the timing trend to match.
- Three Step brief rows sit under the chart: **User / In / Response**, fixed-height with clipping, each jumping to the matching context.

[![Context trend](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/trend.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/trend.png)

### Timing trend

One stacked bar per step or turn, split into TTFT / reasoning / reply / tool arguments / tool execution / overhead. Bar heights and the axis exclude answer waits, which are listed separately in the hover detail. Supports horizontal scrolling, adaptive and overview modes; clicking selects a step and highlights active time and output speed. The two charts are linked: click a bar or turn label in either one and the other selects and scrolls to it.

[![Timing trend](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing-trend.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing-trend.png)

### Context events

Compactions, skill loads, system injections, model / agent switches, failures and interruptions, filterable by type. 50 rows render at a time and scrolling loads more; each row shows type, T/S position, ±tokens and time. Clicking an injection / skill / compaction row jumps to the matching place in the browser.

[![Context events list](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/events.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/events.png)

### Compactions

Full timestamps, reason, prompt size before and after, and tokens reclaimed. Clicking a record locates its summary in the browser.

[![Compactions card](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/compactions.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/compactions.png)

### File activity

Read / write / search counts and `+added / −removed` lines per file, merging relative and absolute paths automatically.

- Filter **All / Read / Written / Searched / Images**, search by path, and sort by count / lines / latest / path / name.
- Clicking the file name previews previewable types in Desktop (underline on hover); clicking a directory or empty row space still expands / collapses. Files that no longer exist are struck through and can't be previewed.
- Previews open in a separate sidebar tab; returning to Context restores the tab, scroll position, selected step and filters.
- Expanding a file shows each operation's tool, match / line counts, additions and deletions, time and `Tturn Sstep`; nested shell / read / write / edit / grep calls inside Code Mode also count.

[![File activity](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/file-activity.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/file-activity.png)

### Command executions

All / failed / slow / background filters (with counts), search by command / description / directory / program, latest / slowest sorting, and a program dropdown.

- Rows show status icons, nested / background badges, multiline / heredoc / inline markers and duration; 50 rows render at a time and scrolling loads more.
- Clicking a row expands the full command and output, with **Reveal** jumping to the matching tool result in the browser.
- **Worth a look** at the top surfaces the slowest, most failing, most repeated and background runs; click to apply a filter, click again to clear.

[![Command executions panel](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/commands.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/commands.png)

## 🚢 Fleet tab

Walk up from the current session to the root, then expand the whole sub-agent tree.

### Fleet tree

One card per agent: status dot, title, agent / model, input↑ / output↓ tokens, models.dev estimated cost (falling back to provider-reported), context composition bar, duration, steps and share of the model window. Parents are centered above their children and leaves share the width; when wider than the sidebar the tree wraps into rows and keeps the connectors. Siblings sort oldest first and children sit right below their parent.

[![Fleet tree](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-tree.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-tree.png)

### Timeline

The default view. One row per agent, ordered like the fleet tree; the horizontal axis is a compressed shared timeline, where each bar is that agent's active window and overlaps mean parallel work. The **Parallel** strip at the top buckets concurrency over time and reports the peak.

- `question` waits don't count as active, and a parent waiting on a `subagent` / `task` result doesn't count as active either.
- Idle spans with no active agent collapse, with orange dashed boundaries and dots; hovering shows the hidden duration.
- **Adaptive** widens the timeline to 1px per 5 active seconds and pins the label column and Parallel header; **Overview** squeezes the canvas to the panel width so the whole fleet fits on one screen.
- Top chips show **active time** (parallel spans counted once) and **active time (summed)** (parallel work counted once per agent). Curved arrows between parent and child are delegation links, highlighted end-to-end on hover; an orange "now" line appears while work is active.

[![Fleet timeline](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-timeline.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-timeline.png)

### Inspector

Details for the pinned or hovered agent: status, tokens, cost, duration, steps, window share, model config (agent, provider/model and session ID), context category legend, the prompt sent and all messages (prompt / reply / skill / context, newest first, 20 at a time with more on scroll). Non-current sessions offer **Open**.

[![Fleet inspector](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-inspector.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-inspector.png)

### Delegation links

Reads `subagent` / `task` tool calls from the parent session: matches the `sessionID` in tool-result metadata first, then falls back to `sessionID:` in tool output, child session title vs `description`, first prompt and creation time. A child inspector shows "Delegated by" with parent, time and task description; the parent inspector lists **Delegations**, and clicking a row pins that child. Unmatched calls still appear but are marked as not navigable.

[![Delegation records](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-delegation.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-delegation.png)

## Development

```bash
corepack enable
pnpm install
pnpm test       # vitest: node for host / shared, jsdom for client
pnpm coverage   # writes an HTML report to coverage/
pnpm typecheck
pnpm build      # emits dist/gui-experimental.cjs and dist/index.js
```

Tests are organized by layer: `tests/host`, `tests/shared` and `tests/client`; fixtures and mount helpers live beside each layer or in `tests/client/helpers`. Component tests get a host `PluginContext` from `tests/client/helpers/mount.tsx`, so no Desktop instance is needed.

## Like it?

If this plugin helps you see what your agent is carrying, star it on [GitHub](https://github.com/LyricsYo/opencode-context-insights) — issues and PRs are welcome.

## License

[MIT](LICENSE)
