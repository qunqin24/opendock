# oc-collections

OpenCode plugins, MCP servers and tooling by nathwn12.

Each package installs on its own. There is no bundle and no all-in-one — you take one thing, not the set.

## Install

**[Browse `packages/`](https://github.com/nathwn12/oc-collections/tree/main/packages)**

Every package is a folder with its own README. Open the one you want; its README carries the install steps for that package and nothing else. Nothing here requires the whole repo.

## What it does

| Package | Kind | Version | What it does | Install |
| --- | --- | --- | --- | --- |
| janua | MCP | `0.5.1` | Persistent interactive terminals: spawn a program, type into it, read live output, resize it, kill it. | `npx -y @nathwn12/janua` (stdio MCP server). |
| oc-bifrost | plugin | `1.7.1` | Runs older OpenCode plugins on the current runtime. | Add `@nathwn12/oc-bifrost` to your `plugins`. |
| oc-fallback | plugin | - | Steps an agent seat down its model fallback ladder when its model fails. | Repo path only: add `packages/oc-fallback` to your `plugins`. Private, never published. |
| oc-flight-deck | plugin | `0.22.0` | Live session telemetry in the OpenCode sidebar. | Add `oc-flight-deck` to your `plugins`. |
| oc-harness-setup | CLI | `1.0.2` | Installs the Windows agent harness. | `npx -y oc-harness-setup setup` |
| oc-plugin-view | plugin | `0.2.0` | Installed plugin list in the OpenCode sidebar. | Add `oc-plugin-view` to your `plugins`. |
| oc-talk | plugin | `0.5.0` | Cross-session talk, two tools: send one message into any live session and read what it said back. | Add `oc-talk` to your `plugins`. |
| rea-shim | MCP | `0.2.3` | Launcher for the rea reverse-engineering server. | `npx -y rea-shim --doctor` |
| oc-collections | repo | — | This index and npm-workspaces monorepo. | — |

Each package's own README has the full steps, options and requirements. This page only tells you which folder to open.

The `gladius` and `puppet` MCP servers are not in this repo - they live in their own repositories. Their launchers fetch engine binaries from those repositories' release assets on first run.

## Requirements

Windows only for rea-shim (Windows x64) and oc-harness-setup (Windows 10/11), the two packages whose own requirements name Windows. janua names Windows, Linux and macOS; oc-bifrost and oc-flight-deck say any platform the host runs on; oc-talk and oc-plugin-view state no platform, so this page claims none for them.

## Development

From the repo root:

```sh
bun install --frozen-lockfile
bun run check
bun run pack:check
```

`bun run check` runs the docs checker, its self-test, and every workspace's own check. `pack:check` runs check and build, then verifies each tarball.

Manual npm commands (`npm login`, `npm publish`, `npm trust github`) are owner-only and 2FA-gated with a passkey. Use `scripts/npm-passkey.mjs` in a visible terminal; the release workflow's OIDC publish does not need it.

Releases use tags of the form `<package>@<version>`. The release workflow publishes over OIDC with provenance and no stored token.

## Status

Experimental and still moving. It works today, but it is not a finished
product: interfaces may change, features may be improved or removed, and a
release can break the one before it. This is maintained by one person, not a
team. If it breaks, open an issue with the command you ran and what you saw.

## Links

- [Releases](https://github.com/nathwn12/oc-collections/releases)
- [MIT](LICENSE)
