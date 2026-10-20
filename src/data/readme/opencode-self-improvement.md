# Opencode-Self-Improvement

Durable memory for opencode, plus a one-command per-repo setup.

## Why is this here?

LLMs waste a lot of tokens reading and re-reading your code and asking you for clarifications you've already given it. This tells it to store those decisions so the next time you hit a similar part of the code, it knows more and gets to the answer faster. 
## What you get

- **`memory_*` tools** — remember facts, decisions, and commands the agent should
  keep across sessions (`memory_init`, `memory_remember`, `memory_recall`,
  `memory_update`, `memory_forget`, `memory_list`, `memory_undo`,
  `memory_evidence`, `memory_export`, `memory_import`, `memory_decay`).
- **`/repo-init`** — for each repo: indexes the code graph and remembers the
  test/build commands, keyed to the git head. The command installs itself; no
  setup beyond the plugin.
- **Memory-aware compaction** — durable memories are handed to the compaction
  summarizer, so a long session doesn't get an amnesia wipe exactly when it
  needs its memory most.
- **Export / import (JSONL)** — `memory_export` / `memory_import` back the store
  up or move it between machines. Every imported row re-enters through the same
  write gates, so an export can't smuggle junk in.
- **Decay** — `memory_decay` retires stale open threads. Dry run by default;
  supersede-not-delete, snapshot-first, undoable.
- **Auto-capture (opt-in)** — with `autoCapture` on, session-idle events get one
  cheap model pass that proposes memory candidates; every candidate still faces
  the same write gates. Off by default, so the install stays zero-token.
- Automatically de-dupes similar memories and avoids contradictions by searching for existing memories before saving new ones.
- **Write gates** — every memory passes 4 checks before it sticks: code references are
  verified against your actual repo, near-duplicates are collapsed, contradictions with
  superseded memories are rejected. Blocked writes are logged with a reason
  (`memory_evidence`), and nothing is ever deleted — updates supersede the old row and
  `memory_undo` rolls back.
- Automatically looks for insights when you complete the verification gates (tests, linting, etc)
- Always defaults to memories first before sending a prompt to the LLM, which saves tokens! 

## Token cost, on purpose

Memory plugins have a reputation for burning tokens and busting the provider's
prompt cache on every message. This one is built the other way around:

- **Epoch-frozen injection.** The "Relevant durable memory" block is computed
  once per epoch — first prompt of a session, a change to the memory store, or
  a compaction — and stays byte-identical in between. A stable system prefix
  means the provider's prompt cache survives ordinary turns instead of being
  invalidated on every message.
- **Hard character budget.** The block is capped at 1200 characters by default
  (see Options) and trimmed at whole-memory boundaries — never cut mid-sentence.
- **Evidence is never injected**, and the standing system digest is two lines.

Measured on a deterministic workload (50 memories, 20 prompts, 3 mid-session
store writes) using the plugin's real injection code:

| Policy | Recomputes | Injected chars (20 turns) | Avg/turn | Worst block |
| --- | ---: | ---: | ---: | ---: |
| A — recompute per prompt, uncapped (pre-0.2) | 20 | 27748 | 1387.4 | 1575 |
| B — epoch freeze + 1200-char cap (0.2) | 4 | 20654 | 1032.7 | 1157 |

Policy B injects 25.6% fewer characters — and the bigger saving isn't even in
the character count: B's block is byte-identical between store changes, so the
prompt cache stays warm across ordinary turns. Reproduce (byte-identical
output):

```sh
bun bench/inject-cost.ts
```

## Quick start

1. Add the plugin to your Opencode config (see install below) and restart Opencode.
2. In any repo, run:

   ```
   /repo-init
   ```

That's it. Rerun `/repo-init force` after a refactor to refresh.

## How to install

Add a `plugins` entry to your opencode config —
`~/.config/opencode/opencode.jsonc` (global) or any project `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-self-improvement@0.2.1"]
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
opencode plugin add opencode-self-improvement@0.2.1
opencode plugin update opencode-self-improvement
```

<details>
<summary>Install from a clone (development)</summary>

```sh
git clone https://github.com/abogartz/opencode-self-improvement.git
cd opencode-self-improvement
bun install
```

Then point the `plugins` entry at the local file instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/full/path/to/opencode-self-improvement/index.ts"]
}
```

After changes, `git pull` and restart opencode.

</details>

## Options

Zero configuration is the default. To tune the plugin, use the object form of
the plugin entry in `opencode.json(c)` instead of the plain string:

```json
{
  "plugins": [{ "package": "opencode-self-improvement", "options": { "injectBudget": 1200 } }]
}
```

| Option | Default | What it does |
| --- | --- | --- |
| `injectBudget` | `1200` | Character cap on the injected relevance block, trimmed at whole-memory boundaries. Env fallback: `OPENCODE_MEMORY_INJECT_BUDGET`. |
| `autoCapture` | `false` (off) | When on, each session-idle event makes one cheap model pass that proposes memory candidates. Every candidate still goes through the 4-gate write pipeline — capture can never bypass the gates. Off by default: the zero-token install stays zero-token. |
| `captureModel` | — | `"provider/id"` model used for auto-capture. Required when `autoCapture` is on; a missing or invalid value disables capture with a startup warning. |
| `captureMax` | `3` | Maximum candidates proposed per idle event. |

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
| `memory_*` tools not available | The plugin didn't load. Restart opencode and check the `plugins` entry in your config. |
| `memory_remember` says blocked | A gate rejected the write (stale code reference, overlap with a superseded memory, or an ambiguous claim). The reason is logged — check `memory_evidence`, then rephrase against current code and retry. |
| `/repo-init` missing from the command list | The self-install couldn't write to `~/.config/opencode/commands/` (e.g. read-only config dir). Create it, restart, or just ask the model to "init memory for this repo" — it calls the same tool. |
| Init says `Graph: unavailable` | `codebase-memory-mcp` couldn't start (not installed, or its once-only download is blocked). Install pinned `0.11.0` via the one-liner above, or point `OPENCODE_CBM_BIN` at the binary. Scripts are still remembered without it. |
| Stale plugin after an update | Bump the pinned version in the `plugin` entry (or `opencode plugin update opencode-self-improvement` on v2) and restart opencode. |
| Auto-capture does nothing | `autoCapture` needs a valid `captureModel` in `provider/id` form — a bad one disables capture with a startup warning. Candidates rejected by the write gates are logged as evidence, not errors; check `memory_evidence`. |
| Reset all memories | Delete `~/.config/opencode/memory/`. |

