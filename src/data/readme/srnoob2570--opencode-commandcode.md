# opencode-commandcode

OpenCode builds its model catalog from [models.dev](https://models.dev), which
trails Command Code's registry: new models (Ultrafast, for example) are usable
through the API before they show up in the picker, and output limits, reasoning
efforts and prices arrive later or incomplete.

This plugin takes ownership of the `commandcode` provider's model set and fills
it with the live registry plus a bundled snapshot of that metadata.

## Install

1. Configure the Command Code provider in OpenCode, either with
   `opencode auth login` or by exporting `CMD_API_KEY`.
2. Add the plugin:

   ```sh
   opencode plugin add @srnoob2570/opencode-commandcode
   ```

3. Pick a model. The list now includes the full live catalog, e.g.
   `deepseek/deepseek-v4.1-flash-ultrafast`.

No restart is needed after the plugin is registered.

## What it changes

- **New models appear on day one.** The live registry decides which models
  exist, so anything Command Code serves is selectable.
- **Complete limits and efforts.** Context and output limits come from the live
  entry and the snapshot; every model exposes the same four reasoning levels:
  `off`, `low`, `high` and `max`.
- **Real prices.** Input, output, cache read/write and context tiers are mapped
  to OpenCode's cost model.
- **Claude on the right route.** Claude models only answer on `/messages`, so
  they are assigned the Anthropic runtime package per model; everything else
  stays on the OpenAI-compatible package.

## How it works

On boot the plugin calls the public `GET /provider/v1/models` endpoint (no
credentials needed), then merges the result with `plugin/snapshot.ts`:

- The live registry defines the set: delisted models disappear, unknown ids are
  added with conservative defaults (32k output, text only, no price).
- The snapshot only enriches known ids: output limits, vision, efforts, prices,
  release dates.
- If the request fails, the snapshot serves the whole catalog.
- If the provider is not configured, the transform is never registered and the
  models.dev catalog stays untouched.

The snapshot is generated from three sources: the live registry, models.dev,
and Command Code's own models reference. Regenerate it with
`bun run build:catalog`.

## Limitations

- Between releases, the snapshot ages. New live models still appear, but without
  their price or output limit until the next catalog build.
- The snapshot is metadata, not a guarantee: plans gate some models, and
  Command Code's pricing is the source of truth.
- Only the public models endpoint is called. No prompt, key or account data
  leaves the machine.

Not affiliated with Command Code.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build:catalog   # rewrites plugin/snapshot.ts
```

MIT.
