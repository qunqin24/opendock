# MrScraper for OpenCode

MrScraper connects [OpenCode](https://opencode.ai) to a hosted MCP server for
retrieving public web pages as HTML, Markdown, or screenshots, web
search, and account usage. The plugin also includes three focused skills
that help OpenCode choose the right workflow and preserve raw page content.

The same package works in OpenCode 2 and OpenCode 1.

## What this plugin adds

- An MCP server named `mrscraper` that points at the hosted Streamable HTTP
  endpoint `https://mcp.mrscraper.com/mcp`.
- OAuth 2.1 sign-in handled by OpenCode; no credential is stored in this
  package.
- The `mrscraper`, `mrscraper-fetch`, and `mrscraper-serp` skills.
- A retrieve-first workflow that keeps raw page responses available for
  analysis, verification, and follow-up transformations.

If your configuration already defines a `mrscraper` MCP server, the plugin
keeps your entry and only adds the skills. It also leaves any skill with the
same name that you already have in place.

## Requirements

- OpenCode 2 (verified with 2.0.26), or OpenCode 1.18.29 or later (verified
  with 1.18.29 and 1.19.0). On older OpenCode 1 releases, pin
  `@mrscraper/opencode@0.1.0`.
- A [MrScraper](https://app.mrscraper.com) account.
- Permission to access and process the target content.

## Install

### OpenCode 2

```bash
opencode plugin add @mrscraper/opencode
```

This adds the package to `plugins` in your global configuration. To enable it
for one project instead, add it to that project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@mrscraper/opencode"]
}
```

### OpenCode 1

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

OpenCode installs npm plugins when it starts and caches them.

## Sign in

```bash
opencode mcp auth mrscraper
```

In OpenCode 2 you can also run `/mcps` in a session, select `mrscraper`, and
sign in there. OpenCode opens the MrScraper consent page in your browser,
registers its own OAuth client, and stores the tokens outside your project
configuration. Never paste OAuth tokens or API keys into chat.

Check the connection:

```bash
opencode mcp list
```

`mrscraper` shows `needs authentication` before sign-in and `connected`
afterwards.

On a machine without a local browser, use an API key instead (next section).
OpenCode 1 waits for the browser on `http://127.0.0.1:19876/mcp/oauth/callback`,
so you can also forward that port, for example
`ssh -L 19876:127.0.0.1:19876 <host>`.

## Use an API key instead of OAuth

Create a key at [app.mrscraper.com/api-tokens](https://app.mrscraper.com/api-tokens),
export it as `MRSCRAPER_API_KEY` in the environment that starts OpenCode, and
define the server yourself.

OpenCode 2 (`opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@mrscraper/opencode"],
  "mcp": {
    "servers": {
      "mrscraper": {
        "type": "remote",
        "url": "https://mcp.mrscraper.com/mcp",
        "oauth": false,
        "headers": { "Authorization": "Bearer {env:MRSCRAPER_API_KEY}" }
      }
    }
  }
}
```

OpenCode 1 (`opencode.json`):

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
so the key stays out of the file. In OpenCode 2 the substitution happens in the
background service, so the variable must be set where the service starts; after
setting it, run `opencode service restart` from that shell. An API key carries
your full account authority; OAuth scopes do not apply to it.

## Try it

```text
Fetch https://www.scrapethissite.com/pages/simple/ and summarize the page.
```

The server provides these tools. OpenCode 1 shows them as `mrscraper_<tool>`;
OpenCode 2 reaches MCP tools through Code Mode by default.

| Tool | Purpose |
| --- | --- |
| `scraperAPI` | Retrieve a known page as HTML, Markdown, a screenshot, or a combination. |
| `webSearch` | Discover public pages through web search. |
| `status` | Inspect subscription status, token usage, and remaining tokens. |

## Retrieve-first routing

When a public URL is already known, the skills direct OpenCode to retrieve it
with `scraperAPI` first and treat the raw response as the source of truth. The
agent can read, summarize, compare, or derive structured output locally without
losing details.

For roughly 100 known pages with a shared layout, the agent can retrieve pages
concurrently, retain every raw response, and apply one reusable local
extractor.

## Data and permissions

The plugin sends MCP tool inputs, including target URLs and search queries, to
MrScraper's hosted service. Page responses and tool results are then available
to OpenCode and its model provider for the requested task. Use it only with
public or otherwise authorized content, and follow the target site's
requirements.

Review MrScraper's [MCP documentation](https://docs.mrscraper.com/docs/getting-started/mcp-server),
[Privacy Policy](https://mrscraper.com/privacy-policy),
[Acceptable Use Policy](https://mrscraper.com/acceptable-use-policy), and
[Terms of Use](https://mrscraper.com/terms-of-use) before use.

## Update or remove

OpenCode 2 checks unpinned npm plugins for updates without installing them.
Update or remove the plugin with:

```bash
opencode plugin update @mrscraper/opencode
opencode plugin remove @mrscraper/opencode
```

In OpenCode 1, an unpinned entry stays on the version OpenCode first cached.
To control updates, pin a version and change it when you upgrade:

```json
{
  "plugin": ["@mrscraper/opencode@0.3.0"]
}
```

To remove it from OpenCode 1, delete the entry from `plugin`. In either
version, remove the stored OAuth tokens afterwards:

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
index.ts        default export with an OpenCode 2 `setup()` and an OpenCode 1
                `server()`; both register the MCP server and the skills
skills/         MCP-oriented skills, copied verbatim from
                mrscraper-com/mrscraper-claude-plugin (plugins/mrscraper/skills)
```

```bash
npm install
npm run check
npm pack --dry-run
```

Test a local checkout in both majors before a release. In OpenCode 2, add the
checkout's absolute path to `plugins`, then run `opencode mcp list` and
`opencode api skill.list`. In OpenCode 1, add it to `plugin`, then run
`opencode mcp list` and `opencode debug skill`. Record user-visible changes in
[CHANGELOG.md](CHANGELOG.md) and follow [PUBLISHING.md](PUBLISHING.md) for
releases.

## License

[MIT](LICENSE)
