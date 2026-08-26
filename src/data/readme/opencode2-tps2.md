# opencode2-tps

Displays live TPS (tokens per second), average TPS, and average TTFT (time to first token) in the OpenCode 2 session prompt, and responds to the `/tps` command. Metrics are computed from **OpenCode's own usage events** — no byte-estimation of token counts.

## Requirements

Targets OpenCode 2 beta (`opencode2`, `beta` channel). It does not work on OpenCode 1.x — use the upstream `oc-tps` release (npm `oc-tps`, v1.x) for 1.x.

Verified against `opencode2 v0.0.0-beta-18155`. The V2 plugin API is beta and changes without notice, so newer builds can break this plugin.

## What it does

- **TUI footer** (`prompt.footer.status`): live `TPS` and session average `AVG` at the right side of the prompt. Average `TTFT` is shown only when enabled via the `showTtft` option (see [Configuration](#configuration)).
- **Server plugin** (main entrypoint): subscribes to the same public event stream so metrics are also available headlessly. Registers the `/tps` slash command — usable in `serve`/web scenarios and in the TUI.
- **Real data, not estimates**: token counts come from `session.usage.updated`, `session.step.ended`, etc. Timing comes from `session.step.started` / `session.text.started`. The only remaining estimate is the rolling *live* window between two server usage updates, which is a transient display aid and is corrected the moment the authoritative step totals arrive.

## Configuration

TTFT display is off by default. Enable it by passing the `showTtft` option to the plugin. The TUI entry reads its option from `~/.config/opencode/cli.json`:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode2-tps2/tui.tsx",
      "options": { "showTtft": true }
    }
  ]
}
```

The server entry (used by the `/tps` command) reads the same option from `opencode.json(c)`:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode2-tps2/src/index.ts",
      "options": { "showTtft": true }
    }
  ]
}
```

For the packaged npm version, use the package name for `package` in both files.

## Installation

### Option 1: npm (recommended)

Once `opencode2-tps2` is published, install directly with the OpenCode CLI:

```bash
opencode2 plugin add opencode2-tps2
```

`opencode2 plugin add` downloads the package from the npm registry and registers it in your global `~/.config/opencode/cli.json` automatically. Restart `opencode2` afterwards.

### Option 2: Quick install script

```bash
curl -fsSL https://raw.githubusercontent.com/fengye110/opencode2-tps2/main/install.sh | bash
```

The script clones the repository to `~/.local/share/opencode2-tps2`, installs its dependencies, and registers the plugin in `~/.config/opencode/cli.json`. It backs up an existing `cli.json` first and keeps every other key and plugin entry. Set `OC_TPS_DIR` to choose a different install directory. Restart `opencode2` afterwards.

### Manual install

1. Clone this repository and install its dependencies:

   ```bash
   git clone https://github.com/fengye110/opencode2-tps2.git
   cd opencode2-tps2
   npm install
   ```

2. Register the plugin in `~/.config/opencode/cli.json` (the TUI renderer) **and** `~/.config/opencode/opencode.json(c)` (the server plugin):

   ```jsonc
   // ~/.config/opencode/cli.json
   {
     "plugins": ["/absolute/path/to/opencode2-tps2/tui.tsx"]
   }
   ```

   ```jsonc
   // ~/.config/opencode/opencode.jsonc
   {
     "plugins": [
       "/absolute/path/to/opencode2-tps2/src/index.ts"
     ]
   }
   ```

   Or register the server plugin only (for example in a project's `opencode.jsonc`):

3. Restart `opencode2`. The status line appears at the right side of the session prompt footer.

## Usage

- The footer updates live while a session streams.
- `/tps` in the prompt prints the current status line for the session.

## Uninstall

### npm install

```bash
opencode2 plugin remove opencode2-tps2
```

### Script / manual install

1. Delete the `opencode2-tps2` entries (both `src/index.ts` server entry and `tui.tsx`) from the `plugins` array in `~/.config/opencode/cli.json` (and `opencode.json(c)` if registered there).
2. Delete the install directory (`~/.local/share/opencode2-tps2` by default).

Note: `opencode2` does not hot-reload plugins in current builds. Restart the TUI after every plugin change.

## Architecture

Two entrypoints share one metrics engine (`src/metrics.ts`):

| Entry | Type | Where it runs | Loaded by |
|---|---|---|---|
| `src/index.ts` | [plugin](https://opencode.ai/v2/docs/build/plugins) (Promise API) | background server | `cli.json` / `opencode.json(c)` |
| `tui.tsx` | [CLI (TUI) plugin](https://opencode.ai/v2/docs/build/plugins/cli) | TUI process | `cli.json` `plugins` |

The engine consumes only OpenCode's own event stream:

- `session.usage.updated` → cumulative real tokens per session
- `session.step.started` / `session.text.started` → TTFT anchor
- `session.text.delta` → live rolling TPS window
- `session.step.ended` → authoritative per-step token totals (always corrects any transient estimate)

## Publishing

The package is published to npm as `opencode2-tps2`:

```bash
npm login
npm publish
```
