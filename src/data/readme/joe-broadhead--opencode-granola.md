# Granola for OpenCode

Ask OpenCode about your Granola meetings, read their notes and transcripts, and save them as Markdown, through
Granola's official MCP server.

Unofficial; not affiliated with Granola.

Granola is a trademark of Granola, Inc.; this unofficial plugin is not endorsed by them.

## Requirements

- OpenCode `>=2.2.3 <2.4.0`, tested on 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 and 2.3.2. Another release inside that range runs, and status
  calls it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`; see
  [Troubleshooting](#troubleshooting).
- macOS or Linux.
- A Granola account. Granola's free plan includes the last 30 days of meeting history; transcripts and folders are
  paid features.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-granola#v0.0.10
```

This adds the plugin to your global OpenCode config. Run `opencode reload`, or restart OpenCode. Then run
`/granola-status`: it shows `sign-in required` until you sign in.

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-granola#v0.0.10" }] }
```

### Update

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-granola#v0.0.2`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-granola#v<version>`.

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

The plugin adds one export tool, `export_markdown` (`granola_export_markdown`). It saves the notes, transcripts or both of 1
to 20 meetings to one Markdown file in your export folder, without passing the text through the conversation. At the
default `access: "all"` the `granola_export_markdown` action is allowed; `"ask-changes"` makes it ask, and `"read-only"`
denies it. A destination outside the project may also prompt for OpenCode's separate `external_directory` permission;
that is a path check, not an extra tool-action allow. Its inputs are `meeting_ids`, `content` (`notes`, `transcript` or
`both`), an optional `path` inside the export folder, and `overwrite`. When your plan has no transcripts, the file holds
the notes and says that transcripts are not available on your Granola plan.

It also declares sources under the source contract (`package.json`'s `sources`). `granola.meetings` is for Memory's
collector and other scripts, not for answering questions: `events_list` (`granola_events_list`) lists the meetings you
took part in since a cursor, as normalised events with their summaries, oldest first, for the account it names (the
source's accounts are named: the signed-in email), and the tools RPC method `probe` names who is signed in, which is
how a consumer learns that email. `granola.meetings.list` is the same `search_meetings` read, verified through `get_meetings`, as the contract's `list` output, so an app can render it without knowing Granola. `granola.meetings` is not renamed. Both only read, and never ask. See [Events list](https://github.com/joe-broadhead/opencode-granola/blob/HEAD/docs/configuration.md#events-list).

To see the connection, the workspace, the tools and the next step:

- `/granola-status` posts the status in the session.
- In the terminal UI, the command palette entry **Granola: Status**, or `/granola`, opens the same status in a dialog.
  Press `r` to refresh and `Esc` to close.

The workspace name comes from the most recent Granola account read since OpenCode started, and is kept in memory
only. Until then, status says the workspace is unknown; ask the agent to check your Granola account.

### Scripts

A script or a cron job can call Granola's tools with no model, through `opencode api`. It runs as a session and its
agent, under that agent's permission rules and the session's own. Every known tool is a method. A call runs only when
the resolved rule is `allow`: at the default `access: "all"` the plugin's block allows every method, so a script needs
no extra tool-action rule to read, write, send or export. An unattended export outside the project still needs
`external_directory` to resolve to `allow`. At `"ask-changes"` a write, send or export resolves to `ask`, and a script
refuses an ask because no one can answer it, so that method needs a prior explicit `allow`. At `"read-only"` those
methods are denied. `sign_out` is not a method: the plugin removes it, and `opencode mcp logout granola` revokes the
grant.

```sh
opencode api post /api/rpc/granola.meetings.tools/search_meetings \
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
   { "plugins": [{ "package": "github:joe-broadhead/opencode-granola#v0.0.10", "options": { "access": "read-only" } }] }
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
     { "action": "granola_create_meeting_note_from_transcript", "resource": "*", "effect": "deny" },
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
  { "action": "granola_search_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meeting_transcript", "resource": "*", "effect": "allow" },
  { "action": "granola_query_granola_meetings", "resource": "*", "effect": "allow" },
  { "action": "granola_get_meeting_attachment", "resource": "*", "effect": "allow" },
  { "action": "granola_list_templates", "resource": "*", "effect": "allow" },
  { "action": "granola_search_transcripts", "resource": "*", "effect": "allow" },
  { "action": "granola_get_agent_brief", "resource": "*", "effect": "allow" },
  { "action": "granola_events_list", "resource": "*", "effect": "allow" },
  { "action": "granola_probe", "resource": "*", "effect": "allow" },
  { "action": "granola_create_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_update_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_update_meeting_title", "resource": "*", "effect": "allow" },
  { "action": "granola_add_note_to_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_remove_note_from_folder", "resource": "*", "effect": "allow" },
  { "action": "granola_update_private_notes", "resource": "*", "effect": "allow" },
  { "action": "granola_update_summary", "resource": "*", "effect": "allow" },
  { "action": "granola_generate_summary", "resource": "*", "effect": "allow" },
  { "action": "granola_give_feedback", "resource": "*", "effect": "allow" },
  { "action": "granola_create_meeting_note_from_transcript", "resource": "*", "effect": "allow" },
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
      "package": "github:joe-broadhead/opencode-granola#v0.0.10",
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
| `HOST_UNTESTED` | OpenCode is outside `>=2.2.3 <2.4.0`. | Use OpenCode `>=2.2.3 <2.4.0`, or set `allowUntestedHost: true` to run anyway. |
| `OPTIONS_INVALID` | A plugin option has an unknown name or a wrong type. | The message names the option; fix the Granola plugin options in `opencode.json`. |
| `STATUS_UNAVAILABLE` | Status could not be read. | Run `/granola-status` again in a few seconds. |
| `SKILLS_INVALID` | A bundled skill file is missing or broken. | Reinstall the plugin. |
| `PACKAGE_INVALID` | The plugin's `package.json` is inconsistent. | Reinstall the plugin. |
| `INPUT_INVALID` | The events_list (or probe) input is invalid: *problems*; or a listing names no account. | Pass account, the signed-in Granola email that probe answers, and only since, cursor, limit (1 to 500) and source besides. |
| `CURSOR_INVALID` | The cursor was not issued by Granola's events_list for this account. | Pass a cursor from a previous result for the same account, or start again with since. |
| `ACCOUNT_MISMATCH` | The cursor is for another Granola account, or Granola is signed in to another account than the one named. | Pass the cursor with its own account, or sign in to Granola as that account (/connect, Granola), or read as the account probe names. |
| `SOURCE_UNKNOWN` | This plugin lists one source, granola. | Leave source out, or pass "granola". |
| `UNAVAILABLE` | Granola's *tool* failed: *reason*; or Granola did not name the signed-in account's email. | Call events_list (or probe) again; if it keeps failing, run /granola-status. |
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

**`HOST_UNTESTED`.** The plugin does not start on an OpenCode version outside `>=2.2.3 <2.4.0`, including
development builds. Use OpenCode `>=2.2.3 <2.4.0`, or set the plugin option `allowUntestedHost: true` to run anyway;
the `OpenCode` row then says `host untested`, and when nothing else is needed the next step says to use a tested
release if Granola misbehaves. A release inside the range other than 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 and 2.3.2 runs normally: only the
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
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-granola#v0.0.10`, then `opencode reload`.
   `opencode mcp list` no longer lists `granola`.
4. Remove any Granola rules you copied into your agents' own `permissions`.

Files you exported stay in your export folder.

## Known limits

- **Granola's server decides what the tools reach.** The plugin registers the tools Granola's server lists. A tool Granola adds later is not classed by the plugin: the `access` option decides whether it runs, asks or is denied, and `/granola-status` counts it as unknown.
- **Plan limits.** Granola's free plan has no transcripts or folders, and its meeting history covers the last 30 days. Exports say what is missing rather than working around it.
- **Exports are bounded.** An export takes 1 to 20 meetings and at most 8 MB; a transcript that does not fit is cut with a note. The file goes outside the project, so OpenCode also asks for `external_directory`.
- **`give_feedback` reaches Granola's team.** It is allowed by default, and the skill tells the model to send it only when the user asks.
- **No retries.** The plugin does not retry a failed call. The error names the next step.
- **The meetings source sees what Granola's MCP sees.** Granola's MCP reads only the active workspace, and on the free (Basic) plan only notes from the last 30 days; its rate limits vary by plan and tool and average about 100 requests per minute across all tools ([Granola MCP](https://docs.granola.ai/help-center/sharing/integrations/mcp)). A listing reads `search_meetings` once per page of each week, and `get_meetings` once per 10 meetings. A cursor never expires, but the free plan's history does: `probe` records the plan `get_account_info` names, for a day, and on the free plan, or with no plan recorded in the last day, a listing whose cursor or `since` is more than 29 days old answers a `window-truncated` gap once and lists from there, so a consumer knows to resync; later pages of that read neither repeat the gap nor skip a meeting the plan still shows. A paid plan has no window and no gap. A move to the free plan within a day of `probe`, with a cursor more than 29 days behind, is still listed without a gap: re-probe after a plan change. The v0.0.3 and v0.0.4 sources listed only what the plan still showed, with no gap. Switching the active workspace changes what a listing reads under the same account.
- **The meetings source's test data is invented.** The conformance kit runs on a synthetic Granola whose answers follow the shapes Granola's live tools returned when last checked, and the note-access scopes as `get_account_info`'s own description gives them; their content is made up, modelled on the provider's docs, not live-verified. The synthetic account is on the free plan and the first listing starts before its 30 days, so the kit checks the `window-truncated` gap is answered once per read. Its report is complete and ok: every check that applies ran. It marks 14 checks not applicable for `granola.meetings` and 18 for `granola.meetings.list`; the two reasons the source states are for `failed-holds-cursor` (no meeting fails on its own; a failed read fails the whole listing) and `gap-and-cursor-expired` (no cursor is ever refused as expired; the source never answers `CURSOR_EXPIRED`, and the free plan's lost history is the window gap). The report gives no reason for the other checks that do not apply.
- **Hosts and platforms.** The plugin is tested on 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.3.0, 2.3.1 and 2.3.2, and runs on macOS or Linux. A later 2.2 or 2.3 release starts and is reported as untested.
- In Jelly, the `access` setting is drawn as a choice of three, which needs a Jelly that reads declared choices: an
  older Jelly refuses the plugin's whole declaration.
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
