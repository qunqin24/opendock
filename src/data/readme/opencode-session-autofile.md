# opencode-session-autofile

Files [OpenChamber](https://github.com/openchamber/openchamber) sessions into folders automatically, from **one rules file** you can read at a glance. For OpenCode 2.x (`@opencode/plugin`). For OpenCode 1.x use `opencode-session-autofile@0.4.1`.

## Rules

One entry per destination folder. Everything that sends a session there is in the same place:

```json
{
  "rules": [
    { "folder": "Sales",    "description": "accounts, prospects, CRM", "keywords": ["salesforce", "gong", "cliente*"] },
    { "folder": "Tech",     "description": "software, IT, infrastructure", "keywords": ["docker", "script", "plugin"],
                            "directories": ["/home/me/code"] },
    { "folder": "Personal", "description": "family, health, everyday matters", "tags": ["Personal", "Family"], "keywords": ["familia", "impuestos"] }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `folder` | OpenChamber folder to file into (created if missing). |
| `description` | Shown to the title model so it knows when to pick this folder's tag. |
| `tags` | Bracketed tags the title model may write (`… [Tech]`). Omit it and the tag is the folder name. `[]` means "no tag for this folder". |
| `keywords` | Words looked up in the session **title**. Ignores case and accents, whole words only; a trailing `*` matches any ending (`cliente*` → Clientes). |
| `directories` | Absolute paths. A session whose working directory is that path, or inside it, qualifies. |

**Which rule wins** (first hit, top to bottom): an explicit tag, then a keyword, then a directory. Inside each level the order of the rules in the file decides. A title ending in `[Unfiled]` is never filed, whatever its keywords say. Keywords only see the short title, not the conversation; the tag is the stronger signal because the title model saw the first message.

The tag list the title model is offered is generated from these same rules, so what it can write and what the plugin can file never drift apart.

## Setup

Put the rules in a file. With no options at all the plugin looks for `~/.config/opencode/session-autofile-rules.json` (it does not need to exist; until it does, the built-in domain list applies). To keep the file somewhere else, point the plugin at it with `rulesFile`. The file is re-read whenever it changes, so edits apply without restarting OpenCode (a broken edit keeps the last good rules and is reported in the diagnostics).

```jsonc
// opencode.jsonc
"plugin": [
  ["opencode-session-autofile@0.6.0", { "rulesFile": "~/path/to/autofile-rules.json" }]
]
```

`rules` can also be given inline instead of `rulesFile`. The old `mappings` table (`{ "Tag": "Folder" }`) still works when no `rules` are set. With no configuration at all, a built-in list of domains (Language, Tech, Personal, Business, Sales, Career, Finance, Immigration, Artist) applies.

Try a rules file against your live sessions before turning it on, writing nothing (from a clone of this repo; the script is not part of the npm package):

```bash
bun scripts/dry-run.ts path/to/rules.json http://localhost:3000
```

or set `"dryRun": true` in the plugin options to make the plugin itself only log and record what it would do.

## When it runs

1. **When a session is created or renamed**, and **when a turn ends** (a few bounded re-checks, for titles that arrive late). A session already in the right folder costs one read and no write.
2. **A periodic sweep** (every 10 minutes by default, first pass ~20 s after load) lists every session from OpenChamber's `GET /api/session` and fixes the ones that are in the wrong folder, including one dragged away by hand: the rules always win. Archived sessions are skipped. A subagent session goes wherever its root session goes (its own title is ignored); set `includeSubagents` to `false` to leave subagents alone. It needs OpenChamber's API reachable at `apiBaseUrl` (default `http://localhost:3000`); if you set a UI password the plugin cannot authenticate and will fail silently.

Filing failures are logged and never block the chat.

## Known limits

- **OpenChamber's sidebar does not re-read folders by itself.** Moves made by the plugin are saved on the server immediately, but an already-open window shows them only after a reload (desktop: *OpenChamber → Reload Webview*). This is how OpenChamber loads folders, not something a plugin can change.
- A client that was open with an old folder list and then drags a session can overwrite the plugin's moves for that folder; the next sweep puts them back.
- OpenChamber 2.x never reports write conflicts, so two simultaneous writers to the same folder can lose one write silently.

## Development

```bash
bun install
bun test
bun run typecheck
bun run build
```

Options not listed here (`enabled`, `titlePrompt`, `fallbackMaxAttempts`, `fallbackDelayMs`, `reconcileIntervalMs`, `includeSubagents`, `dryRun`) are in [ADVANCED.md](ADVANCED.md).
