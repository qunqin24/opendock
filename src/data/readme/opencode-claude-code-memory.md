# OpenCode Claude Code Memory Plugin

Share Claude Code memory with OpenCode.

`opencode-claude-code-memory` is an OpenCode plugin for Claude Code memory. It loads local Claude Code memory into OpenCode sessions, lets OpenCode read and update the same files, and keeps that shared memory available across longer OpenCode conversations.

It lets OpenCode:

- load Claude Code memory at the start of a session
- search and read memory files through a `claude_memory` tool
- write updates back into the same Claude memory directory
- keep memory hints available during OpenCode compaction

This plugin is useful if you already rely on Claude Code auto-memory and want OpenCode to work with the same project memory instead of building a separate memory store.

If you have searched for any of these, you are in the right place:

- OpenCode Claude memory plugin
- Claude Code memory in OpenCode
- shared memory between Claude Code and OpenCode
- OpenCode persistent memory with Claude Code

## Why This Exists

Claude Code already stores memory in a local per-project directory under `~/.claude/projects/.../memory`.

OpenCode has a strong plugin API, but it does not natively read Claude Code memory. This plugin fills that gap with a local-only workflow:

- no external database
- no hosted memory service
- no extra sync layer

If the Claude memory directory is missing for a project, the plugin stays quiet until there is memory to load, but the tool and review flows can still create the shared memory directory when needed.

## Features

- One-time session memory injection for better efficiency than re-injecting memory on every prompt
- Shared memory files between Claude Code and OpenCode
- Claude-compatible canonical git-root and worktree resolution
- Recursive topic-file loading, reading, and search
- `claude_memory` tool with `list`, `read`, `search`, `add`, and `update`
- Idle-session review that can save new learnings back into Claude memory
- Turn-level memory suppression when you tell OpenCode to ignore memory
- Toast notifications for memory load, review, and updates
- Compaction context support so memory remains visible after long-session summarization
- Safer file handling that keeps tool-driven writes inside the Claude memory directory

## How It Works

1. The plugin maps the current project or worktree to Claude Code's memory directory layout under `~/.claude/projects`.
2. On the first message of a session, it injects memory context into OpenCode.
3. The agent can later use the `claude_memory` tool to inspect or update memory files.
4. If you say to ignore memory for a turn, the plugin suppresses its injected memory context for that request.
5. If enabled, the plugin can ask OpenCode to review an idle session and write useful learnings back to Claude memory.

## Installation

To install from npm, add the package name to OpenCode config.

OpenCode installs npm plugins automatically at startup, so you do not need to run `npm install` yourself.

In `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-claude-code-memory"
  ]
}
```

Restart OpenCode after editing the config. On startup, OpenCode will install `opencode-claude-code-memory` automatically.

### With Options
If you want to customize it:

```json
{
  "plugin": [
    [
      "opencode-claude-code-memory",
      {
        "injectMode": "once",
        "initialLoadMode": "full",
        "compactionMode": "index",
        "autoReview": true
      }
    ]
  ]
}
```

### Local Repo Instead Of npm

If you prefer a local checkout:

```bash
git clone https://github.com/ngvoicu/opencode-claude-code-memory.git ~/Projects/ngvoicu/opencode-claude-code-memory
```

Then use:

```json
{
  "plugin": [
    [
      "file:///Users/your-user/Projects/ngvoicu/opencode-claude-code-memory",
      {
        "showLoadToast": true,
        "showReviewToast": true,
        "showUpdateToast": true
      }
    ]
  ]
}
```

## Configuration

All plugin options are optional.

| Option | Type | Default | Description |
|---|---|---:|---|
| `memoryRoot` | `string` | `~/.claude/projects` | Base Claude Code memory directory |
| `injectMode` | `"once" \| "always"` | `"once"` | Inject memory once per session or on every message |
| `initialLoadMode` | `"full" \| "index"` | `"full"` | Load full Claude memory or only `MEMORY.md` + topic list |
| `compactionMode` | `"none" \| "index" \| "full"` | `"index"` | Extra memory context during OpenCode compaction |
| `autoReview` | `boolean` | `true` | Review idle sessions and write useful learnings back to Claude memory |
| `minMessagesForExtraction` | `number` | `4` | Minimum session message count before auto-review can run |
| `minNewMessagesForReview` | `number` | `4` | Minimum new messages since the previous review |
| `maxIndexLines` | `number` | `200` | Max lines from `MEMORY.md` in trimmed contexts |
| `maxIndexBytes` | `number` | `25600` | Max bytes from `MEMORY.md` in trimmed contexts |
| `showLoadToast` | `boolean` | `true` | Show a toast when memory is injected |
| `showReviewToast` | `boolean` | `true` | Show a toast when auto-review starts |
| `showUpdateToast` | `boolean` | `true` | Show a toast when memory files are updated |
| `memoryUpdateToastDebounceMs` | `number` | `1500` | Debounce repeated update toasts |
| `debug` | `boolean` | `false` | Log plugin errors to stderr |

### Temporarily Ignore Memory

If you want a fresh-context answer for one turn, say something like:

- `ignore memory for this`
- `do not use memory`
- `answer without memory`

You can also set `OPENCODE_MEMORY_IGNORE=1` to suppress injected memory context.

### Recommended Local Config

If you want OpenCode to behave as close as possible to Claude Code memory while staying efficient:

```json
{
  "plugin": [
    [
      "file:///Users/your-user/Projects/ngvoicu/opencode-claude-code-memory",
      {
        "injectMode": "once",
        "initialLoadMode": "full",
        "compactionMode": "index"
      }
    ]
  ]
}
```

## Tool Reference

The plugin exposes a `claude_memory` tool.

### `list`

Lists the current memory directory, `MEMORY.md`, and topic files.

### `read`

- `read` with no file returns `MEMORY.md` plus all topic files
- `read` with `file` returns the requested memory file

### `search`

Keyword search across `MEMORY.md` and topic files.

### `add`

Appends content to `MEMORY.md`.

### `update`

Replaces or creates a memory file inside the Claude memory directory.

## SEO / Discoverability

This repository is intentionally optimized for people searching for:

- OpenCode Claude memory plugin
- Claude Code memory in OpenCode
- OpenCode persistent memory with Claude Code
- shared memory between Claude Code and OpenCode
- Claude Code memory bridge for OpenCode
- local persistent memory for OpenCode

The README, package metadata, and GitHub topics are all written around those use cases.

## Security Notes

- This plugin only works with local Claude memory files.
- It does not send memory to a hosted service on its own.
- `claude_memory update` is restricted to paths inside the resolved Claude memory directory.
- Automatic session review is enabled by default and can be turned off with `autoReview: false`.

## Comparison: `opencode-supermemory`

[`opencode-supermemory`](https://github.com/supermemoryai/opencode-supermemory) is a different approach:

- it uses Supermemory as an external memory service
- it supports cross-project user memory and semantic retrieval
- it is not tied to Claude Code's local memory file format

`opencode-claude-code-memory` is intentionally narrower:

- local-file based
- Claude Code compatible
- no extra memory backend required

If you specifically want OpenCode to reuse Claude Code's existing memory files, this plugin is the closer fit.

## Development

```bash
cd ~/Projects/ngvoicu/opencode-claude-code-memory
npm install
npm run verify
```

## License

MIT
