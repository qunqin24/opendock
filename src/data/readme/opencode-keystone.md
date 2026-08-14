<h1 align="center">opencode-keystone</h1>

<p align="center">
  An opinionated <code>/keystone</code> slash command that bootstraps a new project the way you actually want.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-keystone"><img alt="npm version" src="https://img.shields.io/npm/v/opencode-keystone.svg"></a>
  <a href="https://www.npmjs.com/package/opencode-keystone"><img alt="npm downloads" src="https://img.shields.io/npm/dm/opencode-keystone.svg"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/npm/l/opencode-keystone.svg"></a>
  <img alt="made with vibes" src="https://img.shields.io/badge/made_with-vibes-ff69b4">
</p>

---

Drop `/keystone <idea>` into any [OpenCode](https://github.com/anomalyco/opencode), [Claude Code](https://github.com/anthropics/claude-code), or [GitHub Copilot CLI](https://github.com/github/copilot-cli) session. It researches, lists likely future problems, writes `PLAN.md` and `AGENTS.md`, **stops for your review**, then bootstraps the repo and runs phase 1 in parallel git worktrees with the Copilot review loop after every PR.

## Highlights

- **Foresight first** — explicit pass over perf, licensing, security, cost, portability, and abandonment risk *before* the plan is written.
- **Phased `PLAN.md`** — MVP-first, exit tests per phase, anticipated risks, one-command teardown.
- **Self-contained `AGENTS.md`** — conventional commits, branch-per-issue, Copilot second-opinion loop, worktree convention, cloud cost discipline. No global file required.
- **Operational memory** — `NOTES.md` + ADRs catch the *"agent reintroduces a bug we already fixed"* and *"reintroduces a library we rejected"* failure modes.
- **Review gate** — nothing gets built until you read both files and say `go`.
- **Parallel worktrees** — sub-agents work in `../<project>-wt/<task>/` (single dir for permission scoping), max 3 concurrent, squash-merged, cleaned up on merge and again on project wind-down.
- **Opinionated** — every choice above is baked in. Disagree with one? It's one markdown file. Fork it.

## Install

### OpenCode (recommended path)

```bash
opencode plugin opencode-keystone -g
```

Installs the npm package globally, adds `"opencode-keystone"` to your `opencode.json` plugin array, and on next session start the plugin auto-installs `/keystone` into `~/.config/opencode/commands/`.

### Other CLIs (or OpenCode without the plugin)

```bash
curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash
```

Run interactively for a menu, or pass `--target` for unattended install:

```bash
curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash -s -- --target=claude
curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash -s -- --target=all
```

### Or via npx

```bash
npx opencode-keystone install --target=opencode      # default
npx opencode-keystone install --target=claude
npx opencode-keystone install --target=copilot
npx opencode-keystone install --target=all
```

| Target | Install location | Invoke |
|---|---|---|
| OpenCode | `~/.config/opencode/commands/keystone.md` | `/keystone` |
| Claude Code | `~/.claude/commands/keystone.md` | `/keystone` |
| Copilot CLI | `~/.copilot/agents/keystone.md` | `copilot --agent=keystone --prompt '<idea>'` |

The same source file is used for every target — Copilot CLI gets a one-line frontmatter strip at install time so the file fits its agent format. Nothing else in your config is touched.

## Use

```
/keystone i want to build a rust cli that renders markdown to ANSI in the terminal
```

Or invoke with no argument and Keystone will ask for the idea once, then proceed.

## Companions

**Required:**

- [`copilot-second-opinion`](https://github.com/Adamkadaban/copilot-second-opinion) — Keystone's Phase 7 PR review loop hard-depends on it. Install before first use.

**Strongly recommended:**

- [GitHub MCP](https://github.com/github/github-mcp-server) — author identity, repo creation, issues, PRs, review threads. Without it Keystone falls back to `gh` CLI for what it can.
- [Context7 MCP](https://github.com/upstash/context7) — live library docs during the Research phase.

## Hacking on it

```bash
git clone https://github.com/Adamkadaban/opencode-keystone && cd opencode-keystone
node bin/install.mjs install --dev --force        # symlinks live from your checkout
```

Edits to `commands/keystone.md` are picked up live on the next `/keystone`.

## Releasing

```bash
npm version patch && git push --follow-tags
```

The [publish workflow](./.github/workflows/publish.yml) handles npm (Trusted Publishing + provenance) and the GitHub Release.

## License

[MIT](./LICENSE)
