# JEV hosted decisions for Magpie

<img src="icon.svg" width="72" height="72" alt="JEV 托管决策">

[中文说明](README.md)

A [Magpie](https://usemagpie.ai) / [OpenCode](https://opencode.ai) provider plugin that serves the hosted **JEV decide API** ([jevtypesafe.org](https://jevtypesafe.org/zh/docs/api/#decide)) as a **native classifier**.

No patching of Magpie, no local proxy, no npm dependencies.

**JEV is a decision model, not a chat or code-generation model.** Use it as a routing group's classifier, or for Magpie's automatic reasoning effort. The group still needs a real chat model to answer.

## What it does

| | |
|---|---|
| Provider id | `jevtypesafe` |
| Model | `jevtypesafe/jev` |
| Question types | `choice`, `score`, `noul` |
| Upstream | `POST https://jevtypesafe.org/api/v1/decide` |
| Sign-in | your `jv_live_…` API key, kept by Magpie |

Magpie posts each question to `POST {baseURL}/systemone` through the plugin's loader `fetch`; the plugin rewrites that to the JEV `decide` endpoint, adds the bearer key, and returns the upstream `Response` unchanged — status, body and retry headers included.

Not in this version: image assets, `box` questions, batch decide, the confidence `gate`, balance lookup, or any chat-protocol emulation. There are no invented prices, free-tier flags or live balance numbers.

## Install

**One click:** [Install in Magpie](magpie://plugin?name=jevtypesafe-auth) opens the plugin's sheet in Magpie — read it, then press Install.

### From npm (recommended)

```powershell
magpie plugin add jevtypesafe-auth
magpie plugin login jevtypesafe
```

### From a folder

1. Clone this repository and keep the folder where it is — a folder plugin is loaded in place and never copied, so do not move, rename or delete it afterwards.
2. In Magpie, open **Plugins → Add a plugin** and pick that folder (not a ZIP, not a test script).
3. Find the provider **JEV 托管决策** and sign in with your `jv_live_…` key from your jevtypesafe.org account page.
4. Edit your routing group: pick `jevtypesafe/jev` as the intent classifier, keep the group's existing answering models, then set your intent rules.
5. For automatic reasoning effort, use the group's own setting. The chat model in the group still writes the answer.

> **Searching for it inside Magpie may not find it yet.** Magpie's search asks npm for `<query> opencode` and reads 30 results, ranked by weekly downloads, so a brand-new package sits far below the cut. Until it has downloads — or is listed in [magpie-community's registry](https://github.com/magpie-community/plugins) — use the one-click link, the npm name, or this folder.
>
> **A card in Magpie's search results has no icon, and that is Magpie's behaviour, not this package's.** Magpie builds those cards from npm's search answer, which carries no `magpie.icon`; it only reads `magpie.icon` from the package's own metadata, for plugins that are listed in the registry or already installed. The icon does show once the plugin is installed, and on its card in **Discover** after the registry listing lands.

```powershell
magpie plugin add .\magpie-jevtypesafe     # the folder you cloned into
magpie plugin login jevtypesafe
magpie plugin                       # jevtypesafe (JEV 托管决策, 1 model) signed in
magpie provider test jevtypesafe    # one real decide request; it is billed
```

`provider test` sends a real upstream request and spends credits. The key goes into the sign-in prompt, never into a command argument, source file or version control.

Editing the source of a folder plugin: toggle the plugin off and on in Magpie's plugin page to reload it.

## Behaviour

- Only `POST /systemone` for this provider is accepted. Anything else — other hosts, query strings, other paths, `GET` — is refused locally with `400`/`404`/`405` and never reaches the network.
- The upstream model is pinned to `jev` (1× billing). The plugin will not silently switch to a model with a different credit multiplier.
- `state` may be a string, object or array. It is checked against the 8,000-character limit using the JavaScript string length of the compact `JSON.stringify(state)`. Over the limit the plugin returns an explicit error and does **not** truncate your context. This count is stricter than Unicode code points when supplementary-plane characters are present.
- Only `model`, `state` and `questions` are sent upstream. Instructions and criteria inside each question are passed through untouched; finer validation is the server's job.
- Upstream `401`, `402`, `429` and `5xx` responses, their bodies and their retry headers are handed back to Magpie as they came. The plugin never retries on its own, so a failure cannot quietly spend credits twice. Host-side failover still works as you configured it.
- Cancellation propagates upstream. Cookies, other providers' keys and Magpie's internal request headers are never forwarded, and redirects are refused so the key cannot follow one.
- No timers, no balance polling: refreshing the plugin card never spends JEV credits.
- No `auth.usage` hook is declared, because the API documents no balance endpoint. The plugin shows no quota rather than a fabricated one.

## Development

Node.js 22+ for the test scripts. The plugin itself runs on the Bun that Magpie ships. Zero dependencies — no `npm install` needed.

```powershell
npm run check
npm test
npm run test:coverage
```

### Isolated Magpie verification

`npm run verify:magpie` starts a real Magpie in a throwaway `HOME` with its own config, cache, data directory and a random local port. It registers the plugin, boots the gateway, posts a three-question decide request and asserts that the decision model stays out of the chat catalogue and that a chat request to it is refused. The sandbox is removed afterwards, and your real config files are compared by hash before and after without ever being read for secrets.

```powershell
$env:MAGPIE_BIN = 'path\to\magpie-windows-amd64.exe'
$env:MAGPIE_BUN = Join-Path $env:USERPROFILE '.cache\magpie\bun\<version>\magpie-bun.exe'
npm run verify:magpie
```

By default it points the plugin at a local mock upstream and uses a fake key, so nothing is billed.

To re-run the live check against the real service, pass the key through a temporary environment variable — it is written only into the sandbox's auth file and redacted from the report:

```powershell
$secret = Read-Host 'JEV API key' -AsSecureString
$env:JEV_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
try { npm run verify:magpie -- --live } finally { Remove-Item Env:JEV_API_KEY -ErrorAction SilentlyContinue }
```

`--live` bills one three-question decision.

## Verified

- 42 offline tests pass; line, branch and function coverage of the production entry point is 100%.
- An isolated Magpie loaded the plugin, answered a three-question decision over HTTP 200, and refused a chat request to the same model.
- A live isolated run against jevtypesafe.org returned `jev-1.14.0` with results for `choice`, `score` and `noul`.
- The host's real `plugins.json`, `plugin-auth.json`, `providers.json` and `settings.json` were byte-identical before and after the isolated runs.

Interface evidence: the [JEV API reference](https://jevtypesafe.org/zh/docs/api/#decide), [Magpie's plugin docs](https://usemagpie.ai/docs/plugins#decide) and Magpie's own `internal/gateway/plugin_decide_test.go`.

## Uninstall

1. Switch any routing group that uses this classifier back to another one.
2. Remove the plugin in Magpie's plugin page, or `magpie plugin rm <spec>`.
3. Only then delete the folder.

Nothing else in `providers.json` or your other providers needs to be touched.

## License

MIT
