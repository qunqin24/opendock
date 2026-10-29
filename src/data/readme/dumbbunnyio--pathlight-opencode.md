# Pathlight

Show LikeC4 architecture diagrams beside an agent conversation in tmux.
LikeC4 owns the model and its arrangement; Pathlight sets the spacing and card sizes so titles stay readable. OpenTUI renders interactive terminal nodes, groups, and connectors by default.
The viewer can show live tool activity mapped to architecture elements. It does not infer test status or runtime service traffic.

See [project intent](docs/project-intent.md) for the goals, accepted design and
scope boundaries, and [AGENTS.md](AGENTS.md) for engineering guidance.

## Set up

Use Bun 1.4.2 or later, Node.js 22 or later and tmux. `bun run build` compiles one self-contained `dist/pathlight-OS-ARCH` file (verified on Linux x64 only); `pathlight doctor` checks tmux, the model, the file mapping and the plugin, and says how to fix each failure.
The OpenCode plugin targets V2 and is pinned to SDK 2.0.31.

```sh
bun install
```

Native mode needs no browser, GPU backend or terminal image protocol.
Only open trusted LikeC4 workspaces. LikeC4 can load executable JavaScript or TypeScript project configuration.

## Install

Install the `pathlight` command (needs tmux; verified on Linux x64, and the macOS builds the release publishes have not been tried), with npm or the install script:

```sh
npm i -g @dumbbunnyio/pathlight     # npm i -g pathlight installs the same
# or
curl -fsSL https://raw.githubusercontent.com/dumbbunnyio/pathlight/main/install.sh | sh
```

Then add it to your agent once, for every project.

Claude Code:

```sh
claude plugin marketplace add dumbbunnyio/pathlight
claude plugin install pathlight@pathlight
```

OpenCode:

```sh
pathlight init --global
```

`init --global` adds the `@dumbbunnyio/pathlight-opencode` plugin to OpenCode's own `~/.config/opencode/opencode.json` with recording on (the same line you could add yourself: `{ "package": "@dumbbunnyio/pathlight-opencode", "options": { "record": true } }` in `"plugins"`). Like the Claude plugin, it records only in projects that have a map. Restart OpenCode after adding it.

Then, in a project, type `/pathlight` in your agent (or run `pathlight setup --yes`), and `pathlight doctor` if anything is missing. Other agents (Codex, Pi, …) have no plugin yet: the map, the viewer and `check`/`diff` work beside any of them, but the viewer cannot see what they touch.

From a checkout instead: `bun install && bun link`, then `claude plugin marketplace add /path/to/pathlight`.

## Claude Code plugin

The plugin adds the recording hooks and the `/pathlight` skill. Hooks do nothing in a project without `.pathlight/pathlight.activity.json`, so enabling the plugin globally is safe. Create the mapping with `pathlight init --workspace . --no-claude-hooks` (the flag keeps `init` from also writing project-local hooks, which would record every event twice).
Use either this route or the project-local route below, not both.

## First run

In the project you work in, with `pathlight` on your PATH and (for Claude Code) the plugin installed:

```sh
pathlight setup            # checks tmux, the PATH, the model, the file mapping and the plugin; says what it would write
pathlight setup --yes      # with no model yet, draws a first one from the code's imports, checks it, says how to open it
```

Or type `/pathlight` in Claude Code or OpenCode and let the agent run both for you, asking first. `setup` writes nothing without `--yes`, never rewrites a model you wrote, and leaves the hooks and recording to `pathlight init` (below), because those change your settings.

## Quick start (Claude Code and OpenCode)

The viewer on one screen, the three keys to start and the rest in three tiers: [docs/quick-start.md](docs/quick-start.md). [The viewer reference](docs/native-viewer.md) has every key.

From the project you work in, after `pathlight setup --yes` has drawn a model (or with one you wrote):

```sh
pathlight init --workspace .
```

`init` adds the Claude Code hooks to `.claude/settings.local.json` (per-user), copies the `pathlight` skill (the `/pathlight` command),
registers the OpenCode plugin (the `@dumbbunnyio/pathlight-opencode` npm package; from a checkout, its `plugins/opencode` folder), and creates `.pathlight/pathlight.activity.json` if absent and there is a model to map (with none, it says to run `pathlight setup --yes`). It maps only elements whose name matches
a directory or file that exists; review it and add globs for the rest. Re-running `init` is safe and never overwrites an existing mapping.

To reopen the viewer yourself, with no agent involved:

| Where you are | Command | Result | Inference |
| --- | --- | --- | --- |
| A shell prompt in a tmux pane | `pathlight open [VIEW]` | That pane becomes the viewer | none |
| Inside Claude Code | `/pathlight:open [VIEW]` | A viewer pane is split beside the conversation | none (a plugin hook handles it and blocks the prompt, so the model is never called) |
| Inside OpenCode | `/pathlight-open [VIEW]` | A viewer pane is split beside the conversation | none (the CLI plugin handles it) |
| Inside Claude Code or OpenCode | `! pathlight open [VIEW]` | The same split | none (a shell escape) |

`open` follows the most recent recorded session and shows `VIEW`, else the view named `index`, else the first view. Typed at a prompt it takes over that pane; run by an agent (anything between the pane's shell and the command) it splits beside it. `--here` always uses the current terminal and `--split` always splits. Without a `.pathlight/pathlight.activity.json` it still opens, but cannot follow an agent. The hook needs the Claude plugin; `/pathlight:open` is not installed by `pathlight init`.

Then, in tmux, run `/pathlight` in Claude Code (or `/pathlight VIEW_ID`). The viewer opens beside the conversation and
follows the most recently active recorded session with `--follow`, so you need no pane or session IDs. You can also run it yourself:

```sh
bun run pathlight show VIEW --workspace /path/to/project --follow
```

Installing the Claude hooks is the opt-in for Claude recording; remove them to stop. For OpenCode the opt-in is `record: true` on the plugin entry (what `init` writes) or a `live: true` request.
`--follow` only reads journals: it never starts recording, and it switches to whichever recorded session wrote last. A Claude subagent's calls share the conversation's session and carry a label; OpenCode child sessions are not recorded.
The header shows `LIVE source:session` with a spinner while a tool runs, the header's second row shows the latest call (`now`/`last`), and the Now card in the inspector lists the selected component's recent calls with their age.
Nodes show `r`/`e` counts of retained reads and edits. Press `t` to ask the agent about the selected node or tell it what to change (typed into your agent's pane, with the files on the component's edges, its connections and, if you choose, recent activity; Enter sends and submits it, Alt+Enter adds a line). A how-question (`draw it`, on by default for one) is answered in chat and recorded as a journey that `F` walks; an instruction is declared with `pathlight plan` before the first edit, so the boxes it will touch are outlined first. Press `d` to ask the agent to trace how something works from that box and record it as a journey (it reads the code and runs `pathlight flow add`, in the Claude plugin's Sonnet-sized `pathlight-tracer` agent so the reading does not run on your larger model; `F` shows it once written). Press `m` to ask the agent to improve the map for that box (it reads the files, then names and describes it in the overlay) or `n` to name and describe it yourself; both need a map made by `pathlight draft`. Press `1`–`4` to focus an inspector card (Now, Connects or Steps, Files, In flows; `e` shows the files), `F` to trace a flow on the diagram, `/` to search every view, box and mapped file (this view's first, exact matches before all) and `g` to jump to a view, and `T` to choose a theme (OpenCode-format JSON themes, previewed live). Press `w` to select the node the agent is working on; when that work is in a component this view does not show, the header says "working in VIEW" beside a highlighted `w` ("go and follow"), and `w` goes there and turns follow on (a view this one links to with `navigateTo` first, else the smallest view containing it), never on its own (or click its row in the activity list), and `c` to review the session: new dependencies the code gained since the last commit that the model does not have, each to accept (`y`) or reject (`n`, which asks the agent to take it out), then what the session touched (see [native viewer](docs/native-viewer.md#review-new-dependencies)). Press `a` to follow the work: the viewer selects the node of the newest tool call, running or finished, and glides the camera to it. Only work that happens after you turn it on (or resume it) counts; `w` jumps to the last work done. It is off by default, never changes the view, and pauses when you select, pan or zoom (`a` resumes). Calls made inside a Claude subagent are recorded with its type (never its id or prompt) and shown with that label, for example `·Explore`; they land in the same journal as the conversation's own calls. Press `s` to hide or show them.

Press `p` to replay the session: the viewer steps through the recorded calls in order, one call per step, with the component of each step selected and the counts building up as they did. `←`/`→` step, `[`/`]` jump between turns (a turn is one prompt and the work after it), `space` plays and pauses, `s` sets the speed, `esc` returns to live. Replay covers what the journal retained (the last 2048 events of a session) and only the calls, never the prompts.

## Open a diagram

Inside tmux, list the example diagrams, then show one:

```sh
bun run pathlight list --workspace examples/parcel
bun run pathlight show services --workspace examples/parcel
```

Select nodes with the mouse or `h` `j` `k` `l`, which move to the nearest node in that direction. Arrow keys pan the Three camera (press `v` to swap the two). Tab moves into the inspector and through its cards (in a flow it steps). Connections are orthogonal thin lines with rounded bends. Press `/` to search every view, box and mapped file.
The selected node's connections are solid, cyan for incoming and amber for outgoing; the rest are dotted. Focus Connects (its number, or `tab`) and move the cursor onto a row to read a long relationship in full.
Press `e` to browse the selected node's mapped files, then Enter to open one in your external editor (at its first uncommitted change, if it has one).
Set `VISUAL` or `EDITOR` before starting the viewer. File browsing does not require live recording.
Enter selects a group's first child or opens a leaf's linked view. Press `o` to open a group's linked view, `b` for view history, or Backspace for the parent group.
Use `f` to fit, `r` to center the selection, and `q` to quit. Press `i` to show or hide the inspector (docked from 120 columns, an overlay below that; under 80 columns the nodes are a list) or `?` for help. The diagram refits on resize until you pan or zoom; `f` fits again. Set `PATHLIGHT_COLORS=256` if your terminal lacks 24-bit colour and is not detected. Ctrl+C quits even while search is active.
See [native viewer controls and limits](docs/native-viewer.md) for search, activity, and navigation details.

To run in the current terminal instead of opening a pane:

```sh
bun run pathlight view services --workspace examples/parcel
```

## Scan a codebase

`pathlight scan --workspace . --out scan.json` reads the TypeScript, JavaScript, Python and Go source statically (the parsers are inside the binary: there is nothing more to install) and writes the files, the imports between them, the packages they use, and what it could not read. It is a fact sheet for an agent (or you) drafting a LikeC4 model of a codebase that has none; it never writes the model itself. See [scan format](docs/scan.md).

A second skill, `pathlight-behavior`, teaches an agent to draw what a user sees as a state diagram (a `*.behavior.c4` file that `draft` leaves alone), mark states it found broken (`#bug`, red) or repaired (`#fixed`, green), and record the commit it read the code at. It is the agent's reading of the code, not a scan, and says so. The `pathlight` skill (`plugins/claude/skills/pathlight/SKILL.md`) teaches an agent this workflow: scan, draft the model and mapping, check until clean, show. The Claude plugin ships both, and `pathlight init` copies them into the workspace (`.claude/skills/`, or `.agents/skills/` with `--no-claude-hooks`); OpenCode documents reading both locations. With the Claude plugin installed, `init` writes no copy into `.claude/skills/` and removes ones it wrote earlier, because a project copy outranks the plugin's skill and stops it updating; `pathlight doctor` reports any that remain.

`pathlight flows --workspace .` checks the state diagrams in `*.behavior.c4` files and the journeys (LikeC4 dynamic views: the components a request passes through) against the files they name, the model and the commit they were synced at, and lists what is gone, changed since, has no relationship behind it, or is unchecked; it never says a flow is right (`--json`, `--strict` as for `check`). `pathlight flow add ID --title T --reads FILES --step 'from -> to: event' ...` is how an agent records a journey it worked out from the code: it checks each component against the model, requires the files read, stamps the commit, writes `ID.behavior.c4` and rolls it back if the model would stop compiling (`flow remove ID` deletes only what it wrote). In the viewer, `F` traces a flow on the diagram: numbered steps, a step reader in the inspector, and the flow kept visibly apart from what the agent was observed doing (see [native viewer](docs/native-viewer.md)). A flow written while files it read had uncommitted changes records what those files were (`Read with uncommitted changes: path@hash`), so only a later edit makes it "behind". A journey step may name the function it calls (`@ file#function`); the declaration is copied from the file when the flow is written, shown in the viewer's step reader (`e` opens it in your editor at its line), and checked again by `pathlight flows`.

`pathlight check --workspace .` compares that scan with your LikeC4 model and `.pathlight/pathlight.activity.json`: mapping globs that match no files, source files no mapping claims, relationships with no import between their mapped files, and imports between elements that no relationship declares. These are questions, not verdicts (a relationship can run over a network call that no import shows); `--json` gives the same facts as data and `--strict` exits 1 when anything is found.

## Draw a codebase from its code

`pathlight draft --workspace .` writes a first architecture picture made from the code alone, with no model in the loop, into `.pathlight/` (every file Pathlight writes into your repository goes there, so none lands in the root): each workspace package becomes a box, the top-level folders inside it become components (`session.ts` beside a `session/` folder is one), and a relationship exists wherever files in one component import files in another, labelled with how many. Tests are left out. It writes `pathlight.model.c4`, `.pathlight/pathlight.activity.json` (the file mapping) and `likec4.config.json`, so `pathlight check` and the viewer work on it straight away, and the same code always gives the same text. Names are the folder names and the descriptions are facts (file and line counts); nothing is inferred about intent. Code in a language the scan does not read (Go, Rust, Python, Zig, Vue and others) is still drawn where it lives, so no part of the repository silently drops out: its box says how many files of which language were not read, `draft` and `setup` list them, and no arrow is drawn to or from it, because its imports are unknown. A `go.mod`, `Cargo.toml` or `pyproject.toml` marks a package the way a `package.json` does.

A fresh draft shows what the code does, not what it is for. `pathlight brief` lists, for every box, the files it owns with their sizes, what it imports from and what imports it, and what is inside it; `pathlight name KEY --title TEXT --note TEXT` (or `--from FILE|-` with a JSON array of `{"key","title","note"}`) saves names an agent worked out from it, as the agent's reading, and redraws once. It never replaces a name you wrote. In Claude Code, `/pathlight` does both after drawing: it hands the job to the `pathlight-namer` agent, which runs on a Sonnet-sized model so the reading stays out of your conversation (OpenCode gets the same agent from the plugin). Notes written from file names say so; press `m` on a box to have it looked at again, or `n` to write it yourself. With no keys it opens with what the project says about itself (package description, start of the README), which is what names the box that holds the whole app. It also lists where the code can be started: scripts, `bin` and `main` that `package.json` declares, and source files no other file imports, each with its box (facts about where to begin, not what the app does). `pathlight brief --changed` lists only the boxes that are new or whose files changed since `pathlight name` recorded them (a fingerprint kept in `.cache/pathlight`, never a person-named box), so refreshing a map names only what moved.

It draws several kinds of view, each kept to about what a terminal can show at once:

- **Packages** (`index`): the strongest packages and how they depend on each other. `all_packages` lists every package.
- **Inside a package** (`<package>_components`): its components, with the other packages they connect to. Folders with fewer than three files, and a package's loose top-level files, sit in two collections (`small folders`, `loose files`) that open into their own views, so a small module is never merged into whatever imports it most. A package with more components than fit shows the strongest and says how many it left out; `<package>_all_components` shows everything.
- **A component's neighbourhood** (`<component>_near`): what it uses and what uses it, which is the blast radius of editing it. Select a component and press enter to open it. A hub with too many neighbours lists its strongest and says how many were left out.
- **Import cycles** (`cycles`, `<package>_cycles`): packages or components that import each other in a loop, with the size of the loop.

Every connection stays in the model. A view hides the weakest ones (tagged `lt2`, `lt3`, ... by import count) until it has about as many lines as a terminal can show, and its description says so; select a component to see all of its connections. Views meant to be opened directly (the complete listings and the cycle reports) are named under `entries` in `.pathlight/pathlight.activity.json`, so `pathlight check` does not count them as a second entry point.

Better names and notes go in `.pathlight/pathlight.overlay.json` beside the draft, which a rerun applies and never overwrites: `{"version":1,"elements":{"packages/core/src/session":{"title":"Sessions","note":"Runs one conversation turn"}}}`. Entries are keyed by what the code is (package directory, folder path, file path, or `<directory>#small` / `<directory>#loose` for a collection), so a name keeps applying when a generated id changes. Keys that match nothing are listed after each run. Titles (60 characters) and notes (300): files, relationships and ids always come from the code.

Beyond names, the overlay can correct the structure. `"merges":[{"title":"Data store","keys":["packages/core/src/database","packages/core/src/style"],"by":"human"}]` makes those folders one top-level component; `"splits":[{"key":"packages/core/src/session","by":"agent"}]` makes a folder one component per subfolder (plus one for the files directly in it); `"relationships":[{"from":"packages/core#loose","to":"packages/core/src/database","title":"reads and writes rows","by":"human"}]` labels an arrow that imports already support (the import count moves to its description). Every entry may say who made the decision with `"by":"human"` or `"by":"agent"`. An entry that contradicts the code (a merge of a folder that is gone or already merged, a split of a folder with no subfolders, a title for an arrow no import supports) is skipped and listed after the run, never drawn. A `human` entry is a pin: if it differs from the last commit's overlay (or was removed), `draft` says so and leaves the decision to the person. Merges and splits work on folder components, not on single loose files.

It never rewrites a LikeC4 model you wrote: if the workspace has one, use `--out DIR` to write the draft elsewhere (or `--force`). A file it generated starts with a marker line and is replaced on the next run, so do not edit it by hand. See [scan format](docs/scan.md) for what counts as an import, and [measuring map quality](docs/eval.md) for how the draft is scored.

## See the screen as text

`pathlight see VIEW --workspace . --cols 120 --rows 36` prints what the viewer would show, as text. It runs the viewer in a private tmux server at that size, so it never touches your panes, and it prints once the picture has stopped changing. `--select ELEMENT` opens with that element selected (`pathlight view` takes it too), and `--keys Tab,i` sends tmux key names first; `--ansi` keeps the colours. An agent cannot look at the viewer, so this is how it checks the diagram it just wrote; the tests keep screens at several sizes as snapshots (`tests/golden/`).

## Outside tmux

Use `--pane %ID` to choose the parent pane explicitly (run `tmux display-message -p '#{pane_id}'` in it), and `--socket PATH` for a non-default tmux server.
Use `--project NAME` when multiple projects have the same view ID.

## Use from OpenCode

Targets OpenCode V2 (verified against 2.1.4, with its own test suite and a real first run). `pathlight init --global` registers `@dumbbunnyio/pathlight-opencode` (from a checkout, `plugins/opencode`) in OpenCode's own `opencode.json` (`$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`) for every project, and `pathlight init` in one workspace's `opencode.json` (none is added there when the global entry exists, which would load it twice), both with `"options": { "record": true }`. A configuration with comments (`opencode.jsonc`) is not rewritten: init prints the entry to add. Restart OpenCode after adding it.
The plugin has two halves, both loaded from that one entry:

- **Server plugin** (`plugins/opencode/index.ts`): records tool calls through OpenCode's `tool.hook` events, offers the `pathlight` skill to the agent (unless the workspace already has one), and provides the `pathlight_list`, `pathlight_show` and `pathlight_stop` tools.
- **Tracer agent and `pathlight_models`**: the server plugin registers a read-only `pathlight-tracer` subagent (the prompt is the Claude plugin's `agents/pathlight-tracer.md`) that the `d` key's request hands a trace to, so the reading does not run on your largest model. It is pinned to the newest Sonnet-class model you can use (the host's own list of enabled models decides, not a guess), or to `options.tracerModel` (`provider/model`) if you set one; with neither it runs on your current model. `pathlight_models` reports the choice and your usable models so the agent can help you pick (the pathlight-behavior skill says how).
- **CLI plugin** (`plugins/opencode/tui.ts`): runs in your terminal process, the only place that knows your real tmux pane, and adds the slash commands below.

| In OpenCode (inside tmux) | Claude Code equivalent | What it does |
| --- | --- | --- |
| `/pathlight-open [VIEW]` (also `/pathlight:open`) | `/pathlight:open [VIEW]` | Splits the viewer beside the conversation and follows the newest recorded session. No model turn. |
| `/pathlight [VIEW]` | `/pathlight [VIEW]` | Asks the agent to use the pathlight skill (draft, check, show), telling it your pane and tmux socket so it passes `--pane`. |
| `! pathlight open [VIEW]` | the same | Shell escape. |

Package: the plugin calls the `pathlight` binary on your PATH, never a checkout, and `sh scripts/build-opencode.sh [VERSION]` bundles it with the skills and tracer prompt into `plugins/opencode/dist`, the npm package `@dumbbunnyio/pathlight-opencode`. The release workflow publishes it with the CLI packages (`sh scripts/build-npm.sh`: `@dumbbunnyio/pathlight`, a small launcher, and `@dumbbunnyio/pathlight-linux-x64`, `-linux-arm64`, `-darwin-x64`, `-darwin-arm64`, each holding its binary, of which npm installs only the matching one; the unscoped `pathlight` only points at `@dumbbunnyio/pathlight`) with npm trusted publishing, no token stored (pre-releases under the `next` tag). When a turn ends the plugin runs `pathlight check` and `pathlight diff`, as the Claude plugin's Stop hook does, so the out-of-date badge and the review of new dependencies work the same in both.

Recording: with `record: true` every root session in a workspace with a mapping (`.pathlight/pathlight.activity.json`) is recorded without a request, the counterpart of installing the Claude hooks; a workspace without one gets nothing written. Subagent sessions and sessions in other workspaces are never recorded, and `pathlight_stop` stops one session. Without the option, recording starts only when an agent calls `pathlight_show` with `live: true`.
Each tool requests permission before loading a workspace or opening a pane. `pathlight_show` needs an explicit pane (`%2`) because OpenCode's background service may not share your terminal's environment; the slash commands supply it for you.
It uses the plugin location as the workspace and passes only identifiers to the CLI, not diagram geometry through model context. A new `show` request reuses the owned viewer pane and resets the view, selection, and scroll position.

OpenCode status: `tests/opencode-live.test.ts` runs the real OpenCode binary (`--standalone`, isolated config) against a fake OpenAI-compatible model: its hooks record a plain session, `/pathlight-open` opens a viewer bound to it, and the skill reaches the model. `tests/opencode-plugin.test.ts` covers the permission, `live`, `record` and `stop` rules against a stubbed context. The `/pathlight` command's model turn (that an agent follows the skill with a real model) is not covered, and tool names and arguments from providers other than the built-in ones are unverified.

## Observe live activity

Place `.pathlight/pathlight.activity.json` in the agent's workspace. This repository includes a mapping to its own `pathlight` LikeC4 project (`examples/viewer`).
Mappings use workspace-relative path globs and exact LikeC4 element IDs:

```json
{
  "version": 1,
  "project": "my-project",
  "mappings": [{ "glob": "services/payments/**", "element": "platform.payments" }],
  "ignore": ["tests/**", "vendor/**"],
  "shared": ["platform.types"]
}
```

`ignore` lists files deliberately outside the model (the viewer leaves their activity out too), and `shared` lists elements anything may import (so `pathlight check` expects no relationship to them). `planned` lists elements designed but not built yet (their mappings may match no files without being a mistake; `check` reports how much of the plan exists and the viewer draws them dashed with a `[planned]` tag until they have files). `entries` lists views meant to be opened directly (not linked from another), which `check` does not count as a second entry point. `check` reads these; the viewer also reads `ignore` and `planned`.

In OpenCode with `record: true`, just run `/pathlight-open live`. Without it, ask the agent to show the `pathlight` project's `live` view with `live: true` and your current pane ID.
The plugin binds the panel to the session. It records that session's subsequent tool starts, completions, and failures automatically.
Call `pathlight_stop` to stop recording. Closing the viewer alone does not stop recording.
Plugin reloads stop recording; call `show` with `live: true` again to resume.
Subagent sessions are separate and are not automatically included.

The Now card lists the selected component's recent mapped calls (three rows; repeats collapse to `×N`), and the session summary (`c`) lists edits to files no component claims under `not in the model` (files in the mapping's `ignore` list are skipped). Calls that name no file (a subagent launch, a search) are recorded but not shown, and reads of unclaimed files are left out.
Native cards also carry a tag in their top border while a tool runs (`■ edit`, `◦ read`, `▸` command), then `✓ done` or `✗ failed` for 30 seconds. Groups display their own mapped activity in their title.
The layout stays fixed as activity arrives.
In the header line a call on a file no component claims shows without a component. Long-running calls become `unconfirmed` after 30 seconds without an outcome.
This is an observation-age indicator, not proof that the agent disconnected or the tool stopped.
Selection, pan and zoom remain unchanged as activity arrives. Reopening the viewer reads retained activity.

For Claude Code, `pathlight init` installs these hooks. To do it by hand, copy the hooks from `plugins/claude/hooks.example.json` into your project settings and replace the absolute plugin path.
Merge the hooks with existing settings; do not replace unrelated configuration.
The hook runs asynchronously and exits successfully even if observation fails.
`pathlight plan <element ids>` lets an agent say where it is about to work; the viewer outlines those elements and marks activity outside them `off plan`. A `Stop` hook runs `pathlight check --quiet` and `pathlight diff --quiet` after each turn, so the viewer can show an out-of-date badge when the model no longer matches the code and mark connectors whose imports changed since the last commit (`pathlight diff [--base REV]` prints the same list) (see [native viewer](docs/native-viewer.md)). The adapter accepts `PreToolUse`, `PostToolUse`, and `PostToolUseFailure`; the tests use hook payloads, and it records real interactive Claude Code sessions on Linux.
With the Claude session ID, open a bound viewer:

```sh
bun run pathlight show VIEW --workspace /path/to/project --project PROJECT --pane %ID --source claude --session SESSION_ID
```

Only tool names, call/session IDs, workspace-relative paths, operation categories, timestamps, and lifecycle states are retained.
Tool arguments, command strings, source contents, tool results, and error text are not stored.
Records live under `.cache/pathlight/activity` in directories created with private permissions.
Each source/session retains at most 2048 event files after writers settle (what replay walks); the live view reads the newest 256 and reduces them to the latest 128 calls.
The OpenCode observer uses a bounded 128-event queue and supports eight opted-in sessions per plugin instance.
Collection is best-effort: overload or disk failures may lose events, and old history is pruned. It is not an audit log.
All activity remains local. No background service or network endpoint is installed.

## Verify changes

```sh
bun run check
bun run test
```

They exercise the real CLI, native interaction, and isolated tmux servers; the file-browser test needs Neovim.
They cover pane reuse, protecting a repurposed pane, zoom, fit, quit and activity isolation. Appearance still needs a check in your actual terminal.

Per-request readiness files remain under the selected workspace's `.cache/pathlight` directory. Close viewers before removing old cache directories.
Concurrent requests for the same parent pane and workspace return a busy error. Retry after the active request finishes.

## License

MIT, see [LICENSE](LICENSE). Third-party notices are in [NOTICE.md](NOTICE.md).
