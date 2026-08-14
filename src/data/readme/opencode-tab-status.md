# opencode-tab-status

Show OpenCode running status in the **terminal tab title** (Windows Terminal /
ConEmu / Tabby / VS Code integrated terminal) via OSC 0 escape sequences.

Pure OpenCode plugin — **zero dependencies, zero companion process, zero wrapper**.
Drop it in (or add one line to `opencode.json`) and the tab title updates live as
OpenCode works.

## Status shown

Tab title layout (status first, then task, then details):

```
<状态图标> · <标题> · <模型> · [<工具>] · <用量>
```

By default the status is shown as **icon only** (e.g. ✅, 💭) to save tab
space — no "完成/思考" text. Set `STATUS_TAB_ICON_ONLY=0` to show the labels.

| Icon | Meaning            | When |
|------|--------------------|------|
| 🌱   | 空闲 (fresh)       | just opened, no session yet |
| 💭   | 思考 (thinking)    | model is generating |
| 🔧   | 工具 (tool)        | running a tool (name shown) |
| ✅   | 完成 (done)        | turn finished — you can type again |
| ⏳   | 等待 (waiting)     | paused, needs your input (permission / ask) |
| ⚠️   | 错误 (error)       | session error |
| 🗜️   | 压缩 (compacting)  | session compaction |

Switching to an existing session shows its title + model (✅) instead of a
blank idle. A transient idle between sub-steps (e.g. right after a tool like
Edit/Wrote) does **not** flash "完成" — only a true end-of-turn does.

## Install

### Via npm (recommended)

Add the package to your `opencode.json`:

```json
{
  "plugin": ["opencode-tab-status"]
}
```

OpenCode installs it automatically on next start (via Bun). That's it.

### Local (no npm)

Copy the plugin entry into your plugins directory:

```bash
# global (all projects)
cp plugins/opencode-tab-status.js ~/.config/opencode/plugins/

# or per-project
cp plugins/opencode-tab-status.js .opencode/plugins/
```

Then just run `opencode`.

## Configuration

All configuration is via environment variables (zero-config by default):

| Variable | Values | Default | Effect |
|----------|--------|---------|--------|
| `STATUS_TAB_LANG` | `zh` \| `en` | `zh` | status label language |
| `STATUS_TAB_ICON_ONLY` | `0` | `1` (on) | icon-only status (default). Set `0` to also show 完成/思考 text |
| `STATUS_TAB_NO_EMOJI` | `1` | off | use plain text instead of emoji icons |
| `STATUS_TAB_FIELDS` | `status,title,model,tool,usage` | all | field order / which to show |
| `STATUS_TAB_NOTIFY` | `1` | off | ring the terminal bell on done/error (error also flashes) |

Example (PowerShell profile):

```powershell
$env:STATUS_TAB_NOTIFY = "1"
$env:STATUS_TAB_LANG = "en"
```

## Notifications

When `STATUS_TAB_NOTIFY=1`:

- **Turn finished (✅完成)** → terminal bell (BEL).
- **Error (⚠️错误)** → terminal bell **and** a brief reverse-video flash.

This is zero-dependency and cross-platform (Windows Terminal honors the bell
when "Bell notification" is enabled). For native OS toast notifications, use the
OpenCode desktop app, which sends them automatically.

## Development & tests

```bash
git clone https://github.com/xwh5/opencode-tab-status.git
cd opencode-tab-status
npm test          # runs node --test on the pure state machine
```

The status logic lives in `src/status.js` (pure, side-effect-free) and is
covered by `test/status.test.mjs`. The plugin entrypoint
(`plugins/opencode-tab-status.js`) inlines the same logic so it loads with no
relative-import fragility, and wraps it with OSC output + notifications.

## License

MIT
