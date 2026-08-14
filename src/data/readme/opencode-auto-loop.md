# opencode-auto-loop

Auto Loop plugin for [opencode](https://opencode.ai) — auto-continues until task completion.

## Installation

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-auto-loop"]
}
```

Restart opencode. That's it!

On first run, the plugin will automatically install skills and commands to your `~/.config/opencode/` directory.

## Usage

### Start a loop

```
/auto-loop "Build a REST API with authentication"
```

The AI will work on your task and automatically continue until completion.

### Cancel a loop

```
/cancel-auto-loop
```

### Get help

```
/auto-loop-help
```

## How it works

1. `/auto-loop` creates a state file at `.opencode/auto-loop.local.md`
2. When the AI goes idle, the plugin checks if `<promise>DONE</promise>` was output
3. If not found, it extracts progress (## Completed / ## Next Steps) and injects a continuation prompt
4. Loop continues until DONE is found or max iterations (25) reached
5. State file is deleted when complete
6. Loop context survives session compaction

### Progress Tracking

The plugin extracts `## Completed` and `## Next Steps` sections from each iteration and persists them in the state file. On continuation, these are included in the prompt so the AI knows exactly where to pick up.

### Completion Promise

When the AI finishes a task, it outputs:

```
<promise>DONE</promise>
```

The AI should ONLY output this when the task is COMPLETELY and VERIFIABLY finished.

## State File

The loop state is stored in your project directory:

```
.opencode/auto-loop.local.md
```

Format (markdown with YAML frontmatter):

```markdown
---
active: true
iteration: 3
maxIterations: 25
sessionId: ses_abc123
---

Your original task prompt

## Completed
- [x] Set up project structure
- [x] Created database schema

## Next Steps
- [ ] Add JWT authentication middleware
- [ ] Create registration endpoint
```

Add `.opencode/auto-loop.local.md` to your `.gitignore`.

## Features

- **Plug-and-play**: Just add to config and restart
- **Auto-setup**: Skills and commands are automatically installed on first run
- **Progress tracking**: Extracts and persists TODOs across iterations
- **Compaction-safe**: Loop context survives session compaction
- **Project-relative**: State file in `.opencode/`, not global
- **Completion detection**: Scans session messages for DONE promise (ignores code fences)
- **Toast notifications**: Visual feedback on loop start, iteration, completion
- **Error handling**: Pauses on session errors, cleans up on session deletion
- **Debounced**: Prevents duplicate continuations from rapid idle events
- **Commands**: `/auto-loop`, `/cancel-auto-loop`, and `/auto-loop-help`

## Architecture

```
opencode-auto-loop/
├── src/
│   └── index.ts          # Main plugin with event hooks and tools
├── skills/
│   ├── auto-loop/        # Progressive context for starting loops
│   ├── cancel-auto-loop/      # Context for cancellation
│   └── help/             # Plugin documentation
├── commands/
│   ├── auto-loop.md      # Slash command for starting
│   ├── cancel-auto-loop.md    # Slash command for cancelling
│   └── help.md           # Slash command for help
├── tsconfig.json
└── package.json
```

## License

MIT
