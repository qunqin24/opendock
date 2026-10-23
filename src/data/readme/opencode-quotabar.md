# opencode-quotabar

Subscription quota windows for **Codex** (OpenAI OAuth) and **Claude** (via the OpenChamber
`claude-code` provider) in the OpenCode V2 sidebar, with an on-demand details view.

> If a quota cannot be shown, the plugin says **why** and **what to do**. A detected provider never
> silently disappears.

- Shows what the **provider reports**: remaining percent, reset time, scope, and how fresh the reading is.
- Never estimates a subscription quota from session tokens or money.
- Never sends a model prompt to poll. Claude usage comes from a prompt-free control request to the
  Claude CLI; credentials are never extracted or copied.
- Credentials stay on the OpenCode server. The terminal half only receives sanitized snapshots.

## Requirements and tested versions

| Component | Tested with |
|---|---|
| OpenCode | 2.1.3 (`@opencode/plugin` / `@opencode/client` 2.1.3) |
| OpenChamber (`@openchamber/opencode-claude`) | 1.5.0 |
| Claude CLI | 2.1.306 (Agent SDK 0.3.306) |
| Bun (development and tests) | 1.4.2 |
| OpenTUI / Solid | `@opentui/*` 0.6.6, `solid-js` 1.9.x |

**Live verification (2026-10-22).** Loaded into a private OpenCode 2.1.3 server from a throwaway
project, with real accounts: Codex (OAuth) and Claude (Pro, CLI 2.1.306) both reported complete, fresh
windows; a manual refresh re-read only the requested provider; invalid RPC input was rejected; and
shutting the server down left no Claude child process or temp directory behind. Not verified live:
a **remote** OpenCode server (covered offline by the fake-CLI harness, including the missing-CLI
case) and the interactive TUI rendering (covered by headless renderer tests).

Other versions are not promised to work. The Claude control protocol in particular is experimental
(see below). When something is unsupported, the row reports it instead of failing quietly.

## What you need connected

| Row | Needs |
|---|---|
| **Codex** | An **OAuth** (subscription) OpenAI connection in OpenCode. An API key is explained, never used. |
| **Claude** | The OpenChamber `claude-code` provider connected **and** the Claude CLI signed in with a claude.ai subscription **on the machine running the OpenCode server**. |

For Claude, the connection stored in OpenCode is only an enrollment marker. It is not a token and is
never sent anywhere. Authentication and renewal belong to the Claude CLI.

## Install

The plugin has two halves that ship in one package:

| Half | Entry | Runs on | Does |
|---|---|---|---|
| Server | `.` (`src/index.ts`) | the OpenCode server | Reads connections, queries providers, caches, schedules, serves RPC. |
| Terminal | `./tui` (`src/tui/index.tsx`) | your terminal | Sidebar, footer, details dialog, presentation preferences. |

Nothing edits your configuration automatically. Add the entries yourself.

### From a package

Add it to the `plugins` array of **both** files, merging with what is already there:

- `~/.config/opencode/opencode.jsonc` (server half)
- `~/.config/opencode/cli.json` (terminal half; needed for remote servers)

```jsonc
{ "plugins": ["opencode-quotabar"] }
```

### From a local checkout

```sh
bun install
```

```jsonc
{ "plugins": ["file:///absolute/path/to/opencode-sidebar-quota-usage"] }
```

The repository root re-exports both halves (`index.ts`, `tui.tsx`), so the directory loads directly.

Run `opencode reload`, restart the TUI, then open the details view with **`/quota`** (or the command
palette: *Open subscription quota*).

### Remove any other quota plugin

Two quota plugins show two panels and may both claim `/quota`. Remove the previous one (for example
`opencode-quota-board`) from both files. If `/quota` is already taken when this plugin loads, it
registers **`/subscription-quota`** instead. The command palette entry always works.

### Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-quotabar",
      "options": {
        "refreshTtlSeconds": 120,
        "httpTimeoutMs": 10000,
        "claudeTimeoutMs": 30000,
        "claudeExecutable": "claude",
        "maxOutputBytes": 1048576
      }
    }
  ]
}
```

| Option | Default | Allowed | Meaning |
|---|---|---|---|
| `refreshTtlSeconds` | 120 | 30–3600 | A successful reading is reused for this long. |
| `httpTimeoutMs` | 10000 | 1000–60000 | Codex usage request timeout. |
| `claudeTimeoutMs` | 30000 | 5000–60000 | Whole Claude CLI process lifetime. |
| `claudeExecutable` | `claude` | non-empty path or name | Resolved **in the server's environment**. |
| `maxOutputBytes` | 1048576 | 16384–8388608 | Cap on any HTTP body or CLI output. |

Out-of-range numbers are clamped; invalid values fall back to the default.

### Roll back

Remove the plugin entries from `opencode.jsonc` and `cli.json`, then `opencode reload` and restart
the TUI. There are no credential or data migrations: quota readings live in memory only, and the only
thing persisted is presentation preferences (hidden/collapsed rows).

## Using it

- **Sidebar**: each detected provider gets a row, with the provider you currently use first. Click a
  row to collapse it to a one-line summary; click the header to collapse the whole section.
- **Footer**: the current provider's headline meter.
- **Details** (`/quota`): every window, reset, source, age, collection state, completeness, freshness,
  and the full diagnostic (code, explanation, next action, next retry).

| Key | Action |
|---|---|
| `↑` / `↓` (`k` / `j`) | Select provider |
| `Enter` | Refresh the selected provider |
| `r` | Refresh all |
| `h` | Hide or show the selected provider in the sidebar |
| `Esc` | Close |

Everything is also reachable with the mouse. Statuses are words as well as colors.

### Reading the display

- Percentages are **remaining**.
- *Collection state*, *completeness* and *freshness* are separate: a failed refresh can sit beside
  older readings marked **stale**, and the age is the age of the last **successful** reading.
- A window whose reset time has passed shows **reset pending refresh**. It is never shown as refilled
  until a fresh reading confirms it.
- An unknown percentage has no bar and is never shown as 0% or 100%. A real 0% is shown as `0% left`.
- Hiding a provider only removes it from the sidebar; it stays listed in the details view, marked as
  hidden, with a way to show it again.

### Diagnostics

| Code | Meaning | What to do |
|---|---|---|
| `not_connected` | No active connection | Connect it in OpenCode |
| `wrong_auth` | OpenAI is connected with an API key | Sign in with the subscription (OAuth) |
| `unauthorized` | Provider rejected the sign-in (401) | Reconnect the account |
| `forbidden` | Provider denied usage access (403) | Check the subscription |
| `rate_limited` | Throttled (429) | Wait; the retry time is shown |
| `timeout` / `network` / `upstream_error` | Transport or provider failure | Retry later |
| `invalid_response` | Unexpected response format | The provider may have changed it; update the plugin |
| `cli_missing` | Claude CLI not found on the server | Install it there or set `claudeExecutable` |
| `cli_signed_out` | CLI not signed in with a claude.ai subscription | Run `claude` on the server and sign in |
| `unsupported_protocol` | CLI rejected the usage control request | Update Claude Code on the server |
| `cli_error` | CLI failed before returning usage | Run `claude` on the server and check it works |
| `account_mismatch` | CLI account changed during the request | Refresh |
| `identity_unverified` | CLI reported no account identity | Readings shown, not retained across failures |
| `partial_data` | Some windows were invalid and hidden | Valid windows shown; refresh |

If the **terminal** cannot reach the server half, the sidebar says *Quota service unavailable*, keeps
the last readings marked offline, and does not blame a provider. Enable the server entry and run
`opencode reload`.

## Claude: how it works, and its limits

```text
OpenCode server ─ spawn ─▶ claude -p --input-format stream-json … (isolated, no tools, no MCP)
                 ◀─ stdio ─ initialize ▸ get_usage{skip_behaviors:true} ▸ initialize
```

- **Prompt-free.** Only `initialize` and `get_usage` control requests are written. No user message is
  sent, no conversation is resumed, and there is no fallback to `/usage` as a prompt. A CLI that
  rejects the request is reported as `unsupported_protocol`.
- **Isolated launch.** No shell; `--no-session-persistence --safe-mode --strict-mcp-config`, tools
  and setting sources disabled, a throwaway working directory, and `ANTHROPIC_API_KEY`,
  `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_BASE_URL` and provider-routing
  variables removed so the CLI uses its own first-party login.
- **Bounded.** Whole-process timeout, output cap, cancellation, and SIGTERM → SIGKILL with the child
  always reaped, including on timeout, error, cancellation and plugin unload.
- **Experimental protocol.** `get_usage` is marked experimental by Anthropic and may change between
  CLI releases. The adapter is isolated in `src/collectors/claude/`, validated, and covered by a fake
  CLI harness. Only the versions listed above are tested.
- **Server rows.** Claude `limits` rows are used as sent (kind, group, scope, order, severity,
  headline pick). Legacy fields are used only when the rows are absent, never when the server returns
  an explicitly empty list. Report percentages are 0–100 used.
- **CLI-owned state.** The CLI may still write its own operational auth/cache files at startup. The
  plugin does not promise a filesystem-pure subprocess and never reads those files.
- **Account identity.** The CLI's reported account is hashed in memory to detect account changes.
  `initialize` is repeated after `get_usage`; a different identity discards the result. If the CLI
  reports no identity, readings are shown but not reused across failures. A failed refresh keeps
  earlier readings (marked stale) only when that identity was verified.
- **Source label.** Claude rows say they come from the Claude CLI on the OpenCode server, not from the
  OpenCode connection.

### Remote servers

Collection always runs **on the OpenCode server**. For a remote server, the Claude CLI must be
installed and signed in **there**; the plugin never uses your local machine's CLI or credential store
as a fallback, and credentials are never transferred. Add the server entry on the remote machine's
configuration and the terminal entry to your local `cli.json`. Diagnostics name the server-side
prerequisite when it is missing.

### Codex

Codex uses the active OpenAI OAuth connection resolved through OpenCode, plus the account selector
when present, against the ChatGPT usage endpoint. That endpoint is an unstable external dependency:
the response is validated, invalid windows are dropped (reported as `partial_data`), and a changed
shape is reported as `invalid_response`.

## Development

```sh
bun install
bun run typecheck
bun test
```

The tests are offline: a fake Claude CLI (`test/fixtures/fake-claude.ts`) speaks the control protocol
over real pipes, so timeouts, escalation and child reaping are exercised for real. Fixtures contain
only synthetic data; `test/fixtures-sanitized.test.ts` enforces that.

```text
src/
  index.ts              server entry (RPC, events, scheduler wiring)
  host.ts discovery.ts  host adapters and supported-integration discovery
  service.ts            per-location scheduler, cache, backoff, freshness
  collectors/           codex.ts · claude/{transport,usage,collector}.ts
  rpc.ts domain.ts      versioned RPC contract and credential-free snapshot schema
  tui/                  controller · view-model · formatting · components · entry
```

## Releasing

Releases are published to npm by `.github/workflows/publish.yml` using
[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC). There is no npm token
secret.

### One-time setup

1. Publish the first version by hand from a clean checkout, signed in with an npm account that has 2FA:
   `npm publish`.
2. On npmjs.com, open the package, go to **Settings → Trusted Publisher**, choose **GitHub Actions**
   and enter:

   | Field | Value |
   |---|---|
   | Organization or user | `girardidev` |
   | Repository | `opencode-quotabar` |
   | Workflow filename | `publish.yml` |
   | Environment | _(leave empty)_ |

3. Optionally, in the package's publishing access settings, require 2FA and disallow tokens.

The workflow filename must match exactly. If you rename `publish.yml`, update the Trusted Publisher
entry too, otherwise publishing fails with an authentication error.

### Cutting a release

1. Bump `version` in `package.json` and merge it to `main`.
2. Create a GitHub Release tagged `v<version>` (for example `v0.2.0`).
3. The workflow checks that the tag matches `package.json`, runs typecheck and tests, and publishes.

Releases marked as prerelease are ignored by the workflow.
