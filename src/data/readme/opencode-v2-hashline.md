# opencode-v2-hashline

Hashline plugin for opencode v2 (pi-style allocated anchors).

Tools: `read` (native override, serves `anchor│content` rows) + `replace` +
`insert` + `replace_match` + `copy` + `move` + `anchor_grep` (read-only search
over served anchors) + `undo_last_change`. Same-message same-file edits commit once with
one undo. Copy/move require the destination served in the same session (no
served-record inheritance across files or sessions). Native `edit` inputs get echoed `anchor│` prefixes stripped (with an
`H_ECHO_STRIPPED` notice); native `write` with echoed prefixes fails with
`E_ANCHOR_ECHO`. `@file` attachments arrive annotated and in-project files
are editable by anchor without a prior read.

## Install from npm

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-v2-hashline"]
}
```

OpenCode v2 installs the missing package when the plugin loads; `opencode plugin list`
confirms it (internal id stays `opencode-hashline`). Update future versions with
`opencode plugin update`. This is a Bun/OpenCode v2 plugin and does not run on plain Node.

If you previously loaded this plugin from a local path, or you have the unrelated `opencode-hashline` package (different author and implementation) installed, remove that entry first so two hashline plugins are not loaded.

## Local development

Prerequisites: [opencode v2](https://opencode.ai/v2/docs) (`opencode --version`
≥ 2.0) and [bun](https://bun.sh) `>= 1.4.2`.

Install dependencies **inside the plugin directory** (the host loads the
directory as-is; without its own `node_modules` it fails to resolve
`@opencode/plugin`):

```sh
cd /absolute/path/to/opencode-v2-hashline
bun install
```

Register this directory as a local plugin in your project's `opencode.jsonc`
(absolute path; the entry **must be a directory** — the v2 directory loader
uses the root `index.ts`; `main`/`exports` serve npm imports):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-v2-hashline"],
}
```

Then reload the location and confirm the id and source in the active list:

```sh
opencode plugin list
# or against a running server (Basic auth `opencode:<server-password>`):
# GET /api/plugin?location[directory]=<project-dir>  → id "opencode-hashline", status active
```

After editing `opencode.jsonc`, reload the location
(`POST /api/location/reload` or restart the server/TUI). New sessions pick up
the current tool snapshot; in-flight sessions keep the snapshot from their
first request.

## Config (file-based, no UI)

File global `<home>/.config/opencode/hashline/config.json`, override per
project `<project>/.opencode/hashline/config.json`, override per plugin
options. Precedence: global < project < options. Unknown keys are rejected.
Defaults: 2000 output lines / 50KB output / 2000 chars per row / 1MiB per file /
4096 anchors. `storeDir` (sidecar directory) may be absolute, or relative —
relative is resolved against the **project** directory.

## Notes and known limitations

- `@file` outside the project is annotated (anchors visible as context) but
  **not editable**: hashline tools reject out-of-project paths with
  `E_PATH_EXCLUDED`. Binary/image/excluded attachments are admitted
  unannotated with a visible `H_ATFILE_SKIPPED` note (explicit code per
  file), never breaking admission.
- Echo-strip is shape-based (`^[a-z]{4}│` per line): a legitimate content line
  starting with 4 lowercase letters + `│` sent through native `edit` would be
  stripped (always with an `H_ECHO_STRIPPED` notice). Native `write` never
  strips — it fails closed with `E_ANCHOR_ECHO`.
- Stale anchors fail with `E_ANCHOR_STALE` plus the current rows in the
  message, so the model retries without a re-read.
- A write re-validates the disk snapshot taken by the tool: if the file changed
  in between, it fails closed with `E_FILE_CHANGED` (re-read and retry) instead
  of overwriting the external change. Two-file `move` may leave a duplicate in
  an extreme race (destination written, source intact) — never data loss.
- Project keys are folded to lowercase on Windows and canonicalized through
  `realpath` (internal symlinks map to their real target), so the same file
  spelled `A.ts`/`a.ts` shares one anchor set. Pre-existing Windows sidecar
  records with mixed case are re-served on first read.

## Tests

```sh
bun test          # entry seam: stable id + setup
bun run typecheck # tsc --noEmit
bun run lint      # oxlint src
```
