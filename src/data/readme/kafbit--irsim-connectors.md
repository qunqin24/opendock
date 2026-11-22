<p align="center"><img src="docs/logo/irsim-logo.svg" alt="irsim" width="96" height="96"></p>

# irsim

irsim is a local design canvas. It draws the boards of a repository (`design/*.html`) in sandboxed frames, lets you comment on a board, and delivers those comments to a coding agent session through a plugin.

The board file format is in [docs/01-runtime.md](docs/01-runtime.md).

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/kafbit/irsim/main/install.sh | bash
```

The script downloads the release with `curl`, or with `gh` when it is installed and authenticated.

Pass flags through `bash -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/kafbit/irsim/main/install.sh | bash -s -- --version 0.2.1
```

Flags:

- `--version <v>`: release to install (`0.2.1` or `v0.2.1`), default the latest.
- `--local [<dir>]`: build and install a checkout of this repository, default the folder of `install.sh` or the current folder. It needs `bun` and installs into `$IRSIM_PREFIX/<version>-local`, always rebuilt.
- `--force`: download and replace a release that is already installed.
- `-h`, `--help`: print the usage.

Variables:

- `IRSIM_VERSION`: release to install, default the latest. `--version` overrides it.
- `IRSIM_PREFIX`: install folder, default `~/.local/share/irsim`.
- `IRSIM_BIN_DIR`: folder of the `irsim` link, default `~/.local/bin`.

The script installs into `$IRSIM_PREFIX/<version>`, points `$IRSIM_PREFIX/current` at it and links `~/.local/bin/irsim` to `current/bin/irsim`. A release that is already installed is not downloaded again: the script makes it current. Node 22 or newer is required.

Install the Claude Code plugin:

```bash
claude plugin marketplace add kafbit/irsim && claude plugin install irsim@kafbit
```

## Other agents

Codex, OpenCode, Pi and Command Code get the same canvas: the `design_canvas` tool, the comments delivered to the session, and the `irsim-workflow` and `irsim-design` skills. The connectors call `irsim bridge`; the installer points `irsim` at this checkout, so the command exists even when the installed release predates it. `--uninstall` restores the previous `irsim` link.

```bash
scripts/install-agents.sh            # point irsim here, link OpenCode, Pi and Command Code
scripts/install-agents.sh --codex    # also add the Codex plugin marketplace and plugin
scripts/install-agents.sh --uninstall
```

By hand:

| Agent | Install | Update | Connector |
|---|---|---|---|
| Claude Code | `claude plugin marketplace add kafbit/irsim && claude plugin install irsim@kafbit` | `claude plugin update irsim@kafbit` | `plugin/` |
| Codex | `codex plugin marketplace add kafbit/irsim && codex plugin add irsim-codex@kafbit` | `codex plugin marketplace upgrade kafbit` | `plugin/harnesses/codex` (hooks, MCP server, `/irsim` prompt, skill) |
| Pi | `pi install npm:@kafbit/irsim-connectors` | Pi shows an update notice at startup, then `pi update --extensions` | `plugin/harnesses/pi/irsim.ts`, one extension, plus the skill |
| OpenCode | `opencode plugin add @kafbit/irsim-connectors`, then link `plugin/skills/irsim-workflow` into `~/.config/opencode/skills/` | OpenCode checks at startup, then `opencode plugin update` | `plugin/harnesses/opencode/irsim.js`, one v2 plugin |
| Command Code | `commandcode mods add @kafbit/irsim-connectors` | no update notice, run `commandcode mods update` | `plugin/harnesses/command-code/irsim.ts`, one mod, plus the skill |

The Pi, OpenCode and Command Code connectors are one npm package, `@kafbit/irsim-connectors`, versioned with each irsim release. To work on a checkout instead, use `scripts/install-agents.sh` above.

Codex registers on `SessionStart`, receives comments as context before a model request and on a user prompt, and the `Stop` hook keeps it going while comments are queued. Its `/irsim` comes from `~/.codex/prompts/irsim.md`, which the installer links; the plugin also ships the same prompt. The other connectors poll while listening. In OpenCode, Pi and Command Code, `/irsim [page or board]` opens the canvas and starts listening, `/irsim-stop` stops, and `/irsim-comments [page]` counts the open comments. The canvas labels each session with its agent.

## Use

In the project root:

```bash
irsim init [--design-dir <path>]
irsim serve [--design-dir <path>] [--port <n>]
irsim export [--design-dir <path>] [--out <dir>] [--title <text>]
```

`irsim init` writes `.irsim.json` (`{ "designDir": "design" }`), adds `.irsim/` to `.gitignore`, and adds the managed block (`<!-- IRSIM_START -->` to `<!-- IRSIM_END -->`) to `AGENTS.md` and `CLAUDE.md` when they exist. A second run changes nothing.

`irsim export` builds a standalone static preview (`dist/preview` by default) with an `index.html`, a frame per board under `b/`, the runtime and the viewer assets, all with relative URLs. Serve that folder (`npx serve dist/preview`, not `file://`, because the frames are modules) to review every board without an irsim server. `.github/workflows/preview.yml` builds it on each pull request and uploads it as an artifact. The layout and limits are in [docs/03-preview-site.md](docs/03-preview-site.md).

In the canvas, a board with working controls or links between boards gets a Play button. Play runs it on the canvas or full screen (a web page board fills the window), and `<a href="Other.html">` in a played board moves to that board. Details are in [docs/01-runtime.md](docs/01-runtime.md#play).

The plugin's `design_canvas` tool has a `check` action. It renders a board (or every board of a page) in headless Chromium and returns errors, an empty-render warning and a screenshot in `.irsim/checks/`. It needs an installed Chrome, Chromium, Brave or Edge, or the executable in `IRSIM_BROWSER`. The same check is at `POST /api/boards/<Board>/check` and `POST /api/pages/<page>/check`.

A selected board has an Approve button (in the inspector). It sends the chosen Claude session a turn that confirms the board, with an optional note. The board's label then shows Approved, or Changed once the content of the board or of a board it imports changes. Approve needs a running Claude session, and it is refused when the board changed while you were looking at it.

`irsim serve` prints `irsim: http://localhost:<port>`. The port is stable per project, in 3200 to 3299. `irsim port` prints it without starting the server.

## Settings and doctor

`irsim doctor` checks the project in four groups and exits 1 when a check fails:

- **Config**: `.irsim.json`, the design folder, `canvas.json`, a file for every board it lists, and `.irsim/` in `.gitignore`.
- **Rules**: the managed block in `AGENTS.md` and `CLAUDE.md` matches `templates/agents-block.md`, and the review setup from "Review boards in pull requests" (`.gitattributes`, `.github/copilot-instructions.md`, `.coderabbit.yaml`).
- **Git**: `git`, the work tree, the branch (a detached HEAD is a warning), `origin`, and whether `gh` is authenticated for `irsim update`.
- **Runtime**: whether this project's canvas answers on its port, and an installed Chrome, Chromium, Brave or Edge for `check` and thumbnails.

```bash
irsim doctor          # one line per check, with the command that fixes it
irsim doctor --json   # the report as JSON, for a tool
```

A warning never fails the exit code: a missing CodeRabbit config or a dirty tree is not a broken install. The doctor never writes; each fix is a command it prints. `--json` is the same report the canvas and the plugin read.

The same check runs from two more places:

- In the canvas, under **Settings** in the zoom menu, the **Settings** button on the page index, or the Settings action in Ctrl/Cmd+K. The dialog shows the running version with a manual update check, the light/dark switch for the canvas, the project context (directory, design folder, repository, branch, commit and uncommitted files, canvas URL) and **Run doctor** with the report. The canvas runs it through the launcher, so this needs `irsim serve`; a `bun run dev` server says so instead.
- In the plugin: `/irsim-doctor`, or `design_canvas {action: "doctor"}`. It runs in the session's worktree, so an agent sees the same checks as the terminal.

`GET /api/doctor` answers the canvas with the report, and 409 when the server was not started by the launcher.

Below 25% zoom the canvas shows a thumbnail of each board instead of a live frame. The server renders a missing thumbnail the first time it is shown, with an installed Chrome, Chromium, Brave or Edge run headless, or the executable in `IRSIM_BROWSER`. `irsim thumbs [--page <id>] [--board <name>] [--force]` renders them ahead of time on the running server. Thumbnails are cached in `~/.cache/irsim/thumbs`, named by the content of the board and its imports, so every checkout and worktree with the same boards reuses them. While a changed board renders, its previous thumbnail shows with an Outdated label. A thumbnail no checkout has shown for 14 days is pruned by `irsim thumbs`.

The plugin ships the `irsim-workflow` and `irsim-design` skills. `irsim-design` holds the file formats of a board and `design/canvas.json`. `irsim-workflow` makes a change to what a screen shows start in the board: change the board, report its route, stop, then build the app after the user's confirmation.

## Sections and variants

A section is a named group of boards on a page. The canvas draws it as a tinted area with a label behind its boards.
To make one, select the boards and press Shift+S, or use Create section in the inspector. The inspector also has a Section field for one board.
Double-click the label to rename the section. Drag the label to move every board in it. Click the label to select its boards.
A section is a field in `canvas.json`, so Claude can place a board in one with `design_canvas`.

The Move tool selects. A drag on empty canvas draws a selection rectangle, and every board it touches is selected. Shift+click adds or removes a board, and Ctrl/Cmd+A selects the whole page.
Pan with Space and drag, the middle mouse button, the wheel or trackpad, or the Hand tool (H).
Dragging a selected title moves all selected boards. The arrow keys nudge them.

Ctrl/Cmd+Z undoes a canvas edit (move, resize, rename, delete, section change). Ctrl/Cmd+Shift+Z and Ctrl+Y redo it. The history is per page and lives in the tab. Edits that Claude makes are not in it.

Ctrl/Cmd+K opens search on every page, also while a live board has focus. It finds boards, components (boards that other boards import), sections, pages and actions. Enter opens the result, Shift+Enter plays a board full screen, and Esc closes the dialog. With an empty query it lists the last items you opened.

A variant is a copy of a board that Claude edits in a chosen direction. Select a board that is not itself a variant, pick one or more presets under Variants in the inspector, add an optional note, and press Generate:

- Better: improve layout, hierarchy and polish, keep the content.
- Clearer: make the purpose, labels and hierarchy easier to read and scan.
- Simpler: remove or merge elements to reduce noise.
- Responsive: work from 390 px to the full width.
- UI/UX pass: fix affordances, states, feedback, spacing and accessibility.
- Research: look up current patterns for this kind of screen first, then apply the best fit.

irsim copies the board once per preset into `design/<Board>Variant<Preset>.html`, puts the copies in a section named `<Board> variants`, and sends the chosen Claude session one turn that names each file and its direction. A copy shows Not changed yet until Claude writes it.
Open Compare on the section or in the inspector, at `/p/<page>/compare/<Board>`. It shows the original and each variant side by side at the same width, with a width selector and a theme toggle.
Choose on a column writes that content to `<Board>.html`, keeps the original title, deletes every variant file and removes the section. Keep original and Discard variants delete the variants only.
Choose is refused, and nothing changes, when a board outside the variants imports one of them. Change that board first. Choosing does not notify Claude, and you approve the result as any other change.

## Review boards in pull requests

A board is accepted by looking at it in irsim, with the Approve button or a reply to the agent. A code review then has one job for the boards: check that the boards and the app in the pull request show the same thing. It does not review the markup of board files.

We recommend this setup in every project that keeps its screens as boards. It is the setup irsim uses for its own canvas app. Replace `design/` with your `designDir` and `app/src/` with your UI source.

Board files stay tracked. Git keeps their history and still stops a merge or rebase on a conflict in them, because none of the settings below use `-diff`, `binary` or `merge=ours`.

### 1. Collapse board diffs on GitHub and GitLab

`.gitattributes`:

```gitattributes
design/*.html linguist-generated=true gitlab-generated
design/canvas.json linguist-generated=true gitlab-generated
```

`design/*.html` also covers the legacy `.dc.html` board files. A `design/*.dc.html` pattern covers only the legacy name, and `irsim doctor` warns when the boards use the `.html` name.

GitHub collapses these files in "Files changed" behind "Load diff" and leaves them out of the language stats. GitLab 16.11 and later collapses them in merge requests once the file is on the default branch. A reviewer can still open them.

### 2. Tell review tools what to check

Keep a table in `AGENTS.md` that maps each UI source file to its boards, then add a review section under it:

```markdown
## Reviewing a pull request

The user accepts a board by looking at it in irsim. A review does not review board files.

- Do not comment on the markup, styles, copy, structure or layout numbers of `design/*.html` and `design/canvas.json`.
- Do check, with the table above, that:
  - a change to what a person sees has its board changed in the same pull request,
  - the board shows the same states, labels, controls and layout as the code,
  - a board change has the app change it describes,
  - a new part, state or prop has a board or prop, a table row and a position in `design/canvas.json`,
  - a token change is copied into every board token block.
- Report a mismatch as a finding on the app file, and name the board.
```

Claude Code and other agents read `AGENTS.md` (or `CLAUDE.md` that imports it). For GitHub Copilot review, `.github/copilot-instructions.md`:

```markdown
Follow the "Reviewing a pull request" section of `AGENTS.md`.
Do not review the contents of `design/*.html` or `design/canvas.json`. Review only whether the boards and the app code in the pull request show the same thing.
```

For CodeRabbit, `.coderabbit.yaml`:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
reviews:
  path_instructions:
    - path: "design/**"
      instructions: |
        These are irsim boards. The user accepts them visually in irsim, so do not review their markup, styles, copy, structure or layout values, and post no comments on lines of these files.
        Report only a pairing problem: a board changed with no matching app change in this pull request, or a board that shows something the app code in this pull request does not do. Use the source to board table in AGENTS.md.
    - path: "app/src/**"
      instructions: |
        Use the source to board table in AGENTS.md. When this change alters what a person sees, the matching board in design/ must change in the same pull request and show the same thing.
        Report a visible change with no board change, a board that contradicts the code, and a new part, state or prop with no board, table row or canvas.json position.
```

Do not exclude `design/**` with CodeRabbit `path_filters`: the reviewer then cannot see which boards changed, so it cannot report a missing or wrong one.

These are instructions to the tools, not enforcement. A tool may still comment on a board line, and whether a board looks like the screen is still the user's call in irsim.

### 3. Ask for it in the pull request template

Add a board checklist to `.github/pull_request_template.md`: every changed screen has its board changed, `design_canvas check` reports no errors, and the board and the running screen were compared at the same width in light and dark. See this repository's [template](.github/pull_request_template.md).

## Update and uninstall

```bash
irsim update --check
irsim update
irsim uninstall [--purge] [--yes] [--dry-run]
```

`update` downloads the release asset for this platform with `gh`, switches `current` to it and refreshes the managed block in the current project. `uninstall --purge` also removes `~/.cache/irsim`.

The canvas shows a card in the sidebar and on the page index when a newer release exists. The check runs `gh release view` and is cached for 15 minutes in `~/.cache/irsim/latest-release.json`, shared by every running canvas. An open canvas repeats the check every 15 minutes and when the tab becomes visible. **Check for updates** in Settings skips the cache and writes the answer to it. A `--local` install compares as the version it was built from, so `0.3.0-local` is not offered `0.3.0`. Set `IRSIM_CACHE_DIR` to move that directory. "Update and restart" runs `irsim update` and restarts the canvas on the same port. A canvas that still runs an older version than the installed one offers a restart. A running canvas restarts itself within about 30 seconds after `current` points at a new version, and an open tab reloads. Set `IRSIM_AUTO_RESTART=0` to turn this off. A source checkout shows no card. `irsim update` keeps a version directory while a canvas runs from it.

## Develop

```bash
cd app
bun install
bun run dev
bun run typecheck
bun test --isolate
```

`make serve` runs this checkout's canvas without installing it or updating the plugin. It installs `app/node_modules` on first use, then runs `bin/irsim serve` from `PROJECT` (default: this repo), for example `make serve PROJECT=~/Projects/CRM`. `PORT` and `DESIGN_DIR` are optional. `make reload` first stops the canvas that serves `PROJECT` (an installed release, for example) and this checkout's own `next dev`, because Next allows one per checkout, then runs `make serve`. It refuses to touch a port held by another project's canvas. `make port`, `make build`, `make preview` and `make thumbs` run the matching `irsim` commands the same way (`preview` takes `OUT`), and `make help` lists them.

`bin/irsim serve` in a source checkout runs `next dev` in `app/`. `scripts/build-release.sh` builds `dist/irsim-<version>-<os>-<arch>.tar.gz` for the host platform. Pushing a tag `v<version>` builds all four platforms and attaches them to the release.

## License

irsim is licensed under AGPL-3.0-only, see [LICENSE](LICENSE). The code in `ee/` is under the Kafbit Commercial License in [ee/LICENSE](ee/LICENSE).
