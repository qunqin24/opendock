# Search1API for Magpie

Search1API web search, news, agentic search, page retrieval, sitemap discovery,
and trending tools in [Magpie](https://usemagpie.ai/), with browser OAuth and
API key sign-in. The plugin uses the official
[`@search1api/client`](https://github.com/superagents-lab/search1api-js)
TypeScript SDK.

## Install

In Magpie, open **Plugins → Add plugin** and enter:

```text
magpie-search1api
```

Or use the terminal:

```sh
magpie plugin add magpie-search1api
```

You can also install directly from GitHub:

```sh
magpie plugin add github:superagents-lab/magpie-search1api
```

Both the npm package and repository include the TypeScript entry, so no build
is required during installation. Magpie runs it with Bun and installs its npm
dependencies.

## Sign in

### OAuth (recommended)

Choose **Search1API → Sign in to Search1API** in the plugin's sign-in controls,
or run:

```sh
magpie plugin login search1api oauth
```

Magpie opens your browser. Sign in with your Search1API account and approve
access, then return to Magpie. The plugin uses a dynamically registered public
OAuth client, authorization code flow with PKCE S256, and a temporary loopback
callback. No client secret or Search1API CLI is required.

The browser must run on the same computer as Magpie. For a remote or container
installation, use an API key instead. The callback expires after five minutes.

Magpie saves access and refresh tokens in `plugin-auth.json` under its config
directory (`~/.config/magpie`, or `$XDG_CONFIG_HOME/magpie`) with file mode
`0600`. The plugin reads only its own `search1api` entry and saves refreshed
tokens through Magpie's `client.auth.set`; it does not maintain a second token
store. Tool calls refresh expiring tokens and retry once after an OAuth `401`.
Refreshes are serialized across simultaneous calls and Magpie processes.

Search1API appears as a sign-in entry with **no chat models**. It authenticates
the tools, not a model provider. One Search1API account is active at a time;
signing in again replaces it.

To remove the saved sign-in:

```sh
magpie plugin logout search1api
```

This removes the local credentials. It does not revoke an authorization at the
authorization server or remove API keys configured separately below.

### API key

Choose **Search1API API key** in the same sign-in controls, or run:

```sh
magpie plugin login search1api api
```

Magpie prompts privately for the key and saves it in its credential store.
Get a key at [s1.dev](https://s1.dev/).

For automated deployments, the plugin also accepts an `apiKey` plugin option
in Magpie's options editor, or `SEARCH1API_API_KEY` in the environment of the
Magpie process. Precedence: plugin option → environment → Magpie sign-in.
An option or environment key overrides a saved OAuth account. `SEARCH1API_KEY`
and the CLI's `s1 login` session are not read.

`baseUrl` is an optional API base URL for a compatible deployment or local
testing. It defaults to `https://api.search1api.com`. HTTPS is required, except
for loopback test servers. OAuth discovery uses that API's protected-resource
metadata and validates the issuer and endpoints.

## Connect your agent

In **Settings → Plugins**, copy the plugin tools MCP address, then add it to
your agent's MCP configuration. The default address is:

```text
http://127.0.0.1:3425/mcp/magpie/tools
```

For Claude Code:

```sh
claude mcp add --transport http magpie-tools \
  http://127.0.0.1:3425/mcp/magpie/tools
```

Other agents use the same Streamable HTTP endpoint. Use the address Magpie
shows if the port or host differs. Remote calls require a Magpie gateway key;
this is separate from your Search1API credential.

Installing the plugin does not write your agent's MCP configuration or replace
its built-in search tool. Magpie exposes tools from all enabled tool plugins
on this endpoint.

## Tools

Magpie prefixes each tool with the plugin name, e.g.
`magpie-search1api_search` when installed by this package name.

- `search`: web search, engine selection, site filters, date range and native
  pagination. Page selection works on engines that support it.
- `news`: news search with optional article content.
- `ask`: describe what to find; Search1API chooses engines and a time window
  and returns ranked results. Each completed call costs **5 credits**. It
  returns search results rather than a generated answer.
- `crawl`: retrieve readable page content.
- `sitemap`: discover site links.
- `trending`: GitHub or Hacker News trends.

Tool parameters follow the existing OpenCode integration. Search and news
preserve optional `published_date` and per-result `metadata`; Ask preserves
`intent`, `source`, `relevance`, and `errors`. Attribute Grokipedia results as
“Powered by xAI”. Results are returned as JSON text.

Magpie gives tools a 55-second deadline. Cancellation is forwarded to the SDK.
Automatic SDK retries are disabled to keep calls within that deadline; OAuth
authentication is retried once after refreshing. Other upstream errors return
to the calling agent.

## Development

```sh
npm ci --ignore-scripts
npm test
npm pack --dry-run
```

Build output is only for local Node tests. The installable package contains
the source entry and does not depend on an install-time build.

The integration tests run Magpie's actual Bun plugin host against a local
OAuth/API fixture. They exercise native login and credential storage, schema
validation, tool execution, refresh across host processes and logout. No real
credentials, browser interaction or paid Search1API requests are used:

```sh
MAGPIE_HOST_PATH=/path/to/magpie/internal/plugin/host.js \
MAGPIE_BUN_PATH=/path/to/bun npm run test:magpie
```

CI pins the host revision it tests. For a full application smoke test, use a
separate config directory:

```sh
MAGPIE_SANDBOX=$(mktemp -d)
m() {
  env XDG_CONFIG_HOME="$MAGPIE_SANDBOX/config" \
    XDG_CACHE_HOME="$MAGPIE_SANDBOX/cache" \
    MAGPIE_ADDR=127.0.0.1:3499 magpie "$@"
}
m plugin add "$PWD"
m plugin --json
m plugin login search1api oauth
# Configure an agent with http://127.0.0.1:3499/mcp/magpie/tools.
m plugin logout search1api
```

## Release and discovery

The GitHub repository has the `magpie-plugin` topic for discovery in Magpie.
`registry-entry.json` contains a proposed community market entry with
`kind: "tools"`; listing requires a PR to
[magpie-community/plugins](https://github.com/magpie-community/plugins).

The Release workflow uses npm trusted publishing. An npm maintainer must
configure the package's GitHub Trusted Publisher for
`superagents-lab/magpie-search1api`, workflow `release.yml`, environment `npm`,
with direct publishing allowed. Subsequent GitHub releases named `v<version>`
can then publish through the workflow. A version already published manually is
left in place. GitHub installation is available independently of npm
publication and community listing.

## License

MIT
