# Granola for OpenCode

Ask OpenCode about your Granola meetings, read their notes and transcripts, and save them as Markdown, through
Granola's official MCP server.

Unofficial; not affiliated with Granola.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Another release inside that range runs, and status
  calls it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`; see
  [Troubleshooting](#troubleshooting).
- macOS or Linux.
- A Granola account. Granola's free plan includes the last 30 days of meeting history; transcripts and folders are
  paid features.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-granola#v0.0.0
```

This adds the plugin to your global OpenCode config. Run `opencode reload`, or restart OpenCode. Then run
`/granola-status`: it shows `sign-in required` until you sign in.

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-granola#v0.0.0" }] }
```

### Update

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-granola#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-granola#v<version>`.

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

It also adds `events_list` (`granola_events_list`), for Memory's collector and other scripts, not for answering
questions: the meetings you took part in since a cursor, as normalised events with their summaries, oldest first. It
only reads, and never asks. See [Events list](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md#events-list).

To see the connection, the workspace, the tools and the next step:

- `/granola-status` posts the status in the session.
- In the terminal UI, the command palette entry **Granola: Status**, or `/granola`, opens the same status in a dialog.
  Press `r` to refresh and `Esc` to close.

The workspace name comes from the most recent Granola account read since OpenCode started, and is kept in memory
only. Until then, status says the workspace is unknown; ask the agent to check your Granola account.

### Scripts

A script or a cron job can call Granola's tools with no model, through `opencode api`. It runs as a session and its
agent, under that agent's permission rules and the session's own. Every known tool is a method; a write, a send or an
export needs a prior explicit `allow` in the session's or the agent's rules, because an `ask` is refused when no one can
answer it. `sign_out` is not a method: the plugin removes it, and `opencode mcp logout granola` revokes the grant.

```sh
opencode api post /api/rpc/granola.meetings.tools/list_meetings \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"limit":10}}}'
```

The header names the location whose plugin and session you mean; without it the call goes to your home directory and
fails `rpc.unavailable` when the plugin is not loaded there.

See [Scripting](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** The `access` option decides whether each tool runs, asks or is denied. At its default, `"all"`, an agent can read your meetings, transcripts and notes, and change them: create,
rename and fill folders, update private notes, generate a summary, send `give_feedback` to Granola's team on its own
(Granola's instructions tell it to), and export Markdown into the export folder. Nothing here deletes a meeting, but a
write changes what you keep, and an export writes a file outside the project. Restrict it in any of these three ways:

1. **The `access` option**, which drives the default rules the plugin inserts:

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Granola adds later | nothing |
   | `"ask-changes"` | the read tools | everything else, new tools and exports included |
   | `"read-only"` | the read tools | nothing: everything else is **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-granola#v0.0.0", "options": { "access": "read-only" } }] }
   ```

2. **An agent that asks, or reads only**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "assistant": { "permissions": [
     { "action": "granola_*", "resource": "*", "effect": "ask" },
     { "action": "granola_search_meetings", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names in
   [`src/known-tools.ts`](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/src/known-tools.ts). A later rule
   wins, and a `deny` on `*` also hides the tool from the model:

   ```json
   { "permissions": [
     { "action": "granola_give_feedback", "resource": "*", "effect": "deny" },
     { "action": "granola_create_folder", "resource": "*", "effect": "ask" }
   ] }
   ```

The plugin inserts this block directly after each agent's base "allow everything" rule, generated from
`defaultRules("all")` in `src/permissions.ts`:

```json
[
  { "action": "granola_*", "resource": "*", "effect": "allow" },
  { "action": "granola_get_account_info", "resource": "*", "effect": "allow" },
  { "action": "granola_list_meeting_folders", "resource": "*", "effect": "allow" },
  { "action": "granola_list_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_search_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meeting_transcript", "resource": "*", "effect": "allow" },
  { "action": "granola_query_granola_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meeting_attachment", "resource": "*", "effect": "allow" },
  { "action": "granola_list_templates", "resource": "*", "effect": "allow" },
  { "action": "granola_search_transcripts", "resource": "*", "effect": "allow" },
  { "action": "granola_events_list", "resource": "*", "effect": "allow" },
  { "action": "granola_create_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_update_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_add_note_to_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_remove_note_from_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_update_private_notes", "resource": "*", "effect": "allow" },
  { "action": "granola_generate_summary", "resource": "*", "effect": "allow" },
  { "action": "granola_give_feedback", "resource": "*", "effect": "allow" },
  { "action": "granola_export_markdown", "resource": "*", "effect": "allow" }
]
```

An export folder is outside the project, so OpenCode asks for `external_directory` as well as the export's own action;
[Markdown export](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md#permission) has that
rule.

Everything later than these rules still wins: an agent's own stricter rules (Explore cannot use Granola), your
`permissions` in `opencode.json`, and your saved answers. In `opencode run` and other runs where nobody can answer, a
call that would ask is refused; reads still work.

Agents defined only in your own config are created after plugins start, so they miss the default rules.
`/granola-status` names each such agent and gives the block to paste first in each listed agent's own `permissions`, in
`opencode.json` or the agent's Markdown file. An agent whose own rules already ask or deny for every Granola tool needs
nothing and is not named. Do not put the block in the top-level `permissions`, which would loosen Explore.

## Configure

Three options, all optional: `exportDirectory`, an absolute path for exports (default: `Granola` in your home folder);
`allowUntestedHost`; and `access`, which decides whether every tool runs, the changes ask, or only the reads run. The
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
      "package": "github:joe-broadhead/opencode-granola#v0.0.0",
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
exactly one `Next step`. Every error the plugin raises has a code and a next step:

| Code | When | What to do |
| --- | --- | --- |
| `NOT_REGISTERED` | The `granola` server is not registered yet. | Retry in a few seconds; if it persists, check that no organisation policy (`mcp.use`) or other plugin removes the `granola` server, then restart OpenCode. |
| `CONNECTING` | Granola is still connecting. | Retry in a few seconds. |
| `AUTH_REQUIRED` | Granola needs you to sign in. | Run `/connect` and choose Granola, then press `o` or Enter to open the sign-in page. In a terminal, `opencode mcp auth granola` opens it automatically. |
| `CONNECTION_FAILED` | The connection failed. | Reconnect Granola from `/mcps`, and if it keeps failing, run `/connect` and choose Granola to sign in again. |
| `DISABLED` | `granola` is disabled in OpenCode. | Enable `granola` in `/mcps`, or remove `"disabled": true` from `mcp.servers.granola` in your OpenCode config. |
| `TOOL_UNAVAILABLE` | Granola does not offer that tool for this account. | Your Granola plan may not include it; `/granola-status` lists the tools Granola offers you. |
| `HOST_UNTESTED` | OpenCode is outside `>=2.2.3 <2.3.0`. | Use OpenCode `>=2.2.3 <2.3.0`, or set `allowUntestedHost: true` to run anyway. |
| `OPTIONS_INVALID` | A plugin option has an unknown name or a wrong type. | The message names the option; fix the Granola plugin options in `opencode.json`. |
| `STATUS_UNAVAILABLE` | Status could not be read. | Run `/granola-status` again in a few seconds. |
| `SKILLS_INVALID` | A bundled skill file is missing or broken. | Reinstall the plugin. |
| `PACKAGE_INVALID` | The plugin's `package.json` is inconsistent. | Reinstall the plugin. |
| `EVENTS_INVALID_INPUT` | The events_list input is invalid: *problems*. | Pass only since, cursor, limit (1 to 500), account and source, as the tool's schema describes. |
| `EVENTS_CURSOR_INVALID` | The cursor was not issued by Granola's events_list for this account and its signed-in user. | Pass a cursor from a previous result of the same account, or start again with since. |
| `EVENTS_ACCOUNT_UNKNOWN` | Granola has one account, default. | Leave account out, or pass "default". |
| `EVENTS_SOURCE_UNKNOWN` | This plugin lists one source, granola. | Leave source out, or pass "granola". |
| `EVENTS_OWNER_UNKNOWN` | Granola did not name the signed-in account's email. | Run /granola-status, and sign in to Granola again if it shows a problem. |
| `EVENTS_READ_FAILED` | Granola's *tool* failed: *reason*. | Call events_list again with the same cursor; if it keeps failing, run /granola-status. |
| `EXPORT_INVALID_INPUT` | The export request is malformed. | Pass `meeting_ids` (1 to 20) and `content` (`notes`, `transcript` or `both`), and only `path` and `overwrite` besides. |
| `EXPORT_INVALID_PATH` | The export path is not allowed. | Use a relative path inside the export folder, without `..`, a leading `/` or links. |
| `EXPORT_EXISTS` | The file already exists. | Choose another path, or export again with `overwrite: true` after asking. |
| `EXPORT_TOO_LARGE` | The export is over its 8 MB limit. | Export fewer meetings at a time. |
| `EXPORT_READ_FAILED` | Granola could not return a meeting's notes or transcript. | Export again without that meeting. |
| `EXPORT_WRITE_FAILED` | The file could not be written. | Check that the export folder `/granola-status` shows is writable and has free space, then export again. |
| `EXPORT_PATH_NOT_PERMITTED` | OpenCode asks for `external_directory` before anything outside the project is written, and the export folder is outside it. | Allow it with `{ "action": "external_directory", "resource": "<the export folder>/*", "effect": "allow" }`, or set `exportDirectory` inside the project. |

A status of `conflict` has no code: your config defines `mcp.servers.granola` for a different server, and the plugin
never overwrites it. An entry for Granola's official URL is used as it is.

**`MCP server not found: granola` from `opencode mcp auth granola`, right after OpenCode starts.** Plugins are still
loading for a few seconds. Run it again, or use `/connect`, which updates live.

**Older meetings are missing.** On Granola's free plan, Granola's server returns only the meetings of the last 30 days.

**A tool says your Granola plan does not include it, or `TOOL_UNAVAILABLE`.** Granola's free plan has no
transcripts or folders.

**`HOST_UNTESTED`.** The plugin does not start on an OpenCode version outside `>=2.2.3 <2.3.0`, including
development builds. Use OpenCode `>=2.2.3 <2.3.0`, or set the plugin option `allowUntestedHost: true` to run anyway;
the `OpenCode` row then says `host untested`, and when nothing else is needed the next step says to use a tested
release if Granola misbehaves. A release inside the range other than 2.2.3, 2.2.4, 2.2.5 and 2.2.6 runs normally: only the
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
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-granola#v0.0.0`, then `opencode reload`.
   `opencode mcp list` no longer lists `granola`.
4. Remove any Granola rules you copied into your agents' own `permissions`.

Files you exported stay in your export folder.

## Known limits

- **Granola's server decides what the tools reach.** The plugin registers the tools Granola's server lists. A tool Granola adds later is not classed by the plugin: the `access` option decides whether it runs, asks or is denied, and `/granola-status` counts it as unknown.
- **Plan limits.** Granola's free plan has no transcripts or folders, and its meeting history covers the last 30 days. Exports say what is missing rather than working around it.
- **Exports are bounded.** An export takes 1 to 20 meetings and at most 8 MB; a transcript that does not fit is cut with a note. The file goes outside the project, so OpenCode also asks for `external_directory`.
- **`give_feedback` reaches Granola's team.** It is allowed by default, and the skill tells the model to send it only when the user asks.
- **No retries.** The plugin does not retry a failed call. The error names the next step.
- **Hosts and platforms.** The plugin is tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6, and runs on macOS or Linux. A later 2.2 release starts and is reported as untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/scripting.md)
- [Contributing](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/CHANGELOG.md)
- [License](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/LICENSE)
- [Issues](https://github.com/joe-broadhead/opencode-granola/issues)
