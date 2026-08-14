# opencode-varlock

[![npm version](https://img.shields.io/npm/v/opencode-varlock)](https://www.npmjs.com/package/opencode-varlock)
[![CI](https://github.com/itlackey/opencode-varlock/actions/workflows/test.yml/badge.svg)](https://github.com/itlackey/opencode-varlock/actions/workflows/test.yml)

OpenCode plugin that gives agents access to secrets without revealing the values. The plugin leverages [varlock](https://varlock.dev) and [opencode](https://opencode.ai) features to provide a multi-layered defense against intentional and accidental secret leakage by OpenCode agents.

> [!Important]
> This plugin is still early in development, and there is active work underway to improve its security model and edge-case protections. PRs, issue reports, and security feedback are very welcome.

## What it does

- provides `load_env` so agents can use `.env` values without seeing them directly
- provides `load_secrets` and `secret_status` when the [Varlock CLI](https://varlock.dev) is available
- uses `varlock load --format json` and `varlock printenv` to integrate with the varlock.dev CLI
- blocks direct secret reads with a `tool.execute.before` guard covering:
  - 50+ bash deny patterns and 9 interpreter-based env read detectors
  - 30+ file processor commands (`sed`, `awk`, `dd`, `tee`, `xxd`, etc.)
  - shell redirects, encoding/eval bypasses, and variable listing commands
  - varlock CLI self-exfiltration (`varlock printenv`, `varlock load --format env`)
- scrubs loaded secret values from tool output via a `tool.execute.after` hook
- whitelists `.env.schema` and `.env.example` (safe for AI consumption per varlock.dev design)
- validates config files and prevents agents from tampering with plugin configuration
- prevents symlink traversal and command injection in tool arguments

## Install

Add the package to your `opencode.json` file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-varlock@latest"]
}
```

## Configuration

### Permissions

In addition to adding the plugin to the array, we recommend adding some additional permission settings to your config. There are a few recommended "presets" in the [assets/permissions.json](assets/permissions.json) file, but here is a basic example:

```json
{
  "permission": {
    "bash": {
      "cat *.env*": "deny",
      "less *.env*": "deny",
      "more *.env*": "deny",
      "head *.env*": "deny",
      "tail *.env*": "deny",
      "grep * .env*": "deny",
      "echo $*": "deny",
      "python*getenv*": "deny",
      "python*os.environ*": "deny",
      "python*open*env*": "deny",
      "node*process.env*": "deny",
      "printenv*": "deny",
      "env": "deny",
      "export -p": "deny",
      "source .env*": "deny",
      "varlock printenv*": "deny",
      "varlock load --show*": "deny",
      "varlock load --format*": "deny",
      "varlock load -f*": "deny",
      "sed * .env*": "deny",
      "awk * .env*": "deny"
    }
  }
}
```

### Plugin Config

`varlock.config.json` is optional.

If you do not provide one, the plugin uses its built-in defaults from [assets/varlock.config.json](assets/varlock.config.json). Create a local config and place it in your `.opencode` or `~/.config/opencode` directory when you want to override those defaults.

Quick example:

```json
{
  "$schema": "https://raw.githubusercontent.com/itlackey/opencode-varlock/main/assets/varlock.schema.json",
  "varlock": {
    "enabled": true,
    "namespace": "myapp"
  }
}
```

## Docs

- setup and overrides: `docs/configuration.md`
- security model and limitations: `docs/security.md`
- tests and validation: `docs/testing.md`
- exported APIs and tools: `docs/api.md`
- Docker + pass guide: `docs/docker-pass-guide.md`

## Useful files

- default config: `assets/varlock.config.json`
- JSON schema: `assets/varlock.schema.json`
- recommended permission configurations: `assets/permissions.json`

## License

MPL-2.0
