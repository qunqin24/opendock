<h1 align="center">oc-collections</h1>

**OpenCode plugins, MCP servers and CLIs that install one at a time, one folder each.**

## Install

Open [`packages/`](packages), or take a row from the table below. Each package installs on its own; nothing here requires the whole repository, and the root manifest is `private: true`, so there is nothing to install for the index itself.

## Use it

| Package | Kind | Version | What it does | Install |
| --- | --- | --- | --- | --- |
| janua | MCP | `0.5.2` | Persistent interactive terminals: spawn a program, write to it, read live output, resize it, kill it. | `npx @nathwn12/janua` |
| oc-bifrost | plugin | `1.7.1` | Runs V1-era OpenCode plugins on OpenCode V2. | Add `@nathwn12/oc-bifrost` to `plugins`. |
| oc-dispatch | plugin | — | Routes each request to the cheapest adequate live-catalog model, dormant by default. | Source only, no npm release (source version 0.1.0): `github:nathwn12/oc-collections#main::path:packages/oc-dispatch`. |
| oc-flight-deck | plugin | `0.24.0` | Live cost, token, cache and context telemetry in the sidebar. | Add `oc-flight-deck` to `plugins`. |
| oc-harness-setup | CLI | `1.0.2` | Installs a Windows OpenCode starter, behind a doctor gate. | `npx --yes oc-harness-setup setup` |
| oc-plugin-view | plugin | `0.2.0` | Lists every loaded server plugin in the sidebar. | `opencode plugin add oc-plugin-view` |
| oc-talk | plugin | `0.6.2` | Sends addressed synthetic notes between sessions and reads the replies. | Add `oc-talk` to `plugins`. |
| rea-shim | MCP | `0.2.3` | Launches the upstream `rea` reverse-engineering MCP and can bootstrap its JDK and Ghidra. | `npx -y rea-shim@latest --doctor` |
| oc-collections | repo | — | This index and the npm-workspaces monorepo behind it. | — |

An MCP goes into your client's server list, a plugin into `plugins` in your `opencode.jsonc`, and a CLI runs once. The `gladius` and `puppet` MCP servers keep their source here but publish from the repositories that build their engines; `oc-fallback`, `oc-graphify`, `oc-terminal` and `oc-dispatch` are private, so they load from this repo instead of the registry, by GitHub specifier such as `github:nathwn12/oc-collections#main::path:packages/oc-dispatch`. None of the six carries a version row.

## Requirements

- Node 22 or newer. `janua` and `rea-shim` narrow that to `^22.23.4`, `^24.22.1` or `>=26.12.1`; `oc-flight-deck` and `oc-plugin-view` also run under Bun 1.4 or newer.
- OpenCode 2 for the plugins and the starter. The floors differ per package: `2.1.1` for `oc-flight-deck`, `2.2.0` for `oc-harness-setup`, `2.2.6` for `oc-bifrost` and `oc-plugin-view`. Each package README states its own.
- Windows 10 or 11 for `oc-harness-setup`, and Windows x64 plus a JDK and Ghidra, or `--bootstrap`, for `rea-shim`. `janua` runs on Windows, Linux and macOS.
- An MCP client for `janua` and `rea-shim`.

## Development

From the repo root:

```sh
bun install --frozen-lockfile
bun run check
bun run pack:check
```

`bun run check` runs the vocabulary and launcher guards, the index check and its self-test, the docs check and its self-test, then every workspace's own check. `bun run pack:check` adds a build and verifies each tarball.

```text
oc-collections/
|-- packages/    one family package per directory
|-- scripts/     index, docs, workspace and release checks
|-- docs/        migrations and the release lane
|-- assets/      shared footer signature
|-- .github/     ci.yml and release.yml
`-- Cargo.toml   a virtual workspace with no members
```

A merge to `main` is the release: `docs/RELEASE.md` derives each package's version from the commits since its tag, tags it, and publishes over OIDC with provenance. History lives in `CHANGELOG.md`, at the root for the index and beside each listed package for its release.

## Status

**Active** — maintained, issues welcome.

## Links

- [Issues](https://github.com/nathwn12/oc-collections/issues)
- [Packages on npm](https://www.npmjs.com/~nathwn12)
- [Release lane](docs/RELEASE.md)
- [Migrations](docs/MIGRATIONS.md)
- [Changelog](CHANGELOG.md)
- [MIT licence](LICENSE)

<p align="center"><sub>Built by nathwn12</sub></p>
