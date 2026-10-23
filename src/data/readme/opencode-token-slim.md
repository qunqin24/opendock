# opencode-token-slim

An OpenCode plugin that makes the payload smaller on every model call: old
reasoning, oversized tool results, old screenshots, and stale call arguments
are shortened before they leave the machine. Nothing is deleted — what is cut
goes to a file on disk, and the model is told where it is.

It is one TypeScript file with no dependencies. It runs in front of OpenCode's
own truncation, so it sees the real text, and it is the last thing that touches
the request.

| what | measured |
|---|---|
| tokens on a coding task | **48% fewer** (29,319 → 15,190, three runs each way) |
| payload, long coding session | **81% smaller** (5.4 MB → 1.04 MB) |
| payload, screenshot-heavy session | **97% smaller** (52.6 MB → 1.6 MB) |
| quality | the same answers with the plugin on and off, on 6 tasks that need a real model (see [Quality](#quality)) |
| cost when idle | nothing; it never calls the network |

- [Why](#why) · [Install](#install) · [What it does](#what-it-does) ·
  [What it saves](#what-it-saves) · [Quality](#quality) ·
  [Safety](#safety) · [snip](#snip) · [Commands](#commands) ·
  [Options](#options) · [Tests](#tests)

## Why

OpenCode rebuilds the LLM message list from the session on every request:
system prompt, tool schemas, and every message, every reasoning block, every
tool call, and every tool result. A 1,500-message session that read a few
hundred files sends six megabytes of text to answer a question about the last
one. The provider charges for all of it, and past a point it stops fitting in
the context window at all.

Two things are worth knowing before choosing a number:

- **History dominates.** The system prompt and the tool schemas are ~48 KB and
  fixed. Everything else is the conversation, and it only grows.
- **A cut has to be stable.** Providers cache the prompt prefix. A rule that
  changes the prefix on every request costs more than the bytes it saves,
  because the whole history is re-read at full price.

## Install

From npm, in `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugins": ["opencode-token-slim"]
}
```

OpenCode installs the package itself. There is no `npm install` step and no
build step: OpenCode runs the TypeScript directly.

With options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-token-slim",
      "options": {
        "reasoningBytes": 80000,
        "resultKeepBytes": 32000
      }
    }
  ]
}
```

From a checkout, if you want to change the plugin itself:

```jsonc
{
  "plugins": ["F:\\path\\to\\opencode-token-slim"]
}
```

From a GitHub fork, before it is published:

```jsonc
{
  "plugins": ["github:you/opencode-token-slim"]
}
```

Restart OpenCode after changing the plugin or its options.

Two rules of thumb, both from getting it wrong:

- Do not edit the plugin while the session is running against it unless you
  have a copy. A broken module fails every request of that session, including
  the ones that would let you fix it.
- Keep `"enabled": false` in your back pocket. It turns the plugin off without
  removing it from the config.

## What it does

One rule: **walk the request from the newest end, accumulate bytes, and shorten
what falls before the budget.** The budgets are in bytes, not messages, so the
same amount of content is kept whatever the model happened to write.

1. **Byte budgets, not message windows.**

   | kind | kept whole | next band | the rest |
   |---|---|---|---|
   | reasoning | 80 KB | — | dropped, one stub line |
   | tool results | 32 KB | 48 KB as a head+tail digest | a pointer to the file on disk |
   | images | inside the result budgets | — | one line naming the file it was read from |
   | tool calls | 8 KB | — | long string arguments cut to 200 bytes each |
   | assistant text | 16 KB | shortened, head **and** tail | — |
   | system prompt | 24 KB | cut on safe boundaries | — |
   | tool schemas | 10 KB | never cut mid-signature | — |

   A budget is a total over the whole stream of that kind, never a per-part
   ceiling. Applying the call budget a second time inside the trimmer left
   every call under 8 KB whole, so a session with two thousand 7 KB calls
   replayed all fourteen megabytes of them.

2. **The cut only moves on a step.** The cut is a byte position measured from
   the *start* of the history, rounded down to a 16 KB step. The history only
   grows at the end, so the position means the same thing on every request, and
   it only MOVES when a whole step has accumulated. Between moves the request is
   byte-identical and the provider's prompt cache still hits.

3. **The newest content is never cut.** The newest 32 KB of reasoning is kept
   whatever the budget says: that is the model's current train of thought. The
   newest result of each kind is kept whole too, even when it is bigger than the
   budget, because it is what the model is looking at right now. Reasoning that
   carries a provider signature is never touched: Anthropic-style thinking
   blocks must be replayed byte-identically or the provider rejects the request.

4. **Old tool results become a pointer, not a summary.** The full text is
   written to disk and the result is replaced by one line naming the file. The
   model can read it back if it needs it; nothing is lost, it is just not
   inlined. The band just below it keeps a head+tail digest, because the model
   may still be working with those. The digest keeps the head and the tail as
   *contiguous line ranges* and names the omitted range, so the result never
   looks like a file with a corrupt region. The first and last line are always
   kept — clipped to the budget if they are too big — because a digest that
   starts or ends mid-file leaves the model with nothing to orient itself by. A
   digest that would come out larger than the original is dropped in favour of
   the original, and so is any replacement: the payload must never grow.

   This runs *before* OpenCode's own `tool_output` truncation, so the digest
   replaces the head-only cut OpenCode would otherwise make. The tail is kept,
   which is the part OpenCode throws away.

5. **Old images become a line naming their file.** A `read` of a png returns it
   inline as `{type:"file", uri:"data:image/png;base64,…"}` — about 170 KB of
   base64 per screenshot, and no text at all, so every text rule walks past it.
   One measured session carried 280 of them: 47 MB of a 48 MB payload, of which
   the plugin was cutting 2%. The item names the file it was read from, so it
   becomes one line that says so, and a re-read gets the image back. No copy is
   written to the cache: the bytes are already on disk, where they came from.

6. **The system prompt and tool schemas are capped** — cut on safe boundaries
   (a tool listing is never cut mid-signature) and the JSON schema shape is
   always preserved. The cap trims *to* the budget, not past it: cutting by the
   excess rather than to the target threw away several KB of system prompt the
   cap never asked to remove.

7. **A short behaviour brief is added** — the cheapest saving of all, because it
   stops the agent re-reading the same file and re-running the same command
   instead of compressing what it already did.

8. **Provider item ids are dropped** (opt-in, see `stripItemIds`) — the OpenAI
   Responses API replays a stored id for every tool call and reasoning block, and
   620 of them cost 58 KB per request. Dropping the ids lets the API match calls
   by content instead; the pairing rules are checked in `itemid-test.ts`.

## What it saves

### Tokens

A benchmark coding task — 15 interfaces, 4 type aliases, a paginated API client,
one deliberate trap — run three times with the plugin disabled and three times
enabled, seeded at temperature 0:

| run | without | with |
|---|---|---|
| 1 | 29,319 | 15,190 |
| 2 | 29,334 | 15,073 |
| 3 | 29,369 | 15,097 |
| **mean** | **29,341** | **15,120** |

**48% fewer input tokens, same output.** The answers were checked against the
trap by `quality-test.ts`, which parses the plugin's output and asserts the
behaviour; the A/B run lives in `quality-live.ts` and needs a model endpoint.

This is a *coding* task with a few large file reads. A session that reads
screenshots, dumps logs, or greps a large tree saves much more.

### Payload

Two real sessions, replayed through the real `context` hook:

| session | untouched | sent | cut |
|---|---|---|---|
| a long coding session, 1,022 messages | 5.4 MB | 1.04 MB | **81%** |
| a screenshot-heavy session, 2,038 messages | 52.6 MB | 1.6 MB | **97%** |

Where it went, in the coding session:

| kind | untouched | sent | cut |
|---|---|---|---|
| reasoning | 2,473 KB | 78 KB | 97% |
| tool results | 2,186 KB | 273 KB | 88% |
| tool calls | 732 KB | 643 KB | 12% |
| own text | 102 KB | 64 KB | 37% |
| system + tools | 48 KB | 10 KB | 80% |

The call band looks poor because it *is* poor: each surviving call keeps a
200-byte excerpt per string argument, and a thousand calls at that rate is
600 KB. Dropping the excerpt entirely would save another 400 KB and leave the
model unable to tell one call from another.

### Every session length

One session replayed at growing prefixes — the same hook, the same rules:

```
messages   payload before   payload after   reduction
      20           255 KB           141 KB       44.6%
      60           453 KB           174 KB       61.6%
     100         1,358 KB           149 KB       89.0%
     200        10,677 KB           228 KB       97.9%
     440        19,061 KB           311 KB       98.4%
   1,986        52,578 KB         1,626 KB       96.9%
```

The saving is not a fixed percentage, and it was never meant to be.

### What the percentage actually means

The plugin subtracts a floor; it does not cut a share. The percentage is
`1 − floor / history`, so it climbs with the session:

- at 20 messages the payload is 255 KB and the floor is 141 KB → 45%
- at 2,000 messages the payload is 52 MB and the floor is 1.6 MB → 97%

The floor is what the rules above refuse to cut:

| floor piece | size |
|---|---|
| newest reasoning | 32 KB |
| newest results | 32 KB |
| results kept as head+tail digests | 48 KB |
| own text | 16 KB |
| call arguments, plus the newest call whole | 8 KB + one call |
| system prompt and tool schemas, after the cap | ~10 KB |

So the answer to "the report says 80%, but I saw 50%" is that both are right.
A short session is mostly floor: 459 KB of history, trimmed to 225 KB, is 51%.
A long one is mostly history. `/slim-stats` prints both numbers — *this
request*, which is noisy, and *largest request this session*, which is the one
worth quoting. The percentage also dips right after a big tool result arrives,
because that result is genuinely inside the kept region while the model uses
it, and climbs back as it ages out.

## Quality

The question that matters is not "how small" but "did the answer change".
Three things are checked offline, on every `npm test`:

- `quality-test.ts` — the newest reasoning, result and call are kept whole,
  every elided result names a file that exists and holds the original text,
  and every digest is the real head and tail of the result it replaces.
- `stress-test.ts` — **290 assertions** over the trimmers themselves: a
  corpus of hostile inputs (a megabyte on one line, NUL bytes, CRLF, a png in
  a text slot, text that quotes a marker) times the invariants that must hold
  for all of them, plus the boundaries a corpus cannot see (a 199/200/329/400
  byte argument, a protected path that is a prefix of another, a step edge).
  The suite refuses to run fewer than 100 checks, so the number in this README
  cannot drift.
- `regress-test.mjs` — every bug found in production, written the way it
  failed.

`quality-live.ts` is the one that needs a model: 6 tasks against a real
session, plugin off and then on, each answer checked against a value computed
in the script. Run it with `npm run quality-live`.

Three rules hold whatever the suite says:

- The digests are conservative on purpose. A result is never replaced by a
  summary an LLM wrote; it is replaced by its own head and tail, or by a
  pointer to the exact bytes.
- A result whose text is protected (`protectPaths`, `protectTools`, or the
  plugin's own source) is never trimmed.
- The payload never grows: any replacement bigger than what it replaces is
  dropped, and the behaviour brief is only added to a request that was
  actually trimmed.

## Safety

Two failures matter more than any saving: a session that cannot read the file
it is editing, and a session that cannot get back content it needs.

### Self-protection

A plugin that trims the context can trim the context the agent is using to edit
*this plugin*. The agent reads a half-truncated `index.ts`, writes an edit back
that does not match the real file, and the plugin is left broken — with the
trimming still in place, so the next read is truncated too. That is how a
session locks itself out.

The plugin's own source directory is protected by default, with no
configuration, so a session editing the plugin always reads the real file.
`protectPaths` protects anything else you name; `protectTools` protects whole
tools whose output must be read in full to act on it. A protected result is
counted in the report as *left alone*, so it is visible rather than silently
costing tokens.

The protection is a hard rule: a protected result is never digested, never
collapsed as a duplicate, and never counted as a saving. It applies to the
result the tool returns, which is what the agent reads. The *old copies* in the
history are still elided — the agent read them already, and the pointer names
the file, so nothing is lost.

### Undo

The source trim is persisted: a result that was digested when it arrived is
stored as a digest, so OpenCode's undo cannot bring the original back — the
marker in the session is all that is left. The full text is on disk, so the
plugin undoes the marker too.

On every request, a marker that now sits inside the kept region is read back
from its file and sent whole again. That is exactly where undo puts it:
rewinding the session makes a result the model had already used the newest
thing it has again. The restore is bounded by the kept region itself
(`resultKeepBytes`): a result bigger than the region, or a file that is gone,
stays a digest.

A marker is never replaced by a digest of itself, and image pointers are not
mistaken for text markers (which would try to restore a png as utf8).

## The request hook

There is a natural temptation: trim the session once, persist it, and never pay
again. It does not work, and the way it fails is worth knowing.

`session.context` hands the hook a freshly built message list on every request.
It is not the object the session stores, and OpenCode does not save what the
hook leaves behind. A plugin that "remembers" what it trimmed reports a saving
that never happened: an early version of this one remembered a single "pruned
up to here" marker, assumed the pruning had been persisted, and re-sent all 40
reasoning blocks on the next request while claiming 1% off.

So the hook is stateless, and the trimming is done in full on every request.
That is also why the cut has to be stable: it is recomputed from the same
history, in the same way, to the same bytes.

The one place the trim *is* persisted is `tool.execute.after`: a result above
`resultBytes` is digested at the source, so the oversized text never reaches
the session in the first place. Everything else is a per-request decision.

## snip

`snip` is optional. When it is on PATH, shell output is piped through it before
it reaches the context: `git status` from 120 lines to 4, `ls -R` to the files
that changed. The plugin hooks `bash`, asks snip for a rewrite of the command,
and runs the rewritten one — the original is used as written if snip declines,
errors, or takes longer than `snipTimeoutMs`.

If snip is not installed, nothing happens and nothing breaks.

## Commands

- `/slim-stats` — what the plugin has cut in this session: both payload sizes,
  the largest request, and a breakdown by kind with the bytes and the count. The
  numbers are cumulative over the session and survive a restart; the per-part
  counters count each part once, no matter how many requests re-send it.

  The full report goes to `~/.local/share/opencode/slim-stats/` as a text file
  and as JSON, and the chat gets a five-line summary with the file path.

## Options

| option | default | meaning |
|---|---|---|
| `reasoningBytes` | 80000 | bytes of reasoning kept whole, measured from the newest end |
| `reasoningKeepBytes` | 32000 | bytes of the newest reasoning never cut, whatever the budget says |
| `stairBytes` | 16000 | how much has to accumulate before the cut moves (keeps the prompt cache warm) |
| `resultKeepBytes` | 32000 | bytes of tool results kept whole, measured from the newest end |
| `resultDigestBytes` | 48000 | bytes of tool results kept as a head+tail digest; older ones become a pointer |
| `callKeepBytes` | 8000 | bytes of tool-call arguments kept whole; older calls have their long arguments shortened |
| `textKeepBytes` | 16000 | bytes of the assistant's own text kept whole |
| `elideFloorBytes` | 512 | the smallest result worth replacing — below this the marker costs more than the content |
| `resultBytes` | 12000 | a new tool result above this size is digested at source, before it is persisted |
| `headBytes` | 3000 | bytes kept from the head of an elided result |
| `tailBytes` | 1500 | bytes kept from the tail of an elided result |
| `toolOutputBytes` | 51200 | the size at which OpenCode would truncate a result on its own; the plugin runs first, so its digest replaces that head-only cut |
| `systemBytes` | 24000 | cap on the system prompt |
| `toolBytes` | 10000 | cap on the combined tool schemas |
| `duplicateBytes` | 2000 | minimum size of a repeated result before it is collapsed |
| `stripItemIds` | `[]` | providers whose replayed provider item ids are dropped |
| `keepFullOutput` | true | write the full text next to the digest. With it off, old results are digested instead of pointed at, and the saving is smaller |
| `directory` | `~/.local/share/opencode/slim-output` | where full outputs go |
| `statsDirectory` | `~/.local/share/opencode/slim-stats` | where the per-session counters are kept, so they survive a restart |
| `protectPaths` | `[]` | paths whose results are never trimmed (the plugin's own directory is always protected) |
| `protectTools` | `[]` | tool names whose results are never trimmed |
| `enabled` | true | turn the plugin off without removing it from the config |
| `snip` | true | filter shell output through snip before it reaches the context |
| `snipPath` | `""` | path to the snip binary; empty resolves it from PATH |
| `snipTimeoutMs` | 2000 | give up on a snip rewrite after this long and run the command as written |
| `maxDiskBytes` | 268435456 | cap on the full-output directory (256 MiB) |

`stairBytes` is the knob to reach for if your provider has no prompt cache, or
if you see cache misses: raising it moves the cut less often and keeps the
prefix stable for longer. Lowering the budgets trims harder.

## Report

`/slim-stats` reports three different things, and mixing them up is how a
report starts lying:

- **Payload, both sizes** — measured on the real request: the message list the
  provider is about to receive, before and after the hook.
- **Cut by kind, on this request** — where the bytes went, right now.
- **Removed from the context, cumulatively** — bytes that are gone from the
  payload for good, counted once per part.

Each part is counted once, no matter how many requests re-send the history, and
the behaviour brief is measured on both sides instead of being folded into one.
A restore gets its own line, because it is the one thing that gives bytes back,
and the percentage is clamped at zero — "-12% smaller" is not a sentence.

Bugs this report has had, all of them found by not believing it:

- Tool results split across many text items were digested once and the digest
  written into every slot: 80 KB became 188 KB, and the plugin made the payload
  larger.
- The behaviour brief was counted in the size after the hook but not before, so
  every session looked like it was growing by 795 bytes per turn.
- The call budget was applied twice, so nothing under 8 KB was ever trimmed
  while the report called it "kept".
- Call arguments, own text, and protected skips were counted once per *request*
  instead of once per part, so a single 60 KB write was reported as 60 KB saved
  on every turn.
- The percentage was computed without a floor, so a request that grew printed
  as a negative saving.

## Tests

Eleven suites, no network, no fixtures:

| file | what it pins down |
|---|---|
| `test.ts` | the byte budgets, the band edges, and the digest shape |
| `digest-test.ts` | head and tail survive; a digest never exceeds the original |
| `counters-test.ts` | the report counts each part once, and never a protected one |
| `itemid-test.ts` | tool-call and reasoning pairing after provider ids are dropped |
| `plugin-test.ts` | hook registration, option parsing, `enabled: false` |
| `protect-test.ts` | protected paths and tools are untouched, in arguments too |
| `snip-test.ts` | snip's rewrite, its failure, its timeout, and Windows quoting |
| `report-test.ts` | the report lines and their arithmetic |
| `quality-test.ts` | the kept region, the files behind the markers, the digest shape |
| `stress-test.ts` | 224 assertions: hostile content, exact boundaries, a fixed point |
| `regress-test.mjs` | the bugs found in production, in the order they were found |

That is eleven files, all run by `npm test` except the live one below. The
regression suite is the interesting one: it exists because each of those bugs
shipped, and the assertion for a bug is written the way it failed — a
2,000-call history that must still be trimmed, a 40 KB result that must still
be a digest after an undo, an image pointer that must not be restored as text.

### Benchmarks

```
npm run bench            # replay the longest local session through the hook
npm run bench -- --curve # the same, at every 25th message, to see the shape
npm run consistency      # one session at many lengths, for the swing test
npm run quality-live     # real model, plugin off then on, answers compared
```

`bench` and `consistency` read the local OpenCode database, pick the longest
session, and replay its prefixes through the real `context` hook. No model is
called, so the numbers are the plugin's own arithmetic on real content.

`quality-live` is the only one that costs tokens: it solves a task with the
plugin off and then on, and checks every answer against a value it computes
itself. It edits `opencode.json` to toggle the plugin and restores it
byte-for-byte at the end.

## Notes

- **The prompt cache.** The digest text and the pointer path are stable across
  requests: the same content hashes to the same file name, so the cached prefix
  stays intact until the cut moves a step.
- **The disk cache is a cache.** Full outputs are written to
  `~/.local/share/opencode/slim-output`, content-addressed, and the directory is
  capped at 256 MiB. Files the current request still points at are evicted last.
  The cap is still a cap: when everything is referenced, the oldest go first.
- **The counters survive a restart** — written to
  `~/.local/share/opencode/slim-stats/` every 30 seconds and on shutdown.
- **Nothing is dropped that the model needs to answer.** The plugin shortens
  reasoning, shortens oversized results, shortens the arguments of old calls,
  and caps the system prompt. It never drops a tool result, a tool call, or a
  user message.
- **Windows.** snip's rewritten command is repaired before it is used: snip
  leads with its own binary path, and a quoted path is not a command in
  PowerShell — it needs the call operator. The plugin replaces that path with
  the bare name, so the rewritten command runs the first time instead of failing
  and being re-run.

## License

MIT.
