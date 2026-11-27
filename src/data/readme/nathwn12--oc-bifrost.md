<h1 align="center">oc-collections</h1>

**OpenCode plugins, MCP servers and CLIs that install one at a time, one folder each.**

## Install

Open [`packages/`](packages), or take a row from the table below. Each package installs on its own; nothing here requires the whole repository, and the root manifest is `private: true`, so there is nothing to install for the index itself.

## Use it

| Package | Kind | Version | What it does | Install |
| --- | --- | --- | --- | --- |
| janua | MCP | `0.5.2` | Persistent interactive terminals: spawn a program, write to it, read live output, resize it, kill it. | `npx @nathwn12/janua` |
| oc-bifrost | plugin | `1.7.1` | Runs V1-era OpenCode plugins on OpenCode V2. | Add `@nathwn12/oc-bifrost` to `plugins`. |
| oc-flight-deck | plugin | `0.24.0` | Live cost, token, cache and context telemetry in the sidebar. | Add `oc-flight-deck` to `plugins`. |
| oc-harness-setup | CLI | `1.0.2` | Installs a Windows OpenCode starter, behind a doctor gate. | `npx --yes oc-harness-setup setup` |
| oc-phone-link | plugin | `2.2.0` | Drives OpenCode from an Android phone on the same Wi-Fi with an in-server beacon, pinned TLS and one PIN. | Add `oc-phone-link` to `plugins`. |
| oc-plugin-view | plugin | `0.2.0` | Lists every loaded server plugin in the sidebar. | `opencode plugin add oc-plugin-view` |
| oc-talk | plugin | `0.6.2` | Sends addressed synthetic notes between sessions and reads the replies. | Add `oc-talk` to `plugins`. |
| oc-title | plugin | `0.1.0` | Carries session state in the title: active, parked or closed, with scope refresh. | Add `oc-title` to `plugins`. |
| rea-shim | CLI | `0.4.0` | Installs and launches Craft Anything on Windows x64, or serves it as a headless MCP with --mcp. | `npx -y rea-shim@latest` |
| oc-collections | repo | — | This index and the npm-workspaces monorepo behind it. | — |

An MCP goes into your client's server list, a plugin into `plugins` in your `opencode.jsonc`, and a CLI runs once.

## Requirements

- Node 22 or newer. Each workspace's `package.json` declares its own engines range; read that source instead of a copied list.
- OpenCode 2 for the plugins and the starter. Each package's install guide and manifest state its own host floor; read those sources rather than a copied table.
- Windows 10 or 11 x64 for `oc-harness-setup` and `rea-shim`. `janua` runs on Windows, Linux and macOS.
- An MCP client for `janua`.

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
