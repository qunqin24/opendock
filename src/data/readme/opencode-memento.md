# opencode-memento

**Amnesia insurance for [OpenCode](https://opencode.ai).**

When OpenCode auto-compacts a session, the summarizer only keeps what it is shown. `opencode-memento` is a zero-dependency plugin that injects your project's Markdown memory index into the compaction prompt — so the moment your context is rebuilt, your long-term memory is rebuilt with it. Your coding agent gets Total Recall without a trip to Rekall.

> "I have to believe in a world outside my own mind." — Leonard, *Memento*

Leonard tattooed his mission on his body so the facts would outlive his memory loss. This plugin does the same for your agent: the memory index is the tattoo OpenCode reads right before writing the summary.

---

## Why

Long coding sessions end in compaction: the transcript is summarized, and everything the summarizer deems unimportant evaporates. Project memory — conventions, decisions, "never do this again" lessons — usually lives in Markdown files *outside* the session, which is exactly why the summarizer never sees it.

**opencode-memento is amnesia insurance**: a guaranteed, passive safety net that fires at the one moment it matters — when context is being lost. It does not depend on the model remembering to check anything, because the whole point is that the model just forgot everything.

What you get:

- **Guaranteed injection at compaction time** — not "if the agent thinks of it."
- **Zero dependencies** — no embedding models, no vector store, no index to build, nothing to initialize. Plain `node:fs`.
- **Your files stay yours** — memory is ordinary Markdown you can read, grep, diff, and keep in git. The plugin never writes to it.
- **Dual OpenCode support** — one package serves OpenCode 2.x (`compaction` hook) and 1.18.29+ (`experimental.session.compacting`).

## How it works

```
session runs ──▶ context fills up ──▶ OpenCode compacts
                                            │
                                            ▼
                                   memento reads
                                   <memoryRoot>/<hash>/MEMORY.md
                                            │
                                            ▼
                                   index is pushed into
                                   the compaction system prompt
                                            │
                                            ▼
                                   summary keeps memory awareness
                                   (fact names + one-line descriptions)
```

1. When a session compacts, the plugin computes `sha256(canonical project path)` and takes the first 16 hex chars.
2. It looks up `<memoryRoot>/<hash>/<indexFile>` (defaults below).
3. If the index exists and is non-empty, it is appended to the compaction request as a system text block, with its absolute path so the agent can `read` the fact files later.
4. If there is no memory yet, the plugin stays perfectly silent. A missing index is not an error.

The injected block looks like:

```markdown
# Project memory index (/home/you/.config/opencode/memento/projects/84a8cd7d7a26dbdf/MEMORY.md)

# Project memory

- [[convention-tests]] — we always write tests first
- [[api-basics]] — REST routes live in src/api

(Long-term memory: preserve these entries in the summary; individual fact files stay readable at their paths.)
```

Everything is wrapped in `try/catch` — a failing memory lookup can never break a compaction or a session. Insurance you notice only when it pays out.

## The memory convention

The plugin is deliberately write-agnostic: *somebody* (you, or the agent following your `AGENTS.md` rules) maintains plain Markdown. A layout that works well:

```
~/.config/opencode/memento/projects/
└── 84a8cd7d7a26dbdf/            # sha256(project path), first 16 hex chars
    ├── MEMORY.md                # the index — what gets injected
    ├── convention-tests.md      # individual fact files — read on demand
    └── api-basics.md
```

Note the `memento/` subtree: **your memory lives in its own directory and never touches `~/.config/opencode/memory`**, which other memory plugins (such as [@npv12/opencode-memory-md](https://github.com/npv12/opencode-memory-md)) call home. Storage is separated by design, so plugins can run side by side without stepping on each other. On the same note: if you keep `~/.config/opencode` as a git repository (a nice habit), your memory is version-controlled for free. On Windows the default resolves to `C:\Users\<you>\.config\opencode\memento\projects` — perfectly functional; point `MEMENTO_MEMORY_ROOT` at `%APPDATA%\opencode\memento` if you prefer the platform convention.

`MEMORY.md` is one line per fact:

```markdown
# Project memory

- [[convention-tests]] — we always write tests first
- [[api-basics]] — REST routes live in src/api
```

Compute the hash for your project:

```sh
PROJECT_DIR="$(pwd -P)"; printf '%s' "$PROJECT_DIR" | shasum -a 256 | cut -c1-16
# Linux: | sha256sum | cut -c1-16
```

Keep fact files short and named after the `[[wikilink]]` in the index. After compaction, the agent sees the index and can open any fact file by path with its normal `read` tool.

## Installation

Add the plugin to `opencode.json(c)`:

```jsonc
{
  "plugins": [
    // from npm (once published):
    "opencode-memento",
    // straight from GitHub:
    "opencode-memento@git+https://github.com/NemeZZiZZ/opencode-memento.git"
  ]
}
```

To hack on a local checkout, skip the spec entirely — OpenCode auto-loads anything in the plugins directory:

```sh
# copy...
cp src/index.ts ~/.config/opencode/plugins/memento.ts
# ...or track a checkout with a symlink
ln -s "$(pwd)/src/index.ts" ~/.config/opencode/plugins/memento.ts
```

(Verified on OpenCode 2.0.18: the file loads with zero `failed to load plugin` lines in the log.)

Then create your project's `MEMORY.md` (see above). That's the entire setup — there is nothing to initialize, no daemon, no background indexing.

## Configuration

Defaults need no configuration. To change them, use the object form:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-memento",
      "options": {
        "memoryRoot": "~/.config/opencode/memento/projects", // per-project memory folders live here
        "indexFile": "MEMORY.md"                              // index file name inside the project folder
      }
    }
  ]
}
```

| Option       | Default                                              | Env fallback          |
| ------------ | ---------------------------------------------------- | --------------------- |
| `memoryRoot` | `~/.config/opencode/memento/projects`                | `MEMENTO_MEMORY_ROOT` |
| `indexFile`  | `MEMORY.md`                                          | `MEMENTO_INDEX_FILE`  |

Precedence: explicit `options` → env var → default. The env vars are the only configuration path on OpenCode 1.x, whose plugin API has no options object.

### Migrating

- **From the pre-release default** (`~/.config/opencode/memory/projects`): either move your `projects/` folder into `~/.config/opencode/memento/`, or point the plugin at the old location — `{"options": {"memoryRoot": "~/.config/opencode/memory/projects"}}` or `MEMENTO_MEMORY_ROOT`.
- **Already running [@npv12/opencode-memory-md](https://github.com/npv12/opencode-memory-md)?** Nothing to do: memento's default tree (`~/.config/opencode/memento/`) is separate from theirs (`~/.config/opencode/memory/`) on purpose. Both plugins can load in the same session without a single shared file.

## Compatibility

| OpenCode | Mechanism                                                        | Status |
| -------- | ---------------------------------------------------------------- | ------ |
| 2.x      | `ctx.session.hook("compaction")` → `event.system.push(...)`      | ✅     |
| 1.18.29+ | `server()` → `experimental.session.compacting` → `output.context`| ✅     |

The same default export carries both a `setup` (V2) and a `server` (V1) entrypoint; each runtime picks what it understands. The package imports nothing from `@opencode/plugin` — a plain object is a valid V2 definition — which keeps the dependency list at exactly zero.

## Verifying it works

Start a session in a project that has a `MEMORY.md`, force a compaction, then check the log:

```sh
tail -c 200000 ~/.local/share/opencode/log/opencode.log | grep -i memento
```

And simply ask the freshly compacted session: *«what do you remember about this project?»* If it mentions facts from your index, the insurance paid out.

## Comparison with [@npv12/opencode-memory-md](https://github.com/npv12/opencode-memory-md)

Both plugins address agent memory, but they are built for different jobs and don't compete. The shortest version:

> **opencode-memento is amnesia insurance — @npv12/opencode-memory-md is a reference system.**

|                          | opencode-memento (this)                          | @npv12/opencode-memory-md                    |
| ------------------------ | ------------------------------------------------ | -------------------------------------------- |
| Approach                 | Inject into the compaction prompt                | Register a `memory` tool the agent may call  |
| When it acts             | Exactly at compaction — guaranteed, passive      | Any time during a session — optional, active |
| Depends on model wit     | No — fires whether or not the agent remembers    | Yes — useless if the agent never calls it    |
| Search                   | By index names (`[[wikilinks]]`)                 | Semantic/vector (vectra + transformers.js)   |
| Storage                  | Own tree `~/.config/opencode/memento`, git-friendly, never shared | Structured daily logs, project knowledge, identity in `~/.config/opencode/memory` |
| Dependencies             | 0                                               | vectra, @huggingface/transformers, SDK       |
| Cost                     | One small file read per compaction               | Embedding model, index, initialization       |

**Their strengths.** `@npv12/opencode-memory-md` gives the agent a real query interface for the whole session: semantic search over stored knowledge, structured capture, `read`/`write`/`search` tools. If your agent actively maintains and consults memory mid-session, it is the richer system — at the price of an embedding stack and a config that must nudge the agent to actually use it (typically via `AGENTS.md` rules).

**Our strength.** opencode-memento does one thing with a guarantee: at the precise moment context is destroyed, it re-anchors the agent to your memory index. No model cleverness required, no dependencies, nothing running the rest of the time. It also can't lose a race with a lazy model, because there is no race — compaction always passes through the hook.

**Together.** They cover each other's blind spots beautifully — and without competing for disk: memento's memory lives in `~/.config/opencode/memento`, npv12's in `~/.config/opencode/memory`, so the two never read or write the same file. The injected index reminds the freshly-compacted agent that memory exists and what topics it covers; the `memory` tool then gives that agent a genuinely convenient way to search it semantically. Run both: the index is the flare, the tool is the searchlight. That's amnesia insurance *plus* a reference desk — a Dory-proof setup.

## Limitations (honest ones)

- Fires only at compaction. In an ordinary, non-compacted session the plugin does nothing.
- Name-based recall only: the index lists fact names and one-liners; there is no vector search. Semantic retrieval is exactly what [@npv12/opencode-memory-md](https://github.com/npv12/opencode-memory-md) is for.
- It never writes memory. Keeping `MEMORY.md` and the fact files current is your (or your agent rules') job.
- Projects are addressed by path hash — move or rename a project checkout and its memory folder follows only if you re-point the hash.

## License

[MIT](./LICENSE)
