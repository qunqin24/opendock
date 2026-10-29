# opencode-nexusnv-github-sidebar

[![CI](https://github.com/nexusnv/opencode-nexusnv-github-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/nexusnv/opencode-nexusnv-github-sidebar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-nexusnv-github-sidebar.svg)](https://www.npmjs.com/package/opencode-nexusnv-github-sidebar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A project-level GitHub workbench for OpenCode V2. It shows the current repository's open pull requests and issues in the sidebar, prioritizes the viewer's work, and turns a row into a worktree-backed OpenCode session with the GitHub context already attached.

![The GitHub sidebar in an OpenCode session: repository header, branch and counts, pull requests with CI and merge detail, and issues](https://raw.githubusercontent.com/nexusnv/opencode-nexusnv-github-sidebar/main/docs/sidebar.png)

> **Status: P1 workbench (v0.2).** Repository detection, auth, one GraphQL snapshot, normalization, caching, the sidebar, the worktree/session launch path, the full-list session panel, and durable section collapse are implemented. See [Current limitations](#current-limitations) for the remaining P1/P2 work, and [v0.2.0 readiness](./docs/v0.2.0-readiness.md) for the real-host verification and release checklist.

The verified design and OpenCode 2.1.4 API research live in [opencode-github-sidebar-plugin-research.md](https://github.com/nexusnv/opencode-nexusnv-github-sidebar/blob/main/opencode-github-sidebar-plugin-research.md).

## What it does

- Detects the GitHub repository on the **server** where the OpenCode project lives. A non-git directory, missing remote, or unsupported host renders a compact status instead of failing the sidebar.
- Shows a pinned current-branch PR, the viewer's open PRs and issues, and bounded/collapsible other rows so a large repository does not flood the sidebar.
- Opens a full-list **GitHub panel** (`ctrl+shift+g`) with every fetched row, mine/all filters, keyboard navigation, and the same launch path as the sidebar.
- Shows PR title, comment count, review count, CI status, merge status, draft state, and author.
- Shows issue title, comment count, labels, author, and assignee.
- Refreshes on a timer, on branch changes, after a root session goes idle, and when the refresh control is clicked.
- Serves stale data during a transient GitHub failure while the configured stale window allows it.
- Primary click: focus an existing linked root session; otherwise create or reuse a worktree, create a session there, inject the PR/issue context with `resume: false`, and focus the new tab.
- Secondary browser action: the `↗` control opens the canonical GitHub URL, using OSC 8 links over SSH when appropriate.
- Resolves auth from a plugin-owned `github-sidebar` integration, `GH_TOKEN`/`GITHUB_TOKEN`, or `gh auth token`; shows a `/connect` call to action when no token is available.
- Works against a local or remote OpenCode server. Credentials, git operations, and worktree creation stay on the server.

## Architecture

```
┌──────────────────────────────────┐        ┌──────────────────────────────────────┐
│ TUI plugin (client)              │        │ Server plugin (server/location)      │
│                                  │  RPC   │                                      │
│ sidebar.content                  │ ─────► │ repo detection (git)                 │
│  ├─ repo header                  │        │ auth resolution                      │
│  ├─ branch PR                    │        │ GraphQL client + cache               │
│  ├─ viewer / other PRs           │ ◄───── │ normalization + sanitization         │
│  ├─ viewer / other issues        │        │ full snapshot + bounded selection    │
│  └─ refresh / connect CTA        │        │ git fetch + worktree creation        │
│                                  │        │ launch context query                 │
│ session.panel                    │        │                                      │
│  └─ full rows + keymap commands  │        │                                      │
│ session create + synthetic       │        │                                      │
│ context + tab focus              │        │                                      │
└──────────────────────────────────┘        └──────────────────────────────────────┘
```

The split is deliberate:

- A TUI plugin runs on the **client** machine, but its `context.client` is a full client for the connected server. OpenCode 2.1.4 does **not** sandbox it: `client.credential.*`, `client.file.*`, `client.pty.*`, `client.shell.*`, `client.experimental.*`, `client.worktree.*`, and the `client.session` process methods (`shell`, `command`, `background`, `environment`) can reach server credentials, files, commands, and worktrees. This plugin therefore keeps that work in the server half and treats TUI code as trusted; the TUI must never call those APIs.
- A server plugin can detect the repository, resolve the token, call GitHub, and run `git fetch` / `worktree.create` where the project actually lives.
- The TUI still owns session creation, synthetic context admission, and tab focus because it has the current model/agent selection and the tab UI.

The RPC is **location-scoped**. Every call passes `{ location: requireRpcLocation(context) }`, which reduces the runtime location to the wire shape `{ directory }` and reaches the plugin instance for that project directory. When a call is attempted without a location, the helper throws `MissingLocationError` instead of silently targeting the server's default location. The sidebar never attempts an RPC without a location.

### RPC surface

| Method          | Purpose                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `health`        | Liveness/location gate. The sidebar only renders data after this passes.                              |
| `summary`       | One normalized snapshot plus the server-owned effective view; `full: true` returns every fetched row. |
| `prepareLaunch` | `git fetch`, worktree reuse/creation, branch setup, and launch context.                               |

`prepareLaunch` returns a discriminated envelope (`ok`, `code`, `message`, and on success the authoritative branch, base, worktree, directory, and context). Expected launch failures are typed results, not RPC transport errors, so the TUI can show a useful message without retrying.

### Launch flow

1. The TUI looks for a root session whose `metadata.githubSidebar` matches the repo host, repository, kind, and number. If one exists, it focuses that session and stops.
2. Otherwise it calls `prepareLaunch({ kind, number })`. The server re-queries the item so the worktree data comes from GitHub, not from a stale row.
3. The server fetches the PR head (`refs/pull/<n>/head`) or the default branch, creates or reuses the worktree, creates the local branch, and computes the session directory (including a monorepo subpath).
4. The TUI creates the session in the returned `sessionDirectory`, injects the delimited context as a synthetic message with `resume: false`, and focuses the tab (or navigates through the router when tabs are disabled).
5. Worktree reuse is recorded in server storage per project, repository, and item.

With `actions.enabled: false` the sidebar is a true read-only dashboard: a primary click opens the item in the browser and never looks up sessions, opens a dialog, calls `prepareLaunch`, or creates a session. `actions.worktree` is the master gate for worktree creation; `actions.issueWorktree` can only narrow it for issues.

## Requirements

- OpenCode `v2.1.4` or newer with the Bun runtime. The P0 flow is verified end-to-end on `v2.2.0`; the package types are pinned to `2.1.4`.
- Bun `1.4.x` for development.
- `git` on the server host.
- A GitHub token through one of:
  - the plugin-owned `github-sidebar` integration (recommended),
  - `GH_TOKEN` / `GITHUB_TOKEN` on the server,
  - `gh auth token --hostname <host>`.

## Install

Install the package into OpenCode's plugin cache and register it in the global configuration:

```sh
opencode plugin add opencode-nexusnv-github-sidebar
```

You can also add it to a project `opencode.json(c)` and let OpenCode install it on startup:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-nexusnv-github-sidebar",
    },
  ],
}
```

The server half loads from `opencode.json(c)`; the TUI half is auto-loaded from the server inventory. Add a `cli.json` entry only when you need client-local options such as `openLinks`:

```json
{
  "plugins": [
    {
      "package": "opencode-nexusnv-github-sidebar",
      "options": {
        "openLinks": "auto"
      }
    }
  ]
}
```

Restart OpenCode after installing or changing server options. If the host never supplies a location, the sidebar stays blank and no RPC is attempted.

### From a local checkout

During development you can point at an absolute directory instead of the registry. Directory targets probe `<dir>/server` first, then `<dir>/index`, followed by `<dir>/tui` and `<dir>/rpc`, so this repository keeps thin root shims with those names.

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-nexusnv-github-sidebar",
    },
  ],
}
```

Use the same path in the optional `cli.json` entry when you need `openLinks`. Restart OpenCode after changing server code.

## Configuration

Server-side data, display, and action options belong in `opencode.json(c)`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-nexusnv-github-sidebar",
      "options": {
        "hosts": ["github.com"],
        "scope": "auto",
        "pulls": { "limit": 8 },
        "issues": { "limit": 5, "labels": 1 },
        "actions": { "enabled": true, "worktree": true, "confirm": false },
      },
    },
  ],
}
```

Only client-local options belong in `cli.json`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-nexusnv-github-sidebar",
      "options": {
        "openLinks": "auto",
      },
    },
  ],
}
```

`cli.json` is global-only. Server options never reach the TUI half; the RPC returns the effective view so the TUI does not duplicate defaults.

### Server options

| Option                    | Default                          | Meaning                                                              |
| ------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `enabled`                 | `true`                           | Disable the plugin without removing it.                              |
| `hosts`                   | `["github.com"]`                 | Exact GitHub hosts allowed to receive a token.                       |
| `remote`                  | `"origin"`                       | Preferred git remote; falls back to `origin` then the first remote.  |
| `branchPr`                | `true`                           | Pin the open PR for the current branch.                              |
| `scope`                   | `"auto"`                         | `auto`, `mine`, or `all` row selection.                              |
| `autoAllThreshold`        | `30`                             | Above this many open items, `auto` limits rows to the viewer's work. |
| `mine.issues`             | `"either"`                       | `assignee`, `author`, or `either` for issue ownership.               |
| `fetchLimit`              | `50`                             | PR/issue nodes fetched per snapshot; also the panel's maximum rows.  |
| `pulls.enabled`           | `true`                           | Show the pull-request section.                                       |
| `pulls.limit`             | `8`                              | Maximum pull rows after selection.                                   |
| `issues.enabled`          | `true`                           | Show the issue section.                                              |
| `issues.limit`            | `5`                              | Maximum issue rows after selection.                                  |
| `issues.labels`           | `1`                              | Labels shown per issue (`0` hides them).                             |
| `actions.enabled`         | `true`                           | `false` makes the sidebar read-only (browser only).                  |
| `actions.confirm`         | `false`                          | Ask before creating a session/worktree.                              |
| `actions.worktree`        | `true`                           | Master gate for worktree creation.                                   |
| `actions.issueWorktree`   | `true`                           | Narrows worktree creation for issues.                                |
| `actions.branchPrefix`    | `{ pr: "pr-", issue: "issue-" }` | Local branch prefixes.                                               |
| `actions.context`         | `"full"`                         | Synthetic context: `full`, `summary`, or `none`.                     |
| `actions.bodyLimitBytes`  | `8192`                           | Maximum PR/issue body bytes injected into context.                   |
| `actions.fetchTimeoutMs`  | `60000`                          | Git fetch timeout.                                                   |
| `actions.reuseWorktree`   | `true`                           | Reuse a previously recorded worktree for the same item.              |
| `actions.focusTabs`       | `true`                           | Focus the created session tab; otherwise leave the current view.     |
| `refreshSeconds`          | `60`                             | Sidebar polling interval (minimum 15).                               |
| `staleSeconds`            | `300`                            | How long stale data may be served after a failed refresh.            |
| `timeoutMs`               | `10000`                          | GitHub GraphQL timeout.                                              |
| `token`                   | unset                            | Explicit token for CI/testing; normally use the integration or env.  |
| `tokenEnv`                | `["GH_TOKEN", "GITHUB_TOKEN"]`   | Environment names checked by the integration.                        |
| `allowGhCli`              | `true`                           | Fall back to `gh auth token` on the server.                          |
| `apiUrl`                  | unset                            | Explicit HTTPS endpoint for GitHub Enterprise Server.                |
| `display.header`          | `true`                           | Show the repository header.                                          |
| `display.totals`          | `true`                           | Show counts in the header and section titles.                        |
| `display.order`           | `["pulls", "issues"]`            | Section order.                                                       |
| `display.collapsed`       | `[]`                             | Sections collapsed on first run; later choices live in TUI storage.  |
| `display.glyphs`          | `"unicode"`                      | `unicode` or ASCII-safe `ascii`.                                     |
| `display.showUnavailable` | `false`                          | Show the reason when the repository cannot be used.                  |
| `debug`                   | `false`                          | Verbose diagnostics without tokens or private titles.                |

### Client option

`openLinks`: `auto` (OSC 8 over SSH, platform opener otherwise), `browser` (always spawn), or `osc8` (always let the terminal handle the link).

## Session panel

![The full-list GitHub panel: repository header with mine/all filters, pull requests with CI and merge detail, issues, and the keyboard help line](https://raw.githubusercontent.com/nexusnv/opencode-nexusnv-github-sidebar/main/docs/panel.png)

`ctrl+shift+g` (or the `▤` control in the sidebar header) opens the full-list panel for the current session. The panel shows every row fetched under `fetchLimit`, not just the sidebar's `pulls.limit` / `issues.limit`.

| Key     | Action                                                             |
| ------- | ------------------------------------------------------------------ |
| `j`/`↓` | Select the next row.                                               |
| `k`/`↑` | Select the previous row.                                           |
| `enter` | Launch the selected PR/issue (or open the browser when read-only). |
| `o`     | Open the selected item on GitHub.                                  |
| `r`     | Refresh the snapshot.                                              |
| `m`     | Show only the viewer's items (plus the current-branch PR).         |
| `a`     | Show every fetched item.                                           |
| `f`     | Toggle docked/fullscreen presentation.                             |
| `esc`   | Close the panel.                                                   |

The panel reuses the cached snapshot; opening it does not make a second GraphQL request. Section headers keep the true repository totals, and a `showing N of TOTAL` line appears when the fetched rows do not cover the whole repository. `ctrl+shift+g` toggles the panel from the current session and explains when no session panel is available.

## Sidebar behavior

- **Markers:** `◆` current-branch PR, `●` linked root session, `+` unlinked. Markers are hidden in read-only mode.
- **Rows:** title and canonical URL are sanitized on the server and again validated before opening in the TUI.
- **Sections:** click a section title to collapse or expand it; the choice is stored in TUI storage and survives restarts. `display.collapsed` only seeds the first run.
- **States:** loading, ready, stale, disabled, no git, no remote, unsupported host, no auth, unauthorized, not found, rate limited, network, and generic error.
- **Auth:** the status line explains `/connect`; the token itself never crosses the RPC.
- **Child sessions:** the sidebar renders nothing and performs no fetch.

## Security

- **Trust boundary:** OpenCode 2.1.4 does not isolate TUI plugins from server APIs. `context.client` can read stored credential secrets (`credential.list`), read/write server files, create PTYs, run shells, execute session process commands, and create worktrees. The plugin never calls those APIs from the TUI; allowed client surfaces are `session.create`, `session.synthetic`, `session.list`, `session.get`, `integration.list/connect`, `location.get`, `rpc`, `data`, `ui`, `storage`, `keymap`, `theme`, and `attention`. The `session` process methods (`shell`, `command`, `background`, `environment`) remain forbidden. Treat the TUI half as trusted code. A test (`test/tui-boundary.test.ts`) fails if forbidden client APIs appear in TUI sources; it is a line-oriented tripwire, so aliases and computed access still require review.
- The plugin keeps tokens on the server. Its RPC never returns them, and they are never written to TUI storage, logged, or passed to git. This is a plugin policy, not a host sandbox.
- Git subprocesses receive an explicit environment allowlist (`PATH`, `HOME`, locale, temp, SSH agent, and platform basics). `GH_TOKEN`, `GITHUB_TOKEN`, askpass helpers, and unrelated secrets are stripped; `GIT_TERMINAL_PROMPT=0` is forced. `HOME`, `PATH`, and `SSH_AUTH_SOCK` are deliberately retained so git can use the server's existing credential helper or SSH agent.
- The GitHub host is allowlisted before any token use. API URLs are HTTPS-only and redirects are rejected.
- PR/issue bodies are untrusted. They are stripped of terminal escapes and HTML comments, size-limited, wrapped in delimiters with an explicit "background only" warning, and injected with `resume: false`. The plugin never auto-sends a prompt or runs untrusted code.
- Titles, bodies, labels, and URLs are sanitized before rendering. The TUI revalidates every RPC payload and every external URL.
- Debug logs redact headers, tokens, and private titles.

See §18.1 of the research report for the full checklist.

## Development

```sh
bun install
bun run check
```

| Script                 | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `bun run typecheck`    | Strict TypeScript check with `tsc --noEmit`                            |
| `bun run lint`         | `oxlint` over `src`, `test`, and `scripts`                             |
| `bun run lint:fix`     | Apply safe lint fixes                                                  |
| `bun run format`       | Format with Prettier                                                   |
| `bun run format:check` | Verify formatting without writing                                      |
| `bun test`             | Run the Bun test suite                                                 |
| `bun run test:watch`   | Run tests in watch mode                                                |
| `bun run check`        | Format check, lint, typecheck, and tests                               |
| `bun run audit`        | Fail on high/critical dependency advisories                            |
| `bun run pack:check`   | Pack the package and assert every export and directory shim is present |
| `bun run smoke:live`   | Opt-in real GitHub GraphQL smoke test (see below)                      |

The toolchain is intentionally Bun-first because the OpenCode V2 plugin host runs on Bun and compiles TSX at runtime. Node packaging/build output will be added when the plugin is ready to publish.

`bun test` is hermetic. It loads the server, TUI, and RPC entrypoints through `@opencode/plugin/host`, exercises repository detection and git worktree flows in temporary repositories, validates normalization/sanitization/cache/auth precedence, and renders the sidebar with `testRender`, including clicks, state transitions, and the launch handoff.

### Live smoke test

The real GraphQL query is validated against GitHub only when explicitly requested:

```sh
GITHUB_SIDEBAR_LIVE=1 bun run smoke:live
```

It uses the server's normal auth resolution (`gh auth token` on a developer machine), runs the checked-in `SIDEBAR_QUERY`, normalizes the response, and fails if the token appears in the normalized output. It is not part of `bun test` or CI.

### Test harness notes

The test preload (`test/preload.ts`, wired through `bunfig.toml`) registers `@opentui/solid`'s Bun plugin, the same Solid transform and client-runtime substitution the OpenCode host applies to TUI plugins. Keep it: without the transform, JSX props are evaluated once and `createEffect` is a no-op, so reactive render tests would be meaningless.

`solid-js` stays pinned to `1.9.15` to match the OpenCode `2.1.4` host. The `seroval` and `seroval-plugins` overrides keep Solid's dev/test copy on patched builds without changing the Solid runtime; both advisories are high/critical and fixed in `1.6.3`. Re-evaluate the override when the host upgrades Solid.

## Project layout

```
.
├── index.ts                 # local-directory server entry
├── tui.tsx                  # local-directory TUI entry
├── rpc.ts                   # local-directory RPC entry
├── src/
│   ├── index.ts             # server plugin setup + RPC registration
│   ├── tui.tsx              # TUI plugin setup + sidebar/panel/app slots
│   ├── rpc.ts               # location-scoped JSON Schema contract
│   ├── config.ts            # option parsing, defaults, effective view
│   ├── server/
│   │   ├── repo.ts          # checkout detection + remote parsing
│   │   ├── auth.ts          # integration/env/gh precedence + cache
│   │   ├── github.ts        # GraphQL transport and error classification
│   │   ├── query.ts         # sidebar and launch-context queries
│   │   ├── normalize.ts     # untrusted response -> normalized rows
│   │   ├── cache.ts         # TTL, stale window, in-flight dedupe
│   │   ├── context.ts       # delimited synthetic context
│   │   ├── launch.ts        # fetch/worktree/branch/storage
│   │   └── service.ts       # summary + launch orchestration
│   ├── shared/
│   │   ├── contract.ts      # runtime input/output validation
│   │   ├── types.ts         # shared wire types
│   │   ├── status.ts        # CI/merge mapping
│   │   ├── remote.ts        # remote URL + endpoint parsing
│   │   ├── git.ts           # sanitized git environment + execFile
│   │   ├── ids.ts           # plugin/RPC identifiers
│   │   └── location.ts      # required-location guard
│   └── tui/
│       ├── state.tsx        # health gate, polling, events, markers
│       ├── sidebar.tsx      # header, sections, rows, states
│       ├── panel.tsx        # full-list session panel + keymap commands
│       ├── status-line.tsx  # shared auth/network/rate-limit line
│       ├── row.tsx          # row and browser controls
│       ├── launch.ts        # linked-session lookup + launch sequence
│       ├── format.ts        # glyphs, markers, labels
│       └── open.ts          # safe HTTPS/OSC 8/browser opening
├── test/                    # hermetic Bun tests, including testRender
├── scripts/                 # audit, pack, live smoke
└── .github/workflows/       # CI, secret scanning, audit, pack gate
```

## Current limitations

P1 deliberately stops here:

- The panel shows at most `fetchLimit` rows per section and has no search, cursor pagination, or review-requested filter.
- No OAuth device flow, no persistent server cache.
- No interactive PR writes, review submission, or merge actions.
- No session-PR adoption, PR selection from existing sessions, or multiple linked sessions per item (the newest root session wins).
- No GitLab or Bitbucket support.
- No composer prefill: the plugin API cannot set the draft prompt, so context arrives as a synthetic message.
- Worktree reuse state is stored on the server that created it and is not synchronized across servers.
- A reconnect to a different server or workspace that reuses the same directory cannot be distinguished by the current RPC identity.

## Research

The design document records the verified OpenCode 2.1.4 plugin/TUI/RPC APIs, the GitHub GraphQL queries, prior art, auth options, launch semantics, UX constraints, configuration split, test plan, and risks. Implementation-discovered corrections (the issue launch query uses `issueOrPullRequest`, not `Issue.pullRequest`) are recorded there.

## License

MIT. See [LICENSE](./LICENSE).
