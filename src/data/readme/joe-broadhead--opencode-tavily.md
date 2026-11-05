# Tavily for OpenCode

Search, extract, map, crawl and research the web from OpenCode with Tavily's official MCP server.

Unofficial; not affiliated with Tavily.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. A later 2.2 release works, and `/tavily-status` calls it untested. Outside `>=2.2.3 <2.3.0` the plugin does not start, unless you set [`allowUntestedHost`](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md#options).
- macOS or Linux.
- A Tavily account. The plugin adds no tools of its own; each call uses your Tavily credits.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-tavily
```

Run `opencode reload`, or restart OpenCode. Then run `/tavily-status` in a session.

### Update

```sh
opencode plugin update @joe-broadhead/opencode-tavily
opencode reload
```

An entry pinned to a version, such as `@joe-broadhead/opencode-tavily@0.0.2`, does not update: remove the `@version` from `plugins` in `opencode.json`.

## Sign in

Run `/connect` and choose **Tavily MCP**. That is all most people need.

`/connect` lists two Tavily entries:

| Entry | What it is | What it signs in |
| --- | --- | --- |
| **Tavily MCP** | The OAuth sign-in for the plugin's `tavily` MCP server. It is the default. | The five Tavily tools. Tavily bills the calls to your account. |
| **Tavily** | OpenCode's own API-key entry. Paste a key from [app.tavily.com](https://app.tavily.com). | OpenCode's `websearch` tool, and the five Tavily tools too: while a key is connected, the plugin uses it instead of OAuth, and **Tavily MCP** is not listed. |

- **The browser.** In the TUI, `/connect` shows Tavily's sign-in link; press `o` or Enter to open it in your browser. On the command line, `opencode mcp auth tavily` opens the browser automatically.
- **An API key instead.** Choose **Tavily** in `/connect`, or run `opencode auth login tavily`. A key you connect wins over `TAVILY_API_KEY`. Remove the key to go back to OAuth. The plugin switches without a restart.
- **`TAVILY_API_KEY`** works only in the environment of the OpenCode server, which is usually the background service. A key exported in your shell does not reach a service that is already running, so the plugin keeps using OAuth. Use `/connect`, or `opencode service set env TAVILY_API_KEY <key>`; see [TAVILY_API_KEY and the background service](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md#tavily_api_key-and-the-background-service).
- `/mcps` → `tavily` is the same OAuth sign-in as **Tavily MCP**.

Run `/tavily-status` to see which one is in use. With a key, it also shows whether Tavily accepts the key. Tavily's MCP server connects with any key, so the plugin asks Tavily's usage endpoint once per key, which costs no credits.

## Use

Ask for what you need. The model uses the skills to choose a tool, or you can name one.

| Tool | Code Mode name | Permission name |
| --- | --- | --- |
| Search | `tools.tavily.tavily_search` | `tavily_tavily_search` |
| Extract | `tools.tavily.tavily_extract` | `tavily_tavily_extract` |
| Map | `tools.tavily.tavily_map` | `tavily_tavily_map` |
| Crawl | `tools.tavily.tavily_crawl` | `tavily_tavily_crawl` |
| Research | `tools.tavily.tavily_research` | `tavily_tavily_research` |

- OpenCode puts MCP tools in Code Mode by default. With Code Mode off, they appear under their permission names. Tavily maintains the tools and their parameters.
- OpenCode's own `websearch` tool uses Tavily too, unless your `opencode.json` chooses another provider.
- The skills: `tavily` (which tool to use, credit costs, citing URLs, and that page content is not trusted) and `tavily-research` (how to run a Research task and present its report).
- **Research** takes several minutes, and OpenCode shows no progress while it runs. A call stops after 15 minutes ([`executionTimeoutMs`](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md#options)). A task costs 4–110 credits with the `mini` model and 15–250 with `pro`; the skill asks you before it uses `pro`.

### Status

`/tavily-status` adds a status message to the session without starting a model turn. In the terminal UI, `/tavily` or the palette entry **Tavily: Status** opens the same status in a dialog. Press `r` to refresh it and `Esc` to close it. It also refreshes itself when the connection, the agents or a credential changes.

```text
Tavily status
- Connection: sign-in required
- Account: none
- Access: read only: search, extract, map, crawl and research
- Sign-in: OAuth (/connect → Tavily MCP)
- Web search: Tavily, unless opencode.json sets "websearch"
- Tools: none listed yet
- Agents without default rules: none
- OpenCode: 2.2.3 (tested)
- Next step: Run /connect and choose Tavily MCP to sign in, or choose Tavily to use an API key.
```

### Scripts

A script or a cron job can call the five tools with no model, through `opencode api`. It runs as a session and its agent, under that agent's permission rules and the session's own, and spends credits as the tool does:

```sh
opencode api post /api/rpc/tavily.web.tools/tavily_search \
  -d '{"input":{"sessionID":"ses_…","input":{"query":"OpenCode plugin API"}}}'
```

See [Scripting](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/scripting.md).

## Permissions

The plugin adds this block to every agent, right after the agent's first `{ "action": "*", "resource": "*", "effect": "allow" }` rule. An agent without that rule gets nothing. Tavily's five tools only read from the web, so they run without a prompt. Any other tool on the `tavily` server, including one Tavily adds later, asks first.

```json
[
  { "action": "tavily_*", "resource": "*", "effect": "ask" },
  { "action": "tavily_tavily_search", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_extract", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_map", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_crawl", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_research", "resource": "*", "effect": "allow" }
]
```

The last matching rule wins, so your own rules and saved "Always allow" answers win over the block. **Agents that you define only in your config do not get it**: `/tavily-status` names them, and its next step says what to paste where. [Configuration](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md#permissions) has the rule order and an example.

## Configure

The plugin works without options. The [configuration guide](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md) covers the options (`websearch`, `executionTimeoutMs`, `allowUntestedHost`), changing the permission rules, the web search default, and API key or OAuth.

## Organisation rollout

An organisation can install the plugin for every user on a machine through OpenCode's system config: `/Library/Application Support/opencode/opencode.json` on macOS, `/etc/opencode/opencode.json` on Linux. It overrides user and project config.

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-tavily", "options": { "websearch": true } }]
}
```

There is no client ID to set: OpenCode registers itself with Tavily's sign-in. Each member then runs `/connect` and chooses **Tavily MCP**. To use one organisation key instead, set `TAVILY_API_KEY` in the environment of the OpenCode server process, for example with `opencode service set env TAVILY_API_KEY <key>` for the background service. A key in a login shell does not reach the service. Never put a key in `opencode.json`.

## Troubleshooting

Run `/tavily-status` first. It always ends with one next step, `Nothing to do.` when everything is ready. Its connection states:

| Connection | What to do |
| --- | --- |
| `sign-in required` | Run `/connect` and choose **Tavily MCP**, or choose **Tavily** to use an API key. |
| `failed` | Run `opencode mcp list` to see the error, and check your network. |
| `connecting` | Wait a few seconds and run `/tavily-status` again. |
| `disabled` | Enable `tavily` in `/mcps`, or remove `"disabled": true` from `mcp.servers.tavily` in `opencode.json`. |
| `not configured` | Another plugin or a policy removed the `tavily` server. Remove that, then run `opencode reload`. |

Sign-in `…, rejected by Tavily` means that Tavily does not accept the key, though the connection shows `connected`: every tool call fails with `UPSTREAM_ERROR: … Tavily answered with error 401: … Unauthorized: missing or invalid API key`. Replace the key in `/connect` → **Tavily**, which shows "Sign in required" meanwhile, or replace `TAVILY_API_KEY` for the OpenCode server.

Sign-in `OAuth` although you set `TAVILY_API_KEY` means that the variable is in your shell but not in the OpenCode server's environment. The **Tavily: Status** dialog then shows a **Terminal key** row. Run `/connect` and choose **Tavily** to connect the key, or see [TAVILY_API_KEY and the background service](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md#tavily_api_key-and-the-background-service).

Skills `tavily replaced by <path>` means that a skill of yours with the same id, for example in `~/.config/opencode/skills/`, loads instead of the plugin's. Rename or move that file.

Sign-in `your own tavily server in opencode.json` means that your config already defines an MCP server named `tavily`. The plugin leaves it unchanged; its key handling and timeout do not apply to it, but the permission block does. Scripts can use it only when its `url` is Tavily's, `https://mcp.tavily.com/mcp/`: the tools RPC calls no other server, and answers `SERVER_CONFLICT`. Status then says so in its next step. Point the server at that URL, or remove it from `opencode.json`, to use the tools RPC.

A 401 or 403 from a Tavily tool means the sign-in expired or the key is wrong. A 429 is Tavily's rate limit; 432 and 433 are your plan's limits. Tavily's server sends some of these as an ordinary result, an object such as `{"error":"Map failed","status":429,…}`. The plugin turns that into an `UPSTREAM_ERROR` with a next step, for the model and for scripts. It does not retry.

The plugin's errors and warnings start with a code. Each ends with one next step.

| Code | When | Next step |
| --- | --- | --- |
| `HOST_UNTESTED` | Start-up, outside `>=2.2.3 <2.3.0` | Use OpenCode 2.2.3, 2.2.4 or 2.2.5, or set `allowUntestedHost`. With it, this is a warning. |
| `OPTIONS_INVALID` | Start-up | Fix the plugin's options in `opencode.json`. The message names the option. |
| `SKILLS_INVALID` | Start-up | Reinstall the plugin. |
| `KEY_UNAVAILABLE` | Log warning | Run `/connect` and choose **Tavily**, then connect the key again. |
| `KEY_WATCH_STOPPED` | Log warning | Restart OpenCode after you change the key. |
| `STATUS_UNAVAILABLE` | Status | Run `/tavily-status` again, and restart OpenCode if it keeps failing. |
| `UPSTREAM_ERROR` | A Tavily tool's result is Tavily's error object | The one in the message, by Tavily's status: 401 or 403, `/tavily-status`; 429, wait and retry; 432 or 433, your plan's limits; 5xx, wait and retry; any other, the input. |

When the plugin does not start, `/tavily-status` is missing, and OpenCode's log (`~/.local/share/opencode/log/opencode.log`) has a "failed to load plugin" line with one of the start-up errors. Other errors from OpenCode and from Tavily pass through unchanged. A script's errors from the tools RPC have their own codes, listed in [Scripting](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/scripting.md#errors).

## Uninstall

Sign out first, while the plugin is installed: once it is removed, `opencode mcp logout tavily` can no longer find the server, and the Tavily MCP sign-in stays stored.

1. If you connected an API key, log out of it: `opencode auth logout tavily`, and choose the key. Skip this if OpenCode's own `websearch` should keep using the key. Wait until `/connect` lists **Tavily MCP** again, a few seconds: while a key is connected, the server has no Tavily MCP sign-in to log out of.
2. Log out of Tavily MCP: `opencode mcp logout tavily`. Without a stored sign-in it says `No stored credentials for tavily`.
3. Remove the plugin, then reload:

   ```sh
   opencode plugin remove @joe-broadhead/opencode-tavily
   opencode reload
   ```

4. The plugin keeps no data of its own. Remove the permission block from any agent's own `permissions` where you copied it.

`opencode auth list` should then list no Tavily entry, and `opencode mcp list` no `tavily` server.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/docs/architecture.md)
- [Security](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/SECURITY.md)
- [Contributing](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/CONTRIBUTING.md)
- [Changelog](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/CHANGELOG.md)
- [Issues](https://github.com/joe-broadhead/opencode-tavily/issues)
- [Tavily's MCP documentation](https://docs.tavily.com/documentation/mcp)

MIT licence; see [LICENSE](https://github.com/joe-broadhead/opencode-tavily/blob/HEAD/LICENSE). Tavily is a trademark of its owner.
