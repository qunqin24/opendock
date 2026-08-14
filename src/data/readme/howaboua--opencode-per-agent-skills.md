# OpenCode Per-Agent Skills

> **Filter OpenCode skills on a per-agent basis using configurable allowlists and blocklists.**

Prevent skill leakage, enforce agent roles, and keep your system prompt clean.

![skills-overload](https://github.com/user-attachments/assets/d52aca25-377b-4106-8111-ff1ce5dda8e3)

## Installation

Add to your OpenCode config:

```jsonc
// opencode.jsonc
{
  "plugin": ["@howaboua/opencode-per-agent-skills@latest"],
}
```

Using `@latest` ensures you always get the newest version automatically when OpenCode starts.

Restart OpenCode. The plugin will automatically start filtering skills based on your configuration.

## Configuration

The plugin uses its own config file:

- Global: `~/.config/opencode/per-agent-skills.jsonc`, created automatically on first run.

<details>
<summary><strong>Default Configuration</strong> (click to expand)</summary>

```jsonc
{
  // ===========================================================================
  // OpenCode Per-Agent Skills Configuration
  // ===========================================================================

  // 1. Global Filtering (Applies to ALL agents)
  "global": {
    // Skills to show to EVERY agent (overrides agent-specific excludes)
    // "include": ["basic-file-ops"],
    // Skills to hide from EVERY agent
    // "exclude": ["deprecated-skill"]
  },

  // 2. Per-Agent Configuration
  "agents": {
    // Example: Restricted "compaction" agent
    "compaction": {
      "include": ["git-release", "code-summary"],
      "exclude": ["code-modification"],
    },

    // Example: Broad "exploration" agent
    "exploration": {
      "include": ["*-analysis", "*-docs", "file-discovery"],
      "exclude": ["git-push"],
    },
  },

  // 3. Metadata Filters (Advanced)
  "metadataFilters": {
    "category": {
      "review": {
        "include": ["security", "linting"],
      },
    },
  },

  // 4. Debugging
  "verbose": false,
}
```

</details>

## Features

- **Per-Agent Filtering**: Define specific allowlists (`include`) and blocklists (`exclude`) for each agent.
- **Global Rules**: Set baseline rules that apply to all agents.
- **Wildcard Support**: Use `git-*`, `*-analysis`, or `*` patterns.
- **Metadata Filtering**: Filter skills based on frontmatter metadata in their `SKILL.md` files.
- **Safe Defaults**: If no config exists, all skills are shown.

## How It Works

1.  **Intercept**: The plugin hooks into `experimental.chat.system.transform`.
2.  **Identify**: It determines the current agent from the active session.
3.  **Filter**: It filters the `<available_skills>` XML block in the system prompt based on your configuration.

## Development

To install from source for development:

1.  Clone the repository:
    ```bash
    git clone https://github.com/IgorWarzocha/Opencode-per-agent-skills-plugin.git
    cd Opencode-per-agent-skills-plugin
    ```
2.  Install dependencies and build:
    ```bash
    bun install && bun run build
    ```
3.  Link in your OpenCode config:
    ```jsonc
    {
      "plugins": ["/path/to/Opencode-per-agent-skills-plugin"],
    }
    ```

## License

MIT
