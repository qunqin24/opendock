# OpenCode Browser Plugin

A browser automation plugin for [OpenCode](https://opencode.ai), powered by [Playwright](https://playwright.dev/). It exposes browser-control tools that allow an AI agent to navigate web pages, interact with elements, take screenshots, and execute JavaScript — all from within an OpenCode session.

[中文文档](./README.zh.md)

## Features

- **Headless & Headed Modes** — Run the browser invisibly or with a visible window for debugging/demos.
- **Ref-Based Element Targeting** — ARIA snapshot generates stable `ref` identifiers (e.g. `e1`, `e2`) for interactive elements, enabling reliable clicks and typing.
- **Multi-Tab Support** — Open and manage multiple pages simultaneously via `page_id`.
- **Persistent Browser Profile** — Session data (cookies, localStorage, etc.) is preserved at `~/.opencode/browser-profile`.
- **Idle Auto-Close** — Browser automatically shuts down after 30 minutes of inactivity to conserve resources.
- **Convenience Shortcuts** — Four dedicated shortcut tools (`browser_start`, `browser_snapshot`, `browser_click`, `browser_type`) for the most common actions.

## Setup

Add the plugin to your [OpenCode config](https://opencode.ai/docs/config/):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-browser-plugin"]
}
```

That's it. OpenCode will automatically install the plugin on next run.

> **Note:** You also need Playwright Chromium installed: `bunx playwright install chromium`

## Usage

### Basic Workflow

```
1. Start the browser     →  browser(action: "start")
2. Open a URL             →  browser(action: "open", url: "https://example.com")
3. Take a snapshot        →  browser(action: "snapshot")
4. Interact with elements →  browser(action: "click", ref: "e1")
                            browser(action: "type", ref: "e3", text: "hello")
5. Stop when done         →  browser(action: "stop")
```

### Main Tool — `browser`

A single multiplexed tool that accepts an `action` parameter:

| Action       | Description                                     | Key Parameters                     |
| ------------ | ----------------------------------------------- | ---------------------------------- |
| `start`      | Launch the browser                              | `headed`                           |
| `stop`       | Close the browser and clean up                  | —                                  |
| `open`       | Open a URL in a new tab                         | `url`, `page_id`                   |
| `navigate`   | Navigate the current tab to a URL               | `url`                              |
| `back`       | Go back in browser history                      | —                                  |
| `snapshot`   | Capture an ARIA snapshot with element refs      | `path`                             |
| `screenshot` | Take a screenshot of the page or an element     | `ref`, `path`, `full_page`         |
| `click`      | Click an element                                | `ref`, `selector`, `wait`          |
| `type`       | Type text into an element                       | `ref`, `selector`, `text`, `submit`, `slowly` |
| `evaluate`   | Execute JavaScript in the page context          | `code`                             |
| `wait`       | Wait for a duration or network idle             | `wait`                             |
| `close`      | Close a specific tab                            | `page_id`                          |

### Shortcut Tools

| Tool               | Description                              | Key Parameters        |
| ------------------ | ---------------------------------------- | --------------------- |
| `browser_start`    | Start browser (headed by default)        | `headed`              |
| `browser_snapshot` | Get interactive element refs from page   | `page_id`             |
| `browser_click`    | Click an element by ref                  | `ref`, `page_id`      |
| `browser_type`     | Type text into an element by ref         | `ref`, `text`, `submit`, `page_id` |

### Example: Search on a Website

```
1. browser_start(headed: true)
2. browser(action: "open", url: "https://www.google.com")
3. browser_snapshot()
   → Returns refs like: e1 (textbox), e2 (button "Google Search"), ...
4. browser_type(ref: "e1", text: "OpenCode AI")
5. browser_click(ref: "e2")
```

### Example: Take a Screenshot

```
browser(action: "screenshot", path: "output.png", full_page: true)
```

### Example: Execute JavaScript

```
browser(action: "evaluate", code: "document.title")
```

## Architecture

- **Single source file** — Everything lives in `index.ts`. No build step required.
- **Module-level state** — All browser state is held in a plain `state` object (context, pages, refs, etc.).
- **Ref system** — `buildSnapshot()` runs Playwright's ARIA snapshot on `<body>`, assigns sequential `e1`, `e2`, … refs to interactive elements (buttons, links, textboxes, etc.), and stores them per page. Click/type actions resolve refs via `getLocatorByRef()` using `page.getByRole()`.
- **ESM only** — The project uses `"type": "module"` and Bun's native TypeScript execution.

## Configuration

| Setting | Default | Description |
| ------- | ------- | ----------- |
| Profile directory | `~/.opencode/browser-profile` | Browser data (cookies, storage, etc.) |
| Idle timeout | 30 minutes | Auto-close browser after inactivity |
| Viewport | 1280 × 720 | Default browser viewport size |
| Default timeout | 30 000 ms | Timeout for page navigation and actions |

## License

MIT
