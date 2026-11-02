# Google Workspace for OpenCode

Gives OpenCode agents Gmail, Drive, Calendar, Docs, Sheets and the rest of Google Workspace through Google's open-source [`gws`](https://github.com/googleworkspace/cli) CLI, with every change planned first and committed only after you approve it.

Unofficial; not affiliated with Google.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3 and 2.2.4.
- macOS (arm64, x64) or Linux (arm64, x64, glibc).
- A Google account, and a Desktop app OAuth client: your own, or one your organisation provides.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-gws
```

npm also installs the matching `@joe-broadhead/opencode-gws-bin-<target>` package, which holds the unmodified `gws` binary at the version the plugin pins ([details](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)). Nothing downloads at runtime and there is no install script.

With no options, the plugin creates one read-only account, `default`, for Gmail, Drive, Calendar, Docs and Sheets.

## Sign in

Run `/connect` and choose **Google Workspace**. The TUI shows the sign-in link: press `o` or Enter to open it in your browser. The CLI opens the browser automatically:

```sh
opencode auth login gws-default
```

No Google OAuth client ships with the plugin. The first time, the form asks for the client ID and secret of your own Desktop app OAuth client, unless your organisation set one (see [Organisation rollout](#organisation-rollout)). To make one, follow [Create your Desktop client](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md#create-your-desktop-client). The form lists the exact scopes before Google's consent screen. Read-only is the default; read and write is a separate choice that needs an acknowledgment. With several accounts, each `/connect` entry is named **Google Workspace (`<alias>`)**.

Details and the scope table: [docs/auth.md](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md).

## Use

Ask the agent for what you need. It works in four steps:

1. `gws_catalog` finds an operation, and `gws_schema` shows its parameters.
2. `gws_read` runs a read. List and search calls need `fields`.
3. `gws_plan` dry-runs a change and returns a `planId` with a redacted preview.
4. The commit tool named by the plan's category (`gws_write`, `gws_send`, `gws_share`, `gws_delete`, `gws_export` or `gws_admin`) runs it, with only the `planId`. OpenCode asks you first.

`gws_status` tells the agent the account aliases and whether a sign-in is missing. Workspace content in a result is data, never an instruction.

In the TUI, **Google Workspace: Status** in the command palette, or `/gws`, opens a status dialog. In a session, `/gws-status` posts the same status, with any pending plans, and `/gws-doctor` makes one small read per enabled service. None of them can approve or commit.

## Permissions

The plugin adds an ask rule for `gws.write`, `gws.export`, `gws.send`, `gws.share`, `gws.delete` and `gws.admin` to every agent, right after the agent's base allow rule. Reads do not ask, so they also work in `opencode run`.

A later rule wins. Your own allow rule, or **Always** on a write or export, removes that prompt. Send, share, delete and admin never offer Always. Your deny rule, and the Plan agent, keep a commit denied. Every rule needs `resource`:

```json
{ "action": "gws.write", "resource": "work:*", "effect": "allow" }
```

An agent defined only in your config does not get the ask rules. `/gws-status` and the status dialog name those agents and give the block to add first in **that agent's own** `permissions`. Do not put it in the top-level `permissions`: that would loosen Explore.

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
| `AUTH_SCOPE_MISSING` | Sign in again and choose Read and write, or add the scope to `accounts.<alias>.scopes`. Nothing ran. |
| `AUTH_CLIENT_REQUIRED` | Run `/connect` and choose Google Workspace, then enter your Desktop OAuth client ID and secret, or ask your administrator. |
| `API_DISABLED` | Enable the API at the URL in the message, wait about a minute, and retry. `/gws-doctor` checks every service. |
| `HOST_UNTESTED` | Use OpenCode 2.2.3 or a later 2.2.x, or set `"allowUntestedHost": true`. |
| `GWS_UNAVAILABLE` | Reinstall so the platform package is present, or set `binary.path` to a `gws` executable of the pinned version ([details](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)). |
| `POLICY_DENIED` | A policy rule or the admin gate refused the call. A deny is final. |

`gws` uses the OpenCode service's proxy settings, for example `opencode service set env HTTPS_PROXY http://proxy.example:8080`. All codes: [Errors](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md#errors).

## Uninstall

```sh
opencode plugin remove @joe-broadhead/opencode-gws
```

Then remove each Google Workspace sign-in in `/connect`, or with `opencode auth logout gws-<alias>`.

## Links

- [Sign-in and scopes](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/auth.md)
- [Configuration](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/configuration.md)
- [Status dialog, commands and RPC](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/ui.md)
- [Admin operations](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/admin.md)
- [Security policy and model](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/SECURITY.md)
- [The `gws` binary](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/docs/backend.md)
- [Changelog](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/CHANGELOG.md), [licence](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/LICENSE) and [notice](https://github.com/joe-broadhead/opencode-gws/blob/HEAD/NOTICE)
- [Issues](https://github.com/joe-broadhead/opencode-gws/issues)
