# opencode-fleetview

An [opencode](https://opencode.ai) TUI plugin that adds a `/fleetview` command.
Run it and opencode hands the terminal over to
[fleetview](https://github.com/costajohnt/fleetview), the roster TUI for
backgrounded agent sessions. Quit fleetview and you land back in opencode where
you left off.

The plugin contains no fleetview logic. It is a launcher, about 70 lines.

## Requirements

- opencode >= 1.18
- fleetview on your `PATH` (`npm i -g fleetview`, needs Node >= 24)

If fleetview is not installed, `/fleetview` shows a toast with the install
command instead of launching anything.

## Install

```sh
opencode plugin opencode-fleetview
```

That resolves the package, detects its TUI entrypoint, and adds it to the
`plugin` array in `.opencode/tui.json` (or `~/.config/opencode/tui.json` with
`--global`). TUI plugins are configured in `tui.json`, not `opencode.json`.

To wire it up by hand:

```json title=".opencode/tui.json"
{
  "plugin": ["opencode-fleetview"]
}
```

## Use

Type `/fleetview` in the opencode prompt, or find "FleetView" in the command
palette (`ctrl+p`).

## How it works

The plugin registers one palette command through the opencode TUI plugin API.
When it runs it looks for a `fleetview` executable on `PATH`, calls
`api.renderer.suspend()` to release the terminal, spawns fleetview with
inherited stdio, and calls `api.renderer.resume()` once fleetview exits.

## Development

```sh
npm test
```

To load a local checkout:

```sh
opencode plugin /path/to/opencode-fleetview
```

## License

ISC
