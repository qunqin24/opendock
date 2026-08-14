# opencode-sumopod

[OpenCode](https://opencode.ai) plugin for **Sumopod** — a multi-model AI provider.

---

## Quick Start

```bash
npx opencode-sumopod install
```

That's it. The installer writes the provider config (with all 50+ models) to your global OpenCode config automatically.

Then:
1. Open `opencode`
2. Run `/connect` → search **Sumopod** → enter your API key
3. Run `/models` → pick any Sumopod model
4. Start coding!

---

## What the installer does

Writes the following to `~/.config/opencode/opencode.json`:

- Adds `"opencode-sumopod"` to the `plugin` list
- Registers the full Sumopod provider config with all available models

No manual file editing required.

---

## Uninstall

```bash
npx opencode-sumopod uninstall
```

To also remove the stored API key:
```bash
opencode auth remove sumopod
```

---

## Available Models (50+)

| Model ID | Display Name | Context | Provider |
|---|---|---|---|
| `qwen3.6-flash` | Qwen 3.6 Flash | 991K | Alibaba |
| `qwen3.6-plus` | Qwen 3.6 Plus | 991K | Alibaba |
| `claude-haiku-4-5` | Claude Haiku 4.5 | 200K | Anthropic |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 | 1M | Anthropic |
| `claude-opus-4-6` | Claude Opus 4.6 | 1M | Anthropic |
| `deepseek-v3-2` | DeepSeek V3.2 | 96K | BytePlus |
| `kimi-k2-5-260127` | Kimi K2.5 | 256K | BytePlus |
| `seed-2-0-code` | Seed 2.0 Code | 256K | BytePlus |
| `seed-2-0-pro` | Seed 2.0 Pro | 256K | BytePlus |
| `deepseek-v4-flash` | DeepSeek V4 Flash | 1M | DeepSeek |
| `deepseek-v4-pro` | DeepSeek V4 Pro | 1M | DeepSeek |
| `gemini/gemini-2.5-flash` | Gemini 2.5 Flash | 1M | Google |
| `gemini/gemini-2.5-pro` | Gemini 2.5 Pro | 1M | Google |
| `gemini/gemini-3-flash-preview` | Gemini 3 Flash | 1M | Google |
| `gemini/gemini-3-pro-preview` | Gemini 3 Pro | 1M | Google |
| `gpt-4.1` | GPT-4.1 | 1M | OpenAI |
| `gpt-5` | GPT-5 | 272K | OpenAI |
| `gpt-5.1-codex` | GPT-5.1 Codex | 272K | OpenAI |
| `gpt-5.2-codex` | GPT-5.2 Codex | 272K | OpenAI |
| `kimi-k2.6` | Kimi K2.6 | 262K | Moonshot |
| `glm-5` | GLM-5 | 200K | Z.AI |
| `glm-5.1` | GLM-5.1 | 200K | Z.AI |
| *(and 30+ more)* | | | |

---

## Troubleshooting

**Models not showing in `/models` after install**
- Make sure you ran the installer: `npx opencode-sumopod install`
- Restart opencode after installing
- Confirm API key is set: `opencode auth list`

**Clear plugin cache if needed**
```bash
rm -rf ~/.cache/opencode/node_modules/opencode-sumopod
```
Then restart opencode.

---

## License

MIT