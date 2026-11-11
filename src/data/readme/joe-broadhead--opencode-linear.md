# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so the model can find, read and cite your issues,
projects, cycles, documents and comments, and change them only if you allow it.

Unofficial; not affiliated with Linear.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Linear account.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-linear#v0.0.0
```

Run `opencode reload`, or restart OpenCode. Then run `/linear-status`: it shows `sign-in required` until you sign in
(see [Sign in](#sign-in)).

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-linear#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-linear#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.0" }] }
```

The plugin registers Linear's MCP server under the name `linear`, adds default permission rules, the `/linear-status`
command, the `/linear` status view, two skills and two tools of its own, `linear_issues` and `linear_events_list`.
Every other tool is Linear's, and OpenCode handles the connection, the sign-in and the stored credentials.

`linear_issues` answers the issues assigned to you as a table: identifier, title, state, priority and link, in every
state, most recently updated first, 25 rows by default and at most 100. It is a quick look, not a count: the model
also reads whether Linear has more, and uses Linear's `list_issues` for totals and filters. It reads them through
Linear's own `list_issues`, under that tool's sign-in and permission rules, and holds no credential. It is
a direct tool, offered to the model even when Code Mode holds Linear's other tools, because
[Jelly](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/jelly.md) draws a tool's result as a table only
for a direct call, not for one made inside Code Mode.

`linear_events_list` is for Memory's collector, not for answering questions: it lists what changed in Linear for you
since a cursor, as normalised events, oldest first: each change to an issue assigned to you, and each notification in
your Linear inbox, with the issue's identifier and link. It only reads, through Linear's `get_workspace`, `get_user`,
`list_issues` and `get_notifications`, and never asks with the default rules. It is this plugin's side of the shared
`events_list` source contract
([configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#events-list)).

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

## Sign in

Run `/connect` and choose **Linear** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the link
to Linear's consent page in your browser, and pick the workspace there.

From a terminal, run `opencode mcp auth linear` instead; it opens the link automatically. `/mcps` also offers the same
sign-in.

The read-only server and the full one each have their own sign-in, because they use different server addresses.
Linear's consent page decides the workspace of each sign-in, so the two can be in different workspaces. When you
switch `access` between `"read-only"` and either other value, OpenCode uses the sign-in it already holds for that
server, if any, without asking again.

When the sign-in expires and cannot be renewed, `/connect` marks the Linear account as needing a new sign-in, and
OpenCode shows its "MCP server needs authentication" notice.

To sign out, or to change workspace, run `opencode mcp logout linear` while the access you want to change is the one
configured. It removes the stored sign-ins for that access only. Or remove the account in `/connect` → Linear. Then
sign in again and pick the workspace on Linear's consent page. To sign out of both before you remove the plugin, see
[Uninstall](#uninstall).

## Use

Ask, for example: "What is assigned to me in Linear this cycle?" or "Summarise the open issues in project Apollo."

| Command | What it does |
| --- | --- |
| `/linear-status` | Posts the status report into the session: connection, account, access, tools, agents without the default rules, the OpenCode check and the next step. The model can read it too. |
| `/linear`, or "Linear: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes when Linear's connection, the sign-in or the agents change. |

Two skills teach the model to use Linear well:

- `linear`, always: when `linear_issues` is enough and when to filter and page `list_issues`, filters, counts, treating
  Linear content as data, and citing identifiers and links.
- `linear-write`, unless `access` is `"read-only"`: read first, confirm each change, take extra care with sharing,
  merging and reviews, make one change at a time, report links.

The plugin connects to Linear's **full** server by default (`https://mcp.linear.app/mcp`), and the sign-in asks for
write scope. Every tool is allowed unless you restrict it; to make the plugin read-only, set `"access": "read-only"`,
which uses Linear's read-only server (`https://mcp.linear.app/mcp/readonly`); see [Configure](#configure).

### Scripts

A script or a cron job can call Linear's tools with no model, through `opencode api`. It runs as a session and its
agent, and every call resolves the rule for its action, the agent's and then the session's: only an `allow` runs, an
`ask` is refused, and a saved "Always allow" is not enough. The plugin's default rules follow the `access` option, so
restrict a script with `access` or with a later rule. When the plugin uses Linear's read-only server, write tools are
not listed at all.

```sh
opencode api post /api/rpc/linear.workspace.tools/get_issue -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"id":"ENG-123"}}}'
```

The method `events_list` runs `linear_events_list` the same way. See
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** An agent can read and change everything the signed-in Linear account can:
create and update issues, comments, projects, documents and initiatives, retire labels, and prepare file uploads.
Nothing asks first. Restrict it in any of these three ways:

1. **The `access` option**, which drives the default rules the plugin inserts:

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Linear adds later | nothing |
   | `"ask-changes"` | the read tools | every write, and new tools |
   | `"read-only"` | the read tools | nothing: every write is **denied**, and the plugin uses Linear's read-only server |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.0", "options": { "access": "read-only" } }] }
   ```

   `"read"` and `"write"` still work: they mean `"read-only"` and `"all"`, and `/linear-status` says they are
   deprecated.

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "linear_*", "resource": "*", "effect": "ask" },
     { "action": "linear_list_issues", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names: `linear_<tool>`, listed in
   [`src/linear-tools.ts`](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/src/linear-tools.ts), plus
   `linear_issues` for the plugin's own tool. A later rule wins:

   ```json
   { "permissions": [
     { "action": "linear_delete_comment", "resource": "*", "effect": "deny" },
     { "action": "linear_save_issue", "resource": "*", "effect": "ask" }
   ] }
   ```

The plugin inserts this block directly after each agent's base rule that allows everything, generated from
`defaultRules("all")` in `src/permissions.ts`:

```json
[
  {"action":"linear_*","resource":"*","effect":"allow"},
  {"action":"linear_extract_images","resource":"*","effect":"allow"},
  {"action":"linear_get_agent_skill","resource":"*","effect":"allow"},
  {"action":"linear_get_attachment","resource":"*","effect":"allow"},
  {"action":"linear_get_diff","resource":"*","effect":"allow"},
  {"action":"linear_get_diff_threads","resource":"*","effect":"allow"},
  {"action":"linear_get_document","resource":"*","effect":"allow"},
  {"action":"linear_get_initiative","resource":"*","effect":"allow"},
  {"action":"linear_get_issue","resource":"*","effect":"allow"},
  {"action":"linear_get_issue_status","resource":"*","effect":"allow"},
  {"action":"linear_get_milestone","resource":"*","effect":"allow"},
  {"action":"linear_get_notifications","resource":"*","effect":"allow"},
  {"action":"linear_get_project","resource":"*","effect":"allow"},
  {"action":"linear_get_release","resource":"*","effect":"allow"},
  {"action":"linear_get_release_note","resource":"*","effect":"allow"},
  {"action":"linear_get_status_updates","resource":"*","effect":"allow"},
  {"action":"linear_get_team","resource":"*","effect":"allow"},
  {"action":"linear_get_template","resource":"*","effect":"allow"},
  {"action":"linear_get_triage_responsibility","resource":"*","effect":"allow"},
  {"action":"linear_get_user","resource":"*","effect":"allow"},
  {"action":"linear_get_workspace","resource":"*","effect":"allow"},
  {"action":"linear_list_agent_skills","resource":"*","effect":"allow"},
  {"action":"linear_list_comments","resource":"*","effect":"allow"},
  {"action":"linear_list_custom_views","resource":"*","effect":"allow"},
  {"action":"linear_list_cycles","resource":"*","effect":"allow"},
  {"action":"linear_list_diffs","resource":"*","effect":"allow"},
  {"action":"linear_list_documents","resource":"*","effect":"allow"},
  {"action":"linear_list_initiative_labels","resource":"*","effect":"allow"},
  {"action":"linear_list_initiatives","resource":"*","effect":"allow"},
  {"action":"linear_list_issue_labels","resource":"*","effect":"allow"},
  {"action":"linear_list_issue_statuses","resource":"*","effect":"allow"},
  {"action":"linear_list_issues","resource":"*","effect":"allow"},
  {"action":"linear_list_milestones","resource":"*","effect":"allow"},
  {"action":"linear_list_project_labels","resource":"*","effect":"allow"},
  {"action":"linear_list_projects","resource":"*","effect":"allow"},
  {"action":"linear_list_release_notes","resource":"*","effect":"allow"},
  {"action":"linear_list_release_pipelines","resource":"*","effect":"allow"},
  {"action":"linear_list_releases","resource":"*","effect":"allow"},
  {"action":"linear_list_teams","resource":"*","effect":"allow"},
  {"action":"linear_list_templates","resource":"*","effect":"allow"},
  {"action":"linear_list_users","resource":"*","effect":"allow"},
  {"action":"linear_search_documentation","resource":"*","effect":"allow"},
  {"action":"linear_issues","resource":"*","effect":"allow"},
  {"action":"linear_events_list","resource":"*","effect":"allow"},
  {"action":"linear_create_attachment","resource":"*","effect":"allow"},
  {"action":"linear_create_attachment_from_upload","resource":"*","effect":"allow"},
  {"action":"linear_create_initiative_label","resource":"*","effect":"allow"},
  {"action":"linear_create_issue_label","resource":"*","effect":"allow"},
  {"action":"linear_delete_attachment","resource":"*","effect":"allow"},
  {"action":"linear_delete_comment","resource":"*","effect":"allow"},
  {"action":"linear_delete_diff_comment","resource":"*","effect":"allow"},
  {"action":"linear_delete_status_update","resource":"*","effect":"allow"},
  {"action":"linear_mark_notification","resource":"*","effect":"allow"},
  {"action":"linear_merge_diff","resource":"*","effect":"allow"},
  {"action":"linear_prepare_attachment_upload","resource":"*","effect":"allow"},
  {"action":"linear_prepare_file_upload","resource":"*","effect":"allow"},
  {"action":"linear_resolve_diff_thread","resource":"*","effect":"allow"},
  {"action":"linear_restore_initiative_label","resource":"*","effect":"allow"},
  {"action":"linear_restore_issue_label","resource":"*","effect":"allow"},
  {"action":"linear_restore_project_label","resource":"*","effect":"allow"},
  {"action":"linear_retire_initiative_label","resource":"*","effect":"allow"},
  {"action":"linear_retire_issue_label","resource":"*","effect":"allow"},
  {"action":"linear_retire_project_label","resource":"*","effect":"allow"},
  {"action":"linear_save_comment","resource":"*","effect":"allow"},
  {"action":"linear_save_diff_comment","resource":"*","effect":"allow"},
  {"action":"linear_save_document","resource":"*","effect":"allow"},
  {"action":"linear_save_initiative","resource":"*","effect":"allow"},
  {"action":"linear_save_initiative_label","resource":"*","effect":"allow"},
  {"action":"linear_save_issue","resource":"*","effect":"allow"},
  {"action":"linear_save_issue_label","resource":"*","effect":"allow"},
  {"action":"linear_save_milestone","resource":"*","effect":"allow"},
  {"action":"linear_save_project","resource":"*","effect":"allow"},
  {"action":"linear_save_project_label","resource":"*","effect":"allow"},
  {"action":"linear_save_release","resource":"*","effect":"allow"},
  {"action":"linear_save_release_note","resource":"*","effect":"allow"},
  {"action":"linear_save_status_update","resource":"*","effect":"allow"},
  {"action":"linear_share_issue","resource":"*","effect":"allow"},
  {"action":"linear_submit_diff_review","resource":"*","effect":"allow"},
  {"action":"linear_unshare_issue","resource":"*","effect":"allow"},
  {"action":"linear_update_diff","resource":"*","effect":"allow"}
]
```

`linear_issues` is the plugin's own read tool, allowed by
`{ "action": "linear_issues", "resource": "*", "effect": "allow" }`: it runs the host's `list_issues`, so that tool's
rules apply to the call it makes.

Everything later than these rules still wins: an agent's own stricter rules (Plan cannot edit, Explore cannot use
Linear), your `permissions` in `opencode.json`, and your saved **Always allow** answers. In an unattended run such as
`opencode run`, a tool that asks is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so they get no block; their own rules decide. `/linear-status` and `/linear` name those agents and
show the block to put first in each one's own `permissions`. Do not put it in the top-level `permissions`, which would
loosen Explore.
[Configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#permissions) has a
worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.0", "options": { "access": "read-only" } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `access` | `"all"`, `"ask-changes"` or `"read-only"` | `"all"` | What the generated rules allow, and which of Linear's servers is used. `"read-only"` uses Linear's read-only server with the `read` scope and loads only the `linear` skill; the other two use `https://mcp.linear.app/mcp` with `read write` and add the `linear-write` skill. `"read"` and `"write"` are deprecated: they mean `"read-only"` and `"all"`. |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.2.3 <2.3.0`, with a warning in status. |

Switching `access` changes the server address, and read and write access each have their own sign-in. If you have
never signed in with the new access, run `/connect` and choose Linear, then press `o` or Enter to open the link. If you
have, OpenCode reuses that sign-in, which may be in another workspace. Ask the model which Linear workspace it is
connected to; Linear's `get_workspace` answers. See [Sign in](#sign-in) to change it.

[docs/configuration.md](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md) has the
details, including your own `mcp.servers.linear` entry, permission recipes and every error.

## Organisation rollout

OpenCode registers itself with Linear's server automatically, so there is no client ID to distribute. Put the plugin
entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.0", "options": { "access": "ask-changes" } }]
}
```

`"all"` is the default. Set `"ask-changes"` so that every change asks first, or `"read-only"` so that changes are
denied and Linear's read-only server is used.

Members then only sign in: run `/connect` and choose Linear, then press `o` or Enter to open the link. To use a pre-registered OAuth client instead, define
`mcp.servers.linear` in the same file, as shown in
[Your own `mcp.servers.linear`](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#your-own-mcpserverslinear).

## Troubleshooting

Run `/linear-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Connection: sign-in required | Run `/connect` and choose Linear, then press `o` or Enter to open the link. In a terminal, `opencode mcp auth linear` opens it automatically. |
| Connection: connecting | Wait a few seconds, then run `/linear-status` again. |
| Connection: failed | Check your network, then run `/linear-status` again. |
| Connection: disabled | Enable `linear` in `/mcps`, or remove `"disabled": true` from `mcp.servers.linear` in `opencode.json`. |
| Connection: not configured | An organisation policy (`mcp.use`) or another plugin removes the `linear` server. Ask your administrator, then restart OpenCode. |
| Connection: conflict | Your config has an `mcp.servers.linear` entry with a URL other than the one your `access` uses. Point it at that URL or remove it, then restart OpenCode. |
| Tools: unknown | Linear added tools the plugin does not know yet. They follow the `access` value: allowed, asking, or denied. |
| Agents without default rules | Put the default rules shown by `/linear-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Linear tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4, 2.2.5 or 2.2.6. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Linear misbehaves, use a tested release. |
| Signed in to the wrong workspace, for example after switching `access` | The read-only server and the full one each have their own sign-in, and Linear's consent page decides the workspace. With the wrong access still configured, run `opencode mcp logout linear` (or remove the account in `/connect` → Linear), then sign in again and pick the workspace. |
| A Linear tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/linear` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `SERVER_NOT_REGISTERED` | The `linear` server could not be registered. Restart OpenCode. |
| `RULES_NOT_ADDED` | The default rules could not be added, so Linear tools may run without asking. Restart OpenCode. |
| `AUTH_REQUIRED` from `linear_issues` | Linear needs a sign-in. Run `/connect` and choose Linear, then press `o` or Enter to open the link. |
| `SERVER_CONFLICT` from `linear_issues` | Your own `mcp.servers.linear` points at another URL than your `access` uses. Point it at the URL `/linear-status` names, or remove it, then restart OpenCode. |
| `TOOL_UNAVAILABLE` from `linear_issues` | OpenCode does not list Linear's `list_issues` yet. Follow the next step in the message, or run `/linear-status`. |
| `UPSTREAM_UNREADABLE` from `linear_issues` | Linear's `list_issues` answered with something other than a list of issues. Ask for `list_issues` with assignee `me` instead. |
| `INPUT_INVALID` from `linear_events_list` | The `events_list` input is invalid, and the message names the problems. Pass `since`, `cursor`, `limit`, `account` or `source` as the tool's schema describes them. |
| `SOURCE_UNKNOWN` from `linear_events_list` | This plugin lists only the source `linear`. Leave `source` out, or pass `linear`. |
| `CURSOR_INVALID` from `linear_events_list` | The cursor was not issued by `events_list` for this Linear workspace and sign-in. Call `events_list` without a cursor, with `since`, to start again. |
| `ACCOUNT_UNKNOWN` from `linear_events_list` | The signed-in Linear workspace is not the account `events_list` was asked for. Leave `account` out, or pass the signed-in workspace. |
| `TOO_MANY_CHANGES` from `linear_events_list` | More changes than one `events_list` call reads came after the cursor or `since`. Call `events_list` again with a later `since`, without a cursor. |
| `UPSTREAM_ERROR` from `linear_events_list` | Linear's read failed. Run `/linear-status`, then call `events_list` again with the same cursor. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `linear` server, so
`opencode mcp logout linear` fails with `MCP server not found: linear` and the sign-ins stay in OpenCode's credential
store. The read-only server and the full one each have their own sign-in, and OpenCode signs out only the one for the
`access` configured now.

1. Sign out: `opencode mcp logout linear`. Right after OpenCode starts or reloads, it can answer
   `MCP server not found: linear` for a few seconds; wait, then run it again.
2. If you ever used the other server, sign out of it too. Set `"access"` in the plugin's `plugins` entry in
   `opencode.json` to the other value (`"all"` or `"ask-changes"` for the full server, `"read-only"` for the read-only
   one), for example `{ "package": "github:joe-broadhead/opencode-linear#v0.0.0", "options": { "access": "read-only" } }`, run
   `opencode reload`, then run `opencode mcp logout linear` again.
3. Check: `opencode auth list` no longer lists **Linear**.
4. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-linear#v0.0.0` (the spec you installed), then `opencode reload`.
   `opencode mcp list` no longer lists `linear`.
5. Remove any Linear rules you copied into your agents' own `permissions`.

## Known limits

- **Linear decides its tools.** The plugin's tool table follows Linear's servers at this release. `npm run drift` compares it with Linear's live list, as a maintainer check that needs a read-only Linear key. A tool Linear adds later runs under `access` (allowed at the default) and is not a script method until the plugin classifies it.
- **The default `access` is `all`.** Agents can then create, change and delete Linear items without asking. Set `access` to `"ask-changes"` to ask before every change, or to `"read-only"` to deny them.
- **Switching to or from `"read-only"` needs a new sign-in.** That value uses Linear's read-only server, which has its own sign-in. Switching between `"all"` and `"ask-changes"` keeps the sign-in.
- **Linear's consent page picks the workspace.** The plugin cannot choose a workspace; the sign-in shows Linear's page.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6 only.** Other releases in `>=2.2.3 <2.3.0` run untested.
- **Linear's rate limits and error text are Linear's.**
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md)
- [In Jelly](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/jelly.md)
- [Architecture](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/architecture.md)
- [Contributing](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/LICENSE)
- [Linear's MCP server](https://linear.app/docs/mcp)
