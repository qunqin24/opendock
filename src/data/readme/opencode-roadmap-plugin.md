# opencode-roadmap-plugin

A real [opencode](https://opencode.ai/) plugin that generates comprehensive product roadmaps for any project — using a 4-phase pipeline (**Discovery → Competitor → Features → Critic**) with Aperant-quality output.

When loaded, the plugin auto-installs the `/roadmap` slash command and 4 specialized subagents into your opencode configuration.

## What you get

A single command `/roadmap` that produces:

```
.auto-build/roadmap/
├── roadmap_discovery.json     ← project understanding (audience, vision, gaps)
├── competitor_analysis.json   ← 5 competitors with real pain points & sources
└── roadmap.json               ← 15-20 prioritized features, 4 phases
```

Each feature includes:
- MoSCoW priority (must / should / could / won't)
- Complexity & impact scores
- 6+ specific, testable acceptance criteria (HTTP codes, timeouts, algorithms)
- 3+ user stories ("As a X, I want Y so that Z")
- Rationale linked to specific competitor pain points / discovery insights

## Why it's a real plugin

Earlier versions shipped as just markdown files. This version is a proper opencode plugin:
- Appears in opencode's **Plugins** tab (alongside `oh-my-openagent`, etc.)
- Loaded automatically when opencode starts
- Installs and updates agent/command files automatically
- Versioned, distributable via npm or GitHub

## Install

### Option 1: From GitHub (recommended for now)

Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "github:islamahmedas12-ux/opencode-roadmap-plugin"
  ]
}
```

opencode runs `bun install` automatically — the plugin will be fetched and loaded next time you start opencode.

### Option 2: From npm (when published)

```json
{
  "plugin": [
    "opencode-roadmap-plugin"
  ]
}
```

### Option 3: Manual install (legacy)

If you prefer not to use the plugin system, you can manually copy the agents and command:

```bash
git clone https://github.com/islamahmedas12-ux/opencode-roadmap-plugin.git
cd opencode-roadmap-plugin
./install.sh
```

This copies files to `~/.config/opencode/agents/` and `~/.config/opencode/commands/` directly.

## Recommended config

To get the best results, also configure the **context7** MCP server (for up-to-date library docs the agents can query):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["github:islamahmedas12-ux/opencode-roadmap-plugin"],
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "enabled": true
    }
  }
}
```

## Usage

In opencode (TUI or web), inside any project directory:

```
/roadmap
```

Or skip the competitor analysis phase (faster, no internet research):

```
/roadmap --no-competitor
```

The pipeline takes 12-18 minutes depending on model and project size. Output appears in `.auto-build/roadmap/` in the current project.

## How it works

```
User runs /roadmap
        │
        ▼
Primary agent reads the slash command file, then invokes:
        │
        ├──► Task(roadmap-discovery) ──► roadmap_discovery.json
        │
        ├──► Task(competitor-analysis) ──► competitor_analysis.json
        │       (uses WebSearch + context7 for real research)
        │
        ├──► Task(roadmap-features) ──► roadmap.json
        │       (15-20 features, MoSCoW, 6+ AC each)
        │
        └──► Task(roadmap-critic) ──► refines roadmap.json
                (strengthens weak features, adds missing ones)
```

Each subagent runs in isolation with its own context window, model, and tool permissions.

## Model recommendations

The plugin doesn't hardcode a model — agents inherit from your primary opencode agent. For best results:

- **Claude Sonnet 4.6 / Opus 4.7** — highest quality, ~$2-3/run, 16 min
- **MiniMax-M2.7** — ~85% quality at ~10% cost (~$0.30/run, 12 min)
- **GPT-5 / GPT-5-mini** — good middle ground

To use a specific model for the roadmap subagents, edit them post-install:

```bash
# After plugin loads agents to ~/.config/opencode/agents/
sed -i '/^description:/a model: minimax/MiniMax-M2.7' ~/.config/opencode/agents/roadmap-*.md
```

## Performance benchmarks

| Project | Phases | Features | Avg AC/feat | Time | Cost |
|---|---|---|---|---|---|
| AuthMe (NestJS IAM) | 4 | 15-20 | 7-8 | ~12 min | ~$0.30 |
| Real Estate CRM (NestJS+React+Flutter) | 4 | 16-20 | 7-9 | ~13 min | ~$0.35 |
| Commander.js (Node CLI lib) | 4 | 15 | 6-7 | ~8 min | ~$0.20 |

For comparison: Aperant + Claude Sonnet 4.6 produces ~10 AC/feat at ~$2-3/run in ~15-16 min.

## File structure

```
opencode-roadmap-plugin/
├── src/
│   └── index.ts                  ← plugin entry point (TypeScript)
├── dist/                         ← built output (npm-publishable)
│   ├── index.js
│   └── index.d.ts
├── agents/                       ← markdown agent definitions
│   ├── roadmap-discovery.md
│   ├── competitor-analysis.md
│   ├── roadmap-features.md
│   └── roadmap-critic.md
├── commands/
│   └── roadmap.md                ← /roadmap slash command
├── opencode.json.example         ← config template
├── install.sh                    ← manual install (legacy alternative)
├── package.json
├── tsconfig.json
├── LICENSE                       ← AGPL-3.0
└── README.md
```

## Plugin internals

The plugin entry (`src/index.ts`) does two things at load time:

1. **Syncs markdown assets** — copies `agents/*.md` and `commands/*.md` from the package to `~/.config/opencode/agents/` and `~/.config/opencode/commands/` so they're picked up by opencode's normal discovery mechanism.

2. **Registers a `shell.env` hook** — sets `OPENCODE_ROADMAP_PLUGIN_VERSION` env var so the plugin shows up in opencode's plugin list and version is observable.

The actual roadmap generation logic lives in the markdown subagents (see `agents/`) — the plugin is just the loader.

## Output schemas

### roadmap_discovery.json
```json
{
  "project_name": "...",
  "project_type": "web-app|mobile-app|cli|library|api|desktop-app|other",
  "tech_stack": { "primary_language": "...", "frameworks": [], "key_dependencies": [] },
  "target_audience": {
    "primary_persona": "...",
    "secondary_personas": [],
    "pain_points": [],
    "goals": [],
    "usage_context": "..."
  },
  "product_vision": { "one_liner": "...", "problem_statement": "...", "value_proposition": "...", "success_metrics": [] },
  "current_state": { "maturity": "idea|prototype|mvp|growth|mature", "existing_features": [], "known_gaps": [], "technical_debt": [] },
  "competitive_context": { "alternatives": [], "differentiators": [], "market_position": "..." },
  "constraints": { "technical": [], "resources": [], "dependencies": [] }
}
```

### roadmap.json
```json
{
  "id": "roadmap-<timestamp>",
  "project_name": "...",
  "vision": "...",
  "phases": [{ "id": "...", "name": "...", "description": "...", "milestones": [...], "features": [...] }],
  "features": [
    {
      "id": "feature-1",
      "title": "...",
      "description": "...",
      "rationale": "Links to specific pain points",
      "priority": "must|should|could|wont",
      "complexity": "low|medium|high",
      "impact": "low|medium|high",
      "acceptance_criteria": ["...", "..."],
      "user_stories": ["As a X, I want Y so that Z"],
      "competitor_insight_ids": ["pain-1-1", "gap-2"]
    }
  ]
}
```

## Development

```bash
git clone https://github.com/islamahmedas12-ux/opencode-roadmap-plugin.git
cd opencode-roadmap-plugin
npm install
npm run build
```

The build produces `dist/index.js` from `src/index.ts`. Both `dist/` and the markdown source files are committed so the GitHub installation path works without a separate build step.

## Troubleshooting

**Plugin doesn't appear in opencode's Plugins tab**: ensure `opencode.json` has `"plugin": ["github:islamahmedas12-ux/opencode-roadmap-plugin"]` and restart opencode. The first launch will run `bun install` (may take 30s).

**`/roadmap` command not found**: check `~/.config/opencode/commands/roadmap.md` exists. The plugin should create this on load — if missing, check opencode's startup logs for plugin errors.

**MCP context7 errors**: free tier has rate limits. Get a free API key at https://context7.com/dashboard.

**Output too generic**: ensure your model is at least Sonnet/Opus level. Small models struggle with the depth requirements. You can also re-run just the critic via `@roadmap-critic` for another refinement pass.

## Credits

The agent prompts are derived from [Aperant](https://github.com/AndyMik90/Aperant) (formerly Auto-Claude) by [@AndyMik90](https://github.com/AndyMik90), licensed AGPL-3.0. This plugin extends them for opencode and adds explicit depth directives, a critic refinement phase, and stricter schema validation.

## License

AGPL-3.0 — derivative of Aperant. See [LICENSE](./LICENSE).
