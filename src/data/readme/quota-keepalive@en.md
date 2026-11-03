<div align="center">

# quota-keepalive

Multi-provider quota check-in, real-chat keepalive, run history, and quota trends for Magpie.

[![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/quota-keepalive?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/quota-keepalive)
[![Magpie](https://img.shields.io/badge/Magpie-Plugin-0EA5A4?style=for-the-badge)](https://github.com/sljdxde/quota-keepalive-magpie-plugin)
[![Unofficial](https://img.shields.io/badge/Status-Unofficial-F59E0B?style=for-the-badge)](#unofficial-plugin-notice)

[中文](./README.md) · English

</div>

---

quota-keepalive adds one provider-neutral page to Magpie for inspecting signed-in
providers, running check-ins, sending configurable real-chat keepalive requests,
reviewing run history, and watching quota changes.

It does not take over provider sign-in. Magpie and the installed provider plugins
keep owning credentials, model lists, quotas, and the provider's own `auth.checkin`
hook. This plugin only coordinates those capabilities and presents the results.

> **Current status: real-chat keepalive paused**
>
> The page hides the global keepalive action, account-level keepalive controls, and
> model selection. Scheduled jobs now run check-in only. Existing keepalive records
> remain available as history while the backend code stays in place for a later release.

## Unofficial plugin notice

> This project is not an official Magpie plugin.
>
> Check-in uses the provider plugin's public `auth.checkin` hook whenever possible.
> Real-chat keepalive is not a provider-authorized or guaranteed feature. Keepalive
> requests use the signed provider adapter on your machine and are sent directly to
> the vendor, with no third-party relay and no token export. That reduces credential
> exposure, but it does not make vendor-risk zero.
>
> Automated synthetic messages may be classified as abnormal traffic and can lead to
> rate limits, credit freezes, account restrictions, or bans. Keepalive is disabled by
> default. Enable it only if you understand the risk and accept the consequences.

> **Installation**
>
> This project is not listed in Magpie's official plugin marketplace. Install it with
> `magpie plugin add quota-keepalive`; see
> [Install outside the official marketplace](#install-outside-the-official-marketplace).
> Read [the installation risks](#installation-risks) before proceeding.

## Features

- Detect every signed-in Magpie provider, account, model, and quota window.
- Run check-in through each provider plugin's public `auth.checkin` hook.
- Respect provider-level and account-level switches; unsupported or signed-out
  accounts are reported explicitly instead of being silently skipped.
- Send real-chat keepalive through each provider's signed adapter.
- Use a real activity conversation by default. For WorkBuddy CN this follows
  dsh's measured probe shape: about 25k input tokens and one output token, which
  consumes credits. Use the short probe only when a low-cost connectivity check
  is enough.
- Prefer models that recently completed a real keepalive successfully, then fall
  back by success rate, recency, and known failures. Provider model order is used
  when there is no history.
- Search and select a model per provider. If the selected model is unavailable,
  the runner falls back to another model available to that account.
- Schedule check-in, keepalive, or both from every 5 minutes to every 7 days.
- Persist the next scheduled run so an overdue task can catch up after a Magpie
  restart or computer sleep.
- Show today's result, a five-day account history, run details, and quota trends.
- Label quota rows explicitly as remaining versus total, show used amounts and
  percentages separately, and keep vendor-only displays uninterpreted.
- Keep refresh-only events out of the check-in/keepalive run list. By default,
  the run list shows only successful and failed runs with real outcomes; skipped-only
  runs stay collapsed behind **View all logs for today**, including every run from
  the current Beijing day.
- Refresh quotas every minute for enabled providers, and support per-provider or
  refresh-all actions.
- Keep only hashed account tags, sanitized errors, model names, and status fields in
  logs. Tokens, full account identifiers, enterprise identifiers, and model replies
  are never stored.

## Install (outside the official marketplace)

This project is not listed in Magpie's official plugin marketplace. The package is
published to npm, so other users do not need to clone the repository or wait for a
marketplace listing.

- npm package: `quota-keepalive`
- Repository: <https://github.com/sljdxde/quota-keepalive-magpie-plugin>

### Installation risks

This project is not reviewed through Magpie's official marketplace. Before installing:

- **Supply chain**: Installing trusts this repository and npm publisher. If the npm
  account or GitHub repository is compromised, a later release could contain
  malicious code. Install only from the npm package name or GitHub repository above,
  not an unknown mirror. GitHub installs track the default branch and may load
  unreleased code; prefer npm for normal use.
- **Local permissions**: `magpie.permissions` limits what the plugin page can read; it
  is not a sandbox for the plugin backend. The backend runs with your user privileges
  and reads files such as `~/.config/magpie/plugin-auth.json` to reuse existing Magpie
  sessions and send requests. The current code does not export tokens and redacts
  logs, but that is implementation behavior, not an official security endorsement.
  Review the source if you need stronger assurance.
- **Updates**: New versions of unofficial npm plugins are reported as pending updates,
  not installed automatically like `@magpie-community/*` packages. However,
  `magpie plugin update` or **Update all** upgrades every plugin and unpins an exact
  version. For controlled upgrades, install a specific `quota-keepalive@x.y.z`
  version, defer bulk updates, and review Release notes and code changes first.
- **Vendor risk**: Automated check-ins and keepalive send real requests and may consume
  credits, trigger rate limits, or be classified as abnormal traffic, leading to
  credit freezes, account restrictions, or bans. Keepalive is disabled by default;
  evaluate provider terms before enabling even check-in.
- **Compatibility and support**: This project has no Magpie compatibility certification
  or official support. Changes to Magpie or provider plugin interfaces may break it.
  Use logs to diagnose failures and report them in
  [GitHub Issues](https://github.com/sljdxde/quota-keepalive-magpie-plugin/issues). Use the
  uninstall command for the installation method below if you do not accept these
  risks.

### Option 1: npm (recommended)

Prerequisite: Magpie is installed and `magpie` is available in your terminal.

```sh
magpie --version
magpie plugin add quota-keepalive
```

Verify the installation:

```sh
magpie plugin list
```

The list should include `quota-keepalive@latest`. Then open **Plugins → Quota
Keepalive** in Magpie.

### Option 2: GitHub (without npm)

Use this when npm is unavailable or you want to track the repository directly:

```sh
magpie plugin add github:sljdxde/quota-keepalive-magpie-plugin
```

This installation can also be updated with `magpie plugin update`. If npm is
unreliable on your network, check `magpie plugin registry` or use this option.

### Option 3: Local folder (development only)

Run this from the repository root:

```sh
magpie plugin add "$(pwd)"
```

A folder plugin loads the working tree directly. It is not included in Magpie's
version checks or `magpie plugin update`. Before switching back to npm, copy the
folder entry's options, turn the folder entry off, add the npm entry, restore the
options, and then remove the folder entry:

```sh
# still in the repository root
magpie plugin options "$(pwd)"   # copy the output; skip restore if it says No options set
magpie plugin off "$(pwd)"
magpie plugin add quota-keepalive
magpie plugin options quota-keepalive '<copied options JSON>'
magpie plugin rm "$(pwd)"
```

If viewing the options prints `No options set.`, skip the restore line.

### Verify after installation

1. `magpie plugin list` shows this plugin's spec: `quota-keepalive@latest` for npm,
   `github:sljdxde/quota-keepalive-magpie-plugin` for GitHub, or an absolute folder path.
2. **Plugins** includes **Quota Keepalive**.
3. At least one provider plugin is installed and signed in (WorkBuddy, Qoder, Trae,
   and others). This plugin does not own sign-in; it only reads Magpie's existing
   sessions.
4. Open the page and click **Detect** to confirm providers and accounts are found.

### Update

```sh
# Update every npm/git plugin
magpie plugin update

# npm install: update only this plugin
magpie plugin add quota-keepalive
```

There is no separate update command for a GitHub install; use
`magpie plugin update` above. Running `magpie plugin add quota-keepalive` switches to
the npm version rather than updating the current Git checkout.
Re-adding the same npm package replaces the old version while preserving plugin
options, provider preferences, and enabled/disabled state. Updating also unpins an
older `quota-keepalive@x.y.z` spec. **Update all** in the page is equivalent to
`magpie plugin update`.

### Uninstall

```sh
# npm install
magpie plugin rm quota-keepalive

# GitHub install
magpie plugin rm github:sljdxde/quota-keepalive-magpie-plugin

# local folder install (run from the original repository root)
magpie plugin rm "$(pwd)"
```

### Troubleshooting

- Not found in the official marketplace: expected. This project is not listed there;
  use the npm or GitHub command above.
- Not found in the unofficial GitHub list: search for `quota` or `quota-keepalive`
  and check the spelling. That list loads asynchronously from GitHub; if it is
  temporarily empty, choose **Show all** or reopen the **Plugins** page. If it is
  still missing, install it directly with `magpie plugin add quota-keepalive`.
- `magpie: command not found`: confirm Magpie is installed and `magpie` is on `PATH`;
  alternatively use the CLI executable inside the Magpie installation directory.
- The page is missing after installation: run `magpie plugin list` again, confirm the
  plugin is loaded, then reopen the **Plugins** page.
- The page opens but no accounts are detected: install and sign in to the relevant
  provider plugin first. This plugin only reads existing Magpie sessions.

## Quick start

1. Open the **Quota Keepalive** page.
2. Click **Detect** to load signed-in providers, accounts, models, and quotas.
3. Keep provider and account automatic switches in the desired state.
4. Use **Check in all** or **Send keepalive** for one manual run.
5. Configure **Schedule** if you want automatic execution.
6. Review **Recent runs**, account history, and quota changes.

Keepalive sends a real provider request and may consume credits. The plugin does not
enable automatic keepalive by default.

## Page controls

- **Detect**: refresh the provider/account/model/quota snapshot.
- **Check in all**: run check-in for every eligible provider.
- **Send keepalive**: confirm and send one keepalive request to every eligible account.
- Provider switch: enable or disable all automatic tasks for that provider.
- Account **Check-in** / **Keepalive** switches: control automatic participation only;
  they do not send a request immediately.
- Account **Run check-in** / **Run keepalive** buttons: execute one account now.
  Manual keepalive asks for confirmation and still requires the provider to be enabled.
- **Refresh quota**: refresh all enabled providers; each provider row also has a
  provider-only refresh button.
- **View all logs for today**: switch the run list to every task from the current
  Beijing day, including skipped-only runs that are hidden by default.
- **Save schedule**: set the shared interval and action type.
- **Real activity / Short probe**: real activity fills the configured input and
  can leave an activity record, but consumes credits. A short probe is cheaper
  and faster, but does not guarantee an activity record.

Saving a schedule starts the next run after the configured interval. The next run
time is persisted, and a task already due when Magpie starts is run immediately.

## Scheduling and failures

Magpie's native daily check-in scheduler still runs independently. This plugin adds
an optional shared scheduler for more frequent check-in or keepalive.

- Default: disabled.
- Interval: 5 minutes to 7 days.
- Actions: `checkin`, `keepalive`, or `all`.
- A successful check-in or keepalive for the same account and Beijing date is
  idempotent and will not be sent again.
- Keepalive retries are bounded by `maxAttempts`.
- HTTP 402/429 credit exhaustion stops automatic retry for that day.
- Manual actions can deliberately retry a failed or quota-exhausted account.
- Network errors, expired sign-in, unavailable models, empty replies, and provider
  business errors are recorded with sanitized details.

## Model availability

Keepalive does not blindly choose the cheapest or a free model:

1. Intersect the provider's model list with the account's allowed models.
2. Prefer a model that recently completed a real keepalive successfully.
3. If the account has no history, prefer a model another account of the same
   provider used successfully.
4. If there is still no history, follow the provider's model order.
5. Put known failures after unverified candidates.
6. Fall back to the next candidate on a missing model, credit rejection, upstream
   outage, or empty reply.

For WorkBuddy CN, the real activity path follows dsh probe semantics and sends
about 25k input tokens with a one-token output cap. Activity mode requires either
visible model content or usage/credit/prompt-token evidence in the response. A bare
`[DONE]`, an empty 200, JSON business errors, HTML login pages, and timeouts are
failures. The short-probe mode remains available for low-cost checks, but it does
not claim that an activity record was created.

## Configuration

The page writes plugin-level options. The same values can be changed from the CLI:

```sh
magpie plugin options quota-keepalive '{
  "scheduleEnabled": true,
  "scheduleMinutes": 60,
  "scheduleAction": "checkin",
  "keepaliveEnabled": false,
  "modelPreferences": {
    "workbuddy": "deepseek-v4.1-flash",
    "codearts": "deepseek-v4.1-flash"
  },
  "modelCandidates": 4,
  "probeMode": "activity",
  "probeMessage": "Magpie daily connectivity check. Reply with OK.",
  "inputTokens": 25000,
  "maxAttempts": 3,
  "timeoutMs": 90000,
  "logMaxBytes": 2097152
}'
```

- `scheduleEnabled`: enable the plugin scheduler. Default `false`.
- `scheduleMinutes`: shared interval, default `60`, range 5 minutes to 7 days.
- `scheduleAction`: `checkin`, `keepalive`, or `all`. Default `checkin`.
- `keepaliveEnabled`: backend keepalive switch. Default `false`. The page hides all
  keepalive controls, and old `keepalive` / `all` schedules fall back to check-in.
- `model`: optional preferred model; it is not a hard allowlist.
- `modelPreferences`: preferred model per provider.
- `modelCandidates`: maximum fallback candidates per account, default `4`.
- `probeMode`: `activity` by default and sends the configured long activity input;
  `short` sends only a short message; `context` is the backwards-compatible alias
  for `activity`.
- `probeMessage`: short probe text, up to 500 characters.
- `inputTokens`: long-input size for `activity`/`context`, default 25000.
- `maxAttempts`: maximum keepalive attempts per account per Beijing day.
- `timeoutMs`: overall timeout for one model request, default 90 seconds.
- `logMaxBytes`: rotate one previous log after this size, default 2 MiB.
- `statePath`, `logPath`, `snapshotPath`, `commandPath`, `schedulePath`: optional
  absolute paths.

Upgrade note: old schedules saved as `all` or `keepalive` automatically fall back
to check-in, so no page change is required. Keepalive options remain for compatibility.

## Logs

The default log is:

```text
~/.config/magpie/workbuddy-daily.log.jsonl
```

Read it with the bundled command:

```sh
node ./bin/daily-keepalive-log.js --limit 50
node ./bin/daily-keepalive-log.js --day 2026-10-30 --status failed
node ./bin/daily-keepalive-log.js --json
```

Agents can use the `quota-keepalive_logs` tool. Logs contain stable hashes of account
identifiers, provider IDs, status, model names, and sanitized errors. They never
contain tokens, full account identifiers, enterprise identifiers, or model replies.

### Storage and automatic cleanup

- JSONL logs keep only the current file and one rotated `.1` copy. The next rotation
  replaces and removes the older copy automatically. At the default 2 MiB limit, the
  two files normally stay under about 4 MiB.
- The state file keeps only the latest 32 days of account records; older entries are
  pruned when state is written.
- Page snapshots `data.js` and `data.json` are overwritten, not appended. The
  all-logs-for-today view is derived from the current snapshot and does not create
  additional history files.
- Magpie-owned files such as `quota-history.json` are read-only to this plugin.

## Security

- State and log files are created with mode `0600`.
- Writes use temporary files and atomic rename.
- `plugin-auth.json` updates use a short lock, file fingerprint checks, and conflict
  retries. The plugin re-reads and merges when Magpie or another provider plugin
  changed the file after it was read.
- Model replies are not written to state or logs.
- Tokens, Bearer values, API keys, and account identifiers are redacted from page
  output and logs.
- Missing provider plugins, signed-out accounts, and model-less providers produce
  explicit skip or failure results.

## Development

```sh
bun test
bun test --coverage
npm pack --dry-run
```

Tests use mocked requests. They do not contact vendors or consume credits. The core
JavaScript modules currently have 100% line and function coverage, including
performance-boundary cases.

## Publishing

The repository uses npm Trusted Publishing through
`.github/workflows/publish.yml`; no npm token is stored in the repository or in
GitHub Secrets.

1. Update the version in `package.json` and commit the changes.
2. Create a matching tag, for example `v0.1.2`.
3. Push `main` and the tag.
4. Publish a GitHub Release for that tag.
5. The workflow runs tests, syntax checks, `npm pack`, and publishes through OIDC.
6. Installed users see the update through Magpie's hourly plugin update check.

Manual npm publishing with two-factor authentication enabled requires the current
one-time code:

```sh
npm publish --access public --otp=<current-one-time-code>
```

Never put an OTP, npm token, or recovery code in a repository, README, or chat.

## Links

- [GitHub](https://github.com/sljdxde/quota-keepalive-magpie-plugin)
- [npm](https://www.npmjs.com/package/quota-keepalive)
- [Releases](https://github.com/sljdxde/quota-keepalive-magpie-plugin/releases)
- [License](./LICENSE)
