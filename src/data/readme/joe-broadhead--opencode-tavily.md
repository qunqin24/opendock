# Tavily for OpenCode

Search, extract, map, crawl and research the web from OpenCode through Tavily's official MCP server. The plugin
registers the server, adds default permission rules and tells you what is signed in; Tavily owns the five tools and
their parameters.

Unofficial; not affiliated with Tavily. Tavily is a trademark of Tavily Inc.; this unofficial plugin is not endorsed by
them.

## Requirements

- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. A later 2.4 release, such as 2.4.99, runs and `/tavily-status` calls it
  untested. Outside the range the plugin does not start, unless you set `allowUntestedHost`.
- macOS or Linux.
- A Tavily account. Each call spends your Tavily credits.

## Install

```sh
opencode plugin add github:we-the-rebel-alliance/tavily-plugin#v0.0.0
opencode reload
```

Then run `/tavily-status` in a session. Or add it to `opencode.json`:

```json
{ "plugins": [{ "package": "github:we-the-rebel-alliance/tavily-plugin#v0.0.0" }] }
```

`v0.0.0` is the first release; its commit carries the built `dist/`, so the install runs no build. A Git install does
not update by itself: remove the old entry with `opencode plugin remove`, then add the new tag.

## Sign in

Run `/connect` and choose **Tavily account** for OAuth. OpenCode's own **Tavily** entry connects an API key instead;
`TAVILY_API_KEY` in the OpenCode server's environment works too. A connected key wins over the variable. Tavily's MCP
server accepts any key, so the plugin asks Tavily's usage endpoint once per key, which costs no credits.

## Use

| Tool | Code Mode name | Permission name |
| --- | --- | --- |
| Search | `tools.tavily.tavily_search` | `tavily_tavily_search` |
| Extract | `tools.tavily.tavily_extract` | `tavily_tavily_extract` |
| Map | `tools.tavily.tavily_map` | `tavily_tavily_map` |
| Crawl | `tools.tavily.tavily_crawl` | `tavily_tavily_crawl` |
| Research | `tools.tavily.tavily_research` | `tavily_tavily_research` |

The `tavily` skill chooses the cheapest tool and cites its sources; `tavily-research` proposes the scope and cost of a
Research task before it starts. OpenCode's `websearch` tool uses Tavily too, unless `opencode.json` chooses another
provider.

## Costs

Every search, extract, map, crawl and research call spends Tavily credits from the signed-in account or key. A research
task costs 4-110 credits with mini and 15-250 with pro, and a crawl reads up to 50 pages by default. The plugin sets no
spending limit.

| Tool | Cost |
| --- | --- |
| Search | 1 credit (basic, fast, ultra-fast), 2 (advanced) |
| Extract | 1 per 5 pages read (basic), 2 per 5 (advanced); failed pages are free |
| Map | 1 per 10 pages found, 2 per 10 with instructions |
| Crawl | map's cost plus extract's for each page read |
| Research | 4-110 credits (mini), 15-250 (pro) per task |

A tool Tavily adds later is not classified by the plugin: the `access` option decides whether it runs, asks or is
denied, and `/tavily-status` counts it as unknown.

## Permissions

**Every tool is allowed by default.** The `access` option decides whether each tool runs, asks or is denied:

| Value | What runs | What asks or is denied |
| --- | --- | --- |
| `"all"` (the default) | the five tools, and a tool Tavily adds later | nothing |
| `"ask-changes"` | nothing: each of the five spends credits | the five tools, and a tool Tavily adds later: each asks |
| `"read-only"` | nothing | the five tools, and a tool Tavily adds later: they are **denied** |

The plugin inserts this block right after each agent's first base allow. Your own rules come later and win.

The default block, generated from `defaultRules()` for `access: "all"`:

```json
[
  { "action": "tavily_*", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_search", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_extract", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_map", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_crawl", "resource": "*", "effect": "allow" },
  { "action": "tavily_tavily_research", "resource": "*", "effect": "allow" }
]
```

## Configure

The plugin works without options. [Configuration](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/docs/configuration.md)
prints the block for `ask-changes` and `read-only` too, and covers the options (`websearch`, `executionTimeoutMs`,
`allowUntestedHost`, `access`), per-agent rules and API keys.

## Scripts and OpenCode automations

A script or an OpenCode automation can call the five tools with no model, through `opencode api`. It runs as a session
and its agent, under that agent's rules and the session's own, and spends credits as the tool does. Only an explicit
`allow` runs: an `ask` is refused. See [Scripting](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/docs/scripting.md).

```sh
opencode api post /api/rpc/tavily.web.tools/tavily_search \
  -H "x-opencode-directory:$PWD" \
  -d '{"input":{"sessionID":"ses_…","input":{"query":"OpenCode plugin API"}}}'
```

## Status

`/tavily-status` adds a status message without starting a model turn: connection, account, access, cost, sign-in, web
search, skills, tools, unguarded agents and one next step, `Nothing to do.` when everything is ready. The TUI also has
**Tavily: Status** and `/tavily`.

## Server instructions

OpenCode 2.4.1 passes an MCP server's instructions to the model verbatim and offers no override. Tavily's text claims
no other owner's job, so this plugin adds no counter-claim; the namespace line still marks page content as untrusted
data.

## Troubleshooting

Run `/tavily-status` first; it always ends with one next step. The plugin's own codes:

| Code | When | Next step |
| --- | --- | --- |
| `HOST_UNTESTED` | Start-up, outside `>=2.4.1 <2.5.0` | Use OpenCode 2.4.1, or set `allowUntestedHost`. With it, this is a warning. |
| `OPTIONS_INVALID` | Start-up | Fix the plugin's options in `opencode.json`. The message names the option. |
| `SKILLS_INVALID` | Start-up | Reinstall the plugin. |
| `KEY_UNAVAILABLE` | Log warning | Run `/connect` and choose **Tavily**, then connect the key again. |
| `KEY_WATCH_STOPPED` | Log warning | Restart OpenCode after you change the key. |
| `STATUS_UNAVAILABLE` | Status | Run `/tavily-status` again, and restart OpenCode if it keeps failing. |
| `UPSTREAM_ERROR` | A Tavily tool's result is Tavily's error object | Follow the next step in the message, by Tavily's status: 401 or 403, `/tavily-status`; 429, wait and retry; 432 or 433, the plan's limits; 5xx, wait and retry; any other, the input. |

## Links

- [Configuration](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/docs/configuration.md)
- [Scripting](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/docs/scripting.md)
- [Architecture](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/docs/architecture.md)
- [Security](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/SECURITY.md)
- [Contributing](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/CONTRIBUTING.md)
- [Changelog](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/CHANGELOG.md)
- [Issues](https://github.com/we-the-rebel-alliance/tavily-plugin/issues)
- [Tavily's MCP documentation](https://docs.tavily.com/documentation/mcp)

MIT licence; see [LICENSE](https://github.com/we-the-rebel-alliance/tavily-plugin/blob/master/LICENSE).
