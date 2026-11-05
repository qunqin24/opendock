# Granola for OpenCode

Ask OpenCode about your Granola meetings, read their notes and transcripts, and save them as Markdown, through
Granola's official MCP server.

Unofficial; not affiliated with Granola.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Another release inside that range runs, and status
  calls it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`; see
  [Troubleshooting](#troubleshooting).
- macOS or Linux.
- A Granola account. Granola's free plan includes the last 30 days of meeting history; transcripts and folders are
  paid features.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-granola
```

This adds the plugin to your global OpenCode config. Run `opencode reload`, or restart OpenCode. Then run
`/granola-status`: it shows `sign-in required` until you sign in.

**Update** with `opencode plugin update @joe-broadhead/opencode-granola`, then run `opencode reload`. An entry pinned to
a version, such as `@joe-broadhead/opencode-granola@0.0.1`, does not update: remove the `@version` from its `plugins`
entry first.

## Sign in

1. Run `/connect` and choose **Granola**, listed under MCP.
2. Press `o` or Enter to open Granola's sign-in page in your browser, then approve there.
3. Run `/granola-status`. Its `Connection` row shows `connected`, and its `Tools` row shows how many Granola tools
   are available.

On the CLI, `opencode mcp auth granola` opens the sign-in page automatically. `/mcps` works too. There is
nothing to configure first: Granola registers OpenCode's sign-in itself.

When Granola rejects a stored sign-in, `/connect` shows Granola as "Sign in required"; choose it to sign in again. To
sign out, run `opencode mcp logout granola`. Granola's own `sign_out` tool is hidden, so the model cannot sign you out.

## Use

Ask in plain language, for example "What did we decide about the launch in last week's meetings?" or "Brief me for my
call with Acme." The `granola` skill teaches the model how to find, read and cite meetings, and the
`granola-meeting-brief` skill how to prepare a sourced brief.

Granola's tools appear as `granola_<tool>`, or `tools.granola.<tool>` in Code Mode. Granola decides which tools your
account gets. On the free plan:

- meeting history covers the last 30 days;
- transcripts and folders are paid features, so the transcript and folder tools fail with Granola's own message.

The plugin adds one tool, `export_markdown` (`granola_export_markdown`). It saves the notes, transcripts or both of 1
to 20 meetings to one Markdown file in your export folder, without passing the text through the conversation, and asks
before it writes. Its inputs are `meeting_ids`, `content` (`notes`, `transcript` or `both`), an optional `path` inside
the export folder, and `overwrite`. When your plan has no transcripts, the file holds the notes and says that
transcripts are not available on your Granola plan.

To see the connection, the workspace, the tools and the next step:

- `/granola-status` posts the status in the session.
- In the terminal UI, the command palette entry **Granola: Status**, or `/granola`, opens the same status in a dialog.
  Press `r` to refresh and `Esc` to close.

The workspace name comes from the most recent Granola account read since OpenCode started, and is kept in memory
only. Until then, status says the workspace is unknown; ask the agent to check your Granola account.

### Scripts

A script or a cron job can call Granola's ten read tools with no model, through `opencode api`. It runs as a session
and its agent, under that agent's permission rules and the session's own. Writes, `sign_out` and `export_markdown` are
never available to scripts:

```sh
opencode api post /api/rpc/granola.meetings.tools/list_meetings \
  -d '{"input":{"sessionID":"ses_…","input":{"limit":10}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/scripting.md).

## Permissions

| Kind | Tools | Default |
| --- | --- | --- |
| Reads | `get_account_info`, `list_meeting_folders`, `list_meetings`, `search_meetings`, `get_meetings`, `get_meeting_transcript`, `search_transcripts`, `query_granola_meetings`, `get_meeting_attachment`, `list_templates` | run without asking |
| Changes | `create_folder`, `update_folder`, `add_note_to_folder`, `remove_note_from_folder`, `update_private_notes`, `generate_summary` | ask first |
| Reports to Granola | `give_feedback` | off; Granola's own instructions tell the model to send it unasked. Add an `ask` rule for `granola_give_feedback` to turn it on |
| The plugin's export | `export_markdown` | asks first |
| New tools | any Granola tool this plugin version does not know yet | ask first; status names them |
| Hidden | `sign_out` | removed; use `opencode mcp logout granola` |

The plugin inserts these rules into each agent, directly after the agent's base "allow everything" rule. Your own
`permissions` and your saved "Always allow" answers override them, and a `deny` you configure always wins. Explore
and Title also get the block, but their own later deny rules still keep Granola tools out, and Plan keeps its
restrictions. An agent without a base "allow everything" rule gets no rules.

For example, to let one write run without asking:

```json
{
  "permissions": [
    { "action": "granola_create_folder", "resource": "*", "effect": "allow" }
  ]
}
```

Agents defined only in your own config are created after plugins start, so they miss the default rules, and Granola's
writes would run there without asking. Status names each such agent and gives the block to paste first in each listed
agent's own `permissions`, in `opencode.json` or the agent's Markdown file. An agent whose own rules already ask or deny
for every Granola tool needs nothing and is not named. Do not put the block in the top-level `permissions`, which would
loosen Explore.

In `opencode run` and other runs where nobody can answer, a call that would ask is refused; reads still work.

## Configure

Two options, both optional: `exportDirectory`, an absolute path for exports (default: `Granola` in your home
folder), and `allowUntestedHost`. The
[configuration guide](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md) covers them,
the full rule block, recipes, the export and every error code.

## Organisation rollout

Granola needs no client ID or app registration, so an organisation only installs the plugin for its members. Put the
plugin in the system config, which outranks each member's own config: `/etc/opencode/opencode.json` on Linux, or
`/Library/Application Support/opencode/opencode.json` on macOS.

```jsonc
{
  "plugins": [
    {
      "package": "@joe-broadhead/opencode-granola",
      "options": { "exportDirectory": "<an absolute path>/Granola" }
    }
  ]
}
```

Each member then signs in once with `/connect` → Granola. A managed `mcp.servers.granola` entry for
`https://mcp.granola.ai/mcp` is used as it is.

## Troubleshooting

Run `/granola-status` (or `/granola` in the terminal UI) first. It shows the rows `Connection`, `Account`, `Access`,
`Export folder`, `Skills`, `Tools`, `Agents without default rules` (`none` when no agent needs the fix), `OpenCode` and
exactly one `Next step`. Each connection state:

| Status | Code | What to do |
| --- | --- | --- |
| not configured | `NOT_REGISTERED` | Retry in a few seconds; if it persists, check that no organisation policy (`mcp.use`) or other plugin removes the `granola` server, then restart OpenCode. |
| connecting | `CONNECTING` | Retry in a few seconds. |
| sign-in required | `AUTH_REQUIRED` | Run `/connect` and choose Granola, then press `o` or Enter to open the sign-in page. In a terminal, `opencode mcp auth granola` opens it automatically. |
| failed | `CONNECTION_FAILED` | Reconnect Granola from `/mcps`, and if it keeps failing, run `/connect` and choose Granola to sign in again. |
| disabled | `DISABLED` | Enable `granola` in `/mcps`, or remove `"disabled": true` from `mcp.servers.granola` in your OpenCode config. |
| conflict | none | Remove `mcp.servers.granola` from your OpenCode config to use Granola's official server. |
| connected | none | Ready. The next step reads `Nothing to do.`, or names agents without default rules. |

**`MCP server not found: granola` from `opencode mcp auth granola`, right after OpenCode starts.** Plugins are still
loading for a few seconds. Run it again, or use `/connect`, which updates live.

**Older meetings are missing.** On Granola's free plan, Granola's server returns only the meetings of the last 30 days.

**A tool says your Granola plan does not include it, or `TOOL_UNAVAILABLE`.** Granola's free plan has no
transcripts or folders.

**`HOST_UNTESTED`.** The plugin does not start on an OpenCode version outside `>=2.2.3 <2.3.0`, including
development builds. Use OpenCode `>=2.2.3 <2.3.0`, or set the plugin option `allowUntestedHost: true` to run anyway;
the `OpenCode` row then says `host untested`, and when nothing else is needed the next step says to use a tested
release if Granola misbehaves. A release inside the range other than 2.2.3, 2.2.4 and 2.2.5 runs normally: only the
`OpenCode` row calls it untested.

**`OPTIONS_INVALID`.** A plugin option has an unknown name or a wrong type. The message names the option.

**Status shows `conflict`.** Your config defines `mcp.servers.granola` for a different server, and the plugin never
overwrites it. An entry for Granola's official URL is used as it is.

**Status lists Agents without default rules.** See [Permissions](#permissions).

**The `Skills` row names a file.** A skill of yours with the id `granola` or `granola-meeting-brief`, for example in
`~/.config/opencode/skills/` or a project's `.opencode/skills/`, takes the place of the plugin's own, so the model
never sees the plugin's. Rename its folder and its `name`, or move it, as the next step says.

**A script gets an error.** The tools RPC has its own codes, listed in
[Scripting](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/scripting.md#errors).

Granola uses the workspace that is active in your Granola app; meetings in other workspaces do not appear. The plugin
supports one Granola account.

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `granola` server, so
it cannot remove its sign-in, and `opencode auth list` stops showing it.

1. Sign out of Granola: `opencode mcp logout granola`.
2. Check: `opencode auth list` no longer lists **Granola**.
3. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-granola`, then `opencode reload`.
   `opencode mcp list` no longer lists `granola`.
4. Remove any Granola rules you copied into your agents' own `permissions`.

Files you exported stay in your export folder.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/scripting.md)
- [Contributing](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/CHANGELOG.md)
- [License](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/LICENSE)
- [Issues](https://github.com/joe-broadhead/opencode-granola/issues)
