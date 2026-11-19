# opencode-llm-quota

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

An [OpenCode](https://opencode.ai) plugin that shows where you stand on the AI platform quotas, in the
status bar, without getting in your way:

```
Model A · normal priority · budget 62% left
Model B · today 41% · resets in 6h
```

It runs next to opencode-keycloak-auth, which stays
the only plugin that logs you in and refreshes your token. This plugin handles no authentication, and it
never blocks, delays or changes a request to a model.

## Contents

- [What you see](#what-you-see)
- [Normal priority and low priority](#normal-priority-and-low-priority)
- [Compatibility](#compatibility)
- [Install](#install)
- [`opencode.json`](#opencodejson)
- [Configuration](#configuration)
- [Quota unavailable](#quota-unavailable)
- [What the plugin never does](#what-the-plugin-never-does)
- [Development](#development)

## What you see

On OpenCode v2, one line in the prompt footer, for the model selected in the prompt:

| Situation                                | Status line                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| Soft budget, some left                   | `Model A · normal priority · budget 62% left`              |
| Soft budget used up                      | `Model A · low priority · normal in ~35 min`               |
| Daily cap                                | `Model B · today 41% · resets in 6h`                       |
| Requests per minute (above 80%)          | `… · 52/60 req/min`                                        |
| Weekly cap (from 50%)                    | `… · week 78% · resets Mon 10:00`                          |
| Requests in flight (from 12 of 16)       | `… · in flight 14/16`                                      |
| The quota could not be read              | `Model A · quota unavailable`                              |
| Last read is old (gateway not answering) | `Model A · normal priority · budget 62% left (12 min ago)` |

"budget 62% left" is what remains of the budget. A model without a quota, such as an embeddings model,
shows nothing.

A toast appears only when the state changes: you drop to low priority, you are back to normal priority,
or a daily or weekly cap reaches 80% then 100%. Never on every read.

The detail of every model, on demand:

- `/quota` in the TUI, or "Quota" in the command palette (OpenCode v2). It calls no model.
- The `quota` tool, on v1 and v2: ask the agent to show your quota. A tool call goes through the model,
  so it uses a little quota; on v2, prefer `/quota`.

```
Quotas · https://gateway.example.com
Model A (model-a)
  low priority · normal in ~3 min
  week 34% · resets Sat 19:00
  in flight 0/16
  read 20s ago
Model B (model-b)
  per minute: 1/60 req/min
  today 68% · resets in 10h
  read 20s ago
Jina (jina-embeddings-v5): no quota on this model
```

## Normal priority and low priority

Models can have two kinds of limits, and the plugin shows each the way it works. In the examples, Model A
has a soft budget and Model B has hard limits; the names come from the `labels` option or from the
models' names in your config.

A soft budget is a token budget per user that refills continuously, over about an hour.

- Normal priority: some budget is left and your requests go through as usual.
- Low priority: the budget is used up. You are not blocked. Your requests still go through, after those
  of users at normal priority, so they can be slower when the platform is busy. The status line says
  when you will be back to normal priority. The budget can go below zero, when a long answer costs more
  than what was left, and the wait is then longer.
- A model with a soft budget can also have a hard weekly cap, shown from 50% ("week 78% · resets Mon
  10:00"), and a limit on requests in flight at once, shown from 75% of it (12 of 16).

Hard limits are a number of requests per minute and a daily token cap. Past them, the platform refuses
requests (HTTP 429) until the reset shown ("resets in 6h").

## Compatibility

| OpenCode      | Status bar | Toasts | `/quota` | `quota` tool | Token source                                |
| ------------- | ---------- | ------ | -------- | ------------ | ------------------------------------------- |
| 2.x (2.0.25+) | yes        | yes    | yes      | yes          | the host's connection, no change needed     |
| 1.17 to 1.19  | no         | yes    | no       | yes          | opencode-keycloak-auth with the patch below |

Each line was run against the real OpenCode releases 1.17.11, 1.19.6, 2.0.25 and 2.3.2 (`npm run test:e2e`).

- On OpenCode v2, the status bar, toasts and `/quota` come from the plugin's TUI part. Install it as a
  folder or a package (options B and C). The single file (option A) has the server part only: the tool.
- On OpenCode 2.3, plugin tools are reached through Code Mode: the agent calls `tools.quota()` from its
  `execute` tool. Nothing to configure.
- On OpenCode v1, a server plugin cannot write into the TUI status bar, so the plugin shows toasts and
  offers the tool. It also needs an opencode-keycloak-auth that shares its token with other plugins
  ([`patches/opencode-keycloak-auth-token-source.diff`](patches/opencode-keycloak-auth-token-source.diff)).
  Without it, the plugin shows "quota unavailable".

## Install

Install opencode-keycloak-auth first and check that
you can call a model. Install this plugin the same way, next to it. It has no dependencies and works
offline.

### Option A: single file (v1; v2 without the status bar)

```bash
mkdir -p ~/.config/opencode/plugins
gh release download --repo <owner>/opencode-llm-quota \
  --pattern opencode-llm-quota.js --dir ~/.config/opencode/plugins
```

The repository is private, so the download goes through an authenticated `gh` (or any GitHub token).

Auto-loaded plugins get no options: use the `OPENCODE_QUOTA_*` variables (see
[Configuration](#configuration)).

### Option B: a folder, referenced by path (offline, everything)

```bash
# on a machine with network access
npm ci && npm run build && npm pack        # -> opencode-llm-quota-<version>.tgz
# on the workstation
mkdir -p ~/.opencode-plugins && cd ~/.opencode-plugins
npm init -y
npm install --offline /path/to/opencode-llm-quota-<version>.tgz
```

Then reference the folder `~/.opencode-plugins/node_modules/opencode-llm-quota` in `opencode.json`.
OpenCode v2 finds `server.js` and `tui.js` in it.

### Option C: npm registry (online workstations)

Reference the package by name, `"opencode-llm-quota"`.

## `opencode.json`

No option is required. The plugin follows opencode-keycloak-auth's provider (same `providerId`, `keycloak`
by default) and reads the gateway URL from that provider's `baseURL`. When the internal CLI switches
workspace and rewrites the `baseURL`, the plugin follows without a reinstall.

### OpenCode v2

```jsonc
{
  "plugins": [
    { "package": "opencode-keycloak-auth", "options": { "issuer": "…", "clientId": "…" } },
    {
      // online: "opencode-llm-quota"; offline: absolute path to the installed folder
      "package": "/home/you/.opencode-plugins/node_modules/opencode-llm-quota",
      "options": {
        "labels": { "model-a": "Model A", "model-b": "Model B" },
      },
    },
  ],
  "providers": {
    "keycloak": {
      "package": "@ai-sdk/openai-compatible",
      "settings": { "baseURL": "https://gateway.example.com/v1" },
      "models": {
        "model-a": { "name": "Model A" },
        "model-b": { "name": "Model B" },
      },
    },
  },
}
```

### OpenCode v1

```jsonc
{
  "plugin": [
    ["opencode-keycloak-auth", { "issuer": "…", "clientId": "…" }],
    ["opencode-llm-quota", { "labels": { "model-a": "Model A" } }],
  ],
  "provider": {
    "keycloak": {
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "https://gateway.example.com/v1" },
      "models": { "model-a": { "name": "Model A" } },
    },
  },
}
```

Each model of the provider is queried under the name sent to the gateway: the model's `id` setting if it
has one, else its key. Aliases work, the gateway resolves them.

## Configuration

Plugin options in `opencode.json`, or environment variables. On OpenCode v2 the variables must be set in
the environment of the background service (`opencode service restart` after a change).

| Option                 | Variable                            | Default                  | Effect                                                        |
| ---------------------- | ----------------------------------- | ------------------------ | ------------------------------------------------------------- |
| `enabled`              | `OPENCODE_QUOTA_ENABLED`            | `true`                   | Turns the plugin off without uninstalling it.                 |
| `providerId`           | `OPENCODE_QUOTA_PROVIDER_ID`        | keycloak-auth's provider | `OPENCODE_KC_PROVIDER_ID`, else `keycloak`.                   |
| `intervalSeconds`      | `OPENCODE_QUOTA_INTERVAL`           | `60`                     | Time between two reads of a model. Values below 60 become 60. |
| `labels`               |                                     | the model's name         | Display names, by model id or API name.                       |
| `toasts`               | `OPENCODE_QUOTA_TOASTS`             | `true`                   | Toasts on state changes.                                      |
| `minuteThresholdPct`   | `OPENCODE_QUOTA_MINUTE_THRESHOLD`   | `80`                     | Shows requests per minute above this usage.                   |
| `weeklyThresholdPct`   | `OPENCODE_QUOTA_WEEKLY_THRESHOLD`   | `50`                     | Shows the weekly cap from this usage.                         |
| `inFlightThresholdPct` | `OPENCODE_QUOTA_INFLIGHT_THRESHOLD` | `75`                     | Shows requests in flight from this share of the limit.        |
| `toastThresholdsPct`   | `OPENCODE_QUOTA_TOAST_THRESHOLDS`   | `80,100`                 | Daily and weekly cap levels that toast when crossed.          |
| `quotaPath`            | `OPENCODE_QUOTA_PATH`               | `/v1/quota`              | Path of the quota route on the gateway.                       |

Logs: `OPENCODE_QUOTA_LOG` sets the level (`silent`, `error`, `warn` by default, `info`, `debug`). OpenCode
v2 shows plugin console output nowhere, so set `OPENCODE_QUOTA_LOG_FILE=/path/to/quota.log` to get the
lines in a file. Logs never contain your token or the gateway's answers.

## Quota unavailable

The plugin could not read your quota. Your requests to the models are not affected: the plugin never
touches them. It tries again on its own, less and less often (up to every 15 min), without an error on
each failure.

1. Are you logged in? Call a model. If it answers, the login is fine. If not, log in again with
   opencode-keycloak-auth (`/connect` or `opencode auth login`). This plugin never starts a login.
2. On OpenCode v1, does your opencode-keycloak-auth share its token with other plugins? Without the patch,
   the quota stays unavailable. The token exists once the provider has loaded, so call a model once.
3. Does the workspace gateway have the `/v1/quota` route yet? With `OPENCODE_QUOTA_LOG=debug`, each read
   logs its outcome: 401 means the token was refused, 404 a model without quota (ignored), 5xx the quota
   service failing.
4. An API key instead of a Keycloak login is refused by the quota route. The quota shows with a Keycloak
   login only.

If the gateway stops answering after a first read, the plugin keeps the last known state and shows its
age ("(12 min ago)").

## What the plugin never does

- Block, delay or change a request to a model.
- Send your token anywhere but the gateway of the configured provider (the origin of its `baseURL`). It
  refuses redirects.
- Log your token or the gateway's answers.
- Read a model more than once a minute, whatever the number of open projects, plus one read after a
  response ends, with the same one-minute floor. Never on a keystroke.
- Handle a login or read a Keycloak secret.

## Development

Node.js 20 or later, same tooling as opencode-keycloak-auth.

```bash
npm ci
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

`npm run build` writes `dist/index.js` (server part, v1 and v2) and `dist/tui.js` (v2 TUI part), checked by
`scripts/check-bundle.mjs`. The unit tests use `/v1/quota` bodies in the rate-limit service's format
(`test/fixtures.ts`) and a fake clock: no network, no real timers.

`npm run test:e2e` runs the plugin in real OpenCode releases (1.17.11, 1.19.6, 2.0.25, 2.3.2; pick some with
`E2E_VERSIONS=1.19.6,2.3.2`) against a fake gateway, with opencode-keycloak-auth v1.0.0 plus the patch. It
needs network access the first time (binaries, the keycloak plugin) and Python 3 for the TUI checks.
Everything is cached in `.e2e/`.

Design notes, findings and open questions: [quota-plugin-report.md](quota-plugin-report.md).

## License

[MIT](LICENSE)
