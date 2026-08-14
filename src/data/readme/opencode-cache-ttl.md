# opencode-cache-ttl

### Step away for seven minutes. Come back. You just paid $0.94 to re-read a conversation you never left.

> An opencode plugin that upgrades Anthropic's prompt cache from a **5-minute TTL to 1 hour** by
> stamping `ttl` onto the `cache_control` markers opencode already emits.
> **~120 lines. Zero dependencies. Pure JS. Measured 92% cheaper on a 15-minute gap.**

That $0.94 is not an illustration — it is a line item from a real session, a 150k-token prefix
re-written after a 6.9-minute subagent call. The config knob you would reach for to fix it
**does not work**, and fails silently. [Here is why, and what does.](#why-you-cant-just-configure-it)

---

## Is this your problem?

You are in the right place if any of this sounds familiar:

- Your **opencode / Claude sessions are expensive** and you cannot see where the money goes
- The cost seems to grow the *longer* a conversation gets, even when your messages stay short
- You stepped away for a coffee, a meeting, or a code review — and the next turn was billed like
  the first one
- A **subagent call** or a long tool run left the parent session idle, and resuming cost a fortune
- You found `cacheControl` in the opencode config, set `"ttl": "1h"`, and **nothing happened —
  no error, no effect**
- You moved it to the model level and got `HTTP 400` with the message
  *"…they must have matching TTLs"*

The last two are the interesting ones, and the reason this repo exists: **the configuration route
is a dead end in two different ways.** Both are documented below with the captured request bodies.

> **The short version:** Anthropic's prompt cache expires **5 minutes** after the last read. Every
> pause longer than that throws away the cached prefix, and the next turn re-writes your entire
> conversation history at `1.25×` input price. This plugin makes that window **one hour**.

---

## TL;DR

Anthropic's prompt cache expires after **5 minutes** of inactivity. Any pause longer than that —
a coffee break, a subagent call, a code review — throws away the cached prefix. The next turn
re-writes your entire conversation history at **1.25× input price**.

This plugin extends that window to **1 hour**. Measured on a 104k-token prefix with a 15-minute
gap: **92% cheaper**.

```
BEFORE                                AFTER
turn 1  write 104,743  read       0   turn 1  write 104,743  read       0
        ⏱  15 min gap                         ⏱  15 min gap
turn 2  write 104,754  read       0   turn 2  write      14  read 104,743
        ↑ full re-warm, $0.262                ↑ cache alive,  $0.021
```

---

## The Problem

LLMs are stateless. Every turn re-sends the whole conversation: `tools → system → messages`.
Prompt caching doesn't avoid that re-send — it makes it cheap (`0.1×` instead of `1.0×`). But the
cache entry only survives **5 minutes** past its last read.

We profiled a real agent session (opencode + Claude Opus 4.8, 55 assistant turns over 25 minutes):

| Metric | Value |
| --- | --- |
| Total cache reads | 9,546,993 tokens |
| Total cache writes | 382,183 tokens |
| Cache hit rate | 96.1% |
| **Cost** | **$8.75** |

96% hit rate looks great — until you notice **where the writes came from**:

| Write event | Tokens | Cause |
| --- | --- | --- |
| Initial cold boot | 116,412 | unavoidable |
| **Re-warm after a 7.9-min gap** | **162,474** | **TTL expiry** |
| 53 incremental deltas | ~761 (median) | normal |

One 8-minute pause cost **$1.01**. Later, a 3.5-hour gap on the same session cost **$1.34**.

It gets worse with subagents. When an agent calls another agent and waits, the parent session is
*busy*, not idle — nothing can ping it, and its cache dies while it waits:

```
20:22:56  write   4,731  read 123,713  | task     ← dispatches subagent
20:34:18  write  98,006  read  35,330  |          ← returns 11.4 min later: cache partially dead

20:58:26  write   7,203  read 138,475  | task     ← dispatches subagent
21:05:18  write 150,372  read       0  |          ← returns 6.9 min later: cache TOTALLY dead
```

**$2.39 wasted in a single session**, purely on re-warms caused by waiting.

---

## Why You Can't Just Configure It

Anthropic's API supports `"cache_control": {"type": "ephemeral", "ttl": "1h"}`. opencode's config
looks like it should let you set that. It doesn't — and it fails in two different ways.

### Attempt 1: provider-level options → silently ignored

```jsonc
"provider": { "anthropic": { "options": { "cacheControl": { "type": "ephemeral", "ttl": "1h" } } } }
```

No error. No effect. `provider.<id>.options` is the **SDK client construction bag** — it gets
spread into `createAnthropic({apiKey, baseURL, ...})`, which drops unknown keys silently. It never
reaches the request.

Proven with the `chat.params` hook, which receives the exact bag that becomes `providerOptions`:

```json
{ "hasCacheControl": false, "bagKeys": ["reasoningEffort", "thinking", "effort"] }
```

`ProviderTransform.options()` builds `result = {}` from scratch and reads exactly one key
(`setCacheKey`) from the provider bag. Everything else is discarded.

### Attempt 2: model-level options → HTTP 400

```jsonc
"provider": { "anthropic": { "models": { "claude-opus-4-8": {
  "options": { "cacheControl": { "type": "ephemeral", "ttl": "1h" } } } } } }
```

This one *does* reach the request — and the API rejects it:

```
Top-level cache_control has ttl='1h' but the target block already has cache_control
with ttl='5m'. When both are specified on the same block, they must have matching TTLs.
```

Because opencode **already** places inline markers, without a `ttl` (which means 5m). Captured
from the real request body:

```
$.cache_control                          ttl=1h    ← ours, top-level
$.system[1].cache_control                no ttl    ← conflict
$.messages[0].content[1].cache_control   no ttl    ← conflict
```

---

## The Solution

The API's error message told us what to do: *"they must have matching TTLs."*

So don't add a top-level marker. **Stamp `ttl` onto the markers that are already there.** No
conflict by construction, and opencode keeps full control over *where* to cache — we only extend
*how long*.

There's no config knob and no plugin hook that sees the final request body, so the only insertion
point is `globalThis.fetch`:

```js
const wrappedFetch = async (input, init) => {
  try {
    if (/anthropic/i.test(url) && typeof init?.body === 'string') {
      const parsed = JSON.parse(init.body)
      stamp(parsed, cfg.ttl)                                   // walk, set ttl on every cache_control
      return originalFetch(input, { ...init, body: JSON.stringify(parsed) })
    }
  } catch { /* our bug → request passes through untouched */ }
  return originalFetch(input, init)
}
```

This is the same technique `opencode-claude-auth` uses to inject its billing header, so it's an
accepted pattern in this ecosystem — but it is the most invasive tool in the box, and it earns
three non-negotiable guards (see **Internals**).

---

## The Numbers

Cache pricing, as multiples of the base input price:

| Operation | Multiplier |
| --- | --- |
| Cache **read** | `0.1×` |
| Cache **write**, 5m TTL | `1.25×` |
| Cache **write**, 1h TTL | `2.0×` |

So a 1-hour TTL makes every write **60% more expensive** — and eliminates re-warms entirely for any
gap under an hour. That is a **bet on the shape of your gaps**, and it is worth stating exactly where
it wins and where it loses. On a 215k prefix, this is what you pay when you resume:

| Gap since the last turn | Without the plugin (5m) | With the plugin (1h) | Difference |
| --- | --- | --- | --- |
| under 5 min | read `$0.11` | read `$0.11` | — cache alive either way |
| **5 min – 1 h** | **write `$1.34`** | read `$0.11` | **−$1.24** ← the entire value lives here |
| over 1 h | write `$1.34` | **write `$2.15`** | **+$0.81** ← you pay *more* |

Three regimes, and the middle one is the product. Below five minutes the plugin changes nothing;
above an hour it is a straight 60% penalty, because both caches are dead and yours was the expensive
kind to write.

**So the plugin pays off exactly when your gaps cluster between 5 minutes and an hour** — which is
the signature of a human stepping away: a coffee, a meeting, a code review, a subagent call.

⚠️ **Do not assume that describes an agent pipeline — measure it.** We assumed it and were wrong.
Across 34 durable sessions of an event-driven agent pipeline (456 turns, **405 inter-turn gaps**),
the profile was **bimodal**: 98.8% of gaps under 5 minutes, 0.5% between 5 minutes and an hour,
0.7% over 3 hours, and **nothing at all** in between. A pipeline fires in bursts and then goes quiet
for hours — it barely visits the band this plugin serves. Netted out over that history the plugin was
a **wash** there (a couple of re-warms avoided against a few made 60% dearer), while remaining a
decisive win on the same machine's interactive sessions.

Measure your own distribution before you assume. Read `info.time.created` / `.completed` from
`GET /session/:id/message`, diff consecutive turns, and histogram the result. It takes minutes and it
is the difference between a real saving and a rounding error.

Measured on our verification run (104,743-token prefix, Sonnet 5, 15-minute gap):

| | Re-warm (5m TTL) | Read (1h TTL) | Saved |
| --- | --- | --- | --- |
| Tokens | 104,743 write | 104,743 read | — |
| Cost | $0.262 | $0.021 | **92%** |

Extrapolated to the gaps we actually measured in production (200k prefix, Opus 4.8):

| Real event | Before | After | This plugin alone? |
| --- | --- | --- | --- |
| 6.9-min subagent wait (150k tokens) | $0.94 | **$0.08** | ✅ yes — squarely in the 5m–1h band |
| 3.5-hour gap (215k tokens) | $1.34 | **$0.43**¹ | ❌ no — needs [`session-keepalive`](https://github.com/klaveren/opencode-session-keepalive) |
| Total re-warms in one session | $2.39 | **~$0.51** | mixed |

¹ **Read this row carefully — it is the pair's number, not this plugin's.** A 3.5-hour gap is *past*
the 1-hour TTL, so this plugin alone does not save it; on its own the gap gets *worse*, re-warming at
`2.0×` = **$2.15** instead of $1.34. The $0.43 is what the gap costs when `session-keepalive` bridges
it with 4 pings at `0.1×` — and those pings are only affordable *because* the TTL is an hour, so they
fire every 50 minutes instead of every 4.5. Neither plugin reaches that number alone.

---

## Install

```bash
npm install opencode-cache-ttl
```

```jsonc
// opencode.json
{ "plugin": [["opencode-cache-ttl", { "ttl": "1h" }]] }
```

Or vendor the single file into your project and register it by path. Restart the opencode server
afterwards — config is cached.

---

## Configuration

Register **explicitly** with the tuple form. The file must live **outside** `.opencode/plugins/`
(see *Plugin registration* under Caveats):

```jsonc
{
  "plugin": [
    ["./.opencode/custom/plugin/cache-ttl/cache-ttl.js", {
      "ttl": "1h",
      "debug": false
    }]
  ]
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch. When `false`, `fetch` is never wrapped. |
| `ttl` | `"5m"` \| `"1h"` | `"1h"` | TTL to stamp. Anything else disables the plugin with a warning — the API accepts only these two. |
| `debug` | `boolean` | `false` | Log one line per modified request to **stderr**. Never stdout: that corrupts the TUI protocol. |

With `debug: true`:

```
[cache-ttl] active — stamping ttl='1h' on Anthropic cache_control markers
[cache-ttl] {"model":"claude-opus-4-8","markers":2,"stamped":2,"ttl":"1h"}
```

---

## Internals

### The three guards

Wrapping global `fetch` means every HTTP request in the process flows through your code. Three
rules make that safe:

1. **Idempotent** — a `__cacheTtlWrapped` flag prevents stacking wrappers when the plugin reloads.
2. **Narrow scope** — only URLs matching `/anthropic/i` with a `string` body that parses as JSON.
3. **Best-effort** — the entire transform sits in a `try/catch`. Any failure on our side passes
   the request through **completely untouched**. This plugin can never be the reason a turn breaks.

Plus: the transform builds a **new** `init` object rather than mutating the caller's.

### The price of those guards: it can fail silently

Fail-open is the right default — but read it honestly. Guards 2 and 3 mean that if the ground shifts,
this plugin **stops working without saying anything**:

- upstream switches the request body to a stream or `Uint8Array` → guard 2 skips it;
- Anthropic renames `cache_control`, or opencode stops emitting inline markers → nothing to stamp;
- another plugin wraps `fetch` after this one and rebuilds the body → your stamp is discarded.

In every case the request still succeeds, the TTL silently drops back to 5 minutes, and your costs
rise ~20× on resumed sessions with **no error, no warning, nothing in the logs**. This is the
unavoidable cost of reverse-engineering a behaviour the config does not expose.

**So verify it periodically — do not assume.** Two ways:

1. `"debug": true` prints one line per stamped request: `{"model":…,"markers":8,"stamped":8,"ttl":"1h"}`.
   `markers: 0` means there was nothing to stamp — that is the failure signature.
2. The temporal test, which proves the *effect* rather than the intent: send a turn, wait **more than
   5 minutes but less than an hour**, send another, then read
   `GET /session/:id/message` → `info.tokens.cache`. A large `read` with a near-zero `write` means the
   1-hour TTL is live. A large `write` with `read: 0` means it is not — the cache died at 5 minutes.

Run test 2 after any opencode upgrade. It is the only check that cannot be fooled by a plausible-looking
request body.

### What it does not do

It never **creates** cache markers. It only stamps a `ttl` on markers opencode already decided to
place. Cache *strategy* stays where it belongs; this plugin only changes cache *lifetime*.

### What actually invalidates the cache

Worth knowing, because it is easy to blame the wrong thing. The cache lives on **Anthropic's**
infrastructure, keyed by a hash of the rendered prefix (`tools → system → messages`). Your local
process is irrelevant to it:

| Event | Cache |
| --- | --- |
| Restarting your opencode server | **survives** |
| A gap longer than the TTL | expires (that is the whole point of this plugin) |
| **Any byte change in the prefix** — config, plugin set, model, system prompt | **invalidated** |

Measured evidence for the last row, from a session where config was being edited between restarts:

```
09:06:59  write     266   read 146,835   ← cache alive
09:07:23  write 132,647   read       0   ← COLD, after a 24-SECOND gap
```

No TTL expires in 24 seconds. The prefix changed. Conversely, the first turn of a brand-new session
right after a restart read 35,693 already-cached tokens — the entry had outlived the process.

Practical consequence: while you are tuning config, expect cold starts on every restart and do not
read them as this plugin failing. Once the config settles, restarts stop costing anything.

### Wrapper ordering

**Load order determines nesting.** The plugin that wraps `fetch` **last** ends up **outermost** and
sees the request first. If you add a diagnostic plugin to audit the final body, it must load
*before* the transformer to sit inside it — otherwise it reads the body pre-transform and you'll
think nothing happened. (We lost a cycle to exactly this.)

---

## Caveats

- **Writes cost 2.0× instead of 1.25×.** Only worth it if sessions get resumed. For strictly
  one-shot, never-resumed sessions, `ttl: "5m"` is cheaper.
- **Plugin registration.** This file lives in `.opencode/custom/plugin/cache-ttl/`, *not* `.opencode/plugins/`.
  Files in `{plugin,plugins}/` are auto-discovered and registered as bare strings — **without
  options**. Since auto-discovery merges *after* config files, and dedup keeps the *last*
  occurrence, a file in both places has its options silently discarded.
- **Anthropic only.** The URL filter and the `cache_control` shape are Anthropic-specific.
- **Works in one-shot processes.** Unlike timer-based plugins, `fetch` wrapping acts *during* the
  request — so it applies to `opencode run` (detached, single-turn) too, not just long-lived servers.

---

## Verification

The cache TTL isn't visible in any response field. The only conclusive test is temporal:

1. Send a prompt in a fresh session (prefix must exceed the model's cacheable minimum — 1024
   tokens for most Claude models, 4096 for Haiku)
2. **Wait 7+ minutes** (past the old 5m TTL, well under 1h)
3. Send a second prompt to the same session
4. Read the usage:

```bash
curl -s "http://localhost:4096/session/$SID/message" | python3 -c "
import json,sys,datetime
for m in json.load(sys.stdin):
    i = m.get('info', {}); tk = i.get('tokens') or {}; c = tk.get('cache', {})
    if i.get('role') != 'assistant': continue
    h = datetime.datetime.fromtimestamp(i['time']['created']/1000).strftime('%H:%M:%S')
    print(f\"{h} | write {c.get('write',0):>8,} | read {c.get('read',0):>9,}\")"
```

| Second turn shows | Verdict |
| --- | --- |
| `read > 0` | 1h TTL is live ✅ |
| `read = 0`, large `write` | Still on 5m — the stamp isn't reaching the request |

---

## The other half: keeping the cache alive past the hour

This plugin extends how long a cached prefix *lives*. It does nothing about a gap longer than that
hour — and on its own it makes those gaps **worse**, since the write it eventually pays is `2.0×`
instead of `1.25×`.

**[opencode-session-keepalive](https://github.com/klaveren/opencode-session-keepalive)** is the other
half: it sends a minimal no-op ping just under the TTL so the cache never lapses, and disarms once
pinging stops being cheaper than re-warming.

They are designed as a pair, and the pairing is what makes each affordable:

| | alone | together |
| --- | --- | --- |
| gap under 1 h | **cache-ttl** handles it | — |
| gap of 4 h | neither: cache-ttl pays `2.0×`, keepalive would need a ping every 4.5 min ($5.70) | **$0.43** — 4 pings, 50 min apart |

A keepalive on a 5-minute TTL has to ping every 4.5 minutes, which costs more than the re-warm it
avoids. Raise the TTL to an hour and the same protection costs a fifteenth as much.

Also from the same investigation:
**[opencode-session-identity](https://github.com/klaveren/opencode-session-identity)** — tells an
agent its own session id, which is what makes per-session cost measurement possible in the first
place.

---

## Credits

Written by **Henrique Van Klaveren**, from a measured investigation into opencode's prompt-cache
behaviour. Every number in this README came from a real session — nothing is estimated.

## License

MIT — see [`LICENSE`](./LICENSE). Use it however you like.
