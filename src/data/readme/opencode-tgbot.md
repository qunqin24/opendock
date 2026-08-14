# opencode-tgbot

Telegram remote control for [OpenCode](https://github.com/nicepkg/opencode). Monitor sessions, send prompts, answer questions, and manage tasks from your phone.

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-tgbot"]
}
```

## Setup

### 1. Create a Telegram Bot

- Message [@BotFather](https://t.me/BotFather) on Telegram and create a new bot
- Copy the bot token

### 2. Get Your Chat ID

- Message [@userinfobot](https://t.me/userinfobot) and it will reply with your chat ID

### 3. Configure

Create `~/.config/opencode/opencode-notifier.json`:

```json
{
  "telegram": {
    "enabled": true,
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

Restart OpenCode. The bot will start polling automatically.

## Cross-Machine Sync (Upstash Redis)

If you run OpenCode on multiple machines, add [Upstash Redis](https://upstash.com) to share sessions across all of them. Create a free Upstash Redis database, then add it to your config on each machine:

```json
{
  "telegram": {
    "enabled": true,
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "upstash": {
    "url": "https://your-db.upstash.io",
    "token": "YOUR_UPSTASH_TOKEN"
  }
}
```

With Upstash configured:

- `/sessions` and `/status` show sessions from all machines, grouped by hostname
- Commands (prompts, stop, cancel) are routed to the correct machine via SSE pub/sub
- Only one instance across all machines polls Telegram (distributed lock with automatic failover)
- Questions from any machine can be answered through the bot
- Falls back to local-only mode if Upstash is unreachable

Without Upstash, multiple OpenCode instances on the same machine still share state via local files in `~/.config/opencode/notifier/`.

## Commands

| Command | Description |
|---|---|
| `/sessions` | List all sessions (grouped by machine if Upstash is configured). Reply with a number to connect. |
| `/status` | Show active sessions with current tool, output preview, and tasks |
| `/connect` | Show connected session details, or pass a number/session ID prefix to connect |
| `/disconnect` | Disconnect from the current session |
| `/todos` | Show the task list for the connected session |
| `/new <message>` | Create a new session with an initial prompt |
| `/stop` | Abort the connected session |
| `/cancel` | Abort all active sessions (broadcasts to all machines with Upstash) |
| `/mute` / `/unmute` | Toggle push notifications |
| `/help` | Show the command list |

## Usage

**Connecting to a session:**

1. `/sessions` to see what's running
2. Reply with a number (e.g. `1`) to connect
3. Type any message to send it as a prompt to that session
4. Type another number to switch sessions
5. `/disconnect` when done

**Answering questions:** When OpenCode asks a question (e.g. the `question` tool, permission prompts), you'll see numbered options. Reply with `a1`, `a2`, etc. to pick one, or `a: your custom answer` for free-text. Plain numbers always switch sessions, never answer questions.

## Notifications

Push notifications are sent for session completion, errors, permission requests, questions, and interruptions. Each completion notification includes a summary with session title, duration, file change stats, tools used, and an output preview.

Toggle individual event types:

```json
{
  "telegram": {
    "enabled": true,
    "botToken": "...",
    "chatId": "...",
    "events": {
      "permission": true,
      "complete": true,
      "subagent_complete": false,
      "error": true,
      "question": true,
      "interrupted": true
    }
  }
}
```

## Full Config Reference

All options for `~/.config/opencode/opencode-notifier.json`:

```json
{
  "telegram": {
    "enabled": true,
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID",
    "events": {
      "permission": true,
      "complete": true,
      "subagent_complete": false,
      "error": true,
      "question": true,
      "interrupted": true
    }
  },
  "upstash": {
    "url": "https://your-db.upstash.io",
    "token": "YOUR_UPSTASH_TOKEN"
  },
  "showProjectName": true,
  "showSessionTitle": false,
  "messages": {
    "permission": "Session needs permission: {sessionTitle}",
    "complete": "Session has finished: {sessionTitle}",
    "subagent_complete": "Subagent task completed: {sessionTitle}",
    "error": "Session encountered an error: {sessionTitle}",
    "question": "Session has a question: {sessionTitle}",
    "interrupted": "Session was interrupted: {sessionTitle}"
  }
}
```

| Option | Default | Description |
|---|---|---|
| `telegram.enabled` | `false` | Enable the Telegram bot |
| `telegram.botToken` | `""` | Bot token from @BotFather |
| `telegram.chatId` | `""` | Your Telegram chat ID |
| `telegram.events.*` | varies | Toggle individual notification types |
| `upstash.url` | — | Upstash Redis REST URL (optional) |
| `upstash.token` | — | Upstash Redis REST token (optional) |
| `showProjectName` | `true` | Include project folder name in notifications |
| `showSessionTitle` | `false` | Include session title in notification messages |
| `messages.*` | — | Customize notification text. Supports `{sessionTitle}` and `{projectName}` placeholders |

## Troubleshooting

**Bot not responding?**
- Verify `botToken` and `chatId` in the config
- Check `~/.config/opencode/notifier-poll.lock` — delete it if the owning process is dead
- With Upstash, the distributed lock has a 30s TTL and auto-recovers

**Not getting notifications?**
- Check `telegram.enabled` is `true`
- Check per-event toggles in `telegram.events`
- Try `/unmute` in case you muted the bot

## License

MIT
