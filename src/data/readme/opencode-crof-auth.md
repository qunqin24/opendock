# opencode-crof-auth

CrofAI provider plugin for OpenCode - auth, model discovery

## Features

- **API Key Authentication** - Login with your CrofAI API key
- **Auto Model Discovery** - Models fetched dynamically from CrofAI API

## Quick Setup

Run the setup script to install everything automatically:

```bash
bunx opencode-crof-auth
```

This will:
1. Install the plugin via `opencode plugin`
2. Add the crofai provider to your opencode.json

## Direct Login

You can also provide your API key directly:

```bash
bunx opencode-crof-auth nahcrof_your-api-key
```

Or specify a custom config path (any order):

```bash
bunx opencode-crof-auth /path/to/config.json nahcrof_your-api-key
```

## Manual Installation

If you prefer to do it step by step:

```bash
# 1. Install the plugin
opencode plugin opencode-crof-auth -g

# 2. Add the provider config to your opencode.json:
{
  "provider": {
    "crofai": {}
  }
}
```

## Usage

1. Run `opencode auth login` and search for "crofai" in the interactive prompt
2. Enter your API key (starts with `nahcrof_`)
3. Select a CrofAI model using `/models` or set `model: crofai/xxx` in your config

> **Note:** Direct command `opencode auth login crofai` may not work on some OpenCode versions. Use the interactive search instead.
## Credits

- [Nahcrof](https://github.com/nahcrof) - For creating [CrofAI](https://crof.ai)

## License

MIT
