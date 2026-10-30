# AI Usage for OpenCode

Claude and ChatGPT subscription limits in OpenCode's **Usage limit** sidebar section.

![Usage limit section in the OpenCode sidebar](https://raw.githubusercontent.com/duality-institute/ai_use_tracker/main/demo.png)

- Claude: 5-hour, weekly, and model-specific limits, including Fable.
- ChatGPT: the Work/Codex allowance.
- Percentages show allowance **used**. Each row includes its reset timer.
- Refreshes every five minutes and when the sidebar mounts with an old reading.
- Click the refresh icon (↻) to check again.

## Install

```sh
opencode plugin @dualityinstitute/opencode-ai-usage -g
```

Restart OpenCode and open a session with the sidebar visible. This registers a **TUI plugin in `tui.json`**.

### From this checkout

```sh
bun install --frozen-lockfile
bun run build
```

Add the absolute path to `dist/tui.js` to the `plugin` array in your
OpenCode `tui.json` (global: `~/.config/opencode/tui.json`). Preserve any existing
entries and settings:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/ai_use_tracker/dist/tui.js"]
}
```

## Development and publishing

Run `bun run release:check` for type checking, build, rendered
fixture checks, package validation, and a publish dry-run. Run `npm publish`
yourself when ready. `make tarball` creates a verified local package instead.

To remove the plugin, delete its entry from `tui.json` and restart OpenCode.

Apache-2.0. See [LICENSE](LICENSE).
