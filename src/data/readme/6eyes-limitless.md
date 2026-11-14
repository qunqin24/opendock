# 6eyes

**Budget-aware, multi-plan model routing + a codebase map for [OpenCode](https://opencode.ai).**
Classify every prompt locally, route it to the cheapest model that can actually do the job, and fall back to free models before you ever hit a limit.

```
cheap coding task  ->  muse-spark (≈$0.00026/req)
hard architecture  ->  gemini-4-argon / kimi-k3.1-pro
all budgets gone   ->  free models ($0, unlimited)   <-- never hard-stops
```

---

## Why

OpenCode plans are metered **per model in dollars per month** (5-hour = 20%, week = 50%, month = 100% of that). Picking a model by feel burns the expensive allowance on `rename this variable` and starves the tasks that need it.

6eyes does that bookkeeping for you:

1. **Classify** — a local decision model (Laya) or a built-in heuristic scores complexity, reasoning, security and risk. Zero plan tokens, runs on your CPU.
2. **Route** — cheap work goes to the cheapest available model; hard or risky work goes to a task-appropriate strong model.
3. **Guard** — every model's month / 5-hour / weekly window is tracked. Near a limit, traffic moves to a model with budget left.
4. **Land** — when paid allowance is gone, routing continues on **free models** instead of failing. You get a warning, not a wall.
5. **Trim context** — a small import graph is injected so the agent opens the few files it needs instead of scanning the repo.

## Works with every OpenCode plan

| Plan | Price | Allowance model | What 6eyes does |
| --- | --- | --- | --- |
| **Free** | $0 | Free models, daily request limit each | Stays on free models; no account or key needed |
| **Go** | $10/mo | $15–$100 per model | Full cheap/heavy routing inside your allowance |
| **Go Plus** | $40/mo | $60–$240 per model | Same routing, higher caps, deeper escalation |
| **Go Teams** | $20/member/mo | Go + $5 per model, per member | Per-member budgets, same catalog |
| **Zen / BYOK** | pay-as-you-go | Balance or provider keys | Tracks estimated spend; caps unknown are treated as unlimited |

Caps are **derived** from `catalog.json` (`limit × 0.2` per 5h, `× 0.5` per week), so switching plans needs no code change — only `OPENCODE_PLAN`.

The plan is **detected automatically** at startup: if `opencode-go` is connected you are on a paid plan, otherwise the free tier is used. Auto-detection assumes the conservative Go caps, so Plus and Teams users should set `OPENCODE_PLAN=plus` / `teams` to use their full allowance.

On the free tier, 6eyes spreads requests across the best three free models instead of hammering one into its daily request cap, and keeps rotating when a model returns 429.

## Install

**From npm**

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["6eyes-limitless"]
}
```

Or install first, then reference the package name:

```bash
npm i -g 6eyes-limitless     # or: npm i -D 6eyes-limitless
```

**From GitHub (no npm)**

```jsonc
{
  "plugins": ["github:backup-alt/6eyes"]
}
```

**From a local checkout**

```jsonc
{
  "plugins": ["D:/path/to/6eyes"]
}
```

Then run `/6eyes` in a session. That's the whole setup — no keys, no config, no server.

## Configuration

Everything is optional.

```jsonc
{
  "plugins": [
    ["6eyes-limitless", { "plan": "plus", "enabled": true }]
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `plan` | auto-detect | `free` \| `go` \| `plus` \| `teams` \| `zen`. Detected from connected providers; set it explicitly for exact Plus/Teams caps |
| `enabled` | `true` | Set `false` to disable without uninstalling |

| Env var | Default | Meaning |
| --- | --- | --- |
| `OPENCODE_PLAN` | auto-detect | Overrides the plan option |
| `LAYA_ROUTER_CMD` | `laya-router` on PATH | Local classifier CLI |
| `LAYA_SERVER_PY` | `python` (win) / `python3` | Python for the hot classifier server |
| `LAYA_SERVER_URL` | `http://127.0.0.1:7801` | Loopback only |
| `LAYA_NO_SERVER` | unset | Skip the server, use the CLI only |
| `LAYA_TIMEOUT_MS` | `25000` | Per-call classifier timeout |

### Laya is optional

With [`laya-router`](https://github.com/) installed you get calibrated scores (~1–2s warm). Without it, 6eyes uses a built-in heuristic classifier: keyword and size based, deterministic, still escalating security/refactor/architecture/debug work. The injected line tells you which one ran (`classifier=laya` or `classifier=heuristic`).

## What it writes

All state lives in `<project>/.6eyes/`:

| File | Contents |
| --- | --- |
| `status.json` | Active plan, per-model usage, last routing decision |
| `state.json` | Recent turns, request log, graph digest |
| `graph.json` | Incremental file/import map (cache) |
| `report.html` | Standalone dark-theme report |
| `.gitignore` | `*` — keeps spend/session data out of git |

USD figures are **estimates** from each plan's published per-request token profile. Request counts are exact. The files contain no prompt text.

## How routing decides

```
complexity >= 2  OR  reasoning >= 0.5  OR  security >= 0.5  OR  risk == high
        -> heavy : task-fit strong model (architecture/security/coding fit lists)
        -> else   cheap : cheapest model that still has budget
```

Escalation ladder when everything is constrained:

```
cheapest paid -> best-remaining paid -> flash with most budget -> free models ($0)
```

A 429 response cools that model for 10 minutes and reroutes around it.

## Privacy

- Prompt text is truncated to 300 characters and sent **only** to `127.0.0.1` (your own Laya server), never to a third party.
- Nothing leaves the machine for classification. If the free heuristic runs, nothing runs at all.
- `.6eyes/` holds model names, costs and counts — no prompts, no code.

## Development

```bash
npm install
npm run typecheck     # tsc --noEmit
```

`catalog.json` is the single source of truth for plans, prices and allowances — verified against the [OpenCode Go docs](https://opencode.ai/docs/go) (2026-11-11). If OpenCode changes a price or retires a model, update that file only.

## License

MIT
