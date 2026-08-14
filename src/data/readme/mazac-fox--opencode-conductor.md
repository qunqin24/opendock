# @mazac-fox/opencode-conductor

**Doctrine and orchestration** for the OpenCode plugin fleet: plans, runs, progress, journals, audits, lifecycle artifacts, spine, and workflow tools—integrated with peers via **artifacts and contracts**, not shell-outs.

## What it is

- Writes under `.opencode/` (plans, status, progress, journal, handoff, lifecycle, spine).
- **`explore_fast`**: Cursor `agent` CLI exploration + content-addressed cache (see `src/explore-fast.ts`).
- **`conflict_context`**: dispatcher to Engram’s native tool when the host supports it.

Tool names and count are contract-tested (`src/plugin-contract.test.ts`; runtime smoke asserts the count). Third-party/community plugins are **Fleet- and operator-owned**, not maintained here.

## Quick start

```bash
bun add @mazac-fox/opencode-conductor
```

Or local dev:

```json
{
  "plugin": ["file:///path/to/opencode-conductor/src/index.ts"]
}
```

## Development

```bash
bun run check
bun run smoke:runtime
```

Optional: `bun run smoke:explore-fast`, `bun run smoke:commit` (env-gated). Details: **`AGENTS.md`**.

## Fleet position

| Owns | Does not own |
|------|----------------|
| Plans/runs/lifecycle artifacts, workflow tools | Memory (Engram), graph truth (Codemem), locks (Concord), canonical IDs (opencode-fleet-contracts), wrap layer (opencode-host-adapter) |

## License

MIT
