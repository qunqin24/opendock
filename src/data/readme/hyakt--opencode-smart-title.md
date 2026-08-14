# Smart Title Plugin (fork)

Auto-generates meaningful session titles for your OpenCode conversations using AI.

Forked from [@tarquinen/opencode-smart-title](https://github.com/Tarquinen/opencode-smart-title).

## What Changed (Why This Fork)

The original plugin uses `@tarquinen/opencode-auth-provider` + `ai` SDK to call LLM APIs directly from the plugin. This approach has a compatibility issue: the auth-provider's custom `fetch` wrapper returns `undefined` instead of a proper `Response` object when used with the `github-copilot` provider, causing `extractResponseHeaders(response)` to crash with `TypeError: undefined is not an object`.

This fork replaces the direct API call with **OpenCode's subagent session API** (`client.session.create` / `client.session.prompt`), delegating LLM calls to OpenCode itself.

### Benefits

- Works with all providers including `github-copilot` (no auth-provider fetch bug)
- Removed 3 heavy dependencies: `ai`, `@ai-sdk/openai-compatible`, `@tarquinen/opencode-auth-provider`
- Custom prompt support via `prompt` config field

## What It Does

- Watches your conversation and generates short, descriptive titles
- Updates automatically when the session becomes idle (you stop typing)
- Delegates LLM calls to OpenCode via subagent sessions - no direct API calls
- Works with any provider that OpenCode supports

## Installation

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@hyakt/opencode-smart-title"]
}
```

## Configuration

The plugin supports both global and project-level configuration:

- **Global:** `~/.config/opencode/smart-title.jsonc` - Applies to all sessions
- **Project:** `.opencode/smart-title.jsonc` - Overrides global config

The plugin creates a default global config on first run.

```jsonc
{
  // Enable or disable the plugin
  "enabled": true,

  // Enable debug logging
  "debug": false,

  // Optional: Use a specific model (format: "provider/model")
  // "model": "github-copilot/claude-haiku-4.5",

  // Optional: Custom prompt for title generation
  // "prompt": "Generate a short Japanese title for this conversation.",

  // Update title every N idle events (1 = every time you pause)
  "updateThreshold": 1
}
```

## License

MIT
