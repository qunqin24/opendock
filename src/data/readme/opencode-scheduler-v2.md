# opencode-scheduler-v2

OpenCode **v2** plugin adapter for [`opencode-scheduler`](https://github.com/different-ai/opencode-scheduler) — cron/launchd/systemd scheduled agent jobs.

OpenCode 2.x loads plugins through the v2 plugin API (`{ id, setup(context) }`) and rejects the v1 `Plugin` factory that `opencode-scheduler` ships. This adapter bridges the two so the v1 scheduler runs unchanged on OpenCode 2.x:

1. Invokes the upstream `SchedulerPlugin` factory.
2. Converts each v1 tool definition (Zod `args`) to JSON Schema via `z.toJSONSchema`.
3. Registers the tools with the v2 `context.tool.transform` domain.

The scheduling logic itself is untouched — it comes entirely from the upstream package, so this adapter automatically stays in sync with upstream v1 changes.

## Requirements

- OpenCode **2.x** (`opencode --version` >= 2.0). The adapter relies on the v2 plugin context exposing the `tool` domain.

## Install

```bash
opencode plugin add opencode-scheduler-v2
```

or add it to `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-scheduler-v2"]
}
```

Scheduled jobs are managed with the plugin's tools (create/list/run/delete/update jobs, view logs) — see the [upstream README](https://github.com/different-ai/opencode-scheduler#readme) for the full workflow.

## Verification

Plugin loading is logged to `~/.local/share/opencode/log/opencode.log`. Look for:

```
msg="loading plugin" id=opencode-scheduler-v2
```

and any `failed to load plugin` lines.

## License

MIT, matching the upstream plugin this adapter wraps.
