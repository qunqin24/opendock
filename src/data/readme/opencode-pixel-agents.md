# Pixel Agents for OpenCode

An [OpenCode](https://opencode.ai) plugin that visualizes AI agents as animated pixel art characters on a localhost web page. Each agent from [Oh My OpenCode](https://github.com/anomalyco/oh-my-opencode) gets a distinct character with accessories and animations reflecting their current state.

## Features

- **Programmatic pixel art** — Characters are drawn procedurally on Canvas with distinct color palettes and accessories
- **Real-time state tracking** — Each agent's activity (coding, reading, searching, thinking, orchestrating) is reflected visually via WebSocket updates
- **Hover tooltips** — Hover over any character to see what it's currently doing
- **Info page** — Dedicated page explaining each agent's role and responsibilities
- **Maestro Sisyphus** — When Sisyphus delegates work, he conducts like an opera maestro with a baton
- **Zero cloud dependencies** — Runs entirely on localhost (`127.0.0.1:3456`)

## Agents

| Agent | Role | Visual Theme |
|-------|------|-------------|
| **Sisyphus** | Orchestrator | Blue — baton, laptop, clipboard |
| **Oracle** | High-IQ Consultant | Purple — crystal ball, glasses |
| **Librarian** | External Reference Search | Brown — books, magnifying glass |
| **Explore** | Codebase Scanner | Green — binoculars, compass |
| **Prometheus** | Planning Agent | Orange — scroll, torch, blueprint |
| **Metis** | Pre-Planning Consultant | Teal — notepad, question mark, owl |
| **Momus** | Plan Reviewer & Critic | Red — red pen, checklist, mask |
| **Atlas** | Knowledge Base Builder | Dark grey — globe, map, blocks |
| **Hephaestus** | Code Craftsman | Burnt orange — hammer, anvil, wrench |

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": [
    "opencode-pixel-agents"
  ]
}
```

Or install from a local path during development:

```json
{
  "plugin": [
    "/path/to/pixel-agents-opencode"
  ]
}
```

OpenCode will automatically install the plugin on next startup.

## Usage

Once the plugin is loaded, the Pixel Agents web page starts automatically at `http://127.0.0.1:3456`.

You can also open it by asking the AI to use the `pixel-agents` tool:

```
> Use the pixel-agents tool
```

This will open the visualization in your default browser.

### Pages

- **Main page** (`/`) — Live animated view of all agents with their current activity
- **Info page** (`/info.html`) — Reference page describing what each agent does

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime

### Setup

```bash
git clone git@github.com:nichelia/pixel-agents-opencode.git
cd pixel-agents-opencode
bun install
```

### Build

```bash
bun run build        # Build the plugin
bun run typecheck    # Run TypeScript type-checking
bun run clean        # Remove build output
```

### Project Structure

```
src/
  index.ts           # Plugin entry point, event hooks, custom tool
  types.ts           # Type definitions, agent metadata, tool-to-action mapping
  state-manager.ts   # Agent state tracking with broadcast to listeners
  server.ts          # Bun.serve() HTTP + WebSocket server
web/
  index.html         # Main visualization page
  info.html          # Agent info/reference page
  css/styles.css     # Dark theme styling
  js/renderer.js     # Programmatic pixel art character renderer
  js/app.js          # WebSocket client, DOM management, animation loop
```

## How It Works

1. The plugin hooks into OpenCode events (`session.created`, `session.idle`, `tool.execute.before/after`, `chat.message`)
2. Tool executions are mapped to visual actions (e.g. `edit` → coding, `grep` → searching, `task` → orchestrating)
3. State changes are broadcast to connected browsers via WebSocket
4. The frontend renders each agent as an animated pixel art character with action-appropriate accessories

## License

MIT
