# opencode-workflow

A structured development workflow plugin for [OpenCode](https://opencode.ai). Guides developers through a repeatable task lifecycle: **task → research → plan → execute → commit → review → readme**.

Inspired by [agentic](https://github.com/Cluster444/agentic).

## Install

### Option A: npm (recommended)

Add to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-workflow"]
}
```

OpenCode installs it automatically on startup.

### Option B: Git clone + symlink (no npm required)

Works behind corporate proxies or air-gapped environments — no package manager needed.

```bash
# Clone once, anywhere on your machine
git clone https://github.com/chethann/opencode-tasks.git

# From your project directory, run the setup script
cd /path/to/your-project
/path/to/opencode-tasks/setup.sh
```

Or pass the target project as an argument:

```bash
/path/to/opencode-tasks/setup.sh /path/to/your-project
```

This creates symlinks in `.opencode/` pointing to the cloned repo. Updates to the clone are picked up automatically (command changes instantly, plugin changes on OpenCode restart).

### Option C: GitHub install script (downloads files)

```bash
curl -fsSL https://raw.githubusercontent.com/chethann/opencode-tasks/main/install.sh | bash
```

This copies the plugin and commands into your project's `.opencode/` directory.

## Workflow

```
/task  →  /research  →  /plan  →  /execute  →  /commit  →  /review  →  /readme
```

Each step reads context from the previous step via `.wip/` — a hidden directory of per-task workflow files in your project root.

### Commands

| Command | Description |
|---------|-------------|
| `/task` | Interactively create a new task (name, description, requirements, success criteria) |
| `/switch [id]` | Switch the active task |
| `/load-task [id]` | Load a task's full context into the current session |
| `/dashboard` | Open the workflow dashboard in your browser |
| `/research` | Analyze the codebase in context of the active task |
| `/plan` | Generate a phased implementation plan from the research |
| `/execute` | Implement the plan (runs in primary session, makes real changes) |
| `/commit` | Draft a conventional commit message (does NOT run git) |
| `/review` | Validate implementation against the plan and requirements |
| `/readme` | Generate or update the project README |

### Agent: `task-orchestrator`

All commands are routed to the `task-orchestrator` agent — a workflow-aware subagent with a system prompt that understands the `.wip/` file structure, status gates, and naming conventions. This means commands don't need to repeat workflow context in every prompt.

The agent definition lives at `agents/task-orchestrator.md` and is installed to `.opencode/agents/`.

### Status Gates

Each command enforces that the prior step is complete before proceeding. If the prerequisite isn't met, the command stops and asks you to complete the prior step first (or override).

```
/task      → (no prerequisite)
/research  → task description exists
/plan      → at least one research entry
/execute   → at least one plan entry
/commit    → execution started
/review    → execution completed
/readme    → at least one approved review
```

### Multiple Iterations

Research, plans, and reviews support multiple iterations per task. Each new run appends with an incrementing index (`_0`, `_1`, `_2`). Commands always read the latest entry.

## File Structure

Every task gets its own self-contained directory under `.wip/tasks/`:

```
.wip/
├── .active                            # Current active task ID
├── tasks/
│   ├── my-task/
│   │   ├── task.json                  # Metadata + file pointers (central tracking)
│   │   ├── task.md                    # Human-readable description
│   │   ├── research_2026-04-22_0.md   # Codebase analysis (iteration 0)
│   │   ├── plan_0.md                  # Implementation plan (iteration 0)
│   │   └── review_2026-04-22_0.md     # Post-implementation review (iteration 0)
│   └── another-task/
│       ├── task.json
│       ├── task.md
│       └── ...
└── archive/                           # Outdated/completed task dirs
```

### Task JSON (`tasks/[id]/task.json`)

Central metadata file per task. Tracks status, timestamps, and pointers to all generated files:

```json
{
  "id": "my-task",
  "title": "Add OAuth Google login",
  "type": "feat",
  "status": "planning",
  "created_at": "2026-04-21T10:00:00Z",
  "updated_at": "2026-04-21T14:30:00Z",
  "task": { "file": ".wip/tasks/my-task/task.md", "created_at": "..." },
  "research": [{ "index": 0, "file": ".wip/tasks/my-task/research_2026-04-21_0.md", "created_at": "..." }],
  "plans": [{ "index": 0, "file": ".wip/tasks/my-task/plan_0.md", "created_at": "..." }],
  "execute": { "started_at": null, "completed_at": null },
  "commit": { "drafts": [], "committed": false },
  "reviews": [{ "index": 0, "file": ".wip/tasks/my-task/review_2026-04-21_0.md", "outcome": "approved" }],
  "readme": { "updated_at": null }
}
```

## Dashboard

Run `/dashboard` in OpenCode to launch a local web UI at http://localhost:3456.

Features:
- **Task list** — all tasks sorted by activity, active task highlighted
- **Progress bar** — visual step-by-step status (drafting → done)
- **Metadata cards** — type, status, timestamps, iteration counts
- **File browser** — click any workflow file to view its contents in a modal
- **Action buttons** — copy the next workflow command to clipboard, paste into OpenCode
- **Auto-refresh** — updates every 5 seconds

Zero dependencies — runs on Bun's built-in HTTP server.

## Custom Tools

The plugin registers these tools for use by commands:

| Tool | Purpose |
|------|---------|
| `workflow-context` | Read active task JSON (file pointers, status, history) |
| `workflow-update` | Update task JSON (status, add file entries, timestamps) |
| `workflow-task-init` | Create a new task (directory + JSON + markdown + set active) |
| `workflow-switch` | Switch the active task |
| `workflow-gate-check` | Check if prerequisites for a step are met |

## Local Development

To iterate on this plugin locally, symlink it into your target project:

```bash
# In your target project
mkdir -p .opencode/plugins .opencode/commands .opencode/agents

# Symlink plugin
ln -s /path/to/opencode-workflow/index.ts .opencode/plugins/opencode-workflow.ts

# Symlink dashboard server
ln -s /path/to/opencode-workflow/dashboard.ts .opencode/plugins/opencode-workflow-dashboard.ts

# Symlink agent
ln -s /path/to/opencode-workflow/agents/task-orchestrator.md .opencode/agents/task-orchestrator.md

# Symlink commands
for cmd in task switch load-task dashboard research plan execute commit review readme; do
  ln -s /path/to/opencode-workflow/commands/${cmd}.md .opencode/commands/${cmd}.md
done
```

Then add the `@opencode-ai/plugin` dependency:

```bash
cat > .opencode/package.json <<EOF
{
  "dependencies": {
    "@opencode-ai/plugin": "latest"
  }
}
EOF
```

- **Command file changes** (`*.md`) take effect on next command run — no restart needed.
- **Plugin file changes** (`index.ts`) require quitting and reopening OpenCode.

## Tips

- **Add `.wip/` to `.gitignore`** if you don't want workflow files in version control, or commit them for shared team context.
- **Run `/load-task`** to reload full task context after starting a new session or after compaction.
- **Run `/switch`** to jump between tasks without losing context.
- Each task is fully self-contained in its own directory — easy to archive, share, or delete.
- **Compaction-safe**: The plugin injects active task metadata into the compaction summary, so the agent retains awareness of the current task even after context trimming.

## License

MIT
