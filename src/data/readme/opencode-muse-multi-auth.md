# OpenCode Muse Multi Auth

**Muse Code authentication, multi-account switching and usage limits — in OpenCode and your terminal.**

[![npm version](https://img.shields.io/npm/v/opencode-muse-multi-auth?color=5b5bd6)](https://www.npmjs.com/package/opencode-muse-multi-auth)
[![CI](https://github.com/yuefdev/opencode-muse-multi-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/yuefdev/opencode-muse-multi-auth/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/opencode-muse-multi-auth)](https://nodejs.org/)
[![MIT licence](https://img.shields.io/github/license/yuefdev/opencode-muse-multi-auth)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yuefdev/opencode-muse-multi-auth?style=flat)](https://github.com/yuefdev/opencode-muse-multi-auth/stargazers)

Know which Muse account is active, see how much usage remains, and keep your projects on the right profile. OpenCode Muse Multi Auth combines the standalone `muse-auth` Node.js CLI with an OpenCode plugin, sharing the same local account state.

Browser sign-in runs through the official Muse Code CLI. The OpenCode plugin adds your account's models, reasoning levels, account tools and an optional quota status line.

[Quick start](#quick-start) · [OpenCode setup](#use-muse-code-in-opencode) · [CLI reference](#cli-reference) · [Account switching](#automatic-account-switching) · [JavaScript API](#javascript-api)

## Why OpenCode Muse Multi Auth?

| Feature | What you get |
| --- | --- |
| **Official browser sign-in** | Let Muse Code handle device-code authentication. |
| **Isolated account profiles** | Add personal and work accounts without copying credentials between them. |
| **Real usage observations** | Read window and weekly usage, reset times and data freshness. |
| **Optional account switching** | On quota exhaustion, try another eligible account supporting the selected model. |
| **Project-aware preferences** | Choose a project account or inherit your global preference. |
| **OpenCode integration** | Account-aware models, reasoning variants, direct commands and a quota status line. |
| **Useful diagnostics** | Check your CLI, sign-in, model catalogue and quota with `muse-auth doctor`. |
| **Provider-reported metrics** | Track request attempts, errors, duration, input/output tokens and cache usage. |

Works with **Muse Spark**, **Muse Wonder** and **Muse Wonder Full** when those models are available in the signed-in account's official catalogue. This is a community-maintained integration.

## Quick start

You need **Node.js 22 or later** and the [official Muse Code CLI](https://dev.meta.ai/docs/muse-code). OpenCode Muse Multi Auth uses browser-authenticated Muse Code accounts; plan eligibility and limits are controlled by Meta.

```sh
npm install -g opencode-muse-multi-auth
muse-auth login
muse-auth status
muse-auth limits
```

Already signed in to Muse Code? Start with `muse-auth status`. The existing CLI account is available as the first profile.

You can also run individual commands with `npx`:

```sh
npx -y --package=opencode-muse-multi-auth@latest muse-auth limits
```

`museauth` is an alias for `muse-auth`. Both commands use the same data.

## Use Muse Code in OpenCode

Add the plugin to `~/.config/opencode/opencode.json`, merging it with your existing plugins:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-muse-multi-auth"]
}
```

For the optional prompt status line and direct TUI commands, also add the package to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-muse-multi-auth"]
}
```

1. Quit and restart OpenCode after changing either configuration file.
2. Open `/connect`, select **Muse Code (Meta subscription)**, then choose browser sign-in or **Use the existing Muse Code account**.
3. Complete the official browser flow if required.
4. Restart OpenCode to refresh the account's model catalogue, then choose a Muse model in `/models`.

The terminal CLI and OpenCode plugin share account preferences, usage observations and project metrics. Project preferences follow the directory in which the command or OpenCode session runs.

### OpenCode commands

| Command | Purpose |
| --- | --- |
| `/muse-status` | Show sign-in, models, quota and the latest error. |
| `/muse-doctor` | Diagnose the CLI, account, catalogue and quota. |
| `/muse-limits` | Display window/weekly usage and reset times. |
| `/muse-metrics` | Show the current project's request and token metrics. |
| `/muse-accounts` | List account profiles. |
| `/muse-add` | Create an isolated profile and start browser sign-in. |
| `/muse-switch` | Select the current project's account. |
| `/muse-switch-global` | Set the global default account. |
| `/muse-inherit` | Return the project to the global account preference. |
| `/muse-label` | Rename the active account. |
| `/muse-auto` | Configure quota-driven account switching. |

These TUI commands run directly, without asking a model to generate a reply. The plugin also exposes `muse-status`, `muse-doctor`, `muse-limits`, `muse-metrics`, `muse-accounts`, `muse-login`, `muse-switch` and `muse-config` as tools.

## CLI reference

```sh
muse-auth status
muse-auth doctor
muse-auth limits
muse-auth limits --json
muse-auth accounts --refresh
muse-auth add "Work account"
muse-auth login 2
muse-auth switch 2
muse-auth switch 1 --global
muse-auth switch --inherit
muse-auth label 2 "Personal account"
muse-auth disable 2
muse-auth enable 2
muse-auth auto on --global
muse-auth auto off
muse-auth auto inherit
muse-auth metrics --json
muse-auth --help
```

Account numbers are **1-based**. You can use a profile ID instead. `--global` changes the default; a project's explicit preference takes priority. Use `--json` for scripts and integrations.

`status` refreshes the account and model catalogue. `accounts --refresh` checks all profiles. `limits --refresh` asks the CLI for its available usage observation; it does not run a model completion to manufacture a fresh percentage.

## Automatic account switching

Automatic switching starts **disabled**. Enable it globally or for a project:

```sh
muse-auth add "Second account"
muse-auth auto on --global
# Or enable it only in the current project:
muse-auth auto on
```

When the selected account's quota is exhausted, the plugin considers another enabled, signed-in account whose last checked catalogue includes the requested model. Each account is attempted at most once for that request. The active model is preserved.

An exhausted account is held until its reported reset time. If no reset is reported, an explicit account selection permits a deliberate retry. Ordinary temporary rate limits, server errors and interrupted streams do not trigger account rotation. Responses already streaming are never replayed through another account.

### Subscription upgrades and new models

The official CLI supplies the account's model catalogue. If an upgrade unlocks Muse Wonder Full or another model, run `muse-auth status`, then restart OpenCode to refresh its model menu. Your current model selection is retained; automatic account switching does not automatically select a more expensive model.

## Usage limits and metrics

Quota information comes from Meta's `response.subscription_usage` events and, when available, Muse's `usage/read` result. Window duration, weekly usage and reset timestamps are reported by the provider.

- Unknown usage stays unknown.
- Observations older than five minutes are marked **stale**.
- A percentage whose reset time has passed is not treated as current availability.
- Notifications appear at **80%**, **95%** and **100%** usage, once per threshold and usage window.
- The optional OpenCode status line reads local state every two seconds; it does not send model requests.

Metrics are stored per project. Request counts include account-switching attempts. Tokens are counted only when the provider reports them. Cached tokens are a subset of input tokens; reasoning tokens are a subset of output tokens.

## JavaScript API

The ESM runtime is available for your own Node.js tooling:

```sh
npm install opencode-muse-multi-auth
```

```js
import { createRuntime } from "opencode-muse-multi-auth/runtime";

const muse = createRuntime({ directory: process.cwd() });

try {
  const status = await muse.status(true);
  console.log(status.accounts);
  console.log(await muse.metrics());
} finally {
  await muse.dispose();
}
```

The package root exports the OpenCode server plugin; `opencode-muse-multi-auth/tui` exports the TUI plugin. Node.js consumers should use `opencode-muse-multi-auth/runtime` for account management. The API is pre-1.0; check release notes when upgrading.

## How it works

The official Muse CLI owns sign-in, account eligibility and model routing. For OpenCode model requests, a temporary loopback bridge forwards the conversation and tool definitions using the CLI-generated request headers, then relays the Responses API stream back to OpenCode. OpenCode executes the tools.

The bridge listens on `127.0.0.1`, closes after completion or cancellation, and runs Muse with shell execution, filesystem writes and session retention disabled. `META_API_KEY` is removed from child CLI environments, and stored API-key accounts are rejected. There is no automatic pay-as-you-go fallback.

Muse conversations disable automatic `task` delegation and use a stable per-session prompt cache key. The default reasoning effort is `medium` when supported. Available CLI reasoning variants remain selectable. Auxiliary Muse work uses an available Spark model with light reasoning; the main model selection is preserved.

Tool and structured-output schemas are adapted automatically to Muse's ten-level nesting limit. Schemas within the limit are unchanged. Overflowing branches retain their original rules as JSON text in a description, with provider-side strict mode disabled for the affected definition. Tools stay available, argument values are unchanged, and OpenCode retains the original tool validation.

## Local storage and configuration

| Setting | Location or purpose |
| --- | --- |
| Account preferences, observations and metrics | `~/.opencode/muse-code/state.json` |
| Isolated CLI profiles | `~/.opencode/muse-code/profiles/<profile-id>/` |
| `OPENCODE_MUSE_STATE_DIR` | Override the local state root. |
| `OPENCODE_MUSE_BIN` | Point to a native Muse executable. |

State writes are locked and atomic. The state JSON does not contain tokens, passwords, prompts or response text. Official CLI profile directories contain their own sign-in data and should be treated as credentials. Account labels in diagnostics are redacted if they contain an email address.

The existing CLI account keeps its own settings. New isolated profiles start with Muse's defaults, including its Contributor mode setting. See [Muse authentication](https://dev.meta.ai/docs/muse-code/auth) and [subscriptions](https://dev.meta.ai/docs/muse-code/subscriptions) for the provider's current behaviour.

## Troubleshooting

| Symptom | Try this |
| --- | --- |
| Muse binary not found | Install the official CLI or set `OPENCODE_MUSE_BIN`. On Windows, use the native `.exe`, not a `.cmd` launcher. |
| Browser account required | Run `muse-auth login` or use OpenCode's `/connect`. |
| Quota is unknown or stale | Check the observation time. A new real model response normally carries a new subscription usage event. |
| Newly unlocked model is missing | Run `muse-auth status`, then restart OpenCode. |
| `JSON schema exceeds the maximum nesting depth of 10 levels` | Update the plugin and restart OpenCode. Deep MCP schemas are adapted automatically. |
| Account switching does not happen | Check `muse-auth status`, enable automatic switching, and verify another account supports the selected model. |
| Need diagnostics | Run `muse-auth doctor` and share redacted output in an issue. |

## Development

```sh
git clone https://github.com/yuefdev/opencode-muse-multi-auth.git
cd opencode-muse-multi-auth
npm ci
npm test
npm run test:tui
npm pack --dry-run
```

Tests require the official Muse CLI. The TUI rendering check also requires [Bun](https://bun.sh/). Integration tests use local mock API responses and do not consume model quota. They cover native CLI transport, account isolation, bounded rotation, SSE preservation, cancellation, reported usage and TUI rendering.

See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md) and the [MIT licence](LICENSE). If this improves your workflow, a GitHub star helps other OpenCode and Muse Code users discover it.
