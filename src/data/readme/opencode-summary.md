# opencode-summary

[![CI](https://github.com/frostehhh/opencode-summary/actions/workflows/ci.yml/badge.svg)](https://github.com/frostehhh/opencode-summary/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-summary.svg)](https://www.npmjs.com/package/opencode-summary)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

TUI plugin for [opencode](https://opencode.ai) V2. `/summary` opens a modal that generates and shows a summary of the
current session using `session.generate` (the session's current model; the conversation history is not changed). The
summary is stored in session metadata (`metadata["opencode-summary"]`), and a footer indicator shows how many turns ago
it was made.

## Install

```sh
opencode plugin add opencode-summary
```

Or add it to your TUI config (`cli.json`) yourself, since it is a TUI-only plugin:

```json
{ "plugins": ["opencode-summary"] }
```

Pin a version with `opencode-summary@0.1.0`. Without a version, opencode checks for updates; run
`opencode plugin update opencode-summary` to update.

Restart opencode after installing.

## Usage

Run `/summary` (or "Open summary modal" in the command palette) inside a session.

| Key | Action |
|---|---|
| `g` | generate a summary |
| `v` | toggle prompt view |
| `c` | copy the summary (summary view) |
| `e` | edit the prompt (prompt view) |
| `r` | reset the prompt (prompt view) |
| `j`/`k`, `↑`/`↓` | scroll |
| `esc` | close |

Bind a global key in `cli.json` with `keybinds`: `{"summary.open": "<key>"}`.

### Commands

Palette group "Summary". Only the first has a slash command.

| Command | Id | Does |
|---|---|---|
| Open summary modal | `summary.open` (`/summary`) | opens the modal |
| Generate summary | `summary.generate` | generates without the modal |
| Copy summary | `summary.copy` | copies the stored summary |
| Delete summary | `summary.delete` | removes the stored summary, after confirm |
| View summary prompt | `summary.prompt.view` | modal in prompt view |
| Edit summary prompt | `summary.prompt.edit` | `$VISUAL`/`$EDITOR`, else modal editor |
| Reset summary prompt | `summary.prompt.reset` | deletes the override, after confirm |
| Toggle summary footer indicator | `summary.indicator.toggle` | hides or shows `summary N turns ago` (the spinner stays) |

The indicator setting is persisted, so it survives restarts.

## Prompt

The default prompt is in [`src/prompt.ts`](src/prompt.ts). Your own prompt is stored at:

```
$XDG_CONFIG_HOME/opencode/opencode-summary/summary.md   # default: ~/.config/opencode/opencode-summary/summary.md
```

This lives outside the plugin, so it survives plugin updates. A fixed line forbidding tool calls is always prepended
and cannot be edited. `e` opens `$VISUAL`/`$EDITOR` on the file; if neither is set, a multi-line editor opens in the
modal (`ctrl+s` save, `esc` cancel). `r` deletes the override.

On Windows the file is at `%USERPROFILE%\.config\opencode\opencode-summary\summary.md` unless `XDG_CONFIG_HOME` is set.
The editor command runs through the shell, so values like `notepad` or `code --wait` work; quote the executable if its
path has spaces. Leave `VISUAL`/`EDITOR` unset to use the modal editor.

## Development

```sh
bun install
bun test
bun run build   # compiles src/tui.tsx -> dist/tui.js
```

opencode does not compile `.tsx` files inside `node_modules`, so the package ships the compiled `dist/tui.js`
(`exports["./tui"]`). `dist/` is git-ignored: CI builds it and `npm publish` ships it.

To try your changes in opencode, symlink your clone into the global plugin directory, where the TUI discovers it:

```sh
ln -s "$PWD" ~/.config/opencode/plugins/opencode-summary
```

The plugin loads `dist/tui.js` (`exports["./tui"]`), so run `bun run build` after editing `src/`. Rebuilt output
hot-reloads in a running TUI.

`src/lib.ts` is pure and must not import opencode packages; `test/lib.test.ts` covers it. `src/tui.tsx` is checked
manually with the checklist below.

## Contributing

Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by
[commitlint](https://commitlint.js.org/) (a `commit-msg` hook locally, and CI on pull requests).

```
<type>(<optional scope>): <description>

feat: add a new capability              -> minor bump
fix: correct a bug                      -> patch bump
feat!: change behavior incompatibly     -> breaking (minor while < 1.0)
docs | refactor | test | chore | ci | build | perf | style
```

## Releasing

Versions follow [SemVer](https://semver.org/) and are derived from commit messages by
[release-please](https://github.com/googleapis/release-please). While the version is `0.x`, `feat` bumps the minor
version and `fix` bumps the patch.

1. Merge changes to `main` using conventional commits.
2. release-please opens or updates a "chore(main): release x.y.z" PR with the version bump and `CHANGELOG.md`.
3. Merge that PR: it creates the `vX.Y.Z` tag and a GitHub Release, then publishes to npm with
   [trusted publishing](https://docs.npmjs.com/trusted-publishers) (no token).

Coding agents can follow [`.agents/skills/release/SKILL.md`](.agents/skills/release/SKILL.md) for this flow.

Repository setting required once: **Settings → Actions → General → "Allow GitHub Actions to create and approve pull
requests"**.


## License

[MIT](LICENSE)
