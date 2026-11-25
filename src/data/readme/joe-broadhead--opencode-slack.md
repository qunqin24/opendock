# Slack plugin for OpenCode

Slack's own MCP server in OpenCode: search and read messages, threads and channels, read people, canvases, lists and
files, and post, reply, draft or schedule a message. Everything comes back as Markdown. The plugin also declares two
sources for automations (`slack.workspace` for the channels you confirm, `slack.mentions` for messages that mention
you) and a tools RPC so a script or an OpenCode automation can read Slack with no model, under a session and its agent's
permission rules. OpenCode holds the Slack sign-in; the plugin never hands out a Slack token.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Another release inside the range, such as 2.4.99, sets everything up and
  status calls it untested; anything outside the range registers only `/slack-status` and refuses until it is updated.
- A Slack app that your organisation owns, with Slack's MCP server turned on. Slack lets only internal apps and Slack
  Marketplace apps use its MCP server. If your organisation has none, someone who can create apps in your workspace
  makes one from the [app manifest](docs/slack-app-manifest.json): see [Create the Slack app](docs/configuration.md#create-the-slack-app).

## Install

Install from a release:

```sh
opencode plugin add github:we-the-rebel-alliance/slack-plugin#v<version>
```

The first release on plugin-contract is v0.0.0 (phase 4b).

## Sign in

1. Create the Slack app from the [manifest](docs/slack-app-manifest.json), or add the default scopes to an app you
   already have.
2. Run `/connect`, choose **Slack app client ID**, and paste the app's client ID (and its client secret, only for an app
   without PKCE).
3. Run `/connect` again, choose **Slack**, and press `o` or Enter to open Slack's sign-in page.

One Slack workspace is supported now; several named accounts come with the plugin contract. `/slack-status` shows the
signed-in workspace and user, the client in use and the scopes Slack granted.

## Access levels

The `access` option decides what runs without asking:

| `access` | Reads | Private-channel search, file reads, `mentions_list` | Writes and sends |
| --- | --- | --- | --- |
| `all` (default) | run | run | run |
| `ask-changes` | run | ask | ask |
| `read-only` | run | denied | denied |

`/slack-status` names what asks or is denied for the value in force. The default rules below are what it inserts after
each agent's base allow; agents defined only in your own config get no rules, and status names them with the block to
paste for them.

## Use

Ask in plain words: the model searches, reads a thread for context and cites the permalinks. In Code Mode the same
tools are Slack's own, such as `tools.slack.slack_search_public({ query: "launch date in:#release", limit: 10 })`; the
[slack-search skill](skills/slack-search/SKILL.md) has the rest, including private-content consent and writes.

## Permissions

The plugin inserts this block directly after each agent's first `* * allow` rule. Anything evaluated later still wins:
the agent's own rules, your top-level `permissions`, and saved "Always allow" replies. The block is generated from
`defaultRules()` in `src/permissions.ts`; `npm run check` fails when this copy drifts.

```json
[
  { "action": "slack_*", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_search_public", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_search_channels", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_search_users", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_channel", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_thread", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_user_profile", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_canvas", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_list_channel_members", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_get_reactions", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_list_user_channels", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_list", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_search_emojis", "resource": "*", "effect": "allow" },
  { "action": "slack_events_list", "resource": "*", "effect": "allow" },
  { "action": "slack_probe", "resource": "*", "effect": "allow" },
  { "action": "slack_channels_list", "resource": "*", "effect": "allow" },
  { "action": "slack_status", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_search_public_and_private", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_read_file", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_send_message", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_send_message_draft", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_schedule_message", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_create_canvas", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_update_canvas", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_add_reaction", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_get_file_upload_url", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_complete_file_upload", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_create_conversation", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_create_list", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_update_list", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_add_list_record", "resource": "*", "effect": "allow" },
  { "action": "slack_slack_update_list_record", "resource": "*", "effect": "allow" },
  { "action": "slack_mark_read", "resource": "*", "effect": "allow" },
  { "action": "slack_mentions_list", "resource": "*", "effect": "allow" },
  { "action": "slack.read", "resource": "*", "effect": "allow" }
]
```

## Configure

```json
{
  "plugins": [
    { "package": "github:we-the-rebel-alliance/slack-plugin#vX.Y.Z", "options": { "access": "read-only" } }
  ]
}
```

[Configuration](docs/configuration.md) describes every option, the scopes each read needs, the permission rules, the
sources and the status model.

## Sources and scripts

`slack_events_list` lists the messages posted since a cursor in the channels a consumer confirms, oldest first, and is
what an OpenCode automation or a script reads. `mentions_list` lists the messages that mention you. The same reads are
tools RPC methods (`slack.workspace.tools`), so a script calls them with `opencode api` and no model, as the session and
agent you give it; the [slack-search skill](skills/slack-search/SKILL.md) has the call shapes.

## Troubleshooting

Run `/slack-status` (or `/slack` in the TUI) first. Its `Connection` row shows a state and, when something is wrong, a
code; the last row is one next step. [Errors](docs/configuration.md#errors) lists every code.

| Connection | Code | Meaning | What to do |
| --- | --- | --- | --- |
| `not configured` | `CLIENT_ID_MISSING` | No Slack app client ID is set, so the Slack server is not added. | Run `/connect` and choose **Slack app client ID**, then paste your Slack app's client ID. |
| `not configured` | `CLIENT_ID_INVALID` | The client ID saved in the `/connect` **Slack app client ID** entry is empty or has spaces. | Run `/connect` and choose **Slack app client ID**, then paste the client ID again. |
| `sign-in required` | `AUTH_REQUIRED` | Nobody has signed in yet, or the sign-in expired. | Run `/connect` and choose **Slack**, then press `o` or Enter to open the sign-in page. `opencode mcp auth slack` opens the browser automatically. |
| `connecting` | none | OpenCode is connecting to Slack. | Wait a few seconds, then run `/slack-status` again (or press `r` in `/slack`). |
| `disabled` | `SERVER_DISABLED` | The server is turned off. | Turn on `slack` in `/mcps`. |
| `failed` | `CONNECTION_FAILED` | The connection failed. Status shows OpenCode's reason, shortened to one line. | Fix the error shown, then reconnect `slack` in `/mcps`. |
| `conflict` | `SERVER_NAME_IN_USE` | Another MCP server already uses the name `slack`. | Remove `mcp.servers.slack` from your OpenCode config. |
| `failed` | none | OpenCode has not loaded the server. | Run `opencode reload`, then check again. |
| `not configured` | `OPTIONS_INVALID` | An option is invalid. Status names the field. | Follow the next step. |
| `host untested` | `HOST_UNTESTED` | This OpenCode version is outside the supported range `>=2.4.1 <2.5.0`, so Slack is not set up. A release inside the range that is not 2.4.1 runs normally; the `OpenCode` row calls it untested. | Use OpenCode `>=2.4.1 <2.5.0`, or set `"allowUntestedHost": true` in the plugin's options. |
| `connected` | none | A skill in your own or the project's skill folders has the id `slack-search`, so OpenCode loads it instead of the plugin's. The `Skills` row names its file. | Move or rename that skill, then run `opencode reload`. |
| `connected` | none | Ready. The next step reads `Nothing to do.` | If status names agents without default rules, put the block above first in their own permissions. |
| — | `STATUS_UNAVAILABLE` | Status itself could not be read. | Run `/slack-status` again in a moment. |
| — | `SKILLS_INVALID` | A bundled skill is missing or has invalid frontmatter, so the plugin does not load. | Reinstall the plugin: `opencode plugin remove github:we-the-rebel-alliance/slack-plugin#vX.Y.Z`, then `opencode plugin add` the same tag, then `opencode reload`. |
| — | `INPUT_INVALID` | A plugin tool's input is invalid; the message names the problems. | Pass the fields its schema describes. |
| — | `SCOPE_MISSING` | `mark_read` lacks the `:write` scope the message names, or `mentions_list` lacks a `search:read` scope. | Add it to the app (and `oauth.scopes`, if you set it), then sign in again. |
| — | `SOURCE_UNKNOWN` | This plugin lists only the sources `slack` and `mentions`. | Leave `source` out, or pass `slack` or `mentions`. |
| — | `CURSOR_INVALID` | The cursor was not issued by `events_list` for this Slack workspace, sign-in and scope. | Call `events_list` without a cursor, with `since`, to start again. |
| — | `ACCOUNT_UNKNOWN` | The signed-in Slack workspace is not the account `events_list` was asked for. | Leave `account` out, or pass the signed-in workspace. |
| — | `TOO_MANY_MESSAGES` | More messages were posted in a channel after the cursor or `since` than one `events_list` call reads. | Call `events_list` again with a later `since`, without a cursor. |
| — | `UPSTREAM_UNREADABLE` | Slack's answer to a read `events_list` makes is in a shape it does not read. | Call the tool directly to see Slack's answer, and run `/slack-status`. |
| — | `UPSTREAM_ERROR` | Slack refused a read `events_list` makes, or `mark_read`'s `conversations.mark`. | `events_list`: check the channel id in `events.channels`, then retry with the same cursor. `mark_read`: check `channel_id` and `ts`. |
| — | `TOOL_UNAVAILABLE` | OpenCode does not list a read `events_list` needs, or `slack` is your own server. | Wait a few seconds, then run `/slack-status` and follow its next step. |
| — | `PERMISSION_DENIED` | `thread_read` was asked for a thread in a channel outside the confirmed scope. | Confirm that channel for the source, or read only threads of the channels already confirmed. |
| — | `FEATURE_NOT_ENABLED` | Slack refused `mentions_list`'s search (`assistant.search.context`): Real-time Search is not enabled for this app, workspace or user. | Use a Slack app internal to your workspace or listed in the Slack Marketplace, as a full member rather than a guest, then sign in again. |
| — | `RATE_LIMITED` | Slack rate-limited a Web API read of `mentions_list` past the waits the plugin takes. | Call it again after the time the message names. |
| — | `UNAVAILABLE` | Slack's `auth.test` did not name the signed-in workspace and user, which `events_list`, `probe` and `thread_read` name on every answer. | Run `/slack-status`; once it shows the Account, call the method again. |

A script's errors from the tools RPC have their own codes, listed in [Scripting](docs/scripting.md#errors).

## Docs

- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Scripting](docs/scripting.md)
- [Live check](docs/live-check.md)
- [Slack app manifest](docs/slack-app-manifest.json)
- [Security and data flow](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/we-the-rebel-alliance/slack-plugin/issues)

This plugin is not affiliated with Slack. Slack is a trademark of Slack Technologies, LLC, used here only to name the
service. License: [MIT](LICENSE).
