# OpenWiki

An [OpenCode](https://opencode.ai) plugin that scaffolds a per-project session wiki.

On plugin load OpenWiki copies the bundled `/wiki-*` slash commands into your
project's `.opencode/commands/` and writes the `wiki/` scaffold
(`README.md`, `TEMPLATE.md`, `INDEX.md`, `QUESTIONS.md`) from the bundled
templates with `<PROJECT_NAME>` substituted to the directory name. That's the
whole plugin — no background agent, no event hooks, no automatic page creation.
Fill in the wiki by hand or wire your own process up to the templates.

## Install

Add the package to your project's `opencode.json`:

```json
{
  "plugin": ["@manti-by/openwiki"]
}
```

(Until published, point OpenCode at this directory directly — copy or symlink it
into `.opencode/plugins/openwiki`.)

Restart OpenCode. On first load the plugin writes its commands into
`.opencode/commands/` and scaffolds `wiki/`. Re-running OpenCode is a no-op for
files the user has already customised.

## Configuration

None. The plugin performs only file copies on disk; it does not read any other
config files, does not talk to providers, and does not register any background
work.

## Layout

```
src/         TypeScript plugin source (compiled to dist/ by bun build)
templates/   wiki/ scaffold: README.md, TEMPLATE.md, INDEX.md, QUESTIONS.md
commands/    /wiki-consistency, /wiki-dedup, /wiki-update command definitions
dist/        Compiled plugin output (generated, not committed)
```

## Development

Built with [Bun](https://bun.sh) and [TypeScript](https://www.typescriptlang.org/).

```sh
bun install              # install dependencies
bun run build            # compile src/ to dist/
bun test                 # run tests
bun run typecheck        # type-check without emitting
bun run lint             # lint & format-check with Biome
bun run format           # auto-fix with Biome
```
