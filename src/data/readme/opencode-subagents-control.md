# OpenCode subagent controls

An OpenCode V2 terminal plugin for interacting with subagents from their session view. Steer a subagent, change its model, run server commands, and inspect its context and TODOs without returning to the parent session.

## Features

- A multiline prompt in the subagent view, with slash-command suggestions.
- A child-session panel showing context usage, TODOs, model, and status.
- Optional Magic Context statistics when a compatible local Magic Context server is available.
- Commands for finding and controlling descendant sessions from a parent session.

## Install

The plugin targets the OpenCode V2 plugin API and depends on `@opencode/plugin` 2.2.5. It has been exercised with OpenCode 2.2.5 and 2.2.6.

Add the package to the `plugins` array in your OpenCode configuration:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-subagents-control@0.1.0"]
}
```

Keep any existing plugin entries. OpenCode loads the plugin's server and TUI parts together. Use `/reload` if the plugin does not appear after you save the configuration.

To receive the latest published version instead, use `"opencode-subagents-control"` without the version suffix.

## Use

Open a subagent in OpenCode's **Subagents** view. The plugin focuses its prompt when you open a child. Type an instruction and press Enter to steer it; use Shift+Enter for a newline and Escape to return to the subagent list. Click the prompt or press `Ctrl+Alt+I` to focus it again. Enter `/model` to choose its model and variant, or `/command arguments` to run a server command. Start typing a slash command and press Tab to complete the first suggestion. If submission fails, the input is preserved and an error is shown.

The plugin prompt is not OpenCode's native prompt: it does not support attachments, file or agent mentions, or general TUI-only slash commands. The model picker and server commands are provided by OpenCode and availability depends on the connected server.

The subagent model picker groups available models by favorites, recent models, and provider. It reads OpenCode's local model preferences but does not change them. The preferences file is an internal OpenCode format, so favorites can be unavailable with other versions or environments.

Open a session and select a command from the **Subagents** group in the command palette, or use a slash command:

| Command | Action |
| --- | --- |
| `/subagent-open` | Open a descendant session. |
| `/subagent-steer` | Submit an instruction with `steer` delivery. |
| `/subagent-model` | Select a model and optional variant for subsequent requests. |
| `/subagent-command` | Run an available server command in the subagent. |
| `/subagent-panel` | Open a session details panel in the current session. |

When the current session is a child, commands target that session. From a root session, choose one of its descendants. A steering submission is accepted into the session inbox; it is not a guarantee that the agent has already acted on it. Model changes affect subsequent requests, not a request already in flight. Errors from OpenCode are shown as notifications.

The command picker lists server commands. TUI-only slash commands are local UI actions and are not sent to another session. Model switching has its own command because it is a session API action, not a server command.

The child panel shows the selected child's context usage, TODOs, model, and status. It opens automatically on wide terminals; on narrow terminals use `/subagent-panel`. OpenCode owns its size and presentation and can use full screen in a narrow terminal. This is a plugin-owned panel, not the built-in sidebar: third-party sidebar contributions are not embedded. The optional local Magic Context adapter uses the authenticated sidebar snapshot RPC observed in Magic Context 0.37, which is not a public compatibility contract. It checks the returned session ID and shows unavailable if it cannot obtain a matching snapshot; remote servers and other versions may not work. This adapter has been tested with a mock RPC server, not a live Magic Context session.

## Development

Clone the repository and install dependencies with `npm install`, then run `npm run typecheck` and `npm test`. Tests require Bun. Run `npm run build` after changing the TUI source to rebuild the packaged entry point. To load a local checkout, add its absolute directory to the `plugins` array instead of the package name.

## License

This project is licensed under the GNU Lesser General Public License, version 3.0 only. See [LICENSE](LICENSE) and [LICENSE-GPL](LICENSE-GPL) for the license texts.
