# openqwencode

Local OpenCode plugin for qwen.ai OAuth, with the same persistent credential cache style as `qwen-code` and `opencode-qwen-auth`, but without the legacy built-in Qwen providers/models.

This plugin builds on the newer Qwen Code direction and refresh work, adapted for OpenCode as a dedicated plugin-based integration.

It was also created because older OpenCode Qwen auth plugins like [`1579364808/opencode-qwen-auth`](https://github.com/1579364808/opencode-qwen-auth) and [`gustavodiasdev/opencode-qwencode-auth`](https://github.com/gustavodiasdev/opencode-qwencode-auth) no longer work.

## Reviewed external references

This plugin was built after reviewing the main public Qwen/OpenCode auth implementations and forks, not just a single upstream:

- [`QwenLM/qwen-code`](https://github.com/QwenLM/qwen-code): primary upstream reference for OAuth flow, credential persistence, and refresh behavior
- [`foxswat/opencode-qwen-auth`](https://github.com/foxswat/opencode-qwen-auth): strongest reference for resilience improvements and OpenCode integration ideas
- [`RunMintOn/OpenCode-Qwen-Proxy`](https://github.com/RunMintOn/OpenCode-Qwen-Proxy): useful reference for throttling and burst-handling behavior
- [`1579364808/opencode-qwen-auth`](https://github.com/1579364808/opencode-qwen-auth): reviewed as an older baseline
- [`gustavodiasdev/opencode-qwencode-auth`](https://github.com/gustavodiasdev/opencode-qwencode-auth): reviewed as another older OpenCode-oriented implementation

The current design intentionally follows the strongest parts of those implementations while keeping the plugin small, current, and focused on the official free Qwen OAuth path.

## Language rule

- Everything in this project must be written in English.

## What this plugin does

- login provider: `openqwencode`
- model path: `openqwencode/coder-model`
- only the official free OAuth model: `coder-model`
- image input through the same `coder-model`
- tokens stored in qwen-code-compatible format in `~/.qwen/oauth_creds.json`
- automatic refresh so you do not have to log in again every day
- atomic writes + lockfile so multiple processes do not corrupt credentials
- in-memory cache with periodic disk sync
- backoff for `429` and temporary server errors
- cancellable auth polling, including process-signal cancellation
- removes/overrides legacy `qwen` and `qwen-code` providers

## OpenCode config

```json
{
  "$schema": "https://opencode.ai/config.json",
  "disabled_providers": ["qwen", "qwen-code"],
  "plugin": ["file:///ABSOLUTE/PATH/TO/openqwencode"]
}
```

Login:

```bash
opencode auth login -p openqwencode
```

Then use:

```bash
opencode --model openqwencode/coder-model
```

## Install and use in OpenCode

Install the package:

```bash
npm install openqwencode
```

Add it to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "disabled_providers": ["qwen", "qwen-code"],
  "plugin": ["openqwencode"]
}
```

Authenticate:

```bash
opencode auth login -p openqwencode
```

Run OpenCode with the plugin model:

```bash
opencode --model openqwencode/coder-model
```

Link this install to your telemetry dashboard connection:

```bash
npx openqwencode link
```

## Optional environment variables

Keep these unset unless you explicitly want the behavior.

- `OPENQWENCODE_BASE_URL`: overrides the upstream OpenAI-compatible API base URL. If set to a bare origin such as `https://qwen.2631.eu`, the plugin normalizes it to `/v1` automatically.
- `OPENQWENCODE_TELEMETRY_ENDPOINT`: sends a best-effort telemetry `POST` after each final model request response.
- `OPENQWENCODE_TELEMETRY_LINK_URL`: optional override for the device-link service base URL. If unset, the plugin derives it from `OPENQWENCODE_TELEMETRY_ENDPOINT`.

Example:

```bash
export OPENQWENCODE_BASE_URL="https://qwen.2631.eu"
export OPENQWENCODE_TELEMETRY_ENDPOINT="https://qwen.2631.eu/telemetry"
# optional if your link flow lives elsewhere
export OPENQWENCODE_TELEMETRY_LINK_URL="https://qwen.2631.eu"
```

The telemetry payload is intentionally minimal:

```json
{
  "ts": "2026-04-13T12:34:56.789Z",
  "deviceCode": "a1b2c3d4e5f6",
  "requestCount": 1,
  "attempts": 1,
  "status": 200,
  "durationMs": 842,
  "path": "/v1/chat/completions"
}
```

Notes:

- your telemetry server will already see the client IP at the HTTP layer, so the plugin does not send it explicitly
- `deviceCode` is a deterministic short hash derived from the local machine identity so you can distinguish computers without sending raw host details
- the device-link flow stores its long-lived telemetry token separately in `~/.qwen/telemetry_creds.json`
- run `npx openqwencode link` to open the dashboard link page, enter the short code shown in the terminal, and attach this computer to one shared connection bucket
- telemetry is fire-and-forget, best-effort, and disabled by default
- no official public Qwen Code reset time could be confirmed; use the UTC timestamp (`ts`) to inspect your own reset pattern from collected telemetry

If you upgraded from an older published version and OpenCode still does not see the model, clear the cached package and refresh:

```bash
rm -rf ~/.cache/opencode/packages/openqwencode@latest ~/.cache/opencode/node_modules/openqwencode
opencode models --refresh
```

## Notes

- upstream `QwenLM/qwen-code` only uses `coder-model` for the free OAuth flow
- `qwen3-coder-plus`, `qwen3-vl-plus`, and `vision-model` are intentionally no longer exposed
- the plugin injects the Qwen OAuth headers and a minimal Qwen Code system message
- the local credential file is the primary source of truth; OpenCode auth state is only used as a bootstrap/migration path
- project rules, release workflow, and backlog now live in `AGENTS.md`
