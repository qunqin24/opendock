# opencode-plugin-teleprompt

Control an active OpenCode TUI session from Telegram.

`opencode-plugin-teleprompt` binds one Telegram channel to one OpenCode session so
you can send prompts, monitor progress, approve tool permissions, answer
OpenCode questions, and receive concise result summaries without being at your
keyboard.

## Highlights

- Send normal Telegram messages as OpenCode prompts.
- Track lifecycle updates: `accepted`, `queued`, `running`,
  `waiting-permission`, `waiting-question`, `completed`, and `failed`.
- Approve or deny OpenCode permission requests from Telegram with inline
  buttons.
- Answer OpenCode question prompts with Telegram inline keyboards, including
  multi-select questions.
- Queue, cancel, retry, interrupt, compact, and switch sessions from Telegram.
- Keep a single active bridge owner with lease-based coordination across
  multiple OpenCode consoles.
- Disconnect cleanly with `/dc`, `/tp:stop`, or a double `Esc` in OpenCode.

## Requirements

- Node.js 20 or newer
- OpenCode with plugin support
- A Telegram bot token
- A Telegram channel where the bot is an admin

## Installation

Add the package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-teleprompt"]
}
```

OpenCode installs npm plugins on startup.

## Telegram Setup

Create a bot with BotFather, add it to your Telegram channel, and make it an
admin. Then provide credentials with environment variables:

```bash
export OPENCODE_TELEGRAM_BOT_TOKEN="..."
export OPENCODE_TELEGRAM_CHANNEL_ID="..."
```

You can also provide credentials for the current OpenCode runtime only:

```text
/tp:start <bot_token> <channel_id>
```

Runtime credentials are cleared when the plugin or session shuts down.

## Quick Start

1. Start OpenCode.
2. Open or create the session you want to control.
3. Run `/tp:start` inside the OpenCode TUI.
4. Send a message in the Telegram channel, for example:

   ```text
   summarize the current repository and suggest the next improvement
   ```

5. Watch lifecycle updates in Telegram.
6. Receive the final summary as a reply to your original Telegram message.
7. Disconnect with `/dc` in Telegram or `/tp:stop` in OpenCode.

While the bridge is active, local prompt input for the bound session is locked so
the Telegram channel remains the active remote control surface.

## How It Works

Teleprompt is a TUI-scoped bridge. It starts only after `/tp:start`, binds to the
current OpenCode session, and polls one configured Telegram channel. Normal
Telegram messages become queued OpenCode prompts. Slash commands manage the
bridge and the session.

When OpenCode asks for a permission decision, Teleprompt sends a Telegram message
with `Approve once`, `Approve always`, and `Deny` buttons. When OpenCode asks a
question, Teleprompt sends each question with option buttons. Tapping a button
replies through the OpenCode SDK and removes the inline keyboard from Telegram.

## Command Reference

### OpenCode Commands

| Command | Description |
| --- | --- |
| `/tp:start` | Bind Teleprompt to the current OpenCode session. |
| `/tp:start <bot_token> <channel_id>` | Start with session-only Telegram credentials. |
| `/tp:credentials <bot_token> <channel_id>` | Store session-only credentials for this runtime. |
| `/tp:status` | Show bridge status in OpenCode. |
| `/tp:stop` | Stop polling, release the bridge, and unlock local input. |

### Telegram Commands

| Command | Description |
| --- | --- |
| `<prompt>` | Queue a prompt. Any message not starting with `/` is treated as input. |
| `/status` | Show bridge status. |
| `/queue` | Show the active prompt and queued prompts. |
| `/cancel <job_id\|last>` | Cancel a queued prompt. |
| `/retry` | Re-queue the most recent prompt. |
| `/interrupt` | Stop the currently running remote prompt. |
| `/context` | Show compact session context. |
| `/compact` | Request OpenCode context compaction. |
| `/newsession` | Create and bind a new OpenCode session. |
| `/reset-context` | Start a fresh session context. |
| `/who` | Show bridge ownership details. |
| `/health` | Show poller, event stream, lease, and queue health. |
| `/reclaim` | Try to reclaim bridge ownership for the current instance. |
| `/history` | Show recent remote runs. |
| `/last-error` | Show the latest failed or interrupted run. |
| `/model` | Show available models and the current model. |
| `/model fast` | Select the `fast` model preset. |
| `/model smart` | Select the `smart` model preset. |
| `/model max` | Select the `max` model preset. |
| `/model <provider>/<model>` | Select an explicit provider/model. |
| `/approve <request_id>` | Approve a pending permission once. |
| `/approve-always <request_id>` | Approve a pending permission persistently when supported. |
| `/deny <request_id>` | Deny a pending permission. |
| `/qreply <request_id>` | Answer an OpenCode question with text fallback syntax. |
| `/qreject <request_id>` | Reject an OpenCode question. |
| `/dc` | Disconnect Teleprompt from Telegram and unbind the session. |

The legacy `/tp <prompt>` and `/tp:<command>` Telegram forms are still accepted
for compatibility.

## Permission And Question Handling

Permission requests are delivered to Telegram with inline buttons:

```text
Approve once | Approve always | Deny
```

Question prompts are delivered with option buttons. Single-choice questions send
the answer immediately when tapped. Multi-choice questions allow toggling options
and then confirming the selected labels.

Text fallbacks are available when inline buttons are not convenient:

```text
/approve <request_id>
/deny <request_id>
/qreply <request_id>
0:TypeScript|Go
1:Postgres
/qreject <request_id>
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `OPENCODE_TELEGRAM_BOT_TOKEN` | none | Telegram bot token. |
| `OPENCODE_TELEGRAM_CHANNEL_ID` | none | Telegram channel ID to accept updates from. |
| `OPENCODE_TELEGRAM_POLL_TIMEOUT_SEC` | `30` | Telegram long-poll timeout. |
| `OPENCODE_TELEGRAM_HEARTBEAT_MS` | `10000` | Bridge heartbeat interval. |
| `OPENCODE_TELEGRAM_LEASE_TTL_MS` | `30000` | Lease expiry for reclaiming stale owners. |
| `OPENCODE_TELEGRAM_SUMMARY_MAX_CHARS` | `1200` | Maximum Telegram summary length. |
| `OPENCODE_TELEGRAM_ONLINE_NOTICE` | `true` | Send notice when the bridge comes online. |
| `OPENCODE_TELEGRAM_OFFLINE_NOTICE` | `true` | Send notice when the bridge goes offline. |

## Current Scope

Teleprompt currently focuses on one reliable remote-control workflow:

- one Telegram channel
- one active bound OpenCode session
- summary replies instead of full transcript mirroring
- explicit `/tp:start` activation per OpenCode runtime

These limits keep bridge ownership and permission handling predictable. Broader
multi-channel or auto-bind behavior can be explored in future releases.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Release verification:

```bash
npm run verify:release
```

`prepublishOnly` runs release verification automatically before `npm publish`.

## Contributing

Issues and pull requests are welcome. Useful reports include:

- OpenCode version
- plugin version
- Node.js version
- the Telegram command or callback involved
- expected behavior
- actual behavior and relevant logs

Please avoid sharing bot tokens, channel secrets, OpenCode credentials, or private
repository content in public issues.

## License

MIT
