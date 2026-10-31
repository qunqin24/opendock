# opencode-cpa-quota

An OpenCode 2.2 plugin that shows [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)
(CLIProxy, CPA) account quota in the terminal UI: a **CPA accounts** section in the
session sidebar and a one-line summary in the prompt footer.

It is read-only. It never resets quotas, refreshes tokens, spends tokens on
inference or changes CLIProxy configuration.

## What it shows

- Every account in CLIProxy's `auth-files` inventory, including disabled
  accounts, unknown providers and accounts with no quota observations yet.
- For each account: provider, a short pseudonymous ID (the shortest unique
  SHA-256 prefix of CLIProxy's `auth_index`, at least four characters), status,
  cooling/retry time and the number of model cooldowns.
- Quota bars per window (for example **5 hour**, **7 day**, **7 day Opus**), with
  the percentage **remaining** and the time until reset. Expired windows are
  hidden rather than shown as full.
- Warnings for disabled, cooling, erroring or unauthenticated accounts, and the
  age of last-known data when a refresh has failed.
- The footer shows the account count, or the most important warning.

Claude and Codex accounts get active usage reads (below). Other providers show
their CLIProxy status and any passive quota headers CLIProxy has recorded.
Upstream API keys configured directly in CLIProxy's config file do not appear in
`auth-files` and are not shown. Separate accounts are never added into a
combined total.

The sidebar header toggles with a click, Enter/Space, Left/Right, or the
**Toggle CPA accounts** command.

## Requirements

- OpenCode **2.2** (type-checked against the published `@opencode/plugin` 2.2.0
  and its OpenTUI 0.7.0). Earlier 2.x releases are not tested.
- Bun 1.3.14 or later (OpenCode's own runtime loads the TypeScript directly; there
  is no build step).
- CLIProxyAPI with the management API enabled and a management key. Developed
  against the **8.0.x** series: the two routes used below are present unchanged
  from v8.0.23 to v8.0.47. Other versions may work but are not tested.

## Configuration

Add the package to the **server's** `opencode.json(c)`. The terminal UI loads the
plugin's `./tui` part automatically, including when it attaches to a remote server.

```jsonc
{
  "plugins": [
    {
      "package": "@kerneloops/opencode-cpa-quota",
      "options": {
        "url": "http://127.0.0.1:8317",
        "keyFile": "/absolute/path/to/management-key"
      }
    }
  ]
}
```

There are no defaults: without a URL and a key the plugin shows
`CPA configuration error` and makes no requests.

| Setting | Plugin option | Environment variable (server process) |
| --- | --- | --- |
| CLIProxy origin, for example `http://127.0.0.1:8317` | `url` | `CLIPROXY_URL` |
| Management key | `keyFile` (absolute path to a file holding the key) | `CLIPROXY_MANAGEMENT_KEY` (the key itself) |

Plugin options take precedence over the environment. Rules:

- The origin must be `http` or `https` with no path, query, fragment or
  credentials. Plain `http` is accepted only for `localhost`, `127.0.0.1` and
  `[::1]`; anything else must use `https`. Redirects are refused.
- A `keyFile` must be a regular file (not a symlink) owned by the server user
  with mode `0600`, holding only the key. It is re-read on each refresh, so
  rotating the key needs no restart. An environment key is read once at start-up.
- Never put the key itself in `opencode.json`.

The key is sent only to the configured CLIProxy origin. It is never sent to the
terminal UI, written to disk or logged; the plugin does not log at all.

## CLIProxy endpoints used

All requests go to the configured origin with `Authorization: Bearer <management key>`
and `User-Agent: opencode-cpa-quota/0.1.0`.

| Request | Purpose | Limits |
| --- | --- | --- |
| `GET /v0/management/auth-files` | Account inventory, status, cooldowns and any passive quota observations | At most once a minute; 5 s timeout; 1 MiB response cap; first 200 accounts |
| `POST /v0/management/api-call` | CLIProxy makes one fixed upstream `GET` with the account's own token (`$TOKEN$`) | At most once per 5 minutes per account, at most 4 per minute in total; 15 s timeout; 256 KiB cap |

Through `api-call` the plugin reads only:

- Claude: `https://api.anthropic.com/api/oauth/usage` (with the `anthropic-beta: oauth-2025-04-20` header).
- Codex: `https://chatgpt.com/backend-api/wham/usage` (with the ChatGPT account ID
  from the inventory's ID-token claims; without it, active usage is unavailable).

These are undocumented provider endpoints and may change without notice. Unknown
fields are ignored and a malformed window does not discard valid ones.

## Refreshing and failures

- Nothing is requested until a terminal asks for a snapshot. One refresh owner is
  shared by every project in the server process. Projects configured with
  different options get `configuration` instead of a second request stream.
- The terminal polls every 60 s, plus a few short follow-ups while a refresh is
  running, and stops polling when the plugin unloads.
- Inventory failures back off 1–15 minutes, per-account failures 5–60 minutes.
  `Retry-After` is honoured within those bounds.
- A management `401` or `403` stops the batch and the plugin will not retry the
  same key. CLIProxy can also answer `403` for a banned client, so after fixing a
  ban without changing the key, restart OpenCode.
- Last-known data stays on screen with its age; a stale observation is not a
  promise of remaining capacity.

## Privacy

The terminal receives only: pseudonymous account IDs, provider names (ASCII
allowlist), status, cooldown counts and quota windows. E-mail addresses, file
names, labels, tokens, account claims, raw response bodies and upstream error
text stay on the server and are never displayed or logged. The IDs are
pseudonyms, not a strong anonymity guarantee.

## Development

```sh
npm install --ignore-scripts
npm test                      # unit tests with loopback HTTP fixtures and dummy keys
npm run typecheck             # against @opencode/plugin 2.2.0
npm run test:tui              # renders the sidebar at 24 and 80 columns
```

Run these with a clean environment (`env -i HOME="$HOME" PATH="$PATH" …`) if your
shell exports `BUN_INSPECT*` settings. Tests never contact a real CLIProxy or provider.

## Acknowledgements

Thanks to [caoool/opencode-cpa-quota-plugin](https://github.com/caoool/opencode-cpa-quota-plugin)
for the original CPA quota-display idea. This is an independent implementation for
OpenCode 2.x; no code was copied and it is not endorsed by that author.

## Licence

[MIT](LICENSE) © 2026 Marc
