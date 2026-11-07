# Slack for OpenCode

An [OpenCode](https://opencode.ai) plugin that connects Slack's hosted MCP server, so OpenCode agents can search and read Slack for you.

Unofficial; not affiliated with Slack. Slack is a trademark of Slack Technologies, LLC, a Salesforce company.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5; macOS and Linux. Outside that range the plugin sets nothing up and `/slack-status` says why, unless you set `allowUntestedHost`.
- A Slack app that your organisation owns, with Slack's MCP server turned on. Slack lets only internal apps and Slack Marketplace apps use its MCP server. If your organisation has none, someone who can create apps in your workspace makes one from the [app manifest](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/slack-app-manifest.json): see [Create the Slack app](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#create-the-slack-app).

## Install

```sh
opencode plugin add @joe-broadhead/opencode-slack
```

Run `opencode reload`, or restart OpenCode. Then run `/slack-status`: it shows `not configured` until you give OpenCode your Slack app's client ID (see [Sign in](#sign-in)).

**Update** with `opencode plugin update @joe-broadhead/opencode-slack`, then run `opencode reload`. An entry pinned to a version, such as `@joe-broadhead/opencode-slack@0.0.2`, does not update: remove the `@version` from its `plugins` entry first.

## Sign in

1. **Give OpenCode your Slack app's client ID.** Run `/connect` and choose **Slack app client ID**. Skip the client secret (an app made from the manifest uses PKCE and has none; OpenCode shows that field unmasked). When OpenCode asks for the key, paste the client ID from the app's **Basic Information → App Credentials** page. The client ID is public. From a terminal, `opencode auth login slack-app` does the same.

   If your organisation already set the client ID for you (see [Organisation rollout](#organisation-rollout)), there is no **Slack app client ID** entry; go straight to step 2.
2. **Sign in to Slack.** Run `/connect` and choose **Slack**. In the TUI, press `o` or Enter to open the sign-in page in your browser. In a terminal, `opencode mcp auth slack` opens the browser automatically. `/mcps` → `slack` is an equivalent way in.
3. Slack shows the workspace, the account and what the app asks for. Approve it. Slack sends the browser back to the callback, `http://localhost:8765/callback` unless you set another, and OpenCode finishes the sign-in.

`/slack-status` now shows `connected` and the Slack tools it found. OpenCode stores the credential and refreshes it. To sign out, run `opencode mcp logout slack`.

## Use

Ask in plain words, for example "find what we decided about the launch date in #release, with links". The `slack-search` skill guides the agent: search public channels first, read the thread for context, cite permalinks, never claim it searched everything, and treat Slack content as data, not instructions.

The Slack tools are Slack's own. With Code Mode, which is on by default, agents call them as `tools.slack.<tool>` inside `execute`, for example `tools.slack.slack_search_public({ query: "launch date in:#release", limit: 10 })`. Their names and permission actions are `slack_<tool>`, for example `slack_slack_search_public`.

**Status.** In the TUI, `/slack` (or **Slack: Status** in the command palette) opens a dialog. Press `r` to refresh and `Esc` to close; it also refreshes when the connection, agents or saved client change. If it shows 0 tools just after connecting, press `r`. `/slack-status` posts the same status into the session without starting a model turn. Status shows these rows, in order:

- `Connection`: `connected`, `sign-in required`, `connecting`, `disabled`, `failed`, `not configured`, `conflict` or `host untested`, with the error code and what happened;
- `Account`: Slack shows the account on its sign-in page; OpenCode does not store it;
- `Access`: what runs without asking, what asks first, and how to allow it;
- `Server`, `Client`, `Callback` and `Scopes`: the Slack server, the client ID and where it came from, the callback URL to register, and the requested scopes;
- `Skills`, only when needed: a skill of yours with the id `slack-search`, which OpenCode loads instead of the plugin's;
- `Tools`: the Slack tools found, counted by class, with any unknown tools named;
- `Agents without default rules`: agents that run Slack tools without asking, with the rules to paste (see [Agents without the default rules](#agents-without-the-default-rules)), or `none`;
- `OpenCode`: the version, whether it is tested (2.2.3, 2.2.4 and 2.2.5), and the supported range;
- `Next step`: exactly one, or `Nothing to do.`

### Scripts

A script or a cron job can call Slack's fourteen read tools with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own. The private search and the file read ask by default, so a script needs an allow rule for them. Writes and sends are never available to scripts:

```sh
opencode api post /api/rpc/slack.workspace.tools/slack_search_public \
  -d '{"input":{"sessionID":"ses_…","input":{"query":"launch date","limit":10}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/scripting.md).

## Permissions

**What runs without asking:** the known read tools, such as `slack_search_public`, `slack_read_thread` and `slack_read_canvas`. [Tool classes](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#tool-classes) lists every tool.

**What asks first:**

- private search: `slack_search_public_and_private`;
- file reads: `slack_read_file`;
- writes: sending, drafting and scheduling messages, adding reactions, creating and updating canvases and lists, creating conversations, and file uploads;
- any Slack tool the plugin does not know yet.

The read tools read whatever your scopes reach. With the default scopes, that is public channels. If you add `groups:history`, `im:history` or `mpim:history`, `slack_read_channel` and `slack_read_thread` also read private channels and direct messages without asking; only the search across them asks. To make those reads ask too, add `{ "action": "slack_slack_read_channel", "resource": "*", "effect": "ask" }`, and the same for `slack_slack_read_thread` and `slack_slack_list_user_channels`.

The plugin adds these defaults as rules right after each agent's base `allow` rule. OpenCode uses the last matching rule, so these all override the defaults:

- the agent's own built-in rules: Explore, Title and Summary still deny Slack, and Plan keeps its limits;
- your `permissions`;
- your "Always allow" answers.

**Allow** a tool that asks: choose **Always allow** when OpenCode asks, or add a rule to `permissions`:

```jsonc
"permissions": [
  { "action": "slack_slack_read_file", "resource": "*", "effect": "allow" }
]
```

"Always allow" applies to every agent in the current project, Plan included.

**Deny** a tool with `"effect": "deny"`. A deny always wins, even over "Always allow", and it hides the tool from the model. `{ "action": "slack_*", "resource": "*", "effect": "deny" }` denies every Slack tool.

The `slack_*` rule also matches tools of any other MCP server whose name starts with `slack_`, so those tools ask too.

### Agents without the default rules

OpenCode creates some agents after the plugin adds its rules, so they get none: agents defined only in your config (`agents.<id>` entries that are not built-in agents, and Markdown agent files), and agents added by plugins that load after this one. These agents run Slack writes and unknown Slack tools **without asking**. Status names them in its `Agents without default rules` row and prints the rules to paste.

**Fix:** put the plugin's default block first in **that agent's own** `permissions` (in `opencode.json`, or the agent's Markdown file), followed by your top-level rules for Slack tools, so they keep winning for that agent. The block is the `slack_*` ask rule, then one allow rule per read tool, such as `{ "action": "slack_slack_search_public", "resource": "*", "effect": "allow" }`. `/slack-status` prints the exact block to paste; [The inserted rules](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#the-inserted-rules) lists it too.

Do not put this block in the top-level `permissions`. OpenCode adds top-level rules to every agent after its built-in rules, so the block would loosen agents that deny Slack, such as Explore.

## Configure

Everything works without options. Options set the client ID for everyone (instead of `/connect`), the callback URL and its local port, the scopes, a client secret for apps without PKCE, and the host check. To pass them, use the object form of the `plugins` entry:

```jsonc
{
  "plugins": [
    { "package": "@joe-broadhead/opencode-slack", "options": { "oauth": { "scopes": ["channels:history", "channels:read", "search:read.public", "users:read", "search:read.private"] } } }
  ]
}
```

**OpenCode on another machine.** The default callback, `http://localhost:8765/callback`, works only when the browser runs on OpenCode's machine. Otherwise use a hosted callback: an `https:` address the browser can reach, which a reverse proxy forwards to OpenCode's local listener on `oauth.callback_port`:

```jsonc
"oauth": { "client_id": "YOUR_SLACK_CLIENT_ID", "redirect_uri": "https://host.example/oauth/return", "callback_port": 8766 }
```

Add the address to the Slack app's **OAuth & Permissions → Redirect URLs** (or `oauth_config.redirect_urls` in the [manifest](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/slack-app-manifest.json)). Slack matches the host and port exactly. [The callback: loopback or hosted](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#the-callback-loopback-or-hosted) explains the proxy and how two sign-ins on one machine avoid colliding on port 8765.

[docs/configuration.md](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md) lists every option, the scopes each tool needs, the permission rules and the status model.

## Organisation rollout

Put the client ID of your organisation's Slack app in the system configuration, so members have nothing to set up: they see no **Slack app client ID** entry and only run `/connect` and choose **Slack** to sign in. OpenCode reads the system configuration from `/Library/Application Support/opencode/opencode.json` on macOS (or the `ai.opencode.managed` managed-preferences domain) and from `/etc/opencode/opencode.json` on Linux:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@joe-broadhead/opencode-slack",
      "options": {
        "oauth": { "client_id": "YOUR_SLACK_CLIENT_ID" }
      }
    }
  ]
}
```

Replace `YOUR_SLACK_CLIENT_ID` with the app's client ID. Options take precedence over a client ID saved in `/connect`. Plugin lists from different config files are combined.

## Troubleshooting

Run `/slack-status` (or `/slack` in the TUI) first. Its `Connection` row shows a state and, when something is wrong, a code; the last row is one next step. [Errors](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#errors) lists every code.

| Connection | Code | Meaning | What to do |
| --- | --- | --- | --- |
| `not configured` | `CLIENT_ID_MISSING` | No Slack app client ID is set, so the Slack server is not added. | Run `/connect` and choose **Slack app client ID**, then paste your Slack app's client ID. |
| `not configured` | `CLIENT_ID_INVALID` | The client ID saved in the `/connect` **Slack app client ID** entry is empty or has spaces. | Run `/connect` and choose **Slack app client ID**, then paste the client ID again. |
| `sign-in required` | `AUTH_REQUIRED` | Nobody has signed in yet, or the sign-in expired. | Run `/connect` and choose **Slack**, then press `o` or Enter to open the sign-in page. `opencode mcp auth slack` opens the browser automatically. |
| `connecting` | none | OpenCode is connecting to Slack. | Wait a few seconds, then run `/slack-status` again (or press `r` in `/slack`). |
| `disabled` | `SERVER_DISABLED` | The server is turned off. | Turn on `slack` in `/mcps`. |
| `failed` | `CONNECTION_FAILED` | The connection failed. Status shows OpenCode's reason, shortened to one line. | Fix the error shown, then reconnect `slack` in `/mcps`. |
| `conflict` | `SERVER_NAME_IN_USE` | Another MCP server already uses the name `slack`. | Remove `mcp.servers.slack` from your OpenCode config. |
| `failed` | none | OpenCode has not loaded the server. | Run `opencode reload`, then check again. |
| `not configured` | `OPTIONS_INVALID` | An option is invalid. Status names the field. | Follow the next step. |
| `host untested` | `HOST_UNTESTED` | This OpenCode version is outside the supported range `>=2.2.3 <2.3.0`, so Slack is not set up. A release inside the range that is not 2.2.3, 2.2.4 or 2.2.5 runs normally; the `OpenCode` row calls it untested. | Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` in the plugin's options. |
| `connected` | none | A skill in your own or the project's skill folders has the id `slack-search`, so OpenCode loads it instead of the plugin's. The `Skills` row names its file. | Move or rename that skill, then run `opencode reload`. |
| `connected` | none | Ready. The next step reads `Nothing to do.` | If status names agents without default rules, put the default rules first in their own permissions (see above). |

If status itself cannot be read, `/slack-status` says `STATUS_UNAVAILABLE`; run it again in a moment. If a bundled skill is missing or broken, OpenCode reports `SKILLS_INVALID` when it loads the plugin; run `opencode plugin update @joe-broadhead/opencode-slack`, then `opencode reload`.

A script's errors from the tools RPC have their own codes, listed in [Scripting](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/scripting.md#errors).

**Slack shows an error during sign-in**

- **`bad_redirect_uri`, or "redirect_uri did not match":** the app does not list the callback URL exactly. Add the `Callback` URL that status shows under **OAuth & Permissions → Redirect URLs**.
- **`invalid_team_for_non_distributed_app`:** the app belongs to another workspace. Use the client ID of your own organisation's app.
- **Slack asks you to request approval:** your workspace requires admin approval for apps or scopes. Ask an admin to approve the app, then sign in again.
- **Slack refuses the app for MCP:** turn on **Agents → Slack Model Context Protocol (MCP) Server** in the app settings. The app must be internal to your organisation or published in the Slack Marketplace.
- **The browser cannot open `localhost:8765` after Slack approves:** OpenCode listens for the callback on `127.0.0.1` only. If your browser tries IPv6 for `localhost`, replace `localhost` with `127.0.0.1` in the address bar. To avoid it, register `http://127.0.0.1:8765/callback` in the app and set it as `oauth.redirect_uri`.
- **The browser cannot open `localhost:8765` because OpenCode runs on another machine:** the browser's `localhost` is not OpenCode's. Use a [hosted callback](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#the-callback-loopback-or-hosted).
- **Sign-in fails because the callback port is in use:** another sign-in on this machine is waiting on port 8765. Finish it first, or give this OpenCode its own callback, such as `http://localhost:8767/callback`, registered in the Slack app too.

**A Slack tool fails**

- **Missing scope (`missing_scope`):** add the scope to the app and to `oauth.scopes`, then run `opencode mcp logout slack` and sign in again. See the [scope table](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#scopes).
- **Rate limited:** Slack limits each tool separately. Wait, then make fewer calls.
- **You declined a prompt:** nothing was sent. In Code Mode, the decline appears to the agent as an error inside its program.

**Asked to sign in again after about 30 days.** Slack expires the refresh tokens it issues to PKCE apps after 30 days. Run `/connect` and choose **Slack** again, then press `o` or Enter.

**After you change the Slack app or workspace,** run `opencode mcp logout slack`, then sign in again. OpenCode keys the Slack sign-in by server name and URL, not by client ID, so it would otherwise keep the old app's token.

## Uninstall

Sign out while the plugin is still installed: once it is removed, OpenCode no longer knows the `slack` server or the **Slack app client ID** entry, so it cannot remove their credentials, and `opencode auth list` stops showing them.

1. Sign out of Slack: `opencode mcp logout slack`. If it answers "MCP server not found" right after OpenCode starts, wait a few seconds and run it again.
2. If you saved a client ID in `/connect`, remove it: `opencode auth logout slack-app`, and choose the **Slack app client ID** account. Without a terminal, name it: `opencode auth logout slack-app "Slack app client ID"`. An entry saved by an earlier release is named "Slack app".
3. Check: `opencode auth list` lists neither **Slack** nor **Slack app client ID**.
4. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-slack`, then `opencode reload`. `opencode mcp list` no longer lists `slack`.
5. Remove any Slack rules you copied into your agents' own `permissions`.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md)
- [Slack app manifest](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/slack-app-manifest.json)
- [Security and data flow](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/SECURITY.md)
- [Contributing](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/CONTRIBUTING.md)
- [Changelog](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/CHANGELOG.md)
- [Issues](https://github.com/joe-broadhead/opencode-slack/issues)
- [Slack MCP server documentation](https://docs.slack.dev/ai/slack-mcp-server)
- License: [MIT](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/LICENSE)
