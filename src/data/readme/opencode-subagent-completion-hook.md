# opencode-subagent-completion-hook

An [OpenCode](https://opencode.ai) plugin that runs an arbitrary shell command whenever a subagent completes.

## Installation

Add the plugin to your `opencode.jsonc`:

```jsonc
{
  "plugin": [
    "opencode-subagent-completion-hook"
  ]
}
```

## Usage

Add an `on_complete` option to an agent's frontmatter:

```markdown
---
name: my-agent
options:
  on_complete: my-post-process-script
---
```

When the agent finishes, the plugin pipes the agent's output to the command via stdin and replaces the output with the command's stdout.

## License

MIT
