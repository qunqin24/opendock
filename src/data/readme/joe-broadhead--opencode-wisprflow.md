# Wispr Flow for OpenCode

Search and read your Wispr Flow Notetaker meetings, transcripts, Scratchpad notes and calendar in OpenCode, through
Wispr Flow's official MCP server.

Unofficial; not affiliated with Wispr Flow.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Wispr Flow account with Notetaker and MCP access; the free plan includes it. The Wispr Flow app on Mac or Windows
  records the meetings, and OpenCode can run on another machine.
- **Cloud Sync** (Dictation cloud storage, in Wispr Flow's Settings → Data & Privacy) turned on, for meetings and the
  calendar. Scratchpad works without it.
- Not available on accounts with a HIPAA agreement. Organisation admins can turn Wispr Flow's MCP, or Scratchpad, off.
- Wispr Flow processes your data in the United States.

What Wispr Flow's server can't read: dictation history, the dictionary, snippets, styles and usage. No tool takes
audio, and no tool changes anything in Wispr Flow. `get_participant_contacts` returns other people's profile data and
is allowed like every other tool by default: see [Permissions](#permissions).

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-wisprflow#v0.0.0
```

Run `opencode reload`, or restart OpenCode. Then run `/wisprflow-status`: it shows `sign-in required` until you sign
in (see [Sign in](#sign-in)).

The plugin registers Wispr Flow's MCP server under the name `wisprflow`, adds default permission rules, the
`/wisprflow-status` command, the `/wisprflow` status view and two skills. Every tool is Wispr Flow's, and OpenCode
handles the connection, the sign-in and the stored credentials.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-wisprflow#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-wisprflow#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-wisprflow#v0.0.0" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

## Sign in

Run `/connect` and choose **Wispr Flow** (it is listed under MCP). In the terminal UI, press `o` or Enter to open the
link to Wispr Flow's sign-in page in your browser. Sign in with the Wispr Flow account that holds the notes: personal
and work accounts are separate. With Google, Apple, Microsoft or single sign-on, finish within 5 minutes.

From a terminal, run `opencode mcp auth wisprflow` instead; it opens the link automatically. `/mcps` also offers the
same sign-in.

The sign-in covers every meeting, past ones included. There is nothing to configure, and Wispr Flow has no API key.

When the sign-in expires and cannot be renewed, `/connect` marks the Wispr Flow account as needing a new sign-in, and
OpenCode shows its "MCP server needs authentication" notice.

To sign out, or to switch account, run `opencode mcp logout wisprflow`, or remove the account in `/connect` →
Wispr Flow. Then sign in again. Wispr Flow itself has no disconnect control. To sign out before you remove the
plugin, see [Uninstall](#uninstall).

## Use

Ask, for example:

- "In Wispr Flow, what did we decide in yesterday's pricing call?"
- "Prep me for my next meeting using Wispr Flow."
- "Find my Wispr Scratchpad note about the hiring plan and summarise it."
- "What's this meeting?" with a Google Calendar, Meet or Zoom link pasted, or a notes.wisprflow.ai share link.

| Command | What it does |
| --- | --- |
| `/wisprflow-status` | Posts the status report into the session: connection, account, access, skills, tools, agents without the default rules, the OpenCode check and the next step. The model can read it too. |
| `/wisprflow`, or "Wispr Flow: Status" in the command palette | Opens the same report in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes when Wispr Flow's connection, the sign-in or the agents change. |

Two skills teach the model to use Wispr Flow well:

- `wisprflow`: which tool to use, local days turned into UTC windows, reading transcripts for what was said (search
  finds meetings, not transcript words), paging, labelling Wispr Flow's summaries, citing share links, keeping
  secrets and other people's details out of answers, and what the connection can't read.
- `wisprflow-meeting-brief`: a sourced brief before a meeting, from the upcoming event, its pre-read and earlier
  meetings, or a recap of a period's meetings.

### Scripts

A script or a cron job can call every tool this plugin knows with no model, through `opencode api`. It runs as a
session and its agent, under that agent's permission rules and the session's own. The rule is resolved first, so only
a prior explicit `allow` runs: the plugin's default block allows every tool, `get_participant_contacts` included, so
restrict a script with `access` or with a rule, and note that a saved "Always allow"
does not authorize an ad-hoc script:

```sh
opencode api post /api/rpc/wisprflow.meetings.tools/search_meetings \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"query":"pricing","since":"2026-03-01T00:00:00Z"}}}'
```

Without `x-opencode-directory:$PWD` the call reaches the service's default location and fails `rpc.unavailable` when
the plugin is not loaded there.

See [Scripting](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** The `access` option decides whether each tool runs, asks or is denied. At its default, `"all"`, an agent can search and read any meeting, transcript, note or calendar entry the
signed-in account can see, `get_participant_contacts` included, without asking. Nothing in this plugin changes
Wispr Flow, so the default cannot alter or delete anything there; what it can do is read a lot, and the results are
other people's words and contact details. Restrict it in any of these three ways:

1. **The `access` option**, which drives the default rules the plugin inserts:

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Wispr Flow adds later | nothing |
   | `"ask-changes"` | the read tools | everything else, new tools included |
   | `"read-only"` | the read tools | nothing: everything else is **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-wisprflow#v0.0.0", "options": { "access": "read-only" } }] }
   ```

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "wisprflow_*", "resource": "*", "effect": "ask" },
     { "action": "wisprflow_search_meetings", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names in
   [`src/wisprflow-tools.ts`](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/src/wisprflow-tools.ts). To
   make one tool ask, or stop it, add a later rule for it:

   ```json
   { "permissions": [
     { "action": "wisprflow_get_participant_contacts", "resource": "*", "effect": "deny" },
     { "action": "wisprflow_get_meeting", "resource": "*", "effect": "ask" }
   ] }
   ```

The plugin inserts this block directly after each agent's base rule that allows everything, generated from
`defaultRules("all")` in `src/permissions.ts`:

```json
[
  { "action": "wisprflow_*", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_calendar_event", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_meeting", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_meeting_by_calendar_id", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_meeting_participants_enriched", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_scratchpad_note", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_upcoming_meeting", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_list_folder_meetings", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_list_folders", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_list_meeting_series", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_list_upcoming_meetings", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_resolve_calendar_link", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_resolve_share_link", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_search_calendar_events", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_search_meetings", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_search_scratchpad_notes", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_events_list", "resource": "*", "effect": "allow" },
  { "action": "wisprflow_get_participant_contacts", "resource": "*", "effect": "allow" }
]
```

Everything later than these rules still wins: an agent's own stricter rules (Explore cannot use Wispr Flow), your
`permissions` in `opencode.json`, and your saved answers. In an unattended run such as `opencode run`, a tool that asks
is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Wispr Flow tools run there under that agent's own rules. `/wisprflow-status` and `/wisprflow` name the
agents that have no rules of the plugin's and show the default block to put first in each one's own `permissions`. Do
not put it in the top-level `permissions`, which would loosen Explore.
[Configuration](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/configuration.md#permissions) has a
worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-wisprflow#v0.0.0", "options": { "allowUntestedHost": true } }]
}
```

| Option | Values | Default | Effect |
| --- | --- | --- | --- |
| `allowUntestedHost` | `true` or `false` | `false` | Starts on an OpenCode version outside `>=2.2.3 <2.3.0`, with a warning in status. |

[docs/configuration.md](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/configuration.md) has the
details, including your own `mcp.servers.wisprflow` entry, permission recipes and every error.

## Organisation rollout

OpenCode registers itself with Wispr Flow's server automatically, so there is no client ID to distribute. Put the
plugin entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": ["github:joe-broadhead/opencode-wisprflow#v0.0.0"]
}
```

Members then only sign in: run `/connect` and choose Wispr Flow, then press `o` or Enter to open the link. To pin the
permissions, add your rules for `wisprflow_*` tools to the same file. Whether members may use Wispr Flow's MCP at
all, and Scratchpad through it, is set in Wispr Flow's admin portal.

## Known limits

- **Meetings need Cloud Sync.** A meeting recorded while Dictation cloud storage is off never appears, even after you turn it on.
- **Some Wispr Flow data is out of reach.** No tool reads dictation history, the dictionary, snippets, styles, usage stats or Notetaker chat, and no tool takes audio.
- **The tool list depends on the account.** An active HIPAA agreement or an organisation policy can turn Wispr Flow's MCP off, and a tool the plugin has not classified runs at the `access` value you set.
- **Attendee contacts are readable at every `access` value.** `get_participant_contacts` is a read, so it is allowed unless you add a rule for it.
- **Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6.** Other releases inside `>=2.2.3 <2.3.0` start, and status reports them as untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Troubleshooting

Run `/wisprflow-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Connection: sign-in required | Run `/connect` and choose Wispr Flow, then press `o` or Enter to open the link. In a terminal, `opencode mcp auth wisprflow` opens it automatically. |
| Connection: connecting | Wait a few seconds, then run `/wisprflow-status` again. |
| Connection: failed | Check your network, then run `/wisprflow-status` again. |
| Connection: disabled | Enable `wisprflow` in `/mcps`, or remove `"disabled": true` from `mcp.servers.wisprflow` in `opencode.json`. |
| Connection: not configured | An organisation policy (`mcp.use`) or another plugin removes the `wisprflow` server. Ask your administrator, then restart OpenCode. |
| Connection: conflict | Your config has an `mcp.servers.wisprflow` entry with a URL other than the plugin's, `https://api.wisprflow.ai/connect/mcp`. Point it there or remove it, then restart OpenCode. |
| Sign-in never starts | Your own `mcp.servers.wisprflow` URL ends with a slash. Wispr Flow's sign-in needs `https://api.wisprflow.ai/connect/mcp` exactly; status reports this as a conflict. |
| Wispr Flow's sign-in page doesn't return you to OpenCode | See Wispr Flow's help on [connecting an MCP client](https://docs.wisprflow.ai/articles/9551372685-connect-an-mcp-client-to-wispr-flow-remote-mcp-server), then run `/connect` and choose Wispr Flow again. |
| Tools: 0 available, while connected | Wispr Flow lists no tools for this account: an active HIPAA agreement, or an organisation policy, turns its MCP off. Check Wispr Flow's Settings → MCP, or ask your admin. |
| Tools: unknown | Your account lists tools the plugin hasn't classified, such as ones Wispr Flow added or lists only with a feature turned on. The default block's `wisprflow_*` rule decides them: they run at the default `access`, ask at `"ask-changes"` and are denied at `"read-only"`. |
| Skills: `wisprflow` is replaced by a path | A skill of yours with the id `wisprflow` or `wisprflow-meeting-brief`, for example in `~/.config/opencode/skills/` or a project's `.opencode/skills/`, loads instead of the plugin's own. Rename or move that file, as the next step says. |
| Agents without default rules | Put the default rules shown by `/wisprflow-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Wispr Flow tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4, 2.2.5 or 2.2.6. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Wispr Flow misbehaves, use a tested release. |
| "Cloud Sync must be enabled to use this feature." | Turn on Dictation cloud storage in Wispr Flow's Settings → Data & Privacy, or ask your admin. Meetings recorded while it was off never appear, even after you turn it on. |
| "This feature is not available for HIPAA-covered accounts." | Wispr Flow's MCP is not available on this account. |
| "MCP access has been disabled by your organization's administrator." or "Scratchpad access has been disabled…" | Ask your organisation's Wispr Flow admin. |
| "Too many requests" | Wait about a minute, then try again. |
| Meetings are missing | Check the account: `opencode mcp logout wisprflow`, then sign in with the other one. Meetings recorded with Cloud Sync off never appear, and a transcript removed by your retention setting is gone, while its summary remains. |
| A Wispr Flow tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/wisprflow` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `EVENTS_INVALID_INPUT` | `events_list`: the input breaks the shared contract. | Pass only since, cursor, limit (1 to 500), account and source, as the tool's schema describes. |
| `EVENTS_CURSOR_INVALID` | `events_list`: the cursor was not issued by Wispr Flow's events_list for this sign-in. | Pass a cursor from a previous result of the same account, or start again with since. |
| `EVENTS_ACCOUNT_UNKNOWN` | `events_list`: an account other than `default`. | Leave account out, or pass "default". |
| `EVENTS_SOURCE_UNKNOWN` | `events_list`: a source other than `wisprflow`. | Leave source out, or pass "wisprflow". |
| `EVENTS_OWNER_UNKNOWN` | `events_list`: OpenCode holds no Wispr Flow sign-in to name as the owner. | Run /connect and choose Wispr Flow to sign in, then call events_list again. |
| `EVENTS_UNAVAILABLE` | `events_list`: `wisprflow_search_meetings` is not available, because the server is not connected or signed in, or the `wisprflow` name is another server's. | Run /wisprflow-status and follow its next step. |
| `EVENTS_READ_FAILED` | `events_list`: Wispr Flow's `search_meetings` failed, or capped one week's meetings. The message holds the first line of Wispr Flow's text, cut and redacted. | Call events_list again with the same cursor; if it keeps failing, run /wisprflow-status. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |
| `SKILLS_INVALID` | A skill file in the package is missing or broken. Reinstall the plugin. |
| `SERVER_NOT_REGISTERED` | The plugin could not register the `wisprflow` server. Restart OpenCode. |
| `RULES_NOT_ADDED` | The default permission rules could not be added, so Wispr Flow tools may run without asking. Restart OpenCode. |

A script's errors from the tools RPC have their own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `wisprflow` server, so
`opencode mcp logout wisprflow` fails with `MCP server not found: wisprflow` and the sign-in stays in OpenCode's
credential store.

1. Sign out: `opencode mcp logout wisprflow`. Right after OpenCode starts or reloads, it can answer
   `MCP server not found: wisprflow` for a few seconds; wait, then run it again.
2. Check: `opencode auth list` no longer lists **Wispr Flow**.
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-wisprflow#v0.0.0`, then `opencode reload`.
   `opencode mcp list` no longer lists `wisprflow`.
4. Remove any Wispr Flow rules you copied into your agents' own `permissions`.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/configuration.md)
- [In Jelly](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/jelly.md)
- [Architecture](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/architecture.md)
- [Contributing](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/LICENSE)
- [Wispr Flow's MCP help](https://docs.wisprflow.ai/articles/9551372685-connect-an-mcp-client-to-wispr-flow-remote-mcp-server)
