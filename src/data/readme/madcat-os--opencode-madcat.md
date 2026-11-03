# @madcat-os/opencode-madcat

OpenCode plugin for the MADCAT operating system. Runs inside opencode's Bun
runtime — TypeScript executed natively, no build step. Registers the MADCAT tool
surface (memory, TTS, messaging, mesh orchestration, infra),
persona hooks, doctrine mirroring, and event handlers.

## Install

```bash
opencode plugin '@madcat-os/opencode-madcat@latest' --global --force
```

Or pin a version in `opencode.jsonc`:

```jsonc
"plugin": [
  "@madcat-os/opencode-madcat@2.6.0"
]
```

Published to [npmjs](https://www.npmjs.com/package/@madcat-os/opencode-madcat).

Runtime configuration lives in `~/.config/madcat/config.toml` (`[mesh.*]`,
`[database]`, `[embedding]`, `[tts]`, …); the package ships no host-specific
data.

## Tool namespaces

Memory (EEMS), sessions, whoami, TTS, PRIME locks, cross-session
messaging, session control, infra, indexing/ingest, and more — one file
per namespace under `src/tools/`.

## EEMS memory and index

Memory and the code/docs index are pure TypeScript on Postgres + pgvector
(`src/lib/eems.ts`). They write to the **signed-in user's instanced
database**: the plugin reads the Madcat menubar's desktop session
(`~/Library/Application Support/Madcat/session-<host>.json`), resolves it at
`{web}/api/me` and derives `{db_name}_{db}` on the `[database].dsn` server.
Without a valid sign-in, `memory_*` and `index_*` tools fail with a sign-in
instruction. `whoami_info` shows the resolved user and database under `eems`.

## No native binaries

Everything is TypeScript. Audio playback spawns the platform player
(`afplay`, `pw-play`/`paplay`/`aplay`); code screenshots use shiki +
resvg-wasm. The plugin loads identically on every host.

## Development

See [AGENTS.md](AGENTS.md) for architecture, structure, the pre-publish
checklist, and known pitfalls.

```bash
npx tsc --noEmit    # type-check (mandatory before publish)
git push origin master   # GitHub Actions publishes to npmjs
```

## License

Business Source License 1.1 (BUSL-1.1). Change License: MIT, four years from
each version's release. See [LICENSE](LICENSE). Commercial licensing:
licensing@saiden.dev
