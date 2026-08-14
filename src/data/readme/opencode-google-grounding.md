# opencode-google-grounding

OpenCode plugin that adds a `google_grounding` tool backed by Gemini Google Search grounding.

Any OpenCode model can call it. The active model can be GPT, Claude, Kimi, Grok, DeepSeek, or Gemini; the tool makes a separate grounded Gemini or Vertex request.

## Install

Add it to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-google-grounding"]
}
```

OpenCode installs npm plugins automatically at startup. You do not need to use Bun directly.

## Auth

Google AI Studio / Gemini API:

```sh
export GOOGLE_API_KEY="..."
```

Custom proxy:

```sh
export OPENCODE_GOOGLE_BASE_URL="https://example.com/google/v1beta"
export GOOGLE_API_KEY="..."
```

Native Vertex AI:

```sh
export OPENCODE_GOOGLE_BACKEND="vertex"
export GOOGLE_CLOUD_PROJECT="my-gcp-project"
export GOOGLE_CLOUD_LOCATION="global"
gcloud auth login
```

## Use

Ask OpenCode:

```text
Use google_grounding to get the live Bitcoin price in USD and include sources.
```

The model sees the tool as:

```text
google_grounding
```

## Defaults

- Tool name: `google_grounding`
- Provider config checked by default: `provider.opencode-google`
- Model: `gemini-3-flash-preview`
- Gemini API URL: `https://generativelanguage.googleapis.com/v1beta`

API key lookup:

1. plugin option `apiKey`
2. env var named by `apiKeyEnv`
3. `OPENCODE_GOOGLE_API_KEY`
4. `GOOGLE_API_KEY`
5. `GEMINI_API_KEY`
6. `provider.opencode-google.options.apiKey`

## Test

```sh
npm install
npm test
npm run coverage
```

OpenCode tool check:

```sh
opencode debug agent build | jq '.tools.google_grounding'
```

<details>
<summary>Plugin options</summary>

You only need this tuple form when overriding defaults. The first item is the package name; the second item is the options object passed to the plugin.

```json
{
  "plugin": [
    [
      "opencode-google-grounding",
      {
        "backend": "gemini",
        "provider": "opencode-google",
        "model": "gemini-3-flash-preview",
        "baseURL": "https://example.com/google/v1beta",
        "apiKeyEnv": "OPENCODE_GOOGLE_API_KEY",
        "timeoutMs": 90000,
        "maxOutputTokens": 4096
      }
    ]
  ]
}
```

</details>

<details>
<summary>Provider/proxy config</summary>

If you already have a Google-compatible provider in OpenCode, the plugin can reuse it:

```json
{
  "plugin": ["opencode-google-grounding"],
  "provider": {
    "opencode-google": {
      "options": {
        "baseURL": "https://example.com/google/v1beta",
        "apiKey": "..."
      }
    }
  }
}
```

When `baseURL` is explicit, the plugin still falls back to `GOOGLE_API_KEY` if no plugin/proxy key is set.

</details>

<details>
<summary>Native Vertex details</summary>

Native Vertex mode uses OAuth/Bearer auth instead of an API key.

```json
{
  "plugin": [
    [
      "opencode-google-grounding",
      {
        "backend": "vertex",
        "project": "my-gcp-project",
        "location": "global",
        "model": "gemini-3-flash-preview"
      }
    ]
  ]
}
```

Access token lookup:

1. plugin option `accessToken`
2. `GOOGLE_OAUTH_ACCESS_TOKEN`
3. `VERTEX_ACCESS_TOKEN`
4. `gcloud auth print-access-token`

</details>

<details>
<summary>Install from source</summary>

```sh
git clone https://github.com/janaki-sasidhar/opencode-google-grounding.git
cd opencode-google-grounding
npm install
```

```json
{
  "plugin": ["/absolute/path/to/opencode-google-grounding"]
}
```

</details>

## Notes

This is an OpenCode tool, not native provider grounding inside every model call. The model chooses when to call `google_grounding`.

## License

MIT
