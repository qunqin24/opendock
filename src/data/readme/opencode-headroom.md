# @ngotrnghia1811/opencode-headroom

> Context compression plugin for [opencode](https://opencode.ai) — port of [headroom v0.24.0](https://github.com/chopratejas/headroom).

Reduces token usage 60–95% on large tool outputs, logs, diffs, and search results — without losing information the LLM needs. Original content is cached locally (CCR) for on-demand retrieval.

## Quick start

```bash
npm install @ngotrnghia1811/opencode-headroom
```

```json
// opencode.json
{
  "plugin": ["@ngotrnghia1811/opencode-headroom"]
}
```

## Documentation

| Document | Description |
|---|---|
| [SETUP.md](docs/SETUP.md) | Installation, configuration, troubleshooting |
| [DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) | Full porting plan, architecture, implementation phases |
| [discrepancy.md](docs/discrepancy.md) | Documented differences from upstream headroom v0.24.0 |
| [headroom-learn-todo.md](docs/headroom-learn-todo.md) | Design doc for deferred headroom-learn feature |

## Tools provided

- **`headroom_stats`** — session compression metrics (tokens saved, compressor hits)
- **`headroom_retrieve(hash)`** — retrieve original content from CCR `<<ccr:HASH>>` markers

## Development

```bash
bun install
bun test              # 178 tests
bun run typecheck     # bundle check
```

## License

Apache 2.0
