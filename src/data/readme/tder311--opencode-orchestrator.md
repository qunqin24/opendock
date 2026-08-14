# opencode-orchestrator

An opencode plugin for parallel multitasking: spawn agents that each get their own **git worktree** and a **cmux tab** (a tab in your current pane — *not* a new cmux workspace), running a full interactive opencode TUI. Spawn several, keep working in your own tab, and supervise them from your session.

```
you:  "spawn an agent in monodo to add battery constraints to the NEM"
        │
        ├─ git worktree add ~/worktrees/monodo/feat-nem-battery (new branch)
        ├─ cmux tab opens in your pane (background — your focus is untouched)
        ├─ opencode boots in the worktree, receives the task
        └─ agent works autonomously…

agent:  calls reportstatus → cmux notification + unread marker on its tab
you:  "check the agents"  → listagents shows done/blocked/question reports
you:  "review its diff"   → the worktree is a plain directory, diff it directly
you:  "close it and remove the worktree"
```

## Install

**Prerequisites:** cmux (the plugin is cmux-only — no tmux/headless backend yet), git, opencode.

### From npm (recommended)

Add it to your global or project `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@tder311/opencode-orchestrator"]
}
```

opencode installs it automatically at startup. There's nothing else to run — the repo registry and per-repo setup scripts (see [Profile](#profile)) are created on demand the first time you use `registerrepo` or add them yourself; no install step, no symlinks.

If you want the convenience slash commands (`/spawn-agent`, `/agents`, `/close-agent`), copy them from the installed package into your command directory:

```bash
cp "$(npm root -g)/../lib/node_modules/@tder311/opencode-orchestrator/commands/"*.md ~/.config/opencode/command/ 2>/dev/null \
  || cp ~/.cache/opencode/node_modules/@tder311/opencode-orchestrator/commands/*.md ~/.config/opencode/command/
```

They're optional — every tool works fine from natural language without them.

### From source (for developing the plugin itself)

```bash
git clone https://github.com/tder311/opencode-orchestrator ~/repos/opencode-orchestrator
cd ~/repos/opencode-orchestrator
npm install
bash install.sh
```

`install.sh` symlinks:

| Target | Source |
|---|---|
| `~/.config/opencode/plugins/opencode-orchestrator.js` | `src/index.js` |
| `~/.config/opencode/plugins/lib` | `src/lib/` |
| `~/.config/opencode/command/{spawn-agent,agents,close-agent}.md` | `commands/` |
| `~/.config/opencode/orchestrator/` (the **profile**) | `profile/` template (only if absent) |

Symlinks are live — editing files in this repo changes the installed plugin immediately. Restart opencode sessions to pick up changes.

## Quickstart

From zero to your first parallel agent in ~5 minutes.

**1. Install and restart opencode** (see above). Verify it's loaded by asking any session: *"list my agents"* — you should get `No agents registered. Spawn one with spawnagent.`

**2. Register a repo.** Either tell opencode:

> register the repo monodo at ~/repos/monodo

…or edit `~/.config/opencode/orchestrator/repos.json` by hand:

```json
{ "repos": { "monodo": { "path": "~/repos/monodo" } }, "worktreeRoot": "~/worktrees" }
```

**3. Spawn your first agent.** Just ask:

> spawn an agent in monodo on branch feat/test-orchestrator with task "add a hello-world comment to the README"

You'll see: a git worktree created at `~/worktrees/monodo/feat-test-orchestrator`, a new **background tab** in your current pane (named after the branch) running opencode, and the task submitted to it at boot (via `--prompt`, no fragile typing). Your focus never moves — keep working.

**4. Supervise.** You don't have to watch anything: when the agent finishes it calls `reportstatus` — you get a cmux notification, its tab is marked unread, **and your main session wakes** with the report (an in-process watcher inside your own session delivers it — no separate process). Want a manual check anyway? *"check the agents"* (or `/agents`). To look over its shoulder: *"peek at the monodo agent"*. To steer it: *"tell the monodo agent to also update the tests"*.

**5. Review and close.** The worktree is a plain directory — *"review the diff in the monodo worktree"* works without touching the tab. Then:

> close the monodo agent and remove its worktree

(`closeagent` refuses to delete a worktree with uncommitted changes unless you say `force`.)

**6. (When you need it) teach repos to bootstrap themselves.** A fresh worktree has no `.env`, no `node_modules`, no venv — agents that run tests will trip over that. Copy `~/.config/opencode/orchestrator/setups/example.sh` to `setups/monodo.sh` and edit it; it runs automatically inside every new monodo worktree. See [Profile](#profile) for how resolution works.

That's the whole loop. Everything else below is reference.

## Profile

Everything user-specific lives in `~/.config/opencode/orchestrator/` — outside both the plugin repo (stays generic/shippable) and your target repos (stay clean):

```
~/.config/opencode/orchestrator/
├── repos.json          ← registry: which repos agents can spawn into
└── setups/
    ├── monodo.sh       ← convention: runs for repo "monodo"
    ├── gdm.sh
    └── example.sh      ← annotated template (from profile/setups/)
```

**Setup script resolution** when an agent spawns for a repo: ① `setups/<repo>.sh` from your profile → ② registry `setup` field as an absolute/`~` path → ③ registry `setup` field relative to the repo root. The profile convention means no setup code ever needs to live in a shared repo.

Scripts run as `bash <script> <repoPath>` with cwd = the new worktree (`ORCH_WORKTREE`, `ORCH_REPO_PATH`, and any registry `env` vars set). Failures are warnings, not fatal. Since the profile is just files under `~/.config`, you can version it as a private dotfiles repo if you want it backed up.

## Concepts

- **Registry** (`~/.config/opencode/orchestrator/repos.json`) — repos agents can be spawned into:
  ```json
  {
    "repos": {
      "monodo": {
        "path": "~/repos/monodo",
        "env": { "MARKET_REGION": "nem" }
      }
    },
    "worktreeRoot": "~/worktrees"
  }
  ```
  - `env` (optional): injected into the agent's opencode process.
  - `setup` (optional): only needed to override the profile convention — absolute path, or relative to repo root.
- **Agent** — a worktree at `~/worktrees/<repo>/<name>` + a background cmux tab running `opencode .` + a record in the state file. Names slugify from the branch (`feat/nem/x` → `feat-nem-x`), auto-suffixed `-2`, `-3` on collision.
- **State file** (`~/.local/state/opencode-orchestrator/agents.json`) — live records: status (`starting|working|idle|done|blocked|question|error`), refs, `lastReport`, linked opencode `sessionID`. Atomic writes; the "queue" is just each agent's latest report.

## Tools

Orchestrator side (available in every session):

| Tool | Purpose |
|---|---|
| `spawnagent` | `repo`, `branch`, `base?`, `name?`, `task?` → worktree + tab + opencode; task delivered via `--prompt` at boot; agent boots with `--auto` so permission prompts can't block it unattended (explicit denies in config/`OPENCODE_PERMISSION` still apply). Requires a registered repo (see Profile) |
| `listagents` | Status table; enriches with dirty/ahead-of-base; prunes records whose tab died |
| `peekagent` | Read the agent's tab screen (see what it's doing/stuck on) |
| `sendtoagent` | Type a message into the agent's prompt (steer it, answer questions) |
| `focusagent` | Jump your focus to the agent's tab |
| `closeagent` | Close tab + drop record; `remove:true` deletes the worktree (dirty-guarded unless `force:true`) |
| `registerrepo` | Add/update a registry entry |

Agent side (only in spawned tabs, gated on the `OC_ORCH_AGENT_ID` env marker):

| Tool | Purpose |
|---|---|
| `reportstatus` | `kind: done\|blocked\|question\|note`, `message` → lands in the state file, fires `cmux notify`, marks the tab unread |

Spawned agents also get a system-prompt nudge telling them to report, and their session events keep the state file fresh: `busy → working`, `idle → idle`, `error → error`, `session.created` links the opencode session id. If a permission prompt somehow still appears (e.g. an agent booted before `--auto`), `permission.asked` flips status to `question` and fires a `cmux notify`; `permission.replied` flips it back to `working`.

## Slash commands

| Command | Purpose |
|---|---|
| `/spawn-agent <repo> <branch> [base:X] [name:"..."] [task:"..."]` | Thin wrapper over `spawnagent` |
| `/agents` | List agents, summarize reports, suggest next steps |
| `/close-agent <agent> [--remove] [--force]` | Close an agent |

You rarely need them — the tools work fine from natural language ("spawn an agent in monodo to …").

## Interaction model

Fire-and-forget, with the loop closed three ways:

- **Main session → agent:** `sendtoagent` (types into its TUI), `peekagent` (reads its screen), `focusagent` (hands you the tab).
- **Agent → you (push):** `reportstatus` fires a cmux notification and marks the agent's tab unread — you find out even while doing something else.
- **Agent → main session (push):** the main session's own plugin instance runs an **in-process watcher** — no separate process — that polls the state file and, on any `reportstatus` report (or `error`), calls `client.session.promptAsync(...)` on its own SDK client to wake its own session with `[orchestrator] agent X reported done: …`, which it can then react to. Fire-and-forget: it doesn't wait for the triggered turn to finish.
- **Agent → main session (fallback):** the watcher lives and dies with the session that started it — close the tab, and it's gone, no orphans, no stale URLs. If nobody's watching when a report lands, it just waits in the state file; the next session to run appends it to your **first message** as context (`chat.message` hook). Nothing is lost either way.
- **Out-of-band:** worktrees are plain directories — the main session can `git -C <worktree> diff`, run tests, commit, push without going through the tab at all.

### Watcher

- One per main session (not per agent), started inside the plugin instance when it has a real `client`+`serverUrl` (i.e. a live opencode server — not in scripted/test contexts). Stopped via the plugin's `dispose` hook when the session ends.
- Polls `agents.json` every 5s; matches agents whose recorded `origin.serverUrl` is this same server, and delivers on a **new** report of any kind (done/blocked/question/note) or on `error` status — exactly once (baseline snapshot at startup ignores pre-existing reports).
- Delivery is `client.session.promptAsync(...)` — returns immediately, the triggered turn runs to completion independently. A failed delivery (e.g. transient error) simply isn't marked seen, so it's retried next cycle.

## Development

```bash
npm test           # node --test, 73 tests, all boundaries mocked
```

Layout:

```
src/index.js        plugin entry — default-exports { id, server } ONLY
                    (opencode's loader treats any non-plugin export as a plugin)
src/lib/
  runtime.js        the one exec boundary (mutable for tests)
  cmux.js           cmux CLI wrapper (new-surface, send, read-screen, …)
  git.js            worktree add/remove, dirty, ahead-count
  registry.js       orchestrator.json CRUD
  state.js          agents.json CRUD, atomic writes, agent resolution
  spawn.js          spawn orchestration
profile/            template for ~/.config/opencode/orchestrator (repos.json, setups/)
test/*.test.js      node:test; fake exec stubs all git/cmux calls
commands/*.md       slash commands
```

Env overrides for development: `ORCH_REGISTRY_FILE`, `ORCH_STATE_FILE`, `ORCH_PROFILE_DIR` repoint the registry/state/profile (tests use them).

## Limitations (v1)

- **cmux only** — no tmux/headless backend yet.
- **The watcher dies with its session** — close that tab or restart opencode and reports for agents it was tracking simply wait in the state file until the next session starts (via `chat.message` injection). Nothing is lost, delivery is just delayed.
- **No archiving** — `closeagent` drops the record; the worktree stays unless `remove:true` (git history is your archive).
