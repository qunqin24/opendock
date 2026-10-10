# opencode-auto-resume-v2

OpenCode **v2** plugin adapter for [`opencode-auto-resume`](https://github.com/Mte90/opencode-auto-resume) — the stall-detection / auto-continue plugin.

OpenCode 2.x loads plugins through the new v2 plugin API (`{ id, setup(context) }`) and rejects the v1 `Plugin(ctx, options)` entrypoint that `opencode-auto-resume` ships (see upstream issue [Mte90/opencode-auto-resume#33](https://github.com/Mte90/opencode-auto-resume/issues/33)). This adapter bridges the two so the v1 recovery engine runs unchanged on OpenCode 2.x:

1. Builds a v1-shaped `client` bridge on top of the v2 plugin context (`context.session.prompt`, `context.session.interrupt`, `context.session.context`, `context.session.command`).
2. Invokes the upstream v1 plugin with that legacy context.
3. Re-registers the resulting v1 hooks into the v2 domain API: the event loop (`context.event.subscribe`), tools (`context.tool.transform`), and prompt/tool/command hooks.
4. Translates v2 bus events into the v1 event shape the engine expects.

The recovery logic itself is untouched — it comes entirely from the upstream package, so this adapter automatically stays in sync with upstream v1 changes.

> Upstream PR [Mte90/opencode-auto-resume#44](https://github.com/Mte90/opencode-auto-resume/pull/44) proposes merging this adapter into the upstream package itself (as its `./server` entrypoint). Once that lands and is published, you can install `opencode-auto-resume` directly on 2.x and drop this adapter.

## Requirements

- OpenCode **2.x** (`opencode --version` ≥ 2.0). The adapter relies on the v2 plugin context exposing `tool`, `session`, `event` and `command` domains.

## Install

```bash
opencode plugin add opencode-auto-resume-v2
```

or add it to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-auto-resume-v2"]
}
```

Then remove the legacy v1 entry if it is still configured:

```bash
opencode plugin remove opencode-auto-resume 2>/dev/null || true
```

Configuration options pass through to the upstream engine, e.g.:

```jsonc
{
  "plugin": [
    ["opencode-auto-resume-v2", {
      "chunkTimeoutMs": 180000,
      "gracePeriodMs": 3000,
      "maxRetries": 3
    }]
  ]
}
```

See the [upstream README](https://github.com/Mte90/opencode-auto-resume#configuration) for the full option reference.

## Verification

Plugin loading and plugin stderr are written to:

```
~/.local/share/opencode/log/opencode.log
```

Look for:

```
msg="loading plugin" id=opencode-auto-resume-v2
```

and any `[auto-resume-v2] ...` / `failed to load plugin` lines. A successful load emits the upstream engine's own `[auto-resume] info: ... config OK` / `... ready` lines once events are received.

## License

GPL-3.0-or-later, matching the upstream plugin this adapter wraps.
