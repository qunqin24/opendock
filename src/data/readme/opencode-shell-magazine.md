# opencode-shell-magazine

A TUI sidebar plugin for OpenCode that monitors shell commands in real time. Agent-run commands and your own `!commands` show up in the panel with status, elapsed time, exit code and background output.

- **Real status**: reads the host shell registry and `session.shell.*` events — `running / exited / timeout / killed`, `exit`, `pid` and `time_started/completed` all come from the host. No time-based guessing.
- **Foreground + background**: foreground commands are registered while they run; background commands (`sh_…`) keep their output file, which the panel can tail.
- **History**: scans session messages on mount (tool parts + user shell messages) so older commands are backfilled.
- **Actions**: kill a running command, copy the command, open its output file, and get a system notification when long commands finish.
- **Multi-TUI safe**: state is persisted through the host's atomic read-modify-write storage, so concurrent TUI instances never overwrite each other.

> OpenCode V2 only (`opencode2` / `@opencode/cli` 2.x).

## Install

```bash
npm install -g opencode-shell-magazine
opencode-shell-magazine
```

Or add it to `~/.config/opencode/cli.json` manually:

```json
{
  "plugins": ["opencode-shell-magazine"]
}
```

For local development, point at the repository path:

```json
{
  "plugins": ["/path/to/opencode-shell-magazine"]
}
```

Restart the TUI and the **Shell** panel appears at the bottom of the sidebar.

## Commands

| Command | Description |
| --- | --- |
| `/shell-magazine` | Open the interactive settings menu (Esc to close) |
| `/shell-magazine-config` | Show the current settings summary |
| `/shell-magazine-clear` | Remove finished command records |
| `/shell-magazine-version` | Show the plugin version |
| `/shell-magazine-lang` | Choose the language |
| `/shell-magazine-max` | Choose how many entries are shown |
| `/shell-magazine-order` | Choose the sort order |
| `/shell-magazine-scroll` | Choose the paging mode |
| `/shell-magazine-time-format` | Choose the elapsed-time format |
| `/shell-magazine-threshold` | Choose the notification threshold |
| `/shell-magazine-show-time` | Toggle elapsed time in the list |
| `/shell-magazine-show-cwd` | Toggle working directory in the list |
| `/shell-magazine-show-exit` | Toggle exit code in the list |
| `/shell-magazine-show-subagents` | Toggle commands run by subagents |
| `/shell-magazine-footer-status` | Toggle the footer running indicator |
| `/shell-magazine-border` | Toggle the panel border |
| `/shell-magazine-notify` | Toggle the finish notification |

## Panel

- Header: `● running`, `✗ failed/total`, `elapsed time` (right-aligned), plus the plugin version.
- Click the title to collapse/expand the panel; click an entry to expand details.
- Subagent commands carry a `↳ agent` badge (long names are truncated; the full name is in the details).
- Details include: source (agent/user), subagent, full command, directory, shell, PID, timeout, exit code, output file and output tail.
- Running commands expose `[Kill]`; background commands expose `[Open output file]` (opens the `.out` with the system default app).
- Wheel paging (or click paging via settings).

## Settings (defaults)

| Setting | Default | Notes |
| --- | --- | --- |
| Max entries | 10 | Entries shown at once (paged) |
| Order | Descending | Newest first |
| Scroll | Wheel | Wheel / click paging |
| Time format | `short` | short / decimal / clock / compact / seconds |
| Show elapsed time | On | Duration in the list |
| Show directory | Off | cwd in the list |
| Show exit code | On | `exit N` for finished entries |
| Show subagent commands | On | Include shells from subagent sessions, tagged with a `↳ agent` badge |
| Footer indicator | Off | `● N shell` in the prompt footer while commands are running (the host also shows `↓ N shell`) |
| Border | On | Draw a border around the panel |
| Notify on finish | On | System notification when threshold is reached |
| Notify threshold | 30s | 10s / 30s / 1m / 2m / 5m |

## How it works

1. **Registry**: `context.data.shell.list(location)` returns every running shell (including foreground agent commands); `metadata.sessionID` attributes it to a session.
2. **Events**: `session.shell.started` / `session.shell.ended` update entries live; `ended` carries the final status, exit code and output snapshot.
3. **History**: session messages are scanned — assistant tool parts (`name: "shell"`, with `time.{created,ran,completed}` and `metadata.{exit,truncated,shellID}`) and user shell messages (`type: "shell"`).
4. **Settling**: the host registry only keeps running shells. After a plugin restart, still-running background commands appear in the registry; a "running" entry that is absent from the registry has ended (its `ended` event was missed). The panel settles it from that evidence — never from a timeout.
5. **Subagents**: tool parts named `subagent`/`task` reference descendant sessions; those sessions are scanned recursively (depth-limited) and their shells are tagged with the agent name, so a subagent's commands show up next to yours (toggleable).

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
```

## License

MIT
