# Marginalia

Persistent memory for [opencode](https://opencode.ai) agents — notes in the margins of your codebase.

Plain markdown files. Git-backed. No vector database, no Python, no daemon, and no extra LLM calls in a session. An optional `marginalia dream` uses a model, when you run it, to check memory against the sessions that wrote it.

```
opencode plugin add opencode-marginalia
```

Then restart opencode. Nothing is written until something is actually worth remembering.

One install covers both halves: opencode resolves `./server` for the memory engine and `./tui` for the `/memory` modal from the same package.

---

## Why

opencode already has the half of memory that *you* write: `AGENTS.md`. What it has no answer for is the half the *agent* writes — the build command it had to discover, the correction you have now made three times, the optimisation that turned out not to work.

Most plugins in this space bet on *capture everything, retrieve semantically*: embeddings, a vector store, an LLM summarising every turn. Marginalia bets the other way — **high-precision capture with a visible feedback loop, and retrieval that costs nothing until it is relevant.**

## How it works

**A small always-on index.** `MEMORY.md` in three scopes — `user` for the person, `global` for knowledge that outlives any one repository, `project` for this one. The block injected at session start is capped at 16KB (about 4,000 tokens) and reports its own cost, so the tax is never invisible.

Each section has a guaranteed share of that cap, handed out in priority order: the profile first, because it changes how the agent works rather than what it knows, then this project, then cross-project knowledge, then the listing of topic files. A share is a floor, not a ceiling, so a section takes whatever the others do not need. When an index outgrows its share it is cut from the bottom, and writing to it says so ("session start shows 20 of 103 entries"). The topic listing degrades the same way: topics that bear on this repository in full, the rest by name, then a count. `memory_search` finds whatever the block leaves out.

That order was learned the hard way too. The listing used to sit outside the budget, and once a store held about 25 topic files it pushed out every entry. One store showed none of its 49 profile entries for six weeks, and then told the agent no memory had been recorded.

The split exists because it was learned the hard way: with only "global" and "project", every cross-project API quirk landed in the scope labelled *About the user*, and a profile that should have shaped how the agent works was never written at all. A fact is filed by **what it is about**, not where it was learned.

Upgrading from a two-scope install: `global/MEMORY.md` is left exactly as it is and now renders as *Across projects*. Nothing is moved for you — guessing which of your entries are about *you* would get it wrong. If some are, move them into `user/MEMORY.md` by hand, or re-add them with `#me`. Note that `#user` used to be a synonym for `#global`; it is now not a prefix at all, so `#user …` saves to the current project with the text intact.

**Topic files that load only when relevant.** Give a topic file a `paths` glob and it is added to the `read` tool result, once per session, whenever the agent opens a matching file. Zero tokens until you touch that code. Globs are tried relative to the repository root and against the absolute path, and `~/` is your home directory, so a cross-project topic can name files in another repository or under `~/.config`. `memory_write` warns about a glob that matches no tracked file.

```markdown
---
description: Belt solver profiling
paths: ["src/solver/**"]
---
Profiling shows 78% of time in Array allocation inside beltStep().
Preallocate a scratch buffer instead of returning fresh arrays.
```

**Memory that resists rot.** Every entry carries the date, the session and the agent that produced it. Entries older than 90 days render as `[unverified since …]` so the agent revalidates instead of trusting blindly. Writing a fact surfaces similar existing ones so contradictions get reconciled rather than silently duplicated. The `user` scope is exempt: a preference does not expire on a clock, it expires when you contradict it.

**Negative memory.** Approaches that *failed* are first-class (`✗`). Agents re-try dead ends constantly; recording them is often worth more than recording successes.

**A durability linter.** Writes are rejected — with a reason — when they contain a commit SHA, a `file:line` reference, transient phrasing ("currently", "for now"), or anything shaped like a credential. There is no override flag; facts that need a SHA belong in a topic file, not the index.

## Usage

Mostly you do nothing — the agent maintains it. To capture something yourself:

```
#the deploy pipeline needs DOCKER_BUILDKIT=1
#global Forgejo has no API for resolving a review thread
#me I prefer surgical diffs over refactors
```

Bare `#` is this repository, `#global` is knowledge that outlives it, and `#me` is about you.

`/memory` opens a searchable modal — a real dialog like `/models` or `/sessions`, not a prompt, so it costs no tokens and no round-trip:

```
Memory   5 entries  ·  1 topic  ·  ≈522 tokens of context                      esc
> ▏search…

  About you
    · Prefers surgical diffs over unrequested refactors.              2026-07-01
  Across projects
    · Forgejo 15 has no API for resolving a review thread.            2026-07-01
  endfield-calc
    · Test with `bun vitest run`; lint with `bun run lint`.           2026-07-02
    ✗ Memoizing the belt solver gave no gain — bottleneck is alloc.   2026-07-03
    · Worktrees live on /mnt/d.  unverified since 2026-01             2026-01-20
  Topic files
    ▸ project/solver-perf.md      auto-loads for src/solver/**             3.3KB
  Marginalia
    How memory works              Capturing facts, and what # does
    Context cost                  What this costs you every turn
    History                       What has been learned, in order
    Version                       Installed vs latest on npm
    Storage folder                Where these files live on disk
```

Selecting an entry shows **where it came from** — the conversation that taught it, with a `resume:` command to go read that exchange.

The same views are available outside opencode via the bundled CLI:

```
marginalia inspect | why <text> | log [n] | version | path | dream
```

The agent gets five tools: `memory_read`, `memory_search`, `memory_append`, `memory_write`, `memory_edit`.

## Dreaming

A session writes memory in the moment, guessing what will matter before it knows. Some notes are wrong from the start, some go stale, and what a session learned often never gets written down. `marginalia dream` is the offline pass that fixes this with hindsight, after Anthropic's [write-up on agent memory](https://www.anthropic.com/research/components-of-agent-memory):

```
marginalia dream --dry-run                                  # prepare the inputs, call no model
marginalia dream --model anthropic/claude-opus-5-5          # sessions since the last dream (or 14 days)
marginalia dream --model anthropic/claude-opus-5-5 --days 7
```

It reads recent session transcripts from opencode's database (read-only) and hands them to a model, beside a checkout of the store, with a list of what each session wrote and read, and how memory has been used: how much of each index session start shows, which topics get read, and globs that match nothing. The model then:

1. corrects notes against the transcript that produced them, and notes later sessions contradicted;
2. saves what sessions learned and did not write down: corrections, preferences, traps, dead ends;
3. merges duplicates, moves detail into topic files, and orders each index so what every session should see is at the top;
4. treats transcripts as data, and flags anything in them that tries to give an agent instructions.

The result is checked rather than trusted, then applied as one commit in the memory repository, with the model's report as the commit message. `git revert` undoes it. Nothing asks you first; the commit and its report are how you audit it.

A dream sends your transcripts and memory to a model, so you always name that model with `--model`, and by default it is never a free one. Free tiers are where providers are most likely to keep and train on what they get, and a free model is what opencode falls back to when nothing better resolves. Before anything is read, the run is refused if:

- the model's id ends in `-free` or `:free`;
- the opencode server's catalog (`opencode api get /api/model`) does not have it, has it disabled, or lists it at no cost. Prices decide as well as names, because some free models don't say so in their id (opencode's `big-pickle`).

Private servers started with `--standalone` also get `OPENCODE_DISABLE_FREE_MODELS=1`, so no fallback can pick a free model. Afterwards the session is read back, and if any step was answered by another model, the result is not applied and you are told which.

A model you run yourself (Ollama, LM Studio, anything OpenAI-compatible) lists at no cost too, but that is not a free tier, so it needs no flag. A model counts as self-hosted when its provider's endpoint (`settings.baseURL` in opencode's provider list) resolves only to this machine or a private network: loopback, RFC 1918, link-local, CGNAT/Tailscale, or IPv6 unique-local. A home domain with split DNS counts by the address it resolves to here. Ollama can also list "cloud" models that it forwards to ollama.com; those are spotted by their `remote_host` in Ollama's tag list, or a name ending in `cloud`, and count as hosted. Marginalia sees only the first hop, and says so when it starts: a local proxy that forwards to a hosted model looks self-hosted.

If you accept the trade, `--allow-free-model` lets `--model` be a free one. It lifts only that refusal: the model must still be named, be in the catalog and enabled, and be the one that answers, and the run starts by saying where your data is going.

Containment matters too, because transcripts include whatever the agent read on the web. The dream runs as a hidden `marginalia-dream` agent that the server plugin registers. Every action is denied except reading files and editing its own checkout of the store, so it has no shell, network, subagents, MCP or memory tools. The check afterwards refuses anything but `.md` files in the store's existing directories, lints every entry the model wrote, and refuses a result that removes more than half the store. Entries the model wrote record it as their author, with its session.

It costs what the model costs: a two-week window is up to 40 transcripts and 2MB of text by default (`--max-sessions`, `--max-kb`). It runs on the background opencode server, which must have loaded this version of Marginalia, or on a private one with `--standalone`. Run it by hand until you trust its commits. After that, a nightly timer works too: it picks up where the last dream stopped.

## Storage

```
~/.local/share/marginalia/          ← a git repo; every write is committed
├── user/MEMORY.md
├── global/MEMORY.md
├── projects/<repo>-<hash>/
│   ├── MEMORY.md
│   └── solver-perf.md
└── .dream/                         ← ignored by git: the last dream's state and report
```

Plain markdown you can read, edit or delete by hand. The project key is derived from the **git common directory**, so every linked worktree of a repository shares one memory — matching the fact that they are one repository.

Nothing leaves your machine except when you run `marginalia dream`: then transcripts go to the model you chose, the same way the sessions themselves did. The only other network call is the optional update check below. A dream's workspace holds copies of transcripts, so it is deleted when the dream succeeds (keep it with `--keep`); a failed dream keeps it for inspection and says where.

## What it costs

Memory is injected into every turn, so the price should be visible rather than implied. `/memory` reports it in the title, and the **Context cost** row breaks it down:

```
  protocol        ≈295    always injected — the rules that make
                          the agent maintain memory at all
  about you       ≈0      0 entries
  across projects ≈0      0 entries
  endfield-calc   ≈0      0 entries
  topic index     ≈0      0 files
  wrapper         ≈15     headings and tags
  ──────────────────────────────
  total           ≈310    in every session, every turn
```

The shape is a **fixed floor of roughly 310 tokens, then about 20 tokens per fact, up to a ceiling of about 4,000.** On an empty store ~95% of the cost is the protocol, which says what memory is for rather than when to save. That floor buys the behaviour; without it nothing gets captured. Once a section is cut, the row says how much of it is shown.

Two things are deliberately *not* in that number:

- **Topic file bodies.** A file with `paths` is injected only into the `read` result for a matching file. Ten topic files cost the same as zero until you open the code they describe.
- **Entries past the cap.** They stay in the index and `memory_search` finds them, but session start does not show them. Pruning, or a dream, is what brings them back into view.

## Updating

opencode tracks plugin versions itself:

```
opencode plugin check    # report available updates
opencode plugin update   # apply them, then restart opencode
```

`/memory version` also tells you when a newer release exists, checking npm on demand.

The daily background update check was removed in the opencode 2 port: its only output was a toast, and server plugins have no way to raise one — they run in a separate process from the terminal client. `opencode plugin check` covers it properly.

## Configuration

| Variable | |
|---|---|
| `MARGINALIA_DIR` | storage location (default `~/.local/share/marginalia`) |
| `OPENCODE_DB` | opencode database read by `marginalia why` and `marginalia dream` |
| `MARGINALIA_OPENCODE` | the `opencode` binary `marginalia dream` runs (default: `opencode` on `PATH`) |

## Requirements

opencode 2.3 or later. The `marginalia` CLI needs Bun **or** Node ≥ 22.5; `/memory` and the agent-facing tools do not.

## How the two halves are registered

Marginalia has two halves — the memory engine and the `/memory` modal — and they run in **different processes**. The engine is a server plugin; the modal is a CLI plugin living in the terminal client. They share no state and communicate only through the memory files on disk.

opencode resolves both from one package via the `exports` map, so a single install covers them:

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["opencode-marginalia"] }   // -> ./server, and ./tui alongside it
```

If you run the terminal client against a *remote* server, register the CLI half separately so it stays local:

```jsonc
// ~/.config/opencode/cli.json
{ "plugins": ["opencode-marginalia"] }   // -> ./tui
```

The server half works on its own. Without the CLI half you lose `/memory`; memory itself, the tools and path-scoped injection are unaffected.

If `/memory` ever stops appearing, check the `/plugins` dialog — a plugin disabled there stays disabled regardless of config.

## Development

```bash
git clone https://github.com/lsequeiraa/marginalia && cd marginalia
bun install
bun test          # 300 tests
bun run typecheck # tsc as a checker; no build step, no emit
```

Point opencode at the working copy — use the **directory**, which picks up both halves at once:

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["/absolute/path/to/marginalia"] }
```

For a directory target opencode joins the path directly (`<dir>/server`, `<dir>/tui`) and does **not** consult `package.json` `exports`. That is what the root `server.js` and `tui.js` shims are for; they re-export from `src/`. Published installs go through `exports` as normal.

Symlinking the checkout into `~/.config/opencode/plugins/` works too, and is the tidier option for local development — CLI plugins are discovered as directories there. Do not do both, or it loads twice. Local plugins are keyed by mtime, so editing a file is enough to reload the CLI half; the server half needs a restart.

## Design notes

- The injected block is **pushed** as a separate system entry, never written over `system[0]`, which holds the base prompt. The v1 rationale was prompt-cache breakpoints on the first two system messages; that specific claim has not been re-verified against v2, but pushing exactly one entry and leaving index 0 alone remains the conservative choice either way.
- The rendered block is cached per session and rebuilt only on compaction, so a memory write mid-session does not bust the KV cache.
- Path-scoped injection is deduplicated per session and re-armed after compaction. The reminder is appended to the `read` result as a text part of its own: opencode 2 returns read content as an array of parts, and the runtime prefers a string over that array, so turning it into a string would drop the file part of an image or PDF read. Accepting only string content is why topics silently stopped loading after the opencode 2 port.
- Every hook is wrapped in `try/catch`. A bug in a memory plugin must never break your session.
- The CLI half uses only the promise-based `ui.dialog` helpers — no `@opentui` imports, no custom renderables, no JSX — so it needs no build step and stays plain JS. The one place that takes care is command registration: `keymap.layer()` needs a live Solid owner, so it is called from inside a headless `ui.slot({ append: "app" })` claim whose render returns `null`, which is how every builtin does it. Failures degrade to a toast; memory itself never depends on the CLI half.
- `engines.opencode` is deliberately **not** declared. opencode 2 betas version as `0.0.0-beta-<n>`, and semver compares that prerelease tag as a single string — so `beta-9999` sorts *above* `beta-19059` and any `>=` range breaks at a digit-count boundary. A constraint that silently excludes the runtime it was written for is worse than none; the `@opencode-ai/plugin` peer dependency carries the real floor.
- CI runs `tsc` as a checker over the plain JavaScript (`checkJs`, `noEmit`). Misusing opencode's API — a wrong argument shape, a field that does not exist on a `Session` — fails the build instead of failing silently inside a `try/catch`. That is not hypothetical: it is how the two bugs in `0.1.0`'s provenance lookup were found.

## License

MIT
