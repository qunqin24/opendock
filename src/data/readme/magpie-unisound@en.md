# magpie-unisound

OpenCode provider plugin that brings **Unisound Token Hub** ([maas.unisound.com](https://maas.unisound.com)) **U Plan** models into [magpie](https://usemagpie.ai). Built for U Plan (Token Plan) users: point-based costs, dual-pool quota windows, and gift-quota vision.

> 中文说明：[README.md](./README.md)
>
> **Design scope**: this plugin is currently built for **U Plan Free-tier** users — without a Session Cookie, quota windows show Free-tier totals (5h burst 500 / weekly 2500), while points spent are computed from the official coefficients and verified against the server. Paste a web Session Cookie and the usage panel switches to **live server data** with automatic tier detection (`planCode`), so Standard / Plus users are covered too.

## Features

- **API key sign-in**: one Token Plan key (`tp-…`, issued at Console › Subscription › U Plan)
- **Optional web Session Cookie**: one extra field at sign-in — the `usage` panel then shows **live server data**: real weekly/5h pool balances with official reset countdowns, all six gift-pool quotas, and automatic tier detection from `planCode`. Without it the panel falls back to local estimates; a stale Cookie degrades gracefully
- **U Plan whitelist**: only U Plan chat models are exposed. The flagship `u2` and third-party models (DeepSeek / Kimi / GLM / Qwen…) are pay-as-you-go and stay out of the catalog — a Token Plan key cannot call them, and a metered key calling them spends real money
- **Live catalog**: fetches `GET /v1/models` at runtime (the server isolates the catalog by key type); limits come from the catalog, with a static fallback
- **Point-based cost**: official point coefficients converted to "points per million tokens", so magpie's usage cost equals U Plan points spent
- **Local point ledger**: every response's usage is priced with the official formula (`points = (input×coeff + cached×coeff + output×coeff) / 10000`) and persisted in magpie's config directory, shared across host processes
- **Dual-pool windows**: local estimates without a Cookie; server truth with one
- **Streaming aware**: adds `stream_options.include_usage` to streaming requests so the trailing usage chunk is captured too

## U Plan models (Free tier, verified 2026-11)

| Model | Type | Billing pool | context / output |
|---|---|---|---|
| `u2-flash` | General text | points (coeff 1 / 0.2 / 2) | 1M / 256K |
| `u2-med` | Medical text | points (coeff 2 / 0.5 / 7) | 256K / — |
| `u2-radimed` | Medical vision (image+text) | **separate gift pool** (475K tokens/week, no points) | 40K / — |

Gift pools also include `u2-asr` (8 h/week), `u2-tts` (40k chars/week), `u2-ocr` / `u2-ocr-med` (7.375M tokens/week each); MCP tools for speech and documents are planned.

**Quota arbitrage**: route vision requests to `u2-radimed` — it draws from its gift pool, leaving your point pools untouched.

## Live usage (optional): paste a web Session Cookie

The console's quota endpoint only accepts browser sessions (API keys cannot query it), so the plugin accepts an extra **web Session Cookie** at sign-in to show live server data:

1. Sign in to the [console](https://maas.unisound.com) in Edge/Chrome
2. Open DevTools (`F12`) › **Network** panel › reload the page
3. Right-click **any `maas.unisound.com` request** › Copy › **Copy as cURL**
4. From the clipboard, copy the whole string inside `-b '…'` and paste it into the "web Session Cookie" field of the sign-in form (a full `Cookie: name=v; …` request header line works too)

Once set, the usage panel shows server truth: weekly pool spent/remaining with the **official reset countdown**, the 5-hour burst pool, all gift pools (OCR / RadiMed / ASR / TTS), and your tier detected from `planCode`. When the Cookie goes stale, the panel quietly falls back to local estimates and hints to re-paste.

## Install

```bash
magpie plugin add github:aqiu817/magpie-unisound
# or a local directory
magpie plugin add ./magpie-unisound

magpie plugin login unisound
```

Models appear as `unisound/u2-flash`, `unisound/u2-med`, `unisound/u2-radimed`.

## Known limits

- **Without a Cookie, point balances are local estimates**: counted since plugin installation, rolling windows approximate the official reset rules and err conservative. Verified against the console: the local ledger matches the server-side `points used` exactly. Paste a Session Cookie to switch to live server data (see above).
- **Session Cookies expire**: re-logging into the console or server-side session expiry invalidates the Cookie — usage then falls back to local estimates with a re-paste hint. The exact lifetime is unmeasured; treat it empirically.
- **No point cost for `u2-radimed`**: its gift-pool coefficients are unpublished, so magpie shows zero cost (token stats are unaffected; with a Cookie, gift-pool balances show as live values).

## Privacy

The API key stays on your machine (magpie's local credential store). **The Session Cookie likewise stays local** (credential metadata) and is only sent to `maas.unisound.com` as a single read-only GET for quota data — never logged, never persisted in the ledger, never shipped. The point ledger (`magpie-unisound-points.json`) holds token counts and points only — never message content.

## Development

```bash
node --test test/unisound.test.mjs   # or bun test
TP_KEY=tp-… bun scripts/smoke.mjs    # live smoke (catalog + streaming)
```

## License

MIT
