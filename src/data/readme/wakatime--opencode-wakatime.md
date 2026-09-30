# WakaTime for OpenCode

Track AI coding activity, file changes, token usage, costs, and more from [OpenCode v2](https://opencode.ai/v2/) with [WakaTime](https://wakatime.com/).

## Installation

Add the official package to your `~/.config/opencode/opencode.json` (or your project's `opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@wakatime/opencode-wakatime"]
}
```

Keep any existing entries in the `plugins` array. OpenCode installs npm plugins automatically at startup. Restart OpenCode after changing the config. See [OpenCode's plugin documentation](https://opencode.ai/v2/docs/build/plugins).

Add your [WakaTime API key](https://wakatime.com/api-key) to `~/.wakatime.cfg`:

```ini
[settings]
api_key = waka_123
```

The plugin automatically downloads `wakatime-cli` into `~/.wakatime/`. No global npm install or manual CLI installation is required. The npm package must be published before the package-name installation above is available.

## What is tracked

Like the official [Claude Code](https://github.com/wakatime/claude-code-wakatime) and [Codex CLI](https://github.com/wakatime/codex-cli-wakatime) plugins, this plugin delegates transcript parsing and delivery to the official [wakatime-cli](https://github.com/wakatime/wakatime-cli). It requires CLI v2.26.6 or newer and automatically upgrades older installations.

- File creation, edits, and deletions from successful `write`, `edit`, and `apply_patch` tools.
- Added and deleted lines from OpenCode's diff metadata, reported as WakaTime's signed `ai_line_changes` (additions minus deletions). For example, +5/-2 is reported as 3; deleting 5 lines is -5.
- Input tokens, cached input tokens, and output tokens. The CLI includes cache writes in input tokens and reasoning in output tokens.
- User prompt lengths in Unicode characters, without sending prompt text as heartbeat data.
- Session, model, project, and OpenCode version information (read directly from the v2 host).

OpenCode v2's SQLite transcripts (`session_v2` and `session_message`) are supported. The CLI honors `XDG_DATA_HOME`, `OPENCODE_DATA_DIR`, and `OPENCODE_DB_PREFIX` when locating transcripts.

Syncs are coalesced and serialized, and wait for active turns (including subagents) to become idle so completed tools and token totals are persisted. Failed or interrupted executions and plugin cleanup also trigger pending syncs when no turn remains active. Network failures are logged without interrupting OpenCode; the CLI handles offline storage and deduplication.

## Configuration and troubleshooting

The standard `~/.wakatime.cfg` settings apply. Set `debug = true` under `[settings]` to enable debug logs. Downloader proxy settings (`proxy`, `no_ssl_verify`) follow the official Codex plugin. `WAKATIME_HOME` selects an alternate existing home directory containing `.wakatime.cfg` and `.wakatime/`.

Plugin logs: `~/.wakatime/opencode.log`. CLI logs: `~/.wakatime/wakatime.log`. Update checks are cached for four hours; an unavailable update does not replace a working CLI.

Optional diagnostic commands:

```sh
npx @wakatime/opencode-wakatime --install
npx @wakatime/opencode-wakatime --sync /path/to/project
```

## Development

Node.js 20+; no npm dependencies or build step are required.

```sh
npm test
npm run check
npm pack --dry-run
```

Integration tests require Node.js 22.13+ and use a released CLI with isolated synthetic OpenCode storage. All HTTP requests are sent to a local mock WakaTime API:

```sh
WAKATIME_CLI_TEST_PATH=/path/to/wakatime-cli npm run test:integration
```

For local OpenCode testing before publication, add `"file:///absolute/path/to/opencode-wakatime"` to the `plugins` array in `opencode.json`.

The downloader is adapted from the official Codex CLI plugin under the BSD-3-Clause license. The plugin uses the v2 default export, event subscription, and cleanup API described in [OpenCode’s plugin documentation](https://opencode.ai/v2/docs/build/plugins).
