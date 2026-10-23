[中文](./README.md)

<!-- banner -->

# magpie-sub2api

<a href="https://github.com/broven/magpie-sub2api"><img src="https://img.shields.io/badge/Star-on%20GitHub-f5c518?style=for-the-badge&logo=github" alt="Star on GitHub" height="48"></a>

Any [sub2api](https://github.com/Wei-Shaw/sub2api) site as a provider in [magpie](https://usemagpie.ai). Sign in with the site's address and an API key. magpie can then use the models of the key's group and route by how much of the key is left.

- **Models**: whatever `GET /v1/models` lists for the key's group. Claude models go to `/v1/messages`, OpenAI's (`gpt-*`, `o1`/`o3`…, `codex-*`) to `/v1/responses`, and the rest to `/v1/chat/completions`.
- **Reasoning levels**: from the site's Codex models manifest (each model's `supported_reasoning_levels` in `GET /backend-api/codex/models`), so they can be switched in magpie and Codex. When the site tells none, the model's official entry on [models.dev](https://models.dev) tells (only the one under the model's own vendor, such as `deepseek`'s `deepseek-flash`; resellers' entries don't count): whether it thinks, the effort levels in its `reasoning_options`, whether its last thinking goes back with the next turn (`interleaved`), and its context and output limits. With no official entry, the levels magpie already has for the model (its `variants` from models.dev or the config) are kept, and failing that a thinking model gets `low` / `medium` / `high`. models.dev is asked once a day and what it tells is kept on disk, in `magpie-sub2api/models-dev.json` under the cache directory (`$XDG_CACHE_HOME`, else `~/Library/Caches` on macOS and `~/.cache` elsewhere), so a magpie restart doesn't ask again; when it can't be had, nothing changes and the model list isn't held up.
- **Usage**: from `GET /v1/usage`, turned into magpie usage windows according to how the key is billed (see the table below). magpie's usage page, menu bar and router all read these windows, so once one is full magpie steers around that key.

## Why not magpie's built-in `balance=/v1/usage`

When a custom provider is configured with `balance=/v1/usage`, magpie reads only the `rate_limits` in the reply (5h / 1d / 7d). It can't see sub2api's other two billing modes:

- a **subscription group**'s day / week / month limits, which are in `subscription`;
- a **key's own total quota**, which is in `quota`.

Neither reaches routing, so magpie keeps sending to a key that is used up. This plugin turns all three modes into windows and adds the plan name, the expiry and the balance.

## Install

In the magpie app, go to **Plugins › Discover**, search for `sub2api` and install `magpie-sub2api`.

Or from the command line:

```sh
magpie plugin add magpie-sub2api
```

## Sign in

```sh
magpie plugin login sub2api
```

It asks for the site's address (e.g. `https://api.example.com`, with or without `/v1`), then for a name for the account (optional), then for the API key (`sk-…`). In the app, adding a sub2api account asks for the same.

The account goes by the name given (e.g. `work key`); left empty, it shows as the site's host plus the key's last four characters, e.g. `api.example.com …a1b2`. The plugin writes the name the first time the account is used, so the very first usage reading after signing in may still say `API key …a1b2`. magpie keeps each account's models and capabilities under its name: **don't rename an account once signed in**; to change it, remove it and sign in again.

## Several sites: one pool, or a provider per site

**One pool (the default)**: each sign-in is one account, with its own site and its own key. Keys on different sites, and several keys on one site, all sit under the one provider `sub2api` as a pool, and magpie routes across them by each account's usage. To add another, sign in again. Its models are all `sub2api/<model>`; there is no saying which site a request goes to.

**A provider per site**: list the sites in the plugin's options, and each becomes a provider of its own, with its own name, its models `<id>/<model>`, which groups and routes can name and order on their own:

```sh
magpie plugin options magpie-sub2api '{"sites":[
  {"id":"jmds","name":"JMDS","url":"https://api.jmds.dev"},
  {"id":"backup","name":"Backup","url":"https://api.example.com"}
]}'
magpie plugin login jmds      # asks only the account's name and the key; the address is the site's
magpie plugin login backup
```

In the app, put the same JSON in the plugin's options editor. magpie reloads the plugin once they change.

- `url` is required; `id` defaults to the site's host (e.g. `api-example-com`); `name` defaults to the `id`.
- An `id` is lowercase letters, digits, `-` and `_`, at most 40, each its own, and not `sub2api` (the pool's). A site that breaks these is left out, and magpie's log says why.
- At most 8 sites.
- A site's provider takes several keys too, pooled within the site.
- The pool provider `sub2api` stays either way; the two can be used side by side.
- The name is only used when you haven't named that provider yourself; a `name` written in `magpie.json` wins.
- **Don't change the `id` of a site in use**: its accounts are kept under the `id`, so a new one is a new provider to sign in to again.

## Usage modes

`/v1/usage` answers with one of three, depending on the key:

| On sub2api | Shown in magpie | Windows | Reset times |
|---|---|---|---|
| **Subscription group** (the group sets day / week / month limits) | plan = the group's name; expiry = the subscription's | `24 hours` / `7 days` / `30 days`, only those the group limits (an empty or 0 limit is left out) | the `daily_reset_at` / `weekly_reset_at` / `monthly_reset_at` sub2api returns; without them the week is its start + 7 days, and the day and month have none |
| **Key with its own quota or rate limits** (`mode: quota_limited`) | plan `API key limits`; expiry = the key's | `Key quota` (the total) + `5 hours` / `24 hours` / `7 days` (the rate limits) | rate limits: the `reset_at` sub2api returns. The quota doesn't reset |
| **Balance group** | the plan and the wallet's balance | none | none |

An expired subscription, a used-up key quota or an expired key shows as an error in the account's usage. A key the site refuses (401) marks the account as needing to sign in again.

## Limitations

- **Balance mode isn't routed on**: a balance has no time window, so magpie only shows it and won't steer away from a key whose wallet is running low.
- **No countdown for the day and month windows**: current upstream sub2api (0.2.14) returns no reset times, so the day and month windows have a length only. The day resets at the next midnight in the server's time zone, and the day and month windows roll over only when next used, so the client can't work the reset out from a window's start, and the plugin doesn't guess. Returning `daily_reset_at` / `monthly_reset_at` is proposed in an upstream PR (pending); once a site runs a sub2api version that returns them, the day and month countdowns appear.
- A key sees only the subscription of the group it is bound to. A subscription to another group on the same user needs its own sign-in with a key bound to that group.
- Signing in again with the same key adds a second account; remove the extra one.

## Compatibility

sub2api **≥ 0.2.14**. The plugin calls only upstream's public endpoints (`/v1/models`, `/backend-api/codex/models`, `/v1/usage`) and relies on no site's own changes. CI runs the end-to-end tests against 0.2.14 and against the latest release.

## Development and tests

```sh
npm test                              # same as ./test/run.sh, sub2api 0.2.14 by default
SUB2API_IMAGE_TAG=latest npm test
```

Needs Docker. The test starts a throwaway sub2api (with Postgres, Redis and a fake Anthropic upstream) and sets up a subscription group, a balance group and a key with its own limits. It sends one request on each key, then calls the plugin's `auth.loader`, `auth.usage` and `provider.models` the way magpie does and checks the results. The stack is taken down with `down -v` whether the tests pass or fail. The plugin's output and the raw upstream replies for each mode are written to `test/artifacts/<tag>/`.

To check by hand with a real magpie against a real site (in a sandbox under `.e2e/`, so your own magpie config is left alone):

```sh
SUB2API_URL=https://api.example.com SUB2API_KEY=sk-... ./e2e.sh
```

For releasing, see [RELEASE.md](./RELEASE.md).

## License

MIT

The plugin's icon is the [sub2api](https://github.com/Wei-Shaw/sub2api) logo (`assets/logo.svg`), which belongs to the sub2api project and is licensed under LGPL-3.0.
