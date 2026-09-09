# opencode-beep-on-idle

An [opencode](https://opencode.ai) plugin that plays a short beep whenever any
agent finishes its work and waits for the next input. Works for main sessions
and subagents.

## Requirements

- opencode with plugin support
- Linux with `canberra-gtk-play` (or set `BEEP_CMD`, see below)

## Install

From npm, in your `opencode.json` / `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-beep-on-idle"]
}
```

Or from a local path:

```json
{
  "plugin": ["/path/to/opencode-beep-on-idle/beep-on-idle.ts"]
}
```

Restart opencode after changing plugins — config is loaded once at startup.

## Configuration

| Env var    | Default                               | Purpose                                   |
| ---------- | ------------------------------------- | ----------------------------------------- |
| `BEEP_CMD` | `/usr/bin/canberra-gtk-play -i bell`  | Shell command played on each idle event   |

Example: `BEEP_CMD="paplay ~/sounds/done.oga"`.

## How it works

The plugin subscribes to opencode's event bus and fires on
`session.status` → `idle` and on `session.idle`. The sound is spawned
detached and fire-and-forget: awaiting audio child processes can stall the
plugin event loop (observed with `proc.exited` never resolving for
`paplay`/`canberra-gtk-play`/`pw-play` when awaited), so the child is
backgrounded (`&`, stdio detached) and never awaited.

## Development

```sh
bun install
bun run build      # bundle check
bunx tsc --noEmit  # typecheck
bun run test       # smoke test (uses test/fake-beep.sh, no sound played)
```

Note: `BEEP_CMD`/`BEEP_MARKER` must be exported before bun starts (as the
`test` script does) — `Bun.spawn` does not see `process.env` mutations made
at runtime.

After an `opencode upgrade`, re-run the checks above plus one real
listen-test (`opencode run` a trivial prompt), since the plugin API can shift
between versions.

## Changelog

### 1.0.1

- Fix: add `main` entry so opencode's npm plugin loader can resolve the
  entrypoint (without it the plugin was silently skipped).

### 1.0.0

- Initial release: beep on `session.status` idle and `session.idle` via
  detached `canberra-gtk-play`, `BEEP_CMD` override, smoke test.

## License

MIT — see [LICENSE](./LICENSE).