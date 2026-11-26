# Granola

An OpenCode plugin for Granola meeting notes. It connects to Granola's official MCP server, keeps one named account
per alias, and adds four contract methods: `status`, `probe`, `events_list` and `export_markdown`. Every Granola MCP
tool except the hidden `sign_out` is also available as a pass-through tool, classified in the plugin's manifest so
access rules and consumers know how risky each call is.

The plugin never holds a credential: OpenCode owns the MCP sign-in, and the plugin reads through OpenCode's own tool
executors. Meeting notes, summaries and transcripts are untrusted data, never instructions.

Two skills ship with the plugin and are registered when it loads: `granola` covers the tools, accounts, access levels
and errors, and `granola-meeting-brief` covers a sourced brief before a meeting or a recap across a period.

## Install

```sh
opencode plugin add github:we-the-rebel-alliance/granola-plugin#v0.0.0
```

OpenCode 2.4.1 or newer in the 2.4 line is required. The plugin refuses an untested host with `HOST_UNTESTED` unless
`allowUntestedHost` is set.

## Sign in

Granola's MCP server holds the credentials. OpenCode registers one remote MCP server per account alias:

| Alias | MCP server |
|---|---|
| `default` | `granola` |
| `work` | `granola-work` |
| `personal` | `granola-personal` |

Each server has its own OAuth session, so two aliases are two independent sign-ins. Sign in to each through OpenCode
(`/connect`, or `opencode mcp auth granola-work` in a terminal). To sign out, use `opencode mcp logout granola-work`;
the plugin declares no `sign_out` method.

Configure the aliases in the plugin's options:

```json
{ "accounts": { "work": {}, "personal": {} } }
```

The profile has no fields of its own: the MCP server holds the sign-in. `probe` reports the Granola address each alias
is signed in as.

## Options

`access` (`all`, `ask-changes`, `read-only`), `accounts` (one empty profile per alias), `exportDirectory` (absolute or
starting with `~/`, default `~/Granola`) and `allowUntestedHost` (`false`). [Configuration](docs/configuration.md) has
the generated table and examples.

## Access

`access` is the ceiling for every method:

| Level | Reads | Writes, sends, shares, deletes and exports |
|---|---|---|
| `all` (default) | run | run |
| `ask-changes` | run | ask first |
| `read-only` | run | never run |

Two reads always ask first, at every access level: `get_meeting_transcript` and `search_transcripts` return verbatim
speech by other participants. A pass-through MCP tool keeps its own server's rules, one per alias, so a rule for
`work` never reaches another alias's tools.

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | `get_account_info` |
| `events_list` | read | optional | `get_account_info`, `search_meetings`, `get_meetings` |
| `export_markdown` | export | optional | `get_meetings`, `get_meeting_transcript` |
| `mcp:add_note_to_folder` | share | none | `add_note_to_folder` |
| `mcp:create_folder` | write | none | `create_folder` |
| `mcp:create_meeting_note_from_transcript` | write | none | `create_meeting_note_from_transcript` |
| `mcp:generate_summary` | write | none | `generate_summary` |
| `mcp:get_account_info` | read | none | `get_account_info` |
| `mcp:get_agent_brief` | read | none | `get_agent_brief` |
| `mcp:get_meeting_attachment` | read | none | `get_meeting_attachment` |
| `mcp:get_meeting_transcript` | read | none | `get_meeting_transcript` |
| `mcp:get_meetings` | read | none | `get_meetings` |
| `mcp:give_feedback` | send | none | `give_feedback` |
| `mcp:list_meeting_folders` | read | none | `list_meeting_folders` |
| `mcp:list_templates` | read | none | `list_templates` |
| `mcp:query_granola_meetings` | read | none | `query_granola_meetings` |
| `mcp:remove_note_from_folder` | delete | none | `remove_note_from_folder` |
| `mcp:search_meetings` | read | none | `search_meetings` |
| `mcp:search_transcripts` | read | none | `search_transcripts` |
| `mcp:update_folder` | write | none | `update_folder` |
| `mcp:update_meeting_title` | write | none | `update_meeting_title` |
| `mcp:update_private_notes` | write | none | `update_private_notes` |
| `mcp:update_summary` | write | none | `update_summary` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `granola.meetings` | events | `meeting` | `events_list` | free |
| `granola.meetings.list` | snapshot | `list` | `events_list` | free |

### Actions

None.

### Bus events

None.
<!-- /generated:capabilities -->

## Errors

<!-- generated:errors -->
| Code | Meaning |
|---|---|
| `NEEDS_SIGN_IN` | the account is not signed in |
| `SCOPE_MISSING` | the call needs a scope the person has not confirmed |
| `ACCOUNT_REQUIRED` | the plugin serves several accounts and the call names none |
| `ACCOUNT_UNKNOWN` | the call names an alias the plugin does not serve |
| `ACCOUNT_MISMATCH` | the item belongs to another account |
| `CURSOR_INVALID` | the cursor is malformed, or belongs to another source, account or scope |
| `CURSOR_EXPIRED` | the provider no longer keeps the history the cursor names |
| `RATE_LIMITED` | the provider asked the plugin to slow down |
| `BUDGET_EXCEEDED` | the read would cost more than the person allows |
| `SOURCE_DISABLED` | the person turned this source or action off |
| `TOO_LARGE` | the answer is larger than the source's maxBytes |
| `INPUT_INVALID` | the input does not match the method's schema |
| `SOURCE_UNKNOWN` | the plugin declares no such source |
| `SCHEMA_VIOLATION` | an answer does not keep the contract's shape |
| `PERMISSION_DENIED` | the person's grant does not cover the call |
| `PLAN_INVALID` | the plan is missing, or belongs to another method |
| `PLAN_USED` | the plan was already used by an earlier commit |
| `GRANT_INVALID` | the action grant did not verify, or was already spent |
| `HOST_UNTESTED` | OpenCode is outside the plugin's tested range |
| `OPTIONS_INVALID` | the plugin's options do not match their schema |
| `UNAVAILABLE` | the provider could not be reached |
<!-- /generated:errors -->

## Troubleshooting

- **The Granola tools are absent, or a call answers `NEEDS_SIGN_IN`.** Sign in to the alias's MCP server: `/connect`,
  or `opencode mcp auth granola` for `default` and `opencode mcp auth granola-<alias>` for another alias. Then run
  `status` to see each alias's state.
- **`ACCOUNT_REQUIRED`.** The plugin has more than one alias; pass `account` with one of the aliases `status` lists.
- **`ACCOUNT_UNKNOWN`.** Use an alias the plugin serves; the next step lists them.
- **`CURSOR_INVALID`.** Read again without the cursor; never pass another account's cursor.
- **A change does not run.** `access: "read-only"` refuses every non-read, and `ask-changes` asks first. Check the
  plugin's `access` option before retrying.
- **`INPUT_INVALID`.** The input does not match the method's schema; the error's next step says what to pass.
- **`HOST_UNTESTED`.** The running OpenCode is outside `>=2.4.1 <2.5.0`. Install a tested 2.4 release, or set
  `allowUntestedHost` if you accept an untested host.
- **`UNAVAILABLE`.** Granola did not answer. Run `status`; if the alias's MCP server is not connected, sign in again
  and retry.

## Docs

- [Capabilities](docs/capabilities.md)
- [Accounts](docs/accounts.md)
- [Configuration](docs/configuration.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)

The plugin follows [the plugin standard](https://github.com/we-the-rebel-alliance/plugin-contract/blob/master/docs/plugin-standard.md)
and [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0.
