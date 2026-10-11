# opencode-skills-sidebar

[![OpenCode](https://img.shields.io/badge/OpenCode-v2-3E8AC9)](https://opencode.ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Session-aware skills sidebar and skill picker for the OpenCode v2 TUI.

The plugin answers two questions at a glance: which skills are attached to
this session, and which skills the model actually read.

## Why two questions

OpenCode stores those truths in two different places.

- **Attached skills** live in skill messages. You attach a skill through a
  picker or the skill UI. The skill stays in session context and shapes
  future turns.
- **Used skills** live in assistant messages. The model loads a skill through
  the builtin `skill` tool. The skill text lands as one tool result. It
  shapes that answer only. No skill message is created.

Most tools show the first truth only. A skill the model read on its own
never appears. This plugin shows both, and it marks which is which.

## Sidebar widget (`sidebar.content`)

One inline list per session. It holds attached skills plus used-only skills
(skills the model read but nobody attached).

### Symbol legend

| Row | Meaning |
| --- | --- |
| `● ponytail ×1 3m` | Attached to the session, read once by the model, 3 minutes ago |
| `● accessibility` | Attached, never read by the model |
| `○ brainstorming ×2 3m` | Never attached, read twice by the model, latest read 3 minutes ago |

- **Filled dot (`●`)**: attached. Color comes from the active theme (success
  color). No `Active` word: the dot carries that meaning.
- **Hollow dot (`○`)**: used-only. Color comes from the active theme (accent
  hue). The shape alone carries the meaning, so it also works without color.
- **Badge (`×N age`)**: model usage. `×1 3m` means read once, 3 minutes ago.
  `×2 2h` means read twice, latest read 2 hours ago. `now` means under a
  minute ago. No badge means the model never read the skill.

### Order

The list sorts by usage, most recent first. Unused skills keep catalog order
after the used ones. Every model read re-sorts the list at once, so fresh
reads jump to the top and stale rows sink.

### Cap and counts

- Inline rows cap at 10. Overflow folds into the `More skills` row.
- `More skills (N idle)` opens the picker. The idle count excludes skills
  shown inline, including used-only rows.
- When attached rows fold past the cap, the true total joins the row:
  `More skills (N idle · M active)`.
- The `▼ Skills` header collapses the section. Collapsed, it shows
  `(M active · N idle)` after the title.

### Detection

- **At open**: the plugin scans the last 100 assistant messages for completed
  `skill` tool calls. That scan is the initial usage state.
- **Live**: each `session.tool.success` event resolves its finished call and
  counts it when the call is a `skill` load. Unresolvable events fall back to
  a rescan.
- **Limits**: failed skill calls never count. Autoinvoke skills never produce
  tool calls, so the plugin cannot see their reads. Only the scanned window
  counts. Ages recompute on each refresh, not every second.

## Status-bar chip (`prompt.footer.status`)

Shows the live attached count (`N skills active`, `no skills active` when
empty). Used-only skills are not counted: they are not attached. Clicking the
chip opens the picker.

## Picker dialog

All catalog skills, searchable. Actives lead, then used skills lead within
each group, most recent first. The first idle skill is preselected.

### Row status strings

| Status | Meaning |
| --- | --- |
| `Active` | Attached, never read |
| `Active · used twice · 3 minutes ago` | Attached and read |
| `used twice · 3 minutes ago` | Used-only (hollow dot, never attached) |
| `idle` / `idle · manual` | Neither attached nor read |

Counts speak in words (`once`, `twice`, `3 times`). Ages speak in full words
(`just now`, `3 minutes ago`, `2 hours ago`, `5 days ago`). Usage is a
snapshot at picker open: the model never runs while you browse, so no live
subscription is needed there.

Activating a skill calls `session.skill` with `resume: false`. The skill is
appended to context only. The model is never resumed.

## Limitations

**Skills cannot be removed or disabled from the plugin.** OpenCode v2
exposes skill activation only. No API detaches a skill from session context
once attached. So the picker adds skills but cannot remove them.

This is tracked upstream at
[anomalyco/opencode#54346](https://github.com/anomalyco/opencode/issues/54346).
When OpenCode ships a deactivation path, this plugin will support removal.
Until then the limitation stays documented here instead of hidden.

## Install

Requires OpenCode v2.

Either let OpenCode install and register it:

```sh
opencode plugin add opencode-skills-sidebar
```

or add it manually to `opencode.json(c)` (note the key is `plugins`):

```json
{
  "plugins": ["opencode-skills-sidebar"]
}
```

No-registry alternative: copy `src/tui.tsx` to
`~/.config/opencode/plugins/skills/tui.tsx` — OpenCode discovers it
automatically.

## Keys (inside the picker)

| Context | Key | Action |
| --- | --- | --- |
| list / details | `space` | Activate selected skill (types into search while a query is being edited) |
| list | `enter` | Activate selected skill |
| list | `f5` | Open details |
| list | `↑` `↓` `pgup` `pgdn` `home` `end` | Move selection |
| details | `↑` `k` / `↓` `j` | Scroll one line |
| details | `pgup` / `pgdn` | Scroll half a viewport |
| details | `home` / `end` | Jump to top / bottom |
| details | `esc` | Back to list |
| list | `esc` | Close picker |
| anywhere | `ctrl+alt+s` | Open picker |

`j` and `k` scroll only in the details view; in the list they type into the
search box, so queries like "javascript" stay typeable. Both scrollbars are
hidden (like the `/btw` command box): scrolling is keyboard, mouse wheel, and
selection movement.

## Development

The plugin is developed against a live OpenCode instance: the source of truth
for local work is `~/.config/opencode/plugins/skills/tui.tsx`, which OpenCode
hot-loads.

```sh
bun run sync     # live plugin file -> src/tui.tsx (for tests/commit)
bun run deploy   # src/tui.tsx -> live plugin file (install edited sources)
bun test         # syncs first, then runs the suite
bun run check    # tsc --noEmit
```

A checkout of this repo can also be loaded directly as a plugin (no publish):

```json
{
  "plugins": ["/path/to/opencode-skills-sidebar"]
}
```

The render tests mount the real plugin through `testRender` with a mocked
plugin context (`test/fixture.tsx`) and assert on rendered frames: sidebar
rows and the overflow cap, usage badges and usage sort order, search
filtering, space-to-activate vs space-to-type, details/back navigation, the
active-count refresh on `session.skill.activated`, and the live usage row on
`session.tool.success`.

## Releasing

Publishing is fully automated via GitHub Actions with npm trusted publishing
(no tokens stored in the repo):

```sh
./scripts/release.sh patch   # or minor / major
git push && git push --tags
```

The workflow type-checks, tests, and publishes to npm when the version in
`package.json` is not yet on the registry.
