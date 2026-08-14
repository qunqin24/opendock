# opencode-token-speed-plugin (forked build)

A [OpenCode](https://opencode.ai) TUI plugin that displays real-time LLM output token speed (tok/s) next to the session prompt.

This is a **forked build** of [`heimoshuiyu/opencode-token-speed-plugin`](https://github.com/heimoshuiyu/opencode-token-speed-plugin) (MIT). The upstream v1.0.4 ships **raw `.tsx` source with no build step** — its `exports."./tui"` points at `index.tsx`, which no JS runtime can import (Bun falls back to React's JSX runtime; Node can't read `.tsx`). This fork publishes the **compiled `dist/tui.js`** that actually loads under OpenCode's TUI plugin loader. Logic is byte-identical to upstream; only the JSX→element compilation differs.

## Install

Add to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["opencode-token-speed-plugin-built"]
}
```

Restart OpenCode. The readout (`▲ XX.X tok/s`) appears to the right of the session prompt — `▲ --` at idle, the live rate during/after streaming.

## What it shows

- Real token counts, not the chars/4 heuristic — reads `part.tokens.output + part.tokens.reasoning` on each `step-finish`.
- A 2-second sliding-window span (first→last delta wall-clock) gives the rate.
- `▲ --` at idle (before any response in the session); the last measured speed persists after a response.
- Renders in the `session_prompt_right` slot (muted text). The footer status line (`Orchestrator · model · elapsed`) is hardcoded — no plugin slot exists for it.

## Why this fork exists (the upstream defect)

`opencode-token-speed-plugin@1.0.4` is a packaging defect: the author published `index.tsx` (TypeScript + JSX) as the `./tui` entry without running a build step. The `tsconfig.json` uses `"jsx": "preserve"` + `"jsxImportSource": "solid-js"` — a **bundler-only** config. Neither Bun's `bun build` nor esbuild produces a correct Solid build from it:

- `bun build` ignores the tsconfig `jsx` field and emits `React.createElement` (classic React runtime), which Solid's renderer doesn't provide.
- esbuild's `--jsx=automatic --jsx-import-source=solid-js` emits `jsxs` from `solid-js/jsx-runtime`, but Solid's jsx-runtime doesn't export `jsx`/`jsxs` (those are React names) — Solid uses `template`/`createComponent`/`insert` from `solid-js/web`/`@opentui/solid`.

OpenCode's TUI uses `@opentui/solid` (OpenCode's Solid renderer), where `createElement(tagName)` takes only a tag name; props/children are applied via `setProp` and reactive `insert`. The compiled `dist/tui.js` here is **hand-authored** against that API (mirroring how `oh-my-opencode-slim`'s built `dist/tui.js` is structured), because no stock bundler correctly compiles Solid JSX for this runtime. The upstream `index.tsx` + `speed.ts` are preserved in this repo for reference and attribution.

## Rebuild

The `dist/tui.js` is hand-authored (not machine-compiled). If it ever needs regenerating from `index.tsx`, the path is a Solid JSX transform (e.g. `babel-plugin-jsx-dom-expressions` / the Solid babel preset) targeting `@opentui/solid`'s `createElement`/`insert`/`setProp` — **not** esbuild/bun automatic runtime. For now, treat `dist/tui.js` as the source of truth; edit it directly.

## Dependencies

- `solid-js` — `createSignal`
- `@opentui/solid` — `createElement`, `insert`, `setProp` (OpenCode's TUI Solid renderer)
- `@opencode-ai/plugin` — TUI plugin types

`@opentui/solid` is a peer dependency of `@opencode-ai/plugin`; this fork lists it as a regular dependency so it installs into the package's `node_modules` and the bare import resolves at load time.

## Credit

Original plugin by [heimoshuiyu](https://github.com/heimoshuiyu/opencode-token-speed-plugin). This fork only fixes the build/packaging so it loads; no logic changes.

## License

MIT — see [LICENSE](./LICENSE).