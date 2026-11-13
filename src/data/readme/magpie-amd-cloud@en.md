# magpie-amd-cloud

English | [中文](README.md)

Connect AMD's **two free shared Model API sites** to [magpie](https://usemagpie.ai/) as a provider plugin:

| Provider | Site | id | Model ids |
|---|---|---|---|
| China · Radeon Cloud (Token Factory) | developer.amd.com.cn | `amd-cloud` | `amd-cloud/DeepSeek-V4-Flash` |
| International · TokenLab (AI Notebooks) | api.tokenlab.amd.com | `amd-cloud-lab` | `amd-cloud-lab/DeepSeek-V4-Flash` |

Once connected, every agent — Claude Code, Codex, OpenCode and more — can call Radeon GPU models through magpie, with quota visible right inside magpie. Zero dependencies, zero build: a plain OpenCode v1 provider plugin loaded in place from a folder.

## What you get after connecting

- **Plugins → Installed**: an AMD Cloud card (icon, version), one provider row per site.
- **Provider rows**: `amd-cloud (AMD Cloud, N models)  signed in` / `amd-cloud-lab (AMD Cloud Lab, N models)  signed in`. Logging in again with another key adds another account.
- **Quota card + `magpie quota`**:
  - `amd-cloud` (China): a "points (24h rolling)" window — percent used, `used / limit pts`, reset countdown (rolling period: resets 24 hours after the first billed request of the cycle, not at a fixed midnight); the account shows its organization ID (`oneclick-org-…`).
  - `amd-cloud-lab` (International): no usage API, so the quota slot shows the profile link plus a **locally estimated total** (the plugin accumulates `usage.cost` from each response in-process, labeled "local estimate" — usage before install or since the last restart is not included). **Points are a 30-day period total (10 pts), not a daily reset**; **the authoritative balance and history are on the [TokenLab profile page](https://notebooks.amd.com/profile)**.
  - Both sites label these numbers **pts (points)** and state outright they are free-tier quota tracking, not charges; the China API fields are named `daily_cost_*_usd` but carry the exact same values (1 pt ≡ 1 nominal USD), so the plugin displays them as pts. Each TokenLab chat response carries `usage.cost` (pts for that call, a non-standard field verified to match the catalog math) — since magpie's gateway cannot price `amd-cloud-lab` from models.dev, the plugin records it as an in-process local estimate and labels it clearly.
- **Model picker / agents**: every chat model in each site's catalog — after sign-in the list is fetched live from the site's own `GET /v1/models`, no hardcoded names, new models appear automatically.
- **Gateway `GET /v1/magpie/quotas`** exposes the same quota to external tooling.
- 401 marks the account for re-login, 429/5xx fail over to the next account/model — all native magpie behavior.

## How to connect

### China `amd-cloud`

Prerequisite: a verified AMD Radeon Cloud account (pending accounts are not issued API keys).

1. **Get a key**: sign in to the [Radeon Cloud console](https://developer.amd.com.cn/radeon/tokenfactory); a key is issued the first time you open Token Factory or launch an instance. Shown in the model details dialog and your Profile page, shaped like `rc-` + 48 hex chars.
2. **Add the plugin and sign in**:
   ```sh
   magpie plugin add /path/to/magpie-amd-cloud   # loaded in place from the folder
   magpie plugin login amd-cloud                 # paste the rc-… key
   ```
3. **Verify**:
   ```sh
   magpie provider test amd-cloud   # one tiny request per model
   magpie quota                     # points window
   ```

### International `amd-cloud-lab`

Prerequisite: an [AMD AI Developer Program](https://developer.amd.com/) account that can sign in to [notebooks.amd.com/tokenlab](https://notebooks.amd.com/tokenlab).

1. **Get a key**: sign in to the console (AMD corporate SSO) and issue an API key in the "Your API key" section (`tl-` prefix). **Keys last for the 30-day access period** — after expiry or Regenerate, magpie marks 401; generate a new key and run `magpie plugin login amd-cloud-lab` again.
2. **Sign in and verify**:
   ```sh
   magpie plugin login amd-cloud-lab   # paste the tl-… key
   magpie provider test amd-cloud-lab  # optional: one tiny request
   ```

**Points lifecycle (hard rules from the console FAQ, recorded 2026-11-13)**:

- 10 pts cover the whole 30-day access period (current one ends 2026-12-13); **once spent, service stops until reset** — there is no payment option.
- **Extend by 15 days**: extends the period only (no points), once per cycle; requestable only in the **last 5 days** of the current period.
- **Request more points**: another 10 pts; requestable only in the **last 7 days** before expiry, or when remaining points are **≤ 2**.
- Usage detail (Points by model / Points history) and the renewal buttons live on the [profile page](https://notebooks.amd.com/profile).

Both sites can be signed in and used at the same time; model ids do not collide.

## Models (reconciled with the live catalog on 2026-11-01: 15 entries, 10 of them chat models; `GET /v1/models` is the live source of truth)

The catalog also contains 5 non-chat entries — Clef/d3/d3-flash are Model Ops internal routing/decision services (output `decision`), OmniVoice is speech (`audio`), MinerU2.5-Pro is document parsing (`ocr`). The plugin keeps only entries whose output modality includes `text` and that declare request parameters.

| Model | Context | Image input | $/M (in/out) |
| --- | --- | --- | --- |
| DeepSeek-V4.1-Flash | 1,048,576 | ✅ | 0.28 / 0.56 |
| DeepSeek-V4-Flash | 1,048,576 | ❌ | 0.14 / 0.28 |
| GLM-5.3-Flash | 262,144 | ❌ | 0.28 / 0.56 |
| MiMo-V2.6-Flash | 1,048,576 | ✅ | 0.14 / 0.28 |
| Qwen3.8-Flash-Next | 262,144 | ✅ | 0.14 / 0.28 |
| Qwen3.8-27B | 262,144 | ✅ | 0.035 / 0.07 |
| Gemma-4-31B-IT | 262,144 | ✅ | 0.035 / 0.07 |
| MiniCPM-V-4.7-1B | 262,144 | ✅ | 0.035 / 0.07 |
| MiniCPM-V-4.7-35B-A3B | 262,144 | ✅ | 0.035 / 0.07 |
| MiniCPM5-2B | 131,072 | ❌ | 0.035 / 0.07 |

Effort levels (`reasoning_effort` → magpie `variants`, switch in the model picker): DeepSeek-V4-Flash has six (minimal→max, no thinking by default), Qwen3.8-Flash-Next four (none/low/medium/xhigh, **thinking on by default at xhigh**) — `medium`/`low` verified accepted. Other models are mapped from catalog metadata (context/pricing/capabilities); the catalog carries no effort info for them.

### International `amd-cloud-lab` models (reconciled with the console on 2026-11-13: 10 entries, 7 chat models; `GET /v1/models` is the live source of truth)

The catalog also contains three aux routing/decision services (Clef/d3/d3-flash, non-chat); the plugin keeps only entries whose output modality includes `text` and that declare request parameters. The catalog carries no pricing field — all prices below come from the console cards, confirmed one by one:

| Model | Context | Image input | pts/M (in/out/cache-read) |
| --- | --- | --- | --- |
| DeepSeek-V4-Flash | 1,048,576 | ❌ | 0.14 / 0.28 / 0.0028 |
| DeepSeek-V4.1-Flash | 1,048,576 | ✅ | 0.28 / 0.56 / 0.0056 |
| Gemma-4-31B-IT | 262,144 | ✅ | 0.035 / 0.07 / 0.0007 |
| Qwen3.8-27B | 262,144 | ✅ | 0.035 / 0.07 / 0.0007 |
| MiniCPM-V-4.7-1B | 262,144 | ✅ | 0.035 / 0.07 / 0.0007 |
| MiniCPM-V-4.7-35B-A3B | 262,144 | ✅ | 0.035 / 0.07 / 0.0007 |
| MiniCPM5-2B | 131,072 | ❌ | 0.035 / 0.07 / 0.0007 |

Prices match the China site model-for-model (same pts system); the console's 0731/1017 display suffixes are build versions, absent from API ids. Unlike the China catalog, DeepSeek-V4-Flash declares `reasoning_effort` here; effort mapping is the same. Differences vs the China site: **no** GLM-5.3-Flash, MiMo-V2.6-Flash, or Qwen3.8-Flash-Next; no `/v1/usage` (points total and history are profile-page only); keys last for the 30-day access period.

**International-specific constraints** (console FAQ, recorded 2026-11-13):

- **Points are a 30-day period total** (10 pts), not a daily reset; service stops when spent, no paid tier.
- **Rate limit 20 requests per minute** — whole account, per model (FAQ wording), tighter than the China site; no concurrency figure is published, the plugin keeps 8.
- **Decision models Clef/d3/d3-flash use `/v1/systemone`** (`state` + `questions` payload), not chat — the plugin filters them out of the model picker.
- Each model card's "X% used" is **not** your account usage (its meaning is unexplained); don't read it as quota.
- Error semantics: 402/403 usually mean points exhausted or missing access; 401 means key expired/invalid — handle both on the profile page.

**Pricing provenance & verification**: models.dev and magpie both express `cost` as USD per million tokens; the plugin converts AMD's per-token catalog prices ×1e6 and cross-checked them against actual billing via `/v1/usage` (input/output/cache-read/reasoning tokens all match the catalog; Qwen's reasoning tokens are billed as output but reported separately from `completion_tokens`). models.dev's `amd` entry has all costs at 0 (unmaintained), and its `deepseek` entry for the same model names is DeepSeek's own API pricing ($0.15/$0.60) — treat the AMD catalog as the source of truth. Quota is displayed in the console's **pts** unit (same values as the API's `*_usd` fields, 1 pt ≡ 1 nominal USD, not real charges).

## Behavior notes (official docs + real-machine findings)

- **The gateway rebuilds request bodies**: shared endpoints accept a fixed field set (`temperature`, `max_tokens`, `top_p`, `tools`, …); `stop`, `seed`, `top_k`, `logit_bias` etc. are **silently dropped**.
- **Qwen3.8-Flash-Next accepts a single `system` message, in position 0**, with the `system` role (not `developer`); DeepSeek-family has no such limit.
- **Qwen3.8-Flash-Next thinks by default (xhigh)** — omitting `reasoning_effort` does not turn thinking off; pick the `none` variant to disable.
- Chat completions only: no `/v1/responses`, embeddings, or image generation on shared endpoints.
- Non-streaming requests cap at 10 minutes; for streaming the cap applies to the gap between chunks.
- Rate limits: 30 RPM / 8 concurrent per key (plugin `maxConcurrency` is 8), 20 RPM per account (`rpm_limit` from `/v1/usage`), plus a rolling-period spend cap; 429 carries `Retry-After` and magpie fails over automatically.
- **Each model also has its own shared concurrency cap** (e.g. 32 for GLM-5.3-Flash); when full it returns `model_concurrency_rate_limit_exceeded` — just switch models, your account is not throttled.
- Unknown model names are rejected by the gateway with `400` before reaching the backend.
- **The quota endpoint differs from the docs**: the documented Platform API `/api/profile/model-usage` rejects API keys (401, browser session only); the plugin actually uses `GET /v1/usage` on the Model API host, and the "daily" cap is a rolling 24h period (`daily_reset_timezone: null`).

## Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| Quota says "no API key issued" | Generate one in the console (Token Factory / Profile) |
| 403 `account_not_verified` | Account still under review; keys are issued after approval |
| 401 / asked to sign in again (amd-cloud) | Key invalid or rotated (re-issuing revokes the old one immediately); run `magpie plugin login amd-cloud` again |
| 401 (amd-cloud-lab) | The **30-day access period** elapsed, or the key was Regenerated: generate a new one at [notebooks.amd.com/tokenlab](https://notebooks.amd.com/tokenlab) and run `magpie plugin login amd-cloud-lab` again |
| lab 402/403 | Points exhausted (30-day total, service stops) or access missing: check the balance on the [profile page](https://notebooks.amd.com/profile); more points are requestable in the last 7 days (or at ≤ 2 pts remaining) |
| Frequent 429 | Check `code`: `model_concurrency_rate_limit_exceeded` = that model's shared concurrency is full, switch models; `token_*`/`ip_*` = key/IP RPM or concurrency limits; adding more accounts (keys) lets magpie spread the load |
| `Requested model … not supported` | Model not in the shared catalog; check the list under `magpie plugin` |

## Privacy & security

- Keys are stored in magpie's config directory (`plugin-auth.json`, permission 600).
- The plugin talks to exactly two official hosts: `developer.amd.com.cn` (China: inference, model catalog and quota `/v1/usage`) and `api.tokenlab.amd.com` (International: inference and model catalog). It sees what any request to the vendor sees — your conversation, tools and their results — and logs/uploads nothing else.

## Development

```sh
node --test test/amd-cloud.test.mjs   # 24 unit tests: dual-provider factory / catalog mapping / chat filter / usage mapping + fetch wrapper (stubbed global fetch)
```

Sandbox check (keeps your real magpie config untouched):

```sh
sb=$(mktemp -d)
m() { env HOME=$sb XDG_CONFIG_HOME=$sb/.config XDG_CACHE_HOME=$sb/.cache USERPROFILE=$sb MAGPIE_ADDR=127.0.0.1:3499 MAGPIE_PLUGIN_MARKET=off magpie "$@"; }
m plugin add /path/to/magpie-amd-cloud
m plugin --json
```

### Assumptions to verify

- `limit.output = 16384` is a conservative guess; the max output token count is not published.
- Effort variants: DeepSeek `medium` and Qwen3.8-Flash-Next `low` verified accepted (2026-11-01); the rest follow the official model pages, not exercised one by one.
- The static fallbacks cover the documented models (2 China, 7 International); anything else comes from the live catalog once signed in.
- The exact points formula is not published (qualitative: tokens × per-model rate); no concurrency figure is published.

## License

MIT
