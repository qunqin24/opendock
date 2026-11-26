# Wispr Flow

An OpenCode plugin for Wispr Flow. It reads the meetings Wispr Flow's Notetaker captured — each with its start,
attendees, summary and share link — as normalised events for an app or an automation, and it passes the vendor's own MCP
tools through for everything else: transcripts, summaries, Scratchpad notes, folders, calendar events and contact
lookups.

The plugin follows [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0. Wispr Flow's MCP
server holds the credentials; the plugin stores none.

## Install

```sh
opencode plugin add github:we-the-rebel-alliance/wisprflow-plugin#v0.0.0
```

The plugin needs OpenCode `>=2.4.1 <2.5.0`. Tested on 2.4.1.

## Sign in

One account is the `default` alias, with the MCP server `wisprflow`. Several accounts are one MCP server per alias:
`wisprflow-work`, `wisprflow-personal`, and so on. Each server has its own OAuth session, so one alias can never read
another's meetings.

1. Configure the aliases in the plugin's options:

   ```json
   { "accounts": { "work": {}, "personal": {} } }
   ```

2. Sign in to each server through OpenCode's MCP sign-in, or `opencode mcp auth wisprflow-work`.

3. Call `tools.wisprflow.probe` with `{ "account": "work" }` to see which sign-in the alias holds, then read events.

An alias's owner is OpenCode's sign-in, never a Wispr Flow identity: the owner is always marked `"verified": false`.

## Options

The options are `access`, `accounts` and `allowUntestedHost`; [configuration](docs/configuration.md) has the full
schema.

- `access` is `all` (the default), `ask-changes` or `read-only`.
- `accounts` is one profile per alias. The profile has no fields today; the alias names the MCP server and its sign-in.
- `allowUntestedHost` starts the plugin outside `>=2.4.1 <2.5.0`; leave it `false`.

## Access

- `all` runs every read. Two pass-through tools ask anyway, because they return other people's contact data:
  `get_participant_contacts` and `get_meeting_participants_enriched`.
- `ask-changes` runs reads and asks before those two tools.
- `read-only` runs reads and still asks before those two tools: their `ask` effect narrows a read, and no level turns a
  read into a deny.

The plugin writes nothing, so no method changes anything at any level.

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | — |
| `events_list` | read | optional | `search_meetings` |
| `mcp:get_calendar_event` | read | none | `get_calendar_event` |
| `mcp:get_meeting` | read | none | `get_meeting` |
| `mcp:get_meeting_by_calendar_id` | read | none | `get_meeting_by_calendar_id` |
| `mcp:get_meeting_participants_enriched` | read | none | `get_meeting_participants_enriched` |
| `mcp:get_participant_contacts` | read | none | `get_participant_contacts` |
| `mcp:get_scratchpad_note` | read | none | `get_scratchpad_note` |
| `mcp:get_upcoming_meeting` | read | none | `get_upcoming_meeting` |
| `mcp:list_folder_meetings` | read | none | `list_folder_meetings` |
| `mcp:list_folders` | read | none | `list_folders` |
| `mcp:list_meeting_series` | read | none | `list_meeting_series` |
| `mcp:list_upcoming_meetings` | read | none | `list_upcoming_meetings` |
| `mcp:resolve_calendar_link` | read | none | `resolve_calendar_link` |
| `mcp:resolve_share_link` | read | none | `resolve_share_link` |
| `mcp:search_calendar_events` | read | none | `search_calendar_events` |
| `mcp:search_meetings` | read | none | `search_meetings` |
| `mcp:search_scratchpad_notes` | read | none | `search_scratchpad_notes` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `wisprflow.meetings` | events | `meeting` | `events_list` | free |
| `wisprflow.meetings.list` | snapshot | `list` | `events_list` | free |

### Actions

None.

### Bus events

None.
<!-- /generated:capabilities -->

## Troubleshooting

- **`NEEDS_SIGN_IN`.** Sign the alias's MCP server in through OpenCode (`/connect`, or `opencode mcp auth
  wisprflow-<alias>`), then call `probe` to confirm the owner and read again.
- **`status` says an account is not ready.** Call `tools.wisprflow.status`; it lists every alias with `ready`,
  `needs_sign_in` or `error` and gives one next step. It reads no content and needs no account.
- **`ACCOUNT_REQUIRED`.** The plugin serves several aliases; pass `account` with one of the aliases the error names.
  **`ACCOUNT_UNKNOWN`** means the alias is not one the options declare.
- **`CURSOR_INVALID`.** Start the source again without the cursor. A cursor belongs to one plugin, source and account;
  never pass another account's cursor. **`ACCOUNT_MISMATCH`** means the cursor belongs to an older sign-in for the same
  alias; start again with `since`.
- **`SOURCE_UNKNOWN`.** This plugin has one events source, `wisprflow`; omit `source` or pass that name.
- **`UNAVAILABLE`.** The vendor's MCP server is not connected or the tool failed. Read `status` for the exact next step;
  an MCP server that stays missing usually needs a restart.
- **A tool asks every time.** `get_participant_contacts` and `get_meeting_participants_enriched` are `ask` at every
  access level because they return other people's contact data. The person answers the ask.

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

## Docs

- [Capabilities](docs/capabilities.md)
- [Configuration](docs/configuration.md)
- [Accounts](docs/accounts.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)

The contract, the plugin standard and the conformance kit live in
[plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract).
