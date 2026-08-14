# opencode-ask-human

An [OpenCode](https://opencode.ai) plugin that teaches agents to ask before they guess.

## Features

- Rewrites the built-in `question` tool description
- Encourages concise questions for product intent, private APIs, environments, business rules, and acceptance criteria
- Keeps custom answers enabled
- Does not add UI, intercept messages, or force questions

## Requirements

- OpenCode `>=1.17.7`

## Install

Copy and paste:

```bash
opencode plugin --global opencode-ask-human
```

This installs the plugin globally so it works across projects.

For project-only install, omit `--global`:

```bash
opencode plugin opencode-ask-human
```

## Usage

1. Install the plugin globally.
2. Restart OpenCode.
3. Continue working normally.

When an agent needs context that only you probably know, the `question` tool description now nudges it to ask one small question instead of guessing.

## Config

Prefer editing config yourself? Add this to `opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-ask-human"
  ]
}
```
