# opencode-openrouter-costs

[English](./README.md) | [Português (BR)](./README.pt-BR.md)

OpenCode TUI plugin — sidebar widget showing OpenRouter session cost and account balance.

## Install

```sh
# From npm (recommended)
npx opencode-openrouter-costs

# From source (GitHub)
npx github:mhenrique94/opencode-openrouter-costs
```

The installer asks for your preferred language (English or Portuguese) on first run.
All subsequent output — installer instructions and the widget itself — will use that language.

## What it does

Adds a compact widget to the OpenCode sidebar (above "MCP Servers"):

```
OpenRouter
Session: $0.0523
Balance: $4.21
```

- **Session** — cost of the current session (resets on new session)
- **Balance** — remaining OpenRouter account credit

## Requirements

- OpenCode >= 1.18.30
- OpenRouter provider configured (via `/models` or `OPENROUTER_API_KEY`)

## Uninstall

```sh
npx opencode-openrouter-costs --remove
```

## Language

The widget supports English and Portuguese (BR). The language is chosen at install time
and persisted in `~/.config/opencode/openrouter-cost.json`. To switch later, re-run the
installer or edit the config file directly:

```json
{"lang": "pt"}
```

Valid values: `"en"` or `"pt"`.

## License

MIT
