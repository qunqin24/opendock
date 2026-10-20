# opencode-todolist

OpenCode V2 plugin that restores the session todo list tools (`todowrite` / `todoread`) that shipped with OpenCode V1.

OpenCode V2 removed the built-in todo tools. This plugin brings them back as a server plugin:

- **`todowrite`** — create or replace the todo list for the current session.
- **`todoread`** — read the current list back.
- **`/todo`** — post the current list into the conversation.

Lists are stored per session and a compact summary is injected into the session context while tasks are still open — at every user turn and whenever the list changes mid-run — so the model keeps track of them across long conversations and context compaction. A constant reminder line asks the model to update statuses as steps finish (see `Update reminders` below).

## Screenshot

![Todo sidebar strip showing 7/7 tasks completed, 100% and a total run time](https://raw.githubusercontent.com/aiev/opencode-todolist/master/assets/todo-sidebar.png)

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

Requires opencode v2.0+ (any 2.0.x server).

## Updating

Re-run the same install command (`opencode plugin add opencode-todolist`
re-resolves to the latest). Restart the server after updating. There is no
in-place updater.

## Uninstall

Remove the entry from your OpenCode config and restart the server.

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

`todowrite` always receives the complete list and replaces the previous one. Passing `{"todos": []}` clears it. Lists accept up to 100 items of 500 characters each.

Run `/todo` to post the current list into the conversation. The command reads the newest `todowrite` from the session log (falling back to this plugin's own storage), so a list written by another tool shows up too, and sends the report — counts, current task, full list — as your next message, which the assistant sees and answers.

## Auto todos

A project can seed every session with a checklist: `auto-todos.json` at the repository root or under `.opencode/`:

```json
{
  "todos": [
    { "content": "Run the test suite", "priority": "high", "always": true },
    { "content": "Update the changelog" }
  ],
  "deduplicate": true
}
```

Each entry is merged into the list on every `todowrite`:

| Field | Effect |
| --- | --- |
| `content` | Required task text; entries over 500 characters are dropped |
| `priority` | Optional: `high`, `medium`, `low` |
| `always` | `true` adds the item to every list; `false` (default) adds it only when the incoming list is empty |
| `match` | Only inject when an existing item contains this text (case-insensitive) |
| `order` | `"first"` or a 0-based index; omitted appends |
| `deduplicate` | Default `true`: skip items whose content contains, or is contained by, an existing item |

Injection is best-effort: a missing, unreadable or invalid file leaves the model's list untouched, and the merged list never exceeds the `todowrite` limits (100 items, 500 characters per entry).

## Sidebar

The terminal client shows a live todo strip at the end of the session sidebar, styled like the V1 sidebar todo list:

```
▼ Todo [1/3] · 33%
────────────────────────
[ ] Fix flaky checkout spec
[•] Refactor payment webhook handler
[✓] Add regression test
```

In-progress tasks use the warning color and everything else is muted, matching OpenCode V1. The heading shows completed/total and the percentage; either part can be turned off. Long items wrap and lists longer than two items collapse with a click. Once everything is completed the strip hides, unless the timer is on — then it stays to show the total.

Run `/todo-settings` (or pick "Todolist: Settings" from the command palette) to configure:

| Setting | Default | Values |
| --- | --- | --- |
| Update reminders | on | on/off |
| Show count | on | on/off |
| Show percentage | on | on/off |
| Show timer | on | on/off |
| Header separator | line | none / line / line + blank |
| Collapse threshold | 2 | 2/3/5 |
| Border | off | on/off |

**Update reminders** adds a constant line to the system prompt once a session has a todo list, asking the model to mark items completed in the same step instead of batching. The line never changes within a session, so it does not affect prompt caching; sessions that never use a list are untouched. Turn it off to fall back to the tail notice alone.

### Timer

With the timer on, the strip tracks how long the current todo run is taking:

```
Todo [1/3] · 33%                  4m12s
[ ] Fix flaky checkout spec
[•] Refactor payment webhook handler · 2m12s
[✓] Add regression test · 3m05s
```

The header timer is right-aligned, with no separator before it. A run starts at the first write that opens tasks and ends at the write where nothing is open anymore. Per-task times appear when the model marks both `in_progress` and `completed`; tasks that jump straight to completed only count toward the total. Once the run finishes, the strip stays visible with `done in 12m34s` on the right instead of hiding.

Times are wall-clock: they include model thinking and user pauses. A list replaced by an unrelated one (or cleared) is treated as abandoned, and the timer restarts on the new list.

The `todoread` tool reports the same timing to the model, e.g. `Current todo list (running for 4m12s):`.

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

### Releasing

Bump the version in `package.json` and `package-lock.json` (`npm version <version> --no-git-tag-version`), commit it with the plain version string (e.g. `0.5.0`), and push a `vX.Y.Z` tag. The `Publish to npm` workflow then builds the package, publishes it to npm, and creates the matching GitHub release with generated notes.

## License

MIT
