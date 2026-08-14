# llisa

![Lisa and Ralph](lisa-and-ralph.png)

LLM-powered epic workflows for [OpenCode](https://opencode.ai) and [Claude Code](https://claude.ai/code). Like the Ralph Wiggum pattern, but smarter.

**Latest version: 1.0.0** - Fresh agent architecture with verification!

## Why Lisa?

The **Ralph Wiggum pattern** is a simple bash loop that keeps feeding prompts to an AI agent until completion. It works, but:

- Ralph is dumb - he just loops forever with the same prompt
- No planning - dives straight into coding
- No context management - context window fills with garbage
- No task dependencies - can't parallelize or sequence work properly

**Lisa plans before she acts:**

- **Structured phases** - spec, research, plan, then execute
- **Fresh context per phase** - each phase runs in a sub-agent with clean context
- **Verification + retry** - deterministic checks ensure agents complete their work
- **Dependency-aware tasks** - knows what can run in parallel
- **State persistence** - survives session restarts, tracks progress
- **Yolo mode** - fully autonomous execution when you want it

## Install

### OpenCode

One command to install Lisa in your project:

```bash
npx llisa --opencode
```

Or with Bun:

```bash
bunx llisa --opencode
```

This creates an `opencode.json` file with Lisa configured. The plugin will be automatically downloaded by OpenCode when you start it.

Requires [OpenCode](https://opencode.ai) 1.0+.

#### Global Installation (OpenCode)

To use Lisa in all your projects without installing per-project:

```bash
npx llisa --opencode --global
```

This installs to `~/.config/opencode/` and registers the plugin in your global OpenCode config.

### Claude Code

Add this repo as a marketplace, then install the plugin:

```
/plugin marketplace add fractalswift/llisa
/plugin install lisa@llisa
```

Or for project-level install (committed to the repo, shared with teammates):

```
/plugin install lisa@llisa --scope project
```

Requires Claude Code 1.0.33+ and `jq` (`brew install jq` / `apt install jq`).

## Usage

### OpenCode commands
```
/lisa-create-epic <name>   - Create new epic (interactive spec)
/lisa-list-epics           - List all epics with status
/lisa-epic-status <name>   - Show detailed epic status
/lisa-continue <name>      - Resume with interactive checkpoints
/lisa-yolo <name>          - Resume in full auto mode
/lisa-help                 - Show help menu
```

### Claude Code commands
```
/lisa:create-epic <name>            - Create new epic (interactive spec)
/lisa:list-epics                    - List all epics with status
/lisa:epic-status <name>            - Show detailed epic status
/lisa:continue <name>               - Resume with interactive checkpoints
/lisa:yolo <name> [max-iterations]  - Resume in full auto mode
/lisa:help                          - Show help menu
```

**Examples:**
```
/lisa:create-epic initial-setup
/lisa:list-epics
/lisa:continue initial-setup
/lisa:yolo auth-system
/lisa:yolo auth-system 50     ← limit to 50 yolo iterations
```

**Epics are portable between OpenCode and Claude Code** — the `.lisa/` file format is identical on both platforms.

## Writing Good Specs

The spec is the single most important factor in epic quality. Lisa will do exactly what you specify — vague specs produce vague results.

**Acceptance criteria should be verifiable:**
```
✓ Users can log in with email and password, receiving a JWT on success
✗ Auth works well
```

**Explicitly list out-of-scope items** — prevents the agent from gold-plating or going too wide:
```
### Out of Scope
- OAuth / social login
- Password reset flow
- Email verification
```

**Mention your test setup** in Technical Constraints — if you have tests, the agent will run them and use failures as feedback:
```
## Technical Constraints
- Project uses Jest; all new code must have tests passing (`npm test`)
- Follow existing Express middleware pattern in src/middleware/
```

**Keep epics focused** — aim for work completable in 1-4 hours of agent time. Split larger features into multiple epics:
```
✓ /lisa-create-epic auth-login     (login flow only)
✓ /lisa-create-epic auth-register  (registration flow, separate epic)
✗ /lisa-create-epic auth           (too broad)
```

**Concrete constraints beat vague ones:**
```
✓ Use the existing UserRepository in src/db/user.ts
✗ Follow existing patterns
```

## How It Works

Lisa breaks large features into phases:

1. **Spec** - Define what you're building (interactive)
2. **Research** - Explore the codebase (fresh agent, verified completion)
3. **Plan** - Break into discrete tasks with dependencies (fresh agent, verified)
4. **Execute** - Run tasks via sub-agents with clean context (verified per task)

Each phase uses a fresh agent to prevent context pollution. On OpenCode, custom tools verify completion deterministically. On Claude Code, agents verify by reading files directly — same outcome, no custom tools needed.

All state is persisted to `.lisa/epics/` so you can stop and resume anytime.

## Configuration

Config lives in `.lisa/config.jsonc`:

```jsonc
{
  "execution": {
    "maxRetries": 3,           // Retries per task/phase before blocking
    "maxParallelTasks": 1      // Tasks to run in parallel (1 = sequential)
  },
  "git": {
    "completionMode": "none",  // "none" | "commit" | "pr"
    "branchPrefix": "epic/",
    "autoPush": true
  },
  "yolo": {
    "defaultMaxIterations": 100
  }
}
```

In default mode, Lisa does NOT make commits or PRs. If you want to make commits you'll need git set up, and if you want to make PRs you'll need the github cli set up.

## What's New in 1.0

- **Fresh agent architecture** - Research, planning, and execution each use isolated sub-agents
- **Verification tools** - Deterministic checks ensure phases complete properly
- **Automatic retry** - Up to 3 attempts per phase with progressively stronger prompts
- **Token efficiency** - Fresh context per phase prevents context window bloat

## License

MIT
