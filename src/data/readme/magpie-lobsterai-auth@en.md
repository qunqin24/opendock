# magpie-lobsterai-auth

An **unofficial** Magpie / OpenCode provider plugin for **NetEase Youdao LobsterAI**
(有道龙虾).

Provider id: `lobsterai`. After sign-in, models appear as `lobsterai/<model>`.

## Features

- Browser sign-in through LobsterAI's own login page and a one-shot loopback callback.
- Manual access/refresh token sign-in as a fallback.
- Live account model catalog from `GET /api/models/available`.
- LobsterAI `lobsterai_options` thinking levels, including the Kimi K3 contract.
- JWT-aware token renewal through `auth.refresh`.
- Credit usage from `GET /api/user/quota`.
- Daily check-in through magpie's `auth.checkin`, on demand or once a day.
- Multiple accounts through Magpie's account scope.
- Enterprise context headers when the sign-in response names an enterprise.

## Install

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

## Relation to Providers Hub

`magpie-providers-hub` in the Magpie plugin market also covers the LobsterAI
channel (provider id `hub-lobsterai`) with the same sign-in flow and model
endpoint. It differs from this package in that:

- it is an eleven-channel hub; this package is LobsterAI only, so upgrades and
  debugging are independent;
- this package sends LobsterAI's `lobsterai_options` thinking levels and follows
  Kimi K3's fixed request contract, which the hub does not;
- this package shows plan credit usage from `/api/user/quota`, which the hub's
  LobsterAI entry has no usage hook for;
- this package runs the daily check-in (`auth.checkin`), which the hub's
  LobsterAI entry does not;
- this package sends `X-LobsterAI-Account-Mode` / `X-LobsterAI-Enterprise-Id`
  when the sign-in response names an enterprise.

Both sign in to the same channel with the same account, and share one credit pool.

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
