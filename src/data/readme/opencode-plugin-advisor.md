# opencode-plugin-advisor

An [opencode](https://opencode.ai) plugin that gives the agent a second opinion.

It registers one tool, `advisor`, which the agent calls to consult a separate,
user-chosen model before acting. The advisor model has read-only tools
(read/grep/glob/webfetch) — it can look things up, but it can never edit
files, run commands, or spawn subtasks.

It also registers a `/advise [question]` slash command (via the plugin's
`config` hook — no separate command file needed) so you can trigger it
explicitly at any time.

## When the agent calls it

- The change is big, risky, hard to reverse, or involves many
  blocking/destructive operations.
- Exploration is done and it has a concrete solution but wants feedback
  before implementing.
- You explicitly ask it to get advice, a second opinion, or check its approach.

## Install

Add the plugin to your opencode config (global `~/.config/opencode/opencode.json`
or a project's `opencode.json`):

```json
{
  "plugin": ["opencode-plugin-advisor"]
}
```

Or, while developing locally, point at the file directly:

```json
{
  "plugin": ["file:///absolute/path/to/advisor/index.ts"]
}
```

Restart opencode after changing config.

## Configure the advisor model

Copy `advisor.example.json` to `advisor.json` and set the model you want to
consult. The plugin looks in, in order:

1. `<project>/advisor.json`
2. `~/.config/opencode/advisor.json`

```json
{
  "model": "anthropic/claude-fable-5"
}
```

Optional fields:

- `system` — override the default advisor system prompt.
- `tools` — override the default tool permissions (`{ "write": false, ... }`).

## Development

```bash
bun install
bunx tsc --noEmit
```
