# opencode-memory-work

OpenCode plugin for persistent `.memory` and `.work` continuity across sessions.

It stores repo knowledge and task handoffs as plain files in your repository, so context can be reused across sessions and across compatible tools.

- `.memory/` — durable repo knowledge (schemas, playbooks, runs, gotchas)
- `.work/` — per-task handoff folders and a durable backlog

- Website: [pal.fngadiyo.com](https://pal.fngadiyo.com)
- Repository: [github.com/fngadiyo/opencode-memory-work](https://github.com/fngadiyo/opencode-memory-work)

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

Restart OpenCode after changing config.

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
| `memory_lookup` | List, search, or read memory docs with git-based freshness verdicts |
| `memory_save` | Create or update memory docs; stamps `verified_at` to current HEAD by default |

Freshness is computed from git: a doc is `fresh` when covered paths are unchanged since `verified_at`. Stale or unknown docs should be verified against the code before being treated as authoritative.

### Work (`.work`)

| Tool | Purpose |
|---|---|
| `work_start` | Create `.work/<slug>/README.md` for a multi-session task |
| `work_status` | List work folders or read one README |
| `work_update` | Replace README sections with current state; update status |
| `backlog` | Manage durable `.work/TODO.md` items (list/add/start/done/drop/remove) |

## Usage

Once loaded, the agent can use these tools automatically:

- **Start of task**: call `memory_lookup` to check existing repo memory and freshness.
- **Resume multi-session work**: call `work_status`, then `work_status({slug})` for the relevant task.
- **Start new multi-session work**: call `work_start({title, goal})`.
- **During/end of session**: call `work_update({slug, ...})` with current state; call `memory_save(...)` for reusable knowledge.
- **Durable TODOs**: use `backlog` for work that should persist across sessions.

The plugin also injects system guidance via OpenCode's `experimental.chat.system.transform` hook:

1. **Memory first** — check `memory_lookup` before broad exploration.
2. **Work second** — use `work_status`/`work_start` when resuming or starting multi-session work.
3. **Keep handoffs current** — update work README before ending a session; save verified knowledge back to memory.

## Configuration

Optional config files are read when present:

### `memory.json` (project root) or `~/.opencode-memory-work/memory.json`

```json
{
  "dir": ".memory",
  "write": true,
  "staleAfterDays": 90
}
```

### `workflow.json` (project root) or `~/.opencode-memory-work/workflow.json`

```json
{
  "dir": ".work",
  "write": true
}
```

For compatibility, the plugin also reads legacy `~/.pal/memory.json` and `~/.pal/workflow.json` if present.

## File conventions

### `.memory`

- Markdown docs with flat frontmatter (`kind`, `verified_at`, `covers`, etc.)
- `covers` is required for non-run docs so freshness can be computed
- `fresh` means covered paths are unchanged since `verified_at`
- Uncommitted covered changes are reported as advisory, not staleness

### `.work`

- One folder per task: `.work/<slug>/README.md`
- Sections: Goal, Current state, Decisions, Constraints, Relevant files, Remaining work
- Section updates replace the section body with current state
- Durable backlog at `.work/TODO.md`; items may link to a work slug via `→ slug`

## Development

```sh
npm install
npm run typecheck
npm run build
```

## Publishing

```sh
npm whoami
npm publish --dry-run
npm publish --access public
```

## Notes

- Lightweight, file/git based; no external services.
- `.memory/` and `.work/` are local working directories by default. Add them to `.gitignore` if you do not want them tracked.

## License

MIT — free to use, modify, and improve. See [LICENSE](./LICENSE).
