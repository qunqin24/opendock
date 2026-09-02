# OpenCode ELM models

An OpenCode V1 plugin that adds the University of Edinburgh ELM model provider and its supported models. It currently includes the production Qwen 3.5 397B model with its 262,144-token context window.

## Requirements

- OpenCode V1 with npm plugin support
- An ELM API key

## Install

Install the plugin globally for your user account:

```sh
opencode plugin opencode-elm-models --global
```

OpenCode downloads the package from npm and updates your global configuration automatically. No GitHub checkout or manual configuration edit is required.

To install it only for the current project, omit `--global`:

```sh
opencode plugin opencode-elm-models
```

As a manual fallback, add the package to your global `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-elm-models"]
}
```

If you already have plugins configured, add `"opencode-elm-models"` to the existing `plugin` array. OpenCode installs npm plugins automatically when it starts.

## Add your ELM key

Run:

```sh
opencode providers login --provider elm --method "ELM API key"
```

Paste your key when prompted. OpenCode stores the credential in its auth store; it is not written into `opencode.jsonc`.

You can also run `opencode providers login` and select `elm (plugin)` and `ELM API key` interactively. `opencode auth login` remains available as an alias.

Alternatively, set the key in the environment that launches OpenCode:

```sh
export ELM_API_KEY="your-key"
opencode
```

Do not commit an API key to a repository.

## Select the model

Run `/models` in OpenCode and select:

```text
University of Edinburgh ELM / Qwen 3.5 397B
```

The full model reference for configuration and command-line use is:

```text
elm/Qwen/Qwen3.5-397B-A17B-FP8
```

## Overrides and additional models

The plugin supplies defaults without replacing user configuration. An `elm` provider entry in `opencode.jsonc` can override the endpoint or model metadata, and additional models can be added under `provider.elm.models`.

## Development

```sh
npm install
npm test
```

To test an unpublished checkout, add its absolute directory to the `plugin` array in `opencode.jsonc`, then restart OpenCode.

## License

MIT
