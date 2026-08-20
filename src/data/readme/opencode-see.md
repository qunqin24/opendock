# opencode-see

An [OpenCode](https://opencode.ai) plugin that adds an `opencode_see` tool.
It sends an image to a vision-capable LLM and returns a text description,
falling back across three **free** providers — **Gemini**, **Groq**, and
**Cerebras** — one at a time, in whatever order you configure.

No merging of results: it tries provider #1, and only moves on to #2 if #1
fails or isn't configured. Whichever one succeeds first wins.

## Features

- One `opencode_see` tool — point it at one or more local files or http(s)
  URLs, sent in a single request.
- **Free** providers: Gemini, Groq, and Cerebras — no API cost.
- **One-at-a-time fallback**: tries each provider (and each of its models) in
  order until one succeeds; results are never merged.
- Configurable provider order and per-provider model fallback lists.

## 1. Get free API keys

| Provider | Where | Env var |
|---|---|---|
| Gemini | [aistudio.google.com](https://aistudio.google.com/apikey) | `GEMINI_API_KEY` |
| Groq | [console.groq.com](https://console.groq.com) | `GROQ_API_KEY` |
| Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai) | `CEREBRAS_API_KEY` |

You don't need all three — any subset works. Providers with no key set are
skipped automatically.

## 2. Install

**As a project or global plugin (from npm):**

```bash
npm install opencode-see
```

Then add it to `opencode.json`:

```json
{
  "plugin": ["opencode-see"]
}
```

**Or as a local plugin**, copy `dist/plugin.js` into
`.opencode/plugins/opencode-see.js` (project-level) or
`~/.config/opencode/plugins/opencode-see.js` (global).

## 3. Set your keys

You can provide keys (and other settings) either via plugin options in
`opencode.json` or via environment variables. Env vars are used as the
fallback whenever an option isn't set.

**Option A — `opencode.json` plugin options.** Register the plugin in tuple
form and pass `apiKeys` (and optionally models, order, prompt):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-see", {
      "apiKeys": {
        "gemini": "...",
        "groq": "...",
        "cerebras": "..."
      },
      "models": {
        "gemini": ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.1-flash-lite"],
        "groq": ["qwen/qwen3.6-27b"],
        "cerebras": ["gemma-4-31b"]
      },
      "providerOrder": "cerebras,gemini,groq",
      "defaultPrompt": "Describe this image in detail."
    }]
  ]
}
```

**Option B — environment variables.** Export whichever keys you have, e.g. in
your shell profile or `.env` (however you normally get env vars into the
OpenCode process):

```bash
export GEMINI_API_KEY="..."
export GROQ_API_KEY="..."
export CEREBRAS_API_KEY="..."
```

Either way, you don't need all three — any subset works, and providers with no
key set are skipped automatically.

Precedence for every setting (highest wins): **tool argument → `opencode.json`
plugin option → environment variable → built-in default.**

Providers and models: for each provider you can list **multiple models in
fallback order** via the `models` array — the plugin tries each one until one
succeeds, then moves to the next provider. A provider with no models configured
uses its env var (or built-in default).

## 4. Configure provider order (optional)

Default order is `gemini,groq,cerebras`. Override globally via the
`providerOrder` plugin option (above) or the env var:

```bash
export OPENCODE_SEE_PROVIDER_ORDER="cerebras,gemini,groq"
```

Or override per-call by passing `providers` as a tool argument (the agent
can do this itself if you ask, e.g. "describe this image, try cerebras first").

Other settings:
- `defaultPrompt` plugin option or `OPENCODE_SEE_DEFAULT_PROMPT` env var — default prompt when none is given.
- `models` plugin option (array of model ids, tried in order) or
  `GEMINI_VISION_MODEL`, `GROQ_VISION_MODEL`, `CEREBRAS_VISION_MODEL` env vars —
  override the model id per provider (useful since Groq in particular rotates
  its vision model lineup). Env vars accept a single model; the `models` option
  accepts several, tried one at a time.

## 5. Use it

Just ask the OpenCode agent to look at an image:

> "Describe screenshot.png"
> "What does the error in ./logs/crash.jpg say?"
> "Look at https://example.com/diagram.png and explain the architecture"
> "Compare these two screenshots: after/login.png and after/home.png"

The `image` argument is an array, so the agent passes
`"image": ["a.png", "b.png"]` for multiple images (a single image is a
one-element array).

The tool result shows which vision model answered — the output starts with a
`**Vision model:** <Provider> (<model>)` line followed by the model's
description (e.g. `**Vision model:** Gemini (gemini-3.1-flash-lite)`).

## Known limits

- **Cerebras** caps images at 280 tokens — fine for simple screenshots, weak for
  dense/detailed images. Best used as a fallback, not primary.
- **Groq's** vision model id changes periodically as they retire/replace models.
  If it stops working, check https://console.groq.com/docs/vision and set
  `GROQ_VISION_MODEL` (or add it to the `models` option).
- No client-side image resizing yet (large images are sent as-is). If you hit
  payload-size or token-limit errors on big screenshots, downscale before
  passing the path, or open an issue — this is a natural next addition.

## Development

```bash
npm install
npm run build
```

> Note: `npm test` is currently stale/broken — the script points at
> `dist/test/*.test.js`, but no test directory exists yet. Don't rely on it.

Source is in `src/`, one file per provider under `src/providers/`, plus:
- `image.ts` — loads local files / URLs into a base64 data URI
- `config.ts` — resolves provider order from args/env/defaults
- `orchestrator.ts` — the one-at-a-time fallback loop
- `plugin.ts` — registers the `opencode_see` tool with OpenCode

### Publishing

`dist/` is gitignored but shipped to npm via the `files` field. Publish with:

```bash
npm run build        # build (also runs automatically via prepublishOnly)
npm publish          # pack and publish
```

Use `npm publish --dry-run` first to preview exactly what gets packed.
Bump the version with `npm version patch|minor|major` before each release.

## License

MIT
