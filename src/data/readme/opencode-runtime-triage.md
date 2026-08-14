# opencode-runtime-triage

Runtime-only model rerouting for OpenCode agents. The plugin adds two TUI commands:

- `/rt-model`: assign a predefined provider/model pair to one agent.
- `/rt-provider`: replace a provider across agents using exact model-ID intersection.

Overrides are held in a PID-owned temporary file, applied when the current OpenCode instance reloads, and removed when the TUI exits. Stale state is ignored when its owning process is no longer running.

## Install

```sh
opencode plugin opencode-runtime-triage -g
```

Quit and restart OpenCode after installation.

## Provider Override Semantics

`/rt-provider` uses an AND strategy. An agent is changed only when:

1. Its active model belongs to the selected source provider.
2. The target provider exposes the exact same model ID.

This makes provider replacement safe when the target has a smaller or partially overlapping model catalog. Non-matching agents are left untouched.

## Presets

The package does not ship provider-specific presets. Configure the provider/model pairs available to `/rt-model` with a tuple entry in `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-runtime-triage",
      {
        "presets": [
          {
            "label": "Primary model",
            "provider": "provider-id",
            "model": "model-id"
          }
        ]
      }
    ]
  ]
}
```

## Development

```sh
npm install
npm run check
npm test
npm run build
npm pack --dry-run
```

The npm package exposes target-exclusive `./server` and `./tui` entrypoints as required by the OpenCode plugin standard. Compiled `dist` files are included in the package because OpenCode installs plugins with lifecycle scripts disabled.
