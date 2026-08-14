# opencode-moshi-live

OpenCode plugin for Moshi Live Activity and notification updates.

This plugin sends OpenCode session events to the Moshi API so you can watch progress from the iPhone app.

Requires Bun at runtime. The plugin source and CLI helper both use Bun APIs.

## Features

- Tracks tool start and finish events
- Sends permission and question prompts as approval-needed updates
- Supports both legacy and newer OpenCode permission event variants
- Distinguishes task completion from reply-needed states
- Sends reasoning, step, and subtask progress as low-noise info updates
- Skips child sessions to reduce notification spam

## Install

### Option 1: OpenCode plugin install

```bash
opencode plugin opencode-moshi-live --global
```

Then save your Moshi token:

```bash
bunx opencode-moshi-live token YOUR_TOKEN_HERE
```

### Option 2: Setup via CLI helper

```bash
bunx opencode-moshi-live setup
bunx opencode-moshi-live token YOUR_TOKEN_HERE
```

## Moshi Token

Get your token from the Moshi iOS app:

1. Open Moshi
2. Go to `Settings -> Agent Hooks`
3. Copy the token

The token is stored at `~/.config/moshi/token`.

## Security Notes

- The plugin stores the Moshi token locally at `~/.config/moshi/token` and never writes it into project files.
- The plugin only sends normalized event metadata to the Moshi API. It does not intentionally upload full repository contents or arbitrary file bodies.
- Some notification messages may include short snippets such as command descriptions, file paths, reasoning summaries, or assistant reply text. Do not use this plugin if that metadata must never leave the machine.
- Child sessions are skipped to reduce duplicate noise and accidental over-reporting.
- Before publishing, review the exact package contents with `npm pack --dry-run`.

## What It Sends

The plugin currently emits these user-facing event types:

- `Running Bash`, `Running Edit`, etc.
- `Finished Bash`, `Finished Write`, etc.
- `Permission Required`
- `Question`
- `Waiting for Reply`
- `Thinking`
- `Reasoning`
- `Step Complete`
- `Delegating`
- `Task Complete`
- `Retrying`
- `Session Error`

## Example Notifications

- `Running Bash: prints current directory`
- `Finished Bash: /Users/young/Developer/my-project`
- `Permission Required: read ~/.ssh/config`
- `Waiting for Reply: Should I read ~/.ssh/config?`
- `Step Complete: analyzed current workspace and prepared next action`
- `Task Complete: Reply ready`

## Behavior Notes

- `session.idle` is not treated as completion if OpenCode is waiting for permission or a user reply.
- Permission prompts are mapped from OpenCode permission events and sent as `approval_required` notifications.
- The plugin handles both legacy `permission.updated` events and newer `permission.asked` / `permission.replied` flows.
- Assistant messages like `Should I ...?` and `May I ...?` are treated as reply-needed states.
- Repeated permission, question, reasoning, and subtask events are deduplicated with short TTL windows.
- Child sessions are ignored to avoid duplicate progress noise.

## Known Limitations

- Reply-needed detection for assistant text is pattern-based, so it may not perfectly classify every prompt style.
- The plugin intentionally sends only short summaries, so very detailed progress context is not preserved in notifications.
- Sensitive environments should review the metadata examples in `SECURITY.md` before use.

## Development

Local verification:

```bash
bun install
bun run typecheck
npm pack --dry-run
```

OpenCode can load the published package globally with:

```bash
opencode plugin opencode-moshi-live --global
```

## Uninstall

```bash
bunx opencode-moshi-live uninstall
```

## Publish Checklist

1. Confirm `repository`, `homepage`, and `bugs` URLs in `package.json`
2. Set the correct npm owner/package name
3. Run `bun install`
4. Run `bun run typecheck`
5. Run `npm pack --dry-run`
6. Commit and tag
7. Publish with `npm publish` or `bun publish`

## License

MIT
