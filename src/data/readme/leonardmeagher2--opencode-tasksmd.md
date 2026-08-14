# OpenCode Tasks

This repo contains two packages for `TASKS.md` task boards.

- `packages/tasksmd` is the Markdown board library.
- `packages/opencode-tasksmd` is the OpenCode plugin that runs tasks in the background.

Note: `opencode-tasksmd` does not run tasks on its own. Call `tasks_start` in
OpenCode to turn on background work for the current session.

## Setup

Install dependencies once:

```sh
bun install
```

## Common Commands

```sh
bun test
bun run typecheck
bun run build
bun run dev
```

`bun run dev` builds the local plugin bundle at `.opencode/plugins/tasks.js`.

`bun run typecheck` runs `tsc --noEmit` over the scripts and both packages.
`packages/tasksmd` emits its declarations during `build`, so run `bun run build`
before typechecking a fresh checkout.

## Releases

```sh
bun run change
bun run version
bun run release
```

`bun run release` attempts every package and reports failures after all publish
commands have run. Additional arguments are passed to each `bun publish` call.

## Package Docs

- `packages/tasksmd/README.md`
- `packages/opencode-tasksmd/README.md`

Use the package READMEs for install and usage details.
