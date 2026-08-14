# opencode-commandcode-provider-go

[Command Code](https://commandcode.ai) API provider for [opencode](https://opencode.ai). Use open-source models — DeepSeek, Qwen, Kimi, GLM, MiniMax, Step, Gemini, Grok, and more — through a single API key. Only open-source models are registered.

## Quick Start

### 1. Install

```bash
opencode plugin opencode-commandcode-provider-go
```

This installs the provider and registers all available open-source models automatically.

### 2. Connect

Run `/connect` in opencode, search for **Command Code**, and enter your API key:

```
/connect
```

### 3. Select a model

Run `/models` to pick from available models:

```
/models
```

## Manual Configuration

If you prefer to configure manually, add this to your `opencode.json`:

```json
{
  "plugin": ["opencode-commandcode-provider-go"],
  "provider": {
    "commandcode": {
      "npm": "opencode-commandcode-provider-go",
      "name": "Command Code",
      "env": ["COMMANDCODE_API_KEY"]
    }
  },
  "model": "commandcode/deepseek-v4-flash"
}
```

The plugin auto-registers models from [`models.json`](./models.json) at startup. You only need the `provider.commandcode` block — no need to list individual models.

### Environment Variable

Set `COMMANDCODE_API_KEY` instead of using `/connect`:

```bash
COMMANDCODE_API_KEY=your-key opencode
```

## Available Models

This distribution registers **open-source models only** (premium Claude/GPT models are excluded). The full list is maintained in [`models.json`](./models.json). Run `bun run sync` to refresh from the latest Command Code CLI release on npm.

| Model ID | Name | Tier | Reasoning | Context |
|---|---|---|---|---|
| `deepseek/deepseek-v4-flash`               | DeepSeek V4 Flash           | open-source  | yes | 1000K  |
| `deepseek/deepseek-v4-pro`                 | DeepSeek V4 Pro             | open-source  | yes | 1000K  |
| `sakana/fugu-ultra`                        | Fugu Ultra                  | open-source  | yes | 1000K  |
| `google/gemini-3.1-flash-lite`             | Gemini 3.1 Flash Lite       | open-source  | yes | 1000K  |
| `google/gemini-3.5-flash`                  | Gemini 3.5 Flash            | open-source  | yes | 1000K  |
| `zai-org/GLM-5`                            | GLM-5                       | open-source  | no  | 200K   |
| `zai-org/GLM-5.1`                          | GLM-5.1                     | open-source  | no  | 200K   |
| `zai-org/GLM-5.2`                          | GLM-5.2                     | open-source  | yes | 1000K  |
| `zai-org/GLM-5.2-Fast`                     | GLM-5.2 Fast                | open-source  | no  | 1000K  |
| `xai/grok-4.5`                             | Grok 4.5                    | open-source  | yes | 500K   |
| `moonshotai/Kimi-K2.5`                     | Kimi K2.5                   | open-source  | no  | 256K   |
| `moonshotai/Kimi-K2.6`                     | Kimi K2.6                   | open-source  | no  | 256K   |
| `moonshotai/Kimi-K2.7-Code`                | Kimi K2.7 Code              | open-source  | yes | 256K   |
| `moonshotai/Kimi-K2.7-Code-Highspeed`      | Kimi K2.7 Code HighSpeed    | open-source  | yes | 262K   |
| `xiaomi/mimo-v2.5`                         | MiMo V2.5                   | open-source  | no  | 1000K  |
| `xiaomi/mimo-v2.5-pro`                     | MiMo V2.5 Pro               | open-source  | no  | 1000K  |
| `MiniMaxAI/MiniMax-M2.5`                   | MiniMax M2.5                | open-source  | no  | 200K   |
| `MiniMaxAI/MiniMax-M2.7`                   | MiniMax M2.7                | open-source  | no  | 1000K  |
| `MiniMaxAI/MiniMax-M3-Free`                | MiniMax M3                  | open-source  | yes | 1000K  |
| `MiniMaxAI/MiniMax-M3`                     | MiniMax M3                  | open-source  | yes | 1000K  |
| `meta/muse-spark-1.1`                      | Muse Spark 1.1              | open-source  | yes | 1048K  |
| `nvidia/nemotron-3-ultra-550b-a55b`        | Nemotron 3 Ultra            | open-source  | yes | 1000K  |
| `Qwen/Qwen3.6-Max-Preview`                 | Qwen 3.6 Max Preview        | open-source  | yes | 1000K  |
| `Qwen/Qwen3.6-Plus`                        | Qwen 3.6 Plus               | open-source  | yes | 1000K  |
| `Qwen/Qwen3.7-Max`                         | Qwen 3.7 Max                | open-source  | yes | 1000K  |
| `Qwen/Qwen3.7-Plus`                        | Qwen 3.7 Plus               | open-source  | yes | 1000K  |
| `stepfun/Step-3.5-Flash`                   | Step 3.5 Flash              | open-source  | yes | 1000K  |
| `stepfun/Step-3.7-Flash`                   | Step 3.7 Flash              | open-source  | yes | 256K   |
| `tencent/Hy3`                              | Tencent Hy3                 | open-source  | yes | 262K   |

Full model list is maintained in [`models.json`](./models.json). Run `bun run sync` to refresh from the latest Command Code CLI release on npm.

## Development

```bash
git clone https://github.com/dylansalim3/opencode-commandcode-provider.git
cd opencode-commandcode-provider-go
bun install
```

For local testing, create `opencode.local.json` (gitignored) with `file://` paths:

```json
{
  "plugin": ["file:///path/to/opencode-commandcode-provider-go/server"],
  "provider": {
    "commandcode": {
      "npm": "file:///path/to/opencode-commandcode-provider-go",
      "name": "Command Code (local)",
      "env": ["COMMANDCODE_API_KEY"]
    }
  }
}
```

Run `opencode --config opencode.local.json` to test with your local build.

### Sync Models

```bash
bun run sync              # update models.json from Command Code
bun run sync:global       # update models.json + write to ~/.config/opencode/opencode.jsonc
```

## License

MIT
