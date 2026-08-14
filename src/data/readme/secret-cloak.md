# secret-cloak

OpenCode plugin that redacts secrets/PII via gitleaks before LLM requests and restores them locally after.

## Quick Start

1. **Install [gitleaks](https://github.com/gitleaks/gitleaks#installation)**
2. **Add plugin** to your OpenCode config:

```json
{
    "plugins": ["secret-cloak"]
}
```

3. **(Optional) Create config** in `~/.config/opencode/secret-cloak.config.json`:

```json
{
    "enabled": true,
    "debug": false,
    "session": {
        "ttlMs": 3600000,
        "maxSessions": 1000,
        "maxMappings": 100000
    },
    "gitleaks": {
        "path": null,
        "patterns": {
            "exclude": []
        }
    }
}
```

## Installation

### From npm

Add `secret-cloak` to the `plugins` array in your OpenCode config:

```json
{
    "plugins": ["secret-cloak"]
}
```

Packages are installed automatically using Bun at startup and cached in `~/.cache/opencode/node_modules/`.

### From local files

Place the plugin in `.opencode/plugins/` (project) or `~/.config/opencode/plugins/` (global). Create a `package.json` in your config directory if the plugin needs external dependencies.

Requires gitleaks to be installed and available in PATH. The plugin auto-detects gitleaks on startup.

## Configuration

Config files are searched in this order:

1. `OPENCODE_SECRET_CLOAK_CONFIG` env var (absolute path)
2. `secret-cloak.config.json` in project root
3. `.opencode/secret-cloak.config.json` in project root
4. `~/.config/opencode/secret-cloak.config.json` globally

### Options

| Option                      | Default   | Description                                      |
| --------------------------- | --------- | ------------------------------------------------ |
| `enabled`                   | `true`    | Enable/disable the plugin                        |
| `debug`                     | `false`   | Enable debug logging                             |
| `session.ttlMs`             | `3600000` | Session TTL in milliseconds                      |
| `session.maxSessions`       | `1000`    | Max concurrent sessions                          |
| `session.maxMappings`       | `100000`  | Max secret mappings per session                  |
| `gitleaks.path`             | `null`    | Custom gitleaks binary path (null = auto-detect) |
| `gitleaks.patterns.exclude` | `[]`      | Gitleaks rule IDs to exclude                     |

## How It Works

1. **Detect** — gitleaks scans messages for secrets/PII
2. **Redact** — Secrets are replaced with placeholders before LLM request
3. **LLM** — Request sent to LLM with redacted content
4. **Restore** — Placeholders replaced with original secrets in response

Session-based tracking ensures redactions are uniquely mapped per request and properly restored.
