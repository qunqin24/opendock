# opencode-session-correlation

OpenCode does not send a session identifier that LLM gateways can group requests by, so gateways with Claude Code-specific session handling (for example a LiteLLM deployment that recognizes real Claude Code CLI traffic) can't tell which requests belong to the same OpenCode conversation.

This plugin closes that gap by **mimicking the Claude Code CLI**: it sends the same `x-claude-code-session-id` header that Claude Code itself sends, populated with a UUID derived from the native OpenCode session ID. A gateway that already has special handling for that header — because it supports Claude Code — will display and group OpenCode sessions the same way it does Claude Code sessions.

It is not a generic "add a header" utility, and it is not LiteLLM's own documented session mechanism (LiteLLM's own session grouping takes a `litellm_session_id` field in the request body — see [LiteLLM Session Logs](https://docs.litellm.ai/docs/proxy/ui_logs_sessions)). This plugin instead piggybacks on whatever Claude Code-specific handling a gateway already has, by making OpenCode requests indistinguishable, header-wise, from Claude Code requests.

## What it does

- Hooks into OpenCode's `chat.headers` event.
- For configured provider IDs only, adds the `x-claude-code-session-id` header, populated with a UUID derived from the native OpenCode session ID.
- Persists the native-session-to-UUID mapping locally so the same OpenCode session always sends the same UUID.
- Does nothing for providers that are not in the configured list.

## What it does not do

- It does not change request bodies, models, endpoints, or authentication.
- It does not add other client-identity headers such as `User-Agent` or `x-app`.
- It does not send end-user metadata or log prompts, secrets, or request bodies.
- It does not let you change the header name. The header is fixed to `x-claude-code-session-id` because the whole mechanism depends on matching what the real Claude Code CLI sends — a different name would not be recognized by a gateway's Claude Code-specific handling and would defeat the plugin's purpose.
- It does not guarantee that a gateway displays or uses the header. Whether a gateway maps this header into a "Session ID" field depends entirely on that gateway's own request parsing, and this behavior is not part of LiteLLM's documented public API as of this writing — verify against your own gateway before relying on it.

## Install

```bash
npm install opencode-session-correlation
```

## Configuration

Add to `opencode.json`:

```json
{
  "plugin": [
    [
      "opencode-session-correlation",
      {
        "providers": ["example-gateway"]
      }
    ]
  ]
}
```

Using a local checkout instead of the npm package? Point at the directory instead:

```json
{
  "plugin": [
    [
      "/absolute/path/to/opencode-session-correlation",
      {
        "providers": ["example-gateway"]
      }
    ]
  ]
}
```

- `providers` (required): non-empty array of provider IDs from your OpenCode config. The header is only added for these providers — everything else (direct Anthropic, OpenAI, etc.) is left untouched, since sending a fake Claude Code header to a provider that isn't your gateway would be meaningless at best and misleading at worst.
- `storagePath` (optional, advanced): override the local mapping file. Defaults to `${XDG_DATA_HOME:-$HOME/.local/share}/opencode/session-correlation.json`.
- `collapseToRootSession` (optional, default `false`): when `true`, subagent/task sessions (which OpenCode creates as child sessions with a `parentID`) resolve up to their root session and share that root's UUID, instead of each getting its own UUID. When `false` (default), every OpenCode session — including subagent sessions — gets its own distinct UUID.

### Choosing `collapseToRootSession`

OpenCode's `task` tool creates a new session for every subagent dispatch, chained via `parentID` back to the session that spawned it. With `collapseToRootSession: false` (default), a single multi-agent run that dispatches several subagents shows up as many separate sessions to your gateway. With `collapseToRootSession: true`, the whole run shows up as one session.

Before enabling this, check whether your gateway enforces any per-session rate or budget limits (for example LiteLLM's `max_iterations` / `max_budget_per_session`, which are scoped to a session identifier). If such a limit exists, collapsing many subagent calls into one session ID could trip it sooner than the default per-session behavior would. This plugin does not affect Anthropic prompt caching either way — caching is based on request content (`cache_control` breakpoints), not on this header.

## Local storage format

```json
{
  "version": 1,
  "sessions": {
    "ses_0a5874314ffeZc2KAFu7EsMCOK": "887b16ff-ccb1-4723-80a0-f6d653e663b0"
  }
}
```

Native OpenCode session IDs are stored only in this local file. They are not sent to any provider; only the mapped UUID is sent in the `x-claude-code-session-id` header.

## Verifying against a gateway

1. Configure a target provider ID in `providers`.
2. Send two prompts in the same OpenCode session using a model routed through that provider.
3. Inspect both requests in your gateway's logs/dashboard.
4. Confirm both requests carry the same header value, and check whether your gateway surfaces that value as a session identifier. This plugin only controls what OpenCode sends; whether a gateway acts on it is gateway-specific.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the pull request process. Please also review the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md). Do not open a public issue for security reports.

## License

MIT — see [LICENSE](LICENSE).
