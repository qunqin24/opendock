# opencode-direnv

[OpenCode](https://opencode.ai) plugin that loads [direnv](https://direnv.net) environments into shell commands.

## What it does

- Injects `direnv export` vars into every shell command via the `shell.env` hook
- Provides a `direnv_allow` tool that prompts for user approval before allowing `.envrc` files
- Blocks direct `direnv allow` in bash to enforce the approval flow
- Loads direnv env into `process.env` at startup for LSP servers

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-direnv"]
}
```

Requires `direnv` to be installed on the host.

## License

MIT
