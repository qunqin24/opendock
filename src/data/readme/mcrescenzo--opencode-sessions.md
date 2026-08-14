# opencode-sessions

Give your opencode agent memory of past sessions. Recall what you tried last
time, check what a subagent's session actually did, or search weeks of
transcripts for that one snippet — all without leaving the conversation.
`opencode-sessions` adds four read-only tools that let an agent list, inspect,
read, and search local opencode session history through opencode's SDK
session API. Nothing it exposes can modify, delete, or resume a session.

## Quick Start

Requirements:

- Node.js `>=20.11.0`
- opencode with plugin support

Install the package:

```sh
bun add @mcrescenzo/opencode-sessions
```

```sh
npm install @mcrescenzo/opencode-sessions
```

Register it in `opencode.json`:

```json
{
  "plugin": ["@mcrescenzo/opencode-sessions"]
}
```

For local development from a source checkout, register the checkout entrypoint path instead of the package name:

```json
{
  "plugin": ["./opencode-sessions.js"]
}
```

This plugin does not auto-allow its tools. Grant only the tools you want agents to use:

```json
{
  "permission": {
    "session_list": "allow",
    "session_info": "allow",
    "session_read": "allow",
    "session_search": "allow"
  }
}
```

After installing, registering, or changing this plugin, restart opencode. Running sessions keep already-loaded plugin code.

## Example

Say you can't remember which past session settled on an auth approach. Ask
the agent directly — it can search transcripts and read the one that matches:

> "What did we decide about auth? I think it came up in a session last week."

The agent first calls `session_search` to find candidate sessions, then
`session_read` to pull the full exchange from the one that matches. The
output below is illustrative — the session IDs and message content are made
up for this example — but the format matches what the tools actually return.

`session_search({ query: "auth" })`

```
Session search for text "auth" in /home/user/project: 3 matches across 12 session(s) scanned, 640 message(s) scanned
1. ses_a1b2c3d4 — Refactor auth middleware
   message=msg_9f8e7d6c role=assistant time=2026-06-30T18:22:04.000Z
   …we decided to use short-lived JWTs with a 15-minute expiry and rotate refresh tokens server-side, no session cookies…
2. ses_a1b2c3d4 — Refactor auth middleware
   message=msg_9f8e7d71 role=user time=2026-06-30T18:23:11.000Z
   …agreed, let's lock that in and update the API gateway config…
3. ses_7f00e211 — Fix login redirect loop
   message=msg_11aa22bb role=assistant time=2026-06-24T09:04:57.000Z
   …the redirect loop was unrelated to auth, it was a stale cookie path…
```

`session_read({ sessionId: "ses_a1b2c3d4", limit: 20 })`

```
Transcript for Refactor auth middleware (ses_a1b2c3d4) in /home/user/project: 20 messages (limit=20)

--- user msg_9f8e7d6b @ 2026-06-30T18:21:50.000Z
What auth approach should we use for the new service?

--- assistant msg_9f8e7d6c @ 2026-06-30T18:22:04.000Z
Let's use short-lived JWTs (15-minute expiry) with server-side refresh token rotation. No session cookies — Authorization header only.

--- user msg_9f8e7d71 @ 2026-06-30T18:23:11.000Z
Agreed, let's lock that in and update the API gateway config.
```

The agent now answers from the actual transcript instead of guessing.

### For AI agents

Tools are read-only, scoped to the current project directory, and
output-bounded by default (`session_read` caps at 100 messages / 30,000
characters unless raised). When you don't know which session to read, call
`session_search` first to find a `sessionId` — it's cheaper than scanning
sessions one at a time with `session_read`.

## Tools

All tools are read-only, output-bounded, and scoped to the invoking opencode session's current project directory. Caller-supplied `directory` values are accepted for compatibility but ignored.

### `session_list`

Lists local sessions for the current project directory.

| Argument | Type | Default | Bounds | Notes |
| --- | --- | --- | --- | --- |
| `directory` | string | current project | ignored | Compatibility-only; `context.directory` is always used. |
| `limit` | integer | `50` | `1..200` | Maximum sessions shown. |
| `includeCurrent` | boolean | `true` | - | Include the current opencode session. |
| `sort` | enum | `updated-desc` | `updated-desc`, `created-desc` | Session ordering. |

### `session_info`

Shows one session's metadata, status, children, todos, and optional diff summary.

| Argument | Type | Default | Bounds | Notes |
| --- | --- | --- | --- | --- |
| `sessionId` | string | required | non-empty | Session to inspect. |
| `directory` | string | current project | ignored | Compatibility-only; `context.directory` is always used. |
| `includeChildren` | boolean | `true` | - | Include child-session count. |
| `includeTodos` | boolean | `true` | - | Include todo summary. |
| `includeStatus` | boolean | `true` | - | Include current status. |
| `includeDiff` | boolean | `false` | - | Include diff summary. |

### `session_read`

Reads a bounded, redacted formatted transcript for one session.

| Argument | Type | Default | Bounds | Notes |
| --- | --- | --- | --- | --- |
| `sessionId` | string | required | non-empty | Session to read. |
| `directory` | string | current project | ignored | Compatibility-only; `context.directory` is always used. |
| `limit` | integer | `100` | `1..500` | Maximum messages read. |
| `includeToolCalls` | boolean | `false` | - | Include bounded tool input/output details. |
| `includeMetadata` | boolean | `false` | - | Include bounded message metadata. |
| `maxPartChars` | integer | `4000` | `500..12000` | Per-part cap before formatting. |
| `maxOutputChars` | integer | `30000` | `2000..80000` | Total output cap. |

There is no raw transcript mode in the public API. Use `includeToolCalls` and `includeMetadata` explicitly when you need more detail.

### `session_search`

Searches recent local session transcripts and returns bounded, redacted snippets.

| Argument | Type | Default | Bounds | Notes |
| --- | --- | --- | --- | --- |
| `query` | string | required | text: `1..1000`, regex: `1..300` | Text or regex pattern. |
| `directory` | string | current project | ignored | Compatibility-only; `context.directory` is always used. |
| `sessionId` | string | none | - | Search a single session instead of recent sessions. |
| `maxSessions` | integer | `25` | `1..100` | Recent sessions considered when `sessionId` is absent. |
| `maxMessagesPerSession` | integer | `100` | `1..300` | Messages scanned per session. |
| `caseSensitive` | boolean | `false` | - | Case-sensitive matching. |
| `regex` | boolean | `false` | - | Treat `query` as a regular expression. |
| `includeToolCalls` | boolean | `false` | - | Include tool input/output text in searchable content. |
| `maxPartChars` | integer | `4000` | `500..12000` | Per-part cap before searching. |
| `maxOutputChars` | integer | `30000` | `2000..80000` | Total output cap. |

Literal queries are capped at 1000 characters. Regex patterns are capped at 300 characters. Invalid regex syntax returns a bounded error, and known unsafe nested-quantifier or optional-atom-chain shapes are rejected to reduce catastrophic-backtracking risk. Regex matching still uses the JavaScript regular-expression engine, so prefer literal search for untrusted patterns.

## Read-Only Guarantee

The plugin intentionally exposes only:

- `session_list`
- `session_info`
- `session_read`
- `session_search`

It does not expose mutating opencode session APIs such as `delete`, `update`, `prompt`, `promptAsync`, `command`, `shell`, `fork`, `share`, `abort`, `summarize`, `revert`, or `unrevert`. Tests include tripwires to ensure tool execution does not call those APIs.

## Privacy Model

Session transcripts can contain secrets, proprietary code, prompts, tool output, file paths, and local metadata. This plugin applies best-effort redaction for common secret shapes, URL credentials, sensitive query parameters, and sensitive object keys, strips terminal control sequences, then caps output sizes. Redaction is not a security boundary and cannot guarantee removal of every sensitive value.

Defaults avoid tool I/O and metadata in transcript output. Users must opt into `includeToolCalls` or `includeMetadata` per call.

User-facing SDK error messages and echoed search queries are redacted before display. Returned sessions are locally directory-validated when opencode provides a project directory. Degraded transcript output is reserved for decode/read-format failures; SDK/API failures surface distinctly.

## Development And Release

This plugin registers two hooks internally (`config`, `tool`); see
[docs/architecture.md](docs/architecture.md) for details.

For the development setup, verification commands, release process, and the
versioned-contract / breaking-change policy, see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Support And Security

Use GitHub issues for bugs and documentation requests. Do not include secrets or private transcript content in public issues. Report suspected vulnerabilities privately using GitHub security advisories on this repository; see `SECURITY.md`.

See `CONTRIBUTING.md` for the development workflow and pull request expectations, and `CODE_OF_CONDUCT.md` for community standards.
