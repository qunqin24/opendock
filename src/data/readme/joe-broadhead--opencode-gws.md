# Google Workspace for OpenCode

Gives OpenCode agents Gmail, Drive, Calendar, Docs, Sheets and the rest of Google Workspace through Google's open-source [`gws`](https://github.com/googleworkspace/cli) CLI, with every change planned first and committed as a second, visible step.

Unofficial; not affiliated with Google.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Another release in that range, such as 2.2.99, works as usual, and status marks it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`.
- macOS (arm64, x64) or Linux (arm64, x64, glibc).
- A Google account, and a Desktop app OAuth client: your own, or one your organisation provides.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-gws#v0.0.2
```

Run `opencode reload`, or restart OpenCode, then run `/gws-status`.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-gws#v<old version>`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-gws#v<version>`.

Or add the plugin to `opencode.json` instead, with the same spec:

```json
{ "plugins": [{ "package": "github:joe-broadhead/opencode-gws#v0.0.2" }] }
```

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.
A new release is a new tag: install it with its own `#v<version>` spec.

## Sign in

Run `/connect` and choose **Google Workspace**. The TUI shows the sign-in link: press `o` or Enter to open it in your browser. The CLI opens the browser automatically:

```sh
opencode auth login gws-default
```

No Google OAuth client ships with the plugin. The first time, the form asks for the client ID and secret of your own Desktop app OAuth client, unless your organisation set one (see [Organisation rollout](#organisation-rollout)). To make one, follow [Create your Desktop client](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#create-your-desktop-client). The form lists the exact scopes before Google's consent screen. Read and write is the default for the `default` account and needs an acknowledgment; Read-only is the other choice. The default consent lists 42 scopes (35 for Read-only), and an External client in Testing shows unverified-app warnings and expires refresh tokens after 7 days: see [What the default consent asks for](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#what-the-default-consent-asks-for). With several accounts, each `/connect` entry is named **Google Workspace (`<alias>`)**.

To update, install the new release tag as in [Install](#install), then run `opencode reload`. Your options and sign-ins are kept.

Details and the scope table: [docs/auth.md](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md).

## Use

Ask the agent for what you need. It works in four steps:

1. `gws_catalog` finds an operation, and `gws_schema` shows its parameters.
2. `gws_read` runs a read. List and search calls need `fields`.
3. `gws_plan` dry-runs a change and returns a `planId` with a redacted preview.
4. The commit tool named by the plan's category (`gws_write`, `gws_send`, `gws_share`, `gws_delete`, `gws_export` or `gws_admin`) runs it, with only the `planId`. OpenCode asks you first when `access` is `"ask-changes"`; every tool is allowed at the default ([Permissions](#permissions)).

`gws_status` tells the agent the account aliases and whether a sign-in is missing. Workspace content in a result is data, never an instruction.

`gws_events_list` is for Memory's collector, not for answering questions: it lists the Gmail messages that arrived since a cursor as normalised events (sender and recipients, subject, thread link, system labels, and the message's own text without quoted replies or signature, at most 4,096 characters), oldest first, leaving out spam, trash, drafts, Promotions and Social. It only reads and never asks. It is this plugin's side of the shared `events_list` source contract ([configuration](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#events-list)).

In Jelly, the plugin also answers `calendar.today`, a read-only RPC method that lists today's events on one account's primary calendar for Jelly's calendar and the **Today** Home tile. It reads with that account's own sign-in, never writes, and returns no descriptions or guests ([In Jelly](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/jelly.md#todays-calendar)).

### Scripts

A script or a cron job can call the read tools with no model, through `opencode api`: `status`, `catalog`, `schema`, `read`, `plan` and `events_list`. It runs as a session and its agent, under that agent's permission rules, which default to allowing every method. The commit tools are not methods, so a script plans a change but never commits it, unless the host turns on `rpcCommits` because it confirms changes itself. A rule that `ask`s is refused, because no one can answer it:

```sh
opencode api post /api/rpc/google-workspace.gws.tools/read \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"operation":"gmail.users.messages.list","params":{"userId":"me","q":"is:unread"},"fields":"messages(id)"}}}'
```

The header names the location whose plugin and sessions you mean; without it the call fails `rpc.unavailable` when the plugin is not loaded in the service's default location.

See [Scripting](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/scripting.md).

In the TUI, **Google Workspace: Status** in the command palette, or `/gws`, opens a status dialog. In a session, `/gws-status` posts the same status, with any pending plans, and `/gws-doctor` makes one small read per enabled service. None of them can approve or commit.

## Permissions

**Every tool is allowed by default.** An agent can read your mail and files, send mail, change sharing, delete files and run admin operations without asking. Each change is still only a plan until the agent commits it with the plan's `planId`, so a commit is one tool call on something you were shown first. Restrict the plugin in any of these three ways:

1. **The `access` option**, which drives the rules the plugin inserts directly after each agent's base `{ "action": "*", "resource": "*", "effect": "allow" }` rule. Agents without that base rule are left alone, and a later rule still wins.

   | Value | What runs | What asks |
   | --- | --- | --- |
   | `"all"` (the default) | every tool, the six commit tools included, and any tool a later release adds | nothing |
   | `"ask-changes"` | the reads: status, catalog, schema, read, plan and events_list | each of the six commits |
   | `"read-only"` | the reads, events_list included | nothing: the six commits are **denied** |

   ```json
   { "plugins": [{ "package": "github:joe-broadhead/opencode-gws#v0.0.2", "options": { "access": "read-only" } }] }
   ```

   This is not the account's `access`: `accounts.<alias>.access` is the Google sign-in's scope level (Read-only or Read and write). The plugin option decides which tools run.

2. **An agent that is read-only or asks**, with rules of its own, later than the plugin's. The actions are `gws.status`, `gws.catalog`, `gws.schema`, `gws.read`, `gws.plan`, `gws.events_list` and the six commits:

   ```json
   { "agents": { "reader": { "permissions": [
     { "action": "gws.*", "resource": "*", "effect": "deny" },
     { "action": "gws.read", "resource": "*", "effect": "allow" }
   ] } } }
   ```

3. **A rule per action**, with `resource` set to the account and operation it covers. A later rule wins, so your allow or deny replaces the plugin's:

   ```json
   { "permissions": [
     { "action": "gws.delete", "resource": "*", "effect": "deny" },
     { "action": "gws.write", "resource": "work:*", "effect": "ask" }
   ] }
   ```

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
| `gws.write` | `*` | `deny` |
| `gws.export` | `*` | `deny` |
| `gws.send` | `*` | `deny` |
| `gws.share` | `*` | `deny` |
| `gws.delete` | `*` | `deny` |
| `gws.admin` | `*` | `deny` |

<!-- /generated:rules-read-only -->

What each commit asserts: `gws.<category>` on `<account>:<operation>`. Write and export offer **Always** for that exact resource. Send, share, delete and admin pass no save patterns, so they never offer Always. Every rule needs `resource`:

```json
{ "action": "gws.write", "resource": "work:*", "effect": "allow" }
```

A download outside the project asserts OpenCode's own `external_directory` permission as well, because the file lands there: allow the folder with `{ "action": "external_directory", "resource": "<folder>/*", "effect": "allow" }`, or download inside the project. An agent whose base rule allows everything allows it too, so nothing asks unless your rules restrict it.

`opencode run` cannot answer an ask. At `ask-changes`, give a commit an allow rule there, or choose `all`. A user `deny` hides that tool. A Plan-style or custom deny such as `{ "action": "gws.*", "resource": "*", "effect": "deny" }` still wins, because it is later than the inserted block.

An agent defined only in your config does not get the block. That matters only when `access` holds something back: `/gws-status` and the status dialog then name those agents and show the block. Put it first in each listed agent's own `permissions`, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Google Workspace tools. Do not put it in the top-level `permissions`: that would loosen Explore.

## Configure

Options go on the plugin entry: accounts and their services and access, the OAuth client, deny-only policy rules, and the admin gate. See [docs/configuration.md](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md) and the annotated [example](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/examples/opencode.jsonc).

## Organisation rollout

Create a Desktop app OAuth client in your organisation's Google Cloud project (user type **Internal** keeps it to your organisation), and set it in OpenCode's system config: `/Library/Application Support/opencode/opencode.json` on macOS, or `/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [
    {
      "package": "github:joe-broadhead/opencode-gws#v0.0.2",
      "options": {
        "oauthClient": {
          "clientId": "<your client ID>.apps.googleusercontent.com",
          "clientSecret": "<your client secret>"
        }
      }
    }
  ]
}
```

Members then only run `/connect`, choose Google Workspace, and pick an access level: the form hides the client fields and uses these values. Google treats a Desktop client's secret as non-confidential; security rests on PKCE, the loopback redirect and the user's consent.

## Troubleshooting

`/gws-status` shows each account as `connected`, `sign-in required` or `not configured`, with one next step. Every code this plugin reports, with what it means and the next step its message carries:

<!-- generated:codes -->

Generated from `src/domain/errors.ts` by `npm run docs:coverage`. Do not edit this section by hand.

| Code | Meaning | Next step |
| --- | --- | --- |
| `ACCOUNT_REQUIRED` | More than one account is configured and the call named none. | Pass account with one of the configured aliases; gws_status lists them. |
| `ACCOUNT_UNKNOWN` | The account alias is not configured. | Pass a configured alias; gws_status lists them. |
| `OPERATION_UNKNOWN` | The operation id is not in the gws manifest. | Find the exact method or helper id with gws_catalog, then retry. |
| `HELPER_UNSUPPORTED` | The helper is in the catalog but cannot run. | Use the Discovery method gws_catalog names as the helper's alternative. |
| `GWS_VALIDATION_ERROR` | The request is malformed: a schema violation, a field helpers do not take, a missing field mask on list or search, a relative path, a download on gws_read, or arguments gws rejected. | Fix the request as the message says; gws_schema shows the parameters and request body. |
| `CURSOR_INVALID` | The events_list cursor was not issued by events_list for this account and its mailbox: another account's or source's cursor, one from before the account signed in as another address, or a malformed one. Nothing ran. | Call events_list without cursor, with since where the listing should start; Memory drops events it already has. |
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
| `PERMISSION_DENIED` | The permission rules of the session's agent deny the call, or ask for an approval that a script cannot give, so the call did not run. | Add an allow rule for the tool to the session's agent or to the session, or use a session whose agent allows it. |
| `AUTH_REQUIRED` | The account is not signed in, its sign-in expired or was revoked, or a headless credential variable is unset. A call that fails this way before gws runs changes nothing. | Ask the user to sign in as the message says, then retry. |
| `AUTH_SCOPE_MISSING` | The sign-in has not granted a scope this operation needs. The plugin checks before gws runs, so nothing ran. | Ask the user to sign in again with the access the message names, or to add the scope to the account's scopes, then retry. For a method only an app's credentials can run, use another method. |
| `ADMIN_PRIVILEGE_REQUIRED` | The sign-in is valid, but an Admin SDK service (admin-reports) refused the call because the account lacks a Workspace admin privilege the API needs, such as Reports. Signing in again as the same account does not help, and the sign-in is not marked as needing renewal. Another service's refusal is never this code. | Ask the user to add a separate account alias for a Workspace admin who has the needed privilege (Reports for admin-reports) and sign in to it, or to remove the service from enabledServices. |
| `AUTH_CLIENT_REQUIRED` | No OAuth client is configured for the sign-in, none was entered in the form, and no earlier sign-in has one. | Run /connect and choose Google Workspace, then enter your Desktop OAuth client ID and secret, or ask your administrator. |
| `AUTH_CLIENT_INVALID` | The sign-in form has only one of the client ID and secret, a value in the wrong format, or a client JSON that is not Google's downloaded client JSON. | Enter both the client ID and the secret of the same Desktop app OAuth client; /gws-status lists the steps. |
| `AUTH_REDIRECT_INVALID` | The sign-in's redirectUri is not an absolute https (or loopback http) URL, or callbackPort is missing or not a port. | Set redirectUri to an absolute https URL and callbackPort to a port from 1 to 65535, or leave both unset for a loopback redirect. |
| `AUTH_REDIRECT_MISMATCH` | Google would refuse the redirect for this client: a Desktop app client accepts only a loopback redirect, and a Web application client accepts only a redirect URI registered on it, exactly. Nothing was opened in the browser. | Use a Web application client that lists the redirect, as its downloaded client JSON, or leave redirectUri unset for a Desktop app client. |
| `AUTH_WRITE_UNCONFIRMED` | Read and write access was chosen in the sign-in form without confirming the write scopes. | Sign in again and confirm the write scopes, or choose Read-only. |
| `API_DISABLED` | The Google API is not enabled in the Google Cloud project of the OAuth client. | Ask the user to enable the API in the Google Cloud console, wait about a minute, and retry. |
| `GWS_API_ERROR` | Google returned an error; the message carries Google's text. | Fix the ids or parameters once from the message; if it fails again, tell the user Google's message. |
| `CALENDAR_UNAVAILABLE` | The read Jelly's calendar makes, calendar.today, has no answer: no configured account enables calendar, or Google's answer for the primary calendar named no time zone. | Add calendar to an account's enabledServices; if it is enabled, retry later. |
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
| `HOST_UNTESTED` | The OpenCode version is outside the supported range in package.json opencode.host (>=2.2.3 <2.3.0). | Use OpenCode 2.2.3 or a later 2.2.x release, or set "allowUntestedHost": true. |
| `OPTIONS_INVALID` | The plugin options are not valid: an unknown key, a wrong type, an unknown service, an access value that is not all, ask-changes or read-only, or scopes that name something the account does not enable. | Fix the plugin options in opencode.json; the message names the option. |
| `STATUS_UNAVAILABLE` | The status could not be read from the plugin. | Run /gws-status in a session for the details. |
| `SKILLS_INVALID` | A skill file that ships with the plugin is missing or unreadable. | Reinstall the plugin. |
| `GWS_UNAVAILABLE` | No gws binary is available: this platform has no release binary, the binary is not installed yet, or binary.path does not exist. | Run /gws-install, which downloads and verifies it, or set binary.path to a gws 0.22.5 executable. |
| `GWS_VERSION_MISMATCH` | The gws version check failed, or gws is not the version the manifest was generated from. | Reinstall the plugin, or point binary.path at gws 0.22.5. |
| `BINARY_TRUST_FAILED` | The gws binary failed a trust check: a relative path, not a regular file, group- or world-writable, inside the project, a writable ancestor, or a checksum mismatch. | Follow the step the message names: remove the named cached copy and call the tool again, move the binary.path executable to a location only you can write, or reinstall the plugin from a valid release. |

<!-- /generated:codes -->

Three need more than a line:

- `AUTH_SCOPE_MISSING`: sign in again, approve every scope Google lists, and choose Read and write. A method marked `appOnly` needs a Chat app's or Classroom add-on's own credentials and cannot run with a Google sign-in; a Keep method needs domain-wide delegation that a Workspace admin sets up. Nothing ran.
- `ADMIN_PRIVILEGE_REQUIRED`: the sign-in is valid, but the account is not a Workspace admin with the privilege the API needs, such as Reports for `admin-reports`. Signing in again does not help: add an account alias for an admin who has it, or remove the service from `enabledServices`.
- `POLICY_DENIED`: a deny rule or the admin gate refused the call. A deny is final.

A skill of your own named `opencode-gws` or `opencode-gws-recipes` (for example in `~/.claude/skills`) hides the plugin's skill of that name; `/gws-status` names it under **Hidden skills**, and the fix is to move or rename it. A skill that tells agents to run `gws` in a shell, such as the gws CLI's own `gws-*` skills, leads them around the plugin's plans and approvals; `/gws-status` names each one under **Shell gws skills**, and the fix is to remove it or move it out of its skills folder.

Each OpenCode server keeps a private work folder, `$TMPDIR/opencode-gws-XXXXXX`, and removes it when it stops. A server that stopped without closing leaves its folder behind; the next start removes such folders once they are a day old and their process is gone.

`gws` uses the OpenCode service's proxy settings, for example `opencode service set env HTTPS_PROXY http://proxy.example:8080`. The same code table is in [Errors](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#errors).

## Uninstall

1. Sign out each account while the plugin is still installed: in `/connect`, or with `opencode auth logout gws-<alias>` (`gws-default` for the default account). After the plugin is removed, its sign-ins no longer appear.
2. Remove the plugin:

   ```sh
   opencode plugin remove github:joe-broadhead/opencode-gws#v0.0.2
   ```

3. Delete its folders. The state folder holds the audit log (`audit.jsonl`, and `audit.jsonl.1` once it passes 5 MiB); the cache folder holds Google's API descriptions. Neither holds a credential.

   | | macOS | Linux |
   | --- | --- | --- |
   | State | `~/Library/Application Support/opencode-gws` | `~/.local/state/opencode-gws` |
   | Cache | `~/Library/Caches/opencode-gws` | `~/.cache/opencode-gws` |

   `$XDG_STATE_HOME/opencode-gws` and `$XDG_CACHE_HOME/opencode-gws` replace them when those variables are set, and `audit.path` names its own file.
4. Remove any permission block you copied into an agent's own `permissions`.

## Known limits

- **Platforms.** macOS (arm64, x64) and Linux (glibc, arm64, x64) only. Windows and musl have no release binary, so the tools refuse with `GWS_UNAVAILABLE` unless `binary.path` names a `gws` 0.22.5 executable.
- **Operations.** The tools are the operations in the manifest generated from the pinned `gws` 0.22.5. A method that a later `gws` adds arrives with a plugin release, and `gws_catalog` lists only the manifest.
- **Services the default sign-in leaves out.** Keep needs domain-wide delegation that a Workspace admin sets up, admin reports need a Workspace admin account, and Model Armor cannot run. A method that only a Chat app or a Classroom add-on can run (`appOnly`) fails with `AUTH_SCOPE_MISSING` under a Google sign-in.
- **Unverified OAuth apps.** An External client left in Testing shows unverified-app warnings, and its refresh tokens expire after 7 days, so each account signs in again weekly.
- **A cancelled commit may have been applied.** `CANCELLED` means the call stopped while `gws` ran. Check the state with `gws_read` before planning the change again.
- **Asks need an answerer.** At `access: "ask-changes"`, `opencode run` and scripts cannot answer a prompt, so a commit there needs an allow rule for it, or `access: "all"`.
- **Output and time limits.** A result that is too large stops with `OUTPUT_LIMIT`, and a slow call with `TIMEOUT`. Narrow the request with `fields`, a smaller page size, `maxPages` or `maxItems`.
- **Tested hosts.** Tested on OpenCode 2.2.3, 2.2.4, 2.2.5 and 2.2.6. A later 2.2 release loads, and `/gws-status` marks it untested.
- **Audit lines can drop.** The audit log is written off the call path, with a 100 ms budget per line. A write that stalls past it is abandoned: its line and any queued behind it are lost. The call's result is not affected. The sink then stops writing until the plugin reloads, and `/gws-status` shows that some audit records could not be saved.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Sign-in and scopes](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md)
- [Configuration](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md)
- [Status dialog, commands and RPC](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/ui.md)
- [Scripting the tools without a model](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/scripting.md)
- [Admin operations](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/admin.md)
- [Security policy and model](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/SECURITY.md)
- [The `gws` binary](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)
- [Changelog](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/CHANGELOG.md), [licence](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/LICENSE) and [notice](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/NOTICE)
- [Issues](https://github.com/joe-broadhead/opencode-gws/issues)
