# opencode-kimi-search

An [OpenCode](https://opencode.ai) plugin that provides `kimi_search` and `kimi_fetch` tools, ported from the original OpenClaw `kimi-search` plugin.

## Features

- **kimi_search** – Search the internet for latest information (news, docs, releases, blogs, papers).
- **kimi_fetch** – Fetch a URL and extract main text content from the page.
- **Zero-config** – Automatically inherits `apiKey` and `baseURL` from your existing **Kimi For Coding** provider configuration in OpenCode.

## Installation

### Option 1: Local plugin (fastest, no npm needed)

Copy the pre-built single-file bundle to your OpenCode plugins directory:

```bash
# For current project only
install -D -m644 dist/opencode-kimi-search.js /path/to/your/project/.opencode/plugins/opencode-kimi-search.js

# Or globally for all projects
install -D -m644 dist/opencode-kimi-search.js ~/.config/opencode/plugins/opencode-kimi-search.js

# Or download directly from GitHub (no clone needed)
curl -fsSL https://raw.githubusercontent.com/wszqkzqk/opencode-kimi-search/refs/heads/master/dist/opencode-kimi-search.js | \
  install -D -m644 /dev/stdin ~/.config/opencode/plugins/opencode-kimi-search.js
```

That's it. Restart OpenCode and the plugin is ready.

### Option 2: npm plugin (recommended for sharing)

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kimi-search"]
}
```

OpenCode will automatically install it via Bun on next startup.

### Option 3: Local file reference (for development)

Build the bundle, then reference it directly in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-kimi-search/dist/opencode-kimi-search.js"]
}
```

## Configuration

### Automatic inheritance from OpenCode Kimi For Coding

The plugin **automatically reads** your existing Kimi For Coding provider configuration, so in most cases **no manual setup is required**.

It looks for configuration in the following locations (in order):

1. **OpenCode auth file**: `~/.local/share/opencode/auth.json`
2. **OpenCode config files**:
   - `~/.config/opencode/opencode.json` (or `.jsonc`)
   - `~/.opencode/opencode.json` (or `.jsonc`)
   - `./opencode.json` (or `.jsonc`) in the current project

It recognizes provider IDs: `kimi-for-coding`, `kimicoding`, or `kimi`.

If your OpenCode config looks like this:

```json
{
  "provider": {
    "kimi-for-coding": {
      "name": "Kimi For Coding",
      "npm": "@ai-sdk/anthropic",
      "options": {
        "baseURL": "https://api.kimi.com/coding/v1"
      }
    }
  }
}
```

The plugin will automatically:
- Use `options.apiKey` as the API key (or fallback to `auth.json`)
- Derive search URL as `https://api.kimi.com/coding/v1/search`
- Derive fetch URL as `https://api.kimi.com/coding/v1/fetch`

### Override with environment variables

You can override any auto-detected value via environment variables:

| Variable | Description | Priority |
|----------|-------------|----------|
| `KIMI_PLUGIN_API_KEY` | API key for Kimi search/fetch services. | **Highest** – overrides everything |
| `KIMI_SEARCH_BASE_URL` | Full base URL for the search endpoint. | **Highest** – overrides provider config |
| `KIMI_FETCH_BASE_URL` | Full base URL for the fetch endpoint. | **Highest** – overrides provider config |
| `KIMI_AGENT_USER_AGENT` | User-Agent string for outgoing requests. | `KimiCLI/OpenCodeKimiSearchPlugin` |
| `KIMI_SEARCH_TIMEOUT_SECONDS` | Timeout for search requests in seconds. | `30` |
| `KIMI_FETCH_ENABLED` | Set to `false` to disable fetch service and always use HTTP fallback. | `true` |

### Legacy fallback

If no OpenCode config is found, the plugin falls back to reading:
- `~/.kimi/kimi-claw/kimi-claw-config.json` (legacy bridge config)
- Hardcoded defaults: `https://api.kimi.com/coding/v1/search` and `https://api.kimi.com/coding/v1/fetch`

## Development

```bash
# Install dependencies
npm install

# Type-check and build
npm run build

# Bundle into single file for local plugin usage
npm run bundle

# Run tests
npm test
```

## File structure

```
opencode-kimi-search/
├── src/
│   ├── index.ts              # Plugin entry (OpenCode Plugin format)
│   ├── logic.ts              # Search/fetch core logic
│   ├── config.ts             # Config resolver (reads OpenCode settings)
│   └── *.test.ts             # Unit tests
├── dist/
│   ├── index.js              # Compiled entry (npm package)
│   ├── logic.js              # Compiled logic
│   ├── config.js             # Compiled config
│   └── opencode-kimi-search.js  # ⭐ Single-file bundle (for local plugin)
├── package.json
├── tsconfig.json
└── README.md
```

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.
