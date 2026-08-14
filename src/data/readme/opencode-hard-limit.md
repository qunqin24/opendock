# opencode-hard-limit

Stop [OpenCode](https://opencode.ai) before it burns through your AI quota.

`opencode-hard-limit` is a plugin that watches your Claude/Anthropic and
OpenAI usage and puts a **hard stop** on model calls once you drop below a
percent-remaining threshold you choose. It also adds a live **sidebar bar** so
you can see exactly how much you have left and when the window resets.

It reads your subscription quota **natively** — no external quota plugin
required — and adds the enforcement layer on top: a hard stop plus a live
sidebar bar.

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

`install` does two things:

1. **Registers the server plugin** — writes `"opencode-hard-limit"` into
   `~/.config/opencode/opencode.json`. OpenCode reads this on every startup and
   automatically fetches the latest published version via its native package
   manager, so the hard-stop logic is always up to date without any manual
   steps.

2. **Deploys the sidebar widget** — copies `quota-sidebar.tsx` into
   `~/.config/opencode/plugins/` and registers it in `tui.json`. The plugin
   factory also self-heals the sidebar on every opencode startup: it checks
   whether the deployed file matches the currently installed npm version and
   re-copies it if not, so sidebar and server plugin stay in sync automatically.

3. **Registers the CLI** — when the server plugin starts, it installs the
   matching published package globally in the background. This makes
   `opencode-hard-limit` available in OpenCode shell mode for commands such as
   `opencode-hard-limit postpone 30`.

There is **no external quota dependency**. The plugin reads quota itself:
for Claude/Anthropic it uses your local `claude` CLI (or the OAuth usage API as
a fallback), and for OpenAI it uses the OAuth session in OpenCode's
`auth.json`. Nothing to install separately.

Prefer to be walked through it? Run `npx opencode-hard-limit init` with no
flags. It asks **where** the threshold should apply (global or project) and
prints the next step. `init` without `--install` only writes config; run
`npx opencode-hard-limit install` afterward to activate the plugin.

## Updating

Updates arrive automatically. Once you have run `install`, OpenCode checks for a
newer published version of `opencode-hard-limit` on every startup and updates
the server plugin in the background. The sidebar self-heals to match on the
same or next restart — no manual steps needed.

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

1. Detect the provider. Only `anthropic` (Claude) and `openai` (OpenAI) are
   monitored; anything else passes straight through.
2. Use the last cached quota immediately; `chat.params` no longer fetches on the
   hot path.
3. If there is no cache yet, do one protected fetch so the first request is
   still guarded.
4. Refresh quota mostly when the agent goes idle (`session.status=idle` /
   `session.idle`), spaced by `minRefreshIntervalMs` (default 120s).
5. If a refresh gets a 429 / rate-limit response, back off for
   `rateLimitBackoffMs` (default 300s) and keep serving the last known good
   cache.
6. If `percentRemaining < threshold`, throw and block the call.
7. If quota **cannot be verified** (timeout, error, bad JSON, missing window),
   block by default. This is a fail-safe you can flip off with
   `--block-on-error false`.

`cacheTtlMs` still controls how long a read is considered fresh for the refresh
path.

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
used (e.g. `OpenAI Weekly 92% left, limit 25%`) — that's the only signal
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
| `--rate-limit-backoff` | `OPENCODE_QUOTA_RATE_LIMIT_BACKOFF_MS` | `rateLimitBackoffMs` | `300000` | Extra cooldown after a 429 / rate-limit response (ms). |

Sidebar polling:

| Env var | Default | Meaning |
| --- | --- | --- |
| `OPENCODE_QUOTA_SIDEBAR_POLL_MS` | `120000` | Sidebar refresh interval (ms). |

Environment variables are handy for one-off overrides:

```sh
OPENCODE_QUOTA_MIN_REMAINING=90 opencode   # temporarily stricter
```

## Fail-postpone mode

By default this plugin has two failure modes: **fail-closed** (`blockOnError: true` /
`blockOnAuthError: true` — block when quota can't be checked) and **fail-open**
(`blockOnError: false` / `blockOnAuthError: false` — allow when quota can't be
checked). There's a third, opt-in mode: **fail-postpone** — a manual, time-boxed
bypass of an otherwise-legitimate block, for when you've decided to accept the
risk of running over quota for a little while.

It's disabled by default. Enable it with:

```bash
opencode-hard-limit set --allow-postpone true --global
```

Once enabled, a block's error message includes a hint like:

```
[quota-hard-stop] Blocked anthropic (anthropic): quota 12% remaining is below
the 30% threshold. ... To postpone this block: in OpenCode, type ! by itself
first to enter shell mode (pasting a whole "!opencode-hard-limit ..." line at
once won't trigger it — type the ! yourself, then paste the rest), then run:
opencode-hard-limit postpone <minutes> (default 30, e.g. "opencode-hard-limit
postpone 60") — no LLM cost.
```

**Important — type the `!`, don't paste it:** OpenCode only enters shell mode
when `!` is the first character *typed* into an empty prompt. If you copy the
whole `!opencode-hard-limit postpone 60` line (with the `!`) and paste it in
one go, OpenCode will **not** switch to shell mode — the paste lands as a
normal chat message instead. To run the command correctly:

1. Type `!` yourself (one keystroke, empty prompt) to enter shell mode.
2. Paste (or type) just `opencode-hard-limit postpone 60` — **without** the
   leading `!`.
3. Press Enter.

This postpones **any** quota block (any provider, any window) for 60 minutes.
Cancel it early the same way — type `!`, then paste:

```
opencode-hard-limit postpone --clear
```

`opencode-hard-limit get` shows whether a postpone is currently active and how
much time is left. Postpone duration is clamped to 1–240 minutes. If
`--allow-postpone` is later disabled, any leftover postpone timer is ignored —
blocks resume immediately.

The sidebar widget also shows a red two-line hint ("To postpone the blockage
for 30 min: type ! then paste: opencode-hard-limit postpone 30") whenever a
monitored provider is currently blocked and fail-postpone is enabled but not
active. It disappears automatically once you postpone or once quota refreshes
above the threshold.

**Known limitation — subagents:** if a subagent (e.g. one dispatched via
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
- **Claude/Anthropic quota:** a local `claude` CLI logged in with a Claude
  Pro/Max subscription (or `~/.claude/.credentials.json`). Pure API-key/PAYG
  usage has no subscription window and reads as `unavailable` by design.
- **OpenAI quota:** a ChatGPT session token in OpenCode's `auth.json`.
  An API-plan OAuth token reads as `unavailable` by design.
- Network access when a live quota check runs (the usage endpoints).

## Verify it works

Force a block by setting the threshold above your current remaining:

```sh
OPENCODE_QUOTA_MIN_REMAINING=90 opencode
```

With, say, 81% remaining, the next Claude/OpenAI call is blocked. Set it back to
`30` (or unset) for normal operation.

## Upgrade

Once installed via `npx opencode-hard-limit install`, updates arrive
automatically on every OpenCode startup — no manual steps needed. See the
[Updating](#updating) section above for details and migration from older
versions.

## License

MIT
