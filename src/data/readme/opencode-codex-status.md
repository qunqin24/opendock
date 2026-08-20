# opencode-codex-status

An OpenCode TUI plugin that shows your ChatGPT Codex quota in the session sidebar.

It reads your usage from the Codex CLI's own endpoint using credentials that opencode already stores. Checking quota does not consume any of your quota.

## Installation

Install the plugin with OpenCode's native installer:

```sh
opencode plugin opencode-codex-status --global
```

Or via npx:

```sh
npx opencode-codex-status install
```

For project-local testing, use OpenCode's project scope:

```sh
opencode plugin opencode-codex-status
```

Or via npx:

```sh
npx opencode-codex-status install --project
```

Restart OpenCode after installing.

## Usage

It uses the OpenAI credentials OpenCode already stores. No extra auth setup is needed.

Once loaded, the quota display appears in the TUI sidebar. Run `/codex-status` to force a refresh, or `/codex-status-toggle` to show/hide the display on the fly.

## Configuration

The installer writes a plugin entry in `tui.json`. To change options, edit that entry:

```json
{
  "plugin": [["opencode-codex-status", { "pollMs": 60000 }]]
}
```

| Option       | Default  | Description                                                                                      |
| ------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `pollMs`     | `300000` | Polling interval in milliseconds                                                                 |
| `retryCount` | `1`      | Retries on transient failure                                                                     |
| `authPath`   | (auto)   | Path to the auth JSON file                                                                       |
| `enabled`    | `true`   | Start with the sidebar display hidden when `false`; toggle at runtime via `/codex-status-toggle` |

## How it works

The plugin fetches your Codex usage data on startup and periodically every 5 minutes (configurable). It also refreshes after each step completes.

Each quota window shows a label, a progress bar, remaining percent, and estimated time until reset. Error states and stale data are displayed inline.

## Project structure

```txt
src/
  tui.tsx      – TUI plugin entrypoint and View component
  client.ts    – Auth reading and API fetch
  config.ts    – Plugin option parsing
  format.ts    – Text formatting for bars, times, labels
  manual.ts    – /codex-status command handler
  quota.ts     – Type definitions
  refresh.ts   – Polling and activity-triggered refresh loop
  store.ts     – Solid signal store for quota state
test/
  ...          – Vitest tests covering all modules
```
