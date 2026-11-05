# OpenCode Plugins Monorepo

**English** | [简体中文](README.zh-CN.md)

A Bun workspace monorepo for a collection of OpenCode plugins.

## Packages

- [`@max10240/opencode-plugin-unicorn`](./packages/opencode-plugin-unicorn): Meta-package that assembles the plugins below; the published name is unchanged.
- [`@max10240/opencode-plugin-send-message-across-sessions`](./packages/opencode-plugin-send-message-across-sessions): send messages between sessions in different working directories.
- [`@max10240/opencode-plugin-prompt-search`](./packages/opencode-plugin-prompt-search): cross-session prompt reverse search for the TUI.
- [`@max10240/opencode-plugin-session-search`](./packages/opencode-plugin-session-search): search user and agent messages in the current session and jump to a result, including saved pre-compaction history.
- [`@max10240/opencode-plugin-image-gen`](./packages/opencode-plugin-image-gen): generate or edit images through standard `/images/*` endpoints.
- [`@max10240/opencode-plugin-show-img`](./packages/opencode-plugin-show-img): preview server-side images by ID over a UI-only RPC without adding image content to model context.
- [`@max10240/opencode-plugin-sensitive-encrypt`](./packages/opencode-plugin-sensitive-encrypt): encrypt files under `$TMPDIR` with a configured public key and decrypt them with a separate private key.
- [`@max10240/opencode-plugin-sensitive-protection`](./packages/opencode-plugin-sensitive-protection): register protected files and block or redact them before they reach model context.
- [`@max10240/opencode-plugin-recomended-opencode-config`](./packages/opencode-plugin-recomended-opencode-config): optionally add recommended global rules and inline commands, and set `store:false` on existing OpenAI configuration.

## Development

```bash
bun install
bun run build
bun run typecheck
bun run check
```

### Test entry points

| Command | Scope |
| --- | --- |
| `bun run test:unit` | Unit tests and headless TUI rendering; no build and no OpenCode process |
| `bun run check:fast` | One build, typecheck all workspaces, unit/render tests; no network install |
| `bun run test:e2e` | One build, source-level server/TUI E2E |
| `bun run test` | Unit, render, and source E2E; excludes packaged installation |
| `bun run test:packaged` | Fresh installation of this round's npm archives plus server/TUI validation |
| `bun run check` / `check:full` | Full check with all test suites |
| `bun run check:fresh` | Full check with forced dependency resolution; use before publishing |
| `bun run test:packaged:fresh` | Packaged validation with forced dependency resolution |

Workspace artifacts are built and packed exactly once per round, in workspace dependency order. Source and packaged
tests use isolated copies and never reuse test results, servers, databases, HOME, or TUI state. A build or archive
hash mismatch fails the run instead of using stale output. Build and typecheck run at most two tasks in parallel;
E2E runs at most three. Each phase reports its actual duration.

Packaged tests create a clean `node_modules` every time. After the first dependency resolution, the lockfile and npm
downloads are cached. Cache hits still run a real `npm ci --offline`, and local plugin integrity is refreshed from
this round's archives, so code changes under the same version are tested. Corrupt caches or missing offline
dependencies trigger a clean reinstall; installation failures still fail the test.

The cache key includes plugin manifests, Node/npm/Bun versions, platform, and architecture. The default directory is
`opencode/unicorn-test-cache` under the system temporary directory. Set `UNICORN_TEST_CACHE_DIR` to a writable
directory and cache it in CI. Use `check:fresh` to check for new versions within dependency ranges; it bypasses the
cached lockfile but can still use npm's download cache. The installer uses an isolated npm configuration, preserves
proxy/CA settings, and never reads user npm credentials or preload scripts. Unicorn is also installed separately:
child packages are re-resolved from a local registry with tarball integrity checks, so installing seven packages at
once cannot hide a dependency error. Regular checks reuse the third-party dependency lockfile; `fresh` resolves a new
set of third-party versions once, and the Unicorn-only installation reuses that result. The local registry also
verifies that `latest` does not point to a stale child package.

Production `npm pack` / `npm publish` still runs the prepack build and rules sync; Unicorn also syncs internal
dependency versions. Only test archives that already validated this round's build skip repeated lifecycle scripts.

Run a single workspace:

```bash
bun run --cwd packages/opencode-plugin-unicorn test
bun run --cwd packages/opencode-plugin-unicorn typecheck
```

Workspace configuration lives in the root `package.json` under `workspaces`. Each package keeps its own entry points,
dependencies, tests, and publish configuration.

All plugin packages share one version. New plugins must adopt the current Unicorn version instead of starting at
`1.0.0`. `bun run check:versions` validates this independently; builds and full checks also verify it automatically
and fail on mismatched versions or internal dependencies that are not pinned exactly. After a version bump, run
`bun run sync:versions` to update internal dependencies.

Recommended rules use a hard link from the repository `rules/AGENTS.md`. `bun install` installs a pre-commit hook,
and commits and prepack runs re-sync the link; `bun run sync:rules` syncs manually. Existing Git hooks are never
overwritten. Command collection reads the `commands` field from the source JSONC plus Markdown files under
`.commands/`, `command/`, and `commands/` in the same directory. It does not copy full configuration or execute
templates, and same-name user commands are not overwritten.

All packages compile NodeNext source into the Git-ignored `dist/`. npm tarballs contain only `package.json`,
`README.md`, `README.zh-CN.md`, and `dist/**/*.js`; they never publish `.ts`, `.tsx`, or declaration files. Full checks pack and install
every package for real and validate it in isolated OpenCode servers. TUI plugins run in their own tmux sockets to
check interaction, reactive filtering, and cross-filesystem image previews. The release script runs `check:fresh`
before changing versions or uploading.

### Publishing

There is one release entry point, and the release type is required:

```sh
npm run release -- --release-type=<type> [--version=<spec>]
```

Supported `--release-type` values:

| Type | Behavior | 2FA |
| --- | --- | --- |
| `local-publish` | Build and publish locally | Browser security key |
| `local-stage` | Build and stage locally; approve on npm | 2FA when approving |
| `ci-publish` | Commit and push locally; GitHub Actions builds and publishes | OIDC |
| `ci-stage` | Commit and push locally; GitHub Actions builds and stages | 2FA when approving |

`--version` defaults to `patch` and also accepts `minor`, `major`, or an exact version such as `1.2.3`. The target
must be strictly greater than every package's registry `latest` and must not be lower than the local version.

The script:

1. Validates all arguments.
2. Requires a clean worktree; only `rules/` sync files may be uncommitted.
3. Runs the full `npm run check`.
4. Bumps all packages to the target version and syncs internal dependencies.
5. Publishes locally or triggers CI according to the release type.

Local publishing:

```sh
npm run release -- --release-type=local-publish
npm run release -- --release-type=local-stage --version=minor
```

CI publishing:

```sh
npm run release -- --release-type=ci-publish
npm run release -- --release-type=ci-stage --version=1.2.0
```

`ci-*` modes commit the version change and push `main`; the commit message contains `[release]` or
`[release:stage]`. CI never bumps the version.

Staged releases can be reviewed at `https://www.npmjs.com/settings/~/staged-packages`, or with
`npm stage list` and `npm stage approve <stage-id>`.

After a successful local publish, commit the version changes and synced files. `ci-*` commits and pushes them
automatically. The first publish of a new package cannot use OIDC; use `local-publish` or `local-stage`.
