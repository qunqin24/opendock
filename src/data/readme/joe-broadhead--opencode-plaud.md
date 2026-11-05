# Plaud for OpenCode

Use your Plaud voice recordings in OpenCode: list and search them, read their transcripts and notes, and save audio, transcripts or notes as local files.

Unofficial; not affiliated with Plaud.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Another release inside that range starts, and `/plaud-status` calls it untested. Outside the range the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- A Plaud account. Plaud's hosted MCP server, `https://mcp.plaud.ai/mcp`, is in the US; accounts in other regions are untested. If Plaud gives you another address, set it with the [`url`](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#options) option.

The plugin is plain JavaScript. It bundles no Node runtime or Plaud software, downloads nothing to install or start, and starts no process: OpenCode itself connects to Plaud's server.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-plaud
```

Run `opencode reload`, or restart OpenCode. Then run `/plaud-status`: it shows `sign-in required` until you sign in.

**Update** with `opencode plugin update @joe-broadhead/opencode-plaud`, then run `opencode reload`. An entry pinned to a version, such as `@joe-broadhead/opencode-plaud@<version>`, does not update: remove the `@version` from its `plugins` entry first.

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
| `plaud_export` | `tools.plaud.export` | Save audio, a transcript or a note as a file | asks |

Plaud maintains the read tools and their arguments. Plaud has no write API: nothing here can create, rename, delete, upload, share or send a recording. Any other tool on a Plaud server asks before it runs.

The skills are `opencode-plaud` (the tools and Plaud's data model), `opencode-plaud-export` (exports) and `opencode-plaud-digest` (a digest of several recordings, or a follow-up draft).

### Exports

`plaud_export` asks each time, and shows the account, kind, recording and destination.

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

A script or a cron job can call Plaud's five read tools and `plaud_recent` with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own. Add `"account": "<alias>"` to read another account. Exports and every other Plaud tool are never available to scripts, and a script never gets a signed link:

```sh
opencode api post /api/rpc/plaud.recordings.tools/list_files \
  -d '{"input":{"sessionID":"ses_…","input":{"page_size":10}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds default rules to each agent: Plaud's read tools and `plaud_recent` run without a prompt, and `plaud_export` and any other Plaud tool ask first. "Always allow" on an export remembers only that account and kind, such as `default:transcript`. Your own `permissions` rules win over the defaults.

`opencode run` and other runs where nobody can answer refuse an export unless a rule allows it. To export without a prompt, or to block some exports, see [Permissions](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#permissions).

## Configure

Every option is optional. To add a second Plaud account, give it an alias in `accounts`. This example adds the account `work` and a second export folder:

```json
{
  "plugins": [
    {
      "package": "@joe-broadhead/opencode-plaud",
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
  "plugins": [{ "package": "@joe-broadhead/opencode-plaud", "options": { "exportRoots": ["~/Documents/Plaud"] } }],
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

| You see | Do this |
| --- | --- |
| `AUTH_REQUIRED` from an export | That account's server is not connected or not signed in. Sign in from `/connect`, then retry. |
| Status names agents that lack the default rules | Agents defined only in your config miss the rules; status lists those whose own rules would run Plaud tools without asking. Put the rules it shows first in **that agent's own** `permissions`, then repeat your top-level rules for Plaud tools after them. Never add them to the top-level `permissions`. See [the example](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#agents-defined-in-your-config). |
| Status names a shadowed skill | A skill of your own, or a project's, has the id of one of the plugin's skills, so OpenCode loads it instead. Move or rename the file status names, then run `opencode reload`. |
| `OPTIONS_INVALID` | An option is wrong; the message names each one. Fix it in the plugin's `options`. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`. Install a tested release, or set `allowUntestedHost`. |
| `/plaud-status` and the palette command are missing | The plugin did not start. Open `/plugins` to see the error. |
| `Permission plaud_export needs approval` | The run cannot ask. Add an `allow` rule for that export. |

Errors from the plugin read `CODE: what happened. Next step: What to do.` Every code is listed in [Errors](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md#errors). A script that uses the tools RPC has its own codes, listed in [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `plaud` and `plaud-<alias>` servers, so it cannot remove their sign-ins, and `opencode auth list` stops showing them.

1. Sign out of each account: `opencode mcp logout plaud`, and `opencode mcp logout plaud-<alias>` for each account in `accounts`. If one answers `MCP server not found` while the plugin is still installed, OpenCode is still loading the plugin for that folder: wait a few seconds and run it again.
2. Check: `opencode auth list` lists no **Plaud** entry.
3. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-plaud`, then `opencode reload`.
4. Your exports stay in your export roots (`~/Plaud` by default); delete them if you no longer want them. The plugin keeps no other data.
5. Remove any Plaud rules you copied into your agents' own `permissions`.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/docs/scripting.md)
- [Contributing](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/LICENSE) and the [notice](https://github.com/joe-broadhead/opencode-plaud/blob/HEAD/NOTICE) for bundled third-party code. Plaud is a trademark of its owner, used here only to name the service the plugin connects to.
