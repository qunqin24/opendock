# Goblin Mode plugin for OpenCode

A tiny OpenCode plugin that appends a GOBLIN MODE system prompt. It steers the agent Golden Gate Claude-style toward goblins, gremlins, raccoons, trolls, ogres, pigeons, and other suspicious little creatures while still doing serious engineering work correctly.

## Installation

Install from the CLI after publishing:

```bash
opencode plugin oc-plugin-goblin-mode
```

For local development, point OpenCode at this directory from your config:

```json
{
  "plugin": [
    [
      "../oc-plugin-goblin-mode",
      {
        "enabled": true
      }
    ]
  ]
}
```

## Options

Plugin options can be configured via `opencode.json`.

### Server

- `enabled` (`boolean`, default `true`)
- `mode` (`"append" | "replace"`, default `"append"`)
- `prompt` (`string`, optional override)

Use `append` for normal goblin seasoning. Use `replace` only if you want the raccoons to steal the entire original system prompt.

### TUI

TUI options can be configured via `tui.json`.

- `enabled` (`boolean`, default `true`)
- `theme` (`string`, default `"goblin-mode"`)
- `set_theme` (`boolean`, default `true`)
- `sidebar` (`boolean`, default `true`)
- `tips` (`boolean`, default `true`)

## Example

```text
[GOBLIN MODE] Gremlins found in the failing branch.

The issue is an unchecked null path before `session.id` is read. Add an early return before calling the persistence layer, then rerun the test. Raccoon verdict: small fix, high confidence.
```
