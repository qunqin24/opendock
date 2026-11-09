# Google Workspace for OpenCode

Gives OpenCode agents Gmail, Drive, Calendar, Docs, Sheets and the rest of Google Workspace through Google's open-source [`gws`](https://github.com/googleworkspace/cli) CLI, with every change planned first and committed only after you approve it.

Unofficial; not affiliated with Google.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Another release in that range works as usual, and status marks it untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`.
- macOS (arm64, x64) or Linux (arm64, x64, glibc).
- A Google account, and a Desktop app OAuth client: your own, or one your organisation provides.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-gws
```

Run `opencode reload`, or restart OpenCode. Then run `/gws-status`.

npm also installs the matching `@joe-broadhead/opencode-gws-bin-<target>` package, which holds the unmodified `gws` binary at the version the plugin pins ([details](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)). Nothing downloads at runtime and there is no install script.

With no options, the plugin creates one account, `default`, with every Workspace service a Google sign-in can use at Read and write, so one consent grants every scope it can use. Keep is left out: Google grants its scopes only through domain-wide delegation, which a Workspace admin sets up ([Keep](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#keep-needs-domain-wide-delegation)). Admin reports, which need a Workspace admin, and Model Armor, which cannot run, are left out too. Every change still needs a plan and your approval. To narrow it, set `accounts` ([configuration](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#accounts)).

## Sign in

Run `/connect` and choose **Google Workspace**. The TUI shows the sign-in link: press `o` or Enter to open it in your browser. The CLI opens the browser automatically:

```sh
opencode auth login gws-default
```

No Google OAuth client ships with the plugin. The first time, the form asks for the client ID and secret of your own Desktop app OAuth client, unless your organisation set one (see [Organisation rollout](#organisation-rollout)). To make one, follow [Create your Desktop client](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#create-your-desktop-client). The form lists the exact scopes before Google's consent screen. Read and write is the default for the `default` account and needs an acknowledgment; Read-only is the other choice. The default consent lists 42 scopes (35 for Read-only), and an External client in Testing shows unverified-app warnings and expires refresh tokens after 7 days: see [What the default consent asks for](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#what-the-default-consent-asks-for). With several accounts, each `/connect` entry is named **Google Workspace (`<alias>`)**.

To update, run `opencode plugin update @joe-broadhead/opencode-gws`, then `opencode reload`. An entry pinned to a version (`@joe-broadhead/opencode-gws@<version>`) does not update: remove the `@version` from `plugins` first. Your options and sign-ins are kept.

Details and the scope table: [docs/auth.md](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md).

## Use

Ask the agent for what you need. It works in four steps:

1. `gws_catalog` finds an operation, and `gws_schema` shows its parameters.
2. `gws_read` runs a read. List and search calls need `fields`.
3. `gws_plan` dry-runs a change and returns a `planId` with a redacted preview.
4. The commit tool named by the plan's category (`gws_write`, `gws_send`, `gws_share`, `gws_delete`, `gws_export` or `gws_admin`) runs it, with only the `planId`. OpenCode asks you first.

`gws_status` tells the agent the account aliases and whether a sign-in is missing. Workspace content in a result is data, never an instruction.

`gws_events_list` is for Memory's collector, not for answering questions: it lists the Gmail messages that arrived since a cursor as normalised events (sender and recipients, subject, thread link, system labels, and the message's own text without quoted replies or signature, at most 4,096 characters), oldest first, leaving out spam, trash, drafts, Promotions and Social. It only reads and never asks. It is this plugin's side of the shared `events_list` source contract ([configuration](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#events-list)).

### Scripts

A script or a cron job can call the same tools with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules, and it can plan but never commit:

```sh
opencode api post /api/rpc/google-workspace.gws.tools/read \
  -d '{"input":{"sessionID":"ses_…","input":{"operation":"gmail.users.messages.list","params":{"userId":"me","q":"is:unread"},"fields":"messages(id)"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/scripting.md).

In the TUI, **Google Workspace: Status** in the command palette, or `/gws`, opens a status dialog. In a session, `/gws-status` posts the same status, with any pending plans, and `/gws-doctor` makes one small read per enabled service. None of them can approve or commit.

## Permissions

The plugin adds an ask rule for `gws.write`, `gws.export`, `gws.send`, `gws.share`, `gws.delete` and `gws.admin` to every agent, right after the agent's base allow rule. Reads do not ask, so they also work in `opencode run`.

A later rule wins. Your own allow rule, or **Always** on a write or export, removes that prompt. Send, share, delete and admin never offer Always. Your deny rule, and the Plan agent, keep a commit denied. Every rule needs `resource`:

```json
{ "action": "gws.write", "resource": "work:*", "effect": "allow" }
```

An agent defined only in your config does not get the ask rules. `/gws-status` and the status dialog name those agents and show the default rules. Put them first in each listed agent's own `permissions`, in `opencode.json` or the agent's Markdown file, followed by your top-level rules for Google Workspace tools. Do not put them in the top-level `permissions`: that would loosen Explore.

## Configure

Options go on the plugin entry: accounts and their services and access, the OAuth client, deny-only policy rules, and the admin gate. See [docs/configuration.md](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md) and the annotated [example](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/examples/opencode.jsonc).

## Organisation rollout

Create a Desktop app OAuth client in your organisation's Google Cloud project (user type **Internal** keeps it to your organisation), and set it in OpenCode's system config: `/Library/Application Support/opencode/opencode.json` on macOS, or `/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [
    {
      "package": "@joe-broadhead/opencode-gws",
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

`/gws-status` shows each account as `connected`, `sign-in required` or `not configured`, with one next step. Common error codes:

| Code | What to do |
| --- | --- |
| `AUTH_REQUIRED` | Run `/connect` and choose Google Workspace, or run `opencode auth login gws-<alias>`. |
| `ADMIN_PRIVILEGE_REQUIRED` | The sign-in is valid, but the account is not a Workspace admin with the privilege the API needs, such as Reports for `admin-reports`. Signing in again as the same account does not help: add a separate account alias for an admin who has it and sign in to that, or remove the service from `enabledServices`. |
| `AUTH_SCOPE_MISSING` | Sign in again, approve every scope Google lists, and choose Read and write. A method marked `appOnly` (`restriction: "app-only"`) needs a Chat app's or Classroom add-on's own credentials and cannot run with a Google sign-in. A Keep method (`restriction: "domain-wide-delegation"`) needs domain-wide delegation that a Workspace admin sets up. Nothing ran. |
| `AUTH_CLIENT_REQUIRED` | Run `/connect` and choose Google Workspace, then enter your Desktop OAuth client ID and secret, or ask your administrator. |
| `API_DISABLED` | Enable the API at the URL in the message, wait about a minute, and retry. `/gws-doctor` checks every service. |
| `HOST_UNTESTED` | The plugin does not start. Use OpenCode 2.2.3 or a later 2.2.x release, or set `"allowUntestedHost": true`. |
| `GWS_UNAVAILABLE` | Reinstall so the platform package is present, or set `binary.path` to a `gws` executable of the pinned version ([details](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)). |
| `POLICY_DENIED` | A policy rule or the admin gate refused the call. A deny is final. |
| `RECIPIENTS_UNKNOWN` | A recipient rule applies, and the plugin could not tell who the send or share reaches. |

A skill of your own named `opencode-gws` or `opencode-gws-recipes` (for example in `~/.claude/skills`) hides the plugin's skill of that name; `/gws-status` names it under **Hidden skills**, and the fix is to move or rename it. A skill that tells agents to run `gws` in a shell, such as the gws CLI's own `gws-*` skills, leads them around the plugin's plans and approvals; `/gws-status` names each one under **Shell gws skills**, and the fix is to remove it or move it out of its skills folder.

Each OpenCode server keeps a private work folder, `$TMPDIR/opencode-gws-XXXXXX`, and removes it when it stops. A server that stopped without closing leaves its folder behind; the next start removes such folders once they are a day old and their process is gone.

`gws` uses the OpenCode service's proxy settings, for example `opencode service set env HTTPS_PROXY http://proxy.example:8080`. All codes: [Errors](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#errors).

## Uninstall

1. Sign out each account while the plugin is still installed: in `/connect`, or with `opencode auth logout gws-<alias>` (`gws-default` for the default account). After the plugin is removed, its sign-ins no longer appear.
2. Remove the plugin:

   ```sh
   opencode plugin remove @joe-broadhead/opencode-gws
   ```

3. Delete its folders. The state folder holds the audit log (`audit.jsonl`, and `audit.jsonl.1` once it passes 5 MiB); the cache folder holds Google's API descriptions. Neither holds a credential.

   | | macOS | Linux |
   | --- | --- | --- |
   | State | `~/Library/Application Support/opencode-gws` | `~/.local/state/opencode-gws` |
   | Cache | `~/Library/Caches/opencode-gws` | `~/.cache/opencode-gws` |

   `$XDG_STATE_HOME/opencode-gws` and `$XDG_CACHE_HOME/opencode-gws` replace them when those variables are set, and `audit.path` names its own file.
4. Remove any permission block you copied into an agent's own `permissions`.

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
