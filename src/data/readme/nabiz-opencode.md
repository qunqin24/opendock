# nabiz

<img src="assets/nabiz-mark.svg" width="96" alt="nabız logo">

**English** | [Türkçe](README.tr.md)

Keeps the pulse of long-running work: build tracking, background tasks, notifications.
While the agent works on stage, heavy jobs run backstage — and report back when done.

## Layout

- `extensions/hbmon.ts` — long build tracking: `hbmon_watch` / `hbmon_wait` / `hbmon_status`
  (engine imported from `nabiz-core`; pi wrappers only)
- `extensions/bg-hbmon.ts` — background tasks: `bg_run` / `bg_status` / `bg_logs` / `bg_kill`
  + `/bg` + `/bg-status`. Backed by the hbmon daemon; survives pi restarts.
  `bg_logs` supports cursor reads (`offset`/`next_offset`) and blocking reads
  (`wait_ms`, cap 30000); task registry persists in `~/.pi/bg-hbmon-registry.json`.
- `.mcp.json` — MCP servers (codegraph, nabiz, bm), lazy-loaded.
- `assets/nabiz-mark.svg` — project mark.
- `docs/port-notes.md` — internal technical notes (opencode → pi port + Faz 3).
- `docs/migration-plan.md` — opencode-plugins → monorepo migration plan (Faz 1–3
  + 5–9 done, Faz 4 partial — see `docs/decisions.md`).
- `docs/decisions.md` — decision log (moved from opencode-plugins in Faz 4).
- `tasks/` — extension-layer task board (NABIZ-001…010 done).
- `scripts/check-symlink.mjs` — Windows symlink preflight (run before install).
- `.github/workflows/ci.yml` — ubuntu + windows build/test (NABIZ-006).
- `packages/core/` — shared host-independent engine (`nabiz-core`: hbmon
  client, bg-tasks, prune, progress, notice/disclosure texts). No host imports.
- `packages/harness-opencode/` — opencode adapter (`nabiz-opencode`:
  6 plugins via `plugin/` bundle package (id `nabiz`) + MCP nabiz-tools
  (`nabiz_safe`/`nabiz_raw`) + scripts/tests). Kurulum:
  `node packages/harness-opencode/scripts/setup.mjs --yes`.

## Usage

```bash
# quick test (loads without copying)
pi -e /root/nabiz/extensions/hbmon.ts -p "run ['sleep','5'] with hbmon_watch, wait with hbmon_wait, report in one sentence"

# permanent install (package manifest)
pi install /root/nabiz

# settings.json extensions list:
# ["/root/nabiz/extensions/hbmon.ts", "/root/nabiz/extensions/bg-hbmon.ts"]

# workspaces: install links + build the shared engine
npm install && npm run build
# Windows: EPERM/symlink on npm install -> run terminal as admin or enable
# Developer Mode (Settings -> Privacy & Security -> For developers).
# Preflight (before install): node scripts/check-symlink.mjs
```

## Requirements

- The `hbmon` binary (`~/.cargo/bin/hbmon` or on `PATH`). If missing, extensions
  return an install hint: `cargo install hbmon`.

## Verification

`watch → wait → status` flow on a real `cargo build`:
same handshake, same `woke_on` summaries, same exit mapping
(0 done / 1 failed / 2 dep-missing / 124 timeout / 137 oom / 3 internal).
`tsc --noEmit` clean for `extensions/` (against `nabiz-core` sources);
live daemon smoke for `bg_*` (cursor / registry / `wait_ms`).

Gates: `npm run lint` (oxlint, whole repo), `npm run typecheck:ext` +
`npm run check:pi` (pi 1.0.x compatibility), `npm test` inside
`packages/harness-opencode` (or `npm run test:lowmem` from the root).
