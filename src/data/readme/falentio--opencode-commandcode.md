# @falentio/opencode-commandcode

An [OpenCode](https://opencode.ai) v2 plugin for CommandCode.

## Install

Add the package to the `plugins` array in your OpenCode config
(`opencode.json`, `opencode.jsonc`, or `.opencode/opencode.json`).

### From a local build (verified)

Build this checkout, then point the entry at the built directory:

```bash
pnpm install && pnpm build
```

```json
{
  "plugins": ["file:/path/to/opencode-commandcode"]
}
```

`file:<dir>` is the only install form verified against OpenCode v2. The
directory must be a package root whose `package.json` resolves the entry
(this package already does) and must contain the built `dist/`; `pnpm build`
produces it. An absolute path without the `file:` prefix does not load.

### From the npm registry (not yet available for v2)

```json
{
  "plugins": ["@falentio/opencode-commandcode"]
}
```

```bash
opencode plugin add @falentio/opencode-commandcode
```

Both forms resolve the bare name from the npm registry, and the registry
currently serves the v1 line. Until this version is published, they install a
v1 plugin that OpenCode v2 rejects with
`Plugin must export a default definition with an id and an effect or setup function`,
and the model then reports as unavailable. Use the `file:` form above until a
v2 release is on the registry.

## What it does

- Adds Command Code as an OpenCode provider, using OpenCode's bundled
  OpenAI-compatible provider runtime.
- Loads the current model catalog from Command Code at startup.
- Adds reasoning-effort variants that OpenCode cycles with `Ctrl+T`.
- Uses a checked-in `models.dev` snapshot for missing model metadata.
- Runs a loopback proxy: OpenCode speaks OpenAI to it, and it translates to
  Command Code's alpha streaming API and back.
- Translates Command Code's NDJSON stream to OpenAI-compatible SSE.

After installing the plugin, run `/connect` in OpenCode and choose **Command
Code**. Enter your Command Code API key when prompted. The key is stored through
the plugin's `{type: "key"}` integration method and resolved per request.

Choose a model with the `commandcode/<model-id>` provider prefix.

OpenCode cycles supported reasoning efforts with `Ctrl+T`. The selected effort
is sent to Command Code as `params.reasoning_effort`.

## Configuration

| Variable                   | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `COMMANDCODE_API_KEY`      | Fallback API key when no integration connection is active.      |
| `COMMANDCODE_CATALOG_URL`  | Override the model catalog URL (useful for a local stand-in).   |
| `COMMANDCODE_ALPHA_URL`    | Override the alpha generation URL (useful for a local stand-in).|

## Development

Requires Node 24+ and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # vp pack --watch
pnpm typecheck  # tsc --noEmit
pnpm test       # vp test
pnpm build      # vp pack
```

Build output goes to `dist/` (ESM + type declarations) via `vp pack` (tsdown).
OpenCode resolves the package entrypoint from `package.json`, so `dist/` must
exist before the plugin is loaded.

### Refresh model metadata

`src/models-dev.generated.ts` contains the static metadata used at runtime.
Refresh it from local snapshots when the model catalog changes:

```bash
pnpm models:refresh -- --models-dev /path/to/models-api.json --commandcode /path/to/commandcode-models.json
```

The package does not fetch `models.dev` while it loads.

### Project layout

| Path                          | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `src/index.ts`                | Plugin entry, default export `{id, setup}`    |
| `src/catalog.ts`              | Catalog fetch/decode and `Model.Info` mapping |
| `src/model-metadata.ts`       | Static metadata lookup and variant projection |
| `src/runtime.ts`              | The loopback OpenAI→alpha proxy               |
| `src/alpha-wire.ts`           | Request/response translation (wire, untouched)|
| `vite.config.ts`              | Vite+ config, incl. the `pack` block          |
| `.github/workflows/ci.yml`    | Typecheck, build, test on PR/push             |
| `.github/workflows/publish.yml` | Trusted publishing on `v*` tags             |

## Releasing

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) over GitHub Actions OIDC. No npm token is stored in the repo.

One-time npm setup (package → Settings → Trusted publishing → GitHub Actions):

- Organization or user: `falentio`
- Repository: `opencode-commandcode`
- Workflow filename: `publish.yml`
- Allowed actions: `npm publish`

Then cut a release:

```bash
pnpm release   # bumpp: bump version, commit, tag
git push --follow-tags
```

The `v*` tag triggers `.github/workflows/publish.yml`, which builds and runs `pnpm publish`. Provenance attestations are generated automatically.

> `repository.url` in `package.json` must exactly match the GitHub repo, or npm will reject the OIDC publish.

## License

MIT
