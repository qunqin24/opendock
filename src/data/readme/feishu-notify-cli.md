# feishu-notify (monorepo)

Feishu (Lark) bot notifications for local AI agents — one config layer, one sender, one
adapter per agent. **No webhook is ever compiled in**: the address is resolved at send
time from the user's own config, and if it cannot be resolved the sender exits `2` with
guidance instead of delivering to somebody else's bot.

This repository is a **single repo with three packages** (`npm` workspaces): the CLI and both
adapters (opencode, DSH) are built and **published to npm (v0.1.0)**.

## Packages

| Package | Path | Status | What it is |
|---|---|---|---|
| `feishu-notify-cli` | [`packages/cli`](./packages/cli) | ✅ **published to npm** (v0.1.0) | The core: the `feishu-notify` bash sender + the `feishu-notify-cli` Node config/diagnostics/`install` CLI. Ships both binaries. |
| `opencode-feishu-notify` | [`packages/opencode`](./packages/opencode) | ✅ **published to npm** (v0.1.0) | opencode v2 plugin: cards on turn end / permission / form, routed with `--channel opencode`. Holds **no** webhook — it calls the sender, which resolves the address from your config. |
| `dsh-feishu-notify` | [`packages/dsh`](./packages/dsh) | ✅ **published to npm** (v0.1.0) | DSH (Cordis) bundle: cards on turn end / approval / **user questions & plan review**, routed with `--channel dsh`. Also holds no webhook. |

Legend: ✅ implemented and measured · ⚠ assumed / not directly observed · ✖ not implemented.
Per-area verification state (including what is *not* yet observed in a live DSH) is in
[`packages/dsh/README.md`](./packages/dsh/README.md#verified-vs-not).

## Layout

```
.
├── package.json                 # private root: workspaces ["packages/*"], test fan-out
├── LICENSE                      # MIT (every package carries the same copy)
├── README.md / README.zh-CN.md  # this file — repo overview
└── packages/
    ├── cli/                     # the implemented core package
    │   ├── package.json         #   name: feishu-notify-cli, bin ×2, files whitelist
    │   ├── bin/feishu-notify    #   the sender (bash)
    │   ├── bin/feishu-notify-cli#   config/init/channel/doctor/resolve/footer/install (Node)
    │   ├── lib/                 #   config resolution, commands, sender, wiring self-check, install targets, secret gate
    │   ├── tests/               #   assertions + byte-exact golden fixtures
    │   └── README.md            #   the full documentation for the package
    ├── opencode/                # the implemented adapter (published to npm)
    │   ├── package.json         #   name: opencode-feishu-notify, main → src/feishu-notify.ts
    │   ├── src/feishu-notify.ts #   the plugin (no webhook: passes --channel, the CLI resolves it)
    │   ├── scripts/deploy.mjs   #   copy the plugin to the live dir; --check is a drift gate
    │   ├── tests/               #   module / channel / sender-resolution / routing / live-hash suites
    │   └── README.md            #   install, events, channel semantics, troubleshooting
    └── dsh/                     # the implemented DSH/Cordis adapter (published to npm)
        ├── package.json         #   name: dsh-feishu-notify, dsh.bundle.patch → cordis.patch.yml
        ├── cordis.patch.yml     #   the bundle layer: one `insert` row for the plugin (channel: dsh)
        ├── lib/index.js         #   turn end / approval / tool failure / user questions (no webhook)
        ├── tests/               #   pure mapping + fake-ctx harness + real-spawn stub executable
        └── README.md            #   events, the blocking user-questions waterfall, channel/bot, limits
```

## Start here

The complete documentation — install, config format, command reference, agent
compatibility, security model, rollback — lives in the package READMEs:

- [`packages/cli/README.md`](./packages/cli/README.md) (English) · [`README.zh-CN.md`](./packages/cli/README.zh-CN.md) (中文)
- [`packages/opencode/README.md`](./packages/opencode/README.md) (English) · [`README.zh-CN.md`](./packages/opencode/README.zh-CN.md) (中文)
- [`packages/dsh/README.md`](./packages/dsh/README.md) (English) · [`README.zh-CN.md`](./packages/dsh/README.zh-CN.md) (中文)

Quick version (install the CLI **globally** — two real binaries in one bin directory; do not point
your wiring at a development checkout, which is how the 2026-10-18 rename made notifications fail
silently):

```sh
npm i -g feishu-notify-cli            # puts both commands on PATH
feishu-notify-cli init                # asks for your webhook, verifies with a test card
feishu-notify-cli doctor              # wiring self-check (sender/resolver/Node, dangling symlinks) + per-channel reachability
feishu-notify-cli install --dry-run   # show what would be merged into your agent configs; writes nothing
feishu-notify-cli install             # wire it up: claude-code writes; opencode declares the published plugin; dsh prints the plugin command
```

Add `--channel <name>` when you want a target pinned to a specific bot: for Claude Code it is
appended to the hook command, for opencode it is written into `options.channel`. Without it, each
caller uses your config's `activeChannel`.

From a clone (works too):

```sh
node packages/cli/bin/feishu-notify-cli init
# or, from inside the package:
cd packages/cli && node bin/feishu-notify-cli init
```

## Develop

```sh
npm test                      # from the repo root: fans out to every workspace
cd packages/cli && npm test   # the CLI suite
cd packages/opencode && npm test   # the plugin suite (includes the live drift gate)
cd packages/dsh && npm test   # the DSH adapter suite (no DSH runtime needed)
npm run secret-scan           # the publish gate (whole-repo git index + the CLI tarball)
```

`npm test` from the root runs the workspace `test` scripts (`packages/cli`,
`packages/opencode` and `packages/dsh`). The plugin suite's live-hash gate **skips** on a machine where the plugin was
never deployed (`deploy --check` exit `2`); it fails only on real drift. The secret gate
deliberately scans the **whole repository index** (not just the current directory) so that neither
the root files nor the other packages can drift out of its view.

## License

MIT — see [`LICENSE`](./LICENSE).
