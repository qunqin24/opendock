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

This plugin fixes that. When the active account is genuinely out of quota, it moves you to the next one and retries the request. Between conversations it also picks the account whose allowance is about to reset, so less of what you pay for goes unused. You don't have to touch anything.

```text
Claude account A  ──(limit reached)──▶  Claude account B  ──(also out)──▶  API key (only if you allowed it)
```

It works for **Anthropic** (Claude Pro, Max, Team) and **OpenAI** (ChatGPT Plus, Pro, Team through Codex). It's part of the [Zenox](https://www.npmjs.com/package/zenox) family of OpenCode plugins.

## What it does

- **Uses the allowance that expires first.** Once the prompt cache has expired anyway (no request for 5 minutes on Claude, 30 minutes on ChatGPT, or whatever `cache.ttl` you set in OpenCode), the next prompt moves to the account whose 5-hour window resets soonest. Allowance that resets unused is wasted, so it drains that one first.
- **Never breaks a warm cache.** While any conversation's cache is still warm, it stays put. A new thread started next to a busy one waits too.
- **Explains itself.** Every decision, which account each session used, every usage check and every rejected request goes to a local log file you can read with `npx zenox-account-router logs`.
- **Mid-conversation, only switches when an account is really out.** Short rate limits, model or plan restrictions, login errors, server errors and failed background title requests are left to OpenCode's normal retries.
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
Smart routing: after 5m without requests (cache gone), a prompt
moves to the account whose allowance expires first. Mid-conversation it
switches only when an account runs out.
```

When the next quiet prompt would move somewhere else, the status also shows `→ Next quiet prompt moves to: …`.

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
| You start a new thread after a break, and B's 5-hour window resets 30+ minutes sooner than A's | Moves to **B** before the first request, so B's allowance is used before it resets. |
| You start a new thread while another conversation's cache on A is still warm | Stays on **A**, so that conversation keeps its prompt cache. It checks again at the next quiet prompt. |
| B's window resets only a few minutes sooner than A's | Stays on **A**. A switch needs a clear win (30 minutes on the 5-hour window, or 12 hours on the weekly window when 5-hour windows don't decide). |
| A's 5-hour window is running and B's hasn't started | Stays on **A**, so it doesn't start a second window. |
| A is at 100% or has under 5% left | Moves to **B** at the next prompt, even if a conversation was just running (A can't serve it anyway). |
| A resets later while you're on B | Stays on **B** mid-conversation. At the next quiet prompt it moves to whichever allowance expires first. |
| B runs out after A has reset | Switches back to **A**. |
| You're on the API key and a subscription is usable again | The next prompt moves back to that **subscription**. |
| The API key runs out of credit | Moves to a usable subscription if there is one, otherwise shows the error. |
| You manually pick an account that isn't in your selection | Steps aside completely until you switch back. |
| Two sessions hit the same limit at once | Switches **once**. Both sessions continue on B. |

When it picks an account, it goes in this order: an account with fresh usage numbers and at least 5% left, then the running 5-hour window that resets soonest, then the running weekly window that resets soonest, then the most room left. Your favorite breaks exact ties, then the order you picked them in setup. It never switches on missing or stale usage numbers, and the same numbers can never make it switch back (no flip-flopping).

Prefer the old behaviour? Set `"strategy": "sticky"` and it only ever switches when an account runs out (your favorite then decides fresh choices).

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
npx zenox-account-router logs               # the newest decision-log lines (add -n 200 for more)
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
  "strategy": "smart",
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
| `favoriteAccountID` | Breaks ties (smart), or where to start when a fresh choice is needed (sticky). Optional. |
| `apiKeyAccountID` | The saved API key to fall back to. Optional. |
| `allowPaidFallback` | Must be `true` before the key is ever used. Off by default. |
| `apiKeyModels` | The exact model IDs the key may be used for. No wildcards. |
| `pollIntervalMs` | How often usage is checked while you're active (5 to 60 minutes). |
| `idleTimeoutMs` | How long after your last request it keeps checking (1 minute to 24 hours). |
| `strategy` | `"smart"` (default): also moves to the allowance that expires first at quiet moments. `"sticky"`: only switches when an account runs out. |
| `cacheWindowMs` | Optional override for how long a conversation counts as warm after its last request (1 minute to 24 hours). Leave it out: the router uses the `cache.ttl` OpenCode is configured with, otherwise the provider default (Claude 5 minutes, ChatGPT 30 minutes). |

### Prompt cache lifetime

The router never sets or sends a cache lifetime. OpenCode decides what goes into each request, and by default it sends none, so each provider uses its own default (Claude 5 minutes, ChatGPT 30 minutes on GPT-5.6 and newer). The router only reads OpenCode's `cache.ttl` setting, if you or another config set one, so it waits that long before a smart switch. The `CACHE` line in the log shows which window is in use and where it came from.

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
- Mid-conversation, usage numbers never trigger a switch on their own. Only a real quota error from a real request does. Usage numbers only steer the choice at a quiet prompt.
- At the first prompt after a quiet period it brings usage up to date (waiting at most 4 seconds). If an idle account's token expired, OpenCode refreshes it at most once per polling interval.

## Logs

Everything the router does is written to `~/.config/opencode/account-router.log` (owner-only, no tokens or keys, rotated to `account-router.log.1` at 1 MB). Read it with:

```sh
npx zenox-account-router logs            # newest 40 lines, warnings in yellow, errors in red
npx zenox-account-router logs -n 200     # more lines
tail -f ~/.config/opencode/account-router.log
```

Each line is `local time | level | provider | event | accounts | what happened and why`:

```text
2026-11-03 22:41:05.120 +05:30 | INFO  | router | LOADED | - | Router 0.3.0 started (strategy smart, usage checks every 10m). anthropic: Claude OAuth • Vranda, Claude Team; paid fallback off. Config /Users/you/.config/opencode/account-router.json.
2026-11-03 22:41:05.180 +05:30 | INFO  | anthropic | CACHE | - | Prompt cache counts as warm for 5m after a conversation request (Anthropic default; OpenCode sends no cache.ttl). Smart switches wait that long.
2026-11-03 22:41:05.902 +05:30 | INFO  | anthropic | USAGE | Claude Team | 5-hour 2% (resets in 1h 42m) · Weekly 22% (resets in 3d 23h)
2026-11-03 22:41:06.010 +05:30 | INFO  | anthropic | SWITCH | Claude OAuth • Vranda → Claude Team | Claude Team's 5-hour window resets in 1h 42m, Claude OAuth • Vranda's in 3h 42m; use the allowance that expires first.
2026-11-03 22:41:07.344 +05:30 | INFO  | anthropic | USE | Claude Team | Session ses_8f2c… (claude-opus-5-5).
2026-11-03 22:43:40.118 +05:30 | INFO  | anthropic | WAIT | Claude Team | New session, but a conversation used this account 2m ago; switching now would drop its prompt cache.
2026-11-04 00:15:02.701 +05:30 | WARN  | anthropic | QUOTA | Claude Team | Claude Team was rejected because its allowance is used up (HTTP 429, resets in 1h 20m). Looking for another account.
2026-11-04 00:15:02.771 +05:30 | INFO  | anthropic | FAILOVER | Claude Team → Claude OAuth • Vranda | Claude Team hit its limit (back in 1h 20m).
```

| Event | Meaning |
| --- | --- |
| `LOADED` / `UNLOADED` | The router started or stopped in an OpenCode process, with its version and settings. |
| `LOAD-FAILED` | An OpenCode that is too old tried to load it (for example an app bundling its own older OpenCode). That OpenCode's requests are not routed. |
| `CACHE` | The prompt-cache window in use for that provider, and where it came from. |
| `USAGE` | Result of every usage check per account; failed checks are warnings with the retry time. |
| `USE` | Which account a session's conversation requests went to (first request, and whenever it changes). A warning means a request could not be matched to a selected account. |
| `START` / `PAUSE` | The account the router started on, or why it is standing aside. |
| `SWITCH` / `KEEP` / `WAIT` | Smart routing at a prompt: moved, checked and stayed, or waited because another conversation's cache is warm. |
| `QUOTA` / `IGNORED` | How a failed request was classified: real allowance exhaustion, or a rate limit, plan restriction, sign-in or server error that is left to OpenCode. |
| `FAILOVER` / `NO-SWITCH` | Moved to another account after a quota rejection, or could not, with the reason for every other account. |
| `RECLAIM` | Left the paid key for a usable subscription. |
| `ERROR` | A router hook failed and was skipped; your request was not affected. |

## Privacy and safety

- **No secrets on disk.** The preferences, state and log files only hold account IDs, account names (which may include an email address), session IDs, model names, usage percentages, timestamps and cooldown times. Request and response bodies, prompts and tokens are never logged; error messages are only kept when they are short plain text, and anything token-shaped is redacted as a last line of defence. The log is forced to `0600`, a log owned by another user is refused, and rotation uses a lock so several OpenCode processes don't clash. Both are created with `0600` permissions, and symlinked paths are refused.
- **OpenCode owns your tokens.** Credentials are read through OpenCode's plugin API, only for the accounts you selected. Refresh tokens are dropped right away, and the router never calls a token endpoint itself.
- **Limited network use.** It only talks to fixed provider usage URLs, refuses redirects, and caps response sizes and timeouts.
- **No hidden spending.** Setup, status, usage checks and dry runs never send a model request. Paid fallback needs your explicit OK plus an exact model allowlist.

## Good to know

- **Switching affects the whole provider.** That's how OpenCode works: changing the Anthropic account changes it for every open session, and while the API key is active it can also serve other sessions running at the same time.
- **Routed providers use HTTP instead of WebSockets**, so every failure can be traced to an account. For OpenAI that means no WebSocket connection reuse in routed sessions.
- **The usage endpoints aren't officially documented** and may change. If a response can't be read, usage shows as unknown. It's never treated as zero, and never as permission to spend.
- **Run one OpenCode service at a time if you can.** Separate OpenCode processes that load the router share the last-activity time through the state file (so one won't break another's warm cache at a quiet prompt), but they don't coordinate failovers. An app that runs its own older OpenCode without the router is invisible to it; use `"strategy": "sticky"` if that matters to you.
- **Smart switches happen at prompts.** Plugins load when OpenCode starts, so after updating the router, restart OpenCode (or `/reload`) for it to take effect.
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
