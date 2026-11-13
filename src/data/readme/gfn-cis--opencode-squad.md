# opencode-squad

An OpenCode 2 plugin that turns the built-in `build` agent into a PDCA orchestrator. On every request it states an explicit `SELF`/`DELEGATE` verdict: trivial work it does itself; real work it hands to a per-model `grunt-*` subagent — routing changes through the matching `drill-*` (the Deming check), and investigations straight back to itself. A live context-usage signal feeds the decision so a heavy task isn't burned into an already-full context.

---

## Install

Requires **OpenCode 2**. Add to `~/.config/opencode/opencode.json` (or a project's `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@gfn-cis/opencode-squad"]
}
```

To track unreleased `master` instead of npm releases, use `"@gfn-cis/opencode-squad@git+https://github.com/GFN-CIS/opencode-squad.git"`.

OpenCode registers the skills and bootstrap automatically. There is no bundled grunt/drill agent — run the `squad-draft` skill once to generate the per-model squad the orchestrator delegates to.

### Plugin options

Plugin options (e.g. `rate_limit_guard`) go in the object form:

```json
{
  "plugins": [
    {
      "package": "@gfn-cis/opencode-squad",
      "options": { "rate_limit_guard": { "max_wait_seconds": 1800 } }
    }
  ]
}
```

The package entry (`index.js`) exports the OpenCode 2 `setup` in `.opencode/lib/orchestrate-v2.js`, backed by decision modules in `src/`:

- The delegation tool is `subagent`; the `[TASK OUTCOME]` / `[CACHE STATUS]` notes are appended to its result.
- The rate-limit guard vetoes the retry through OpenCode 2's `retry` hook instead of aborting the subagent, and steers its explanation into the orchestrator's running turn.
- No toasts: an OpenCode 2 server plugin has no TUI handle (the metrics refresh still runs, silently).
- `squad_compact` cannot choose the summarising model — OpenCode 2's compaction settings pick it; the tool takes no model argument.

---

## What you get

| Component | Type | Notes |
|---|---|---|
| `squad-delegate` | skill | The orchestrator's delegation protocol — loaded on demand when it decides to delegate (shapes, PDCA, risk gate) |
| `squad-stall` | skill | The orchestrator's stall-breaking ladder — loaded on demand when it recognizes it's stuck (kept separate so a stall doesn't pull in the whole delegation protocol) |
| `squad-draft` | skill | Scaffolds the per-model squad — discovers available models, proposes a tiered set, asks what to add/remove, then generates a hidden `grunt-<provider>-<model>` (executor) **and** `drill-<provider>-<model>` (reviewer) for each, giving the orchestrator a menu of models for both roles |
| `squad-redteam` | skill | Cross-model red-team / second-opinion review — dispatches the same artifact or question to several `grunt-*` agents in parallel (user picks the panel via a multi-select question, defaulting to the single strongest grunt per provider) and has the orchestrator cross-analyze their independent findings into one consolidated report. Uses grunts, not drills, since the panel needs live MCP/gitlab/webfetch access to fetch the artifact itself. Same parallel-dispatch-and-consolidate idea as [`@alexmkx/opencode-multi-delegate`](https://github.com/AlexMKX/opencode-multi-delegate), reusing the squad's own grunts instead of a separate delegate config |
| Bootstrap | hidden injection | Injected into the first user message of the `build` agent; sets the orchestrator role and selection rules, the current local time, the orchestrator's own model, and an inventory of subagents (each with its model) |
| Context signal | hidden injection | A live `<ORCHESTRATE_CONTEXT>` line added to the latest user message each turn, reporting current context usage so the orchestrator can weigh it in the decision |

The bootstrap carries live session facts resolved at injection time — the current local time (with timezone) and the model the orchestrator is actually running on (so an Opus session does not mistake itself for Sonnet). Each subagent in the inventory is listed with its description, its model and its **context window** (`ctx`, from opencode):

```
- `grunt-openai-gpt-6-1-terra`: Code-strong mid-tier … (model: openai/gpt-6.1-terra · ctx 1.1M)
```

### Model metrics: `squad_metrics`

The inventory carries **no benchmarks and no prices** on purpose. The bootstrap is re-sent every turn, and numbers frozen into it — or into agent descriptions — go stale while still looking authoritative. Instead the bootstrap tells the orchestrator to call `squad_metrics({models: [...]})` **once per chat** with the models of its grunt/drill agents, before its first routing decision; the result then stays in its history (it calls again only after compaction or a squad change).

`squad_metrics` returns one line per model asked for, with the squad's grunt/drill models marked:

```
- zai-coding-plan/glm-5.3 [grunt+drill]: SI 80.6 #19 · ctx 1M · subscription: GLM Coding Pro · TerminalBench4 0.418 · APEX-Agents 0.566 · FrontierSWE 0.302 · ValsIndex 0.599
- anthropic/claude-sonnet-5-5 [grunt+drill]: SI 85.2 #7 · ctx 1M · $2/$10 · TerminalBench4 0.618 · APEX-Agents 0.755 · FrontierSWE 0.619 · LiveBench-coding 0.772 · ValsIndex 0.708
- openai/gpt-6.1-terra-fast: same data as openai/gpt-6.1-terra
```

`squad_metrics({models: ["a/b", "c/d"], full: true})` (up to 6) returns **every** metric the sources hold for those models, grouped by source and the setting it was measured at — for a close call the summary does not settle.

Sources, both public and keyless:

- [SuperIndex](https://superindex.app) (CC-BY-4.0) — composite score `SI`, rank, list price, context window.
- [llmbenchmark.ai](https://api.llmbenchmark.ai/docs) — per-benchmark scores aggregated from public leaderboards (Terminal-Bench, Epoch, LiveBench, Vals, LMArena, …). The summary shows TerminalBench4, APEX-Agents, FrontierSWE, LiveBench-coding and ValsIndex.

Neither source uses opencode's ids (`zai-coding-plan/glm-5.3` is `zhipuai/glm-5.3` in one and `z-ai/glm-5.3` in the other), so matching compares the model part only. Serving tiers that keep the same weights (`-fast`, `-ultrafast`, `-highspeed`, `-free`, `-latest`, `-preview`, date suffixes) fall back to the base model; `glm-5.3` never matches `glm-5.3-flash`. Scores are at the setting the leaderboard ran (mostly max effort), not at your agent's variant — the output says so, and lists every setting where there are several.

Fetching: at plugin start and then whenever data is older than **48 hours** (checked every 4h), each source under its own 8s timeout, in parallel. Data is cached in the OS temp dir (`$TMPDIR/opencode-squad-<uid>/`). A source that fails or answers with an empty or shrunken body keeps its previous data — an empty 200 never overwrites good numbers. Per-model detail is fetched on request and cached under the same TTL.

### `model_data.json`: your notes per model

`model_data.json` (the project's `.opencode/` or the global `~/.config/opencode/`) holds **only hand-written fields**:

```json
{
  "providers": {
    "anthropic": "Max 5x",
    "openai": "ChatGPT Plus",
    "zai-coding-plan": { "plan": "GLM Coding Pro",
                         "info": "No secrets, credentials, .env or production config; otherwise fine" },
    "google": "api"
  },
  "models": { "zai-coding-plan/glm-5.3": { "info": "good for coding, weak at long context" } }
}
```

- `providers` — how each opencode provider is paid for: the plan in your own words, or `"api"` for metered billing. Write `{"plan": …, "info": …}` to add a routing rule for **every** model of that provider — trust in who runs the servers ("no secrets") is a provider property, not a model one. `squad_metrics` prints `subscription: Max 5x` instead of a list price; the plugin keeps no catalog of plan limits — the model knows what common plans include. Without an entry, an OAuth login in opencode's `auth.json` and a `*-coding-plan` / `*-token-plan` provider read as `subscription: plan not set`; anything else as metered API. `squad-draft` asks for missing plans once and writes them here;
- `models.<id>.info` — **your routing rule** for that one model, after the provider's ("no secrets, no production"). It goes into the agent's description as `Owner rule: …`, which the orchestrator treats as binding — it outranks benchmarks — and is shown next to the numbers in `squad_metrics`. Leave it out and the model is routed on metrics and plan alone;
- `models.<id>.billing` — per-model override of the provider's plan (`"api"` or a plan name);
- `models.<id>.cache_ttl_seconds` — see [the cache note](#cache-status-hint) below.

The global file is refreshed at opencode startup: new squad models get an empty entry, removed ones are dropped, every hand-added field is kept, and the benchmark fields earlier versions copied in from Artificial Analysis are stripped. It is written only when something actually changed. A project's file is never auto-touched.

"Hidden" means the subagents are registered but do not appear in the `@` mention menu. The orchestrator invokes them programmatically via `subagent`. Both injections target **only the `build` agent's own sessions** — grunt/drill subagent sessions are never injected into, so there is no recursion.

---

## Optional: override subagent models

Use `squad-draft` to add or retune the generated per-model agents. For a project-specific override of an existing generated agent, use its full id under `agents`:

```json
{
  "plugins": ["@gfn-cis/opencode-squad"],
  "agents": {
    "grunt-anthropic-claude-sonnet-4-6": { "model": "anthropic/claude-sonnet-4-6#high" }
  }
}
```

Unspecified fields keep the generated definition. There are no generic fallback grunt/drill agents.

---

## Per-model squad (grunts + drills)

OpenCode's `subagent` tool dispatches by agent id rather than model, so model choice requires a named agent per model per role. The `squad-draft` skill discovers available models (`opencode models`), proposes a tiered roster, asks what to change, then — on your OK — writes a hidden **grunt** (executor) and **drill** (read-only reviewer) per selected model into `~/.config/opencode/agent/` (or `$XDG_CONFIG_HOME/opencode/agent`). Existing legacy agent files can be read and regenerated in native format without losing roster settings.

```
openai/gpt-5.5  →  grunt-openai-gpt-5-5   (executor: edit/shell)
                →  drill-openai-gpt-5-5   (reviewer: read-only)
```

Each generated agent shares the bundled grunt/drill prompt and permissions, differs only in `model`, and is `hidden` (dispatched via `subagent`, not in the `@`-menu). They appear in the orchestrator's inventory **with their models and capability summary**, which makes routing concrete. Re-running syncs the set (prunes generated agents no longer listed; never touches hand-authored agents). OpenCode reloads changed agent files automatically, so no restart is needed. Each file carries a fenced placeholder rather than the role prompt itself; the plugin injects the current `prompts/<role>.md` on every request. Without the plugin loaded the placeholder tells the agent to stop rather than improvise. Frontmatter changes still require re-applying the roster.

There is no bundled fallback agent — if no `grunt-*`/`drill-*` exists yet, the orchestrator tells you to run `squad-draft` instead of inventing a subagent or quietly doing the work itself.

---

## Rate-limit guard

OpenCode retries retryable provider failures, including potentially long provider-announced waits. For a child dispatched via `subagent`, that can leave the orchestrator blocked when it could choose another model.

This plugin watches subagent sessions for retry activity and steps in once either of two thresholds is crossed:

Config is passed in the plugin object's **options**, not as a top-level `opencode.json` field:

```json
{
  "plugins": [
    {
      "package": "@gfn-cis/opencode-squad",
      "options": { "rate_limit_guard": {
        "enabled": true,
        "retry_on_errors": [429, 403],
        "retryable_error_patterns": ["rate.?limit", "usage.?limit", "quota", "blocked by a gateway or proxy"],
        "max_wait_seconds": 3600,
        "max_cumulative_seconds": 3600,
        "max_silence_seconds": 600
      } }
    }
  ]
}
```

All fields are optional — the values above are also the defaults, so omitting `rate_limit_guard` entirely (or using the plain-string plugin form) behaves the same.

- `max_wait_seconds` — a **single** announced wait longer than this (e.g. a provider saying "resets in 7 days") aborts immediately. Don't wait at all.
- `max_cumulative_seconds` — no single wait was long, but retries keep accumulating (repeated short backoffs) past this total — abort once the sum crosses it.
- `max_silence_seconds` — abort a guarded subagent that has produced **zero activity at all** for this long, regardless of whether opencode ever surfaced a retry or error event for it (see signal 3 below). 10 minutes by default: long enough that a legitimately slow first token (heavy reasoning models can take a couple minutes before streaming anything) won't false-positive, short enough that it doesn't cost the orchestrator the better part of an hour before it finds out.
- `retry_on_errors` / `retryable_error_patterns` — same idea as [`@renjfk/opencode-model-fallback`](https://github.com/renjfk/opencode-model-fallback)'s options: only intervene on retries that actually look like a rate/usage limit (matched against opencode's own retry message, or a cached HTTP status code), not on ordinary transient 5xx blips — those are left to opencode's normal backoff.
- Only ever applies to **subagent** sessions (anything with a parent) — a top-level/human chat session is left alone; run `opencode-model-fallback` alongside this if you want that case covered too.

Three independent signals feed the guard, so it also catches failures that never look like a retry to opencode itself:

1. **Session `retry` hook** — once a threshold trips, the plugin vetoes the retry and steers an explanatory note into the parent turn (resuming it if idle). The note tells sarge to choose another model and includes an absolute `Rate limited till <ISO datetime>` deadline when known.
2. **Terminal `session.execution.failed` events** — a provider limit that produces no retry still gets the same explanatory note when its error matches the guard patterns.
3. **Silence polling backstop** — an independent timer watches each child session. If it has no activity past `max_silence_seconds`, the plugin interrupts it and sends the parent an explanation, even without a retry or terminal error event.

Verified live end-to-end against a genuinely quota-exhausted model, on two separate occasions: the guard caught the limit, told the orchestrator, and the orchestrator switched to a different grunt on its own — then, when that one turned out to share the same exhausted account, switched again to a different provider entirely, all without being told which model to pick. The silence backstop specifically was confirmed against a live subagent that produced zero events for over 10 minutes.

---

## Cache-status hint

The `subagent` tool supports resuming a prior child by passing its `sessionID`, so the orchestrator can continue an existing grunt/drill session (reusing its history and, if timed right, the provider cache) or start fresh. Knowing which is worth it requires knowing the time since the last provider hit, the cache TTL, and the accumulated context size. The plugin's notes label the same session identifier `task_id`; pass it as `sessionID` to `subagent` and as `task_id` to `squad_compact`.

When a `subagent` call completes, this plugin appends a line to its result:

```
[CACHE STATUS] task_id=ses_abc123 — last provider hit ~45s ago (2026-08-27 13:25:16 (Europe/Moscow)), model anthropic/claude-sonnet-5. published cache TTL ~5m — likely still warm. Its context is ~120k / 200k (60%) as of its last completed turn (so right after a compaction this still reads high for one turn). Reusing it re-reads all of that on every step; a fresh session starts from the brief. Pass task_id to continue this same session if you want to reuse it.
```

The last-hit time is given both ways on purpose. The relative age is what reads at the moment the task finishes; the absolute wall clock — same format and zone the bootstrap stamps its own "now" with — is what is still usable a turn later, when the orchestrator has to recompute the gap to decide whether to resume. `~17m ago` is meaningless by then. (It is the moment that session last *started* a provider request, not when the task finished.)

The line reports two more things, because warm/cold alone was not enough to decide with: the cache temperature, and **how big the session being offered for reuse has grown**. Reuse re-reads that whole context on every step — the cost the orchestrator was previously blind to. The size is the last *completed* turn's usage, so it still reads high for one turn right after a compaction; the line says so rather than misleading in exactly the compact-then-continue flow it exists to support.

The TTL comes from an optional hand-edited `cache_ttl_seconds` field in `model_data.json` (same file and pattern as `info`/`billing` above). When that field is absent, `resolveCacheTtl()` (`src/cache-status.js`) resolves one anyway — on the read path, so it works for anyone who never edits the file (which is how it came to be unset for every Anthropic model in the first place).

Published figures: Anthropic 300s (5 min, refreshed on hit; a paid 1h option exists too), OpenAI 1800s (30 min, gpt-5.6+). Providers that publish nothing (`alibaba-token-plan`, `zai-coding-plan`) get an assumed **300s floor** — the shortest TTL anyone publishes, so it errs toward "cold", the cheap direction: a false "cold" costs one re-brief, a false "warm" costs a full context re-upload. The earlier behaviour here was to say "TTL isn't published — judge for yourself", which read as *no constraint*, i.e. as if the cache lived forever.

What stays honest is the label, not the silence: a published TTL is reported as published, an assumed one names itself as assumed and states the floor. The floor is deliberately **not** applied on top of the published table — a flat 300 for everyone would misreport a genuinely warm 30-min OpenAI session as cold. An explicit `cache_ttl_seconds` always wins over both:

```json
{
  "models": {
    "anthropic/claude-sonnet-5": { "cache_ttl_seconds": 300 },
    "openai/gpt-5.6-terra": { "cache_ttl_seconds": 1800 },
    "alibaba-token-plan/qwen3.7-max": {}
  }
}
```

`qwen3.7-max` above leaves the field unset on purpose: that model gets the assumed 300s floor, reported as assumed. Set the field only when you have a real published number to override it with.

### Measuring the TTL instead of trusting one

`scripts/squad-measure-cache-ttl.mjs` derives each provider's TTL from opencode's own message history. Every provider reports `tokens.cache.read`, so for two consecutive assistant messages on the same provider+model you can ask whether the later one hit the prefix cache, and correlate that against the gap between them. Bucket by gap and the TTL shows up as the point the hit rate falls off.

It is trustworthy because it recovers a known answer: Anthropic's published 300s falls straight out of the data — 93% hits under 5m, **7%** at 5-10m, ~2% beyond, across ~70k samples in 2016 sessions.

```
node scripts/squad-measure-cache-ttl.mjs [--db <file>] [--models] [--json]
```

It prints a report and writes nothing. `n` is printed on every row deliberately: a bucket reading 100% on two samples next to one reading 93% on sixty thousand is actively misleading without it, and `deriveTtl` refuses to extrapolate — running out of samples ends the walk exactly like a miss does, and the verdict is marked `[weak]` when a thin bucket decided it.

Results as of 2026-09-01 fed `MEASURED_CACHE_TTL_SECONDS`: `zai` and `zai-coding-plan` at 600 (95%/98% under 5m, still 93%/81% at 5-10m — the 300s floor was calling six-minute-old sessions cold when ~85% of them were warm), `github-copilot` at 300 (92% under 5m, then flat zero). `alibaba-token-plan` and `google` deliberately keep the floor: the first rests on 5 sessions, the second has no sample anywhere past 5m, so "300" would mean "never observed" rather than "measured". Measured values sit *below* published ones — our regression of a vendor's behaviour does not overrule the vendor's own number, which is why `openai` stays at its published 1800 even though the measurement reads ~300.

This is manual-only and will go stale. That is tolerable here in a way it was not for the read path: it is a periodic measurement, and a provider with no entry now falls through to the tiers above rather than to "unknown".

The `[CACHE STATUS]` line is appended to the completed `subagent` tool result, alongside any `[TASK OUTCOME]` diagnosis.

---

## Reasoning variant per squad model

opencode builds a model's reasoning variants from models.dev's
`reasoning_options` — `reasoningVariants()` wins over the hardcoded fallback,
which only runs when that field is absent. `glm-5.3` publishes
`low|high|max`, `claude-opus-5` `low|medium|high|xhigh|max`, and for an
openai-compatible provider the chosen level is lowered into `reasoning_effort`
in the request body.

But a variant only applies when one is **selected**, and nothing selects one for
a subagent. Without it no reasoning parameter is sent at all — and for an
openai-compatible model, nothing then bounds its reasoning except the output cap.
Measured over 20 days on one machine:

| model | median reasoning | p95 | max | share of budget |
|---|---:|---:|---:|---:|
| claude-opus-5 | 751 chars | 3 980 | 7 404 | ~20% |
| claude-sonnet-5 | 481 | 2 621 | 13 992 | ~20% |
| zai/glm-5.3 | 920 | 13 007 | 67 028 | **70%** |

The medians are the same; the tails are not — and the tail is what hits the cap:
two glm-5.3 grunts were truncated mid-thought having emitted 2 and 9 tokens of
answer.

**A variant is a hint about depth, not a token budget.** It does not prevent
truncation: on 2026-09-02/03, one glm-5.3 and two claude-sonnet-5 turns were cut
at 32k *with* `variant: high` set — the last of them 32 000 reasoning tokens and
0 output. No model is immune, Anthropic included; an earlier claim here that
Anthropic stayed bounded on its server-side default came from per-message
reasoning lengths and did not survive contact with truncation data.

What the variant does change is how often it happens. With it, glm-5.3 ran 83
turns in one day with no truncation, against five in the two days before. So:
mitigation, not a fix. The fix is the cap ([#2](https://github.com/GFN-CIS/opencode-squad/issues/2)).

So a roster entry carries an optional `variant`, appended to the model reference
in both generated agents:

```yaml
model: zai-coding-plan/glm-5.3#high
```

An unrecognized variant is **silently ignored** by opencode
(`if (!(agent.variant in model.variants)) return undefined`), so `squad_patch`
refuses one instead of writing it. Which levels are valid comes from opencode's
own provider list, not from models.dev: `reasoning_options` arrives in three
types that opencode turns into different variant names — `effort` yields the
published values, `budget_tokens` yields `high`/`max` but only for providers
that have a budget parameter, and `toggle` yields `none`/`high` for exactly two
npm packages. Reading only the effort values under-reports, and did:
`claude-haiku-4-5` publishes just `[{type: "budget_tokens", min: 1024}]`, so an
effort reading says "no variants" while opencode accepts `high` and `max`.
`squad_dump` therefore prints the accepted list per model alongside the roster.

---

## Roster as data (read-modify-write)

The generator used to take one declarative list: "here is the roster, prune
everything else". Asked to *add* a model, a caller would pass the single new id
and the pruner would delete the rest — protocol followed exactly, squad wiped.
Composing the right invocation was the caller's job, and getting it wrong was
silent and total.

So the roster is data you edit, exposed as two plugin tools:

| tool | what it does |
| --- | --- |
| `squad_dump` | returns the current roster as JSON, derived from the agent files |
| `squad_patch` | writes a roster back — `grunts` / `drills`, plus `allow_remove` and `directory`; refuses a `description` (generated, see below) and a roster wrapped in an extra key |
| `squad_metrics` | benchmarks, prices, context and billing for the `models` given; `full: true` for every metric of up to 6 — see [Model metrics](#model-metrics-squad_metrics) |

A third tool covers the other half of reuse:

| tool | what it does |
| --- | --- |
| `squad_compact` | compacts a subagent session before it is reused for a new task — `task_id` only; the compaction model comes from OpenCode 2's own settings |

Reuse used to be all-or-nothing: pass the `task_id` and re-read the whole
transcript on every step, or start fresh and lose the history. `squad_compact`
is the middle option — it runs OpenCode's own `session.compact` so the
next dispatch reads a summary instead. OpenCode 2's compaction settings select
the model; `squad_compact` takes no model argument and cannot choose one.
It is not free: one full
pass over the history, and the session's provider cache goes cold afterwards, so
it pays off only when several turns follow. opencode's automatic compaction
fires at the context limit — around a million tokens on a 1M model — which is
long past the point where reuse became expensive.

```json
{ "grunts": { "zai-coding-plan/glm-5.3": { "variant": "high",
                                           "notes": "prefer the write tool" },
              "openai/gpt-5.6-luna": { "steps": 25 } },
  "drills":  { "anthropic/claude-opus-5": { "variant": "max" } } }
```

One map per role, keyed by model id, mirroring the files on disk. An agent exists
if it appears; `{}` means "this model, role defaults". This replaced a flat model
list carrying a `roles` array for two reasons: one entry per *model* forced one
`variant` per model, so "grunt at high, drill at max" was inexpressible — and the
drill, whose job is the harder call, is exactly where you would want to spend
more reasoning; and `roles: ["grunt"]` needed the rule "omitting it means both",
which had to be explained in three places, where a role map needs no rule at all.

**A drill is not a free extra.** A grunt executes; a drill reviews, and its
verdict is what the orchestrator acts on. A weak model in that seat either
rubber-stamps what it is shown or invents faults, and both are worse than no
review, because they launder a bad change as an approved one. Cheap and small
models belong in `grunts` alone.

Per-agent fields, and why these and not the rest of opencode's agent schema:

| field | why it is here |
| --- | --- |
| `variant` | the reasoning governor — per agent, so a drill can think harder |
| `notes` | extra instructions for one agent, fenced in the prompt so they round-trip |
| `steps` | cap on agentic iterations before opencode forces a text response |
| `disable` | park an agent without deleting it — the soft alternative to a removal |

**Descriptions are generated, not drafted.** An agent's `description` is the line the orchestrator reads when it picks whom to dispatch, so it carries exactly what you own and nothing that goes stale: the role, your `info` for that model as `Owner rule: …`, and the provider's plan (`Billing: subscription (Max 5x).`). The plugin writes it on every `squad_patch` and **rewrites it at every start** from the global `model_data.json` — only files whose text changes, atomically — and opencode reloads changed agent files live. So editing `info` or a plan needs a restart, not a re-draft. Benchmarks, prices and rankings never go in: hand-written ones went stale within a week, and an orchestrator asked to "refresh descriptions" invented them.

Deliberately **not** exposed: `permission` (a drill's read-only contract is a
safety property, not a preference), `mode`/`hidden`/`color` (ours), and
`temperature`/`top_p`/`options` — nobody has needed them, and `options` can
override the variant silently, which is the opposite of what this roster is for.

There is deliberately no CLI alongside the tools. There was one, and it was the
path that wiped a squad; keeping it as a second entry point would have meant a
second copy of the deletion guard, and the copy that drifted would be the one
that deletes agents.

Two properties make the flow safe, and neither is optional:

1. **The roster is derived, never stored.** Every `squad_dump` reads the
   generated agent files. A manifest kept beside them would be a second source of
   truth, desyncing the first time anyone edited the agent dir by hand.
2. **Apply refuses to delete.** Read-modify-write only protects while the caller
   actually modifies; one that rebuilds the roster from memory reintroduces the
   wipe in a new wrapper. So deletions are refused and named — nothing at all is
   written, not even the agent that would have been added — until `allow_remove`
   says otherwise. The unit is the agent, which is also the unit on disk, so
   dropping just a drill is gated exactly like dropping a model.

`squad_patch` additionally refuses to run from a `grunt-`/`drill-` agent. A
subagent rewriting the squad mid-task is never intended, and the damage outlives
the session.

Hand-authored agents are invisible in every mode: never dumped, never pruned.

---

## Task-outcome note

The `subagent` tool's final text does not explain an empty deliverable. Two completely different failures can arrive as the same empty string: the model was **cut off at max_tokens before it emitted anything**, or it **genuinely ended its turn with no final message**.

That gap is not theoretical. On 2026-09-01 two `zai-coding-plan` grunts (`glm-5.3-flash`, then `glm-5.3`) were dispatched on the same ESPHome component brief. Both came back with an empty `<task_result>`. Their sessions say why: `finish: "length"`, `reasoning: ~32000`, `output: 2` and `9` — each model spent its entire budget inside the reasoning channel (~133 KB of it, holding 70 fenced code blocks of real drafted work) and was truncated one step before writing a file. Their `gpt-5.6-terra` siblings on the same brief finished on `tool-calls` normally.

Given only `""` to look at, the orchestrator announced *«отказ провайдера zai … бриф до оценки даже не дошёл»* and switched providers. Nothing in the session supported either claim — the brief had been parsed line by line and nearly implemented, and the only actual errors in that session were `Tool execution aborted` / `Task cancelled`, i.e. the user's own ESC. A missing diagnosis is bad; an invented one is worse, because the orchestrator acts on it.

So when a `subagent` call returns an empty or truncated result, this plugin appends:

```
[TASK OUTCOME] task_id=ses_fa3e7d7a6ffe… (zai-coding-plan/glm-5.3) hit max_tokens (finish=length; 9 tokens output, 31991 tokens reasoning) and was cut off before emitting anything — the result is empty because the turn never reached one, not because the provider refused or the brief was rejected. The budget went into the reasoning channel, so the work may exist there as drafts; read that session's reasoning before rewriting the brief from scratch. Do not switch providers on this signal. Fix the cap: shorten the brief, split the task, or dispatch a model with room to answer.
```

Three outcomes get a note, and they say different things:

| Signal | What the note says |
| --- | --- |
| `finish=length`, empty result | Truncated before emitting anything. **Not** a provider failure; don't reroute, fix the cap. Names the reasoning channel when reasoning dwarfs output (>4×), because that is where the work is. |
| `finish=length`, non-empty result | The result below is **cut off mid-answer** — partial, not a deliverable. Verify what landed on disk. |
| empty result, normal finish | Genuinely stopped rather than cut off. Named as such so the two don't get conflated in the other direction either. |

A normal finish that produced a result gets no note at all.

The facts come from the last *completed* assistant turn of the child session — the same `ctx.session.context` read `[CACHE STATUS]` already makes, so this costs no extra call. Deliberately the last turn that carried a finish reason, not simply the newest: an aborted session can end with a stub assistant record. `[TASK OUTCOME]` is also appended when the model or timestamp is unknown, both of which suppress the cache-status line.

The stored-session regression fixtures exercise both empty-result diagnoses through `formatTaskOutcome()`.

---

## Provider-quota signal (parser landed, delivery unsolved)

Providers report how much of their rate-limit window is already burnt **on every successful response**, and opencode keeps none of it — so the orchestrator only learns a provider is saturated by getting a 429 from it, mid-dispatch, after paying for the work so far.

Verified live on 2026-09-01, `HTTP 200` in both cases:

```
POST api.anthropic.com/v1/messages
  anthropic-ratelimit-unified-representative-claim  five_hour   <- which window binds
  anthropic-ratelimit-unified-5h-utilization        0.07
  anthropic-ratelimit-unified-5h-reset              1788258600
  anthropic-ratelimit-unified-7d-utilization        0.06

POST chatgpt.com/backend-api/codex/responses
  x-codex-primary-used-percent    51    x-codex-primary-window-minutes    300
  x-codex-secondary-used-percent  15    x-codex-secondary-window-minutes  10080
  x-codex-credits-has-credits     True
```

Note what is reported: **used**, not remaining (Anthropic as a fraction, codex as a percent). And `primary`/`secondary` are not fixed windows — codex re-ranks them by whichever is closest to its limit, so `src/quota.js` labels windows by `window-minutes` (300 → `5h`, 10080 → `7d`) rather than by the slot they arrive in. On the Anthropic side `representative-claim` names the binding window outright.

z.ai returns nothing of the kind (`alt-svc`, `ga-traceid`, `x-log-id`, plumbing), so no snapshot is recorded for it and no claim is made about it.

### Not polluting the context

Once something feeds it, the clause rides on the `[CACHE STATUS]` note that already exists — no extra message, no extra turn — and stays **silent** unless the binding window crossed a reporting band (60% / 80% / 95%) or sits in the top one. A flat threshold would re-print the same figure on every task result for the rest of the session; transitions carry the same information for a fraction of the tokens, and the top band keeps repeating because there the exact number changes the decision.

At the utilizations actually observed above (7% and 51%) it emits nothing at all:

```
[QUOTA] anthropic: 5h 83% (binding), 7d 6% used. The 5h window resets in 2h 25m.

[QUOTA] openai: 5h 97% (binding), 7d 15% used. The 5h window resets in 2h 21m.
Credits are exhausted on this plan. Route further work to a different provider
unless it must run here.
```

### Delivery: two measured dead ends

`src/quota.js` parses and gates; **nothing currently feeds it.** Getting response headers out of opencode has no sanctioned hook — `chat.headers` is request-side, `ProviderHook` exposes only `{id, models}` (`ModelV2` is metadata, not an executable model), and the SDK has no usage/quota endpoint. Two seams were tried and measured:

1. **Wrapping `globalThis.fetch`.** Installed correctly (`patched=true`, `fetch` no longer native, host regex verified) and was then called for **zero** requests. ai-sdk only falls back to `() => globalThis.fetch` when `options.fetch` is unset, and something upstream — the OAuth plugin — already sets it. Dead, not merely ugly.

2. **Injecting `provider.<id>.options.fetch` from the `config` hook.** This *is* the documented ai-sdk seam (`new AY(H, {provider, url, headers, fetch: W.fetch, ...})` in the bundle) and a function can only get there from code. But at `config` time the OAuth plugin has not yet claimed the slot, so wrapping finds it empty, takes it first, and delegates to `globalThis.fetch` — dropping the token injection. Measured: a trivial session hung past a 240s timeout with the call live, and completed in **9.8s** with it disabled.

The untried third option is to intercept the *later* assignment — a `defineProperty` accessor on `options` that wraps whatever the auth plugin assigns — leaving the transport theirs and reading headers on the way past. Unimplemented and unverified; a draft of the wrapper is kept out of tree.

Worth weighing before building it: plugin initialisation order in opencode is undocumented and was established here only by measurement, so each attempt rests on behaviour that can change silently. A response-header hook upstream would make all of this unnecessary.

---

## How it works

On **every** request the orchestrator must state one explicit verdict before acting — `SELF: <reason>` or `DELEGATE: <reason>`. This is the core mechanic: it forces a conscious choice instead of silently doing the work itself (the failure mode this plugin was built to fix). The default leans toward delegating — an expensive primary model's value is decomposition and review, not routine work.

### Selection principles

The orchestrator picks **DELEGATE** when *any* signal is present (this is the default for real work):

- **External access** — the task needs ssh, kubectl, grafana, the web, or a repo-wide search.
- **Depth** — it would take more than ~3 tool steps.
- **Artifact** — it produces code, docs, or config.
- **Heavy I/O** — it would ingest or generate a lot of raw material when you only need a summary (offload it, keep the orchestrator's context clean).
- **Context pressure** — the fuller the orchestrator's own context already is, the more a heavy task should be delegated rather than burned into it. A live `<ORCHESTRATE_CONTEXT>` line (e.g. `~120k / 1000k (12%)`) reports the current size each turn so this is a real number, not a guess.

It picks **SELF** only for: pure Q&A / explanation, a single trivial read, or when you explicitly told it to.

### Delegation shapes

Once it delegates, the shape depends on the task:

- **Read-only / investigation** (status checks, "why is X", log/metric digs) → delegate execution to a per-model `grunt-*` (or a specialized read agent like `Explore`) with **no drill** — there is no artifact to review. The orchestrator sanity-checks the findings itself, then reports.
- **Changes** (code / docs / config) → the full PDCA loop:
  1. **Plan / Do** — calls a `grunt-*` with the brief, definition of done, context, and (from iteration 2 onward) the drill's feedback.
  2. **Check** — calls the matching `drill-*` with the brief and the grunt's output. The drill returns a strict JSON verdict: `{"verdict": "PASS"|"FAIL", "checks": [...], "unverified": [...], "issues": [...], "suggested_fixes": [...], "blocking": <bool>}`. Each check has to name *where* it looked — a `path:line`, a URL, or the exact command for `how: ran` with a verbatim output line — and anything the drill could not check goes in `unverified` rather than being dressed up as evidence. Drills deny everything by default except local reads/searches, skills, webfetch/websearch and allowlisted read-only git/gh/glab commands and text filters; MCP and Code Mode stay denied. Tests, builds, migrations and state-changing commands remain execution handoffs for the orchestrator's own sanity-check.
  3. **Act** — on `PASS`, the orchestrator runs a final sanity-check (e.g. tests/lint) and delivers the result. On `FAIL`, it retries — up to **3 iterations total**, then escalates to the user rather than retrying blindly.

### Matching the delegate (capability & risk)

Both roles use native ordered `permissions:` rules, `model: provider/model#variant`, and `disabled: true` when parked. Grunts explicitly allow edit and shell, then deny all subagent launches; drills keep the deny-by-default inspection policy.

Delegating only helps if the delegate is actually fit for the task. The injected inventory lists each subagent's model, and the orchestrator weighs two things before handing work over:

- **Capability** — the orchestrator routes by what the *specific* models involved are good and bad at as of the current date (its own model and each subagent's model are in the bootstrap/inventory), rather than from fixed rules. High-cognition work (analysis, architecture, ambiguous trade-offs) is not handed to the cheapest drafted `grunt-*`, where a weak model would produce confident nonsense — it picks a strong-model delegate or keeps the task itself. **This cuts both ways:** when the orchestrator itself runs on a mid/cheap model and a task (or a pivotal call inside it) is beyond its depth, it escalates *up* — delegating the whole task to a stronger grunt, or consulting one for a second opinion before committing (advisor-style), rather than guessing.
- **Risk / blast radius** — for production writes, destructive operations, and migrations, investigation and a dry-run plan may be delegated, but the **apply step is never blind**: the orchestrator surfaces the exact plan/commands, waits for your explicit confirmation, and only then applies. An unsupervised prod-write is never handed to the cheapest `grunt-*` (its broad `shell`/`edit` permissions would execute it without a second opinion).

### Weighing real cost (caching, subscriptions, context)

Delegation isn't automatically the cheap option — three factors can flip it:

- **Prompt/KV caching** — a fresh `grunt-*` session starts with no cache hit on your accumulated context, while continuing yourself on a provider with prompt caching reuses your already-cached prefix at a steep discount. For a small task on top of a large, already-cached context, finishing it yourself can beat the cost of writing a brief, spinning up a grunt cold, and reading its result back.
- **Subscription vs API billing** — a grunt shown as `subscription: <plan>` by `squad_metrics` (see above) costs the user ~$0 marginally regardless of tokens; an API-billed grunt's cost scales with usage. When quality is comparable, the orchestrator prefers the subscription-covered delegate and saves API-billed models for when they're genuinely the better fit — not by default.
- **Context pressure is not a panic button** — the live `<ORCHESTRATE_CONTEXT>` line is for genuinely heavy work, not an excuse to delegate every minor task once usage looks high. opencode compacts automatically, and for small/quick work the overhead of a task brief plus a grunt round-trip usually costs more than just doing it and letting compaction absorb the overflow.

For full routing rules, escape hatches, and edge-case handling see [skills/squad-delegate/SKILL.md](skills/squad-delegate/SKILL.md).

---

## Forcing a mode

The verdict is the model's call, but you steer it directly:

- **Force SELF** — say *"do it yourself"* (or "делай сам") in your request. This is a first-class override: the orchestrator skips delegation entirely.
- **Force DELEGATE** — just say *"delegate this"* / *"делегируй"*. The orchestrator follows the instruction even when a task would otherwise look trivial.
- **Force a specific subagent** — name it: *"delegate to `Explore`"*, *"use `grunt-anthropic-claude-sonnet-5`"*. Naming one is decisive.
- **Skip the drill** — frame the task as read-only / investigation, or say so outright ("just investigate, no review"). Changes always default to the full PDCA loop.

You can confirm the orchestrator is in the right mode by reading its first line — it prints `SELF: …` or `DELEGATE: …` with its reasoning before acting.

---

## What a turn looks like

The orchestrator opens with its verdict, then proceeds:

| Request | Verdict (first line) | What happens |
|---|---|---|
| "Is the working tree clean?" | `SELF: single trivial read.` | Runs `git status` itself. No subagents. |
| "Why are the prod pages timing out?" | `DELEGATE: investigation across logs/metrics → Explore, no drill.` | A read agent digs through logs/metrics; the orchestrator sanity-checks the findings and reports. |
| "Add input validation to the upload endpoint." | `DELEGATE: produces code → grunt, full PDCA.` | `grunt` implements, `drill` checks against the definition of done, up to 3 iterations, then a final sanity-check. |
| "Drop the stale `sessions_old` table on prod." | `DELEGATE: high-risk write — plan first, confirm before apply.` | Investigation and a dry-run plan may be delegated; the exact command is surfaced and **waits for your confirmation** before anything runs. |

---

## Troubleshooting

**Confirm the plugin loaded**

Check the OpenCode log for a line referencing `opencode-squad` (plugin id `orchestrate`). If the plugin fails to load, the log prints the error immediately after startup.

**Subagents are hidden — that is intentional**

`grunt-*` and `drill-*` do not appear in the `@` mention menu because they are registered with `hidden: true`. They are invoked internally by the orchestrator. If you need to verify they are registered, use a one-off session and ask the model to list available subagents (it can introspect the session state).

**Orchestrator says there's no squad**

There is no bundled grunt/drill fallback agent — if `~/.config/opencode/agent/` (or a project's `.opencode/agent/`) has no `grunt-*`/`drill-*` files, the bootstrap tells sarge to send you to the `squad-draft` skill instead of delegating. Run it once.

**Check which mode it chose**

The orchestrator prints its verdict (`SELF: …` / `DELEGATE: …`) as the first line of its reply. If it delegated when you wanted it to act itself, prepend "do it yourself" to your request; if it acted itself when you wanted delegation, say "delegate this". See [Forcing a mode](#forcing-a-mode).

**Iteration cap and cost**

A full PDCA iteration (the *changes* branch) fires two LLM calls (grunt + drill) on top of the orchestrator's own context. On a complex task with 3 iterations that is potentially 7+ model calls. Read-only / investigation delegations skip the drill, and trivial tasks are handled by the orchestrator directly — so cost scales with task weight, which is what the selection signals (and the live context line) are there to gauge.

---

## Development

```bash
npm install
npm test          # vitest — unit suite for src/ (bootstrap, inventory, context, metrics, model-data, workers, rate-limit-guard)
npm run coverage  # vitest + @vitest/coverage-v8, scoped to src/**; CI-gated at 80% (statements/branches/functions/lines)
npm run lint      # biome check — formatting + lint
npm run lint:fix  # biome check --write
npm run knip      # unused files/exports/dependencies
```

Coverage is scoped to `src/**` on purpose — that's the decision-logic layer separated from `.opencode/lib/orchestrate-v2.js`'s session/tool hook plumbing. Package-entry tests additionally check registration and native agent generation.

---

## License

MIT — see [LICENSE](LICENSE).
