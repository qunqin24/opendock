# opencode-nvim-editor-context

An [OpenCode](https://opencode.ai) plugin that connects the AI agent to your current [Neovim](https://neovim.io/) editor state. The agent can see what file you have open, where your cursor is, what text you have selected, and any diagnostics (errors/warnings). It can also open files and highlight code in Neovim when you ask it to show you something.

## How it works

The plugin connects OpenCode to a running Neovim instance via its built-in RPC socket. When the agent needs to know what you're looking at, it queries Neovim for the current editor state and gets back a JSON response. When the agent needs to show you code, it can ask Neovim to open a file, move the cursor, and highlight a range.

```
┌──────────────────────────────┬─────────────────────────────────┐
│                              │                                 │
│  Neovim                      │  OpenCode                       │
│                              │                                 │
│  cursor at line 42           │  User: "Why does this function  │
│  ▌                           │   return null sometimes?"       │
│  function foo(items) {       │                                 │
│  ~~~~~~~~ selected ~~~~~~~~  │  Agent: "The function at line   │
│                              │   42 can return null when the   │
│                              │   `items` array is empty — the  │
│                              │   early return on line 44 exits │
│                              │   before reaching the reduce."  │
│                              │                                 │
└──────────────────────────────┴─────────────────────────────────┘
```

The agent can see:

- **Current file** — absolute path of the open buffer
- **Cursor position** — line and column (1-indexed)
- **Visual selection** — start/end positions and the selected text
- **Diagnostics** — LSP errors, warnings, and hints for the current buffer

The agent can also update Neovim's view:

- **Open files** — bring a file or buffer into view
- **Move the cursor** — jump to a specific line and column
- **Highlight code** — mark a line or range without changing your visual selection

## Components

The plugin has two parts that are installed separately:

### 1. Neovim plugin (`lua/editor-context/`)

A Lua module that registers global `EditorContext()` and `EditorView()` functions. `EditorContext()` gathers the current editor state and returns it as JSON. `EditorView()` opens a file, moves the cursor, and optionally highlights a range. Both are queryable via Neovim's RPC socket from outside the editor.

### 2. OpenCode plugin (`opencode-plugin/index.ts`)

An OpenCode plugin that registers two tools:

- `editor_context` — queries Neovim's `EditorContext()` function and returns the current editor state.
- `editor_view` — calls Neovim's `EditorView()` function to open a file, move the cursor, and optionally highlight code.

## Dependencies

- [Neovim](https://neovim.io/) 0.9+
- [OpenCode](https://opencode.ai) 1.3+

## Installation

### 1. Neovim plugin

Using [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "talldan/opencode-nvim-editor-context",
  config = function()
    require("editor-context").setup()
  end,
}
```

### 2. OpenCode plugin

Add the plugin to your `opencode.json` configuration:

```json
{
  "plugin": ["opencode-nvim-editor-context"]
}
```

This can go in your global config (`~/.config/opencode/opencode.json`) or a project-level config (`opencode.json` in your project root).

Restart OpenCode to load the plugin. The `editor_context` and `editor_view` tools will be available to the AI agent automatically.

### 3. Neovim RPC socket

The tool communicates with Neovim via its RPC socket. In most cases, **no configuration is needed** — the tool auto-discovers running Neovim instances.

#### Auto-discovery (default)

The tool automatically finds Neovim by:

1. Checking the `NVIM_SOCKET` environment variable (if set, always used)
2. Scanning for Neovim sockets in standard locations (`$TMPDIR` and `/tmp`)
3. Preferring the Neovim instance whose working directory matches the current project
4. Falling back to the first live Neovim instance found

This means if you just run `nvim` in your project directory, OpenCode will find it automatically.

#### Explicit configuration (optional)

If auto-discovery doesn't work for your setup (e.g., multiple Neovim instances in the same directory), you can set the socket path explicitly:

```bash
export NVIM_SOCKET=/tmp/nvim.sock
nvim --listen $NVIM_SOCKET
```

Make sure `NVIM_SOCKET` is set in the environment where OpenCode runs.

If you use [CMUX](https://cmux.com), you can set this in your workspace configuration so both Neovim and OpenCode share the socket path automatically.

## Example

Say you have a file open in Neovim with your cursor on a function, and you ask the agent "why does this return null sometimes?" The agent calls the `editor_context` tool and gets back:

```json
{
  "file": "/Users/you/project/src/utils.ts",
  "cursor": { "line": 42, "col": 5 },
  "selection": {
    "start_line": 42,
    "start_col": 1,
    "end_line": 48,
    "end_col": 2,
    "text": "function foo(items: string[]) {\n  if (!items.length) {\n    return null;\n  }\n  return items.reduce((acc, item) => acc + item.length, 0);\n}"
  },
  "diagnostics": [
    { "line": 43, "col": 5, "severity": "WARN", "source": "typescript", "message": "Type 'null' is not assignable to type 'number'" }
  ]
}
```

The agent now knows exactly what code you're looking at, what text you selected, and that there's a type warning on the early return. It can answer your question directly without needing to read the file or guess what you meant by "this".

You can also ask the agent to show code in Neovim:

> Show me the code you're talking about.

The agent can call `editor_view` with a target file and range:

```json
{
  "filePath": "src/utils.ts",
  "line": 42,
  "column": 1,
  "endLine": 48,
  "endColumn": 2
}
```

Neovim opens `src/utils.ts`, moves the cursor to line 42, centers the view, and highlights the requested range. Multi-line ranges without columns highlight full lines. Highlights are applied through a private namespace, so they do not change or clear your visual selection. The previous `editor_view` highlight is replaced by the next `editor_view` call.

## Design

### Architecture

```
OpenCode (agent)                    Neovim (editor)
     │                                   │
     │  nvim --headless --server         │
     │    $NVIM_SOCKET --remote-expr     │
     │    "luaeval('EditorContext()')"    │
     │ ─────────────────────────────────>│
     │                                   │
     │  JSON { file, cursor,             │
     │    selection, diagnostics }       │
     │ <─────────────────────────────────│
     │                                   │
     │  nvim --headless --server         │
     │    $NVIM_SOCKET --remote-expr     │
     │    "luaeval('EditorView(...)')"    │
     │ ─────────────────────────────────>│
     │                                   │
     │  JSON { ok, file, line, column }  │
     │ <─────────────────────────────────│
     │                                   │
```

The tool uses Neovim's `--remote-expr` to evaluate a Lua expression on the running Neovim instance. This is a standard Neovim feature that works in any terminal — no CMUX or specific terminal emulator required.

Key design decisions:

- **`--headless` flag on remote calls**: Prevents Neovim from emitting terminal escape sequences when invoked from a subprocess (e.g., Bun's shell). Without this, the JSON response gets polluted with control codes.
- **Global `EditorContext()` function**: Registered as a global (not module-scoped) so it can be called via `luaeval()` without needing the module require path.
- **Global `EditorView()` function**: Uses Neovim's normal buffer/window APIs to open files, position the cursor, and highlight code without modifying files or visual selection.
- **Selection handling**: Supports both active visual mode selections (using `getpos("v")` and `getpos(".")`) and the last visual selection marks (`'<` and `'>`). This means the agent can see what you selected even after you leave visual mode.
- **Highlight isolation**: `editor_view` highlights use a dedicated Neovim namespace. Only highlights created by this plugin are cleared or replaced.
- **1-indexed positions**: All line and column numbers are 1-indexed to match what users see in the editor, even though Neovim's API is 0-indexed internally.
- **Socket auto-discovery**: When `NVIM_SOCKET` is not set, the tool scans `$TMPDIR/nvim.$USER/` and `/tmp` for Neovim socket files, verifies each is live, and uses `lsof` to match the Neovim process's working directory against the current project. This allows zero-configuration usage — just run `nvim` and OpenCode will find it.

## Future improvements

### File content inclusion

Optionally include a window of lines around the cursor (e.g., 20 lines above and below) so the agent has immediate context without needing to read the file separately.

### Multiple buffer awareness

Report on all open buffers, not just the current one. This would let the agent understand which files the user is working across.

### Change tracking

Track unsaved modifications in the buffer compared to the file on disk. The agent could see what the user has been editing without needing `git diff`.
