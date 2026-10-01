# plugin-updater

<p>
  <img src="public/plugin-updater.gif" alt="plugin-updater demo" width=800 />
</p>

OpenCode installs plugins and built-in tools (prettier, biome, …) into its cache and never updates them. This plugin fixes that: it checks npm for newer versions and lets you update them from one screen.

Run `/plugin-updates`, pick what you want with `Space` / `A`, then:

- `U` — update the selected plugins
- `X` — reinstall the selected managed tools (this restarts the server)
- `R` — re-check right now

That's it. A few things worth knowing:

- Server-side plugin updates apply live; TUI plugin updates take effect after you restart the TUI. The screen tells you which is which.
- Managed tools get reinstalled by OpenCode itself on next use, so `X` restarts the server — the confirmation warns you about that.
- Rows that can't be updated (pinned versions, local paths) are shown but not selectable.
- The plugin never deletes anything except the cache of tools you explicitly reinstalled.

If updates are found, you'll also get a toast once a day — no more than that.

## Install

**OpenCode v2** (current release, 1.0.6):

```bash
opencode plugin add @glaicer/supercode-plugin-updater
```

**OpenCode v1** (use the 0.3.0 release — it's a different API):

```bash
opencode plugin @glaicer/supercode-plugin-updater@0.3.0
```

Restart OpenCode after installing. The first start may be slow — that's OpenCode downloading the package into its cache, it happens once.

## Development

```bash
npm run build       # precompile the Solid TUI entrypoint into dist/
npm run typecheck   # tsc --noEmit
npm test            # node --test, network-free
```

## License

MIT
