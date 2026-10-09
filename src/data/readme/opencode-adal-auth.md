# Adal

[简体中文](./README.zh-CN.md) · [npm](https://www.npmjs.com/package/magpie-adal) · [GitHub](https://github.com/raythunder/magpie_adal)

A [Magpie](https://usemagpie.ai) provider plugin that uses your locally installed, signed-in [AdaL CLI](https://adal.sylph.ai). Package: `magpie-adal`. Provider id: `adal`.

It uses Magpie's supported OpenCode v1 plugin format, with no runtime dependencies and no additional HTTP server to manage. AdaL keeps its own credentials; Magpie stores only a local connection marker.

## Install

Install AdaL CLI **1.9.0 or newer**, run `adal` in a terminal, and complete its sign-in first. Real model and quota requests have been verified with AdaL 1.9.0 and Magpie 0.1.1130.

In Magpie, open **Plugins → Add plugin** and enter:

```text
magpie-adal
```

Or use Magpie's CLI:

```sh
magpie plugin add magpie-adal
magpie plugin login adal
magpie provider test adal default
```

You can also install from GitHub:

```sh
magpie plugin add github:raythunder/magpie_adal
```

For local development, clone into a folder named `Adal` and add that folder:

```sh
git clone https://github.com/raythunder/magpie_adal.git Adal
magpie plugin add "$PWD/Adal"
```

For folder installs, the first line in Magpie's plugin list is the folder name; the second line is the provider name, **Adal**. An npm install may show the package name. Friendly names in Magpie's official market come from its market registry; this project is distributed separately.

On macOS, if `magpie` is not in PATH, replace it with `/Applications/magpie.app/Contents/MacOS/magpie`. After changing local plugin files or refreshing the model catalog, turn the plugin off and back on in the app.

## Sign in

Select **Use local AdaL CLI sign-in** for the **Adal** provider. This checks the existing CLI sign-in without sending a model query. It does not ask for an API key or copy AdaL tokens.

Magpie saves a local connection marker in `plugin-auth.json`. AdaL handles authentication and renewal. Signing out of this provider does not sign out of AdaL.

All accounts added through this plugin share the same local AdaL sign-in; independent multiple accounts are not supported.

## Models

Select `adal/default` to use AdaL's default model, or `adal/<model-key>` for a specific model. Model keys and display names come from `~/.adal/model_catalog.json`; actual availability depends on your AdaL account and allowance.

Run `adal` to refresh the catalog. Keys outside that catalog are rejected before starting a request. AdaL can acknowledge a failed model switch as successful, so a catalog-listed key cannot guarantee detection of a silent fallback.

## Requests and tools

Magpie converts client requests to Chat Completions. The plugin runs `adal --sdk-runtime` and translates its SDK v1 NDJSON events into JSON responses or SSE. The configured API URL is an identifier, not a separate listening server.

- Text conversations include system/developer instructions, assistant history, and tool results.
- Requests without tools stream incremental text. Each request starts a fresh AdaL session with the complete supplied conversation.
- External tools use a prompted JSON bridge. The plugin validates tool names and JSON arguments, then returns standard `tool_calls` for the calling agent to execute. Business-level argument validation remains the caller's responsibility.
- `auto`, `none`, `required`, a specific function, and disabling parallel tool calls are supported. Tool responses are buffered until the complete JSON is validated; their SSE is not incremental text streaming. Reliability depends on the model following the JSON instructions.
- AdaL's internal tools are disabled, permission requests are denied, and each request runs in a temporary workspace rather than the client's project. The plugin never uses `--yolo`.
- Request aborts, response-body cancellation, timeouts, and process cleanup are supported.

Images, audio, and video are unsupported. Sampling controls such as `temperature`, `top_p`, `max_tokens`, `stop`, `seed`, `response_format`, and reasoning settings are not forwarded; AdaL's own model configuration applies. The plugin does not invent token usage or costs.

## Usage

Magpie's provider quota panel shows the plan, weekly usage percentage, weekly reset time, and wallet balance. You can also query:

```sh
magpie quota adal
magpie quota adal --json
```

Quota lookup starts a short-lived authenticated SDK process, locates only its process group's local backend, reads `/auth/usage`, and closes the process. It sends no model query and does not read or copy login tokens. It requires AdaL **1.9.0+** and `lsof`: included with macOS, separately installed on Linux. Windows quota lookup is currently unsupported.

Wallet balance uses the same `$` unit as AdaL's `/usage` dialog. A `$0.00` wallet does not mean the included weekly allowance is exhausted. Usage covers the entire AdaL account, including direct CLI use; monthly totals are not estimated.

The weekly window is informational, so it does not disable every model when exhausted: BYOAK or connected subscriptions may still work. Failed lookups show an error instead of zero usage, and only authentication rejection marks the sign-in expired.

## Options

Usually no options are needed. Magpie's plugin options accept:

```json
{
  "cliPath": "/absolute/path/to/adal",
  "timeoutMs": 300000
}
```

CLI resolution: `cliPath` → `ADAL_RUNTIME_PATH` → `~/.adal/bin/adal` → `adal` on PATH. `cliPath` is an executable path, not a shell command. `timeoutMs` must be an integer of at least 1000; the default is five minutes. Default account concurrency is one, request size is capped at 4 MiB, and SDK output at 16 MiB.

AdaL inherits the local environment. Magpie's provider proxy settings are not automatically applied to the CLI. Temporary workspaces are removed, but AdaL may retain session records in `~/.adal/sessions`.

## Development

Node.js **22+** is required for the development scripts. No `npm install` is necessary; Magpie loads the plugin using Bun.

```sh
npm test
npm run test:magpie
npm run test:quota
npm pack --dry-run
```

`test:magpie` uses a fake AdaL executable in isolated HOME/XDG directories without changing your existing Magpie configuration. Set `MAGPIE_BIN` for a different executable location. `test:quota` uses your actual AdaL account without sending a model query.

Live model checks send three small queries and consume your AdaL allowance:

```sh
npm run test:live
ADAL_TEST_MODEL=<model-key> npm run test:live
```

They cover sign-in, SSE, external tool calls, and a follow-up conversation containing tool results; returned tools are not executed. The integration uses AdaL SDK internals, so run these checks after upgrading AdaL.

Based on the [Magpie plugin documentation](https://usemagpie.ai/docs/zh/plugins), [community plugin examples](https://github.com/magpie-community/plugins), and AdaL's [SDK reference](https://docs.sylph.ai/integration/sdk/api-reference), [models](https://docs.sylph.ai/getting-started/models), and [pricing and usage](https://docs.sylph.ai/getting-started/pricing-and-usage). Protocol and quota fields were also checked against the locally installed CLI source.

## License

[MIT](./LICENSE).
