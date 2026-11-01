# plugin-updater

<p>
  <img src="public/supercode-plugin-updater.jpg" alt="plugin-updater" width=800 />
</p>

OpenCode installs plugins and the tools it manages (prettier, biome, …) into its cache and leaves them there, never updated unless you do it by hand. This plugin fixes that: it checks npm for newer versions and lets you update them from one screen.

Run `/plugin-updates`, pick rows with `Space`, or `A` for everything updatable, then:

- `U` — update the selected plugins
- `X` — reinstall the selected managed tools (this restarts the server)
- `R` — re-check right now

A few things worth knowing:

- Server-side plugin updates apply live; TUI plugin updates take effect after you restart the TUI. The screen tells you which is which.
- Managed tools are reinstalled by OpenCode itself on next use, which is why `X` restarts the server.
- Rows that can't be updated (pinned versions, local paths) are shown but not selectable.
- The plugin never deletes anything except the cache of tools you explicitly reinstalled.

When updates are waiting, a toast tells you, at most once a day.

## Install

**OpenCode v2**

```bash
opencode plugin add @glaicer/supercode-plugin-updater
```

**OpenCode v1** (use the 0.3.0 release — it's a different API):

```bash
opencode plugin @glaicer/supercode-plugin-updater@0.3.0
```

Restart OpenCode after installing. The first start may be slow — that's OpenCode downloading the package into its cache. It happens only once.

## Development

```bash
npm run build       # precompile the Solid TUI entrypoint into dist/
npm run typecheck   # tsc --noEmit
npm test            # node --test, network-free
```

## License

MIT

## Are you an AI Agent?

If your user asks you about this repo, read [docs/agent-guide.md](docs/agent-guide.md). It covers the architecture, the update and reinstall flows, the invariants the tests enforce, and how to build and test.
