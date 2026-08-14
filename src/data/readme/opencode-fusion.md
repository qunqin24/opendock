# opencode-fusion

Ask several AI models the same question at once, then have one model read all their answers and write you the best combined reply. It is a plugin for [OpenCode](https://opencode.ai).

Inspired by [OpenRouter Fusion](https://openrouter.ai/blog/announcements/fusion-beats-frontier/), which found that a panel of models, compared and combined, beats any single model on hard questions.

## Why use it

One model has blind spots. Three models rarely share the same ones. Fusion sends your question to a few models at the same time, lets a "judge" model compare their answers, and your assistant writes the final reply from that comparison. You ask once and get a stronger answer.

Use it for research, big decisions, or anything where being wrong is costly. Skip it for quick edits.

## Install

```bash
npm install opencode-fusion
```

Then add it to your OpenCode config (`opencode.json`):

```json
{
  "plugin": ["opencode-fusion"]
}
```

Restart OpenCode. You need API keys for the models you want on the panel. Run `/connect` in OpenCode for each provider (for example Anthropic, OpenAI, DeepSeek).

## How to use it

Just ask your assistant a hard question. It decides on its own when a question is worth a panel and calls fusion. You can also ask directly:

```
Use fusion to compare Postgres and SQLite for my app
```

## Configure (optional)

It works out of the box. To choose your own panel models, judge model, and other settings, create `~/.config/opencode/fusion-config.json`. The full list of options, examples, and how each part works lives in [llms.md](./llms.md).

## Defaults

The default configuration used out of the box:

```json
{
  "judge": {
    "providerID": "anthropic",
    "modelID": "claude-opus-4-8"
  },
  "panel": [
    { "providerID": "anthropic", "modelID": "claude-opus-4-8", "label": "Claude Opus 4.8" },
    { "providerID": "openai", "modelID": "gpt-5.5", "label": "GPT-5.5" },
    { "providerID": "deepseek", "modelID": "deepseek-chat", "label": "DeepSeek" }
  ],
  "panelTools": ["read", "grep", "glob", "list", "webfetch"],
  "judgeTools": ["webfetch"],
  "panelMaxSteps": 16,
  "judgeMaxSteps": 12,
  "panelTimeoutMs": 600000,
  "judgeTimeoutMs": 600000,
  "maxTokensPerPanel": 4096,
  "judgeMaxTokens": 8192,
  "temperature": 0.7
}
```

## License

MIT
