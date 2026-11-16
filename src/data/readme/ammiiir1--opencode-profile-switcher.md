# OpenCode V2 Profile Switcher

Switch your entire OpenCode V2 workflow between model setups with a single `/profile` command.

If you use a custom workflow with multiple primary agents and subagents, changing each agent's model whenever your needs change gets tedious. Profile Switcher lets you define different model and reasoning-effort combinations in JSON profiles, then switch between them without repeatedly editing your workflow. It updates the active session, applies your agent settings, keeps the TUI and Desktop GUI in sync, and remembers the selected profile per repository.

## Install

Install from npm:

```sh
opencode plugin add @ammiiir1/opencode-profile-switcher
```

Or install directly from GitHub:

```sh
opencode plugin add github:ammiiir1/opencode-profile-switcher
```

After the **first installation**, restart the OpenCode service:

```sh
opencode service restart
```

Then close and reopen any running TUI and Desktop GUI clients so they load the plugin.

Use **one installation method**. If you previously installed a local copy in `~/.config/opencode/plugins/`, remove it before adding the npm or GitHub package to avoid duplicate `/profile` commands. Normal installation does not require a build step.

## Use

1. Open a repository in the OpenCode TUI or Desktop GUI.
2. Run `/profile` and select a profile.
3. The selected model is applied to the active root session, agent settings are refreshed, and the selection is saved in `.opencode/model-profile.json`.

You can switch profiles in existing sessions without losing conversation history. TUI and Desktop GUI stay in sync when connected to the same OpenCode server. The plugin handles the reload after a profile switch.

## Create a profile

Add a JSON file to `~/.config/opencode/profiles/`, for example `my-profile.json`.

Both built-in and custom agents use the same `agent` structure, whether they're primary agents or subagents:

```jsonc
{
  "model": "openai/gpt-6-astra",
  "agent": {
    "build": { // built-in primary agent
      "model": "anthropic/claude-fable-5-2",
      "reasoningEffort": "high"
    },
    "plan": { // built-in primary agent
      "model": "openai/gpt-6-astra",
      "reasoningEffort": "high"
    },
    "general": { // built-in subagent
      "model": "openrouter/z-ai/glm-5.3",
      "reasoningEffort": "medium"
    },
    "explore": { // built-in subagent
      "model": "openrouter/google/gemini-3.1-pro-preview",
      "reasoningEffort": "medium"
    },
    "orchestrator": { // custom primary agent
      "model": "openai/gpt-6-astra",
      "reasoningEffort": "high"
    },
    "coder": { // custom subagent
      "model": "openrouter/moonshotai/kimi-k3.1-pro",
      "reasoningEffort": "high"
    },
    "auditor": { // custom subagent
      "model": "anthropic/claude-opus-5-5",
      "reasoningEffort": "high"
    },
    "vision-analyst": { // custom subagent
      "model": "openrouter/deepseek/deepseek-v4-pro",
      "reasoningEffort": "high"
    }
  }
}
```

- `model` sets the default model; `agent` assigns models and optional reasoning effort to individual agents.
- The model IDs are illustrative. Use models available through your connected providers. Custom agents must already be defined in OpenCode.
- The `//` comments label agent types for this README only. Remove them before saving the file as `.json`.

**After adding or editing a profile file**, run:

```sh
opencode reload
```

This refreshes the available profiles without reinstalling the plugin. If you use `XDG_CONFIG_HOME`, place profiles in `$XDG_CONFIG_HOME/opencode/profiles/` instead.

The package also includes [example profiles](examples/profiles/) you can copy and adapt. When your profiles directory has no JSON files, `/profile` shows these examples as templates. Some examples reference custom agents, so adjust them to match your setup before selecting one.

## Demo

**Terminal UI**

<p align="center">
  <img src="https://raw.githubusercontent.com/ammiiir1/opencode-profile-switcher/main/assets/opencode-profile-switcher-demo-navigation-tui.gif" alt="Switching profiles in the OpenCode TUI" width="760">
</p>

**Desktop GUI**

<p align="center">
  <img src="https://raw.githubusercontent.com/ammiiir1/opencode-profile-switcher/main/assets/opencode-profile-switcher-demo-navigation-gui.gif" alt="Switching profiles in the OpenCode Desktop GUI" width="760">
</p>

## Good to know

- Profiles are selected per repository. Your JSON profiles are stored globally and are not deleted when you uninstall the plugin.
- `reasoningEffort` is best-effort. Available variants depend on the model and provider, and a manually selected Desktop reasoning effort may remain unchanged.
- The Desktop GUI plugin interface is experimental and may change with OpenCode updates.

## Update or remove

```sh
opencode plugin update @ammiiir1/opencode-profile-switcher
opencode plugin remove @ammiiir1/opencode-profile-switcher
```

Your profile files and per-repository selections are preserved.

## Compatibility and feedback

Built for **OpenCode V2** with a plugin SDK compatible with `@opencode/plugin` 2.3.x.

**macOS is tested and working.** Linux and Windows compatibility improvements are included, but neither platform has been tested on a real installation yet.

If you try it on Windows or Linux, feedback is welcome. Please [open an issue](https://github.com/ammiiir1/opencode-profile-switcher/issues) with your OS, OpenCode version, and what happened. Fixes and [pull requests](https://github.com/ammiiir1/opencode-profile-switcher/pulls) are welcome too.

Licensed under [MIT](LICENSE).
