<!--
  SEO description: Eight router-routed Aurelia v2 MVVM skills for AI coding agents —
  branch, scaffold, resolve, assemble, slice, lift, package, wire. Works with OpenCode, Claude Code, and any
  skill-compatible AI agent.
  Keywords: Aurelia 2, Aurelia expert, MVVM, SPA, feature-first, scaffolding,
  dependency injection, large SPA structure, v1 to v2 migration, component library,
  plugin packaging, AI agent skills, OpenCode plugin, skills.sh
-->

<div align="center">

# aurelia-expert

**Eight router-routed Aurelia v2 MVVM skills for AI coding agents**

[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-blue?link=https://opencode.ai)](https://opencode.ai)
[![npm version](https://img.shields.io/npm/v/aurelia-expert?label=npm)](https://www.npmjs.com/package/aurelia-expert)
[![MIT License](https://img.shields.io/badge/License-MIT-green?link=LICENSE)](LICENSE)

[Quick start](#quick-start) · [Bundled skills](#bundled-skills) · [Examples](#examples) · [Requirements](#requirements) · [Development](#development)

</div>

---

Bring senior-grade **Aurelia v2** expertise into every AI agent session. This package bundles **eight router-routed skills** — one thin router (`aurelia-expert`) and seven pillar skills (`aurelia-foundation`, `aurelia-runtime`, `aurelia-component-library`, `aurelia-largespa`, `aurelia-migration`, `aurelia-plugin`, `aurelia-ecosystem`) — so any compatible agent picks the right pillar on its own and never confuses Aurelia 1 with Aurelia 2.

Works with [OpenCode](https://opencode.ai), Claude Code, and any agent that supports the `skill` tool or can invoke CLI-installed skills via `bunx` / `npx`.

## Quick start

Three install paths — pick whichever fits your workflow:

```bash
# 1. CLI install (any agent) — Bun preferred
bunx aurelia-expert install

# 2. Cross-agent install via skills.sh
npx skills add expert-vision-software/aurelia-expert --skill aurelia-expert -a opencode

# 3. OpenCode auto-install — add to your opencode.json
#    { "plugin": ["aurelia-expert"] }
```

That's it — skills are available immediately. The CLI defaults to **local scope** (writes to `./.opencode/skills/`). Pass `--scope global` to install once for all your projects (`~/.config/opencode/skills/`).

## Bundled skills

| Skill | Leading word | What it does |
|-------|-------------|--------------|
| **`aurelia-expert`** | `branch` | Router-only. Reads the prompt, classifies it as one of seven branches, hands off to the named pillar. |
| **`aurelia-foundation`** | `scaffold` | First-decision reference: philosophy, hello-world quickstart, custom-element naming, lifecycle hooks, AI-assisted scaffolding. |
| **`aurelia-runtime`** | `resolve` | Component wiring: `resolve()` DI, `@route`, `<au-viewport>`, AppTasks, custom events, cross-feature orchestration. |
| **`aurelia-component-library`** | `assemble` | Styled, variable-driven component library on Aurelia v2 + Tailwind: design-token layer, `shared/components/ui/` layout, `ui-` element prefix, component anatomy, greenfield deploy + migrate-existing with a v1-source gate. |
| **`aurelia-largespa`** | `slice` | Enterprise SPA structure: `pages/`, `features/`, `shared/`, hierarchical `Agents.md`, thin-page orchestrators, Model/DTO boundary. **Focal point.** |
| **`aurelia-migration`** | `lift` | v1 → v2 lift table (eight removed APIs), AUR0xxx debugging, `.to-view` performance, DeepWiki citation protocol. |
| **`aurelia-plugin`** | `package` | Distributable Aurelia v2 plugins: `register(container)` contract, `.customize()` options with `DI.createInterface` tokens, global resource registration, AppTask hooks, npm distribution (`peerDependencies`, dual ESM/CJS, `?raw` templates), and an extract procedure (library / feature-slice / shared-dir → plugin). |
| **`aurelia-ecosystem`** | `wire` | First-party plugins and runtime ecosystem: `@aurelia/fetch-client`, `@aurelia/validation`, `@aurelia/dialog`, `@aurelia/state`, `@aurelia/i18n`, forms (`model.bind`/`matcher.bind`/`submit.trigger:prevent`), Vitest + `@aurelia/testing` component tests, and SSR/prerendering (`aurelia2-ssr`, takeover, hydration, sitemap/robots). |

All skills load on demand. Only metadata (name + description) sits in every session at startup; the full skill body loads only when the agent decides it's relevant — zero overhead when not in use.

## Examples

### 🧭 Router dispatches by branch

> **You:** "Inject a service into a custom element with constructor parameters."

The `aurelia-expert` router classifies the prompt as `resolve` and hands off to `aurelia-runtime`. The pillar answers in its own voice:

```
Use resolve(IFoo) as the default value:
constructor(private readonly userService: IUserService = resolve(IUserService)) {}
Tests inject mocks through the constructor.
@inject is gone in v2 — never write it.
```

### 🏗️ Scaffold a foundation

> **You:** "Start a new Aurelia 2 app and create a custom element called `user-profile`."

Routes to `aurelia-foundation` → quickstart + components references:

```
1. Scaffold: bunx makes aurelia my-app --template vite-ts
2. Component name: user-profile (kebab-case, contains a hyphen)
3. Files: src/components/user-profile.ts + user-profile.html
4. @customElement({ name: 'user-profile', dependencies: [] })
5. Bindable inputs: @bindable name: string;
```

### 🧩 Slice a large SPA

> **You:** "We're starting a customer-portal SPA with billing, support, and reporting features."

Routes to `aurelia-largespa` → feature-first layout + orchestrator + Agents.md hierarchy:

```
src/
├── pages/                ← thin navigators (no business logic)
│   └── billing/index.ts
├── features/             ← one folder per business capability
│   ├── billing/
│   │   ├── components/
│   │   ├── services/     ← I-prefixed interfaces; resolve(), never concrete
│   │   ├── models/       ← *.model.ts; Model.fromDTO() at the API boundary
│   │   └── index.ts      ← registers local custom elements + DI bindings
│   └── support/
├── shared/               ← globally registered; no business logic
│   ├── auth/
│   └── http/
└── Agents.md             ← root precedence surface
```

### 🔁 Lift a v1 codebase

> **You:** "I'm porting an `au-northwind` reference app to Aurelia 2."

Routes to `aurelia-migration` → v1-removals + DeepWiki citations:

```
The v1 → v2 lift is mechanical. Eight APIs changed.
Run this table once per file (reference/v1-removals.md):

  PLATFORM.moduleName('order-list')   →  no wrapper needed; native bundler import
  @inject(HttpClient, ILogger)        →  constructor(private readonly svc = resolve(HttpClient))
  configureRouter(config)             →  @route([...])
  <router-view>                       →  <au-viewport>
  <compose viewModel="...">           →  <au-compose component.bind="...">
  .delegate on a custom event         →  .trigger (throws AUR0713 at compile time)
  activate() / deactivate()           →  canLoad / loading / canUnload / unloading
  inline style="width: ${value}%"     →  width.style="value + '%'"
```

## Requirements

| Component | Notes |
|-----------|-------|
| **[Bun](https://bun.sh) ≥ 1.0** | Required for the CLI installer, test suite, and OpenCode plugin runtime. |
| **Aurelia 2.x project** | Optional. Skills fire on any prompt that mentions Aurelia — no project scaffold needed to *browse* them. |
| **OpenCode, Claude Code, or any skill-compatible agent** | The eight skills surface in the agent's `<available_skills>` list once installed. |

## Installation

### 1. CLI install (any agent)

```bash
# Local scope (default): installs to ./.opencode/skills/
bunx aurelia-expert install

# Global scope: installs to ~/.config/opencode/skills/
bunx aurelia-expert install --scope global

# Same commands work with npx
npx aurelia-expert install

# Check / remove
bunx aurelia-expert status
bunx aurelia-expert uninstall --scope local
```

Non-interactive by design — no prompts, CI-friendly. The CLI writes a `.version` marker under `skills/aurelia-expert/` so subsequent runs are no-ops.

### 2. Cross-agent install via skills.sh

```bash
npx skills add expert-vision-software/aurelia-expert --skill aurelia-expert -a opencode
```

[`skills.sh`](https://skills.sh) is the cross-agent installer. The command above targets OpenCode; swap `-a opencode` for `claude-code` or any other agent it supports.

### 3. OpenCode plugin auto-install

Add `aurelia-expert` to your `opencode.json` `plugin` array:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["aurelia-expert"]
}
```

OpenCode installs the package on next session start, then `plugin.ts#config()` auto-copies the eight skills into `.opencode/skills/` (idempotent — checks `.version` marker).

For local development against a checkout of this repo, reference the directory directly:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/aurelia-expert"]
}
```

### Scope choice

We ship the package **unscoped** (`aurelia-expert`, not `@expert-vision-software/aurelia-expert`). Reasons:

- `bunx aurelia-expert install` works directly — no `bunx @org/...` syntax to remember.
- `npx aurelia-expert install` works directly.
- The name is unique enough on the public npm registry.

If a future conflict forces a rename, we'll publish `@expert-vision-software/aurelia-expert` and document the migration.

## Why this plugin?

- **v1 vs v2 contamination is impossible** — the six forbidden v1 APIs (`.delegate` → AUR0713, `<router-view>`, `PLATFORM.moduleName`, `configureRouter`, `<compose>`, `activate/deactivate`) are pinned as prohibitions across every pillar. `@inject` is DEPRECATED — still valid, `resolve()` is preferred.
- **Predictable routing** — every skill carries a `leading-word` (branch, scaffold, resolve, assemble, slice, lift, package, wire); the router classifies in one pass and stops.
- **Hierarchical Agent instructions** — `aurelia-largespa` teaches how to author `Agents.md` files at root + directory scope, so project conventions override the skill defaults.
- **Markdown-only bundle** — pure skill content, no runtime dependencies, zero overhead until the agent decides to load a skill.

## Development

```bash
# Clone and install
git clone https://github.com/Expert-Vision-Software/aurelia-expert.git
cd aurelia-expert
bun install

# Type-check (no emit — this package is published as .ts sources)
bun run check

# Run the test suite (skills + installer)
bun test

# Smoke-test the CLI against the local checkout
bunx . install --scope local
bunx . status
```

`prepublishOnly` runs `bun run check && bun test` automatically before any `npm publish`. The CI release workflow (`.github/workflows/release.yml`) extracts release notes from `CHANGELOG.md`, creates a GitHub Release, then runs `npm publish --provenance --access public` (requires the `NPM_TOKEN` secret and `id-token: write` permission for provenance).

See [CONTRIBUTING.md](CONTRIBUTING.md) for the file layout, architecture decisions, and authoring conventions.

## Acknowledgments

- [OpenCode](https://opencode.ai) — plugin architecture, skill loader, config schema
- [skills.sh](https://skills.sh) — cross-agent installer
- The Aurelia team — `https://docs.aurelia.io` is the canonical source of truth for every claim in this package

---

<div align="center">

**[📦 Install from npm](https://www.npmjs.com/package/aurelia-expert)** · **[🤝 Contribute](CONTRIBUTING.md)** · **[📄 License](LICENSE)**

</div>