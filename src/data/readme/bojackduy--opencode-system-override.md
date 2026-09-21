# opencode-system-override — Overwrite the OpenCode System Prompt

[![npm version](https://img.shields.io/npm/v/@bojackduy/opencode-system-override?style=flat-square)](https://www.npmjs.com/package/@bojackduy/opencode-system-override)
[![license](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue?style=flat-square)](LICENSE)

A server-only [OpenCode](https://opencode.ai) plugin that lets **one agent**
throw away the entire assembled system prompt and replace it with its own.
Put your prompt between the markers in the agent file — everything else
(default prompt, environment info, AGENTS.md, MCP instructions, skills
prompt) is removed for that agent only.

- **Marker absent** (any other agent, compaction, title, summary) → system
  left completely untouched.
- **Markers present** → whole system replaced with the text between them.
- **Empty between markers** → system cleared entirely (pure LLM, no system
  prompt at all).

> Tool access is NOT touched by this hook (no hook exists for the tools
> array). Use `permission: {"*": deny}` in the agent file to block tool use —
> see `agents/Raw.md`.

📦 [npm](https://www.npmjs.com/package/@bojackduy/opencode-system-override) · 🐞 [Issues](https://github.com/bojackduy/opencode-system-override/issues) · 📝 [Changelog](CHANGELOG.md)

## Install

```jsonc
// opencode.jsonc
{
  "plugin": ["@bojackduy/opencode-system-override"]
}
```

Then install the `Raw` agent (one file) into your OpenCode config:

```sh
npx -y @bojackduy/opencode-system-override@latest
```

This registers the plugin in `opencode.jsonc` (if not already present) and
copies `agents/Raw.md` to `~/.config/opencode/agents/Raw.md` (existing file
is overwritten). Set `OPENCODE_CONFIG_DIR` to target a non-default config
directory. Uninstall with:

```sh
npx -y @bojackduy/opencode-system-override@latest --uninstall
```

Then quit and restart opencode (config is loaded once at startup).

> Local development instead:
>
> ```jsonc
> // opencode.jsonc
> { "plugin": ["/path/to/opencode-system-override/src/server.ts"] }
> ```

## Use

Edit `~/.config/opencode/agents/Raw.md` and write your prompt between the
markers:

```md
---
description: Minimal agent with nothing
mode: primary
permission:
  "*": deny
---

RAW_SYSTEM_OVERRIDE_START_9F3A

You are a pirate. Speak like one.

RAW_SYSTEM_OVERRIDE_END_9F3A
```

Select the `Raw` agent and chat — the model sees only your text as its
system prompt. Leave the space empty for a truly empty system (pure LLM).

## Custom agents (any name works)

The hook never checks the agent's name — it only looks for the marker pair
in the assembled system text. So you can give any agent its own override by
putting the markers in its file:

```md
---
description: Code reviewer with no default baggage
mode: primary
permission:
  "*": deny
---

RAW_SYSTEM_OVERRIDE_START_9F3A

You are a senior reviewer. Be terse. Flag only real bugs.

RAW_SYSTEM_OVERRIDE_END_9F3A
```

Each agent carries its own text between the markers; agents without markers
are completely untouched. The shipped `agents/Raw.md` is just a blank
starter — copy it to `Pirate.md`, `Reviewer.md`, whatever you like.

## How it works

OpenCode assembles one system array per request. The
`experimental.chat.system.transform` hook joins it, finds the marker pair,
and mutates `output.system` **in place**:

| Situation | Result |
|---|---|
| No `START` marker (other agents, compaction, title, summary) | untouched |
| `START` but no `END` | untouched + log line (safe no-op) |
| Text between markers | system = that text |
| Nothing/whitespace between markers | system = `[]` (pure LLM) |

## Dev

```sh
bun install
bun run typecheck
bun test
bun run build
```

Releases are tag-gated: push `v*.*.*` and the [publish workflow](.github/workflows/npm-publish.yml) typechecks, tests, builds, publishes to npm with provenance, and cuts a GitHub release from the [changelog](CHANGELOG.md).

## License

[AGPL-3.0-or-later](LICENSE)
