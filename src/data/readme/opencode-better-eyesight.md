# opencode-better-eyesight

[![npm](https://img.shields.io/npm/v/opencode-better-eyesight)](https://www.npmjs.com/package/opencode-better-eyesight)

Image understanding for [opencode](https://opencode.ai). Agents get an `eyesight` tool that asks a vision model about an image: the clipboard, something pasted into the conversation, a file path, or a URL. The vision call is routed through opencode itself (`session.prompt`), so it uses whatever providers and models opencode already has configured. Nothing here talks to a vendor API directly.

Most useful with text-only coding models, which otherwise can't see the screenshots you paste.

## Setup

From npm:

```jsonc
// opencode.json / opencode.jsonc in the project root
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-better-eyesight", { "model": "openrouter/dots-studio/dots-3-note-preview:free" }]
  ]
}
```

Or from a local checkout (for development):

```jsonc
{ "plugin": [["./opencode-better-eyesight/index.ts", { "model": "..." }]] }
```

For the local path variant, run `bun install` in `opencode-better-eyesight/` first, then restart opencode. The npm variant handles that itself.

`model` is optional, in opencode's `provider/model-id` format. Without it, the vision call uses opencode's default model.

Requires opencode 1.18 or newer (built and tested against 1.18.18; the entry point is TypeScript, which opencode loads via Bun).

## Usage

Paste or attach an image. The plugin saves it to a stable path and appends a short note to your message telling the agent to call `eyesight`. Nothing is sent to a model at that point, so pasting is instant. Set `autoAnalyze: false` to skip the note entirely.

Tool arguments:

- `source` (required): `attached` (most recent image in the conversation), `clipboard`, a file path, an attached image's filename, an https URL, or a data: URL.
- `question`: what to ask. If omitted, your recent messages are forwarded as context.
- `model`: per-call override, `provider/model-id`.
- `detail`: `brief`, `normal` (default), or `exhaustive`.
- `fresh`: re-ask, skipping the cache.

Typical flow: paste a screenshot and ask "what error is this?" — the agent calls `eyesight` with the image and your question, then relays the answer. You can also name a model in chat ("use gemini for this one") and the agent passes it as `model`.

## How it works

1. Resolves and hashes the image, writes it to `<cacheDir>/images/<hash>.<ext>`.
2. Builds the prompt from the `question` argument or your recent messages (plugin-injected blocks are stripped from the context).
3. Creates a child session linked to the current one (`parentID`).
4. Sends it via `session.prompt` with the configured model and a registered tool-less agent, so the vision call cannot run tools itself.

Calls are stateless by default: one session, one image, one question. With `history: true`, one session per image is reused so follow-up questions share the vision model's context; the image is only uploaded with the first question.

Answers are cached in `<cacheDir>/responses/`, keyed by model, question, detail level, and image hash. Identical asks return from cache with no model call, and concurrent identical calls are deduped.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `model` | opencode default | Vision model, `provider/model-id`. |
| `history` | `false` | Reuse one session per image for multi-turn Q&A. |
| `autoAnalyze` | `true` | Inject image pointers into messages containing images. |
| `timeoutMs` | `120000` | Per-call limit; the child session is aborted after it. |
| `fetchTimeoutMs` | `30000` | Timeout for downloading URL images. |
| `maxHistoryMessages` | `4` | How many user turns to forward as context. |
| `contextChars` | `4000` | Cap on forwarded context. |
| `cacheTtlHours` | `168` | Cache lifetime; `0` disables caching. |
| `maxImageBytes` | `10485760` | Image size limit (10 MB). |
| `cacheDir` | `~/.cache/opencode-better-eyesight` | Where images and cached answers live. |
| `agent` | `eyesight` | Name of the registered vision agent. |
| `enabled` | `true` | Set `false` to disable the plugin. |

Environment overrides: `EYESIGHT_MODEL`, `EYESIGHT_HISTORY=1`, `EYESIGHT_AUTO_ANALYZE=0`, `EYESIGHT_CACHE_TTL_HOURS`, `EYESIGHT_CACHE_DIR`, `EYESIGHT_DISABLE=1`.

## Development

```sh
cd opencode-better-eyesight
bun install
bun run typecheck
bun test
```

## Notes

- Images are sent as-is; there is no resizing. Very large screenshots can exceed a provider's input limit.
- Clipboard capture supports macOS (osascript) and Linux (wl-paste / xclip).
- Text read out of images is treated as untrusted data in every prompt. Instructions inside a screenshot are reported as content, never followed.

The paste-pointer and guarded-block patterns come from [opencode-senses](https://github.com/itsmeadarsh2008/opencode-senses); the tool-call shape is similar to [openrouter-image-mcp](https://github.com/JonathanJude/openrouter-image-mcp).
