<div align="center">

# chezmoi-guard

**Stop opencode agents from editing chezmoi-managed files out-of-band.**
Intercepts `edit` / `write` / `apply_patch`, redirects to the chezmoi source, then syncs.

[![npm version](https://img.shields.io/npm/v/@dylanrussell/chezmoi-guard.svg?color=06b6d4&label=npm&logo=npm&logoColor=white&style=flat-square)](https://www.npmjs.com/package/@dylanrussell/chezmoi-guard)
[![license](https://img.shields.io/npm/l/@dylanrussell/chezmoi-guard.svg?color=06b6d4&style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@dylanrussell/chezmoi-guard.svg?color=06b6d4&logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org)
[![types: TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org)
[![tested with vitest](https://img.shields.io/badge/tested%20with-vitest-FCC72B.svg?logo=vitest&logoColor=black&style=flat-square)](https://vitest.dev)

</div>

---

## What it does

When an opencode agent edits a file that lives under your chezmoi source, the edit lands on the rendered **target** — not the source. The next `chezmoi apply` silently reverts it. This plugin fixes that transparently:

- Intercepts `edit`, `write`, and `apply_patch` tool calls.
- Asks `chezmoi managed` whether the target is chezmoi-managed.
- If it is, rewrites the tool args to operate on the **source** file.
- After the tool runs, executes `chezmoi apply --no-tty <target>` to sync the target from the freshly-edited source.
- Advises `read` calls: reading a target whose source is a template, `modify_` script, or encrypted entry prepends guidance pointing at the editable source — **without** rewriting the read or hiding the real on-disk content.
- Emits a TUI toast on every redirect, warning, or block.

## Install

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": [
    "@dylanrussell/chezmoi-guard"
  ]
}
```

Requires the `chezmoi` CLI on `PATH`. The plugin silently no-ops when chezmoi is missing.

## Source-type handling

| Source prefix / suffix | Behaviour |
| --- | --- |
| `dot_` / `private_` / `executable_` / `empty_` (normal) | Redirect to source, `chezmoi apply` after |
| `exact_` (directory attribute) | Files *inside* an `exact_` dir redirect normally — `exact_` only prunes absent target entries, it does not make files structural. Directories are excluded upstream by `chezmoi managed --include=files,symlinks`. |
| `.tmpl` (template) | `edit` → redirect to source + guidance; `write` → warn (hits rendered target, lost on apply) |
| `symlink_` | Read the link target, redirect to the actual file, `chezmoi apply` after |
| `modify_` | Passthrough with warning (partial file manager; target edits may be overwritten) |
| `encrypted_` / `.age` / `.asc` | **BLOCKED** with guidance (use `chezmoi edit` instead) |
| `run_` / directories | Skipped (scripts / structural markers) |

## Read advisory

`read` is never redirected — the agent always sees the real on-disk target bytes. But for three source kinds, a guidance block is prepended to the read output because a naive follow-up edit would misfire:

| Source kind | Why reads need an advisory |
| --- | --- |
| `.tmpl` (template) | Rendered target bytes ≠ source bytes. An `edit` `oldString` built from the rendered content will not match the source file the guard redirects to. The advisory says: read the source first. |
| `modify_` | The target is script-managed state; persistent changes belong in the modify script, so the advisory points at it. |
| `encrypted_` / `.age` / `.asc` | Reading the plaintext target is fine, but edits are blocked — the advisory pre-empts a doomed edit plan with `chezmoi edit`. |

Reads of `normal`/`symlink` targets stay silent: their edits are transparently redirected anyway, and a banner on every dotfile read would be pure context noise.

## Sync semantics

The guard edits the **source** before the target is touched, so the normal `chezmoi apply` is non-interactive (the target is clean). The `--no-tty` flag is added so that if the target has drifted out-of-band (`MM` status — a prior manual edit, or a template/modify passthrough), `chezmoi apply` **fails safe**: it exits non-zero and leaves the user's out-of-band edit intact, instead of hanging on a TTY prompt or silently discarding changes with `--force`.

## Debug

```sh
CHEZMOI_GUARD_DEBUG=1 opencode
```

Emits `[chezmoi-guard] ...` lines to stderr for every redirect, skip, warn, and block.

## Development

```sh
npm install
npm run build        # tsup → dist/plugin.js + dist/plugin.d.ts
npm test             # vitest run --coverage
npm run lint         # biome check
npm run typecheck    # tsc --noEmit
```

## License

MIT © Dylan Russell
