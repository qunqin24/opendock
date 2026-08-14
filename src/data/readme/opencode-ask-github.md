# opencode-ask-github

GitHub repository exploration plugin for OpenCode. Clones repositories on-demand and delegates analysis to AI subagents.

## Features

- **Auto-clone**: Repositories are cloned on-demand with shallow clone for speed
- **AI Analysis**: Delegates to the `explore` subagent for codebase analysis
- **Aliases**: Configure shortcuts for frequently used repositories
- **Cache Management**: List and remove cloned repositories

## Installation

Install via npm/bun:

```bash
bunx opencode-ask-github
# or
npx opencode-ask-github
```

Or add manually to your OpenCode configuration (`~/.config/opencode/config.json`):

```json
{
  "plugins": ["opencode-ask-github"]
}
```

## Commands

### `/gh-ask <repo> [question]`

Clone/locate a repository and analyze it with AI.

```
/gh-ask sveltejs/svelte how is the component compiler structured?
/gh-ask https://github.com/tailwindlabs/tailwindcss what's the CLI architecture?
/gh-ask sv explain the reactivity system
```

The command nudges the AI to use the `gh-ask` tool, which prepares the repository locally. The AI then delegates to a subagent for exploration.

**Supported input formats:**

- GitHub URLs: `https://github.com/owner/repo`
- owner/repo pairs: `sveltejs/svelte`
- Aliases: `sv` (if configured)

### `/gh-list`

List all cloned repositories and configured aliases.

### `/gh-remove <repo>`

Remove a cloned repository from the cache.

## AI Tool

The plugin provides a single tool for the AI:

| Tool | Description |
| --------- | ----------------------------------------------------------------- |
| `gh-ask` | Prepare a GitHub repo for exploration (clone/update). Returns the local path and suggests a subagent for analysis. |

The AI can call this tool directly when it needs to explore a repository, even without the `/gh-ask` command.

## Configuration

Configuration is stored in `~/.config/opencode/ask-github.json`.

### Aliases

Add aliases for frequently used repositories by editing the config file directly:

```json
{
  "aliases": {
    "sv": "sveltejs/svelte",
    "tw": "tailwindlabs/tailwindcss"
  }
}
```

You can also use `/gh-list` to see all configured aliases.

### Prompt

Customize which subagent is suggested for repository exploration:

```json
{
  "prompt": {
    "agent": "general"
  }
}
```

Default agent is `explore`.

## Storage

Repositories are cloned to `~/.cache/opencode-github/{owner}/{repo}/`.

## License

MIT
