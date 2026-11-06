<div align="center">
  <a href="https://wavespeed.ai" target="_blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/WaveSpeedAI/claude-plugins/main/assets/wavespeed-logo-dark.svg">
      <img src="https://raw.githubusercontent.com/WaveSpeedAI/claude-plugins/main/assets/wavespeed-logo-light.svg" alt="WaveSpeed" width="342" height="48"/>
    </picture>
  </a>
</div>

# WaveSpeed plugin for OpenCode

Generate and edit images, videos, audio and 3D from [OpenCode](https://opencode.ai) with every model on [WaveSpeed](https://wavespeed.ai). The plugin adds two things:

- **The hosted WaveSpeed MCP server** (`https://api.wavespeed.ai/mcp`): tools to generate, edit and extend images and videos (default models Seedream 5 Pro and Seedance 2.5), run any model, read its input schema, check prices and your balance. Nothing to install; you approve the connection once in your browser.
- **The `wavespeed` skill**, which tells the agent when to use the MCP tools and when to use the open-source [`wavespeed` CLI](https://github.com/WaveSpeedAI/wavespeed-cli) (for local files, batches and scripts).

## Install

Add the plugin to your OpenCode config (`~/.config/opencode/opencode.json` for every project, or `opencode.json` in one project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@wavespeed/opencode"]
}
```

OpenCode installs it on the next start. Then sign in to WaveSpeed once:

```bash
opencode mcp auth wavespeed
```

Approve the connection on the WaveSpeed page that opens. It creates an API key named `MCP · …` that you can delete on the [API Keys](https://wavespeed.ai/accesskey) page to disconnect.

Optional, for local files: install the CLI with `npm install -g @wavespeed/cli` and run `wavespeed login`.

## What it sends where

The MCP tools send the prompts and media you ask for to WaveSpeed (`api.wavespeed.ai`) to run the models, and return the output URLs. The hosted server cannot read files on your computer; pass public URLs, or use the CLI with `@./path` for local files. The plugin itself collects nothing. Runs are billed to your WaveSpeed account; the agent can quote a price before running. See the [privacy policy](https://wavespeed.ai/static/privacy).

If you already have an MCP server named `wavespeed` in your config (for example with an API key header), the plugin keeps yours.

## Other agents

The same MCP server and skill are packaged for [Claude Code](https://github.com/WaveSpeedAI/claude-plugins), [Codex](https://github.com/WaveSpeedAI/codex-plugins), [Gemini CLI](https://github.com/WaveSpeedAI/wavespeed-gemini-extension) and others; see [wavespeed.ai/cli](https://wavespeed.ai/cli).

## Development

```bash
npm install
npm run check   # TypeScript
npm test        # both plugin entry points against fakes of OpenCode's hooks
```

The skill in `skills/wavespeed/SKILL.md` is a copy of [`skills/SKILL.md` in wavespeed-cli](https://github.com/WaveSpeedAI/wavespeed-cli/blob/main/skills/SKILL.md); update both together.

## License

[MIT](LICENSE)
