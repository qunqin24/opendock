# opencode-plugins

Atomic [OpenCode](https://opencode.ai) V2 plugins. Each package does one thing, installs alone, and never
depends on a sibling — if you only want the usage HUD, you install only that one.

## Packages

| Package | What it does | Install |
| ------- | ------------ | ------- |
| [`@danielbdev/opencode-go-usage`](packages/go-usage) | OpenCode Go subscription usage — the 5-hour, weekly and monthly windows — in the session sidebar | `opencode plugin add @danielbdev/opencode-go-usage` |
| [`@danielbdev/opencode-agents`](packages/agents) | Subagent status in the session sidebar, with a colour per state | `opencode plugin add @danielbdev/opencode-agents` |

Both render in the session sidebar: usage takes the top of the content region, agents takes the bottom,
below the MCP block.

## Layout

```
packages/
  go-usage/   server half (resolves the credential, reads the endpoint) + TUI half
  agents/     TUI half only
```

A plugin that needs a credential does that work in a **server entrypoint** and hands the TUI nothing but a
snapshot. A plugin that does not need one ships a TUI entrypoint alone. In both cases `src/core/` holds the
pure logic with no host import, which is what the tests run against.

## Development

```sh
npm install
npm test        # node --test across every workspace
npm run typecheck
```

There is no build step: the packages ship their TypeScript sources and OpenCode runs them directly.

## Releasing

A release is cut by pushing a tag shaped `<directory>@<version>`, for example `go-usage@0.1.2`. GitHub
Actions runs the tests and the typecheck, checks that the tag matches the manifest, and **stages** the
version into npm's staging queue. Nothing is installable until a maintainer approves it with 2FA: `npm
stage list`, then `npm stage approve <stage-id>`.

Staging is also what makes a **new** package work with no hand publish and no throwaway version: when a
staged publish creates a name that does not exist yet, npm writes its own `0.0.0-stage` placeholder, and
the real version waits in the queue. The CI credential is a granular token that may only stage packages,
so no credential in this repository can publish on its own.

Versions are **independent per package**: touching one plugin never forces a release of another. The
repository root stays at `0.0.0` and is never published.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and pull requests are welcome. Releases are cut by the
maintainer only, and the release path is protected by a tag ruleset and `CODEOWNERS`.

## Security

- Every package ships its **sources unminified**: there is no build step and no bundle, so the audit
  surface is the entire program.
- **Nothing runs at install time** — no `preinstall`, `postinstall` or `prepare` script anywhere.
- Releases are built and staged by CI from this repository, and published only after a maintainer approves
  the staged version with 2FA; `npm audit signatures` reports whether a published version carries a
  provenance attestation.
- A plugin that touches a credential says exactly what it does with it, and what you can verify instead of
  trusting, in that package's own Security section.

## License

MIT
