<p align="center">
  <a href="https://geniffy.com"><img src="https://geniffy.com/brand/geniffy-lockup-ink.png" alt="Geniffy" height="44"></a>
</p>

# Geniffy for OpenCode

OpenCode that remembers you and your projects. Each session starts with what Geniffy knows that matters here, and
what you discuss is saved as you go: every fact with the line it came from, and a plain "nothing stored" instead
of a guess.

[![CI](https://github.com/Geniffy/geniffy-opencode/actions/workflows/ci.yml/badge.svg)](https://github.com/Geniffy/geniffy-opencode/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-geniffy)](https://www.npmjs.com/package/opencode-geniffy)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## Install

Add the plugin to `opencode.json`, in your project or in `~/.config/opencode/` for every project:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-geniffy"]
}
```

OpenCode installs it the next time it starts. Then two sign-ins, each one click in the browser, with no key to
copy:

1. **The memory tools.** Run `opencode mcp auth geniffy`, sign in to Geniffy and choose **Allow**.
2. **Automatic memory.** Type `geniffy login` in a chat. Your browser opens on Geniffy; choose **Allow**.

The plugin runs inside OpenCode, so there is nothing else to install.

## What it does

| When | What happens |
| --- | --- |
| OpenCode starts | The Geniffy memory tools join your config (unless you already have a server named `geniffy`) |
| A session starts | Its system prompt opens with a short summary: what lasts about you, what is going on now, and what was said before about this project |
| You send a message | It is kept until the turn ends |
| The session goes idle | The exchange is saved to Geniffy in the background, who said what kept, so your words become facts about you and the model's do not |

Geniffy learns the facts in each exchange and keeps each one with the line it came from and when it was said. A
newer fact replaces an older one, and when nothing supports an answer, the model is told to say so.

## Commands

Type these in a chat. The plugin answers them itself (the answer shows as a notice), and they are never saved.

| Command | |
| --- | --- |
| `geniffy login` | Sign in for automatic memory (once per computer) |
| `geniffy status` | Whether you're signed in, whether saving is on, and what was saved last |
| `geniffy pause`, `geniffy resume` | Stop or restart saving. Sessions still start with what Geniffy remembers |
| `geniffy logout` | Sign out on this computer |

## What stays on your computer

- **Secrets.** API keys, tokens, passwords, connection-string passwords and private keys are removed before anything
  is saved, matched by shape (`sk-…`, `ghp_…`, `AKIA…`, `xoxb-…`, `password: …` and more).
- **Code.** Code blocks are left out: your repository holds your code, and the memory holds what was decided.
- **Commands.** The Geniffy commands aren't saved.
- **Everything, while paused.** `geniffy pause` stops saving until you resume.
- **The sign-in itself** lives in `~/.geniffy/opencode/`, readable only by you. `geniffy logout` ends it at
  Geniffy and deletes it here.

## One memory, in every app

This is the same memory you can connect to Claude Code, Claude.ai, ChatGPT, Cursor, VS Code and Codex through the
[Geniffy MCP server](https://github.com/Geniffy/geniffy-mcp). See it, correct it or erase it at
[geniffy.com/app](https://geniffy.com/app).

## Develop

```bash
npm test     # node --test, no dependencies
```

Set `GENIFFY_API_URL` to point the plugin at another Geniffy server, and `GENIFFY_PLUGIN_HOME` to keep its files
somewhere other than `~/.geniffy/opencode`.

## Security

Report a vulnerability to ops@geniffy.com, not in a public issue. See the
[security policy](https://github.com/Geniffy/.github/blob/main/SECURITY.md).
