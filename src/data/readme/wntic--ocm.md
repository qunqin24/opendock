# ocm — plugin marketplace for opencode

[![CI](https://github.com/wntic/ocm/actions/workflows/ci.yml/badge.svg)](https://github.com/wntic/ocm/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@wntic/ocm?color=cb3837&logo=npm)](https://www.npmjs.com/package/@wntic/ocm)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/wntic/ocm/blob/main/LICENSE)
[![for opencode](https://img.shields.io/badge/for-opencode-111)](https://opencode.ai)
[![runtime: bun](https://img.shields.io/badge/runtime-bun-f9f1e1?logo=bun&logoColor=black)](https://bun.com)

**Stop copy-pasting opencode skills, agents and commands between repos.**
ocm installs them from any git repository — once, into your global opencode
config — so they work in **every project** and stay current with one
`ocm update`. Share a whole toolkit with your team as a single git URL.

![ocm demo](https://raw.githubusercontent.com/wntic/ocm/main/docs/demo.gif)

**Try it in 30 seconds** with the example marketplace,
[wntic/ocm-demo](https://github.com/wntic/ocm-demo):

```bash
npm install -g @wntic/ocm
ocm add https://github.com/wntic/ocm-demo
# restart opencode, then type /ocm — or /git-kit:commit
```

## Why ocm?

opencode reads skills, agents and commands from a project's `.opencode/` and
from your global `~/.config/opencode/`, and its `plugin` setting can load JS
plugins from npm. What it does not have is a way to *distribute* them:

| | Copy into each repo's `.opencode/` | Copy into `~/.config/opencode/` | npm `plugin` setting | **ocm** |
|---|:-:|:-:|:-:|:-:|
| Available in every project | — | ✓ | ✓ | ✓ |
| Skills, agents, commands | ✓ | ✓ | — | ✓ |
| JS plugins and MCP servers | by hand | by hand | JS only | ✓ |
| Updates | by hand, per repo | by hand | npm versions | `ocm update`, plus auto-sync on start |
| Share a toolkit with your team | commit it to every repo | — | one package per plugin | one git URL |
| Asks before running a plugin's code | — | — | — | ✓ |
| Your own files are never overwritten | — | — | — | ✓ |

A marketplace is just a git repository — start your own from the
[ocm-demo template](https://github.com/new?template_name=ocm-demo&template_owner=wntic)
and see [Write a marketplace](https://github.com/wntic/ocm/blob/main/docs/authoring.md).

## Install

```bash
npm install -g @wntic/ocm          # latest
npm install -g @wntic/ocm@1.0.3    # a specific version
```

Or with bun:

```bash
bun install -g @wntic/ocm          # for the `ocm` binary on PATH
bunx @wntic/ocm add <url>          # or run it without installing
```

The npm package is `@wntic/ocm`; the binary it installs is `ocm`. **Bun must
be on `PATH` whichever way ocm is installed** — the `ocm` binary is TypeScript
run by Bun (`bin/ocm.ts`, `"engines": { "bun": ">=1.0.0" }`). Also requires
git and [opencode](https://opencode.ai).

## Quickstart

A session against the public demo marketplace,
[github.com/wntic/ocm-demo](https://github.com/wntic/ocm-demo) — three small
plugins for git, review and docs work:

```bash
ocm add https://github.com/wntic/ocm-demo
ocm list
```

`ocm add` clones the marketplace and materializes its plugins (`git-kit`,
`review-kit`, `docs-kit`); `ocm list` shows what landed. **Restart opencode
to activate**, then open `/ocm` to browse and update plugins across
marketplaces, or use a command directly — `/git-kit:commit` writes a
Conventional Commits message for the staged changes.

```bash
ocm update                # pull + re-materialize
ocm remove ocm-demo       # full teardown
```

Changes apply on the next opencode start — there is no reload API.

## Commands

| Command | What it does |
|---|---|
| `ocm add <url\|path> [--ref <ref>] [--explicit] [--name <name>] [--trust\|--no-trust]` | add a marketplace (github url or local dir) |
| `ocm init` | install auto-sync loader |
| `ocm remove <name>` | remove a marketplace and its links |
| `ocm update [marketplace] [--quiet] [--json] [--trust\|--no-trust]` | pull latest changes (all or one marketplace) |
| `ocm pin <name> <ref>` | follow a branch or tag |
| `ocm pin <name> --clear` | back to the default branch |
| `ocm list [--all] [--json]` | list marketplaces and plugins |
| `ocm search <query> [--enabled-only] [--json]` | search cached plugin metadata |
| `ocm info <plugin>[@<marketplace>] [--json]` | show a plugin's cached record |
| `ocm install <plugin>[@<mp>] [--force]` | enable a plugin and materialize its components |
| `ocm uninstall <plugin>[@<mp>]` | disable a plugin and remove its links |
| `ocm enable <plugin>[@<mp>]` / `ocm disable <plugin>[@<mp>]` | aliases of install / uninstall |
| `ocm mode <name> <auto\|explicit>` | change when new upstream plugins install |
| `ocm trust <name> [--yes]` | approve a marketplace's executable components |
| `ocm untrust <name>` | revoke trust and remove executable components |
| `ocm scan <url\|path\|plugin>` | dry-run: show what would be installed |
| `ocm validate [path]` | lint a marketplace repo (default: current directory) |
| `ocm doctor [--fix]` | diagnose this installation; --fix applies safe fixes |
| `ocm loader uninstall` | remove auto-sync loader |
| `ocm --version` | print the version |

## Documentation

- [Write a marketplace](https://github.com/wntic/ocm/blob/main/docs/authoring.md) —
  the repository format, manifests and validation rules.
- [Reference](https://github.com/wntic/ocm/blob/main/docs/reference.md) —
  how it works, per-plugin installs, exit codes, precedence, config safety,
  trust, the loader, the TUI, migration.

## Requirements

- [opencode](https://opencode.ai)
- git
- [bun](https://bun.com) on `PATH` (to run the CLI)

Tested on macOS and Linux — CI runs the full test suite and a probe against
the real opencode on both. Windows is untested: ocm installs components as
symlinks, which Windows restricts.

## License

[MIT](LICENSE)
