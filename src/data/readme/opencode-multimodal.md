# opencode-multimodal

Give OpenCode models multimodal fallback support, even when the active model cannot read attachments itself.

## Install

```bash
opencode plugin opencode-multimodal --global
```

Restart OpenCode, then run:

```text
/multimodal
```

Pick fallback models for images, PDFs, audio, and (optionally) video. The plugin stays inactive until you configure at least one fallback chain.

## What It Does

`opencode-multimodal` lets a text-only or modality-limited model work with images, PDFs, audio, and video by routing unsupported attachments to a configured fallback model. The fallback model analyzes the attachments, and the plugin replaces each one with a structured text description plus any task-specific analysis, like a comparison. Your active OpenCode agent then receives the transformed prompt and continues with the extracted context; there is no extra main-model round trip for attachment analysis.

Keep using your preferred coding model while a separate multimodal model handles attachment analysis in the background.

```text
You attach one or more files while using a model that can't read them
  -> opencode-multimodal detects each unsupported attachment and its type
  -> attachments routed to the same fallback model are bundled into one call
  -> each fallback model receives the files plus your message and returns a
     per-file description and any task-specific analysis (e.g. a comparison)
  -> unsupported attachments are replaced with that structured text
  -> your active model receives the extracted information and continues
```

## Why Use It

- Use strong text-first coding models with screenshots, PDFs, audio, and video files.
- Compare attachments accurately: files sharing one fallback model are analyzed together in a single call.
- Configure everything from OpenCode with `/multimodal`.
- Reuse providers already authenticated through `/connect` or `opencode auth login`.
- Choose different fallback models for image, PDF, audio, and video workflows.
- Keep behavior safe: no fallback configured means no behavior change.

## Features

- Adds multimodal fallback support for image, PDF, audio, and video attachments.
- Detects when the active OpenCode model lacks the required input capability.
- Bundles attachments that share a fallback model into a single call, so direct comparison and cross-attachment correlation happen in one context.
- Runs independent fallback groups concurrently, bounded by a configurable concurrency limit.
- Sends a strong, intent-aware prompt plus your actual message to the fallback model — it self-calibrates depth to your goal (UI reconstruction, bug fixing, comparison, recognition, data extraction).
- Returns a structured response: a per-attachment description plus an optional task-specific analysis block.
- Replaces unsupported attachments with the extracted text before OpenCode's provider request is built.
- Caches complete specialist analyses within a session by user prompt plus ordered attachment content hashes, so an identical request with identical files skips the fallback call.
- Uses your existing OpenCode providers and credentials from `/connect`, `auth.json`, provider config, or environment variables.
- Provides a `/multimodal` configuration UI inside OpenCode.
- Lets you choose fallback models separately for each modality.
- Supports custom providers configured in OpenCode when they declare model metadata and use a bundled provider package.
- Supports ordered fallback chains, so the first available credentialed model is used.
- Fails safely: if no fallback is configured, no key is available, or analysis fails, the original attachment is left untouched.

## How It Works

The plugin runs in OpenCode's `experimental.chat.messages.transform` hook. This hook runs before OpenCode replaces unsupported attachments with its default error text, so `opencode-multimodal` can inject useful context at the right point in the message pipeline.

Each transform proceeds as follows:

1. **Detect** every attachment the active model cannot natively perceive, and map each to its modality (image, PDF, audio, video).
2. **Resolve** one fallback model per modality from your configured chains (first credentialed model that supports the modality wins).
3. **Bundle** attachments that resolve to the same fallback model into one group — a single specialist call — so they can be compared and correlated together.
4. **Run** all groups concurrently, bounded by the concurrency setting.
5. **Analyze**: each fallback model receives the raw attachments plus your message and a binding system contract, and returns a structured response — a `<description>` per attachment and an optional cross-attachment `<context>` (a comparison verdict, root-cause hypothesis, etc.).
6. **Inject**: each unsupported attachment is replaced with its description; a group's `<context>` is attached to the first attachment in that group.

Specialist analyses are cached per auxiliary group within the cache window. The cache key includes the user message hash and the ordered content hashes (mime + bytes) of every readable attachment in that group. A cache hit reuses the returned per-attachment `<description>` blocks and the optional `<context>` block, then skips the fallback call. A changed prompt, changed file content, added/removed attachment, or different attachment order is a cache miss and triggers fresh analysis. Cached analysis is never sent back to a fallback model as input.

## Requirements

- OpenCode `>= 1.17.0`
- At least one authenticated provider with a model that supports the attachment type you want to handle
- Bun-managed OpenCode plugin installation, which OpenCode handles automatically for npm plugins

## Manual Configuration

The plugin has two OpenCode targets:

- Server target: transforms chat messages and performs fallback analysis.
- TUI target: registers the `/multimodal` configuration UI.

The `opencode plugin` command should configure both targets automatically. If you prefer to configure it manually, add the package to both config files.

Server config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-multimodal"],
}
```

TUI config:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-multimodal"]
}
```

Global config paths:

| Purpose       | Path                               |
| ------------- | ---------------------------------- |
| Server config | `~/.config/opencode/opencode.json` |
| TUI config    | `~/.config/opencode/tui.json`      |

Project-level config is also supported with `.opencode/opencode.json` and `.opencode/tui.json`.

## Configuration UI

Run `/multimodal` inside OpenCode to configure the plugin.

The UI lets you configure:

- Master enable or disable switch.
- Per-modality fallback chains for image, PDF, audio, and video (video is opt-in and disabled by default).
- Provider and model selection from OpenCode's local models database and custom provider config.
- Credential-aware model suggestions, including one-click auto-suggest for empty chains.
- Settings: per-call timeout, concurrency, cache TTL, and missing-fallback toast behavior.

Fresh installs are safe by default. No fallback models are configured automatically, so the plugin does nothing until you opt in from the UI.

## Authentication

The plugin reuses the providers you already use with OpenCode. For each fallback provider, keys are resolved in this order:

1. OpenCode `auth.json`, usually populated by `/connect` or `opencode auth login`.
2. OpenCode provider config, `provider.<id>.options.apiKey`.
3. Environment variables declared by OpenCode's models database, such as `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.

Recommended setup:

```text
1. Run /connect in OpenCode.
2. Authenticate the provider you want to use for fallback analysis.
3. Run /multimodal.
4. Choose fallback models for the modalities you care about.
```

The UI prioritizes credentialed providers so you can quickly select models that are ready to use.

## Custom Providers

Custom providers declared in OpenCode config are available in `/multimodal` when they include model metadata. The provider's `npm` package must be one of the packages bundled by this plugin. If `npm` is omitted for a custom provider, the plugin defaults to `@ai-sdk/openai-compatible`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "my-gateway": {
      "name": "My Gateway",
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://gateway.example.com/v1",
        "apiKey": "sk-...",
      },
      "models": {
        "gpt-4o": {
          "name": "GPT-4o via Gateway",
          "modalities": {
            "input": ["text", "image", "pdf", "audio"],
            "output": ["text"],
          },
          "limit": {
            "context": 128000,
            "output": 4096,
          },
        },
      },
    },
  },
}
```

The `modalities.input` list controls where the model appears in `/multimodal`. For example, a model with `"image"` appears in the image fallback picker.

Supported custom provider packages are the provider packages listed in `package.json` dependencies, including Anthropic, OpenAI, OpenAI-compatible, Google, Google Vertex, Mistral, Cohere, Groq, xAI, Amazon Bedrock, Azure, DeepInfra, Fireworks, TogetherAI, Perplexity, and OpenRouter.

## Supported Modalities

| Modality | Status             | Notes                                                                                         |
| -------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Image    | Supported          | Screenshots, diagrams, UI mockups, photos, and other `image/*` attachments.                   |
| PDF      | Supported          | Documents with `application/pdf` MIME type.                                                   |
| Audio    | Supported          | Audio attachments with `audio/*` MIME types.                                                  |
| Video    | Supported (opt-in) | Video attachments with `video/*` MIME types. Disabled by default; enable it in `/multimodal`. |

## Options

Most settings live in the `/multimodal` UI. Optional plugin-level diagnostics can be passed in config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["opencode-multimodal", { "log_level": "debug" }]],
}
```

If you use manual config and need a custom config file location, set the same `config_path` option on both the server and TUI targets.

| Option        | Type                                     | Default       | Description                             |
| ------------- | ---------------------------------------- | ------------- | --------------------------------------- |
| `log_level`   | `"debug" \| "info" \| "warn" \| "error"` | `"info"`      | Server-side log verbosity.              |
| `config_path` | `string`                                 | Auto-detected | Override the plugin settings file path. |

Plugin settings are stored outside your project by default:

| OS      | Path                                                              |
| ------- | ----------------------------------------------------------------- |
| Linux   | `~/.local/share/opencode/opencode-multimodal.json`                |
| macOS   | `~/Library/Application Support/opencode/opencode-multimodal.json` |
| Windows | `%LOCALAPPDATA%\opencode\opencode-multimodal.json`                |

## Architecture

`opencode-multimodal` is a dual-target OpenCode plugin.

| Target | Entry point                  | Purpose                                                                                                                                                            |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server | `opencode-multimodal/server` | Registers backend hooks, detects unsupported attachments, bundles and routes them to fallback models, parses the structured responses, and rewrites message parts. |
| TUI    | `opencode-multimodal/tui`    | Registers `/multimodal` and renders the configuration UI.                                                                                                          |

Shared logic lives in `src/shared`, including config storage, auth lookup, model metadata, provider package mapping, prompts, and utility functions. Provider loading and the structured-response parser live in `src/server`.

Runtime model capability data comes from OpenCode's local `models.dev` cache at `~/.cache/opencode/models.json` on Linux, with equivalent cache locations on macOS and Windows. Custom provider models declared in OpenCode config are merged into that catalog before the server and TUI make capability or picker decisions.

## Limitations

- The active model is never changed, and it is not used for attachment analysis. The plugin only replaces unsupported attachments with extracted text before the active model handles the user request.
- A fallback chain must be configured before any modality is transformed.
- The fallback provider must have a credential available to OpenCode.
- Only provider packages bundled with this plugin can be used for fallback calls.
- Video is opt-in and disabled by default; enable it in `/multimodal`.
- If fallback analysis fails, OpenCode's normal unsupported-attachment behavior applies.

## Development

This project uses Bun.

```bash
bun install
bun run build
bun run typecheck
bun run test
bun run format
```

For local development, this repository includes `.opencode/opencode.json` and `.opencode/tui.json` that load the package root with `"plugin": [".."]`. Run `bun run build`, restart OpenCode from the repository root, then use `/multimodal`.

## Release Checklist

```bash
bun install --frozen-lockfile
bun run format
bun run typecheck
bun run test
bun run build
bun publish --dry-run
bun publish --access public
```

## Contributing

Issues and pull requests are welcome. Please include reproduction steps for bugs and describe which OpenCode version, provider, model, modality, and operating system are involved.

## License

MIT
