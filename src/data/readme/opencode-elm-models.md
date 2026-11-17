# OpenCode ELM models

An OpenCode V2 plugin that adds the University of Edinburgh ELM provider with Qwen 3.5 397B and Mistral 4 Small 119B. Both models support text and image input, tools, streamed reasoning, a 262,144-token context window, and up to 81,920 output tokens.

## Requirements

- OpenCode 2.3 or newer
- An ELM API key

Version 0.4.0 targets OpenCode V2. Keep using version 0.3.1 for OpenCode V1.

## Install

Install the published V2 release globally for your user account:

```sh
opencode plugin add opencode-elm-models
```

OpenCode downloads the package from npm and updates your global configuration automatically. Alternatively, add the package to `~/.config/opencode/opencode.jsonc`, or to your project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-elm-models"]
}
```

If you already have plugins configured, add the package to the existing `plugins` array. V2 uses `plugins` (plural); the V1 key was `plugin`.

## Add your ELM key

Run:

```sh
opencode auth login elm
```

Choose **ELM API key** and paste your key when prompted. OpenCode stores the credential in its credential store. You can also run `/connect` inside OpenCode and select **University of Edinburgh ELM**.

Alternatively, set the key in the environment of the OpenCode server:

```sh
export ELM_API_KEY="your-key"
opencode --standalone
```

For a background service, ensure its process receives `ELM_API_KEY`; exporting it only in a client shell does not update an already-running server. Do not commit API keys to a repository.

## Select a model

Run `/models` and choose **University of Edinburgh ELM / Qwen 3.5 397B** or **University of Edinburgh ELM / Mistral 4 Small 119B**.

The full model references are:

```text
elm/Qwen/Qwen3.5-397B-A17B-FP8
elm/mistralai/Mistral-Small-4-119B-2603
```

The plugin uses V2's native OpenAI-compatible runtime and `compatibility.reasoningField: "reasoning"`. It leaves reasoning effort at the endpoint's default and does not add effort variants.

## Overrides and additional models

Use V2's `providers` configuration to override defaults or add models. V1's `provider`, `npm`, `options`, and `interleaved` fields have changed in V2. For example:

```jsonc
{
  "plugins": ["opencode-elm-models"],
  "providers": {
    "elm": {
      "settings": {
        "baseURL": "https://elm.edina.ac.uk/api/v1"
      },
      "models": {
        "Qwen/Qwen3.5-397B-A17B-FP8": {
          "name": "My ELM Qwen"
        },
        "future/model": {
          "name": "Future model"
        }
      }
    }
  }
}
```

ELM is registered as its own provider; other providers keep their own endpoints.

## Development

```sh
npm install
npm run check
npm test
```

To test an unpublished checkout, build it and add its absolute directory to the `plugins` array in `opencode.jsonc`, then restart OpenCode. Configured local paths must be directories, not individual JavaScript files:

```jsonc
{
  "plugins": ["/absolute/path/to/elm-opencode-models"]
}
```

The migration follows the [OpenCode V1 plugin migration guide](https://opencode.ai/docs/build/plugins/migrate-v1).

## License

MIT
