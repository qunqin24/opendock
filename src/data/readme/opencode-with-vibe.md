# opencode-with-vibe

An [OpenCode](https://opencode.ai) plugin that adds **Mistral Vibe** as a model provider (`vibe/...`) by the official
**`vibe-acp`** binary over the [Agent Client Protocol](https://agentclientprotocol.com). OpenCode **v2** only.

## ToS

This plugin only runs the official `vibe-acp` binary that you installed and logged into yourself. It **doesn't**
emulate or call any Mistral HTTP APIs.

Other plugins emulate API calls, so they will eventually get banned. This plugin avoids that risk.

## Install

1. Install the Mistral Vibe CLI, sign in once (`vibe`), and make sure `vibe-acp` is on `PATH`
2. Add the plugin to `opencode.json`

```json
{
  // ...
  "plugins": ["opencode-with-vibe"]
  // ...
}
```

### Options

| Option       | Type                 | Default | Meaning                                                                                                             |
| ------------ | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `permission` | `"allow"` / `"deny"` | `allow` | How to answer Vibe's permission requests (it asks before shell commands and file writes). **`allow` answers each request with a one-time approval** (`allow_once`), and never writes standing approval into your Vibe config |

`vibe-acp` takes no arguments; it is started in the project directory and inherits your existing Vibe sign-in. The
plugin never calls `authenticate`, because the CLI is already logged in.

### Models and thinking levels

The plugin reads the available models and their thinking levels directly from `vibe-acp` at runtime (a scratch session
is switched through every model, and the reported `thinking` options are recorded). Until that probe finishes, a
hard-coded list of the models `vibe-acp` 3.1.3 shipped with is used.

Every model becomes one OpenCode model, and each `thinking` level becomes a variant (`vibe/mistral-large-4-0#high`).
The context window shown by OpenCode comes from the `usage_update.size` that Vibe sends once a model has been used.

### Session modes

Vibe has its own session modes (`ask`, `accept-edits`, `smart-approve`, `auto-approve`). The plugin leaves the mode you
chose alone, but repairs it after a model switch, because Vibe resets it (switching to `mistral-medium-latest` drops it
back to `ask`).

## Known limitations

- **Vibe** uses its own system prompt and tools
- titles use the chat model through Vibe, so each one costs tokens
- deleting an OpenCode session doesn't delete the Vibe session (`session/list` still shows it)
- a resumed conversation is re-configured on its first message, because Vibe forgets the model and thinking level
