# opencode-openrouter-autorouter-variants

An [OpenCode](https://opencode.ai) plugin that adds [OpenRouter routing
variants](https://openrouter.ai/docs/guides/routing/model-variants/overview) as
selectable `#variants` on every OpenRouter base model.

## What it does

OpenRouter supports two kinds of model-variant suffixes:

| Kind        | Suffixes                                    | In `GET /api/v1/models`?                       | Handled by this plugin?                                 |
| ----------- | ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| **Catalog** | `:free`, `:batch`, `:thinking`, `:extended` | Yes — separate entries with their own metadata | No (already listed by the built-in OpenRouter provider) |
| **Routing** | `:nitro`, `:floor`, `:exacto`               | No — accepted on any model at request time     | **Yes**                                                 |

Because routing variants are not in the catalog, they never appear in
OpenCode's model picker. This plugin derives them from every OpenRouter base
model and registers them as OpenCode `#variants`:

```
openrouter/anthropic/claude-sonnet-4#nitro   → throughput-optimized routing
openrouter/anthropic/claude-sonnet-4#floor   → price-optimized routing
openrouter/anthropic/claude-sonnet-4#exacto  → tool-calling-optimized routing
```

Each variant overrides the `model` field in the request body so OpenRouter
receives the model ID with the routing suffix (e.g.
`anthropic/claude-sonnet-4:nitro`).

> `:online` is deprecated (use the `openrouter:web_search` server tool instead)
> and is intentionally excluded.

## Install

Add the package to the `plugins` array in your `opencode.json(c)` — OpenCode
downloads and loads it automatically:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-openrouter-autorouter-variants"],
}
```

You can also pin a version:

```jsonc
{
  "plugins": ["opencode-openrouter-autorouter-variants@0.1.0"],
}
```

### Requirements

- OpenRouter must be connected (via `/connect` or the `OPENROUTER_API_KEY`
  credential) for OpenRouter models to appear. The plugin adds variants only to
  the models OpenCode already lists for the `openrouter` provider.
- Variants appear on base models only — catalog variants such as `:free` are
  left untouched.

## Development

Requires Node.js 24 (see `.node-version`) and pnpm 12 (pinned via the
`packageManager` field; Corepack and `pnpm/action-setup` both honor it).

```sh
pnpm install
pnpm build         # type-check and emit dist/ (tsc)
pnpm typecheck     # tsc --noEmit
pnpm lint          # oxlint
pnpm format        # oxfmt (write)
pnpm format:check  # oxfmt (check only)
pnpm check         # format:check + lint + typecheck
```

CI runs the same checks with GitHub Actions, plus [zizmor](https://zizmor.sh)
static analysis of the workflows themselves.

### Commit conventions

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org)
(e.g. `feat:`, `fix:`, `chore:`, `docs:`). A [lefthook](https://lefthook.dev)
hook runs `commitlint` locally on commit; the CI `Commitlint` job validates
them on pull requests. The pre-commit hook also runs `oxlint`, `oxfmt --check`,
and `zizmor` (only when `.github/` files are staged).

### Releases (Changesets + Trusted Publishing)

Releases are automated with [Changesets](https://changesets.dev) and [npm
trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC — no npm
token stored as a secret).

**Adding a changeset** — before merging a change that warrants a release:

```sh
pnpm changeset        # follow the prompts; a markdown file is added to .changeset/
git add .changeset && git commit -m "chore: add changeset"
```

When a changeset is present on `main`, the `Release` workflow opens a "Version
Packages" pull request that bumps the version and updates the changelog. Merging
that PR triggers the `pack` → `publish` jobs, which publish to npm via OIDC and
create a GitHub release with git tags.

**One-time npm setup** — because the package is new, trusted publishing requires
a one-time bootstrap:

1. Publish the first version manually:
   ```sh
   npm login
   npm publish            # or: pnpm publish --no-git-checks
   ```
2. On [npmjs.com](https://npmjs.com) → package settings → add a trusted
   publisher: GitHub user `valeriobelli`, repository
   `opencode-openrouter-auto-router-variants`, workflow filename `release.yml`.
3. After that, all subsequent releases publish automatically from CI with no
   stored token.

### Local install in OpenCode

To test a local checkout instead of the published package, point the `plugins`
array at the package directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-openrouter-auto-router-variants"],
}
```

## License

[MIT](./LICENSE)
