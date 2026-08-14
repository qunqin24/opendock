# Stochastic Discourse Descent (SDD)

> A consensus-based multi-agent debate engine, shipped as a native
> [opencode](https://opencode.ai) plugin. Debate as gradient descent toward consensus.

**Make several cheap LLMs argue a question to consensus — and get a materially better answer than any one of them could give alone.**

`discourse-descent` is a native [opencode](https://opencode.ai) plugin. It runs a panel of LLM
"debaters" — each backed by a *different* model — through several temperature-annealed rounds. A
coordinator judges convergence each round and synthesizes one final answer. It's a drop-in tool:
`/debate <question>`.

![Debate vs single models on GPQA Diamond](docs/assets/gpqa_diamond.svg)

## The result

On **GPQA Diamond** (198 graduate-level, "Google-proof" science questions) a panel of four *small,
cheap* models — 2× Claude Haiku 4.5, 2× Gemini 3.1 Flash-lite, with a Claude Haiku 4.5 coordinator —
scored:

| | accuracy | vs debate |
|---|---|---|
| **Debate (final answer)** | **78.3%** | — |
| Best single debater (solo) | 68.7% | **+9.6 pts** |
| Average single debater (solo) | 58.3% | **+19.9 pts** |
| Oracle — any debater was right | 87.9% | headroom left on the table |
| Random chance | 25% | — |

For context, the [GPQA paper](https://arxiv.org/abs/2311.12022) reports **PhD-domain experts at 65%**
and a **GPT-4 baseline at 39%** on the (easier) main set. Four small models debating cleared the
paper's expert bar on the *harder* Diamond subset — while individually averaging 58%.

> The lift is the whole point: debate turns a bag of mediocre-but-diverse answers into one good one.
> The 87.9% oracle says the panel *usually contains* the right answer — better synthesis captures more of it.

<sub>These numbers were measured on the full
Diamond set with the `sgd` strategy; raw data + full provenance in
[`docs/benchmarks/gpqa_diamond/`](docs/benchmarks/gpqa_diamond/). One caveat: the human/GPT-4 baselines are
from the GPQA paper's easier *main* set, so cross-comparisons are indicative, not head-to-head.</sub>

## The problem it solves

A single LLM call on a hard reasoning question is a fancy coin flip you can't inspect: one sample, one
chain of thought, no second opinion. Sampling the *same* model again mostly repeats its blind spots.
`discourse-descent` instead runs **different models** with **different personas**, lets them see and
rebut each other, and anneals from "argue hard" to "find common ground" — so mistakes get challenged
and the panel converges on what survives scrutiny. You trade tokens for accuracy on the questions
where accuracy is worth it.

## How it works

Each round:

1. **Debate** — every debater (any roster, ≥ 2) answers in parallel, seeing the *other* debaters'
   previous-round positions inline in its prompt.
2. **Anneal** — a temperature ramps from `1.0` (round 1, `FIRM`) down to `0.0` (final round,
   `CONSENSUS-SEEKING`). Early rounds argue; late rounds converge.
3. **Judge** — the coordinator reads all positions and returns a structured convergence judgment.
4. **Stop** — the debate ends early only when it has converged **and** agreement clears the
   threshold; otherwise it runs to `maxRounds`.
5. **Synthesize** — the coordinator produces the single final answer.

Relevant past debates are retrieved from a local RAG memory (transformers.js embeddings) and injected
as context, so the panel can build on prior conclusions.

## Install

Published on npm as [`discourse-descent`](https://www.npmjs.com/package/discourse-descent).

### OpenCode plugin

Add the package name to your `opencode.json`. OpenCode installs npm plugins from the registry
automatically at startup — no manual `npm install` in your project:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["discourse-descent"],
  "command": {
    "debate": {
      "template": "Use the `debate` tool to run a consensus debate on: $ARGUMENTS",
      "description": "Run a multi-agent consensus debate"
    }
  }
}
```

Authenticate the providers your roster uses (`opencode auth login`).

### Local development

To work on this repo instead of the published package, point `plugin` at the checkout after
`npm run build`:

```json
{
  "plugin": ["./"]
}
```

### Programmatic use

To import `runDebate`, `createOpencodeDebateClient`, strategies, etc. outside the plugin entrypoint:

```bash
npm install discourse-descent @opencode-ai/plugin @opencode-ai/sdk
```

(`@opencode-ai/plugin` and `@opencode-ai/sdk` are peer dependencies — install them in your app.)

## Use

In the opencode TUI:

```
/debate Should we adopt a monorepo?
```

or call the tool directly from an agent:

```
debate({ question, scope?, maxRounds?, strategy?, config? })
```

It streams per-round progress as toasts + logs and returns a summary plus the full `DebateResult`
JSON (answer, `finalValue`, confidence, convergence metrics, loss curve, token usage).

### Demo

An opt-in live dashboard over Server-Sent Events — one card per debater per
round (full positions), the coordinator's per-round verdict, and the final synthesis. Run any
debate with `DEBATE_DASHBOARD=1` set and open the URL from the toast:

```bash
DEBATE_DASHBOARD=1 DEBATE_DASHBOARD_PORT=4123 opencode   # then /debate …, open http://127.0.0.1:4123
```

![discourse-descent live dashboard](docs/assets/dashboard.gif)

<!-- Regenerate with NO tokens/auth: `npm run dashboard:preview` (populates http://127.0.0.1:4123),
     then `tsx scripts/dashboard-gif.ts` → docs/assets/dashboard.gif (drives system Chrome headless). -->

## Cost & when to use

Debate is deliberately expensive: it's several models × several rounds. On the GPQA run above, a
single question cost **~0.6M–1.2M tokens** (cheap models, so still cents each). Reach for it on
**hard, high-value questions** — thorny design calls, science/math reasoning, ambiguous trade-offs —
not on things one fast call already nails.

## Configure

Debaters, models, and run params are a Zod-validated `DebateSettings`, loadable from JSON so you can
run any roster (any names, any count ≥ 2) without editing code. Precedence:
explicit `config` arg → `DEBATE_CONFIG` env var → built-in defaults. See
[`debate_config.example.json`](./debate_config.example.json).

A model is `{ providerID, modelID }` — resolved by opencode against whatever providers you've
authenticated. Each debater may add an optional `persona` and a `tools` allowlist (defaults to a
read-only set: `read`/`grep`/`glob`/`list`/`webfetch`). Distinct models + distinct personas are what
make positions diverge — and divergence is what the debate exploits.

> **Tools drive accuracy on quantitative tasks.** The default roster is read-only. The GPQA reference
> run above let debaters **execute code**, which likely accounts for much of its edge on numeric
> questions. If you're benchmarking math/science, add a code/bash tool to the debaters' `tools`
> allowlist — at the cost of running model-written code. See
> [`debate_config.code.example.json`](debate_config.code.example.json) for a ready-made code-enabled
> roster (`bash: true`, write/edit/patch still off).

### Steering strategies (the optimizer analogy)

The debate loop is loosely gradient descent toward consensus, so a *strategy* is the optimizer:
position embeddings are the parameters, group-centroid drift is the gradient, the temperature anneal
is the learning rate. A strategy carries state across rounds and injects per-debater steering
directives into the next prompt. Available `strategy.kind` values:

| kind | behavior |
|------|----------|
| `sgd` | stateless — coordinator only judges + synthesizes (default) |
| `momentum` | EMA of group consensus drift; nudges each debater with/against the trend |
| `rmsprop` | per-debater EMA of drift magnitude; damps thrashers, pushes the stuck |
| `adam` | momentum + rmsprop combined |
| `adagrad` | per-debater *cumulative* drift; a deliberate force-a-decision mode |

The embedding strategies first steer in round 3 (a drift needs two snapshots), so use
`maxRounds >= 4` to exercise them. Full design: [`docs/coordinator_strategies.md`](./docs/coordinator_strategies.md).

## Benchmark

`src/bench.ts` runs each strategy over a real benchmark and compares them on **convergence**,
**correctness**, and **token usage**. It boots an in-process opencode server, calls `runDebate`
directly for a typed `DebateResult`, and grades against ground truth pulled live from the HuggingFace
datasets-server REST API (no HF `datasets` library needed). Grading is deterministic extraction
first, falling back to an LLM judge only when extraction is ambiguous (`--no-judge` to disable).

```bash
npm run bench -- --strategies sgd,momentum --n 5 --max-rounds 4
npm run bench -- --dataset cais/mmlu --dataset-config all --n 10 --no-judge
# GPQA is gated on the Hub: export HF_TOKEN and accept the dataset terms first.
HF_TOKEN=hf_... npm run bench -- --dataset Idavidrein/gpqa --dataset-config gpqa_diamond --split train --n 5 \
  --debate-config docs/benchmarks/gpqa_diamond/roster.json \
  --strategies sgd,momentum,adam,rmsprop
```

### Strategies, measured

The four steering strategies on the full GPQA Diamond run behaved as follows (see
[provenance](docs/benchmarks/gpqa_diamond/)):

| strategy | accuracy | mean rounds | tokens / question | converged |
|---|---|---|---|---|
| `momentum` | 82.3% | 2.1 | 1.08M | 97% |
| `rmsprop` | 79.3% | 2.0 | 0.48M | 99% |
| `sgd` | 78.3% | 2.0 | 0.81M | 98% |
| `adam` | 76.8% | 2.1 | 1.13M | 99% |

On this run `momentum` edged out the others on accuracy; `rmsprop` was a close second at roughly
half the token cost. Debates still averaged only ~2 rounds, so several hypotheses could explain the
spread, none yet verified:

- **H1 — too few rounds.** The embedding strategies first steer in round 3, but debates here averaged
  only ~2 rounds — so on most questions they never actually activated.
- **H2 — untuned Adam.** Its hyperparameters (β / β2 / learning-rate analogue) may not suit this task.
- **H3 — task too easy.** The questions may not be hard enough to separate the strategies.

Treat the optimizer analogy as an experiment to
run on *your* task, not a ranking that transfers — the win came from the debate itself, and steering
is a second-order knob on top of it.

Flags: `--strategies`, `--n`, `--dataset` / `--dataset-config` / `--split`, `--offset`, `--seed`
(GPQA option-shuffle), `--max-rounds` (use `>= 4`), `--workers` (concurrent debates), `--no-judge`,
`--append`, `--skip-completed` (resume: skip successful `(strategy, item)` pairs already in
`runs.csv`; implies `--append`; error rows are retried), `--attach <url>` (reuse a running
`opencode serve`), `--debate-config`, `--out`. Writes a
per-strategy table, a debate-lift table, and `runs.csv` / `summary.csv`.

## Architecture

```
/debate (TUI)  ->  debate tool (plugin.ts)  ->  runDebate(client, ...) (orchestrator.ts)
                                                    |-- per debater/round: opencode sessions (read-only tools, distinct models)
                                                    |-- strategies.ts (SGD/Momentum/RMSprop/Adam/Adagrad)
                                                    |-- memory.ts (transformers.js + brute-force cosine store)
                                                    '-- coordinator session -> structured JSON judgment + synthesis
```

- **`client.ts`** — the `DebateClient` interface (the whole engine + test suite depend only on this)
  and the `createOpencodeDebateClient` adapter over the real opencode SDK client.
- **`orchestrator.ts`** — `runDebate`: rounds, parallel debaters, inline position exchange, dual stop
  condition, persistence, token aggregation, progress.
- **`strategies.ts`** — the five steering strategies + `buildStrategy`.
- **`memory.ts`** — transformers.js embeddings (`Xenova/all-MiniLM-L6-v2`) + a brute-force cosine
  index persisted to JSON per scope. Injectable embedder so tests never download a model.
- **`prompts.ts`** — temperature annealing, the shared temperature→mode helper, prompt builders.
- **`schemas.ts`** — Zod schemas + JSON Schema exports for the coordinator's structured output.
- **`settings.ts`** — the Zod config.

### A note on structured output

The coordinator targets opencode's native `format: { type: "json_schema" }` structured output. As of
the current SDK type surface that field may be absent, so the coordinator doesn't depend on it: it
requests JSON, parses + Zod-validates + retries, and *also* passes `format` through in case a build
supports it (a native structured output on the response is preferred over parsing). The exact SDK
call shapes live only in `client.ts` — confirm them against a running server's `/doc` and adjust that
one file if they differ.

## Develop

```bash
npm install
npm run test        # vitest — fully offline (mocked client, injected embedder)
npm run typecheck   # tsc --noEmit
npm run build       # tsup -> dist/
npm run check       # typecheck + test + build
```

### Release

Bump `version` in `package.json`, merge to `main`, then tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

CI runs tests on the tag and publishes [`discourse-descent`](https://www.npmjs.com/package/discourse-descent)
to npm when the tag matches `package.json` (e.g. tag `v0.1.0` → version `0.1.0`). Publishing uses
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC from GitHub Actions — no
long-lived `NPM_TOKEN`).
