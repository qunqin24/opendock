# @falentio/opencode-commandcode

An [OpenCode](https://opencode.ai) plugin for CommandCode.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@falentio/opencode-commandcode"]
}
```

OpenCode installs npm plugins automatically with Bun at startup.

## What it does

- Logs plugin initialization and session-idle events via `client.app.log`.
- Registers a `commandcode` tool that OpenCode can call.

```
commandcode: <command> (<directory>)
```

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
