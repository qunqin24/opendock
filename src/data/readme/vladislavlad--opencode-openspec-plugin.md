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

**Buttons that write the prompt for you.** Explore, Propose, Apply, Update,
Archive and Delete are all there. Apply and Update drop the command into the
prompt so you can add context before sending; Archive and Explore submit right
away. Everything that starts an agent turn greys out while one is already
running.

**Setup and updates handled.** A first-run **Init** button installs the OpenSpec
CLI, configures the project and derives specs from your existing code. Settings
shows the installed plugin and CLI versions, checks npm for newer ones, and can
apply the update for you.

## Requirements

- [opencode](https://opencode.ai) `>= 1.18.0`
- The [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec), installed globally –
  the `/opsx-*` commands shell out to the `openspec` binary. Either install it
  yourself (`npm install -g @fission-ai/openspec`) or let the **Init** button do it.

## Install

TUI plugins are configured in opencode's **`tui.json`**, not `opencode.json`.
Add the plugin to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["@vladislavlad/opencode-openspec-plugin"]
}
```

opencode resolves the package from npm on the next launch. The sidebar appears in
the session panel – open it in a project that has, or is about to have, an
`openspec/` directory.

## First run

In a project with no OpenSpec set up, the sidebar shows an **Init** button. It
hands the agent one turn that:

1. installs the OpenSpec CLI if it's missing (it'll ask which package manager to use);
2. runs `openspec init --tools opencode`, which writes the `/opsx-*` commands and
   skills into `.opencode/`;
3. asks about your stack, spec language and project context, and writes them to
   `openspec/config.yaml`;
4. offers to reverse-engineer baseline specs from your existing code – and asks how
   deeply to study it first, since **Deep** costs noticeably more time and tokens
   than **Overview**;
5. validates the result and points you at **Explore** and **Propose** for your first
   change proposal.

Progress is checkpointed stage by stage. If the turn is interrupted, the sidebar
says where it stopped and offers **Resume** – which picks up from the first
unfinished stage – or **Dismiss**.

The commands from step 2 only load properly when opencode restarts, so you'll see
a **Reload OpenCode** prompt once setup finishes.

## Commands

The plugin registers two of its own (type `/` in opencode):

| Command | What it does |
| --- | --- |
| `/opsx-config` | Configure project context – stack, spec language, rules – in `openspec/config.yaml`. |
| `/opsx-baseline` | Derive or refresh `openspec/specs` from the existing implementation. Needs a configured project – run `/opsx-config` first. |

The rest come from the OpenSpec CLI after `openspec init`:

| Command | What it does |
| --- | --- |
| `/opsx-propose <feature>` | Create a change proposal for a new feature or change. |
| `/opsx-apply <change>` | Implement an approved change. |
| `/opsx-update <change>` | Revise an existing change proposal. |
| `/opsx-archive <change>` | Fold a completed change back into the specs. |
| `/opsx-explore` | Explore the specs and codebase before proposing. |
| `/opsx-sync` | Reconcile specs with the current state. |

## Staying up to date

The sidebar checks npm once per project for a newer plugin or CLI version. When
there is one, a banner appears above the actions and the **Settings** button turns
accent-coloured. From Settings you can update either component or both; the agent
edits your `tui.json`, installs the new CLI, and tells you to reload. After the
restart, **Complete Update** runs any migration steps and summarises what changed.

You get that summary however you updated. The sidebar also remembers which plugin
version last ran, so an update that bypassed the button entirely – `npm i -g`, a
hand-edited `tui.json`, or an unpinned specifier that opencode refreshed on its own –
still offers **Complete Update** on the next launch.

## Development

Built with [Bun](https://bun.sh). Sources in `src/` are bundled into a single
`dist/index.js` using `@opentui/solid`'s Solid transform (universal codegen).
`@opentui/*` and `solid-js` stay external, so the plugin shares opencode's single
Solid runtime at load time.

```bash
bun install
```

```bash
bun run build
```

```bash
bun run test
```

The published package ships only `dist/`; `prepublishOnly` rebuilds it before
every publish so the artifact always matches source. See [AGENTS.md](AGENTS.md)
for the code layout and conventions.

## Release

Pushing a `v*` tag builds and publishes to npm – see
[`.github/workflows/release.yml`](.github/workflows/release.yml).

```bash
npm version patch && git push --follow-tags
```

## License

[MIT](LICENSE) © Vladislav Kartashov
