# Subagent Drawer

An OpenCode Desktop plugin that opens a subagent's session in the side panel, so the main agent stays on screen.

Clicking a subagent card in the main timeline normally replaces the conversation with the child session. With this plugin, the child opens as a side-panel tab instead. Each tab shows the subagent's title and a green dot while it is running, and the transcript follows new output until you scroll up.

## Requirements

- OpenCode Desktop
- `@opencode/plugin` 2.x

## Install

Add the package to the `plugins` array in your **global** `~/.config/opencode/opencode.json` (OpenCode Desktop loads GUI plugin parts only from the global config):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-subagent-drawer"]
}
```

Restart OpenCode Desktop, then click any subagent card.

## Develop

```bash
npm install
npm run build
```

Point `plugins` at this directory while developing:

```jsonc
{
  "plugins": ["/absolute/path/to/sub-agent-tab-Opencode"]
}
```

`npm run dev` rebuilds the GUI bundle on change. `npm run typecheck` checks the source.

## License

MIT
