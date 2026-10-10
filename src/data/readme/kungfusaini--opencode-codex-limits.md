# @kungfusaini/opencode-codex-limits

OpenCode TUI plugin for checking OpenAI Codex / ChatGPT subscription usage limits without involving the agent or adding usage output to conversation context.

It adds a compact sidebar panel and a command-palette popup for the detailed view. It shows the main Codex quota windows and any extra usage buckets returned by OpenAI, including GPT-5.3-Codex-Spark when available.

Sidebar example:

```text
Codex Limits
Codex
5h      88% █████████░ ↻ 4h 30m
weekly  49% █████░░░░░ ↻ 4d 14h

GPT-5.3-Codex-Spark
5h      94% █████████░ ↻ 4h 45m
weekly  65% ███████░░░ ↻ 6d
Credits: 0
```

Popup example:

```text
5h limit
[█████████████░░░░░░░]
66% left · 34% used
resets in 2h 20m
Sun, Jun 07, 07:34 PM

Weekly limit
[███████████████████░]
93% left · 7% used
resets in 6d 5h
Sat, Jun 13, 10:53 PM

GPT-5.3-Codex-Spark
5h limit
[████████████████████]
98% left · 2% used
resets in 2h 27m
Sun, Jun 07, 07:41 PM
```

## Features

- Sidebar panel, refreshed every two minutes.
- Command-palette popup, no agent turn required.
- Does not add usage output to chat context.
- Shows the main 5-hour and weekly Codex limits.
- Shows additional usage buckets returned by the API, including GPT-5.3-Codex-Spark when available.
- Shows remaining credits when the API reports a balance.
- Includes progress bars, percent left/used, relative reset time, and exact reset date/time.
- Uses your existing OpenCode OpenAI OAuth credential.
- No Codex routing plugin and no OpenCode source changes.

## Requirements

- OpenCode with TUI plugin support.
- Node.js 20+.
- An existing OpenAI OAuth login in OpenCode:

```bash
opencode auth login
```

The plugin reads OpenCode's local OAuth file at:

```text
~/.local/share/opencode/auth.json
```

It never prints access or refresh tokens.

## Install

Add the npm package to your OpenCode `tui.json` plugin list. OpenCode installs npm TUI plugins automatically at startup.

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "@kungfusaini/opencode-codex-limits@0.2.1"
  ]
}
```

Then restart OpenCode.

> Note: the unscoped npm name `opencode-codex-limits` is already taken, so this
> package uses the `@kungfusaini` scope.

Do not add this package to `opencode.json`; it is a TUI plugin and belongs in `tui.json`.

For local development from a checkout:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "file:///absolute/path/to/opencode-codex-limits/src/index.js"
  ]
}
```

Restart OpenCode after changing `tui.json`.

## Usage

The sidebar panel appears automatically after OpenCode starts.

To open the detailed popup, open the command palette and choose:

```text
Codex limits
```

If your OpenCode build routes TUI slash commands, `/limits` and `/codex-limits` may also open the dialog.

## CLI

The package also includes a small CLI for debugging:

```bash
opencode-codex-limits
opencode-codex-limits --json
```

## Development

```bash
npm install
npm run check
node bin/codex-limits.js --json
npm pack --dry-run
```

The package exposes both the root export and the TUI subpath OpenCode expects:

```json
{
  "exports": {
    ".": "./src/index.js",
    "./tui": "./src/index.js"
  }
}
```

## How it works

The plugin reuses OpenCode's OpenAI OAuth credential and calls the same ChatGPT backend usage endpoint used by Codex-style clients:

```text
GET https://chatgpt.com/backend-api/wham/usage
```

It extracts the primary 5-hour window and secondary weekly window from the response, plus any additional usage buckets exposed in `additional_rate_limits`.

The API shape is unofficial and may change. When a field is missing, the plugin hides that section or shows a sanitized error instead of exposing tokens.

## Security notes

- Tokens are read locally from OpenCode's auth file.
- Tokens are not printed.
- Error messages are redacted before display.
- The plugin may refresh the local OAuth token if it is expired, matching normal OAuth behavior.

## License

MIT
