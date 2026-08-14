# commandcode-go-opencode-provider

[Command Code](https://commandcode.ai) API provider for [opencode](https://opencode.ai). Use Claude, GPT, Gemini, DeepSeek, Qwen, Kimi, GLM, MiniMax, Step, and other models through a single API key.

## Use This Fork

Clone the repository and point OpenCode at the local checkout:

```bash
git clone https://github.com/nathnael-desta/opencode-commandcode-provider.git
```

```json
{
  "plugin": ["file:///absolute/path/to/opencode-commandcode-provider/plugin.ts"],
  "provider": {
    "commandcode": {
      "npm": "file:///absolute/path/to/opencode-commandcode-provider",
      "name": "Command Code",
      "env": ["COMMANDCODE_API_KEY"]
    }
  }
}
```

Run `/connect`, select **Command Code**, and enter the API key. File URLs must
be absolute. Restart OpenCode or T3 Code after changing configuration.

## Published Package

The npm commands below install the upstream `commandcode-go-opencode-provider`
package until this fork is published under a distinct package name. Use the
source installation above for this fork's live discovery and routing changes.

### 1. Install

```bash
opencode plugin commandcode-go-opencode-provider
```

This installs the provider and registers all available models automatically.
The bundled catalog provides an offline fallback, while the plugin refreshes
model IDs, names, and context windows from Command Code's public model endpoint
at startup.

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
  "plugin": ["commandcode-go-opencode-provider/server"],
  "provider": {
    "commandcode": {
      "npm": "commandcode-go-opencode-provider",
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

For T3 Code and other GUI integrations, use `/connect` instead of a shell
alias. GUI-launched `opencode serve` processes do not evaluate Bash aliases.
See [T3 Code Integration](docs/t3-code.md) for setup and diagnostics.

## Available Models

| Model ID | Name | Tier | Reasoning | Context |
|---|---|---|---|---|
| `claude-fable-5`                           | Claude Fable 5              | premium      | yes | 1M     |
| `claude-haiku-4-5-20251001`                | Claude Haiku 4.5            | premium      | no  | 200K   |
| `claude-opus-4-7`                          | Claude Opus 4.7             | premium      | yes | 1M     |
| `claude-opus-4-8`                          | Claude Opus 4.8             | premium      | yes | 1M     |
| `claude-sonnet-4-6`                        | Claude Sonnet 4.6           | premium      | yes | 1M     |
| `claude-sonnet-5`                          | Claude Sonnet 5             | premium      | yes | 1M     |
| `sakana/fugu-ultra`                        | Fugu Ultra                  | premium      | yes | 1M     |
| `google/gemini-3.1-flash-lite`             | Gemini 3.1 Flash Lite       | premium      | yes | 1M     |
| `google/gemini-3.5-flash`                  | Gemini 3.5 Flash            | premium      | yes | 1M     |
| `gpt-5.3-codex`                            | GPT-5.3 Codex               | premium      | yes | 400K   |
| `gpt-5.4`                                  | GPT-5.4                     | premium      | yes | 400K   |
| `gpt-5.4-mini`                             | GPT-5.4 Mini                | premium      | yes | 400K   |
| `gpt-5.5`                                  | GPT-5.5                     | premium      | yes | 200K   |
| `gpt-5.6-luna`                             | GPT-5.6 Luna                | premium      | yes | 1M     |
| `gpt-5.6-sol`                              | GPT-5.6 Sol                 | premium      | yes | 1M     |
| `gpt-5.6-terra`                            | GPT-5.6 Terra               | premium      | yes | 1M     |
| `xai/grok-4.5`                             | Grok 4.5                    | premium      | yes | 500K   |
| `meta/muse-spark-1.1`                      | Muse Spark 1.1              | premium      | yes | 1M     |
| `deepseek/deepseek-v4-flash`               | DeepSeek V4 Flash           | open-source  | yes | 1M     |
| `deepseek/deepseek-v4-pro`                 | DeepSeek V4 Pro             | open-source  | yes | 1M     |
| `zai-org/GLM-5`                            | GLM-5                       | open-source  | yes | 200K   |
| `zai-org/GLM-5.1`                          | GLM-5.1                     | open-source  | yes | 200K   |
| `zai-org/GLM-5.2`                          | GLM-5.2                     | open-source  | yes | 1M     |
| `zai-org/GLM-5.2-Fast`                     | GLM-5.2 Fast                | open-source  | yes | 1M     |
| `moonshotai/Kimi-K2.5`                     | Kimi K2.5                   | open-source  | no  | 256K   |
| `moonshotai/Kimi-K2.6`                     | Kimi K2.6                   | open-source  | no  | 256K   |
| `moonshotai/Kimi-K2.7-Code`                | Kimi K2.7 Code              | open-source  | yes | 256K   |
| `moonshotai/Kimi-K2.7-Code-Highspeed`      | Kimi K2.7 Code HighSpeed    | open-source  | yes | 262K   |
| `xiaomi/mimo-v2.5`                         | MiMo V2.5                   | open-source  | yes | 1M     |
| `xiaomi/mimo-v2.5-pro`                     | MiMo V2.5 Pro               | open-source  | yes | 1M     |
| `MiniMaxAI/MiniMax-M2.5`                   | MiniMax M2.5                | open-source  | no  | 200K   |
| `MiniMaxAI/MiniMax-M2.7`                   | MiniMax M2.7                | open-source  | no  | 200K   |
| `MiniMaxAI/MiniMax-M3`                     | MiniMax M3                  | open-source  | yes | 1M     |
| `nvidia/nemotron-3-ultra-550b-a55b`        | Nemotron 3 Ultra            | open-source  | yes | 1M     |
| `Qwen/Qwen3.6-Max-Preview`                 | Qwen 3.6 Max Preview        | open-source  | yes | 200K   |
| `Qwen/Qwen3.6-Plus`                        | Qwen 3.6 Plus               | open-source  | yes | 200K   |
| `Qwen/Qwen3.7-Max`                         | Qwen 3.7 Max                | open-source  | yes | 1M     |
| `Qwen/Qwen3.7-Plus`                        | Qwen 3.7 Plus               | open-source  | yes | 1M     |
| `stepfun/Step-3.5-Flash`                   | Step 3.5 Flash              | open-source  | yes | 1M     |
| `stepfun/Step-3.7-Flash`                   | Step 3.7 Flash              | open-source  | yes | 256K   |
| `tencent/Hy3`                              | Tencent Hy3                 | open-source  | yes | 262K   |

The table above reflects the bundled offline catalog. At startup, the plugin
adds models returned by Command Code's public `/provider/v1/models` endpoint,
including newer GPT-5.6 models. Run `bun run sync` to refresh `models.json` from
that endpoint.

## Development

```bash
git clone https://github.com/brent-weatherall/commandcode-go-opencode-provider.git
cd commandcode-go-opencode-provider
bun install
```

For local testing, create `opencode.local.json` (gitignored) with `file://` paths:

```json
{
  "plugin": ["file:///path/to/commandcode-go-opencode-provider/server"],
  "provider": {
    "commandcode": {
      "npm": "file:///path/to/commandcode-go-opencode-provider",
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
