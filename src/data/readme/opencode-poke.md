# opencode-poke

[![npm version](https://img.shields.io/npm/v/opencode-poke.svg)](https://www.npmjs.com/package/opencode-poke)
[![npm downloads](https://img.shields.io/npm/dm/opencode-poke.svg)](https://www.npmjs.com/package/opencode-poke)
[![license](https://img.shields.io/npm/l/opencode-poke.svg)](./LICENSE)

OpenCode TUI plugin to interact with stuck agents and subagents — abort, retry, or send instructions to frozen sessions.

## What it does

- **Auto-detects what's stuck** — checks busy subagents first, then the main agent
- **Abort** — kills a stuck session so the parent can retry
- **Abort + send message** — kills it, then sends a follow-up message so it resumes with new instructions
- **Abort + poke parent** — kills a stuck subagent and tells the parent to retry the task
- **Works on both agents and subagents** — one command handles everything

## Why

OpenCode subagents can freeze when an LLM provider silently drops an SSE connection or stops sending chunks. The main agent has ESC + "continue" as a workaround, but subagents have no equivalent — they just hang forever with no way to interact. This plugin gives you a way to unstick them.

See [anomalyco/opencode#13841](https://github.com/anomalyco/opencode/issues/13841) for the upstream issue.

## Install

```bash
opencode plugin opencode-poke -g
```

This installs the package globally and updates your `tui.json` automatically.

Or manually:

```bash
npm install -g opencode-poke
```

Then add to your `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-poke"]
}
```

## Usage

Open the command palette and select **"Poke"**, or bind a keyboard shortcut (see below).

### Add a keyboard shortcut

Add to your `tui.json`:

```json
{
  "tui": {
    "keybinds": {
      "poke.global": {
        "poke.session": "ctrl+k"
      }
    }
  }
}
```

Replace `ctrl+k` with whatever key combo you prefer.

### Flow

1. Press your keybinding or select "Poke" from the command palette
2. If one session is stuck, you go straight to the action picker
3. If multiple are stuck, you pick which one first
4. Choose an action:
   - **Abort** — stop the session
   - **Abort + send message** — stop it, then send a message to resume with new context
   - **Abort + poke parent** — stop a subagent and tell the parent to retry (subagents only)

## Development

```bash
bun install
bun run typecheck
bun run build
```

## Releasing

Releases are automated via GitHub Actions. To cut a new release:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) builds, publishes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements), and creates a GitHub Release with auto-generated notes.

## License

MIT
