<h1 align="center">opencode-tmux-signal</h1>

<p align="center">
  Signal opencode agent state in tmux — recolor the session's window when it needs you or finishes, and name it after the session.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-tmux-signal"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-tmux-signal.svg"></a>
  <a href="https://www.npmjs.com/package/opencode-tmux-signal"><img alt="npm downloads" src="https://img.shields.io/npm/dm/opencode-tmux-signal.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/opencode-tmux-signal.svg"></a>
  <img alt="made with vibes" src="https://img.shields.io/badge/made_with-vibes-ff69b4">
</p>

---

Run [OpenCode](https://github.com/anomalyco/opencode) inside tmux and a row of identical `opencode` windows becomes legible at a glance. Each window is recolored by agent state — **yellow** when it wants permission, **purple** on a question, **soft red** when it finishes — and named after the session. The highlight only shows while the window is in the background, and clears the moment you open it.

## Highlights

- **State at a glance** — permission (yellow), question (purple), done/error (soft red); nothing while working or focused.
- **Smart window names** — names follow a priority: an old/resumed session uses its title, a brand-new session uses your first prompt, and the project directory name is only a fallback when an old session has no title. Names are short deterministic slugs (≤ 8 characters), and a name you set yourself is never overwritten.
- **Mark-as-read** — opening the window clears the highlight (on keyboard *and* mouse, via `focus-events` + reset hooks).
- **Sub-agent aware** — child-session events never flash the main window.
- **Zero ceremony** — drives tmux at runtime from `$TMUX_PANE`, and sets up the small bit of tmux config it needs for you.

## Install

```bash
opencode plugin opencode-tmux-signal -g
```

This installs the package globally and updates your `opencode.json` automatically.

Or manually:

```bash
npm install -g opencode-tmux-signal
```

Then add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-tmux-signal"]
}
```

Requires tmux 3.0+. On first run it adds a small managed block to your `~/.tmux.conf` (focus events + a reset hook) so the highlight clears reliably; disable with `OPENCODE_TMUX_SIGNAL_MANAGE_TMUX_CONF=off`.

## Configuration

Everything is optional and set via environment variables. Defaults are a mellow palette that pairs with a green status bar.

| Variable | Default | Description |
| --- | --- | --- |
| `OPENCODE_TMUX_SIGNAL_PERMISSION_BG` / `_FG` | `colour179` / `black` | Permission-request colors (yellow) |
| `OPENCODE_TMUX_SIGNAL_QUESTION_BG` / `_FG` | `colour97` / `white` | Question colors (purple) |
| `OPENCODE_TMUX_SIGNAL_DONE_BG` / `_FG` | `colour131` / `white` | Done/error colors (soft red) |
| `OPENCODE_TMUX_SIGNAL_WINDOW_NAME` | `llm` | `llm` (model slug with deterministic fallback), `dir` (project directory), or `off` |
| `OPENCODE_TMUX_SIGNAL_NAME_MODEL` | `github-copilot/gpt-4o-mini` | Direct model used for window naming. Currently supports GitHub Copilot auth from opencode's auth store |
| `OPENCODE_TMUX_SIGNAL_NAME_TIMEOUT_MS` | `2500` | Maximum time for the direct naming model call, clamped to 500-10000 ms |
| `OPENCODE_TMUX_SIGNAL_RESET_ON_FOCUS` | `on` | Clear the highlight when you open the window |
| `OPENCODE_TMUX_SIGNAL_MANAGE_TMUX_CONF` | `on` | Manage the `~/.tmux.conf` block |
| `OPENCODE_TMUX_SIGNAL_DEBUG` | _(unset)_ | Log decisions to `/tmp/opencode-tmux-signal.log` |

Colors accept any tmux color: `red`, `brightblue`, or `colour0`–`colour255`.

## How it works

- The window is resolved once from `$TMUX_PANE`, so multi-pane layouts target the right window.
- State is colored with `window-status-style`. It's only applied when the window is in the background — if you're already on the window when the state changes, it stays unhighlighted — and a `pane-focus-in` / `after-select` hook clears it when you return to a highlighted window.
- Names use a direct GitHub Copilot model call with a short timeout, then deterministic local fallback. The plugin does not create hidden opencode sessions or call `client.session.prompt` for naming, so naming does not write messages/parts into opencode's session database.
- It only renames a window whose name is still a bare process name (`opencode`, `nano`, …) or one it set itself — never a custom name.
- Sub-agent sessions (those with a `parentID`) are tracked and ignored, so a finishing sub-agent never flashes the main window.

## Development

```bash
bun install
bun run typecheck
bun run build
```

## Releasing

```bash
npm version patch && git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) handles npm (Trusted Publishing + provenance) and the GitHub Release.

## License

[MIT](./LICENSE)
