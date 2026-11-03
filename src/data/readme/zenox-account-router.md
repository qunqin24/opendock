<p align="center">
  <img src="https://raw.githubusercontent.com/CyberBoyAyush/zenox-account-router/main/.github/assets/banner.png" alt="Zenox Account Router: quota-aware account failover for OpenCode" width="720" />
</p>

<h1 align="center">Zenox Account Router</h1>

<p align="center">
  <strong>Hit a usage limit, keep working.</strong><br />
  Account failover for OpenCode V2 that uses your Claude and ChatGPT subscriptions first, and a paid API key only if you allow it.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/zenox-account-router"><img src="https://img.shields.io/npm/v/zenox-account-router.svg?style=flat-square&color=111" alt="npm version" /></a>
  <a href="https://github.com/CyberBoyAyush/zenox-account-router/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/CyberBoyAyush/zenox-account-router/ci.yml?style=flat-square&label=tests" alt="tests" /></a>
  <img src="https://img.shields.io/badge/OpenCode-V2%20%E2%89%A5%202.2.5-111?style=flat-square" alt="OpenCode V2" />
  <img src="https://img.shields.io/badge/node-%E2%89%A522-111?style=flat-square" alt="Node 22+" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-111?style=flat-square" alt="MIT license" /></a>
</p>

---

I pay for more than one Claude subscription. OpenCode can only use one of them at a time, so whenever the weekly limit ran out, my session just stopped and I had to switch accounts by hand in the middle of the task.

This plugin fixes that. When the active account is genuinely out of quota, it moves you to the next one and retries the request. You don't have to touch anything.

```text
Claude account A  ──(limit reached)──▶  Claude account B  ──(also out)──▶  API key (only if you allowed it)
```

It works for **Anthropic** (Claude Pro, Max, Team) and **OpenAI** (ChatGPT Plus, Pro, Team through Codex). It's part of the [Zenox](https://www.npmjs.com/package/zenox) family of OpenCode plugins.

## What it does

- **Stays put.** It keeps using the account you're on, so prompt caching keeps working. It never switches just because another account has more room left.
- **Only switches when an account is really out.** Short rate limits, model or plan restrictions, login errors, server errors and failed background title requests are left to OpenCode's normal retries.
- **Uses the paid key last.** Your API key is only touched when every subscription you picked is confirmed out, you turned paid fallback on, and the model is on your allowlist. When a subscription is usable again, the next prompt moves back to it.
- **Doesn't store secrets.** It works with the accounts you've already connected in OpenCode, and your auth plugins keep handling sign-in and token refresh. Nothing secret is written to disk.

## Quick start

**1. Connect your accounts in OpenCode** (skip this if you've done it already):

```text
/connect  →  Anthropic  →  Claude Pro/Max        (repeat for every account)
/connect  →  OpenAI     →  Sign in with ChatGPT
```

**2. Run the setup wizard:**

```sh
npx zenox-account-router setup
```

It asks you a few questions and writes nothing until you confirm the summary at the end:

| Step | What you pick |
| --- | --- |
| Providers | Anthropic, OpenAI, or both |
| Accounts | Which of your saved subscriptions the router may use |
| Favorite | The account to start on when a fresh choice is needed (or let it decide) |
| Paid fallback | An optional API key, your explicit OK to be billed, and the exact models it may be used for |
| Polling | How often to check usage (every 10 minutes by default, only while you're working) |
| Install | Adds the plugin to your global `opencode.json`, after your auth plugins, with a backup |

You can cancel at any point and no files change.

**3. Use OpenCode as usual.** Type `/router-status` (or `/router`, or pick *Router: account status* in the command palette) to see where you stand. It opens in your theme's colours; Esc closes it.

```text
Zenox Account Router  ·  live                                  esc

ANTHROPIC   paid fallback off
  ● Claude Personal                      ACTIVE
      5-hour  ███████████████░░░░░   76%  resets in 2h 14m
      Weekly  ████████░░░░░░░░░░░░   41%  resets in 4d 0h
      checked just now
  ○ Claude Team                          standby
      5-hour  ░░░░░░░░░░░░░░░░░░░░    0%  not started
      Weekly  ███████████████████░   93%  resets in 2d 0h
      checked just now
  → If the current account runs out: Claude Team

Usage is checked every 10m while OpenCode is active.
The router switches accounts only when one runs out.
```

Bars turn yellow at 70% and red at 90%. An account that hit its limit shows `limit hit · back in 3h 12m`, and a paid key shows `paid API key · last resort`.

## How it picks an account

These rules come straight from the test suite. Say you picked two Claude accounts, **A** and **B**, and A is the one in use:

| What happens | What the router does |
| --- | --- |
| A hits its weekly or 5-hour limit | Switches to **B** and retries. Your prompt finishes on B. |
| A gets a per-minute rate limit, a model/plan restriction, a login error or a server error | Nothing. OpenCode retries on A as usual. |
| Only a background title request on A hits the limit | Nothing. |
| A runs out, but B needs a re-login, has an expired token, or is already at 100% | Nothing. You see the error instead of a risky switch. |
| A and B are both out, paid fallback is off | Stops with the error. **The key is never used.** |
| A and B are both out, paid fallback is on and the model is allowed | Switches to the **API key**. |
| A resets later while you're on B | Stays on **B**. It doesn't switch back just because A has room again. |
| B runs out after A has reset | Switches back to **A**. |
| You're on the API key and a subscription is usable again | The next prompt moves back to that **subscription**. |
| The API key runs out of credit | Moves to a usable subscription if there is one, otherwise shows the error. |
| You manually pick an account that isn't in your selection | Steps aside completely until you switch back. |
| Two sessions hit the same limit at once | Switches **once**. Both sessions continue on B. |

When it does need a fresh choice, it goes in this order: your favorite, then an account whose 5-hour window is already running (so you don't start a new one), then the account with the most weekly allowance left. Ties go to the order you picked them in setup.

A few things that make this safe:

- **It knows exactly who failed.** Every rejected request is matched to the account that sent it (by token, and by ChatGPT workspace on OpenAI). If it can't be sure, it does nothing.
- **It never replays output.** A response that already started streaming is never sent again to another account.
- **It doesn't loop.** Within one prompt, each account is tried at most once.

## Commands

```sh
npx zenox-account-router setup              # interactive setup
npx zenox-account-router accounts           # accounts saved in OpenCode, by provider (no secrets)
npx zenox-account-router status             # usage from the last check, plus the active account
npx zenox-account-router status --refresh   # check usage live (at most once a minute per account)
npx zenox-account-router dry-run            # which account it would use, why, and what comes next
```

Every command accepts `--json`, `--config <path>` and `--server <url>`. Output is coloured in a terminal; set `NO_COLOR=1` to turn that off. `--json` never contacts OpenCode or the providers unless you also pass `--refresh`, and no command ever switches accounts.

## Configuration

Setup writes a small preferences file. It holds account IDs and choices only, never credentials:

```jsonc
// ~/.config/opencode/account-router.json
{
  "version": 1,
  "pollIntervalMs": 600000,
  "idleTimeoutMs": 600000,
  "providers": {
    "anthropic": {
      "accountIDs": ["cred_personal", "cred_work"],
      "favoriteAccountID": "cred_personal",
      "apiKeyAccountID": "cred_api_key",
      "allowPaidFallback": true,
      "apiKeyModels": ["claude-sonnet-5-5"]
    }
  }
}
```

| Field | Meaning |
| --- | --- |
| `accountIDs` | The subscription accounts the router may use, in order of preference for ties. |
| `favoriteAccountID` | Where to start when a fresh choice is needed. Optional. |
| `apiKeyAccountID` | The saved API key to fall back to. Optional. |
| `allowPaidFallback` | Must be `true` before the key is ever used. Off by default. |
| `apiKeyModels` | The exact model IDs the key may be used for. No wildcards. |
| `pollIntervalMs` | How often usage is checked while you're active (5 to 60 minutes). |
| `idleTimeoutMs` | How long after your last request it keeps checking (1 minute to 24 hours). |

It also adds the plugin to your global OpenCode config:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugins": [
    "@ex-machina/opencode-anthropic-auth@next",
    "zenox-account-router@latest"
  ]
}
```

Keep the router **after** your auth plugins. Any of these forms work: `"zenox-account-router"`, `"zenox-account-router@latest"`, or `{ "package": "zenox-account-router", "options": { "configPath": "…" } }` if you keep the preferences file somewhere else. Unpinned entries update with `opencode plugin update`. After changing preferences, run `/reload` in OpenCode.

## Usage checks

The router reads each selected account's 5-hour and weekly usage straight from Anthropic and OpenAI, using the same endpoints Claude Code and Codex use.

- It checks about once every **10 minutes while you're working**, never per message, and not at all when you're idle.
- It backs off on errors and respects `Retry-After`.
- Usage numbers never trigger a switch on their own. Only a real quota error from a real request does.

## Privacy and safety

- **No secrets on disk.** The preferences and state files only hold account IDs, labels, usage percentages and cooldown times. Both are created with `0600` permissions, and symlinked paths are refused.
- **OpenCode owns your tokens.** Credentials are read through OpenCode's plugin API, only for the accounts you selected. Refresh tokens are dropped right away, and the router never calls a token endpoint itself.
- **Limited network use.** It only talks to fixed provider usage URLs, refuses redirects, and caps response sizes and timeouts.
- **No hidden spending.** Setup, status, usage checks and dry runs never send a model request. Paid fallback needs your explicit OK plus an exact model allowlist.

## Good to know

- **Switching affects the whole provider.** That's how OpenCode works: changing the Anthropic account changes it for every open session, and while the API key is active it can also serve other sessions running at the same time.
- **Routed providers use HTTP instead of WebSockets**, so every failure can be traced to an account. For OpenAI that means no WebSocket connection reuse in routed sessions.
- **The usage endpoints aren't officially documented** and may change. If a response can't be read, usage shows as unknown. It's never treated as zero, and never as permission to spend.
- **Run one OpenCode service at a time.** Separate OpenCode processes don't coordinate their switches.
- **A key you pick yourself is also left for a subscription** while paid fallback is on. If you want to stay on the key, turn paid fallback off; the router then leaves it alone.

## Requirements

- OpenCode **V2, 2.2.5 or newer**
- Node.js **22 or newer** (for the `npx` commands)
- A subscription sign-in for each account, for example [`@ex-machina/opencode-anthropic-auth`](https://www.npmjs.com/package/@ex-machina/opencode-anthropic-auth) for Claude and OpenCode's built-in ChatGPT sign-in for OpenAI

## Development

```sh
pnpm install
pnpm check           # typecheck, lint, tests and build
pnpm test:coverage
```

The test suite has 400+ tests:

- **Unit and integration tests** for the usage readers, error classifiers, selection policy, router, setup and CLI.
- **End-to-end tests on the real OpenCode engine** (embedded `@opencode/sdk`, in-memory database, fake accounts, every network call intercepted). They cover failover, rate limits, paid fallback and returning from it, concurrency, token refresh and stream safety for both providers. These need Node 24+ and are skipped on Node 22.
- **Property-based fuzzing** with fast-check for the parsers, classifiers and random multi-session event sequences.

Design notes and verification details are in [`docs/implementation.md`](./docs/implementation.md).

## License

[MIT](./LICENSE). Made with love by [Ayush](https://github.com/CyberBoyAyush) · [@theayush](https://x.com/theayush) on X.
