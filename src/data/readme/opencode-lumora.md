# Lumora plugins

Plugins that let Claude, Claude Code, Codex and OpenCode make cinematic product demo videos with [Lumora](https://lumora.video): a screen recording, screenshot or website in, a short trailer with camera moves, callouts, captions and music out.

Each plugin connects to Lumora's hosted MCP server (`https://lumora.video/mcp`, sign in with your Lumora account) and adds a skill that directs the video:

- [`lumora-plugin/`](lumora-plugin/): Claude Code and Codex. See its [README](lumora-plugin/README.md) for the tools and what data goes where.
- [`opencode/`](opencode/): OpenCode 2 and 1.x, published on npm as [`opencode-lumora`](https://www.npmjs.com/package/opencode-lumora). See its [README](opencode/README.md) for install, sign-in and usage.

## Install

**Claude Code**

```
/plugin install lumora --marketplace synthentica/lumora-plugins
```

Then run `/mcp`, pick `lumora` and choose **Authenticate**.

**Codex**

```
codex plugin marketplace add synthentica/lumora-plugins
codex plugin add lumora@lumora
```

**OpenCode**

```
opencode plugin add opencode-lumora
```

or straight from GitHub: `opencode plugin add github:synthentica/lumora-plugins`. Then run `opencode mcp auth lumora` to sign in. On OpenCode 1.x, add `"plugin": ["opencode-lumora"]` to `opencode.json` instead. Full OpenCode guide: [`opencode/README.md`](opencode/README.md).

**Claude, ChatGPT and other MCP clients:** add a custom connector with the address `https://lumora.video/mcp` and sign in when asked.

## Links

[Docs for agents](https://lumora.video/docs/agents) · [Support](https://lumora.video/support) · [Privacy](https://lumora.video/privacy) · [Terms](https://lumora.video/terms)

MIT licensed.
