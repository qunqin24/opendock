# Opencode OpenSpec plugin

A TUI sidebar for [opencode](https://opencode.ai) that brings the
[OpenSpec](https://github.com/Fission-AI/OpenSpec) workflow into the terminal.
Your specs and in-flight changes sit next to the chat, and the buttons hand the
work to the agent – so you drive spec → change → implement → archive without
leaving opencode.

## What you get

**Specs, browsable.** Every capability under `openspec/specs/` is listed with its
requirement count. Open one to read its Purpose and requirements; open a
requirement to unfold its When/Then scenarios.

**Search that goes all the way down.** Type in the search box above the list and
it filters on everything a spec contains – name, title, Purpose, and the text of
every requirement and scenario. Multi-word queries have to match all words, but
they can match in different places. Rows report how many requirements matched, so
you can see where the hit came from. The query follows you into a spec and
filters its requirements there too.

**Changes with live progress.** Active and completed changes each get a section,
with a task-progress bar per change and a rolled-up bar on the collapsed header.
Open a change to see its tasks grouped and ticked off as the agent works – the
sidebar re-reads the files every few seconds, so it keeps up on its own.
Nested tasks keep their hierarchy, ordered lists keep their numbers, and markers
such as `[~]` remain visible as unfinished work. Only `x`/`X` checkboxes count as
done, matching OpenSpec. Empty descriptions show as **Untitled task**. Once all
tasks are checked, the card reminds you to review before archiving.

**Actions with an editable command.** Explore, Propose, Apply and Update open
an OpenCode dialog: edit the command, press Enter to run or Esc to cancel.
Your main draft stays intact. Archive submits directly; Delete asks for confirmation.
Actions wait while the agent is running, and failed submissions show an error.

Explore runs in **Plan**. All other actions that ask the agent to work — including
Propose, Apply, Archive, Init, Config, Baseline and updates — run in **Build**.
They use the model and variant you selected in OpenCode. The command dialog shows
the agent, provider/model and variant before you run it; cancelling leaves the
session settings unchanged. Editing a command so it needs a different agent shows
the new settings before submission. Select a model in OpenCode first if none is set.
The session keeps the execution agent after submission; the plugin does not switch
it back while work is running.

Sidebar actions use the configured command's template and arguments, but ignore
its `agent`, `model`, `subagent` and `subtask` settings so the displayed execution
settings stay authoritative. Templates come from OpenCode's ordered configuration
sources, including project and global command files. Shell interpolation (`!` followed
by a backtick-delimited command) is unsupported here: replace it with instructions
for the agent. An unavailable or unsupported template shows an error before a turn
starts. Commands typed directly into OpenCode's composer retain native behavior.

Project command files may link to shared templates elsewhere inside the project.
Malformed YAML or invalid command fields are skipped before choosing the next valid
definition, matching OpenCode's source order. Frontmatter is parsed as data; executable
JavaScript frontmatter is unsupported.

**Setup and updates handled.** A first-run **Init** button installs the OpenSpec
CLI, configures the project and derives specs from your existing code. Settings
shows the installed plugin and CLI versions, checks npm for newer ones, and can
apply the update for you.

## Requirements and installation

| OpenCode | npm package | Configuration |
| --- | --- | --- |
| 2.4.1 and later 2.x | `@vladislavlad/opencode-v2-openspec-plugin@2.0.0` | Global `cli.json`, key `plugins` |
| 1.19.6 | `@vladislavlad/opencode-openspec-plugin@1.0.0` | `tui.json`, key `plugin` |

OpenCode supplies the runtime dependencies when it loads the plugin. Both
releases support OpenSpec CLI 2.2.0. The npm build of OpenSpec requires
Node.js 22.20 or newer. See the [OpenSpec installation guide](https://openspec.dev/start/installation)
for standalone binaries, and [V1 usage](docs/v1.md) for OpenCode 1.

For a fresh OpenCode 2 installation:

```sh
opencode plugin add @vladislavlad/opencode-v2-openspec-plugin@latest
```

Alternatively, add this package to the existing `plugins` array in
`~/.config/opencode/cli.json`. Use the version `@2.0.0` for an exact pin.

```json
{
  "plugins": ["@vladislavlad/opencode-v2-openspec-plugin@latest"]
}
```

The global file lives under `$XDG_CONFIG_HOME/opencode` when XDG is set, or
under `OPENCODE_CONFIG_DIR` when overridden. Check `OPENCODE_CLI_CONFIG_CONTENT`
if it supplies the effective `plugins` array. After `bun run build`, local
development can use the absolute path to this package directory.

## Upgrade from OpenCode 1

1. Upgrade OpenCode to at least `2.4.1`. On first startup, OpenCode can
   transfer the global V1 `tui.json` entry to `cli.json`.
2. In `cli.json`, replace the OpenSpec entry in `plugins` with
   `@vladislavlad/opencode-v2-openspec-plugin@latest`. Keep any `options` on
   the entry. If there is no entry, add it to `plugins`. For example:

   ```json
   {"package":"@vladislavlad/opencode-v2-openspec-plugin@latest","options":{}}
   ```

   Use this package name when migrating from plugin `1.0.0`. The V1 `1.0.2`
   maintenance patch includes the dedicated package in its upgrade dialog.
3. Reopen OpenCode. The sidebar reads the existing `openspec/` directory
   and setup checkpoints. A pending V1 update can be completed in the V2 sidebar.
4. To upgrade a project to OpenSpec 2.2, install the CLI and run
   `openspec update --dry-run`, then `openspec update` from the project.
   Review the planned skill changes and save any local customizations first.

See the [release runbook](docs/releasing.md) and
[OpenCode migration guide](https://opencode.ai/docs/migrate-v1).

## First run

In a project with no OpenSpec set up, the sidebar shows an **Init** button. It
hands the agent one turn that:

1. installs the OpenSpec CLI if it's missing (it'll ask which package manager to use);
2. runs `openspec init --tools opencode --profile core --scope project`,
   which installs the project skills under `.agents/skills/`;
3. asks about your stack, spec language and project context, and writes them to
   `openspec/config.yaml`;
4. offers to reverse-engineer baseline specs from your existing code – and asks how
   deeply to study it first, since **Deep** costs noticeably more time and tokens
   than **Overview**. Before the full scan it asks whether to use **No subagents**,
   **One at a time**, or **Up to 2 at once** (recommended); you can enter a positive
   integer for another maximum. Without a usable answer or delegation tool, the
   main agent works sequentially. The same choice covers scanning and spec writing;
5. validates the result and points you at **Explore** and **Propose** for your first
   change proposal.

Progress is checkpointed stage by stage. If the turn is interrupted, the sidebar
says where it stopped and offers **Resume** – which picks up from the first
unfinished stage – or **Dismiss**.

After setup the sidebar asks OpenCode to reload commands and skills. If loading
fails, **Retry commands** retries it without closing your session.

Delegated work runs in bounded batches: five tasks with a limit of two use
**2 + 2 + 1**, waiting for each batch to finish. Children cannot delegate further,
and areas are processed one at a time. This is an instruction followed by the
agent for that run, not a hard concurrency limit enforced by OpenCode or shared
across other sessions. The same choice is offered by `/opsx-baseline` and by
Resume when specification derivation is still unfinished.

## Commands

The plugin registers two of its own (type `/` in opencode):

| Command | What it does |
| --- | --- |
| `/opsx-config` | Configure project context – stack, spec language, rules – in `openspec/config.yaml`. |
| `/opsx-baseline` | Derive or refresh `openspec/specs` from the existing implementation. Needs a configured project – run `/opsx-config` first. |

OpenSpec 2.2 installs the workflow skills under `.agents/skills/`. In
OpenCode, use `/openspec` to route a request or choose a skill such as
`/openspec-propose` directly. The sidebar keeps using configured legacy
`/opsx-*` commands where present and uses the matching skill otherwise.

## Staying up to date

The sidebar checks the dedicated V2 package's npm `latest` tag for updates. In Settings,
**Update** can pin a newer plugin release in `cli.json`. **Refresh OpenSpec**
refreshes project skills and reloads the OpenCode catalog in the current session.
Settings shows the last verified project tooling version recorded by Init or
Refresh OpenSpec. Run Refresh OpenSpec once if an existing project shows **Not checked**.
After reopening with a new plugin build, **Complete Update** runs any migration
steps and summarises the plugin changes.

## Development

Built with [Bun](https://bun.sh). Sources in `src/` are bundled into a single
`dist/index.js` using `@opentui/solid`'s Solid transform (universal codegen).
Development uses the OpenCode 2.4.2 SDK and OpenTUI 0.9.9. The lowest
supported host is OpenCode 2.4.1. OpenSpec is pinned to 2.2.0 for CLI
compatibility tests. These checks exercise real
OpenSpec initialization and compare task progress with its parser, including
nested and ordered tasks and unfinished checkbox markers.
`@opencode/*`, `@opentui/*` and `solid-js` stay external, so the plugin shares opencode's single
Solid runtime at load time.

```bash
bun install --frozen-lockfile
```

```bash
bun run build
```

```bash
bun run test
```

The published package ships `dist/`, the local `tui.js` entrypoint and release and V1 guides; `prepublishOnly` rebuilds it before
every publish so the artifact always matches source. See [AGENTS.md](AGENTS.md)
for the code layout and conventions.

## Release

See the [release runbook](docs/releasing.md) for the V1 and V2 branch,
dist-tag and publication steps.

## License

[MIT](LICENSE) © Vladislav Kartashov
