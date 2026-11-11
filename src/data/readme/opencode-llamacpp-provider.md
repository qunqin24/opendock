# llama.cpp provider for OpenCode

An OpenCode plugin that discovers models from a llama.cpp server.

### Usage

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-llamacpp-provider@0.1.0"],
}
```

### Provider settings

The default endpoint is `http://127.0.0.1:9931/v1`. Provider settings are optional.

To use another endpoint or an optional API key, set provider settings:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-llamacpp-provider@0.1.0"],
  "providers": {
    "llamacpp": {
      "settings": {
        "baseURL": "http://127.0.0.1:9931/v1",
        "apiKey": "{env:LLAMA_API_KEY}",
      },
    },
  },
}
```

### Requirements

- OpenCode v2.
- A llama.cpp server that exposes `/health` and `/v1/models`.

### License

MIT. This project is not affiliated with, endorsed by or sponsored by the OpenCode team or llama.cpp.
