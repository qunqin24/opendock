# opencode-link

[![CI](https://github.com/dev3am/opencode-link/actions/workflows/ci.yml/badge.svg)](https://github.com/dev3am/opencode-link/actions/workflows/ci.yml)

Messaging channel bridge for [OpenCode](https://opencode.ai). Control your AI coding session from Discord, Slack, or Telegram.

## Features

- Send prompts to OpenCode from your messaging channel, get AI responses in real-time
- Real-time streaming — watch AI responses update live in the channel
- Slash commands — control sessions from the channel (`/status`, `/sessions`, `/abort`, etc.)
- Permission requests — approve/deny AI actions directly from the channel
- File attachments — send files to OpenCode from the channel
- Session management — auto-pairs with active session, or creates a new one

## Quick Start

```bash
npx opencode-link
```

The interactive setup wizard will guide you through selecting a provider and entering credentials. Then:

```bash
opencode
```

Send a message in your channel to start a session.

---

## Discord Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it → **Create**
3. Go to **Bot** → click **Reset Token** → copy the token (`botToken`)
4. Enable **Message Content Intent** (Bot → Privileged Gateway Intents)
5. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Send Messages in Threads`, `Read Message History`, `Use Slash Commands`
6. Open the generated URL → invite the bot to your server

### 2. Get the Channel ID

Enable Developer Mode: Discord Settings → Advanced → Developer Mode. Right-click the target channel → **Copy Channel ID** (`channelId`).

### 3. Run setup

```bash
npx opencode-link
```

Select **Discord**, enter your Bot Token and Channel ID.

---

## Slack Setup

### 1. Create a Slack App

1. Log in to your Slack workspace at [slack.com](https://slack.com)
2. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App**
3. Choose **From scratch** (or **From a manifest**)
4. Name the app and select your workspace

### 2. Enable Socket Mode

1. Go to **Basic Information** → scroll to **App-Level Tokens**
2. Click **Generate Token and Scopes**
3. Name it (e.g. "socket") → add `connections:write` scope → **Generate**
4. Copy the `xapp-...` token (`appToken`)

### 3. Configure Bot Scopes & Install

1. Go to **OAuth & Permissions** → **Bot Token Scopes** → add:
   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `channels:history` (for public channels)
   - `groups:history` (for private channels)
2. Click **Install to Workspace** → authorize
3. Copy the `xoxb-...` Bot User OAuth Token (`botToken`)

### 4. Enable Event Subscriptions

1. Go to **Event Subscriptions** → toggle **Enable Events** ON
2. Under **Subscribe to bot events** → add:
   - `message.channels` (public channels)
   - `message.groups` (private channels)
3. **Important:** After adding scopes/events, go back to **OAuth & Permissions** → **reinstall your app**

### 5. Create Slash Command

1. Go to **Slash Commands** → **Create New Command**
2. Command: `/opencode` → Request URL: any placeholder (Socket Mode doesn't use it)
3. Save

### 6. Invite Bot to Channel

In the target channel, run:
```
/invite @your-bot-name
```

### 7. Run setup

```bash
npx opencode-link
```

Select **Slack**, enter your Bot Token (`xoxb-...`), App-Level Token (`xapp-...`), and Channel ID.

<details>
<summary>How to get the Channel ID</summary>

Right-click the channel name in Slack → **Copy Link**. The ID is the last part of the URL, e.g. `C0ABC123DEF`. Alternatively, right-click the channel → **Open channel details** → scroll to the bottom.
</details>

---

## Telegram Setup

### 1. Create a Telegram Bot

1. Open Telegram → search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` → follow the prompts to name your bot
3. Copy the provided bot token (`botToken`)

### 2. Get the Chat ID

1. Add the bot to your group or open a direct message with it
2. Send a message to the bot/group
3. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"chat":{"id": ...}` in the response — that's your `channelId`

### 3. Run setup

```bash
npx opencode-link
```

Select **Telegram**, enter your Bot Token and Chat ID.

---

## Permissions

When OpenCode needs approval for an action, interactive buttons appear in the channel:

- **Accept** — allow once
- **Accept Always** — allow permanently
- **Deny** — reject (auto-denied after 5 minutes)

## Configuration

Config is stored in `.opencode/opencode-link.json`:

```json
{
  "provider": "discord",
  "botToken": "your-bot-token",
  "channelId": "your-channel-id"
}
```

For Slack, an additional field is required:

```json
{
  "provider": "slack",
  "botToken": "xoxb-...",
  "appToken": "xapp-...",
  "channelId": "C0..."
}
```

This file is auto-added to `.gitignore`.

## Development

```bash
npm install         # Install dependencies
npm run build       # Build once
npm run dev         # Watch mode (auto-rebuild on changes)
bun test            # Run tests
bun run lint        # Lint check
bun run fmt         # Auto-format code
bun run check       # Run all checks (test + lint + format + typecheck + build)
npm run setup:dev   # Set up local dev environment
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. All PRs require passing CI checks before merge.

## License

MIT
