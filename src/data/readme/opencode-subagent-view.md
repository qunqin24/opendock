# opencode-subagent-view

When you are inside a subagent's session in the OpenCode v2 TUI, the interface
stops telling you what that subagent is doing — no model, no token usage, no
clock. This plugin adds one live line above the composer for exactly that case:
state dot, the subagent's label — its task, with the agent in parentheses — model
(`provider/id`, with the variant when the session picked one), elapsed time,
tokens, cost and context-window usage, e.g.

```
● F4 context usage percent (general) · anthropic/claude-sonnet-4-6 · ⏱ 02:34 · 12.4k tok · $0.04 · 37% ctx
```

It renders nothing in root sessions, so it stays out of the way everywhere else.

## Context window

`37% ctx` is how full the model's context window was on the most recent request:
the last assistant message's own counters (input + cache read + cache write +
output + reasoning) against the model's declared context limit.

- It is **not** the session's cumulative token total, which only ever grows and
  would report nonsense on a long session. OpenCode's own context formula is not
  exposed to plugins, so this is the closest honest measure available — treat it
  as an approximation, not as a byte-exact reading of the window.
- The percentage is never clamped, so an over-long session reads `128% ctx`
  instead of a reassuring `100`.
- It appears only when the data exists: the session's messages must be loaded and
  the model must be one the plugin's provider knows. The plugin asks each
  session's messages once per plugin generation, so a panel row shows the segment
  as soon as that data lands; until then it is simply absent, not `0% ctx`.
- It shows on the status line and on every panel row whose data is loaded.

## Subagents panel

Inside a session, run `/subagents` (or pick **Subagents panel** from the command
palette) to open a panel listing every subagent of that session's root — direct
children and grandchildren, one row each:

```
Subagents  2 run · 1 done · 0 err
  ● RDD review lens retry
    (review-reliability)
      ↳ ⏱ 05:05  1,564 tok · 37% ctx
    ◌ review the parser fix (review-validator)
      ↳ ⏱ 00:12 · 3.1k tok
› ✓ build the release · claude-sonnet-4-6
      ↳ ⏱ 01:04  8.0k tok · $0.04 · 12% ctx
  ● docs · claude-sonnet-4-6 · ⏱ 00:03 · 1.2k tok ⚠
j/k move · enter open · c completed · f fullscreen · esc close
```

A label wraps onto at most two lines, each continuation indented by four spaces,
so a long `title (agent)` never truncates on one line. `⚠` rides at the end of
the last label line. The panel wraps to its own measured width; the sidebar
wraps at 29 columns, which is the fixed width the `sidebar.content` slot assumes.

- **A row is named by its task, not just its agent.** Subagents of one agent share
  its name, so the label is the title — what the subagent was actually asked to
  do — with the agent in parentheses: `F4 context usage percent (general)`. When
  the title already names the agent it is left alone (`general agent review`, not
  `general agent review (general)`), and a generic `code` agent is dropped rather
  than printed. The status line, the panel, the sidebar and the completion alerts
  all go through that one helper, so no two surfaces can label the same subagent
  differently.
- `●` running, `◌` idle, `✓` done, `✕` failed, `⊘` interrupted, `○` unknown —
  same markers as the status line. Idle and unknown rows stay in the panel; only
  done, failed and interrupted are hidden by `c`.
- Rows are indented by depth, so nested subagents sit under their parent.
- `NN% ctx` is the [context window](#context-window) of that session's most
  recent request, last segment. The panel asks each row's session for its
  messages once per generation, so a row shows it once that data is available —
  rows whose session has no loaded messages simply have no such segment.
- ⚠ marks a session with a permission request waiting for an answer.
- `›` marks the session you are currently in.
- The first rows are the ones that need you: pending permissions, then running,
  then the most recent activity.
- When there are more subagents than the panel has lines, the list scrolls to
  keep the selected one visible.

### Keys

| Key | Action |
|-----|--------|
| `j` / `k` | Move the selection down / up |
| `enter` | Open the selected subagent session (the panel stays open) |
| `c` | Show or hide completed, failed and interrupted subagents (persisted) |
| `f` | Toggle full screen |
| `esc` | Close the panel |

Keys are only active while the panel owns the keyboard, so typing `j` in the
prompt keeps inserting text.

## Sidebar glance

Under the sidebar's own sections the plugin shows the counts header and then the
three subagents that matter most:

```
▾ Subagents
● 0 run · ✓ 32 done · ✕ 0 err
  [✓] RDD review lens retry
    (review-reliability)
      ↳ ⏱ 05:05  1,564 tok
  [✓] fix the flaky parser test
      ↳ ⏱ 01:22  36,169 tok · 3% ctx
```

That is the [panel's](#subagents-panel) own row format — same header, same row,
same markers, same colors, same ordering, same 29-column two-line label wrap —
capped at three rows instead of a scrollable list, and **without the cost segment
or the model** on the row — the sidebar's two label lines go to the task, and the
model is the panel's to show. The sidebar and the panel render through the same
code, so they cannot drift apart; if you see a difference between them, that is a
bug.

- **Click the `▾ Subagents` title to collapse it** to just the counts, and click
  again to bring the rows back. The choice is remembered across restarts. It
  starts **expanded** — a collapsed widget reads as a broken one, so the rows are
  there by default. With no subagents at all there is no widget, collapsed or
  not.
- **Three rows, never more.** The sidebar has no room to scroll, so this is a
  glance; `/subagents` is the detailed view, with every subagent and their costs.
  The panel has no title toggle: it is already the view you open on purpose.
- Same order as the panel: permission-pending first, then running, then the most
  recent activity. Same markers too (`●` running, `◌` idle, `✓` done, `✕`
  failed, `⊘` interrupted, `○` unknown).
- `NN% ctx` is the [context window](#context-window) of that row's session. It
  appears once the row's messages are loaded, so a fresh subagent may show the
  row without it for a moment.
- `⚠` at the end of a label line means a permission request is waiting.
- Nothing is rendered when the session has no subagents: no placeholder, no
  empty block.

## Completion alerts

When a subagent of the session you are in finishes, the plugin announces it:

```
F4 context usage percent (general)
succeeded · ⏱ 02:34 · 12.4k tok · $0.04
```

The alert title is the same [label](#subagents-panel) every other surface uses —
the task, with the agent in parentheses. The message is the real outcome followed
by the segments that exist — elapsed time, tokens, cost — with anything missing
left out. `failed` and `interrupted` read as themselves, so an alert never sounds
like a success.

The `subagent_done` sound and the desktop notification only play while the
window is **blurred**, so a subagent finishing does not interrupt you in the
middle of a prompt. OpenCode handles the focus check.

Alerts are driven by the server's own execution events, so **one alert is raised
per finished execution**:

- A re-used subagent announces **every** run. OpenCode can re-run a subagent on
  the same session id, and the record keeps its previous outcome — so an alert
  that watched for the outcome to change would stay silent for every re-run after
  the first.
- **Any subagent alerts, in any session tree** — including one that finished while
  you were looking at a different tree. Your own root session never alerts on
  itself.
- The same event delivered twice is announced once. A reload announces nothing
  that finished before it, because that completion emitted no event to miss.

## Footer counters

The session prompt footer carries the same counts line as the panel header:

```
Subagents  2 run · 1 done · 0 err
```

It appears once the current session has at least one subagent and stays as long
as there is one to report. Nothing is rendered without a session or without a
subagent to count.

If you also set the status line's `slot` option to `"prompt.footer.status"`, both
appear in that same area, stacked.

## Requirements

- OpenCode **v2** (TUI plugin API `@opencode/plugin` `>=2`)
- Node.js `>= 22.13`

## Install

### With the OpenCode CLI

```sh
# from npm
opencode plugin add opencode-subagent-view

# or directly from the repository
opencode plugin add github:OJPalenzuela/opencode-subagent-view
```

`opencode plugin add` installs the package into the global OpenCode config and
registers it. To pass plugin `options`, use the config-file form below.

### From a local checkout

Build once, then point OpenCode at the repository directory in
`~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-subagent-view",
      "options": {}
    }
  ]
}
```

Restart the TUI after editing the config.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `slot` | `"session.composer.top"` | Where the line is rendered. Also accepts `"prompt.footer.status"`. Any other value falls back to the default. |

```json
"options": { "slot": "prompt.footer.status" }
```

## How it works

| Concern | Behaviour |
|---------|-----------|
| Elapsed clock | 1-second tick; frozen at `time.idle` once the session reports an `outcome` |
| Record changes | `data.listen` with ~200 ms coalescing, so event bursts render once |
| Session switch | `data.session.sync(sessionID)` on change |
| State markers | `●` running, `◌` idle, `✓` done, `✕` failed, `⊘` interrupted, `○` unknown |
| Partial data | Missing model/cost/tokens/time/context are omitted; nothing throws |
| Panel rows | Root resolved by walking `parentID`; grandchildren included |
| Panel permissions | Cached with `session.permission.sync` on open, and on every `permission.asked` |
| Context window | Last assistant message's counters ÷ `limit.context` of the model it used; `location.model.list()` scanned, since that collection has no `get` |
| Context data | `session.message.list()` cache read; the current session's messages are synced once per plugin generation, retried only if that sync fails |
| Completion alerts | Fired per finished `session.execution.*` event for any record with a `parentID`, so any subagent in any tree alerts; sound and notification only while blurred |
| Alert de-duplication | Last-notified event id per session, so a redelivered event is silent but a re-run (a new id, same session) alerts |
| Footer counters | `prompt.footer.status`, session id from the slot input; hidden with no session or no subagents |
| Sidebar glance | `sidebar.content`, appended; the panel's header plus the top 3 rows of the panel's ordering as two-line rows without the cost segment; hidden when there are no subagents |

> Whether both slots are actually published inside a *subagent* session view is
> TUI-runtime behaviour that cannot be checked from a shell. Confirm the line
> appears where you expect it in the live TUI, and try the other `slot` value if
> it does not. The same is true of the sidebar widget's placement.

## Development

```bash
pnpm install && pnpm build   # emit dist/tui.js
pnpm test                    # unit tests for formatting, selectors, context math and alerts
pnpm typecheck               # tsc --noEmit
```

Formatting logic lives in `src/format.ts`, the panel selectors in
`src/subagents.ts`, the context-window math in `src/context.ts`, and the
completion tracker and alert text in `src/alerts.ts`. All four are deliberately
free of TUI imports, and every look-up is injected as a parameter, so they can be
unit tested in isolation. `src/panel.tsx`, `src/sidebar.tsx`, `src/footer.tsx`
and `src/tui.tsx` only wire them to the host.

## Release

Publishing is automated: pushing a `v*` tag that matches `package.json`'s version
triggers the [`release`](.github/workflows/release.yml) workflow, which runs the
tests, publishes to npm via trusted publishing (OIDC) and creates the GitHub
release with generated notes.

```sh
npm version patch   # or minor / major: bumps package.json, commits, tags
git push --follow-tags
```

## License

MIT — see [LICENSE](./LICENSE).