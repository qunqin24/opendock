<h1 align="center">opencode-agent-radar</h1>

<p align="center">
  See what every OpenCode subagent is doing, how long it has been at it, and what it costs, without leaving the TUI.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-agent-radar"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-agent-radar?style=flat-square&logo=npm&color=cb3837"></a>
  <a href="https://www.npmjs.com/package/opencode-agent-radar"><img alt="npm downloads" src="https://img.shields.io/npm/dm/opencode-agent-radar?style=flat-square&label=downloads"></a>
  <a href="https://github.com/JSisques/agent-radar/releases/latest"><img alt="latest release" src="https://img.shields.io/github/v/release/JSisques/agent-radar?style=flat-square&logo=github&label=release"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/github/license/JSisques/agent-radar?style=flat-square"></a>
</p>

<p align="center">
  <a href="https://github.com/JSisques/agent-radar/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/JSisques/agent-radar/ci.yml?branch=main&style=flat-square&logo=githubactions&logoColor=white&label=ci"></a>
  <a href="https://github.com/JSisques/agent-radar/actions/workflows/publish.yml"><img alt="publish" src="https://img.shields.io/github/actions/workflow/status/JSisques/agent-radar/publish.yml?style=flat-square&logo=npm&label=publish"></a>
  <a href="https://www.conventionalcommits.org/"><img alt="Conventional Commits" src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-fe5196?style=flat-square&logo=conventionalcommits&logoColor=white"></a>
</p>

<p align="center">
  <a href="https://opencode.ai/"><img alt="OpenCode 2" src="https://img.shields.io/badge/OpenCode-2.x-5A67D8?style=flat-square"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white"></a>
  <a href="https://turbo.build/"><img alt="Turborepo" src="https://img.shields.io/badge/Turborepo-monorepo-ef4444?style=flat-square&logo=turborepo&logoColor=white"></a>
  <a href="https://github.com/JSisques/agent-radar/commits/main"><img alt="last commit" src="https://img.shields.io/github/last-commit/JSisques/agent-radar?style=flat-square"></a>
  <a href="https://github.com/JSisques/agent-radar/issues"><img alt="open issues" src="https://img.shields.io/github/issues/JSisques/agent-radar?style=flat-square"></a>
  <a href="https://github.com/JSisques/agent-radar/stargazers"><img alt="stars" src="https://img.shields.io/github/stars/JSisques/agent-radar?style=flat-square"></a>
</p>

<p align="center">
  <img alt="Agent Radar in the OpenCode TUI: the sidebar lists running subagents with their current tool and elapsed time; the detail dialog shows a session summary, subagents in progress and the history of finished ones, with model, context, tokens and cost" src=".github/assets/agent-radar-preview.png" width="720">
</p>

`opencode-agent-radar` is an OpenCode 2 TUI plugin. When an agent delegates work to subagents, it shows **one row per subagent launch**: the tool it is running right now, its elapsed time, context window usage, tokens and estimated cost.

> **Status:** early development (`0.x`). Used in OpenCode 2.4.1, typed against `@opencode/plugin` 2.4.2, with the domain rules covered by unit tests. See [Compatibility](#compatibility).

---

## Table of contents

- [Why](#why)
- [Features](#features)
- [What it looks like](#what-it-looks-like)
- [Installation](#installation)
- [Usage](#usage)
- [Metrics](#metrics)
- [Aggregation rules](#aggregation-rules)
- [Compatibility](#compatibility)
- [Limitations](#limitations)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Development](#development)
- [Testing](#testing)
- [Release process](#release-process)
- [Documentation site](#documentation-site)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why

When an OpenCode orchestrator launches three subagents in parallel, the TUI tells you that they were launched. It does not tell you:

- **what each one is doing right now** (which tool it is running),
- **how long** each one has been running,
- **how many tokens** each one has used,
- **how full** each one's context window is,
- **how much** each one is costing.

Existing usage plugins such as [`opencode-token-usage`](https://github.com/chenlongapps/opencode-token-usage) report totals for the whole session tree, and per-subagent numbers only when you navigate into that subagent's view. `opencode-agent-radar` answers a different question: **which subagent is doing what, side by side, right now**.

## Features

- **Per-launch rows.** Each subagent launch is its own row. Two `explore` runs are two rows, so you can compare them.
- **Live sidebar.** A compact, collapsible panel lists only the subagents that are running: `agent · tool · time`.
- **Full detail on demand.** Click the panel title or run `/agent-radar` to open a centered dialog with a session summary, the subagents **in progress** and the **history** of finished ones.
- **Model per subagent.** The detail dialog shows the model each subagent used, and every model it switched to.
- **Session summary.** Number of subagents, wall time vs agent time with the resulting parallelism, and total tokens and cost.
- **Nested subagents.** Subagents launched by subagents are hidden from the sidebar and shown, indented, in the detail dialog.
- **Correct totals.** Cost and tokens include everything a subagent delegated; time and context are never double-counted. See [Aggregation rules](#aggregation-rules).
- **Single package.** The domain logic is bundled into the plugin; there is nothing else to install.

## What it looks like

**Sidebar** (only running direct subagents):

```text
▼ Agent Radar (3)
explore · read · 1m 12s
explore · grep · 18s
worker · task · 3m 5s
```

`thinking` replaces the tool while the model is generating instead of running a tool. With no running subagents the panel shows `No subagents running`. Click `▼` to collapse the list to `▶ Agent Radar (3)`; the choice is remembered across restarts.

**Detail dialog** (`/agent-radar` or click the title):

```text
Agent Radar                                              esc

3 agents · 1 running · 2 done
wall 3m 47s · agent time 3m 47s (1.0×)
362.5K tok · $0.44

In progress (1)

worker (qwen3.8-27b) · task · Implement the login fix
3m 5s · ctx 61% · 310.2K tok · $0.40 (incl. 1 sub)
  explore (gpt-oss-20b) · done · Find callers of validateToken
  2m 0s · ctx 22% · 140.0K tok · $0.30

History (1)

explore (qwen3.8-27b → gpt-oss-20b) · done · Map the auth module
42s · ctx 18% · 52.3K tok · $0.04
```

The summary at the top covers every subagent of the session:

| Value | Meaning |
| --- | --- |
| `3 agents · 1 running · 2 done` | Subagent launches at any depth |
| `wall` | How long at least one subagent was running: the time you spent waiting |
| `agent time` | Sum of each subagent's own time: the amount of work, like person-hours |
| `(1.0×)` | Parallelism, `agent time ÷ wall`. `2.0×` means two subagents worked side by side on average |
| tokens · cost | Totals for every subagent, the main session excluded |

## Installation

Requires **OpenCode 2**.

### OpenCode CLI

```sh
opencode plugin add opencode-agent-radar@latest
```

Restart OpenCode after installing.

### `opencode.json`

Add the package to your project's `opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-agent-radar@latest"]
}
```

### From source

```sh
git clone https://github.com/JSisques/agent-radar.git
cd agent-radar
pnpm install
pnpm build
```

Then add the absolute path of `packages/opencode-plugin` to `plugins` in the target project's `opencode.json`.

## Usage

| Action | How |
| --- | --- |
| See running subagents | Open a session; the **Agent Radar** panel appears in the sidebar |
| Collapse or expand the panel | Click `▼` / `▶` next to the title |
| Open the detail dialog | Click the **Agent Radar** title, run `/agent-radar`, or pick **Agent radar** in the command palette |
| Scroll the detail dialog | Mouse wheel |
| Close the detail dialog | `esc`, or click `esc` in the dialog header |

Running `/agent-radar` outside a session shows a toast: `Open a session to see its subagents.` The command never sends a prompt to the model.

## Metrics

A **row** is one subagent launch, which means one child session. Every metric has a **scope**: *own* means that session only; *subtree* means that session plus every subagent it launched, at any depth.

| Metric | Scope | Definition | When unknown |
| --- | --- | --- | --- |
| Agent | own | The agent name of the session (`explore`, `worker`, …) | `agent` |
| Models | own | Model ids used by the session, in order of first use (`a → b` if it switched); the last one is the current model | hidden |
| Current tool | own | Last tool part in `running` or `streaming` state in the latest assistant message | `thinking` |
| Elapsed time | own | Running: now − created. Finished: idle time − created | — |
| Context % | own | Tokens of the latest model call ÷ the model's context limit | `—` |
| Tokens | subtree | Input + output + reasoning + cache read + cache write | `0` |
| Cost | subtree | USD cost reported by OpenCode for each session, summed | `—`, or `partial` when only some sessions are priced |

Formatting: durations `42s`, `1m 12s`, `1h 2m`; tokens `812`, `139.4K`, `3.70M`; cost `$0.40`, `<$0.001`, `$0.40 partial`.

The full specification lives in [`apps/docs/src/content/docs/specs/metrics.md`](apps/docs/src/content/docs/specs/metrics.md).

## Aggregation rules

The sidebar only shows direct subagents, so a nested subagent's spend has to be counted somewhere, but not every metric can be added up. Worked example:

- `worker` runs **10:00 → 10:05** and costs **$0.10**.
- At 10:01 it launches `explore`, which runs **10:01 → 10:03** and costs **$0.30**. The worker waits for it.

| Metric | `worker` row shows | Why |
| --- | --- | --- |
| Cost | **$0.40** (incl. 1 sub) | Both sessions spend money independently; the explore's $0.30 is extra money. Leaving it out would make it vanish from every view. |
| Tokens | worker + explore | Same reason as cost. |
| Elapsed time | **5m**, not 7m | The explore's 2 minutes happen *inside* the worker's 5 while it waits. Adding them counts the same interval twice. |
| Context % | worker's own | A context window belongs to one conversation; 60% + 40% is not 100% of anything. |
| Current tool | `task` | While waiting for its subagent, the worker *is* running the `task` tool. |

The detail dialog lists the nested `explore` with its own values, so every subtree total can be broken down. Decision record: [ADR-0003](apps/docs/src/content/docs/adr/0003-aggregation-rules.md).

The **session summary** applies the same logic. Both of its time values use direct subagents only, because a nested subagent's time already runs inside its parent's. If two subagents run in parallel from 10:00 to 10:04, the summary shows `wall 4m · agent time 8m (2.0×)`. Both numbers are correct, and their labels say which question each one answers. Decision record: [ADR-0006](apps/docs/src/content/docs/adr/0006-detail-summary-and-sections.md).

## Compatibility

| Component | Version |
| --- | --- |
| OpenCode | 2.x (typed against `@opencode/plugin` 2.4.2) |
| OpenTUI | `@opentui/core` / `@opentui/solid` ≥ 0.8 (peer, provided by OpenCode) |
| Solid | `solid-js` ≥ 1.9.12 (peer, provided by OpenCode) |

The plugin uses only documented TUI plugin APIs: the `sidebar.content` slot, `ui.dialog`, `keymap.layer` (slash command and palette entry), and the `data.session` store.

## Limitations

- **Cost is OpenCode's number.** The plugin shows the cost OpenCode reports per session. It does not keep its own price table, so models OpenCode cannot price show `—`. These are estimates, not provider bills.
- **Context % needs a known model limit.** If the session's model is not in the location's model list, context shows `—`.
- **Message history is loaded on demand.** The current tool and context % come from message history, which the plugin requests the first time it sees each session. They can appear a moment after the row.
- **Current tool reflects the latest assistant message.** If a model runs several tools in parallel, the last one that started is shown.
- **One-second resolution.** Elapsed time updates once per second.

## Architecture

The project uses ports and adapters. The aggregation rules do not know about OpenCode or the terminal.

```mermaid
flowchart TD
  host[OpenCode TUI host<br/>context.data] -->|sessions, messages, events| adapter
  subgraph plugin[packages/opencode-plugin]
    adapter[adapter.ts<br/>OpenCodeSessionSource]
    tui[tui.tsx<br/>sidebar slot · dialog · /agent-radar]
  end
  subgraph core[packages/core · private, bundled]
    port[ports.ts<br/>SessionSource]
    agg[aggregate.ts<br/>buildMonitor]
    fmt[format.ts]
  end
  adapter -. implements .-> port
  adapter -->|SessionSnapshot[]| agg
  agg -->|MonitorState live/history| tui
  fmt --> tui
```

1. The adapter turns every session of the current session's family into a `SessionSnapshot` holding **only that session's own values**.
2. `buildMonitor(rootId, snapshots, now)` builds the tree and applies the aggregation rules.
3. It returns `{ live, history }`: `live` feeds the sidebar, `history` feeds the detail dialog.
4. Any OpenCode event triggers a recomputation; a one-second ticker advances running timers.

More detail: [architecture overview](apps/docs/src/content/docs/architecture/overview.md).

## Repository layout

```text
agent-radar/
├── apps/
│   └── docs/                   Astro + Starlight site: guides, specs, architecture, ADRs
├── packages/
│   ├── core/                   @agent-radar/core (private): model, port, aggregation, formatting
│   │   └── src/
│   │       ├── model.ts        SessionSnapshot, AgentRow, MonitorState
│   │       ├── ports.ts        SessionSource port
│   │       ├── aggregate.ts    buildMonitor(): the aggregation rules
│   │       ├── format.ts       durations, tokens, cost, sidebar line
│   │       └── *.test.ts       node:test unit tests
│   └── opencode-plugin/        opencode-agent-radar (published)
│       ├── src/
│       │   ├── adapter.ts      OpenCode data store → SessionSnapshot
│       │   └── tui.tsx         sidebar slot, detail dialog, command
│       └── scripts/build.mjs   esbuild bundle + babel-preset-solid
├── .github/workflows/          ci, release-please, publish
├── turbo.json                  Turborepo task graph
├── pnpm-workspace.yaml
├── release-please-config.json
└── tsconfig.base.json
```

## Development

### Prerequisites

- **Node.js 24+.** Unit tests run TypeScript directly through Node's built-in type stripping.
- **pnpm 12.** `corepack enable` picks the version pinned in `packageManager`.

### Commands

Every root script goes through [Turborepo](https://turbo.build/), so unchanged packages are served from cache.

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspaces |
| `pnpm build` | Bundle the plugin (`packages/opencode-plugin/dist/tui.js`) and build the docs site |
| `pnpm typecheck` | Type-check every package |
| `pnpm test` | Run the unit tests |
| `pnpm check` | `typecheck` + `test` + `build`, as CI runs it |
| `pnpm docs:dev` | Start the docs site with hot reload |

### How the plugin is built

`packages/opencode-plugin/scripts/build.mjs`:

1. **esbuild** bundles `src/tui.tsx` together with `@agent-radar/core`, keeping JSX untouched (`jsx: "preserve"`).
2. **babel-preset-solid** compiles the JSX for OpenTUI's universal renderer (`generate: "universal"`, `moduleName: "@opentui/solid"`).
3. `@opencode/plugin`, `@opentui/*` and `solid-js` stay external because OpenCode provides them at runtime.

The result is a single `dist/tui.js`, exported as `opencode-agent-radar/tui`.

### Trying a local build in OpenCode

```sh
pnpm build
```

Add the absolute path of `packages/opencode-plugin` to `plugins` in a test project's `opencode.json`, restart OpenCode, and ask an agent to delegate something.

### Adding a metric

1. Specify it in [`specs/metrics.md`](apps/docs/src/content/docs/specs/metrics.md): scope (own or subtree), source, unknown value.
2. Add the field to `SessionSnapshot` in `packages/core/src/model.ts`.
3. Write a failing test in `packages/core/src/aggregate.test.ts`.
4. Implement it in `aggregate.ts`.
5. Fill it in `adapter.ts` and render it in `tui.tsx`.

## Testing

Unit tests live next to the code in `packages/core/src/*.test.ts` and run with `node:test`:

```sh
pnpm test
```

They pin every rule in [Aggregation rules](#aggregation-rules): one row per launch, in-progress vs history, nesting, subtree cost and tokens, `partial` costs, own elapsed time, own context and tool, ordering, and the session summary (counts, wall time as an interval union, agent time, parallelism), plus all formatting.

## Release process

Versioning is automated with [release-please](https://github.com/googleapis/release-please); the whole monorepo shares one version.

1. Squash-merge pull requests into `main` with a [Conventional Commits](https://www.conventionalcommits.org/) title (`feat:`, `fix:`, `docs:`, …). Merge commits repeat the PR title in their body, so release-please would list the change twice.
2. release-please opens or updates a release PR that bumps every `package.json` and updates `CHANGELOG.md`.
3. Merging that PR creates the `vX.Y.Z` tag and GitHub release.
4. The `publish` workflow runs `pnpm check`, packs `packages/opencode-plugin` and publishes it to npm through trusted publishing (OIDC). `@agent-radar/core` is private and never published.

The release manifest starts at `0.0.0`, so the first release is `0.1.0`. While the version is below `1.0.0`, `feat:` bumps the minor version and `fix:` the patch version.

### Repository setup

- Secret `RELEASE_PLEASE_TOKEN`: a personal access token allowed to open PRs and create releases. Releases created with the default `GITHUB_TOKEN` do not trigger other workflows, so `publish` would never run.
- Merge settings: allow squash merging only.

### First publish (one time)

npm configures trusted publishing per package, so the package has to exist before CI can publish it:

1. Merge the first release PR. The `publish` workflow for `v0.1.0` fails with `ENEEDAUTH`; that is expected.
2. Publish that tag by hand:

   ```sh
   git checkout v0.1.0
   pnpm install --frozen-lockfile
   pnpm check
   cd packages/opencode-plugin
   npm login
   pnpm pack
   npm publish opencode-agent-radar-0.1.0.tgz --access public
   ```

3. Trust the workflow (npm CLI 11.10+):

   ```sh
   npm trust github opencode-agent-radar --repo JSisques/agent-radar --file publish.yml --allow-publish
   ```

   `--allow-publish` is required: trusted publishers created after 3 September 2026 only allow `npm stage publish` by default, and the workflow runs `npm publish`. The first trusted publish must happen within 2 days of creating the configuration, or it expires.

4. Optional hardening: on npmjs.com, set **Publishing access** to *Require two-factor authentication and disallow tokens*.

From then on every release PR merge publishes automatically, with provenance.

## Documentation site

`apps/docs` is an [Astro Starlight](https://starlight.astro.build/) site:

| Section | Contents |
| --- | --- |
| Guides | Installation, usage, development |
| Specs | [Metrics](apps/docs/src/content/docs/specs/metrics.md), [UI](apps/docs/src/content/docs/specs/ui.md) |
| Architecture | [Overview](apps/docs/src/content/docs/architecture/overview.md) |
| Decisions (ADR) | [0001 monorepo](apps/docs/src/content/docs/adr/0001-monorepo-layout.md) · [0002 one row per launch](apps/docs/src/content/docs/adr/0002-one-row-per-launch.md) · [0003 aggregation rules](apps/docs/src/content/docs/adr/0003-aggregation-rules.md) · [0004 sidebar vs detail](apps/docs/src/content/docs/adr/0004-sidebar-live-detail-history.md) · [0005 bundle core](apps/docs/src/content/docs/adr/0005-bundle-core-into-plugin.md) · [0006 summary and sections](apps/docs/src/content/docs/adr/0006-detail-summary-and-sections.md) · [0007 rename](apps/docs/src/content/docs/adr/0007-rename-to-agent-radar.md) |

```sh
pnpm docs:dev
```

## Roadmap

- [ ] Verify inside a live OpenCode 2 host and record the tested versions.
- [ ] Narrow-sidebar handling: truncate long agent and tool names.
- [ ] Highlight subagents that are waiting for a permission or a form.
- [ ] Optional status of finished subagents (succeeded, failed, interrupted) in the detail dialog.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup, how to try a local build in OpenCode, and the conventions for specs, tests, commits and pull requests. In short:

- use Conventional Commits; PR titles become the squash commit,
- add or update a spec in `apps/docs` before changing behavior,
- add a test in `packages/core` for any aggregation change,
- run `pnpm check` before opening a PR.

## License

[MIT](LICENSE)

This is an independent community plugin. It is not built, maintained, or endorsed by the OpenCode team.
