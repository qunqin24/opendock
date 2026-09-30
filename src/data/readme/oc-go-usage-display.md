# oc-go-usage-display

[![npm version](https://img.shields.io/npm/v/oc-go-usage-display.svg)](https://www.npmjs.com/package/oc-go-usage-display)

OpenCode Go subscription usage for [opencode](https://opencode.ai) and Kilo:

| Target | Bundled entry | Surface |
| ------ | ------------- | ------- |
| server | `dist/plugins/oc-go-usage-display.ts` | `go_usage` tool (`Go 5h 42% (reset 3h12m) \| 7d 15% \| 30d 61%`) |
| tui | `dist/plugins/oc-go-usage-display.tsx` | `Go Usage` sidebar + `session_prompt_right` statusline (opencode) |
| server (kilo) | `dist/plugins/oc-go-usage-display.kilo.ts` | `go_usage` tool for Kilo; reads Kilo's own auth store |
| tui (kilo) | `dist/plugins/oc-go-usage-display.kilo.tsx` | same TUI surfaces for Kilo |

`shared.ts` is inlined at build time. Requires Node >= 22 and opencode >= 1.18.
All four bundles ship in the one npm package and one version; the build fails if
either host's bundle is missing.

![Go Usage sidebar and statusline](docs/screenshot.png)

## Install (npm)

| Mode | Command |
| ---- | ------- |
| Persistent (recommended) | `npm install oc-go-usage-display@latest && npx oc-go-usage-display-init --copy` |
| One-shot (npx) | `npx -p oc-go-usage-display@latest oc-go-usage-display-init --copy` |
| Project scope | `npx -p oc-go-usage-display@latest oc-go-usage-display-init --copy --config-dir .opencode` |

`--copy` is the default and self-contained; `--symlink` is dev-only (rebuild +
restart). Restart opencode afterwards. Pin the version (`@latest`, not
`@latest`) so installs stay reproducible; copy-first requires >= latest.

Alternative — no files copied: declare the versioned package and let opencode
resolve it at startup:

```jsonc
// opencode.jsonc — server target (go_usage tool)
{ "plugin": ["oc-go-usage-display@latest"] }
// tui.json — TUI target (sidebar + statusline)
{ "plugin": [["oc-go-usage-display@latest", { "sidebar": true, "statusline": true }]] }
```

From a checkout: `./install.sh` (copy install; add `--target kilo` for Kilo),
`./install.sh --symlink` (dev-only), `./install-dev.sh` (latest `develop`
dev-tgz + config snapshot; there is no auto-restore — it prints the restore
command).

### Kilo

Kilo is a separate target: `npx oc-go-usage-display-init --target kilo` copies
`oc-go-usage-display.kilo.{ts,tsx}` into `$KILO_CONFIG_DIR` /
`$XDG_CONFIG_HOME/kilo` / `~/.config/kilo` and registers `kilo.json` +
`tui.json`. Kilo's `tui.json` rejects `sidebar`/`statusline`, so its entry is a
plain plugin spec (both surfaces default on), and Kilo does not resolve
`./...` against its config dir, so the entries are absolute paths to the
installed copies. Without `--target`, hosts are detected by binary on PATH or
config dir, so brew/npm/curl/source installs all count: one detected host
installs silently, two or more offer a numbered multiselect, and nothing
detected installs both.

## Commands

After `npm install` the names below are on PATH; from a checkout use
`node ./bin/<bin>.js`.

| Command | What it does |
| ------- | ------------ |
| `oc-go-usage-display-init` | install + register; `--target opencode\|kilo\|all` (default: detected hosts, else all) |
| `oc-go-usage-display-remove` | uninstall files + config entries (secrets untouched) |
| `oc-go-usage-display-show` | print effective install per host; `--json` for machine output |
| `oc-go-usage-display-status` | health check; exit 0 healthy, 1 with reasons |
| `oc-go-usage-display-update` | re-install + `git pull --ff-only` when a remote exists |

Flags: `--config-dir <path>` (opencode; default `$OPENCODE_CONFIG_DIR` or
`~/.config/opencode`), `--kilo-config-dir <path>` (default `$KILO_CONFIG_DIR`
or `~/.config/kilo`), `--target`, `--repo <path>`, `--copy`/`--symlink`,
`--sidebar=0/1`, `--statusline=0/1` (opencode only), `--json` (show).

## Display toggles

Three axes, all defaulting to on/integrated. Each is a command in the palette,
persisted per surface, and it applies to whichever sidebar mode is active:

| Axis | Command | Also settable as |
| ---- | ------- | ---------------- |
| sidebar on/off | `Go usage: toggle sidebar` | `sidebar` option, `OPENCODE_OC_GO_SIDEBAR` / `KILO_OC_GO_SIDEBAR` |
| statusline on/off | `Go usage: toggle statusline` | `statusline` option, `OPENCODE_OC_GO_STATUSLINE` / `KILO_OC_GO_STATUSLINE` |
| display mode (Kilo) | `Go usage: toggle sidebar mode` | `sidebar_mode` option, `KILO_OC_GO_SIDEBAR_MODE` |

```json
{ "plugin": ["./plugins/oc-go-usage-display.tsx", { "sidebar": true, "statusline": true }] }
```

Hiding the sidebar hides it in either mode; the mode decides *what* it draws, not
whether it is there. Environment variables and the legacy `display` option apply
only when the `tui.json` toggles are absent. Restart the host after changing
static config. Kilo's `tui.json` rejects the `sidebar`/`statusline` options, so
on that host the palette and the env vars are the way to set them.

## What the sidebar shows

One shared implementation renders the block on both hosts; only the sidebar's
width differs (~30 cells on opencode, ~40 on Kilo), and that is what decides the
layout. Both screenshots below are real captures of the pinned hosts, taken by
`scripts/capture-shots.mjs` (mocked usage, no subscription touched).

| opencode | Kilo (integrated) |
| -------- | ----------------- |
| ![opencode sidebar](docs/sidebar-opencode.png) | ![Kilo sidebar](docs/sidebar-kilo.png) |

**opencode** — the plan as meters, with the next reset on its own line, and a
model section that starts collapsed:

```
Go Usage
 5h resets in 2h5m
 5h             ████░░░░░░ 42%
 7d             ██░░░░░░░░ 15%
 30d            ██████░░░░ 61%

▶ Top Go models (7)
  mimo 59%·qwen 25%
```

Fold the section open (the header is a disclosure control, like the host's own
`MCP` / `Models` sections) for one row per model:

```
▾ Top Go models (7)
  mimo-v2.6-p █████░ 59%
  qwen3-max   ███░░░░░ 25%
  gpt-5.1     █░░░░░░ 12%
  2.31M of 2.4M Go tokens
  161 steps · $1.51
```

A model's **weight** is its share of the Go tokens spent in this session, taken
from the host's own message store over the rendered session — the same scope as
opencode's `Context` panel next to it. It is a share of tokens: never a share of
the plan, a quota, or a price, because the plan's absolute limits are not
client-visible. Bars use the plan's threshold coloring (muted < 75% ≤ warning <
90% ≤ error), and a capped window is always the error color however low its
percent reads.

Both hosts draw the plan the same way: the next reset on one line, then three
stacked meters whose bars share a left edge and whose percents share a right
edge.

**Kilo** — `sidebar_mode` picks what the block is:

- **integrated** (default): the block takes over the host's own `Token Usage`
  band, retires that panel, and renders `Session Tokens` / `Models`. The plan is
  drawn **once**, as the `Go Plan` meters inside the `OpenCode Go` group, and
  every Go model row carries its `Go share`. There is deliberately no separate
  `Go Usage` block saying the same three numbers again.
- **standalone**: our block in a free band above the host's panel, and the host
  panel stays.

## Auth and config

First match wins (secrets are never logged); each host reads only its own
credential store:

| # | Source | Behavior |
| - | ------ | -------- |
| 1 | `OPENCODE_OC_GO_MOCK=1` | deterministic mock snapshot (never cached) |
| 2 | `OPENCODE_OC_GO_API_KEY` | `GET https://opencode.ai/zen/go/v1/usage` with `Authorization: Bearer <key>` |
| 3 | provider `auth.json` | same Bearer path; `opencode-go` key, else `opencode`. opencode: `$XDG_DATA_HOME/opencode/auth.json` (`~/.local/share/opencode/auth.json`), then `~/.config/opencode/auth.json`. Kilo: the same files under `kilo` (`$KILO_CONFIG_DIR` / `$XDG_CONFIG_HOME/kilo`) |
| 4 | workspace + cookie | scrape `GET https://opencode.ai/workspace/{workspaceId}/go` with the `auth` cookie; file config from the host's config dir |
| 5 | none | unavailable snapshot (`not configured (set OPENCODE_OC_GO_API_KEY)`) |

File config (`oc-go-usage-display.json` in the host's config dir, e.g.
`~/.config/opencode` or `~/.config/kilo`):

```jsonc
{ "workspaceId": "...", "authCookie": "..." }
```

Successful snapshots cache 60s (memory + `oc-go-usage-display-cache.json` in
the host's config dir); failures are never cached. ### Environment variables

Every variable this plugin reads is **scoped to the coding agent that reads it**,
so one shell can drive the two hosts independently:

| Suffix | opencode | Kilo |
| ------ | -------- | ---- |
| `API_KEY` | `OPENCODE_OC_GO_API_KEY` | `KILO_OC_GO_API_KEY` |
| `WORKSPACE_ID` | `OPENCODE_OC_GO_WORKSPACE_ID` | `KILO_OC_GO_WORKSPACE_ID` |
| `AUTH_COOKIE` | `OPENCODE_OC_GO_AUTH_COOKIE` | `KILO_OC_GO_AUTH_COOKIE` |
| `MOCK` | `OPENCODE_OC_GO_MOCK` | `KILO_OC_GO_MOCK` |
| `SIDEBAR` | `OPENCODE_OC_GO_SIDEBAR` | `KILO_OC_GO_SIDEBAR` |
| `STATUSLINE` | `OPENCODE_OC_GO_STATUSLINE` | `KILO_OC_GO_STATUSLINE` |
| `DISPLAY` (legacy) | `OPENCODE_OC_GO_DISPLAY` | `KILO_OC_GO_DISPLAY` |
| `SIDEBAR_MODE` | `OPENCODE_OC_GO_SIDEBAR_MODE` | `KILO_OC_GO_SIDEBAR_MODE` |

A Kilo build only reads `KILO_OC_GO_*`, so an `OPENCODE_OC_GO_*` name can never
steer it — the two hosts keep separate auth stores and config dirs for the same
reason.

```sh
# a different surface selection per host, from one shell
OPENCODE_OC_GO_SIDEBAR=1 KILO_OC_GO_SIDEBAR=0 opencode
```

The pre-2.0 unscoped `OPENCODE_GO_*` spelling is **no longer read**. It was
removed rather than deprecated: a fallback would keep one shared variable steering
both hosts after the split, which is the exact ambiguity the prefixes exist to
remove. If you configured credentials through it, move them to the host-scoped
name you actually run.

`OPENCODE_CONFIG_DIR` / `KILO_CONFIG_DIR` are read by the install CLIs, not by
the plugin entry modules.

## Development

```sh
bun install
bun run build     # tsc -> dist/ + esbuild -> dist/plugins/* (both hosts)
bun run check     # typecheck only
```

`bun run build` fails unless all four bundles exist, are self-contained and
export only the default module (`scripts/verify-bundles.mjs`); packed tarballs
can be checked with `node scripts/verify-tarball.mjs <file.tgz>`.

To refresh the README screenshots (boots both hosts in tmux, writes the panes
with their colors intact to `tmp/`):

```sh
docker compose run --rm -v "$PWD":/workspaces/oc-go-usage-display -v "$PWD/tmp:/out" \
  test bun scripts/capture-shots.mjs
```

| Test command | Tier |
| ------------ | ---- |
| `bun run test` | build + READONLY unit tier (host/CI) |
| `bun run test:unit` | helper tests + the live usage **shape** check — the one place an API key is used (a single GET; skips without `OPENCODE_OC_GO_API_KEY`) |
| `bun run test:docker` | authoritative gate: integration + e2e, incl. the real opencode/kilo TUI display checks and the per-model mix rendered against a local fake provider |
| `bun run test:integration` / `bun run test:e2e` | container-only tiers |

Unit tests are readonly by construction (`scripts/check-unit-purity.mjs` rejects
fs writes, tmp usage, child processes and sockets). Integration and e2e run only
inside the container image; host-runnable tests redirect HOME/XDG and force
`OPENCODE_OC_GO_MOCK=1`, so they never touch the real `~/.config/opencode`.

**The API key buys one thing:** a shape check that the live usage payload is
still what we parse. Every TUI display test runs on the mock instead, because it
asserts layout, which does not need live numbers — so the container gate is
hermetic and needs no secret at all.

## CI

| Workflow | Trigger | Jobs |
| -------- | ------- | ---- |
| `test.yml` | push, PR, weekly (Mon 06:00 UTC) | `unit` always; `container-e2e` (Docker gate) only on `main` pushes, the schedule, and non-draft PRs |
| `bump-deps.yml` | weekly (Mon 12:30 UTC), manual | `bun update` within the declared ranges, the Dockerfile host pins moved with the SDKs, the Docker gate on the bumped tree, then the commit — nothing is committed unless the gate is green |
| `dev-build.yml` | push to `develop` | `dev-tgz` artifact (90 days), used by `install-dev.sh` |
| `publish.yml` | push to `main` | gate -> release-please Release PR -> OIDC provenance publish; the release carries the tarball, all four plugin bundles and `SHA256SUMS`, and the registry tarball is re-verified after publish |

Releases are cut by [release-please](https://github.com/googleapis/release-please):
merging `develop` into `main` opens/updates a `chore(main): release X.Y.Z` PR
(`feat` -> minor, `fix` -> patch, breaking change -> major; `chore`/`docs`/`ci`/
`test`/`refactor`/`style`/`build`/`perf` never cut a release on their own).
Merging that PR tags `vX.Y.Z`, creates the GitHub release, and publishes to npm
after the containerized gate. To force a version, add a `Release-As: X.Y.Z`
footer to a commit merged to `main`.

## Troubleshooting

- **Plugin didn't load**: check `npx oc-go-usage-display-show` / `status`, then
  restart the host (`opencode debug config` shows the resolved plugin list;
  `opencode --pure` skips plugins, so it is not a valid check).
- **No API key or subscription**: surfaces show `Go n/a (…)`; set
  `OPENCODE_OC_GO_API_KEY` or `KILO_OC_GO_API_KEY` for the host you are
  running, sign in through the
  `opencode-go` provider in the host you are running, or configure workspace +
  cookie. Each host reads only its own `auth.json`, so a Kilo login does not
  feed the opencode plugin and vice versa.
- **Kilo only**: `npx oc-go-usage-display-init --target kilo`; Kilo ignores
  `sidebar`/`statusline` options, so toggle surfaces with the command palette
  instead.
- **Stale copy install**: copy installs never auto-update; re-run
  `npx oc-go-usage-display-init --copy` and restart.

## Uninstall

```sh
npx oc-go-usage-display-remove
npm uninstall oc-go-usage-display
```

Removes the plugin files and the server + `tui.json` entries from every
installed host (`--target` or `--config-dir`/`--kilo-config-dir` narrows it).
Secrets are never touched: env vars, `auth.json`, and
`oc-go-usage-display.json` stay in place.
