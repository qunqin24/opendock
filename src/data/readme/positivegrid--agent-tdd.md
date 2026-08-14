# agent-tdd

A plugin for human-agent co-authored TDD. You spec the test cases; agents write the red tests, implement them, reach green locally, and integrate waves of work in parallel — all on a local work-item store (the `atdd` CLI) + plain git, with no PRs and no CI in the loop. You direct; they run the show.

It works in **two layers**, each a single agent you talk to:

- **Plan** — `/agent-tdd:fix` (the *Notes Agent*) investigates a bug or feature across one or more repos and turns it into well-specced work-items (a RootIssue + per-repo SubIssues) in the local `atdd` store. It surfaces only the **Input → Output** for you to sign off; the trace stays in a private notebook.
- **Execute** — `/agent-tdd:atdd` (the *Root Agent*) takes one spec — typed inline, or a planned SubIssue — and runs the wave-based TDD workflow: red tests → implementation → local green → integrated waves (plain `git merge`, no PR), gated and parallel.

As of **v1.0.0**, after planning you can hand the whole thing off with one word: say **"go"** and the Notes Agent **orchestrates** execution — spawning one Root per ready SubIssue and driving the entire plan to done, one head at a time, asking you only when a real decision is needed (and always before merging to a base branch). You stay the director.

One skills source (`./skills/`) runs on three coding-agent hosts — **Claude Code**, **OpenCode**, and **Codex** — with a small per-host manifest. There is no build step (the pattern is borrowed from [obra/superpowers](https://github.com/obra/superpowers)).

**Projects (v1.1.1).** Work-items live in isolated **projects** in the local `atdd` store — a repo can belong to several, and no issue is ever shared across them. You pick the project once, at planning time: the Notes Agent uses it automatically when there's only one, and asks you which only when a repo belongs to more than one. From then on everything is scoped to it. `atdd project create|list` manages projects and `atdd repo where <owner/repo>` traces a repo across them.

---

## Host support

| Host | Manifest | Invoke as | Status |
|------|----------|-----------|--------|
| Claude Code | `.claude-plugin/plugin.json` | `/agent-tdd:atdd` | Stable |
| OpenCode | `package.json` → `index.js` (auto-generates `.opencode/commands/`) | `/atdd` | Supported |
| Codex | `.codex-plugin/plugin.json` (+ marketplace) | `$atdd` | **Experimental** (see ROADMAP) |

The child test/impl agents run **interactive** host-CLI sessions in their own tmux windows, selected per host via `AGENT_TDD_CLI` (`claude` / `opencode` / `codex`); only the one-shot rebase agent is headless (`claude -p` / `opencode run` / `codex exec`).

## Commands

| Command | What it does |
|---------|--------------|
| `atdd <spec>` | Execute one task from a free-form spec (the original entry). |
| `fix <bug description>` | Plan a (possibly multi-repo) bug fix as the Notes Agent, then orchestrate execution on your **"go"** — or hand off manually. |
| `atdd-from-issue <owner/repo> <#>` | Execute one planned SubIssue (what orchestration drives under the hood — you can also run it yourself). |
| `atdd-compact` | Hand a long-running Root off to a fresh window when its context fills up. |

Prefix per host: Claude Code `/agent-tdd:<command>`, OpenCode `/<command>`, Codex `$<command>`. (`atdd-feature` planning is deferred.)

## Prerequisites

- One of: **Claude Code**, **OpenCode**, or **Codex**, installed and authenticated.
- **tmux** ≥ 3.0.
- **git** ≥ 2.5 (worktree support).
- The **`atdd`** CLI — the local work-item store the inner flow runs on (replaces GitHub for issues/labels/deps and the green-and-merge step). The plugin auto-installs it on first use (`skills/ensure-atdd.sh`); no manual setup.
- **Language servers (LSP) — optional.** At startup each agent surfaces any language your repo uses that has no working LSP registered (the `atdd` Stack model uses an LSP to fact-check the architecture map) and offers to install + register one. This is **advisory** — you can skip it; it never blocks the workflow.
- **`gh`** (GitHub CLI) — **optional**, used only for the final hand-off PR to a base branch. The inner flow (plan → red tests → green → integrate) is fully local: no PR, no CI.

## Install

### Claude Code

```
/plugin marketplace add hn12404988/emacs_setup
/plugin install agent-tdd@willie-plugins
```

### OpenCode

Install the npm package as a plugin, then start OpenCode in your project. The plugin self-installs: on first load it copies `skills/` into `.opencode/skills/`, generates a `/atdd*` command per entry skill into `.opencode/commands/`, and sets `CLAUDE_SKILL_DIR` + `AGENT_TDD_CLI=opencode`.

```jsonc
// opencode.json
{ "plugin": ["@positivegrid/agent-tdd"] }
```

### Codex (experimental)

Add the shipped marketplace and install the plugin:

```
# point Codex at the repo's .codex-plugin/marketplace.json (adjust the path),
# then in Codex:
/plugins        # find "agent-tdd" → Install
```

Codex has no per-session env hook, so the `atdd` skill's **Step 0** resolves `CLAUDE_SKILL_DIR` and exports `AGENT_TDD_CLI=codex` on first run. If the probe can't find the install path, the agent will ask you for it. See `skills/atdd/references/codex-tools.md`.

## Use

Two ways in. **Both** start by launching your host CLI **inside a tmux window** (`tmux new -s atdd`, then `claude` / `opencode` / `codex`). The command forms below are Claude Code; on OpenCode drop the `agent-tdd:` prefix (`/atdd`, `/fix`, …), on Codex use `$atdd`, `$fix`, ….

### A — one task, spec it inline

```
/agent-tdd:atdd <describe the feature or bug>
```

The Root Agent discusses the test cases with you (Wave 0). When you're aligned, say **"go"** — from there it's autopilot: the window title shows live status, and you're pinged only when input is genuinely needed.

### B — plan a (multi-repo) change, then let it run

```
/agent-tdd:fix <describe the bug>
```

The Notes Agent investigates and proposes the **Input → Output**; you sign off, and it writes the work-items to the local `atdd` store. When at least one SubIssue is ready it asks you to choose:

- **`go`** → it **orchestrates**: spawns a Root per ready SubIssue and drives the whole plan to done, one head at a time — confirming a base branch per repo and asking before each merge to base. *(Needs tmux — that's why you launched inside it. If you're not in tmux, this option isn't offered.)*
- **`plan-only`** → it stops at the issues; you run `/agent-tdd:atdd-from-issue <owner/repo> <#>` yourself, per ready SubIssue, whenever you want.

Either way you only ever talk to one agent at a time, and it keeps you out of the loop until a decision is genuinely yours.

### Watch progress (web console)

You don't have to read logs to follow a run. The `atdd` CLI ships a **read-only web dashboard** of the local store: as agents work, you watch their work-items move through *todo* → *available* → *done* → *merged*.

```
atdd dashboard          # prints the URL (autostarts the daemon)
atdd dashboard --open    # also opens it in your default browser
```

It serves at **`http://127.0.0.1:4517`** by default — localhost only; override with `--port`. The page auto-refreshes every 10s and lists each **project** with its repos and live issue counts (total, done, merged, blocked, in-progress, todo, available). It only *shows* state — you can't change anything from it — so it's safe to leave open while a wave or a full orchestrated plan runs.

## Safety notes

- Impl agents run an interactive `claude --permission-mode bypassPermissions` session (the OpenCode/Codex interactive permission posture is pending smoke verification — see ROADMAP). Use only in trusted local repos.
- The inner flow runs on the local `atdd` store + plain git — no GitHub API and no CI in the loop, so no rate-limit concerns. `gh` is touched only for the optional final hand-off PR to a base branch.
- Each parallel agent uses its own `git worktree`. For very large repos, N parallel agents ≈ N× working-tree disk.
- If the orchestrator process dies mid-workflow, you'll need to re-launch it manually — there is no automatic crash recovery in v1.

## Learn more

- **Design rationale (both layers)** → [WHITEPAPER.md](WHITEPAPER.md) (orchestration is §10.7)
- **Operational specs** → [skills/atdd/PROTOCOL.md](skills/atdd/PROTOCOL.md) (Root execution) · [skills/atdd-plan/CORE.md](skills/atdd-plan/CORE.md) (Notes Agent planning) · [skills/atdd-plan/ORCHESTRATE.md](skills/atdd-plan/ORCHESTRATE.md) (Notes Agent orchestration)
- **Status, known risks, future work** → [ROADMAP.md](ROADMAP.md)
