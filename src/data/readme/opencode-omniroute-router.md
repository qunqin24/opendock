# opencode-omniroute-router

[![CI](https://github.com/ArkeonProject/opencode-omniroute-router/actions/workflows/ci.yml/badge.svg)](https://github.com/ArkeonProject/opencode-omniroute-router/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-omniroute-router)](https://www.npmjs.com/package/opencode-omniroute-router)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Deterministic multi-model task routing for [OpenCode](https://opencode.ai) on top of a self-hosted [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway.**

You describe a task. A lightweight orchestrator classifies it with static rules, and a dispatch plugin deterministically routes it to exactly one worker agent — so you never pick a model by hand, and premium quota (Codex/Claude) is only spent on work that actually needs it.

```text
you → opencode → smart-orchestrator (classifies) → 1 worker → OmniRoute → provider/model
```

## How it works

1. You type a task in plain language.
2. `smart-orchestrator` classifies it on five dimensions: task type, scope, risk, ambiguity, verification.
3. The plugin **rewrites the Task target deterministically** — the LLM proposes, the plugin decides.
4. The selected worker solves the task through your OmniRoute gateway, which picks the concrete provider/connection with fallback.

### Tiers

| Tier | Worker | Kind of work |
| --- | --- | --- |
| Free | `free-worker` | Informational: explanations, docs lookups, reading code |
| Fast | `smart-fast` | Mechanical, behavior-preserving (typos, renames, formatting) |
| Standard | `smart-standard` | Features, known bugs, endpoints, tests |
| Strong | `smart-strong` | High ambiguity, cross-system, risky |
| Expert | `expert` | Critical: concurrency, memory leaks, security, repeated failures |

Workers may **read the repository** and run a strict allowlist of verification commands (tests, build, lint, read-only git). They can never edit files — the primary OpenCode agent owns the working tree.

When a request reports a symptom with an unknown/intermittent cause, the orchestrator first runs **one read-only exploration** with the built-in `explore` agent, then delegates.

Guarantees enforced by the plugin, per user turn: at most one exploration (never after dispatch) and exactly one worker Task.

## Install

Prerequisites: [OpenCode](https://opencode.ai) and a running [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway (local or remote, e.g. Docker).

### Step 1 — Install and start OmniRoute

OmniRoute is the gateway that holds your providers (OAuth subscriptions, API keys, free pools) and serves one OpenAI-compatible endpoint.

```bash
npm install -g omniroute
omniroute serve            # dashboard + API at http://localhost:20128
```

Then connect at least one provider from the dashboard (`http://localhost:20128` → **Providers**), e.g. OAuth for Codex/Gemini or any API-key provider. The built-in free channels (`auto/*`, `opencode/*`) work out of the box with zero credentials.

> For a permanent deployment (home server, VPS), OmniRoute ships an official Docker image (`diegosouzapw/omniroute`) and a daemon mode (`omniroute serve --daemon`). Bind it to loopback or a private network and enable `REQUIRE_API_KEY=true` before exposing it anywhere.

### Step 2 — Create an API key and wire OpenCode to it

```bash
# Open the dashboard, sign in and create a client API key (Keys section),
# or set REQUIRE_API_KEY=false for a local-only, keyless setup.
export OMNIROUTE_API_KEY='your-client-key'

# Generate the omniroute provider in your OpenCode config (official command):
omniroute setup-opencode                       # local gateway
omniroute setup-opencode --remote http://<host>:20128 --api-key "$OMNIROUTE_API_KEY"

# Verify the gateway is reachable:
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:20128/v1/models \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY"    # expected: 200
```

### Step 3 — Install this plugin

```bash
# Scaffold the agents + plugin config into your project:
npx opencode-omniroute-router init
# or globally (all projects):
npx opencode-omniroute-router init --global
# then use OpenCode normally:
opencode
> Fix the bug where the login form rejects valid emails
```

`init` flags: `--global`, `--orchestrator <model>`, `--free <model>`, `--fast <model>`, `--standard <model>`, `--strong <model>`, `--expert <model>` — model IDs use the `provider/model` format from your config (e.g. `omniroute/auto/coding`, or a named combo like `omniroute/combo/free-fast`).

> **Which models should I use?** After `setup-opencode`, list your catalog with `omniroute models` (or `GET /v1/models`). The `auto/*` channels always exist; named **combos** created in the OmniRoute dashboard (e.g. a free-first chain for the low tiers, a premium chain for expert) are ideal tier targets — pass them via the `init` flags above.

Example: three dashboard combos designed exactly for this plugin's tiers — a fill-first free chain for fast work, a quality-first free chain for standard tasks, and a Codex-first chain for the expert tier, with live success rates and fallback stats per combo:

![OmniRoute combos configured as tier targets for the plugin](docs/assets/omniroute-combos.png)

## Configuration

Plugin options are passed in `opencode.json` and all have defaults:

```json
{
  "plugin": [["opencode-omniroute-router", {
    "workers": { "free": "free-worker", "fast": "smart-fast", "standard": "smart-standard", "strong": "smart-strong", "expert": "expert" },
    "models": { "smart-fast": "omniroute/auto/fast", "expert": "omniroute/auto/coding:pro" }
  }]]
}
```

- `workers` — tier → agent name mapping. If provided, tiers are inferred from its keys; you can use fewer tiers.
- `models` — worker → model id, used in the execution history log.
- `exploreAgent` — name of the read-only exploration agent (default `explore`).
- `historyDir` — where the JSONL history is written (default `~/.smart-opencode`).

## Execution history & stats

Every dispatch and outcome is appended to `~/.smart-opencode/history.jsonl`:

```json
{"timestamp":"...","type":"dispatch","sessionId":"...","tier":"standard","model":"omniroute/auto/coding","request":"..."}
{"timestamp":"...","type":"outcome","sessionId":"...","outputChars":755,"verificationEvidence":true,"preview":"..."}
```

Aggregate statistics (per model, per task type, and a task-type × model success matrix):

```bash
npx opencode-omniroute-router stats        # human-readable report
npx opencode-omniroute-router stats --json # machine-readable
```

This is the data foundation for adaptive routing (roadmap).

## Roadmap

- [ ] Adaptive routing: score models from real execution history (success probability × task fit − quota cost)
- [ ] Explore/exploit scheduling between similar models
- [ ] Contextual bandit over task features
- [ ] Per-project and per-technology statistics

## Development

```bash
npm install
npm test
```

## License

[MIT](LICENSE)

---

## Español

**Enrutado determinista multi-modelo para OpenCode sobre una pasarela OmniRoute autoalojada.**

Tú describes la tarea; un orquestador ligero la clasifica con reglas estáticas y un plugin de dispatch la delega a exactamente un worker — sin elegir modelos a mano y gastando la cuota premium sólo cuando hace falta.

Los workers pueden leer el repositorio y ejecutar una allowlist estricta de comandos de verificación (tests, build, lint, git de lectura); nunca editan archivos. Ante síntomas de causa desconocida, el orquestador lanza antes una exploración read-only.

Instalación: `npm i -g omniroute && omniroute serve` (conecta proveedores en el dashboard), luego `omniroute setup-opencode` para enlazar OpenCode, y `npx opencode-omniroute-router init` (+ `--global` para todos tus proyectos). Historial en `~/.smart-opencode/history.jsonl`, estadísticas con `npx opencode-omniroute-router stats`.
