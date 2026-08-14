[繁體中文](./README.zh-TW.md)

# opencode-skill-search

BM25-powered skill search plugin for [OpenCode](https://github.com/anomalyco/opencode) — discover and load agent skills by keyword.

## Why?

OpenCode's built-in `skill` tool embeds the full list of available skills in its tool description, consuming tokens on every request. This plugin replaces that with an on-demand `skill_search` tool that uses BM25 ranking to find relevant skills only when needed.

## What it does

- **`skill_search` tool** — search installed skills by keyword with BM25 relevance ranking
- **System prompt injection** — reminds the agent to search for skills before tackling non-trivial tasks
- **Skill tool trimming** — replaces the verbose skill list in the `skill` tool description with a pointer to `skill_search`

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-skill-search"]
}
```

OpenCode will auto-install the package on next launch.

## Scanned directories

The plugin looks for `SKILL.md` files in these directories:

| Directory | Source |
|-----------|--------|
| `<project>/.opencode/skills/` | Project OpenCode |
| `~/.config/opencode/skills/` | Global OpenCode |
| `<project>/.claude/skills/` | Project Claude-compatible |
| `~/.claude/skills/` | Global Claude-compatible |
| `<project>/.agents/skills/` | Project Agent-compatible |
| `~/.agents/skills/` | Global Agent-compatible |
| `~/.cache/opencode/node_modules/superpowers/skills/` | Installed skill packs |

## Usage

Once installed, the agent will automatically use `skill_search` before tasks. You can also call it directly:

```
skill_search({query: "testing"})
skill_search({query: "docker deployment", max_results: 3})
```

## License

MIT
