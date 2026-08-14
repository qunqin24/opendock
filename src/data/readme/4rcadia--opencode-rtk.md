# opencode-rtk

[`rtk`](https://github.com/rtk-ai/rtk) (Rust Token Killer) proxies and filters shell commands to condense their output (less LLM token consumption). E.g., `rtk git diff` returns the same information with less formatting and noise. This [OpenCode](https://github.com/anomalyco/opencode) plugin automatically proxies supported shell commands through `rtk` without any extra prompting or instructions for the LLM.

## Installation

1. Install [`rtk`](https://github.com/rtk-ai/rtk)
2. Add the following (or similar) to your OpenCode config file:

   ```jsonc
   // opencode.json
   
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": [
       "@4rcadia/opencode-rtk@latest"
     ]
   }
   ```

## How It Works

The plugin intercepts OpenCode `bash` tool calls and rewrites supported shell commands so they run through `rtk` first. Unlike a regular `rtk` installation, using this plugin requires no extra prompting or instructions to the LLM.

The plugin is syntax-aware. It analyzes commands with `unbash` and `tree-sitter`. Complex, piped, nested commands can be handled gracefully.

Supported shells:

- `bash`
- `zsh`
- `powershell`

## Caveat

The model is not aware that commands are being proxied. There is a risk that the model may be confused if `rtk` fails and returns an error. However, it is observed that most mid to large models can self-correct by retrying with the command's absolute path (e.g., `/usr/bin/ls` instead of `ls`).

Use with discretion.

A standalone `no_rtk_bash` tool was once considered but not eventually implemented, as extra tool registration would take up more context window and might be excessive just to handle `rtk`'s occasional failures.'
