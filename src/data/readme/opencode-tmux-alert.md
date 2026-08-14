<div align="center">

# opencode-tmux-alert

**Tmux alert plugin for [OpenCode](https://opencode.ai) — get notified when your AI agent needs attention.**

[![npm](https://img.shields.io/npm/v/opencode-tmux-alert?style=flat&logo=npm)](https://www.npmjs.com/package/opencode-tmux-alert)
[![Licence](https://img.shields.io/github/license/undont/opencode-tmux-alert?style=flat&label=licence)](LICENCE)
[![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-green.svg?style=flat)](https://opencode.ai/docs/plugins/)

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Events](#events) · [Customisation](#customisation)

</div>

---

## Quick Start

### Package

Install in your OpenCode config directory:

```bash
bun install opencode-tmux-alert
```

Then add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-tmux-alert"]
}
```

### Local file

Copy `src/index.ts` into your OpenCode plugins directory:

```bash
cp src/index.ts ~/.config/opencode/plugins/opencode-tmux-alert.ts
```

---

## How It Works

When OpenCode needs your attention — a task finishes, a permission is requested, or a question is asked — the plugin triggers a tmux alert on the current window. When you respond, the alert clears automatically.

The bundled scripts do two things:

1. **Set a tmux user option** (`@opencode-alert`) that you can reference in your status line
2. **Send a bell character** (`\a`) which triggers tmux's built-in `monitor-bell` notification

This means alerts work out of the box with a standard tmux config, and can be further customised with status line formatting.

---

## Events

| Event | Trigger | Action |
|-------|---------|--------|
| `session.idle` | Task completed, agent waiting | Alert |
| `permission.updated` | Agent needs permission to proceed | Alert |
| `message.part.updated` | Tool pending approval | Alert |
| `tui.prompt.append` | Agent asking a question | Alert |
| `message.updated` (user) | User submits a message | Clear |

---

## Customisation

### Status line indicator

Use the `@opencode-alert` user option in your tmux status format to show a visual indicator:

```bash
# In tmux.conf — show an indicator when OpenCode needs attention
set -g status-right "#{?@opencode-alert,#[fg=yellow] OpenCode,} ..."
```

### Custom scripts

Override the bundled alert and clear scripts with your own via environment variables:

```bash
export OPENCODE_ALERT_SCRIPT="$HOME/my-scripts/alert.sh"
export OPENCODE_CLEAR_SCRIPT="$HOME/my-scripts/clear.sh"
```

Your scripts receive no arguments. The `TMUX_PANE` environment variable is available if you need to target the current window.

### tmux bell monitoring

To use the bell-based alerts, enable monitoring in your `tmux.conf`:

```bash
set -g monitor-bell on
set -g visual-bell off    # optional — suppress the visual flash
```

---

## Requirements

- [OpenCode](https://opencode.ai) with plugin support
- [tmux](https://github.com/tmux/tmux) — the plugin disables itself gracefully if not running inside tmux

---

## Licence

[MIT](LICENCE)
