# opencode-aidlc

An [OpenCode](https://opencode.ai) plugin that adds the **AWS AI-DLC** workflow
as slash commands and installs the official
[awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) rule bundle
into your project.

## What you get

Nine slash commands wrapping the AI-DLC adaptive workflow:

| Command          | Purpose                                                       |
| ---------------- | ------------------------------------------------------------ |
| `/aidlc`         | Start the AI-DLC workflow on a new intent                    |
| `/aidlc-analyze` | Reverse-engineer an existing codebase (brownfield)           |
| `/aidlc-plan`    | Generate or refresh the execution plan for approval          |
| `/aidlc-build`   | Run the Construction phase (per-unit design + code gen)      |
| `/aidlc-test`    | Generate and run build & test                                |
| `/aidlc-status`  | Read-only workflow status                                    |
| `/aidlc-resume`  | Resume an in-progress AI-DLC project                         |
| `/aidlc-refine`  | Amend intent / units / design without losing state          |
| `/aidlc-reflect` | Retrospective of the AI-DLC cycle                            |

The commands reference the AI-DLC rules at
`.aidlc/aidlc-rules/aws-aidlc-rules/core-workflow.md`, which `setup` installs for
you.

## Requirements

- [OpenCode](https://opencode.ai)
- Node.js 18+ (used by the `setup` command)

## Install

Published on npm as
[`opencode-aidlc`](https://www.npmjs.com/package/opencode-aidlc). The quickest way
is to run the bundled `setup` once in your project — no global install or
dependency required:

```bash
# npm
npx opencode-aidlc@latest setup

# pnpm
pnpm dlx opencode-aidlc@latest setup

# Bun
bunx opencode-aidlc@latest setup
```

This will:

1. Copy the nine commands into `.opencode/commands/` (OpenCode does not
   auto-discover commands from npm packages, so they are copied locally).
2. Install the AI-DLC rule bundle into `.aidlc/aidlc-rules/` **only if it does
   not already exist** — it never overwrites rules you have customized. The
   latest release is downloaded from awslabs/aidlc-workflows; if you are offline,
   a copy vendored in this package is used instead.
3. Register `opencode-aidlc` in your `opencode.json` `plugin` array. The config
   location is auto-detected: if an `opencode.json`/`opencode.jsonc` already exists
   in the project root or in `.opencode/`, that file is updated; otherwise it
   defaults to the project root (`./opencode.json`).

### Options

```bash
npx opencode-aidlc setup --global       # install commands in ~/.config/opencode/commands
npx opencode-aidlc setup --force        # overwrite existing command files
npx opencode-aidlc setup --nested       # register the plugin in .opencode/opencode.json
npx opencode-aidlc setup --root         # register the plugin in ./opencode.json (default)
npx opencode-aidlc setup --no-register  # don't modify opencode.json
```

Rules are always installed at the project level (in `./.aidlc/`), even with
`--global`, because they live alongside `aidlc-docs/` for each project.

### Pin it as a project dependency (optional)

If you'd rather lock the version in your repo instead of using `@latest`:

```bash
npm install -D opencode-aidlc      # or: pnpm add -D opencode-aidlc
npx opencode-aidlc setup
```

## Updating

Re-run `setup` with `--force` after upgrading to refresh the command files:

```bash
npx opencode-aidlc@latest setup --force
```

Your `.aidlc/aidlc-rules/` is never overwritten. To pull the latest upstream
rules, delete that folder first and re-run `setup`.

## How it relates to OpenCode plugins

This is a regular OpenCode plugin (it exposes a plugin entry in
`opencode.json`'s `plugin` array — either `./opencode.json` or
`.opencode/opencode.json`, both of which OpenCode loads), but it has no runtime
hooks today — the entry is a no-op placeholder. All behavior is delivered through the slash commands and
the rule bundle installed by `setup`.

## Maintainer notes

```bash
npm run build         # regenerate commands/*.md from src/commands.js
npm run vendor:rules  # refresh the offline rules/ bundle from the pinned release
```

To bump the vendored rules, update `PINNED_VERSION` in `src/rules.js` and run
`npm run vendor:rules`.

## Author

Built by **Jonathan González** at [Dynamic Devs](https://www.dynamicdevs.io) —
jgonzalez@dynamicdevs.io.

## Licensing

This package is MIT licensed. The vendored rule bundle under `rules/` comes from
awslabs/aidlc-workflows and is licensed MIT-0; see [NOTICE](./NOTICE).
