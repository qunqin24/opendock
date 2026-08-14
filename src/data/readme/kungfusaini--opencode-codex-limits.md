# opencode-codex-limits

Tiny OpenCode TUI plugin for checking OpenAI Codex / ChatGPT subscription usage limits without involving the agent or adding anything to conversation context.

It opens a floating dialog with just the two useful windows:

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
```

## Features

- Floating TUI dialog, no agent turn required.
- Does not add usage output to chat context.
- Shows only the 5-hour and weekly Codex limits.
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

The proper OpenCode TUI plugin install is to add the npm package to your
`tui.json` plugin list. OpenCode installs npm plugins automatically at startup.

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "@kungfusaini/opencode-codex-limits"
  ]
}
```

Then restart OpenCode.

> Note: the unscoped npm name `opencode-codex-limits` is already taken, so this
> package uses the `@kungfusaini` scope.

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

Open the command palette and choose:

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

## How it works

The plugin reuses OpenCode's OpenAI OAuth credential and calls the same ChatGPT backend usage endpoint used by Codex-style clients:

```text
GET https://chatgpt.com/backend-api/wham/usage
```

It extracts the primary 5-hour window and secondary weekly window from the response.

## Security notes

- Tokens are read locally from OpenCode's auth file.
- Tokens are not printed.
- Error messages are redacted before display.
- The plugin may refresh the local OAuth token if it is expired, matching normal OAuth behavior.

## License

MIT
