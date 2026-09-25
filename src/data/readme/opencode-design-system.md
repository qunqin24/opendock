# OpenCode Design System

[![npm version](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/main/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**A collaborative OpenCode v2 plugin for creating and evolving portable, framework-neutral design systems that AI agents can actually follow.**

[English](https://github.com/BraveOtter/opencode-design-system/blob/main/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/main/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/main/README.pt-BR.md)

The design system becomes a project's durable visual memory: structured **Markdown and JSON** for semantic tokens, explicit preferences, design decisions, components, patterns, and screen briefs. A live HTML preview is generated from those sources; it is never a second source of truth.

## Why this plugin?

- **Start from a conversation, not a questionnaire.** Resolve only the important identity choices that are still unclear, and keep the user's preferences explicit.
- **Document what already exists.** Bounded, read-only analysis can help formalize an existing UI without silently redesigning it.
- **Give agents the relevant context.** Progressive loading supplies the tokens, components, patterns, and guidance relevant to a UI task instead of dumping the whole system into every prompt.
- **Evolve the system coherently.** Track decisions, semantic token dependencies, affected components and patterns, status, and design-system version changes.
- **Avoid framework lock-in.** The authoritative format is Markdown and JSON, not React, Vue, Tailwind, or a generated preview.
- **Keep project files safe.** Analysis and checks are read-only. Design-system creation refuses to replace an existing `design-system/` directory, and existing `AGENTS.md` content outside the plugin-managed block is preserved.

## Requirements

- [OpenCode v2](https://opencode.ai/v2/docs/)
- Node.js **22.19 or newer**

## Install

### Install the published npm package

Install it globally with the OpenCode CLI:

```sh
opencode plugin add opencode-design-system
```

To pin the current release:

```sh
opencode plugin add opencode-design-system@1.0.1
```

Or configure it for a project in `opencode.json` or `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-design-system"]
}
```

OpenCode loads configured plugins at startup. If the plugin does not appear, restart OpenCode or the OpenCode service.

### Install directly from GitHub

For the repository's latest default-branch version:

```sh
opencode plugin add github:BraveOtter/opencode-design-system
```

To pin a tagged release instead:

```sh
opencode plugin add github:BraveOtter/opencode-design-system#v1.0.1
```

### Use a local checkout

Clone the repository, install its development dependencies, and build it:

```sh
npm install
npm run build
```

Then point OpenCode to the checkout directory (adjust the relative path to your project):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-design-system"]
}
```

The repository also contains an optional local test entry point at `plugins/local/index.js`; it is not loaded automatically and is not part of the npm package.

## Get started

Create a system from a visual direction:

```text
/design-system A calm, compact workspace with muted greens, crisp surfaces, and no gradients.
```

If the project already has a UI, ask the agent to inspect it first. It will explain what it found and ask whether you want to document the existing identity or start fresh before creating anything:

```text
/design-system Analyze this app's UI and help me document its existing visual language.
```

To design a screen without asking the plugin to implement UI code:

```text
/design-screen User management with search, filters, invitations, and empty states.
```

You can also request a screen brief in natural language without invoking `/design-screen`. When a manifest exists, the plugin points the agent to the project's `AGENTS.md` and relevant design-system guidance.

## Commands

| Command | What it does |
| --- | --- |
| `/design-system [idea]` | Collaboratively create a system from scratch or discuss documenting an existing UI. |
| `/design-system/update [change]` | Apply a semantic, versioned change and identify dependent documentation. |
| `/design-system/preview` | Regenerate the interactive preview from the structured files. |
| `/design-system/check` | Run a read-only, heuristic check for UI styles that may drift from documented tokens. |
| `/design-screen [screen]` | Save an implementation-ready screen brief without writing application UI code. |

The plugin also registers `design_system_create`, `design_system_read`, `design_system_analyze`, `design_system_update`, `design_system_preview`, `design_system_check`, and `design_system_screen_spec` tools for the agent to use as needed.

## How it works

### A careful workflow for existing products

The `design_system_analyze` tool reads likely UI and style sources, recognized framework configuration, and declared dependencies. It summarizes evidence such as CSS variables, colors, radii, spacing, responsive breakpoints, and component candidates. The scan is bounded, skips dependency/build directories and symlinks, and does not modify the files it reads. Findings are clues—not proof that a difference is a mistake.

The agent explains uncertainty and asks before normalizing important or ambiguous visual decisions. Analysis is not permission to redesign or edit application code.

### Safe project ownership

Creating a system writes a new `design-system/` directory and adds or updates only the plugin-managed block in the root `AGENTS.md`. If `design-system/` already contains files, creation refuses to replace them. Updates are deliberate writes to design-system artifacts; the plugin's built-in analysis and check tools never edit application UI files.

The managed `AGENTS.md` guidance is portable: it tells OpenCode and other coding agents how to find the framework-neutral sources and load only what a task needs. The plugin does not copy agents, commands, or skills into the project.

### A portable source of truth

The generated directory typically looks like this:

```text
design-system/
├── README.md
├── manifest.json
├── tokens.json
├── preferences.json
├── FOUNDATIONS.md
├── AI-GUIDELINES.md
├── DECISIONS.md
├── CHANGELOG.md
├── schema/
├── components/
├── patterns/
├── screens/
├── preview/
│   └── index.html
└── tools/
    └── generate-preview.mjs

AGENTS.md  # Existing content is kept outside the managed block.
```

The manifest indexes themes, versions, files, and the token references declared by each component and pattern. Systems begin at `0.1.0` with schema version `1.0.0`; their review status is `draft`, `review`, or `stable`.

Tokens use semantic paths and can define multiple themes:

```json
{
  "$schema": "./schema/tokens.schema.json",
  "schemaVersion": "1.0.0",
  "themes": {
    "light": {
      "color": {
        "surface": { "base": "#f6f8f7", "raised": "#ffffff" },
        "text": { "primary": "#17211f", "secondary": "#65726d" },
        "accent": { "primary": "#276f55" }
      },
      "radius": { "control": "6px", "card": "8px" },
      "spacing": { "sm": "8px", "md": "16px" }
    }
  }
}
```

The vocabulary can grow to include typography, layout, elevation, motion, breakpoints, focus, and states. Components describe purpose, variants, tokens, behavior, accessibility, responsive behavior, and relationships. Patterns document useful compositions such as forms, navigation, filters, tables, and empty states.

### Meaningful, versioned updates

`/design-system/update` reads the manifest and relevant documents before changing the system. A semantic token update changes that path across themes by default; prefix a path with `themes.<name>.` for a theme-specific change. The update records the rationale, finds declared token dependents, updates relevant documentation, and regenerates the preview.

Design-system version impact follows:

- **PATCH** — compatible fixes or documentation changes.
- **MINOR** — compatible additions, such as a new token, component, or pattern.
- **MAJOR** — changes that may break existing design contracts.

These versions belong to the generated project design system, not the npm plugin package. Updated systems return to `draft` by default so a person can review them.

## Interactive preview

`design-system/preview/index.html` is generated from the manifest, tokens, and component/pattern specifications. It includes token samples, component examples, theme switching when multiple themes exist, and interactive examples. It supports visible keyboard focus and `prefers-reduced-motion`.

Regenerate it in OpenCode with `/design-system/preview`, or without the plugin from the project root:

```sh
node design-system/tools/generate-preview.mjs
```

The standalone renderer has no external dependencies. Edit the structured Markdown and JSON—not the generated HTML—to change the system.

## Develop and test

```sh
npm install
npm run typecheck
npm test
npm run build
```

Tests cover an integrated temporary-project workflow, including read-only analysis, creation and preservation of user files, managed `AGENTS.md` updates, screen briefs, multi-theme token updates, previews, checks, and path safety.

## Documentation

- [OpenCode v2 plugin guide](https://opencode.ai/v2/docs/build/plugins)
- [OpenCode plugin configuration](https://opencode.ai/v2/docs/plugins)
- [OpenCode commands](https://opencode.ai/v2/docs/commands)
- [OpenCode instructions and `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [Plugin API reference](https://opencode.ai/v2/docs/api)
- [npm package](https://www.npmjs.com/package/opencode-design-system)
- [Report an issue](https://github.com/BraveOtter/opencode-design-system/issues)

## License

This project is licensed under the [MIT License](https://github.com/BraveOtter/opencode-design-system/blob/main/LICENSE).
