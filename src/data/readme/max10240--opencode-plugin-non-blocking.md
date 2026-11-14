# OpenCode Plugins

**English** | [简体中文](README.zh-CN.md)

A collection of plugins that remove the small, everyday friction of working with OpenCode.

OpenCode is a capable coding agent. In daily use, though, a few gaps show up again and again: you wait for long
commands, you retype prompts you have written before, you cannot find a decision buried in a long session, secrets end
up in the conversation, and separate sessions cannot talk to each other. These plugins fix those problems without
changing OpenCode itself. They target the OpenCode V2 plugin system: server features in `opencode.jsonc`, TUI features
in `cli.json`.

## Start with Unicorn

[`@max10240/opencode-plugin-unicorn`](./packages/opencode-plugin-unicorn) bundles the whole toolkit behind one package
and one consistent set of options. Enable what you want, turn off what you do not, and keep every feature on the same
version.

```jsonc
// opencode.jsonc — server features
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@max10240/opencode-plugin-unicorn"]
}
```

```jsonc
// cli.json — TUI features (also needed by remote clients)
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@max10240/opencode-plugin-unicorn"]
}
```

Add options only when you want to change a default:

```jsonc
{
  "plugins": [{
    "package": "@max10240/opencode-plugin-unicorn",
    "options": {
      "features": { "imageGen": false },
      "nonBlocking": { "thresholdMs": 5000 }
    }
  }]
}
```

See the [Unicorn README](./packages/opencode-plugin-unicorn/README.md) for every feature and option.

## What's included

| Plugin | What it gives you | Reach for it when |
| --- | --- | --- |
| [Unicorn](./packages/opencode-plugin-unicorn) | Everything below in one package, with independent switches | You want the whole toolkit without installing each plugin separately |
| [Non-blocking](./packages/opencode-plugin-non-blocking) | Long-running Bash and subagent work moves to the background automatically | A build, test run, install, or research subagent is holding up your session |
| [Prompt search](./packages/opencode-plugin-prompt-search) | Search prompts from every past session and insert one without sending it | You remember a prompt but not where or when you wrote it |
| [Session search](./packages/opencode-plugin-session-search) | Search the current conversation and jump to the exact message | A long session has buried the decision, command, or error you need |
| [Send message across sessions](./packages/opencode-plugin-send-message-across-sessions) | Let one session message another, across working directories | Frontend and backend, or two worktrees, need to coordinate |
| [Image generation](./packages/opencode-plugin-image-gen) | Generate or edit images and save them to disk | You need a diagram, illustration, icon, or edited reference without leaving the chat |
| [Show image](./packages/opencode-plugin-show-img) | Preview images inline, without sending image bytes to the model | The agent mentions a screenshot, chart, or generated image and you want to see it |
| [OpenCode Go usage](./packages/opencode-plugin-opencode-go-usage) | Shows 5-hour, weekly, and monthly usage for every signed-in OpenCode Go account | You want to see how much of each Go allowance is left without leaving the TUI |
| [Notepad](./packages/opencode-plugin-notepad) | A scratchpad for folder-scoped and global notes | You think of a follow-up or reminder and do not want to derail the agent |
| [Sensitive encrypt](./packages/opencode-plugin-sensitive-encrypt) | Encrypt text or files with a public key and decrypt only to a file | Secrets need to be stored, moved, or handed to an agent without exposing plaintext |
| [Sensitive protection](./packages/opencode-plugin-sensitive-protection) | Protects credential files by redacting secret values and blocking private keys | Credentials, tokens, or private keys live on your machine |
| [Recommended config](./packages/opencode-plugin-recomended-opencode-config) | Adds curated rules and commands, and sets OpenAI `store:false` | You want a safer, more consistent OpenCode setup without writing rules yourself |

## Install only what you need

Every plugin also works standalone. Open its README for the exact config, keybindings, and options:

- [Non-blocking](./packages/opencode-plugin-non-blocking/README.md)
- [Prompt search](./packages/opencode-plugin-prompt-search/README.md)
- [Session search](./packages/opencode-plugin-session-search/README.md)
- [Send message across sessions](./packages/opencode-plugin-send-message-across-sessions/README.md)
- [Image generation](./packages/opencode-plugin-image-gen/README.md)
- [Show image](./packages/opencode-plugin-show-img/README.md)
- [OpenCode Go usage](./packages/opencode-plugin-opencode-go-usage/README.md)
- [Notepad](./packages/opencode-plugin-notepad/README.md)
- [Sensitive encrypt](./packages/opencode-plugin-sensitive-encrypt/README.md)
- [Sensitive protection](./packages/opencode-plugin-sensitive-protection/README.md)
- [Recommended config](./packages/opencode-plugin-recomended-opencode-config/README.md)

Server-side features are configured in `opencode.jsonc`; TUI features are configured in `cli.json`. Some plugins use
both.

## Development

```bash
bun install
bun run build
bun run typecheck
bun run check
```

`check` is the complete everyday gate; `check:release` is the uncached release gate. All packages share one version.
Releases go through `npm run release -- --release-type=<type>`. See [AGENTS.md](AGENTS.md) for the full workflow and
release rules.
