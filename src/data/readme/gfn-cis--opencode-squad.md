# opencode-squad

An OpenCode 2 plugin that makes the `build` agent a lead who delegates. The lead (called *sarge*) keeps planning and review on your strong model. Routine work goes to cheaper per-model subagents, and a second model checks every change before you see it.

## Why

A frontier model doing everything burns its price and its context on routine edits, log digging and file reads. Plain delegation is not enough either: a cheap model asked to write code will hand back confident nonsense now and then, and nobody checks it.

The squad adds the missing pieces:

- **Explicit choice.** Every reply opens with `SELF: <reason>` or `DELEGATE: <reason>`, so the lead cannot slip into doing heavy work itself.
- **Executor plus reviewer.** Each model you pick gets a `grunt-*` (edits, runs commands) and a `drill-*` (read-only reviewer). A change goes grunt, then drill, then a final check, at most 3 rounds, then back to you.
- **Routing by facts.** The lead sees each subagent's model, context window, billing (subscription or API), your own rules per model and, where the provider reports it, how much of its rate-limit window is used. Current benchmarks come on demand.
- **Risk gate.** Production writes and destructive operations are planned by a subagent and applied only after you confirm.
- **No silent hangs.** A subagent stuck on a rate limit or gone silent is stopped, and the lead is told to pick another model.

## Install

Requires OpenCode 2. In `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@gfn-cis/opencode-squad"]
}
```

Restart OpenCode, then ask it to **draft the squad** (the `squad-draft` skill). It lists your available models, proposes a set, asks what to change and saves it. That is the whole setup; until then the lead tells you to run it instead of delegating.

## Daily use

You talk to `build` as usual. What you may want from the squad:

| You want | Say |
| --- | --- |
| add, drop or retune a model | "add `openai/gpt-5.5` to the squad", "drill on opus at max" (`squad-draft`) |
| a second opinion from several models | "red team this", "cross-review" (`squad-redteam`) |
| no delegation for this request | "do it yourself" / "делай сам" |
| delegation even for a small task | "delegate this" / "делегируй" |
| a specific subagent | name it: "use `grunt-anthropic-claude-sonnet-5`" |
| no review | "just investigate, no review" |

`squad-delegate` and `squad-stall` are the lead's own protocols; it loads them itself.

What a turn looks like:

| Request | First line | Then |
| --- | --- | --- |
| "Is the tree clean?" | `SELF: single trivial read.` | runs `git status` itself |
| "Why are prod pages timing out?" | `DELEGATE: investigation → grunt, no drill.` | a grunt digs, the lead checks the findings |
| "Add validation to the upload endpoint." | `DELEGATE: produces code → grunt, full PDCA.` | grunt writes, drill reviews, lead runs the tests |
| "Drop the stale table on prod." | `DELEGATE: high-risk write — plan first.` | you get the exact command and confirm before it runs |

Delegation costs a brief and a cold cache. For small work on top of a large, already cached context the lead stays SELF on purpose.

## Configuration

### Your notes per model: `model_data.json`

In `~/.config/opencode/` (or a project's `.opencode/`). Only hand-written fields:

```json
{
  "providers": {
    "anthropic": "Max 5x",
    "zai-coding-plan": { "plan": "GLM Coding Pro", "info": "no secrets or production config" },
    "google": "api"
  },
  "models": { "zai-coding-plan/glm-5.3": { "info": "good at code, weak at long context" } }
}
```

- `providers`: your plan per provider, or `"api"` for metered billing. The lead prefers subscription models when quality is comparable. `squad-draft` asks for missing plans.
- `info`: a routing rule the lead treats as binding, above benchmarks. Per provider or per model.
- `billing` (per model): overrides the provider's plan.
- `cache_ttl_seconds` (per model): overrides the prompt-cache TTL the plugin assumes (`src/cache-status.js`). `scripts/squad-measure-cache-ttl.mjs` measures real TTLs from your session history.

Changes apply after a restart. A file that does not parse is never overwritten; `squad_dump` names it.

### Rate-limit guard

Defaults shown; every field is optional.

```json
{
  "plugins": [{
    "package": "@gfn-cis/opencode-squad",
    "options": { "rate_limit_guard": {
      "enabled": true,
      "retry_on_errors": [429, 403],
      "retryable_error_patterns": ["rate.?limit", "usage.?limit", "quota", "blocked by a gateway or proxy"],
      "max_wait_seconds": 3600,
      "max_cumulative_seconds": 3600,
      "max_silence_seconds": 600
    } }
  }]
}
```

OpenCode retries a rate-limited call up to 10 times, waiting up to 15 minutes each, while the lead waits on the subagent. For subagents only, the guard stops the retry when one announced wait exceeds `max_wait_seconds`, when retries add up past `max_cumulative_seconds`, or when the subagent shows no activity for `max_silence_seconds`. The lead gets a note with the reset time when known, and a warning that the subagent may already have changed something. Details: `src/rate-limit-guard.js`.

## How the squad is stored

- The roster is one global file, `squad.json` in the OpenCode config dir (`~/.config/opencode/` or `$XDG_CONFIG_HOME/opencode/`), written only by the plugin. No agent files are created; agents are registered through OpenCode's agent API.
- Edit it through `squad-draft`, or directly with `squad_dump` then `squad_patch`. A patch must carry the `revision` from the dump, so two sessions cannot overwrite each other, and removing an agent needs `allow_remove`.
- Per agent you can set `variant` (reasoning level, checked against what OpenCode accepts), `steps`, `notes` and `disable`. Descriptions are generated from `model_data.json`.
- Put weak models in `grunts` only. A weak reviewer either rubber-stamps or invents faults, which is worse than no review.
- Drills stay read-only even under a global `allow *`: the role's rules come after yours.
- An agent of your own at a squad id (`grunt-<provider>-<model>`) wins; that squad entry is skipped and `squad_dump` says so.
- **Upgrading from 0.5 or earlier:** on first start the old `grunt-*`/`drill-*` files in `~/.config/opencode/agent/` are imported once. The files stay; `squad_dump` lists them for you to delete.

## Tools

The lead calls these itself; you rarely need to.

| Tool | Returns |
| --- | --- |
| `squad_dump` | the roster, its `revision`, accepted variants per model, problems |
| `squad_patch` | writes a new roster; refuses stale revisions and unasked deletions |
| `squad_metrics` | benchmarks, price, context and billing per model, from SuperIndex and llmbenchmark.ai, refreshed every 48 h |
| `squad_session` | whether a subagent session's cache is still warm, its context size, why its result came back empty; with no arguments, the time and the caller's context size |
| `squad_compact` | compacts a subagent session before reuse |

The reasoning behind each lives in the module headers: `src/metrics.js`, `src/session-status.js`, `src/task-outcome.js`, `src/quota.js`, `src/compact.js`, `src/squad-store.js`, `src/squad-agents.js`. The lead's rules are in `skills/squad-delegate/SKILL.md`.

## Troubleshooting

- **Is it loaded?** The OpenCode log shows plugin id `squad` at startup, or the load error right after it.
- **No grunts in the `@` menu.** Intended: squad agents are hidden and dispatched by the lead.
- **"No squad".** `squad.json` is empty or missing. Run `squad-draft`.
- **A patch is refused as busy.** Another process holds `squad.json.lock`. If that process is gone, delete the file named in the message.

## Development

```bash
npm install
npm test                  # unit tests (vitest)
npm run test:integration  # the plugin inside a real OpenCode 2 host, offline (Node >= 24)
npm run lint && npm run knip && npm run typecheck
```

Unit tests never touch your real OpenCode config. Integration tests boot the pinned `@opencode/sdk` host with a scripted model, no credentials and no network.

Releases: bump `version` in a PR; merging it publishes to npm and creates the GitHub release.

## Design

Target behaviour: [docs/rfc/0001-squad.md](docs/rfc/0001-squad.md). Decisions and the alternatives they rejected: [docs/adr/](docs/adr/).

## License

MIT, see [LICENSE](LICENSE).
