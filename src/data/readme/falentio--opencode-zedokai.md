# @falentio/opencode-zedokai

Zedokai for OpenCode v2. That is the Monokai Pro theme from Zed, ported to OpenCode's v2 theme format and shipped as a CLI plugin.

Ships all 14 Zed themes, including the Filter variants and the light pair.

| Theme | Zed name |
| --- | --- |
| `zedokai` | Zedokai |
| `zedokai-filter-octagon` | Zedokai (Filter Octagon) |
| `zedokai-filter-ristretto` | Zedokai (Filter Ristretto) |
| `zedokai-filter-spectrum` | Zedokai (Filter Spectrum) |
| `zedokai-filter-machine` | Zedokai (Filter Machine) |
| `zedokai-classic` | Zedokai Classic |
| `zedokai-darker` | Zedokai Darker |
| `zedokai-darker-filter-octagon` | Zedokai Darker (Filter Octagon) |
| `zedokai-darker-filter-ristretto` | Zedokai Darker (Filter Ristretto) |
| `zedokai-darker-filter-spectrum` | Zedokai Darker (Filter Spectrum) |
| `zedokai-darker-filter-machine` | Zedokai Darker (Filter Machine) |
| `zedokai-darker-classic` | Zedokai Darker Classic |
| `zedokai-light` | Zedokai Light |
| `zedokai-light-filter-sun` | Zedokai Light (Filter Sun) |

This release targets OpenCode v2 only. The v1 package used the `oc-themes` manifest field, which v2 removed.

## Install

```sh
opencode plugin add @falentio/opencode-zedokai
```

OpenCode v2 installs the package and adds it to `~/.config/opencode/cli.json`. On the next start the plugin copies the themes into `~/.config/opencode/themes/` and the theme picker picks them up.

Then pick one:

```sh
/themes
```

Or pin it in `cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "theme": { "name": "zedokai", "mode": "dark" }
}
```

The plugin runs once. After the first start the themes are plain files in the theme directory, and the plugin stays quiet while the files match what it ships.

## Where the themes go

By default the plugin writes to the global theme directory, `~/.config/opencode/themes/`. To keep them in the project instead, pass the option through `cli.json`:

```json
{
  "plugins": [
    { "package": "@falentio/opencode-zedokai", "options": { "scope": "project" } }
  ]
}
```

Project scope writes to `<project>/.opencode/themes/`. The plugin walks up from the session directory to the repository root, so starting opencode in a subdirectory still installs into the project.

## v2 differences worth knowing

- A theme declares the modes it has. The 12 dark themes declare `dark` and the two light themes declare `light`, where the v1 files carried both modes with the same colors. Selecting a light theme while the mode is `dark` falls back to the mode the theme has.
- v1 shipped `border` and `borderSubtle` as the same color and v2 has one border token, so `borderSubtle` has no v2 home. The validator checks that the surviving `border` still matches it.

## Why there is plugin code

OpenCode v1 read a theme-only package through the `oc-themes` field in `package.json` and copied the files itself. v2 has no such field, and the v2 CLI plugin API cannot register themes. The documented way to add a theme is to put its JSON file in a theme directory.

So this package carries the install step itself. `src/tui.ts` is a v2 CLI plugin with a `setup` hook that copies `themes/*.json` into the theme directory and asks the theme system to re-read it. The rest of the package is the theme files and the tools that generate them.

`src/server.ts` registers nothing. The server plugin loader resolves a `./server` entrypoint before it hands the plugin list to the CLI, and a package with only `./tui` makes it fail with `Plugin entrypoint not found`. That failure is reported from the server side, and the CLI then never receives the plugin, so the themes are never installed. The empty server entrypoint exists so the loader accepts the package.

## Develop

```sh
npm run check
```

`check` runs three gates:

- `tsc --noEmit` over `src/` and `test/`.
- The unit suite: the package shape, the v2 theme schema, and the installer.
- `scripts/validate-themes.mjs`, which decodes every shipped theme with OpenCode's own `@opencode/theme` schema and checks 700 resolved colors against the colors the v1 package shipped, captured in `test/expected-colors.json`.

There is no build. OpenCode loads `src/tui.ts` directly.

To drive the real binary end to end:

```sh
OPENCODE_BIN=/path/to/opencode-v2 node scripts/live-proof.mjs
```

It packs the package, installs it into a throwaway sandbox, starts the TUI, and checks that the themes land and that the TUI paints with the Zedokai background.

## Regenerate themes

The theme JSON is generated from the upstream Zed theme, not hand-edited. Clone [slymax/zedokai](https://github.com/slymax/zedokai) and run:

```sh
node scripts/generate-themes.mjs /path/to/zedokai/themes/zedokai.json
```

The generator maps Zed's nested `syntax.*` keys onto the token names OpenCode used, then hands that to OpenCode's own `migrateV1` to produce the v2 document. Keeping the format conversion in OpenCode's code is what makes the hue scales and semantic references match what the theme system expects.

After regenerating, run `npm run check`. If a new upstream theme appears, it lands in `themes/` automatically.

## Credits

Zedokai is created by [slymax](https://github.com/slymax) and is based on the [Monokai Pro](https://monokai.pro) color scheme. This package ports those colors to OpenCode.

## License

MIT
