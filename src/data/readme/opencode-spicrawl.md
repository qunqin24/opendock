# Spicrawl agent plugins: web scraping for Claude Code, Cursor, Codex and Gemini CLI

[![smithery badge](https://smithery.ai/badge/spicrawl/web-scraper)](https://smithery.ai/servers/spicrawl/web-scraper)

**How do I give Claude Code, Cursor, Codex or Gemini CLI web scraping?** Connect the agent to
Spicrawl's hosted [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server at
`https://mcp.spicrawl.com/mcp`. This repository packages that connection as a plugin or extension
for each tool, so setup is one install command plus an API key from <https://app.spicrawl.com>.
Through the full server the agent gets 24 `spicrawl_*` tools: fetch a web page as clean Markdown
(or HTML, text or JSON), render pages that need JavaScript, extract fields with CSS selectors, run
batch jobs over lists of URLs, keep login sessions, and read its own request history and usage. For
Claude Code, run `claude plugin marketplace add OfficialSpicrawl/agent-plugins && claude plugin install spicrawl@spicrawl-plugins`.
For Gemini CLI, run `gemini extensions install https://github.com/OfficialSpicrawl/agent-plugins`.
Cursor and Codex are in the table below.

Spicrawl's plugins for coding agents and workflow tools, in one repository. For coding agents it
connects the agent to the hosted Spicrawl MCP server and, in the tools that support it, gives the
agent a skill that explains how to use it. For Dify and n8n it adds Spicrawl as a plugin or node
that calls the Spicrawl API from a workflow.

Spicrawl is a web scraping API for AI agents. Through the MCP server an agent can:

- scrape a web page to Markdown, HTML, text or JSON;
- run batch jobs over lists of URLs;
- keep persistent login sessions (cookies and storage);
- read its request history and its usage;
- search Spicrawl's docs.

## Supported tools

Each tool needs a Spicrawl API key; see [Get an API key](#get-an-api-key) and the section for your
tool under [Install](#install).

| Tool | Install | What you get |
|---|---|---|
| Claude Code | `claude plugin marketplace add OfficialSpicrawl/agent-plugins && claude plugin install spicrawl@spicrawl-plugins` | plugin (MCP server + skill); Claude Code asks for the key when you enable it |
| Cursor | `git clone https://github.com/OfficialSpicrawl/agent-plugins.git && mkdir -p ~/.cursor/plugins/local && cp -r agent-plugins/plugins/spicrawl ~/.cursor/plugins/local/spicrawl` | plugin (MCP server + skill); restart Cursor, then set `SPICRAWL_API_KEY` under Plugins, Configure |
| Codex | `codex plugin marketplace add OfficialSpicrawl/agent-plugins` | plugin (skill + MCP server entry), in OpenAI's portable format; then install `spicrawl` from `/plugins`. The key goes in your Codex config (see [ChatGPT and Codex](#chatgpt-and-codex)) |
| ChatGPT | not in the directory yet | the same plugin, connecting through OAuth at `/chatgpt/mcp` once that endpoint is live (see [ChatGPT and Codex](#chatgpt-and-codex)) |
| Gemini CLI | `gemini extensions install https://github.com/OfficialSpicrawl/agent-plugins` | extension (MCP server + context file); asks for the key as a setting |
| OpenCode | `"plugin": ["opencode-spicrawl"]` in `opencode.json` | npm plugin `opencode-spicrawl` (adds the MCP server); reads `SPICRAWL_API_KEY` |
| Factory Droid | `droid plugin marketplace add OfficialSpicrawl/agent-plugins && droid plugin install spicrawl@spicrawl-plugins --scope user` | plugin (MCP server + skill); reads `SPICRAWL_AUTH` |
| GitHub Copilot CLI | `copilot plugin marketplace add OfficialSpicrawl/agent-plugins && copilot plugin install spicrawl@spicrawl-plugins` | plugin (skill), plus one command for the MCP server (see [GitHub Copilot CLI](#github-copilot-cli)) |
| Devin | `devin plugins install --local ./plugins/spicrawl` | plugin (MCP server + skill), run from a clone of this repository |
| Dify | Plugins, Marketplace, search "Spicrawl" | plugin (Scrape, Extract and Batch scrape tools), from the [Dify Marketplace](https://marketplace.dify.ai/plugin/spicrawl/spicrawl) |
| n8n | `npm install n8n-nodes-spicrawl` in `~/.n8n/nodes`, or Settings, Community Nodes, Install | community node `n8n-nodes-spicrawl` (Scrape URL and Batch Scrape), on npm; source in [OfficialSpicrawl/n8n-nodes-spicrawl](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl) |
| Any tool that reads Agent Skills | `npx skills add OfficialSpicrawl/agent-plugins` | the skill only |
| Any MCP client | `https://mcp.spicrawl.com/mcp` (Streamable HTTP, header `Authorization: Bearer <key>`) | the MCP server, by hand |

## Where to find Spicrawl

- Dify Marketplace: <https://marketplace.dify.ai/plugin/spicrawl/spicrawl>
- Smithery: <https://smithery.ai/servers/spicrawl/web-scraper>
- Cursor Directory: <https://cursor.directory/plugins/spicrawl>
- npm: [`@spicrawl/mcp`](https://www.npmjs.com/package/@spicrawl/mcp) (the MCP server),
  [`opencode-spicrawl`](https://www.npmjs.com/package/opencode-spicrawl) and
  [`n8n-nodes-spicrawl`](https://www.npmjs.com/package/n8n-nodes-spicrawl)
- Official MCP Registry: [`io.github.OfficialSpicrawl/mcp`](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.OfficialSpicrawl/mcp)
- Glama: <https://glama.ai/mcp/connectors/com.spicrawl.mcp>

## Get an API key

Create a key at <https://app.spicrawl.com>. Keys look like `spicrawl_live_...` or
`spicrawl_test_...`. The usage tools (`spicrawl_usage`, `spicrawl_usage_summary`,
`spicrawl_usage_reconciliation`) need a key with the `read` scope.

Never commit a key. None of the files in this repository contain one.

## Install

The MCP server is `https://mcp.spicrawl.com/mcp` (Streamable HTTP). It authenticates with the
header `Authorization: Bearer <key>`. This endpoint does not use OAuth. (ChatGPT uses a separate
OAuth endpoint, `https://mcp.spicrawl.com/chatgpt/mcp`; see [ChatGPT and Codex](#chatgpt-and-codex).)
Each tool below takes the key in the way its plugin format allows.

### Claude Code

```sh
claude plugin marketplace add OfficialSpicrawl/agent-plugins
claude plugin install spicrawl@spicrawl-plugins
```

Claude Code asks for the API key when the plugin is enabled and stores it as a sensitive value.

### ChatGPT and Codex

OpenAI's plugin lives in its own folder, [`plugins/spicrawl-openai`](plugins/spicrawl-openai), in
OpenAI's portable (Agent Plugins) format: a root `plugin.json`, an `mcp.json`, a `skills/` folder
and `assets/`. That format has no field for a key, so the plugin carries none.

```sh
codex plugin marketplace add OfficialSpicrawl/agent-plugins
```

Then run `/plugins` in Codex, pick the `Spicrawl` marketplace and install `spicrawl`. This installs
the `fetch-web-pages` skill and declares the Spicrawl MCP server, but Codex cannot give that
declaration your key. The plugin's own declaration points at the ChatGPT endpoint
(`/chatgpt/mcp`, OAuth, a restricted set of tools), not at the full `/mcp` server. To use your API
key and every tool, add the server yourself in `~/.codex/config.toml`, with the key read from the
environment, and switch off the plugin's own copy of it:

```toml
[mcp_servers.spicrawl]
url = "https://mcp.spicrawl.com/mcp"
bearer_token_env_var = "SPICRAWL_API_KEY"

[plugins."spicrawl@spicrawl-plugins".mcp_servers.spicrawl]
enabled = false
```

```sh
export SPICRAWL_API_KEY=spicrawl_live_...   # in the shell you start Codex from
```

ChatGPT: the plugin is not in the ChatGPT directory yet. ChatGPT cannot send a custom API key, so
it does not use `/mcp`. It connects through OAuth at `https://mcp.spicrawl.com/chatgpt/mcp` once
that endpoint is live: you sign in to your Spicrawl account and approve the connection, and no key
is pasted into ChatGPT. That endpoint offers a restricted set of tools: `spicrawl_scrape` (GET
requests only), `spicrawl_batch_submit`, `spicrawl_batch_status`, `spicrawl_batch_results` (up to
25 URLs per job) and `spicrawl_docs_search` and `spicrawl_docs_read`. Until it is live, ChatGPT
cannot connect.

### Cursor

Install the `spicrawl` plugin, then give it your key: in Cursor open Plugins, Configure on
Spicrawl, and set `SPICRAWL_API_KEY`. The plugin declares it as a required variable, and Cursor
substitutes it into the `Authorization` header of the MCP server. It is a plugin variable that you
set in Cursor, not a shell environment variable.

Until the plugin is listed in the Cursor marketplace, copy `plugins/spicrawl` to
`~/.cursor/plugins/local/spicrawl` and restart Cursor.

To skip the plugin and add only the server, put this in `~/.cursor/mcp.json`. Here the key does
come from the environment Cursor is started from, so export it first:

```sh
export SPICRAWL_API_KEY=spicrawl_live_...
```

```json
{
  "mcpServers": {
    "spicrawl": {
      "url": "https://mcp.spicrawl.com/mcp",
      "headers": { "Authorization": "Bearer ${env:SPICRAWL_API_KEY}" }
    }
  }
}
```

### OpenCode

```sh
export SPICRAWL_API_KEY=spicrawl_live_...
```

Then add the plugin to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spicrawl"]
}
```

The plugin (source in [`opencode/`](opencode), on npm as
[`opencode-spicrawl`](https://www.npmjs.com/package/opencode-spicrawl)) adds the Spicrawl remote
MCP server to OpenCode's config in memory, with OAuth off and the key from `SPICRAWL_API_KEY` as
the bearer token. It writes nothing to your config files. Without the key it adds nothing and logs
a warning. A `mcp.spicrawl` entry that you write by hand wins over the plugin. It installs no
skill. Check the connection with `opencode mcp list`.

### Factory Droid

```sh
export SPICRAWL_AUTH="Bearer spicrawl_live_..."   # the whole header value, including "Bearer "
droid plugin marketplace add OfficialSpicrawl/agent-plugins
droid plugin install spicrawl@spicrawl-plugins --scope user
```

Droid expands `${SPICRAWL_AUTH}` from the shell environment when it connects. OAuth is disabled
for this server in the plugin's `mcp.json`.

### Devin

Add it as a personal plugin. In Devin Cloud: Customize, Plugins, Add plugin, then "From repository"
(this repository, subdirectory `plugins/spicrawl`) or "Upload .zip" (a zip of `plugins/spicrawl`).
Locally: `devin plugins install --local ./plugins/spicrawl`. Then connect the
`SPICRAWL_AUTHORIZATION` credential from the plugin's Connect button; its value is the whole header
value: `Bearer spicrawl_live_...`. The manifest is `plugins/spicrawl/.devin-plugin/plugin.json`.

To reference the plugin from your own Devin plugin manifest, use a `git-subdir` source with
`"url": "https://github.com/OfficialSpicrawl/agent-plugins.git"` and `"path": "plugins/spicrawl"`, pinned
to a commit `sha`.

### Gemini CLI

```sh
gemini extensions install https://github.com/OfficialSpicrawl/agent-plugins
```

Gemini asks for one setting, "Spicrawl authorization header". Enter the whole header value:
`Bearer spicrawl_live_...`. To change it later: `gemini extensions config spicrawl`.
The extension loads `GEMINI.md` as context.

### GitHub Copilot CLI

```sh
copilot plugin marketplace add OfficialSpicrawl/agent-plugins
copilot plugin install spicrawl@spicrawl-plugins
```

This installs the skill. Copilot CLI's docs describe no environment-variable expansion for remote MCP server
settings, so a plugin cannot carry the key. Add the server with:

```sh
copilot mcp add --transport http spicrawl https://mcp.spicrawl.com/mcp \
  --header "Authorization: Bearer $SPICRAWL_API_KEY"
```

Your shell expands the variable, so the key is written to Copilot's MCP config file on your
machine.

### Dify

The Dify plugin (source in [`dify/`](dify)) adds three tools to workflows and agents: Scrape,
Extract and Batch scrape. It calls the Spicrawl API directly, not the MCP server, so it takes the
API key (with the `scrape` scope, plus `batch` for Batch scrape) in the plugin's authorization
settings.

[![Spicrawl for Dify: install, add your key, then Scrape, Extract and Batch scrape in workflows and agents](assets/dify-demo.webp)](https://docs.spicrawl.com/agents/dify)

Watch the full video on the [Dify docs page](https://docs.spicrawl.com/agents/dify), or download [`assets/dify-demo.mp4`](assets/dify-demo.mp4).

1. In Dify open Plugins, Marketplace, search for Spicrawl and select Install, or open the
   [Spicrawl listing](https://marketplace.dify.ai/plugin/spicrawl/spicrawl). It needs Dify 1.14.2
   or later.
2. Choose To Authorize on the Spicrawl plugin and paste your API key.

To install a specific release, or on a Dify that cannot reach the Marketplace, download
`spicrawl-<version>.difypkg` from the [`dify-v*` releases](https://github.com/OfficialSpicrawl/agent-plugins/releases)
of this repository and pick it under Plugins, Install plugin. The package on GitHub is unsigned, so
a self-hosted Dify with signature verification on rejects it; install from the Marketplace there.

See [`dify/README.md`](dify/README.md) for the tools and their parameters.

### n8n

The n8n node (source in its own repository, [OfficialSpicrawl/n8n-nodes-spicrawl](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl), on npm as
[`n8n-nodes-spicrawl`](https://www.npmjs.com/package/n8n-nodes-spicrawl)) is a community node with
two operations, Scrape URL and Batch Scrape. It calls the Spicrawl API directly, not the MCP
server.

1. In n8n open Settings, Community Nodes, Install, and enter `n8n-nodes-spicrawl`. On a
   self-hosted n8n without that screen, run `npm install n8n-nodes-spicrawl` in `~/.n8n/nodes`
   and restart n8n.
2. Add a **Spicrawl API** credential and paste your API key into API Key.
3. Add the **Spicrawl** node to a workflow, or let an AI Agent node call it as a tool.

See the [n8n node README](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl#readme) for the operations and options.

### The skill alone (Agent Skills tools)

```sh
npx skills add OfficialSpicrawl/agent-plugins
```

This installs `plugins/spicrawl/skills/spicrawl/SKILL.md` into the agents you pick. The skill
describes the Spicrawl tools, the CLI and the HTTP API. It does not connect the MCP server.

### Any MCP client

| | |
|---|---|
| URL | `https://mcp.spicrawl.com/mcp` |
| Transport | Streamable HTTP |
| Header | `Authorization: Bearer <your key>` |
| OAuth | not used; turn automatic OAuth off if the client tries it |

## FAQ

### How do I add web scraping to Claude Code?

Install the plugin: `claude plugin marketplace add OfficialSpicrawl/agent-plugins`, then
`claude plugin install spicrawl@spicrawl-plugins`. Or add only the server:

```sh
claude mcp add --transport http spicrawl https://mcp.spicrawl.com/mcp \
  --header "Authorization: Bearer $SPICRAWL_API_KEY"
```

Then ask Claude Code to read a URL; it calls `spicrawl_scrape`.

### How do I add web scraping to Cursor?

Install the `spicrawl` plugin and set `SPICRAWL_API_KEY` under Plugins, Configure (see
[Cursor](#cursor)), or put the server in `~/.cursor/mcp.json`. The plugin is also listed on the
[Cursor Directory](https://cursor.directory/plugins/spicrawl).

### How do I add web scraping to Codex or Gemini CLI?

Codex: `codex plugin marketplace add OfficialSpicrawl/agent-plugins`, then add the server with your
key to `~/.codex/config.toml` (see [ChatGPT and Codex](#chatgpt-and-codex)). Gemini CLI:
`gemini extensions install https://github.com/OfficialSpicrawl/agent-plugins`.

### What is MCP, and which server do these plugins use?

MCP, the Model Context Protocol, is an open protocol that lets an AI app call external tools. The
plugins connect to Spicrawl's hosted server at `https://mcp.spicrawl.com/mcp` over Streamable HTTP,
with your API key as a bearer token. Spicrawl fetches the page and returns the content, so nothing
else runs on your machine.

### What can the agent do with Spicrawl?

Fetch one URL as Markdown, HTML, text or JSON; extract named fields with CSS selectors; take a
screenshot; run batch jobs over many URLs; keep a session's cookies and storage between requests;
read its request history and credit usage; and search Spicrawl's documentation. The Markdown is the
page's main content, which keeps token use down.

### Does it work on pages that need JavaScript?

Yes. If a plain fetch comes back empty, the agent can ask for JavaScript rendering. A plain fetch
costs 1 credit and JavaScript rendering costs 3.

### Can it crawl a whole website?

No. Spicrawl fetches the URLs you give it. To cover a site, collect the URLs (from a sitemap, for
example) and submit them as a batch job.

### Can it read pages behind a login?

A session keeps cookies and storage between requests, so the agent can sign in once and read
further pages with the same session. Use it only for sites and accounts you are allowed to access.

### How much does it cost?

Credits are charged only for successful requests, and a failed request costs 0. See
<https://docs.spicrawl.com/credits> for the price of each kind of request.

### Where does my API key go?

Only to Spicrawl. See [What is sent where](#what-is-sent-where). No file in this repository contains
a key.

### Which other tools does it support?

ChatGPT, OpenCode, Factory Droid, GitHub Copilot CLI, Devin, Dify, n8n, and any tool that reads
Agent Skills or speaks MCP. See [Supported tools](#supported-tools).

### What license is it under?

The plugins in this repository are Apache-2.0. Spicrawl itself is a hosted service that needs an
account and an API key.

## What is sent where

The API key is sent only to Spicrawl: to `mcp.spicrawl.com` in the `Authorization` header of MCP
requests, and, for the Dify plugin and the n8n node, to `api.spicrawl.com` in the `Authorization`
header of API requests. Nothing here contains a key. The plugins for Claude Code, Codex and ChatGPT, Cursor, Factory Droid,
Devin, Gemini CLI and Copilot CLI run no code of their own: they are JSON manifests, a skill file
(Markdown) and a logo. The OpenCode plugin is a small JavaScript package (`opencode/`) that reads
`SPICRAWL_API_KEY` and hands it to OpenCode as the MCP header; it makes no network requests
itself. The Dify plugin (`dify/`, Python) and the n8n node ([its own repository](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl), TypeScript) make HTTPS requests to
`https://api.spicrawl.com` and nowhere else; they read the key from Dify's plugin authorization
and from an n8n credential. Each tool reads the key from where its format allows: a sensitive
plugin setting (Claude Code, Gemini CLI), a plugin variable you set in Cursor, an environment variable (Codex, through
your own `config.toml` entry; Factory Droid; OpenCode), a credential you enter in Devin, or the
command you type (Copilot CLI, any MCP client).

The pages an agent asks Spicrawl to scrape, and the results, go through the same server.

## Docs and contact

- MCP server docs: <https://docs.spicrawl.com/agents/mcp>
- Website: <https://spicrawl.com>
- SDK: <https://github.com/OfficialSpicrawl/sdk>, CLI: <https://github.com/OfficialSpicrawl/cli> (Apache-2.0)
- Contact: dev@spicrawl.com

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Maintainer notes

There are two plugin folders:

- `plugins/spicrawl`: Claude Code, Cursor, Factory Droid, Devin and Copilot CLI, and the skill that
  `npx skills add` installs. Every one of these needs a key in the MCP definition (or, for Copilot
  CLI, no MCP definition at all).
- `plugins/spicrawl-openai`: ChatGPT and Codex only, in OpenAI's portable format. It is the folder
  that goes into the ZIP for OpenAI's plugin portal, and `.agents/plugins/marketplace.json`
  points at it. See [The OpenAI folder](#the-openai-folder).

Shared files in `plugins/spicrawl`:

- `skills/spicrawl/SKILL.md`: the canonical skill. `name` equals its directory.
  The skills CLI finds it because `.claude-plugin/marketplace.json` lists `./plugins/spicrawl`,
  so no copy or symlink at the repository root is needed.
- `logo.png`: 180x180, used by the Cursor and Devin manifests. `plugins/spicrawl-openai/assets/logo.png`
  is a byte-identical copy (a ZIP must be self-contained, and a symlink is not accepted). Change both together.
- `.devin-plugin/plugin.json` is the manifest prepared for Devin's marketplace.

There is one MCP definition per format, in `plugins/spicrawl/`. They are separate files on
purpose: the same server needs a different credential syntax in each tool.

| File | Read by | Credential syntax |
|---|---|---|
| `mcp/claude.json` | Claude Code (`mcpServers` in `.claude-plugin/plugin.json`) | `${user_config.spicrawl_api_key}`, from `userConfig` with `sensitive: true` |
| `mcp/cursor.json` | Cursor (`mcpServers` in `.cursor-plugin/plugin.json`) | `${SPICRAWL_API_KEY}`, from `variables` in `.cursor-plugin/plugin.json`; the user sets it under Plugins, Configure |
| `mcp.json` | Factory Droid (fixed root path) | `${SPICRAWL_AUTH}` as the whole header value, `oauth: false` |
| inline in `.devin-plugin/plugin.json` | Devin | `${SPICRAWL_AUTHORIZATION}` as the whole header value |
| inline in `gemini-extension.json` | Gemini CLI | `$SPICRAWL_MCP_BEARER` from the extension `settings` |
| `opencode/index.js` (npm `opencode-spicrawl`) | OpenCode | `Bearer <value of SPICRAWL_API_KEY>`, built in code |
| `plugins/spicrawl-openai/mcp.json` | ChatGPT, Codex (Agent Plugins `mcp.json`) | none in the file: ChatGPT authenticates with OAuth at `/chatgpt/mcp`; Codex users who want a key add `/mcp` themselves in `~/.codex/config.toml` |

Notes:

- No file is named `.mcp.json`. It is Claude Code's default name, but Copilot CLI also reads it by
  default and Droid translates it, and neither expands `${user_config...}`.
- Cursor's manifest points at `mcp/cursor.json` so its default `mcp.json` discovery does not pick
  up the Droid file. Every `${VAR}` in that file must be declared under `variables` in the
  manifest, and Cursor does not read it from the shell: `${env:...}` is valid only in the user's
  own `~/.cursor/mcp.json`.
- `opencode/` is the source of the npm package `opencode-spicrawl` (OpenCode has no plugin
  marketplace format). It has its own `package.json` version and is published to npm separately
  from these manifests, so its version does not have to match `0.2.2`.
- The collection version is `version` in `gemini-extension.json` and in the manifests under
  `plugins/` (`.claude-plugin`, `.cursor-plugin`, `.factory-plugin`, `.github/plugin` and
  `spicrawl-openai/plugin.json`). It is `0.2.2` (0.2.0 added the Dify and n8n integrations; 0.2.1 aligned the skill with the public
  rendering tiers; 0.2.2 added the plugin `README.md` and `LICENSE`, and the category and tags in the Cursor manifest, for Cursor marketplace review) and these files are bumped together. `opencode/` and `dify/` are versioned on their own, and so is the n8n node, which lives in its own repository.
- `dify/` is the Dify plugin. The n8n community node is not in this repository: its source is
  [OfficialSpicrawl/n8n-nodes-spicrawl](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl), with the package at that repository's root because
  n8n's verification looks for `credentials/` there. Neither is a coding-agent plugin: they call
  the REST API (`https://api.spicrawl.com`), not the MCP server, and no marketplace file in this
  repository lists them. `dify/` is Python (tests: `cd dify && python -m pytest`). In a batch
  result line, `result.content` is the page as a plain string, and JSON text only when the job's
  `response_format` is `json`; both integrations use it that way.
- The Gemini variable name must not contain `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `AUTH`,
  `CREDENTIAL`, `CERT` or `PRIVATE`: Gemini CLI removes such variables from the environment before
  it expands header values.
- There is no root `plugin.json` and no Agent Plugins `mcp.json` in `plugins/spicrawl`, and there
  must not be. Checked again against the current docs:
  - The standard (agent-plugins.org, section 7.2.1) says "Clients MUST NOT perform placeholder or
    environment-variable expansion in url, header names, or header values" and "Plugins MUST NOT
    embed credentials or other secrets in headers", and defines no OAuth or credential-reference
    fields. A portable package cannot carry a bearer key.
  - Copilot CLI's reference says "A root plugin.json that targets Agent Plugins takes precedence
    over .plugin/plugin.json and .claude-plugin/plugin.json". Adding one would hide
    `.github/plugin/plugin.json` and the Claude manifest.
  - OpenAI's packaging guide says portable packages "always discover skills in skills/ and MCP
    servers in mcp.json", and that an MCP declaration in an OpenAI overlay "can't replace, disable,
    or add to those components". A root manifest in this folder would drop Codex's
    `bearer_token_env_var`.
  - Factory Droid already owns the root `mcp.json` path in this folder, with a different shape
    (`type: http`, `${SPICRAWL_AUTH}`). The Agent Plugins `mcp.json` needs the same path with
    `type: streamable-http` and a `$schema`.

  So the portable package is a separate folder, `plugins/spicrawl-openai`, and no marketplace
  other than `.agents/plugins/marketplace.json` lists it. The `skills/` layout in `plugins/spicrawl`
  follows the standard anyway.
- `plugins/spicrawl/.github/plugin/plugin.json` gives Copilot CLI a manifest without an MCP
  server. Without it Copilot CLI would read the Claude manifest and send the literal header.
- Manifests list only what the server offers today.
- Coming soon, so absent from every manifest and skill step: AI extraction, stealth mode, the managed proxy pool, and the remote browser (`spicrawl_browser_connect_url`).
- After changing a manifest: `claude plugin validate --strict plugins/spicrawl` and
  `claude plugin validate --strict .`.
- The repository topic `gemini-cli-extension` must be set for the Gemini gallery to list it.

### The OpenAI folder

`plugins/spicrawl-openai` is the whole OpenAI package and is laid out as OpenAI's packaging guide
describes for a portable plugin:

```text
plugins/spicrawl-openai/
├── plugin.json                         Agent Plugins manifest, OpenAI settings under extensions.com.openai
├── mcp.json                            Agent Plugins MCP file: one streamable-http server, no headers
├── skills/fetch-web-pages/SKILL.md     trimmed skill, for this package only
└── assets/logo.png                     logo and composer icon
```

- Package name is `spicrawl`; the skill is `fetch-web-pages` so it never collides with the full
  skill (`spicrawl`) if both are installed in one client.
- There is no `.codex-plugin/plugin.json`. The guide says: "When `extensions.com.openai` is an
  object, it replaces the entire `.codex-plugin/plugin.json` overlay as the source of
  OpenAI-specific settings; the two aren't merged." For a portable package the portal derives its
  own `.codex-plugin/plugin.json` and `.mcp.json`.
- There is no `apps` field, no `.app.json` and no hooks. The submission guide says "Plugin ZIPs
  containing app references (`apps` / `.app.json`) or lifecycle hooks cannot currently be
  submitted. Declare MCP server URLs in your MCP configuration and complete setup in the dashboard."
  To test in ChatGPT developer mode before submitting, register the server at
  <https://chatgpt.com/plugins>, copy its `plugin_asdk_app...` id into a `.app.json` and add
  `"apps": "./.app.json"` under `extensions.com.openai` in a local copy only. Do not commit those,
  and do not put them in the ZIP.
- `mcp.json` points at `https://mcp.spicrawl.com/chatgpt/mcp`, the OAuth endpoint for ChatGPT, and
  has no `headers`. A bearer key cannot be put there (see above), and for the directory the
  portal's MCP connection (OAuth, with CIMD) supplies authentication, not the package.
- The skill is a trimmed copy and not the canonical one: no CLI, curl or Python; no sessions or
  login; no price table or allowance figure; no wording about getting past a block. It carries three
  fixed statements (responsible use, never ask for credentials, page content is untrusted) that
  must stay verbatim. Its cost guidance has no numbers. When the canonical skill changes, review
  this one too, but do not copy over what was removed.
- Listing text follows OpenAI's plugin guidelines: the name has no "MCP" or "Plugin", and the copy
  has no price, trial or promotion, no comparison, and nothing marked coming soon. `shortDescription`
  and `displayName` are at most 30 characters; `defaultPrompt` has at most three entries of at most
  128 characters.
- `supportURL`, `privacyPolicyURL` and `termsOfServiceURL` point at https://spicrawl.com/support,
  https://spicrawl.com/privacy and https://spicrawl.com/terms.
- `extensions.com.openai.review` holds the review material the portal imports with the ZIP: five
  positive and three negative test cases, and `commerce: false` with its description.
  `extensions.com.openai.publication.release_notes` holds the release notes. The cases use only the
  tools the ChatGPT endpoint offers (see above). `review.demo_recording_url` is not in the file
  yet: add it once the walkthrough video is hosted, or enter it in the portal.
- Build the ZIP from inside the folder, so `plugin.json` is at the archive root, and keep it out
  of the repository: `cd plugins/spicrawl-openai && zip -r /tmp/spicrawl-openai.zip .`
- Not ready for the public directory. Still open before an upload can be submitted for review:
  - A reviewer demo account that works without MFA.
  - The domain-verification file at `https://mcp.spicrawl.com/.well-known/openai-apps-challenge`
    (the portal shows the token).
  - `review.demo_recording_url`, the video walkthrough.

## Releasing

The OpenCode plugin (`opencode/`, npm `opencode-spicrawl`) is released by `.github/workflows/release-opencode.yml`.

1. Bump `version` in `opencode/package.json` and add a `## X.Y.Z (YYYY-MM-DD)` section to `opencode/CHANGELOG.md`.
2. Merge to `main`. CI runs `npm ci`, the typecheck and the tests. If npm does not have that version yet, it publishes with provenance and creates a GitHub release tagged `opencode-spicrawl-vX.Y.Z` whose notes are that CHANGELOG section. A version containing `-` (for example `0.2.0-beta.1`) is published under the `next` dist-tag and marked as a prerelease.
3. The `NPM_TOKEN` repository secret is a granular npm token for the `spicrawl` account with publish rights and 2FA bypass. It lasts at most 90 days, so rotate it before then. Move to OIDC trusted publishing before January 2027, when npm ends direct token publishing.

The n8n node (npm `n8n-nodes-spicrawl`) is released from its own repository, [OfficialSpicrawl/n8n-nodes-spicrawl](https://github.com/OfficialSpicrawl/n8n-nodes-spicrawl), by that repository's `.github/workflows/publish.yml`: bump `version` and the changelog, merge, then push the tag `vX.Y.Z`. It has its own `NPM_TOKEN` secret.

The Dify plugin (`dify/`) is released by `.github/workflows/release-dify.yml`.

1. Bump `version` in `dify/manifest.yaml` (the `meta.version` field is the manifest format version; leave it).
2. Merge to `main`, then push the tag `dify-vX.Y.Z` on the merged commit. The tag must match the manifest. The workflow packages `spicrawl-X.Y.Z.difypkg` with the Dify plugin CLI (pinned to one release and checked against its SHA-256) and attaches it to a GitHub release of that tag.

The other tools install straight from this repository, so they need no release step: a change is live once it is on `main`.

The `validate` workflow runs on every push and pull request. It parses all JSON files, runs the OpenCode tests, runs the Dify plugin's pytest, and fails if any file contains something matching `spicrawl_(live|test)_[a-z0-9]{20,}`.
