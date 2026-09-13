# opencode-codex

<img width="1148" height="679" alt="demo" src="https://github.com/user-attachments/assets/b95327da-0b02-4506-bb2f-da036e651fd3" />

A clean, native multi-account Codex (ChatGPT Plus/Pro OAuth) integration for
[OpenCode](https://opencode.ai). Adds multiple-account support, account
switching, and per-account quota tracking — all through OpenCode's standard
flows instead of bespoke CLIs or custom dialogs.

> ### ⚠️ Use at your own risk
>
> This plugin lets you attach more than one Codex account to the same OpenCode
> instance. Depending on how you use it, that may run against the OpenAI Terms
> of Service. Only attach accounts that belong to you, and don't rely on
> rotation to dodge rate limits in a way that violates ToS.

## What it does

- **Multi-account OAuth.** Log in once per account through the standard
  `opencode auth login` → `openai` flow (browser / device code / paste
  callback URL). Each login adds another account.
- **Account switching inside the TUI.** `/codex-accounts` opens a picker
  showing every connected account, its plan, and current 5h/weekly usage.
- **Session-aware selection.** Apply an account to all sessions, only the
  current session plus future sessions, or only the current session.
- **Standard logout flow.** Removing accounts is just
  `opencode auth logout` — each account appears as its own entry.
- **Automatic fallback.** Requests go through the active account; if it hits
  a 429/quota wall the next eligible account picks up so you don't have to
  babysit the switcher.
- **Live quota in the sidebar.** Two-tone progress bars for the active
  account's 5h and weekly windows, plus a pool aggregate when multiple
  accounts are connected.

## Installation

Register the package in both OpenCode plugin entry points:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["@jjangga0214/opencode-codex@2.0.0"]
}
```

```jsonc
// ~/.config/opencode/tui.json
{
  "plugin": ["@jjangga0214/opencode-codex@2.0.0"]
}
```

Use only one OpenCode configuration directory. Registering the plugin in both
`~/.config/opencode` and `~/.opencode` initializes two plugin instances and can
make the selected account disagree with the TUI. The fork is currently tested
with OpenCode 1.18.30.

## Adding accounts

Run `opencode auth login`, pick **openai**, and choose one of the three OAuth
methods:

| Method                                    | When to use                                                                                                            |
|-------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| **ChatGPT Pro/Plus (browser)**            | Local machine with a graphical browser. The plugin spins up a one-shot callback server on `localhost:1455`.            |
| **ChatGPT Pro/Plus (device code)**        | Remote / headless setup; enter a short code on another device that has a browser.                                      |
| **ChatGPT Pro/Plus (paste callback URL)** | Sandboxed environments where neither of the above works — you open the URL manually and paste the redirected URL back. |

Every successful login is appended to the account store and becomes the active
account. Repeat for additional accounts.

## Managing accounts

<img width="1135" height="680" alt="account switching" src="https://github.com/user-attachments/assets/5a8856a1-333e-4be3-a677-dde164f40ea8" />

| Action | Where                          |
|--------|--------------------------------|
| Add    | `opencode auth login` → openai |
| List   | `opencode auth list`           |
| Switch | `/codex-accounts` in the TUI   |
| Remove | `opencode auth logout`         |

Under the hood the plugin keeps a `openai/<email>` entry in `auth.json` per
connected account and keeps the canonical `openai` key as a compatibility
mirror — so OpenCode's provider system sees a normal OAuth credential while the
plugin reads the account pool from OpenCode's standard auth store.

After choosing an account, select where it applies:

- **All sessions** changes every known session and the default for new sessions.
- **This session + new sessions** changes the current session and the default,
  while leaving other existing sessions pinned to their current accounts.
- **This session only** changes only the current session.

Selections are persisted and watched across OpenCode processes. New sessions
therefore start with the most recently selected default account, while an
explicitly pinned existing session keeps its selection.

![Account selection scopes](https://raw.githubusercontent.com/jjangga0214/opencode-codex/main/docs/screenshots/codex-account-scope.png)

## Quota display

The sidebar shows two sections when multiple accounts are connected:

- **Quota** — the active account's 5h and weekly windows, with a reset
  countdown and percent remaining.
- **All Quota** — pooled aggregate across every connected account, so you can
  see how much headroom your set has overall.

When only one account is connected, just **Quota** is shown.

Usage data is fetched in memory from `chatgpt.com/backend-api/wham/usage`:

- once on TUI startup,
- immediately after an account switch,
- when a new session is created,
- when a user sends a new message,
- when an AI response finishes (`session.idle`),
- and every 5 minutes thereafter.

`All Quota` weights each account by its effective plan capacity. Plus uses 1x
and Pro uses 5x by default. The usage API may report both Pro tiers only as
`pro`, so set each Pro 20x account inside OpenCode:

1. Run `/codex-quota`.
2. Choose the Pro account by email.
3. Choose **Pro 5x** or **Pro 20x**.

![Codex quota command](https://raw.githubusercontent.com/jjangga0214/opencode-codex/main/docs/screenshots/codex-quota-command.png)

![Pro quota capacity](https://raw.githubusercontent.com/jjangga0214/opencode-codex/main/docs/screenshots/codex-quota-capacity.png)

The choice is saved in OpenCode's plugin storage and applied immediately. A Pro
5x selection clears the override and restores the default; only Pro 20x accounts
need an override. The account picker and prompt status show `Pro 5x` or
`Pro 20x` so you can confirm the effective setting. The 5-hour and weekly rows
are weighted independently, and accounts without fetched usage remain excluded.

## Storage and runtime state

| Location | Purpose |
|----------|---------|
| `$XDG_DATA_HOME/opencode/auth.json` | OpenCode's credential file and the source of truth for Codex OAuth tokens. One entry per account at `openai/<email>` plus the compatibility mirror at `openai`. |
| `$XDG_DATA_HOME/opencode/codex/selection.json` | Default and per-session account selections. |
| OpenCode plugin KV storage | Per-account Pro 5x/20x overrides. |

Fetched usage and temporary rate-limit state stay in process memory and are
refreshed after restarting OpenCode.

## Troubleshooting

**`/codex-accounts` says "No accounts" right after install.**
Make sure you've logged in at least once with `opencode auth login` → openai.
If you migrated from another multi-account plugin, your previous tokens won't
auto-import — log in again.

**Logging out via `opencode auth logout` and then chatting fails.**
Pick a different account with `/codex-accounts`, or run `opencode auth login`
again. The plugin only restores the active mirror when there's at least one
account left.

**Sidebar shows `5h —` or `weekly —`.**
Usage data hasn't been fetched yet. It populates on the next idle event or 5
minutes after startup. If it stays blank, your active token may be revoked —
re-authenticate.

## License

[MIT](./LICENSE)

This fork retains the original project's MIT license and attribution. Fork
changes are maintained at
[jjangga0214/opencode-codex](https://github.com/jjangga0214/opencode-codex).
