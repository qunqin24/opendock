<p align="center">
  <picture>
    <source srcset="assets/logo-dark.svg" media="(prefers-color-scheme: dark)">
    <source srcset="assets/logo-light.svg" media="(prefers-color-scheme: light)">
    <img src="assets/logo-light.svg" alt="agents logo">
  </picture>
</p>
<p align="center">Manage your AI models from a single JSON file.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/opencode-models-manager"><img alt="npm" src="https://img.shields.io/npm/v/opencode-models-manager?style=flat-square" /></a>
  <a href="https://github.com/RainingDaemons/opencode-models-manager/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
</p>

---

## Why?

This repo was created to provide a simple solution for managing AI models for every chat mode from a single point. The AI industry changes rapidly, so having one place to update models makes it easy to keep every agent current without editing each configuration separately.

## Installation

If you have OpenCode 1.18.0 or later, install the plugin with:

```
opencode plugin add opencode-models-manager@opencode-v1
```

If you want the plugin for OpenCode v2, install it with:

```
opencode plugin add opencode-models-manager@latest
```

Restart OpenCode after installation.

## Manual installation

Add to `~/.config/opencode/opencode.json` (global) or `opencode.json` (project).

For OpenCode 1.18.0 or later:

```json
{
  "plugin": ["opencode-models-manager@opencode-v1"]
}
```

For OpenCode v2:

```json
{
  "plugins": ["opencode-models-manager@latest"]
}
```

## Local installation

Copy `models.ts` into your project plugin directory:

```
.opencode/plugins/models.ts
```

OpenCode loads `.opencode/plugins/` automatically at startup, so no config entry is needed.

## Usage

Create `.opencode/models.json` in the project root:

```json
{
  "agent": {
    "chat": "opencode-go/deepseek-v4.1-flash",
    "chat2": "opencode-go/mimo-v2.6-flash"
  },
  "commands": {
    "document": "opencode-go/deepseek-v4.1-flash",
    "document2": "opencode-go/mimo-v2.6-flash"
  }
}
```

The `agent` section targets agents in `.opencode/agent` and the `commands` section targets commands in `.opencode/commands`. The plugin merges the model into each existing configuration, so prompts, permissions, frontmatter, and other settings are preserved. A flat map such as `{ "chat": "provider/model" }` is still supported and applies to agents.

Invalid entries are logged and skipped. Restart OpenCode after changing `models.json` so the config hook runs again.

## OpenCode v2

OpenCode v2 requires a default plugin definition object. The v2 implementation is published on the `latest` dist-tag (currently the `0.2.x` line).

Use the v2 configuration key (`plugins`, plural):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-models-manager@latest"]
}
```

Agent models in `.opencode/models.json` are applied through the agent transform API. Command models are applied by registering command overrides through the v2 add-only command API; the runtime must expose both `ctx.command.transform` and `ctx.session.prompt`.
