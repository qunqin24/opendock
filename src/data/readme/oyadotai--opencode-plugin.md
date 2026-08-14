# Oya plugins for coding agents

Install the Oya plugin in your AI coding agent to build, deploy, and manage Oya agents and
skills without leaving your editor. Each is a real plugin for its tool (backed by the Oya MCP
server at `https://getoya.ai/api/mcp`), not a manual MCP config.

| Tool | Folder | Plugin type |
| --- | --- | --- |
| Claude Code | [`claude-code/`](./claude-code) | Plugin (`.claude-plugin/`) installed via `/plugin` |
| OpenAI Codex CLI | [`codex/`](./codex) | Plugin (`.codex-plugin/` + bundled MCP connector) via `codex plugin` |
| OpenCode | [`opencode/`](./opencode) | JS plugin (`@opencode-ai/plugin`) via `opencode.json` `plugin` |

Marketplaces in this folder (when published as a git repo):

- `.claude-plugin/marketplace.json` - Claude Code marketplace
- `.agents/plugins/marketplace.json` - Codex marketplace

## 1. Get an API key

Create an Oya API key at <https://getoya.ai> (Settings → API keys) and export it:

```bash
export OYA_API_KEY="a2a_..."
```

Every plugin sends it as `Authorization: Bearer $OYA_API_KEY`; the Oya server resolves your
identity from the key.

## 2. Install the plugin for your tool

Follow the README in the matching folder above.

## Tools your agent gets

- **skills** — list, get, create, update, delete
- **agents** — list, get, create, update, soul, list/add/update/remove/sync skills, update script,
  update/delete secrets, deploy, deploy_script, run_script
- **agent debugging** — get_runs, get_run, list_threads, get_thread, get_trace
- **agent portability** — export (OyaAgentSpec), fork
- **templates** — list, get, deploy, apply, create, update, fork, delete
- **routines** — list, create, update, trigger, delete
- **accounts** (agency) — whoami, list/create/delete customer sub-accounts
- **gateways** — list, list_connections, connect, plus management: platforms, create/update/delete, channels, test, logs, disconnect_connection, connect_token (sentry/posthog/kubernetes/browser/attio)
- **projects**, **knowledge_base**, **triggers**, **organizations** (members/teams/invitations/grants), **accounts** (agency), **evals**, **mcp_connections**, **agent_transfers**, **support**, **api_keys** — full facade coverage
- The MCP tool set mirrors the whole SDK facade (`<namespace>.<method>`), ~150 tools; call `tools/list` to enumerate. Admin/KYC, streaming, file upload/download, and webhook-ingress endpoints are intentionally not exposed.

(The interactive agent *build* flow - the Oya Engineer - stays in the Oya web app; these
plugins cover create / configure / deploy / run.)

## Endpoints

- Prod: `https://getoya.ai/api/mcp` · Dev: `https://dev.getoya.ai/api/mcp` · Local: `http://localhost:8000/api/mcp`

## Authentication

The CLIs and the three editor plugins above authenticate with an Oya API key sent as
`Authorization: Bearer $OYA_API_KEY`. The **claude.ai custom connector** instead signs in via
browser OAuth (the MCP server is an OAuth 2.1 resource server that bridges to your Oya/Supabase
login) — add `https://getoya.ai/api/mcp` as a custom connector and complete the sign-in; no API key
is entered there.
