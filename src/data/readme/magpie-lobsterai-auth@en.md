# magpie-lobsterai-auth

[![npm](https://img.shields.io/npm/v/magpie-lobsterai-auth)](https://www.npmjs.com/package/magpie-lobsterai-auth)
[![CI](https://github.com/BowlongRise/magpie-lobsterai-auth/actions/workflows/test.yml/badge.svg)](https://github.com/BowlongRise/magpie-lobsterai-auth/actions/workflows/test.yml)
[![license](https://img.shields.io/npm/l/magpie-lobsterai-auth)](LICENSE)

An **unofficial** Magpie / OpenCode provider plugin for **NetEase Youdao LobsterAI**
(有道龙虾).

[中文](README.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Issues](https://github.com/BowlongRise/magpie-lobsterai-auth/issues)

Provider id: `lobsterai`. After sign-in, models appear as `lobsterai/<model>`.

## Features

- Browser sign-in through LobsterAI's own login page and a one-shot loopback callback.
- Manual access/refresh token sign-in as a fallback.
- Live account model catalog from `GET /api/models/available`.
- LobsterAI `lobsterai_options` thinking levels, including the Kimi K3 contract.
- JWT-aware token renewal through `auth.refresh`.
- Credit usage that adds the plan pool and the campaign credits (daily check-in, gifts) together.
- Daily check-in through magpie's `auth.checkin`, on demand or once a day.
- Multiple accounts through Magpie's account scope.
- Enterprise context headers when the sign-in response names an enterprise.

## Requirements

- Magpie, desktop app or `magpie web`. The daily check-in uses `auth.checkin` and
  needs Magpie 0.1.1083 or later.
- A LobsterAI account; the free plan is enough. The LobsterAI desktop app is not
  required.
- Node.js 20.3+ only when working on the source or running the tests.

## Install

Make sure the account works on [LobsterAI](https://lobsterai.youdao.com/) first, then:

```bash
magpie plugin add magpie-lobsterai-auth
```

Or install straight from GitHub, without npm:

```bash
magpie plugin add github:BowlongRise/magpie-lobsterai-auth
```

```bash
magpie plugin login lobsterai
magpie provider test lobsterai
magpie quota
```

## Endpoints

```text
https://lobsterai-server.youdao.com/api/proxy/v1/chat/completions
```

Requests carry the account's Bearer token, LobsterAI client headers and
`x-lobster-session-id`.

## Notes

- Not affiliated with NetEase Youdao.
- LobsterAI's model API is not a documented public API and may change.
- Tokens are stored by Magpie in `plugin-auth.json`; the plugin never reads the
  LobsterAI desktop app's database, cookies or credential files.
- LobsterAI's `yd-fast` / `yd-ultra` entries are server-side virtual presets
  that must be resolved per session, so this plugin lists real models only.
- The plugin talks only to LobsterAI's own servers (`lobsterai-server.youdao.com`,
  `api-overmind.youdao.com`, `lobsterai.youdao.com`). It carries no telemetry and
  sends nothing anywhere else.

## Daily check-in

The plugin implements magpie's `auth.checkin` hook against LobsterAI's own
activity endpoints:

- Manually: `magpie accounts checkin` (or the check-in button on the account
  card) runs one now.
- Automatically: turn daily check-in on in Settings › Usage › Plugins and magpie
  calls it once a day per account.

It reads `GET /api/client-activities/slot` for the current activity,
`GET …/context` for today's state, and posts `…/actions/check_in` when the day
is still unclaimed. The outcome maps to `claimed` (with this run's credits and
streak), `done` (already claimed, no repeat request), `inactive` (no activity,
ended, or not a daily check-in) or `failed` with `signIn: "expired"`.

`until` is the next midnight in the activity's own timezone (`Asia/Shanghai` for
LobsterAI), so magpie asks again then instead of guessing from the local clock.
LobsterAI's one-off "startup credit" activity is not part of the check-in hook.

## Credits

LobsterAI splits credits in two, and the plugin reads both:

- `GET /api/user/quota` — the plan's own pool (300 `freeCreditsTotal` on the free plan).
- `GET /api/user/profile-summary` — `creditItems` lists each source (new-user gift, daily
  login reward, …) with its expiry, and `totalCreditsRemaining` is the sum.

The account card shows one row per source and takes the balance from
`totalCreditsRemaining`: a 300 gift plus 100 a day of check-in is 500 after two days.
Reading `/api/user/quota` alone misses the campaign part.

## Relation to Providers Hub

`magpie-providers-hub` in the Magpie plugin market also covers the LobsterAI
channel (provider id `hub-lobsterai`) with the same sign-in flow and model
endpoint. It differs from this package in that:

- it is an eleven-channel hub; this package is LobsterAI only, so upgrades and
  debugging are independent;
- this package sends LobsterAI's `lobsterai_options` thinking levels and follows
  Kimi K3's fixed request contract, which the hub does not;
- this package adds the plan pool and the campaign credits together, which the
  hub's LobsterAI entry has no usage hook for;
- this package runs the daily check-in (`auth.checkin`), which the hub's
  LobsterAI entry does not;
- this package sends `X-LobsterAI-Account-Mode` / `X-LobsterAI-Enterprise-Id`
  when the sign-in response names an enterprise.

Both sign in to the same channel with the same account, and share one credit pool.

## FAQ

**Can't find the plugin in Magpie's search?** npm's search index lags behind new
packages; install it by name: `magpie plugin add magpie-lobsterai-auth`.

**Signed in but no models?** The plan may expose none right now, or
`/api/models/available` failed; the plugin falls back to its built-in snapshot and
refreshes on the next sign-in.

**The credit balance is lower than in LobsterAI?** Versions before 0.2.1 read only
`/api/user/quota` and missed the check-in and campaign credits. Update to the latest
release, see [CHANGELOG.md](CHANGELOG.md).

**Check-in didn't claim anything?** An activity that has not started or has ended
returns `inactive` and is not retried that day; an expired sign-in returns `failed`.

## Development

```bash
git clone https://github.com/BowlongRise/magpie-lobsterai-auth.git
magpie plugin add ./magpie-lobsterai-auth
npm test
npm run check
```

See [CONTRIBUTING.md](https://github.com/BowlongRise/magpie-lobsterai-auth/blob/main/CONTRIBUTING.md)
for the release process.

## License

MIT.
