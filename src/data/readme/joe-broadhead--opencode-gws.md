# Google Workspace for OpenCode

Gives OpenCode agents Gmail, Calendar, Drive, Docs, Sheets and the rest of Google Workspace through Google's
open-source [`gws`](https://github.com/googleworkspace/cli) CLI, with every change planned first and committed as a
second, visible step.

Unofficial; not affiliated with Google Workspace or Google.

Google is a trademark of Google LLC; this unofficial plugin is not endorsed by them.

> **v0.0.0 is unreleased.** This repository is the plugin's first release under the `we-the-rebel-alliance` org, and
> its tag, release and native binary do not exist yet. Install it from a checkout (see [Install](#install)); the
> published release follows.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. Another release in that range, such as 2.4.2, works as usual and status
  marks it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`.
- macOS (arm64, x64) or Linux (arm64, x64, glibc).
- A Google account, and a Desktop app OAuth client: your own, or one your organisation provides.

## Install

From a checkout:

```sh
npm ci --ignore-scripts
npm run fetch:gws
npm run build
```

Then add the checkout's absolute path to `opencode.json`:

```json
{ "plugins": [{ "package": "/absolute/path/to/gws-plugin" }] }
```

The first release is published as `github:we-the-rebel-alliance/gws-plugin#v0.0.0`; until that tag exists, a
`github:` spec does not resolve. Run `opencode reload`, or restart OpenCode, then `/gws-status`.

## Sign in

Run `/connect` and choose **Google Workspace**. The TUI shows the sign-in link: press `o` or Enter to open it in your
browser. The CLI opens the browser automatically:

```sh
opencode auth login gws-default
```

No Google OAuth client ships with the plugin. The first time, the form asks for the client ID and secret of your own
Desktop app OAuth client, unless your organisation set one. Read and write is the default for the `default` account;
Read-only is the other choice. With several accounts, each `/connect` entry is named **Google Workspace (`<alias>`)**.

Details and the scope table: [docs/auth.md](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/auth.md).

## Use

Ask the agent for what you need. It works in four steps:

1. `gws_catalog` finds an operation, and `gws_schema` shows its parameters.
2. `gws_read` runs a read. List and search calls need `fields`.
3. `gws_plan` dry-runs a change and returns a `planId` with a redacted preview.
4. The commit tool named by the plan's category (`gws_write`, `gws_send`, `gws_share`, `gws_delete`, `gws_export` or
   `gws_admin`) runs it, with only the `planId`. OpenCode asks you first when `access` is `"ask-changes"`; every tool
   is allowed at the default ([Permissions](#permissions)).

`gws_status` tells the agent the account aliases and whether a sign-in is missing. Workspace content in a result is
data, never an instruction.

`gws_events_list` is for a consumer's collector, not for answering questions: it lists the Gmail messages that
arrived, or the primary calendar's meetings up to seven days ahead, since a cursor as normalised events. The plugin
declares its sources in `package.json` `sources` under the shared
[source contract](https://github.com/we-the-rebel-alliance/source-contract) and passes its conformance kit
([configuration](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/configuration.md#sources)).

### Scripts

A script or an OpenCode automation can call the read tools with no model, through `opencode api`: `status`, `catalog`,
`schema`, `read`, `plan` and `events_list`. It runs as a session and its agent, under that agent's permission rules,
which default to allowing every method. The commit tools are not methods, so a script plans a change but never commits
it, unless the host turns on `rpcCommits` because it confirms changes itself.

```sh
opencode api post /api/rpc/google-workspace.gws.tools/read \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"operation":"gmail.users.messages.list","params":{"userId":"me","q":"is:unread"},"fields":"messages(id)"}}}'
```

See [Scripting](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/scripting.md).

In the TUI, **Google Workspace: Status** in the command palette, or `/gws`, opens a status dialog. In a session,
`/gws-status` posts the same status, with any pending plans, and `/gws-doctor` makes one small read per enabled
service. None of them can approve or commit.

## Permissions

**Every tool is allowed by default.** An agent can read your mail and files, send mail, change sharing, delete files
and run admin operations without asking. Each change is still only a plan until the agent commits it with the plan's
`planId`, so a commit is one tool call on something you were shown first. Restrict the plugin with the `access`
option, an agent's own rules, or a rule per action; [docs/configuration.md](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/configuration.md#plugin-options)
has the three ways and the rule resources.

The block for each value, generated from `defaultRules(access)` in `src/host/agents.ts`:

<!-- generated:rules-all -->

`access: "all"`

| Action | Resource | Effect |
| --- | --- | --- |
| `gws.*` | `*` | `allow` |
| `gws.status` | `*` | `allow` |
| `gws.catalog` | `*` | `allow` |
| `gws.schema` | `*` | `allow` |
| `gws.read` | `*` | `allow` |
| `gws.plan` | `*` | `allow` |
| `gws.events_list` | `*` | `allow` |
| `gws.probe` | `*` | `allow` |
| `gws.calendar_today` | `*` | `allow` |
| `gws.images_read` | `*` | `allow` |
| `gws.sheets_read` | `*` | `allow` |
| `gws.write` | `*` | `allow` |
| `gws.export` | `*` | `allow` |
| `gws.send` | `*` | `allow` |
| `gws.share` | `*` | `allow` |
| `gws.delete` | `*` | `allow` |
| `gws.admin` | `*` | `allow` |

<!-- /generated:rules-all -->

<!-- generated:rules-ask-changes -->

`access: "ask-changes"`

| Action | Resource | Effect |
| --- | --- | --- |
| `gws.*` | `*` | `ask` |
| `gws.status` | `*` | `allow` |
| `gws.catalog` | `*` | `allow` |
| `gws.schema` | `*` | `allow` |
| `gws.read` | `*` | `allow` |
| `gws.plan` | `*` | `allow` |
| `gws.events_list` | `*` | `allow` |
| `gws.probe` | `*` | `allow` |
| `gws.calendar_today` | `*` | `allow` |
| `gws.images_read` | `*` | `allow` |
| `gws.sheets_read` | `*` | `allow` |
| `gws.write` | `*` | `ask` |
| `gws.export` | `*` | `ask` |
| `gws.send` | `*` | `ask` |
| `gws.share` | `*` | `ask` |
| `gws.delete` | `*` | `ask` |
| `gws.admin` | `*` | `ask` |

<!-- /generated:rules-ask-changes -->

<!-- generated:rules-read-only -->

`access: "read-only"`

| Action | Resource | Effect |
| --- | --- | --- |
| `gws.*` | `*` | `deny` |
| `gws.status` | `*` | `allow` |
| `gws.catalog` | `*` | `allow` |
| `gws.schema` | `*` | `allow` |
| `gws.read` | `*` | `allow` |
| `gws.plan` | `*` | `allow` |
| `gws.events_list` | `*` | `allow` |
| `gws.probe` | `*` | `allow` |
| `gws.calendar_today` | `*` | `allow` |
| `gws.images_read` | `*` | `allow` |
| `gws.sheets_read` | `*` | `allow` |
| `gws.write` | `*` | `deny` |
| `gws.export` | `*` | `deny` |
| `gws.send` | `*` | `deny` |
| `gws.share` | `*` | `deny` |
| `gws.delete` | `*` | `deny` |
| `gws.admin` | `*` | `deny` |

<!-- /generated:rules-read-only -->

## Errors

Every error reads `CODE: What happened. Next step: What to do.` `/gws-status` names the one next step, and each
code's message carries its own:

<!-- generated:codes -->

Generated from `src/domain/errors.ts` by `npm run docs:coverage`. Do not edit this section by hand.

| Code | Meaning | Next step |
| --- | --- | --- |
| `ACCOUNT_REQUIRED` | More than one account is configured and the call named none. | Pass account with one of the configured aliases; gws_status lists them. |
| `ACCOUNT_UNKNOWN` | The account alias is not configured. | Pass a configured alias; gws_status lists them. |
| `OPERATION_UNKNOWN` | The operation id is not in the gws manifest. | Find the exact method or helper id with gws_catalog, then retry. |
| `HELPER_UNSUPPORTED` | The helper is in the catalog but cannot run. | Use the Discovery method gws_catalog names as the helper's alternative. |
| `GWS_VALIDATION_ERROR` | The request is malformed: a schema violation, a field helpers do not take, a missing field mask on list or search, a relative path, a download on gws_read, or arguments gws rejected. | Fix the request as the message says; gws_schema shows the parameters and request body. |
| `CURSOR_INVALID` | The events_list cursor was not issued by events_list for this source, account and scope: another account's, source's or calendar's cursor, one from before the account signed in as another address, or a malformed one. Nothing ran. | Call events_list without cursor, with since where the listing should start; Memory drops events it already has. |
| `INPUT_INVALID` | A source read refused its input, or Google could not find the spreadsheet or read the named range for sheets_read. | Compare the input with the source's declaration (package.json sources) and the installed plugin, then retry. |
| `SOURCE_UNKNOWN` | A source read was asked for a source this plugin does not declare: events_list for one it does not list, or probe for one it does not know. Nothing ran. | Pass a source the plugin declares: gmail or calendar for events_list, and also calendar-today, image or sheets for probe. |
| `TOO_LARGE` | A source read's answer exceeds its size limit: 1 MiB for the Sheets snapshot, or 1 MiB less 4 KiB for a picture's data URI. Nothing is cut short. | Read a smaller range or picture, such as the file's thumbnail. |
| `FIELDS_INVALID` | The fields mask's parentheses do not balance, so gws was not called. | Give each '(' one ')' after it, or write a single path with slashes, such as body/content(paragraph/elements/textRun/content), then retry. |
| `POLICY_DENIED` | Plugin policy refused the call: a deny rule, a category the plugin never runs (deploy, watch), the service, recipients, public sharing, the admin gate, or a path outside the allowed roots. A deny is final. | Do not work around it; tell the user, who can change the plugin policy. |
| `RECIPIENTS_UNKNOWN` | A policy rule limits recipients, and the plugin could not tell who this send or share reaches: a raw message without readable To, Cc or Bcc headers, a draft, message or event it could not read, a draft that names no recipient, or a method whose recipients it does not know. Nothing ran. | Name the recipients in the request (to, cc and bcc, or the To, Cc and Bcc headers of raw), or tell the user the policy rule refuses this method. |
| `ACCOUNT_DOMAIN_UNKNOWN` | A policy rule sets allowExternalRecipients to false, and the account's own email domain is unknown: accounts.<alias>.domains is unset and the signed-in address could not be read. Nothing ran. | Ask the user to set accounts.<alias>.domains to the account's email domains, or to enable Gmail, Drive or Calendar for the account so the plugin can read its address. |
| `PLAN_NOT_FOUND` | No plan has this planId: it never existed, or its time limit passed and it was removed. | Create a plan with gws_plan, then commit its planId. |
| `PLAN_ALREADY_USED` | The plan was committed, or is being committed. Plans are single-use. | Check the result of the earlier commit with gws_read before planning the change again. |
| `PLAN_EXPIRED` | The plan's time limit passed, or a failed commit expired it. | Check the current state with gws_read, then plan again and show the new preview. |
| `PLAN_CALLER_MISMATCH` | Another session, agent, or account created the plan. | Plan again from the session and agent that will commit it. |
| `CATEGORY_MISMATCH` | The tool does not match the operation's or the plan's category: a change sent to gws_read, a read sent to gws_plan, or a plan committed with another category's tool. | Call the tool the message names. |
| `SESSION_UNKNOWN` | A script named a session that does not exist. A script runs as a session, under that session's agent and its permission rules. | Create a session that names an agent, such as POST /api/session with {"agent":"build"}, and pass its id. |
| `SESSION_AGENT_REQUIRED` | A script named a session that names no agent. A script runs as its session's agent, so its permissions and plans never depend on the default agent. | Create a session that names an agent, such as POST /api/session with {"agent":"build"}, and pass its id. |
| `PERMISSION_DENIED` | The session's permission rules denied the call or require an approval a script cannot give. For sheets_read, Google may instead have refused the selected account's access. | Add an allow rule for the tool to the session's agent or to the session, or use a session whose agent allows it. |
| `AUTH_REQUIRED` | The account is not signed in, its sign-in expired or was revoked, or a headless credential variable is unset. A call that fails this way before gws runs changes nothing. | Ask the user to sign in as the message says, then retry. |
| `AUTH_SCOPE_MISSING` | The sign-in has not granted a scope this operation needs. The plugin checks before gws runs, so nothing ran. | Ask the user to sign in again with the access the message names, or to add the scope to the account's scopes, then retry. For a method only an app's credentials can run, use another method. |
| `ADMIN_PRIVILEGE_REQUIRED` | The sign-in is valid, but an Admin SDK service (admin-reports) refused the call because the account lacks a Workspace admin privilege the API needs, such as Reports. Signing in again as the same account does not help, and the sign-in is not marked as needing renewal. Another service's refusal is never this code. | Ask the user to add a separate account alias for a Workspace admin who has the needed privilege (Reports for admin-reports) and sign in to it, or to remove the service from enabledServices. |
| `AUTH_CLIENT_REQUIRED` | No OAuth client is configured for the sign-in, none was entered in the form, and no earlier sign-in has one. | Run /connect and choose Google Workspace, then enter your Desktop OAuth client ID and secret, or ask your administrator. |
| `AUTH_CLIENT_INVALID` | The sign-in form has only one of the client ID and secret, a value in the wrong format, or a client JSON that is not Google's downloaded client JSON. | Enter both the client ID and the secret of the same Desktop app OAuth client; /gws-status lists the steps. |
| `AUTH_REDIRECT_INVALID` | The sign-in's redirectUri is not an absolute https (or loopback http) URL, or callbackPort is missing or not a port. | Set redirectUri to an absolute https URL and callbackPort to a port from 1 to 65535, or leave both unset for a loopback redirect. |
| `AUTH_REDIRECT_MISMATCH` | Google would refuse the redirect for this client: a Desktop app client accepts only a loopback redirect, and a Web application client accepts only a redirect URI registered on it, exactly. Nothing was opened in the browser. | Use a Web application client that lists the redirect, as its downloaded client JSON, or leave redirectUri unset for a Desktop app client. |
| `AUTH_WRITE_UNCONFIRMED` | Read and write access was chosen in the sign-in form without confirming the write scopes. | Sign in again and confirm the write scopes, or choose Read-only. |
| `API_DISABLED` | The Google API is not enabled in the Google Cloud project of the OAuth client. | Ask the user to enable the API in the Google Cloud console, wait about a minute, and retry. |
| `GWS_API_ERROR` | Google returned an error or an unexpected response. The message may include Google's text. | Fix the ids or parameters once from the message; if it fails again, tell the user Google's message. |
| `CALENDAR_UNAVAILABLE` | The agenda snapshot (calendar_today) has no answer: no configured account enables calendar, or Google's answer for the primary calendar named no time zone. | Add calendar to an account's enabledServices; if it is enabled, retry later. |
| `IMAGE_HOST_REFUSED` | The picture images_read was asked for has an address the plugin does not take: not https, a user name, password, port or IP address in it, a host other than drive.google.com or Google's image servers (lh3 to lh7 under googleusercontent.com; any other googleusercontent.com name can be anyone's), or a Drive link that names no file. Nothing was fetched. | Show the picture from a Drive file link or an address Google returned, such as a file's thumbnailLink. |
| `IMAGE_TYPE_REFUSED` | The picture's first bytes are not a PNG, JPEG, GIF or WebP; SVG and every other kind are refused. The image source (images_read) also refuses a GIF, which the contract's image output does not take. | Show a PNG, JPEG, GIF or WebP picture instead; for images_read, a PNG, JPEG or WebP. |
| `IMAGE_TOO_LARGE` | The picture is over 1 MB, the most one read takes; the plugin stops reading at that size and answers nothing. | Show the file's thumbnail (its thumbnailLink) instead. |
| `IMAGE_UNAVAILABLE` | The picture could not be read: Google answered with an error or a redirect (never followed), a Drive file is not a picture and has no thumbnail, or too many pictures are being read at once. | Check that the account can open the file; retry later. |
| `IMAGE_ACCOUNT_AMBIGUOUS` | No single account can read the picture: no account enables drive, or several could and none is the default account. The plugin never tries each account in turn. | Add drive to one account's enabledServices, or name an account default. |
| `GWS_DISCOVERY_ERROR` | gws could not load the API description (the Discovery document) it builds requests from. | Check that this machine can reach www.googleapis.com, then retry. |
| `GWS_INTERNAL_ERROR` | gws failed unexpectedly. | Retry once; if it fails again, report the message. |
| `TIMEOUT` | gws did not finish within execution.timeoutMs. | Narrow the request with fields, a smaller page size, maxPages, or maxItems, then retry. |
| `OUTPUT_LIMIT` | gws output exceeded execution.maxStdoutBytes or execution.maxStderrBytes. | Narrow the request with fields, a smaller page size, maxPages, or maxItems, then retry. |
| `CANCELLED` | The call was cancelled and the gws process stopped. A commit stopped while gws ran may or may not have been applied. | Do not retry unless the user asks; check the state with gws_read before planning again. |
| `SCHEMA_INVALID` | gws schema returned no usable JSON. | Retry once; if it fails again, report the message. |
| `SCHEMA_NOT_FOUND` | gws schema does not know this method. | Check the operation id with gws_catalog. |
| `UPLOAD_INVALID` | An upload or attachment path is not absolute, does not exist, or is not a regular file. | Use the absolute path of an existing regular file. |
| `UPLOAD_LIMIT` | The upload is larger than execution.maxUploadBytes. | Use a smaller file, or ask the user to raise execution.maxUploadBytes. |
| `UPLOAD_CHANGED` | An upload or attachment changed between the plan and the commit, so the plan expired. | Plan again and show the new preview. |
| `DOWNLOAD_EXISTS` | The download destination exists and download.overwrite is not true. | Choose another path, or plan again with download.overwrite set to true after the user agrees. |
| `DOWNLOAD_INVALID` | The destination is not absolute, its directory does not exist, it is a directory, or gws wrote no file. | Fix the destination path; if gws wrote no file, tell the user. |
| `DOWNLOAD_NOT_PERMITTED` | The destination is outside the project, so OpenCode asks for its own external_directory permission as well, and the rules denied it or the person rejected the prompt. Nothing was written, and the plan is still ready. | Allow the folder with {"action": "external_directory", "resource": "<folder>/*", "effect": "allow"} in OpenCode's permissions, or download to a path inside the project. |
| `DOWNLOAD_LIMIT` | The download is larger than execution.maxDownloadBytes; nothing was written to the destination. | Tell the user; they can raise execution.maxDownloadBytes. The plan is used up. |
| `HOST_UNTESTED` | The OpenCode version is outside the supported range in package.json opencode.host (>=2.4.1 <2.5.0). | Use OpenCode 2.4.1 or a later 2.4 release, or set "allowUntestedHost": true. |
| `OPTIONS_INVALID` | The plugin options are not valid: an unknown key, a wrong type, an unknown service, an access value that is not all, ask-changes or read-only, or scopes that name something the account does not enable. | Fix the plugin options in opencode.json; the message names the option. |
| `STATUS_UNAVAILABLE` | The status could not be read from the plugin. | Run /gws-status in a session for the details. |
| `SKILLS_INVALID` | A skill file that ships with the plugin is missing or unreadable. | Reinstall the plugin. |
| `GWS_UNAVAILABLE` | No gws binary is available: this platform has no release binary, the binary is not installed yet, or binary.path does not exist. | Run /gws-install, which downloads and verifies it, or set binary.path to a gws 0.22.5 executable. |
| `GWS_VERSION_MISMATCH` | The gws version check failed, or gws is not the version the manifest was generated from. | Reinstall the plugin, or point binary.path at gws 0.22.5. |
| `BINARY_TRUST_FAILED` | The gws binary failed a trust check: a relative path, not a regular file, group- or world-writable, inside the project, a writable ancestor, or a checksum mismatch. | Follow the step the message names: remove the named cached copy and call the tool again, move the binary.path executable to a location only you can write, or reinstall the plugin from a valid release. |

<!-- /generated:codes -->

## Known limits

- **Platforms.** macOS (arm64, x64) and Linux (glibc, arm64, x64) only. Windows and musl have no release binary, so the
  tools refuse with `GWS_UNAVAILABLE` unless `binary.path` names a `gws` 0.22.5 executable.
- **Operations.** The tools are the operations in the manifest generated from the pinned `gws` 0.22.5. A method that a
  later `gws` adds arrives with a plugin release.
- **Unverified OAuth apps.** An External client left in Testing shows unverified-app warnings, and its refresh tokens
  expire after 7 days, so each account signs in again weekly.
- **A cancelled commit may have been applied.** `CANCELLED` means the call stopped while `gws` ran. Check the state
  with `gws_read` before planning the change again.
- **Asks need an answerer.** At `access: "ask-changes"`, `opencode run` and scripts cannot answer a prompt, so a commit
  there needs an allow rule for it, or `access: "all"`.
- **Updates are not automatic** for a Git install: install the new tag, then run `opencode reload`.

## Links

- [Sign-in and scopes](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/auth.md)
- [Configuration](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/configuration.md)
- [Status dialog, commands and RPC](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/ui.md)
- [Scripting the tools without a model](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/scripting.md)
- [Admin operations](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/admin.md)
- [Security policy and model](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/SECURITY.md)
- [The `gws` binary](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/docs/backend.md)
- [Changelog](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/CHANGELOG.md), [licence](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/LICENSE) and [notice](https://github.com/we-the-rebel-alliance/gws-plugin/blob/master/NOTICE)
- [Issues](https://github.com/we-the-rebel-alliance/gws-plugin/issues)
