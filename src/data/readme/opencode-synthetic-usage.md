# opencode-synthetic-usage

An [OpenCode](https://opencode.ai) TUI plugin that displays your [Synthetic](https://synthetic.new) quota usage in the sidebar.

![Synthetic usage sidebar](all.png)

## Install

Add to your `tui.json`:

- **Global**: `~/.config/opencode/tui.json`
- **Project**: `tui.json` in your project root

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["opencode-synthetic-usage", {}]
  ]
}
```

Set your API key:

```bash
export SYNTHETIC_API_KEY="your-api-key"
```

## Configuration

Options are passed as the second element of the plugin tuple:

```json
{
  "plugin": [
    ["opencode-synthetic-usage", { "showSearchHourly": false, "refreshMs": 30000 }]
  ]
}
```

| Option                | Type    | Default                      | Description                          |
|-----------------------|---------|------------------------------|--------------------------------------|
| `showRollingFiveHour` | boolean | `true`                       | Show the 5-hour rolling quota panel  |
| `showWeeklyToken`     | boolean | `true`                       | Show the weekly token budget panel   |
| `showSearchHourly`    | boolean | `true`                       | Show the hourly search quota panel   |
| `refreshMs`           | number  | `60000`                      | Refresh interval in ms (min: 15000)  |
| `apiUrl`              | string  | `https://api.synthetic.new`  | Custom API base URL                  |
