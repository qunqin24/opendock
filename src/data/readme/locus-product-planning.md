# Locus Product Planning

**Your center point for planning and building products with AI.**

Locus guides you from idea to implementation through a simple 4-step process, backed by 46 specialized skills and 14 agent definitions.

## Quick Start

```
You: I want to build an AI trading simulator

Locus: I'll help you plan and build this step by step.

       📋 AI Trading Simulator
       ━━━━━━━━━━━━━━━━━━━━━━━
       → Step 1: Vision ◄
         Step 2: Features
         Step 3: Design
         Step 4: Build

       What problem does this solve?
```

Say **"continue"** to move forward. That's it.

## How It Works

```
Step 1: Vision    → What are we building and why?
Step 2: Features  → What will it do?
Step 3: Design    → How will it work?
Step 4: Build     → Let's make it
```

## Installation

### OpenCode (Recommended)

Add to your `opencode.json`:

```json
{
  "plugin": ["locus-product-planning"]
}
```

OpenCode will automatically install the plugin on startup.

### Claude Code

Clone the repository and configure as a plugin:

```bash
git clone https://github.com/SwiggitySwerve/locus-product-planning.git ~/.claude/plugins/locus
```

The plugin includes session hooks that automatically bootstrap Locus skills on startup.

### Manual / Other Environments

Clone and reference the skill files directly:

```bash
git clone https://github.com/SwiggitySwerve/locus-product-planning.git
```

Then read `skills/using-locus/SKILL.md` to get started.

## Commands

| Command | Description |
|---------|-------------|
| `/locus` | Start or resume a project |
| `/locus-skills` | List available skills (with optional filtering) |
| `/locus-skill <name>` | Load a specific skill |
| `/locus-agents` | List available agents |

Or just describe what you want: "I want to build..."

## Tools (OpenCode)

| Tool | Description |
|------|-------------|
| `locus_skill` | Load a skill by name (e.g., `locus:product-manager`) |
| `locus_skills` | List skills with optional category/tier/search filters |
| `locus_agents` | List available agent definitions |

## Skills Library (46)

### Executive Suite
Strategic leadership perspectives:
- `locus:ceo-strategist` - Strategic vision and decision making
- `locus:cto-architect` - Technical strategy and architecture
- `locus:cpo-product` - Product vision and roadmap
- `locus:cfo-analyst` - Financial analysis and planning
- `locus:coo-operations` - Operations and execution

### Product Management
Product planning and execution:
- `locus:product-manager` - Product planning and requirements
- `locus:project-manager` - Project execution and tracking
- `locus:scrum-master` - Agile process facilitation
- `locus:program-manager` - Multi-project coordination
- `locus:roadmap-strategist` - Long-term planning
- `locus:estimation-expert` - Effort estimation

### Engineering Leadership
Technical leadership and architecture:
- `locus:tech-lead` - Technical leadership
- `locus:staff-engineer` - Senior technical guidance
- `locus:principal-engineer` - Architecture decisions
- `locus:engineering-manager` - Team leadership
- `locus:architect-reviewer` - Architecture review

### Developer Specializations
Domain expertise organized by category:

**Core**: `frontend-developer`, `backend-developer`, `fullstack-developer`, `mobile-developer`, `api-designer`

**Languages**: `typescript-pro`, `python-pro`, `rust-engineer`, `golang-pro`, `java-architect`

**Infrastructure**: `devops-engineer`, `cloud-architect`, `kubernetes-specialist`, `platform-engineer`, `security-engineer`, `sre-engineer`, `database-architect`

**Data & AI**: `data-engineer`, `data-scientist`, `ml-engineer`, `llm-architect`

**Quality**: `qa-expert`, `performance-engineer`, `security-auditor`, `accessibility-tester`, `test-automation-engineer`

**Design**: `ui-ux-designer`

### Specialists
- `locus:compliance-specialist` - Regulatory compliance
- `locus:technical-writer` - Documentation and technical writing

## Agents (14)

Pre-configured agent definitions for specialized perspectives:

| Category | Agents |
|----------|--------|
| Executive | ceo-strategist, cto-architect, cpo-product, cfo-analyst, coo-operations |
| Product | product-manager, project-manager, scrum-master, qa-strategist |
| Engineering | tech-lead, staff-engineer, principal-engineer, engineering-manager, architect-reviewer |

## Project Structure

```
skills/                  # 46 skill definitions
├── using-locus/         # Main bootstrap skill
├── 01-executive-suite/  # C-suite perspectives
├── 02-product-management/
├── 03-engineering-leadership/
├── 04-developer-specializations/
│   ├── core/
│   ├── design/
│   ├── languages/
│   ├── infrastructure/
│   ├── data-ai/
│   └── quality/
└── 05-specialists/

agents/                  # 14 agent definitions
├── executive/
├── product/
└── engineering/

hooks/                   # Claude Code session hooks
├── hooks.json
├── session-start.sh     # Unix
└── session-start.cmd    # Windows

dist/                    # OpenCode plugin (compiled)
opencode.json            # OpenCode commands
.claude-plugin/          # Claude plugin metadata
```

## Development

```bash
git clone https://github.com/SwiggitySwerve/locus-product-planning.git
cd locus-product-planning
npm install
npm test        # 184 tests
npm run build   # Compile TypeScript
```

### CLI Access

```bash
npm run cli -- status INI-EXAMPLE-001
npm run cli -- gate INI-EXAMPLE-001 product
npm run cli -- next INI-EXAMPLE-001
```

## Platform Support

| Platform | Support | Mechanism |
|----------|---------|-----------|
| OpenCode | ✅ Full | Plugin with tools + event hooks |
| Claude Code | ✅ Full | Shell hooks + skill files |
| Codex | ✅ Manual | Read skill files directly |

## Why "Locus"?

**Locus** (noun): A center point; a place where something is situated or occurs.

Your projects need a center point - a place where vision, planning, and execution converge. That's Locus.

## License

MIT
