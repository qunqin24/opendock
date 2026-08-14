# gambit-opencode

OpenCode slash commands for product management — thirteen skills and four chained workflow agents.

This is the OpenCode port of [gambit](https://github.com/felipecabargas/gambit). For Claude Code and Gemini CLI support, use the parent repo.

## Installation

### Via npm

Add to your `opencode.json`:

```json
{
  "plugins": ["gambit-opencode"]
}
```

### Via GitHub

Add to your `opencode.json` (no npm install needed):

```json
{
  "plugins": ["github:felipecabargas/gambit-opencode"]
}
```

## Commands

### FR Pipeline

| Command | What it does |
|---------|-------------|
| `/gambit-write-feature-request` | Guided FR authoring with auto-generated ACs |
| `/gambit-write-product-strategy` | Generate a STRATEGY.md from product context |
| `/gambit-verify-acceptance-criteria` | Score and fix ACs against five quality dimensions |
| `/gambit-write-technical-brief` | Engineering handoff from a verified FR |

### Sprint & Comms

| Command | What it does |
|---------|-------------|
| `/gambit-sprint-review` | Turn sprint data into a stakeholder-ready report |
| `/gambit-write-release-notes` | Convert tickets/PRs into customer-facing release notes |
| `/gambit-write-stakeholder-update` | One-page data-led PM status update for leadership |

### Discovery

| Command | What it does |
|---------|-------------|
| `/gambit-synthesize-user-research` | Structure raw research into themes and JTBD |
| `/gambit-build-user-persona` | Build evidence-backed personas from research |
| `/gambit-competitive-analysis` | Competitive landscape with player profiles and whitespace |
| `/gambit-prioritize` | Score and rank features using RICE, ICE, or MoSCoW |

### Strategy

| Command | What it does |
|---------|-------------|
| `/gambit-write-okrs` | Derive OKRs from strategy pillars |
| `/gambit-write-roadmap` | Create a Now/Next/Later roadmap from strategy and OKRs |

### Chained Workflows

These commands orchestrate multiple skills in sequence with pause points between steps for review.

| Command | What it does |
|---------|-------------|
| `/gambit-discovery-to-fr` | Research → Synthesis → Persona → Feature Request |
| `/gambit-fr-to-ready` | Feature Request → Verified ACs → Technical Brief |
| `/gambit-strategy-to-roadmap` | Strategy → OKRs → Roadmap |
| `/gambit-sprint-to-stakeholders` | Sprint data → Review → Release Notes → Stakeholder Update |

## License

MIT
