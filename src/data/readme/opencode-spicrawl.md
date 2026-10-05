# Spicrawl agent plugins

Spicrawl's plugin for coding agents, in one repository. It connects an agent to the hosted
Spicrawl MCP server and, in the tools that support it, gives the agent a skill that explains how
to use it.

Spicrawl is a web scraping API for AI agents. Through the MCP server an agent can:

- scrape a web page to Markdown, HTML, text or JSON;
- run batch jobs over lists of URLs;
- keep persistent login sessions (cookies and storage);
- read its request history and its usage;
- search Spicrawl's docs.

This repository holds the packaging for these tools:

| Tool | What is installed |
|---|---|
| Claude Code | plugin (MCP server + skill) |
| Codex | plugin (skill + MCP server entry), in OpenAI's portable format; the key goes in your Codex config |
| ChatGPT | the same plugin, connecting through OAuth at `/chatgpt/mcp` once that endpoint is live; not in the directory yet (see [ChatGPT and Codex](#chatgpt-and-codex)) |
| Cursor | plugin (MCP server + skill) |
| OpenCode | npm plugin `opencode-spicrawl` (adds the MCP server) |
| Factory Droid | plugin (MCP server + skill) |
| Devin | plugin (MCP server + skill), installed from this repository |
| Gemini CLI | extension (MCP server + context file) |
| GitHub Copilot CLI | plugin (skill), plus one command for the MCP server |
| Any tool that reads Agent Skills | the skill only (`npx skills add`) |
| Any MCP client | the MCP server, by hand |

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

## What is sent where

The API key is sent only to `mcp.spicrawl.com`, in the `Authorization` header of MCP requests.
Nothing here contains a key. The plugins for Claude Code, Codex and ChatGPT, Cursor, Factory Droid,
Devin, Gemini CLI and Copilot CLI run no code of their own: they are JSON manifests, a skill file
(Markdown) and a logo. The OpenCode plugin is a small JavaScript package (`opencode/`) that reads
`SPICRAWL_API_KEY` and hands it to OpenCode as the MCP header; it makes no network requests
itself. Each tool reads the key from where its format allows: a sensitive plugin setting (Claude
Code, Gemini CLI), a plugin variable you set in Cursor, an environment variable (Codex, through
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
  from these manifests, so its version does not have to match `0.1.0`.
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

The other tools install straight from this repository, so they need no release step: a change is live once it is on `main`.

The `validate` workflow runs on every push and pull request. It parses all JSON files, runs the OpenCode tests, and fails if any file contains something matching `spicrawl_(live|test)_[a-z0-9]{20,}`.
