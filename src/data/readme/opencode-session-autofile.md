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

**Not available in this version (OpenCode 2 / V2 plugin contract).** The V2 Promise plugin context (`@opencode/plugin@2.0.25`'s `SessionDomain`) does not expose a `session.list` method, which this feature requires to enumerate a project's sessions — confirmed by reading the installed package's types directly, and confirmed at runtime (`reconciliationSupported: false` in this plugin's own diagnostic state). The two event-driven paths above (immediate filing on title change, bounded retry when a turn ends) are unaffected and cover ordinary session filing. The reconciliation code is still present internally, gated behind a runtime capability check, so it will activate automatically with no plugin changes if a future `@opencode/plugin` release restores `session.list`. **If you need active reconciliation today, it is only available in `opencode-session-autofile@0.4.1` on OpenCode 1.x.** See [ADVANCED.md](ADVANCED.md) for the interval option and its limits (relevant again if/when support returns).

## Requirements

- **OpenCode 2.0.20 or newer** (see [Compatibility](#compatibility)). This targets the V2 plugin contract (`@opencode/plugin`, default export `{ id, setup }`). **For OpenCode 1.x, use `opencode-session-autofile@0.4.1`** — the two major versions use incompatible plugin APIs and are not cross-compatible; pin the version that matches your OpenCode major version.
- **OpenChamber running and reachable**, since the plugin calls its `/api/session-folders` API to read and move sessions between folders. By default OpenChamber's web server listens on `http://localhost:3000`; if yours runs elsewhere, set `apiBaseUrl` accordingly (see Configuration below). If OpenChamber isn't reachable, filing attempts fail silently and are logged — they never block the chat.

## Install

Pin an exact version in `opencode.json(c)`'s plugin array — never `@latest` in production, since `0.4.1` (OpenCode 1.x) and `0.5.0+` (OpenCode 2.x) are not interchangeable. The V1-style tuple form below is confirmed working against a real OpenCode 2.0.25 instance (OpenCode reads and normalizes it even on V2); the V2 object form is per [OpenCode's own plugin docs](https://opencode.ai/v2/docs/build/plugins) but has not independently been confirmed with a local/unpublished build — once this package is live on npm, both forms resolve the same published package, so there is no reason to expect it to behave differently, but it has not been separately tested:

```jsonc
// V1-style config key ("plugin", tuple form) — still read and normalized under OpenCode 2
"plugin": [
  ["opencode-session-autofile@0.5.0", { "mappings": { "Tech": "Tech" } }]
]
```

```jsonc
// V2-native config key ("plugins", object form)
"plugins": [
  { "package": "opencode-session-autofile@0.5.0", "options": { "mappings": { "Tech": "Tech" } } }
]
```

Restart OpenCode after adding or changing the entry. Adding the plugin replaces OpenCode's native `title` agent/request prompt with the plugin's own tagging prompt (or your custom `titlePrompt`, if set) every time it loads, so the title generator always stays in sync with your current `mappings`/`titlePrompt` configuration.

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

- **OpenCode 2.0.20+** with the V2 (`@opencode/plugin`) Promise plugin contract: `session.hook("title", ...)`, `event.subscribe`, and `session.get`. Clean-load and the `session.created` event-driven filing path are verified against a real OpenCode 2.0.25 instance end to end (plugin loads, folder gets created, session gets filed). The `session.renamed` path and the `session.execution.*` bounded-retry fallback share the same underlying classify-and-file logic and are covered by the test suite and by `tsc` against the real SDK types, but have not independently been exercised against a live instance. The title-prompt-injection hook (`session.hook("title", ...)`) is covered by a unit test only — exercising it live requires an actual model call, which an isolated test environment can't provide without real provider credentials.
- OpenChamber with the local `/api/session-folders` endpoint (verified against OpenChamber 2.1.1's rewritten, merge-queue-based route — see [ADVANCED.md](ADVANCED.md) for what changed).
- Periodic reconciliation additionally needs a `session.list` method on the plugin context, which the installed `@opencode/plugin@2.0.25` does not expose (see above) — it is gated behind a runtime check and currently always off.
- **For OpenCode 1.x**, use `opencode-session-autofile@0.4.1` instead, which targets the V1 plugin contract and includes active periodic reconciliation.
