# Opencode has added the scout agent, which does the same thing, this is no longer needed.

# Gitloops

A plugin for [OpenCode](https://opencode.ai) that lets you clone and explore GitHub repositories locally. Ask questions about a repo's code, structure, and patterns — all without leaving your terminal.

Gitloops provides three custom tools (`gitloops_clone`, `gitloops_refresh`, `gitloops_list`) restricted to read operations — no file modifications, no shell access. You can use these tools from any agent, or optionally enable a dedicated `gitloops` agent via config.

## Installation

Add the plugin to your `opencode.json` config file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gitloops"]
}
```

OpenCode will automatically install the package.

Alternatively, you can install it as a local plugin by placing it in your plugin directory:

- **Project-level:** `.opencode/plugins/`
- **Global:** `~/.config/opencode/plugins/`

## Configuration

Gitloops auto-creates a config file on first load at:

```
~/.config/opencode/plugin/gitloops.json
```

```json
{
  "$schema": "https://raw.githubusercontent.com/maharshi365/opencode-gitloops/master/schema/config.schema.json",
  "max_repos": 10,
  "cache_loc": "~/.cache/gitloops/repos",
  "eviction_strategy": "lru",
  "agent": {
    "enabled": false,
    "model": "anthropic/claude-sonnet-4-5",
    "temperature": 0.1,
    "color": "#ed5f00",
    "mode": "all"
  }
}
```

| Option              | Type      | Default                   | Description                                                                            |
| ------------------- | --------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `max_repos`         | `integer` | `10`                      | Maximum number of cached repos. When exceeded, repos are evicted automatically.        |
| `cache_loc`         | `string`  | `~/.cache/gitloops/repos` | Directory where cloned repos are stored (`<cache_loc>/<owner>/<repo>/`). Supports `~`. |
| `eviction_strategy` | `string`  | `"lru"`                   | Strategy for removing repos when `max_repos` is exceeded.                              |
| `agent`             | `object`  | see below                 | Controls the optional dedicated gitloops agent.                                        |

### Eviction strategies

| Strategy  | Behavior                                                       |
| --------- | -------------------------------------------------------------- |
| `lru`     | Remove the least recently used repo (oldest modification time) |
| `fifo`    | Remove the oldest cloned repo (oldest creation time)           |
| `largest` | Remove the largest repo by disk size                           |

### Agent configuration

The `agent` object controls the optional dedicated `gitloops` agent entry in OpenCode. By default (`enabled: false`) only the plugin tools are registered — you can call them from any agent or the default assistant.

| Field         | Type      | Default      | Description                                                                                                        |
| ------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `enabled`     | `boolean` | `false`      | Set to `true` to add a `gitloops` entry to the OpenCode agent picker.                                             |
| `model`       | `string`  | *(session)*  | Model to use, e.g. `"anthropic/claude-sonnet-4-5"`. Falls back to the session model if omitted.                   |
| `temperature` | `number`  | `0.1`        | Sampling temperature (0–2).                                                                                        |
| `color`       | `string`  | `"#ed5f00"`  | Hex color (e.g. `"#FF5733"`) or theme color name (`"primary"`, `"accent"`, etc.) shown in the UI.                 |
| `mode`        | `string`  | `"all"`      | `"primary"` — main picker only. `"subagent"` — `@mention` only. `"all"` — both.                                   |

The `$schema` field enables autocompletion and validation in editors that support JSON Schema.

### Private repositories

Private repositories are supported as long as your local git credentials or SSH keys grant access — the same way `git clone` works in your terminal. No additional configuration is needed.

If a clone fails due to missing credentials, Gitloops will surface a specific error message directing you to configure your git credentials or SSH keys.
