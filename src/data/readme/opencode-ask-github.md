# opencode-ask-github

GitHub repository exploration plugin for OpenCode V2. Clones repositories on-demand and delegates analysis to AI subagents.

## Features

- **Auto-clone**: Repositories are cloned on-demand with shallow clone for speed
- **AI Analysis**: Delegates to the `explore` subagent for codebase analysis
- **Aliases**: Configure shortcuts for frequently used repositories
- **Cache Management**: List and remove cloned repositories

## Installation

This plugin requires OpenCode V2. Add it with the OpenCode CLI:

```bash
opencode plugin add opencode-ask-github
```

Or add it to the `plugins` array of your OpenCode config (`opencode.json`):

```json
{
  "plugins": ["opencode-ask-github"]
}
```

The object form works as well:

```json
{
  "plugins": [{ "package": "opencode-ask-github" }]
}
```

OpenCode loads the server plugin and the `./tui` export from the same package. Repository operations need `git` on `PATH` and SSH access to GitHub.

## Commands

### `/gh-ask <repo> [question]`

Clone/locate a repository and analyze it with AI.

```
/gh-ask sveltejs/svelte how is the component compiler structured?
/gh-ask https://github.com/tailwindlabs/tailwindcss what's the CLI architecture?
/gh-ask sv explain the reactivity system
```

The command runs the same repository preparation as the `gh-ask` tool directly, then submits the tool result as a new user message. Any question after the repository argument is included after the result. Repository preparation completes before the model runs.

The companion TUI plugin displays `Cloning owner/repo…` or `Updating owner/repo…` above the session composer while Git runs, using OpenCode's Braille spinner cadence and semantic text color. The indicator clears when preparation succeeds or fails. For local installations, register the package root so OpenCode can load both the server entry and the `./tui` export.

**Supported input formats:**

- GitHub URLs: `https://github.com/owner/repo`
- owner/repo pairs: `sveltejs/svelte`
- Aliases: `sv` (if configured)

### `/gh-list`

List all cloned repositories and configured aliases.

### `/gh-remove <repo>`

Remove a cloned repository from the cache.

## AI Tool

The plugin provides the repository tool plus two command-support tools required by OpenCode V2's prompt-based command API:

| Tool | Description |
| --------- | ----------------------------------------------------------------- |
| `gh-ask` | Prepare a GitHub repo for exploration (clone/update). Returns the local path and suggests a subagent for analysis. |
| `gh-list` | List cached repositories and configured aliases. |
| `gh-remove` | Remove a cached repository. |

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
