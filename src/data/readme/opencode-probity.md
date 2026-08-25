# opencode-probity

OpenCode plugin that enforces TDD workflow using [probity](https://github.com/nizos/probity).

## What it does

Intercepts tool calls (Bash, Write, Edit) in OpenCode and evaluates them against probity rules before execution. When a rule violation is detected (e.g. writing implementation code without a failing test first), the tool call is blocked.

Payloads are passed straight through to `npx @nizos/probity --agent opencode`, which understands OpenCode's native `tool.execute.before` shape directly — no translation layer needed.

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-probity"]
}
```

## Configuration

Create a `probity.config.ts` in your project root:

```typescript
import { defineConfig, enforceTdd } from '@nizos/probity';

export default defineConfig({
  rules: [
    {
      files: ['src/**'],
      rules: [enforceTdd()],
    },
  ],
});
```

See the [probity documentation](https://github.com/nizos/probity) for available rules and configuration options.

## Development

```bash
bun install
mise run build    # Build the plugin
mise run test     # Run tests
mise run lint     # Lint code
mise run format   # Format code
```

## Debug Logging

Enable debug logging in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-probity"],
  "probity": {
    "debug": true
  }
}
```

When `debug: true`, trace logs are written to `~/.cache/opencode/probity-debug.jsonl`. You can also provide a custom relative path (e.g., `"debug": "./logs/probity.jsonl"`).

View live debug logs:

```bash
tail -f ~/.cache/opencode/probity-debug.jsonl | jq -C '.'
```

See [DEBUG.md](DEBUG.md) for full configuration options.

## License

MIT License. See the [LICENSE](LICENSE) file for details.
