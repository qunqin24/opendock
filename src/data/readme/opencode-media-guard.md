# opencode-media-guard

Stop screenshots from breaking your OpenCode sessions.

## The Problem

Screenshots silently destroy OpenCode sessions. A single fullPage screenshot can exceed Anthropic's 8000px limit and crash the API call. Accumulated images eat your context window — each screenshot consumes thousands of tokens, pushing out conversation history and triggering premature compaction. You lose work, and you never see it coming.

## What This Fixes

**Install the plugin. Take screenshots without worrying about limits.**

- Images that exceed Anthropic's limits are blocked before they enter context — saved to disk so you don't lose them
- The model tracks your image budget and warns you before it runs out
- When you hit the limit, the model asks before compacting — you stay in control
- You see exactly how much of your context window images are consuming

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugin": ["opencode-media-guard"]
}
```

Restart OpenCode. No `npm install`, no configuration needed.

## What You'll See

**Normal usage** — screenshots work exactly as before. No interruption.

**Approaching the limit** — the model tells you:

> "Heads up — 2 screenshots remain before new screenshots will be blocked. To free up capacity, I can summarize the conversation and remove old images. Your key findings are preserved, but the exact conversation history is replaced with a summary. Want to keep going or clean up now?"

**At the limit** — new screenshots are saved to `~/opencode-media-guard/` and the model asks:

> "The image budget is full. That screenshot was saved to disk but couldn't be added to context. I can free up capacity by summarizing the conversation — this preserves key findings but replaces the full history with a shorter summary. Want me to proceed?"

**After cleaning up** — budget resets, screenshots work again. Key observations from earlier screenshots are preserved in the summary.

**Context visibility** — the model sees your usage and can report it:

```
Images: 5/20 (15 remaining)
Context: ~45,200/1000K tokens (4.5%) — images: ~12,800 (1.3%), text: ~32,400
```

## What It Enforces

Every Anthropic image limit, automatically:

| Limit | Default | Blocked images are... |
|-------|---------|----------------------|
| Dimensions (up to 20 images) | 8000px | Saved to disk, replaced with text |
| Dimensions (>20 images) | 2000px | Same — stricter limit kicks in automatically |
| Per-image size | 5 MB | Saved to disk, replaced with text |
| Image budget | 20 per session | Saved to disk, model asks to compact |

Blocked images are always saved to `~/opencode-media-guard/` — nothing is lost.

## Configuration

All defaults match Anthropic's current API limits. Override via environment variables if needed:

| Variable | Default | What it controls |
|----------|---------|-----------------|
| `MEDIA_GUARD_MAX_CONTEXT_IMAGES` | `20` | Image budget per session |
| `MEDIA_GUARD_MAX_DIMENSION` | `8000` | Max pixels per image dimension |
| `MEDIA_GUARD_MAX_IMAGE_BYTES` | `5242880` | Max bytes per image (5MB) |
| `MEDIA_GUARD_CONTEXT_WINDOW_TOKENS` | `1000000` | Context window size for % display |

<details>
<summary>All configuration options</summary>

| Variable | Default | Description |
|----------|---------|-------------|
| `MEDIA_GUARD_MAX_DIMENSION` | `8000` | Max px per dimension (single-image mode) |
| `MEDIA_GUARD_MAX_DIMENSION_MULTI` | `2000` | Max px per dimension when >20 images |
| `MEDIA_GUARD_MULTI_THRESHOLD` | `20` | Image count that triggers stricter dimension limit |
| `MEDIA_GUARD_MAX_IMAGE_SIZE` | `5242880` | Anthropic's per-image byte limit |
| `MEDIA_GUARD_MAX_IMAGE_BYTES` | `5242880` | Plugin's hard enforcement threshold |
| `MEDIA_GUARD_MAX_PAYLOAD_SIZE` | `33554432` | Max total payload (32MB) |
| `MEDIA_GUARD_MAX_IMAGES` | `100` | Max images per API request |
| `MEDIA_GUARD_MAX_CONTEXT_IMAGES` | `20` | Image budget per session |
| `MEDIA_GUARD_CONTEXT_WINDOW_TOKENS` | `1000000` | Context window size for % display |

</details>

## Known Limitations

- **User-attached images are counted but not blocked.** Images you attach via `--file` or drag-drop count toward the budget, but the plugin can't intercept them at entry. Budget enforcement applies to subsequent tool screenshots.
- **Token counts are approximate.** Text tokens use a chars/4 heuristic. Image tokens use Anthropic's formula. No enforcement depends on token counts — they're display-only.
- **FullPage screenshots of very long pages** may be saved to a temp file by Chrome DevTools before the plugin sees them.

## Stability (v0.1.0)

This is a beta release. The core protection uses OpenCode's stable `tool.execute.after` hook. Enhanced features (budget display, token tracking, automatic compaction) use experimental hooks that may change.

If experimental hooks break, the plugin degrades gracefully — images are still blocked, but the model can't proactively warn you about the budget. You'd run `/compact` manually instead of the model doing it automatically.

<details>
<summary>Detailed dependency risk assessment</summary>

| Dependency | Stability | If it breaks | Impact |
|---|---|---|---|
| `tool.execute.after` | Stable | All enforcement stops | Critical — lowest risk |
| `experimental.chat.system.transform` | Undocumented | No budget display | Medium — blocking still works |
| `experimental.chat.messages.transform` | Undocumented | No user-image counting | Low |
| `session.idle` event | Undocumented | No auto-compaction | Low — manual `/compact` works |
| Bun runtime | Stable | Plugin won't load | Would need build step |
| Token count heuristic (chars/4) | Approximate | Less accurate counts | Display-only, no enforcement impact |
| Anthropic API limits | Current | Defaults may drift | All overridable via env vars |

</details>

## License

MIT
