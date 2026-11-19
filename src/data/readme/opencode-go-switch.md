<p align="center">
  <img src="https://raw.githubusercontent.com/xonika9/opencode-go-switch/main/assets/opencode-go-switch-hero.jpg" alt="Go Switch: Limits hit? Keep coding." width="100%">
</p>

# Go Switch

`opencode-go-switch` keeps an OpenCode Go session running: it stays on the account that still has headroom and moves to the next account inside the same request when a limit hits.

[![CI workflow status](https://github.com/xonika9/opencode-go-switch/actions/workflows/ci.yml/badge.svg)](https://github.com/xonika9/opencode-go-switch/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-go-switch)](https://www.npmjs.com/package/opencode-go-switch)
[![License](https://img.shields.io/npm/l/opencode-go-switch)](LICENSE)

## Why

OpenCode Go meters usage in three windows: a rolling 5-hour window, a weekly window, and a monthly window. With one subscription, a window eventually runs out mid-session. With several subscriptions you can keep working, but every switch drops the provider's prompt cache, so the next request starts colder.

So the plugin switches only when it has to. It keeps the account you are already using while that account has known headroom or its usage is unknown, and it goes looking for another account only when the current one can no longer serve a request. A recovered account does not pull the current account away: the current one stays until it fails.

## How it decides

- **Eligible** means usage is known for all three windows, none of them is exhausted, the key is not marked invalid, the account is not disabled, and it is not cooling down after an unexplained limit. Anything else is not eligible.
- **Sticky while usable.** The current account stays current while it is eligible, and also while its usage is unknown and requests keep succeeding. Unknown usage is not treated as a reason to move; a failing response is.
- **Forced switch order.** Eligible accounts come first, ordered by the earliest monthly reset. Next come eligible accounts without a usable monthly reset (none reported, or already in the past), then accounts whose usage is unknown. Ties break by label, then by id. Exhausted, cooling-down, disabled, and invalid-key accounts are never candidates.
- **One request, one provider.** A switch re-sends the same request, with the same URL, body, model, and provider, under the next account's key. Redirects are not followed on that retry; a redirect response is handed back to OpenCode as it is.
- **Nothing left means the original error.** When no account can carry the request, OpenCode receives the provider's original response, unchanged.

## Provider responses

The plugin only reacts to the provider response for the `opencode-go` provider (or whichever `providerID` you configure):

| Response | What usage says | What the plugin does |
| --- | --- | --- |
| `429` or `402` | A fresh read shows no window flagged as limited | Leaves the response alone: this limit did not come from a Go window. |
| `429` or `402` | A fresh read confirms an exhausted window | Marks the account exhausted, switches, and retries with the next account. |
| `429` or `402` | Usage cannot be read (timeout, network error, HTTP error, odd shape), or a window is still flagged as limited after its reset time | Sets the account aside until `Retry-After`, or `fallbackCooldownMs` when the header is missing, switches, and retries. A later successful usage read does not end that cooldown early. |
| `401` | Either | Marks the key invalid, switches, and retries. |
| `403` | Either | Returns the response unchanged: no switch, no state change. |
| Any other status | Either | Returns the response unchanged. |

The retry loop repeats while responses are `429`, `402`, or `401` and an untried account remains.

OpenCode has its own retry for failed requests. The plugin declines it (`retry: false`) only for `429` and `402` when there is at least one account and every account is out for a confirmed reason: an exhausted window, an invalid key, or a disabled connection. Retrying would just hit the same wall. In every other case the decision is left alone, including when an account is merely cooling down or has unknown usage, because OpenCode's retry may still succeed.

## What you see

Every switch marks the chosen credential active in OpenCode (best effort; a rejected activation does not stop the request) and, when the client supports plugin notifications, sends a toast through OpenCode's terminal UI:

```text
Now using <label> (<reason>)
```

The reason is the short cause, for example `<account> monthly limit` or `explicitly selected`.

Clients that do not render plugin toasts show nothing on a switch; the `go_accounts` tool works in every client and is the reliable way to see the current account. Activating a credential by hand in a UI does not steer the plugin: it keeps using the account it chose, and manual activation is not treated as a selection.

## Requirements

- **OpenCode 2.3.0 or newer.** The plugin is built and tested against the 2.3.0 plugin API, with `@opencode/plugin` `>=2.3.0 <3` and `effect` as peer dependencies.
- **One or more OpenCode Go key credentials.** One is enough to report status; two or more are needed to switch.
- **Bun**, for development, tests, and building a local clone. OpenCode runs the plugin itself.

## Install

### From npm

Add the package name to the `plugins` list in `opencode.jsonc`:

```jsonc
{
  "plugins": [
    { "package": "opencode-go-switch" }
  ]
}
```

### From a local clone

Build the package first, because the entry points resolve to `dist`:

```bash
bun install
bun run build
```

Then point the configuration at the clone:

```jsonc
{
  "plugins": [
    { "package": "file:///path/to/opencode-go-switch" }
  ]
}
```

Options go in the same entry:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-go-switch",
      "options": {
        "pollIntervalMs": 600000,
        "fallbackCooldownMs": 900000
      }
    }
  ]
}
```

Restart OpenCode after changing the configuration.

## Options

All options are optional. Invalid values fall back to the default.

| Option | Default | Effect |
| --- | --- | --- |
| `pollIntervalMs` | `300000` (5 minutes) | How often every account's usage is refreshed in the background. Usage is also read at startup and after a limit. Set `0` to stop background polling; usage is then read on demand. |
| `usageTimeoutMs` | `5000` | Timeout for one usage request. A timeout counts as unknown usage, not as an exhausted account. It also caps how long the first request after startup waits for the startup usage read. |
| `fallbackCooldownMs` | `900000` (15 minutes) | How long an account is set aside after a limit when neither usage data nor `Retry-After` says when it recovers. |
| `usageUrl` | `https://opencode.ai/zen/go/v1/usage` | Usage endpoint. Change it only if the endpoint moves. It must be `https`. |
| `integrationID` | `opencode-go` | Integration whose key credentials are the accounts. |
| `providerID` | `opencode-go` | Provider whose requests are switched between accounts. |

## The `go_accounts` tool

The model can call this tool, and so can you. Without arguments it refreshes usage that is missing or stale and returns plain text:

```text
Go Switch <version>
OpenCode Go accounts (<count> connected)
current: <label> - <reason>
last switch: <from> → <to>, <cause>, <timestamp> (<ago>)

<label> (current) - <state>
  5h <percent>% · weekly <percent>% · monthly <percent>%
  monthly resets <date> (<relative time>)

<label> - <state>
  5h <percent>% · weekly <percent>% · monthly <percent>%
  monthly resets <date> (<relative time>)
```

The line order is fixed: version, account count, current account with the reason it is current (or, when a later poll found it blocked, its blocking state), the last switch (`last switch: none` until the first one), then one block per account; the current account carries `(current)` after its label. Each account block shows its state, the 5h, weekly, and monthly percentages, and the monthly reset (`monthly reset unknown` when the endpoint gave no usable time). States are `eligible`, `usage unknown`, `exhausted: <window> until <time>`, `cooling down until <time>`, `invalid key`, and `disabled`. Percentages get one decimal only when a window is nearly full and a whole number would hide it.

To choose an account yourself:

```text
select <account label> in go_accounts
```

`select` matches the label case-insensitively and makes that account current even if another account looks better. It activates the credential, persists the choice, and sends the same notification as an automatic switch. Selecting the account that is already current changes nothing. Accounts with unknown usage may be selected.

Refusals keep the tool from moving to an account that cannot serve a request; the refusal is printed above the normal status, and nothing switches:

- an unknown label, with the labels that are connected;
- a label shared by several accounts, which must be renamed first;
- an exhausted account, naming the window and when it resets;
- a cooling-down account, naming when the cooldown ends;
- a disabled account or one with an invalid key.

## Usage data

The plugin reads `GET https://opencode.ai/zen/go/v1/usage` with the account key as a bearer token. When a credential's metadata names a `server`, the request goes to that server's origin at `/zen/go/v1/usage`; an `orgID` in the metadata is sent as `x-opencode-org-id`. A URL that is not `https`, or a `server` value that does not parse as a URL, means no request is sent and usage stays unknown. Redirects are not followed.

The response must contain `rolling`, `weekly`, and `monthly`, each with a status, a non-negative percentage, and an optional reset time as an ISO string or epoch milliseconds. A window is exhausted when the endpoint marks it rate-limited or when its percentage reaches 100. Extra fields are ignored; any shape the plugin does not understand becomes unknown usage, never a guess.

The endpoint is undocumented and may change. It is an optimization, not a dependency:

- the body is capped at 64 KiB while reading, and a request times out after `usageTimeoutMs`;
- a `401` from the endpoint marks the key invalid until a later poll succeeds;
- a `403`, any other HTTP error, a redirect, a timeout, a network error, an oversized body, or malformed JSON means unknown usage;
- a usage read triggered by a limit gets at most two seconds before the plugin falls back to the cooldown described above, and once one has run out that time, later accounts in the same request go straight to the cooldown instead of waiting again;
- when usage is unknown, the provider's own errors still drive every switch.

## Privacy

- Keys stay in OpenCode's credential store. The plugin resolves them through the plugin API and holds them in memory only.
- Keys are never logged, stored, returned in tool output, put in notifications, or written to tests and fixtures. Storage holds a credential id, nothing else.
- Usage requests go only over `https`, to the Go usage endpoint (or the https origin named in the credential's `server` metadata). A key otherwise travels only on the provider request OpenCode already made, under the account the plugin selected. There is no telemetry, and no other network request is made.
- Status text and notifications contain labels, percentages, window names, and reset times, never key material.

## Limitations and what is not built

- **One OpenCode host at a time.** The current account id is kept in plugin storage, which is last-writer-wins. Two hosts sharing a data directory can overwrite each other's choice; each process still keeps its own choice in memory.
- **A limit inside a streaming `200` response is not detected.** The plugin sees response headers, not the streamed body. The next request that hits a limit switches.
- **Environment-variable keys are not listed.** Only key credentials from the integration are accounts.
- **No option to mute toasts.** Every switch notifies; clients that do not render the toast simply show nothing.
- **The usage endpoint is undocumented.** If it changes shape, accounts report `usage unknown` and switching falls back to provider errors.
- **Manual activation in a UI does not steer the plugin.** Use `select` in `go_accounts`.

## Development

```bash
bun install
bun run check
bun run build
```

`bun run check` runs the typecheck and the test suite; `bun run typecheck` and `bun test` run them separately. Tests use a fake network and a fake plugin context: no real keys, no real requests. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and [SECURITY.md](SECURITY.md) for vulnerability reports.

## Disclaimer

This is an independent project. It is not made, supported, or endorsed by OpenCode.

## License

[MIT](LICENSE), copyright © 2026 xonika9.
