# opencode-mlflow-plugin

OpenCode plugin that sends LLM tracing data to [MLflow](https://mlflow.org/) with full observability: token counts, costs, model info, generation parameters, and GenAI semantic conventions.

## What it captures

| Category | Fields |
|----------|--------|
| **Tokens** | input, output, reasoning, cache read/write, total |
| **Model** | model ID, provider, agent name |
| **Cost** | USD cost per turn |
| **Generation** | temperature, topP, topK, maxTokens |
| **Finish** | stop, tool-calls, etc. |
| **Request/Response** | Full prompt and completion text |
| **MLflow metrics** | message_count, tool_count, duration_ms |

## Setup

1. Place `send_trace.py` and `dist/` in your plugin directory
2. Add to `opencode.json`:

```json
{
  "plugin": ["C:/path/to/opencode-mlflow-plugin/dist/index.js"]
}
```

3. Ensure MLflow is running on `http://localhost:5000` (or configure `trackingUri`)

## Options

```json
{
  "plugin": [["C:/path/to/dist/index.js", {
    "trackingUri": "http://localhost:5000",
    "experimentName": "opencode-sessions",
    "logSpans": true,
    "logTokens": true,
    "logToolDetails": false
  }]]
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `trackingUri` | `http://localhost:5000` | MLflow tracking server URL |
| `experimentName` | `opencode-sessions` | MLflow experiment name |
| `logSpans` | `true` | Create MLflow traces with spans |
| `logTokens` | `true` | Capture token counts |
| `logToolDetails` | `false` | Log individual tool execution durations as metrics |

## How it works

- Listens to OpenCode events (`chat.message`, `message.updated`, `chat.params`, tool events)
- Accumulates token counts across parallel assistant messages in a turn
- Uses a 2-second debounce to handle multiple assistant messages per turn
- Sends traces to MLflow via a Python subprocess using the MLflow SDK (synchronous mode)
- Creates LLM-type spans with GenAI semantic convention attributes

## Requirements

- Python 3.10+ with `mlflow` installed (`pip install mlflow`)
- MLflow tracking server running
- OpenCode with plugin support

## License

MIT
