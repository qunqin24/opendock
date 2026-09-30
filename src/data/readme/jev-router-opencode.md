# jev-router

A **System 1 decision layer** for [OpenCode](https://opencode.ai). A small, fast
classifier — [Laya](https://github.com/typesafelabs/laya) (open source) or
[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
(proprietary) — reads each incoming prompt and picks which downstream LLM should
answer it. Cheap questions land on a cheap model; architecture and migrations
land on a strong one.

Two rules shape everything else:

1. **The decision layer never writes the answer.** It selects a model. Your
   prompt reaches the selected model byte-for-byte unmodified.
2. **The router can never make OpenCode unusable.** If the engine is slow, down,
   or returns nonsense, the request proceeds on a fallback model. The only
   observable difference is a log line.

```
                    ┌──────────────────────────────────────────────┐
   your prompt ───► │  jev-router                                 │
   (unmodified)     │                                              │
                    │  1. build compact state   (src/context)      │
                    │  2. ask the decision engine (src/decision)   │  ~4 ms *
                    │  3. score every model in the registry        │  warm
                    │     (src/router/policy.ts)                   │
                    │  4. gate, threshold, pick, fall back         │
                    └───────────────┬──────────────────────────────┘
                                    │  session.switchModel(...)
                                    ▼
                          your System 2 model
```

Engine latency depends entirely on your hardware and which engine you select.
~4 ms is the default offline estimator. Laya is ~350 ms warm on a GPU and
9-15 s on a CPU, which is why it is opt-in rather than the default. See
[Latency, measured](#latency-measured) for the numbers behind that claim.

---

## Contents

- [Install](#install)
- [Laya setup](#laya-setup)
- [Jev setup](#jev-setup)
- [The model registry](#the-model-registry)
- [The decision schema](#the-decision-schema)
- [How a model is chosen](#how-a-model-is-chosen)
- [OpenCode integration](#opencode-integration)
- [CLI](#cli)
- [Configuration reference](#configuration-reference)
- [Why `answer_confidence` and not `confidence`](#why-answer_confidence-and-not-confidence)
- [Latency](#latency)
- [Latency, measured](#latency-measured)
- [Architecture](#architecture)
- [Testing](#testing)
- [Limitations and assumptions](#limitations-and-assumptions)

---

## Install

```bash
npm install jev-router-opencode
```

Then register it in your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["jev-router-opencode"]
}
```

That is enough to install the plugin. Nothing routes until you have a
`jevrouter.config.json` declaring at least one model, and a decision engine that
answers. Until then the plugin loads, logs why routing is off, and OpenCode
behaves exactly as it did before.

To see the decisions before letting them act:

```jsonc
{
  "plugin": ["jev-router-opencode"],
  "options": { "jev-router-opencode": { "routing": { "mode": "observe", "enable_debug": true } } }
}
```

`observe` computes everything and reports it, but never switches a model. Flip
to `route` when the decisions look right.

### Registering from a local checkout

The route that matters during development is a vendored directory, because it
picks up your edits without a reinstall:

```
your-project/
  opencode.jsonc
  .opencode/plugins/jevrouter/package.json
  .opencode/plugins/jevrouter/index.js
```

```jsonc
// .opencode/plugins/jevrouter/package.json
{ "name": "jevrouter-local", "type": "module", "main": "index.js",
  "dependencies": { "jev-router-opencode": "file:/absolute/path/to/jev-router" } }
```

```js
// .opencode/plugins/jevrouter/index.js
export { default } from "jev-router-opencode/plugin";
```

```jsonc
// opencode.jsonc
{ "plugin": ["./plugins/jevrouter"] }
```

> **`npm install` must run inside `.opencode/plugins/jevrouter/`, not the project
> root.** A `file:` dependency declared in a nested `package.json` is not part of
> the root install graph, so a root `npm install` reports success and installs
> nothing. OpenCode then fails to load the plugin with
> `Cannot find package 'jev-router-opencode' imported from .../index.js` — check
> `~/.local/share/opencode/log/opencode.log` for that.

Restart OpenCode, or run `opencode reload`, after changing plugin code.

From source:

```bash
npm install
npm run build
npm test
```

---

## Laya setup

[Laya](https://github.com/typesafelabs/laya) is a family of small decision
models. jev-router talks to it two ways.

### Warm Python worker (default, recommended)

A long-lived `python3` process holds `laya.Router(preload=True)` with its
checkpoints resident in memory. A decision is then one forward pass — no process
start, no HTTP, no checkpoint build. This is the transport that preserves the
System 1 latency advantage, and it is what `"transport": "worker"` selects.

```bash
pip install laya
python examples/laya_worker.py --selftest   # optional: confirm the import
python examples/prefetch_laya.py            # one-time: download the checkpoints
```

Nothing else is needed. The worker script ships in `examples/laya_worker.py` and
the plugin locates it automatically.

`prefetch_laya.py` matters on a cold cache. The first `warm` otherwise spends
minutes downloading checkpoints from Hugging Face *inside* its own startup
budget and reports a confusing timeout. It took ~12 minutes here.

Then check that the budget is actually viable:

```bash
node dist/src/cli/main.js warm
```

That warms the engine, times one real decision, and tells you if `timeout_ms`
can afford it. **Do not skip it** — an engine that is too slow for its budget
does not error, it falls back on every request while still paying the full
budget, and nothing in normal output reveals that. See
[Latency, measured](#latency-measured).

What happens under the hood:

- The process speaks newline-delimited JSON on stdin/stdout. Diagnostics go to
  stderr, so a stray library log line cannot corrupt the protocol.
- Checkpoints are built once at startup (`warmup_on_start`), which takes
  38–45 s on a CPU, plus ~12 minutes to download on a cold cache. Every later
  decision is a forward pass — which on a CPU still costs 9–15 s for the full
  question set. See [Latency](#latency).
- If the interpreter hangs, the process is killed and the request falls back. A
  hung Python cannot be cancelled, so a fresh process is the only recovery.

**Windows note.** `python3` on Windows is often the Microsoft Store *app
execution alias* — a stub that prints an install prompt and exits non-zero
instead of failing to spawn. jev-router probes the interpreter once at startup
and, on Windows only, widens the search to `python` and `py`. If all of them
fail you get a config error naming `decision_engine.python` rather than an
obscure "worker exited with code 9009". Set the field explicitly if the probe
picks the wrong one.

### HTTP (`laya-serve`)

The same decision surface behind FastAPI — useful when Laya runs on a GPU box
and OpenCode does not.

```bash
LAYA_HOST=0.0.0.0 LAYA_PORT=8000 LAYA_PRELOAD=1 laya-serve
```

```jsonc
{ "decision_engine": { "transport": "http", "endpoint": "http://gpu-box:8000" } }
```

`laya-serve` defaults worth knowing: `LAYA_MAX_CONCURRENT=16` (excess requests
get a 503), and `LAYA_API_KEY` enables a bearer check. If it is set, put the
value in the environment and name it in the config:

```jsonc
{ "decision_engine": { "api_key_env": "LAYA_API_KEY" } }
```

The config file has **no field for a token**, only a field naming the variable
that holds it. The value is read at request time and never written back out.

**No batching.** Laya's HTTP API has no batch endpoint, so there is nothing to
batch at the HTTP layer. The router does collapse concurrent identical requests
into a single engine call, which is the only batching available.

### Checkpoint selection

Leave `"model": null` to let Laya choose. To pin one:

| value | when |
| --- | --- |
| `english` | faster if your traffic is English |
| `multilingual` | non-English prompts; use this if you see mixed-language sessions |
| `typed-decisions` | the typed (`choice` / `score` / `noul`) question surface |

### Offline heuristic (no Laya at all)

`"provider": "none"` swaps in a lexical estimator. It needs no Python, no
network, and no checkpoint, and it is genuinely useful for trying the router out
or for CI. It is **not** a System 1 model and the CLI says so in its output.

---

## Jev setup

Jev is the proprietary member of the same family. It speaks the same typed
decision protocol over HTTP.

```jsonc
{
  "decision_engine": {
    "provider": "jev",
    "endpoint": "https://api.typesafe.ai",
    "model": "system-one",
    "api_key_env": "JEV_TOKEN"
  }
}
```

```bash
export JEV_TOKEN=...
```

`"provider": "jev"` on its own is a working config: the default transport
follows the provider, so you do not also have to write `"transport": "http"`.
Setting it explicitly to `"worker"` is an error, because there is no in-process
Jev implementation here.

Nothing in this repository uses or requires knowledge of Jev internals. The
`DecisionEngine` interface is the whole contract, and `JevEngine` is a thin
translation layer over the same wire format Laya uses.

---

## The model registry

Models live in your config, not in the source. Aliases are yours to choose;
nothing downstream knows a provider or a model id.

```jsonc
{
  "models": {
    "fast": {
      "provider": "anthropic",
      "model": "claude-haiku-4-5-20251001",
      "capabilities": ["coding", "general", "tools", "fast"],
      "cost": "low",
      "priority": 1
    },
    "balanced": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250929",
      "capabilities": ["coding", "reasoning", "general", "context", "tools", "repository", "security"],
      "cost": "medium",
      "priority": 2
    },
    "deep": {
      "provider": "anthropic",
      "model": "claude-opus-4-1-20250805",
      "variant": "max",
      "capabilities": ["coding", "reasoning", "context", "repository", "security", "architecture"],
      "cost": "high",
      "priority": 3
    }
  }
}
```

| field | meaning |
| --- | --- |
| `provider`, `model`, `variant` | mapped to OpenCode's `ModelRef` verbatim |
| `capabilities` | free-form tags. The policy layer matches traits against them |
| `cost` | `low` / `medium` / `high`. Metadata for humans; not used in scoring |
| `priority` | tie-break and fallback ordering. Higher wins |
| `description` | fed to the engine as the option text for the direct model question |

**Adding a model is all it takes to make it routable.** The direct model
question is generated from the registry at startup, so a new entry immediately
becomes a question option. Nothing needs to be declared twice.

`priority` also decides the automatic fallback: if `fallback_model` is unset,
the highest-priority enabled model is used.

A full, commented example lives in
[`examples/jevrouter.config.json`](examples/jevrouter.config.json).

---

## The decision schema

The engine is asked a fixed set of typed questions. Two are structural, the rest
are configurable `noul` (probability) traits.

**`task_type`** — `choice`. "Which single category best describes the primary
intent of this request?" Nine criteria by default: `simple_question`,
`code_explanation`, `code_generation`, `debugging`, `architecture`, `refactor`,
`data_analysis`, `documentation`, `devops`.

**`complexity`** — `score`, normalised to `[0, 1]` and then to a level
(`trivial`, `small`, `medium`, `large`). Not used directly: it becomes a
synthetic trait that gates and scores models, so "complex work" and "needs the
security capability" travel the same path.

**Traits** — `noul`, each returning a probability:

| id | weight | capability demanded |
| --- | --- | --- |
| `coding_required` | 1.0 | `coding` |
| `reasoning_required` | 1.4 | `reasoning` |
| `context_required` | 0.8 | `context` |
| `tool_required` | 0.6 | `tools` |
| `terminal_required` | 0.4 | `terminal` |
| `repository_wide` | 0.7 | `repository` |
| `security_sensitive` | 0.9 | `security` |
| `verification_required` | 0.4 | — |

**`model`** — `choice`, derived from the registry. Ask the engine directly which
model should answer, instead of only inferring it from traits. Its distribution
is blended with the trait-derived utility (`direct_weight` / `trait_weight`).

Every option carries a description. Both Laya and Jev read the option text, so a
bare label is materially worse than a labelled one.

### Customising

Traits are merged over the shipped defaults, so you can retune one field without
retyping the question:

```jsonc
{
  "questions": {
    "traits": {
      "reasoning_required": { "weight": 2.5 },
      "context_required":  null,
      "needs_charts": { "weight": 0.5, "capability": "data",
                        "question": { "type": "noul",
                                      "instructions": "Will this produce a chart?" } }
    }
  }
}
```

`null` removes a trait. A brand-new trait id must bring its own `question`,
because there is no default to inherit.

The engine has hard limits (32 properties, 512 total options). jev-router counts
both and warns at startup rather than letting the request be rejected.

---

## How a model is chosen

`src/router/policy.ts` turns the engine's answers into a distribution over your
registry:

1. **Score each model.** Every trait contributes `weight × probability` if the
   model carries the matching capability. `task_type_affinity` adds an optional
   per-task-type nudge. Complexity arrives as another synthetic trait.
2. **Gate.** A trait at or above `capability_gate_threshold` (default 0.75)
   *excludes* models lacking that capability. A gate that would exclude every
   model is ignored — a broken gate must not leave nothing to choose from.
3. **Blend** the trait-derived utility with the engine's own `model`
   distribution, then softmax with `temperature`.
4. **Threshold.** Below `confidence_threshold`, or below `min_margin` over the
   runner-up, fall back instead of guessing. Raise these if you see coin-flips.
5. **Fall back** to `fallback_model`, or the highest-priority enabled model.

Every step is visible in the CLI output, which is the intended way to tune the
weights:

```
$ jevrouter "build a production-ready Next.js auth system with OAuth and RBAC"

Task:      devops
Complexity: 2.99 — large: a cross-cutting refactor, an unfamiliar subsystem, or a hard bug
Signals:   security_sensitive=0.77 tool_required=0.60 complexity=0.60 terminal_required=0.58

Model probabilities:
  deep      0.56  █████████████   (engine: 0.43)
  balanced  0.44  ███████████   (engine: 0.33)
  fast      excluded: needs 'security' (security_sensitive=0.77)

Selected:  balanced  (fallback — low-confidence)
Confidence: 0.66   margin: 0.12
Detail:    confidence 0.66 < threshold 0.7
```

`(engine: 0.43)` is the engine's own opinion; the number before it is after
gating and blending. The `excluded:` line is the gate doing its job.

### What the engine sees

`buildRoutingInput` builds a compact state — never a transcript, never file
contents:

| field | source |
| --- | --- |
| `prompt` | the user's prompt, head-and-tail clipped to `max_prompt_chars` |
| `agent` | the current OpenCode agent, when known |
| `tools` | names of the currently active tools |
| `files` | files attached to the turn |
| `turn` | turn index in the session |
| `history` | the last `history_turns` turns, each clipped |
| `languages` | detected repository languages |
| `repository` | `{ vcs, size }` |

Absent signals are **omitted, not defaulted**. The engine is never shown
something the router did not actually observe.

Long prompts keep their head *and* their tail. Coding requests put the ask in
the first sentence and the constraints — the error, the stack frame, the
acceptance criteria — at the end; a plain prefix would drop exactly the part
that changes the decision.

---

## OpenCode integration

`src/opencode/index.ts` is the plugin. It hooks one event:

```ts
ctx.session.hook("prompt", async (input, output) => { ... })
```

Inside the hook it classifies the prompt and, if the decision is trustworthy,
calls `ctx.session.switchModel()`.

**Why that hook.** Model resolution happens *after* prompt admission, so the
awaited `prompt` hook is the only interception point that runs before the model
is chosen. `PromptInput.Prompt` and `SessionPromptInput` carry no `model` field,
which makes `switchModel` the supported mutation mechanism rather than a
workaround. The docs also note the hook runs once per admission, not per model
call — so tool-driven continuations do not re-trigger routing, which is the
behaviour you want.

A `context` hook is registered alongside it, purely to observe. It is the only
source of the active tool names and of the model OpenCode *actually* resolved,
and it is what powers the mismatch warning described below.

Other integration surface:

- **`/jevrouter <text>`** — explain how a prompt *would* be routed, without
  sending it. No configuration needed.
- **`routing.verify`** (default on) — after a turn, compare the decision against
  the model OpenCode actually resolved, and log a warning on mismatch. This is
  your only runtime signal that the switch took effect.
- **`routing.apply_mode: "observe"`** — the escape hatch. The decision is
  computed and reported, `switchModel` is never called.

Config precedence, lowest to highest:

```
jevrouter.config.json  <  JEVROUTER_* env vars  <  "options" in opencode.jsonc
```

Config files are searched in this order: `./jevrouter.config.json`,
`./.opencode/jevrouter.config.json`, `./.jevrouter.json`,
`./opencode.jevrouter.json`, `./jevrouter.json`, then
`~/.config/opencode/jevrouter.config.json`. JSONC comments are tolerated.

OpenCode's own config precedence still applies on top:
`~/.config/opencode/opencode.jsonc` → `./opencode.jsonc` →
`./.opencode/opencode.jsonc`. A plugin can be disabled per config with
`"-jev-router-opencode"`.

See [`examples/opencode.jsonc`](examples/opencode.jsonc) for all three
registration routes (package, local directory, relative path).

---

## CLI

```
jevrouter [options] <prompt>    explain how a prompt would be routed
jevrouter models                 list the configured model registry
jevrouter health                 probe the decision engine
jevrouter warm                   load checkpoints, time one decision, then exit
jevrouter config                 print the resolved configuration
```

| flag | |
| --- | --- |
| `-c, --config <path>` | config file (default: search) |
| `--agent <name>` | pretend the OpenCode agent is `<name>` |
| `--tools <a,b>` | pretend these tools are active |
| `--lang <a,b>` | declare repository languages |
| `--json` | machine-readable output |
| `--threshold <n>` | override `routing.confidence_threshold` |
| `--fallback <name>` | override `routing.fallback_model` |
| `--mode <m>` | override `routing.mode` |
| `--input <file>` | read the prompt from a file |
| `--stdin` | read the prompt from stdin |
| `--explain` | include the raw engine payload |

The CLI is the tuning tool. `route "..."` from the project root reads the same
config the plugin does, so a decision you can explain in the terminal is the
same decision the plugin will make.

`warm` is worth running once after installing Laya. It loads the checkpoints so
the first real prompt in OpenCode does not pay the load cost, and then times one
decision to confirm `timeout_ms` can actually afford it. It exits non-zero if the
engine is unhealthy, and prints advice when the budget is too small —
[Latency, measured](#latency-measured) has the details.

---

## Configuration reference

Full annotated example: [`examples/jevrouter.config.json`](examples/jevrouter.config.json).

### `decision_engine`

The default provider is `none`, the offline heuristic, and that is deliberate
rather than cautious. Laya's latency is entirely hardware-dependent — fast on a
GPU, unusable on a CPU — so defaulting to it would mean a fresh install is slow
on a machine the router knows nothing about. `none` is the only engine fast
enough everywhere (~4 ms). Set `laya` once you know your hardware, and use
`jevrouter warm` to measure it. See
[Latency, measured](#latency-measured).

| key | default | |
| --- | --- | --- |
| `provider` | `none` | `none` (offline), `laya`, or `jev` |
| `transport` | follows provider | `worker` (warm python) or `http` |
| `endpoint` | `http://127.0.0.1:8000` | http transport only |
| `model` | `null` | checkpoint name or Jev model id |
| `python` | `python3` | interpreter for the worker transport |
| `device` | `null` | `cpu`, `cuda`, … |
| `timeout_ms` | `2500` | budget for **one decision** |
| `warmup_timeout_ms` | `30000` | budget for loading checkpoints |
| `warmup_on_start` | `true` | load at startup rather than on first use |
| `failure_threshold` | `3` | failures before the breaker opens |
| `cooldown_ms` | `15000` | how long the breaker stays open |
| `api_key_env` | `LAYA_API_KEY` | **name** of the token variable, never a value |
| `max_properties` | `32` | engine limit |
| `max_total_options` | `512` | engine limit |

### `routing`

| key | default | |
| --- | --- | --- |
| `mode` | `route` | `route`, `observe`, `off` |
| `confidence_threshold` | `0.7` | below this, fall back |
| `min_margin` | `0` | required lead over the runner-up; 0 disables |
| `fallback_model` | `null` | default: highest-priority enabled model |
| `direct_weight` | `1` | weight on the engine's own model choice |
| `trait_weight` | `1.5` | weight on the capability-derived utility |
| `complexity_weight` | `1.2` | complexity as a synthetic trait |
| `complexity_capability` | `reasoning` | capability a high complexity demands |
| `complexity_required` | `true` | whether complexity gates or merely scores |
| `task_type_affinity` | `{}` | per-task-type, per-model bonus |
| `temperature` | `1` | softmax temperature; lower is more decisive |
| `capability_gate_threshold` | `0.75` | trait probability that excludes a model |
| `apply_mode` | `switch` | `switch` or `observe` |
| `apply_timeout_ms` | `5000` | budget for the `switchModel` call |
| `verify` | `true` | log a mismatch warning |
| `enable_debug` | `false` | emit decisions as synthetic messages |
| `announce` | `false` | per-decision transcript annotation |
| `cache_ttl_ms` | `120000` | reuse an identical decision for this long |
| `max_prompt_chars` | `1500` | prompt budget the engine sees |
| `history_turns` | `2` | prior turns summarised |
| `agents` | `null` | restrict routing to these agents |

### Environment overrides

`JEVROUTER_ENGINE`, `JEVROUTER_TRANSPORT`, `JEVROUTER_ENDPOINT`,
`JEVROUTER_TIMEOUT_MS`, `JEVROUTER_PYTHON`, `JEVROUTER_DEVICE`,
`JEVROUTER_NO_WARMUP`, `JEVROUTER_MODE`, `JEVROUTER_DEBUG`,
`JEVROUTER_CONFIDENCE`, `JEVROUTER_FALLBACK`, `JEVROUTER_API_KEY`.

---

## Why `answer_confidence` and not `confidence`

The confidence gate is the one place where the two backends disagree in kind,
and getting it wrong means the threshold means different things on each.

**Laya's `confidence` is `1 − normalised entropy`.** It measures how *peaked* a
distribution is. A distribution split 50/50 between two models is maximally
uncertain about the answer, and a distribution split 95/5 is confident — even
though the second might be confidently wrong. Crucially, entropy is comparable
*within* a question but not *across* questions: a `noul` trait with two options
has a different entropy scale from a `choice` over nine.

**Jev's `confidence` is `(n·p − 1)/(n − 1)`.** A different quantity on a
different scale again.

`answer_confidence` is P(the reported answer) — the probability assigned to the
answer that was actually given. That is the same quantity on both backends, and
it is comparable across question types, which is exactly what a single
`confidence_threshold` needs.

So the router reads `answer_confidence` when present and falls back to
`confidence` only when it is not. `parseEngineResult` normalises distributions
and records which field it used, so `--explain` shows you what you are actually
thresholding.

---

## Latency

The whole point of a System 1 layer is that it is much cheaper than the decision
it makes. Whether that holds depends almost entirely on where the engine runs.

Measured on a warm engine, 11 questions / 37 options:

| deployment | per decision |
| --- | --- |
| preloaded `laya-serve` on a T4 | ~350 ms (~33 ms/question) |
| warm local worker, 2.1 GHz CPU | **9–15 s** |

CPU cost scales with the number of questions, roughly `~800 ms x questions`,
measured on a 6-thread i5-8500T:

| questions | options | per decision |
| --- | --- | --- |
| 1 | 12 | 0.9 s |
| 3 | 20 | 2.5 s |
| 5 | 24 | 4.1 s |
| 8 | 30 | 6.3 s |
| 11 | 37 | 8.8 s |

> **Inline routing on a CPU is not viable, and the numbers above are why.**
> A 9 s decision is worse than the model call it is trying to save, so the
> System 1 advantage only exists on a GPU. If you have no GPU, use this to
> develop and test the plumbing, not to route real traffic. `provider: "none"`
> gives a working router in ~4 ms for that reason.

Cold start, paid once, and worth knowing before you pick a timeout:

| phase | cost on that CPU |
| --- | --- |
| import torch, build, preload 3 checkpoints | 38–45 s |
| first decision (lazy per-property build) | 25–29 s |
| every decision after that | 9–15 s |

The first run also **downloads** the checkpoints from Hugging Face, which took
~12 minutes on a cold cache. Run `python examples/prefetch_laya.py` once so that
cost is not paid inside the warmup budget.

`jevrouter warm` measures all of this for you and tells you whether your
`timeout_ms` is viable — see [Latency, measured](#latency-measured).

> **The shipped `timeout_ms` is 2500, not 100.** A 100 ms budget only works
> against a preloaded GPU server. 2500 ms is sized for that deployment. On the
> CPU above it does not come close: every request times out, pays the full
> 2500 ms, and falls back — silently, and forever. That is the single most
> likely misconfiguration of this tool.
>
> Set `timeout_ms` just above your measured p99, which means running
> `jevrouter warm` first. Exceeding the budget is never fatal — it falls back —
> but it does mean you pay the timeout on every request. Do not set it high
> enough to accommodate a CPU engine: a 30 s budget that succeeds is still worse
> than no router, because you have paid 30 s to make a decision you should not
> have made inline.

What the router does to stay fast:

- **The worker stays warm.** Checkpoints are built once, at startup. Rebuilding
  them per request would cost seconds and defeat the entire design.
- **The prompt is clipped** to `max_prompt_chars` (1 500 by default). The engine
  never reads a long paste.
- **Decisions are cached** for `cache_ttl_ms`, keyed on the prompt and the
  context signals.
- **Concurrent identical requests collapse** into one engine call.
- **The breaker opens** after `failure_threshold` transient failures, so a dead
  engine costs nothing for `cooldown_ms` instead of a timeout on every prompt.
- **Nothing runs per request** that can be hoisted: the question set, the
  registry index, and the policy are all built at construction.

If you must cut latency on a slow box, delete traits from
`config.questions.traits`. Cost is close to linear in the question count, and
`task_type` plus `complexity` plus the model question carry most of the signal.
Measure the result with `node examples/bench_laya.mjs`.

---

## Latency, measured

`jevrouter warm` loads the engine, then times one real decision under a budget
that ignores `timeout_ms`, and compares:

```
$ jevrouter warm
warm in 44983ms — worker alive; loaded=[english, multilingual, typed-decisions] device=None python=3.12.10
one decision: 24892ms for 11 questions / 37 options

A decision took 24892ms but timeout_ms is 2500ms, so every request will time out
and fall back while still paying 2500ms. Raise decision_engine.timeout_ms above
24892, or cut decision cost by removing traits from config.questions.traits
(cost scales with the number of questions).
```

This check exists because the alternative is invisible. An engine that is too
slow does not raise an error: `health()` happily reports a healthy worker, the
first decision quietly times out, and every prompt after that falls back to
`fallback_model` while still paying the full timeout. Nothing in the normal
output distinguishes that from healthy routing.

Use `--json` to get `measured` and `advice` as fields.

---

## Architecture

```
src/
  config/       schema, defaults, validation, file + env loading
  models/       registry: aliases, capabilities, priority, ModelRef mapping
  context/      buildRoutingInput — the compact state the engine reads
  decision/     the DecisionEngine interface and its implementations
    types.ts        the contract: QuestionDefinition, EngineAnswer, EngineError
    questions.ts    config + registry -> typed question set
    parse.ts        wire payload -> EngineAnswer, with normalisation
    laya-engine.ts  Laya over the warm worker or HTTP
    jev-engine.ts   Jev over HTTP
    heuristic-engine.ts  offline lexical estimator, for tests and CI
    worker.ts       the warm python process
    http-transport.ts   the /v1/systemone client
    breaker.ts      circuit breaker
  router/       policy (scoring), fallback (when to distrust), router (orchestration)
  opencode/     the plugin: hooks, switchModel, /jevrouter
  cli/          the jevrouter binary
```

The dependency rule that matters: **`src/decision`, `src/router`, `src/config`,
`src/models` and `src/context` import nothing from OpenCode.** Only
`src/opencode/*` touches `@opencode/plugin`, and only as `import type`, which
erases at compile time. The router is therefore testable, and reusable from any
other host, without an OpenCode installation.

Adding an engine means implementing one interface:

```ts
interface DecisionEngine {
  readonly name: string;
  readonly describe: string;
  decide(input: RoutingInput, questions: QuestionSet, signal?: AbortSignal): Promise<EngineResult>;
  warmup?(signal?: AbortSignal): Promise<void>;
  health(signal?: AbortSignal): Promise<EngineHealth>;
  dispose(): Promise<void>;
}
```

---

## Testing

```bash
npm test          # the full hermetic suite: no Python, no network, no checkpoint
npm run test:live # against a real Laya checkpoint
```

`npm test` never touches the network or spawns Python. Test fixtures are written
in **raw wire format** — `choice`, `noul`, `score`, `probabilities`,
`answer_confidence` — and run through the real `parseEngineResult`, so the
tests prove the router works from actual backend payloads rather than from its
own internal shapes. The scripted test double also drives a real circuit
breaker, so a fallback asserted in a test is the fallback production takes.

The worker transport is tested against a purpose-built fake worker script, which
covers the protocol, stdout noise, timeouts, mid-request crashes, restart, and
unrecognised error kinds.

`npm run test:live` is a separate file (`tests/live-laya.live.ts`, deliberately
outside the default glob) that skips unless a checkpoint is reachable:

```bash
JEVROUTER_LIVE=worker npm run test:live                              # warm worker
JEVROUTER_LIVE=http JEVROUTER_LAYA_ENDPOINT=http://127.0.0.1:8000 \
  npm run test:live                                                  # laya-serve
```

It verifies that a real checkpoint answers every question, that the
distributions sum to one, that every named scenario routes without erroring, and
that the warm round-trip fits inside the configured budget. It prints the
measured latencies.

The shipped example configs are covered by tests too. Documentation that no
longer parses is worse than no documentation.

---

## Limitations and assumptions

**The `switchModel` call path is verified, not assumed.** `switchModel` called
from inside the awaited `prompt` hook was the last unconfirmed thing in the
integration, and it is confirmed against a real OpenCode server. OpenCode records
a `model-switched` event whenever the session model changes, and the router's
switch is recorded *before* the user message is persisted — which is the ordering
that matters. A switch recorded afterwards would only affect the following turn.

```
model-switched events (2):
  -> opencode/nemotron-3-ultra-free   (from opencode/ling-3.0-flash-fin-free)
  -> opencode/ling-3.0-flash-fin-free   (initial)

RESULT: SWITCHED (opencode/ling-3.0-flash-fin-free -> opencode/nemotron-3-ultra-free)
Recorded at 1790678508929, before the user message at 1790678509025:
early enough to affect that turn.
```

Reproduce it against your own project with:

```bash
LIVE_DIR=/path/to/your/project node tests/opencode-switch.live.mjs
```

It needs no API credentials, because the assertion is about the switch event
rather than a model reply. If a future OpenCode changes admission such that the
switch is ignored or late, this script is what will tell you.

The mitigations below are still worth keeping:

1. `routing.verify` (on by default) logs a `[Router]` warning whenever the model
   OpenCode actually resolved differs from the decision. If you see no warnings
   and decisions look right, the switch is working.
2. `apply_mode: "observe"` makes the plugin decision-only. OpenCode is provably
   unaffected, and you keep all the visibility.
3. Nothing else depends on it. The CLI, the policy layer, and the config are
   all independent of OpenCode.

**First-turn tool information is unavailable.** The `context` hook fires after
the first turn, so `input.tools` is absent on a session's opening prompt. The
`tool_required` trait is weaker on turn one by construction. This is a property
of the hook timing, not a choice.

**`confidence` is not comparable across backends or across question types.** See
[above](#why-answer_confidence-and-not-confidence). The gate uses
`answer_confidence` for exactly this reason, and falls back to `confidence` when
that field is absent — so on a backend that only reports `confidence`, the
threshold is meaningful within a question but not across the whole decision.

**No HTTP-level batching.** Laya has no batch endpoint. The router's
single-flight and cache are the only batching available, and they only help
identical concurrent requests.

**The routing quality is the engine's quality, not this layer's.** The offline
heuristic in particular is a rough lexical estimator, and routing with it will
be mediocre. It exists so the plumbing is testable, not because it is a good
classifier.

**Model selection is only as good as the capability declarations.** A model
listed without `reasoning` will be gated out of complex work, and nothing checks
whether the declaration is true. The tags are your claims, not verified facts.

**There is no cost accounting.** `cost` is metadata for humans and is not part
of the scoring. If you want cost-weighted routing, express it as
`task_type_affinity` today; a first-class cost term would be a small addition to
`policy.ts`.

---

## License

MIT
