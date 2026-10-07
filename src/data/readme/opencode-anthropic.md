# opencode-anthropic

OpenCode V2 plugin that brings **Claude Pro/Max OAuth** back to the Anthropic
provider.

OpenCode V2 removed Anthropic OAuth after a legal request from Anthropic, but
the plumbing is still there: OAuth credentials are stored and sent as
`Authorization: Bearer`. This plugin completes the picture:

- keeps Claude tokens fresh (refresh 10 minutes before expiry, single-flight,
  with backoff and a cross-process fallback);
- mirrors the captured Claude Code 2.1.289 request profile: billing-header
  system block, identity block, `metadata.user_id` (persistent random device
  id), thinking enabled with `display: omitted`, `context_management`, SDK
  telemetry headers, `x-claude-code-session-id`, and the matching beta flags;
- exposes OpenCode tools under Claude Code names (`shell` → `Bash`, `subagent`
  → `Agent`, ...) and translates Claude Code argument shapes (`file_path`,
  `old_string`, `run_in_background`) back onto OpenCode schemas before they are
  parsed;
- honours Anthropic's `retry-after` hint when OpenCode retries a rate limit.

It is a V2 port of the community
[`opencode-anthropic-oauth`](https://www.npmjs.com/package/opencode-anthropic-oauth)
(MIT) plugin, which only runs on OpenCode V1.

> **Warning:** Anthropic's Terms of Service say OAuth tokens from Free/Pro/Max
> plans must only be used by official clients. Since April 2026, third-party
> apps authenticated this way are metered against a separate prepaid **extra
> usage** balance (claude.ai/settings/usage) instead of the plan limits, and
> requests are blocked while that balance is empty. This plugin is a community
> workaround: it can stop working without notice and you use it at your own
> risk.

## Requirements

- OpenCode V2 (tested with 2.0.22);
- Node.js 20+ (for the login script and tests);
- A Claude Pro/Max subscription with an extra-usage balance, or an Anthropic
  API key (API keys pass through the plugin untouched).

## Install

From npm, add the package to the OpenCode config:

```jsonc
{
  "plugins": [
    "opencode-anthropic"
  ]
}
```

Or use the CLI: `opencode plugin add opencode-anthropic`.

For a local checkout, point the config at the directory instead (global
config example, `~/.config/opencode/opencode.json`):

```jsonc
{
  "plugins": [
    "../path/to/opencode-anthropic"
  ]
}
```

Or copy the directory into `~/.config/opencode/plugins/opencode-anthropic/`,
where local plugins are auto-discovered. Restart the OpenCode service after
changing plugins: `opencode service restart`.

## Login

Use the regular OpenCode connect flow:

```
/connect → Anthropic → Claude Pro/Max
```

The plugin registers that method on the Anthropic integration: it opens the
claude.ai authorization page, asks for the code Claude shows, exchanges it,
and lets OpenCode store the credential. The bundled script does the same from
a terminal (useful for headless machines and CI):

```bash
node login.mjs            # from a checkout
# or, when installed from npm:
opencode-anthropic login
```

Add `--no-browser` to only print the authorization URL. The script opens the
browser flow, asks for the code Anthropic shows, exchanges it for tokens,
registers the credential in the running OpenCode server over its local HTTP
API (tokens never travel through process arguments), and saves a local cache
in `~/.local/share/opencode/opencode-anthropic.json` (mode `0600`).

Then pick an `anthropic/claude-*` model in OpenCode. The plugin refreshes the
token automatically.

## How it works

- **Strict gating.** The plugin only acts while an Anthropic **OAuth**
  credential is the active connection. API keys, env credentials, and the
  logged-out state pass through untouched — no surprises with `ps`, no stale
  tokens resurrected after logout.
- **Connection-bound cache.** Refreshed tokens are stored in plugin storage
  and in the token file, tagged with the OpenCode connection id they belong
  to. Cached tokens from another connection (account switch, re-login) are
  ignored.
- **Refresh.** Tokens within 10 minutes of expiry are refreshed before the
  request. Concurrent requests share one refresh; a failed refresh backs off
  for 5 minutes. If another process refreshed first, a still-valid cached
  token is used instead of failing the request.
- **Request shaping.** `http.request` hook (provider `anthropic`): replaces
  the authorization header with a fresh bearer token, removes `x-api-key`,
  sets `user-agent: claude-cli/<version> (external, <entrypoint>)`,
  `x-app: cli`, `x-claude-code-session-id` (a stable UUID per OpenCode
  session), `anthropic-dangerous-direct-browser-access: true`, the
  `x-stainless-*` telemetry headers and `accept: application/json`, and merges
  the `anthropic-beta` flags.
- **Claude Code request profile.** The body is shaped like the captured
  Claude Code 2.1.289 request: the billing-header line becomes `system[0]`,
  the identity becomes `system[1]`, `metadata.user_id` carries a persistent
  random device id plus the session id, and thinking-capable primary requests
  get `thinking: { type: "enabled", budget_tokens: max_tokens - 1,
  display: "omitted" }` with `context_management.edits` to match. Each piece is
  individually switchable (see Configuration).
- **Response shaping.** `http.response` hook: parses SSE events, renames
  `tool_use.name` back to the OpenCode name, and translates the arguments of
  mapped tools. Argument fragments are held until the content block closes;
  when nothing changes the original frames are passed through byte for byte,
  and unparseable fragments fall back untouched.
- **Native `/connect`.** The plugin registers "Claude Pro/Max" as an OAuth
  method on the Anthropic integration, so the normal connect UI (and the
  integration OAuth API) works without the CLI script.
- **Rate limits.** A 429/503/529 response records Anthropic's `retry-after`
  value; the session `retry` hook hands it back as the retry delay instead of
  letting OpenCode hammer the endpoint.

### System prompt and tools

The default `prepend` mode builds the system array like Claude Code does: the
billing-header line (`x-anthropic-billing-header: cc_version=2.1.289.45c;
cc_entrypoint=cli;`) as the first block, then the identity ("You are a Claude
agent, built on Anthropic's Claude Agent SDK."), then the OpenCode prompt.
Set `ANTHROPIC_OAUTH_SYSTEM_IDENTITY` (or the `identity` option) to pin the
2025 wording or your own string.

`tools.mjs` holds an explicit compatibility table: only OpenCode tools with a
Claude Code counterpart are renamed, and each mapped tool also translates the
argument shapes a Claude Code model may produce:

| OpenCode | Exposed as | Arguments translated |
| --- | --- | --- |
| `read` | `Read` | `file_path` → `path`; drops `pages` |
| `write` | `Write` | `file_path` → `path` |
| `edit` | `Edit` | `file_path`, `old_string`, `new_string`, `replace_all` |
| `shell` | `Bash` | `run_in_background` → `background`; drops `description` |
| `grep` | `Grep` | `glob` → `include`, `head_limit` → `limit`, `-i` |
| `subagent` | `Agent` | `subagent_type` → `agent`, `run_in_background` → `background` |
| `question` | `AskUserQuestion` | `multiSelect` → `multiple` |
| `todowrite` | `TodoWrite` | drops `activeForm` |
| `webfetch` | `WebFetch` | drops `prompt` |
| `websearch` | `WebSearch` | drops domain filters |
| `skill` | `Skill` | `skill` → `id`; drops `args` |
| `glob` | `Glob` | — |

OpenCode-only tools (`compress`, `todoread`, `execute`/Code Mode) and unknown
tools (MCP) are left untouched. `toolAliases` can override any mapping, e.g.
`{ "subagent": "Task" }` for the pre-2.1 Claude Code name.

## Configuration

Options can be passed through the OpenCode config:

```jsonc
{
  "plugins": [
    {
      "package": "../path/to/opencode-anthropic",
      "options": {
        "systemMode": "prepend",
        "renameTools": true,
        "toolAliases": { "my_tool": "Read" }
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `systemMode` | `prepend` | `prepend`, `replace` (rewrites the first block), or `off` |
| `identity` | current Claude Code line | Overrides the injected identity string |
| `billingHeader` | `true` | Prepend the Claude Code billing-header system block |
| `metadata` | `true` | Send `metadata.user_id` with a persistent random device id |
| `thinking` | `true` | Add Claude Code thinking and `context_management` to primary Claude requests |
| `sdkHeaders` | `true` | Send the `x-stainless-*` telemetry headers |
| `renameTools` | `true` | Rename tools to Claude Code casing and back |
| `toolAliases` | `{}` | Extra or overriding tool-name mappings |

Environment variables (useful when the plugin is loaded as a directory):
`ANTHROPIC_OAUTH_SYSTEM_MODE`, `ANTHROPIC_OAUTH_SYSTEM_IDENTITY`,
`ANTHROPIC_OAUTH_BILLING_HEADER=0`, `ANTHROPIC_OAUTH_METADATA=0`,
`ANTHROPIC_OAUTH_THINKING=0`, `ANTHROPIC_OAUTH_SDK_HEADERS=0`,
`ANTHROPIC_OAUTH_RENAME_TOOLS=0`, `ANTHROPIC_OAUTH_TOOL_ALIASES` (JSON),
`ANTHROPIC_OAUTH_DUMP` (append every transformed OAuth request to a JSONL
file), `ANTHROPIC_CLI_VERSION`, `ANTHROPIC_CLI_BUILD`,
`ANTHROPIC_CLI_ENTRYPOINT`, `ANTHROPIC_BILLING_HEADER` (full line override),
`ANTHROPIC_SDK_VERSION`, `ANTHROPIC_NODE_VERSION`, `ANTHROPIC_BETA_FLAGS`,
`XDG_DATA_HOME`.

## Troubleshooting

- **401/403 on every request** — the refresh token was revoked or the login
  expired. Run the login again.
- **Provider does not show up** — check `opencode auth list`; the
  "Claude Pro/Max" credential must exist.
- **Tools do not execute** — try `ANTHROPIC_OAUTH_RENAME_TOOLS=0` and restart
  the service.
- **Logout** — remove the credential with `/connect`; cached tokens are
  ignored automatically because no OAuth connection is active anymore.

## Development

No dependencies; tests use the Node.js built-in runner and a mock token
server:

```bash
node --test
```

The repo includes a headless capture tool that runs the local `claude` binary
against a mock endpoint with an isolated config dir (no account, no real API):

```bash
npm run capture                                  # capture + summarise
node scripts/claude-capture.mjs --compare a.json b.json
```

`--compare` accepts a Claude capture and an OpenCode side (for example the
JSONL written by `ANTHROPIC_OAUTH_DUMP`).

## Known limitations

- Subscription OAuth usage is billed by Anthropic from the prepaid "extra
  usage" balance (per-token) rather than the plan limits. The plugin cannot
  change which pool a request is metered from; API keys are unaffected.
- The native `/connect` OAuth method is registered by this plugin; if the
  registration fails (older OpenCode builds), `/connect` will not show
  "Claude Pro/Max" and the bundled `login.mjs` script remains the fallback.
- The plugin targets a Claude Code compatibility profile
  (`claude-cli/2.1.289`). Newer releases can be selected with
  `ANTHROPIC_CLI_VERSION`, but the beta flags and tool list may need updating.
- Thinking is enabled by default for `claude-sonnet-*`/`claude-opus-*`
  primary requests, mirroring Claude Code (`budget_tokens: max_tokens - 1`,
  `display: "omitted"`). Disable with `ANTHROPIC_OAUTH_THINKING=0` or the
  `thinking` option to keep OpenCode's own behaviour.
- The billing header mirrors the captured 2.1.289 line, which has no `cch`
  hash; newer Claude Code builds may include one this plugin cannot compute.
- The full Claude Code system prompt and tool descriptions are not copied
  (they are Anthropic's content and change every release): OpenCode's prompt
  and schemas are sent with the identity/billing prefix instead. The device id
  is a random per-install id, not a Claude Code install id.
- Refreshed tokens are kept in plugin storage and in the token file; OpenCode's
  stored credential keeps the original access token until the next login.

## Credits and license

MIT. Ported from
[`opencode-anthropic-oauth`](https://github.com/shahidshabbir-se/opencode-anthropic-oauth)
(MIT) by shahidshabbir-se. See [LICENSE](LICENSE).
