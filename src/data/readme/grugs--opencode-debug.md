# OpenCode Debug Plugin

This is forked from the original, MrgSub/opencode-debug. This adds OpenCode v2 support, slash commands to enable, and a nice debug log viewer.

Runtime debugging for [OpenCode v2](https://opencode.ai/v2/docs/) in **any programming language**. The agent adds temporary HTTP requests to your application, captures labeled data, and uses it to diagnose bugs. No client SDK is required.

## Installation

Add the package to `opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@thecto/opencode-debug-plugin@latest"]
}
```

Requires OpenCode v2. The plugin automatically registers `/debug` for the guided debugging workflow and `/debug-logs` for the live log window. No separate skill or command file is needed.

## Start debugging

```text
/debug The checkout function returns the wrong total
```

Run `/debug` without arguments to debug the issue already discussed in the conversation. The command runs in the current session, preserves attachments, and instructs the agent to:

- Check capture status and reuse useful logs.
- Start capture on an automatically selected port when needed.
- Instrument code using the application's native HTTP client.
- Ask you to reproduce the issue with a **Reproduced** question before reading the results.
- Preserve logs needed for before/after comparisons and clear obsolete logs before another reproduction.
- Remove temporary instrumentation and stop capture once you confirm the issue is resolved.

## Workflow

1. Run `/debug` with an issue description; the agent checks capture status and starts the server when needed.
2. The agent instruments the relevant code using that language's HTTP client.
3. Reproduce the bug and watch events with **`/debug-logs`**.
4. The agent calls `debug_read` and diagnoses the captured data.
5. Remove the temporary instrumentation and call `debug_stop`.

Events are saved to `.opencode/debug.log` in the plugin's project directory. Stopping or unloading the plugin closes its server and ngrok tunnel while preserving the log. Each plugin instance owns its own server and state.

## Live log window

Type **`/debug-logs`**, or select **View live debug logs** from the command palette.

- Opens a scrollable popup showing the latest 200 entries.
- Updates as requests arrive, with automatic recovery refreshes every two seconds.
- Follows new entries while at the bottom; scroll up to inspect earlier entries.
- Use arrow keys or Page Up/Page Down to scroll, End to follow, and Escape to close.
- Shows the current debug URL and whether capture is running.
- Can display preserved logs after capture has stopped.

The window uses OpenCode's location-scoped RPC connection, so it also works when the OpenCode server is remote. Closing the window stops its subscriptions; capture continues until `debug_stop`.

To watch the complete log from another terminal:

```sh
tail -F .opencode/debug.log
```

## Agent tools

| Tool | Description |
| --- | --- |
| `debug_start` | Start capture and get language-agnostic instrumentation instructions; optional `port` (auto-selected by default) |
| `debug_stop` | Stop capture and preserve the logs |
| `debug_read` | Read captured data; optional positive `tail` count |
| `debug_clear` | Clear the log for a fresh reproduction |
| `debug_status` | Get capture status and the current URL |

## HTTP protocol

Use the exact URL returned by `debug_start` or `debug_status`:

```http
POST /debug
Content-Type: application/json

{"label":"checkout-total","data":{"subtotal":100,"total":85}}
```

- `label` is a required, non-empty string.
- `data` is optional and can be any JSON value, including arrays, scalars, and `null`.
- Successful requests return HTTP 200 with `{"received":true}` after writing the event.
- Invalid JSON or labels return HTTP 400. Unknown routes return HTTP 404.
- `GET /health` returns `{"status":"ok"}`. Browser CORS preflight is supported.

Log format:

```text
[2026-10-13T12:00:00.000Z] checkout-total | {"subtotal":100,"total":85}
```

Use descriptive labels at function entry/exit, around I/O, in error handlers, and at state changes. Keep temporary instrumentation best-effort with short timeouts and error handling. Use the application's asynchronous facilities where appropriate, and let short-lived programs flush their requests before exiting.

### Shell / cURL

```sh
curl --max-time 1 -sS -X POST 'http://127.0.0.1:PORT/debug' \
  -H 'Content-Type: application/json' \
  --data '{"label":"checkpoint","data":{"value":42}}' >/dev/null 2>&1 || true
```

### Python (standard library)

```python
import json
import urllib.request

try:
    request = urllib.request.Request(
        "http://127.0.0.1:PORT/debug",
        data=json.dumps({"label": "checkpoint", "data": {"value": 42}}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=1) as response:
        response.read()
except (OSError, TypeError, ValueError):
    pass
```

### JavaScript / TypeScript

```javascript
fetch("http://127.0.0.1:PORT/debug", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ label: "checkpoint", data: { value: 42 } }),
  signal: AbortSignal.timeout(1000),
}).catch(() => {});
```

Go, Java, C#, Ruby, Rust, PHP, and other languages use the same request with their native HTTP clients. The application does not need Node.js or Bun.

## Ngrok (public URLs)

For deployed applications or other environments that cannot reach the local debug server, set an [ngrok authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) in the **OpenCode server's environment**:

```sh
export NGROK_AUTHTOKEN=your_token_here
```

Alternatively, use OpenCode's **ngrok** integration to save a key. The environment variable takes precedence over a saved key.

When a token is available, `debug_start` creates a public tunnel and returns its URL. Without a token, it listens on `127.0.0.1` with an automatically selected port. An occupied preferred port falls back to an available port.

## Development

```sh
bun install
bun run typecheck
bun run build
```

To try a local build, configure the absolute path to this repository as a v2 plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-debug"]
}
```

The build emits server, TUI, and RPC entrypoints. OpenCode, Solid, and OpenTUI remain external so the CLI supplies its runtime instances.

## License

MIT
