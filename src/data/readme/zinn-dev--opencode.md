# Zinn

A kanban workflow in the terminal.

> [!IMPORTANT]
> **Experimental.** Commands, output, and the database schema may change between releases.
> Save a backup before upgrading: `zinn backup`.

## Install

```sh
npm i -g @zinn-dev/cli
```

Requires [Node.js](https://nodejs.org/) 24.15.0 or newer. See [Install](https://zinn.sh/docs/installation) for setup options, upgrading, and uninstalling.

## Quick start

Create a project, add a task, and move it through the board:

```sh
zinn project create MDR --name 'Macrodata Refinement'
zinn task create MDR --title 'Refine 75% of the numbers'
zinn task list MDR
zinn task move MDR-1 'In Progress'
```

See the [Quick start](https://zinn.sh/docs/quick-start) for a complete first workflow, the [CLI reference](https://zinn.sh/docs/cli) for commands and input rules, and [Install with coding agents](https://zinn.sh/docs/installation#use-with-coding-agents) for agent setup.

## Data and upgrades

By default, Zinn stores projects and tasks in `~/.zinn/data/zinn.sqlite`. See [Data and backups](https://zinn.sh/docs/data) and [Settings](https://zinn.sh/docs/settings) for storage and upgrade behavior.

## Development

Zinn uses [Bun](https://bun.sh), pnpm, Node.js, and Git. From the repository root:

```sh
bun install
bun run typecheck
bun run test
bun run test:node
```

Package and installed-consumer tests need pnpm, Git, and Node.js 24.15.0 or newer on `PATH`. The [website](docs/README.md) has its own checks.

Seed and use the isolated `.zinn-dev` database:

```sh
bun run dev:seed
bun run dev -- task list
```

`dev:seed` deletes and recreates only `.zinn-dev` and its SQLite sidecar files. `dev` always uses that isolated database; ordinary `zinn` commands use your configured database.

## Packages

| Package                                     | Purpose                           |
| ------------------------------------------- | --------------------------------- |
| [`@zinn-dev/cli`](packages/cli/README.md)   | The `zinn` command-line interface |
| [`@zinn-dev/core`](packages/core/README.md) | Shared operations and storage     |
| [`@zinn-dev/tui`](packages/tui/README.md)   | Terminal interface stub           |

## License

MIT
