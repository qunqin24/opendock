# Opencode-Self-Improvement

Durable memory for opencode, plus a one-command per-repo setup.

## Why is this here?

LLMs waste a lot of tokens reading and re-reading your code and asking you for clarifications you've already given it. This tells it to store those decisions so the next time you hit a similar part of the code, it knows more and gets to the answer faster. 
## What you get

- **`memory_*` tools** — remember facts, decisions, and commands the agent should
  keep across sessions (`memory_init`, `memory_remember`, `memory_recall`,
  `memory_update`, `memory_forget`, `memory_list`, `memory_undo`,
  `memory_evidence`).
- **`/repo-init`** — for each repo: indexes the code graph and remembers the
  test/build commands, keyed to the git head. The command installs itself; no
  setup beyond the plugin.
- Automatically de-dupes similar memories and avoids contradictions by searching for existing memories before saving new ones.
- Automatically looks for insights when you complete the verification gates (tests, linting, etc)
- Always defaults to memories first before sending a prompt to the LLM, which saves tokens! 

## Quick start

1. Add the plugin to your Opencode config (see install below) and restart Opencode.
2. In any repo, run:

   ```
   /repo-init
   ```

That's it. Rerun `/repo-init force` after a refactor to refresh.

## How to install

Add a `plugin` entry to your opencode config —
`~/.config/opencode/opencode.json` (global) or any project `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-self-improvement@0.1.1"]
}
```

Opencode installs the package (and its dependencies) automatically with Bun at
startup. Quit and restart opencode; the plugin loads and `/repo-init` installs
itself. Nothing else to do.

Pin the exact version (as above). An unpinned entry resolves `@latest` exactly
once and is never re-resolved afterwards, so it silently sticks. To update,
bump the version in the config and restart. On Opencode v2 you can also manage
it with the CLI:

```sh
opencode plugin add opencode-self-improvement@0.1.1
opencode plugin update opencode-self-improvement
```

<details>
<summary>Install from a clone (development)</summary>

```sh
git clone https://github.com/abogartz/opencode-self-improvement.git
cd opencode-self-improvement
bun install
```

Then point the `plugin` entry at the local file instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/full/path/to/opencode-self-improvement/index.ts"]
}
```

After changes, `git pull` and restart opencode.

</details>

## Code graph (optional)

`/repo-init` also indexes the repo into a queryable knowledge graph via
[`codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp),
pinned to `0.11.0` as an optional dependency, so opencode's auto-install at
startup brings it in. If a copy is already on your `PATH`, that one is used
instead; override explicitly with `OPENCODE_CBM_BIN=/path/to/codebase-memory-mcp`.
When no graph binary is available, `/repo-init` still records scripts and the
init stamp — the graph is a lookup bonus, not a requirement (see below).

Manual install of the pinned binary (if you want it globally):

```sh
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

## First use

Run `/repo-init` once in every repo you work in. It:

- indexes the repo's code graph (`codebase-memory-mcp`), only when missing or forced;
- stores the test/lint/typecheck commands as memories;
- writes an init stamp tied to the current git head.

Ongoing use is just the memory tools. Ask the agent to remember something and it
sticks across sessions; check what's stored with `memory_list`, refine with
`memory_update`, retract with `memory_forget`, roll back with `memory_undo`.

`memory_update` takes a `query` that picks the row: its id, a clock fragment such
as `00:11:25.867`, or a unique substring of its text. Omit it to update the newest
entry of that scope and type. A `query` matching nothing, or matching several rows,
writes nothing and says so rather than updating the wrong memory.

## Admin Tool

Editing and deleting memories is easy!

Run `bun memory-view` in your terminal and visit  http://127.0.0.1:8787 in your browser. 

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `memory_*` tools not available | The plugin didn't load. Restart opencode and check the `plugin` entry in your config. |
| `/repo-init` missing from the command list | The self-install couldn't write to `~/.config/opencode/commands/` (e.g. read-only config dir). Create it, restart, or just ask the model to "init memory for this repo" — it calls the same tool. |
| Init says `Graph: unavailable` | `codebase-memory-mcp` couldn't start (not installed, or its once-only download is blocked). Install pinned `0.11.0` via the one-liner above, or point `OPENCODE_CBM_BIN` at the binary. Scripts are still remembered without it. |
| Stale plugin after an update | Bump the pinned version in the `plugin` entry (or `opencode plugin update opencode-self-improvement` on v2) and restart opencode. |
| Reset all memories | Delete `~/.config/opencode/memory/`. |

