# Plaud for OpenCode

Use your Plaud voice recordings in OpenCode: list and search them, read their transcripts and notes, and save audio, transcripts or notes as local files.

Unofficial; not affiliated with Plaud. Plaud is a trademark of PLAUD LLC; this unofficial plugin is not endorsed by them.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Outside the range the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md#options).
- macOS or Linux.
- A Plaud account. Plaud's hosted MCP server, `https://mcp.plaud.ai/mcp`, is in the US; accounts in other regions are untested. If Plaud gives you another address, set it with the [`url`](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md#options) option.

The plugin is plain JavaScript. It bundles no Node runtime or Plaud software, downloads nothing at start, and starts no process: OpenCode itself connects to Plaud's server.

## Install

Install from a release:

```sh
opencode plugin add github:we-the-rebel-alliance/plaud-plugin#v<version>
```

The old `v0.0.0`–`v0.0.9` tags predate the transfer and must not be installed. The first plugin-contract release will be `v0.0.0` in phase 4b, after the owner removes those tags. Run `opencode reload`, or restart OpenCode. Then run `/plaud-status`: it shows `sign-in required` until you sign in.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/plaud-plugin#v<version>" }] }
```

A Git install does not update by itself; add the tag of a later release to move to it.

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
| `plaud_events_list` | `tools.plaud.events_list` | For a collector and other consumers of the source contract, and scripts: one account's recordings since a cursor, as normalised events, oldest first | runs |
| `plaud_export` | `tools.plaud.export` | Save audio, a transcript or a note as a file | runs, unless `access` asks |

Plaud maintains the read tools and their arguments. Plaud has no write API: nothing here can create, rename, delete, upload, share or send a recording. Any other tool on a Plaud server runs too; set `access` to `"ask-changes"` or `"read-only"` to hold it back.

The skills are `opencode-plaud` (the tools and Plaud's data model), `opencode-plaud-export` (exports) and `opencode-plaud-digest` (a digest of several recordings, or a follow-up draft).

### Exports

With `access` at `"ask-changes"`, `plaud_export` asks each time, and shows the account, kind, recording and destination.

- Files go in your export folders only, `~/Plaud` by default. The default file is `<first folder>/<kind>/<recordingId>.<ext>`: `.md` for notes, and the audio's own extension. A transcript's default file names its block, `<first folder>/transcript/<recordingId>.<block>.md`.
- Missing folders are created. Files are private (0600) and new folders too (0700).
- An existing file is replaced only when the model passes `overwrite: true`.
- The result is the file's path, size and SHA-256, never its content.
- A declined or failed export leaves nothing behind. While an export runs, its data is in a hidden `.plaud-export-*.partial` file beside the destination.

### Status views

- `/plaud-status` posts the status to the session: each account's state, access and export folders, the tools, agents without the default rules, the OpenCode check, and the next step. It starts no model turn.
- **Plaud: Status** in the command palette, or `/plaud` in the prompt, opens a dialog with the same lines. In the dialog, `r` refreshes and `Esc` closes.

### Privacy

- OpenCode connects to Plaud's server and sends it your tool calls. What the model reads, such as transcripts and notes, goes to your model provider like any other tool result.
- Plaud's own read results carry signed links: `presigned_url` to a recording's audio, and `data_link` to each transcript and note. They are credentials, so treat them as sensitive and prefer `plaud_export` for audio. The plugin's own tools (`plaud_recent`, `plaud_events_list`, `plaud_export`) never return a signed link; `plaud_export` reads Plaud's link itself, fetches the audio plugin-side, and never returns or logs a link. The tools RPC for scripts withholds every link.
- The plugin's only own network request is an export's audio download, from the signed link Plaud returns straight to your export folder.
- The plugin stores nothing and collects no telemetry.
- Recordings are untrusted data. Plaud's server returns each result inside untrusted-data tags, and the model sees the tags. The skills tell it to treat such text as content, never as instructions.

See [SECURITY.md](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/SECURITY.md) for saved approvals and other risks.

### Scripts

A script or an OpenCode automation can call Plaud's five read tools, `plaud_recent` and `plaud_events_list` with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own. Every tool is allowed by default, so a script runs a read, `recent` or `events_list` unless you restrict the plugin: an `ask` is refused when nobody can answer it, and a saved "Always allow" is not enough. Add `"account": "<alias>"` to read another account. A consumer of the source contract, such as a collector, reads the declared source `plaud.recordings` through `events_list` and the method `probe` ([Events list](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md#events-list)). Exports and every other Plaud tool are never available to scripts, and a script never gets a signed link:

```sh
opencode api post /api/rpc/plaud.recordings.tools/list_files -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"page_size":10}}}'
```

See [Scripting](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/scripting.md).

## Permissions

**Every tool is allowed by default.** An agent can read your recordings and their notes and transcripts, list the newest ones, save audio, a transcript or a note to a file, and run any tool Plaud adds later, without asking. Restrict it in any of these three ways:

1. **The `access` option**, which drives the rules the plugin inserts directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone, and a later rule still wins.

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, and any tool Plaud adds later | nothing |
   | `"ask-changes"` | the reads and `plaud_recent` | `plaud_export`, which writes a file, and any tool Plaud adds later |
   | `"read-only"` | the reads and `plaud_recent` | nothing: exports and new tools are **denied** |

   ```json
   { "plugins": [{ "package": "github:we-the-rebel-alliance/plaud-plugin#v<version>", "options": { "access": "read-only" } }] }
   ```

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "plaud*_*", "resource": "*", "effect": "deny" },
     { "action": "plaud_list_files", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per tool**, with the exact names in [docs/configuration.md](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md#permissions). To make the export ask, or stop it:

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
| `plaud_probe` | `*` | `allow` |

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
| `plaud_probe` | `*` | `allow` |

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
| `plaud_probe` | `*` | `allow` |

<!-- /generated:rules-read-only -->

"Always allow" on an export remembers only that account and kind, such as `default:transcript`. Your own `permissions` rules win over the defaults.

When an export folder is outside the project, the plugin evaluates the agent's and session's `external_directory` rules itself and fails closed: only an explicit allow writes, an `ask` is a refusal, and no prompt is shown. This applies interactively, in `opencode run` and in automations; saved approvals are not consulted for `external_directory`, so an explicit allow rule is required. A rule for `plaud_export` alone does not cover it:

```json
{ "permissions": [{ "action": "external_directory", "resource": "<the export folder>/*", "effect": "allow" }] }
```

`opencode run` and other runs where nobody can answer never prompt for `external_directory`: an export outside the project needs an explicit allow rule. See [Permissions](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md#permissions).

## Accounts

`accounts` adds another Plaud account under an alias. Each account has its own server, `plaud-<alias>`, and signs in on its own:

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/plaud-plugin#v<version>", "options": { "accounts": ["work"] } }] }
```

Sign in to `plaud-work` from `/connect` as **Plaud (work)**, or run `opencode mcp auth plaud-work`. Pass `"account": "work"` to a tool to use it.

## Options

The options are `accounts`, `url`, `exportRoots`, `maxAudioBytes`, `exportTimeoutMs`, `allowUntestedHost` and `access`. The [configuration guide](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md) lists their defaults and bounds.

To move an export to another folder:

```json
{
  "plugins": [{ "package": "github:we-the-rebel-alliance/plaud-plugin#v<version>", "options": { "exportRoots": ["~/Documents/Plaud"] } }]
}
```

## Errors

Errors from the plugin read `CODE: what happened. Next step: What to do.` Every code is in the table below; a script that uses the tools RPC has its own codes, listed in [Scripting](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/scripting.md#errors).

<!-- generated:codes -->

| Code | What happened | Next step |
| --- | --- | --- |
| `ACCOUNT_MISMATCH` | The recordings source was asked about an account the plugin does not have, or given another account's cursor. | Pass the account the cursor was issued for, or an account /plaud-status lists. |
| `ACCOUNT_UNKNOWN` | The tools RPC refused the call. | Leave "account" out for the default account, or pass "default" or an alias from the plugin's accounts option, as /plaud-status lists them. |
| `AUTH_REQUIRED` | The account's Plaud server is not connected or not signed in. | Run /connect and choose Plaud, or Plaud (<alias>) for another account, then press o or Enter to open the sign-in page. |
| `CANCELLED` | The tools RPC refused the call. | Call the method again if you still need the result. |
| `CONNECTING` | The tools RPC refused the call. | Wait a few seconds while OpenCode connects to the account's server, then call the method again. |
| `CONNECTION_FAILED` | The tools RPC refused the call. | Run /plaud-status and follow its next step. |
| `CONTENT_UNAVAILABLE` | Plaud has no audio, or no such transcript block, for that recording. | Export another transcript block, or the note. |
| `CURSOR_INVALID` | The cursor was not issued by `events_list` for the recordings of this account, or the account is signed in as another user since. | Start again: call `events_list` for the account with `since`, without a cursor. |
| `DISABLED` | The tools RPC refused the call. | Enable the account's server, plaud or plaud-<alias>, in /mcps. |
| `EVENTS_OWNER_UNKNOWN` | Plaud's `get_current_user` named no email or id for the account. | Run /plaud-status, and sign in to this account again if it shows a problem. |
| `EXPORT_BAD_DESTINATION` | The destination is not a file path the plugin can write. | Pass a plain file path, without a trailing slash, and without `~`, which is not expanded. |
| `EXPORT_EXISTS` | The destination file exists and overwrite was not set. | Ask the user before passing overwrite: true, or choose another path. |
| `EXPORT_FAILED` | Writing the file failed. | Check the folder is writable and there is space, then retry. |
| `EXPORT_OUTSIDE_ROOTS` | The destination is outside the export folders the plugin may write in. | Write inside a root the plugin lists, or ask the user to add the folder to exportRoots. |
| `EXPORT_PATH_NOT_PERMITTED` | The export folder is outside the project, and the external_directory rules do not allow it. An ask is a refusal. | Add { "action": "external_directory", "resource": "<the export folder>/*", "effect": "allow" } to the agent or session rules, or set exportRoots inside the project. |
| `EXPORT_TIMEOUT` | The export did not finish inside exportTimeoutMs. | Ask the user to raise exportTimeoutMs, then retry. |
| `EXPORT_TOO_LARGE` | The exported text is over the 25 MiB cap. | Export one transcript block or the note instead of everything. |
| `INPUT_INVALID` | A call's input is not the method's schema, such as `account` in a plugin tool's input. | Call describe for the schema, then pass the fields it names; the account is the envelope's. |
| `NOT_REGISTERED` | The tools RPC refused the call. | Run /plaud-status and follow its next step. |
| `PERMISSION_DENIED` | The tools RPC refused the call. | Add an allow rule for the tool to the session's agent or to the session, or use a session whose agent allows it. |
| `PLAUD_READ_FAILED` | A read the plugin's own tool made failed, such as a list or a transcript page. | Retry once; if it fails again, ask the user to run /plaud-status and follow its next step. |
| `PLAUD_UNREADABLE` | Plaud returned something this release cannot use, such as a page that never ends or a link that is not a URL. | Update opencode-plaud and retry later; if it still fails, report it to the plugin's maintainers. |
| `SESSION_AGENT_REQUIRED` | The tools RPC refused the call. | Create a session that names an agent this project has, with its project as the location, such as POST /api/session with {"agent":"build","location":{"directory":"/path/to/project"}}, and pass its id. |
| `SESSION_UNKNOWN` | The tools RPC refused the call. | Create a session in the location you mean, such as POST /api/session with {"agent":"build"} sent with the header "x-opencode-directory: <dir>" or the location[directory] query, and pass its id. |
| `SOURCE_UNKNOWN` | `events_list` or `probe` was asked for a source this plugin does not have. | Pass source `recordings`, or leave it out. |
| `TOOL_UNAVAILABLE` | The tools RPC refused the call. | Call describe to see which methods OpenCode lists now, and run /plaud-status. |
| `UNAVAILABLE` | A listing of the recordings source came before any probe named the account's owner since OpenCode started. | Call `probe` for the account, then list again. |
| `UPSTREAM_ERROR` | The tools RPC refused the call. | Check the input against the method's schema from describe, and run /plaud-status if it keeps failing. |
| `WORKSPACE_UNSUPPORTED` | The export runs in a workspace session, whose files are on the workspace machine, not this one. | Run the export in a session whose location is on this machine. |

<!-- /generated:codes -->

## Troubleshooting

- `/plaud-status` shows each account's state, the access value, the tools OpenCode lists, and the next step. Run it first.
- If a Plaud tool is missing, run `/connect` and choose Plaud (or Plaud (<alias>)) to sign in again.
- If an export is refused with `EXPORT_PATH_NOT_PERMITTED`, allow the `external_directory` rule above, or move the export folder inside the project.
- To start over with one account, run `opencode mcp logout plaud`, then `/connect` and choose Plaud.

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `plaud` and `plaud-<alias>` servers, so it cannot remove their sign-ins, and `opencode auth list` stops showing them.

1. Sign out of each account: `opencode mcp logout plaud`, and `opencode mcp logout plaud-<alias>` for each account in `accounts`. If one answers `MCP server not found` while the plugin is still installed, OpenCode is still loading the plugin for that folder: wait a few seconds and run it again.
2. Check: `opencode auth list` lists no **Plaud** entry.
3. Remove the plugin: `opencode plugin remove github:we-the-rebel-alliance/plaud-plugin#v<version>`, then `opencode reload`.
4. Your exports stay in your export roots (`~/Plaud` by default); delete them if you no longer want them. The plugin keeps no other data.
5. Remove any Plaud rules you copied into your agents' own `permissions`.

## Docs

- [Configuration](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/configuration.md)
- [Architecture](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/architecture.md)
- [Scripting](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/docs/scripting.md)
- [Contributing](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/CONTRIBUTING.md)
- [Security](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/SECURITY.md)
- [Changelog](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/CHANGELOG.md)
- [MIT license](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/LICENSE) and the [notice](https://github.com/we-the-rebel-alliance/plaud-plugin/blob/master/NOTICE) for bundled third-party code. Plaud is a trademark of PLAUD LLC, used here only to name the service the plugin connects to.
