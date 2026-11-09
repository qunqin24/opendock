# Wispr Flow for OpenCode

Search and read your Wispr Flow Notetaker meetings, transcripts, Scratchpad notes and calendar in OpenCode, through
Wispr Flow's official MCP server.

Unofficial; not affiliated with Wispr Flow.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- A Wispr Flow account with Notetaker and MCP access; the free plan includes it. The Wispr Flow app on Mac or Windows
  records the meetings, and OpenCode can run on another machine.
- **Cloud Sync** (Dictation cloud storage, in Wispr Flow's Settings → Data & Privacy) turned on, for meetings and the
  calendar. Scratchpad works without it.
- Not available on accounts with a HIPAA agreement. Organisation admins can turn Wispr Flow's MCP, or Scratchpad, off.
- Wispr Flow processes your data in the United States.

What Wispr Flow's server can't read: dictation history, the dictionary, snippets, styles and usage. No tool takes
audio, and no tool changes anything in Wispr Flow. One tool, `get_participant_contacts`, asks before it runs: see
[Permissions](#permissions).

## Install

```sh
opencode plugin add @joe-broadhead/opencode-wisprflow
```

Run `opencode reload`, or restart OpenCode. Then run `/wisprflow-status`: it shows `sign-in required` until you sign
in (see [Sign in](#sign-in)).

The plugin registers Wispr Flow's MCP server under the name `wisprflow`, adds default permission rules, the
`/wisprflow-status` command, the `/wisprflow` status view and two skills. Every tool is Wispr Flow's, and OpenCode
handles the connection, the sign-in and the stored credentials.

**Update** with `opencode plugin update @joe-broadhead/opencode-wisprflow`, then run `opencode reload`. An entry
pinned to a version does not update: remove the `@version` from its `plugins` entry first.

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

A script or a cron job can call Wispr Flow's read tools with no model, through `opencode api`. The plugin adds one
read of its own, `events_list` (`wisprflow_events_list`), for Memory's collector: the meetings Wispr Flow captured
since a cursor, as normalised events, oldest first. It only reads, and never asks; see
[Events list](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/configuration.md#events-list). It runs as a session
and its agent, under that agent's permission rules and the session's own:

```sh
opencode api post /api/rpc/wisprflow.meetings.tools/search_meetings \
  -d '{"input":{"sessionID":"ses_…","input":{"query":"pricing","since":"2026-03-01T00:00:00Z"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds these rules to every agent, directly after the agent's base rule that allows everything:

1. `{ "action": "wisprflow_*", "resource": "*", "effect": "ask" }`: every Wispr Flow tool asks, including tools Wispr
   Flow adds later.
2. One `allow` rule for each of the 15 read tools Wispr Flow lists for every account, listed in
   [`src/wisprflow-tools.ts`](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/src/wisprflow-tools.ts).
   These run without a prompt.
3. `{ "action": "wisprflow_get_participant_contacts", "resource": "*", "effect": "ask" }`: Wispr Flow lists this tool
   only for accounts with Wispr Contacts. It returns other people's job titles, companies and LinkedIn profiles, so it
   asks, although it only reads.

No Wispr Flow tool changes anything. A tool Wispr Flow adds later asks until the plugin knows it. Everything that comes later than these rules still wins: an agent's own stricter rules
(Explore cannot use Wispr Flow), your `permissions` in `opencode.json`, and your saved "Always allow" answers. To make
a read ask, add a later rule for it, such as `{ "action": "wisprflow_get_meeting", "resource": "*", "effect": "ask" }`.
In an unattended run such as `opencode run`, a tool that asks is refused.

Agents that exist only in your own config, and agents added by plugins that load later, are created after the plugin
adds its rules, so Wispr Flow tools run there without asking. `/wisprflow-status` and `/wisprflow` name those agents
and show the default rules to put first in each one's own `permissions`. Do not put them in the top-level
`permissions`, which would loosen Explore.
[Configuration](https://github.com/joe-broadhead/opencode-wisprflow/blob/HEAD/docs/configuration.md#permissions) has a
worked example and permission recipes.

## Configure

Set options with the object form of the plugin entry:

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-wisprflow", "options": { "allowUntestedHost": true } }]
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
  "plugins": ["@joe-broadhead/opencode-wisprflow"]
}
```

Members then only sign in: run `/connect` and choose Wispr Flow, then press `o` or Enter to open the link. To pin the
permissions, add your rules for `wisprflow_*` tools to the same file. Whether members may use Wispr Flow's MCP at
all, and Scratchpad through it, is set in Wispr Flow's admin portal.

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
| Tools: unknown | Your account lists tools the plugin hasn't classified, such as ones Wispr Flow added or lists only with a feature turned on. They ask before they run. |
| Skills: `wisprflow` is replaced by a path | A skill of yours with the id `wisprflow` or `wisprflow-meeting-brief`, for example in `~/.config/opencode/skills/` or a project's `.opencode/skills/`, loads instead of the plugin's own. Rename or move that file, as the next step says. |
| Agents without default rules | Put the default rules shown by `/wisprflow-status` first in each listed agent's own permissions, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Wispr Flow tools. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4 or 2.2.5. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. If Wispr Flow misbehaves, use a tested release. |
| "Cloud Sync must be enabled to use this feature." | Turn on Dictation cloud storage in Wispr Flow's Settings → Data & Privacy, or ask your admin. Meetings recorded while it was off never appear, even after you turn it on. |
| "This feature is not available for HIPAA-covered accounts." | Wispr Flow's MCP is not available on this account. |
| "MCP access has been disabled by your organization's administrator." or "Scratchpad access has been disabled…" | Ask your organisation's Wispr Flow admin. |
| "Too many requests" | Wait about a minute, then try again. |
| Meetings are missing | Check the account: `opencode mcp logout wisprflow`, then sign in with the other one. Meetings recorded with Cloud Sync off never appear, and a transcript removed by your retention setting is gone, while its summary remains. |
| A Wispr Flow tool is refused in `opencode run` | Nobody could answer its prompt. Add an `allow` rule for that tool. |
| `/wisprflow` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
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
3. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-wisprflow`, then `opencode reload`.
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
