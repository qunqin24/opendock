# Linear for OpenCode

Connects OpenCode to Linear through Linear's official MCP server, so the model can find, read and cite your issues,
projects, cycles, documents and comments, and change them only if you allow it.

Unofficial; not affiliated with Linear.

Linear is a trademark of Linear Orbit, Inc.; this unofficial plugin is not endorsed by them.

## Requirements

- OpenCode `>=2.2.3 <2.4.0`, tested on 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 and 2.3.2. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Linear account.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-linear#v0.0.9
```

Run `opencode reload`, or restart OpenCode. Then run `/linear-status`: it shows `sign-in required` until you sign in
(see [Sign in](#sign-in)).

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-linear#v0.0.1`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-linear#v<version>`. If you used
`"access": "read-only"` with an earlier release, sign in once more after updating: that release used Linear's read-only
server, which has its own sign-in.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.9" }] }
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
your Linear inbox, with the issue's identifier and link. Each listing names its account, `<workspace id>/<email>`, which must be the one signed in to Linear now. It only
reads, through Linear's `list_issues` and `get_notifications` and, the first time after a start, the two identity reads that `probe` makes, and never asks with the default rules. It is this
plugin's source `linear.activity` under the shared source contract, which `package.json` declares, and `linear.issues`, the assigned-issues read as a `list` snapshot an app can render without knowing Linear. `linear.activity` is not renamed. The tools RPC
method `probe`, which names who is signed in through `get_workspace` and `get_user` with `me`
([configuration](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md#events-list)).

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

## Sign in

Run `/connect` and choose **Linear** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the link
to Linear's consent page in your browser, and pick the workspace there.

From a terminal, run `opencode mcp auth linear` instead; it opens the link automatically. `/mcps` also offers the same
sign-in.

The plugin uses one Linear server, `https://mcp.linear.app/mcp`, for every `access` value, so one sign-in serves them
all: changing `access` keeps it. Linear's consent page decides the workspace.

When the sign-in expires and cannot be renewed, `/connect` marks the Linear account as needing a new sign-in, and
OpenCode shows its "MCP server needs authentication" notice.

To sign out, or to change workspace, run `opencode mcp logout linear`, or remove the account in `/connect` → Linear.
Then sign in again and pick the workspace on Linear's consent page.

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

The plugin connects to Linear's server (`https://mcp.linear.app/mcp`), and the sign-in asks for `read write`. Every
tool is allowed unless you restrict it; to make the plugin read-only, set `"access": "read-only"`, which denies every
change through the default rules; see [Configure](#configure).

### Scripts

A script or a cron job can call Linear's tools with no model, through `opencode api`. It runs as a session and its
agent, and every call resolves the rule for its action, the agent's and then the session's: only an `allow` runs, an
`ask` is refused, and a saved "Always allow" is not enough. The plugin's default rules follow the `access` option, so
restrict a script with `access` or with a later rule. At `"read-only"` a write is denied before it runs.

```sh
opencode api post /api/rpc/linear.workspace.tools/get_issue -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"id":"ENG-123"}}}'
```

The method `events_list` runs `linear_events_list` the same way, and `probe` names who is signed in. See
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
   | `"read-only"` | the read tools | nothing: every write is **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.9", "options": { "access": "read-only" } }] }
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
  {"action":"linear_probe","resource":"*","effect":"allow"},
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
  {"action":"linear_update_diff","resource":"*","effect":"allow"},
  {"action":"linear_whoami","resource":"*","effect":"allow"}
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
  "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.9", "options": { "access": "read-only" } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `access` | `"all"`, `"ask-changes"` or `"read-only"` | `"all"` | What the generated rules allow. `"read-only"` loads only the `linear` skill; the other two add the `linear-write` skill. Every value uses `https://mcp.linear.app/mcp` with `read write`, so changing it keeps the sign-in. `"read"` and `"write"` are deprecated: they mean `"read-only"` and `"all"`. |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.2.3 <2.4.0`, with a warning in status. |

Switching `access` changes only the rules: the server and the sign-in stay the same. Ask the model which Linear
workspace it is connected to; Linear's `get_workspace` answers. See [Sign in](#sign-in) to change it.

[docs/configuration.md](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/configuration.md) has the
details, including your own `mcp.servers.linear` entry, permission recipes and every error.

## Organisation rollout

OpenCode registers itself with Linear's server automatically, so there is no client ID to distribute. Put the plugin
entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-linear#v0.0.9", "options": { "access": "ask-changes" } }]
}
```

`"all"` is the default. Set `"ask-changes"` so that every change asks first, or `"read-only"` so that changes are
denied.

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
| Connection: conflict | Your config has an `mcp.servers.linear` entry with a URL other than `https://mcp.linear.app/mcp`, Linear's read-only server included. Point it at that URL or remove it, then restart OpenCode. |
| Tools: unknown | Linear added tools the plugin does not know yet. They follow the `access` value: allowed, asking, or denied. |
| Agents without default rules | Put the default rules shown by `/linear-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Linear tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 or 2.3.2. Inside `>=2.2.3 <2.4.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Linear misbehaves, use a tested release. |
| Signed in to the wrong workspace | Linear's consent page decides the workspace. Run `opencode mcp logout linear` (or remove the account in `/connect` → Linear), then sign in again and pick the workspace. |
| A Linear tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/linear` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.4.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.4.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `SERVER_NOT_REGISTERED` | The `linear` server could not be registered. Restart OpenCode. |
| `RULES_NOT_ADDED` | The default rules could not be added, so Linear tools may run without asking. Restart OpenCode. |
| `AUTH_REQUIRED` from `linear_issues` | Linear needs a sign-in. Run `/connect` and choose Linear, then press `o` or Enter to open the link. |
| `SERVER_CONFLICT` from `linear_issues` | Your own `mcp.servers.linear` points at another URL than the plugin uses. Point it at the URL `/linear-status` names, or remove it, then restart OpenCode. |
| `TOOL_UNAVAILABLE` from `linear_issues` | OpenCode does not list Linear's `list_issues` yet. Follow the next step in the message, or run `/linear-status`. |
| `UPSTREAM_UNREADABLE` from `linear_issues` or `linear_events_list` | `linear_issues`: Linear's `list_issues` answered with something other than a list of issues; ask for `list_issues` with assignee `me` instead. `linear_events_list`: a read answered in a shape it does not read, or an entry without an id or a time, which the listing can neither list nor skip; that feed is held where it was while the other is listed, and the call answers this only when nothing else is left. Call `events_list` again later with the same cursor; if it persists, call the tool it names directly, and run `/linear-status`. |
| `INPUT_INVALID` from `linear_events_list` or `probe` | The input is invalid, and the message names the problems. Pass `account` (`<workspace id>/<email>`, as `probe` names it), `since`, `cursor`, `limit` or `source` as the tool's schema describes them. |
| `SOURCE_UNKNOWN` from `linear_events_list` or `probe` | This plugin lists only the source `linear`. Leave `source` out, or pass `linear`. |
| `CURSOR_INVALID` from `linear_events_list` | The cursor was not issued by `events_list` for this Linear account, or by 0.0.2 or earlier. Call `events_list` without a cursor, with `since`, to start again. |
| `UNAVAILABLE` from `linear_events_list` | Linear could not say who is signed in (a failed `get_workspace` or `get_user`, or an answer the plugin does not read), so nothing was listed. Run `/linear-status`, then list again. |
| `ACCOUNT_MISMATCH` from `linear_events_list` or `probe` | The cursor was issued for another account, or Linear is signed in to another account than the one asked for. Pass the cursor with its own account, or sign in to Linear as that account. |
| `UPSTREAM_ERROR` from `linear_events_list` | Linear's read failed. Run `/linear-status`, then call `events_list` again with the same cursor. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-linear/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `linear` server, so
`opencode mcp logout linear` fails with `MCP server not found: linear` and the sign-ins stay in OpenCode's credential
store.

1. Sign out: `opencode mcp logout linear`. Right after OpenCode starts or reloads, it can answer
   `MCP server not found: linear` for a few seconds; wait, then run it again.
2. Check: `opencode auth list` no longer lists **Linear**.
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-linear#v0.0.9` (the spec you installed), then `opencode reload`.
   `opencode mcp list` no longer lists `linear`.
4. Remove any Linear rules you copied into your agents' own `permissions`.

## Known limits

- **Linear decides its tools.** The plugin's tool table follows Linear's server at this release. `npm run drift` compares it with Linear's live list, as a maintainer check that needs a read-only Linear key. A tool Linear adds later runs under `access` (allowed at the default) and is not a script method until the plugin classifies it.
- **The default `access` is `all`.** Agents can then create, change and delete Linear items without asking. Set `access` to `"ask-changes"` to ask before every change, or to `"read-only"` to deny them.
- **`"read-only"` is enforced by OpenCode's rules, not by Linear.** The sign-in can write, so an agent without the
  default rules (`/linear-status` names it) could still change Linear. Linear's own read-only server is not used, so
  that changing `access` never needs a new sign-in.
- **Linear's consent page picks the workspace.** The plugin cannot choose a workspace; the sign-in shows Linear's page.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 and 2.3.2 only.** Other releases in `>=2.2.3 <2.4.0` run untested.
- **Linear's rate limits and error text are Linear's.** Linear's MCP server documents no limit of its own; Linear's API
  allows an OAuth app 5,000 requests an hour per user
  ([Rate limiting](https://linear.app/developers/rate-limiting)), which the server's reads presumably count against (not
  verified). One `events_list` call makes up to 8 `list_issues` and 5 `get_notifications` reads.
- **A listing needs no `probe` before it.** `linear.activity`'s account is `<workspace id>/<email>` (the id, because an
  admin can change a workspace's URL key, [workspaces](https://linear.app/docs/workspaces)), which `probe` reads with
  `get_workspace` and `get_user`. A listing that does not know the sign-in yet, after a start of OpenCode or a new
  sign-in, makes the same two reads itself, once, and the plugin keeps the answer in memory for the sign-in; the
  plugin forgets it on every credential update or switch. It then compares its account with that, so Linear signed in
  to another account is still `ACCOUNT_MISMATCH`. If Linear cannot answer those reads the listing is `UNAVAILABLE`. The conformance kit runs on Linear answers
  that are invented, modelled on the tools' descriptions in the live tool list, and not live-verified.
- **A burst bigger than one listing reads is cut, not stopped.** To bound what one call costs, the plugin reads at most
  2,000 assigned issues and 500 notifications per `events_list` call, newest first (8 and 5 pages' worth; Linear's own
  limit is 250 a page, and Linear keeps the history). These caps are the plugin's, not Linear's. In the worst case,
  with ties re-read at the cursor and the pages that show an overflow, one call makes 26 `list_issues` and 17
  `get_notifications` reads, 43 requests against your Linear rate limit (5,000 an hour for an app you sign in to); a
  quiet call makes one of each. Only changes the listing
  has not yet listed count toward them, never ones it re-reads at the cursor's own millisecond. When more of those
  changed after the cursor or `since`, and the page after the caps still holds one, the plugin does not read the
  oldest: the page answers `gap` once (`expired` for a cursor,
  `window-truncated` for `since`) and lists from `gap.since` on, so the next call goes on. The cursor remembers the
  cut until the read has listed what it promised, so changes that arrive meanwhile never cut the read again; only more
  arrivals than one call reads, a new burst, answer a new gap. Archived issues are listed too.
- **What Linear no longer shows is not listed.** A change to an issue deleted, or no longer assigned to you, before a
  listing reads it, and an inbox notification deleted or archived before then, are never listed, and nothing says so:
  Linear's tools do not show what was removed.
- **A change that becomes visible more than two minutes after its time is missed.** Linear does not document how soon
  a write is visible to a list read; the plugin assumes well under a second, and re-reads two minutes. Each listing
  reads each feed again from two minutes before the later of the cursor and Linear's now, and lists what it had not
  listed there, once (the cursor carries hashes of what it listed in those two minutes, up to 24 a feed). Linear's now
  is taken from the newest change a listing reads, never later than your computer's clock nor more than 10 minutes
  before it (`SKEW_MS`), so a clock running up to 10 minutes ahead of Linear's does not shorten the lookback; one further
  ahead can. A backlog read far behind Linear's now re-reads nothing: under the assumption every write before it is
  already visible. A change that shows up more than two minutes late, or more than 10 seconds late during a burst that
  shortens the lookback without a gap (below), is missed without a sign. When a live burst lists more than the
  cursor's hashes hold,
  the lookback is shortened. If what it still covers reaches back at least 10 seconds (`MIN_COVER_MS`, ten times the
  assumed sub-second delay), nothing the assumption allows can be lost and there is no gap, so a steady stream below
  about 2.4 changes a second never answers one. If it covers less, as in a bulk edit faster than that, the page answers
  `gap` (`expired`, or `window-truncated` on a first read from `since`, since Linear's now), so a write behind it is
  covered.
- **Jelly's relay sign-in is not yet checked with Linear.** The Jelly declaration lets a sign-in come back through
  Jelly's relay, based only on Linear's server metadata; Linear does not document its redirect rules, and no relay
  sign-in has been made yet.
- **Jelly's settings need a recent Jelly.** The `jelly` settings declare their choices, which a Jelly without app#1301
  does not read: it refuses the plugin's declaration.
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
