# @falentio/opencode-commandcode

An [OpenCode](https://opencode.ai) plugin for CommandCode.

## Install

Install the plugin globally with the OpenCode CLI:

```bash
opencode plugin -g @falentio/opencode-commandcode
```

The `-g` flag enables the plugin for every project. OpenCode installs the npm
package automatically.

## What it does

- Adds Command Code as an OpenCode provider.
- Loads the current model catalog from Command Code at startup.
- Adds reasoning-effort variants that OpenCode cycles with `Ctrl+T`.
- Uses a checked-in `models.dev` snapshot for missing model metadata.
- Translates OpenCode requests to Command Code's alpha streaming API.
- Translates Command Code's NDJSON stream to OpenAI-compatible SSE.

After installing the plugin, run `/connect` in OpenCode and choose **Command Code**.
Enter your Command Code API key when prompted.

Choose a model with the `commandcode/<model-id>` provider prefix.

OpenCode cycles supported reasoning efforts with `Ctrl+T`. The selected effort
is sent to Command Code as `params.reasoning_effort`.

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

### Refresh model metadata

`src/models-dev.generated.ts` contains the static metadata used at runtime. Refresh it from local snapshots when the model catalog changes:

```bash
pnpm models:refresh -- --models-dev /path/to/models-api.json --commandcode /path/to/commandcode-models.json
```

The package does not fetch `models.dev` while it loads.

### Project layout

| Path                      | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `src/index.ts`            | Plugin entry, exports `CommandCodePlugin` |
| `src/index.test.ts`       | Vitest tests                             |
| `vite.config.ts`          | Vite+ config, incl. the `pack` block     |
| `.github/workflows/ci.yml`    | Typecheck, build, test on PR/push    |
| `.github/workflows/publish.yml` | Trusted publishing on `v*` tags    |

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
