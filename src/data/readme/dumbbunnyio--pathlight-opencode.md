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

Then, in a project, type `/pathlight:map` in Claude Code or `/pathlight` in OpenCode (or run `pathlight setup --yes`), and `pathlight doctor` if anything is missing. Other agents (Codex, Pi, …) have no plugin yet: the map, the viewer and `check`/`diff` work beside any of them, but the viewer cannot see what they touch.

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

Or type `/pathlight:map` in Claude Code (`/pathlight` in OpenCode) and let the agent run both for you, asking first. `setup` writes nothing without `--yes`, never rewrites a model you wrote, and leaves the hooks and recording to `pathlight init` (below), because those change your settings.

The first run ends with a briefing, not just a picture: once the boxes are named, the agent shows `pathlight brief --first-day` as printed (what the app is, how it is built, where the project declares it starts, the journeys to follow with `F`, and how many names were read in the code or only inferred from file names), records the journeys the namer suggested, and offers to walk you through it. The walk is the onboarding skill (`/pathlight:onboarding`, "walk me through this codebase", "onboard me"): the recorded journeys step by step, citing boxes by key and files by line, then one line naming the boxes no journey touched and three questions worth asking with `t`. With your yes it moves the diagram to each step with `pathlight point … --journey ID --step N`, which turns the journey's reading on at that step (the box selected once and marked `← agent` until your next key, the journey until `esc` or the next pointer; it never follows the agent). The briefing is derived each time from the scan, the names and the journeys; nothing new is stored, and Pathlight calls no model: the agent reads, the viewer only points.

## Quick start (Claude Code and OpenCode)

The viewer on one screen, the three keys to start and the rest in three tiers: [docs/quick-start.md](docs/quick-start.md). [The viewer reference](docs/native-viewer.md) has every key.

From the project you work in, after `pathlight setup --yes` has drawn a model (or with one you wrote):

```sh
pathlight init --workspace .
```

`init` adds the Claude Code hooks to `.claude/settings.local.json` (per-user), copies the three pathlight skills as `pathlight-map`, `pathlight-behavior` and `pathlight-onboarding` (the Claude plugin gives them as `/pathlight:map`, `/pathlight:behavior` and `/pathlight:onboarding`),
registers the OpenCode plugin (the `@dumbbunnyio/pathlight-opencode` npm package; from a checkout, its `plugins/opencode` folder), and creates `.pathlight/pathlight.activity.json` if absent and there is a model to map (with none, it says to run `pathlight setup --yes`). It maps only elements whose name matches
a directory or file that exists; review it and add globs for the rest. Re-running `init` is safe and never overwrites an existing mapping.

To reopen the viewer yourself, with no agent involved:

| Where you are | Command | Result | Inference |
| --- | --- | --- | --- |
| A shell prompt in a tmux pane | `pathlight open [VIEW]` | That pane becomes the viewer | none |
| Inside Claude Code | `/pathlight:open [tmux\|pane] [VIEW]` | A viewer pane is split beside the conversation, bound to it; with `pane`, or a saved `pane` choice, Pathlight is drawn in Claude Code's own pane instead, which is experimental ([Inside Claude Code](#inside-claude-code)) | none (the plugin answers the command itself, so the model is never called) |
| Inside OpenCode | `/pathlight-open [VIEW]` | A viewer pane is split beside the conversation | none (the CLI plugin handles it) |
| Inside Claude Code or OpenCode | `! pathlight open [VIEW]` | The same split | none (a shell escape) |

`open` follows the most recent recorded session and shows `VIEW`, else the view named `index`, else the first view. Typed at a prompt it takes over that pane; run by an agent (anything between the pane's shell and the command) it splits beside it. `--here` always uses the current terminal and `--split` always splits. Without a `.pathlight/pathlight.activity.json` it still opens, but cannot follow an agent. The hook needs the Claude plugin; `/pathlight:open` is not installed by `pathlight init`.

Then, in tmux, run `/pathlight:map` in Claude Code (or `/pathlight:map VIEW_ID`). The viewer opens beside the conversation and
follows the most recently active recorded session with `--follow`, so you need no pane or session IDs. You can also run it yourself:

```sh
bun run pathlight show VIEW --workspace /path/to/project --follow
```

Installing the Claude hooks is the opt-in for Claude recording; remove them to stop. For OpenCode the opt-in is `record: true` on the plugin entry (what `init` writes) or a `live: true` request.
`--follow` only reads journals: it never starts recording, and it switches to whichever recorded session wrote last. A Claude subagent's calls share the conversation's session and carry a label; OpenCode child sessions are not recorded.
The header shows `● live` (a spinner while a tool runs; the session's id is in `c`), the right of its second row is the news line (the call running now, `now ■ edit in Auth service`, gone once it ends; `following <box>  a stop` while follow is on; or the `w` offer), and the Work card in the inspector lists the selected component's recent edits and commands with their age. Reads are kept for `c` and replay and shown nowhere live. The footer only answers the keys you press; nothing the agent does is reported there.
Boxes show `e`/`c` counts of retained edits and commands. Press `t` to ask the agent about the selected box or tell it what to change. Beside the conversation (the tmux split `pathlight show` opens, or Claude Code's pane) this opens a modal: the kind of request, the box, and a field showing a suggested question (`how does <box> work?`) as ghost text that `→` takes; Enter sends it with the box's context and the reply lands in the conversation beside you. When the conversation is hidden (zoom the viewer's tmux pane, `prefix z`), the inspector's column turns into the talk instead: the conversation of the bound session (your prompts and the agent's text, read from the host's own conversation file and never copied), with a field under it. The first request is typed into your agent's pane with the files on the component's edges and its connections; later ones are your text alone. Enter sends and submits (an empty field sends nothing; `→` takes the suggestion), Alt+Enter adds a line, `z` widens the talk, `i` flips back to the node, Esc steps back. The reply shows in the talk as it arrives, with `⠋ working` under your request, `waiting for you in its pane` (a permission prompt or a question, answered in the agent's pane) or `done`; nothing on the diagram moves. Zooming or unzooming with a request open carries it across. A how-question (the talk says `records a journey` under its tabs) is answered in chat and recorded as a journey that `F` walks; an instruction is declared with `pathlight plan` before the first edit, so the boxes it will touch are outlined first. Press `d` to ask the agent to trace how something works from that box and record it as a journey (it reads the code and runs `pathlight flow add`, in the Claude plugin's Sonnet-sized `pathlight-tracer` agent so the reading does not run on your larger model; `F` shows it once written). Press `m` to ask the agent to improve the map for that box (it reads the files, answers, and proposes a new name, note, merge or split, writing it to the overlay only after your yes) or `n` to name and describe it yourself; both need a map made by `pathlight draft`. Press `1`–`4` to focus an inspector card (Work, Connects or Steps, Files, In journeys; `e` shows the files), `F` to step through a journey on the diagram (the header's first line names the journey, the step and its box), `/` to search every view, box, journey and mapped file (this view's first, exact matches before all; `tab` narrows the list to one kind) and `g` to jump to a view, and `T` to choose a theme (OpenCode-format JSON themes, previewed live). Press `w` to select the node the agent is working on; when that work is in a component this view does not show and the agent's turn is still open, the header says "working in VIEW" beside a highlighted `w` ("go and follow"), once (after `w` and Back it returns only for a later call in another box, or a new turn); once the turn has ended the offer is gone, and `w` goes there and turns follow on (a view this one links to with `navigateTo` first, else the smallest view containing it), never on its own (or click its row in the activity list), and `c` to review the session: new dependencies the code gained since the last commit that the model does not have, each to accept (`y`) or reject (`n`, which asks the agent to take it out), then what the session touched (see [native viewer](docs/native-viewer.md#review-new-dependencies)). Press `a` to follow the work: the viewer selects the box of the newest edit or command, running or finished, and glides the camera to it. Only work that happens after you turn it on (or resume it) counts; `w` jumps to the last work done. It is off by default; while on, it goes to another view when that is where the work is (`b` comes back), and it pauses when you select, pan or zoom (`a` resumes). Calls made inside a Claude subagent are recorded with its type (never its id or prompt) and shown with that label, for example `·Explore`; they land in the same journal as the conversation's own calls. Press `s` to hide or show them.

Press `p` to replay the session: the viewer steps through the recorded calls in order, one call per step, with the component of each step selected and the counts building up as they did. `←`/`→` step, `[`/`]` jump between turns (a turn is one prompt and the work after it), `space` plays and pauses, `s` sets the speed, `esc` returns to live. Replay covers what the journal retained (the last 2048 events of a session) and only the calls, never the prompts.

## Open a diagram

Inside tmux, list the example diagrams, then show one:

```sh
bun run pathlight list --workspace examples/parcel
bun run pathlight show services --workspace examples/parcel
```

Select nodes with the mouse or `h` `j` `k` `l`, which move to the nearest node in that direction. Arrow keys pan the Three camera (press `v` to swap the two). Tab moves into the inspector and through its cards (in a flow it steps). Connections are orthogonal thin lines with rounded bends. Press `/` to search every view, box, journey and mapped file; `tab` narrows the list to one kind (views, boxes, journeys, files), and choosing a journey reads it on the diagram.
The selected node's connections are solid, cyan for incoming and amber for outgoing; the rest are dotted. Focus Connects (its number, or `tab`) and move the cursor onto a row to read a long relationship in full. Its last rows, muted, say `types only`: boxes this one shares only types with, which a drafted map does not draw.
Press `e` to browse the selected node's mapped files, then Enter to open one in your external editor (at its first uncommitted change, if it has one).
Set `VISUAL` or `EDITOR` before starting the viewer. File browsing does not require live recording.
Enter goes into a box: into its children when this view draws them (a group, or the frame the view is about), else into the view it opens; `o` opens that view even when the children are drawn here, and the inspector says `o opens VIEW` only then. `b` and Backspace step back through the views and selections you visited; with nowhere to go back to, Backspace goes up to the parent group, then to the view that opens this one.
Use `f` to fit, `r` to center the selection, and `q` to quit. Press `i` to show or hide the inspector (docked from 120 columns, below the diagram under 120 columns with 40 rows or more, an overlay otherwise; under 80 columns the nodes are a list) or `?` for help. The diagram refits on resize until you pan or zoom; `f` fits again. Set `PATHLIGHT_COLORS=256` if your terminal lacks 24-bit color and is not detected. Ctrl+C quits even while search is active.
See [native viewer controls and limits](docs/native-viewer.md) for search, activity, and navigation details.

To run in the current terminal instead of opening a pane:

```sh
bun run pathlight view services --workspace examples/parcel
```

## Scan a codebase

`pathlight scan --workspace . --out scan.json` reads the TypeScript, JavaScript, Python, Go and Rust source statically (the parsers are inside the binary: there is nothing more to install) and writes the files, the imports between them, the packages they use, and what it could not read. It is a fact sheet for an agent (or you) drafting a LikeC4 model of a codebase that has none; it never writes the model itself. See [scan format](docs/scan.md).

A second skill, the behavior skill (`/pathlight:behavior`), teaches an agent to draw what a user sees as a state diagram (a `*.behavior.c4` file that `draft` leaves alone), mark states it found broken (`#bug`, red) or repaired (`#fixed`, green), and record the commit it read the code at. It is the agent's reading of the code, not a scan, and says so. The map skill (`plugins/claude/skills/map/SKILL.md`, `/pathlight:map`) teaches an agent this workflow: scan, draft the model and mapping, check until clean, show. The Claude plugin ships all three (the onboarding skill too), and `pathlight init` copies them into the workspace (`.claude/skills/`, or `.agents/skills/` with `--no-claude-hooks`); OpenCode documents reading both locations. With the Claude plugin installed, `init` writes no copy into `.claude/skills/` and removes ones it wrote earlier, because a project copy outranks the plugin's skill and stops it updating; `pathlight doctor` reports any that remain.

`pathlight flows --workspace .` checks the state diagrams in `*.behavior.c4` files and the journeys (LikeC4 dynamic views: the components a request passes through) against the files they name, the model and the commit they were synced at, and lists what is gone, changed since, has no relationship behind it, or is unchecked; it never says a flow is right (`--json`, `--strict` as for `check`). `pathlight flow add ID --title T --reads FILES --step 'from -> to: event' ...` is how an agent records a journey it worked out from the code: it checks each component against the model, requires the files read, stamps the commit, writes `ID.behavior.c4` and rolls it back if the model would stop compiling (`flow remove ID` deletes only what it wrote). In the viewer, `F` traces a flow on the diagram: numbered steps, a step reader in the inspector, and the flow kept visibly apart from what the agent was observed doing (see [native viewer](docs/native-viewer.md)). A flow written while files it read had uncommitted changes records what those files were (`Read with uncommitted changes: path@hash`), so only a later edit makes it "behind". A journey step may name the function it calls (`@ file#function`); the declaration is copied from the file when the flow is written, shown in the viewer's step reader (`e` opens it in your editor at its line), and checked again by `pathlight flows`, which also reports `no call found` when no file of the box the step starts from uses that function.

`pathlight check --workspace .` compares that scan with your LikeC4 model and `.pathlight/pathlight.activity.json`: mapping globs that match no files, source files no mapping claims, relationships with no import between their mapped files, and imports between elements that no relationship declares (an import that only uses types is not asked for: see [scan](docs/scan.md#uses)). These are questions, not verdicts (a relationship can run over a network call that no import shows); `--json` gives the same facts as data and `--strict` exits 1 when anything is found.

## Draw a codebase from its code

`pathlight draft --workspace .` writes a first architecture picture made from the code alone, with no model in the loop, into `.pathlight/` (every file Pathlight writes into your repository goes there, so none lands in the root): each workspace package becomes a box, the top-level folders inside it become components (`session.ts` beside a `session/` folder is one), and a relationship exists wherever files in one component use code from files in another, titled by what they use (`calls createDocument, presentDocument`, `extends BaseModel +2`) or, when that does not fit, by how many imports. Imports that only use types (annotations, signatures) draw no arrow in that direction: the pair is in the model tagged `#types`, in no view, and listed in Connects as `types only`. A folder that holds more than half of its package's read files, and either at least 100 of them or nine in ten of them, is opened instead: it is drawn as a package is, a box with its own view of its subfolders (titled by their own names), and the same test applies inside it, so a Python or Go backend that is one folder, or a Java `src/main/java/org/…` chain, shows what it is made of; a `split` in the overlay opens any other folder. Tests are left out. It writes `pathlight.model.c4`, `.pathlight/pathlight.activity.json` (the file mapping) and `likec4.config.json`, so `pathlight check` and the viewer work on it straight away, and the same code always gives the same text. Names are the folder names and the descriptions are facts (file and line counts); nothing is inferred about intent. Code in a language the scan does not read (Rust, Java, Zig, Vue and others) is still drawn where it lives, so no part of the repository silently drops out: its box says how many files of which language were not read, `draft` and `setup` list them, and no arrow is drawn to or from it, because its imports are unknown. A `go.mod`, `Cargo.toml` or `pyproject.toml` marks a package the way a `package.json` does.

A fresh draft shows what the code does, not what it is for. `pathlight brief` lists, for every box, the files it owns with their sizes, what it imports from and what imports it, and what is inside it; `pathlight name KEY --title TEXT --note TEXT` (or `--from FILE|-` with a JSON array of `{"key","title","note"}`) saves names an agent worked out from it, as the agent's reading, and redraws once. It never replaces a name you wrote. In Claude Code, `/pathlight:map` does both after drawing: it hands the job to the `pathlight-namer` agent, which runs on a Sonnet-sized model so the reading stays out of your conversation (OpenCode gets the same agent from the plugin). Notes written from file names say so; press `m` on a box to have it looked at again, or `n` to write it yourself. With no keys it opens with what the project says about itself (package description, start of the README), which is what names the box that holds the whole app. It also lists where the code can be started: scripts, `bin` and `main` that `package.json` declares, the scripts in `pyproject.toml`'s `[project.scripts]` and `[project.gui-scripts]`, a Python `__main__.py` or `main.py`, a Go `package main` with `func main`, and source files no other file imports (tests and migrations left out; a Go file counts as imported when its package is), each with its box (facts about where to begin, not what the app does). `pathlight brief --first-day` puts these facts and the names together for a person new to the code, in five parts that each say so when they are empty, short enough to paste whole: what it is, how it is built, where it starts (the declared starts only, or one line saying there are none), the journeys, and one line on how sure the names are (`--json` adds the commit and how many named boxes kept their files). `pathlight brief --changed` lists only the boxes that are new or whose files changed since `pathlight name` recorded them (a fingerprint kept in `.cache/pathlight`, never a person-named box), so refreshing a map names only what moved.

It draws several kinds of view, each kept to about what a terminal can show at once:

- **Packages** (`index`): the strongest packages and how they depend on each other. `all_packages` lists every package.
- **Inside a package** (`<package>_components`): its components, with the other packages they connect to. Folders with fewer than three files, and a package's loose top-level files, sit in two collections (`small folders`, `loose files`) that open into their own views, so a small module is never merged into whatever imports it most. A package with more components than fit shows the strongest and says how many it left out; `<package>_all_components` shows everything.
- **Inside an opened folder** (`<folder>_components`): every child as a card, its collections among them, while the view holds at most 20 boxes in all (the cards, the frames and the neighbors drawn); above that it keeps the strongest, lists the rest in `<folder>_all_components`, and never leaves out a box that holds a declared start (a script, a `main`). Its description says why it was opened.
- **A component's neighborhood** (`<component>_near`): what it uses and what uses it, which is the blast radius of editing it. Select a component and press enter to open it. A hub with too many neighbors lists its strongest and says how many were left out.
- **Who uses a resource** (`<resource>_users`): the resource and every component or program that leads to it, each inside its package, with only the arrows into it. Select a resource and press enter to open it. Past 16 users, those in one collection (programs that run one image) are drawn as one box, then whole packages. A resource nothing uses has no such view.
- **Import cycles** (`cycles`, `<package>_cycles`): packages or components that import each other in a loop, with the size of the loop.

The draft also draws what the code talks to that is not code: databases, caches, queues, object stores, search, mail, identity providers, monitoring, AI providers and other third-party APIs. Each is a box at the top level, its first row saying what kind of thing it is (`database`, `cache`, `queue`, `storage` …), with an arrow from every component whose files import a package that leads to it (`pg`, `sqlalchemy`, `ioredis`, `@aws-sdk/client-s3`, `stripe`, `github.com/lib/pq` …). The packages are listed as its technology, and its description says how many files import them. One table of data (`src/resources/imports.json`) says which package leads where; nothing is guessed. Packages used only for their types, and tests, are no evidence, and HTTP clients (`fetch`, `axios`, `requests`) lead nowhere, since they could reach anything. A SQL database takes its engine's name when the code names exactly one (an ORM beside `pg` is PostgreSQL); with several engines behind one ORM it stays "SQL database", and its description names them. The same database in two packages is one box. Its schema files (`*.sql`, `*.prisma`) are mapped to it, so an agent editing a migration lights the database. Code that calls the database lights the code, not the database. The mapping lists each resource's packages under `resources`, and `pathlight check` judges an arrow to a resource by them: it reports a component that imports a resource's package with no arrow to it, and a resource whose packages no file imports any more. Compose files and the example environment (`.env.example`, `.env.sample`, `template.env`) are read too, as names only (images and environment names, never a value): they cite themselves on the resources the code reaches, give an ORM's database its engine when they name exactly one (`image: postgres:16` beside `sequelize` is PostgreSQL; code that names two engines keeps both), and add a box only for a datastore, cache, queue, object store, search engine or mail server they actually run (an image) with no code found, which the box and `check` say. An environment name alone adds nothing. A Helm chart (a folder with `Chart.yaml`) is read the same way: its dependencies by chart name (`postgresql`, `redis`), its values' images, and each value that names a secret or credentials by a kind word in it (`agentic_db_creds` is a database, `external_redis_creds` Redis); its templates are Go templating, so only their literal `image:` lines and environment names are read. Terraform is read as block headers: a `resource` whose type is a datastore, queue or bucket (`aws_db_instance`, with its `engine`, `aws_sqs_queue`, `google_storage_bucket` …) and a `module` whose source names one (`terraform-aws-modules/rds/aws`); networking and IAM are never read, and nothing is evaluated. The tables are `src/resources/infra.json`. A repository that is mostly infrastructure (more programs in its charts and compose files than files of code) also gets the programs they run: each Helm workload (`Deployment`, `StatefulSet` …) and each compose service that is not itself a resource is a box whose card says `container`, inside one box per chart or compose file, with an arrow to every resource its files name (a secret the chart's values lead to a kind, `depends_on`, an environment name such as `DATABASE_URL`). Services that run one image are one collection. A program's template is mapped to it, so editing it lights the program, and `pathlight check` re-reads the files to judge its arrows. In a repository of code, compose services are usually that code or a developer's tools, so they are not drawn. A repository with no code and no programs is drafted as one view of the resources its files declare. `brief --first-day` names what the app talks to in one line. The map says what the code expects, never what you have access to.

Every connection stays in the model. A view hides the weakest ones (tagged `lt2`, `lt3`, ... by import count) until it has about as many lines as a terminal can show, and its description says so; select a component to see all of its connections. Views meant to be opened directly (the complete listings and the cycle reports) are named under `entries` in `.pathlight/pathlight.activity.json`, so `pathlight check` does not count them as a second entry point.

Better names and notes go in `.pathlight/pathlight.overlay.json` beside the draft, which a rerun applies and never overwrites: `{"version":1,"elements":{"packages/core/src/session":{"title":"Sessions","note":"Runs one conversation turn"}}}`. Entries are keyed by what the code is (package directory, folder path, file path, or `<directory>#small` / `<directory>#loose` for a collection), so a name keeps applying when a generated id changes. Keys that match nothing are listed after each run. Titles (60 characters) and notes (300): files, relationships and ids always come from the code.

Beyond names, the overlay can correct the structure. `"merges":[{"title":"Data store","keys":["packages/core/src/database","packages/core/src/style"],"by":"human"}]` makes those folders one top-level component; `"splits":[{"key":"packages/core/src/session","by":"agent"}]` opens a folder as the draft opens a big one: a box with its own view, one component per subfolder and its loose files inside it; `"relationships":[{"from":"packages/core#loose","to":"packages/core/src/database","title":"reads and writes rows","by":"human"}]` labels an arrow that imports already support (the import count moves to its description). Every entry may say who made the decision with `"by":"human"` or `"by":"agent"`. An entry that contradicts the code (a merge of a folder that is gone or already merged, a split of a folder with no subfolders, a title for an arrow no import supports) is skipped and listed after the run, never drawn. A `human` entry is a pin: if it differs from the last commit's overlay (or was removed), `draft` says so and leaves the decision to the person. Merges and splits work on folder components, not on single loose files.

It never rewrites a LikeC4 model you wrote: if the workspace has one, use `--out DIR` to write the draft elsewhere (or `--force`). A file it generated starts with a marker line and is replaced on the next run, so do not edit it by hand. See [scan format](docs/scan.md) for what counts as an import, and [measuring map quality](docs/eval.md) for how the draft is scored.

## Inside Claude Code

With the Claude plugin installed, `/pathlight:open [VIEW]` splits a tmux viewer beside the conversation, bound to it, as `pathlight show` does (it needs tmux, as `pathlight show` and OpenCode do). The plugin answers the command itself, so the model is never called.

**Experimental: the viewer in Claude Code's own pane.** Claude Code 2.1.287 or later can draw Pathlight in a pane of its own, with no tmux: `/pathlight:open pane [VIEW]` does it for one command, and `pathlight config set claude pane` makes it your default, saved as `"claude": "pane"` in Pathlight's own settings file, `~/.config/pathlight/config.json` beside the theme (nothing about any workspace is kept there; `pathlight config set claude tmux` puts the tmux pane back, `pathlight config get claude` prints the choice, and the word in the command, `pane` or `tmux`, wins over the file). It is off by default because Claude Code gives a docked pane at most 45% of the terminal's width and offers no way to resize or place it, which is not an effective viewport for a diagram; the work is kept for when that changes. With the pane chosen, where it goes is Claude Code's layout (`/tui` switches it):

- **Fullscreen** (`/tui fullscreen`, or `CLAUDE_CODE_NO_FLICKER=1`), from 110 columns: **on the right**, docked beside the whole transcript. Claude Code gives a docked pane at most 45% of the terminal's width, so on a 232-column terminal the pane is about 103 columns and the inspector sits below the diagram; at 312 columns it is 139 and the inspector docks beside it.
- **Main screen** (the default layout): **on top**, inline above the prompt box, the full width and up to 45 rows (228 × 37 on a 232 × 50 terminal, with the inspector beside the diagram and a few rows of transcript above it). Under 80 × 24 inside its frame it opens the tmux pane instead, and says so.

Claude Code places a mod's pane and offers no way to dock it on the main screen, so there "on the right" is the tmux pane, or the fullscreen layout. Under 110 columns in fullscreen, or on an older Claude Code, the command opens the tmux pane even with `pane` chosen.

With the pane chosen, when the agent itself runs `pathlight show` or `pathlight open` (the map skill's first run ends with one), the plugin opens this same pane instead, where Claude Code can place it, and answers the command with one line; the command is read, never run. Otherwise it runs as before.

The pane opens with the keys: type to drive it (`h j k l`, Enter, Backspace, `t i F T ? [ ] /`, `+ -`, Space, and the talk's text). Tab goes to Pathlight from the field too (Shift+Tab arrives as Tab). The arrows, PgUp/PgDn and Home/End need one click on the pane's last row first, which then says `every key goes to Pathlight`. Esc is Claude Code's: it hands the keys back to the conversation and leaves the pane showing (and leaves a field you were typing in). `ctrl+x tab` gives the keys back to the pane, to its field (the pane's last row says so). tmux's own pane keys (`ctrl-h/j/k/l` and the like) are tmux's and do not enter it: the pane is Claude Code's, not a tmux pane. The dock opens at its widest, 45% of the terminal (Claude Code's ceiling); `ctrl+x x` closes it. Claude Code's keys that widen and narrow a pane (`ctrl+x ←` and `ctrl+x →`) work only while a pane holds the keys outside a field, which Pathlight's pane does not, and no mouse drag resizes it. In the pane `q` does what Esc does in the viewer (leaves a card, a flow, the talk, help, the session summary or the theme list; in a field it is a letter) and never quits; close the pane with its ✕. Clicks on the diagram do not reach it in the pane.

The talk's request is sent as your own prompt (the transcript labels it "Prompt from the pathlight plugin"), with exactly the text `pathlight show` would type into the agent's pane; sent while the agent is working, it waits for the turn to end and the talk says so. The reply shows in the talk as it does in tmux. Pathlight calls no model; the pane records nothing (the plugin's hooks still do) and is a `pathlight pane` process that ends when the pane closes or the session ends.

## Open in a browser

The map also opens in a browser window of its own: the terminal viewer drawn by the browser, with the same header, diagram, inspector, footer, words, colors and keys, laid out by the same code. Three ways to open it, all the same window:

- `pathlight web --open [VIEW]` from a shell;
- `B` in the viewer, at the view and box you are on;
- `/pathlight:open web [VIEW]` in Claude Code, or `pathlight config set claude web` to make the browser what `/pathlight:open` opens (`tmux` puts the tmux pane back; the word in the command wins).

It uses the first Chromium-family browser it finds (Brave, Chrome, Chromium, Edge, Vivaldi) in an app window with Pathlight's own profile, so your browser's tabs and profile are untouched; `pathlight config set browser COMMAND` names another (any other browser opens it in a tab), and `pathlight doctor` says which one it found. There is one window per project: opening it again brings that window forward at the view you asked for. Its server runs in the background on `127.0.0.1` only, answers only its own window (a token in the address), and stops a few seconds after the window closes. `pathlight web [VIEW]` without `--open` serves it in the foreground and prints the address, for any browser; Ctrl-C stops it.

What the browser has today: the map, selection, the inspector, the views list, Back, the arrow keys, fit and zoom, the themes, and the agent's live work as the terminal shows it: the tag in a box's border and its pulse while a call runs, the news line (`now`, the `w` offer, `following`), the Work card, follow (`a`, paused by your own move) and `w`. Opened from a conversation it shows that conversation's work; otherwise the newest recorded session's. An edit to the model redraws it where you were. Journeys, the review and the talk come next; until then they are in the terminal viewer.

## See the screen as text

`pathlight see VIEW --workspace . --cols 120 --rows 36` prints what the viewer would show, as text. It runs the viewer in a private tmux server at that size, so it never touches your panes, and it prints once the picture has stopped changing. `--select ELEMENT` opens with that element selected (`pathlight view` takes it too), and `--keys Tab,i` sends tmux key names first; `--ansi` keeps the colors. An agent cannot look at the viewer, so this is how it checks the diagram it just wrote; the tests keep screens at several sizes as snapshots (`tests/golden/`).

## Outside tmux

Use `--pane %ID` to choose the parent pane explicitly (run `tmux display-message -p '#{pane_id}'` in it), and `--socket PATH` for a non-default tmux server.
Use `--project NAME` when multiple projects have the same view ID.

## Use from OpenCode

Targets OpenCode V2 (verified against 2.1.4, with its own test suite and a real first run). `pathlight init --global` registers `@dumbbunnyio/pathlight-opencode` (from a checkout, `plugins/opencode`) in OpenCode's own `opencode.json` (`$XDG_CONFIG_HOME/opencode`, else `~/.config/opencode`) for every project, and `pathlight init` in one workspace's `opencode.json` (none is added there when the global entry exists, which would load it twice), both with `"options": { "record": true }`. A configuration with comments (`opencode.jsonc`) is not rewritten: init prints the entry to add. Restart OpenCode after adding it.
The plugin has two halves, both loaded from that one entry:

- **Server plugin** (`plugins/opencode/index.ts`): records tool calls through OpenCode's `tool.hook` events, offers the three skills to the agent as `pathlight-map`, `pathlight-behavior` and `pathlight-onboarding` (unless the workspace already has one of that name), and provides the `pathlight_list`, `pathlight_show` and `pathlight_stop` tools.
- **Tracer agent and `pathlight_models`**: the server plugin registers a read-only `pathlight-tracer` subagent (the prompt is the Claude plugin's `agents/pathlight-tracer.md`) that the `d` key's request hands a trace to, so the reading does not run on your largest model. It is pinned to the newest Sonnet-class model you can use (the host's own list of enabled models decides, not a guess), or to `options.tracerModel` (`provider/model`) if you set one; with neither it runs on your current model. `pathlight_models` reports the choice and your usable models so the agent can help you pick (the pathlight-behavior skill says how).
- **CLI plugin** (`plugins/opencode/tui.ts`): runs in your terminal process, the only place that knows your real tmux pane, and adds the slash commands below.

| In OpenCode (inside tmux) | Claude Code equivalent | What it does |
| --- | --- | --- |
| `/pathlight-open [VIEW]` (also `/pathlight:open`) | `/pathlight:open [VIEW]` | Splits the viewer beside the conversation and follows the newest recorded session. No model turn. |
| `/pathlight [VIEW]` | `/pathlight:map [VIEW]` | Asks the agent to use the pathlight map skill (draft, check, show), telling it your pane and tmux socket so it passes `--pane`. |
| `! pathlight open [VIEW]` | the same | Shell escape. |

Package: the plugin calls the `pathlight` binary on your PATH, never a checkout, and `sh scripts/build-opencode.sh [VERSION]` bundles it with the skills and tracer prompt into `plugins/opencode/dist`, the npm package `@dumbbunnyio/pathlight-opencode`. The release workflow publishes it with the CLI packages (`sh scripts/build-npm.sh`: `@dumbbunnyio/pathlight`, a small launcher, and `@dumbbunnyio/pathlight-linux-x64`, `-linux-arm64`, `-darwin-x64`, `-darwin-arm64`, each holding its binary, of which npm installs only the matching one; the unscoped `pathlight` only points at `@dumbbunnyio/pathlight`) with npm trusted publishing, no token stored (pre-releases under the `next` tag). When a turn ends the plugin runs `pathlight check` and `pathlight diff`, as the Claude plugin's Stop hook does, so the out-of-date badge and the review of new dependencies work the same in both.

Recording: with `record: true` every root session in a workspace with a mapping (`.pathlight/pathlight.activity.json`) is recorded without a request, the counterpart of installing the Claude hooks; a workspace without one gets nothing written. Subagent sessions and sessions in other workspaces are never recorded, and `pathlight_stop` stops one session. Without the option, recording starts only when an agent calls `pathlight_show` with `live: true`.
Each tool requests permission before loading a workspace or opening a pane. `pathlight_show` needs an explicit pane (`%2`) because OpenCode's background service may not share your terminal's environment; the slash commands supply it for you.
It uses the plugin location as the workspace and passes only identifiers to the CLI, not diagram geometry through model context. A new `show` request reuses the owned viewer pane and resets the view, selection, and scroll position.

OpenCode status: `tests/opencode-live.test.ts` runs the real OpenCode binary (`--standalone`, isolated config) against a fake OpenAI-compatible model: its hooks record a plain session, `/pathlight-open` opens a viewer bound to it, and the skill reaches the model. `tests/opencode-plugin.test.ts` covers the permission, `live`, `record` and `stop` rules against a stubbed context. The `/pathlight` (`/pathlight:map`) command's model turn (that an agent follows the skill with a real model) is not covered, and tool names and arguments from providers other than the built-in ones are unverified.

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

`ignore` lists files deliberately outside the model (the viewer leaves their activity out too), and `shared` lists elements anything may import (so `pathlight check` expects no relationship to them). `planned` lists elements designed but not built yet (their mappings may match no files without being a mistake; `check` reports how much of the plan exists and the viewer draws them dashed with a `[planned]` tag until they have files). `entries` lists views meant to be opened directly (not linked from another), which `check` does not count as a second entry point. `resources` lists the elements that are what the code talks to, each with the packages that lead to it (`{ "element": "postgresql", "packages": ["pg"] }`); `check` judges a relationship to one by those imports. `check` reads these; the viewer also reads `ignore` and `planned`.

In OpenCode with `record: true`, just run `/pathlight-open live`. Without it, ask the agent to show the `pathlight` project's `live` view with `live: true` and your current pane ID.
The plugin binds the panel to the session. It records that session's subsequent tool starts, completions, and failures automatically.
Call `pathlight_stop` to stop recording. Closing the viewer alone does not stop recording.
Plugin reloads stop recording; call `show` with `live: true` again to resume.
Subagent sessions are separate and are not automatically included.

The Work card lists the selected component's recent mapped edits and commands (three rows; repeats collapse to `×N`), and the session summary (`c`) lists edits to files no component claims under `not in the model` (files in the mapping's `ignore` list are skipped). Reads, and calls that name no file (a subagent launch, a search), are recorded but not shown live.
Native cards also carry a tag in their top border while a tool runs (`■ edit`, `▸` command), then `✓ done` or `✗ failed` for 30 seconds. Groups display their own mapped activity in their title.
The layout stays fixed as activity arrives.
In the header line a call on a file no component claims shows without a component. Long-running calls become `unconfirmed` after 30 seconds without an outcome.
This is an observation-age indicator, not proof that the agent disconnected or the tool stopped.
Selection, pan and zoom remain unchanged as activity arrives. Reopening the viewer reads retained activity.

For Claude Code, `pathlight init` installs these hooks. To do it by hand, copy the hooks from `plugins/claude/hooks.example.json` into your project settings and replace the absolute plugin path.
Merge the hooks with existing settings; do not replace unrelated configuration.
The hook runs asynchronously and exits successfully even if observation fails.
`pathlight plan <element ids>` lets an agent say where it is about to work; the viewer outlines those elements and marks activity outside them `off plan`. A `Stop` hook runs `pathlight refresh` after each turn: one scan for the check (the viewer's out-of-date badge), then, on a map `pathlight draft` drew, a redraw when files landed where no box claims them, a planned box got its files, or a box's files are gone, and the diff (connectors whose imports changed since the last commit; `pathlight diff [--base REV]` prints the same list) (see [native viewer](docs/native-viewer.md)). A redraw keeps every name, writes nothing when nothing changed, never touches a model a person wrote, and is held back when it would remove a box a journey uses (`pathlight check` says which). `pathlight config set redraw off --workspace .` turns it off for one workspace. On a drawn map `pathlight plan --new FOLDER --title TEXT` declares a part before it exists: a dashed box with that name until its files land; `pathlight plan --drop FOLDER` takes back one nobody built. When a redraw draws boxes nobody has named, the hook (Claude Code's `asyncRewake`; OpenCode's plugin sends its own message) asks the agent once to hand them to the namer, at most six a turn. The adapter accepts `PreToolUse`, `PostToolUse`, and `PostToolUseFailure`; the tests use hook payloads, and it records real interactive Claude Code sessions on Linux.
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
