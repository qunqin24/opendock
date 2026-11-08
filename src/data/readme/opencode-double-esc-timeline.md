# opencode-double-esc-timeline

[![npm](https://img.shields.io/npm/v/opencode-double-esc-timeline?style=flat-square)](https://www.npmjs.com/package/opencode-double-esc-timeline)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)

**Double-tap `Escape` in an [opencode](https://opencode.ai) session to open the session timeline** — the searchable list of the prompts *you* sent, newest first, with select → **Revert** / **Copy**.

This is Claude Code's double-`Escape` message-history surface, ported to opencode as a **plugin**. No fork, no patched binary, no keymap hacks.

```text
session ─────────────────────────────────────────────────────────
  › fix the flaky test in api.spec.ts
  … assistant works …
  › now add a regression test for it
  … assistant works …

double-Escape →  Timeline                       (search: ▏)
                 ─────────────────────────────
                 now add a regression test for it   14:32
                 fix the flaky test in api.spec.ts  14:28
                 ─────────────────────────────
                 [Revert]  [Copy]
```

## Why this exists

opencode V2 **already ships the feature** — it just has no gesture bound to it:

| Piece | Where (opencode v2 source) | Trigger |
| --- | --- | --- |
| Timeline dialog — your messages only, searchable, Revert/Copy | `packages/tui/src/routes/session/dialog-timeline.tsx` | command `session.timeline` → `/timeline` or `<leader>g` |
| Undo / redo (stages the rollback, restores files, returns the prompt to the composer) | `session.undo` / `session.redo` | `<leader>u` / `<leader>r` |
| **Double-`Escape`** | — | **this plugin** |

Upstream asked for the Claude-Code-parity gesture in
[anomalyco/opencode#14037](https://github.com/anomalyco/opencode/issues/14037) and it was **closed by automation as `completed`** without a matching binding shipping (verified absent in v2.0.32: no timed two-press handling anywhere in `packages/tui/src` or `packages/app/src`).

A keybind cannot express it: `escape` is a single bound key, and a keymap *sequence* would swallow the first press and break `session.interrupt`.

> There is also a community plugin that does this (`@capybearista/opencode-double-tap-timeline`). This repo is an independent implementation with a different design choice — see [How it works](#how-it-works).

## Install

### npm

```json title="cli.json"
{
  "plugins": ["opencode-double-esc-timeline"]
}
```

TUI-only, so it belongs in `cli.json`, **not** `opencode.json(c)`. Restart the TUI.

### Nix flake

With home-manager (installs it into `~/.config/opencode/plugins/`):

```nix
{
  inputs.opencode-double-esc-timeline.url = "github:ZacxDev/opencode-double-esc-timeline";

  imports = [ inputs.opencode-double-esc-timeline.homeManagerModules.default ];
}
```

Without home-manager — the flake's package is a plain directory you can point a
config manager at, or copy:

```sh
nix build github:ZacxDev/opencode-double-esc-timeline#default
cp -r ./result/* ~/.config/opencode/plugins/opencode-double-esc-timeline/
```

### Manual

Drop the two files into opencode's plugin discovery path:

```sh
git clone https://github.com/ZacxDev/opencode-double-esc-timeline
mkdir -p ~/.config/opencode/plugins/opencode-double-esc-timeline
cp opencode-double-esc-timeline/src/{tui.ts,index.ts} \
   ~/.config/opencode/plugins/opencode-double-esc-timeline/
```

opencode discovers directories under `~/.config/opencode/plugins/` automatically —
no config entry needed.

## Usage

| Action | How |
| --- | --- |
| Open the timeline | **`Escape` twice within 800 ms** |
| Open the timeline (no gesture) | `Ctrl+P` → **"Open message timeline"** |
| Open it the built-in way | `/timeline` or `Ctrl+X g` |

A single `Escape` is untouched: it still interrupts a running turn, closes a
dialog, or clears a pending key sequence, exactly as before.

## How it works

Two files, because opencode loads a plugin directory through **two independent loaders**:

| File | Loader | Why |
| --- | --- | --- |
| `tui.ts` | TUI (`packages/tui/src/plugin/discovery.ts` → `Host.resolve(dir).tui`) | the gesture |
| `index.ts` | **SERVER** (`packages/core/src/plugin/source-directory.ts` → `Host.resolve(dir).server`) | a **no-op**, but required |

The server loader treats *every directory* under `plugin/` or `plugins/` as a
server plugin target and raises `Plugin entrypoint not found` when `<dir>/index`
is absent — so a TUI-only directory needs a no-op `index.ts` or every start
reports a broken plugin. Delete it and the gesture still works while opencode
complains forever.

The gesture itself listens on the **raw renderer key stream**
(`context.renderer.keyInput`), which opencode's keymap *also* subscribes to.
Listening does **not** consume the event, so this plugin is strictly **additive**:
it can only ever *add* the timeline on a second press. It never needs to
reimplement or override any existing binding.

It then dispatches opencode's own command — `context.keymap.dispatch("session.timeline")` —
so the dialog, the Revert/Copy actions and the rollback all remain opencode's,
not a reimplementation.

### Known caveat

Two quick `Escape`s to interrupt a **running** turn also open the timeline
(single-Esc interrupt still fires — the plugin does not consume the key).
Dismiss with one more `Escape`.

## Compatibility

- Requires **opencode v2** (TUI plugin API). Developed and verified against **v2.0.32**.
- Nothing is patched; it tracks upstream automatically.

## Troubleshooting

- **Nothing happens on double-Escape.** Use `Ctrl+P` → *"Open message timeline"*.
  If that opens the dialog, the dispatch is fine and the gesture is at fault.
  If it does nothing, upstream has renamed the `session.timeline` command id —
  update `TIMELINE_COMMAND` in `src/tui.ts` (the test pins the literal, so the
  rename shows up as a failing test rather than a dead key).
- **You must be in a session.** The palette entry is registered globally, but the
  timeline only opens for the session route.

## Development

```sh
npm install
npm test        # builds dist/ and runs the behavioural harness
npm run typecheck
```

`test/run.mjs` compiles nothing itself — it stages a throwaway module tree,
imports the real `dist/tui.js`, and drives `setup()` with a fake context and a
fake key emitter, asserting the 800 ms window (inclusive), the session gate, the
fire-then-reset behaviour, Escape-only filtering, and listener cleanup.

**What is not covered:** the gesture in a *live* TUI. That needs a PTY, so it is
verified by hand: double-`Escape` opens the dialog, one `Escape` still
interrupts.

## License

[MIT](./LICENSE)
