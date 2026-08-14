# Opointer - Point to DOM Element


https://github.com/user-attachments/assets/be8eb8fb-35a5-4143-8d85-5810542e3b4f



A browser extension that enables DOM editing via OpenCode. Select any DOM element on a webpage, and OpenCode will implement changes to your local project files based on your natural language instructions.

## Overview

Opointer consists of two components:

1. **Browser Extension** - DOM element selection tool (NOT PUBLISHED YET - Firefox/Chrome)
2. **OpenCode Plugin** (`opencode-opointer`) - WebSocket bridge server

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser Extension                           │
│  - Project selector (popup)                                      │
│  - Element selection via Cmd+Shift+E                             │
│  - DOM context capture                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket (ws://localhost:51861)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 opencode-opointer Plugin                         │
│  - WebSocket Server (port 51861)                                │
│  - Routes element context to OpenCode SDK                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ Internal
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OpenCode                                  │
│  - Receives DOM context + user prompt                            │
│  - Implements file changes in local project                     │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- [OpenCode](https://opencode.ai) running locally
- Node.js 18+ (for building extension if needed)

## Installation

### 1. Install OpenCode Plugin

Add to your OpenCode config (`opencode.json`):

```json
{
  "plugin": ["opencode-opointer"]
}
```

OpenCode will automatically install the plugin on startup.

### 2. Install Browser Extension


**Firefox**:
- [`Install firefox addon through firefox addon store"](https://addons.mozilla.org/en-US/firefox/addon/opencode-element-pointer/)

**Chrome** (idk if its working - im not using chrome, so you can test it and send feedback through issues):

## Quick Start

1. **Open OpenCode** - Plugin starts WebSocket server on port 51861
2. **Click extension icon** - Select a project from dropdown, click Save
3. **Navigate to webpage** - Open the site you want to edit
4. **Press Cmd+Shift+E** (Mac) / Ctrl+Shift+E (Windows/Linux) - Enter selection mode
5. **Click on element** - Element context sent to OpenCode
6. **Type prompt in OpenCode** - Describe the change you want

## How It Works

### Element Selection Flow

1. **User presses shortcut** - `Cmd+Shift+E` triggers selection mode
2. **Overlay appears** - Semi-transparent overlay with crosshair cursor
3. **User hovers** - Elements are highlighted with outlines
4. **User clicks element** - DOM context is captured:
   - Tag name, attributes, styles
   - XPath selector
   - Source file location (if available via `element-source`)
   - Parent hierarchy, children
5. **Context sent to OpenCode** - Via WebSocket to `opencode-opointer` plugin
6. **User edits in OpenCode** - Natural language prompt in OpenCode TUI

### What Happens in OpenCode

The plugin appends element context to OpenCode's TUI:

```
## Element Source Information
**Source File**: src/App.svelte:24

## DOM Element Details
- Tag: button
- Attributes: {"class":"btn","data-id":"submit"}
- Text: Submit

The user wants to make changes to this element.
Ask the user what changes they want to make and then implement them.
```

OpenCode then uses this context to implement the user's requested changes.

## Configuration

### Extension Popup

1. Click the extension icon in browser toolbar
2. Select a project from the dropdown (fetches from OpenCode)
3. Click "Save"

### OpenCode Plugin

No additional configuration needed. The plugin uses port 51861 by default.

## Project Structure

```
opointer/
├── packages/
│   ├── extension/              # Browser extension
│   │   ├── src/
│   │   │   ├── content.ts      # DOM selection, overlay, capture
│   │   │   ├── background.ts    # WebSocket client, message routing
│   │   │   ├── popup.ts        # Project selector UI
│   │   │   └── types.ts        # TypeScript interfaces
│   │   └── dist/               # Built extension (chrome/, firefox/)
│   │
│   └── opencode-plugin/        # OpenCode plugin (published as npm)
│       ├── src/
│       │   ├── index.ts         # Plugin entry point
│       │   ├── wsbridge.ts      # WebSocket server
│       │   ├── types.ts         # Type definitions
│       │   └── elementSource.ts  # Source code detection
│       └── dist/               # Built plugin
│
└── dist/                        # Distribution files
    └── opointer-extension-firefox.xpi
```

## Building

```bash
# Build extension for both browsers
npm run build --workspace=@opointer/extension

# Build plugin
npm run build --workspace=@opointer/opencode-plugin

# Build everything
npm run build
```

### Extension
- Vanilla JS with esbuild
- `element-source` for source code detection
- `browser.storage.local` for project persistence

### Plugin
- `@opencode-ai/plugin` - OpenCode plugin API
- `ws` - WebSocket server
- `element-source` - Source code detection

## License

MIT
