# opencode-gemini-cli-provider

Use Gemini CLI as an OpenCode provider without a Gemini API key.

The plugin registers `gemini-local/*` models and calls your local `gemini` command directly. There is no local HTTP server and no provider block to copy into `opencode.json`.

## Quick Start

```bash
# 1. Install Gemini CLI
brew install gemini-cli

# 2. Make sure Gemini CLI works first
gemini -p "Say hi" -m gemini-3.1-flash-lite-preview

# 3. Optional: configure a proxy if your Gemini CLI needs one
mkdir -p ~/.config/opencode
printf '{"proxy":"http://127.0.0.1:10808"}\n' > ~/.config/opencode/gemini-proxy.json

# 4. Install the plugin globally
opencode plugin -g opencode-gemini-cli-provider

# 5. Verify models are available
opencode models | grep gemini-local

# 6. Test
opencode run "Say hello" --model gemini-local/gemini-3.1-flash-lite-preview
```

## Models

The plugin currently exposes:

```text
gemini-local/gemini-3-flash-preview
gemini-local/gemini-3.1-flash-lite-preview
gemini-local/gemini-3.1-pro-preview
```

## Proxy Configuration

Proxy is often required in regions where Gemini is not directly reachable. The plugin checks proxy settings in this order:

1. `https_proxy` or `HTTPS_PROXY` from the environment that starts `opencode`
2. `~/.config/opencode/gemini-proxy.json`
3. no proxy

### Option A: Environment Variable

Use this when you only want the proxy for the current shell:

```bash
export https_proxy=http://127.0.0.1:10808
export http_proxy=http://127.0.0.1:10808
opencode run "Say hello" --model gemini-local/gemini-3.1-flash-lite-preview
```

### Option B: Config File

Use this when you want OpenCode to remember the proxy:

```bash
mkdir -p ~/.config/opencode
printf '{"proxy":"http://127.0.0.1:10808"}\n' > ~/.config/opencode/gemini-proxy.json
```

Change `http://127.0.0.1:10808` to your own proxy address.

If you do not need a proxy, do not create this file.

## OpenCode Configuration

Only the plugin needs to be configured. Do not manually add a `provider.gemini-local` block.

Example `opencode.json`:

```json
{
  "plugin": [
    "opencode-gemini-cli-provider"
  ]
}
```

You can set Gemini as your default model if desired:

```json
{
  "model": "gemini-local/gemini-3.1-flash-lite-preview"
}
```

## Troubleshooting

Check Gemini CLI first:

```bash
gemini -p "Say hi" -m gemini-3.1-flash-lite-preview
```

Check plugin registration:

```bash
opencode models | grep gemini-local
opencode debug config | grep -A 8 gemini-local
```

If responses hang, confirm the proxy is available and Gemini CLI can use it:

```bash
export https_proxy=http://127.0.0.1:10808
gemini -p "Say hi" -m gemini-3.1-flash-lite-preview -o json
```

Gemini CLI can be slow to start. A first response around 10-20 seconds is normal.

## Development

```bash
npm install
opencode plugin add $(pwd)
opencode run "Say hello" --model gemini-local/gemini-3.1-flash-lite-preview
```

## License

MIT
