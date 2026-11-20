# Tally

[![npm version](https://img.shields.io/npm/v/opencode-tally.svg)](https://www.npmjs.com/package/opencode-tally)

Token usage, context, cache, cost, and subscription quota for OpenCode sessions.

Tally is an OpenCode plugin that turns the usage your session has already recorded into a readable report. It keeps recorded provider numbers separate from local estimates, so you can tell what was measured and what was guessed. Requires OpenCode V2 (2.0 or newer).

## What you get

- **Sidebar block** — always-on summary of quota, context, recorded usage, and the context window.
- **Native panel** — `/tally` opens a side panel with the same information in more detail, plus last request, always-sent context, tool output, and subagents.
- **Text report** — `/tally-report` prints the full report into the session for copying or searching.
- **Context, cache, and cost breakdown** — recorded usage buckets, cache hit rate and savings, and cost (recorded or labeled estimate).
- **Subscription quota** — read usage limits from 14 supported subscriptions (Codex, Claude Code, OpenRouter, and others) in the sidebar and report.

## Install

```bash
opencode plugin add opencode-tally
```

Restart OpenCode, then run `/tally` for the side panel or `/tally-report` for the text report.

## Quick config

Create `~/.config/opencode/tally-config.json` to change settings. For example, to hide the sidebar's bars and connect one subscription:

```jsonc
{
  "sidebar": { "showBars": false },
  "quota": {
    "providers": {
      "codex": { "enabled": true }
    }
  }
}
```

All settings and their defaults are in the [settings reference](docs/settings.md).

## Documentation

- [User docs home](docs/README.md) — start here.
- [Install and uninstall](docs/guides/install.md)
- [Getting started](docs/getting-started.md)
- [Settings](docs/settings.md)
- [Subscriptions](docs/subscriptions.md)
- [Reports](docs/reports.md)

Full docs: https://github.com/myyra0/opencode-tally/tree/main/docs

## License

[MIT](LICENSE)