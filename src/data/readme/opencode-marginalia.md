<p align="center">
  <img src="docs/logo.png" width="128" alt="">
</p>

<h1 align="center">Marginalia</h1>

<p align="center">
  Persistent memory for <a href="https://opencode.ai">opencode</a> agents.<br>
  Notes in the margins of your codebase.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-marginalia"><img src="https://img.shields.io/npm/v/opencode-marginalia" alt="npm version"></a>
  <a href="https://github.com/lsequeiraa/marginalia/actions/workflows/ci.yml"><img src="https://github.com/lsequeiraa/marginalia/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
</p>

Your agent worked out the build command yesterday. Today it is working it out again.

`AGENTS.md` holds what *you* write down. Marginalia holds what the *agent* learns: the command it had to discover, the correction you have made three times, the optimisation that turned out not to work.

```
opencode plugin add opencode-marginalia
```

Restart opencode and that's it. Memory is plain markdown in a git repo: no vector database, no daemon, and no extra LLM calls in a session.

## A week with it

```
Monday      you     no, run the tests with `bun vitest run`
            agent   remembers: Test with `bun vitest run`; lint with `bun run lint`.

Tuesday     a new session in the same repo already knows.

Friday      agent   tries memoizing the belt solver and measures no gain
            agent   remembers: ✗ Memoizing the belt solver gave no gain; the bottleneck is allocation.

Next month  another session is about to try memoizing. It sees the ✗ and doesn't.
```

## What you get

- **A small index that is always loaded.** One line per fact: about you, about this repository, and about everything else. It is capped at about 4,000 tokens and reports its own cost.
- **Detail that loads only when relevant.** Topic files attach to the code they describe and cost nothing until the agent opens a matching file.
- **Memory of what failed.** Dead ends are first-class (`✗`), so the next session does not retry them.
- **Facts that do not rot quietly.** Every entry is dated. After 90 days it shows as unverified (preferences about you are exempt), and saving a fact surfaces similar ones so contradictions get reconciled.
- **No junk.** An index entry containing a commit SHA, a `file:line` reference, "currently", or anything shaped like a credential is rejected with a reason.
- **A paper trail.** Every write is committed to git, and entries the agent saves record the session that taught them.

[How it works](docs/how-it-works.md) has the detail.

## Using it

Mostly you do nothing. The agent maintains memory itself, through five tools: `memory_read`, `memory_search`, `memory_append`, `memory_write` and `memory_edit`. To save something yourself, start a message with `#`:

```
#the deploy pipeline needs DOCKER_BUILDKIT=1
#global Forgejo has no API for resolving a review thread
#me I prefer surgical diffs over refactors
```

Bare `#` is this repository, `#global` is knowledge that outlives it, and `#me` is about you.

The package also ships a CLI for looking at what is stored and what it costs:

```
$ npx opencode-marginalia inspect
storage   /home/you/.local/share/marginalia
project   endfield-calc  (/home/you/code/endfield-calc)
injected  1.7KB ≈437 tokens

── user  1 entries, 94B, 2 lines
   · Prefers surgical diffs over unrequested refactors.  [2026-10-02]

── global  1 entries, 96B, 2 lines
   · Forgejo 15 has no API for resolving a review thread.  [2026-10-20]

── project  3 entries, 283B, 4 lines
   · Test with `bun vitest run`; lint with `bun run lint`.  [2026-11-02]
   ✗ Memoizing the belt solver gave no gain; the bottleneck is allocation.  [2026-11-06]
   · Worktrees live on /mnt/d.  [2026-07-20]  [unverified]

   ▸ project/solver-perf.md  199B  Belt solver profiling
     auto-loads for src/solver/**
```

`why <text>` shows which conversation taught a fact, with the command to resume it. `log` shows what was learned, in order. Run `npm install -g opencode-marginalia` for a plain `marginalia` command.

## Topic files

Detail that does not fit on one line goes in a topic file. Give it a `paths` glob and it is attached to the `read` result, once per session, whenever the agent opens a matching file:

```markdown
---
description: Belt solver profiling
paths: ["src/solver/**"]
---
Profiling shows 78% of time in Array allocation inside beltStep().
Preallocate a scratch buffer instead of returning fresh arrays.
```

## Dreaming

A session writes memory in the moment, guessing what will matter. `marginalia dream` is the optional offline pass that checks those guesses with hindsight. It reads recent session transcripts beside the store, corrects notes that were wrong, saves what sessions learned but never wrote down, and merges duplicates.

```
marginalia dream --dry-run                           # prepare the inputs, call no model
marginalia dream --model anthropic/claude-opus-5-5   # sessions since the last dream
```

The result lands as one commit in the memory repo, so `git revert` undoes it. A dream sends your transcripts to the model you name, never to a default, and refuses free hosted tiers unless you opt in. [Dreaming](docs/dreaming.md) covers the flags, the model rules and how the run is contained.

## Where it lives

```
~/.local/share/marginalia/          a git repo; every write is committed
├── user/MEMORY.md                  about you
├── global/MEMORY.md                knowledge that holds across projects
└── projects/<repo>-<hash>/
    ├── MEMORY.md                   this repository
    └── solver-perf.md              a topic file
```

Plain markdown you can read, edit or delete by hand. Every worktree of a repository shares one memory.

Nothing leaves your machine unless you run `marginalia dream`. The only other network call is the version check, which asks npm for the latest release and runs only when you ask for it.

## What it costs

About 310 tokens on an empty store, then about 20 per fact, up to a ceiling of about 4,000. Topic files are not in that number: they cost nothing until the agent opens the code they describe. [The breakdown](docs/how-it-works.md#what-it-costs) shows where the tokens go.

## Configuration

| Variable | |
|---|---|
| `MARGINALIA_DIR` | storage location (default `~/.local/share/marginalia`) |
| `OPENCODE_DB` | opencode database read by `marginalia why` and `marginalia dream` |
| `MARGINALIA_OPENCODE` | the `opencode` binary `marginalia dream` runs (default: `opencode` on `PATH`) |

## Requirements

opencode 2.3 or later. The CLI needs Bun or Node 22.5 or later.

## Docs

- [How it works](docs/how-it-works.md): the context budget, staleness, the linter, what it costs
- [Dreaming](docs/dreaming.md): flags, which models it will use, containment
- [Setup](docs/setup.md): the CLI, updating, remote servers, upgrading from older installs
- [Development](docs/development.md): running from a checkout, releasing, design notes

## License

MIT
