# opencode-amanai-provider

[![npm version](https://img.shields.io/npm/v/opencode-amanai-provider.svg)](https://www.npmjs.com/package/opencode-amanai-provider)
[![license](https://img.shields.io/npm/l/opencode-amanai-provider.svg)](https://github.com/NotYusta/opencode-amanai-provider/blob/main/LICENSE)

An [OpenCode](https://opencode.ai) plugin that registers the **Amanai**
provider — an OpenAI-compatible API at <https://api.amanai.dev/v1> — and
discovers the models it serves (currently ~47: GLM, Qwen, Kimi, DeepSeek,
MiniMax, Grok, GPT, Claude, and more).

## Install

Publish the package once (see [Publishing](#publishing)), then install it on
any machine:

```sh
# From npm
opencode plugin add opencode-amanai-provider

# Or straight from a Git repository
opencode plugin add github:YOUR_GITHUB_USER/opencode-amanai-provider
```

Restart or reload OpenCode, then select a model with `/models`, for example
`amanai/glm-5.3`.

For a local checkout instead of a published package, add the directory to
`plugins` in your global `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-amanai-provider"]
}
```

## Authentication

The plugin reads your API key from the `AMANAI_API_KEY` environment variable:

```sh
# PowerShell
$env:AMANAI_API_KEY = "your-key"
opencode service restart
```

```sh
# bash / zsh
export AMANAI_API_KEY="your-key"
opencode service restart
```

You can also run `/connect`, choose **Amanai**, and paste the key. The plugin
registers both an environment method and an interactive key method.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `AMANAI_API_KEY` | – | API key. |
| `AMANAI_BASE_URL` | `https://api.amanai.dev/v1` | Override the endpoint. |

## How it works

On setup the plugin fetches `GET /models` and registers every returned model
with its context window, output limit, and input modalities. A baked-in
inventory is used when discovery is unavailable, and the inventory is refreshed
every six hours.

Amanai advertises the reasoning levels it accepts in each model's `thinking`
list. The plugin exposes every level except the default (`auto`) as a model
variant backed by `settings.reasoningEffort`, so you can pick one with the
`#variant` selector:

```sh
opencode run --model amanai/glm-5.3#high "Review this migration plan"
```

Run `/models` to see the available efforts for a model. Levels differ per model
(`low`/`medium`/`high`/`xhigh`/`max`, and `none`/`minimal` where supported).

## Publishing

```sh
npm login
npm publish --access public
```

The package name `opencode-amanai-provider` is free on the public registry; use
a scope such as `@yourname/opencode-amanai-provider` if you prefer.
