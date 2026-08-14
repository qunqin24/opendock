# OpenCode Optimised Toolings

A zero-touch, updateable OpenCode plugin that turns the terminal UI into a mouse-first IDE and adds production-grade filesystem, terminal, codebase-memory, web, stealth, settings, and host-integration tools.

## One control plane

The public installation contract is one package declaration in `opencode.json`: `opencode-optimised-toolings@latest`. Internally, every deployment decision is recorded in `~/.config/opencode/alonix/deployment.json`; the TUI bridge, coordination pointer, immutable generation, and host enhancement identity are derived state. Humans and agents must not manage those internal outputs independently.

```bash
npm run toolings -- status
npm run toolings -- doctor
npm run toolings -- reconcile
```

`status` explains the desired deployment and every derived invariant. `doctor` exits nonzero on drift. `reconcile` idempotently repairs all derived outputs from the canonical record; use `--source=checkout` only for the mandatory direct-local development phase. This is the complete operational interface for a fresh agent.

## Install

```bash
opencode plugin opencode-optimised-toolings@latest --global
```

Fully quit and restart OpenCode. That single package entry is the complete installation contract: no repository checkout, `file://` path, local skill path, Python environment, manually started service, or project-relative runtime directory is required.

> The npm package must exist in the registry before this command can work. Development checkouts continue to support a local file plugin without rewriting the user's live configuration.

## Zero-touch behavior

On package load Alonix:

1. Registers every server-side tool from the package.
2. Provisions one immutable package generation under `~/.config/opencode/alonix/runtime/generations/` while preserving `opencode-optimised-toolings@latest` as the only public declaration. A provenance-verified host bridge resolves the package's `./tui` export; `tui.json` contains no Alonix entry and generation paths remain internal.
3. Supplies missing Alonix tool permissions, optimized instructions, and the packaged CBM skill in memory while preserving explicit user choices.
4. Migrates only legacy Alonix checkout references when running from an installed npm package. Personal providers, models, plugins, skills, permissions, and unrelated configuration remain untouched.
5. Stores mutable state under `~/.config/opencode/alonix/` rather than inside an immutable npm cache.
6. Provisions heavyweight optional assets lazily so startup remains fast and offline-safe.

The package is idempotent and self-healing. An update is fully installed and validated in a new immutable generation before its internal pointer changes; `opencode.json` remains on the stable `@latest` transport declaration and managed Alonix entries are removed from `tui.json`. An older OpenCode process cannot downgrade a newer configured generation. Host enhancement artifacts are bound to the current manifest fingerprint. A mismatch is quarantined, and only stale dedicated `opencode serve` processes are retired so newly opened clients cannot reuse withdrawn in-memory host code; interactive OpenCode windows are never killed. Incomplete, corrupt, offline, interrupted, or malformed states leave the previous generation active. Direct checkout development still uses explicit local server/TUI file entries for mandatory working-tree validation. The immutable candidate stage uses one file-based package-root declaration in `opencode.json` and no Alonix entry in `tui.json`, mirroring the final one-declaration architecture before npm publication.

## Included capabilities

- **IDE TUI:** project/session navigation, global recents, live agents, operations dashboard, virtualized folder picker, responsive Settings, and mouse-first controls.
- **Filesystem:** adaptive batched reads, strict atomic multi-file edits, structured search, and consolidated project exploration.
- **Terminal:** bounded foreground execution and lifecycle-safe process diagnostics.
- **CBM:** architecture context, symbol/call-chain investigation, freshness repair, ADRs, and runtime traces. The native CBM executable self-provisions into the user's cache.
- **Web:** batched multi-provider search and SSRF-aware fetching with bounded redirects, retries, bodies, and output.
- **Stealth:** Tor-routed HTTP and Patchright Chromium with no Python worker. Official Tor expert bundles are downloaded only on first use and accepted only after pinned SHA-256 verification; Chromium is also installed lazily when absent.
- **Settings:** safe tool permissions, owned AGENTS block, optional DCP configuration, and write-only provider credentials.
- **Optional host enhancements:** provenance-verified rich renderers, layout slots, deferred folder drafts, and tool recovery when the installed OpenCode source is byte-compatible.

## User-owned files

Alonix preserves unrelated content and owns only clearly bounded data:

- `~/.config/opencode/alonix/` — runtime state, private secrets, backups, and downloaded optional assets.
- `~/.config/opencode/AGENTS.md` — only the marked Alonix instruction block is inserted or removed.
- `opencode.json` / `opencode.jsonc` — JSONC-preserving edits affect only Alonix-owned plugin, permission, and skill references; installed mode keeps the plugin declaration at `opencode-optimised-toolings@latest`.
- `tui.json` / `tui.jsonc` — installed mode removes only legacy Alonix entries; unrelated TUI plugins and settings are preserved.
- `dcp.jsonc` — Settings preserve unmanaged DCP values, including percentage or numeric context limits.

Web keys may be configured in Alonix Settings or supplied through `SERPER_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`, and `EXA_API_KEY`. Environment variables take precedence. Stored values are never displayed back in the UI.

## Portable and enhanced modes

All normal plugin tools and Settings remain available without modifying the OpenCode binary. Optional host enhancements activate only after exact source compatibility is proven. Compatible OpenCode updates reuse the verified capability profile; incompatible updates remain on the official binary in portable mode instead of blocking startup or updates.

When an enhancement build is installed, interactive OpenCode processes are not stopped. The startup controller automatically retires stale dedicated `opencode serve` processes when the active manifest changes, so a newly opened client cannot attach to a withdrawn host. Existing interactive windows keep their mapped executable until they are closed normally.

## Development

A cloned repository is a development mode, not the user installation path:

```powershell
npm install
npm test
npm run doctor
```

Development mode keeps mutable runtime state inside the checkout and keeps file-based TUI registration, so tests and local development never migrate a user's working npm configuration.

## Publishing and security

Releases are built and published locally from exact annotated Git tags. This repository does not use GitHub-hosted runners, self-hosted runners, or CI runners for npm publication. `npm run release:local -- --tag vX.Y.Z --publish` runs the complete tests, builds generated assets, audits the runtime-only tarball, verifies a clean consumer, delegates authentication to npm's native passkey/security-key flow, publishes the exact tarball, and checks registry integrity. See `docs/RELEASE_RECOVERY.md`.

The npm tarball uses a runtime-only allowlist. Tests, virtual environments, generated runtime state, local secrets, service source trees, and repository metadata are excluded. Tor downloads use official Tor Project archives with pinned platform-specific checksums. Private/local destinations remain blocked by default in web and stealth fetchers unless `allow_private=true` is deliberately set.

## License

MIT. Third-party licenses and notices are listed in `THIRD_PARTY_NOTICES.md`.
