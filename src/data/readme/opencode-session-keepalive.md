# opencode-session-keepalive

### Going into a meeting costs $1.34. Staying warm through it costs $0.11.

> An opencode plugin that keeps idle sessions' prompt caches alive with minimal no-op pings — and
> knows **exactly** when to stop, because keeping warm forever costs more than letting the cache die.
> **~200 lines. Zero dependencies. Pure JS.**

Both numbers are measured, on the same 215k-token session. The break-even between them is not a
guess or a vibe — it is a division, it is written out below, and it is what `windowMs` encodes.

---

## Is this your problem?

- Your **agent session gets expensive after you walk away** — the cost of resuming looks like
  starting over
- You keep a long conversation open all day and the bill does not match the amount of work done
- A **subagent** or long-running tool left the parent session idle, and picking it back up was billed
  at full price
- You have read about prompt caching and want to know **whether keeping a cache warm is actually
  worth it** — or whether you would just be burning money on pings
- You already tried a keepalive and are not sure it is paying for itself

That last question is the one this README answers with arithmetic rather than opinion. **Sometimes
the answer is no** — with a 5-minute TTL, holding a session for one hour costs **$1.40**, more than
the **$1.34** re-warm it avoids. A keepalive is not free, and this one is built to admit that.

> **The short version:** a cached prefix survives only as long as its TTL past the last read. Walk
> away and the cache dies; come back and you re-pay the whole history at write price. This plugin
> pings just under the TTL to keep it alive — and disarms when that stops being the cheaper option.

---

## TL;DR

A cached prefix survives only as long as its TTL past the last read. Walk away from a session and
the cache dies; come back and you re-pay the entire history at write price.

This plugin arms a timer when a session goes idle, sends a no-op ping just under the TTL, and
**closes the window once pinging stops being cheaper than re-warming**. That break-even isn't a
guess — it's a division.

```
14:00  last real turn → session.idle → ARM (deadline = now + windowMs)
14:50  ping #1  ✓   read renews the TTL
15:40  ping #2  ✓
  …
18:00  ping #5  ✗   past the deadline → DISARM, let the cache die
```

---

## The Problem

We profiled a real agent session and found that **idle time, not work, was the expensive part**:

| Gap | Cost of the re-warm | Model |
| --- | --- | --- |
| 8 minutes | 162,474 tokens = **$1.01** | Opus 4.8 |
| 3.5 hours | 214,936 tokens = **$1.34** | Opus 4.8 |
| 6.9 min (subagent wait) | 150,372 tokens = **$0.94** | Opus 4.8 |

Every gap past the TTL means the *whole* prefix gets re-written — and the prefix only grows. In one
25-minute session we watched it go from **116k → 215k tokens (+84%)**. The later the re-warm, the
more it costs.

A cache **read** costs `0.1×` the base input price. A **write** costs `1.25×` (5m TTL) or `2.0×`
(1h TTL). So a ping — which is just a read — is roughly **an order of magnitude cheaper** than
letting the cache lapse. Up to a point.

---

## The Math (this is the whole design)

### Why the interval must sit *just under* the TTL

Each read renews the TTL. Ping too late and you're re-warming instead of refreshing; ping too often
and you pay for reads you didn't need. The interval wants to be as long as possible while staying
safely inside the window:

| Provider TTL | Interval | Margin | Pings/hour |
| --- | --- | --- | --- |
| 5 min (Anthropic default) | **4.5 min** | 30s for jitter/latency | 13.3 |
| 1 h (with [`cache-ttl`](https://github.com/klaveren/opencode-cache-ttl)) | **50 min** | 10 min | 1.2 |

That single row is why [`cache-ttl`](https://github.com/klaveren/opencode-cache-ttl) matters so much here: **11× fewer pings for the same coverage.**

### Why the window must close — the break-even coefficient

Pinging is not free. `N` pings cost `N × 0.1×` the prefix. A re-warm costs `1.25×` or `2.0×`.
Keeping a session warm only pays while the accumulated ping cost stays under one re-warm:

```
        re-warm cost
N_max = ────────────
         ping cost

5m TTL:  1.25 / 0.1 = 12.5 pings  ×  4.5 min  ≈   55 minutes
1h TTL:  2.00 / 0.1 = 20.0 pings  ×  50 min   ≈  16.7 hours
```

**Past `N_max`, pinging costs more than letting the cache die.** So the window closes, we accept the
re-warm, and the session goes cold. Without that ceiling, a session left open on a Friday would ping
all weekend: ~640 pings ≈ **64× the cost of the single re-warm it was avoiding.**

### Economic ceiling vs. operational ceiling

16.7 hours is *arithmetically* correct and *operationally* silly — a session idle that long has been
abandoned. Two ceilings apply, and **the tighter one wins**:

| Ceiling | 5m TTL | 1h TTL |
| --- | --- | --- |
| **Economic** (the math above) | 55 min | 16.7 h |
| **Operational** (is this session still real?) | — | ~4 h |
| **Effective `windowMs`** | **55 min** | **4 h** |

With a 5-minute TTL the economics bind first, so no operational ceiling is needed. With a 1-hour TTL
the economics go slack, so judgment takes over: 4 hours covers a working day with lunch and meetings,
and auto-disarms anything forgotten.

### Where the value actually is

Everything below is measured against the same 215k prefix on Opus 4.8. Three prices drive all of it —
and note that **a ping costs the same in both regimes**, because a cache read is `0.1×` regardless of
TTL. What changes is the price of the re-warm you are avoiding, and how often you must ping:

| | multiplier | on 215k |
| --- | --- | ---: |
| ping (cache **read**) | `0.1×` | **$0.11** |
| re-warm, 5m TTL (cache **write**) | `1.25×` | **$1.34** |
| re-warm, 1h TTL (cache **write**) | `2.0×` | **$2.15** |

#### Without `cache-ttl` — a 5-minute TTL

You must ping every **4.5 min** to stay ahead of the TTL. The gain is front-loaded and burns out fast:

| You come back after | Pings sent | Spent | Saved | **Net** |
| --- | --- | --- | --- | --- |
| 5 min | 1 | $0.11 | $1.34 | **+$1.24** |
| 10 min | 2 | $0.21 | $1.34 | **+$1.13** |
| 30 min | 6 | $0.65 | $1.34 | **+$0.70** |
| 45 min | 10 | $1.07 | $1.34 | **+$0.27** |
| 55 min | 12 | $1.29 | $1.34 | **+$0.05** |
| **never** | 12 | $1.29 | — | **−$1.29** ← bounded by the window |

Break-even is `$1.34 / $0.11 =` **12.5 pings ≈ 56 min**, which is why `windowMs` has to be set near
there in this regime. Coffee breaks are where this shines — and where it stops.

#### With `cache-ttl` — a 1-hour TTL

Now you ping every **50 min**, and the first hour needs no ping at all — the TTL covers it for free:

| You come back after | Pings sent | Spent | Saved | **Net** |
| --- | --- | --- | --- | --- |
| 10 min | 0 | — | — | **$0.00** ← the TTL alone covers it |
| 55 min | 1 | $0.11 | — | **−$0.11** ← premature: the cache had 5 min left |
| 1 h 30 | 1 | $0.11 | $2.15 | **+$2.04** |
| 2 h 30 | 2 | $0.21 | $2.15 | **+$1.94** |
| 3 h 30 | 3 | $0.32 | $2.15 | **+$1.83** |
| 4 h | 4 | $0.43 | $2.15 | **+$1.72** |
| **never** | 4 | $0.43 | — | **−$0.43** ← bounded by the window |

Break-even is `$2.15 / $0.11 =` **20 pings × 50 min ≈ 16.7 h**. The 4-hour `windowMs` stops at **4
pings — a fifth of break-even**, so the whole operating range sits deep in profit. The one honest
negative is the 55-minute row: a ping fired at 50 min buys nothing if you return at 55. It costs
$0.11 to insure against the $2.15 you pay if you return at 61.

#### Side by side

| | 5m TTL | 1h TTL | |
| --- | ---: | ---: | --- |
| cost to hold **1 hour** | **$1.40** (13 pings) | **$0.11** (1 ping) | and $0.00 if you return inside the hour |
| cost to hold **4 hours** | $5.70 (53 pings) | **$0.43** (4 pings) | **13× cheaper** |
| worst case (never return) | −$1.29 | **−$0.43** | 3× smaller downside |
| upside per rescued session | +$1.24 | **+$2.04** | larger, because the write avoided costs more |

The first row is the verdict. **With a 5-minute TTL, holding a session for one hour costs $1.40 —
more than the $1.34 re-warm it was avoiding.** The keepalive alone cannot profitably bridge even a
single hour; it is a coffee-break tool. Paired with `cache-ttl` the same hour is free, four hours
cost pocket change, and the ceiling stops being economic (16.7 h) and starts being a judgement call
about when a session is simply abandoned.

That is why the two plugins ship together: one extends how long the cache lives, the other keeps
reading it so it never lapses. Neither is half as useful alone.

---

## The Solution

```
session.idle          → check eligibility (once per session, cached) → arm a timer
every intervalMs      → if now < deadline: send a no-op ping (a cache read renews the TTL)
                        if now ≥ deadline: disarm and let the cache lapse
real user turn        → disarm (a new window opens on the next idle)
session.deleted       → disarm and forget
```

Eligibility is deliberately narrow. Warming everything would burn pings on sessions that will never
be resumed:

- **By agent** — only the expensive, long-lived, ad-hoc conversations
- **By provider** — only providers with a prompt cache worth preserving
- **Not child sessions** — subagent sessions are ephemeral by design

---

## Install

```bash
npm install opencode-session-keepalive
```

```jsonc
// opencode.json
{ "plugin": [["opencode-session-keepalive", { "windowMs": 14400000 }]] }
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
    ["./.opencode/custom/plugin/session-keepalive/session-keepalive.js", {
      "intervalMs": 3000000,
      "windowMs": 14400000,
      "agents": ["my-expensive-agent"],
      "providers": ["anthropic"],
      "debug": false
    }]
  ]
}
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch. When `false`, no timers or hooks are registered. |
| `intervalMs` | `number` | `3_000_000` (50 min) | Time between pings. **Must stay under the provider's TTL.** |
| `windowMs` | `number` | `14_400_000` (4 h) | How long to keep warming after the last real turn. See *The Math*. |
| `agents` | `string[]` | `[]` (all) | Eligible agent names. Narrow this to your expensive, long-lived agents — warming a session that never gets resumed is pure waste. |
| `providers` | `string[]` | `["anthropic"]` | Eligible provider substrings. `[]` means all. |
| `includeChildSessions` | `boolean` | `false` | Warm subagent sessions too. Off — they're ephemeral. |
| `debug` | `boolean` | `false` | Log to **stderr** (never stdout — that corrupts the TUI). |

> ⚠️ **`intervalMs` is coupled to your provider's TTL.** The defaults above assume a **1-hour** TTL
> (via `cache-ttl`). On a stock 5-minute TTL, use `intervalMs: 270000` (4.5 min)
> and `windowMs: 3300000` (55 min) — a 50-minute interval against a 5-minute TTL means the cache
> dies before every single ping, which is **worse than no keepalive at all**.

With `debug: true`:

```
[session-keepalive] active — agents=[agent-god,agent-administrator] providers=[anthropic]
[session-keepalive] eligibility ses_04c7…: true (agent=agent-administrator provider=anthropic child=false)
[session-keepalive] armed ses_04c7… — 240min window, ping every 3000s
[session-keepalive] ping #1 ses_04c7…: HIT read=214649 write=312
[session-keepalive] disarmed ses_04c7… (real user turn) — 1 ping(s) sent
```

---

## Internals

### The Law of the Process

**A plugin lives inside the opencode process and does not outlive it.**

| Context | Process | Timer-based plugin |
| --- | --- | --- |
| `opencode serve` · TUI · web | long-lived | ✅ works |
| `opencode run` (detached, single turn) | **exits after one turn** | ❌ **no-op** |

In a one-shot run the sequence is: boot → load plugins → one turn → `session.idle` → *(timer armed)*
→ scope closes → `dispose` clears the timer → process exits. The ping never fires.

So if you dispatch agents via `opencode run`, **this plugin cannot help them**. Note that
`cache-ttl` *does* work there, because `fetch` wrapping acts during the request rather than after it.

### ⛔ Do not build an external warmer for those sessions

The obvious next thought is "then write a service that spawns a fresh process to touch the orphaned
session." That was built, measured, and deleted. Two independent reasons:

**There is nothing to win.** Across 34 durable pipeline sessions — 456 turns, **405 inter-turn gaps**:

| gap | share | |
| --- | ---: | --- |
| 0–5 min | **98.8%** | burst; even a 5-minute TTL survives this |
| 5–60 min | 0.5% | |
| **1–3 h** | **0.0%** | the band a warmer would serve — **empty** |
| > 3 h | 0.7% | max 4.7 h |

The profile is **bimodal**: continuous burst, or hours of silence. An event-driven pipeline has no
medium idleness. Total saving over that entire history: **~$2.70**.

**And it is actively dangerous.** The only way to reach a detached session from outside is a second
`opencode run --session <same>`. Two of those **corrupt the session irreversibly**: they do not
serialize, the contexts cross (the process that sent prompt A prints the answer to B), the session
accumulates consecutive `assistant` messages, and every later request fails with
`HTTP 400 — This model does not support assistant message prefill`. A durable session carries 120k+
tokens. That is a total loss with no undo.

> **This plugin is not exposed to that.** It pings through the **server API**
> (`ctx.client.session.prompt` → `POST /session/:id/message`), and the server **serializes**
> concurrent turns on a session — verified: two simultaneous prompts produced a clean
> `user → assistant → user → assistant` sequence and the session stayed healthy. The corruption is
> specific to spawning a **second process**, not to concurrency itself. Never route a ping through
> `opencode run`.

Cache warming is a **human-channel** problem — someone stepping away from a conversation. That is
exactly what this plugin covers, and it is the whole of what is worth covering.

### Guards

- **Overlap** — a session already mid-ping is skipped, so the `session.idle` our own ping emits can't
  re-arm the window and keep it alive forever.
- **Eligibility caching** — resolved once per session; the answer can't change.
- **Never pings without a session id** — a new session warms nothing and pays a full cold boot.
- **`dispose`** — clears every timer on shutdown. Not optional: a pending `setInterval` keeps the
  Node event loop alive and would hang the process.

### State is in memory — restarts start from zero

The plugin tracks armed sessions in a plain `Map`. A server restart wipes it, and the plugin only
learns a session exists when an event fires for it — and `session.idle` only fires **after a turn
completes**.

So: **a session that was idle before the restart and stays idle is never armed.** Nothing pings it,
and its cache lapses. Interact with it once and it arms normally on the next idle.

**This is deliberate, not an oversight.** Auto-arming recent sessions on boot looks like an easy
win, but it is a coin flip:

| Restart flavour | Cache state | Auto-arming would… |
| --- | --- | --- |
| Config unchanged | **alive** — it lives on the provider's side, not yours | help |
| Config/plugin/model changed | **already dead** — the prefix hash changed | pay a cold write at `2.0x` for nothing |

The plugin cannot tell the two apart *before* pinging — it only finds out from the HIT/MISS of the
ping it already paid for. And since a restart usually accompanies a config change, auto-arming
would tend to buy re-warms nobody asked for. On a 150k prefix that is roughly **$0.60 per session,
per restart**, spent on speculation.

The natural trigger is better: you come back, you send a message, the re-warm happens because there
is real work — not because a timer guessed there might be.

### The ping is a real turn

`opencode run` has no `--no-reply`. The ping is a genuine model turn, so the prompt text is the only
thing standing between a keepalive and an agent that decides to *do something*. Two layers:

1. The prompt explicitly forbids tools, state reads, and any action — it asks for `ok` and nothing else.
2. A `tool.execute.before` hook **blocks tool execution** while a ping is in flight (scoped per
   session, so real turns are untouched).

Output cost is ~10 tokens. The value is entirely in the *read* of the prefix, which is what renews
the TTL.

---

## Caveats

- **Pings enter the conversation history.** Each one adds ~50–100 permanent tokens to the prefix.
  Negligible, but not zero. (Some plugins revert the synthetic turn via `session.revert` — we
  deliberately don't: that API restores file snapshots, which is far too heavy for a keepalive.)
- **Plugin registration.** Lives in `.opencode/custom/plugin/session-keepalive/`, *not* `.opencode/plugins/`. Files in
  `{plugin,plugins}/` are auto-discovered as bare strings **without options**, and since
  auto-discovery merges after config files with last-one-wins dedup, a file in both places has its
  options silently dropped.
- **Interval/TTL coupling.** Repeated because it's the one setting that can make things worse: see
  the warning under Configuration.

---

## Verification

```bash
# is it arming?
grep "session-keepalive" server.log

# did a ping actually hit the cache? (HIT means the read renewed the TTL)
grep "ping #" server.log
```

The economics only work if pings register as reads. A ping logging `MISS` with a large `write` means
the interval is longer than the real TTL — check that `intervalMs` matches your provider's TTL.

---

## Install this one second — the other half comes first

Read the side-by-side table again if you skipped it: **on a 5-minute TTL this plugin cannot pay for
itself over even a single hour.** Every number in the right-hand column assumes a 1-hour TTL, and
opencode does not give you one through configuration.

**[opencode-cache-ttl](https://github.com/klaveren/opencode-cache-ttl)** is what provides it — ~120
lines that stamp `ttl: "1h"` onto the `cache_control` markers opencode already emits, after the two
obvious config routes turn out to be dead ends (one fails silently, the other returns `HTTP 400`).

| | 5m TTL | 1h TTL (with cache-ttl) |
| --- | ---: | ---: |
| hold 1 hour | $1.40 — *more than the re-warm* | **$0.11** |
| hold 4 hours | $5.70 | **$0.43** |
| break-even ceiling | ~56 min | **~16.7 h** |

Install `cache-ttl` first, then this. Alone, this is a coffee-break tool. Together they cover
everything from a short pause to an afternoon away.

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
