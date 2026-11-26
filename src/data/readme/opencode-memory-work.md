# opencode-memory-work

OpenCode plugin for **pal-style** `.memory` and `.work` continuity across sessions.

It is designed for workflows where you move between OpenCode and pal (or other agents) and want the same repo-local continuity files:

- `.memory/` — durable repo knowledge (schemas, playbooks, runs, gotchas)
- `.work/` — per-task handoff folders and durable backlog

This package follows OpenCode plugin conventions and is ready to be published to GitHub/npm (publishing is manual and should only happen when you explicitly choose to).

- Website: [pal.fngadiyo.com](https://pal.fngadiyo.com)
- Repo: [github.com/fngadiyo/opencode-memory-work](https://github.com/fngadiyo/opencode-memory-work)

## Install

### Option 1: OpenCode CLI

```sh
opencode plugin opencode-memory-work -g
```

Restart OpenCode after installing.

### Option 2: Add to `opencode.json`

Add to your project `opencode.json` / `opencode.jsonc`, or global config at `~/.config/opencode/opencode.json` (Windows: `%USERPROFILE%\.config\opencode\opencode.json`):

```jsonc
{
  "plugin": [
    "opencode-memory-work"
  ]
}
```

OpenCode installs npm plugins through its normal plugin mechanism on startup. Restart OpenCode after changing config.

### Option 3: Local development

Build the plugin locally:

```sh
git clone https://github.com/fngadiyo/opencode-memory-work.git
cd opencode-memory-work
npm install
npm run build
```

Then point OpenCode at the local package directory in `opencode.json`:

```jsonc
{
  "plugin": [
    "C:/path/to/opencode-memory-work"
  ]
}
```

Use the package directory path (not a single JS file). Relative paths resolve from the config file; absolute paths work too.

You can also place a plugin in `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global) for OpenCode auto-discovery.

## Tools

### Memory (`.memory`)

| Tool | Purpose |
|---|---|
| `memory_lookup` | Index/search/read memory docs with git-computed freshness verdicts |
| `memory_save` | Write/update memory docs; stamps `verified_at` to current HEAD by default |

Freshness is computed from git: a doc is `fresh` only when covered paths are unchanged since `verified_at`. Stale/unknown docs are treated as hints.

### Work (`.work`)

| Tool | Purpose |
|---|---|
| `work_start` | Create `.work/<slug>/README.md` handoff folder |
| `work_status` | List work folders or read one README |
| `work_update` | Replace README sections with current truth; set status |
| `backlog` | Durable `.work/TODO.md` task list (list/add/start/done/drop/remove) |

## Usage

Once loaded, the agent gets these tools automatically:

- **Start of task**: call `memory_lookup` (no args) to see existing repo memory and freshness.
- **Resume multi-session work**: call `work_status`, then `work_status({slug})` for the matching task.
- **Start new multi-session work**: call `work_start({title, goal})`.
- **During/end of session**: call `work_update({slug, ...})` with current truth; call `memory_save(...)` for reusable knowledge.
- **Durable TODOs**: use `backlog` for work that should survive sessions.

The plugin also injects continuity guidance via OpenCode's `experimental.chat.system.transform` hook:

1. **Memory first** — `memory_lookup` before broad exploration.
2. **Work second** — `work_status`/`work_start` when resuming or starting multi-session work.
3. **Update before session end** — keep work README current; write memory back after verification.

## Configuration

Pal-compatible config files are read when present:

### `memory.json` (project root) or `~/.pal/memory.json`

```json
{
  "dir": ".memory",
  "write": true,
  "staleAfterDays": 90
}
```

### `workflow.json` (project root) or `~/.pal/workflow.json`

```json
{
  "dir": ".work",
  "write": true
}
```

## File conventions

### `.memory`

- Markdown docs with flat frontmatter (`kind`, `verified_at`, `covers`, etc.)
- `covers` required for non-run docs so freshness can be computed
- `fresh` = covered paths unchanged since `verified_at`
- Uncommitted covered changes are reported as advisory, not staleness

### `.work`

- One folder per task: `.work/<slug>/README.md`
- Sections: Goal, Current state, Decisions, Constraints, Relevant files, Remaining work
- Section updates replace body (current truth), not append changelog
- Durable backlog at `.work/TODO.md`; items may link to work slug via `→ slug`

## Development

```sh
npm install
npm run typecheck
npm run build
```

## Publishing (manual, when ready)

Before publishing:

1. Confirm package name/version: `npm view opencode-memory-work version` (should be 404/unpublished until first release).
2. Update `CHANGELOG.md`.
3. Run checks: `npm run typecheck` and `npm run build`.
4. Commit and push to GitHub: `https://github.com/fngadiyo/opencode-memory-work`.
5. Publish to npm only when explicitly intended: `npm publish --access public`.

## Notes

- Lightweight, file/git based; no external services.
- Does not implement pal `session_health` (OpenCode session internals differ).
- Treat `.memory/` and `.work/` as local scratch unless intentionally tracked; plugin warns when not gitignored.

## License

MIT — free to use, modify, and improve. See [LICENSE](./LICENSE).
