# magpie-mira-relay

A provider plugin that turns a Mirasim-compatible relay deployment — the kind
self-hosted at `mira.renako.cc`, `mira.lxns.org` and similar — into a provider for
[OpenCode](https://opencode.ai) and [magpie](https://usemagpie.ai/docs/zh/plugins).
It signs in with a base URL and an API key, and it reports the deployment's own
quota windows to magpie.

## What it does

- Declares a `mirasim` provider on one API, chosen by a single constant at the
  top of `index.mjs`. These deployments answer on all three, so point it at
  whichever your agents speak — they ship on OpenAI Responses for Codex.
- Asks for a base URL and an API key at sign-in, and checks the key against that
  deployment before saving it.
- Reads the live model list from the deployment, so the picker shows what is
  being served right now.
- Reads the deployment's `/usage` page and reports each quota window — share
  used, and when the window resets — to magpie's quota page, `magpie quota` and
  `GET /v1/magpie/quotas`.

The quota page needs no sign-in, so the numbers come from the base URL alone.
The API key is only ever used to sign model requests.

## Install

As a folder, straight from a clone:

```sh
magpie plugin add ./mirasim-magpie-plugin
```

Or from npm:

```sh
magpie plugin add magpie-mira-relay
```

Then sign in:

```sh
magpie plugin login mirasim
```

In the app: open 插件, add the plugin, then sign in on the `mirasim` row.

## Try it in a sandbox

Keep a plugin you are still writing away from the magpie you use every day by
giving it a home of its own:

```sh
sb=$(mktemp -d)
m() { env HOME=$sb XDG_CONFIG_HOME=$sb/.config XDG_CACHE_HOME=$sb/.cache \
      MAGPIE_ADDR=127.0.0.1:3499 magpie "$@"; }

m plugin add ./mirasim-magpie-plugin
m plugin login mirasim
m provider test mirasim
m quota
```

`m provider test` sends one very small request per API, so it is the quickest
way to tell a bad key from a bad base URL. `m quota` is the usage hook, and it
needs no key at all.

## What it stores

The key is kept by magpie in `plugin-auth.json` (mode 600) under the `mirasim`
provider, in the same shape OpenCode uses, so a sign-in can be moved between
the two. The base URL is kept beside the key in the account's `metadata`; the
quota page is read from that origin.

## Layout

| File | What it holds |
| --- | --- |
| `index.mjs` | The plugin: the provider, sign-in, the request signer, the model list and the usage hook. |
| `package.json` | The package manifest, with magpie's `maxConcurrency` under `magpie`. |

The entry module exports one function and nothing else, so magpie does not
mistake a helper for a plugin.

### Changing the API

A model has exactly one API, and magpie's gateway converts an agent's request
into that shape before the plugin sends it. To serve agents that speak a
different one, change the `API` constant near the top of `index.mjs`:

| `API` | npm | For |
| --- | --- | --- |
| `"responses"` | `@ai-sdk/openai` | Codex, which speaks only Responses |
| `"anthropic"` | `@ai-sdk/anthropic` | Claude Code |
| `"chat"` | `@ai-sdk/openai-compatible` | anything speaking Chat Completions |

The deployment has to answer on the API you pick; `magpie provider test
mirasim` will tell you if it does not.

## License

MIT
