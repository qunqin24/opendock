# tabby-opencode-status

Terminal tab status for [opencode](https://opencode.ai) inside [Tabby](https://tabby.sh):
tab colors, progress, and title change as the session status changes
(working → needs-input → done → error).

Two packages, one spool protocol:

| Package | What | Where |
|---|---|---|
| `packages/opencode-tabby-status` | opencode plugin: emits OSC title/progress/tab-color + writes status spool files | npm: `opencode-tabby-status` |
| `packages/tabby-opencode-status` | native Tabby plugin: watches spool files, paints `tab.color` / progress bar / emoji prefix | Tabby Settings → Plugins |

Status mapping (opencode → Tabby):

| opencode event | Tabby state | Color |
|---|---|---|
| `session.execution.started` / `session.step.started` | working ⚡ | orange |
| `permission.asked` / `form.created` | needs input ❓ | gold |
| `session.execution.succeeded` / `session.execution.interrupted` | done ✅ | green |
| `session.execution.failed` | error ❌ | red |
| `session.created` | idle 🌱 | default |

`session.status` (busy/idle/retry) is still handled for completeness, but
opencode v2 does not emit it for ordinary turns — the execution/step lifecycle
events above are what actually fire.

## Install

**opencode** — emits OSC title/progress/color and writes the status spool:

```sh
opencode plugin add opencode-tabby-status
```

Tab titles update live via OSC 0 in any terminal (Tabby, Ghostty, WezTerm,
Windows Terminal, VS Code, iTerm2) even without the Tabby plugin.

**Tabby** — paints true tab colors, progress, and the emoji prefix. In Tabby:
**Settings → Plugins** → search `tabby-opencode-status` → **Install**, then
restart Tabby. Configure under **Settings → Opencode Status**.

> Tabby installs plugins through its own package manager — do not
> `npm install` into `~/.config/tabby/plugins`, npm prunes the other plugins
> already there.

## Spool protocol

`$TMPDIR/tabby-claude-status.d/<ts>-<pid>-<rand>.json`, one file per event
(atomic temp+rename):

```json
{ "ts": 0, "event": "PreToolUse", "session": "ses_…", "ppid": 0, "ancestors": [], "cwd": "" }
```

`event` reuses the `tabby-claude-status` names (`PreToolUse`,
`PermissionRequest`, `Stop`, `PostToolUseFailure`, `SessionStart`) so that
plugin also picks up opencode sessions. Tab matching is PID-ancestry
intersection. Under opencode v2 the server is a detached daemon, so the spool
carries the TUI client's pid (located by its `-s <sessionID>` command line) plus
its ancestor chain; the Tabby plugin intersects that with each tab's pty child
processes. Child (subagent) sessions resolve to their root session via
`session.created` parentIDs.

## Development

```sh
git clone https://github.com/tmiland-lab/tabby-opencode-status
cd tabby-opencode-status && npm install
npm test --workspace packages/opencode-tabby-status
npm test --workspace packages/tabby-opencode-status
npm run install-plugin --workspace packages/tabby-opencode-status   # local Tabby install
```

## Upstream

Long term this should be native Tabby behavior: see
`Eugeny/tabby` — `tabby-terminal/src/middleware/oscProcessing.ts` currently
only handles OSC 1337 (cwd) and OSC 52 (clipboard). A PR adding OSC 9;4
progress + iTerm2 OSC 6;1 tab color would make the opencode plugin work
without any Tabby plugin at all.

## License

MIT
