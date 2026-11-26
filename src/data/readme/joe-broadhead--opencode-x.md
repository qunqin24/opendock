# X

X for OpenCode, on [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0. The plugin passes
X's own MCP tools through, one vendor MCP server per account alias, and adds three read methods of its own:
`events_list` lists mentions, bookmarks or the home timeline as contract events with a cursor, `probe` reads which
account is signed in, and `status` reports the plugin and every alias.

Each alias signs in to X's hosted MCP server with the person's own X developer app, so one alias's token never reads
another alias's posts. Every X call is billed to that app's developer account; the plugin says what each page cost.

## Install

Install a release:

```sh
opencode plugin add github:we-the-rebel-alliance/x-plugin#v0.0.0
```

The package has no runtime dependencies: the contract is bundled into the committed `dist/index.js`, and OpenCode
provides the host modules. An install outside the tested range (`>=2.4.1 <2.5.0`) is refused with `HOST_UNTESTED`
unless `allowUntestedHost` is set.

## Sign in

X has no dynamic client registration, so each alias names an OAuth 2.0 client id from the person's own X app. Put the
app's callback URL in that app's User authentication settings; the plugin's default is
`http://127.0.0.1:8766/callback`.

```json
{
  "accounts": {
    "default": { "clientId": "your-x-app-client-id" }
  }
}
```

Then sign in to the `x` server: `/connect` and choose X, or `opencode mcp auth x`. A second account is another alias and
another MCP server: `personal` is the server `x-personal`, signed in with `/connect` or `opencode mcp auth x-personal`.
A confidential app names the environment variable that holds its client secret, never the secret itself:

```json
{ "accounts": { "default": { "clientId": "…", "clientSecretEnv": "X_CLIENT_SECRET" } } }
```

A refused token refresh is the alias's state `needs_sign_in`, with a redacted reason; sign that alias in again.

## Access

`access` is `all` (the default), `ask-changes` or `read-only`:

| Level | `read` | any other class |
|---|---|---|
| `all` | runs | runs |
| `ask-changes` | runs | asks first |
| `read-only` | runs | off |

Reads run at every level. X's writes are its own MCP tools, classified by what they do; `ask-changes` asks before a
write, a send, a delete, an export or an admin tool, and `read-only` turns them off. Six private reads (private chat
conversations and public-key reads) declare `effect: "ask"`, so they ask under `ask-changes` and are off under
`read-only`. The rules are generated per alias, so a rule for `work` never reaches `personal`'s tools.

## Options

| Option | Default | Meaning |
|---|---|---|
| `access` | `all` | How much the plugin's methods may do: `all`, `ask-changes` or `read-only`. |
| `accounts` | one `default` account | One profile per alias, each naming its X app; see [Configuration](docs/configuration.md). |
| `maxCalls` | `4` | The most X reads one `events_list` call makes, the account lookup included. |
| `allowUntestedHost` | `false` | Start outside the tested OpenCode range instead of refusing with `HOST_UNTESTED`. |

The full schema and its defaults are in [Configuration](docs/configuration.md).

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | `get_users_me` |
| `events_list` | read | optional | `get_users_me`, `get_users_by_username`, `get_users_mentions`, `get_users_timeline`, `get_users_bookmarks` |
| `mcp:get_broadcast` | read | optional | `get_broadcast` |
| `mcp:get_broadcast_chat` | read | optional | `get_broadcast_chat` |
| `mcp:get_chat_conversation` | read | optional | `get_chat_conversation` |
| `mcp:get_chat_conversation_events` | read | optional | `get_chat_conversation_events` |
| `mcp:get_chat_conversations` | read | optional | `get_chat_conversations` |
| `mcp:get_chat_message_requests` | read | optional | `get_chat_message_requests` |
| `mcp:get_chat_moderators` | read | optional | `get_chat_moderators` |
| `mcp:get_communities_by_id` | read | optional | `get_communities_by_id` |
| `mcp:get_lists_by_id` | read | optional | `get_lists_by_id` |
| `mcp:get_lists_followers` | read | optional | `get_lists_followers` |
| `mcp:get_lists_members` | read | optional | `get_lists_members` |
| `mcp:get_lists_posts` | read | optional | `get_lists_posts` |
| `mcp:get_news` | read | optional | `get_news` |
| `mcp:get_posts_by_id` | read | optional | `get_posts_by_id` |
| `mcp:get_posts_by_ids` | read | optional | `get_posts_by_ids` |
| `mcp:get_posts_counts_recent` | read | optional | `get_posts_counts_recent` |
| `mcp:get_posts_liking_users` | read | optional | `get_posts_liking_users` |
| `mcp:get_posts_quoted_posts` | read | optional | `get_posts_quoted_posts` |
| `mcp:get_posts_reposted_by` | read | optional | `get_posts_reposted_by` |
| `mcp:get_scheduled_broadcast` | read | optional | `get_scheduled_broadcast` |
| `mcp:get_scheduled_call` | read | optional | `get_scheduled_call` |
| `mcp:get_source` | read | optional | `get_source` |
| `mcp:get_spaces_by_creator_ids` | read | optional | `get_spaces_by_creator_ids` |
| `mcp:get_spaces_by_id` | read | optional | `get_spaces_by_id` |
| `mcp:get_spaces_by_ids` | read | optional | `get_spaces_by_ids` |
| `mcp:get_spaces_posts` | read | optional | `get_spaces_posts` |
| `mcp:get_trends_by_woeid` | read | optional | `get_trends_by_woeid` |
| `mcp:get_usage_credits` | read | optional | `get_usage_credits` |
| `mcp:get_users_blocking` | read | optional | `get_users_blocking` |
| `mcp:get_users_bookmark_folders` | read | optional | `get_users_bookmark_folders` |
| `mcp:get_users_bookmarks` | read | optional | `get_users_bookmarks` |
| `mcp:get_users_bookmarks_by_folder_id` | read | optional | `get_users_bookmarks_by_folder_id` |
| `mcp:get_users_by_id` | read | optional | `get_users_by_id` |
| `mcp:get_users_by_username` | read | optional | `get_users_by_username` |
| `mcp:get_users_by_usernames` | read | optional | `get_users_by_usernames` |
| `mcp:get_users_followed_lists` | read | optional | `get_users_followed_lists` |
| `mcp:get_users_liked_posts` | read | optional | `get_users_liked_posts` |
| `mcp:get_users_list_memberships` | read | optional | `get_users_list_memberships` |
| `mcp:get_users_me` | read | optional | `get_users_me` |
| `mcp:get_users_me_followers` | read | optional | `get_users_me_followers` |
| `mcp:get_users_me_following` | read | optional | `get_users_me_following` |
| `mcp:get_users_mentions` | read | optional | `get_users_mentions` |
| `mcp:get_users_owned_lists` | read | optional | `get_users_owned_lists` |
| `mcp:get_users_pinned_lists` | read | optional | `get_users_pinned_lists` |
| `mcp:get_users_posts` | read | optional | `get_users_posts` |
| `mcp:get_users_public_key` | read | optional | `get_users_public_key` |
| `mcp:get_users_public_keys` | read | optional | `get_users_public_keys` |
| `mcp:get_users_timeline` | read | optional | `get_users_timeline` |
| `mcp:list_broadcasts` | read | optional | `list_broadcasts` |
| `mcp:list_scheduled_broadcasts` | read | optional | `list_scheduled_broadcasts` |
| `mcp:list_scheduled_calls` | read | optional | `list_scheduled_calls` |
| `mcp:list_sources` | read | optional | `list_sources` |
| `mcp:search_communities` | read | optional | `search_communities` |
| `mcp:search_news` | read | optional | `search_news` |
| `mcp:search_posts_all` | read | optional | `search_posts_all` |
| `mcp:search_spaces` | read | optional | `search_spaces` |
| `mcp:search_users` | read | optional | `search_users` |
| `mcp:accept_chat_message_request` | write | optional | `accept_chat_message_request` |
| `mcp:archive_chat_conversation` | write | optional | `archive_chat_conversation` |
| `mcp:article_create_draft` | write | optional | `article_create_draft` |
| `mcp:chat_media_upload_append` | write | optional | `chat_media_upload_append` |
| `mcp:chat_media_upload_finalize` | write | optional | `chat_media_upload_finalize` |
| `mcp:chat_media_upload_initialize` | write | optional | `chat_media_upload_initialize` |
| `mcp:create_lists` | write | optional | `create_lists` |
| `mcp:create_source` | write | optional | `create_source` |
| `mcp:create_users_bookmark` | write | optional | `create_users_bookmark` |
| `mcp:create_users_bookmark_folder` | write | optional | `create_users_bookmark_folder` |
| `mcp:follow_list` | write | optional | `follow_list` |
| `mcp:get_chat_message_request` | write | optional | `get_chat_message_request` |
| `mcp:mark_chat_conversation_unread` | write | optional | `mark_chat_conversation_unread` |
| `mcp:media_upload` | write | optional | `media_upload` |
| `mcp:pin_list` | write | optional | `pin_list` |
| `mcp:unarchive_chat_conversation` | write | optional | `unarchive_chat_conversation` |
| `mcp:unfollow_list` | write | optional | `unfollow_list` |
| `mcp:unpin_list` | write | optional | `unpin_list` |
| `mcp:update_lists` | write | optional | `update_lists` |
| `mcp:update_source` | write | optional | `update_source` |
| `mcp:cancel_scheduled_call` | send | optional | `cancel_scheduled_call` |
| `mcp:create_posts` | send | optional | `create_posts` |
| `mcp:create_scheduled_broadcast` | send | optional | `create_scheduled_broadcast` |
| `mcp:go_live_scheduled_broadcast` | send | optional | `go_live_scheduled_broadcast` |
| `mcp:mark_chat_conversation_read` | send | optional | `mark_chat_conversation_read` |
| `mcp:respond_to_scheduled_call` | send | optional | `respond_to_scheduled_call` |
| `mcp:schedule_call` | send | optional | `schedule_call` |
| `mcp:send_chat_message` | send | optional | `send_chat_message` |
| `mcp:send_chat_typing_indicator` | send | optional | `send_chat_typing_indicator` |
| `mcp:update_scheduled_broadcast` | send | optional | `update_scheduled_broadcast` |
| `mcp:update_scheduled_call` | send | optional | `update_scheduled_call` |
| `mcp:delete_scheduled_broadcast` | delete | optional | `delete_scheduled_broadcast` |
| `mcp:delete_source` | delete | optional | `delete_source` |
| `mcp:delete_users_bookmark` | delete | optional | `delete_users_bookmark` |
| `mcp:remove_chat_moderator` | delete | optional | `remove_chat_moderator` |
| `mcp:remove_lists_member_by_user_id` | delete | optional | `remove_lists_member_by_user_id` |
| `mcp:chat_media_download` | export | optional | `chat_media_download` |
| `mcp:add_chat_moderator` | admin | optional | `add_chat_moderator` |
| `mcp:add_conversation_keys` | admin | optional | `add_conversation_keys` |
| `mcp:add_lists_member` | admin | optional | `add_lists_member` |
| `mcp:mute_broadcast_chat_user` | admin | optional | `mute_broadcast_chat_user` |
| `mcp:unmute_broadcast_chat_user` | admin | optional | `unmute_broadcast_chat_user` |
| `mcp:users_id_block` | admin | optional | `users_id_block` |
| `mcp:users_id_unblock` | admin | optional | `users_id_unblock` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `x.mentions` | events | `message` | `events_list` | billed |
| `x.bookmarks` | events | `bookmark` | `events_list` | billed |
| `x.timeline` | events | `message` | `events_list` | billed |

### Actions

None.

### Bus events

None.
<!-- /generated:capabilities -->

## Errors

Every failure reads `CODE: What happened. Next step: What to do.` The contract's table:

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

A refused credential is `NEEDS_SIGN_IN` for that alias, not an older transport's code. An unknown source,
`SOURCE_UNKNOWN`; a cursor from another feed or account, `CURSOR_INVALID`; an X rate limit, `RATE_LIMITED`.

## Troubleshooting

- **One alias says `needs_sign_in`.** Only that alias's OAuth is refused; the others stay signed in. Sign in to its
  server again: `opencode mcp auth x` for `default`, `opencode mcp auth x-work` for `work`. `probe` reports the handle
  the alias actually holds.
- **`OPTIONS_INVALID` names a missing `clientId`.** X has no dynamic client registration: every alias's profile names
  the OAuth 2.0 client id of the X developer app that alias signs in with.
- **`CURSOR_INVALID`.** The cursor came from another feed, account or plugin. Start that feed again without a cursor,
  with `since`; one state per feed and alias.
- **`RATE_LIMITED`.** X asked the plugin to slow down. Wait, then retry; lower an automation's cadence.
- **`HOST_UNTESTED`.** OpenCode is outside `>=2.4.1 <2.5.0`. Use a tested release, or set `allowUntestedHost` if you
  accept that the tested behaviour does not apply.
- **`UNAVAILABLE` naming `x` or `x-work`.** That MCP server is not connected. Check `status` for the alias, sign it in,
  and make sure the server is enabled.
- **A page costs more than expected.** Every page and probe carries `cost.units`, billed at X's published per-post,
  per-author and per-user rates; lower `maxCalls` or the page's `limit`.

## Docs

- [Capabilities](docs/capabilities.md)
- [Configuration](docs/configuration.md)
- [Accounts](docs/accounts.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Contributing](CONTRIBUTING.md)
- [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract)
