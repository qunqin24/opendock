# @ganimalqudhaifi/analyze-image

OpenCode plugin that adds an `analyze_image` tool — enabling the LLM to analyze images using any vision-capable provider you already have configured in OpenCode. No separate API keys, no external services.

## Installation

### npm (recommended)

Register the plugin in your `opencode.json`:

```json
{
  "plugin": ["@ganimalqudhaifi/analyze-image"]
}
```

That's it. OpenCode uses **Bun** to auto-install the plugin and its dependencies at
startup — no `npm install`, no re-export files, no symlinks, no extra steps.

For global use, register it in `~/.config/opencode/opencode.json` instead.

### Manual (for development/testing)

For contributors or when you need to modify the plugin locally. OpenCode auto-loads
all `.ts` / `.js` files in `.opencode/plugins/` at startup — no registration in
`opencode.json` needed.

```bash
git clone https://github.com/ganimalqudhaifi/analyze-image.git
cp analyze-image/index.ts .opencode/plugins/analyze_image.ts
```

Create `.opencode/package.json` so OpenCode can install the plugin's runtime
dependencies via `bun install`:

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "latest"
  }
}
```

Configuration is always read from `~/.config/opencode/analyze_image.json`,
regardless of install method.

## Configuration

All settings are optional — the plugin ships with sensible defaults. Create `~/.config/opencode/analyze_image.json`:

```json
{
  "provider": "google",
  "model": "gemini-3.5-flash",
  "timeout": 120000,
  "fallbacks": [
    { "provider": "google", "model": "gemini-3.1-flash-lite" },
    { "provider": "openai", "model": "gpt-4o-mini" }
  ]
}
```

### Resolution order

Every setting is resolved in this priority chain (higher wins):

| Setting | Tool arg | Env var | Config file | Default |
|---------|----------|---------|-------------|---------|
| Provider | `provider` | `ANALYZE_IMAGE_PROVIDER` | `provider` | `google` |
| Model | `model` | `ANALYZE_IMAGE_MODEL` | `model` | `gemini-3.5-flash` |
| Timeout (ms) | — | `ANALYZE_IMAGE_TIMEOUT` | `timeout` | `120000` (2 min) |
| Fallbacks | — | — | `fallbacks` | `[]` (none) |

Tool args are passed by the LLM at call time (not by you directly), but they take the highest priority if the model provides them.

### Configuration fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | `string` | `"google"` | Provider ID (must be authenticated via `opencode auth login`) |
| `model` | `string` | `"gemini-3.5-flash"` | Model ID for the vision-capable provider |
| `timeout` | `number` | `120000` | Per-attempt timeout in milliseconds |
| `fallbacks` | `FallbackEntry[]` | `[]` | Ordered fallback providers/models tried if the primary fails or times out |

`FallbackEntry`: `{ "provider": string, "model": string }`

### Environment variables

| Variable | Purpose |
|----------|---------|
| `ANALYZE_IMAGE_PROVIDER` | Override the vision provider |
| `ANALYZE_IMAGE_MODEL` | Override the vision model |
| `ANALYZE_IMAGE_TIMEOUT` | Override the per-attempt timeout (milliseconds) |

## How the fallback chain works

1. The plugin attempts the **primary** provider/model first
2. If that times out or errors, it tries each entry in `fallbacks` **in order**
3. The first successful attempt wins
4. Each attempt runs with the same timeout independently
5. If every attempt fails, the tool returns an error listing all failures
6. On timeout, quota exceeded, or other provider failures, the TUI shows a toast before trying the next fallback

```
primary (gemini-3.5-flash) ──timeout/error──▶ fallback[0] (gemini-3.1-flash-lite) ──timeout/error──▶ fallback[1] (gpt-4o-mini)
         │                                              │                                              │
         ▼                                              ▼                                              ▼
      success? → return text                      success? → return text                      success? → return text
                                                                                                     │
                                                                                                     ▼
                                                                                    "All 3 attempts failed: ..."
```

## Image sources

The tool accepts mixed image sources in one analysis through `images`:

```json
{
  "images": [
    { "path": "screenshot.png" },
    { "url": "https://example.com/photo.png" },
    { "base64": "...", "mime": "image/png" }
  ]
}
```

The legacy `image_path`, `image_url`, and `image_base64` arguments remain supported for one image. When the selected model is not vision-capable, clipboard image parts in the message are analyzed together automatically. Each result is labeled with its order and filename, such as `[Clipboard image 1: screenshot.png]` and `[Clipboard image 2: design.webp]`, so the main session can refer to a specific image. Supported image formats: PNG, JPEG, WebP, GIF.

## Tool behavior

### LLM-facing description

The tool registers itself with a description that instructs the LLM to:
- Only call it when the LLM itself cannot read images (text-only model)
- Skip the tool entirely if it can already see/read the image directly

### Internal session

Each analysis creates a short-lived, isolated OpenCode session. The plugin hooks `chat.params` to set:
- `maxOutputTokens`: `64000` (large enough for detailed image descriptions)
- `temperature`: `0.4` (low, for factual image analysis)

The session is deleted immediately after the analysis completes (success or failure), avoiding session clutter.

## Releases

Releases are managed by Release Please from Conventional Commits. Push commits to `main`, then merge the generated Release PR. The publish workflow publishes the tagged GitHub Release to npm.

Set the repository secret `NPM_TOKEN` to an npm automation token with publish access before the first release.

Commit types:

- `fix:` creates a patch release
- `feat:` creates a minor release
- `feat!:` or `BREAKING CHANGE:` creates a major release

## Dependencies

| Package | Purpose |
|---------|---------|
| `@opencode-ai/plugin` | OpenCode plugin SDK (tool registration, session management) |

## Full example

### 1. Install

Add to your `opencode.json`:

```json
{
  "plugin": ["@ganimalqudhaifi/analyze-image"]
}
```

OpenCode + Bun handle the rest at startup.

### 2. Configure

`~/.config/opencode/analyze_image.json`:

```json
{
  "provider": "google",
  "model": "gemini-3.5-flash",
  "timeout": 60000,
  "fallbacks": [
    { "provider": "google", "model": "gemini-3.1-flash-lite" },
    { "provider": "openai", "model": "gpt-4o" }
  ]
}
```

### 3. Use

The LLM calls the tool automatically when it encounters an image it cannot read. You can also prompt:

> Analyze this screenshot and describe the layout

> Describe the image at `./mockups/landing-page.png`

No manual tool invocation needed — the LLM routes to `analyze_image` when it detects an image task it cannot handle natively.
