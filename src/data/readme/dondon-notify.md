# opencode-notify

> Know when your AI needs you back. Native OS notifications for OpenCode.

A plugin for [OpenCode](https://github.com/sst/opencode) that delivers native desktop notifications when tasks complete, errors occur, or the AI needs your input. Stop tab-switching to check if it's done.

## Why This Exists

You delegate a task and switch to another window. Now you're checking back every 30 seconds. Did it finish? Did it error? Is it waiting for permission?

This plugin solves that:

- **Stay focused** - Work in other apps. A notification arrives when the AI needs you.
- **Native feel** - Uses macOS Notification Center, Windows Toast, or Linux notify-send.
- **Smart defaults** - Won't spam you. Only notifies for meaningful events, and only when you're not already looking at the terminal.

## Installation

**Option 1: Local install (recommended for development)**

Copy the plugin directly:

```bash
mkdir -p .opencode/plugin
cp /path/to/opencode-notify/src/notify.ts .opencode/plugin/dondon-notify.ts
cp -r /path/to/opencode-notify/src/plugin/kdco-primitives .opencode/plugin/
cd .opencode && bun add node-notifier detect-terminal
```

Then add to your `opencode.jsonc`:
```jsonc
{
  "plugin": ["dondon-notify"]
}
```

**Option 2: Via OCX with local file:// registry**

Add to your project's `ocx.jsonc`:
```jsonc
{
  "registries": {
    "local": {
      "url": "file:///path/to/opencode-notify"
    }
  }
}
```

Then install:
```bash
ocx add local/dondon-notify
```

## How It Works

> "Notify the human when the AI needs them back, not for every micro-event."

| Event | Notifies? | Sound | Why |
|-------|-----------|-------|-----|
| Session complete | Yes | Glass | Main task done - time to review |
| Session error | Yes | Basso | Something broke - needs attention |
| Permission needed | Yes | Submarine | AI is blocked, waiting for you |
| Sub-task complete | No | - | Parent session handles orchestration |

The plugin automatically:
1. Detects your terminal emulator (supports 37+ terminals)
2. Suppresses notifications when your terminal is focused
3. Enables click-to-focus on macOS (click notification → terminal foregrounds)

## Platform Support

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Native notifications | Yes | Yes | Yes |
| Custom sounds | Yes | No | No |
| Focus detection | Yes | No | Kitty, GNOME Terminal* |
| Click-to-focus | Yes | No | Kitty |
| Terminal detection | Yes | Yes | Yes |

\* Focus detection on Linux requires xprop and is currently implemented for Kitty

## Configuration (Optional)

Works out of the box. To customize, create `~/.config/opencode/dondon-notify.json`:

```json
{
  "enabled": true,
  "notifyChildSessions": false,
  "suppressWhenFocused": true,
  "sounds": {
    "idle": "Glass",
    "error": "Basso",
    "permission": "Submarine"
  },
  "kitty": {
    "enabled": true,
    "sounds": false,
    "focusOnClick": true
  }
}
```

**Available macOS sounds:** Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

**Kitty configuration:** The `kitty` section allows you to customize Kitty-specific behavior:
- `enabled`: Use native Kitty notifications (default: true)
- `sounds`: Enable notification sounds (default: false, Kitty doesn't support sounds)
- `focusOnClick`: Focus terminal when notification is clicked (default: true)

## FAQ

### Does this add bloat to my context?

Minimal footprint. The plugin is event-driven - it listens for session events and fires notifications. No tools are added to your conversation, no prompts are injected beyond initial setup.

### Will I get spammed with notifications?

No. Smart defaults prevent noise:
- Only notifies for parent sessions (not every sub-task)
- Suppresses when your terminal is the active window
- Batches notifications when multiple delegations complete together

### Can I disable it temporarily?

Set `"enabled": false` in the config file, or delete the config to return to defaults.

## Supported Terminals

Uses [`detect-terminal`](https://github.com/jonschlinkert/detect-terminal) to automatically identify your terminal. Supports 37+ terminals including:

Ghostty, Kitty, iTerm2, WezTerm, Alacritty, Hyper, Terminal.app, Windows Terminal, VS Code integrated terminal, and many more.

### Enhanced Kitty Support

When running in **Kitty on Linux**, the plugin provides enhanced features:

- **Native Kitty notifications** using OSC 99 escape codes for better integration
- **Click-to-focus** notifications automatically bring Kitty to the foreground
- **Improved focus detection** using xprop and Kitty's WINDOWID
- **Optimized performance** with direct terminal communication

Kitty notifications are more responsive and integrate seamlessly with the terminal environment.

## Manual Installation

If you prefer not to use OCX, copy the source from [`src/`](./src) to `.opencode/plugin/`.

**Caveats:**
- Manually install dependencies (`node-notifier`, `detect-terminal`)
- Updates require manual re-copying

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with [OpenCode](https://github.com/sst/opencode) in any way.

## License

MIT
