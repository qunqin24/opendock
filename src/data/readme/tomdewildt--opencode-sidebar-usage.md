# OpenCode Sidebar Usage

[![Version](https://img.shields.io/npm/v/@tomdewildt/opencode-sidebar-usage?label=version)](https://www.npmjs.com/package/@tomdewildt/opencode-sidebar-usage)
[![Build](https://img.shields.io/github/actions/workflow/status/tomdewildt/opencode-sidebar-usage/ci.yml?branch=master)](https://github.com/tomdewildt/opencode-sidebar-usage/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/tomdewildt/opencode-sidebar-usage/cd.yml?label=release)](https://github.com/tomdewildt/opencode-sidebar-usage/actions/workflows/cd.yml)
[![License](https://img.shields.io/github/license/tomdewildt/opencode-sidebar-usage)](https://github.com/tomdewildt/opencode-sidebar-usage/blob/master/LICENSE)

Plugin for [OpenCode](https://opencode.ai/) that shows the 5 hour, weekly and monthly usage limits of your [Claude](https://claude.ai/), [ChatGPT](https://chatgpt.com/) and [GitHub Copilot](https://github.com/features/copilot) subscriptions in the sidebar.

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

Add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@tomdewildt/opencode-sidebar-usage"]
}
```

# References

[Bun Docs](https://bun.sh/docs)

[OpenCode Docs](https://opencode.ai/docs/)

[OpenCode Plugins Docs](https://opencode.ai/docs/plugins/)

[OpenTUI Docs](https://github.com/sst/opentui)

[Oxc Docs](https://oxc.rs/docs/guide/introduction.html)

[SolidJS Docs](https://docs.solidjs.com/)
