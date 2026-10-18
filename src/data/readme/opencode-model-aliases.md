# opencode-model-aliases

[![npm version](https://img.shields.io/npm/v/opencode-model-aliases.svg)](https://www.npmjs.com/package/opencode-model-aliases)
[![CI](https://github.com/vmvarela/opencode-model-aliases/actions/workflows/ci.yml/badge.svg)](https://github.com/vmvarela/opencode-model-aliases/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Model IDs go stale: previews get promoted, point releases land, and the IDs pinned in your
agents keep pointing at last month's model. This [OpenCode](https://opencode.ai) v2 plugin
adds **floating aliases** to the model catalog: a stable ID such as `opencode/zen-plan` that
always resolves to the newest model matching your rules.

![OpenCode TUI model alias list](images/model-aliases-list.png)

![OpenCode TUI model alias resolution explanation](images/model-aliases-explain.png)

> **Docs vs releases.** This README follows the default branch (`master`), which can be
> ahead of the published npm package; the
> [GitHub Releases](https://github.com/vmvarela/opencode-model-aliases/releases) page lists
> what has shipped.

## Concrete IDs vs aliases

A concrete model ID (`github-copilot/claude-sonnet-4.5`) **pins** one model you review and
change yourself; OpenCode resolves it natively, no plugin needed. An alias earns its keep
when you mean a **policy**, not a model: "the newest free model with tools and a large
context", "the current Sonnet, whichever point release it is". The policy outlives the model
list; the alias keeps resolving to whatever satisfies it today.

## Quick start

1. **Add the plugin and an alias** in `opencode.json`:

   ```json
   {
     "plugins": [{
       "package": "opencode-model-aliases@latest",
       "options": {
         "aliases": {
           "github-copilot/claude-sonnet": { "match": "github-copilot/claude-sonnet-*" }
         }
       }
     }]
   }
   ```

2. **Inspect resolution** in the OpenCode TUI:
   Run `/model-aliases` (or **Model aliases** in the command palette) to see the chosen target.

3. **Use the alias**:
   Select `github-copilot/claude-sonnet` like any model in the picker or assign it to agents; requests route to the winning model automatically.

> **Plugin updates:** OpenCode caches installed plugin packages: restarting alone doesn't install a newer release. Update with `opencode plugin update opencode-model-aliases@latest`.

## Examples

Each alias key is `<provider>/<alias-id>`. Every pattern must use the same literal provider
as its key: an alias never selects a model from another provider.

**Follow a family** and **skip previews or a specific model** with `exclude`, in
`.opencode/opencode-model-aliases.jsonc`:

```jsonc
// .opencode/opencode-model-aliases.jsonc — follow a family
{
  "$schema": "https://raw.githubusercontent.com/vmvarela/opencode-model-aliases/master/schema.json",
  "aliases": {
    "openai/gpt-sol":  { "match": "openai/gpt-*-sol" },
    "openai/gpt-luna": { "match": "openai/gpt-*-luna" },
    "openai/latest": {
      "match": ["openai/gpt-*", "openai/o*"],
      "exclude": ["openai/*-preview", "openai/gpt-6.1-sol-pro"]
    }
  }
}
```

**Require capabilities** — tools, image input, large context — in
`.opencode/opencode-model-aliases.jsonc`:

```jsonc
// .opencode/opencode-model-aliases.jsonc — require capabilities
{
  "$schema": "https://raw.githubusercontent.com/vmvarela/opencode-model-aliases/master/schema.json",
  "aliases": {
    "github-copilot/vision": {
      "match": "github-copilot/gemini-*-flash",
      "filter": { "capabilities": { "tools": true, "input": ["image"], "output": ["text"] }, "minContext": 128000 }
    }
  }
}
```

**Wait for releases to settle** — skip models released less than a day ago, in
`.opencode/opencode-model-aliases.jsonc`:

```jsonc
// .opencode/opencode-model-aliases.jsonc — wait for releases to settle
{
  "$schema": "https://raw.githubusercontent.com/vmvarela/opencode-model-aliases/master/schema.json",
  "aliases": {
    "openai/gpt-current": {
      "match": "openai/gpt-*-sol",
      "filter": { "minAge": "1d" }
    }
  }
}
```

Filenames like `-sol-2026-10` are matched immediately, but a model younger than the
configured age is skipped until the next check; the plugin only re-resolves at startup and
on catalog refreshes, so a candidate crossing the age threshold on its own never switches
the target.

**Pick a model per job** in `opencode.json`: filter the free set by what each job needs,
then point agents at the aliases:

```json
{
  "plugins": [{
    "package": "opencode-model-aliases@latest",
    "options": {
      "aliases": {
        "opencode/zen-plan": {
          "match": ["opencode/*-free", "opencode/big-pickle"],
          "filter": { "capabilities": { "tools": true }, "minContext": 256000 },
          "name": "Zen Free — Plan"
        },
        "opencode/zen-build": {
          "match": ["opencode/*-free", "opencode/big-pickle"],
          "filter": { "capabilities": { "tools": true, "input": ["text"], "output": ["text"] }, "minContext": 64000 },
          "name": "Zen Free — Build"
        }
      }
    }
  }],
  "agents": {
    "plan":  { "model": "opencode/zen-plan" },
    "build": { "model": "opencode/zen-build" }
  }
}
```

Filters decide **eligibility**, not quality. If several models qualify, the newest wins, so
both aliases may currently pick the same model. `*-free` is a naming convention, not a price
check. Only `active` models are eligible by default; opt into `alpha`/`beta` via
`filter.status`.

## How a winner is picked

When the plugin starts and at every catalog refresh, each alias:

1. **Matches** models with `match`, then removes `exclude` matches
   ([picomatch](https://github.com/micromatch/picomatch) globs).
2. **Filters** by `enabled`, status, capabilities and `minContext`. All filters must pass;
   missing metadata fails the filter that needs it.
3. **Selects** the newest `time.released`. Ties use the descending model ID
   (`gpt-6.1-sol-pro` beats `gpt-6.1-sol-fast`). Models without release dates never win.
   With `filter.minAge`, candidates younger than the configured age are skipped here too —
   so an alias can wait for a release to settle before adopting it.

Selection is deterministic: same catalog, same rules and same resolution time (captured
once per refresh), same winner. The alias gets a copy of
the winner's model info under the alias ID; declaration order doesn't matter.

## Options

| Option | Default | Notes |
|---|---|---|
| `aliases` | required | Object of aliases; `{}` is valid. |
| `strict` | `false` | Fail startup if any alias doesn't resolve; strict applies at startup only (see Limits). |
| `debug` | `false` | Log each resolution as a `[debug]` warning. |
| `match` | required | Glob or list of globs: `"provider/pattern"`. |
| `exclude` | none | Same format as `match`. |
| `filter.status` | `["active"]` | Any of `active`, `alpha`, `beta`. |
| `filter.capabilities` | none | `tools` (boolean), `input`/`output` (all listed modalities required). |
| `filter.minContext` | none | Minimum context window, inclusive. |
| `filter.minAge` | none | Minimum candidate age as `<hours>h` or `<days>d` (e.g. `"48h"`, `"3d"`); models released more recently are skipped, threshold inclusive. |
| `name` | generated | Display name. Without it, `sonnet` becomes `Sonnet (alias)`. |
| `select` | `latest` | Only `{ "strategy": "latest" }` is supported. |

Aliases can also live in `.opencode/opencode-model-aliases.jsonc` (JSONC comments and
trailing commas are fine); the plugin uses the nearest file found from the working directory
upward. Inline options win: an inline alias replaces a file alias with the same key, and
inline `strict`/`debug` values win. Inline options apply when OpenCode reloads its
configuration; the `.jsonc` file is read at plugin start, so run `/model-aliases reload`
after editing it (or restart).

For editor autocompletion and shape validation, `schema.json` ships with the package as a
draft-07 JSON Schema; point the config file's `$schema` at the default-branch URL
`https://raw.githubusercontent.com/vmvarela/opencode-model-aliases/master/schema.json`
(file-only metadata: editors may require it, the plugin strips it, and inline plugin options
never accept it). The schema checks shape only — glob compilation, the literal-provider rule
and provider equality remain runtime-enforced and authoritative.

## Inspection and commands

### TUI inspection and explanation

- **List aliases**: Run `/model-aliases` (or **Model aliases** in the command palette) to see the current target, the real model ID used for requests, and failure reasons if unresolved.
- **Reload file configuration**: Run `/model-aliases reload` to re-read `.opencode/opencode-model-aliases.jsonc` without restarting OpenCode. It reuses the same discovery, parsing and validation as startup; if the new configuration is invalid, the last valid one stays active and the command reports the failure. Reload only re-reads the file — inline `ctx.options`/host plugin configuration still applies only when OpenCode reloads its configuration, and plugin code changes still require a restart. There is no filesystem watcher or automatic reload; the command only acts when run.
- **Explain resolution**: Run `/model-aliases explain <provider>/<alias-id>` for the full decision trail: matched patterns, rejected candidates with unmet criteria, and tie-breaking details. Quote aliases containing spaces: `/model-aliases explain "<provider>/<alias-id>"`. Nothing here calls a model.
- **Autocomplete note**: In OpenCode 2.0.22, selecting the slash suggestion leaves a trailing space; press Enter again.

### Headless / CLI inspection

Query the backend via OpenCode standalone RPC without opening the TUI:

```sh
# Inspect all configured aliases
opencode api --standalone post /api/rpc/opencode-model-aliases/inspect --data '{"input":{}}'

# Explain resolution details for the quick-start alias
opencode api --standalone post /api/rpc/opencode-model-aliases/explain --data '{"input":{"alias":"github-copilot/claude-sonnet"}}'
```

Explanations reflect the catalog visible to the plugin transform. With `strict: true`, startup failures prevent the plugin and its RPC methods from registering.

### Change visibility and plugin ordering

- **Change notifications:** The plugin compares confirmed effective targets per alias key
  and location across configuration and policy edits. The first resolution of an alias
  sets a silent baseline and adding a new alias stays silent too; only an actual target
  change creates a notice — the TUI displays a toast and `/model-aliases` shows the
  previous target, new target, and detection timestamp. Edits whose winner stays the same
  (cosmetic or unchanged ones) never create a new notice. Inline plugin options reload
  with the host configuration; editing `.opencode/opencode-model-aliases.jsonc` takes
  effect on `/model-aliases reload` (or restart).
- **Plugin ordering:** The plugin resolves against the fresh catalog and observes subsequent `model.updated` events. If a downstream plugin rewrites an alias `modelID`, the inspect report can return `unavailable`. Do not rely on plugin execution order.

## Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| Alias fails to resolve | No models match globs or meet capability/context filters | Run `/model-aliases explain <provider>/<alias-id>` to see rejected candidates and unmet requirements. Confirm candidates have valid release timestamps (`time.released`). |
| Host startup fails | Invalid shape, unknown key, or invalid glob pattern | Use `schema.json` to check the configuration shape; glob patterns are checked at startup, so inspect the startup error for invalid patterns. |
| Configuration changes not applied | Editing `.opencode/opencode-model-aliases.jsonc` | Inline `options` in `opencode.json` reload automatically on save; file config is read at startup and on `/model-aliases reload`. Run that command, or restart OpenCode. |
| Package update not taking effect | OpenCode caches installed plugin packages | Run `opencode plugin update opencode-model-aliases@latest` and restart OpenCode. |
| OpenCode-disabled model selected | Upstream catalog exposes models marked `disabled: true` | The plugin reads the host catalog directly ([#42](https://github.com/vmvarela/opencode-model-aliases/issues/42)). Add unwanted models explicitly to `exclude`. |

## Limits, failure and non-goals

- Invalid configuration (including unknown keys and invalid globs) fails at startup, and
  alias/source ID collisions are fatal on every catalog replay, including startup.
- An alias with no candidate logs a warning and is left out; other aliases keep working.
  With `strict: true`, startup fails instead. Strict applies at startup only: after a
  successful startup, a target loss skips only that alias, and it recovers when a matching
  model returns.
- Only the `latest` strategy exists; the plugin can't rank by price or quality. Aliases are
  provider-isolated and never chain, and the plugin only reads OpenCode's catalog — it never
  fetches external model lists.
- Models hidden with `disabled: true` in your OpenCode provider config can still be selected
  by an alias ([#42](https://github.com/vmvarela/opencode-model-aliases/issues/42)); use
  `exclude` to keep a model out of an alias.
- Compatibility is verified only for OpenCode **2.0.16 and 2.0.24** ([real-host smoke
  tests in CI](.github/workflows/ci.yml), tracked in [#29](https://github.com/vmvarela/opencode-model-aliases/issues/29)); other host versions are not on the verified matrix.

Explicitly out of scope: prompt classification ("which prompt needs which model"), smart
routing, provider proxying, credential management, retries/failover, billing, and session
orchestration. What happens to a request once it leaves the plugin is OpenCode's job.

## Development

See [Contributing](CONTRIBUTING.md) for setup and validation commands.

MIT License — see [LICENSE](LICENSE).
