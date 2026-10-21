# opencode-copilot-auto

[![CI](https://github.com/klconsultancy/opencode-copilot-auto/actions/workflows/ci.yml/badge.svg)](https://github.com/klconsultancy/opencode-copilot-auto/actions/workflows/ci.yml)
[![Release](https://github.com/klconsultancy/opencode-copilot-auto/actions/workflows/release.yml/badge.svg)](https://github.com/klconsultancy/opencode-copilot-auto/actions/workflows/release.yml)
[![npm](https://img.shields.io/npm/v/@klconsultancy/opencode-copilot-auto)](https://www.npmjs.com/package/@klconsultancy/opencode-copilot-auto)
[![License: MIT](https://img.shields.io/github/license/klconsultancy/opencode-copilot-auto)](LICENSE)

GitHub Copilot's **Auto** model for [opencode](https://opencode.ai), working the way
it does in VS Code and Copilot CLI: each conversation is routed through Copilot's
`POST /auto` router, on the tier you pick, and billed through an Auto session (with
the Auto discount).

One package serves both opencode lines: opencode 1 (≥ 1.18.29, `plugin` config key)
and opencode 2 (`plugins` config key).

Based on [m0wer/opencode-github-copilot-auto-model](https://github.com/m0wer/opencode-github-copilot-auto-model).

## Models

The plugin adds three models to the `github-copilot` provider, one per tier of VS
Code's Auto picker and Copilot CLI's `/model`:

| Model | Tier | Routes for |
|-------|------|------------|
| `github-copilot/auto` | `balance` | cost, quality and latency (default) |
| `github-copilot/auto-efficiency` | `efficiency` | the most cost-efficient capable model |
| `github-copilot/auto-intelligence` | `intelligence` | the highest-quality response |

Switching to another of the three mid-conversation switches the tier, as in VS Code.
The tier only steers the router; the chosen model runs with its normal settings.

## Install

### opencode 2

`~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["@klconsultancy/opencode-copilot-auto"]
}
```

### opencode 1 (≥ 1.18.29)

```jsonc
{
  "plugin": ["@klconsultancy/opencode-copilot-auto"]
}
```

Sign in to GitHub Copilot in opencode as usual; the plugin uses that connection.

From a local checkout (`bun install && bun run build`), use the `dist` directory for
opencode 2 (it only accepts a directory) and `dist/index.js` for opencode 1.

## Options

```jsonc
// opencode 2
{ "plugins": [{ "package": "@klconsultancy/opencode-copilot-auto", "options": { "tier": "balance" } }] }

// opencode 1
{ "plugin": [["@klconsultancy/opencode-copilot-auto", { "tier": "balance" }]] }
```

| Option | Default | Description |
|--------|---------|-------------|
| `tier` | `balance` | Tier of `github-copilot/auto`, like Copilot CLI's startup default: `efficiency`, `balance` or `intelligence`. The other two tiers get their own model. `fast` is not a picker tier (VS Code keeps it for inline chat, Copilot CLI dropped it) and falls back to `balance`. |
| `preferredModels` | — | Ordered model ids to anchor the autos on (see [Anchor](#anchor)), e.g. `["gpt-6-luna"]`. |

## How it works

This follows VS Code's Copilot Auto (`extensions/copilot/src/platform/endpoint` in
[microsoft/vscode](https://github.com/microsoft/vscode): `automodeService.ts`,
`autoV2Fetcher.ts`, `autoModeTiers.ts`).

```
POST https://api.githubcopilot.com/auto
{ "prompt": "<your message>", "tier": "balance", "has_image": true? }
→ { "selected_model": { "id": "gpt-6-luna" }, "session_token": "…", "expires_at": …, "discounted_costs": { "gpt-6-luna": 0.1 } }
```

- **Routing once per conversation.** The first prompt is sent to `/auto`, which picks a
  model and mints a 24-hour session token. The conversation stays on that model, so its
  prompt cache stays warm; every request carries `Copilot-Session-Token`, which bills it
  as Auto (10% discount on paid plans).
- **Routing again** happens, as in VS Code, on the next turn after compaction, when the
  token is within 5 minutes of expiring, when a turn attaches an image the model cannot
  read, and when you switch tier.
- **When `/auto` fails** the conversation keeps its last route while that can still
  serve the turn; otherwise it uses the anchor model without an Auto session, and tries
  again on your next message.
- Only what you typed goes to `/auto`, not file contents or other parts opencode adds.
- No VS Code editor or integration headers are sent: the plugin does not pretend to be
  VS Code.

### Anchor

opencode builds a model's requests with one SDK for one endpoint, so each auto is a
clone of a real Copilot model, its *anchor*. The plugin swaps the routed model into each
request, which works for every model on the same endpoint and wire API as the anchor
(Copilot's Responses API for GPT-5+). By default the anchor is a GPT model on the
Responses API, which is what `/auto` picks.

VS Code can send any pick through that model's own endpoint; this plugin cannot. If
`/auto` picks a model the anchor cannot carry (for example a Claude model), the
conversation runs on the anchor without an Auto session, and the log says so. The
anchor is also the fallback model, so a cheap one keeps fallbacks cheap:
`"preferredModels": ["gpt-6-luna"]`.

### Differences from VS Code and Copilot CLI

- No tier suggestion (Copilot CLI 1.0.89) and no per-response model label: the plugin
  logs the route, and opencode 1 shows a toast when the model changes.
- A pick outside the anchor's endpoint falls back to the anchor (see above); VS Code
  falls back to Copilot's utility model only when routing itself fails.

## Logging

Routing decisions go to `~/.local/state/opencode-copilot-auto/plugin.log`
(`%LOCALAPPDATA%\opencode-copilot-auto\plugin.log` on Windows):

```
auto decision: selected_model=gpt-6-luna, tier=balance, prompt_chars=41, …
auto routed -> gpt-6-luna
request model gpt-5.4 -> gpt-6-luna
```

## Development

```sh
bun install
bun run typecheck
bun run build       # dist/index.js, no runtime dependencies
bun test            # opencode 1 and 2 adapters, against stand-in plugin contexts
```

`src/core.ts` holds the routing; `src/v1.ts` (`server`) and `src/v2.ts` (`setup`) adapt
it to each opencode plugin API, and `src/index.ts` exports both.

### Releases

Releases run from GitHub Actions with
[release-please](https://github.com/googleapis/release-please). Commit messages follow
[Conventional Commits](https://www.conventionalcommits.org): `fix:` makes a patch,
`feat:` a minor, and `feat!:` or a `BREAKING CHANGE:` footer a major release. Each push to
`main` updates a release PR with the next version and `CHANGELOG.md`; merging it tags the
release, creates the GitHub release and stages the version on npm through
[trusted publishing](https://docs.npmjs.com/trusted-publishers) (no token). A maintainer
then approves it with 2FA under **Staged Packages** on npmjs.com, or with
`npm stage approve <stage-id>`, before it goes live.

## License

MIT. Copyright (c) 2026 m0wer, (c) 2026 Kristof Lemmens (KL Consultancy).
