# opencode-model-toggle

Quick model switching for OpenCode via editor hotkeys. Cycle between your 3 favorite models with a single keystroke instead of navigating the `/models` menu.

## Quick Start

### Installation (LLM-assisted)
Paste this into any LLM agent:

```
Install the opencode-model-toggle plugin by following: https://raw.githubusercontent.com/cloudboy-jh/opencode-mode-toggle/main/README.md
```

### Installation (Manual)
```bash
npm install -g opencode-model-toggle
```

Add to `~/.config/opencode/opencode.json`:
```json
{ "plugin": ["opencode-model-toggle"] }
```

Restart OpenCode and run:
```
/model-toggle setup
```

## Commands

```bash
/m                      # Cycle to next model
/model-toggle           # Same as /m
/model-toggle show      # Display rotation
/model-toggle set 2     # Jump to model #2
/model-toggle setup     # Reconfigure
/model-toggle reset     # Restore defaults
```

## Configuration

Config file: `~/.config/opencode/model-toggle.json`

```json
{
  "models": [
    "claude-sonnet-4.5",
    "gemini-2.0-flash-exp",
    "claude-haiku-4.5"
  ],
  "currentIndex": 0,
  "version": "1.0.0"
}
```

## Editor Hotkeys

### Zed (`~/.config/zed/keymap.json`)
```json
{
  "bindings": {
    "cmd+shift+m": ["task::Spawn", {
      "task_name": "Model Toggle",
      "command": "opencode",
      "args": ["run", "/m"]
    }]
  }
}
```

### VS Code / Cursor (`keybindings.json`)
```json
{
  "key": "cmd+shift+m",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "opencode run '/m'\n" }
}
```

## Development

```bash
bun install
bun run dev
bun run build
bun run dev:test
```

## License

MIT
