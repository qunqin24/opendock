# opencode-gitnexus

OpenCode plugin for GitNexus integration.

## What it does

- Auto-registers the GitNexus MCP server
- Injects a GitNexus usage protocol into the system prompt
- Runs a fire-and-forget auto-update check on init
- Auto-analyzes source code repos on first open

## Install

```jsonc
{
  "plugin": ["opencode-gitnexus"]
}
```

## Default MCP command

```bash
npx -y gitnexus serve
```

## Plugin options

| Option | Type | Default | Description |
|---|---|---|---|
| `mcpCommand` | `string[]` | `npx -y gitnexus serve` | Override the MCP launch command |
| `disableMcp` | `boolean` | `false` | Skip auto-registering GitNexus |
| `disableProtocol` | `boolean` | `false` | Skip system prompt injection |
| `disableAutoUpdate` | `boolean` | `false` | Skip update checks on init |
| `disableAutoAnalyze` | `boolean` | `false` | Skip auto-analyzing repos on open |
| `autoAnalyzeMaxSizeMB` | `number` | `100` | Max repo size (MB) for auto-analysis |

## Notes

- The plugin uses `config` to inject the MCP server.
- The plugin uses `experimental.chat.system.transform` to add GitNexus guidance.
- Auto-update runs in the background and will ask for a restart if it upgrades itself.
