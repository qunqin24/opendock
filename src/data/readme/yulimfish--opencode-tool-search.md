# @yulimfish/opencode-tool-search

> Dynamic tool loading for [opencode](https://opencode.ai), inspired by the
> [Kimi K3 tool-search pattern](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading).

> Note on the name: the unscoped `opencode-tool-search` package on npm belongs
> to another author with a different implementation. This project publishes
> under `@yulimfish/opencode-tool-search` to keep the namespaces distinct.

When a session accumulates dozens of tools (built-ins + MCP servers + custom
plugins), every request pays for the full `tools[]` catalog. The model also
loses accuracy as the option surface grows.

`opencode-tool-search` collapses the tools you designate as noisy (MCP servers
by default) into short stubs, exposes a single `tool_search` tool that the model
uses to discover them by keyword, and un-collapses tools once they've been
searched or used this session.

## Why not exactly the Kimi API pattern?

Kimi K3 lets clients dynamically inject `{role:"system", tools:[…]}` messages
mid-conversation. opencode's plugin runtime doesn't (yet) expose the outgoing
`tools[]` array to plugins, so we can't do the raw protocol thing.

Instead we use two opencode hooks that reach the same goal:

| Goal (Kimi API)                       | Achieved via                                    |
|---------------------------------------|-------------------------------------------------|
| top-level `tools[]` stays lean         | `tool.definition` hook rewrites descriptions to short stubs so the model's attention isn't consumed |
| `search_tools` reveals full definitions | custom `tool_search` tool, activated tools stay visible for the rest of the session |
| Activated tools persist across turns    | in-memory per-session set, keyed by tool id     |
| `tool_choice: required` on the first turn | not needed — the system-prompt hint tells the model to search first |

Same effect, different plumbing.

## Install

```bash
npm i -g @yulimfish/opencode-tool-search  # or per-project
```

Add to your `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["@yulimfish/opencode-tool-search"]
}
```

By default, everything under `mcp_*` / `mcp__*` gets collapsed. Restart opencode.

## Configure

Two ways, use whichever you like — options passed through `plugin` win over the
JSON file for scalar fields; the `tools` map is merged.

### 1) inline in `opencode.jsonc`

```jsonc
{
  "plugin": [
    ["@yulimfish/opencode-tool-search", {
      "hide": ["mcp_*", "figma_*", "yuque_*"],
      "keep": ["mcp_critical_tool"],
      "topK": 6,
      "descriptionLimit": 800,
      "injectSystemHint": true
    }]
  ]
}
```

### 2) stand-alone `~/.config/opencode/tool-search.json`

Handy for large tag catalogs:

```json
{
  "hide": ["mcp_*", "yuque_*"],
  "topK": 5,
  "tools": {
    "yuque_yuque_search": {
      "tags": ["knowledge", "wiki", "notes", "语雀"]
    },
    "yuque_yuque_get_doc": {
      "tags": ["read", "wiki", "语雀"]
    },
    "mcp_github_create_issue": {
      "tags": ["github", "issue", "create"],
      "description": "Create a GitHub issue in the given repo. Args: owner, repo, title, body."
    }
  }
}
```

## Options reference

| Field              | Type       | Default             | Meaning |
|--------------------|------------|---------------------|---------|
| `enabled`          | boolean    | `true`              | Master switch. |
| `hide`             | string[]   | `["mcp_*","mcp__*"]` | Wildcard patterns for tools to collapse. `*` = any run of chars, `?` = single, `re:...` = raw regex. |
| `keep`             | string[]   | `[]`                | Force-visible patterns; wins over `hide`. (`tool_search` is always kept.) |
| `topK`             | number     | `5`                 | Max results per search. |
| `descriptionLimit` | number     | `600`               | Chars per description before truncation. |
| `injectSystemHint` | boolean    | `true`              | Whether to append a hint paragraph to system prompts telling the model that `tool_search` exists. |
| `tools`            | object     | `{}`                | Per-tool overrides: `{ toolId: { tags?: string[], description?: string } }`. Tags feed the search index; a custom description replaces the LLM-facing one. |

## How the runtime behaves

1. **Every request** — for each tool opencode would send to the LLM, we hit the
   `tool.definition` hook. If the tool matches `hide` and hasn't been activated
   this session, we replace its description with `[hidden — call tool_search(…)
   to reveal]`. Parameters schemas are left intact (so the model can still call
   the tool without another round trip if it's confident).
2. **Model calls `tool_search`** — we rank by name/tag/description overlap,
   return the top K with their real descriptions + parameters, and mark each
   result as activated for the rest of the session.
3. **Model calls any tool** — we auto-activate it via `tool.execute.after`, so
   future turns get the full description without another search.
4. **System prompt** — via `experimental.chat.system.transform`, we append a
   short hint listing how many tools are currently collapsed.

## Verifying it works

After restart, prompt the model with a request that would hit a hidden MCP tool.
It should call `tool_search` first. In the log stream:

```
[tool-search] plugin initialized
[tool-search] tool_search executed { query: 'github issue', hits: [...] }
```

Or manually:

```
> use tool_search to find any tool related to "figma"
```

## Design notes

- **Zero runtime dependencies**. Fuzzy matching is bag-of-words — good enough for
  a few hundred tools; if your workspace has thousands, open an issue.
- **Session-scoped activation only**. Restarting opencode resets which tools are
  "revealed". This is intentional — new sessions should start with the smallest
  prompt possible.
- **Doesn't touch `tools[]` on the wire**. We can't; that surface isn't exposed.
  What we can do is make the descriptions worthless-looking so the model won't
  waste attention on them.

## License

MIT © Yulimfish · contact: `epeiuss@waterflames.cn`
