# opencode-debug-agent

OpenCode plugin for runtime debugging - capture and analyze execution data via HTTP instrumentation.

## Features

- **Debug Agent** - Primary agent specialized for debugging workflows
- **Debug Skill** - Use debugging tools from any agent via `skill({ name: "debug" })`
- **HTTP Server** - Hono-based server with CORS support for browser/Node instrumentation
- **Port Persistence** - Server remembers its port across sessions
- **5 Tools** - `debug_start`, `debug_stop`, `debug_read`, `debug_clear`, `debug_status`

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-debug-agent"]
}
```

Or for local development, copy to `.opencode/plugin/`.

## Usage

### Using the Debug Agent

Switch to the debug agent (Tab key) and describe your issue. The agent will:

1. Start the debug server
2. Instrument your code with fetch() calls
3. Ask you to reproduce the issue
4. Analyze captured logs
5. Help identify the problem
6. Clean up instrumentation

### Using the Debug Skill (from any agent)

```
Load the debug skill and help me debug this API timeout issue.
```

The build agent can then use all debug tools.

### Manual Tool Usage

```
debug_start          # Start server, get instrumentation snippet
debug_status         # Check if server running, get port
debug_read           # Read captured logs
debug_read(tail: 10) # Read last 10 entries
debug_clear          # Clear log file
debug_stop           # Stop server
```

## How It Works

1. **Start server**: `debug_start` launches an HTTP server and returns a ready-to-use fetch() snippet
2. **Instrument code**: Insert the snippet at strategic locations to capture runtime data
3. **Reproduce issue**: User runs their code normally
4. **Analyze logs**: `debug_read` returns captured data as structured JSON
5. **Clean up**: `debug_stop` and remove instrumentation

### Instrumentation Example

```javascript
// Snippet returned by debug_start:
fetch("http://localhost:54321/log", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({label: "LABEL_HERE", data: {YOUR_DATA}})
})

// Used in code:
fetch("http://localhost:54321/log", {
  method: "POST", 
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({label: "before-api", data: {userId, params}})
})
```

## Files

- `.opencode/debug.log` - NDJSON log file
- `.opencode/debug.port` - Persisted port number

## Development

```bash
bun install
mise run build
mise run test
mise run lint
```

## License

MIT
