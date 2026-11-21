# Datacircle tools for OpenCode

Find the best GTM APIs. We benchmark all the GTM APIs and we put the results on our website.

https://datacircle.dev

This plugin gives [OpenCode](https://github.com/anomalyco/opencode) four tools that call Datacircle's public API, https://api.datacircle.dev/v1. You need no key and no account.

| Tool | What the tool gives | Call |
| --- | --- | --- |
| `datacircle_list_apis` | Every GTM API on Datacircle, with the API's slug, number of plans, number of providers and best plan | `GET /apis` |
| `datacircle_best_plans` | One API's plans, sorted by score out of 100, best first. Each plan comes with a rank and a price per 1,000 calls | `GET /apis/{slug}/best` |
| `datacircle_search_plans` | Plans that match a provider name or plan name. Search all APIs or one API. Sort the plans by score, provider or price | `GET /plans` |
| `datacircle_provider` | The APIs a provider sells, and the provider's rank on each API | `GET /providers/{slug}` |

## Install

Add the plugin to `opencode.json`. On OpenCode 2:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@datacircle/opencode"]
}
```

Or add the plugin to your global config:

```bash
opencode plugin add @datacircle/opencode
```

OpenCode 1 reads `plugin`, from version 1.18.29:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@datacircle/opencode"]
}
```

Or run `opencode plugin @datacircle/opencode` in your project. OpenCode installs the package from npm the next time OpenCode starts.

## Ask OpenCode

```bash
opencode run "Which plan is best for the email-finder API on Datacircle?"
```

OpenCode 2 puts a plugin's tools in Code Mode by default. The agent writes a short script for the `execute` tool, and the script calls the tools:

```js
const best = await tools.datacircle.best_plans({ slug: 'email-finder', limit: 3 });
return best.plans.map((plan) => `${plan.rank}. ${plan.provider}: ${plan.plan}`);
```

Each tool gives the script the tool's result as an object. The four tools are `tools.datacircle.list_apis`, `best_plans`, `search_plans` and `provider`.

When your permissions deny `execute`, OpenCode 2 gives the agent the tools by name, like `datacircle_best_plans`:

```json
{
  "permissions": [{ "action": "execute", "resource": "*", "effect": "deny" }]
}
```

OpenCode 1 always gives the agent the tools by name.

## What the tools return

Each tool returns a JSON object. `best_plans` and `search_plans` return plans. Each plan has a rank, provider, plan name, score, price per 1,000 (`perThousand`, in dollars) and a page on datacircle.dev. The page on datacircle.dev lists every field. An unknown slug returns `{"error": "..."}` with the API's own message. A wrong argument does too. The agent can then call again. On a network failure, the tool fails with the error's message.

## Network

Each tool call makes one HTTPS GET request to https://api.datacircle.dev/v1 and nothing else. The request holds only the tool's own arguments: no key and nothing from your sessions or config. The API takes up to 60 calls a minute from one IP address. The tool waits once, for a minute at most, when the API asks the tool to wait. The plugin stores nothing.

## Links

- Datacircle: https://datacircle.dev
- The API: https://datacircle.dev/api
- The API's spec: https://api.datacircle.dev/v1/openapi.json
- What each key means: https://datacircle.dev/fields

MIT license.
