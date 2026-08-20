# Connect OpenCode to CLIProxyAPI

`@projectmarc/opencode-cliproxy-provider` registers an OpenCode provider named **CLIProxyAPI** (`cliproxy`) for an already-running, OpenAI-compatible CLIProxyAPI server. It appears in `/connect` before credentials exist, discovers models from `GET /v1/models`, and uses `@ai-sdk/openai-compatible` for model requests.

This plugin is provider-only. It never starts, stops, installs, or supervises CLIProxyAPI.

> **Important for version 0.2.0 and later:** You do **not** need to export `CLIPROXY_API_KEY` for normal setup. Use `/connect`; OpenCode stores the key. After entering it, **fully quit and restart OpenCode once** before checking `/models`—the discovered models appear after that restart.

## Installation

Choose one path: install it yourself in a few steps, or give the agent guide to an AI agent.

### Minimal human installation

1. Start CLIProxyAPI separately.
2. Add the npm package to the `plugin` array in `opencode.json`:

   ```json
   {
      "$schema": "https://opencode.ai/config.json",
      "plugin": [
        "@projectmarc/opencode-cliproxy-provider"
      ]
   }
   ```

3. Start or fully restart OpenCode.
4. Run `/connect`, select **CLIProxyAPI**, and enter the API key when prompted.
5. Quit and restart OpenCode once. Then run `/models` and select a model under **CLIProxyAPI**.

### Installation with an AI agent

Send this exact raw URL to your agent and ask it to follow the instructions:

```text
https://raw.githubusercontent.com/projectmarc/opencode-cliproxy-provider/main/docs/install-with-agent.md
```

You can also [review the agent installation guide](docs/install-with-agent.md) in this repository.

## Authentication with `/connect`

The plugin registers OpenCode's stable API-key authentication method for `cliproxy`. No exported API key is required:

1. Run `/connect`.
2. Select **CLIProxyAPI**.
3. Enter a CLIProxyAPI API key.
4. Quit and restart OpenCode once, then use `/models`.

OpenCode stores `/connect` credentials in its own local auth store. This plugin does not persist or log them. OpenCode supplies the stored key to model requests.

The first start exposes `cliproxy/auto` as a real bootstrap model, which keeps CLIProxyAPI visible in `/connect`. In OpenCode 1.18.18, the auth loader runs after configuration has already selected the visible models. Saving the key through `/connect` lets the loader refresh the non-secret model catalog, and the next restart loads that catalog. This creates a normal one-restart visibility delay for newly discovered model IDs.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `CLIPROXY_BASE_URL` | OpenAI-compatible API base URL, including `/v1` | `http://127.0.0.1:8317/v1` |
| `CLIPROXY_API_KEY` | Optional compatibility fallback for startup discovery and model requests. `/connect` is the recommended credential path. | Not set |

Example:

```bash
export CLIPROXY_BASE_URL="http://127.0.0.1:8317/v1"
opencode
```

Do not put API keys directly in `opencode.json`. Environment variables and `/connect` avoid committing credentials.

If you choose the optional `CLIPROXY_API_KEY` compatibility path, environment variables belong to the process that launches OpenCode. Quit OpenCode completely after changing one.

The base URL must be an HTTP or HTTPS URL without embedded credentials, a query string, or a fragment. An invalid override stops plugin configuration with a clear error rather than silently connecting to the wrong endpoint.

## Plugin installation and updates

OpenCode automatically installs npm packages listed in `opencode.json` with Bun at startup and caches them locally. You do not need to install this package separately.

OpenCode may reuse a cached package, so publishing a newer plugin version does not guarantee that an existing installation upgrades automatically.

## Model discovery and fallback

The plugin always configures `cliproxy/auto`. CLIProxyAPI handles this special selector, and an explicit user model named `auto` can override its display metadata.

At startup, the plugin first loads the last valid catalog for the normalized base URL, then requests `<base URL>/models` with a three-second timeout. An unprotected endpoint or optional `CLIPROXY_API_KEY` can refresh the current start immediately. Stored `/connect` auth refreshes the cache later in startup for the next restart.

The cache contains only a schema version, normalized base URL, sorted unique model IDs, and timestamp. It is stored under the platform user cache directory in an `opencode/opencode-cliproxy-provider` namespace with private permissions where supported. It never contains API keys, auth objects, headers, or request data. Catalog files are scoped by a hash of the normalized base URL and replaced atomically.

If discovery is rejected, offline, or invalid, OpenCode keeps the last valid catalog plus `auto` and explicit `provider.cliproxy.models` entries. If a cache replacement fails, the prior valid file remains intact while the fresh IDs are still usable for the current start. A successful empty response clears stale discovered IDs while preserving `auto` and explicit models. Authentication failures, HTTP errors, and invalid responses are logged without response bodies or credentials.

For an offline fallback, users may define known models explicitly while keeping the plugin enabled:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@projectmarc/opencode-cliproxy-provider"
  ],
  "provider": {
    "cliproxy": {
      "models": {
        "known-model-id": {
          "name": "Known model"
        }
      }
    }
  }
}
```

Explicit model entries take precedence over discovered entries with the same ID.

## Troubleshooting

### CLIProxyAPI does not appear in `/models`

- Confirm CLIProxyAPI is already running; this plugin does not launch it.
- Request `http://127.0.0.1:8317/v1/models` with your normal local tooling.
- Run `/connect`, select **CLIProxyAPI**, save the key, and fully restart OpenCode once.
- Check that `@projectmarc/opencode-cliproxy-provider` appears in the `plugin` array.
- Newly discovered models normally become visible on the next restart in OpenCode 1.18.18.

### Discovery is rejected

An HTTP 401 or 403 during early startup is expected when `/v1/models` is protected. Use `/connect`; the auth loader refreshes the cache without logging or persisting the key, and the refreshed models appear after one restart. `CLIPROXY_API_KEY` remains an optional compatibility fallback.

### The base URL is rejected

Set `CLIPROXY_BASE_URL` to the API root ending in `/v1`, not to `/v1/models`. Embedded URL credentials and query-string tokens are intentionally rejected.

## Development and local installation

For source development or an unpublished local build:

```bash
git clone https://github.com/projectmarc/opencode-cliproxy-provider.git
cd opencode-cliproxy-provider
npm install
npm run typecheck
npm test
npm run build
```

Then replace the npm package entry in `opencode.json` with an absolute file URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///absolute/path/to/opencode-cliproxy-provider/dist/index.js"
  ]
}
```

Unit tests mock all network access. They do not contact CLIProxyAPI or any external service and do not perform OAuth. `npm run test:smoke` is a separate isolated boundary test that installs exactly `opencode-ai@1.18.18` under its temporary directory, uses temporary HOME/XDG/npm-cache paths, test-only auth content, and a loopback mock server, then removes the temporary installation. `OPENCODE_BIN` remains an optional explicit override and must report version 1.18.18.

## License

MIT. See [LICENSE](LICENSE). The package carries the same compatible MIT notice as the repository root.
