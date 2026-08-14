# @rolled-potatoes/opencode-mermaid

An [OpenCode](https://opencode.ai) plugin that renders Mermaid diagrams in your browser.

Whenever the AI writes a `mermaid` code block, it automatically calls `render_mermaid` to open the diagram in your default browser. Multiple diagrams within the same session are accumulated in a single HTML file.

## Install

Add the package name to the `plugin` array in your `opencode.json`:

```json
{
  "plugin": ["@rolled-potatoes/opencode-mermaid"]
}
```

OpenCode will install it automatically on next start.

## Features

- Opens diagrams in the browser via a local HTML file (`/tmp/mermaid-<sessionID>.html`)
- Accumulates all diagrams from a session in one file — just refresh the tab
- Collapsible source view for each diagram
- Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`)
- Uses [Mermaid.js v11](https://mermaid.js.org) via CDN — no build step needed

## Supported diagram types

flowchart, sequence, class, pie, gantt, state, ER, mindmap, timeline, git graph, and anything else Mermaid supports.

## License

MIT
