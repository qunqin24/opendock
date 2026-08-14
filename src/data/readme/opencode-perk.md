# perk

*A minimal mechanism for letting a harnessed model perk up at the outside world.*

> **Proof of concept.** This repo demonstrates a general pattern: giving an
> agent a controllable way to *speak out of turn*, woken by the world rather
> than only by a human typing. The reference implementation is a small modular
> plugin for [opencode](https://opencode.ai), verified against **1.18.3**, with a
> generated single-file bundle for drop-in installation. The pattern is not
> specific to opencode. If you maintain a different agent harness, steal it.

## The idea in one sentence

`perk` lets a model fire off a background job and get handed a conversational
turn when that job finishes, so the model can react to the world instead of
only responding to the human.

## The gap it fills

A harnessed model today is purely reactive in one direction: the human speaks,
the model answers, the model goes quiet. The only thing that produces the next
turn is a person typing. The model cannot wait on anything, cannot be woken,
cannot speak out of turn. Every "wait for X" is faked by burning a turn on a
blocking call, which freezes the conversation (and the spend) until X resolves.

`perk` adds the missing afferent channel. The model fires a background job, ends
its turn normally, and goes idle. Later, when the job finishes, the harness
injects a turn as if the world had spoken. The human and the world become peers:
either can produce the next turn.

The key realization: **there is no blocking wait to interrupt.**
"User-interruptible waiting" dissolves into "two turn-producers feeding one
serialized conversation." The human typing and the world finishing a job arrive
through the same door.

## One primitive

perk is a single tool.

| Tool | What it does |
| --- | --- |
| `bash_background({ command })` | Run a shell command as a detached fire-and-forget job. Returns *immediately* (does not block) with the job's `pgid` and a capture path expression (`<job-dir>/{out,err,drip,exit}`). When the job finishes, perk injects a turn reporting the exit code and the byte sizes of the captured output. A still-running job can also push interim turns by appending to `$PERK_DRIP` (see [Streaming](#example-stream-interim-events-while-running)). |

That's the whole surface.

## How it works (the pattern)

Two ingredients, both of which most harnesses already have:

1. **A way to inject a turn into a session** out of band (here:
   opencode's fire-and-forget `client.session.promptAsync`).
2. **A sense organ** that watches the observable. perk uses a **stat-poll loop**
   over the files each running job produces: chiefly its *exit-code file*, which
   the job's wrapper writes last, atomically, only when the job is truly done, so
   its appearance is a sound completion signal; and optionally its *drip file*
   (below), tailed for interim events.

When a job's exit file appears, perk injects a turn into the firing session
describing the outcome (exit code or cancellation, captured-output byte sizes).
The wake text is generated, not canned. Captured stderr content remains local in
the reported file and is never copied automatically into the conversation. perk
does not try to avoid landing a turn
mid-flight; an agent that cannot tolerate an interleaved notification should not
be using perk.

A second, optional sense organ makes one job a *stream* rather than a single
end-of-job signal: each job also gets an append-only **drip file**
(`<job-dir>/drip`), exposed to the command as `$PERK_DRIP`. A still-running
job that appends to it (`echo ... >> "$PERK_DRIP"`) pushes interim turns back to
the agent without ever re-arming a new `bash_background`. perk tails the drip
file with the same poll loop and performs **temporal summation**: it withholds
while the file is still growing, and once it settles for one refractory window
(one poll interval) it fires the accumulated bytes as a single turn (a
**spike**). Writes within a window coalesce into one spike; writes spaced
further apart fire as separate spikes. The quiet gap *is* the message
delimiter, so the job needs no framing protocol: to send two separate spikes,
sleep past the window between them. The drip is the stimulus, the spike is the
response, and the two rates are deliberately decoupled by the coalescer, exactly
as a neuron decouples input rate from firing rate. A streaming job's natural
history is zero-or-more spikes, then one terminal exit turn (any unfired drip
tail is flushed as a final spike first, so no byte is dropped). Every injected
turn names its job, so interleaved streams from concurrent jobs stay
disambiguable. A job that never touches `$PERK_DRIP` behaves exactly as the
one-shot original. Drip input is UTF-8 and append-only. perk preserves characters
whose bytes straddle poll reads; if it observes truncation or file replacement,
it emits a diagnostic spike and restarts decoding from the new file. Empty and
whitespace-only writes are retained in the artifact but do not produce turns.

## Install (opencode)

**From npm (recommended).** Add the `latest` npm dist-tag to the `plugin`
array in your `opencode.json` (project or global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-perk@latest"]
}
```

opencode installs it with Bun at startup and `bash_background` becomes available
to the model. No build step on your end.

### Updating the npm installation

`@latest` expresses the intended update channel, but some OpenCode releases can
retain an older resolved npm plugin in their per-plugin cache. When a new perk
release is available, quit OpenCode, then remove only perk's cached resolution:

```bash
rm -rf "${XDG_CACHE_HOME:-$HOME/.cache}/opencode/packages/opencode-perk@latest"
```

Restart OpenCode and it will install the current `latest` release. Maintainers
working from this checkout can run the equivalent command with:

```bash
npm run refresh:opencode
```

**Drop-in single file (no config entry).** The npm package includes a generated
single-file bundle with no runtime dependency beyond the OpenCode plugin SDK.
Download a pinned release into your plugin directory, where opencode
auto-discovers it:

```bash
mkdir -p .opencode/plugin
curl -o .opencode/plugin/perk.js \
  https://unpkg.com/opencode-perk@0.3.0/dist/perk.js
```

Use `~/.config/opencode/plugin/` instead for a global install. Either way, boot
opencode and the tool is live.

## Example: a non-blocking background job

The whole point of the afferent channel is to stop faking "wait for X" by
blocking a turn. Hand `bash_background` a command and nothing else:

```
bash_background({ command: "make build" })
```

It runs the command detached, returns immediately, and captures
stdout/stderr/exit-code to files for you. You end your turn and go idle; when the
build exits, perk hands you a turn reporting the exit code and the byte sizes
of the captured output, so you read the output files only if there
is something worth reading. No polling, no blocked turn, no paths to invent, no
hand-rolled backgrounding. In particular, stderr is not excerpted automatically:
the byte count tells you whether the local `err` file is worth inspecting without
disclosing its possibly sensitive contents to the conversation.

Output and the exit code land under `os.tmpdir()/opencode/perk/` (normally
`$TMPDIR/opencode/perk/` on macOS), which opencode allows its file tools to
access without an external-directory prompt. Each job gets a short random
directory containing `out`, `err`, `drip`, and atomic completion gate `exit`.
Nothing is written into the project. Completed job directories expire after 24
hours.
Runtime logging is off by default; set `PERK_LOG=1` before starting opencode to
write the spool's `log` file, or set it to an explicit path.

## Example: wait on any observable

Because the job is an arbitrary shell command, "wait for X" is just a command
that blocks until X happens, then exits. Anything you can express as a shell
condition becomes something perk can wake you on:

```
bash_background({ command: "until [ -e some.file ]; do sleep 0.3; done" })
```

The poll loop lives inside the command, so perk needs exactly one sense organ (a
job's exit-code file) yet covers any waitable condition: a file appearing, a port
opening, a lock releasing, a sub-process settling.

## Example: stream interim events while running

Sometimes one job has *several* things to report over its lifetime, not just a
final exit. A watcher, a long build with phases, a tail of a log: you want the
job to talk back as it goes, without spawning a fresh `bash_background` per
event. Append to `$PERK_DRIP` (set automatically inside every job) and perk
delivers what you write as conversational turns:

```
bash_background({ command: '
  for page in 1 2 3; do
    sleep 2
    build_page "$page"
    echo "built page $page" >> "$PERK_DRIP"   # one spike per iteration
  done
' })
```

Each `echo` (with the `sleep` ensuring a quiet gap around it) arrives as its own
**spike**: a turn reading `Spike from job 3fa18c2e: built page 2`.
When the loop ends, the usual exit turn follows. So this single call becomes a
continuous incoming stream: zero or more spikes while it runs, then one exit
turn.

The delivery rule is **coalescing by quiet gap** (temporal summation): a burst
of appends that goes quiet for one poll interval is delivered as *one* spike;
appends spaced further apart arrive separately. You therefore control
segmentation purely by timing, with no delimiter protocol: write a multi-line
block in one breath and it lands as one spike; `sleep` half a second between
events you want delivered separately. Inspect what the agent will receive at any
time with `tail -f <job-dir>/drip`, using the directory returned by the tool.
Write UTF-8 by appending only. Whitespace-only appends do not fire; replacing or
truncating the file is a contract violation that produces a diagnostic spike and
resets decoding if perk observes it.

Tear-down is unchanged: a long-lived streaming job (a watcher, a dev server) is
killed with its pgid exactly as below.

## Killing a job, and "die with opencode"

`bash_background` returns the job's **process-group id** (`pgid`). Because
the job is spawned `detached` it is its own process-group leader, so a single
signal to the negated pgid reaps the whole tree (the wrapper, the command, and
anything the command spawned):

```bash
kill -TERM -<pgid>      # leading minus = signal the whole process group
```

This matters for long-lived jobs like preview/dev servers
(`bash_background({ command: "npm run dev" })`): the agent gets a kill
handle instead of an unstoppable orphan. The wrapper catches cooperative
`HUP`, `INT`, and `TERM` signals and atomically publishes a terminal marker such
as `cancelled:TERM`. Interactive listeners receive a cancellation turn, and a
foreground waiter on `exit` resolves. `SIGKILL` cannot be caught and therefore
cannot provide this guarantee.

Jobs also **die with opencode on a graceful shutdown.** The plugin tracks every
running job and group-kills the survivors in its `dispose` hook, which opencode
calls on teardown (verified: a `sleep 90` fired via `bash_background` is
reaped when `opencode run` exits). The one case this cannot cover is a hard
crash or `kill -9` of opencode itself (uncatchable); the returned pgid is the
manual remedy there.

## Interactive vs. headless: end your turn, or block in foreground

perk's wake works by *injecting a turn into a live session*. That assumes the
session is still running after the agent stops.

- **Human present (interactive TUI):** ending a turn means going idle, the
  process keeps running, and the human typing or perk's injection both produce
  the next turn. **Just end your turn.** No blocking, no wasted spend, woken for
  free. This is strictly the right move.

- **No human (headless, `opencode run`):** ending a turn means the **process
  exits**, so there is no idle state to wake and the injected turn would arrive
  into nothing. Instead, block in **foreground bash** on the exit-file path the
  tool already handed you:

  ```bash
  until [ -e <exit-file> ]; do sleep 0.3; done
  ```

  That is the blocking wait, in plain bash, with no plugin machinery. The exit
  file is written only when the job is truly done (output files are flushed
  first, then the exit code is written atomically), so the loop is a correct
  completion gate. When it returns, read the captured output.

When a job is stopped through the documented `kill -TERM -<pgid>` path, the same
gate appears with `cancelled:TERM` rather than a numeric exit code, so this wait
also resolves after cancellation.

If an `opencode run` process itself was started inside a perk job, it inherits the
outer job's environment. perk masks that inherited `$PERK_DRIP` from the nested
harness's foreground shell calls; only a new `bash_background` wrapper exposes a
job-local drip path. This prevents a nested agent from accidentally writing into
its parent's stream.

> **Caveat (poka-yoke gap):** the plugin cannot currently tell from its inputs
> whether it is interactive or headless, so it cannot enforce this; it can only
> advise via the tool description. Closing that gap (detecting run mode and
> hard-steering the agent) is open work.

## Why a dedicated tool and not a flag on `bash`

An earlier design hooked the builtin `bash` and silently rewrote the agent's
`command` into detach scaffolding before running it. Since the transcript is the
agent's only memory, the agent would later read scaffolding it never typed and
conclude it had erred (see issue #2). A separate tool records exactly what the
agent typed; the scaffolding stays inside the implementation where it belongs.

## Scope, and how perk relates to background-*agent* plugins

perk is **the sense, not the plumbing**. It owns waking the agent; it does *not*
own task durability, scheduling, result persistence, or workflow state. That
single inversion is why this is a tiny plugin and not an orchestration platform,
and why the conversational-interrupt problem disappears instead of needing
machinery.

This is the opposite end from delegation plugins like
[`kdcokenny/opencode-background-agents`](https://github.com/kdcokenny/opencode-background-agents),
which is the **efferent** side: delegate a *sub-agent*, persist its distilled
result to markdown so it survives context compaction, and notify on completion.
That plugin is about *what to run and how to remember its output*; perk is about
*how the world gets a turn*. perk does not care what produced the signal: a
build, a timer, a sub-agent, a webhook receiver writing a file. They compose
cleanly: a delegation plugin could use perk as its wake mechanism, or perk can
wrap a sub-agent run directly:

```
bash_background({ command: "opencode run 'do the long research thing'" })
```

If a harness grows native background tasks or event systems, perk consumes or
defers to them and keeps its value as the general "react to any observable"
mechanism.

## Steal this

The reference implementation targets one harness, but the pattern is portable.
If your harness can inject a turn into a live session, you can build perk on top
of it. The watcher can be anything that produces a signal; the filesystem is
just the cheapest universal one.

## Develop (and self-demo this repo)

This repo is package source, not a perpetually-armed demo: it does not load perk
on itself by default. To dogfood your working copy, opt in by symlinking the
source into the local plugin directory (gitignored, so it never gets committed):

```bash
npm install                       # provides @opencode-ai/plugin for the import
mkdir -p .opencode/plugin
ln -s ../../src/index.ts .opencode/plugin/perk.ts
```

opencode auto-loads `.opencode/plugin/`, follows the symlink to `src/index.ts`,
and resolves its sibling source modules, so `bash_background` goes live from
this checkout. Because it is a symlink, edits take effect on the next opencode
start with nothing to copy. This project-local plugin is discovered only when
opencode starts in this worktree; sessions elsewhere continue using any npm
version in the global config. Remove `.opencode/` to disarm local development.

## Try it / verify it

Run the deterministic unit and process integration suite first:

```bash
npm test
```

`npm run check` builds both the normal npm modules and the generated drop-in
bundle before running the suite. Generated output lives under `dist/`, is
included by `npm pack` / `npm publish`, and is not committed.

[`TESTING.md`](./TESTING.md) is a self-test written *for a perk-enabled agent*:
it walks the model through firing background jobs with its own
`bash_background`, blocking on the rendezvous file, and observing itself
getting woken. Point your agent at it to confirm the primitive end to end (and
to feel the round-trip from the inside).

## Name

The agent perks up: ears lifting at a sound from outside. The tool prefix reads
as the gesture.

## License

[MIT](./LICENSE).
