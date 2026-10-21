# opencode-hard-limit

Stop [OpenCode](https://opencode.ai) before it burns through your AI quota.

`opencode-hard-limit` is a plugin that watches your Claude/Anthropic and
OpenAI usage and puts a **hard stop** on model calls once you drop below a
percent-remaining threshold you choose. It also adds a live **sidebar bar** so
you can see exactly how much you have left and when the window resets.

It reads your subscription quota **natively** without an external quota
plugin, then adds the enforcement layer: a hard stop plus a live sidebar bar.

## Why you might want this

Quota runs out at the worst possible time. Two common situations this is built for:

- **Shared quota, no surprises.** When a team splits one plan, you rarely want
  any single person to sprint to 100%. Set the goal so everyone stops with a
  buffer left (for example, block once 70% is used so 30% stays for the rest of
  the team).
- **Runaway prompts.** A single bloated prompt or an over-eager agent loop can
  drain a window shockingly fast. A hard stop keeps one bad turn from wiping out
  your whole budget.

**Your goal is a single number: the minimum percent you want to keep in
reserve.** That is the `threshold`. Everything else has a sensible default.

## Quick start

One command. It writes your config, registers the plugin for auto-update, and
wires up the sidebar:

```sh
npx opencode-hard-limit init --global --threshold 30 --install
```

Then **restart OpenCode**. That is it.

This is all you need if you use one Claude account and one OpenAI account. If
you switch between several logins, see [Multi-account](#multi-account).

`install` does three things:

1. **Registers the server plugin:** writes `"opencode-hard-limit"` into
   `~/.config/opencode/opencode.json`. OpenCode reads this on every startup and
   automatically fetches the latest published version via its native package
   manager, so the hard-stop logic is always up to date without any manual
   steps.

2. **Deploys the sidebar widget:** copies `quota-sidebar.tsx` into
   `~/.config/opencode/plugins/` and registers it in `tui.json`. The plugin
   factory also self-heals the sidebar on every opencode startup: it checks
   whether the deployed file matches the currently installed npm version and
   re-copies it if not, so sidebar and server plugin stay in sync automatically.

3. **Registers the CLI:** when the server plugin starts, it installs the
   matching published package globally in the background. This makes
   `opencode-hard-limit` available in OpenCode shell mode for commands such as
   `opencode-hard-limit postpone 30`.

There is **no external quota dependency**. The plugin reads quota itself:
for Claude/Anthropic it uses the selected local account's OAuth credentials
when available and can use the local `claude` CLI for legacy single-account
access. For OpenAI it uses the OAuth session in OpenCode's `auth.json` or a
supported multi-account store. Nothing to install separately.

Prefer to be walked through it? Run `npx opencode-hard-limit init` with no
flags. It asks **where** the threshold should apply (global or project) and
prints the next step. `init` without `--install` only writes config; run
`npx opencode-hard-limit install` afterward to activate the plugin.

`init` and `install` also ask, **once**, whether to star the repo on GitHub:

```text
★ Star the repo on GitHub? (Y/n)
```

It only ever asks on an interactive terminal, and only starts a star after an
explicit yes by calling your own already-authenticated [`gh`](https://cli.github.com/)
(`gh api --method PUT /user/starred/...`). The plugin never handles a GitHub
token of its own. Answering either way is remembered in
`~/.config/opencode/opencode-hard-limit/star-prompted`, so you are not asked
again. To never see it: pass `--no-star`, or set `OPENCODE_QUOTA_NO_STAR=1`
(`CI` is honored too). Without `gh` installed or authenticated it just prints
the URL.

## What's new in 0.18.0

With a single account, nothing changes for you: no new setup, same `threshold`.
The release adds:

- **Multi-account quota.** Named Claude profiles and OpenAI account stores are
  read per account, the gate checks the account that serves each request, and the
  sidebar shows one row per account. See [Multi-account](#multi-account).
- **Gentler 429 handling.** A server-sent `Retry-After` is capped
  (`maxRateLimitBackoffMs`, 10 min; `noBaselineRateLimitBackoffMs`, 1 min when
  there is no earlier reading).
- **A transient error no longer blocks on its own.** On a timeout, 5xx, or
  malformed response the gate keeps using the last good reading. It blocks only
  when that reading is below the threshold, or when it is too old and close to
  the threshold (the stale fail-safe, see `staleBlockMarginPct`).
- **Expired profile tokens pass through.** A named Claude profile whose OAuth
  token has expired is allowed through with a warning, so the call itself can
  renew the token.
- **`warm` and `warm --watch`.** Opt-in commands that keep idle Claude profiles
  logged in. They never run unless you call them. See
  [`warm`](#refreshing-idle-claude-profiles-warm).

## Updating

Updates arrive automatically. Once you have run `install`, OpenCode checks for a
newer published version of `opencode-hard-limit` on every startup and updates
the server plugin in the background. The sidebar self-heals to match on the
same or next restart, with no manual steps needed.

If you are upgrading from a version prior to `0.9.0` (which used file copies
instead of the native plugin registry), run the installer once to migrate:

```sh
npx opencode-hard-limit@latest install
```

That removes the old copied files, registers the package for auto-update, and
redeploys the sidebar. After that you are on the automatic update path.

## Uninstall

One line removes every file and unregisters the sidebar and server plugin:

```sh
npx opencode-hard-limit uninstall
```

Restart OpenCode to finish. Your saved threshold and the shared TUI runtime
dependencies are left in place (other plugins may use them).

## How it works

Before every model request, on OpenCode's `chat.params` hook:

1. Detect the provider. IDs containing `anthropic` or `claude` map to
   Anthropic; IDs containing `openai` or `codex` map to OpenAI. Anything else
   passes through.
2. Resolve one account with the shared account resolver. Each quota result has
   its own `provider:accountKey:window` cache slot.
3. Use fresh cached quota on the hot path. If there is no cached result yet,
   perform one protected fetch so the first request is still guarded.
4. Refresh quota mostly when a session goes idle (`session.status=idle` /
   `session.idle`), with spacing controlled by `minRefreshIntervalMs`.
5. On a 429, honor a server `Retry-After` up to `maxRateLimitBackoffMs`.
   Without a `Retry-After`, use the configured `rateLimitBackoffMs` as-is. If
   there is no last-known-good reading, the server delay is instead capped by
   the smaller of `maxRateLimitBackoffMs` and `noBaselineRateLimitBackoffMs`.
   With a last-known-good value, return that value marked stale during the
   backoff. Without one, a rate-limit error fails open.
6. A transient non-auth failure, such as a timeout, 5xx, or malformed response,
   also serves the last-known-good reading as stale. An auth error is not hidden
   behind a value that cannot be refreshed. When a stale reading is served, the
   transient error does not invoke `blockOnError`; the ordinary threshold still
   blocks if that reading is already below the threshold.
7. Block when known quota is below `threshold`. A stale successful reading can
   trigger the separate stale-failsafe when quota is blind and the remaining
   percentage is within `staleBlockMarginPct` of the threshold. `blockOnError`
   governs timeout and unknown errors when there is no successful value to
   serve. `blockOnAuthError` governs auth and unreadable errors.

`cacheTtlMs` controls how long a quota result is considered fresh for the
refresh path. The stale-failsafe is distinct from `blockOnError` and can block
when a stale quota value is close to the threshold.

## Which window: 5h or weekly

By **default the plugin watches the rolling 5h window**, so a burst of heavy
usage trips the limit quickly and recovers a few hours later. Prefer to pace
yourself across the whole week instead? Switch to the weekly window:

```sh
# Track the weekly window globally
npx opencode-hard-limit set --window Weekly --global

# Back to the default 5h window
npx opencode-hard-limit set --window 5h --global
```

Both the hard-stop and the sidebar follow whichever window you set.

### Per-provider window override

Not every account exposes both windows. Some ChatGPT/Codex accounts only
expose a **Weekly** window (no rolling 5h window at all), while Anthropic
typically exposes both. Rather than force one global `--window` for every
provider, you can override the window for just one provider and let the other
keep inheriting the base `--window`:

```sh
# OpenAI/Codex account only has a Weekly window; keep Claude on the default 5h
npx opencode-hard-limit set --window-openai Weekly --global

# Or pin Claude to Weekly while OpenAI stays on 5h
npx opencode-hard-limit set --window-anthropic Weekly --global
```

`--window-anthropic` / `--window-openai` (env: `OPENCODE_QUOTA_WINDOW_ANTHROPIC`
/ `OPENCODE_QUOTA_WINDOW_OPENAI`) take precedence over the base `--window` for
that provider only, at every config layer (env > project > global > default).
If unset, the provider simply inherits `--window`. `opencode-hard-limit get`
shows `(inherits window)` for any per-provider key that isn't explicitly set.

### Automatic fallback when the requested window doesn't exist

If the requested window (whether from `--window` or an explicit per-provider
override) simply doesn't exist on your account, the plugin automatically
falls back to whichever window the account *does* expose instead of erroring
out, silently. The sidebar shows the effective window that's actually being
used (e.g. `OpenAI Weekly 92% left, limit 25%`), which is the only signal
you'll get; there is no toast. To pin the provider to the window your account
actually exposes:

```sh
opencode-hard-limit set --window-openai Weekly --global
```

Once set explicitly to a window your account has, the request succeeds
directly with no fallback needed.

## Sidebar usage bar

The install step also registers a small SolidJS TUI widget in OpenCode's
sidebar. For each monitored provider it shows:

- A usage bar with the percent remaining for your configured window.
- Your threshold, so you can see how close you are.
- A color that shifts from green to red as you approach the limit.
- A `Resets in Xh Ymin` line so you know when the window rolls over.

It reads the **same** threshold and window as the hard-stop (no extra config),
polls every 120s by default (`OPENCODE_QUOTA_SIDEBAR_POLL_MS` override), and
appears after you restart OpenCode.

With several accounts the sidebar shows one row per account, labeled with the
account name (see [Multi-account](#multi-account)). Rows for accounts that
disappear are removed on the next refresh.

<details>
<summary>Why the widget ships as raw <code>.tsx</code> (not bundled)</summary>

OpenCode transpiles the raw `.tsx` with babel-preset-solid and virtualizes
`@opentui/solid`, `@opentui/core`, and `solid-js` at the package level. That is
the only supported path. Pre-bundling emits `from "@opentui/solid/jsx-runtime"`,
a subpath OpenCode does not virtualize, which would put JSX on a separate
solid-js instance from the virtualized `createSignal` and make the widget render
nothing silently. So the installer copies the source and ensures the three TUI
runtime deps exist in `~/.config/opencode/`.
</details>

## Multi-account

**Only read this if you use more than one Claude or OpenAI account.** With a
single account, the [Quick start](#quick-start) is all you need and nothing on
this page applies to you.

The plugin can read multiple Claude and OpenAI accounts from their local account
stores. It never creates or logs in accounts itself, and it does not depend on
any account-management plugin. It only reads what those tools leave on disk:

- **Claude, one login per profile.** A plugin such as
  [`@openchamber/opencode-claude`](https://www.npmjs.com/package/@openchamber/opencode-claude)
  runs several isolated Claude Code logins, one instance per profile, each with
  its own `CLAUDE_CONFIG_DIR` (for example `~/.claude-profiles/pro` and
  `~/.claude-profiles/max`). Each instance registers a provider ID such as
  `claude-pro` or `claude-max`.
- **Claude, rotating accounts.** A manager plugin that keeps a single
  `anthropic` provider and switches the active account can write a store at
  `~/.config/opencode/anthropic-multi-account-accounts.json`. If that file
  exists, the plugin follows whichever account is marked active
  (`activeAccountUuid`). Set `anthropicAccountsFile` to use another path.
- **OpenAI.** [`oc-codex-multi-auth`](https://www.npmjs.com/package/oc-codex-multi-auth)
  keeps its accounts in `~/.opencode/oc-codex-multi-auth-accounts.json`.

### Set up named Claude profiles

1. Create one profile per login with your account plugin, so that each profile
   ends up with its own `.credentials.json`, for example
   `~/.claude-profiles/pro/.credentials.json`. The directory name after
   `~/.claude-profiles/` is the profile slug.
2. Make sure the provider ID of each profile ends with its slug:
   `claude-pro` is checked against profile `pro`, `claude-max` against `max`.
3. Run `opencode-hard-limit accounts` and confirm every profile is listed with
   its remaining quota.
4. Restart OpenCode. The sidebar now shows one row per account.

Nothing else is required: profile mode switches on by itself as soon as one
named profile is found, or when you set `anthropicProfileDirs`.

### What is read where

- **Claude profiles:** each named profile lives at
  `~/.claude-profiles/<slug>/.credentials.json`. Configure other locations with
  `anthropicProfileDirs`, using the `--anthropic-profile-dirs` CLI option, the
  `OPENCODE_QUOTA_ANTHROPIC_PROFILE_DIRS` environment variable, or an array in
  the config file. Provider IDs such as `claude-pro` and `claude-max` map to
  profiles `pro` and `max`. Profile directories with the same OAuth refresh
  token are deduplicated, so a copied profile does not create a second account.
- **OpenAI accounts:** the plugin reads the account store at
  `~/.opencode/oc-codex-multi-auth-accounts.json` by default. Set
  `openaiAccountsFile` with `--openai-accounts-file`, the
  `OPENCODE_QUOTA_OPENAI_ACCOUNTS_FILE` environment variable, or the config
  file to use another path.

List discovered accounts with `opencode-hard-limit accounts`, or use
`opencode-hard-limit accounts --json` for structured output. The sidebar shows
one row per account and marks the active OpenAI account.

### Account resolution and cache slots

A shared resolver selects credentials for both quota reads and the gate.
Profile mode is active when a named profile is discovered or
`anthropicProfileDirs` is explicitly configured. For Anthropic, a matching
`cp:<slug>` profile takes priority for `claude-<slug>` providers in that mode.
Otherwise the resolver uses the active managed account (`ma:<uuid>`),
compatible OpenCode OAuth credentials (`oc:*`), then the legacy Claude CLI
account (`cli`). If managed-account mode is active but has no usable
credential, the resolver returns an auth error instead of switching to a
different account. OpenAI store accounts use `ox:<id>`; a single OpenCode OAuth
account uses `oc:<accountId>` or `oc:default` when the ID is missing. The
Anthropic OpenCode OAuth key is derived from its token.

Every quota slot is keyed by `provider:accountKey:window`, so each account and
window keeps its own cached value. In profile mode, a `claude-<slug>` provider
with no matching profile returns `errorKind: "unknown"`. The gate follows
`blockOnError` for that error, which blocks by default. The default `~/.claude`
login is not enumerated as a named profile. When no profile, managed account,
or OpenCode OAuth credential applies, the legacy Claude CLI source uses one
`cli` account key.

Cache writes are serialized within one process. Separate OpenCode processes do
not share a write lock, so concurrent writes to the quota cache are
last-writer-wins and can cause one extra quota fetch.

### Expired Claude profile tokens in the gate

In profile mode, when a resolved `cp:<slug>` profile has a readable access
token whose `expiresAt` has passed, the gate logs a warning and allows the
current model call through. That call can refresh the profile's OAuth token,
avoiding a blocked request that would otherwise be responsible for renewing
its own credentials. The warning is rate-limited to once per profile every ten
minutes.

### Troubleshooting multi-account

- **`quota check failed (no Claude profile "foo")`.** You use a `claude-foo`
  provider while profile mode is on, but there is no profile `foo`. Create it
  at `~/.claude-profiles/foo/.credentials.json`, add its directory to
  `anthropicProfileDirs`, or rename the provider so the slug matches. The gate
  follows `blockOnError`, which blocks by default; `--block-on-error false`
  lets the call through instead. Provider IDs are lowercased before matching, so
  use lowercase profile directory names.
- **A profile is missing from `accounts`.** Only profiles with a readable
  `.credentials.json` on disk are listed. On macOS the Claude CLI may keep its
  login in the Keychain instead of a file; such a profile is not discovered. Two
  directories holding the same refresh token count as one profile.
- **A profile shows 401 or `unavailable`.** Its access token expired and nothing
  has used the profile since. Run any call through it, or see
  [`warm`](#refreshing-idle-claude-profiles-warm).
- **Another `claude-*` provider (for example `claude-code`) is blocked.** In
  profile mode every `claude-<slug>` provider must match a profile, so one that
  is not a profile gets the same `no Claude profile` error. Either add a profile
  with that slug or set `--block-on-error false`. Without any named profile,
  `claude-*` IDs use the normal single-account sources and this does not
  happen.
- **Nothing changes with several OpenAI accounts.** Check that
  `oc-codex-multi-auth-accounts.json` exists at the default path or that
  `openaiAccountsFile` points to it, and that the store has an active account.
  Then run `opencode-hard-limit accounts` again.

## Refreshing idle Claude profiles: `warm`

Reading quota does not refresh a Claude OAuth token. A named profile that sits
unused can expire and return 401 from the usage endpoint until an authenticated
Claude CLI call refreshes its credentials.

`warm` runs one scheduling tick over named profiles only. It warms a profile
when its `claudeAiOauth.expiresAt` is at or before the current time and the
profile has a refresh token. Profiles with a valid token are skipped. Use
`--force` to call every refresh-capable profile, even when its token has not
expired. After the local CLI passes its checks, no named profiles produces a
notice and a successful exit. `warm` does not use the default `~/.claude` login
or managed `ma:` / `oc:` accounts.

`warm --watch` keeps checking local credential files. Its default interval is
600,000 ms (10 minutes), and valid `--idle-interval` values range from 60,000
ms (1 minute) through 86,400,000 ms (24 hours). The scheduler can set the next
check for 30 seconds after a token expires when that is sooner than the idle
interval. For an idle profile that refreshes successfully, this means about one
call per token expiration rather than one call per check. Failed refreshes use
per-profile backoff, starting at 5 minutes and doubling up to 6 hours. A lock
allows only one warm process at a time. Ctrl+C aborts the call and stops the
watch loop.

A warm call uses the profile's own OAuth credentials and makes one minimal
Claude CLI request. It disables built-in tools with `--tools ""`, disables MCP
with `--strict-mcp-config`, and prevents session persistence with
`--no-session-persistence`. The call runs with a cleaned auth environment and
a private working directory. `--safe-mode` and a `$0.05` budget ceiling are
added when the installed CLI advertises those options. Success requires a
changed access token or an advanced `expiresAt` in the credential file. A
successful call on an otherwise idle profile can open a new rolling 5-hour
window from the warm time.

The CLI-reported cost is about US$0.015 per call. For Pro/Max subscriptions,
that is an API-equivalent estimate rather than a direct cash charge, but the
call consumes the plan's rate-limit capacity. A different model from `haiku`
may cost more.

```sh
opencode-hard-limit warm
opencode-hard-limit warm --json
opencode-hard-limit warm --force
opencode-hard-limit warm --watch --idle-interval 600000
```

| Flag | Behavior |
| --- | --- |
| `--model <m>` | Defaults to `haiku`. The name must start with a letter or digit and may contain letters, digits, `_`, `.`, `:`, `[`, `]`, or `-`. A non-default model prints a cost warning. |
| `--warm-timeout <ms>` | Per-call timeout from 5,000 through 300,000 ms. Default: 30,000 ms. |
| `--idle-interval <ms>` | `--watch` check interval from 60,000 through 86,400,000 ms. Default: 600,000 ms. |
| `--force` | Warm refresh-capable profiles even when their token is valid. Avoid combining it with `--watch`, since that can make a call at every check. |
| `--json` | Print an array of results without credential tokens. |

Use `warm` for named profiles that are used infrequently but should remain
readable in `accounts`, the sidebar, and the gate. It is unnecessary for a
profile used regularly, because real Claude calls refresh its token. It does
not apply to the default single-account login, API-key-only accounts, or
Windows. Keep `--force` for intentional one-shot runs, not cron schedules.

The `claude` CLI must be available on `PATH` or in `~/.local/bin`, logged in
with OAuth, and support the required isolated-call flags. Profiles whose
`settings.json` redirects authentication through helpers or environment values
are skipped. On macOS, a token may be written to Keychain instead of the
credential file. That storage path has not been tested, and this implementation
cannot confirm a refresh unless the file's token or expiry changes.

## Configuration

### Global vs project

The threshold can live at two scopes, and it is **your choice**:

| Scope | Applies to | File |
| --- | --- | --- |
| **Global** | every OpenCode project on this machine | `~/.config/opencode/opencode-hard-limit/config.json` |
| **Project** | only the current directory | `./.opencode-hard-limit.json` |

Most people want **global** (one budget for the whole machine). Use **project**
when a specific repo needs its own budget. The CLI keeps the choice explicit:
pass `--global` or `--project`, or omit both to be asked interactively.

```sh
# Global (all projects), the common case
npx opencode-hard-limit set --threshold 30 --global

# Project (current directory only)
npx opencode-hard-limit set --threshold 55 --project

# Show the effective value and where each setting came from
npx opencode-hard-limit get
```

### Precedence

When a setting exists in more than one place, the highest wins:

```
env var  >  project file  >  global file  >  built-in default
```

`get` prints the resolved value **and** its source for every setting, so there
is no guessing.

### Settings

| CLI flag | Env var | File key | Default | Meaning |
| --- | --- | --- | --- | --- |
| `--threshold` | `OPENCODE_QUOTA_MIN_REMAINING` | `minRemaining` | `30` | Minimum `%` remaining to allow a call. `30` blocks once 70% is used. |
| `--window` | `OPENCODE_QUOTA_WINDOW` | `window` | `5h` | Quota window to track: `5h` or `Weekly`. |
| `--window-anthropic` | `OPENCODE_QUOTA_WINDOW_ANTHROPIC` | `windowAnthropic` | *(inherits `window`)* | Override the quota window for Claude/Anthropic only. |
| `--window-openai` | `OPENCODE_QUOTA_WINDOW_OPENAI` | `windowOpenai` | *(inherits `window`)* | Override the quota window for OpenAI/Codex only. |
| `--block-on-error` | `OPENCODE_QUOTA_BLOCK_ON_ERROR` | `blockOnError` | `true` | Block when quota check fails (timeout, unknown error). `false` fails open. |
| `--block-on-auth-error` | `OPENCODE_QUOTA_BLOCK_ON_AUTH_ERROR` | `blockOnAuthError` | `false` | When quota cannot be read due to an auth/token error, `false` allows the call silently (no toast). `true` blocks like a hard stop. |
| `--allow-postpone` | `OPENCODE_QUOTA_ALLOW_POSTPONE` | `allowPostpone` | `false` | Opt-in: enables the `opencode-hard-limit postpone` command to temporarily bypass an active block. See "Fail-postpone mode" below. |
| `--cache-ttl` | `OPENCODE_QUOTA_CACHE_TTL_MS` | `cacheTtlMs` | `60000` | In-memory cache TTL per provider (ms). |
| `--timeout` | `OPENCODE_QUOTA_TIMEOUT_MS` | `timeoutMs` | `20000` | Max wait for a quota check (ms). |
| `--min-refresh` | `OPENCODE_QUOTA_MIN_REFRESH_MS` | `minRefreshIntervalMs` | `120000` | Minimum spacing between real quota fetches per provider/window (ms). |
| `--rate-limit-backoff` | `OPENCODE_QUOTA_RATE_LIMIT_BACKOFF_MS` | `rateLimitBackoffMs` | `300000` | Extra cooldown after a 429 / rate-limit response that sends no `Retry-After` (ms). |
| `--max-rate-limit-backoff` | `OPENCODE_QUOTA_MAX_RATE_LIMIT_BACKOFF_MS` | `maxRateLimitBackoffMs` | `600000` | Upper bound on a 429's server-sent `Retry-After` (ms). Does not cap `--rate-limit-backoff`. |
| `--no-baseline-rate-limit-backoff` | `OPENCODE_QUOTA_NO_BASELINE_RATE_LIMIT_BACKOFF_MS` | `noBaselineRateLimitBackoffMs` | `60000` | Tighter cap on a server-sent `Retry-After` when no last-known-good reading is available. It does not cap the local `--rate-limit-backoff` value. |
| `--anthropic-profile-dirs` | `OPENCODE_QUOTA_ANTHROPIC_PROFILE_DIRS` | `anthropicProfileDirs` | *(auto: `~/.claude-profiles/*`; no default `~/.claude` discovery)* | Extra Claude Code profile dirs to scan for multi-account quota. Comma-separated in the env var / CLI flag; a real array in the config file. |
| `--openai-accounts-file` | `OPENCODE_QUOTA_OPENAI_ACCOUNTS_FILE` | `openaiAccountsFile` | *(auto: `~/.opencode/oc-codex-multi-auth-accounts.json`)* | Path to a multi-account OpenAI/Codex store. |
| `--stale-margin` | `OPENCODE_QUOTA_STALE_BLOCK_MARGIN` | `staleBlockMarginPct` | `10` | Extra block margin (in percentage points, 0 to 100) applied while quota is blind or stale. A stale reading within this margin of your threshold blocks as a precaution. `0` disables the stale fail-safe. |
| *(no flag)* | `OPENCODE_QUOTA_ANTHROPIC_ACCOUNTS_FILE` | `anthropicAccountsFile` | *(auto: `<opencode config dir>/anthropic-multi-account-accounts.json`)* | Store of a rotating-account Anthropic manager plugin. The plugin's `activeAccountUuid` decides which account is read. Only matters if you use such a plugin. |
| *(no flag)* | `OPENCODE_QUOTA_ANTHROPIC_CRED_SOURCE` | `anthropicCredentialSource` | `auto` | Where to read the Claude credential when no named profile applies. `auto` tries the managed-account store, then OpenCode's own Anthropic login, then the `claude` CLI. `opencode-auth` skips the managed-account store and uses OpenCode's Anthropic login. `claude-cli` only uses the local `claude` CLI or keychain. Named profiles ignore this setting. |

Sidebar polling:

| Env var | Default | Meaning |
| --- | --- | --- |
| `OPENCODE_QUOTA_SIDEBAR_POLL_MS` | `120000` | Sidebar refresh interval (ms). |

Environment variables are handy for one-off overrides:

```sh
OPENCODE_QUOTA_MIN_REMAINING=90 opencode   # temporarily stricter
```

## Fail-postpone mode

The gate handles quota errors by class. **`blockOnError`** defaults to `true`
for timeout and unknown errors. **`blockOnAuthError`** defaults to `false` for
auth and unreadable errors, so those calls fail open unless you enable it.
There is also an opt-in mode called **fail-postpone**, a manual, time-boxed
bypass of a quota block for when you accept the risk of running over quota for
a little while.

It's disabled by default. Enable it with:

```bash
opencode-hard-limit set --allow-postpone true --global
```

Once enabled, a block's error message includes a hint like:

```
[quota-hard-stop] Blocked claude-max (anthropic:cp:max (Claude Max)): quota 12%
remaining is below the 30% threshold. ... To postpone this block: in OpenCode,
type ! by itself first to enter shell mode. Pasting a whole
"!opencode-hard-limit ..." line at once will not trigger it, so type the !
yourself, then paste the rest. Run: opencode-hard-limit postpone <minutes>
(default 30, e.g. "opencode-hard-limit postpone 60"). This has no LLM cost.
```

The part in parentheses names the account that was read. With a single account
it is short, for example `Blocked anthropic (anthropic)`.

**Important: type the `!`, don't paste it.** OpenCode only enters shell mode
when `!` is the first character *typed* into an empty prompt. If you copy the
whole `!opencode-hard-limit postpone 60` line (with the `!`) and paste it in
one go, OpenCode will **not** switch to shell mode. The paste lands as a
normal chat message instead. To run the command correctly:

1. Type `!` yourself (one keystroke, empty prompt) to enter shell mode.
2. Paste (or type) just `opencode-hard-limit postpone 60`, without the
   leading `!`.
3. Press Enter.

This postpones **any** quota block (any provider, any window) for 60 minutes.
Cancel it early the same way: type `!`, then paste:

```
opencode-hard-limit postpone --clear
```

`opencode-hard-limit get` shows whether a postpone is currently active and how
much time is left. Postpone duration is clamped to 1–240 minutes. If
`--allow-postpone` is later disabled, any leftover postpone timer is ignored.
Blocks resume immediately.

The sidebar widget also shows a red two-line hint ("To postpone the blockage
for 30 min: type ! then paste: opencode-hard-limit postpone 30") whenever a
monitored provider is currently blocked and fail-postpone is enabled but not
active. It disappears automatically once you postpone or once quota refreshes
above the threshold.

**Known limitation: subagents.** If a subagent (e.g. one dispatched via
OpenCode's `task` tool) is the one whose call gets blocked, its parent
orchestrator currently sees an **empty** result instead of this message.
OpenCode's `task` tool only returns the subagent's generated text; since this
plugin blocks *before* any text is generated, there's nothing for the task
tool to relay. This is a gap in OpenCode itself (tracked upstream), not
something this plugin can work around. If a subagent's task mysteriously
returns empty, check `opencode-hard-limit get` or the sidebar for an active
block.

## Requirements

- OpenCode with plugin support.
- **Claude/Anthropic quota:** a Claude Pro/Max OAuth login available through a
  supported local account source. Pure API-key/PAYG usage has no subscription
  window and reads as `unavailable` by design. `warm` additionally requires
  the local `claude` CLI.
- **OpenAI quota:** a ChatGPT session token in OpenCode's `auth.json` or a
  supported multi-account store. An API-plan OAuth token reads as `unavailable`
  by design.
- Network access when a live quota check runs (the usage endpoints).
- **Multi-account (optional):** see [Multi-account](#multi-account) above.
  Nothing extra to install; the plugin detects supported local account stores.

## Verify it works

Force a block by setting the threshold above your current remaining:

```sh
OPENCODE_QUOTA_MIN_REMAINING=90 opencode
```

With, say, 81% remaining, the next Claude/OpenAI call is blocked. Set it back to
`30` (or unset) for normal operation.

## Upgrade

Once installed via `npx opencode-hard-limit install`, updates arrive
automatically on every OpenCode startup, with no manual steps needed. See the
[Updating](#updating) section above for details and migration from older
versions.

## License

MIT
