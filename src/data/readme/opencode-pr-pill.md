# PR Pill — pull request sidebar for OpenCode Desktop

[![npm](https://img.shields.io/npm/v/opencode-pr-pill.svg)](https://www.npmjs.com/package/opencode-pr-pill)
[![CI](https://github.com/dondonudon/opencode-pr-pill/actions/workflows/ci.yml/badge.svg)](https://github.com/dondonudon/opencode-pr-pill/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/opencode-pr-pill.svg)](LICENSE)

A local OpenCode plugin that puts the pull request for your **current session's branch** in a
sidebar panel, with CI status, review state, merge conflicts and unresolved review threads. You can
also **watch any pull request** from any session, including PRs in other repositories.

It is deliberately small: three JavaScript files, one JSON-RPC contract, one Solid component, and a
prebuilt GUI bundle. No server, no database, no tokens — it shells out to `git` and the GitHub CLI.

```
┌──────────────────────────────────┐
│ acme/platform-api          +  ⭮  │
│ feat/checkout-retry · 1 watched  │
├──────────────────────────────────┤
│ ● #1824  Retry checkout on 5xx   │
│          CI passing · approved   │
│ ● #1799  Bump stripe SDK  WATCHED│
│          other/repo · 2 running  │
└──────────────────────────────────┘
```

## What it does

- **Session-scoped by default.** The panel shows the open PR whose head is the branch checked out in
  the session's directory. A session on `main` shows nothing (unless you watch something), so the
  panel stays out of the way.
- **Watched PRs.** Add any PR by URL and it is pinned to *that session*, surviving restarts. Watches
  are stored per session, so two sessions can watch different PRs.
- **Status at a glance.** One dot per PR: red for failing checks, changes requested or conflicts;
  amber for pending checks or unresolved threads; green for passing CI; grey for no checks.
- **Work a PR from the panel.** Each PR row has a **Monitor** button that asks the current session to
  work that PR to ready — using `pr_monitor` when the optional companion plugin is installed, and a
  normal agent task otherwise.
- **One click to GitHub.** Clicking a row opens the PR in your browser.
- **No panel when there is no PR.** The sidebar tab and the titlebar chip only register when the
  session actually has a branch PR or a watched PR.

## Requirements

| Requirement | Notes |
| --- | --- |
| OpenCode **Desktop** | The plugin uses the Desktop GUI plugin API (`@opencode/plugin/gui`, `gui-experimental` bundles). The TUI does not render it. |
| `@opencode/plugin` **2.2.x** | The `gui-experimental` bundle and RPC contract target this API. |
| `git` | Used to read the session branch. |
| [`gh`](https://cli.github.com) | Authenticated (`gh auth login`). Used for every GitHub query, including cross-repo watches. |
| [`@sesori/pr-monitor-opencode`](https://github.com/sesori-ai/pr-monitor-plugin) | **Optional.** Adds persistent PR monitoring and the `pr_monitor` tool that the **Monitor** button prefers. Without it, **Monitor** still works by handing the PR to the session as a normal task. |

`gh` must be able to see the repositories you care about. Private repos work if your `gh` token can
read them.

## Install

The published package ships the prebuilt GUI bundle, so there is no build step.

### From npm (recommended)

Add the package to the `plugins` array in `~/.config/opencode/opencode.jsonc` (global config):

```jsonc
{
  "plugins": [
    // ...your other plugins
    { "package": "opencode-pr-pill" }
  ]
}
```

OpenCode installs the package on startup. Then quit OpenCode Desktop completely (`Cmd+Q`) and reopen
so the main process loads the GUI bundle.

### From a local copy or tarball

If you prefer to keep the source on disk, unpack it under `~/.config/opencode/local-plugins/pr-pill`
and point the config at the path:

```jsonc
{
  "plugins": [
    { "package": "./local-plugins/pr-pill", "options": {} }
  ]
}
```

A local path is resolved relative to the config directory. The plugin id stays `pr-pill` regardless
of the directory name. Only `@opencode/plugin` is needed at runtime; `solid-js`, `vite` and
`vite-plugin-solid` are build-time, and the bundled `gui-experimental.cjs` means you do not need
them unless you change `gui.tsx`.

### Compatibility

| OpenCode Desktop | `@opencode/plugin` | Status |
| --- | --- | --- |
| 2.2.5 | 2.2.5 | Tested — panel, titlebar chip, watches and Monitor all verified on macOS |

The GUI API is experimental in the 2.2.x line, so pin the app version if the panel stops loading
after an OpenCode upgrade.

## Usage

### Open the panel

- Click the **PR chip** in the titlebar, or
- `Cmd+K` → **Pull requests**, or
- click the sidebar tab directly.

The tab is labelled with the first PR (`#1824`, or `#1824 +1` when there are several).

### Watch a pull request

Either:

- click **`+`** in the panel header, or
- `Cmd+K` → **Watch a pull request**

then paste one of:

```
https://github.com/owner/repo/pull/123
owner/repo#123
#123                 ← uses the session's repository
```

Watched PRs get a `WATCHED` tag and an **×** to stop watching. If a watched PR comes from another
repository, the row shows `owner/repo · <status>`.

If a watch cannot be resolved (deleted PR, no access, typo), the panel shows a red
**Could not load** row with an **×** so you can remove it instead of leaving it stuck.

### Start working a PR from the panel

Each PR row has a **Monitor** button. It asks the current session to work that PR to ready. The
request is **queued**, so it runs after the session's current turn instead of interrupting it.

What happens next depends on what the session has installed:

- With [`@sesori/pr-monitor-opencode`](https://github.com/sesori-ai/pr-monitor-plugin), the session
  starts `pr_monitor` and keeps working until the PR is ready — including polling, review-thread
  replies and readiness checks.
- Without it, the session treats the request as a normal task: check CI, fix failing checks, resolve
  review threads, push, and report what remains. Nothing fails; the button is not a dead end.

Use this after an OpenCode restart or plugin reload, when an in-memory monitor has stopped.

### Watching is not monitoring

The sidebar is a **read-only status view**. Adding a PR with `+` only stores it for display; it does
not start an agent, a PR monitor, or any auto-fix work. The **Monitor** button is the explicit
hand-off: it sends a queued message to the current session asking it to work the PR.

Persistent auto-fix is provided by the optional
[`@sesori/pr-monitor-opencode`](https://github.com/sesori-ai/pr-monitor-plugin). That plugin runs a
monitor only while one is active in the session, started with the `pr_monitor` tool (or the
`monitor-pr` skill). Monitors **do not survive an OpenCode restart or a plugin reload** — after
either, re-start the monitor in the session:

```
pr_monitor(action: "start", pr: "owner/repo#123")
```

Watching and monitoring are independent: the watch list is stored per session and survives restarts;
the monitor lives in the service's memory and does not.

### Refresh behaviour

- Opening a session shows the last known snapshot for that session **immediately**, then refreshes in
  the background. Switching sessions never blanks the panel.
- The first fetch waits for the session's watch list to finish loading, so a watched PR is never
  dropped from a status fetch that started too early.
- Results are cached per session for **60 seconds**, and the cache is keyed by the watch list: adding
  or removing a watch forces a fetch even inside the TTL.
- A background timer refreshes the **current** session once a minute; inactive sessions keep their
  cached snapshot.
- The server also memoizes recent `gh` reads for **20 seconds**, so a rapid switch back to a session
  usually returns in tens of milliseconds instead of seconds.
- **Refresh** forces an immediate re-fetch. Adding a watch shows its row at once with a
  `Loading…` title while the first fetch runs.

## Architecture

```
gui.tsx ──renders──> Panel / Command / TitlebarItem
   │
   │  ctx.client.rpc(PrPill).status({ directory, watch })
   ▼
server.js ──> status.js ──spawns──> git rev-parse
   ▲                   └──spawns──> gh pr list / gh pr view / gh api graphql
   │
rpc.js  (shared JSON-schema contract, bundled into both sides)
```

| File | Role |
| --- | --- |
| `rpc.js` | Contract for the `pr-pill.status` method: input `{ directory, scope?, watch? }`, output `{ repo, branch, scope, prs, missing }`. |
| `server.js` | Node-side plugin. Registers the RPC method and passes requests to `status.js`. |
| `status.js` | All `git`/`gh` logic: resolve the branch and repo from the git remote, list branch PRs, fetch watched PRs by URL, summarize CI and review state. Recent `gh` reads are memoized for 20 seconds. |
| `gui.tsx` | Desktop GUI: sidebar panel, titlebar chip, command palette entries, watch prompt, per-session cache. |
| `gui-experimental.cjs` | Vite build of `gui.tsx`, loaded by the Desktop app. |
| `vite.config.ts` | Build config using `@opencode/plugin/gui/vite`. |

### Scope

The RPC accepts `scope: "branch" | "repo"`:

- `"branch"` (default, and what the UI uses) — open PRs whose head matches the checked-out branch.
- `"repo"` — if the branch has no PR, fall back to open PRs authored by you. Exposed over RPC only;
  there is no UI switch.

### Watching

Watches live in a per-session store:

```ts
stores: { watch: Store.session(Schema.Struct({ targets: Schema.Array(Schema.String) }), { targets: [] }) }
```

`Store.session` keys the value by session, so it persists across restarts and does not leak between
sessions. Targets are canonical URLs. Missing targets are returned separately so a bad watch never
hides a good one.

### Why shell out to `gh`?

`gh` already owns authentication, SSO and pagination, and it works outside a git repository
(`gh pr view <url>`), which is what makes cross-repo watches cheap. The trade-off is latency — hence
the 60-second cache.

## Build

Only needed if you change `gui.tsx`:

```bash
cd ~/.config/opencode/local-plugins/pr-pill
bun install
bunx vite build
```

This rewrites `gui-experimental.cjs`. The bundle must keep these modules **external** — the Desktop
app provides its own instances:

```
effect
@opencode/plugin/gui
@opencode/plugin/gui/main
@opencode/plugin/rpc
@opencode/schema/rpc
@opencode/client
@opencode/client/effect
solid-js
solid-js/web
solid-js/store
```

Bundling a copy of Effect or Solid causes subtle breakage (two runtimes, broken reactivity), so do
not add them to `dependencies` for the GUI side.

Verify the bundle's externals:

```bash
grep -o 'require("[^"]*")' gui-experimental.cjs | sort -u
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Panel never appears | Confirm you are on **OpenCode Desktop**, not the TUI. Check `opencode.jsonc` has the plugin entry. Fully quit and reopen. |
| Panel appears but is empty | Run `gh auth status` and `gh pr list --head "$(git branch --show-current)"` in the session directory. |
| No PR shown on `main` | Expected: branch scope. Use `+` to watch a PR, or open the session in the PR's branch/worktree. |
| `Could not load` on a watch | Run `gh pr view <url>` manually. Usually auth, SSO or a deleted PR. |
| Stale status | Press **Refresh**, or wait for the 60-second timer. |
| Build fails with a module error | A module the app provides got bundled. Keep the externals list above intact. |
| Changes not visible after restart | The app caches GUI revisions; quit fully rather than reloading the window. |

Useful checks:

```bash
# what the server thinks
gh pr list --head "$(git -C /path/to/repo branch --show-current)" \
  --state open --json number,title,statusCheckRollup,reviewDecision,mergeable

# what the plugin can see
gh pr view https://github.com/owner/repo/pull/123 --json number,title,state
```

## Development

```bash
bun install
bun run test     # node --test test/*.test.js
bun run build    # rewrites gui-experimental.cjs
```

`prepublishOnly` runs the build, so a publish always ships a bundle that matches `gui.tsx`.

### Release checklist

1. `bun run test && bun run build`
2. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
3. `npm pack --dry-run` — confirm `gui-experimental.cjs`, `server.js`, `status.js`, `rpc.js`,
   `README.md`, `LICENSE` and `CHANGELOG.md` are in the tarball.
4. Commit, then `git tag vX.Y.Z && git push origin main --tags`. The `publish` workflow publishes to
   npm with Trusted Publishing (OIDC) and attaches a provenance statement — no `NPM_TOKEN` secret.
5. Create a GitHub release from the tag.

Trusted Publishing is configured once per package on npmjs.com under **Package settings → Publishing
access → Trusted publisher** (owner `dondonudon`, repository `opencode-pr-pill`, workflow
`publish.yml`). Until it is registered, publish the first release manually with `npm publish`.

Commit `gui-experimental.cjs` so cloning and installing from Git works without a build step.

### What not to commit

- No tokens or API keys are read by this plugin; it relies on your own `gh` auth.
- Keep machine-specific absolute paths out of docs and config snippets.
- Do not commit an `opencode.jsonc` containing provider credentials — share only the `plugins`
  fragment.

## Optional companion settings

These are not part of the plugin, but they are what makes the dashboard pleasant.

**Free local-model token accounting.** If you route a provider through a gateway that should not
count toward spend, zero it out in `~/.config/opencode/token-tracker.json`:

```json
{
  "providers": {
    "your-provider": { "input": 0, "output": 0 },
    "unknown": { "input": 0, "output": 0 }
  }
}
```

This only affects the token tracker's cost display; it does not change billing.

**Auto-resume and PR monitoring** are separate plugins. The sidebar works fine without them.

## License

MIT — do whatever you like. Attribution is nice but not required.
