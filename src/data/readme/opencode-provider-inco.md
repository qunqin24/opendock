<p align="center">
  <img src="assets/cover.jpg" alt="Inco provider for opencode" width="800">
</p>

# opencode-provider-inco

[![CI](https://github.com/grikomsn/opencode-provider-inco/actions/workflows/ci.yml/badge.svg)](https://github.com/grikomsn/opencode-provider-inco/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An independent **Inco** integration for [OpenCode v2.1.4+](https://opencode.ai/v2/docs/build/plugins) that connects to the public **Inco AI** service at `api.inco.ai` with your own API key. This project is not affiliated with or endorsed by Inco AI.

## Install

Add the plugin to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-provider-inco"]
}
```

For a local checkout, use an absolute path in `plugins`, such as `/path/to/opencode-provider-inco`. Published packages load through the same v2 plugin contract; `/server` remains available as an explicit package entry.

Requires Node.js 22.19 or newer. This integration targets OpenCode v2.1.4+.

## Authenticate

Create a key in the [Inco AI dashboard](https://platform.inco.ai). Run `/connect`, choose **Inco AI**, and enter your key. OpenCode owns the saved credential. You can also export `INCO_API_KEY` before starting OpenCode.

```sh
export INCO_API_KEY="your-key"
opencode run --model inco/deepseek-v4.1-flash:fast#none "Reply with OK"
```

A `.env` file is a development convenience; the clients do not automatically load this repository's `.env`. Keep credentials out of project configuration, shell history, and bug reports.

## Models

- Fetches the authenticated `GET https://api.inco.ai/v1/models` catalog. A successful response replaces the previous list, including a successful empty list.
- Preserves upstream IDs verbatim, including `:fast`. Chat routes are selected under `inco/<upstream-id>`.
- Uses live names, context windows, explicit image/tool capabilities, and prices in USD per million tokens. Missing output limits use a conservative 16,384-token request budget.
- Keeps public catalog metadata in OpenCode plugin storage, scoped by a SHA-256 credential fingerprint. A different key cannot reuse another key's catalog.
- Uses the matching persisted catalog during outages, then the bundled public snapshot on first use. HTTP 401/403 clears the matching catalog and lists no models.

Discovery runs at plugin startup, every five minutes, and when credentials change. Restart OpenCode to request an immediate refresh.

The bundled snapshot and verified tool/reasoning profiles come from [inco-copilot-chat](https://github.com/grikomsn/inco-copilot-chat). They cover ten routes: DeepSeek V4.1 Flash, GLM 5.3, GLM 5.3 Flash, Kimi K3, and MiniMax M3.1 Flash, each with a `:fast` variant. The current live catalog always wins.

## Reasoning and tools

OpenCode exposes accepted efforts as model variants (`#none`, `#high`, and so on). Requests use `reasoning_effort`, and explicit live effort lists are never widened by bundled profiles.

| Route | Bundled accepted effort controls |
| --- | --- |
| DeepSeek V4.1 Flash, either route | none, minimal, low, medium, high, xhigh, max |
| Kimi K3 | none, low, high, max |
| Kimi K3 Fast | none, minimal, low, medium, high, xhigh, max |
| GLM 5.3 / GLM 5.3 Flash | low, high, max |
| GLM Fast routes / MiniMax Fast | minimal, low, medium, high, xhigh, max |
| MiniMax M3.1 Flash | none, minimal, low, medium, high, xhigh, max |

Positive effort spellings accepted by the service do not establish distinct reasoning depths. Fast GLM and MiniMax routes omit `none` because the Copilot bridge's probes did not establish that it stops reasoning. Unknown models keep the server default unless live metadata explicitly enumerates their efforts.

All ten bundled routes have verified structured tool support. Standard `deepseek-v4.1-flash` requires effort `none` for **forced** tool choice; automatic tools can use thinking. Invalid forced-tool combinations fail before sending. Use the Fast route for forced tools with thinking.

## Transport and privacy

Uses OpenCode's native `@opencode/ai/providers/openai-compatible` transport for streaming, tool-call assembly, usage, cancellation, and inference retry behavior. The provider validates final effort/output settings and pins inference to `https://api.inco.ai/v1/chat/completions`. Catalog requests reject redirects and never include response bodies in errors.

The integration does not log keys, prompts, tool arguments, responses, or account data. The host client may store conversation history according to its own settings. Inco AI controls retention, relay access, and billing; review your dashboard settings. Costs are estimates and the Inco AI dashboard is authoritative. Where the host requires numeric rates, unavailable price fields display as zero estimates, not a promise of free service.

## Development

```sh
npm ci
npm run check
npm run package
```

Tests use injected network fakes. Real inference checks are opt-in and incur service usage. The check uses temporary client configuration, data, cache and session directories, disables unrelated integrations, and prints only verification metadata:

```sh
node --env-file=/path/to/.env scripts/verify-live.mjs
node --env-file=/path/to/.env scripts/verify-live.mjs --tui
node --env-file=/path/to/.env scripts/verify-live.mjs --saved-key --tui
```

The TUI checks run the real interactive client in an isolated tmux server. `--saved-key` verifies native saved credentials with `INCO_API_KEY` removed from the client environment; OpenCode uses its native key login prompt. Set `INCO_CLIENT_BIN` when the client is outside `PATH`. Temporary client state is removed afterward. See [verification.md](docs/verification.md) for the bootstrap run evidence.

 See [CONTRIBUTING.md](CONTRIBUTING.md), [RELEASING.md](RELEASING.md), and [SECURITY.md](SECURITY.md).
