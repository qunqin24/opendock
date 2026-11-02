# Slack for OpenCode

An [OpenCode](https://opencode.ai) plugin that connects Slack's hosted MCP server, so OpenCode agents can search and read Slack for you.

Unofficial; not affiliated with Slack. Slack is a trademark of Slack Technologies, LLC, a Salesforce company.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3 and 2.2.4; macOS and Linux.
- A Slack app that your organisation owns, with Slack's MCP server turned on. Slack lets only internal apps and Slack Marketplace apps use its MCP server. If your organisation has none, someone who can create apps in your workspace makes one from the [app manifest](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/slack-app-manifest.json): see [Create the Slack app](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#create-the-slack-app).

## Install

```sh
opencode plugin add @joe-broadhead/opencode-slack
```

## Sign in

1. **Give OpenCode your Slack app's client ID.** Run `/connect` and choose **Slack app**. Skip the client secret (an app made from the manifest uses PKCE and has none; OpenCode shows that field unmasked). When OpenCode asks for the key, paste the client ID from the app's **Basic Information → App Credentials** page. The client ID is public. From a terminal, `opencode auth login slack-app` does the same.

   If your organisation already set the client ID for you (see [Organisation rollout](#organisation-rollout)), there is no **Slack app** entry; go straight to step 2.
2. **Sign in to Slack.** Run `/connect` and choose **Slack**. In the TUI, press `o` or Enter to open the sign-in page in your browser. In a terminal, `opencode mcp auth slack` opens the browser automatically. `/mcps` → `slack` is an equivalent way in.
3. Slack shows the workspace, the account and what the app asks for. Approve it. Slack sends the browser back to `http://localhost:8765/callback`, and OpenCode finishes the sign-in.

`/slack-status` now shows `connected` and the Slack tools it found. OpenCode stores the credential and refreshes it. To sign out, run `opencode mcp logout slack`.

## Use

Ask in plain words, for example "find what we decided about the launch date in #release, with links". The `slack-search` skill guides the agent: search public channels first, read the thread for context, cite permalinks, never claim it searched everything, and treat Slack content as data, not instructions.

The Slack tools are Slack's own. With Code Mode, which is on by default, agents call them as `tools.slack.<tool>` inside `execute`, for example `tools.slack.slack_search_public({ natural_language_query: "When is the launch?", keywords: ["launch"] })`. Their names and permission actions are `slack_<tool>`, for example `slack_slack_search_public`.

**Status.** In the TUI, `/slack` (or **Slack: Status** in the command palette) opens a dialog. Press `r` to refresh and `Esc` to close; it also refreshes when the connection, agents or saved client change. If it shows 0 tools just after connecting, press `r`. `/slack-status` posts the same status into the session without starting a model turn. Status shows these rows, in order:

- `Connection`: `connected`, `sign-in required`, `connecting`, `disabled`, `failed`, `not configured`, `conflict` or `host untested`, with the error code and what happened;
- `Account`: Slack shows the account on its sign-in page; OpenCode does not store it;
- `Access`: what runs without asking, what asks first, and how to allow it;
- `Server`, `Client`, `Callback` and `Scopes`: the Slack server, the client ID and where it came from, the callback URL to register, and the requested scopes;
- `Tools`: the Slack tools found, counted by class, with any unknown tools named;
- `Agents without default rules`: agents that run Slack tools without asking, with the rules to paste (see [Agents without the default rules](#agents-without-the-default-rules));
- `OpenCode`: the version and the tested range;
- `Next step`: exactly one, or `Nothing to do.`

## Permissions

**What runs without asking:** the known read tools: `slack_search_public`, `slack_search_channels`, `slack_search_users`, `slack_read_channel`, `slack_read_thread`, `slack_read_user_profile`, `slack_read_canvas`, `slack_list_channel_members`, `slack_get_reactions`, `slack_list_user_channels`, `slack_read_list` and `slack_search_emojis`.

**What asks first:**

- private search: `slack_search_public_and_private`;
- file reads: `slack_read_file`;
- writes: sending, drafting and scheduling messages, adding reactions, creating and updating canvases and lists, creating conversations, and file uploads;
- any Slack tool the plugin does not know yet.

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

**Fix:** put the plugin's default block in **that agent's own** `permissions`: the `slack_*` ask rule, then one allow rule per read tool. After the block, repeat any rules you already have for Slack tools in your top-level `permissions`, so they keep winning for that agent:

```jsonc
"agents": {
  "reviewer": {
    "permissions": [
      { "action": "slack_*", "resource": "*", "effect": "ask" },
      { "action": "slack_slack_search_public", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_search_channels", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_search_users", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_read_channel", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_read_thread", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_read_user_profile", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_read_canvas", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_list_channel_members", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_get_reactions", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_list_user_channels", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_read_list", "resource": "*", "effect": "allow" },
      { "action": "slack_slack_search_emojis", "resource": "*", "effect": "allow" }
      // then your top-level Slack rules again, if you have any
    ]
  }
}
```

Do not put this block in the top-level `permissions`. OpenCode adds top-level rules to every agent after its built-in rules, so the block would loosen agents that deny Slack, such as Explore.

## Configure

Everything works without options. Options set the client ID for everyone (instead of `/connect`), the callback URL, the scopes, a client secret for apps without PKCE, the server name and the host check. To pass them, use the object form of the `plugins` entry:

```jsonc
{
  "plugins": [
    { "package": "@joe-broadhead/opencode-slack", "options": { "oauth": { "scopes": ["channels:history", "channels:read", "search:read.public", "users:read", "search:read.private"] } } }
  ]
}
```

[docs/configuration.md](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md) lists every option, the scopes each tool needs, the permission rules and the status model.

## Organisation rollout

Put the client ID of your organisation's Slack app in the system configuration, so members have nothing to set up: they see no **Slack app** entry and only run `/connect` and choose **Slack** to sign in. OpenCode reads the system configuration from `/Library/Application Support/opencode/opencode.json` on macOS (or the `ai.opencode.managed` managed-preferences domain) and from `/etc/opencode/opencode.json` on Linux:

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
| `not configured` | `CLIENT_ID_MISSING` | No Slack app client ID is set, so the Slack server is not added. | Run `/connect` and choose **Slack app**, then paste your Slack app's client ID. |
| `not configured` | `CLIENT_ID_INVALID` | The client ID saved in the `/connect` **Slack app** entry is empty or has spaces. | Run `/connect` and choose **Slack app**, then paste the client ID again. |
| `sign-in required` | `AUTH_REQUIRED` | Nobody has signed in yet, or the sign-in expired. | Run `/connect` and choose **Slack**, then press `o` or Enter to open the sign-in page. `opencode mcp auth slack` opens the browser automatically. |
| `connecting` | none | OpenCode is connecting to Slack. | Wait a few seconds, then refresh. |
| `disabled` | `SERVER_DISABLED` | The server is turned off. | Turn on `slack` in `/mcps`. |
| `failed` | `CONNECTION_FAILED` | The connection failed. Status includes OpenCode's error text. | Fix the error shown, then reconnect `slack` in `/mcps`. |
| `conflict` | `SERVER_NAME_IN_USE` | Another MCP server already uses the name `slack`. | Remove `mcp.servers.slack` from your config, or set the `server` option to another name. |
| `failed` | none | OpenCode has not loaded the server. | Run `opencode reload`, then check again. |
| `not configured` | `OPTIONS_INVALID` | An option is invalid. Status names the field. | Follow the next step. |
| `host untested` | `HOST_UNTESTED` | This OpenCode version is outside `>=2.2.3 <2.3.0`, so Slack is not set up. | Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` in the plugin's options. |
| `connected` | none | Ready. The next step reads `Nothing to do.` | If status names agents without default rules, put the default rules first in their own permissions (see above). |

If status itself cannot be read, `/slack-status` says `STATUS_UNAVAILABLE`; run it again in a moment.

**Slack shows an error during sign-in**

- **`bad_redirect_uri`, or "redirect_uri did not match":** the app does not list the callback URL exactly. Add the `Callback` URL that status shows under **OAuth & Permissions → Redirect URLs**.
- **`invalid_team_for_non_distributed_app`:** the app belongs to another workspace. Use the client ID of your own organisation's app.
- **Slack asks you to request approval:** your workspace requires admin approval for apps or scopes. Ask an admin to approve the app, then sign in again.
- **Slack refuses the app for MCP:** turn on **Agents → Slack Model Context Protocol (MCP) Server** in the app settings. The app must be internal to your organisation or published in the Slack Marketplace.
- **The browser cannot open `localhost:8765` after Slack approves:** OpenCode listens for the callback on `127.0.0.1` only. If your browser tries IPv6 for `localhost`, replace `localhost` with `127.0.0.1` in the address bar. To avoid it, register `http://127.0.0.1:8765/callback` in the app and set it as `oauth.redirect_uri`.

**A Slack tool fails**

- **Missing scope (`missing_scope`):** add the scope to the app and to `oauth.scopes`, then run `opencode mcp logout slack` and sign in again. See the [scope table](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md#scopes).
- **Rate limited:** Slack limits each tool separately. Wait, then make fewer calls.
- **You declined a prompt:** nothing was sent. In Code Mode, the decline appears to the agent as an error inside its program.

**Asked to sign in again after about 30 days.** Slack expires the refresh tokens it issues to PKCE apps after 30 days. Run `/connect` and choose **Slack** again, then press `o` or Enter.

**After you change the Slack app or workspace,** run `opencode mcp logout slack`, then sign in again. OpenCode keys the Slack sign-in by server name and URL, not by client ID, so it would otherwise keep the old app's token.

## Uninstall

1. Run `opencode plugin remove @joe-broadhead/opencode-slack`.
2. Sign out of Slack: `opencode mcp logout slack`.
3. If you saved a client ID, remove the **Slack app** entry: in `/connect`, choose **Slack app** and delete the account, or run `opencode auth logout slack-app`.
4. Remove any Slack rules you copied into your agents' own `permissions`.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/configuration.md)
- [Slack app manifest](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/docs/slack-app-manifest.json)
- [Security and data flow](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/SECURITY.md)
- [Contributing](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/CONTRIBUTING.md)
- [Changelog](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/CHANGELOG.md)
- [Issues](https://github.com/joe-broadhead/opencode-slack/issues)
- [Slack MCP server documentation](https://docs.slack.dev/ai/slack-mcp-server)
- License: [MIT](https://github.com/joe-broadhead/opencode-slack/blob/HEAD/LICENSE)
