<div align="center">

# 🧩 opencode-plugins

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![opencode](https://img.shields.io/badge/opencode-v2%20TUI%20plugins-F97316?style=flat-square)](https://opencode.ai)
[![MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

**A small collection of opencode plugins by kud.**

</div>

---

The opencode counterpart of [kud/claude-plugins](https://github.com/kud/claude-plugins). Each plugin is a single TypeScript file, published to npm as `@kud/opencode-<name>`: name it in your opencode config, pinned to a version, and forget about it. There is no build step.

These are opencode v2 plugins and need opencode 2.1.0 or later.

## Features

- **One file per plugin.** Read the whole thing in a sitting, copy it, tweak it.
- **Loaded as-is.** opencode runs the `.ts` directly: nothing to compile or bundle.
- **Typechecked.** Every plugin is checked against the real `@opencode/plugin` and `@opentui` types, so API drift shows up here before it shows up in your terminal.
- **Easy to switch off.** Each plugin registers under its own ID, so a single `-<id>` entry in `plugins` turns it off without touching the rest of your setup.
- **Small and focused.** Plugins do one job and leave the rest of opencode alone.

## Plugins

| Plugin                                             | Kind | What it does                                                                        |
| -------------------------------------------------- | ---- | ----------------------------------------------------------------------------------- |
| [statusline](./plugins/statusline)                 | TUI  | The prompt's footer row as a statusline: path, branch, provider, model and title.   |
| [shell-highlighting](./plugins/shell-highlighting) | TUI  | Shell command names in the theme's amber, in file views and `sh`/`zsh` code fences. |

## Install

TUI plugins go in `~/.config/opencode/cli.json`. Name the package, pinned to a version:

```json
{
  "plugins": [
    "@kud/opencode-statusline@0.1.1",
    "@kud/opencode-shell-highlighting@0.1.0"
  ]
}
```

opencode installs them on the next start. Each plugin's README lists the built-ins it pairs with.

## Development

```sh
git clone https://github.com/kud/opencode-plugins.git
cd opencode-plugins
npm install
npm run typecheck
```

`typecheck` runs `tsc --noEmit` and is the only script: there is no build and no test suite. Plugins live under `plugins/<name>/` as a single `.ts` file with its own `package.json` and README, and each is released by pushing a `<name>-v<version>` tag.

## License

MIT © [kud](https://github.com/kud)
