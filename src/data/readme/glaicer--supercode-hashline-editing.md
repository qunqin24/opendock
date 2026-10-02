# hashline-editing

An OpenCode plugin that edits files by line number instead of search and replace.

Search and replace breaks when the same code appears twice. Plain line numbers break when an earlier edit shifts the lines below. Hashline avoids both: every `read` returns a `[PATH#TAG]` header that pins the exact version you saw, and `edit` checks that tag before writing anything.

```text
[src/a.ts#A1B2]
replace 2-3
+new line two
+new line three
```

Operations: `replace N-M`, `replace N`, `insert before N`, `insert after N`, `append`. New lines are prefixed with `+`. One patch can cover several files — everything is validated first, then written. If the file changed on disk since your read, the tag won't match and nothing is written: read again and retry.

## Install

**OpenCode v2 (2.x)** — version `1.0.0`:

```bash
opencode plugin add @glaicer/supercode-hashline-editing
```

**OpenCode v1 (1.x)** — version `0.1.0`. Add it to the `plugin` array of your `opencode.json`:

```json
{
  "plugin": ["@glaicer/supercode-hashline-editing@0.1.0"]
}
```

Restart OpenCode either way — running sessions don't pick up config changes. To uninstall, remove the plugin entry and restart again.

## Options

v2 reads options from the `plugins` entry in the global config:

```jsonc
{
  "plugins": [
    {
      "package": "@glaicer/supercode-hashline-editing",
      "options": { "enforceSeenLines": true }
    }
  ]
}
```

v1 reads the same values from a `hashline` section of the config.

| option | default | meaning |
| --- | --- | --- |
| `enforceSeenLines` | `true` | refuse to edit lines a `read` never showed |
| `roots` | `[]` | additional Snapshot Roots besides the project root |
| `maxPaths` | `256` | tracked-file limit of the snapshot store |
| `maxVersionsPerPath` | `4` | remembered versions per file |
| `maxTotalBytes` | `67108864` | total snapshot budget in bytes |

## Warning: edit permissions are not enforced

Hashline `edit` writes directly — the plugin API has no way to ask OpenCode for approval at write time. `edit: ask` rules won't prompt, and path-scoped `edit: deny` rules won't block it (measured on OpenCode 2.0.18). Only a blanket `edit: deny *` stops it, and only because the tool is then hidden from the model entirely. Reads are unaffected — they go through the native read tool and honor `read` permissions.

If you rely on edit approvals, don't use this plugin for those files. Edits are still confined to the project root and configured `roots`, and a stale tag still refuses to write — but that's drift protection, not an approval policy.

## Differences from the native edit tools

- **Existing files only.** Creating files is the native `write` tool's job.
- **No formatting.** Hashline writes exactly the lines you sent and never runs a formatter.
- **No approval prompt.** See the warning above.
