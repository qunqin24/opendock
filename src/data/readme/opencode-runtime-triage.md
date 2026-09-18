# opencode-runtime-triage

Runtime-only per-agent model overrides for **OpenCode V2 (2.0.6 or newer)**.
Version 1.0.0 replaces the V1 plugin API; OpenCode V1 users should stay on 0.1.1.

- `/rt-model`: choose an agent, then any available model or model variant. Includes built-in and file-defined agents.
- `/rt-provider`: replace a provider for agents whose exact model ID and optional variant exist under the target provider.

The server uses an agent transform and location-scoped plugin RPC. No configuration files are changed by either command. Overrides affect the agent registry for subsequent model resolution; an existing session's explicit model selection still takes precedence.

Each terminal owns a separate override layer. The latest selection wins for an agent. **Restore model** removes that terminal's layer, revealing another terminal's override or the configured model. Overrides are shared by sessions using that location on the connected server. They disappear when the server plugin unloads or restarts. Clean terminal exit releases its layers; if the terminal crashes or disconnects, they expire after 90 seconds without a heartbeat (checked every 15 seconds). This also works with remote servers; no shared filesystem or local PID assumptions are required.

## Install

After the desired package version is published:

```sh
opencode plugin add opencode-runtime-triage@1.0.0
```

For a local build, run `npm install && npm run build`, then configure its absolute package directory in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-runtime-triage"]
}
```

The root package export loads the server plugin; `./tui` supplies the terminal plugin. Restart the terminal after changing a locally built plugin. CLI-only configuration lives in the global `~/.config/opencode/cli.json`, not `tui.json`; the server component must also be loaded at the target location.

## Optional presets

All available models and variants are listed automatically. Presets customize labels/descriptions for available entries; unavailable models cannot be selected. Use V2 object configuration in the global `cli.json`:

```json
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-runtime-triage",
      "options": {
        "presets": [
          {
            "label": "Primary model",
            "provider": "provider-id",
            "model": "model-id",
            "variant": "high"
          }
        ]
      }
    }
  ]
}
```

`variant` and `description` are optional. Model references use V2's `{ providerID, id, variant? }` shape internally; provider overrides preserve variants and skip incompatible targets.

## Development

```sh
npm install
npm run check
npm test
npm run build
npm pack --dry-run
```

The npm package includes compiled `dist` files and uses `@opencode/plugin` for both entrypoints. Tests cover provider/variant matching, independent terminal layers, lease expiry, RPC batch validation, restore, and reload rollback.
