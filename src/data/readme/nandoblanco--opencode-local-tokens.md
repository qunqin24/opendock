# opencode-local-tokens

**Local token auditing and model-aware session handoff for OpenCode V2**, built to find which projects consume the most tokens by project folder or tag. Compare token totals, drill into individual sessions, and separate input, output, reasoning, and cache activity. Search, sorting, and manual tags help trace the largest totals back to the work behind them.

| OpenCode Desktop | OpenCode TUI |
| :---: | :---: |
| [![opencode-local-tokens Desktop preview](./assets/screenshot.png)](./assets/screenshot.png) | [![opencode-local-tokens TUI preview](./assets/screenshot-tui.png)](./assets/screenshot-tui.png) |
| [View full size](./assets/screenshot.png) | [View full size](./assets/screenshot-tui.png) |

*Note: Previews were rendered in headless Chromium via Playwright from the plugin's actual Desktop (`dist/gui-experimental.cjs`) and TUI (`src/tui.ts`) UI code using synthetic fixture data and a simulated host frame, rather than captured from a live OpenCode window or terminal.*

Handoff connects that audit to the next step: continuing work when a conversation has grown large or is nearing the model's context limit. Token totals show where tokens went; context status shows how much of the current model's capacity the latest request used. When you choose to move to a fresh session, handoff carries forward a structured checkpoint of the goal, decisions, constraints, unfinished work, and next action, with bounded retrieval from linked predecessor sessions instead of requiring the entire transcript up front. The aim is to preserve useful working context without carrying every old exchange into the new conversation. Handoff is manual, preparation uses model tokens, and lower token costs are not guaranteed.

## Background

Tokens started with a practical question: which projects are consuming the most tokens, and what work is driving those totals? Session-by-session counters make that hard to see when work spans multiple conversations or folders.

Tokens reads local session records and transcripts to make that audit easier. Use project folders to narrow the work being reviewed, or tag related sessions across folders to track a client, feature, or type of task. Sort sessions by token count to find the largest contributors, then inspect their token breakdowns. Desktop's `Per Tag` view brings tagged sessions together for a grouped comparison.

## Features

| Feature | Details |
| :--- | :--- |
| Analytics | Input, output, reasoning, cache-read and cache-write counters; 30-day and all-time summaries |
| Session search & sort | Topic search, folder-based projects, configurable keyword tags, model/tag filters, likes, notes, turn-scoped matching, and sorting (`Billed tokens`, `Total w/ cache`, `Steps`, `Recently updated`, `Newest created`, `Oldest created`, `Title A-Z`, `Relevance`) |
| Manual tagging & Per-Tag view | Terminal add/remove tag editor; Desktop `+ Tag` and removable `#tag ×` chips plus lower split-view tabs (`Per Session` and `Per Tag`) |
| Local sources | OpenCode SQLite plus standalone Claude Code and Codex JSONL transcripts |
| Context status | Latest recorded request compared with the exact configured model capacity; warning at 75%, high at 90% |
| Handoff | Structured working-state tool, explicit predecessor history, save/copy continuation, measurement-only sidecars |

## Installation

### Option 1: OpenCode Plugin CLI (Recommended)

Install with OpenCode's native plugin CLI. OpenCode downloads the package from npm (or GitHub) into its own cache automatically and adds one entry to `~/.config/opencode/opencode.jsonc` that loads the server tools, `/tokens` and `/handoff` TUI commands, and Desktop panel together:

```sh
opencode plugin add @nandoblanco/opencode-local-tokens
# Auto-update on startup and every 24 hours:
opencode plugin add @nandoblanco/opencode-local-tokens@latest
# Or install directly from GitHub:
opencode plugin add github:nandoblanco/opencode-local-tokens
```

### Option 2: Manual Configuration

Add `@nandoblanco/opencode-local-tokens` to `"plugins"` in the global `~/.config/opencode/opencode.jsonc` (or project `./opencode.jsonc` / `./.opencode/opencode.jsonc`). OpenCode fetches the npm package automatically and loads the server, TUI, and Desktop parts from this single entry (no manual `npm install` or separate `cli.json` entry is required):

```jsonc
{
	"plugins": [
		{
			"package": "@nandoblanco/opencode-local-tokens",
			"options": {
				"cacheAlerts": false
			}
		}
	]
}
```

### Option 3: Built-in CLI Helper (`npx`)

Run the package CLI once via `npx` to register the plugin in `~/.config/opencode/opencode.jsonc`:

```sh
npx @nandoblanco/opencode-local-tokens install
# Or opt into prompt-cache alerts during setup:
npx @nandoblanco/opencode-local-tokens install --cache-alerts
```

### Option 4: From a Local Directory

Clone this repository, run `npm ci` and `npm run build:gui` after GUI source changes, then reference the package directory in `opencode.jsonc` (or place the directory inside `~/.config/opencode/plugins/` or `.opencode/plugins/`):

```json
{
	"plugins": ["file:///path/to/opencode-local-tokens"]
}
```

Entrypoints are `./server`, `./tui`, and `./gui-experimental`. Package publication and live host loading are separate checks. Source execution requires a Node version with TypeScript execution support or equivalent tooling; the declared Node 22.5 minimum alone is insufficient for running these `.ts` entrypoints directly (the `install` CLI subcommand runs in plain Node without loading TypeScript entrypoints).

## Using Tokens

### Automatic behavior

`server.ts` registers a context reminder and two agent tools, loads and caches local analytics on demand when `/tokens` is queried, and observes `session.idle` for measurement updates. None of these creates a new session or changes compaction thresholds. Context alerts remain informational; unknown model capacity produces no guessed percentage.

Prompt-cache expiry banners and their countdown clocks are **off by default** in terminal and Desktop. Manual `/handoff`, context status, and token analytics remain available. To opt into the fixed five-minute cache estimate, set `cacheAlerts` to `true` in this plugin's options; it is an estimate, not a guarantee of the selected model's cache lifetime:

```jsonc
{
  "plugins": [
    {
      "package": "@nandoblanco/opencode-local-tokens",
      "options": { "cacheAlerts": true }
    }
  ]
}
```

Use `opencode.json(c)` for this multi-part plugin. If a terminal-only entry is configured separately in `cli.json`, set the option on that entry as well. Omit `cacheAlerts` or set it to `false` to disable the reminder. Only the boolean `true` enables it, and changing plugin options reloads the plugin.

### Commands

| Command | Behavior |
| :--- | :--- |
| `/tokens` | Open Token Audit |
| `/handoff` | Save handoff material; Desktop copies continuation text for manual pasting into a new chat |
| Desktop `Ctrl+Shift+Y` | Open Token Audit (sidebar and titlebar button with stacked coins icon) |
| Explorer likes/tags | Stored in `session-tags.json` sidecar (`like`, `unlike`, `tag`, `untag`, `note`), not written into the OpenCode database |

For a handoff, ask the agent to save current working state, run `/handoff`, manually open a new chat, and paste the copied continuation text. A saved state may become stale as the session continues. Generated fallback material is explicitly identified when structured working state is missing. Desktop save/copy does not itself open a new chat. Automatic session creation and full TUI handoff recovery are not verified.

## Query Syntax

| Syntax | Meaning | Example |
| :--- | :--- | :--- |
| Free text | Topic search | `playwright navbar` |
| `project:` or `p:` | Project filter | `project:storefront` |
| `model:` or `m:` | Model filter | `model:claude` |
| `tag:`, `t:`, or `#` | Tag filter | `#accessibility` |
| `liked`, `liked:true`, or `*` | Bookmarked sessions | `* navbar` |

## Terminal Controls (`/tokens`)

The terminal explorer keeps search, sort controls, and matched totals on separate lines. Type to filter the session list. Tags and likes are shared with Desktop through the same local sidecar; Desktop's `Per Tag` tab and clickable tag chips are not terminal controls.

| Key | Action |
| :--- | :--- |
| `Up` / `Down` or `Ctrl+P` / `Ctrl+N` | Select a session |
| `Enter` | Open the selected session |
| `Ctrl+S` | Open the sort picker; `Up` / `Down` choose, `Enter` applies, `Esc` cancels |
| `Ctrl+T` / `Ctrl+R` | Add / remove comma-separated tags on the selected session; `Enter` saves, `Esc` cancels |
| `Ctrl+L` | Toggle the selected session's like |
| `Ctrl+U` | Clear search, or clear tag input while editing |
| `Esc` | Cancel the open editor first; otherwise close the explorer |

Sort choices are billed tokens, total with cache, steps, updated date, newest/oldest creation date, title, and relevance. The terminal starts with best match (billed tokens break ties). Sorting is applied across all matches before the 80-session terminal result limit. Removing a keyword tag suppresses it until explicitly added again. Edits show save errors without closing the editor or discarding typed tags.

## How It Works

### 1. Local sources (`tokens.ts` and `summary.ts`)

The analytics engine reads local session records and transcripts. It groups token counters by session, model, project, and matching turns. The UI label `Billed Tokens` means input + output + reasoning; it is not a dollar invoice. Cache operations may also be charged, and pricing is not inferred from that label.

### 2. Separate persistence (`mutateSessionTag`)

Likes, tags, and notes use `session-tags.json`. `.tokens-turns-cache.json` caches searchable turn data and can contain session text. These files are local and should remain private.

### 3. Model capacity (`getSessionStepStatus`)

Live context is input + cache read + cache write from the latest token record. RPC status resolves the exact configured model key. Cumulative API-step and uncached-input counters do not drive the 75%/90% context alerts. Unknown capacity is reported as unknown, not guessed from a model name.

### 4. Working state and evidence (`handoff.ts`)

`handoff_checkpoint` stores structured working state bounded to 16,000 characters. `handoff_history` performs literal matching in the selected session and explicitly linked continuation ancestors, with at most 20 sessions, six results per page, and excerpts bounded to 900 characters. It does not search unrelated sessions or invoke a model.

### 5. UI isolation (`gui.tsx`, `gui.css`, and `tui.ts`)

Tokens uses its own plugin/RPC ID, panel IDs, commands, and `.olt-scope` stylesheet boundary. Desktop surfaces require CSS `@scope` support in the host webview.

### 6. Agent tools (`server.ts`)

| Tool | Required inputs | Optional inputs | Behavior |
| :--- | :--- | :--- | :--- |
| `handoff_checkpoint` | `goal`, `nextStep`, `constraints`, `decisions`, `verified`, `unfinished`, `failures`, `pendingUserRequests` | None | Save structured state for the current session |
| `handoff_history` | `sessionId`, `query` | `offset` | Retrieve bounded literal evidence |

RPC methods are `summary`, `tokens`, `mutateSession`, `sessionStatus`, and `createHandoff`. No `dashboard` account RPC is registered.

### 7. Measurement-only observations (`measurement.ts`)

Implemented: checkpoint-save and handoff-save observations, explicit continuation links, initial request, first five requests, requests two through six, and first ten requests. Partial windows remain marked incomplete. Sidecars store identifiers, counters, and timestamps rather than copied prompts or tool bodies. Errors do not block handoff. See [HANDOFF-MEASUREMENT.md](./HANDOFF-MEASUREMENT.md) for attribution and privacy limits.

Proposed, not implemented: preparation-start attribution, human outcome entry, aggregate reporting, automated quality scoring, and timing optimization. Measurements do not prove savings or correct recovery.

### 8. Token costs

| Operation | Token cost | Reason |
| :--- | :--- | :--- |
| Local analytics, UI, measurements | No additional model calls | Local reads and sidecar writes |
| Tool schemas and context reminder | Context tokens | Registered in agent context |
| Checkpoint/history tool use | Request/result tokens | State and evidence enter the conversation |

## Storage and Configuration

| Setting | Environment variable | Default | Purpose |
| :--- | :--- | :--- | :--- |
| Database | `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | Session source |
| Tags sidecar | `OPENCODE_SESSION_TAGS` | `~/.local/share/opencode/session-tags.json` | Likes, tags, notes |
| Handoff memory root | `OPENCODE_MEMORY_DIR` | `~/.opencode/memory` | `sessions/` exports and `handoffs/` working state and measurements |
| Project and tag rules | `OPENCODE_TOKENS_CONFIG` | `~/.config/opencode/tokens.json` | `ignoreFolders` and `keywords` (see below) |

Explicit function path arguments take precedence over these environment variables, which take precedence over home-directory defaults. Legacy machine-specific directories are no longer auto-detected. To keep using existing files elsewhere, set `OPENCODE_SESSION_TAGS` and `OPENCODE_MEMORY_DIR` to their current locations; no files are moved or migrated automatically. The measurement collector opens the source database read-only. Handoff Markdown and working-state files contain task information; measurement sidecars do not copy those bodies.

### Projects and keyword tags (`tokens.json`)

```json
{
  "ignoreFolders": ["workspace", "git", "agency", "clients"],
  "keywords": {
    "frontend": ["css", "flexbox", "layout"]
  }
}
```

- **Project** is every folder in the session directory except the drive, your home folder prefix, and any name in `ignoreFolders` (case-insensitive). With the example above, `/workspace/web-app` becomes `web-app` and `/workspace/git/agency/clients/acme/storefront` becomes `acme/storefront`. If every folder is ignored, the project is `general`. Without the file, `ignoreFolders` defaults to common names such as `git`, `repos`, `code`, `dev`, `projects`, `workspace`, `tmp`, `temp`, `Windows`, and `System32`.
- **Keywords** add a tag when any listed word appears as a whole word in the session title or first prompts. Keywords never change the project. There are no built-in keyword tags; imported Claude Code and Codex CLI sessions still get `#claude-code` / `#codex-cli`.
- Editing the file relabels every session on the next report; manual tags, removed tags, likes, and notes are kept.

## CLI Commands

```sh
node cli.js --help
node cli.js "playwright navbar"
node cli.js --project storefront --model claude
node cli.js --tag accessibility --liked
node cli.js --sort updated --limit 10
node cli.js like ses_39a1b2
node cli.js tag ses_39a1b2 "review,billing"
node cli.js untag ses_39a1b2 "billing"
```

The installed shell command is `opencode-tokens` with the same arguments. Shell `--sort` values are `billed`, `total`, `steps`, `updated`, `newest`, `oldest`, `title`, and `relevance`. Without `--sort`, shell reports keep their existing topic relevance / billed-token ordering. Shell commands print a report or mutate a sidecar; `/tokens` inside OpenCode opens the interactive terminal explorer.

## Development and Verification

```sh
npm test
npm run build:gui
node test/handoff-browser.mjs
node test/tui-browser.mjs
```

Tests cover bounded history, working-state persistence, measurements, model-capacity lookup, and RPC separation. Workspace integration fixtures retain analytics and transcript parsing coverage. Browser fixtures run real GUI code against stubbed host APIs. They do not establish live Desktop/TUI behavior or live idle-event collection. No measured cost/quality improvement is claimed.

`tokens-controls.test.ts` verifies all eight sorts, ordering before limits, shell argument handling, and real SQLite/sidecar tag persistence. `tui-browser.mjs` exercises the real terminal dialog component through a DOM renderer adapter at 1280 and 800 pixels, with stubbed analytics and host APIs. Its screenshots verify browser-adapter layout and keyboard flows, not native OpenTUI cell layout or host shortcut dispatch.

The standalone unit suite and browser fixtures above define this package's verification scope.

## License

MIT
