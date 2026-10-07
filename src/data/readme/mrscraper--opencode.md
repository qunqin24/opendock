# MrScraper for OpenCode

MrScraper connects [OpenCode](https://opencode.ai) to a hosted MCP server for
fetching public web pages, managed structured extraction, Google discovery,
saved scraper reruns, stored results, and account usage. The plugin also
includes four focused skills that help OpenCode choose the right workflow and
preserve raw page content.

## What this plugin adds

- An MCP server named `mrscraper` that points at the hosted Streamable HTTP
  endpoint `https://mcp.mrscraper.com/mcp`.
- OAuth 2.1 sign-in handled by OpenCode; no credential is stored in this
  package.
- The `mrscraper`, `mrscraper-fetch`, `mrscraper-scrape`, and `mrscraper-serp`
  skills, loaded on demand through OpenCode's `skill` tool.
- A fetch-first workflow that keeps raw page responses available for analysis,
  verification, and follow-up transformations.

If your configuration already defines `mcp.mrscraper`, the plugin keeps your
entry and only adds the skills.

## Requirements

- [OpenCode](https://opencode.ai/docs/) (verified with 1.18.34).
- A [MrScraper](https://app.mrscraper.com) account.
- Permission to access and process the target content.

## Install

```bash
opencode plugin @mrscraper/opencode --global
```

Or add the package to the `plugin` list in `~/.config/opencode/opencode.json`
(all projects) or a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@mrscraper/opencode"]
}
```

OpenCode installs npm plugins when it starts and caches them under
`~/.cache/opencode/packages/`.

## Sign in

```bash
opencode mcp auth mrscraper
```

OpenCode opens the MrScraper consent page and waits up to five minutes for the
browser to return to `http://127.0.0.1:19876/mcp/oauth/callback`. It requests
the `scrape:read`, `scrape:write`, and `account:read` scopes advertised by the
server, plus `offline_access` for token refresh, and stores the tokens in
`~/.local/share/opencode/mcp-auth.json`. Never paste OAuth tokens or API keys
into chat.

On a remote machine, open the printed URL in a local browser after forwarding
the callback port, for example `ssh -L 19876:127.0.0.1:19876 <host>`, or use
an API key instead.

Check the connection:

```bash
opencode mcp list
```

`mrscraper` shows `needs authentication` before sign-in and `connected`
afterwards.

## Use an API key instead of OAuth

Create a key at [app.mrscraper.com/api-tokens](https://app.mrscraper.com/api-tokens),
export it as `MRSCRAPER_API_KEY` in the environment that starts OpenCode, and
define the server yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@mrscraper/opencode"],
  "mcp": {
    "mrscraper": {
      "type": "remote",
      "url": "https://mcp.mrscraper.com/mcp",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:MRSCRAPER_API_KEY}"
      }
    }
  }
}
```

OpenCode substitutes `{env:MRSCRAPER_API_KEY}` when it loads the configuration,
so the key stays out of the file. An API key carries your full account
authority; OAuth scopes do not apply to it.

## Try it

```text
Fetch https://www.scrapethissite.com/pages/simple/ and summarize the page.
```

OpenCode prefixes MCP tools with the server name:

| Tool | Purpose |
| --- | --- |
| `mrscraper_fetch` | Retrieve and preserve a known page's raw response. |
| `mrscraper_scrape` | Run managed structured extraction or bounded site mapping. |
| `mrscraper_serp` | Discover public pages through Google. |
| `mrscraper_rerun` | Reuse a saved AI or manual scraper configuration. |
| `mrscraper_results` | Browse and filter stored result records. |
| `mrscraper_result` | Retrieve one stored result or poll an asynchronous run. |
| `mrscraper_status` | Inspect subscription usage and request outcomes. |

To keep the tools out of every session, add `"tools": { "mrscraper_*": false }`
to your configuration and enable them per agent; see
[MCP servers](https://opencode.ai/docs/mcp-servers/#manage).

## Fetch-first routing

When a public URL is already known, the skills direct OpenCode to fetch it
first and treat the raw response as the source of truth. The agent can read,
summarize, compare, or derive structured output locally without losing details
to an early extraction prompt.

For roughly 100 known pages with a shared layout, the agent can fetch pages
concurrently, retain every raw response, and apply one reusable local extractor
instead of requesting 100 separate backend-LLM extractions. Use `scrape` when
managed extraction is explicitly requested or has a clear benefit after the page
structure and desired schema are understood.

## Data and permissions

The plugin sends MCP tool inputs, including target URLs and extraction
instructions, to MrScraper's hosted service. Page responses and tool results are
then available to OpenCode and its model provider for the requested task.
Managed general and listing extraction sends page content and the extraction
prompt to a backend language model and saves a reusable scraper configuration;
reruns create new stored results. Use it only with public or otherwise
authorized content, and follow the target site's requirements.

Review MrScraper's [MCP documentation](https://docs.mrscraper.com/docs/getting-started/mcp-server),
[Privacy Policy](https://mrscraper.com/privacy-policy),
[Acceptable Use Policy](https://mrscraper.com/acceptable-use-policy), and
[Terms of Use](https://mrscraper.com/terms-of-use) before use.

## Update or remove

An unpinned entry stays on the version OpenCode first cached. To control
updates, pin a version and change it when you upgrade:

```json
{
  "plugin": ["@mrscraper/opencode@0.1.0"]
}
```

To remove MrScraper, delete the entry from `plugin`, then remove the stored
OAuth tokens:

```bash
opencode mcp logout mrscraper
```

You can also revoke access under Connected applications in your MrScraper
account.

## Support and security

- Product help: [MrScraper MCP documentation](https://docs.mrscraper.com/docs/getting-started/mcp-server)
- Bugs and feature requests: [GitHub Issues](https://github.com/mrscraper-com/mrscraper-opencode-plugin/issues)
- Account help: [support@mrscraper.com](mailto:support@mrscraper.com)
- Security reports: see [SECURITY.md](SECURITY.md)

## Development

```text
index.ts        registers the MCP server and the skills directory
skills/         MCP-oriented skills, copied verbatim from
                mrscraper-com/mrscraper-claude-plugin (plugins/mrscraper/skills)
```

```bash
npm install
npm run check
npm pack --dry-run
```

Test a local checkout by adding its absolute path to `plugin` in an OpenCode
configuration, then run `opencode mcp list` and `opencode debug skill`. Record
user-visible changes in [CHANGELOG.md](CHANGELOG.md) and follow
[PUBLISHING.md](PUBLISHING.md) for releases.

## License

[MIT](LICENSE)
