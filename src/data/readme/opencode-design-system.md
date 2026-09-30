# OpenCode Design System

[![npm version](https://img.shields.io/npm/v/opencode-design-system)](https://www.npmjs.com/package/opencode-design-system)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6f42c1)](https://opencode.ai/v2/docs/)

**A collaborative OpenCode v2 plugin for creating and evolving portable, framework-neutral design systems that AI agents can actually follow.**

[English](https://github.com/BraveOtter/opencode-design-system/blob/master/README.md) · [Español](https://github.com/BraveOtter/opencode-design-system/blob/master/README.es.md) · [Português (Brasil)](https://github.com/BraveOtter/opencode-design-system/blob/master/README.pt-BR.md) · [Deutsch](https://github.com/BraveOtter/opencode-design-system/blob/master/README.de.md) · [Français](https://github.com/BraveOtter/opencode-design-system/blob/master/README.fr.md) · [Italiano](https://github.com/BraveOtter/opencode-design-system/blob/master/README.it.md) · [简体中文](https://github.com/BraveOtter/opencode-design-system/blob/master/README.zh-CN.md) · [日本語](https://github.com/BraveOtter/opencode-design-system/blob/master/README.ja.md)

> **Disclaimer:** This is an independent community project. It is not built by the OpenCode team and is not affiliated with OpenCode in any way.

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

To pin a specific npm release, replace `<version>` with the version you want:

```sh
opencode plugin add opencode-design-system@<version>
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

To pin a tagged GitHub release, replace `<tag>` with the tag you want:

```sh
opencode plugin add github:BraveOtter/opencode-design-system#<tag>
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
| `/design-system/review` | Open a local two-panel preview and conversation linked to the current OpenCode session, with contextual element selection. |
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

## Built-in design skills

The plugin registers three adapted design skills internally through OpenCode v2. They are used together when creating or updating a Design System, choosing tokens, or writing screen briefs: visual direction, product-interface craft, and accessibility-aware token decisions. They guide the agent but do not replace the project's framework-neutral Markdown and JSON source of truth, and their skill files are **not written into user projects**.

### Customize the built-in skills

Use the plugin's `designSkills` option to disable all bundled skills, disable individual skills, or allow only selected IDs. Unspecified entries stay enabled when using an object:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": {
        "designSkills": {
          "opencode-design-visual-direction": false
        }
      }
    }
  ]
}
```

Set `"designSkills": false` to disable all three, or provide an array of IDs to enable only those skills. To add a personal skill without changing the plugin, create a descriptive `SKILL.md` under `~/.config/opencode/skills/<your-skill-id>/`; OpenCode discovers it globally. Disable a bundled skill first if your custom one should take its place. To change a bundled skill itself, edit `skills/<skill-directory>/SKILL.md` in a local plugin checkout or fork, then load that checkout; retain its source credit and license. See [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) for the complete notices.

### Credits

- **Frontend Design** — Anthropic; original authors Prithvi Rajasekaran and Alexander Bricken. [Source](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design/skills/frontend-design) · Apache-2.0.
- **Interface Design** — Dammyjay93 (Damola Akinleye). [Source](https://github.com/Dammyjay93/interface-design) · MIT.
- **Design System Auditor** — Community-Access; copyright © Taylor Arndt. [Source](https://github.com/Community-Access/accessibility-agents/blob/main/skills/design-system-auditor/SKILL.md) · MIT.

## Interactive preview

The agent designs a product-specific showcase in `design-system/preview/source.html` instead of filling in a fixed dashboard template. `design-system/preview/index.html` is compiled from that source and the current tokens; Markdown/JSON remain the authoritative design specification. Put `<!-- opencode-design-system:theme-tokens -->` inside `<head>` and reference semantic CSS variables such as `var(--ds-color-accent)` (or `var(--ds-color-accent-primary)` for nested tokens). The compiler injects every theme; the authored page can switch themes with `document.documentElement.dataset.theme = 'dark'`. Keep the source self-contained, accessible, and free of network dependencies.

`/design-system` can create the authored source along with the documentation; `/design-system/preview` can create it for an existing system. Refreshes preserve the source instead of replacing it with a generic dashboard. Without an authored source, the compatibility renderer is clearly labeled **provisional**. Edit `preview/source.html` to change the showcase, never the generated `index.html`.

Use `/design-system/review` to open a local review workspace with the interactive preview beside the same OpenCode session. Messages sent from the right-hand panel go to that session; completed turns refresh the generated preview. Enable **Select element** to pick documented components, patterns, or semantic-token samples in the preview and attach up to eight verified references to a message. References use manifest names, source paths, and token paths—not DOM selectors—and are checked again before sending so stale selections cannot silently target a different item. The standalone HTML remains available and works without this workspace. The review server binds to a random port on `127.0.0.1`, stops when the plugin unloads, and does not expose OpenCode credentials to the browser. By default, the command posts a link into the conversation rather than opening a browser automatically.

To open the system browser automatically when the review command runs, configure the plugin option:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-design-system",
      "options": { "autoOpenReview": true }
    }
  ]
}
```

Regenerate it in OpenCode with `/design-system/preview`, or without the plugin from the project root:

```sh
node design-system/tools/generate-preview.mjs
```

The standalone generator has no external dependencies. For older installations with an earlier `tools/generate-preview.mjs`, run `node design-system/tools/render-authored-preview.mjs` after first publishing an authored source; the plugin does not silently replace existing local tools. Edit Markdown/JSON to change the system, `preview/source.html` to change its demonstration, and never generated HTML.

## Develop and test

```sh
npm install
npm run typecheck
npm test
npm run build
```

Tests cover an integrated temporary-project workflow, including read-only analysis, creation and preservation of user files, managed `AGENTS.md` updates, screen briefs, multi-theme token updates, previews, the authenticated local review workspace and verified element references, checks, and path safety.

## Publish a release

The `Publish to npm` GitHub Actions workflow publishes when a `vX.Y.Z` tag is pushed, after checks pass and the tag matches the version in `package.json`. Before the first release, configure npm Trusted Publishing for the `BraveOtter/opencode-design-system` repository and the `publish.yml` workflow, and allow the direct `npm publish` action. The workflow uses OIDC, so no npm publish token needs to be stored in GitHub; npm also generates provenance automatically for this public repository.

To bump the package version and push its commit and tag:

```sh
npm version patch # or minor / major
git push --follow-tags
```

## Documentation

- [OpenCode v2 plugin guide](https://opencode.ai/v2/docs/build/plugins)
- [OpenCode plugin configuration](https://opencode.ai/v2/docs/plugins)
- [OpenCode commands](https://opencode.ai/v2/docs/commands)
- [OpenCode instructions and `AGENTS.md`](https://opencode.ai/v2/docs/instructions)
- [Plugin API reference](https://opencode.ai/v2/docs/api)
- [npm package](https://www.npmjs.com/package/opencode-design-system)
- [Report an issue](https://github.com/BraveOtter/opencode-design-system/issues)

## License

This project is licensed under the [MIT License](https://github.com/BraveOtter/opencode-design-system/blob/master/LICENSE).
