# opencode-notifier-ntfy

OpenCode plugin that sends [ntfy](https://ntfy.sh/) push notifications when permission is needed, generation completes, errors occur, or the question tool is invoked. Works with any ntfy server, including the default public server or self-hosted instances.

## Installation

Add the plugin to your `opencode.json` or `opencode.jsonc`:

```json
{
  "plugin": ["@ongyishen/opencode-notifier-ntfy@latest"]
}
```

Using `@latest` ensures you always get the newest version when the cache is refreshed.

To pin a specific version:

```json
{
  "plugin": ["@ongyishen/opencode-notifier-ntfy@1.0.1"]
}
```

Restart OpenCode. The plugin will be automatically installed and loaded.

## Updating

OpenCode caches plugins in `~/.cache/opencode`. Plugins are not auto-updated; you need to clear the cache to get new versions.

### If you use `@latest`

Clear the cache and restart OpenCode:

**Linux/macOS:**

```bash
rm -rf ~/.cache/opencode/node_modules/@ongyishen/opencode-notifier-ntfy
```

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\opencode\node_modules\@ongyishen\opencode-notifier-ntfy"
```

Then restart OpenCode - it will download the latest version automatically.

### If you use a pinned version (e.g., `@1.0.2`)

1. Update the version in your `opencode.json`:

```json
    {
      "plugin": ["@ongyishen/opencode-notifier-ntfy@1.0.1"]
    }
 ``` 

2. Clear the cache (see commands above)

3. Restart OpenCode

### Check installed version

**Linux/macOS:**
```bash
cat ~/.cache/opencode/node_modules/@ongyishen/opencode-notifier-ntfy/package.json | grep version
``` 

**Windows (PowerShell):**

```powershell
Get-Content "$env:USERPROFILE\.cache\opencode\node_modules\@ongyishen\opencode-notifier-ntfy\package.json" | Select-String "version"
```

## Platform Notes

The plugin works out of the box on all platforms and uses ntfy for notifications, so no platform-specific dependencies are required. You just need:

- A device subscribed to your ntfy topic (mobile app, web app, or desktop client)
- Internet access to reach your ntfy server

For more information, see the [ntfy documentation](https://docs.ntfy.sh/).

## Configuration

To customize the plugin, create `~/.config/opencode/opencode-notifier-ntfy.json`:

```json
{
  "enabled": true,
  "showProjectName": true,
  "ntfy": {
    "url": "https://ntfy.sh",
    "topic": "opencode",
    "priority": "default",
    "tags": "opencode"
  },
  "command": {
    "enabled": false,
    "path": "/path/to/command",
    "args": ["--event", "{event}", "--message", "{message}"],
    "minDuration": 0
  },
  "events": {
    "permission": true,
    "complete": true,
    "subagent_complete": false,
    "error": true,
    "question": true
  },
  "messages": {
    "permission": "Session needs permission",
    "complete": "Session has finished",
    "subagent_complete": "Subagent task completed",
    "error": "Session encountered an error",
    "question": "Session has a question"
  }
}
```

### Options

| Option              | Type    | Default  | Description                                                |
| ------------------- | ------- | -------- | ---------------------------------------------------------- |
| `enabled`         | boolean | `true` | Global toggle for all ntfy notifications                   |
| `showProjectName` | boolean | `true` | Show project folder name in notification title             |
| `command`         | object  | —       | Command execution settings (enabled/path/args/minDuration) |
| `ntfy`            | object  | —       | ntfy server configuration (url/topic/priority/tags)        |

### ntfy Configuration

Configure your ntfy server and notification settings:

| Option       | Type   | Default               | Description                                                    |
| ------------ | ------ | --------------------- | -------------------------------------------------------------- |
| `url`      | string | `"https://ntfy.sh"` | ntfy server URL                                                |
| `topic`    | string | `"opencode"`        | ntfy topic to publish to                                       |
| `priority` | string | `"default"`         | ntfy priority:`min`, `low`, `default`, `high`, `max` |
| `tags`     | string | `"opencode"`        | Default tags included in all notifications                     |

### Events

Enable/disable notifications for each event:

```json
{
  "events": {
    "permission": true,
    "complete": true,
    "subagent_complete": false,
    "error": true,
    "question": true
  }
}
```

Note: `complete` fires for primary (main) session completion, while `subagent_complete` fires for subagent completion. `subagent_complete` defaults to disabled.

### Messages

Customize notification text:

```json
{
  "messages": {
    "permission": "Action required",
    "complete": "Done!",
    "subagent_complete": "Subagent finished",
    "error": "Something went wrong",
    "question": "Input needed"
  }
}
```

### Command

Run a custom command when events fire. Use `{event}` and `{message}` tokens in `path` or `args` to inject the event name and message.

`command.minDuration` (optional, seconds) gates command execution based on the time elapsed since the last user prompt.

- Applies to all events for the custom command.
- If elapsed time is known and is below `minDuration`, the command is skipped.
- If elapsed time cannot be determined for an event, the command still runs.

```json
{
  "command": {
    "enabled": true,
    "path": "/path/to/command",
    "args": ["--event", "{event}", "--message", "{message}"],
    "minDuration": 10
  }
}
```

### ntfy Tags and Priority

Each event type automatically gets relevant tags assigned:

- **permission**: `warning,lock`
- **complete**: `heavy_check_mark,white_check_mark`
- **subagent_complete**: `robot,heavy_check_mark`
- **error**: `x,error,rotating_light`
- **question**: `question,information_source`

These are combined with your default tags from the `ntfy.tags` configuration. Priority affects how urgently notifications are displayed on your devices.

### Example: Using a Self-Hosted ntfy Server

To use your own ntfy server instead of the default:

```json
{
  "ntfy": {
    "url": "https://ntfy.yourdomain.com",
    "topic": "opencode-work",
    "priority": "high",
    "tags": "opencode,work"
  }
}
```

### Example: Different behaviors for main and subagent completion

You may want different notification behaviors for primary sessions versus subagent sessions:

```json
{
  "events": {
    "complete": true,
    "subagent_complete": false
  },
  "messages": {
    "complete": "Session has finished",
    "subagent_complete": "Subagent task completed"
  }
}
```

## Troubleshooting

### ntfy notifications not arriving

1. **Check your ntfy server URL and topic:**

   ```bash
   curl -d "Test message" https://ntfy.sh/opencode
   ```
2. **Verify your device is subscribed to the correct topic**

   - Make sure your ntfy app is subscribed to the topic configured in your plugin
   - Check that you have internet connectivity to reach your ntfy server
3. **Check ntfy server status:**

   - If using a self-hosted server, verify it's running and accessible
   - Check server logs for any incoming requests
4. **Verify configuration syntax:**

   - Ensure the ntfy URL doesn't have trailing slashes
   - Validate that the topic name matches between plugin and device

### Command execution not working

1. **Verify command path is correct and executable**
2. **Check that the command runs independently** from your terminal
3. **Ensure proper permissions** on the command file

### General: Plugin not loading

1. **Check your opencode.json syntax:**

   ```json
   {
     "plugin": ["@ongyishen/opencode-notifier-ntfy@latest"]
   }
   ```
2. **Clear the cache and restart:**

  ```bash
  rm -rf ~/.cache/opencode/node_modules/@ongyishen/opencode-notifier-ntfy
  ```

## Credits

This plugin was inspired by the original [opencode-notifier](https://github.com/mohak34/opencode-notifier) by [mohak34](https://github.com/mohak34). The ntfy version was created to provide a platform-agnostic notification solution using the ntfy service.

## License

MIT
