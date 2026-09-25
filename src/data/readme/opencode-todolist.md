# opencode-todolist

OpenCode V2 plugin that restores the session todo list tools (`todowrite` / `todoread`) that shipped with OpenCode V1.

OpenCode V2 removed the built-in todo tools. This plugin brings them back as a server plugin:

- **`todowrite`** — create or replace the todo list for the current session.
- **`todoread`** — read the current list back.

Lists are stored per session and a compact summary is injected into the session context on every model request while tasks are still open, so the model keeps track of them across long conversations and context compaction.

## Install

```bash
opencode plugin add opencode-todolist
```

Or add it manually to `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-todolist"]
}
```

Restart OpenCode if the plugin is not picked up automatically.

## Usage

Ask the agent to "make a todo list for this task", or let it use the tools on its own while working. You can also ask it to "read the todo list" at any point.

Each todo has:

| Field | Values |
| --- | --- |
| `content` | Short, imperative task description |
| `status` | `pending`, `in_progress`, `completed`, `cancelled` |
| `priority` | Optional: `high`, `medium`, `low` |

Example output:

```
1. [ ] Fix flaky checkout spec
2. [•] Refactor payment webhook handler — high priority
3. [x] Add regression test
4. [-] Update changelog
```

`todowrite` always receives the complete list and replaces the previous one. Passing `{"todos": []}` clears it.

## Sidebar

The terminal client shows a live todo strip at the end of the session sidebar, styled like the V1 sidebar todo list:

```
▼ Todo [1/3] · 33%
────────────────────────
[ ] Fix flaky checkout spec
[•] Refactor payment webhook handler
[✓] Add regression test
```

In-progress tasks use the warning color and everything else is muted, matching OpenCode V1. The heading shows completed/total and the percentage; either part can be turned off. Long items wrap, lists longer than two items collapse with a click, and the strip hides itself once everything is completed.

Run `/todo-sections` (or pick "Todolist: Settings" from the command palette) to configure:

| Setting | Default | Values |
| --- | --- | --- |
| Show count | on | on/off |
| Show percentage | on | on/off |
| Header separator | line | none / line / line + blank |
| Collapse threshold | 2 | 2/3/5 |
| Border | off | on/off |

To enable the strip, add the package to the terminal client plugin list:

```json
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-todolist"]
}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

To load your working copy before publishing, point the global `plugins` config at this directory:

```json
{
  "plugins": ["/absolute/path/to/opencode-todolist"]
}
```

Plugin changes under watched config directories reload automatically; otherwise restart the OpenCode service.

## License

MIT
