# opencode-runtime-triage

Runtime-only per-agent model overrides for **OpenCode V2 (2.0.6 or newer)**.
Version 1.0.0 replaces the V1 plugin API; OpenCode V1 users should stay on 0.1.1.

- `/rt-model`: choose an agent, then any available model or model variant. Includes built-in and file-defined agents.
- `/rt-provider`: replace a provider for agents whose exact model ID and optional variant exist under the target provider.

The server uses an agent transform and location-scoped plugin RPC. No configuration files are changed by either command. Overrides update the active session's selected model as well as the agent registry. Other sessions adopt the override for their agent when their next prompt is submitted. An already running model request is unaffected.

### Desktop commands

Desktop currently does not render OpenCode's session-form API. Use arguments in Desktop: `/rt-model <agent> <provider/model#variant|restore>` or `/rt-provider <source> <target>` (and `/rt-provider restore`). The TUI commands remain interactive and list every available model, variant, and compatible provider. Unsupported no-argument Desktop commands now return an actionable error instead of creating an invisible form.

The plugin connects through local service discovery and verifies that the discovered endpoint belongs to the same plugin instance. Standalone servers without service discovery support the argument commands below. Form creation requires the client SDK because OpenCode 2.0.6's plugin context does not expose it directly.

Commands also accept arguments:

```text
/rt-model build openai/gpt-5.6-terra#medium
/rt-model build restore
/rt-provider source-provider target-provider
/rt-provider restore
```

Use an agent ID and a model available in your connected server's catalog. The terminal retains its interactive pickers. Desktop command overrides belong to the invoking session and remain until restored or the server plugin restarts; `/rt-provider restore` removes all command overrides owned by that session.

Each terminal owns a separate override layer. The latest selection wins for an agent. **Restore model** removes that terminal's layer, revealing another owner's override or the configured model. Clean terminal exit releases its layers; if the terminal crashes or disconnects, they expire after 90 seconds without a heartbeat (checked every 15 seconds). This also works with remote servers; no shared filesystem or local PID assumptions are required.

Removing an override restores the session's previous model if the plugin still owns its selection. A later manual model change is preserved during cleanup. Sessions without an explicit previous model restore to the default resolved when the override was applied. OpenCode persists session selections: an abrupt server shutdown loses the plugin's restoration records, so the last selected session model can remain after restart.

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
