# opencode-plugin-lisp

OpenCode plugin that runs a persistent [SBCL](https://www.sbcl.org/) (Steel Bank Common Lisp) sidecar for evaluating Common Lisp expressions.

State, packages, and `defvar`s persist across evaluations for the lifetime of the sidecar process.

## Prerequisites

You need SBCL installed on your system:

```bash
# macOS
brew install sbcl

# Ubuntu / Debian
sudo apt install sbcl

# Fedora
sudo dnf install sbcl

# Windows — download from https://www.sbcl.org
```

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-lisp"]
}
```

OpenCode will automatically install the plugin via Bun on startup.

## Usage

The plugin provides two tools:

### `lisp_eval`

Evaluate a Common Lisp expression in the persistent SBCL sidecar. The expression must be a single line.

```
lisp_eval code="(let ((x 40)) (+ x 2))"
```

Returns the printed value, its type, and any output the expression wrote.

### `lisp_reset`

Clear the sidecar's observation history.

```
lisp_reset
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OPL_SBCL` | `sbcl` | Path to the SBCL binary |
| `OPL_DEBUG` | `0` | Set to `1` to enable debug logging |

## How It Works

The plugin spawns a persistent SBCL subprocess that communicates over stdin/stdout using a simple line-based, tab-separated protocol. The sidecar maintains state between evaluations — variables, packages, and definitions persist until the process is restarted.

The plugin also observes chat messages and tool calls via OpenCode hooks, feeding context to the sidecar's history buffer.

## License

MIT
