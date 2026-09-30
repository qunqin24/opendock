# opencode-sidebars

A collection of [opencode](https://opencode.ai) TUI sidebar plugins. Each panel is a small, standalone plugin published as its own npm package, so you can install only the ones you want.

| Package | Panel | Shows |
| --- | --- | --- |
| [`ocgo-usage-tui`](packages/ocgo-usage-tui) | OCGO Usage | OpenCode Go rolling (5h), weekly and monthly limits, with time until each resets |
| [`oc-session-context`](packages/oc-session-context) | Session Context | Context window used this session, the model's limit, and session cost |
| [`oc-model-speed`](packages/oc-model-speed) | Model Speed | Time to first token (TTFT) and tokens per second for the latest turn |

```
OCGO Usage
Rolling  █░░░░░░░░░░░░░░░    3%  2h19m
Weekly   █░░░░░░░░░░░░░░░    3%  6d4h
Monthly  ███████████░░░░░   69%  5d23h

Session Context
█████░░░░░░░░░░░░░░░░░░░ 42%
86,120 of 200,000 / $0.42

Model Speed
TTFT 1.2s
TPS  25.3
```

## Requirements

- opencode 1.18 or newer
- For the usage panel, an [OpenCode Go](https://opencode.ai/go) subscription connected in opencode with `/connect`

## Install

Install any panel with `opencode plugin`, which installs the npm package and adds it to your `tui.json`:

```bash
opencode plugin ocgo-usage-tui --global
opencode plugin oc-session-context --global
opencode plugin oc-model-speed --global
```

Restart opencode; each panel appears in the sidebar.

## Configure

Each panel has a few settings at the top of its source file. See the panel's own README for the options:

- [`ocgo-usage-tui`](packages/ocgo-usage-tui/README.md)
- [`oc-session-context`](packages/oc-session-context/README.md)
- [`oc-model-speed`](packages/oc-model-speed/README.md)

## Development

This is a bun workspace; the packages live in `packages/`.

```bash
bun install
```

There is no build step: each plugin ships as a single `.tsx` file that opencode loads directly. The workspace `devDependencies` exist only so editors resolve the plugin API types.

To run a panel from a local checkout instead of the published package, point `tui.json` at its folder:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-sidebars/packages/ocgo-usage-tui"]
}
```

`~` is not expanded here, so use an absolute path.

## Publishing

Releases are published to npm by [`.github/workflows/publish.yml`](.github/workflows/publish.yml) when a `v*` tag is pushed. Each package is published only if its version is not already on the registry, so bump the version of the package(s) you changed before tagging.

## License

MIT
