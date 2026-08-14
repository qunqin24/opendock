<h1 align="center">OpenCode Agent Variants</h1>

<p align="center">
  <strong>Model-specific OpenCode subagents without copy-pasting agent prompts.</strong><br>
  Let the main model call <code>general-light</code>, <code>explore-fast</code>, or any other generated variant through the normal <code>task</code> tool.
</p>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

<p align="center">
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-agent-variants"><img src="https://img.shields.io/npm/v/%40mirrowel%2Fopencode-agent-variants/latest?label=latest&style=flat-square&color=blue" alt="npm latest version"></a>
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-agent-variants"><img src="https://img.shields.io/npm/v/%40mirrowel%2Fopencode-agent-variants/dev?label=dev&style=flat-square&color=orange" alt="npm dev version"></a>
  <a href="https://www.npmjs.com/package/@mirrowel/opencode-agent-variants"><img src="https://img.shields.io/npm/dm/%40mirrowel%2Fopencode-agent-variants?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/Mirrowel/opencode-agent-variants/releases"><img src="https://img.shields.io/github/v/release/Mirrowel/opencode-agent-variants?style=flat-square&color=purple" alt="GitHub release"></a>
  <a href="https://github.com/Mirrowel/opencode-agent-variants/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Mirrowel/opencode-agent-variants/ci.yml?branch=main&style=flat-square&label=ci" alt="CI status"></a>
  <a href="https://github.com/Mirrowel/opencode-agent-variants/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-agent-variants">Why Agent Variants?</a> ·
  <a href="#common-patterns">Patterns</a> ·
  <a href="#wizard">Wizard</a> ·
  <a href="#config-file">Config</a> ·
  <a href="#built-in-agents">Built-In Agents</a> ·
  <a href="#debug-mode">Debugging</a> ·
  <a href="#backups">Backups</a>
</p>

---

OpenCode Agent Variants creates model-specific versions of your agents without copying prompts by hand.

Use it when you want the main model to choose between agents like:

- `general` for the default or strongest model
- `general-light` for a cheaper/faster model
- `explore` for normal codebase exploration
- `explore-light` for routine exploration on a smaller model

The plugin adds generated variants to OpenCode's normal `task` tool list and provides one TUI wizard for editing the variant config.

## Why Agent Variants?

OpenCode already has strong built-in agents, but model selection is usually attached to the current session or a hand-written agent config. That creates an awkward choice:

- Run every subagent on the expensive main model.
- Copy built-in prompts into custom agents and watch them drift from upstream.
- Tell the model when to use cheaper agents in prose and hope it follows the rule.

Agent Variants keeps the normal OpenCode flow: the assistant still calls `task` once, but the task list can contain purpose-built aliases such as `general-light` or `explore-glm`. Built-in variants route back to the native parent agent, so OpenCode keeps owning the prompt, permissions, tools, and mode.

## What It Looks Like

After configuration, the main model sees ordinary task agents with distinct names and descriptions:

```txt
general         Strong default reasoning agent.
general-light   Variant agent general-light. Runs general using GLM 5.1. Use this exact alias for routine low-cost work.
explore         Codebase exploration agent.
explore-heavy   Variant agent explore-heavy. Runs explore using GPT-5.5. Use this exact alias for deep verification or a second opinion.
```

When the model calls `task` with `general-light`, the plugin routes execution through the native `general` agent and applies the configured model override to the child session.

## Features

- Generate variants from existing agents with model, temperature, prompt, description, options, and color overrides.
- Keep OpenCode's built-in agent prompts and permissions up to date by routing built-in variants to their native parent agent.
- Create real copied variants for agents defined in config or markdown.
- Manage variants from a single TUI command: `Agent Variants: Configure`.
- Store all plugin settings in a sidecar file instead of editing `opencode.json` for every variant.
- Avoid agent-tool pollution: the plugin does not register management tools for the assistant.

## Install

Install it with OpenCode's plugin installer:

```sh
opencode plugin @mirrowel/opencode-agent-variants@latest --global
```

The installer detects both plugin targets and updates the right config files:

- server target in `opencode.json` or `opencode.jsonc`
- TUI target in `tui.json` or `tui.jsonc`

Restart OpenCode after installation.

## Quick Start

1. Install the plugin globally:

```sh
opencode plugin @mirrowel/opencode-agent-variants@latest --global
```

2. Restart OpenCode.

3. Open the wizard:

```txt
Agent Variants: Configure
```

4. Create a variant from a subagent-capable parent, for example `general -> general-light` or `explore -> explore-light`.

5. Restart OpenCode again so the generated agent list is assembled at startup.

After that, the main model can call the generated variant through the normal `task` tool. No agent-facing management tools are added.

> **Tip:** Use the wizard's `Run diagnostics` action after editing. It checks model and model-variant availability against OpenCode's merged provider catalog, plus model presets, alias conflicts, parent task-callability, disabled entries, inheritance/propagation typos, backup journal health, and plugin installation state.

## Manual Install

If you prefer to configure it manually, add the package to your OpenCode config:

```jsonc
{
  "plugin": ["@mirrowel/opencode-agent-variants@latest"]
}
```

And add the same package to your TUI config:

```jsonc
{
  "plugin": ["@mirrowel/opencode-agent-variants@latest"]
}
```

Use `@mirrowel/opencode-agent-variants@dev` if you intentionally want the current prerelease channel. For local development, use a file URL or local path instead of the npm package name.

## Wizard

Open the wizard from the command palette:

```txt
Agent Variants: Configure
```

If your TUI build exposes plugin slash commands, you can also run:

```txt
/agent-variants
```

The wizard supports:

- adding variants
- editing parent overrides
- editing variant overrides
- enabling or disabling parents and variants
- deleting variants
- running diagnostics
- opening `Debug & advanced` to toggle debug mode, view/clear logs, manage config backups, and change wizard-only filters
- previewing the generated config
- saving meaningful config changes with a single backup journal

Agent/variant list changes take effect after restarting OpenCode because agents and plugins are assembled at startup. Debug mode is hot-read and takes effect immediately after the wizard saves it.

The wizard defaults to showing only subagent-capable parent agents when adding or editing parent entries. Agent Variants are meant for agents callable through OpenCode's `task` tool. You can temporarily show all agents from `Debug & advanced` if you need to inspect or repair existing config.

## Common Patterns

| Pattern | Example | Why use it |
| --- | --- | --- |
| Basic retrieval work | `explore-basic` | Delegate file finding, symbol lookup, extraction, and bounded data gathering to Luna/nano-class models. |
| Balanced general work | `general-light` | Delegate routine edits or analysis to Terra/mini-class models that still provide moderate judgment. |
| Balanced code search | `explore-light` | Keep broader codebase reading off the strongest model without dropping to the basic retrieval tier. |
| Specialist model | `explore-gemini`, `general-glm` | Route specific task types to models that are strong or inexpensive for that shape of work. |
| Clear task-list wording | `description_append` | Teach the main model when to pick each variant without adding extra tools or prompts. |
| Shared model aliases | `models.light` | Change the underlying model once and reuse it across multiple variants. |

## Compatibility Notes

| Agent source | Behavior |
| --- | --- |
| Built-in agents like `general` and `explore` | Virtual aliases route to the native parent, preserving upstream prompts and permissions. |
| Agents from `opencode.json` or `opencode.jsonc` | Variants are generated as copied config agents with overrides applied. |
| Markdown agents | Variants are generated from the configured markdown-backed agent definition. |
| Primary-only agents | Diagnostics warn because they are not callable through the `task` tool. |

Agent Variants is designed for subagents. It does not try to override OpenCode's main-session model picker.

## Backups

The wizard keeps config history in one journal file instead of creating many timestamped `.bak` files:

```txt
~/.config/opencode/agent-variants.backup.json
```

Meaningful config saves create reverse-patch restore points, capped to the latest 50 entries. Debug and UI-size changes do not create backups, and no-op saves are skipped entirely.

From `Debug & advanced` -> `Config backups`, you can:

- create a full backup of the current config
- preview patch restore points or full backups
- restore a valid restore point after hash-chain validation
- optionally create a full backup before restoring
- delete full backups individually with double `ctrl+d` or all at once

Full backups are not auto-pruned. Patch restore points are auto-pruned to the configured limit.

## Config File

The plugin writes a sidecar config file at:

```txt
~/.config/opencode/agent-variants.jsonc
```

This file is separate from `opencode.json`. Your normal OpenCode config remains the source of truth for providers, base agents, permissions, and any explicit model overrides you already have.

See `docs/CONFIG.md` for the complete config reference and `agent-variants.example.jsonc` for a fully commented starter file.

## Example

```jsonc
{
  "debug": false,
  "routing": {
    "prompt_markers": false
  },
  "models": {
    "light": {
      "model": "zai-coding-plan/glm-5.1",
      "label": "GLM 5.1",
      "variant": "low",
      "temperature": 0.2
    }
  },
  "agents": {
    "general": {
      "parent": {
        "description_append": "Uses the default smartest model. Expensive; use for hard tasks."
      },
      "variants": {
        "light": {
          "model": "light",
          "description_append": "Use for most tasks that do not need the best model."
        }
      }
    },
    "explore": {
      "parent": {
        "description_append": "Uses the default smartest model. Use for difficult investigations."
      },
      "variants": {
        "light": {
          "model": "light",
          "description_append": "Use for most code search, reading, and exploration tasks."
        }
      }
    }
  }
}
```

Variant names default to `${parent}-${variantKey}`. In the example above, `general` plus variant key `light` becomes `general-light`.

Description and prompt fields support template variables such as `{parent}`, `{alias}`, `{variant_key}`, `{model}`, `{model_label}`, and `{routed_agent}`.

Variant descriptions are generated with selection guidance by default. The wizard can infer basic/light/heavy/verification/parallel/strict-review style guidance from the variant key, alias, model preset, resolved model name, model label, and provider model variant. Capability inference maps GPT nano and GPT-5.6 Luna to `basic`, GPT mini and GPT-5.6 Terra to `light`, and GPT-5.5, GPT-5.6 Sol, and the bare `gpt-5.6` alias to `heavy`. Literal canonical tier words (`basic`, `light`, or `heavy`) are explicit overrides. Otherwise, recognized model capability wins over semantic names: a Sol-backed `data-entry` alias remains heavy, while `data-entry` can still infer basic when the model tier is unknown. You can also pick a built-in guidance preset during variant creation or press `ctrl+p` while editing the `Description` field to insert preset text. Press `i` on a preset to preview the full text it adds.

## Supported Fields

Parents and variants support these fields:

- `model`
- `variant`
- `temperature`
- `top_p`
- `prompt`
- `prompt_prepend`
- `prompt_append`
- `description`
- `description_prepend`
- `description_append`
- `options`
- `color`
- `disable`

Variants also support:

- `name`

`permission`, `tools`, and `mode` are inherited from the parent and are intentionally not configured in the sidecar.

## Built-In Agents

Built-in agents such as `general` and `explore` cannot be copied externally without vendoring OpenCode internals. For these agents, the plugin creates a virtual alias:

- The variant appears in the task tool list.
- The main model can call `task` once with the variant name.
- The plugin routes the call to the native parent before execution.
- The plugin applies configured model, request parameter, and explicit prompt overrides.
- The plugin keeps routing metadata internal and exposes only a small natural alias hint in the task title.
- By default, child-session correlation uses OpenCode task metadata instead of prompt markers. A legacy prompt-marker fallback can be enabled from `Debug & advanced` if needed.

This preserves native prompts and permissions. The child session may internally show the parent agent name for built-in variants; that is expected.

## Config Agents

Agents defined in `opencode.json`, `.opencode/agent/*.md`, or global agent markdown can be copied directly. Their variants are real generated config agents with the supported overrides applied.

## Disable Rules

- If the parent is disabled in OpenCode config, variants are skipped.
- If a sidecar parent has `disable: true`, the parent override and all variants are skipped.
- If a variant has `disable: true`, only that variant is skipped.
- Parent overrides apply only when the parent has at least one enabled variant.
- Malformed model references are skipped immediately; provider/model existence is validated after OpenCode exposes its merged provider catalog, then warning toasts are shown and invalid runtime calls fail before execution.
- Conflicting aliases are skipped instead of overwriting existing agents.

Use the wizard's `Run diagnostics` action to inspect model validation, preset issues, alias conflicts, disabled parents, task-callability, inheritance/propagation typos, backup journal health, and plugin installation state.

## Debug Mode

Debug mode is off by default. Enable it from the wizard through `Debug & advanced`.

When enabled, the server plugin emits diagnostic log lines and TUI toast notifications for built-in virtual variants:

- when a variant is routed, such as `general-light -> general`
- whether markerless metadata routing or legacy prompt-marker routing was used
- the target model and model variant
- when the model override is applied to the child session message
- when old model-visible routing artifacts are sanitized; dirty task-tool parts are repaired in stored session history, while plain text is scrubbed only for replay

When debug mode is enabled, logs are written to `~/.config/opencode/agent-variants.debug.log`. The plugin does not write debug lines to stdout, because that can corrupt the terminal UI.

Debug mode is stored in `agent-variants.jsonc` and takes effect immediately for future variant calls. The wizard can also view and clear the debug log from `Debug & advanced`.

`routing.prompt_markers` is off by default. Leave it off for cache hygiene; it avoids random route tokens in subagent prompts. Turn it on only as a temporary legacy correlation fallback while debugging routing issues.

## Development

Install dependencies:

```sh
npm install
```

Typecheck:

```sh
npm run typecheck
```

Build:

```sh
npm run build
```

Check package contents before publishing:

```sh
npm pack --dry-run
```

## License

MIT
