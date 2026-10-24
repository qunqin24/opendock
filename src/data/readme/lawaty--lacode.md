# LaCode

> Ultimate opencode setup for Go users

> LaCode 1.0.0 ships on the npm **`latest`** dist-tag. Prereleases use
> `beta`: install `@lawaty/lacode@beta`, or pin an exact version.

LaCode is an opencode plugin. It routes delegated work onto a weighted pool of
cheap models instead of the expensive one, reaps subagents that hang without
telling anyone, keeps a maintained map of your repository so agents stop
exploring it cold on every task, and tells you when a parallel session finishes
or is waiting on you — including sessions running on remote hosts over SSH,
where the desktop notification would otherwise die on a machine that has no
desktop.

Install it with one config line. It adds agents and commands it finds missing,
and it never overwrites one you already defined.

Upgrading? See [CHANGELOG.md](CHANGELOG.md) — it ships with the package, so it
is also on disk at `node_modules/@lawaty/lacode/CHANGELOG.md`.

## Why

| Capability | The problem it solves |
| --- | --- |
| Weighted model pool | An expensive main model burns through its quota doing file listing. |
| Per-model cooldowns and failover | A provider rate-limits mid-session and the whole thing hard-fails, while other providers sit idle. |
| Hang reaper | A wedged subagent holds its slot forever, so the session stalls with no error and no timeout. |
| Desktop notifications | With several sessions open you cannot see which one finished, or which is blocked on a question. |
| Permission answers on the popup | An approval blocks a background session, and finding that session just to click Allow is the interruption. |
| Distinct notification sounds | A popup says something happened, but not at a glance whether it is a finish, a question or a block. |
| SSH notification tunnel | Work on a remote host raises its notification on that host, which has no desktop. |
| Repository context map | Every task starts by exploring your codebase cold, re-deriving the same layout, entry points and boundaries. |
| Active backlog | What is half-done, and what can be dropped, lives in chat history the next session cannot see. |
| Standing instructions | The same direction gets repeated every session, or buried in config that is not per-clone. |
| Image attachments anywhere | A TUI with no image support locks vision models out entirely. |

## Getting started

### 1. Install

Add one line to your opencode config — `~/.config/opencode/opencode.json`, or
the `.jsonc` beside it:

```json
{ "plugin": ["@lawaty/lacode"] }
```

**That is the entire install.** opencode resolves an npm plugin specifier itself
and installs it at startup, so there is no `npm install` to run first and no
directory to create. Do not run `npm i -g @lawaty/lacode`: a global npm install is
never consulted by opencode, so it changes nothing about whether the plugin
loads.

To install it for every project on the machine rather than per config, let the
CLI do the same thing:

```bash
opencode plugin @lawaty/lacode -g
```

### 2. Restart opencode

**Plugin code is not hot-reloaded.** The `plugin` array is read at startup, so
without a restart the change does not take effect and the agent set will look
stale for no visible reason. (The pool's slot files are the exception: editing
`pool.txt`, `pool.json` or the bundled preset is picked up live — see
[Configure](#configure).)

### 3. Check it loaded

```bash
opencode agent list | grep -E '^(explore|implement|context)'
```

You should see `explore`, `implement` and `context`, each with hidden `-1`..`-4`
pool variants alongside. That is the whole install, and you are done.

**If that prints nothing, the plugin did not load** — and opencode will not tell
you: it starts normally, logs nothing, and the agents are simply absent. A
plugin that fails to load is silent by design of the host, so this check is the
only way to know. The
[troubleshooting guide](docs/INSTALL.md#if-the-agents-are-missing) walks the
procedure.

### 4. Use it

Nothing to turn on. Ask for something that delegates, and the pool takes it from
there:

```
> use the explore agent to find where auth tokens are validated
```

To see what the pool is doing underneath:

```bash
/lacode-doctor        # slots, model resolution, OmniRoute — report only, changes nothing
/pool-recheck         # probe the benched models now; re-admit the ones that answer
lacode version        # which LaCode is actually running, and whether opencode loads that one
```

In a repository with no `.opencode/context/` yet, the first session builds it in
the background; `/context-init` forces it, and [Context map](#context-map)
explains what it is for.

## Configure

Plugin options are a tuple — the package name, then an options object. Every
option is optional:

```jsonc
{
  "plugin": [
    ["@lawaty/lacode", {
      "enabled": true,
      "models": {
        "slots": [
          { "model": "anthropic/claude-sonnet-4-5", "weight": 2 },
          { "model": "opencode/big-pickle", "weight": 1 }
        ]
      }
    }]
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | The single off switch. `false` injects nothing at all and does no writes. |
| `models` | — | An inline slot list. Highest-priority source. |
| `modelsFile` | — | An explicit slot file; short-circuits the [resolution chain](docs/CONFIGURATION.md#pool-preset-resolution). |
| `reapMs` | `30000` | Hang-reaper interval. |
| `probeMs` | `900000` | How often benched models are checked by actually using them. `0` turns the periodic check off and leaves the `pool_recheck` tool as the only way to ask. |
| `selfUpdate` | `true` | Check for a newer release at most once per ~6h and install it in the background; it applies on the next opencode start. `false` — or `LACODE_NO_SELFUPDATE=1` — turns the check off. |
| `sound` | `true` | Play a short tone with each notification, one per outcome, so you can tell a finished session from a question or a permission prompt without reading the popup. It is opt-out: `false` — or `LACODE_SOUND=0` (`false`, `off`, `no` work too, and beat the option) — turns the sound off, and anything else, a typo included, leaves it on. |
| `omniroute` | — | Optional [OmniRoute](docs/OMNIROUTE.md) gateway integration. Absent or `{ enabled: false }` changes nothing. |
| `watchMs` | `1000` | How often the pool files are checked for changes. `0` disables live reload. |
| `watchDebounceMs` | `250` | Collapse a burst of editor writes into one reload. |
| `imagePaste` | — | Image attachments: `maxBytes` (4 MiB), `maxImages` (10) and `dir`. |

### Staying up to date

opencode's plugin cache is **write-once**: it resolves `@lawaty/lacode` to an
exact version once and never re-resolves — not on restart, not with
`opencode plugin -g -f`, not with a range pin, not with a tagged config spec.
Nothing in the host re-resolves it, so the plugin owns its own currency
(US-27): at startup LaCode compares its own version to npm's `latest` (at most
once per ~6h, silent when offline) and, when behind, reinstalls its own cache
entry in the background using the opencode binary — no npm or bun required.
The running session keeps its loaded code; the new version takes effect on the
next start, and the log says so. Run `lacode update` to do it on demand, or
`lacode update --check` to just report.

1.0.0 is published to the `latest` dist-tag; prereleases use `beta`. This check
follows `latest`. A beta install is therefore reported as current even when a
newer beta exists,
and `lacode update` will not move it: pin the version you want in the `plugin`
entry, because a new specifier is what forces a fresh resolve.

### Which LaCode is running

`lacode version` answers it — and the answer is often not the version number you
expected, because the plugin entry in your config decides which copy is loaded:

```bash
lacode version
```

```
version    1.0.0
root       /home/you/lacode
source     checkout
commit     <hash> (dirty)
dist       current
config     /home/you/.config/opencode/opencode.jsonc
plugin     file:///home/you/lacode/dist/index.js
this copy  yes — opencode loads this copy
```

`npm ls -g @lawaty/lacode` answers a different question. It reports the package
opencode resolves *by name*, which is not necessarily the one running: a config
may load the plugin by absolute path, and a global install can sit there
reporting a version nothing uses. So this command reads your actual `plugin`
array and says whether it resolves to the copy speaking.

`source` distinguishes a git checkout from an npm install, `commit` and the
dirty flag name what the code was built from, and `dist` is the trap worth
knowing about — opencode loads `dist/index.js` while you edit and pull `src/`,
so a `git pull` can leave you running a build that differs from the installed
package, with nothing failing.
When it reports `stale`, rebuild with `npm run build`. No network is touched;
`lacode update --check` is what asks npm whether something newer exists.

## What you get

Three pooled agents: `explore`, `implement` and `context`. You spawn the base
name and the pool picks a cheap model slot for it. Behind each base sits up to
four hidden variants — one per slot — and a spawn of the bare name is the only
thing that works: a hand-named variant such as `explore-1` is coerced to its
base and routed by the pool, so naming one cannot pin a provider or skip
ordered slot filling.

A model that rate-limits or runs out of quota is benched until its window ends,
so one sick provider does not take the pool with it.
Those windows are computed backoff rather than a promise from the provider,
and a quota-shaped one can run for hours — long enough for a provider that has
since recovered, or whose quota you reset in its own console, to stay excluded
while every delegated spawn queues behind the survivors. So LaCode asks instead
of guessing: every fifteen minutes, on demand via the `pool_recheck` tool, and
the moment a pool file changes (where it validates every slot, cooling or not),
it probes each benched model with one real request on that exact model. A model
that answers is re-admitted immediately — nothing restarts, nothing reloads — and
a model that is still limited keeps exactly the window it had, because a check
must never be the thing that extends the wait. A model the provider does not
serve at all is benched for the quota cap and named in the report.
A change is reported as a toast and a log line; a pass that finds nothing changed says
nothing at all.

Nine commands: `/context-init`, `/context-update`, `/context-review`,
`/lacode-doctor`, `/agent-instructions`, `/pool`, `/pool-recheck`, `/image-in-cb`
and `/image`. Everything is added **only when your config does not already
define it** — an agent or command you wrote yourself is left byte-identical,
never patched or partially merged. `{"enabled": false}` turns the whole thing off
without leaving a trace. The exact injection list, and the five keys that are
deliberately *not* injected, are in
[docs/CONFIGURATION.md](docs/CONFIGURATION.md#what-gets-injected).

Two more surfaces that need no configuration:

- **`pool_status`** — the live view `/lacode-doctor` uses: per-slot load against
  its ceiling, which slot the next spawn takes, cooldowns, hung claims and
  whether the watcher is on. Ask for it when you want to know what the pool is
  doing; it never changes slot selection.
- **Notifications that wait** — a notification is never auto-dismissed; it stays
  until you close it. On Linux a permission request carries **Allow once**,
  **Always allow** and **Deny** buttons, and LaCode waits up to ten minutes for
  the click.

## Context map

Agents are stateless between tasks, and exploring your repository is the most
expensive part of any task — so every agent pays for it again, re-deriving the
same layout, entry points and boundaries from scratch. LaCode keeps a short,
maintained map of the repository in `.opencode/context/` — five navigation files
(`architecture`, `contexts`, `conventions`, `workflows`, `decisions`) plus
`active.md`, the active backlog, where a finished task stays a week and an open
one stays until done — and injects a standing rule that every agent reads the
relevant file before exploring and starts from the canonical entry points it
lists. The map holds conclusions, not
inventories: it answers "what should I look at first?" and nothing else, which
is what makes reading it cheaper than the exploration it replaces.

It keeps itself current. When a session that edited code goes idle, LaCode
starts a `context` run that borrows a slot from the same pool every
other subagent uses and updates the map from the changed paths and their
architectural neighbourhood — defaulting to *no edit*, since a changed file is
not a changed fact. Only that one agent ever writes the map; everything else
reports what belongs in it, so concurrent sessions cannot contradict each other.
You can also drive it by hand, which is the move when you do not trust what you
are reading:

```bash
/context-init      # build the map, or verify and refresh an existing one
/context-update    # incremental refresh; accepts a focus, e.g. /context-update src/payments
/context-review    # audit it for staleness, contradictions, duplication and bloat
/lacode-doctor     # check the pool, model resolution and the OmniRoute gateway. Report only
/agent-instructions # apply a client instruction to the project's AGENTS.md — client-only, see below
/pool              # rewrite the pool slot table in ~/.config/lacode/pool.txt; picked up automatically
/pool-recheck      # probe the pool now; accepts an optional provider/model list
/image-in-cb       # attach the clipboard image to this message; macOS needs pngpaste, Linux needs wl-paste or xclip
/image             # attach one or more image files to this message; paths honour quotes, ~ and globs
```

The map is local and untracked — it describes your checkout on your machine, so
it is not committed and not synced. If it is missing, agents check, find
nothing and carry on without it. What this buys is tokens not spent
re-discovering structure; as with everything else here, no savings percentage is
published, because none has been independently measured. The mechanism, the
permission rule that makes one writer possible, and what the log lines mean are
in [docs/CONTEXT.md](docs/CONTEXT.md). Automatic map runs also clean up after
themselves: each run's session is deleted once its transcript is written, and
the last 20 transcripts are kept under
`~/.local/share/opencode/lacode/cartographer` (`LACODE_TRANSCRIPT_DIR` overrides
the directory).

## Standing instructions

The project's root `AGENTS.md` — created on first use by `/agent-instructions` —
is your own statement of intent: it records
what you want worked on and how you want it approached. It says nothing about
where code lives, so it can never contradict the code, and within that domain
it outranks the generated context files and any agent's inference about what
matters right now.

The file is per-clone and not committed, so it is yours rather than shared
team state. There is no fixed schema and no prescribed headings — you write
whatever you like, and every heading you add is treated as direction.

Anything you have recorded there is read before work starts, and what you have
recorded is treated as settled by the agents — not as permission to skip
reading the code.

**Who may write it.** Every agent is explicitly permission-denied from
touching this path, so no automatic run can ever alter it. The one exception
is the hidden `instructions` agent, reachable solely through the
`/agent-instructions` command.

**`/agent-instructions` — the one sanctioned write path.** Type
`/agent-instructions <text>` and the `instructions` agent applies whatever
instruction you have given to `AGENTS.md`, then reports what it changed. It is
a normal agent turn, not a dead append: tell it what you want and review the
result. The `instructions` agent is the one agent permitted to edit that file,
its write grant is scoped to `AGENTS.md` alone, and no other agent can spawn it —
the command is the only route in. It may also **read** `.opencode/context/`, so a
directive does not restate a fact the map has already settled or contradict one it
has not read; the map stays read-only to it, and the `context` agent remains its
only writer.

## Cost

The mechanism is specific and small: bulk exploration, implementation and
repository cartography run on pooled cheap or free subagents instead of the main
model. There are **two separate effects** here, and they are worth telling apart
because only one of them is about money per token:

1. **The tokens are spent on a cheaper model.** A read, a grep, or a mechanical
   edit performed by a near-free subagent costs per-token approximately nothing,
   where the same call on your main model does not. This is the effect people
   usually mean when they say the pool saves money.
2. **The main model's context is never filled with file contents it does not
   need.** A delegated explorer returns a conclusion and a `file:line`, not
   forty tool calls' worth of source. The expensive model spends its attention
   on design work instead of on reconstructing a directory tree, and its context
   window — a hard, non-renewable budget — is spent on reasoning rather than on
   raw file text.

The second is the larger of the two, and it is not a cost-per-token effect at
all: it is a capacity effect. It holds even when the pooled model is not free,
and it is why the pool is scoped to *mechanical* work. Work that needs real
judgement belongs to the main model regardless of what the pool is running,
because pulling a difficult conclusion back through a subagent costs more
context on the far side than reading the file directly would have.

That scoping is why the bundled preset is free: pooled work is work you would
not have wanted the main model to do anyway. **Free is the shipped default, not
an enforced restriction.** The pool is open — it accepts any model you give it,
free, cheap or expensive, and never inspects, prices, warns about, filters or
rewrites one. The only per-model rule is structural: a slot must be written
`provider/model-id` so it is addressable at all. That default lives in exactly one
place, `presets/free-tier.json`, where you can read it and change it (US-7, US-23).

Agents start from the maintained context map above rather than exploring cold, so
the structure of your codebase is written down once instead of re-derived on
every task. Load is counted per model across every agent type and every process,
so a slot cannot hide behind its own dedicated model while another idles, and a
model that just rate-limited one project is skipped by all of them.

**No savings percentage is published here, because none has been independently
measured.** What the mechanism is worth in money depends entirely on the token
mix of your tasks and on the models you compare the pooled run against. A figure
from someone else's workload is not a claim about yours.

The harness exists so you can produce your own number:

```bash
npm run benchmark          # offline simulation from the pinned price snapshot
npm run benchmark -- --real   # runs both sides for real and reads back the tokens
```

Both print tokens and cost for the same scenario run two ways, and both refuse
to emit a number they cannot derive — an unpriced model reports `unknown`, never
`0`. How the two modes differ is in [docs/BENCHMARKS.md](docs/BENCHMARKS.md),
which explains the harness and deliberately contains no results.

## Remote hosts

Notifications raised on a remote host need a way back to your desktop. The
default hop is a direct `ssh` to your desktop over one warm `ControlMaster`
connection; a reverse forward is the fallback used when `OC_LOCAL_HOST` is unset:

```bash
lacode notify "build finished" "4 files changed"      # local desktop, or forwarded if remote
lacode doctor                                        # what the environment resolves to
```

`lacode notify` is fire-and-forget and always exits 0 — an unreachable desktop
must never be able to fail the process that tried to notify you. The one
exception is an actionable notification — one carrying a permission request id
— which waits for the click, because the answer is the whole point of it.
That click path is Linux-only: the popup carries **Allow once**, **Always allow**
and **Deny**, and macOS gets a plain notice without buttons.
`lacode forward HOST -- COMMAND` runs a command on another host over ssh and
exits with its status.

The full CLI is `notify`, `forward`, `doctor`, `version`, `update`, `receive`
and `tunnel setup`. `version` reports which copy of LaCode is running — and
whether opencode is loading that same copy — and `update [--check]` refreshes an
installed one. `receive` is the desktop end of the tunnel (the forced command a
remote key is restricted to) and `tunnel setup` provisions the key and the
forward.

Configuration, the payload format, the receiver contract and holding the forward
open are in [docs/TUNNEL.md](docs/TUNNEL.md).

## Further reading

Optional. Nothing above needs any of it — this is where the detail lives once you
want it.

| | |
| --- | --- |
| [Install and troubleshooting](docs/INSTALL.md) | Where opencode puts the package, what to do when the agents are missing, the version matrix, macOS differences, and the `lacode` CLI. |
| [Configuration reference](docs/CONFIGURATION.md) | Every plugin option, how the pool resolves its slots, per-agent tool grants, and exactly what gets written into your config. |
| [OmniRoute gateway](docs/OMNIROUTE.md) | The optional local gateway integration: setup, full option set, a latency-measured free combo, and its troubleshooting table. |
| [Context map](docs/CONTEXT.md) | The mechanism behind `.opencode/context/` — the one-writer permission rule, the files, and what the log lines mean. |
| [Remote hosts and notifications](docs/TUNNEL.md) | The SSH notification hop, payload format, receiver contract, and holding the forward open. |
| [Benchmarks](docs/BENCHMARKS.md) | How the cost harness works, and why it deliberately publishes no savings number. |
| [User stories](docs/USER-STORIES.md) | The behavioural contracts behind all of the above, written so a test can assert them. |
| [Operations runbook](OPERATIONS.md) | Maintainer-facing: what runs where, what needs a restart, how the pieces are distributed across machines. |
| [Changelog](CHANGELOG.md) | What changed in each release. |

## Development

```bash
npm run build          # esbuild -> dist/ (what the tarball ships)
npm test               # node --test tests/ — offline, no network, no running server
npm run benchmark      # the cost harness; see docs/BENCHMARKS.md
```

Node ≥ 22.18.

`npm run build` compiles each entry point in `package.json` (`exports` and
`bin`) into `dist/` with esbuild, one bundle per entry point, so nothing in
`src/` has to be renamed to satisfy node's ESM resolver. `@opencode-ai/plugin`
and the node builtins are external — see the header of `scripts/build.mjs` for
why a peer dependency must never be inlined. `dist/` is generated and
gitignored; `prepack` builds it, so `npm pack` cannot produce a stale tarball.

The sources are TypeScript and the tests import `src/` directly (node strips the
types outside `node_modules`, which is exactly where the tests live), so the
loop is: edit `src/`, run `npm test`. Only the packaging fixtures build, and
they call the same `scripts/build.mjs` the tarball does.

`tests/stories/` holds the story suites and `tests/stories/coverage.test.mjs`
is the guard: it reads the `### US-N:` headings out of `docs/USER-STORIES.md`
and the `[US-N]` markers out of the test names and fails if they disagree, in
either direction. **A test that covers a story must have the id at the start of
its name** — `test("[US-7] a paid model is accepted")` — or the coverage guard
fails it.
A story with no test is as much a failure as a test naming a story that does not
exist.

## License

MIT licensed. Based on work by [lawaty](https://github.com/lawaty/lacode).
