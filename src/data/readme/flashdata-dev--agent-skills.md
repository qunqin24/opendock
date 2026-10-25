# FlashData CLI and MCP

Use Google Search, YouTube data, and downloads to your cloud storage from a terminal, Agent, or MCP client. This MIT-licensed package implements the tools and calls the FlashData REST APIs directly. It does not proxy a hosted MCP connection.

Source code is available at [rocosen/flashdata-mcp](https://github.com/rocosen/flashdata-mcp). The npm package `@flashdata-dev/mcp` provides two commands: `flashdata` for single-call JSON output and `flashdata-mcp` for persistent stdio MCP.

To connect without running this local package, use the separate
[FlashData hosted MCP service](https://flashdata.dev/mcp). Its
[Official MCP Registry manifest and publishing instructions](https://github.com/rocosen/flashdata-mcp/tree/main/registry)
are maintained in this repository. The combined registration describes the hosted
endpoint. The Registry also has separate manifests for 15 local task servers;
each references a source-restricted MCPB bundle. Neither path publishes to npm.

For independent Registry entries and task-specific examples, use the [15-capability MCP guide index](https://github.com/rocosen/flashdata-mcp/blob/main/registry/README.md#all-15-capabilities): Google Search, News, Images, Shopping, video search and Places; YouTube search, extended search, metadata, transcripts, uploader captions, license labels, channels, autocomplete and delivery to customer storage. Each guide includes request JSON, selected output fields, limits, costs and the corresponding FlashData documentation.

For a local server focused on one capability, see the [15 independent Smithery task servers](smithery/README.md). Each MCPB bundle has one data tool plus pricing, job and result reads restricted to that source. Installation is free; FlashData data calls use paid Credits.

This directory is a complete, standalone project. Use its contents as the root of your GitHub repository, including `.github/` and `.gitignore`. Installation and tests require no files from another checkout.

## Client tutorials

Connect [Kiro](integrations/kiro/README.md) or [VS Code](integrations/vscode/README.md) to the hosted MCP service. Each guide maps all 15 capabilities, explains client-specific key handling and approvals, and uses a protected local workflow for download storage credentials. Tutorial availability is separate from official directory approval.

Build a local Python research agent with [OpenAI Responses](integrations/openai/README.md) or [Anthropic Messages](integrations/anthropic/README.md). Both tutorials use the existing MCP service, discover query schemas, request approval before data calls, and cover all 15 capabilities with a protected download handoff.

## Choose a task package

Python users can build the [15 independent Python / uvx CLIs](packages/python-cli/README.md).
Their PyPI publication is still pending; the source includes local wheel installation instructions.

Homebrew users can install [15 independent task formulae](homebrew/README.md) from
this repository as a third-party tap. Each formula builds the corresponding Python CLI
from a checked GitHub release, with its own command and complete runtime dependencies.

For one capability, choose one of the [15 task packages](https://github.com/rocosen/flashdata-mcp/blob/main/npm/README.md). Each has one executable, one data source and its own examples, input schema and documentation. It runs as a JSON CLI or as a stdio MCP server using the `mcp` subcommand. For example:

```sh
npx --yes @flashdata-dev/google-news@0.1.0 --help
npx --yes @flashdata-dev/google-news@0.1.0 tools
npx --yes @flashdata-dev/google-news@0.1.0 call get_pricing
```

The last two commands require your API key in `FLASHDATA_API_KEY` and make only free reads. Task packages expose three CLI tools (the selected source, `get_pricing`, `get_job`) or four MCP tools (also `get_result`). They reject other sources and cross-source job reads, even with a broadly authorized key. The combined package below remains available for workflows that need several capabilities. Installation is free; FlashData API queries are paid.

## Agent Skill

Hermes users can install the [FlashData Hermes plugin](plugins/hermes/README.md), which connects the hosted MCP server and includes 15 task Skills. Its source release and official catalog approval are separate milestones. The plugin is free to install; data queries use the user's own FlashData Key and paid Credits.

The [FlashData Skill](skills/flashdata/SKILL.md) helps an agent use an existing FlashData MCP connection for source-backed web and video research. It includes recipes for video research, comparing search snapshots, and preparing knowledge-base records.

Install the Skill into your project with the [skills CLI](https://skills.sh/docs):

```sh
npx skills add rocosen/flashdata-mcp --skill flashdata
```

Select your agent when prompted, or add `--agent codex` (or another supported agent). The default scope is the current project; use `--global` only if you want a user-wide installation. Review the Skill before installation.

This installs instructions and references, not the MCP executable or an account connection. Connect FlashData separately using the [hosted setup](https://flashdata.dev/mcp) or the local instructions below. The Skill contains no API keys and submits no queries during installation. Queries made through MCP use your existing FlashData Credits; account reads can verify a connection for free.

Example requests:

- “Use FlashData to estimate the cost of one web search without running it.”
- “Find three relevant YouTube videos, compare their available transcripts, and cite timestamps. Keep the work within my approved query budget.”
- “Compare this search snapshot with the previous one and prepare source-linked records for my knowledge base.”

The skills.sh directory uses aggregated installation telemetry for discovery; a successful installation is separate from directory ranking or security-audit approval. This Skill is MIT-licensed under this repository's license. The Skill does not require the local npm package.

### Task-specific Skills

Choose a Skill for the capability you need. Each includes example requests, a terminal quick start, MCP usage, parameters and practical ways to use the results. The general `flashdata` research Skill remains available.

| Capability | Skill | Examples |
| --- | --- | --- |
| Google Search | [google-search](skills/google-search/SKILL.md) | Web research, site searches, PDF discovery and localized SERPs. |
| Google News | [google-news](skills/google-news/SKILL.md) | Topic coverage, company news and linked news briefings. |
| Google Image Search | [google-image-search](skills/google-image-search/SKILL.md) | Image references, diagrams and filtering by returned dimensions. |
| Google Shopping | [google-shopping](skills/google-shopping/SKILL.md) | Product discovery and comparing listed merchant offers. |
| Google Video Search | [google-video-search](skills/google-video-search/SKILL.md) | Tutorials, demonstrations and video discovery across websites. |
| Google Places Search | [google-places](skills/google-places/SKILL.md) | Local business lists with addresses and available ratings. |
| YouTube Search | [youtube-search](skills/youtube-search/SKILL.md) | Video discovery using date, duration, subtitle and sorting filters. |
| YouTube Extended Search | [youtube-extended-search](skills/youtube-extended-search/SKILL.md) | Larger video datasets and creator discovery, up to 700 requested results. |
| YouTube Video Metadata | [youtube-metadata](skills/youtube-metadata/SKILL.md) | Video details, statistics, chapters and format inspection. |
| YouTube Transcripts | [youtube-transcript](skills/youtube-transcript/SKILL.md) | Video summaries, timestamped quotes and transcript exports. |
| YouTube Captions | [youtube-captions](skills/youtube-captions/SKILL.md) | Uploader captions and local SRT/WebVTT conversion. |
| YouTube Channel Data | [youtube-channel](skills/youtube-channel/SKILL.md) | Channel profiles, recent uploads and video CSV exports. |
| YouTube Autocomplete | [youtube-autocomplete](skills/youtube-autocomplete/SKILL.md) | Keyword ideas and suggestions by language and region. |
| YouTube License Check | [youtube-license-check](skills/youtube-license-check/SKILL.md) | Creative Commons license-label classification and its interpretation. |
| YouTube Video and Audio Download | [youtube-download](skills/youtube-download/SKILL.md) | Video, audio or clips delivered to customer cloud storage. |

Install only the task Skills you want, for example:

```sh
npx skills add rocosen/flashdata-mcp --skill google-search --skill youtube-transcript
```

The CLI's `--list` option lists available Skills before installing. Each selected Skill is self-contained; sibling Skills are not required. Skill names are shared across the ecosystem, so review an existing installation before replacing a same-named Skill from another publisher. Public source, installation and skills.sh indexing are separate milestones. Instructions are free; FlashData API queries are paid.

These new top-level Skills are also discoverable by clients that scan the repository's `skills/` directory. This source update is not a new Cursor or Gemini marketplace approval. The contained Claude plugin continues to bundle its existing shared research Skill.

## Cursor plugin

For a single task, choose one of the [15 independent Cursor plugins](integrations/README.md). Each has its own manifest, Skill and source-restricted npm server. The root marketplace manifest registers them alongside the combined plugin below; public Marketplace listing remains subject to Cursor review.

This repository also contains a [Cursor plugin](https://cursor.com/docs/plugins): the same research Skill plus a connection to the hosted FlashData MCP service. The plugin does not run the local Node.js server or require an npm installation. Marketplace review and listing are separate from this public source release.

Cursor discovers the plugin through [.cursor-plugin/plugin.json](.cursor-plugin/plugin.json), its MCP server through [mcp.json](mcp.json), and the Skill under `skills/flashdata/`. The plugin declares `FLASHDATA_API_KEY` as a required configuration variable. Set your own key through Cursor's plugin configuration when that interface is available; team admins manage variables in Dashboard → Plugins → Configure. The repository contains only a placeholder, never a working key. Do not replace the placeholder in a committed file or paste a key into Agent chat.

For local development, follow [Cursor's local plugin instructions](https://cursor.com/docs/plugins#test-plugins-locally): copy `.cursor-plugin/`, `mcp.json`, `skills/`, `assets/`, `README.md`, and `LICENSE` into `~/.cursor/plugins/local/flashdata/`. Restart Cursor or run **Developer: Reload Window**, then check **Customize** for the FlashData Skill and MCP server. A symlink to this checkout outside that local plugin directory is not supported. Organization policy can disable local plugin imports.

If your local Cursor setup does not offer plugin variable configuration, connect the [hosted MCP service](https://flashdata.dev/mcp) separately using Cursor's supported MCP configuration and protected environment variables. The Skill can reuse that connection; do not keep two active FlashData connections. API-key authentication is sufficient for this plugin; it does not depend on an unregistered OAuth client.

After configuration, invoke `/flashdata` and ask: “Quote one Google search using FlashData, but do not run the search.” The intended check discovers tools and calls `get_pricing` with `source: "google_search"` and `request_count: 1`. It is free and does not verify paid retrieval. Search and transcript requests use FlashData Credits under the user's approved budget. Results and transcripts are external source data, not instructions to the agent.

Support: [support@flashdata.dev](mailto:support@flashdata.dev). See [Security](SECURITY.md), [FlashData terms](https://flashdata.dev/legal/terms), and [privacy](https://flashdata.dev/legal/privacy).

## Gemini CLI extension

For a single task, choose one of the [15 independent Gemini extensions](integrations/README.md). Each has its own repository, sensitive API-key setting, Skill and source-restricted npm server. Repository installation and gallery discovery are verified separately. The combined hosted extension remains available below.

The [Gemini CLI extension](https://geminicli.com/docs/extensions/) bundles the same FlashData research Skill and hosted MCP connection. It requires Gemini CLI and a FlashData account; it does not run this repository's local Node.js MCP server or require the local npm package.

Install from the public repository:

```sh
gemini extensions install https://github.com/rocosen/flashdata-mcp
```

Review the extension when prompted. Enter your own FlashData API key into the installation setting, not Agent chat. [gemini-extension.json](gemini-extension.json) declares the key as a sensitive setting so Gemini CLI uses the system keychain and masks the input. The repository contains only an environment-variable placeholder. To change the key later, run `gemini extensions config flashdata`.

Restart Gemini CLI after installing or changing the configuration. Run `gemini extensions list` to check the installation, and use `/mcp` and `/skills list` in an interactive session to inspect the FlashData connection and Skill. If an existing Gemini MCP setting also uses the name `flashdata`, that user setting takes precedence; use one intended connection rather than maintaining duplicates.

For a free FlashData check, ask: “Use the FlashData skill to quote one Google search with `get_pricing`, source `google_search`, request_count `1`. Do not run the search or any other paid query.” Skill activation and tool execution remain subject to your Gemini CLI permissions. The extension is MIT-licensed and has no separate fee. FlashData queries consume your Credits; account reads and pricing checks are free. Gemini model access and its usage limits are separate from FlashData. Google's [June 2026 transition notice](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli) moves individual/free access to Antigravity CLI; Gemini CLI remains available through supported enterprise licenses and paid API keys. This extension has been validated for Gemini CLI, not Antigravity CLI.

For local development, run `gemini extensions link /absolute/path/to/flashdata-mcp` and restart the CLI. The extension uses Streamable HTTP (`httpUrl`) and automatically discovers `skills/flashdata/`; no additional commands or persistent context file are required. GitHub installation and [Gemini gallery](https://geminicli.com/extensions/) indexing are separate milestones; a public repository is not proof of a live gallery listing.

## Claude Code plugin

The [Claude plugin](plugins/claude/README.md) bundles the shared research Skill and a hosted MCP connection. Install through FlashData's own GitHub marketplace:

```sh
claude plugin marketplace add rocosen/flashdata-mcp
claude plugin install flashdata@flashdata
```

Use Claude Code 2.1.285 or later and enter your key through `/plugin configure flashdata@flashdata` in an interactive session. The sensitive setting uses Claude Code's secure credential store. Restart, inspect `/mcp`, then invoke `/flashdata:flashdata` and request a free pricing check. Queries use FlashData Credits; model access and fees are separate.

The plugin is contained in `plugins/claude/` so it does not ship this repository's top-level executable. Shared Skill, logo, and license copies are generated by `npm run sync:claude-plugin`; CI checks that they match the originals. Its API-key configuration is for Claude Code; authenticated use in Chat and Cowork requires their connector setup. This GitHub marketplace is independent of Anthropic's official directory, where neither the plugin nor its required separate MCP connector submission has been approved.

## Repository layout

```text
bin/                      JSON CLI and stdio MCP executables
src/                      shared tool execution, MCP adapter, API clients and local cache
test/                     isolated CLI, protocol, HTTP security and cache tests
scripts/                  package checks and installation verification
npm/                      15 task package definitions and developer guides
integrations/             Cursor/Gemini task catalog and native example prompts
plugins/cursor/           15 self-contained source-specific Cursor plugins
extensions/gemini/        15 self-contained Gemini extension release directories
.cursor-plugin/marketplace.json Cursor combined and task plugin registry
skills/flashdata/         portable Agent Skill and research recipes
.cursor-plugin/plugin.json Cursor plugin manifest and variable declaration
mcp.json                  hosted MCP connection for the Cursor plugin
gemini-extension.json     Gemini CLI hosted MCP and sensitive key setting
.claude-plugin/marketplace.json Claude marketplace index
plugins/claude/           contained Claude plugin and generated shared files
assets/logo.svg           FlashData plugin logo
.github/workflows/ci.yml  continuous integration
package.json              package metadata and commands
package-lock.json         reproducible dependency installation
LICENSE                   MIT license
THIRD_PARTY_NOTICES.md    dependency notices
SECURITY.md              vulnerability reporting and trust boundaries
```

## Run locally

Requires Node.js 22.18 or newer and a FlashData API key from [your console](https://flashdata.dev/app/api-keys). The Management API must support `/v2/api-access` and its balance, pricing and limits routes. Deploy that server release before connecting this package to an older environment.

Clone the repository and install its dependencies:

```sh
git clone https://github.com/rocosen/flashdata-mcp.git
cd flashdata-mcp
npm ci
export FLASHDATA_API_KEY='YOUR_API_KEY'
npm start
```

The process communicates over stdin/stdout; it does not show a web page or interactive prompt. Use `node bin/flashdata-mcp.js --help` for configuration help. Normal protocol operation writes no banners or request data to stdout or stderr.

For a local clone, configure Claude Desktop (or another stdio MCP client) with an absolute path:

```json
{
  "mcpServers": {
    "flashdata": {
      "command": "node",
      "args": ["/absolute/path/to/flashdata-mcp/bin/flashdata-mcp.js"],
      "env": { "FLASHDATA_API_KEY": "YOUR_API_KEY" }
    }
  }
}
```

Use the full path to Node if your desktop app cannot find it. On Windows, use an escaped Windows path. Keep credentials in your client's protected configuration, not in a prompt, URL, committed file, or command-line argument.

You can also install the reviewed artifact with `npm install /absolute/path/flashdata-dev-mcp-0.2.0.tgz` in a separate project and run its `node_modules/.bin/flashdata-mcp` executable. For npm installation, use the explicit commands below: the package contains two executables.

## Agent CLI

The package also provides `flashdata`, a single-call JSON CLI. It shares the MCP schemas, source permissions and API clients. Run `node bin/flashdata.js` in a source checkout, or install the npm package:

```sh
npm install --global @flashdata-dev/mcp@0.2.0
flashdata --help
```

Without a global installation, select the executable explicitly:

```sh
npx --yes --package=@flashdata-dev/mcp@0.2.0 flashdata tools
npx --yes --package=@flashdata-dev/mcp@0.2.0 flashdata call get_pricing
```

For a stdio MCP client, set `command` to `npx` and `args` to `["--yes", "--package=@flashdata-dev/mcp@0.2.0", "flashdata-mcp"]`, with the key in the client's protected environment. On Windows, use `npx.cmd` if required by your client. Do not use bare `npx @flashdata-dev/mcp`: choose one of the two executable names.

Set `FLASHDATA_API_KEY` through your environment or secret manager. Do not put real keys in shell history or command arguments. Start with free discovery and pricing:

```sh
flashdata tools
flashdata call get_pricing
flashdata call get_pricing --input pricing.json
```

`pricing.json` contains `{"source":"google_search","request_count":1}`. `tools` returns the currently authorized tool names, descriptions and JSON input schemas; a fully authorized key has 21 CLI tools. The persistent MCP-only `get_result` is omitted because CLI results are returned whole.

Supply arguments with `--input <file>` or `--input -` for stdin. Input must be a JSON object, up to 256 KiB. Use stdin or a protected temporary file for download storage credentials; do not commit it. The CLI does not save keys or inputs.

For a paid async web search, create `query.json` containing `{"query":"home battery storage","num":3,"mode":"async"}`, then run:

```sh
flashdata call google_search --input query.json
```

The result includes a job id. Put that actual id in `job.json`, for example `{"job_id":"job_REPLACE_WITH_RETURNED_ID"}`, and read it with:

```sh
flashdata call get_job --input job.json > result.json
```

A pending or processing job means work is still running. Repeat only the free `get_job` read as needed, respecting API limits; do not resubmit the query. Completed jobs include their original JSON in `result.output`. Failed jobs return `ok: false` and exit 1. `submit_batch` and `youtube_download` use the same schemas shown by `tools`; downloads always run asynchronously.

`tools` and `call` write exactly one JSON object to stdout with `ok` and `result`; call output also includes `tool`. Local failures use `error: {code, message}`. Exit status 0 means the operation succeeded, 1 means a tool/API error, and 2 means invalid command, input or configuration. A successful pending-job read is not completed work. `--help` and `--version` print text and require no key. Normal operation prints no diagnostics to stderr.

CLI results are not chunked or kept in a cache. Redirect stdout to preserve large results (API responses remain bounded to 4 MiB). If a paid submission returns `query_outcome_unknown`, is interrupted, or loses its output, check Jobs before trying again: the query may already have been charged. The CLI never automatically retries or polls.

## Tools and billing

A fully authorized key discovers 22 tools. Discovery and execution are filtered by the current key's scopes.

| Tools | Behavior |
| --- | --- |
| `google_search`, `google_images`, `google_news`, `google_shopping`, `google_videos`, `google_places` | Realtime or async Google data |
| `youtube_search`, `youtube_search_extended`, `youtube_metadata`, `youtube_transcript`, `youtube_captions`, `youtube_trainability`, `youtube_channel`, `youtube_suggestions` | Realtime or async YouTube data |
| `youtube_download` | Async video/audio delivery to customer storage |
| `submit_batch` | Submit multiple queries, including downloads, as background jobs |
| `get_job` | Read task status and completed JSON results |
| `get_result` | Read another segment of a large response without repeating the query |
| `get_balance`, `get_pricing`, `get_limits`, `get_usage` | Free account reads |

The software is free; queries use your existing FlashData Credits and plan limits. Downloads reserve Credits and settle by actual uploaded bytes. `get_pricing` returns current account pricing; Catalog estimates are not a billing authority. One user task may lead an agent to make multiple paid calls.

Start with “Check my FlashData balance, pricing and limits.” This does not submit a paid query. Then ask for the data you need, such as “Find three YouTube videos about home battery storage, retrieve their available transcripts, and include the source URLs.” The agent decides which tools to use.

Do not automatically repeat a timed-out query: it may already have been submitted and charged. JSON-RPC IDs are not billing idempotency keys. Check Jobs first. Read failures do not imply refunds.

Downloads require a `storage` object matching the [Download API](https://flashdata.dev/docs/sources/youtube_download). Storage credentials must come from the user's configured destination; never invent or echo them. The existing download protocol transmits these credentials to FlashData to perform the upload. This release does not inject storage credentials from a local file or hide them from the MCP client's tool arguments. Private object URLs still require the destination's own access controls.

Use dedicated, narrowly scoped, short-lived storage credentials where supported. Tool arguments may be retained in your MCP client's history or debug logs, even when the server itself does not log them. See [Security](SECURITY.md) for the trust boundaries and private vulnerability reporting channel.

## Configuration

| Environment variable | Default / requirement |
| --- | --- |
| `FLASHDATA_API_KEY` | Required; user's FlashData key |
| `FLASHDATA_DATA_API_URL` | `https://data.flashdata.dev` |
| `FLASHDATA_MANAGEMENT_API_URL` | `https://api.flashdata.dev` |
| `FLASHDATA_REQUEST_TIMEOUT_MS` | `65000`; integer from 1000 to 120000 |

API URLs must be HTTPS origins without credentials, path, query or fragment. Loopback HTTP is allowed for local development. Do not append `/v1` or `/v2`. Set custom origins only to servers you trust: they receive your key and queries. The package does not load `.env` automatically.

Every tool discovery or call revalidates API access through Management, including reads from the local result cache. Revoked keys and removed scopes cannot continue to access cached results. Management availability is therefore required for local tools; the existing hosted Data API/MCP keeps its own runtime boundaries. API access reads share a limit of 120 requests/minute per client IP; account tools also make their respective read request.

Completed jobs use the signed result URL returned by Management. The result origin must match the origin advertised by the authenticated `/v2/api-access` response, and use HTTPS (or loopback HTTP). API credentials are never sent to object storage, and storage redirects are not followed. This origin must be reachable from the machine running the local package.

## Large results and protocol

The local server uses stdio. The FlashData hosted endpoint continues to use Streamable HTTP. This project implements the public tool contract independently and connects to FlashData through REST APIs. This package does not implement OAuth, scraping, provider credentials, a credit ledger, or a local worker.

In stdio MCP, responses over 16,000 UTF-16 code units are split into JSON text chunks. Use `result_id` and `next_offset`, concatenate in order, then parse JSON. The in-memory store holds at most four results, each for ten minutes; restart clears it. The limit is per local process, and results are not shared with the hosted MCP cache. Each complete JSON response is limited to 4 MiB. Async JSON results retain the API's 24-hour window; media retention follows customer storage.

## Development and packaging

```sh
npm ci
npm test
npm run check:package
npm run test:install
npm run build:npm-tasks
npm run test:npm-tasks
npm pack
```

Tests spawn both an actual SDK stdio client and the JSON CLI against isolated local HTTP fixtures. They cover discovery, authorization changes, account reads, argument validation, query/download/batch forwarding, unknown POST outcomes, credential-free result delivery and bounded Unicode result caching. They do not contact paid providers or require Redis/MongoDB.

`npm run test:install` also installs the packed tarball into an empty temporary project and runs both the stdio and JSON CLI contracts against the installed executables.

`npm run build:npm-tasks` builds 15 source-restricted tarballs in `dist/npm`, including each package’s schema, example and guide. `npm run test:npm-tasks` installs those tarballs together in an empty project and tests every actual CLI and MCP executable. See [RELEASING.md](https://github.com/rocosen/flashdata-mcp/blob/main/RELEASING.md) for versioning and publication.

`npm pack` runs tests and verifies the file allowlist. The npm tarball contains the CLI, source, README, license and notices; it excludes tests, credentials, private backend code, deployment files and node_modules. A source repository should also retain tests, scripts, the lockfile, and the CI workflow.

## License

[MIT](LICENSE), covering this project. The FlashData hosted service and data remain subject to their own terms. Dependency notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
