# opencode-helpers

Shared packages for OpenCode plugins.

**Status:** Phase 0 scaffold. Not published. Do not push, tag, or `npm publish`
until the maintainer confirms.

## Packages

| Package | Purpose |
|---|---|
| [<img src="https://cdn.simpleicons.org/npm/CB3837" width="14" height="14" alt="npm">`@jakedowns/opencode-nudge-core`](https://www.npmjs.com/package/@jakedowns/opencode-nudge-core) | Pure nudge policy, rules, matcher, scheduler, wording pools |
| [<img src="https://cdn.simpleicons.org/npm/CB3837" width="14" height="14" alt="npm">`@jakedowns/opencode-nudge`](https://www.npmjs.com/package/@jakedowns/opencode-nudge) | OpenCode host adapter: hooks, shared state, one `nudge` key/tool |
| [<img src="https://cdn.simpleicons.org/npm/CB3837" width="14" height="14" alt="npm">`@jakedowns/assistant-voice-opencode-plugin`](https://www.npmjs.com/package/@jakedowns/assistant-voice-opencode-plugin) | Local Piper TTS: voice tools, auto-speak, GUI/TUI panels, host/client modes |

Consumers: [`@jakedowns/progress-tool-opencode-plugin`](https://www.npmjs.com/package/@jakedowns/progress-tool-opencode-plugin), the voice plugin
(`packages/audio-tool`, also reachable at `/media/share/opencode-audio-tool` via
a relative symlink), and future tools.

`packages/audio-tool` deliberately has **no `exports` map**: its package name is
for npm workspaces, while OpenCode discovers its `index.ts` / `tui.js` /
`rpc.ts` / `gui-experimental.cjs` parts by file name. Adding `exports` drops the
rpc and gui parts.

## Commands

```bash
npm install
npm test
npm run build
```

No package is published yet. The release workflow will be added with the first
tagged release; see `TODO-nudges.md` in the progress-tool repo.
