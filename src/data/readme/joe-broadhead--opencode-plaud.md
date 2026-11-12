# Plaud for OpenCode

Use your Plaud voice recordings in OpenCode: list and search them, read their transcripts and notes, and save audio, transcripts or notes as local files.

Unofficial; not affiliated with Plaud.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Another release inside that range starts, and `/plaud-status` calls it untested. Outside the range the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- A Plaud account. Plaud's hosted MCP server, `https://mcp.plaud.ai/mcp`, is in the US; accounts in other regions are untested. If Plaud gives you another address, set it with the [`url`](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#options) option.

The plugin is plain JavaScript. It bundles no Node runtime or Plaud software, downloads nothing to install or start, and starts no process: OpenCode itself connects to Plaud's server.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-plaud#v0.0.0
```

Run `opencode reload`, or restart OpenCode. Then run `/plaud-status`: it shows `sign-in required` until you sign in.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-plaud#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-plaud#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-plaud#v0.0.0" }] }
```

## Sign in

Run `/connect` and choose **Plaud**. Press `o` or Enter to open Plaud's sign-in page in your browser, then approve. `/mcps` offers the same sign-in.

On the command line, this opens the browser itself:

```sh
opencode mcp auth plaud
```

OpenCode stores and refreshes the token; the plugin never sees it. If the account needs a new sign-in later, `/connect` marks it **Sign in required**. To sign out, run `opencode mcp logout plaud`.

Run `/plaud-status` to check each account.

## Use

Ask about your recordings, for example "what did I record this week?" or "save the transcript of yesterday's standup". The model uses the skills to pick a tool.

| Tool | Code Mode | What it does | Permission |
| --- | --- | --- | --- |
| `plaud_list_files` | `tools.plaud.list_files` | List or search recordings | runs |
| `plaud_get_note` | `tools.plaud.get_note` | The recording's notes, such as its summary | runs |
| `plaud_get_transcript` | `tools.plaud.get_transcript` | One transcript block, a page at a time | runs |
| `plaud_get_file` | `tools.plaud.get_file` | One recording in full: 150 to 320 KB, mostly the raw transcript and the notes again. The skill and Code Mode's description steer the model away from it, to the notes, the transcript, or `plaud_export` for audio | runs |
| `plaud_get_current_user` | `tools.plaud.get_current_user` | The signed-in account | runs |
| `plaud_recent` | `tools.plaud.recent` | The newest recordings, one line each: title, start time and length | runs |
| `plaud_events_list` | `tools.plaud.events_list` | For Memory's collector and scripts: one account's recordings since a cursor, as normalised events, oldest first | runs |
| `plaud_export` | `tools.plaud.export` | Save audio, a transcript or a note as a file | runs, unless `access` asks |

Plaud maintains the read tools and their arguments. Plaud has no write API: nothing here can create, rename, delete, upload, share or send a recording. Any other tool on a Plaud server runs too; set `access` to `"ask-changes"` or `"read-only"` to hold it back.

The skills are `opencode-plaud` (the tools and Plaud's data model), `opencode-plaud-export` (exports) and `opencode-plaud-digest` (a digest of several recordings, or a follow-up draft).

### Exports

With `access` at `"ask-changes"`, `plaud_export` asks each time, and shows the account, kind, recording and destination.

- Files go in your export folders only, `~/Plaud` by default. The default file is `<first folder>/<kind>/<recordingId>.<ext>`: `.md` for notes, and the audio's own extension. A transcript's default file names its block, `<first folder>/transcript/<recordingId>.<block>.md`, so each block of a recording has its own file.
- Missing folders are created. Files are private (0600) and new folders too (0700).
- An existing file is replaced only when the model passes `overwrite: true`.
- The result is the file's path, size and SHA-256, never its content.
- A declined or failed export leaves nothing behind. While an export runs, its data is in a hidden `.plaud-export-*.partial` file beside the destination.

### Status views

- `/plaud-status` posts the status to the session: each account's state, access and export folders, the tools, agents without the default rules, the OpenCode check, and the next step. It starts no model turn.
- **Plaud: Status** in the command palette, or `/plaud` in the prompt, opens a dialog with the same lines. In the dialog, `r` refreshes and `Esc` closes.

### Privacy

- OpenCode connects to Plaud's server and sends it your tool calls. What the model reads, such as transcripts and notes, goes to your model provider like any other tool result.
- Plaud's results carry signed links: `presigned_url` to a recording's audio, and `data_link` to each transcript and note. Anyone who has one can download what it points to until it expires. The plugin replaces every one in every Plaud tool result with a notice that points to `plaud_export`, always. `plaud_export` reads the results itself, fetches the audio link plugin-side, and never returns or logs a link.
- The plugin's only own network request is an export's audio download, from the signed link Plaud returns straight to your export folder.
- The plugin stores nothing and collects no telemetry.
- Recordings are untrusted data. Plaud's server returns each result inside untrusted-data tags (`<untrusted-user-data-…>`), and the model sees the tags. A transcript can contain text that tries to steer the model; the skills tell it to treat such text as content, never as instructions. Exports take the content out of the tags and write only the content.

See [SECURITY.md](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/SECURITY.md) for saved approvals and other risks.

### Scripts

A script or a cron job can call Plaud's five read tools, `plaud_recent` and `plaud_events_list` with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own. Every tool is allowed by default, so a script runs a read, `recent` or `events_list` unless you restrict the plugin: an `ask` is refused when nobody can answer it, and a saved "Always allow" is not enough. Add `"account": "<alias>"` to read another account. Exports and every other Plaud tool are never available to scripts, and a script never gets a signed link:

```sh
opencode api post /api/rpc/plaud.recordings.tools/list_files -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"page_size":10}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** An agent can read your recordings and their notes and transcripts, list the newest ones, save audio, a transcript or a note to a file, and run any tool Plaud adds later, without asking. Restrict it in any of these three ways:

1. **The `access` option**, which drives the rules the plugin inserts directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone, and a later rule still wins.

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Plaud adds later | nothing |
   | `"ask-changes"` | the reads, `plaud_recent` and any tool Plaud adds later | `plaud_export`, which writes a file |
   | `"read-only"` | the reads and `plaud_recent` | nothing: exports and new tools are **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-plaud#v0.0.0", "options": { "access": "read-only" } }] }
   ```

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "plaud*_*", "resource": "*", "effect": "deny" },
     { "action": "plaud_list_files", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names in [docs/configuration.md](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#permissions). To make the export ask, or stop it:

   ```json
   { "permissions": [
     { "action": "plaud_export", "resource": "work:audio", "effect": "deny" },
     { "action": "plaud_export", "resource": "*", "effect": "ask" }
   ] }
   ```

The block for each value, for the default account's `plaud` server, generated from `defaultRules(servers, access)` in `src/host/permissions.ts`. Each account in `accounts` adds its own five reads before the export, and `/plaud-status` shows the block for your accounts:

<!-- generated:rules-all -->

`access: "all"`

| Action | Resource | Effect |
| --- | --- | --- |
| `plaud*_*` | `*` | `allow` |
| `plaud_list_files` | `*` | `allow` |
| `plaud_get_file` | `*` | `allow` |
| `plaud_get_note` | `*` | `allow` |
| `plaud_get_transcript` | `*` | `allow` |
| `plaud_get_current_user` | `*` | `allow` |
| `plaud_export` | `*` | `allow` |
| `plaud_recent` | `*` | `allow` |
| `plaud_events_list` | `*` | `allow` |

<!-- /generated:rules-all -->

<!-- generated:rules-ask-changes -->

`access: "ask-changes"`

| Action | Resource | Effect |
| --- | --- | --- |
| `plaud*_*` | `*` | `ask` |
| `plaud_list_files` | `*` | `allow` |
| `plaud_get_file` | `*` | `allow` |
| `plaud_get_note` | `*` | `allow` |
| `plaud_get_transcript` | `*` | `allow` |
| `plaud_get_current_user` | `*` | `allow` |
| `plaud_export` | `*` | `ask` |
| `plaud_recent` | `*` | `allow` |
| `plaud_events_list` | `*` | `allow` |

<!-- /generated:rules-ask-changes -->

<!-- generated:rules-read-only -->

`access: "read-only"`

| Action | Resource | Effect |
| --- | --- | --- |
| `plaud*_*` | `*` | `deny` |
| `plaud_list_files` | `*` | `allow` |
| `plaud_get_file` | `*` | `allow` |
| `plaud_get_note` | `*` | `allow` |
| `plaud_get_transcript` | `*` | `allow` |
| `plaud_get_current_user` | `*` | `allow` |
| `plaud_export` | `*` | `deny` |
| `plaud_recent` | `*` | `allow` |
| `plaud_events_list` | `*` | `allow` |

<!-- /generated:rules-read-only -->

"Always allow" on an export remembers only that account and kind, such as `default:transcript`. Your own `permissions` rules win over the defaults.

An export writes into an export folder, which is outside the project, so OpenCode also checks `external_directory` for it, as well as the export's own action. A rule for `plaud_export` alone does not cover an unattended run:

```json
{ "permissions": [{ "action": "external_directory", "resource": "<the export folder>/*", "effect": "allow" }] }
```

`opencode run` and other runs where nobody can answer refuse an export unless a rule allows it. See [Permissions](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#permissions).

## Configure

Every option is optional. To add a second Plaud account, give it an alias in `accounts`. This example adds the account `work` and a second export folder:

```json
{
  "plugins": [
    {
      "package": "github:joe-broadhead/opencode-plaud#v0.0.0",
      "options": { "accounts": ["work"], "exportRoots": ["~/Plaud", "~/Documents/Meetings"] }
    }
  ]
}
```

The account `work` gets its own server, `plaud-work`, listed in `/connect` as **Plaud (work)**. Sign in to it the same way: run `/connect`, choose **Plaud (work)** and press `o` or Enter, or run `opencode mcp auth plaud-work`. Its read tools are `plaud-work_list_files` and so on; for an export, the model passes `account: "work"`.

The options, the default permission rules and how to change them are in [docs/configuration.md](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md).

## Organisation rollout

OpenCode registers itself with Plaud's server automatically, so there is no client ID to distribute. Put the plugin entry, and any options or rules you want for everyone, in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or `/etc/opencode/opencode.json` on Linux. This example sets a shared export folder and blocks audio exports:

```json
{
  "plugins": [{ "package": "github:joe-broadhead/opencode-plaud#v0.0.0", "options": { "exportRoots": ["~/Documents/Plaud"] } }],
  "permissions": [{ "action": "plaud_export", "resource": "*:audio", "effect": "deny" }]
}
```

Members then only sign in, once per account: run `/connect` and choose **Plaud**.

## Troubleshooting

`/plaud-status` and the status dialog say, for each account:

| State | Do this |
| --- | --- |
| connected | Nothing. |
| sign-in required | Run `/connect` and choose **Plaud** (or **Plaud (<alias>)**), then press `o` or Enter to open the sign-in page. |
| connecting | Wait a few seconds, then check again. |
| failed | Check your network, then reconnect in `/mcps`. If it keeps failing, run `opencode mcp logout <server>`, then sign in again from `/connect`. |
| disabled | Enable the server in `/mcps`. |
| not configured | Check again in a few seconds; if it stays, open `/plugins` and check `plaud.recordings`. |

<!-- generated:codes -->

| Code | What happened | Next step |
| --- | --- | --- |
| `ACCOUNT_UNKNOWN` | The tools RPC refused the call. | Leave "account" out for the default account, or pass "default" or an alias from the plugin's accounts option, as /plaud-status lists them. |
| `AUTH_REQUIRED` | The account's Plaud server is not connected or not signed in. | Run /connect and choose Plaud, or Plaud (<alias>) for another account, then press o or Enter to open the sign-in page. |
| `CANCELLED` | The tools RPC refused the call. | Call the method again if you still need the result. |
| `CONNECTING` | The tools RPC refused the call. | Wait a few seconds while OpenCode connects to the account's server, then call the method again. |
| `CONNECTION_FAILED` | The tools RPC refused the call. | Run /plaud-status and follow its next step. |
| `CONTENT_UNAVAILABLE` | Plaud has no audio, or no such transcript block, for that recording. | Export another transcript block, or the note. |
| `DISABLED` | The tools RPC refused the call. | Enable the account's server, plaud or plaud-<alias>, in /mcps. |
| `EVENTS_CURSOR_INVALID` | The cursor was not issued by `events_list` for this account and its signed-in user. | Pass a cursor from a previous result of the same account, or start again with `since`. |
| `EVENTS_OWNER_UNKNOWN` | Plaud's `get_current_user` named no email or id for the account. | Run /plaud-status, and sign in to this account again if it shows a problem. |
| `EXPORT_BAD_DESTINATION` | The destination is not a file path the plugin can write. | Pass a plain file path, without a trailing slash, and without `~`, which is not expanded. |
| `EXPORT_EXISTS` | The destination file exists and overwrite was not set. | Ask the user before passing overwrite: true, or choose another path. |
| `EXPORT_FAILED` | Writing the file failed. | Check the folder is writable and there is space, then retry. |
| `EXPORT_OUTSIDE_ROOTS` | The destination is outside the export folders the plugin may write in. | Write inside a root the plugin lists, or ask the user to add the folder to exportRoots. |
| `EXPORT_PATH_NOT_PERMITTED` | OpenCode checks the external_directory permission before anything outside the project is written, and the export folder is outside it. A rule refused it, or the person rejected the prompt. | Allow it with { "action": "external_directory", "resource": "<the export folder>/*", "effect": "allow" } in your permissions, or set exportRoots inside the project. |
| `EXPORT_TIMEOUT` | The export did not finish inside exportTimeoutMs. | Ask the user to raise exportTimeoutMs, then retry. |
| `EXPORT_TOO_LARGE` | The exported text is over the 25 MiB cap. | Export one transcript block or the note instead of everything. |
| `INPUT_INVALID` | A call's input is not the method's schema, such as `account` in a plugin tool's input. | Call describe for the schema, then pass the fields it names; the account is the envelope's. |
| `NOT_REGISTERED` | The tools RPC refused the call. | Run /plaud-status and follow its next step. |
| `PERMISSION_DENIED` | The tools RPC refused the call. | Add an allow rule for the tool to the session's agent or to the session, or use a session whose agent allows it. |
| `PLAUD_READ_FAILED` | A read the plugin's own tool made failed, such as a list or a transcript page. | Retry once; if it fails again, ask the user to run /plaud-status and follow its next step. |
| `PLAUD_UNREADABLE` | Plaud returned something this release cannot use, such as a page that never ends or a link that is not a URL. | Update opencode-plaud and retry later; if it still fails, report it to the plugin's maintainers. |
| `SESSION_AGENT_REQUIRED` | The tools RPC refused the call. | Create a session that names an agent this project has, with its project as the location, such as POST /api/session with {"agent":"build","location":{"directory":"/path/to/project"}}, and pass its id. |
| `SESSION_UNKNOWN` | The tools RPC refused the call. | Create a session in the location you mean, such as POST /api/session with {"agent":"build"} sent with the header "x-opencode-directory: <dir>" or the location[directory] query, and pass its id. |
| `TOOL_UNAVAILABLE` | The tools RPC refused the call. | Call describe to see which methods OpenCode lists now, and run /plaud-status. |
| `UPSTREAM_ERROR` | The tools RPC refused the call. | Check the input against the method's schema from describe, and run /plaud-status if it keeps failing. |

<!-- /generated:codes -->

Errors from the plugin read `CODE: what happened. Next step: What to do.` Every code is listed in [Errors](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#errors). A script that uses the tools RPC has its own codes, listed in [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `plaud` and `plaud-<alias>` servers, so it cannot remove their sign-ins, and `opencode auth list` stops showing them.

1. Sign out of each account: `opencode mcp logout plaud`, and `opencode mcp logout plaud-<alias>` for each account in `accounts`. If one answers `MCP server not found` while the plugin is still installed, OpenCode is still loading the plugin for that folder: wait a few seconds and run it again.
2. Check: `opencode auth list` lists no **Plaud** entry.
3. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-plaud#v0.0.0`, then `opencode reload`.
4. Your exports stay in your export roots (`~/Plaud` by default); delete them if you no longer want them. The plugin keeps no other data.
5. Remove any Plaud rules you copied into your agents' own `permissions`.

## Known limits

- **Platforms.** macOS and Linux only. Windows is not tested.
- **Region.** Plaud's server is in the US. Accounts in other regions are untested; set `url` if Plaud gives you another address.
- **Read-only against Plaud.** Plaud has no write API, so nothing here creates, renames, deletes, uploads, shares or sends a recording.
- **New Plaud tools.** A tool Plaud adds later follows `access`, so it runs at the default `"all"`. It is not a script method until a plugin release.
- **Signed links.** Tool results never show a signed link. Audio and transcripts reach a file only through `plaud_export`.
- **Unattended exports.** An export folder is outside the project, so an unattended run needs the `external_directory` rule as well as `plaud_export` (see [Permissions](#permissions)).
- **Tested hosts.** Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6. A later 2.2 release starts, and `/plaud-status` marks it untested.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md)
- [Contributing](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/LICENSE) and the [notice](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/NOTICE) for bundled third-party code. Plaud is a trademark of its owner, used here only to name the service the plugin connects to.
