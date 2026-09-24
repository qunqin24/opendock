# opencode-model-hide

OpenCode plugin that lets you hide models from the model picker — managed entirely
from the terminal UI with a picker-style selection dialog, no config editing required.

- `/model-hide` (or `Ctrl+Shift+h`): open the model list grouped by provider, arrow-key
  through it, and press Enter to toggle the highlighted model. `🟢` marks visible
  models, `🔴` marks hidden models, and `⭐` marks the default model. Press `Ctrl+A`
  in the same dialog to toggle the highlighted model as the persisted plugin default.
  Changes are applied in one batch to avoid rebuilding the model catalog for every toggle.
  The persisted favorite is prioritized for new TUI sessions at startup; an explicitly selected
  model in an existing session remains unchanged.
- Server side, hidden models are removed from the active model catalog, so they
  disappear from `opencode models`, `/models`, and every OpenCode instance for the
  user account — across restarts and catalog refreshes.
- Everything else (other providers, other models) is left untouched.

## Install

```bash
npm install @franiboy/opencode-model-hide
```

Install it globally with OpenCode:

```bash
opencode plugin add @franiboy/opencode-model-hide
```

The package exposes both its server plugin and `./tui` entrypoint. OpenCode automatically loads the TUI entrypoint
from the active server plugin, so no duplicate `cli.json` entry is required.

## Bridge file

Hidden models are stored in `~/.config/opencode/model-hide.json`:

```json
{
  "hidden": ["opencode-go/kimi-k2.6", "opencode-go/grok-4.6"],
  "favorite": "opencode-go/space-bunny-free"
}
```

- Changes are picked up automatically (debounced watch, `ctx.model.reload()`).
- `MODEL_HIDE_BRIDGE_FILE` can move the file location.

## Standalone, without the plugin packages

The server-side filter ships as a single self-contained file suitable for the
`.opencode/plugins/` approach (symlinks do not load; use a real copy):

- https://github.com/Franiboy/opencode-model-hide/blob/main/model-hide.ts

## License

MIT
