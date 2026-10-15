# OpenCode Sidebar Context

[![Version](https://img.shields.io/npm/v/@tomdewildt/opencode-sidebar-context?label=version)](https://www.npmjs.com/package/@tomdewildt/opencode-sidebar-context)
[![Build](https://img.shields.io/github/actions/workflow/status/tomdewildt/opencode-sidebar-context/ci.yml?branch=master)](https://github.com/tomdewildt/opencode-sidebar-context/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/tomdewildt/opencode-sidebar-context/cd.yml?label=release)](https://github.com/tomdewildt/opencode-sidebar-context/actions/workflows/cd.yml)
[![License](https://img.shields.io/github/license/tomdewildt/opencode-sidebar-context)](https://github.com/tomdewildt/opencode-sidebar-context/blob/master/LICENSE)

Plugin for [OpenCode](https://opencode.ai/) that shows the context usage, cache hit rate and cost of the current session in the sidebar.

# How To Run

Prerequisites:

- mise version `2025.1.0` or later
- bun version `1.4.0` or later
- opencode version `2.0.0` or later

### Development

1. Run `mise run init` to initialize the environment.
2. Run `mise run test` to run the tests.
3. Run `mise run build` to bundle the plugin into `dist/`.

# How To Use

Add the plugin to `~/.config/opencode/cli.json` and disable the built-in context section:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@tomdewildt/opencode-sidebar-context", "-opencode.sidebar.context"]
}
```

# References

[Bun Docs](https://bun.sh/docs)

[OpenCode Docs](https://opencode.ai/docs/)

[OpenCode Plugins Docs](https://opencode.ai/docs/plugins/)

[OpenTUI Docs](https://github.com/sst/opentui)

[Oxc Docs](https://oxc.rs/docs/guide/introduction.html)

[SolidJS Docs](https://docs.solidjs.com/)
