# OpenCode Session Tags

A terminal-only plugin for **OpenCode V2 (2.0.25 or newer)**. Browse sessions by
title and tags without replacing OpenCode's native `/sessions` picker or its
`Ctrl+X`, `L` shortcut.

## Installation

### Published package

Once published to npm, add the package name to `~/.config/opencode/cli.json`,
preserving your existing plugins and settings:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-session-tags"]
}
```

To pin the first release, use `"opencode-session-tags@0.1.0"`. To configure the
catalog, use the object form:

```json
{
  "plugins": [{
    "package": "opencode-session-tags",
    "options": { "extraTags": ["research", "personal"] }
  }]
}
```

### Local checkout

From this directory, install development dependencies:

```sh
pnpm install --frozen-lockfile
```

Add this package to the `plugins` array in your global `cli.json`, keeping your
other entries:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "/absolute/path/opencode-session-tags",
      "options": {
        "extraTags": ["acme", "billing", "integration"]
      }
    }
  ]
}
```

Restart the TUI after adding the plugin. It is CLI-only, so it belongs in
`cli.json`, not `opencode.jsonc`. No default keyboard shortcuts are registered.
There is no need to restart the server. Install it on the host running the TUI,
including when connecting to a remote OpenCode server, not on the remote host.

## Usage

- **Ctrl+P → Sessions with tags**: open the parallel session picker, across all projects.
- **Ctrl+P → Edit current session tags**, or `/session-tags`: edit tags for the current session.
- The editor is available only once a real session exists, not on the empty new-session screen.

The picker is palette-only: there is no `/tagged-sessions` slash command. Both
the picker and tag editor use the same large dialog width as the native session
picker, limited to the available terminal width.

The picker supports:

| Action | Binding |
| --- | --- |
| Open the selected session | Enter |
| Edit the selected session's tags | Ctrl+T |
| Toggle all sessions / tagged sessions only | Ctrl+A |
| Reload sessions from the server | Ctrl+R |
| Close / return from the tag editor | Escape |

In the tag editor, Enter toggles a tag and saves it immediately. `[x]` means
assigned; `[ ]` means unassigned. Select **Done** or press Escape to return.

Search uses case-insensitive title terms and exact `#tag` filters:

```text
billing
#needs-review
billing #needs-review #acme
```

All terms must match. Type `#` before a tag; plain words match the session title.
The all/tagged-only view is remembered across TUI restarts. Old sessions are
retrieved through every API page, not just OpenCode's recent-session cache.
Child/subagent sessions are excluded. Editing or refreshing reopens the picker
and resets its search input.

## Configure tags

The default catalog is:

```text
in-progress
blocked
on-hold
needs-review
follow-up
done
```

`blocked` means there is an obstacle to continuing; `on-hold` means the work is
deliberately postponed. Tags are independent labels, not an automatic workflow:
a session can have several at once, and `done` does not archive or delete it.

`tags` **replaces** these defaults. `extraTags` **extends** the resulting catalog.
If `tags` is omitted, `extraTags` extends the defaults. Order is preserved and
duplicates are removed. Names are trimmed and lowercased; use lowercase letters,
digits, and single hyphens (for example `needs-review`). Invalid options fail
plugin setup with an explanatory error.

Keep defaults and add tags:

```json
{ "extraTags": ["acme", "integration"] }
```

Replace defaults:

```json
{ "tags": ["waiting", "review", "later"] }
```

Replace defaults and add more:

```json
{ "tags": ["waiting", "review"], "extraTags": ["acme"] }
```

An empty `tags` array disables the default catalog. Removing a tag from the
configuration **does not erase existing assignments**. Retired tags remain
visible, searchable, and removable, but cannot be assigned to new sessions.
Manage the catalog in the plugin configuration; the editor only assigns/removes
tags from that catalog. Reload the plugin or restart the TUI after changing it.

Sessions with earlier defaults (`waiting-client`, `waiting-third-party`, or
`paused`) retain their labels. They remain searchable and removable; add them
to `extraTags` if you want to keep assigning them.

If desired, you can configure your own command shortcuts in `cli.json` using
the command IDs `session-tags.list` and `session-tags.edit`. The plugin does not
override native commands, favorites, tabs, or their shortcuts.

## Storage and limitations

Tags are persisted on the connected OpenCode server in session metadata:

```json
{
  "opencode-session-tags": {
    "version": 1,
    "tags": ["needs-review", "acme"]
  }
}
```

Each change rereads the session, preserves unrelated metadata, and updates only
metadata. It does not rename sessions, send prompts, modify history, or access
the database directly. The same API works against remote servers.

The V2 update API has no metadata compare-and-swap: simultaneous edits from
different clients may race. Avoid editing the same session's tags concurrently.
Use Ctrl+R to refresh the picker after another client changes tags. Native
favorites/rename/delete actions are intentionally not duplicated in this first
version; continue using the native picker for them.

## Development

Use Node.js 24, Bun 1.3.14, and the pnpm version declared in `packageManager`.
Development dependencies use exact versions; `saveExact` keeps new additions
pinned. Commit the lockfile and use frozen installs for reproducible checks.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```

An opt-in real-TUI smoke test uses the installed `opencode` binary and Python 3.
It creates a separate temporary database/configuration, never uses your sessions
or credentials, and leaves its test state/logs available for inspection:

```sh
OPENCODE_SMOKE_TMP=/your/approved/temp/directory python3 test/smoke.py
```

It verifies plugin loading, custom catalog entries, tag persistence across a
server restart, palette access, native-width dialogs, both pickers, and the
tagged-only view. It does not send prompts or make model requests. This PTY test
requires macOS/Linux. Set `OPENCODE_SMOKE_PLUGIN` to an extracted package
directory to test the release archive instead of the checkout.

The implementation uses the public plugin/client APIs and OpenCode's built-in
selection dialogs. It does not import private TUI components or patch OpenCode.

`@opencode/plugin` is an optional peer and an exact development dependency.
All SDK imports are type-only: OpenCode supplies the context at runtime, and
consumers do not need to install the SDK to run the plugin. No compilation step
is required; OpenCode loads the TypeScript entrypoints.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## Release checklist

1. Confirm that the npm package name and version are available. Update the
   version for later releases; do not reuse a version already published.
2. Run `pnpm install --frozen-lockfile`, then `pnpm pack`. The `prepack` script
   runs tests and type checking, and GitHub CI runs the same checks.
3. Inspect the archive with `tar -tzf opencode-session-tags-0.1.0.tgz` (adjust
   the filename for later releases). It should contain only `package.json`,
   `src/`, `tui.ts`, `README.md`, and `LICENSE`, not tests or local configuration.
4. Test the archive in OpenCode, including its exported `./tui` entrypoint.
5. Publish the inspected archive after authenticating to npm:

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
pnpm publish ./opencode-session-tags-0.1.0.tgz --access public --registry=https://registry.npmjs.org/
```

npm may request a one-time password or browser confirmation. Do not put tokens
in the repository. Packaging and CI never publish automatically.

## License

MIT. See [LICENSE](LICENSE).
