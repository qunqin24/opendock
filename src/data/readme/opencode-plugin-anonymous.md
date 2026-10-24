# opencode-plugin-anonymous

An OpenCode V2 plugin that rewrites the identifying values OpenCode sends with provider requests.

Source and issues: <https://github.com/tachibana-shin/opencode-plugin-anonymous>

Goals:

- Replace session IDs, session affinity, project IDs, and client identity with random aliases.
- Keep an alias stable for a configurable number of requests, then rotate it.
- Rotate after roughly **20 requests** per session by default, with jitter so the
  rotation point is less predictable.
- Rotate the `b3` and `traceparent` trace identifiers on every request.
- Set the OpenCode version in the User-Agent, defaulting to the running version.
- Shift the `Today's date` line in the system prompt back by a week or a month,
  or remove it.
- Update the `Current conversation session ID` line so it matches the aliased
  session headers.
- Modify outbound requests and, when error scrubbing is enabled, remove
  provider-error messages from local history and from later model requests.
- Route provider requests through one of a configured list of base URLs, and
  switch to the next URL at runtime without restarting OpenCode.
- Ask what to do when a request fails: retry the last turn, switch proxy, or
  keep the error response.
- Show the active proxy in the TUI sidebar.
- Never touch `Authorization`.
- Touch only OpenCode's own identity headers. Provider-specific headers
  (Amazon, Anthropic, xAI, OpenAI, and so on) are left completely alone.
- Remove error-origin rows (provider errors, failed compactions, interrupted
  streams) from the local session database and from later model requests.

## How it works

The plugin registers OpenCode's `http.request` hook (plus the experimental
WebSocket handshake/send hooks). Before a request leaves the process, it:

1. Reads the configured OpenCode identity headers.
2. Maps each real value to a random alias, for example `ses_<random>`.
3. Keeps that alias for the next requests in the same window.
4. When the window ends, drops the old mapping and generates fresh aliases.
5. Replaces known IDs in JSON bodies, including the shortened
   `prompt_cache_key` form and IDs embedded in longer strings such as the
   system prompt.
6. Rewrites the system prompt's date line and session ID line.
7. Rotates trace headers and rewrites the User-Agent version.
8. Optionally writes the rewritten system prompt to a local file.

It also registers the `context`, `compaction`, and `generate` hooks to remove
error-origin messages before the provider sees them. When proxies are
configured, the `model.request` hook replaces the provider base URL with the
selected proxy. With `pauseOnError` enabled, the `retry` hook suppresses
OpenCode's automatic retry so the TUI can ask what to do.

Headers that carry the same real value receive the same alias. For example,
`x-opencode-session`, `x-session-affinity`, and `x-session-id` stay consistent
when they refer to the same session.

Session and project aliases preserve the length and rough character set of the
original value. This matters because OpenCode and some providers limit prompt
cache keys to 64 characters and may validate session ID formats. Client aliases
use a fixed `anon_<random>` form because they are display labels rather than
length-sensitive cache keys.

A real OpenCode session ID looks like `ses_` followed by **12 hex timestamp
characters** and 14 base62 characters. Session aliases keep that exact shape.
The OpenCode Console inference gateway parses the timestamp prefix; a random
base62 suffix in that position is rejected with `OpenCode's free tier can only
be used from within OpenCode`. Keep the `ses_` prefix and the 12+14 layout when
extending the alias generator.

### Error scrubbing

Provider failures leave rows in the local session database: assistant messages
with `finish: "error"` or a `content-filter` finish, failed compactions, failed
idle markers, and synthetic "previous response was interrupted" notices. On a
later request OpenCode can replay partial reasoning from those rows as normal
assistant text. The plugin removes them before they leave the machine.

For the session making a request, the plugin:

1. Reads the error-origin rows from `session_message`.
2. Deletes them with `PRAGMA secure_delete = ON` and checkpoints the WAL.
3. Removes matching messages from the request context: by message ID, by exact
   or long-prefix text match, by tool-call/tool-result ID, and by the synthetic
   interruption prefixes.

The database is discovered the same way the OpenCode CLI discovers it:
`OPENCODE_DB` (relative to the OpenCode data directory unless absolute) or the
channel database under `$XDG_DATA_HOME/opencode` or
`~/.local/share/opencode`. Set `scrubDatabase` to a path to override it. Set
`scrubDatabase: false` to keep the rows in the database but still filter them
from the request. Set `scrubErrors: false` to disable the feature entirely.

### Trace headers

OpenCode normally adds `b3` and `traceparent` through Effect after the
`http.request` hook runs. To make rotation effective, the plugin disables that
later propagation in the compiled OpenCode binary and supplies a fresh,
internally consistent trace pair itself. Both headers share the same trace ID
and span ID, as they did before.

If a future OpenCode build no longer exposes the internal reference, the plugin
still works; trace headers simply keep whatever OpenCode sends. Session,
project, client, body, and prompt rewrites are unaffected.

### System prompt

Only system prompts are altered:

- `Today's date: Fri Oct 23 2026` becomes `Fri Oct 16 2026` with the default
  `date: "week"`, `Wed Sep 23 2026` with `date: "month"`, or is removed with
  `date: "remove"`.
- `Current conversation session ID: ses_...` is replaced with the same alias
  used in the session headers.

User messages are never date-shifted. The date is shifted relative to the date
written in the prompt, not relative to the local clock.

### Proxy switching

`proxies` is an ordered list of absolute `http` or `https` base URLs. When the
list is not empty, the `model.request` hook replaces the provider base URL with
the current entry. The hook is scoped to the providers in `providers`. Each
switch advances to the next entry and wraps around; a single entry is always
used but cannot be switched.

```jsonc
{
  "providers": ["opencode"],
  "proxies": [
    "https://api.example.com",
    "https://api2.example.com"
  ]
}
```

Only the base URL changes. Proxy switching does not adjust `Authorization`,
provider-specific headers, or the request body, so the proxy must accept the
provider's API and credentials (or inject its own). This is base-URL switching,
not an HTTP or SOCKS forward proxy. Entries must be absolute, must not contain
credentials, and must not repeat.

The selected index is owned by the server plugin and kept in memory, so it
resets to the first entry when OpenCode restarts. The TUI reads and advances it
through the plugin's RPC methods (`status` and `nextProxy`), so every session
sees the same selection.

### Failure dialog and retry

With `pauseOnError: true` (the default), the plugin sets the `retry` hook
decision to `{ retry: false }`. OpenCode does not silently replay the failed
request, and the TUI opens a dialog containing:

- the error text, as a disabled entry;
- **Tiếp tục trả response lỗi / Đóng** — keep the failed turn in history;
- **Thử lại** — resend the last user message;
- **Đổi proxy** — switch to the next proxy, then resend. It is disabled with an
  explanation unless at least two proxies are configured.

Retry stages the failed turn with `session.revert.stage({ files: false })` and
then sends the reconstructed last user message with `session.prompt(...)`.
Sending the prompt commits the staged revert, which removes the failed turn
while keeping file changes on disk. Text, URI and inline attachments, agents,
skills, and mentions are rebuilt from the original message. If the prompt
cannot be sent, the staged revert is cleared so the session is not left in a
half-reverted state.

Only the main session is handled; subagent failures do not open a dialog, and
only one dialog is shown at a time. If the session is still running, retry
reports that instead of sending a duplicate prompt.

With `pauseOnError: false`, OpenCode's built-in retry policy is left untouched.
The dialog still listens for `session.execution.failed`, but OpenCode may retry
automatically first, so the dialog appears only once the failure is surfaced.

### Sidebar status

The bundled TUI plugin appends a small block to the sidebar's Context panel:

```text
● anonymous
proxy 2/3 · api2.example.com
```

The second line is `trực tiếp · không đổi proxy` when `proxies` is empty,
`đang kết nối` before the first status response, or `server chưa sẵn sàng`
when the server plugin cannot be reached. Status is refreshed on mount and
when a session starts running.

### TUI RPC

The server plugin exposes an `anonymous` RPC definition from `src/rpc.ts`:

| Method | Input | Output | Purpose |
| --- | --- | --- | --- |
| `status` | `{}` | `{ proxies, current }` | Read the configured proxies and the current selection. |
| `nextProxy` | `{}` | `{ changed, status }` | Advance to the next proxy and return the new status. |

The bundled TUI uses these methods. They are an internal interface between the
server and TUI plugins, not a stable public API.

## Installation

### From npm (recommended)

```bash
bunx opencode-plugin-anonymous install
```

The installer updates the global OpenCode config
(`~/.config/opencode/opencode.json` or `opencode.jsonc`, or
`$XDG_CONFIG_HOME/opencode/...`) and creates it when missing. It preserves
comments and unrelated settings, and writes a timestamped backup before
changing an existing file. The CLI runs with Bun, which OpenCode already uses.

Restart OpenCode afterwards.

Useful installer options:

```bash
# Project-local config instead of the global one
bunx opencode-plugin-anonymous install --project

# Edit a specific file
bunx opencode-plugin-anonymous install --config ./opencode.jsonc

# Configure proxies while installing
bunx opencode-plugin-anonymous install \
  --proxies https://api.example.com,https://backup.example.com

# Merge plugin options
bunx opencode-plugin-anonymous install --options '{"every":10,"date":"month"}'

# Preview without writing
bunx opencode-plugin-anonymous install --dry-run
```

`--options` is shallow-merged into existing options. Use `--replace-options`
to replace them, and `--no-backup` to skip the backup. Other commands:

```bash
bunx opencode-plugin-anonymous status
bunx opencode-plugin-anonymous uninstall
```

Both accept `--config`, `--project`, and `--global` (`--global` is the default).

### Manual configuration

Add the package to `~/.config/opencode/opencode.json` (or
`opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-plugin-anonymous",
      "options": {
        "providers": ["opencode"],
        "every": 20,
        "jitter": 0.2,
        "date": "week"
      }
    }
  ]
}
```

Pin a version with `"package": "opencode-plugin-anonymous@0.1.0"`. If a
`plugins` array already exists, append the object to it.

The package exposes a TUI entrypoint (`tui.tsx`). OpenCode loads it
automatically when the server plugin is enabled; no separate plugin entry is
needed.

### From a local checkout

```bash
cd /home/shin/opencode-plugin-anonymous
bun install
bun test
```

Then either add the absolute path manually:

```jsonc
{
  "plugins": [
    {
      "package": "/home/shin/opencode-plugin-anonymous",
      "options": {}
    }
  ]
}
```

or let the installer write it:

```bash
bun bin/cli.ts install --package /home/shin/opencode-plugin-anonymous
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `providers` | `string \| string[]` | `["opencode"]` | Providers to apply to. Use `"*"` for every provider. |
| `proxies` | `string \| string[]` | `[]` | Ordered provider base URLs. Requests use the selected entry; the TUI can switch to the next one. |
| `every` | `number` | `20` | Average number of requests before rotating session/project/client aliases. |
| `jitter` | `number` | `0.2` | Random variation of each window; `0.2` means roughly ±20%. Set `0` for a fixed `every`. |
| `session` | `boolean` | `true` | Rewrite session IDs, session affinity, and the session ID line in prompts. |
| `project` | `boolean` | `true` | Rewrite `x-opencode-project`. The literal value `global` is kept. |
| `client` | `boolean` | `true` | Rewrite `x-opencode-client`. |
| `trace` | `boolean` | `true` | Rotate `b3` and `traceparent` on every request. |
| `userAgent` | `false \| true \| string` | `false` | Set a fixed User-Agent. `true` uses `opencode/anon`. Takes precedence over `userAgentVersion`. |
| `userAgentVersion` | `false \| true \| string` | current version | Version to put in an `opencode/<channel>/<version>/<client>` User-Agent. `false` leaves the version alone. |
| `date` | `"keep" \| "week" \| "month" \| "remove"` | `"week"` | Shift the system prompt's `Today's date` line back, or remove it. |
| `dump` | `false \| true \| string` | `false` | Write the rewritten system prompt to this path. `true` uses a file in the system temp directory. |
| `body` | `boolean` | `true` | Replace known IDs in JSON request bodies, including embedded IDs. Values are only rewritten when their option (`session`, `project`, `client`) is enabled. |
| `headers` | `string[]` | `[]` | Additional header names to rewrite, for example `["x-org-id"]`. |
| `maxSessions` | `number` | `1024` | Maximum number of session windows kept in memory. |
| `scrubErrors` | `boolean` | `true` | Remove provider-error messages from the session database and from model requests. |
| `scrubDatabase` | `false \| "auto" \| string` | `"auto"` | Database to read/delete. `false` reads the default database but keeps the rows; a path overrides the location. |
| `scrubIdle` | `boolean` | `true` | Also remove failed idle markers that have no error object. |
| `scrubSynthetic` | `boolean` | `true` | Also remove "previous response was interrupted" and "server restarted" synthetic messages. |
| `scrubCheckpoint` | `boolean` | `true` | Checkpoint the WAL after deleting rows so old pages are truncated sooner. |
| `pauseOnError` | `boolean` | `true` | Suppress OpenCode's automatic retry so the TUI can offer retry, switch proxy, or keep the error. |

### Default headers

When `session: true`:

- `x-opencode-session-id`
- `x-opencode-parent-session-id`
- `x-opencode-session`
- `x-session-affinity`
- `x-session-id`
- `x-parent-session-id`

When `project: true`:

- `x-opencode-project`

When `client: true`:

- `x-opencode-client`

When `trace: true`:

- `b3`
- `traceparent`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`

`Authorization`, `originator`, `thread-id`, `x-client-request-id`,
`x-interaction-id`, `x-grok-conv-id`, `session-id`, `x-amzn-*`,
`anthropic-*`, and all other third-party headers are never rewritten.

## Configuration examples

Apply only to the OpenCode API and rotate after about 20 requests:

```jsonc
{
  "providers": ["opencode"],
  "every": 20,
  "jitter": 0.2,
  "date": "week"
}
```

Apply to every provider:

```jsonc
{
  "providers": ["*"],
  "every": 20
}
```

Route through a list of provider base URLs and ask before retrying:

```jsonc
{
  "providers": ["opencode"],
  "proxies": [
    "https://api.example.com",
    "https://backup.example.com"
  ],
  "pauseOnError": true
}
```

Restore OpenCode's automatic retries; the dialog appears only after OpenCode
gives up:

```jsonc
{
  "providers": ["opencode"],
  "pauseOnError": false
}
```

Rotate more often, hide client identity, and report an older version:

```jsonc
{
  "providers": ["*"],
  "every": 10,
  "jitter": 0.5,
  "client": true,
  "userAgentVersion": "2.0.0",
  "date": "month",
  "body": true
}
```

Remove the date line entirely:

```jsonc
{
  "providers": ["opencode"],
  "date": "remove"
}
```

Rewrite an additional identity header:

```jsonc
{
  "providers": ["opencode"],
  "headers": ["x-org-id"]
}
```

Keep provider errors in the local database but never send them upstream:

```jsonc
{
  "providers": ["opencode"],
  "scrubErrors": true,
  "scrubDatabase": false
}
```

Disable error scrubbing completely:

```jsonc
{
  "providers": ["opencode"],
  "scrubErrors": false
}
```

## Showing the system prompt that is actually sent

Set `dump` to a path:

```jsonc
{
  "providers": ["opencode"],
  "dump": "/tmp/opencode/system-prompt.txt"
}
```

The plugin writes the rewritten system prompt from the most recent non-title
request to that file, overwriting it each time. This is the exact text placed
in the provider request body, after the session alias, date shift, and ID
replacements. Title-generation requests are skipped so they do not overwrite
the main agent prompt.

You can inspect it while OpenCode runs:

```bash
cat /tmp/opencode/system-prompt.txt
```

A captured prompt normally contains:

```text
<env>
  Current conversation session ID: ses_<alias>
  Working directory: /path/to/project
  ...
</env>

Today's date: Fri Oct 16 2026
```

## Cleaning an existing database

The plugin scrubs a session when that session makes a new `context`,
`compaction`, or `generate` request. To inspect or clean older sessions, use the
bundled script. It is a dry run by default:

```bash
bun run scrub-db
bun run scrub-db --session ses_...
```

Back up the database before applying changes:

```bash
sqlite3 ~/.local/share/opencode/opencode.db ".backup '/tmp/opencode-backup.db'"
bun run scrub-db --apply
```

The script deletes the same error-origin rows as the plugin and checkpoints the
WAL. It accepts `--db <path>` for a custom database, `--channel <name>` for a
non-default channel, and `--session <id>` to limit the cleanup. Without
`--session`, it scans every session.

## Caveats

- **Prompt cache:** session affinity is part of the provider cache key. Rotating
  it makes each window look like a new cache lineage, which can reduce cache
  hits and increase cost. Increase `every` or set `session: false` if that
  matters more than rotation.
- **Trace correlation:** rotating trace IDs on every request deliberately breaks
  cross-request trace correlation for provider calls. Set `trace: false` if you
  need the original tracing behavior.
- **Trace suppression is build-specific:** the plugin locates Effect's internal
  trace-propagation reference in the compiled OpenCode binary. On a different
  build, trace rotation may fall back to leaving the original headers in place.
- **Proxy scope:** `proxies` only replaces the provider base URL. It is not an
  HTTP/SOCKS forward proxy, and it does not change authentication headers. The
  proxy must accept the provider's API and credentials, or inject its own.
- **Proxy selection is global and in memory:** all sessions share the same
  current entry, and a restart returns to the first entry. There is no per-agent
  or per-provider proxy selection.
- **Retry is destructive:** retrying removes the failed turn from the session
  and sends the last user message again. File changes are kept, but side effects
  of tool calls that already ran are not undone.
- **`pauseOnError` needs the TUI:** when the TUI is unavailable, a failure stays
  failed instead of being retried automatically. Set `pauseOnError: false` if
  you use OpenCode without the bundled TUI.
- **Failure dialog limits:** only main-session failures open the dialog, and
  only one dialog is shown at a time. Subagent failures are left to the normal
  session flow.
- **Server-side features:** some features may rely on stable session or project
  IDs for analytics, policy, or routing. If something breaks, try
  `project: false` or narrow `providers`.
- **OpenCode free tier:** Console inference parses the session ID and rejects
  malformed values with `OpenCode's free tier can only be used from within
  OpenCode`. This plugin preserves the `ses_` + 12 hex + 14 base62 shape, so
  session and date rotation work with free models. Free-tier quotas and rate
  limits are separate from this plugin.
- **Prompt text:** body rewriting also changes known session or project IDs that
  appear inside conversation text, because those IDs would otherwise leak in the
  system prompt. Unrelated text is left alone, and short human-readable values
  are never replaced inside longer strings.
- **Error scrubbing deletes history:** with the default `scrubErrors: true`,
  error-origin rows are permanently removed from `session_message`. Back up the
  database first if you need the history. Cleanup happens on the next
  `context`, `compaction`, or `generate` request, not at the instant the error
  occurs.
- **Database remnants:** `secure_delete` and the WAL checkpoint reduce deleted
  content in free pages, but this is not a forensic wipe. Use full-disk
  encryption and a separate database if you need stronger guarantees.
- **Compaction snapshots:** the request filter removes matching messages even
  when they arrive from a native compaction window. The plugin does not rewrite
  error text already embedded in a stored compaction snapshot.
- **Database access:** if the database is locked, missing, or on an unexpected
  channel path, the plugin logs one warning per session and keeps serving
  requests. Set `scrubDatabase` explicitly when you use a custom
  `OPENCODE_DB` location.
- **Not full anonymity:** IP address, credentials, conversation content,
  request timing, and model choice can still identify you. The plugin only
  rotates the identifiers listed above.
- **In-memory aliases:** restarting OpenCode generates new aliases. That is
  intentional.
- This plugin targets OpenCode V2 (`@opencode/plugin` 2.x).

## Publishing

Bump `version` in `package.json`, then publish from the repository root:

```bash
bun test
bun check
npm pack --dry-run
npm publish
```

`prepublishOnly` runs the tests and type check automatically. `bun publish`
works too if you prefer Bun's publisher. Authenticate with `npm login` first.

## Development

```bash
bun test
bun check
```
