# opencode-vcc-compaction — deterministic LLM-free compaction for OpenCode V2

[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-111827)](https://opencode.ai/docs/plugins/) [![npm version](https://img.shields.io/npm/v/opencode-vcc-compaction?color=8cdb9f)](https://www.npmjs.com/package/opencode-vcc-compaction) [![Node.js 18+](https://img.shields.io/badge/Node.js-%3E%3D18-417e3f?logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![MIT license](https://img.shields.io/badge/License-MIT-22C55E)](./LICENSE) [![CI](https://github.com/jwitmann/opencode-vcc-compaction/actions/workflows/ci.yml/badge.svg)](https://github.com/jwitmann/opencode-vcc-compaction/actions)

**Your long session gets summarized by a model. The summary is invented
text — and the model then reasons from it as if it were fact.**

This plugin removes the model from that step. Port of [`dsh-compaction-vcc`](https://github.com/tingfeng-droid/dsh-compaction-vcc)
(MIT, itself a fork of `TsFreddie/dsh-compaction-instant`), written
directly against `@opencode/plugin/effect` (canonical runtime), so no
convert-to-Effect task ever arises.

On each `compaction` hook the plugin compiles history with a deterministic region compiler and, when a keepID can be picked, sets `event.result = { summary, native: { messages }, metadata: { keepID, vccRev, vccConfigHash } }`. The host takes its `fromHook` short-circuit: the one-line summary persists as the row label, the full checkpoint replays from `native.messages` instead of the summary, the tail rebuilds from `keepID`, and **no model call is made** on the compaction path — proven live on host v2.3.2 (see [`docs/research/vcc-plugin-live-verdict.md`](https://github.com/jwitmann/opencode-vcc-compaction/blob/main/docs/research/vcc-plugin-live-verdict.md)).

Why verbatim: a model asked to summarize fills what it cannot quite recall with plausible wording — invented, fluent, and then treated as factual premise. This engine only moves original text, never rewriting a character: every elision carries a `(seq N)` pointer back to its source event. The model sees original tokens or explicitly marked pointers. Nothing else.

- **LLM-free** — no summarizer prompt, no inference latency, no model token spend.
- **Verbatim** — prior checkpoints carried over word for word, never re-summarized.
- **Deterministic** — same messages + config → byte-identical checkpoint.
- **Measured** — full sweep in [Performance](#performance).
- **Fail-safe** — when no keepID can be picked, or the compiled outcome fails validation (blank summary, blank checkpoint, missing keepID — nothing a retry could fix, the compiler is deterministic), the hook abstains and the host falls back to model compaction. Never a broken summary.

## How it works

The adapter (`adapter.mjs`, pure offline) maps the request messages to
compile nodes, runs the deterministic reference compiler (`engine/`),
and sets:

```js
event.result = {
  summary, // one-line label — the TUI renders only this, so the row stays collapsed
  native: { messages: [{ role: "user", content: [{ type: "text", text: checkpoint }] }] },
  metadata: { keepID, vccRev, vccConfigHash },
}
```

`keepID` is the id of the first message the host must keep: the last
`keepMessages` request messages stay verbatim, everything older compiles
into the checkpoint. `vccRev` (engine revision) and `vccConfigHash` (stable
hash of the resolved config) stamp which compiler and knobs produced the
checkpoint. When no message id exists at/after the keep cut, the
adapter abstains — `result` stays unset and the host falls back to model
compaction. Never a broken summary.

## Example

Seven messages (user request, assistant text + two tool calls, results,
follow-ups) compile to a one-line summary plus the full checkpoint — the
summary is what the TUI renders (one collapsed row), the checkpoint is what
replays as context via `native.messages`. Verbatim, the real output:

Summary:

```text
compaction checkpoint: 7 messages -> 8 entries
```

Checkpoint (single `native.messages` user message):

```text
This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context. Treat the captured context as established background and build on it without restating it. Continue the task directly from the messages that follow, without acknowledging this checkpoint.

<compacted-checkpoint>

RECALL: append-only log — nothing is lost. `recall` restores original content: type "seq", id "3-7"; "result", id "3"; "checkpoint", id "1" (`[checkpoint N]` = dropped). `search` finds by keyword.

[opencode-vcc-compaction vcc-compiler-debug-2: 7 messages -> 8 entries]

[user]
please fix the login bug — sessions expire after 60 seconds

[assistant]
on it, checking the session middleware first

* read "src/auth/session.js" (seq 2 -> result 3)

[tool]
const TTL = 60; // seconds ...

[assistant]
* edit "src/auth/session.js" (seq 4 -> result 5)

[tool]
edited 1 file

[assistant]
fixed — TTL is now one hour. Want me to check the logout path too?

[user]
yes, and also verify refresh tokens still work

</compacted-checkpoint>
```

Every tool call is one line — `* name "key argument" (seq N -> result M)`.
The `-> result M` pointer keeps each result one lookup away. Long text is
truncated to its budget with a `...(truncated from seq N)` marker naming
the event that still holds the full content.

## Why keeping original tokens prevents hallucination

Ask a model to summarize history and it fills the details it cannot quite
recall with plausible-sounding wording — **and that filled-in material is
invented, not factual**. Worse, it reads fluently, and the model then treats
**its own summary as a factual premise**. A paraphrased number, a reworded
caveat, or a dropped precondition is enough to put a whole downstream chain
on a false footing.

This engine **only moves original text, never rewriting a single
character**: every elision carries a `(seq N)` pointer back to the original
event. So the model ever sees two things: **original tokens**, or **an
explicitly marked pointer saying content was elided here**. There is no
third kind. Pointer-based archiving costs a few bytes per elision,
essentially independent of history length — while a summary has to cover
more the longer the session gets, with more chances to rewrite and lose
information.

## Key features

- **LLM-free** — compaction never invokes a model. No summarizer prompt, no
  inference latency, no model token spend; the compile is deterministic
  text processing.
- **Verbatim** — output contains only original tokens. Prior checkpoints
  are copied word for word instead of being re-summarized.
- **Deterministic** — the same messages + config always compile to the
  byte-identical checkpoint (proven by double-run selftests).
- **Measured** — 4,998 mixed messages compile to a ~28k-character checkpoint
  in ~0.4 s on the dev machine, byte-identical across runs (see
  Performance).
- **Fail-safe** — no keepID (or a failed outcome validation), no result:
  the host falls back to model compaction rather than persisting a broken summary.

## Performance

Single-threaded `node`, no model, no network. Measured on the dev machine
(Xeon W-2195, node v24.22.3) with synthetic mixed histories (user text +
assistant text + tool-call + tool-result, default config), best of 3 runs.
Input sizes are request-payload characters with ÷4 token estimates
(reproduce: `node scripts/bench.mjs`):

| History | Input | Checkpoint | Time |
| --- | --- | --- | --- |
| 999 messages | ~585k chars (~146k tokens) | 27,901 chars | 71 ms |
| 4,998 messages | ~2.9M chars (~0.7M tokens) | 28,105 chars | 395 ms |
| 9,999 messages | ~5.9M chars (~1.5M tokens) | 28,151 chars | 856 ms |
| 24,999 messages | ~14.6M chars (~3.7M tokens) | 27,983 chars | 3.1 s |

Two things to read off this table:

- Compile time scales roughly linearly with history size — the pass is a
  single deterministic walk, and every run above was byte-identical.
- Checkpoint size stays flat because the default `maxTokens` cap (8192 entry
  tokens) binds: bigger histories elide more rows, they don't emit more
  text. Raise the cap if you want larger checkpoints, at the cost of more
  context per compaction.

Cost shape (profiled 2026-11-22, 10k-message compaction): ~96% of the
time is the region compile (~70% of that is tokenization — counting is
the work, not waste), and the elision passes keep a running token total
rather than recounting per eviction. Mapping, framing, config hashing,
outcome validation, and snapshot retain together round to ~0%. The
hook additions cost one storage read plus microseconds per compaction
event and nothing per turn. Over-budget checks test the O(1)
length-density guard before tokenizing (semantics-preserving; see the
engine header), so small tool results skip counting entirely.

Caveats: synthetic repetitive text, one machine, one node version —
indicative, not a benchmark. Real sessions vary with text shape
(long tool outputs and base64 blobs cost more per message), but the
scaling shape (linear time, cap-flat output) follows from the algorithm,
not the input.

## Install

Requires OpenCode `v2.x` (live-verified on `v2.3.2`).

```bash
opencode plugin add opencode-vcc-compaction
```

Or declare it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-vcc-compaction"]
}
```

String and object forms can mix in one `plugins` array.

With options (all optional; defaults in Configuration below):

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "opencode-vcc-compaction",
      "options": { "maxTokens": 8192, "keepMessages": 6 },
    },
  ],
}
```

The package is self-contained: the adapter imports the engine from
`./engine/` inside the package, so it installs from npm alone.

From source instead: clone
`https://github.com/jwitmann/opencode-vcc-compaction` and register the
local path (`"package": "/abs/path/to/opencode-vcc-compaction"`)
in the same object form.

Optional `opencode.jsonc` addition — auto-compaction threshold:

```jsonc
{
  // Fire auto-compaction once history passes (window − buffer).
  // "99%" (fire at ~1% of window) is the demo-harness trigger for cheap
  // live runs (see examples/opencode.jsonc); the override mechanism
  // is threshold-independent, so leave the default in production.
  "compaction": { "buffer": "99%" },
}
```

## Configuration

Options are the engine budgets plus behavior (all optional, upstream
defaults shown). Unknown keys are ignored; non-positive or non-finite
numbers fall back to defaults.

| Key | Default | Meaning |
| --- | ------- | ------- |
| `maxTokens` | 8192 | total cap on compiled entry tokens |
| `textTokens` | 8192 | per-block assistant text budget |
| `userTextTokens` | 16384 | per-block user text budget |
| `toolCallTokens` | 128 | tool one-liner budget |
| `toolResultExcerptTokens` | 256 | tool-result excerpt budget |
| `toolErrorExcerptTokens` | 256 | failure-result excerpt budget (larger: failures are not one recall away) |
| `toolResultPointerTokens` | off | success results over this token count collapse to a recall pointer; errors never collapse (remove the key to disable after setting it — JSON has no Infinity) |
| `includeReasoning` | false | keep reasoning blocks (else elided) |
| `hideTools` | [] | tool names dropped entirely |
| `noisePatterns` | [] | extra strip regex sources (strings) |
| `keepMessages` | 6 | trailing messages kept verbatim |
| `snapshotMaxMessages` | 50 | snapshot store keeps newest N messages across compactions |
| `snapshotFullPayloadMessages` | 20 | newest N keep full tool-result payloads; older age out to markers |

`noisePatterns` entries must be valid regex sources — an invalid one
throws loudly at setup, never a silent no-strip.

How the budgets behave:

- Every budget is enforced twice — by token count **and** by a
  `budget × 4` character ceiling (floor 32) — so pathological unbroken
  runs (base64 blobs, minified files) cannot bypass them.
- Tool calls are **always one line**: they are never rescaled. Truncation
  marks the cut with `...(truncated from seq N)`.
- Over-long tool results keep head and tail with an
  `...(elided from seq N)` middle, since the end (listings, logs) usually
  matters more than the middle.
- Under cap pressure the oldest **tool/result rows go first**
  (`[N tool/result entries elided: seqs a-b]`), then the oldest remaining
  entries (`[N earlier entries elided: ...]`) — tool calls can never squeeze
  the dialogue out. The newest content always survives, and a
  `[cap enforced at N entry tokens]` footer says the cap bit.
- Dropped prior checkpoints never vanish silently: each leaves a
  `[checkpoint @ seq N]` line (the seq-fallback form — this path supplies
  no checkpoint ordinals).
- `keepMessages` counts request messages, not entries: the host rebuilds
  the verbatim tail from `keepID`, the checkpoint covers everything older
  (the summary is only the one-line row label).

## Seq pointers, recall, and search

`(seq N)` ordinals are 1-based positions over the compiled messages
(skipped messages consume no seq), not durable host ids. Every checkpoint
heads with a short RECALL guide telling the model how to recover elided
content; the `/vcc-recall` and `/vcc-search` commands below resolve those
pointers against the per-session snapshot.

## Commands

Server slash commands (plus the `./tui` companion below):
`/vcc-recall`, `/vcc-search`,
`/vcc-status`, `/vcc-compaction`. Command invocations cannot read history directly, so the
`context` hook (with `compaction` as backup) persists a cleaned snapshot
of the session's messages to `ctx.storage` (`vcc-snapshot/<sessionID>`,
growth-guarded by version/count/lastID); the commands read that
snapshot. Single writes over ~1MB log a warn tripwire (per-session
max/trip stats live under `vcc-stats/`). A snapshot written on every
context event is fresh enough for recall/search; `/vcc-status` reports
its age.

- `/vcc-recall <seq selection> | result <ref> | checkpoint <ref>` —
  restore exact original content, e.g. `/vcc-recall 3-7`,
  `/vcc-recall result 3`, `/vcc-recall checkpoint 1`. Replies with the
  recalled text plus an event/token count header.
- `/vcc-search <keyword-or-regex>` — e.g. `/vcc-search login`.
  Replies with `(seq N)` hits plus a recall call-to-action.
- `/vcc-status` — engine revision, resolved config
  (`maxTokens`/`keepMessages`/reasoning/hide/noise counts), per-session
  compaction switch state, and snapshot
  freshness (version, message count, lastID, age).
- `/vcc-compaction [on|off]` — per-session switch for deterministic
  compaction (stored under `vcc-switch/<sessionID>`, defaults on).
  Bare invocation reports state; `off` makes the hook abstain (host
  native fallback) while snapshots keep running, so recall/search
  still work when re-enabled.

Results travel as an RPC event the TUI companion renders: each command
emits `rpc.opencode-vcc-compaction.replied` and returns void with no
prompt call, so there is no model turn and no chatter — the TUI toasts
short replies and dialogs long ones (see `./tui` below). This requires
the companion: add the package to `cli.json` `plugins`. Without a
connected TUI the emit goes nowhere and the reply is silent — by
design (no wake), so non-interactive use stays quiet. Only when RPC
itself is unavailable (or an emit fails) do replies fall back to
`session.prompt`, where the agent presents them.
A nothing-to-do stays silent (log line only, never an empty agent turn);
a storage read failure replies explicitly ("snapshot read failed, try
again in a moment"), never a misleading "none yet". Unexpected command
errors attempt a visible "command failed, try again" prompt reply before
giving up to the log.

## TUI companion (`./tui` export)

`tui.tsx` listens for the reply event and renders it immediately: short
replies as toasts, long ones as large centered dialogs. No keymap
commands — none are needed, since the event carries its session. Add
the package to `cli.json` `plugins` (same package, `./tui` entrypoint;
TUI-only surface, also works against a remote server). The reply itself never lands in the transcript;
the companion is the quiet visible channel.

## Message mapping

OpenCode parts map to compiler blocks as follows: text → text; reasoning
→ reasoning (elided unless `includeReasoning`); tool-call → one-liner
(`arguments: JSON.stringify(input)`, unparseable input falls back to
name-only); tool-result → single text block via projection (json →
compact `JSON.stringify`, text → as-is, error → `[error] ...`, content →
`TextContent` joined / `[file name]` / `[type]`); media → image iff
`mediaType` starts with `image/`, else document; `compaction` part with
text → synthesized checkpoint node, as does a replayed native window
(plain user message carrying the `<compacted-checkpoint>` tags) — prior
checkpoints carry over verbatim either way; `compaction` with null text
and system-role messages →
skipped; `effort` parts are dropped but the message shell is kept with
empty content, so seqs still align.

## Tokenizer

Character-class heuristic, verbatim from upstream: ASCII letter runs and
digit runs count as one token each, punctuation is per-character,
whitespace is free, and CJK-density characters (CJK, kana, hangul, Thai,
Lao, Indic scripts) carry extra weight. Every cut lands on a code-point
boundary — emoji and astral characters always survive intact. ANSI escapes
and control bytes are stripped deterministically before counting.

## Layout

- `index.ts` — thin Effect wiring only (`Plugin.define` + `Effect.fn` +
  `session.hook` + `command.transform`). No logic beyond config →
  `compileCompaction` → assign (one-line summary plus the single-message
  native window), growth-guarded snapshot remember, RPC
  reply emit with prompt fallback, and the four `/vcc-*` command
  registrations.
- `adapter.mjs` — pure mapping + compile (unit-tested, no host). See its
  header for the vocabulary mapping (tool args, tool-result projection,
  checkpoint synthesis, skip cases, tool-link seam).
- `snapshot.mjs` — snapshot store + command policy (clean/build,
  growth-guarded write check, recall/search arg parsing, selection
  resolution, reply formatters, status text). Unit-tested; the only
  module `index.ts` imports command-side.
- `events.mjs` — reply-event contract (`rpc.opencode-vcc-compaction.replied`
  type string + payload build/validate); the single source of truth both
  `index.ts` and `tui.tsx` import.
- `tui.tsx` — the `./tui` companion (toasts short replies, dialogs long
  ones; passive listener, no keymap).
- `engine/` — the VCC reference engine, ported verbatim from upstream
  (`tokenize`, `compile`, `recall`, `session-compat`, `search`). Ships
  inside the npm tarball as published.
- `selftest.mjs` + `engine/selftest.mjs` — adapter/command vectors and
  engine stage vectors (`npm run test` runs both).
- `examples/` — scratch project registering the repo root with a cheap
  `compaction.buffer` trigger for live runs (never run from a real project).
- `scripts/` — release + changelog flow (tag-triggered publish) plus the
  perf bench (`bench.mjs`, behind the Performance table).
- `docs/research/` — verdicts grounding the release claims.
- `archive/` — frozen history, not maintained: the closed probe harness,
  the deciding spec, the reuse inventory, and the port plans. Do not extend.

## Verify

```sh
npm run typecheck   # node --check index.ts + tsc -p tsconfig.tui.json
npm run test        # both selftests
npm run lint:md     # markdown lint over the tree
```

Live compaction runs only with explicit approval + explicit `--model`,
from the scratch project, never a real one.

## Status and limits

- Ships the hook + four server slash commands
  (`/vcc-recall`, `/vcc-search`, `/vcc-status`, `/vcc-compaction`) plus the `./tui`
  companion that renders their replies quietly. `(seq N)`
  pointers are 1-based ordinals over the compiled messages (skipped
  messages consume no seq); recall/search resolve them against the
  per-session snapshot.
- Multi-result tool messages link the first result id only
  (`message.toolCallId` carries one id); the rest still compile as text.
- `effect` comes from the host instance — declared as peer
  (`effect ^4.0.0`, `@opencode/plugin ^2.0.0`), never bundled.

MIT licensed — see [`LICENSE`](https://github.com/jwitmann/opencode-vcc-compaction/blob/main/LICENSE).
