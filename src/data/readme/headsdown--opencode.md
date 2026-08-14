# @headsdown/opencode

HeadsDown availability-awareness and task-gating plugin for OpenCode.

## What it does

- Adds `headsdown_policy`, `headsdown_approve`, `headsdown_digest`, `headsdown_outcome`, and `headsdown_auth` tools to OpenCode
- Injects HeadsDown execution guidance into system prompts on every turn
- Enforces policy through both permission mediation and pre-tool hard gates
- Applies mode-aware model shaping via `chat.params`, `chat.headers`, and `shell.env`
- Shapes tool definitions with mode-aware HeadsDown constraints
- Persists policy context during session compaction and can disable auto-continue in strict Wrap-Up windows
- Tracks approved proposals and reports outcomes for calibration

## Install

```bash
npm install @headsdown/opencode
```

Then configure OpenCode in `opencode.json` (published npm mode):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@headsdown/opencode", "@headsdown/opencode/tui"]
}
```

`@headsdown/opencode` loads server-side policy hooks and tools.
`@headsdown/opencode/tui` adds TUI-only status toasts and command palette actions.

Why two plugins?

- OpenCode uses separate plugin surfaces for runtime/server behavior and TUI behavior.
- This package exports both surfaces (`@headsdown/opencode` and `@headsdown/opencode/tui`) so each can be loaded in the correct place.

## First-time auth

Inside OpenCode, run the `headsdown_auth` tool and complete the Device Flow.

After auth, use `headsdown_policy` to confirm your current mode, schedule state, and execution guidance.

## Proposal and outcome workflow

When the user is in `busy` or `limited` mode and the agent needs to modify files:

1. Call `headsdown_approve`
2. If approved, continue the task
3. If deferred, summarize and ask the user whether to postpone or reduce scope
4. After completion/failure, call `headsdown_outcome` with the outcome

Use `headsdown_digest` at session start or when asked "what did I miss?" to review updates that arrived during focus mode.

## TUI features

The TUI plugin adds:

- `HeadsDown: Refresh policy` command (`/headsdown-policy-refresh`)
- `HeadsDown: Show policy` command (`/headsdown-policy`)
- Transition toasts when mode changes or Wrap-Up/lock state becomes active
- Note: this plugin currently does not add a persistent sidebar panel.

## Development

```bash
cd headsdown-opencode
npm install
npm run build
npm test
```

### Build output bundling

The published `dist/index.js` and `dist/tui.js` files are bundled with esbuild. This keeps `@headsdown/sdk` inlined in the distributed artifacts so consumers do not pull it as a transitive runtime dependency.

Build commands:

```bash
esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --external:@opencode-ai/plugin
esbuild src/tui.ts --bundle --platform=node --format=esm --outfile=dist/tui.js --external:@opencode-ai/plugin
```

`@opencode-ai/plugin` stays external because it is provided by the OpenCode host at runtime.

### Local plugin toggle helper

Use `scripts/toggle-headsdown-plugin.sh` from a target OpenCode project to switch between:

- `local`: loads this repo's built files through local shims (`.opencode/plugins`)
- `published`: loads `@headsdown/opencode` and `@headsdown/opencode/tui` from npm in `opencode.json`

In `local` mode, `opencode.json` may keep an empty `plugin` array while local shims are used.

Example:

```bash
./scripts/toggle-headsdown-plugin.sh local
```

## Dependency update automation

This repo uses Renovate to keep `@headsdown/sdk` and other routine dependencies current. New SDK releases open bot PRs automatically, and eligible updates can automerge after required CI checks pass. In normal maintenance flow, do not manually edit `@headsdown/sdk` versions unless you are intentionally overriding Renovate behavior.

## License

MIT
