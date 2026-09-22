# opencode-idle-since

Know exactly how long your opencode session has been sitting idle — a quiet line in the sidebar.

![opencode-idle-since](./assets/idle-since.png)

[![npm version](https://img.shields.io/npm/v/opencode-idle-since.svg)](https://www.npmjs.com/package/opencode-idle-since)

When the agent finishes and the session goes quiet, the sidebar shows `idle since 14:32:07`. As soon as the session is busy again the line disappears, and it comes back with a fresh timestamp the next time the session goes idle.

## Install

```bash
opencode plugin opencode-idle-since -g
```

Restart opencode. That's it — the plugin registers itself in your `tui.json`.

### Manual install

Add the package to the `plugin` array of `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["opencode-idle-since"]
}
```

Restart opencode afterwards.

## Disable

Plugins are enabled by default. Turn this one off by its id:

```json
{
  "plugin_enabled": {
    "idle-since": false
  }
}
```

## Notes

- Shows the current session only.
- The time is rendered with `toLocaleTimeString()`, so it follows your system locale.
- npm plugin packages are cached under `~/.cache/opencode/packages/`.

## License

MIT
