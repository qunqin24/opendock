# agent-router

Local OpenAPI-compatible router for `codex`, `claude`, and `gemini` CLIs over ACP.

## What this project provides

- One HTTP router for three CLI backends (Codex ACP, Claude ACP, Gemini CLI)
- OpenAI-style endpoints:
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
- Native ACP endpoints:
  - `POST /v1/agents/chat`
  - `POST /v1/agents/chat/stream`
- Worker pool + sticky sessions for long-running chats
- MCP server forwarding to CLI runtimes
- OpenCode plugin (`opencode-cli-acp`) with dynamic provider/model injection

## Requirements

- Node.js 20+
- CLI tools in `PATH`:
  - `codex-acp`
  - `claude-code-acp`
  - `gemini`

Install CLIs if needed:

```powershell
npm i -g @zed-industries/codex-acp
npm i -g @zed-industries/claude-code-acp
npm i -g @google/gemini-cli
```

## Quick start (router)

```powershell
npm install
npm start
```

Default router address:

- `http://127.0.0.1:8787`

## Quick API examples

List models:

```powershell
irm "http://127.0.0.1:8787/v1/models"
```

Non-streaming chat call:

```powershell
$body = @{
  provider = "cliacp"
  model = "gpt-5.3-codex"
  message = "Respond with exactly OK"
} | ConvertTo-Json

irm -Method Post `
  -Uri "http://127.0.0.1:8787/v1/agents/chat" `
  -ContentType "application/json" `
  -Body $body
```

OpenAI Responses streaming call:

```powershell
$body = @{
  model = "gemini-3.1-pro-preview"
  stream = $true
  input = @(
    @{
      role = "user"
      content = @(
        @{
          type = "input_text"
          text = "Respond with exactly OK"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 8

irm -Method Post `
  -Uri "http://127.0.0.1:8787/v1/responses" `
  -ContentType "application/json" `
  -Body $body
```

## Authentication behavior

If no API key is passed, CLI native auth/session is used.

For requests, API key precedence is:

1. `apiKey` in request body
2. `X-API-Key` header (or `Authorization: Bearer ...`)
3. `CLI_ACP_API_KEY` env

For model catalog loading (`/v1/models`), optional per-provider env keys are also supported:

- `CLI_ACP_CODEX_API_KEY`
- `CLI_ACP_CLAUDE_API_KEY`
- `CLI_ACP_GEMINI_API_KEY`

Gemini runtime behavior:

- if request starts with API key auth and Gemini returns an invalid-key auth error, router retries the same request once without API key (native CLI auth/OAuth).

## Upstream URL behavior

By default, router does not force custom upstream URLs and lets each official CLI use its native default endpoint.

Global overrides:

- `CLI_ACP_CODEX_BASE_URL`
- `CLI_ACP_CLAUDE_BASE_URL`
- `CLI_ACP_GEMINI_BASE_URL`

Per-request overrides:

- `baseUrl` for Codex/Claude
- `geminiBaseUrl` for Gemini

## Worker pool and sessions

Pool is enabled by default (`ACP_POOL_ENABLED=1`).

Session modes:

- `stateless`: reuse worker process, create new ACP session per request
- `sticky`: reuse ACP session using `routerSessionId`

Useful endpoints:

- `GET /health`
- `GET /v1/runtime`
- `GET /v1/providers`
- `GET /openapi.json`

## OpenCode plugin

OpenCode plugin package: `opencode-cli-acp`

Plugin docs:

- `opencode/README.md`

Build plugin bundle:

```powershell
npm run build:opencode-plugin
```

Local dev install:

```powershell
npm run dev:opencode-plugin:install
```

Local dev uninstall:

```powershell
npm run dev:opencode-plugin:uninstall
```

## Build and test scripts

- Type check/build TS: `npm run build:ts`
- Build plugin bundle: `npm run build:opencode-plugin`
- Build standalone router exe: `npm run build:router:exe`
- Router smoke check: `npm run smoke:router -- --model gpt-5.3-codex --message "Respond with exactly OK"`

Standalone exe output:

- `dist/router/agent-router.exe`
