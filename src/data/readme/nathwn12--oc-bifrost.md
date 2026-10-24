# oc-collections

The single source for nathwn12's OpenCode plugins and MCP servers, each installable on its own.

## Install

**OpenCode plugins.** Add the package name to the `plugins` array in `opencode.jsonc`, then restart OpenCode:

```json
{ "plugins": ["@nathwn12/oc-bifrost"] }
```

Use `oc-flight-deck` in the same position for the sidebar panel.

**Command-line tools.** Run:

```sh
npx -y oc-harness-setup setup
```

**MCP servers.** Run:

```sh
npx -y rea-shim --doctor
npx -y gladius-mcp
npx -y puppet-mcp
```

The gladius and puppet launchers download their engine binaries from the `gladius` and `puppet` repositories' release assets on first run.

## Packages

| Package | What it does | Version | Links |
| --- | --- | --- | --- |
| oc-bifrost | Runs V1-era OpenCode plugins on the V2 runtime. | `1.6.11` | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/@nathwn12%2Foc-bifrost) |
| oc-flight-deck | Live session telemetry in the OpenCode sidebar. | `0.20.4` | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/oc-flight-deck) |
| oc-harness-setup | Installs and orchestrates the Windows harness. | `0.4.5` | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/oc-harness-setup) |
| rea-shim | One-line MCP launcher for rea. | `0.1.4` | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/rea-shim) |
| gladius-mcp | Browser-use MCP server; the engine binaries come from the `gladius` repo's release assets. | own release lane | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/gladius-mcp) |
| puppet-mcp | Windows desktop-control MCP server; the engine binaries come from the `puppet` repo's release assets. | own release lane | [repo](https://github.com/nathwn12/oc-collections) · [npm](https://www.npmjs.com/package/puppet-mcp) |
| oc-collections | This index and npm-workspaces monorepo. | `this index` | [repo](https://github.com/nathwn12/oc-collections) |

`gladius-mcp` and `puppet-mcp` publish from their own release lanes.

## Development

From the repo root:

```sh
npm install
npm run check
npm test
npm run pack:check
```

`npm run check` runs the documentation checker, its self-test, and the workspace checks — not the index checks, which are separate steps in `.github/workflows/check.yml` and can be run by hand with `pwsh -NoProfile -File scripts/check-index.ps1 --structural`. `pack:check` runs check and build, then verifies every tarball.

Package releases use tags `<package>@<version>`. The `release` workflow is OIDC-only; `dry_run` defaults to true. The lane has run: all four packages are published through OIDC with provenance, and the post-publish verification retries npm propagation lag.

## Licence

MIT. See [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
