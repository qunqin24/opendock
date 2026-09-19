# opencode-fork-lane — Copy-on-Write Git Worktrees + Session Fork for OpenCode

[![npm version](https://img.shields.io/npm/v/@bojackduy/opencode-fork-lane?style=flat-square)](https://www.npmjs.com/package/@bojackduy/opencode-fork-lane)
[![license](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue?style=flat-square)](LICENSE)

Fork the session. Keep the cache warm. **opencode-fork-lane** is an [OpenCode](https://opencode.ai) plugin that forks your session into a [lane](https://lane.lukeed.com/)-style **copy-on-write git worktree**: a new branch, a new folder, and every git-ignored path (`node_modules`, `target/`, `.env`) cloned **by reference** with reflink — so the new tree starts with warm caches instead of a reinstall and a cold build.

- **TUI:** `/fork-lane` (alias `/lane`, or `ctrl+f`) asks what to fork (full session or a specific prompt, like native fork), asks for a lane name, creates the worktree, forks the session with history, moves the fork into the new worktree, and navigates to it.
- **Agent:** the `fork_lane` tool (alias `lane`) lets the model isolate risky, experimental, or parallel work by itself — no human shell commands needed. Say "lane", "fork lane", "fork-lane", or "worktree" and the agent should call `fork_lane` (or its `lane` alias).

One lane name becomes the git branch, the worktree folder (`.lane/trees/<name>`), and the forked session title.

🌐 Landing page: [bojackduy.github.io/opencode-fork-lane](https://bojackduy.github.io/opencode-fork-lane/) · 📦 [npm](https://www.npmjs.com/package/@bojackduy/opencode-fork-lane) · 🐞 [Issues](https://github.com/bojackduy/opencode-fork-lane/issues) · 📝 [Changelog](CHANGELOG.md)

## Install

Install from npm (published as `@bojackduy/opencode-fork-lane`). The same package provides both the server plugin and the TUI plugin — opencode resolves the right entrypoint (`./server` / `./tui`) from the config file it appears in:

```jsonc
// opencode.jsonc
{
  "plugin": ["@bojackduy/opencode-fork-lane"]
}
```

```jsonc
// tui.json
{
  "plugin": ["@bojackduy/opencode-fork-lane"]
}
```

> To use a local clone instead (development):
>
> ```jsonc
> // opencode.jsonc
> { "plugin": ["/path/to/opencode-fork-lane/src/server.ts"] }
> // tui.json
> { "plugin": ["/path/to/opencode-fork-lane/src/tui.tsx"] }
> ```

Then quit and restart opencode (config is loaded once at startup).

Requires: git, bun >= 1.1, opencode >= 1. Optional but recommended: [`lane`](https://lane.lukeed.com/) binary (`curl -fsSL https://lane.lukeed.com | sh`) — when present the plugin delegates to `lane new` for full fidelity; otherwise it does git + reflink itself.

## Use

### TUI — `/fork-lane` (alias `/lane`)

1. Open a session in a git repo.
2. Run `/fork-lane` (or `/lane`, or `ctrl+f`).
3. Pick what to fork — **Full session** or a specific prompt (same choice native fork gives you).
4. Enter a lane name, e.g. `fix-login` or `feat/login` ("/" creates a namespaced branch/folder; session shows "feat — login").
5. You land in a forked session titled `fix-login`, rooted at `<gitRoot>/.lane/trees/fix-login` on branch `fix-login`, with history up to your fork point.

### Agent — `fork_lane` (alias `lane`)

```
fork_lane(name="fix-login", task="Make verify constant-time, keep signature")
# same thing:
lane(name="fix-login", task="Make verify constant-time, keep signature")
```

- `name` (required): branch + folder + session title (slugified, min 2 chars).
- `task` (optional): handoff line posted into the fork so the continuation has context.
- `base` (optional): git ref the lane branches from (defaults to current HEAD).
- `messageID` (optional): fork at a specific message instead of full history.
- `moveChanges` (default true): best-effort `move-session` carrying uncommitted changes into the lane.

Returns JSON: `{ ok, name, branch, directory, via, forkedSession, moved, moveDetail, next }`.

- `moved: true` — the fork now lives in the new worktree. Continue there.
- `moved: false` — the fork holds history but is still rooted at the old directory (older server / move failed). Do new edits with **absolute paths** under `directory`; a human can TUI → Move session → `directory`, or re-run `/fork-lane` (TUI moves correctly).

## How it works (lane-like)

| | `git worktree add` | `lane new` / `fork-lane` |
|---|---|---|
| tracked files | checked out | checked out |
| `node_modules`, `target/`, `.env` (any depth) | absent | **exists, by reference** |
| uncommitted work | absent | with `moveChanges` |
| OpenCode session | you're on your own | **forked with history, moved in** |
| agent self-isolation | no | **`fork_lane` tool** |
| cost | reinstall + cold build | ~0 B, warm cache |

- Worktree location follows lane: `<gitRoot>/.lane/trees/<name>`, branch `<name>` — so `lane ls`, `lane note`, and `lane merge` all work inside fork-lane trees.
- Reflink: APFS `cp -cR`, Linux `cp --reflink=always -a`, else plain copy fallback. `lane new` is preferred when the binary exists.
- Session: `session.fork` (history, optionally from a message) → `session.update` (title = name) → `experimental.controlPlane.moveSession` (directory = new worktree). The server tool falls back to raw `POST /experimental/control-plane/move-session` and degrades gracefully.

## FAQ

**Where do lanes live?**
Under `<gitRoot>/.lane/trees/<name>` on branch `<name>` — the same layout `lane` uses. Names may contain "/" (e.g. `feat/login`) — branch and folder keep the slash, session title shows " — ".

**Does it work without the lane binary?**
Yes. The plugin reimplements the copy-on-write step: worktree plus reflink cloning of every git-ignored path.

**What if moving the session fails?**
The fork keeps full history in the old directory and the worktree is still ready — the tool response tells the agent to use absolute paths under the new tree, and TUI users can Move session manually.

**Is lane's memory (`lane note` / `lane why`) supported?**
Out of scope for v0.1 — but the layout is compatible, so you can `lane note` inside the lane normally.

## Why not just `lane new` + `opencode`?

You can — and should, when you want a bare terminal lane. `fork-lane` is for when the **conversation** should move with the checkout: same history, new branch, warm cache, one command, plus an agent-callable equivalent so the model can isolate itself without asking you to run shell commands.

## Dev

```sh
bun install
bun run typecheck
bun test
bun run build
```

Releases are tag-gated: push `v*.*.*` and the [publish workflow](.github/workflows/npm-publish.yml) typechecks, tests, builds, publishes to npm with provenance, and cuts a GitHub release from the [changelog](CHANGELOG.md).

## License

[AGPL-3.0-or-later](LICENSE)
