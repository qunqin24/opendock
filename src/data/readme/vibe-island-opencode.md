# vibe-island-opencode

OpenCode plugin for [Vibe Island](https://vibeisland.app) — the macOS app that lives in your notch and monitors AI coding sessions in real time.

> **Vibe Island** ([vibeisland.app](https://vibeisland.app)) is a native macOS app that shows your AI agent's activity directly in the notch: session status, tool calls, permissions, and more. This plugin bridges OpenCode to Vibe Island.

Supports **local** (Unix socket) and **remote** (TCP via SSH reverse tunnel) connections.

## Features

- Full session lifecycle: start, busy/idle tracking, stop
- Tool execution tracking (PreToolUse / PostToolUse)
- Permission request interception (blocking — reply from Vibe Island UI)
- Automatic connection: TCP first (for SSH remote), Unix socket fallback (for local)
- Rate-limit retry awareness
- Session error handling (abort → immediate Stop)

## Installation

### Quick install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/arkan/vibe-island-opencode/main/install.sh | bash
```

### Manual install

```bash
git clone https://github.com/arkan/vibe-island-opencode.git /tmp/vi-oc
mkdir -p ~/.config/opencode/plugins
cp /tmp/vi-oc/index.js ~/.config/opencode/plugins/vibe-island-opencode.js
```

Then add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "file:///home/YOUR_USER/.config/opencode/plugins/vibe-island-opencode.js"
  ]
}
```

### npm install

```bash
npm install -g vibe-island-opencode
# Then run the installer:
bash <(npm root -g)/vibe-island-opencode/install.sh
```

Or add the npm package directly to `opencode.json`:

```json
{
  "plugin": ["vibe-island-opencode@latest"]
}
```

## How it works

```
OpenCode (VPS)                         Vibe Island (Mac)
┌──────────────────────┐    SSH -R     ┌─────────────────────────┐
│ Plugin (index.js)    │──► TCP 17891─┼──► Listener :17891 ───► │
│                      │   tunnel     │   Notch UI              │
└──────────────────────┘              └─────────────────────────┘
```

1. Vibe Island on the Mac creates a reverse SSH tunnel: `ssh -R 17891:127.0.0.1:17891 user@vps`
2. The plugin connects to `127.0.0.1:17891` on the VPS
3. Data flows through the SSH tunnel back to Vibe Island on the Mac
4. When running locally, the plugin falls back to the Unix socket

## Configuration

| Env var | Default | Description |
|---|---|---|
| `VIBE_ISLAND_HOST` | `127.0.0.1` | TCP host for remote connections |
| `VIBE_ISLAND_PORT` | `17891` | TCP port for remote connections |
| `VIBE_ISLAND_TIMEOUT` | `3000` | Connection timeout in ms |

## Event mapping

| OpenCode event | Vibe Island event |
|---|---|
| `session.created` | `SessionStart` |
| `session.deleted` | `SessionEnd` |
| `session.status {busy}` | `UserPromptSubmit` |
| `session.status {idle}` | `Stop` |
| `session.status {retry}` | `Notification` |
| `session.error` | `Stop` |
| `session.idle` | `Stop` |
| `message.part.updated` (tool) | `PreToolUse` / `PostToolUse` |
| `permission.asked` | `PermissionRequest` (blocking) |

## License

MIT
