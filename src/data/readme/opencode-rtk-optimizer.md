# opencode-rtk-optimizer

> [!NOTE]
> This fork exists because [openrtk](https://github.com/martinstannard/openrtk) appears inactive, with no updates for roughly four months. The npm package will be removed if changes are accepted upstream.

OpenCode plugin for [RTK](https://github.com/rtk-ai/rtk) (Rust Token Killer). Reduces LLM token consumption by 60-90% on common dev commands by transparently routing them through RTK's output compression.

A lightweight OpenCode plugin that intercepts shell commands and routes them through RTK for automatic output compression. The model retains the original command in its history while receiving RTK's optimized output.

## Prerequisites

Install RTK:

```bash
cargo install rtk
```

## Installation

Install via npm:

```bash
npm install opencode-rtk-optimizer
```

Then add to your OpenCode config (`opencode.json` or `.opencode/opencode.json`):

```json
{
  "plugins": ["opencode-rtk-optimizer"]
}
```

For local development, clone the repository and run `npm ci` and `npm run build`. The local wrapper loads the built plugin. Rebuild after source changes.

## Compatibility

- Tested with OpenCode 2.0.22 and RTK 0.51.0. RTK must support `rtk rewrite`.
- V1 requires OpenCode 1.18.29 or newer and the singular `plugin` config key. Older V1 releases need the previous plugin version.
- V2 reports warnings through server logs. V1 retains toasts.

## How it works

The plugin delegates rewrites to `rtk rewrite` while preserving the original model-facing command. V2 permission rules must cover the rewritten command, such as `rtk git status *`. The plugin never grants permissions.

Missing RTK, unsupported commands, rewrite failures, and RTK deny decisions leave commands unchanged for OpenCode's permission checks. Each command is passed as one argument to RTK and executed by OpenCode's selected shell.

```
git status       ->  rtk git status       (72% savings)
cargo test       ->  rtk cargo test       (80% savings)
docker ps        ->  rtk docker ps        (65% savings)
```

Supported commands are determined by the installed RTK version. Common rewrites include:

### Supported commands

| Category | Commands |
|----------|----------|
| Git | status, diff, log, add, commit, push, pull, branch, fetch, stash, show |
| GitHub CLI | pr, issue, run, api, release |
| Rust | cargo test/build/clippy/check/install/fmt |
| File ops | cat, grep, rg, ls, tree, find, diff |
| JS/TS | vitest, npm test/run, tsc, eslint, prettier, playwright, prisma |
| Containers | docker (compose/ps/images/logs/run/build/exec), kubectl (get/logs/describe/apply) |
| Network | curl, wget |
| Python | pytest, ruff, pip, uv pip |
| Go | go test/build/vet, golangci-lint |
| Packages | pnpm list/ls/outdated |

## Development

```bash
npm run build     # build the plugin
npm test          # run tests
npm run test:rtk  # verify the installed RTK binary
npm run test:plugin # verify local loading through the Node host
```

## License

MIT
