# Codex limits for OpenCode V2

Show the available Codex 5-hour and weekly subscription limits in the OpenCode session sidebar while an OpenAI model is selected. Each row shows a remaining-capacity progress bar and the next reset countdown. The plugin uses the OpenAI ChatGPT OAuth connection already active in OpenCode; it does not call the model or add content to the conversation.

## Install

Requires OpenCode V2 and an OpenAI ChatGPT OAuth login (`/connect` → OpenAI → ChatGPT). An OpenAI API key does not have ChatGPT subscription quota.

```sh
opencode plugin add @yassirh/opencode-codex-limits
```

Restart OpenCode, select an `openai/…` model, and open a session with the sidebar visible. The command palette includes **Refresh Codex limits**.

OpenCode V2 shows the sidebar when there is room. In `~/.config/opencode/cli.json`, set `"session": { "sidebar": "auto" }` if you previously hid it.

## Available resets

The sidebar shows an **Available resets (count)** section with a bulleted list of every available reset's title and expiry in your local time, sorted by earliest expiry. The section is expanded by default. Click its heading or use **Toggle Codex available resets** in the command palette to collapse or expand it; the choice is kept in memory during the TUI session. **Show Codex reset details** in the command palette lists all available resets, their titles, exact local expiry dates (including year and timezone), and expiry countdowns.

Reset titles come directly from the API, such as **Full reset (Weekly + 5 hr)**. If a title is missing, only the expiry is shown.

The plugin reads the count from `/wham/usage` and, when the count is positive or unknown, fetches `/wham/rate-limit-reset-credits` using the same OpenCode OAuth connection. Missing expiry timestamps are shown as unknown. A reset-detail failure preserves the quota display and any count supplied by the usage endpoint. Missing counts are distinguished from zero; incomplete details are labeled unavailable. Expiry dates come from the account response, rather than promotional estimates. The plugin only reads reset information; it does not redeem resets.

Both endpoints are unpublished and may change. Reset details refresh along with usage; **Refresh Codex limits** refreshes both.

## Colors and health levels

Configure optional overrides in your global `~/.config/opencode/opencode.jsonc` or a project `opencode.jsonc`, using the plugin's object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@yassirh/opencode-codex-limits-plugin",
      "options": {
        "levels": {
          "healthy": 30,
          "warning": 20
        },
        "colors": {
          "healthy": "#22c55e",
          "warning": "#f97316",
          "critical": "#ef4444"
        }
      }
    }
  ]
}
```

The values above are the defaults. Replace the existing plugin entry with this object; for local development, use the plugin's absolute path as `package`. The server validates these options and sends the effective settings to the TUI with each usage response, so automatically loaded TUI entrypoints use the same settings.

Health is based on **remaining capacity**:

- **Healthy:** greater than `levels.healthy` (default: 30%), shown in green.
- **Warning:** greater than `levels.warning` and at or below `levels.healthy` (default: 20–30%), shown in orange.
- **Critical:** at or below `levels.warning` (default: 20%), shown in red.

Every setting is optional. Missing colors use their defaults; colors must be `#RRGGBB` hex strings, and invalid colors fall back individually. Missing thresholds use their defaults. The resulting thresholds must satisfy `0 ≤ warning < healthy ≤ 100`; an invalid combination falls back to both default thresholds. Only the filled portion of the bar changes color; the empty portion stays muted. Restart OpenCode after changing these options.

## Local development

```sh
npm install
npm test
```

For local testing, build the package and configure its absolute path in your global `~/.config/opencode/opencode.jsonc` (or a project `opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-codex-limits-plugin"]
}
```

The package exports a server plugin and a `./tui` plugin; OpenCode loads the TUI entrypoint automatically.

The usage request is made by the OpenCode server to `https://chatgpt.com/backend-api/wham/usage`. This is an unpublished ChatGPT backend endpoint, so its response format may change. Only usage percentages, reset counts and titles, reset/expiry timestamps, and status information are sent to the TUI. Missing windows are omitted: some accounts expose a weekly limit but no 5-hour limit. An unsuccessful refresh preserves the last successful snapshot and labels it stale.

## GitHub builds

The build workflow runs on pushes to `main`, pull requests, and manual runs from the GitHub Actions tab. It installs dependencies, builds and tests the plugin, and uploads `dist/` as a downloadable artifact.

## GitHub releases

Push a version tag matching `v*` to create a GitHub Release. Update `package.json` and `package-lock.json` to the release version and commit the changes before tagging:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow installs dependencies, builds and tests the plugin, and attaches the npm package (`.tgz`) to a GitHub Release with generated release notes.

## Publish to npm

```sh
npm login --registry=https://registry.npmjs.org/
npm test
npm pack --dry-run --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

The package name is `@yassirh/opencode-codex-limits-plugin`. Create the matching public repository at <https://github.com/yassirh/opencode-codex-limits-plugin> before the first release.
