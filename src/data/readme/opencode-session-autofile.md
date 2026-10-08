# opencode-session-autofile

If you use [OpenCode](https://opencode.ai) with [OpenChamber](https://github.com/opencode-ai), you've probably ended up with a wall of untitled or loosely-named sessions in one flat list. This plugin fixes that automatically: it teaches OpenCode's title generator to end every session title with a category tag like `[Sales]` or `[Language]`, then watches for that tag and moves the session into the matching OpenChamber folder — no clicking, no manual dragging.

## How it works

1. The plugin replaces OpenCode's title-generation prompt with one that still writes a short, descriptive title, but always ends it with exactly one bracketed tag from your list of categories, e.g.:

   ```
   Fix flaky login test [Tech]
   Follow up with prospect [Sales]
   French verb practice [Language]
   ```

2. Whenever a session's title updates, the plugin reads the tag and looks it up in your **mappings** — a simple label → folder name table.
3. If the tag matches a mapping, the plugin moves that exact session into the corresponding OpenChamber folder, creating the folder first if it doesn't already exist.
4. Untagged sessions, unrecognized tags, and `[Unfiled]` are left alone — nothing happens, and the chat is never interrupted or blocked by a filing attempt.

### Example

With a mapping of `{ "Sales": "Client work" }`, a session titled `Follow up with prospect [Sales]` is automatically moved into a "Client work" folder in OpenChamber. Rename or add categories any time by editing the mapping — no code changes required.

### Catching missed titles

Title updates can occasionally arrive out of order at session start, so the plugin also does a bounded double-check when a session goes idle: it re-reads the session's current title a few times with a short delay and files it then if the first attempt was missed. This is a safety net, not the primary mechanism — most sessions file immediately.

### Periodic reconciliation

Besides the two event-driven paths above, the plugin also runs a periodic sweep (every 10 minutes by default — see `reconcileIntervalMs` in [ADVANCED.md](ADVANCED.md)) that lists your sessions, re-derives each one's folder from its *current* title tag, and moves any that aren't already filed there — including a session that was moved to a different folder by hand after it was first filed. Untagged or unmapped sessions are always left alone; the plugin only ever files sessions, it never removes one from a folder on its own initiative. Sessions already correctly filed cost no extra API calls, and archived sessions are skipped. See [ADVANCED.md](ADVANCED.md) for the interval option and its limits.

## Requirements

- **OpenCode**, with plugin hooks and the `session.updated`/`session.idle` events (see [Compatibility](#compatibility)).
- **OpenChamber running and reachable**, since the plugin calls its `/api/session-folders` API to read and move sessions between folders. By default OpenChamber's web server listens on `http://localhost:3000`; if yours runs elsewhere, set `apiBaseUrl` accordingly (see Configuration below). If OpenChamber isn't reachable, filing attempts fail silently and are logged — they never block the chat.

## Install from the OpenChamber plugin screen

1. In OpenChamber's **Add plugin** screen, choose **From npm**.
2. Set **Spec** to `opencode-session-autofile@latest`.
3. Select **User** to enable it for every local workspace, or **Project** for only the current workspace.
4. Optionally provide the JSON configuration below, then add the plugin and restart OpenCode.

Adding the plugin replaces OpenCode's native `title` agent prompt with the plugin's own tagging prompt (or your custom `titlePrompt`, if set). This happens automatically every time OpenCode starts with the plugin enabled — not just once at install — so the title agent always stays in sync with your current `mappings`/`titlePrompt` configuration.

## Configuration

The `mappings` option is a flat JSON object: each key is the tag OpenCode writes into the title, and each value is the OpenChamber folder name to file it into. Keys and folder names don't need to match — this is how you rename or consolidate categories into your own folder structure.

```json
{
  "apiBaseUrl": "http://localhost:3000",
  "mappings": {
    "Language": "Language",
    "Tech": "Tech",
    "Sales": "Client work"
  }
}
```

A tag is recognized anywhere in the title, including before a scheduler-added timestamp such as `Morning sales brief [Sales] 2026-08-28 06:00`. A mapping entry that isn't a non-empty string is ignored rather than causing an unexpected move.

For less common options (`enabled`, `titlePrompt`, `fallbackMaxAttempts`, `fallbackDelayMs`, `reconcileIntervalMs`), see [ADVANCED.md](ADVANCED.md).

## Safety and behavior notes

- A missing destination folder is created automatically the first time it's needed.
- If two folders in the same scope already share the exact destination name, the plugin skips the move rather than guessing which one you meant.
- Filing failures (network errors, a temporarily unreachable OpenChamber API, etc.) are logged and never block or interrupt the chat.
- Writes are protected against silent loss from concurrent writers (e.g. two OpenChamber tabs open at once): the plugin detects when a write was accepted but discarded, re-fetches the latest folder state, and retries the merge a bounded number of times.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```

OpenCode must be restarted after adding, removing, or changing a plugin.

## Compatibility

- OpenCode with plugin hooks and `session.updated`/`session.idle` events, plus a `PluginInput.client` exposing `session.get`.
- OpenChamber with the local `/api/session-folders` endpoint.
- Periodic reconciliation additionally needs `PluginInput.client.session.list`. If it's missing on your OpenCode/SDK build, the plugin logs that once and simply skips the periodic sweep — the two event-driven paths above are unaffected.
