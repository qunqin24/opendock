# Dezign0

A portable design capability layer for AI coding agents. It gives an agent a
design operating system, checkable craft rules, review templates and measurement
tools, and packages them as a native OpenCode 2 / OpenChamber plugin plus
installers for other harnesses.

**Status:** alpha. The kit, plugin, installer and review tools are usable today.
The CLI and local studio are next.

## What is inside

- **Design OS** — a design read, brief, direction, design spec, build, critique,
  fix and handover loop.
- **Craft rules** — typography, color, layout, states, accessibility, motion and
  content rules with mechanical checks.
- **Templates** — brief, design spec, critique, handover, tokens and memory.
- **Thirteen skills** — brief, frontend design, redesign, critique, system extraction,
  state boards, Figma context, design language, template start, Figma-to-code,
  code handoff, visual review and media brief.
- **Addon pack** — 152 design languages plus starter templates, Figma bridge,
  React/Next/Vue handoff, visual review and media prompt/storyboard packs.
- **Plugin** — zero-dependency OpenCode 2 / OpenChamber integration that installs
  the kit into a project and registers the skills.
- **Tools** — a static linter and a Playwright-based rendered measurement tool.

## Compatibility

- Core `dezign0` 0.10.0 pairs with addon pack `dezign0-design-languages` 0.2.2.
- The pack is optional; core skills and tools work without it.
- Design-system discovery checks the project `design-systems/`, an installed pack, and the sibling source checkout.

## Interfaces

- **CLI:** `npx dezign0 init|lint|measure|audit|doctor|systems|addons|new|export|mcp`
  with `--json`, stable exit codes and no dependencies.
- **MCP server:** `npx dezign0 mcp` exposes lint, measure, doctor, systems,
  addons, content lint and token export over stdio.
- **GitHub Action:** `.github/actions/dezign0-review` runs a P0/P1 gate, uploads
  screenshots and writes one sticky review comment.
- **Lifecycle hooks:** Claude `PostToolUse`/`Stop` gates lint HTML and block P0
  findings; `stop_hook_active` prevents loops. OpenCode observes `file.edited`
  and `session.idle` and raises a warning toast.
- **Advanced tools:** `dezign0 tool ingest|gallery|conformance|review|safety-scan|audit-matrix|compliance|context-report`.
- **Evals:** `npm run eval -- --adapter "..."` reports WITH/WITHOUT deltas.

## Quick start

### One command (any harness)

```bash
npx dezign0 init --harness=agents --client=claude
```

This copies the kit to `.design-os/`, installs the skills to the adapter's path,
writes the instruction block and merges an MCP server into `.mcp.json` (or
`.cursor/mcp.json` / `.gemini/settings.json`). Use `--client=agents` to print the
snippet instead, `--dry-run` to inspect without writing, and `--json` for machine
output. Existing MCP servers and an existing `dezign0` entry are preserved.
`--harness` accepts any adapter id from `design-os/adapters/`.

### OpenChamber / OpenCode 2 (native plugin)

In **Settings → Plugins → Add plugin**:

- **From local path:** the absolute path to this repo directory.
- **From npm:** `dezign0` — live at
  [npmjs.com/package/dezign0](https://www.npmjs.com/package/dezign0). The current
  release is `0.10.0`.
- **From git (no npm publish needed):** `github:Paatricious/Dezign0#v0.10.0`.
  This is the current tool-enabled version; the repository is public.

Optional addon pack — 152 design languages plus templates, Figma bridge, handoff, review and media prompts. Install the release tarball in the project:

```bash
npm install https://github.com/Paatricious/Dezign0/releases/download/v0.10.0/dezign0-design-languages-0.2.2.tgz
```

The pack is published as `dezign0-design-languages@0.2.2`; `npm install dezign0-design-languages` is equivalent.

Or use the sibling `design-languages/` folder in a source checkout.

Choose User or Project scope. On load the plugin copies the kit to `.design-os/`,
registers thirteen `dezign0-*` skills and five read-only tools (`dezign0_lint`,
`dezign0_measure`, `dezign0_doctor`, `dezign0_design_systems`, `dezign0_addons`).
It needs no npm dependencies; Playwright is optional for rendered measurement.
Details: [plugin/README.md](plugin/README.md).

### OpenCode 1.x

```bash
node design-os/install.mjs --target=../my-app --harness=opencode --with-agents
```

Then use `/design-new`, `/design-review`, `/design-ship`. Skills are installed at
`.opencode/skills/<name>/SKILL.md`.

### DSH

```bash
node design-os/install.mjs --target=../my-app --harness=dsh --with-agents
```

If your DSH build only discovers global skills, add `--scope=global`.

### Other harnesses

The installer supports 23 adapters: OpenCode, Claude Code, Codex, Cursor,
Gemini CLI, Windsurf/Devin, Cline, Copilot, Zed, Kiro, Augment Code, JetBrains
Junie, OpenHands, Agent Skills (`.agents`), DSH, Continue, Amp, Warp, Kilo Code,
Qwen Code, Roo (deprecated), Aider and files-only. See
[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for skill paths, instruction
files and MCP config paths.

```bash
node design-os/install.mjs --target=../my-app --harness=cursor --with-agents
```

### Claude Code plugin

```text
/plugin marketplace add Paatricious/Dezign0
/plugin install dezign0@dezign0
```

This uses `.claude-plugin/` and updates through the marketplace. A
`SessionStart` hook bootstraps `.design-os/` in the project so the skills resolve.

### Claude Code / Codex (installer fallback)

```bash
node design-os/install.mjs --target=../my-app --harness=claude --with-agents
node design-os/install.mjs --target=../my-app --harness=codex --with-agents
```

The installer never installs Playwright or deletes files. It copies the kit to
`.design-os/`, installs the thirteen skills to the harness's native path and writes an
`AGENTS.md` fragment. Use `--dry-run` to inspect first.

## How it works

The core loop is:

```text
Design Read -> Brief -> Direction/Design System -> Design Spec -> Build
-> Self-check -> Critique -> Fix -> Handover -> Memory
```

A design task starts with a one-line read of the page kind, audience and visual
language. It then becomes a numeric brief, a frozen design spec, a build and a
five-dimension critique with measured evidence. The critique is fixed against the
artifact, not the review text. The handover records the contract another agent
needs to implement it.

Mechanical checks:

```bash
node .design-os/tools/design-lint.mjs path/to/artifact.html
node .design-os/tools/measure-artifact.mjs path/to/artifact.html --strict
```

## Bring your own design systems

The **core** package does not bundle third-party design systems, templates,
fonts, images or skill bodies. The optional [design-languages](design-languages/README.md)
pack adds all 152 OpenDesign design systems with their Apache-2.0 license and
attribution. Install it separately when you want the catalog.

Use the design-system extraction skill to create a `DESIGN.md` and `tokens.css`
for a brand, or select a prebuilt language with the `design-language` skill.

## Repository map

| Path | What it is |
|---|---|
| [design-os/](design-os/README.md) | The design operating system, craft rules, templates, skills, installer and tools |
| [plugin/](plugin/README.md) | Zero-dependency OpenCode 2 / OpenChamber plugin |
| [server.js](server.js) | Directory plugin entrypoint used by OpenCode |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Product layers, content strategy and roadmap |
| [docs/ADOPTION.md](docs/ADOPTION.md) | Install and daily-loop instructions per harness |
| [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) | Adapter paths, statuses and generic client coverage |
| [docs/PUBLISHING.md](docs/PUBLISHING.md) | Publish to npm and install from OpenChamber's "From npm" field |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | What was tested, on which versions, and what is still a limit |
| [docs/figma.md](docs/figma.md) | Optional Figma MCP bridge and evidence rules |
| [design-languages/](design-languages/README.md) | Optional 152-package design-language pack from OpenDesign |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [SECURITY.md](SECURITY.md) | Threat model and reporting |

## Roadmap

1. **Current:** kit, installer, plugin, docs, npm packaging.
2. **Next:** `dezign0` CLI (`init`, `add`, `new`, `measure`) and a local studio
   for preview, library, comments and versions.
3. **Later:** brand extraction, reference browser, multi-agent critic and export.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Licensing and credits

The repository is Apache-2.0 (see [LICENSE](LICENSE)). Prior-art credits are in
[ATTRIBUTION.md](ATTRIBUTION.md) and
[design-os/ATTRIBUTION.md](design-os/ATTRIBUTION.md).

No third-party application code is included in the core package. The optional
design-languages pack contains the OpenDesign catalog under its own license and
notice.
