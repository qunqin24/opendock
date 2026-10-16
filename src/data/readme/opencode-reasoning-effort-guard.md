# opencode-reasoning-effort-guard

[![npm version](https://img.shields.io/npm/v/opencode-reasoning-effort-guard)](https://www.npmjs.com/package/opencode-reasoning-effort-guard)
[![license](https://img.shields.io/npm/l/opencode-reasoning-effort-guard)](LICENSE)

Stop OpenCode sending a reasoning effort the provider rejects.

## The problem

For a model that is not in the models.dev catalog, OpenCode has nothing to read, so it assumes the only reasoning levels are `low`, `medium`, and `high`. If the provider accepts a different set, OpenCode can send a value it will refuse, and you get back a generic error instead of an answer:

```
400 invalid_request_error
Invalid inference request. Check the model's supported parameters and input limits.
```

River is a good example. Its `deepseek-ai/DeepSeek-V4.1-Flash` accepts `none`, `high`, and `max` only, so `medium` fails. Declaring `variants` by hand fixes it for one model at a time; this plugin is the safety net underneath that, for every model you configure.

## Install

```sh
opencode plugin add opencode-reasoning-effort-guard
```

Directly from the repository instead:

```sh
opencode plugin add github:mmestiyak/opencode-reasoning-effort-guard
```

Confirm what OpenCode loaded:

```sh
opencode plugin list
```

Installing only records the package. The guard does nothing until you give it the effort values your models accept, which is the next section.

## Configure

Add a `plugins` entry to `opencode.json(c)` with the models you want covered. The keys are the same provider and model ids you already use in the `providers` block:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-reasoning-effort-guard",
      "options": {
        "models": {
          "river/deepseek-ai/DeepSeek-V4.1-Flash": ["none", "high", "max"],
          "river/zai-org/GLM-5.3-Flash": ["low", "high", "max"],
          "river/*": ["none", "high"]
        },
        "onUnsupported": "warn"
      }
    }
  ]
}
```

`opencode plugin add` writes the package name as a plain string. Change that entry to the object form above so the rules reach the plugin. A plugin with no `options` has no rules and is a no-op.

## What it does

Right before a model call, the guard looks at the reasoning effort in play and, if the model does not accept it, replaces it with the nearest value it does accept.

| Requested | Model accepts | Sent |
| --- | --- | --- |
| `high` | `none`, `high`, `max` | `high` (unchanged) |
| `medium` | `none`, `high`, `max` | `high` |
| `low` | `none`, `high`, `max` | `high` |
| `minimal` | `none`, `max` | `none` |
| `off` | `none`, `high` | `none` |

Rules:

- Ties go to the higher level, so a graded request does not drop to an off value (`none`, `off`, `disabled`) when both are equally close.
- An unrecognised level resolves to the lowest graded value, never to off. Unrecognised accepted values are used only when nothing recognisable is available.

The guard only changes the value on the wire. It does not edit your configuration or hide the unsupported level in the UI.

## Options

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `models` | `{ [key: string]: string[] }` | `{}` | Accepted effort values per `"provider/model"`, or per `"provider/*"`. |
| `onUnsupported` | `"clamp"` \| `"warn"` | `"clamp"` | `"warn"` also logs a line naming the requested and replacement values. |

An exact `"provider/model"` entry wins over `"provider/*"`. Malformed entries are ignored rather than throwing, so a typo cannot stop OpenCode from starting.

With `"warn"`, a corrected call logs one line:

```
[reasoning-effort-guard] river/deepseek-ai/DeepSeek-V4.1-Flash: "medium" is not supported, using "high"
```

## How it works

It registers a `context` session hook, scoped to each configured provider, that runs immediately before a request is dispatched.

The requested level is read from `event.options.reasoningEffort` if a request override set it, otherwise from `event.model.variant`. The variant matters: when OpenCode synthesizes `low`/`medium`/`high` for an uncatalogued model, the chosen level arrives as `event.model.variant` and its setting is applied as a model default, so it never appears in `event.options`. The guard writes the corrected value to `event.options.reasoningEffort`, and a request override takes precedence over a model default, so the corrected value is what the provider receives.

All the decision logic lives in `src/guard.ts` with no OpenCode imports, so it can be read and tested on its own.

## Troubleshooting

### `Plugin package has no server or TUI entrypoint`

Clear the cached copy and install again:

```sh
rm -rf ~/.cache/opencode/npm/opencode-reasoning-effort-guard@latest
opencode plugin add opencode-reasoning-effort-guard
```

OpenCode resolves the plugin entrypoint from the copy it unpacks into `~/.cache/opencode/npm/`. If that copy is an incomplete or placeholder package, the entrypoint lookup fails with this message even though the published package is fine. Clearing the cache forces a fresh download. We hit this once, while npm was still serving its staged `0.0.0-stage` placeholder.

### The guard is installed but never fires

Check that the `plugins` entry carries `options.models` with the exact `"provider/model"` ids for your setup. A plugin installed as a bare string, or with an empty `models` map, has no rules to apply. Set `onUnsupported` to `"warn"` and the guard logs a line whenever it corrects a value, which makes it obvious whether it is loading and matching.

### The guard clamps a value you expected to keep

The value you asked for is not in that model's accepted list. Check the `models` entry, then confirm what the provider actually accepts. Providers often document a wider set than the endpoint enforces.

## Local development

A plugin discovered from a `.opencode/plugins/` directory is loaded without options, so the guard has no rules and does nothing. To exercise it while working on it, supply the options yourself:

```ts
// .opencode/plugins/guard-local.ts
import guard from "/absolute/path/to/opencode-reasoning-effort-guard/src/index.ts"

export default {
  id: "reasoning-effort-guard-local",
  async setup(ctx: any) {
    return guard.setup({
      ...ctx,
      options: {
        models: { "river/deepseek-ai/DeepSeek-V4.1-Flash": ["none", "high", "max"] },
        onUnsupported: "warn",
      },
    })
  },
}
```

## Development

```sh
npm install
npm test
npm run typecheck
```

## License

MIT
