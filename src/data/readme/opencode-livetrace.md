# opencode-livetrace

[![npm](https://img.shields.io/npm/v/opencode-livetrace)](https://www.npmjs.com/package/opencode-livetrace)

An [OpenCode](https://opencode.ai) v2 TUI plugin that shows what the model is doing right now in the
prompt footer, and the current session's activity counts in the sidebar.

While a run is active, the footer shows the current phase and how long it has
lasted, just before OpenCode's context size:

<img src="docs/footer.png" width="771" alt="The footer through one run: waiting, thinking, running a read tool, writing, then idle, each with the context size">

*The footer through one run: waiting, thinking, running a tool, writing, and
idle.*

| Indicator     | Phase                                                |
|---------------|------------------------------------------------------|
| `1.2s ◌`      | Waiting for the model (request sent, no output yet)  |
| `4.2s ✦`      | Thinking (streaming reasoning)                       |
| `0.8s ✎`      | Writing (streaming reply text)                       |
| `read 2.1s ⚒` | Calling or running a tool                            |

It's hidden when the session is idle and during retry backoff.

When the sidebar is open, it gets an "Activity" section with the counts, below
OpenCode's "Context" section:

<img src="docs/sidebar.png" width="403" alt="Sidebar Context section followed by the Activity section listing turns, steps, tools, and thoughts">

| Symbol | Count    | Meaning                                         |
|--------|----------|-------------------------------------------------|
| `⏎`    | Turns    | Your messages                                   |
| `↻`    | Steps    | Model calls                                     |
| `⚒`    | Tools    | Tool calls made by the model                    |
| `✦`    | Thoughts | Reasoning blocks                                |

A turn with two tool calls followed by a reply is three steps.

Screenshots are tmux captures rendered to PNG; glyph shapes depend on your
terminal font.

## Install

    opencode plugin add opencode-livetrace

Restart OpenCode to load it.

## Development

Build the bundle into `dist/`, which the package's `exports` point at:

    bun install
    bun run build

Then add the repo's absolute path to the `plugins` array in
`~/.config/opencode/opencode.json`, and rebuild after each change:

```json
{
  "plugins": ["/path/to/opencode-livetrace"]
}
```

Alternatively, OpenCode discovers directories (or symlinks to directories)
under `~/.config/opencode/plugins/` or `<project>/.opencode/plugins/` without
any config entry. Use one method, not both: the paths differ, so the plugin
would load twice.

`bun run lint` checks formatting (Prettier) and types (TypeScript), and
`bun run format` fixes formatting. `bun test` runs the unit tests in `tests/`,
which drive the phase and count trackers with a fake event bus and message
API. On every push to `main` and on PRs, CI runs two workflows: `lint`, and
`test`, which also checks that the build produces the `dist/` entry points.

## Releasing

Bump `version` in `package.json`, merge it to `main`, then publish a GitHub
release with a matching `v` tag, on GitHub or with:

    gh release create v0.1.2 --generate-notes

Publishing the release runs the `publish` workflow, which builds `dist/` and
publishes to npm through trusted publishing, so no npm token is stored in the
repo. It fails if the tag doesn't match the package version.

## How It Works

- `src/tui.tsx` appends the phase indicator to the `prompt.footer.status` slot
  (after the built-in status) and the counts to the `sidebar.content` slot.
- `src/server.ts` is a no-op server entry. Plugins listed in `opencode.json` are
  loaded by the server first, and one without a server entry never reaches
  the TUI.
- `src/phase.ts` tracks the live phase per session from step, text, reasoning,
  tool, retry, and execution events, timed from each event's `created`
  timestamp.
- `src/counts.ts` keeps the per-session counts. Full counts come from the
  message API (`type: "user"` and
  `type: "assistant"`, counting `tool` and `reasoning` content parts), paging
  through the full history, since the TUI's message store holds only the most
  recent messages.
- While a run streams, step, tool, and reasoning events bump the counts
  directly; a full recount (debounced) runs when a run starts or ends, and
  after reverts and compactions.
- OpenCode applies the Solid JSX transform only to plugin files outside
  `node_modules`, so an installed package must ship compiled JS. `build.ts`
  bundles `src/` with OpenTUI's Solid plugin, leaving `solid-js` and
  `@opentui/*` external so they resolve to OpenCode's own runtime.

Tested with OpenCode 2.2.6.
