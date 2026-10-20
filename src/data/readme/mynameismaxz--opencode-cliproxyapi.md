# @mynameismaxz/opencode-cliproxyapi

OpenCode plugin that discovers every model exposed by a
[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) instance and registers them
automatically. You do not write any provider or model entries by hand.

On startup the plugin calls CLIProxyAPI's OpenAI-compatible `GET /v1/models` and adds each model
under one provider, **CLIProxyAPI** (id `cliproxyapi`). Pick a model in the model picker, or
reference it as `cliproxyapi/<model-id>`.

Supported hosts: **OpenCode 1.19.3+** and **OpenCode 2.x**, from the same package.
See [docs/compatibility.md](docs/compatibility.md).

> The unscoped npm package `opencode-cliproxyapi` is an unrelated third-party plugin.
> This project is `@mynameismaxz/opencode-cliproxyapi`.

## Install

Add the package name to your OpenCode config. OpenCode downloads and installs it on the next
start; nothing to clone or build.

**OpenCode 1.19.3+** (`opencode.json`):

```json
{ "plugin": ["@mynameismaxz/opencode-cliproxyapi"] }
```

**OpenCode 2.x** (`opencode.json`), or run `opencode plugin add @mynameismaxz/opencode-cliproxyapi`:

```json
{ "plugins": ["@mynameismaxz/opencode-cliproxyapi"] }
```

### From a local build

```sh
bun install && bun run build
```

Then use `/absolute/path/to/this/repo/dist` in place of the package name. Point at `dist/`, not
at the repository root: OpenCode 2 loads local plugins from `<dir>/index.js` and ignores
`package.json`.

## Settings

With CLIProxyAPI running locally on its default port and no API key, nothing else is needed.
Otherwise there are two optional settings.

| Setting | Env var | Option key | Default |
|---------|---------|------------|---------|
| Base URL | `CLIPROXYAPI_BASE_URL` | `baseURL` | `http://localhost:8317` |
| API key | `CLIPROXYAPI_API_KEY` | `apiKey` | none (unauthenticated) |

Environment variables win over options. An empty value counts as unset. The base URL may be
given with or without `/v1`; `http://host:8317`, `http://host:8317/` and `http://host:8317/v1`
are equivalent.

Options in OpenCode 1.19.3+:

```json
{ "plugin": [["@mynameismaxz/opencode-cliproxyapi", { "baseURL": "http://192.168.1.10:8317", "apiKey": "{env:MY_PROXY_KEY}" }]] }
```

Options in OpenCode 2.x:

```json
{ "plugins": [{ "package": "@mynameismaxz/opencode-cliproxyapi", "options": { "baseURL": "http://192.168.1.10:8317", "apiKey": "{env:MY_PROXY_KEY}" } }] }
```

Prefer `{env:VAR}` over pasting a key into the config file.

## What you see when something is wrong

The plugin never stops OpenCode from starting. Discovery gives up after 3 seconds. Other
providers keep working, and exactly one message explains what happened.

| Situation | Message |
|-----------|---------|
| Proxy has no models | `CLIProxyAPI at <url> reports no models. Sign in to an upstream account in CLIProxyAPI and restart.` |
| Key missing or wrong | `CLIProxyAPI at <url> rejected the API key. Set CLIPROXYAPI_API_KEY or the apiKey option.` |
| Proxy down or slow | `CLIProxyAPI at <url> could not be reached (<reason>). Proxied models are unavailable until restart.` |
| Unexpected response | `CLIProxyAPI at <url> returned an unexpected response (<reason>).` |
| Bad base URL | `CLIPROXYAPI_BASE_URL / baseURL is not a valid URL: <value>.` |

On OpenCode 1.19.3+ the message appears as a toast and in the log. On OpenCode 2.x it appears
only with `--print-logs`, because OpenCode 2 does not show server-plugin output in the TUI.
The API key never appears in any message.

## Model defaults

CLIProxyAPI's model list carries ids only. Every model is registered with a 200,000-token
context window, 32,000 output tokens and tool calling enabled. These match OpenCode 2's own
model defaults. Models appear in the order the proxy reports them, with duplicates removed.
If you define a `cliproxyapi` provider yourself, your entries win and discovery only adds
models you did not list.

## Development

```sh
bun test                       # unit + contract tests (mock CLIProxyAPI, no network)
./scripts/install-hosts.sh     # installs OpenCode 1.19.3 and 2.0.32 into .hosts/
bun run test:integration       # runs both real hosts against the mock proxy
bun run mock-proxy --fixture models.json --port 8317   # manual testing
```

Integration tests run each host with an isolated `HOME`/`XDG_*`, so your real OpenCode
configuration is never read or modified.

## Releasing

Releases are published to npm by `.github/workflows/release.yml` when a `v*` tag is pushed. The
tag must match `version` in `package.json`. The workflow runs the type check, unit, contract and
both host integration suites before publishing with npm provenance.

Authentication, either one:

- **Trusted publishing (preferred):** on npmjs.com, open the package settings and add a trusted
  publisher for GitHub Actions with this repository and the workflow file `release.yml`.
- **Token:** store a granular npm token that can publish this package as the repository secret
  `NPM_TOKEN`.

The very first version has to be published by hand (`npm login`, then `npm publish`), because
trusted publishing is configured on an existing package. `prepublishOnly` runs the type check,
build and tests first.
