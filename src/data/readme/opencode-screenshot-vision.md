# opencode-screenshot-vision

Give a text-only LLM the ability to read screenshots during browser-testing workflows — local-first.

## What problem does this solve?

Text-only models can drive a browser through an MCP server but cannot read the screenshots the browser sends back. When a test step needs to verify what is actually on screen, the model is blind.

`opencode-screenshot-vision` is an [OpenCode](https://opencode.ai) plugin that closes this gap. It exposes a single `vision` tool to the model. The model calls that tool, and the tool sends the screenshot to a vision-capable backend and returns a plain-text description. The text-only model never gains vision itself — it just receives a description it can reason over.

## Positioning

This plugin exists for one specific job: **screenshots for browser-testing workflows, local-first.**

It is *not* a general-purpose "vision for text-only models" package. That space is crowded, and the auto-transparent packages in [Related work](#related-work) serve pasted images more smoothly than this plugin does (this one still needs a manual `vision()` call for them). This project focuses on the browser-testing flow — screenshots captured by Browser MCP — which those packages do not cover, and it prioritizes free, local inference before falling back to any cloud service.

This is a parallel project built for learning, not a competitor claiming to replace the earlier work. The differences are spelled out below.

## What this project adds

1. **Browser MCP screenshot capture.** Browser MCP returns screenshots inline in the raw tool result; those results never pass through the message-transform pipeline (verified), so the auto-transparent packages do not cover the browser-testing flow. This plugin captures them via a `tool.execute.after` hook on the raw MCP result.
2. **Local-first and free.** The primary tier is a local OpenAI-compatible runtime (free, private, no API key), then OpenCode Zen free, then Zen paid.
3. **File mode.** `vision(path=...)` reads any screenshot saved to disk, regardless of the tool that produced it (Playwright, Selenium, Puppeteer, Cypress, a manual capture, …).
4. **Prompt-injection defense** in the vision prompt.

## Features

- Single `vision` tool — one call, no new workflow to learn.
- Reads screenshots from three sources: the latest browser screenshot, a pasted/dropped image in the conversation, or a file on disk.
- Automatic fallback across three backends: a local OpenAI-compatible runtime, then OpenCode Zen free, then Zen paid.
- Direct HTTP calls to the vision backends, rather than opencode's model path: in testing, an image attached through opencode did not reach the local Ollama model, while a direct HTTP call to Ollama did.
- Built-in safety: prompt-injection defense, path containment, MIME sniffing, a 10 MB size limit, and a 2,048-token output cap.

## How it works

The plugin registers three things when opencode starts:

1. A `vision` tool the model can call.
2. A `tool.execute.after` hook that captures the image whenever a browser screenshot tool runs.
3. A `chat.message` hook that captures pasted/dropped images from incoming messages.

### The three flows

**Browser MCP (inline).** When a [Browser MCP](https://browsermcp.io) server captures a screenshot, the image is returned inline in the tool result (`{ content: [{ type: "image", ... }] }`) — it never touches disk. The `tool.execute.after` hook captures it in memory, and calling `vision` with no arguments describes the most recent captured screenshot.

**Pasted / dropped image.** A pasted or dropped image arrives as a file part on the incoming message. The `chat.message` hook captures it, and calling `vision` with no arguments describes it. (The auto-transparent packages do this without the manual call.)

**File on disk (any tool).** When a screenshot is saved as a file — by Playwright, Selenium, Puppeteer, Cypress, or anything else — the model calls `vision` with a `path` argument. The plugin reads and validates that file directly.

All flows converge on the same `describe` step: encode the image, send it to a backend, and return the text description.

### Fallback chain

Each tier is tried only if the previous one fails with an error or a timeout. The paid tier retries once without the `reasoning` parameter if the API rejects it with HTTP 400 (the backend does not accept `reasoning` in non-reasoning mode).

| Tier | Backend | Model | Cost | Endpoint |
|------|---------|-------|------|----------|
| 1 | Local (OpenAI-compatible) | `gemma4:e4b` | Free | `/v1/chat/completions` |
| 2 | OpenCode Zen | `mimo-v2.5-free` | Free | `/v1/chat/completions` |
| 3 | OpenCode Zen | `gpt-5-nano` | $0.05 / $0.40 per 1M tokens | `/v1/responses` |

> **Backend scope (v1.1.0).** The local tier speaks the OpenAI-compatible `/v1/chat/completions` API, so it works with Ollama as well as LM Studio, llama.cpp server, vLLM, and any runtime that exposes that endpoint — point `OPENCODE_VISION_LOCAL_URL` at it. The cloud tier is still fixed to OpenCode Zen: its base URL, the two model names, and their request formats are hardcoded. Lifting the cloud constraints is planned in [ROADMAP.md](ROADMAP.md) (v1.2.0).

## Requirements

- [OpenCode](https://opencode.ai) (the plugin loads at startup).
- **Local tier:** any OpenAI-compatible runtime — [Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), a llama.cpp server, or vLLM — with a vision-capable model. Example for Ollama (default model `gemma4:e4b`):

  ```sh
  ollama pull gemma4:e4b
  ```

  Point the plugin at another runtime with `OPENCODE_VISION_LOCAL_URL`.

- **Zen tiers:** an OpenCode Zen connection, configured via `/connect` in opencode (or the equivalent environment variables).
- **Browser MCP flow:** a [Browser MCP](https://browsermcp.io) server ([`@browsermcp/mcp`](https://github.com/browsermcp/mcp)) connected in opencode.

## Install

Easiest — from inside opencode's CLI:

```sh
opencode plugin opencode-screenshot-vision        # project
opencode plugin -g opencode-screenshot-vision     # global
```

This installs the npm package and updates the config for you. Restart opencode afterwards.

Or add it to `opencode.json` manually:

```jsonc
{
  "plugin": ["opencode-screenshot-vision"]
}
```

Then restart opencode. npm plugins are installed automatically at startup.

Alternatively, copy the plugin file into a project's `.opencode/plugins/` directory:

```sh
cp vision.ts <project>/.opencode/plugins/vision.ts
```

Either way, restart opencode or start a new session. Plugins load at startup.

## Usage

The examples below are written from the point of view of the text-only model driving the browser.

**Browser MCP flow — read the latest inline screenshot:**

```
# The browser MCP captures a screenshot; it is returned inline and the text-only
# model cannot read it. Call vision with no arguments:
vision()
```

The tool returns a description of the most recently captured screenshot.

**File flow — read a screenshot saved to disk:**

```
# Any tool (Playwright, Selenium, Puppeteer, Cypress, ...) saves a screenshot
# to a file. Pass its path:
vision(path="/tmp/opencode/screenshot-123.png")
```

**Ask a specific question about the image:**

```
vision(prompt="Is there a login button visible, and is it enabled?")
```

A `prompt` can be combined with a `path`:

```
vision(path="/tmp/opencode/screenshot-123.png", prompt="List any error messages on the page.")
```

## Configuration

Only the settings below are configurable, via optional environment variables. Everything else — the Zen URL, the Zen models, and the request formats — is fixed in the code (see the fallback-chain scope note above).

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCODE_VISION_LOCAL_URL` | `http://localhost:11434/v1` | Local OpenAI-compatible base URL |
| `OPENCODE_VISION_LOCAL_MODEL` | `gemma4:e4b` | Local vision model |
| `OPENCODE_VISION_OLLAMA_MODEL` | *(deprecated)* | Old name for the local model; still honored |
| `OPENCODE_VISION_LOCAL_TIMEOUT_MS` | `90000` | Local request timeout, milliseconds |
| `OPENCODE_VISION_CLOUD_TIMEOUT_MS` | `45000` | Zen request timeout, milliseconds |
| `OPENCODE_VISION_MAX_IMAGE_BYTES` | `10485760` (10 MB) | Max image size for path-based loads |
| `OPENCODE_VISION_USER_AGENT` | Chrome 126 UA | `User-Agent` header sent to Zen |
| `OPENCODE_VISION_ALLOWED_ROOTS` | *(empty)* | Extra directories readable via `path`, separated by the OS path delimiter |
| `OPENCODE_API_KEY` | *(from auth.json)* | Overrides the Zen API key |
| `OPENCODE_AUTH_CONTENT` | *(unset)* | `auth.json` contents provided as an environment string |
| `OPENCODE_AUTH_FILE` | `$XDG_DATA_HOME/opencode/auth.json` | Overrides the auth file path |

## Security

- **Prompt-injection defense.** The system prompt instructs the vision model to treat every instruction visible in a screenshot as untrusted page content: report it, never follow it.
- **Path containment.** The `path` argument is restricted to the session directory, the git worktree, `$TMPDIR/opencode`, and any roots listed in `OPENCODE_VISION_ALLOWED_ROOTS`.
- **MIME sniffing.** Path-based loads are typed from magic bytes (PNG, JPEG, GIF, WebP); unsupported formats are rejected.
- **Size limit.** Images larger than 10 MB are rejected.
- **Output cap.** Every backend is limited to 2,048 output tokens.

## Troubleshooting / Caveats

- **Zen balance.** The paid tier returns `401 CreditsError` when the workspace has insufficient balance.
- **Zen free rate limit.** The free tier can return `429` under load.
- **Cloudflare.** Zen requests must send a browser `User-Agent`; this is set by default.
- **Zen paid vision.** Not yet verified at runtime — treat the paid tier as unproven until exercised.

When all three backends fail, the `vision` tool reports each failure in a single error message, along with a hint to retry sequential calls if several vision calls were made at once.

## Related work

This plugin is one of several projects that give vision to text-only models in OpenCode. They are all worth knowing about.

### Auto-transparent packages

These detect a pasted image and replace it with a text description before the main model sees it, via the message-transform pipeline:

- [`opencode-vision-fallback`](https://github.com/TudeOrangBiasa/opencode-vision-fallback) — auto-transparent: detects a pasted image and replaces it with a text description before the main model sees it.
- [`@venespana/opencode-vision`](https://www.npmjs.com/package/@venespana/opencode-vision) — intercepts pasted images for text-only models.
- [`@pawprint0706/opencode-vision-helper`](https://www.npmjs.com/package/@pawprint0706/opencode-vision-helper) — native vision fallback for models without image input.
- [`@jochenyang/opencode-vision`](https://www.npmjs.com/package/@jochenyang/opencode-vision) — handles pasted images for non-vision models.

### Tool / subagent packages

These register explicit vision tools or subagents that the model invokes:

- [`opencode-vision`](https://github.com/WeZZard/opencode-vision) — registers vision subagents from the user's configured image-capable models.
- [`opencode-vision-plugin`](https://github.com/AshutoshGitMirror/opencode-vision-plugin) — in-process tools (describe/OCR/analyze), direct fetch to Gemini + NVIDIA NIM; a fork of `nicolasrios/opencode-vision`.

### Comparison

| Aspect | This project | Auto-transparent packages | Tool / subagent packages |
|--------|--------------|---------------------------|--------------------------|
| Primary input | Browser MCP screenshots + file path | Pasted images | Pasted images / manual invocation |
| Trigger | Explicit `vision` tool call | Automatic (transparent) | Explicit tool or subagent call |
| Backend | Local-first fallback chain (Ollama → Zen) | Varies by package | User's configured image models or direct API (Gemini, NVIDIA NIM) |
| Local-first / free tier | Yes | No | No |
| Prompt-injection defense | Yes | No | No |
| OCR / analyze tools | No | No | `opencode-vision-plugin` |

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) for the plan for v2 — which borrows improvements from the prior-art projects above — and for the widening plan (more local and cloud backends, more agent platforms, more screenshot sources).

## License

MIT. See the `LICENSE` file for the full text.

## Contributing

Contributions are welcome. Please open an issue to discuss a change before submitting a pull request, and keep the fallback chain and security behavior in mind when modifying the vision call path.

## Acknowledgments

Built on [OpenCode](https://opencode.ai) and its plugin API, with vision provided by Ollama and OpenCode Zen, and browser automation by [Browser MCP](https://browsermcp.io).

This project was informed by the prior-art vision plugins listed in [Related work](#related-work): [`opencode-vision`](https://github.com/WeZZard/opencode-vision), [`opencode-vision-plugin`](https://github.com/AshutoshGitMirror/opencode-vision-plugin), [`opencode-vision-fallback`](https://github.com/TudeOrangBiasa/opencode-vision-fallback), [`@venespana/opencode-vision`](https://www.npmjs.com/package/@venespana/opencode-vision), [`@pawprint0706/opencode-vision-helper`](https://www.npmjs.com/package/@pawprint0706/opencode-vision-helper), and [`@jochenyang/opencode-vision`](https://www.npmjs.com/package/@jochenyang/opencode-vision).
