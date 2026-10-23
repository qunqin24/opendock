# metria-opencode

OpenCode V2 CLI plugin that shows the current AI provider usage in the prompt footer (next to agent/model), powered by [Metria](https://github.com/yurirxmos/metria)'s usage logic.

- Always shows the main window (e.g. `5h 42%`) for the selected model's provider, colored by threshold (40/65/85%).
- If another window (weekly/monthly) goes past 85%, shows `▲ 7d 91%` next to it; at 100% it turns red.
- When a limit is hit (100%), shows the time until reset: `5h 100% · resets in 1h30m`. The counter refreshes on its own and, when it reaches zero, usage is fetched again.
- If measurement fails (expired credential, network), shows `usage !` in the footer and a toast explains why.
- `/usage` (or `/metria`) opens a window with the usage of **all** providers the plugin detected (Claude, Codex and OpenCode Go), with a bar per window, color by threshold and time until reset. Providers without a known quota endpoint show their **OpenCode usage** instead (tokens in/out and cost per window, from `session.stats`).

| OpenCode provider | Source |
| --- | --- |
| `anthropic` | OpenCode server credential, macOS Keychain (`Claude Code-credentials`) or `~/.claude/.credentials.json` → `api.anthropic.com/api/oauth/usage` |
| `openai` | OpenCode server credential or `~/.codex/auth.json` → `chatgpt.com/backend-api/wham/usage` |
| `opencode-go` | OpenCode Console OAuth (or the `opencode-go` API key / `auth.json`) → `opencode.ai/zen/go/v1/usage` |

Credentials come from the OpenCode server first, so a key swapped in the UI (`opencode auth login`, `/connect`, Console) is picked up immediately — `auth.json` is only a fallback.

On macOS the Claude Code stores its OAuth in the Keychain, and the `opencode-go` provider is authenticated by the Console OAuth (the standalone API key expires on its own) — the plugin tries the sources in that order.

When the OpenAI/Codex token is expired, the plugin renews it on its own through `auth.openai.com/oauth/token` (the same flow as the Codex CLI), without touching the credential files.

Refreshes when switching providers, after each response (at most 1x/min) and every 5 min.

## Installation

```sh
opencode plugin add metria-opencode
opencode service restart
```

Since the plugin is TUI-only, it goes straight into `~/.config/opencode/cli.json`.

### Development

```sh
git clone https://github.com/yurirxmos/metria-opencode
cd metria-opencode
bun install
```

Point `~/.config/opencode/cli.json` at the local directory:

```json
{ "plugins": ["/path/to/metria-opencode"] }
```

After changing the code, restart with `opencode service restart`.

```sh
npm run check   # typecheck
npm test        # tests
```
