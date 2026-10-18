# opencode-zai-usage

Z.ai GLM Coding Plan quota & usage for [OpenCode](https://opencode.ai) v2 — one
token-efficient tool plus a live status-line badge. No installer, no config
surgery, no extra agent round-trips, zero runtime dependencies.

## What you get

- **`zai_usage` tool** — compact, accurate quota report for the agent to call
  on demand: 5-hour credit window, weekly limit, and monthly MCP tool usage,
  each with percentage, progress bar, and reset time, plus derived absolute
  credits for your plan tier. `detail: true` adds the 24-hour model/tool
  breakdown and a pricing reference block.
- **Status-line badge** — `ZAI 21% · 2h 41m` in the prompt footer, always
  current (refreshed as usage events land), color-coded at 60% and 90%, with a
  `· peak` marker during peak hours. Zero model calls.
- **`/zai` command** — instant dialog with the full quota table, credits, and
  pricing (your selected model highlighted). Zero model calls.

## Credits & pricing

The monitoring API reports percentages of your **credit** allowance
(docs.z.ai/devpack/overview), not raw tokens. The plugin derives absolute
credits from the plan tier the API reports (Lite 2,000/10,000, Pro
12,000/60,000, Max 28,000/140,000 per 5h/week) and shows reference pricing:

- Peak hours are Mon–Fri 14:00–18:00 SGT; everything else is off-peak at
  0.5× credits. The badge flags peak windows and the dialog counts down to
  the next transition.
- Model credit multipliers (GLM-5.3: 6.9/1.7/24, Flash: 2.3/0.56/8 for
  input/cached/output) and the MCP per-call cost (1.2) come from the docs,
  including the documented routing of older model names.

These constants live in `src/pricing.ts` with their source and check date —
quota percentages always come live from the API, and static values are never
mixed into live numbers. The China plan (open.bigmodel.cn) has different,
undocumented terms, so pricing is global-plan only.

## Install

```sh
opencode plugin add opencode-zai-usage
```

One command: installs the package and registers it in your global OpenCode
configuration. Updates and removal are managed the same way
(`opencode plugin update`, `opencode plugin remove`, `opencode plugin list`).

Prefer manual configuration? Reference the package (or a local checkout) in
`~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-zai-usage"] // or: "/absolute/path/to/opencode-zai-usage"
}
```

Authenticate as usual with `/connect` → **Z.AI Coding Plan**. That's the whole
setup.

## How it works

```
Z.ai monitoring API            OpenCode server                TUI
────────────────────           ─────────────────              ─────────────────
 /api/monitor/usage/  ──fetch──▶ zai-usage plugin   ──RPC──▶  badge + /zai
 quota/limit               (credentials · TTL cache ·          dialog
 model-usage *             idle-refresh)
 tool-usage  *
```

- **Credentials** come from OpenCode's integration layer
  (`ctx.integration.connection`), never from parsing files. Falls back to
  `ZHIPU_API_KEY` (or legacy `ZAI_API_KEY`) when no connection exists.
- **One fetch, many consumers**: a shared TTL cache (60s default) backed by
  in-flight deduplication serves the tool, badge, and dialog. The cache also
  refreshes on `session.usage.updated` — every model call of every session,
  including parallel ones — with a 5-minute drift floor for usage that happens
  outside this instance, all capped at one fetch per 30s.
- **The API key never leaves the server plugin.** The TUI talks to it over
  the plugin RPC channel and receives parsed snapshots only.
- **Only percentages are reported for token windows** — the monitoring API
  does not expose absolute plan limits, so none are invented.

## Platforms

Both Z.ai global (`api.z.ai`, integrations `zai-coding-plan`/`zai`) and China
(`open.bigmodel.cn`, integrations `zhipuai-coding-plan`/`zhipuai`) are
supported and detected from whichever integration you connected. For env-var
users on the China endpoint, set the platform:

```jsonc
{
  "plugins": [{ "package": "opencode-zai-usage", "options": { "platform": "cn" } }]
}
```

## Development

```sh
npm install
npm run check        # typecheck
npm run smoke        # live API smoke test (prints parsed quota, never the key)
```

`scripts/smoke.ts` reads credentials the same way the plugin does, minus the
integration layer.

**Local loading**: directory plugins need entry files at the package root, so
`index.ts` and `tui.tsx` re-export from `src/` (they are excluded from the npm
package via `files`, where `exports` takes over). Point `plugins` at this
directory, restart the service, and check with `opencode plugin list` or
`opencode api get /api/plugin`.

## License

MIT
