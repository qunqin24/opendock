# OpenCode Provider Guard

Restricts which providers OpenCode can use in selected directories. Useful for
keeping personal, pay-as-you-go providers out of work projects. It blocks
disallowed providers.

![OpenCode's model picker shows models from multiple providers in personal projects and only GitHub Copilot models in work.](assets/provider-guard-demo.gif)

## Compatibility

- OpenCode **V2**; tested against `@opencode/plugin` 2.0.24.
- Bun 1.4.2 for development. Node.js 22.12+ is required for Node-based use; the
  published ESM also works with Bun.

## Install and enable

Install the published package with Bun:

```sh
bun add @okram78/opencode-provider-guard
```

Or with npm:

```sh
npm i @okram78/opencode-provider-guard
```

To enable the plugin, add it to your **global** OpenCode config
(`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@okram78/opencode-provider-guard@1.0.0",
      "options": {
        "rules": [
          {
            "root": "~/projects/work",
            "allowProviders": ["github-copilot"],
          },
        ],
      },
    },
  ],
}
```

Use a global entry so the guard loads in every project. Preserve other config
settings. For local development, build the package and replace the `package`
value with the absolute path to its `dist` directory.

## Rules

- `root` is an absolute path or `~`/`~/...`; it covers the directory and all
  descendants. Globs, relative paths, and environment-variable expansion are not
  supported.
- `allowProviders` contains exact, case-sensitive provider IDs (not model IDs).
  An empty list denies all providers.
- Overlapping rules are intersected, so a nested rule can narrow but never relax
  an outer rule. No matching rule means no restriction.
- Both lexical and resolved paths are checked, including symlink targets. Invalid
  paths and filesystem errors fail closed.

## Development

```sh
bun install --frozen-lockfile
bun run check
npm pack --dry-run
```

## License

[MIT](LICENSE).
