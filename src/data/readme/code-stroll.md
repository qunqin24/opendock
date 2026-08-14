# code-stroll

Interactive code review learning mode for [opencode](https://github.com/anthropics/opencode).

## What it does

Turns code review into a learning session. Presents diff changes grouped
semantically, one chunk at a time, with Q&A and proactive explanations.

## Requirements

- [opencode](https://github.com/anthropics/opencode) installed in your project
- Git

## Installation

1. Add the plugin to your project's `opencode.json`:

```json
{
  "plugin": ["code-stroll"]
}
```

2. Install the slash command and review agent:

```bash
npx code-stroll init
```

This copies the command and agent files into your project's `.opencode/` directory. The plugin itself is installed automatically by opencode at startup.

### Verify installation

After installing, check that the files are in place:

```
your-project/
  opencode.json                        ← plugin registered here
  .opencode/
    commands/
      code-stroll.md     ← slash command entry point
    agents/
      review-agent.md    ← conversational review agent
```

## Usage

```
/code-stroll                          # review current branch vs main
/code-stroll --depth skim             # flag concerns only
/code-stroll --focus auth,api         # only review these directories
/code-stroll --base develop           # diff against develop instead of main
/code-stroll --resume                 # continue previous session
```

### Depth modes

- **deep** (default): Explains architectural rationale, notes patterns and alternatives.
- **skim**: Flags high-severity concerns only (security issues, missing error handling). Keeps explanations under 3 sentences.

### Session controls

During a review session, use these signals to advance:

- `next`, `continue`, `move on` — advance to next chunk
- `skip` — skip current chunk
- `done` — end session early

Ask questions at any point — the review agent will answer before moving on.

### Resume

Sessions are persisted to `.opencode/review-session.json`. Use `--resume` to pick up where you left off.

## How it works

1. Plugin creates an isolated git worktree for the branch under review
2. Runs `git diff` between the branch and base
3. LLM pre-analysis groups diff hunks semantically (falls back to file-based grouping on error)
4. Groups are presented one at a time with concerns flagged
5. Review agent opens Q&A for each group
6. Session state is saved after each chunk advance

## Design

See `docs/plans/2026-03-01-code-stroll-design.md` for full architecture.
