# @xesrevinu/opencode-context-shield

Deterministic context-reduction plugin for OpenCode sessions with built-in backtest tooling.

## Highlights

- compacts large tool output while preserving the signals, head, and tail that matter
- skips read and edit sensitive tools by default so file work stays intact
- clamps noisy `read` calls and injects routing hints for subagent tasks
- exposes `cshield_toggle` and `cshield_stats` helper tools for live control and measurement
- includes replay-style Python backtests for evaluating real session history before rollout

## Install

Use the published package from `opencode.jsonc`:

```jsonc
{
  "plugin": ["@xesrevinu/opencode-context-shield@latest"],
}
```

Restart OpenCode after updating the plugin list.

If you want to iterate from a checkout instead of npm:

```bash
mkdir -p .opencode/plugin
cp plugin/context-shield.ts .opencode/plugin/context-shield.ts
```

## Usage

The plugin stores runtime config at `<project>/.opencode/state/context-shield.json`.

Default config:

```json
{
  "enabled": true,
  "readLimit": 800,
  "compactThresholdBytes": 8192,
  "compactTargetBytes": 4096
}
```

Quick smoke test:

```bash
opencode run --format json "Call cshield_stats exactly once, then respond with OK."
```

Backtest a single session:

```bash
python3 scripts/backtest-session.py \
  --session ses_371939900ffeZgZksolV6nC1A1 \
  --thresholds 12,10,8,6,4,3,2 \
  --target-kb 4
```

Batch backtest recent sessions:

```bash
python3 scripts/backtest-batch.py \
  --min-tool-bytes 30000 \
  --limit 80 \
  --thresholds 12,10,8,6,4,3,2 \
  --target-kb 4 \
  --target-sweep 6,4,3,2 \
  --read-limits 800,600,400,200
```

## Development

The repository uses Bun for dependency management and local commands.

```bash
bun install
bun run check
bun run backtest:session -- --help
bun run backtest:batch -- --help
```

## Release

This package uses Changesets plus the shared GitHub Actions release workflow.

```bash
bun run changeset
bun run version-packages
bun run release
```

## License

MIT
