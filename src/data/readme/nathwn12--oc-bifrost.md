# oc-collections

OpenCode plugins, MCP servers and tooling by nathwn12.

Each package installs on its own. There is no bundle and no all-in-one — you take one thing, not the set.

## Start here

**[Browse `packages/`](https://github.com/nathwn12/oc-collections/tree/main/packages)**

Every package is a folder with its own README. Open the one you want; its README carries the install steps for that package and nothing else. Nothing here requires the whole repo.

## What's in it

| Package | Kind | Version | What it does | Install |
| --- | --- | --- | --- | --- |
| oc-bifrost | plugin | `1.6.13` | Runs older OpenCode plugins on the current runtime. | Add `@nathwn12/oc-bifrost` to your `plugins`. |
| oc-flight-deck | plugin | `0.21.0` | Live session telemetry in the OpenCode sidebar. | Add `oc-flight-deck` to your `plugins`. |
| oc-harness-setup | CLI | `1.0.0` | Installs the Windows agent harness. | `npx -y oc-harness-setup setup` |
| oc-session-driver | plugin | not published | Cross-session talk: list live sessions, send one message to a peer, read its reply. | Not published yet, so nothing installs it. |
| rea-shim | MCP | `0.2.2` | Launcher for the rea reverse-engineering server. | `npx -y rea-shim --doctor` |
| oc-collections | repo | — | This index and npm-workspaces monorepo. | — |

Each package's own README has the full steps, options and requirements. This page only tells you which folder to open.

The `gladius` and `puppet` MCP servers are not in this repo — they live in their own repositories. Their launchers fetch engine binaries from those repositories' release assets on first run.

`oc-session-driver` is in the tree but not published, so it is not an install target yet.

## Requirements

Windows. Every package here targets Windows and none of them claims support elsewhere.

## Development

From the repo root:

```sh
npm install
npm run check
npm run pack:check
```

`npm run check` runs the docs checker, its self-test, and every workspace's own check. `pack:check` runs check and build, then verifies each tarball.

Releases use tags of the form `<package>@<version>`. The release workflow publishes over OIDC with provenance and no stored token.

## Licence

MIT. See [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
