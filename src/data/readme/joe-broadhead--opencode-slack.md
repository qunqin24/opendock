# Slack plugin for OpenCode

Reads and acts on Slack from OpenCode: search messages, read a channel, a thread or a person, list conversations, create
and update canvases and lists, send and schedule messages, and mark a conversation read. It signs in to several Slack
workspaces at once, one per account alias. Every method that reads or writes Slack takes the alias it should use;
`status` takes none, and Slack's pass-through tools use their alias's server rather than an `account` input.

Slack's own MCP tools are passed through as they are: their server holds the sign-in and the plugin never proxies one.
The plugin's own reads and its one write use the same account's sign-in.

The plugin follows [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0: one manifest, one
`register` call, every method reachable as a tool, in Code Mode and over RPC.

## Install

```sh
opencode plugin add github:we-the-rebel-alliance/slack-plugin#v0.0.0
```

`v0.0.0` is the first release on plugin-contract v0. It supports OpenCode `>=2.4.1 <2.5.0`; on another release the plugin
refuses to start with `HOST_UNTESTED` unless `allowUntestedHost` is set.

## Sign in

1. Create a Slack app for the plugin from the manifest in `docs/slack-app-manifest.json`, with the redirect URL
   `http://localhost:8765/callback`, or use an app you already have. Its PKCE setting must be on if you do not paste a
   client secret.
2. In OpenCode, run `/connect` and choose **Slack app client ID**. Paste the app's client ID. This entry is global: every
   alias signs in through the same app.
3. Restart OpenCode. The plugin registers one Slack MCP server per alias — `slack` for `default`, `slack-work` for
   `work` — with that app's client ID.
4. Run `/connect` again and sign in to each server, one workspace each.

If you would rather keep the client ID in configuration, set `oauth.client_id` instead of step 2; see
[docs/configuration.md](docs/configuration.md).

## Accounts

Each alias is one Slack workspace with its own sign-in, its own cursors and its own status line:

```json
{
  "plugins": [
    {
      "package": "github:we-the-rebel-alliance/slack-plugin#v0.0.0",
      "options": { "accounts": { "work": {}, "personal": {} } }
    }
  ]
}
```

With one alias it may be left out of a call; with more than one, a call without `account` is `ACCOUNT_REQUIRED` and its
next step lists the aliases. See [docs/accounts.md](docs/accounts.md).

## Options

Set them in the plugin's entry in `opencode.json`; [docs/configuration.md](docs/configuration.md) has the fields and
examples.

| Option | Default | Meaning |
|---|---|---|
| `access` | `all` | How much the plugin's methods may do: `all`, `ask-changes` or `read-only`. |
| `accounts` | one `default` | A map of alias to profile; a profile may set that alias's Slack user scopes. |
| `oauth.client_id` | — | The Slack app's client ID; otherwise paste it in `/connect` under **Slack app client ID**. |
| `oauth.redirect_uri` | `http://localhost:8765/callback` | A redirect URL registered on the Slack app. |
| `oauth.scopes` | the plugin's default list | The user scopes every alias's sign-in asks for. |
| `events.channels` | `[]` | Channel and direct-message ids a read uses when its call names no scope. |
| `allowUntestedHost` | `false` | Start outside `>=2.4.1 <2.5.0`. |

## Access

`access` is the ceiling for every agent:

| Level | Reads | Changes |
|---|---|---|
| `all` (default) | run | run |
| `ask-changes` | run | ask first |
| `read-only` | run | never run |

A method's `effect` narrows this table: `ask` asks even where the level would allow, and `deny` turns the method off at
every level, `all` included. Three reads carry `effect: deny` — `mentions_list`, Slack's private-search tool and Slack's
file-read tool — because they reach private content or another person's file; a later allow rule for one agent or tool is
the only way to run one. Writes are confirmed by an OpenCode ask, or by a host-signed action grant when an app calls over
RPC; an allow rule alone is not a confirmation.

## What it reads and does

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | `auth.test` |
| `probe` | read | optional | `auth.test`, `slack_read_user_profile` |
| `events_list` | read | optional | `auth.test`, `slack_read_channel` |
| `thread_read` | read | optional | `auth.test`, `slack_read_thread` |
| `channels_list` | read | optional | `slack_list_user_channels` |
| `mentions_list` | read | optional | `auth.test`, `assistant.search.context` |
| `mark_read` | write | optional | `conversations.mark` |
| `mcp:slack_add_list_record` | write | optional | — |
| `mcp:slack_add_reaction` | write | optional | — |
| `mcp:slack_complete_file_upload` | send | optional | — |
| `mcp:slack_create_canvas` | write | optional | — |
| `mcp:slack_create_conversation` | share | optional | — |
| `mcp:slack_create_list` | write | optional | — |
| `mcp:slack_get_file_upload_url` | write | optional | — |
| `mcp:slack_get_reactions` | read | optional | — |
| `mcp:slack_list_channel_members` | read | optional | — |
| `mcp:slack_list_user_channels` | read | optional | — |
| `mcp:slack_read_canvas` | read | optional | — |
| `mcp:slack_read_channel` | read | optional | — |
| `mcp:slack_read_file` | read | optional | — |
| `mcp:slack_read_list` | read | optional | — |
| `mcp:slack_read_thread` | read | optional | — |
| `mcp:slack_read_user_profile` | read | optional | — |
| `mcp:slack_schedule_message` | send | optional | — |
| `mcp:slack_search_channels` | read | optional | — |
| `mcp:slack_search_emojis` | read | optional | — |
| `mcp:slack_search_public` | read | optional | — |
| `mcp:slack_search_public_and_private` | read | optional | — |
| `mcp:slack_search_users` | read | optional | — |
| `mcp:slack_send_message` | send | optional | — |
| `mcp:slack_send_message_draft` | send | optional | — |
| `mcp:slack_update_canvas` | write | optional | — |
| `mcp:slack_update_list` | write | optional | — |
| `mcp:slack_update_list_record` | write | optional | — |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `slack.workspace` | events | `message` | `events_list` | free |
| `slack.mentions` | events | `message` | `mentions_list` | free |

### Actions

None.

### Bus events

`rpc.slack.changed`
<!-- /generated:capabilities -->

## Errors

Every failure reads `CODE: What happened. Next step: What to do.` The contract's codes and the plugin's own next steps:

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

Start with `tools.slack.status` or `/slack`: every alias has a state (`ready`, `needs_sign_in`, `error`) and the plugin
answers one next step.

- **`NEEDS_SIGN_IN`** — run `/connect`, choose that alias's server (`slack` or `slack-work`), and sign in. If the row is
  missing, no server was registered: set the Slack app's client ID and restart OpenCode.
- **`SCOPE_MISSING`** — Slack named a scope the sign-in lacks. Add it to the Slack app and to `oauth.scopes`, then sign
  in again. A private channel's history needs `groups:history`; `mark_read` needs the conversation type's `:write` scope.
- **`ACCOUNT_REQUIRED` / `ACCOUNT_UNKNOWN`** — pass one of the aliases the failure lists.
- **`CURSOR_INVALID`** — the cursor belongs to another account, source or scope. Read again without it.
- **`PERMISSION_DENIED`** — the agent's rules or the person's grant do not cover the call. Ask for it; do not widen it
  yourself.
- **`HOST_UNTESTED`** — the plugin refuses an OpenCode release outside `>=2.4.1 <2.5.0`. Update OpenCode, or set
  `allowUntestedHost`.

## Docs

- [docs/capabilities.md](docs/capabilities.md) — each source, method and event.
- [docs/accounts.md](docs/accounts.md) — the MCP mechanism, profiles and sign-in.
- [docs/configuration.md](docs/configuration.md) — every option and its default.
- [docs/automations.md](docs/automations.md) — a timer recipe for each source.
- [docs/architecture.md](docs/architecture.md) — the layers, the provider client and the OpenCode APIs used.
- [docs/security.md](docs/security.md) — what leaves the machine, scopes, redaction and confirmation.
- [skills/slack/SKILL.md](skills/slack/SKILL.md) — the main skill: when to use the plugin, accounts, access and errors.
- [skills/slack-search/SKILL.md](skills/slack-search/SKILL.md) — the search and read workflow.
- [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) — the manifest, the doors and the modules this plugin is built on.

## License

MIT.
