<div align="center">

# quota-keepalive

Multi-provider quota check-in, real-chat keepalive, run history, and quota trends for Magpie.

[![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/quota-keepalive?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/quota-keepalive)
[![Magpie](https://img.shields.io/badge/Magpie-Plugin-0EA5A4?style=for-the-badge)](https://github.com/sljdxde/quota-keepalive)
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
- Keep refresh-only events out of the check-in/keepalive run list.
- Refresh quotas every minute for enabled providers, and support per-provider or
  refresh-all actions.
- Keep only hashed account tags, sanitized errors, model names, and status fields in
  logs. Tokens, full account identifiers, enterprise identifiers, and model replies
  are never stored.

## Install

Install from npm. This is the recommended path and supports Magpie update checks:

```sh
magpie plugin add quota-keepalive
```

Magpie checks installed npm/git plugins shortly after startup and then every hour.
When a newer version is available, Plugins shows an update badge and an update action.

Update every npm/git plugin:

```sh
magpie plugin update
```

Update only this plugin:

```sh
magpie plugin add quota-keepalive
```

Re-adding the same npm package replaces the old version while preserving plugin
options, provider preferences, and enabled/disabled state. Updating also unpins an
older `quota-keepalive@x.y.z` spec.

Install from GitHub without npm:

```sh
magpie plugin add github:sljdxde/quota-keepalive
```

Install from a local folder only for development:

```sh
magpie plugin add "$(pwd)"
```

A folder plugin loads the working tree directly and is not included in Magpie's
version checks or `magpie plugin update`. Switch back to npm before shipping.

After installation, open **Plugins → Quota Keepalive** in Magpie. Reopen the page
after a UI-only update; restarting all of Magpie is not required.

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
  "scheduleAction": "all",
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

Upgrade note: an old installation that explicitly saved `probeMode: "short"` keeps
that choice. Select **Real activity** and save the schedule (or update plugin
options) when you want WorkBuddy activity records to be written.

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

- [GitHub](https://github.com/sljdxde/quota-keepalive)
- [npm](https://www.npmjs.com/package/quota-keepalive)
- [Releases](https://github.com/sljdxde/quota-keepalive/releases)
- [License](./LICENSE)
