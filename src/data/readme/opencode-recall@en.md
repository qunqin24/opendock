# OpenCode Recall 🧠

[![npm version](https://img.shields.io/npm/v/opencode-recall.svg)](https://www.npmjs.com/package/opencode-recall)
[![license](https://img.shields.io/npm/l/opencode-recall.svg)](https://github.com/SleepingBag945/opencode-recall/blob/main/LICENSE)

> **Tool I/O piling up and filling your context? Prune it, keep pointers, restore anytime.**

---

## ⚡️ The Core Problem

OpenCode already has a fallback mechanism that "truncates single tool outputs when they exceed limits and writes the full output to `tool-output/`" (usually with hints on how to use `grep` / `read offset/limit` / sub-agents to continue processing).

But a more common and impactful issue is: **outputs don't exceed limits, yet they accumulate in long sessions** — you're paying tokens for the same batch of historical tool I/O every single turn.

Have you experienced:

- ❌ Individual log/file reads aren't large, but after 10+ turns the context gets bloated with dozens of tool outputs (slow, expensive, prone to drift)
- ❌ Running the same command repeatedly, reading the same file repeatedly: old outputs are long "expired" but still occupy context
- ❌ Large inputs from `write`/`edit` (content/patches) become redundant after subsequent `read` fetches the latest file, yet still cost tokens in context
- ❌ After triggering compaction/summary, wanting to go back to "the original evidence at that time" for verification, but can't access it

**Recall's Solution: Turn hot context into cold storage (reversible, explorable)**

| Before Recall                                                | After Recall                                                                    |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------ |
| 🐢 Context grows fatter (duplicate/expired tool I/O)         | ⚡ Replace with `[RCL:...]` pointers; originals saved to `.opencode/rcl/blobs/` |
| 🔍 Finding key info means scrolling history/re-running tools | 🔎 `rcl_explore` sub-session reads/searches, returns only conclusions           |
| 💸 Paying tokens for historical outputs every turn           | 💰 Auto dedup/prune (no extra LLM calls), `rcl_restore`/explore when needed     |

```
┌─────────────────────────────────┬─────────────────────────────────────┐
│  Before Recall                  │  After Recall                        │
├─────────────────────────────────┼─────────────────────────────────────┤
│  [build log ~6KB]               │  [RCL:o:.opencode/rcl/blobs/... ]    │
│  [git diff ~3KB]                │  (restore_chars≈6K)                  │
│  [read src/app.ts ~2KB]         │                                      │
│  ...                            │  ↓ Restore/explore when needed       │
│                                 │  rcl_explore(path="[RCL:o:...]",     │
│                                 │             question="find errors")  │
│                                 │  rcl_restore(path="[RCL:o:...],      │
│                                 │             force=true)              │
│  Context: grows every turn 💥   │  Context: stays lean ✅               │
└─────────────────────────────────┴─────────────────────────────────────┘
```

### 📊 Real-world Results

Using the [Demo scenario](./demo/README.md) as an example: run build command twice (triggers dedup pruning) → use `rcl_explore` to extract errors from pruned logs → fix the issue and verify → generate and save project description (triggers supersedeWrites pruning) → use `rcl_restore` to recover original logs for detail verification.

**With Recall enabled, context usage ≈ 8%**

![With Recall](./assets/image-20260122005619218.png)

**Without Recall, context usage ≈ 21%**

![Without Recall](./assets/image-20260122010103460.png)

> Same 6-turn conversation, context usage reduced by ~60%.

## ✨ Core Features

- **✂️ Smart Deduplication**
  Automatically identifies duplicate `read` or `ls` operations, keeping only the latest version. Old calls are automatically folded.

- **💾 Offloading to Disk**
  When Recall identifies "duplicate/expired/superseded" tool I/O, it writes the original content to `.opencode/rcl/blobs/` (within project), leaving only `[RCL:o:...]` / `[RCL:i:...]` pointers in context.

- **🔍 Sub-agent Exploration**
  Don't want to restore an entire large file to main context? Use `rcl_explore` to spawn an independent sub-session that reads large files and extracts key information, returning only conclusions to the main session.

- **🛡️ Reversible Pruning**
  All pruned content is **safe**. You can always retrieve the complete original snapshot via `rcl_restore`.

## 🚀 Quick Installation

Zero complex configuration, works immediately.

### Let AI Install for You (Recommended)

Open OpenCode in your project directory and paste the following:

```
Install and configure opencode-recall by following the instructions here:
https://raw.githubusercontent.com/SleepingBag945/opencode-recall/refs/heads/main/INSTALL.md
```

AI will guide you through installation and configuration.

---

### Manual Installation

#### 1. Install Plugin

Add to your project's OpenCode configuration file:

```jsonc
// .opencode/opencode.jsonc
{
    "plugin": ["opencode-recall@latest"],
}
```

Then add the following content to `.opencode/rcl.jsonc`:

```jsonc
{
    "$schema": "https://raw.githubusercontent.com/SleepingBag945/opencode-recall/master/rcl.schema.json",
    // Enable or disable the plugin
    "enabled": true,
    // Enable debug logging to ~/.config/opencode/logs/rcl/
    "debug": false,
    // Notification display: "off", "minimal", or "detailed"
    "pruneNotification": "detailed",
    // Protect from pruning for <turns> message turns
    "turnProtection": {
        "enabled": false,
        "turns": 4,
    },
    // Protect file operations from pruning via glob patterns
    // Patterns match tool parameters.filePath (e.g. read/write/edit)
    "protectedFilePatterns": [],
    // Sub-agent based blob exploration (restore in a child session; return a small distilled answer)
    "explore": {
        "enabled": true,
        // Optional: override the model for the rcl_explorer sub-agent.
        // If omitted, Recall will infer a default from your OpenCode agent config.
        "agentModel": "zhipuai-coding-plan/glm-4.7",
        // Optional: override reasoning effort for the sub-agent (if your OpenCode supports variants)
        "agentVariant": "low",
        // Timeout for the sub-agent session in milliseconds
        "timeoutMs": 120000,
        // Hard cap for how many characters rcl_explore returns to the main session
        "maxResultChars": 8000,
    },
    // LLM-driven context pruning tools
    "tools": {
        // Shared settings for all prune tools
        "settings": {
            // Nudge the LLM to use prune tools (every <nudgeFrequency> tool results)
            "nudgeEnabled": true,
            "nudgeFrequency": 10,
            // Protect rcl_restore outputs for N turns before they can be pruned
            "restoreProtectionTurns": 4,
            // Block rcl_restore when content exceeds this size (bytes)
            "restoreMaxBytes": 8000,
            // Additional tools to protect from pruning
            "protectedTools": [],
        },
        // Removes tool content from context without preservation (for completed tasks or noise)
        "discard": {
            "enabled": true,
        },
        // Distills key findings into preserved knowledge before removing raw content
        "extract": {
            "enabled": true,
            // Show distillation content in the UI
            "showDistillation": false,
        },
    },
    // Automatic pruning strategies
    "strategies": {
        // Remove duplicate tool calls (same tool with same arguments)
        "deduplication": {
            "enabled": true,
            "protectedTools": [],
        },
        // Remove obsolete write inputs when file is later read
        "supersedeWrites": {
            "enabled": true,
        },
        // Remove tool errors after N turns
        "purgeErrors": {
            "enabled": true,
            "turns": 8,
            "protectedTools": [],
        },
    },
}
```

#### 2. Restart OpenCode

The plugin will automatically start working, intercepting and optimizing redundant tool outputs.

## 📖 Hands-on Experience

We've prepared a 5-minute demo script with a troubleshooting scenario to walk you through the full "prune -> explore -> restore" workflow.

👉 **[View Demo Guide](./demo/README.md)**

## 🛠️ Configuration Details

Recall works out of the box, but also supports deep customization. Configuration files are supported at `~/.config/opencode/rcl.jsonc` (global) or `.opencode/rcl.jsonc` (project-level).

```jsonc
{
    "enabled": true,
    "pruneNotification": "detailed", // "off" | "minimal" | "detailed"
    // Protect recent N turns from pruning
    "turnProtection": {
        "enabled": false,
        "turns": 4,
    },
    // Never prune these files
    "protectedFilePatterns": ["**/*.env", "**/secrets/**"],
    // Sub-agent configuration
    "explore": {
        "enabled": true,
        "agentVariant": "low", // Use low-cost model for exploration
        "maxResultChars": 4000,
    },
}
```

For more configuration options, refer to [rcl.schema.json](./rcl.schema.json).

## ❓ FAQ

**Q: If pruning saves files to disk and I need to read them back later, what's the point?**
A: Recall's core value is transforming "**hot data** (historical tool I/O that gets included in context every turn)" into "**cold data** (disk pointers, restorable/explorable on demand)".

- **Without pruning**: Even if each output is just a few KB, after 10+ turns they're still repeatedly counted in context, continuously consuming tokens.
- **After pruning**: By default, content is only restored when needed; it's recommended to use `rcl_explore` to read/search and bring back conclusions, avoiding stuffing the original content back into main context.

**Q: How do I know what content was pruned?**
A: The plugin shows Toast notifications in OpenCode indicating how many tokens were saved. Context also retains `[RCL:...]` markers as clues.

## Development & Contributing

```bash
# Build
npm run build

# Local debugging (link to OpenCode)
# .opencode/opencode.jsonc
{ "plugin": ["file:///abs/path/to/opencode-recall/dist/index.js"] }
```

## Attribution

This project is inspired by `@tarquinen/opencode-dcp`, with added features like "reversible restoration" and "sub-agent exploration".
