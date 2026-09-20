# OpenCode Ollama Qwen Thinking

An OpenCode plugin + local proxy that makes Qwen3.8 reasoning levels work transparently with Ollama.

OpenCode's Ollama integration uses the OpenAI-compatible `/v1/chat/completions` endpoint. OpenCode 1.18.x does not reliably forward arbitrary `reasoning_effort` request-body fields through the AI SDK. This project solves that at the HTTP boundary: the plugin starts a small localhost proxy and points the Ollama provider at it; the proxy rewrites Qwen3.8 model-name suffixes into Ollama's `reasoning_effort` field.

## The problem this project solves

Qwen3.8 supports different reasoning levels such as **none, low, medium, and xhigh**. Ollama's OpenAI-compatible API can express the desired level through the `reasoning_effort` request parameter.

The problem is that when Qwen3.8 is used through **OpenCode → Ollama**, the reasoning-level parameter does not reliably make it all the way from OpenCode to Ollama. As a result, simply defining or selecting different reasoning levels in OpenCode may still produce the same effective reasoning behavior.

This project works around that request-path limitation without requiring changes to OpenCode or Ollama:

1. The plugin starts a small local HTTP proxy automatically.
2. The proxy exposes reasoning-level variants of each Qwen3.8 model, using IDs such as `qwen3.8:27b-mlx-effort-medium`.
3. When OpenCode requests one of those variants, the proxy converts the suffix into Ollama's `reasoning_effort` parameter.
4. Ollama receives the original model ID plus the requested reasoning level.

In short:

```text
OpenCode
   |
   | qwen3.8:27b-mlx-effort-medium
   v
Qwen Thinking Proxy
   |
   | model=qwen3.8:27b-mlx
   | reasoning_effort=medium
   v
Ollama
```

The result is that the four reasoning levels can be exposed as ordinary selectable OpenCode models, while the actual reasoning-level translation happens at the HTTP boundary.

## Supported models

The proxy is model-agnostic and will rewrite any Qwen3.8 model:

- `qwen3.8:27b-mlx`
- `qwen3.8:27b-mtp-q4_K_M`

and exposes reasoning variants:

- `qwen3.8:27b-mlx-effort-none`
- `qwen3.8:27b-mlx-effort-low`
- `qwen3.8:27b-mlx-effort-medium`
- `qwen3.8:27b-mlx-effort-xhigh`
- `qwen3.8:27b-mtp-q4_K_M-effort-none`
- `qwen3.8:27b-mtp-q4_K_M-effort-low`
- `qwen3.8:27b-mtp-q4_K_M-effort-medium`
- `qwen3.8:27b-mtp-q4_K_M-effort-xhigh`

The unsuffixed model is passed through unchanged.

## Architecture

```
OpenCode
   |
   | OpenAI-compatible request
   v
Qwen Thinking Proxy :11437
   |
   | qwen3.8:27b-mlx-effort-medium
   |        -> model=qwen3.8:27b-mlx
   |        -> reasoning_effort=medium
   v
Ollama :11434
```

The proxy is started automatically by the OpenCode plugin. No separate service manager is required.

## Prerequisites

Before installing the plugin, make sure the following are available on your machine:

- **OpenCode 1.18.x or later** with plugin support.
- **Ollama** installed and running locally.
- An **Ollama-supported Qwen3.8 model**, such as `qwen3.8:27b-mlx` or a Qwen3.8 MTP variant.
- **Bun 1.1.0 or later**. The plugin uses Bun to start the local proxy as a child process, and the configuration-generator script is also written for Bun.
- **Git**, if installing directly from this GitHub repository.
- A standard **JSON-formatted OpenCode configuration** if you plan to use the `generate:variants` utility. The generator does not currently parse JSONC comments or trailing commas.

### Verify the prerequisites

Check Bun:

```bash
bun --version
```

Check Ollama:

```bash
ollama --version
ollama list
```

Check that Ollama's OpenAI-compatible endpoint is available:

```bash
curl http://127.0.0.1:11434/v1/models
```

You should see your installed models in the response.

For the Qwen reasoning proxy, the important requirement is that the underlying Qwen3.8 model is available through Ollama. The plugin does not download or manage models itself.

## Installation

### npm package (recommended)

Once published, the easiest installation is to add the package directly to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-ollama-qwen-thinking@0.1.0"
  ]
}
```

You do **not** need to clone the repository or run `npm install` manually. OpenCode installs npm plugins automatically using Bun and caches them locally. citeturn0search0turn0search2

If you prefer to always use the latest published version, you can omit the version:

```json
{
  "plugin": [
    "opencode-ollama-qwen-thinking"
  ]
}
```

For reproducible setups, pinning a specific version is recommended.

### From this repository (development)

Clone the repository when you want to inspect, modify, or develop the plugin locally:

```bash
git clone https://github.com/amit-batra/opencode-ollama-qwen-thinking.git
```

Then add the local repository path to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/absolute/path/to/opencode-ollama-qwen-thinking"
  ]
}
```

## Using the models

After restarting OpenCode, select one of the following model IDs:

```
ollama/qwen3.8:27b-mlx-effort-none
ollama/qwen3.8:27b-mlx-effort-low
ollama/qwen3.8:27b-mlx-effort-medium
ollama/qwen3.8:27b-mlx-effort-xhigh

ollama/qwen3.8:27b-mtp-q4_K_M-effort-none
ollama/qwen3.8:27b-mtp-q4_K_M-effort-low
ollama/qwen3.8:27b-mtp-q4_K_M-effort-medium
ollama/qwen3.8:27b-mtp-q4_K_M-effort-xhigh
```

The original model IDs remain valid:

```
ollama/qwen3.8:27b-mlx
ollama/qwen3.8:27b-mtp-q4_K_M
```

For an unsuffixed model, the request is forwarded without a `reasoning_effort` override, preserving Ollama's default behavior.


## Generate Qwen3.8 model entries from an existing OpenCode config

If you already have one Qwen3.8 model entry in `opencode.json`, the repository includes a small Bun/TypeScript utility that creates four separate model entries for the proxy's reasoning levels:

- `<base-model>-effort-none`
- `<base-model>-effort-low`
- `<base-model>-effort-medium`
- `<base-model>-effort-xhigh`

The script copies the original model configuration, changes the model ID, and gives each generated entry a descriptive name. If the source entry has an explicit `modelID`, that field is updated too, so OpenCode sends the suffixed ID to the proxy. OpenCode's provider model map uses these model IDs as selectable catalog entries. citeturn0search0turn0search3

### Automatic detection

If your provider contains exactly one unsuffixed Qwen3.8 model, the script can detect it automatically:

```bash
bun run generate:variants -- --input ~/.config/opencode/opencode.json
```

This creates:

```
~/.config/opencode/opencode.json.qwen-thinking.json
```

### Specify the model explicitly

This is recommended if you have more than one Qwen3.8 model:

```bash
bun run generate:variants -- \
  --input ~/.config/opencode/opencode.json \
  --model qwen3.8:27b-mlx \
  --output ~/opencode-qwen-thinking.json
```

You can also select a different provider:

```bash
bun run generate:variants -- \
  --input ./opencode.json \
  --provider ollama \
  --model qwen3.8:27b-mlx
```

### Update the existing file in place

Use `--in-place` when you want the four generated entries written directly into the original file:

```bash
bun run generate:variants -- \
  --input ~/.config/opencode/opencode.json \
  --model qwen3.8:27b-mlx \
  --in-place
```

The script does not overwrite an existing generated variant unless `--force` is supplied:

```bash
bun run generate:variants -- \
  --input ~/.config/opencode/opencode.json \
  --model qwen3.8:27b-mlx \
  --in-place \
  --force
```

### Before and after

Given this source entry:

```json
{
  "provider": {
    "ollama": {
      "models": {
        "qwen3.8:27b-mlx": {
          "name": "Qwen3.8 27B MLX",
          "options": {
            "temperature": 1,
            "num_ctx": 131072
          }
        }
      }
    }
  }
}
```

the generated config contains the original entry plus four entries with the same settings:

```text
qwen3.8:27b-mlx-effort-none   -> No Thinking
qwen3.8:27b-mlx-effort-low    -> Low Thinking
qwen3.8:27b-mlx-effort-medium -> Medium Thinking
qwen3.8:27b-mlx-effort-xhigh  -> Xhigh Thinking
```

The generated entries deliberately do not add a separate reasoning parameter. The proxy selects the reasoning level from the `-effort-<level>` suffix and converts it into Ollama's `reasoning_effort` request field.

The utility currently accepts standard JSON files. If your config uses JSON comments or trailing commas, remove those first or save a JSON copy for the generator.

## Environment variables

**None of these environment variables are mandatory.** The plugin and proxy have sensible defaults, so a normal installation requires no environment-variable configuration.

You only need to define an environment variable when you want to override its default behavior:

| Variable | Default | Mandatory? | Purpose |
|---|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | **No** | URL of the Ollama server |
| `QWEN_THINKING_PROXY_HOST` | `127.0.0.1` | **No** | Local address on which the proxy listens |
| `QWEN_THINKING_PROXY_PORT` | `11437` | **No** | Local TCP port used by the proxy |
| `QWEN_THINKING_DEBUG` | `0` | **No** | Set to `1` to log model/reasoning rewrites |
| `QWEN_THINKING_DISABLE_PROXY` | `0` | **No** | Set to `1` to prevent the plugin from starting/configuring the proxy automatically |

### Default installation

For the normal setup — Ollama running on the same machine at its default port — **you do not need to define anything**. Simply install the plugin and start OpenCode.

The effective defaults are:

```text
Ollama:       http://127.0.0.1:11434
Proxy host:   127.0.0.1
Proxy port:   11437
Debug logging: disabled
Auto-start:   enabled
```

### When would you override them?

For example, if Ollama is running on another port:

```bash
OLLAMA_URL=http://127.0.0.1:11435 opencode
```

If you want the proxy on a different port:

```bash
QWEN_THINKING_PROXY_PORT=12437 opencode
```

If you want request-rewrite logging:

```bash
QWEN_THINKING_DEBUG=1 opencode
```

> **Note:** `QWEN_THINKING_DISABLE_PROXY=1` is an advanced option. With it enabled, the plugin deliberately does not start the proxy or redirect the Ollama provider to it, so the `-effort-*` model variants will not provide the reasoning-level translation described by this project.

## Configuration

Environment variables:

| Variable | Default | Purpose |
|---|---:|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama upstream |
| `QWEN_THINKING_PROXY_HOST` | `127.0.0.1` | Proxy bind address |
| `QWEN_THINKING_PROXY_PORT` | `11437` | Proxy port |
| `QWEN_THINKING_DEBUG` | `0` | Log request rewrites |
| `QWEN_THINKING_DISABLE_PROXY` | `0` | Do not auto-start the proxy |

For example:

```bash
QWEN_THINKING_DEBUG=1 opencode
```

## How it works

A request for:

```
qwen3.8:27b-mlx-effort-medium
```

is transformed into:

```json
{
  "model": "qwen3.8:27b-mlx",
  "reasoning_effort": "medium"
}
```

and forwarded to:

```
http://127.0.0.1:11434/v1/chat/completions
```

The proxy does not alter messages, tools, sampling parameters, streaming, or response bodies.

For `none`, the proxy sends `reasoning_effort: "none"`. This is important for Qwen3.8 because recent Ollama reports show that `think: false` can be intermittent through the OpenAI-compatible endpoint while `reasoning_effort: "none"` is reliable.

## Health check

Once OpenCode has started the plugin:

```bash
curl http://127.0.0.1:11437/health
```

Expected:

```json
{"ok":true}
```

List models through the proxy:

```bash
curl -s http://127.0.0.1:11437/v1/models | jq
```

## Debugging

Enable request logging:

```bash
QWEN_THINKING_DEBUG=1 opencode
```

You should see entries similar to:

```
[proxy] qwen3.8:27b-mlx-effort-medium
        -> qwen3.8:27b-mlx
        reasoning_effort=medium
```

This gives a direct way to verify that the thinking level is actually reaching Ollama.

## Requirements

- macOS or Linux
- OpenCode 1.18.x
- Ollama with an OpenAI-compatible `/v1` endpoint
- Bun (OpenCode itself uses Bun for its plugin runtime)
- Qwen3.8 model support in your Ollama version

## Why a proxy?

OpenCode plugins expose `chat.params`, but that hook is intended for parameters such as temperature, top-p, and provider options. The OpenAI-compatible provider controls which request-body fields ultimately reach Ollama. A localhost HTTP proxy operates after that filtering, so it can reliably rewrite the actual request sent to Ollama.

This is also why the plugin and proxy live in one repository: the plugin is just the lifecycle/bootstrapping layer; the proxy contains the protocol logic.

## Development

Install dependencies:

```bash
bun install
```

Run the proxy directly:

```bun
bun run src/proxy.ts
```

Run tests:

```bash
bun test
```

## License

MIT
