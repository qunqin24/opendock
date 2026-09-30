# theoldllm-provider

OpenCode **v2** provider plugin for [TheOldLLM](https://theoldllm.com), an OpenAI-compatible API at `https://theoldllm.com/v1`.

The API is a plain OpenAI-compatible chat endpoint, so it works out of the box — but it publishes almost no model metadata. `/v1/models` returns only `{id, object, owned_by, created, permission}`, and it sends **no rate-limit headers** on any response. This plugin fills that gap: it resolves real context limits and display names from [models.dev](https://models.dev), tracks the account's 50M-token daily quota via `GET /v1/usage`, and models the per-model cost multiplier that decides how fast that quota burns.

## Install

Add the package to `plugins` in `opencode.json(c)`. OpenCode resolves and installs it itself — there is no separate `npm install` step.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@srah_x64/theoldllm-provider"]
}
```

Pin a version with `@srah_x64/theoldllm-provider@0.1.0` if you want to control upgrades. Then restart the service so the provider is picked up:

```sh
opencode service restart
```

### Registries

The same code is published to both registries under different scopes:

| Registry | Package | Install note |
| --- | --- | --- |
| npmjs.com | `@srah_x64/theoldllm-provider` | Works as-is. |
| GitHub Packages | `@srah/theoldllm-provider` | Needs an `.npmrc` scope line and a GitHub token with `read:packages`. |

```ini
# ~/.npmrc — only needed for GitHub Packages
@srah:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

## Connect

Run `/connect`, pick **TheOldLLM**, and paste your key. That is the intended path: the plugin registers a `theoldllm` integration exposing a `key` method, and the provider's `integrationID` is what makes it appear in that list.

```sh
opencode auth login theoldllm
```

`THEOLDLLM_API_KEY` works too — it is registered as an `env` method, so an existing variable needs no explicit connect. Model discovery prefers the stored credential and falls back to the env var. If you set the env var it must be visible to the *server* process, not just your shell.

Then pick a model with `/models`. Discovered models appear under **TheOldLLM** and are referenced as `theoldllm/<model-id>`.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "@srah/theoldllm-provider",
      "options": {
        "baseURL": "https://theoldllm.com/v1",
        "pollMs": 300000,
        "models": ["claude-sonnet-5"]
      }
    }
  ]
}
```

| Option | Default | Purpose |
| --- | --- | --- |
| `baseURL` | `https://theoldllm.com/v1` | API endpoint. |
| `models` | discovered | Fixed model list. Skips `/v1/models` discovery. |
| `pollMs` | `300000` | How often to poll `/v1/usage` for quota. |

## What it does

### Model metadata

`/v1/models` carries no limits, names, or modalities, so each model is looked up in the models.dev catalog — the same source OpenCode syncs from — and the real values are applied:

| Field | Example |
| --- | --- |
| `name` | `claude-sonnet-5` → `Claude Sonnet 5 (50x)` |
| `family` | `claude-sonnet` |
| `time.released` | `2026-06-29` |
| `limit.context` / `.output` / `.input` | `1,000,000` / `128,000` |
| `capabilities.input` / `.output` | `text, image, pdf` → `text` |

Limits matter most. The runtime passes `model.limit.context` straight into the route as the true context ceiling, so a guess mis-sizes the entire context budget. Real values run from 200k (`claude-haiku-4.5`) to 1.05M (`gpt-6-luna`).

Lookup tries exact id → punctuation-folded (theoldllm writes `claude-opus-4.5`, models.dev `claude-opus-4-5`) → the base behind a known variant suffix → a dated snapshot of the same model. A variant suffix only borrows limits when the stripped base is a real catalog id, so `deepseek-v4` never inherits from `deepseek-v4-pro`. **109 of 121** models get real limits; the other 12 are community fine-tunes and jailbreak variants that models.dev has never indexed, and those keep the 200k/32k default rather than a guess.

### Cost multipliers

Every request is charged against the 50M/day quota at the model's multiplier. Measured rather than assumed: a 16-token `claude-haiku-4.5` call moved `daily_tokens.used` by exactly 800 (16 × 50); a 49-token `deepseek-v4-pro` call moved it by 245 (49 × 5).

The multiplier is **not** exposed by the API — not in `/v1/models`, not in `/v1/usage`, not in any response header. It exists only in the pricing page's `static/app.js`, as a pinned table plus family defaults. `multipliers.ts` mirrors that logic and the model picker shows it as `Claude Sonnet 5 (50x)`. A 0× model shows as `(free)`.

`cost` is deliberately left empty. The multiplier is a quota weight, not a dollar rate, and the API never exposes a price — faking `$0` would be worse than showing nothing.

### Plan economics

The subscription is a flat **$7/month**, not a per-token rate. Combined with the multiplier this produces a real effective rate, because the daily quota is denominated in billed units: 50M billed units/day means a 5× model yields 10M real tokens/day but a 50× model only 1M.

| Model | Multiplier | Real tokens/day | Real tokens/month | Effective $/Mtok |
| --- | --- | --- | --- | --- |
| `deepseek-v4-pro` | 5× | 10M | 300M | $0.023 |
| `claude-haiku-4.5` | 50× | 1M | 30M | $0.233 |
| `gpt-5.5` | 100× | 500k | 15M | $0.467 |
| `JEV` | 0× | — | — | free |

So a 50× Claude is effectively 10× dearer per token than a 5× DeepSeek. The monthly figure assumes you exhaust the daily cap all 30 days; unused quota does not roll over, so a light month costs far more per token than this.

### Variants

theoldllm ships thinking twins as separate ids (`gemini-3.8-flash-thinking` alongside `gemini-3.8-flash`). The plugin folds each twin into its base as a `thinking` variant, so the picker offers one row with a toggle instead of two.

A twin is only folded when the fold is free: the base must exist in the catalog *and* carry the same cost multiplier. That correctly leaves `gemini-2.5-flash-thinking` (5×) and `gemini-3-flash-preview-thinking` (5×) as standalone models, because their bases are 20× and folding would quietly quadruple the bill.

Effort ladders come from configuration rather than per-model probing: models.dev declares `reasoning` plus an `effort` ladder, so 43 of the 121 models pick up variants, each reflecting the levels that model accepts.

That declaration describes the upstream model, not what theoldllm honours, and the two disagree. Probing the same question plain and with `reasoning_effort: "high"`, and comparing completion tokens:

| | models | tokens |
| --- | --- | --- |
| engaged | `gemini-3.8-flash`, `gemini-3-flash-preview`, `claude-haiku-4.5`, `glm-5.2` | 3 → 191, 3 → 269, 5 → 39, 35 → 130 |
| inert | `claude-sonnet-5`, `claude-opus-5`, `gpt-5.5`, `gpt-5.6-luna`, `gpt-6-luna`, `deepseek-v4-pro` | unchanged |

The inert ones still declare a full ladder upstream, so left alone the catalog would hand out switches that silently do nothing — Anthropic's real control is `thinking: {type, budget_tokens}`, which this gateway does not map. The `INERT` set in `variants.ts` suppresses those, and a single-level ladder is dropped since it is not a choice.

### Quota tracking

`GET /v1/usage` is the only source of quota data — the API returns **no** `X-RateLimit-*` headers on any response, so the core runtime cannot see them either.

```jsonc
{
  "daily_tokens": { "used": 650, "limit": 50000000, "remaining": 49999350, "reset": "midnight UTC" },
  "rate_limit": { "requests_in_window": 1, "limit": 30, "remaining": 29, "window_seconds": 60 }
}
```

The plugin polls it every 5 minutes (`pollMs`) and logs once per crossing at 80%, 95%, and 100% of the 50M daily token quota, plus an immediate re-read on any 429. **Warn only — requests are never blocked.** A separate 30 req/min window is reported in the same line. The daily quota resets at midnight UTC.

### Streaming

Handled entirely by `@opencode/ai/providers/openai-compatible`, which sets `stream: true` and consumes the SSE frames. There is no custom stream handling here.

## Development

```sh
npm ci
npm run typecheck   # tsc --noEmit
npm run build       # esbuild -> dist/index.js (single ESM bundle)
npm run verify      # smoke test: asserts the default export is a Plugin
```

The plugin ships as one bundled ESM file with `@opencode/plugin` left external, so no extension-resolution or TypeScript-at-load concerns for consumers.

To try it from a local checkout, point `plugins` at the folder and restart the service:

```jsonc
{
  "plugins": ["./theoldllm_provider"]
}
```

A few behaviours are worth knowing while testing:

- Model names stay short on purpose. `name` is what the picker renders and what its fuzzy search matches, so it carries the display label and the multiplier only — no derived price.
- A borrowed name is discarded, so `gemini-2.5-flash-thinking` shows as "Gemini 2.5 Flash Thinking" rather than borrowing "Gemini 2.5 Flash" and colliding with the non-thinking model. Where two ids still titleize identically (`command-a` vs `command-a-03-2025`), every member of the set falls back to its id.
- The models.dev catalog is fetched at startup and cached for 24h. A failed fetch logs a warning and reuses the previous cache rather than dropping models.

## Releasing

Pushing a `v*` tag runs [`.github/workflows/publish.yml`](.github/workflows/publish.yml), which typechecks, builds, verifies, publishes to **both** registries, and attaches `theoldllm-provider-<tag>.zip` (built `dist/`, `package.json`, `README.md`, `LICENSE`) to a GitHub Release.

npmjs.com publishes via **npm Trusted Publishing (OIDC)** — there is no npm token in the workflow or in repository secrets. npm exchanges a short-lived credential scoped to this exact workflow, and generates provenance automatically. GitHub Packages uses the workflow's own `GITHUB_TOKEN` under `packages: write`, so it needs no secret either.

The two registries publish as **independent parallel jobs**, so a failure in one cannot silently cancel the other. The GitHub Release runs when at least one of them succeeded.

The package is published under two different scopes — `@srah_x64/theoldllm-provider` on npmjs and `@srah/theoldllm-provider` on GitHub Packages. The GitHub Packages job rewrites the `name` and `publishConfig.registry`; nothing else differs. Because GitHub Packages ships scoped npm packages as **private**, that job also flips the package to public after publishing.

The tag must match `version` in `package.json`; the job fails otherwise rather than publishing a mislabelled package.

```sh
npm version patch        # bumps and tags
git push --follow-tags
```

Trusted publishing needs the publisher configured on npmjs.com under the package's **Settings → Trusted Publisher**, with the organization `sRaH`, repository `theoldllm-provider`, and workflow filename `publish.yml`. npm CLI ≥ 11.5.1 is required (the workflow pins Node 24 and checks the npm version), and GitHub-hosted runners only — self-hosted runners are not supported.

Note that trusted publishers created after **Sep 03, 2026** default to allowing `npm stage publish` only. For an unattended release you must also tick `npm publish` under **Allowed actions**, otherwise the publish step fails and every release needs a manual 2FA approval.

Continuous integration (`.github/workflows/ci.yml`) runs the same typecheck, build, verify and an `npm pack --dry-run` on every push and pull request.

## License

MIT
