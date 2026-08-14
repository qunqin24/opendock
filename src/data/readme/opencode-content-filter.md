# opencode-content-filter

OpenCode plugin that makes provider content-filter finishes visible instead of leaving an apparently silent empty assistant turn.

## Install

```bash
opencode plugin opencode-content-filter -g
```

This installs the package globally and updates your `opencode.json` and `tui.json` automatically.

Or manually:

```bash
npm install -g opencode-content-filter
```

Then add `"opencode-content-filter"` to the `plugin` array in both `opencode.json` and `tui.json`.

For `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-content-filter"]
}
```

For `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-content-filter"]
}
```

## Usage

The plugin watches assistant messages for `finish: "content-filter"` without visible text.

In the TUI, it shows an error toast naming the model that was blocked.

In `opencode run ...`, it writes a clear warning to stderr and sets a non-zero exit code.

## Limitations

The plugin reports content-filter finishes but cannot mutate persisted assistant `message.error`. For SDK and persistent transcript behavior, OpenCode core should still surface `content-filter` finish reasons as errors.

## License

MIT
