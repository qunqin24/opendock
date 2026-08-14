# Dynamic Context Pruning Plugin (Fork)

[![npm version](https://img.shields.io/npm/v/@vikrant82/opencode-dcp.svg)](https://www.npmjs.com/package/@vikrant82/opencode-dcp)

> **This is a personal fork of [`@tarquinen/opencode-dcp`](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning) with additional optimizations for aggressive context reduction.**

## Fork Improvements

### On-Demand Pruning (`/dcp prune` & `/dcp unprune`)

Adds deliberate, LLM-free context cleanup: `/dcp prune` marks completed and
errored tool outputs older than N LLM steps for removal, without waiting for
automatic strategies or the next compression. Supports `--dry-run` previews
with estimated token savings and explicit `--tools` glob selection that
overrides the default protections; `/dcp unprune` reverts the last prune batch
(`--all` reverts everything). Placeholders land on the next request; stored
session history is never touched.

```
/dcp prune --older-than 150 --dry-run   # preview candidates + estimated savings
/dcp prune --older-than 150             # prune; recorded as an undoable batch
/dcp unprune [--all]                    # revert the last batch (or all batches)
```

See [On-demand pruning (no LLM)](#on-demand-pruning-no-llm) under Commands for
full syntax and edge cases.

### Stale Tool Pruning (`staleTools` strategy)

Automatically prunes completed tool outputs after a configurable number of turns (default: 3). In the upstream plugin, only errored tool calls were pruned — completed tool outputs (often 75%+ of context) were never cleaned up. This strategy continuously marks old tool outputs for removal, significantly reducing context size between compression events.

```jsonc
"strategies": {
    "staleTools": {
        "enabled": true,       // Enable stale tool pruning
        "turns": 3,            // Prune completed tools older than N turns
        "protectedTools": []   // Additional tools to protect (added to defaults)
    }
}
```

### Strategies Run in Hook Pipeline

Upstream only runs pruning strategies (`purgeErrors`, `deduplicate`) during compress tool preparation. This fork runs all strategies on **every hook invocation**, so `state.prune.tools` is populated before `pruneToolOutputs` executes. Tool outputs are cleaned up immediately instead of waiting for the next compression event.

### Configurable Summary Budget (`compress.summaryBudget`)

Adds a character budget for compression summaries (default: 0 / disabled). When set, the compress tool prompt instructs the LLM to keep summaries within the budget, preventing oversized summaries that negate the savings from compression.

```jsonc
"compress": {
    "summaryBudget": 2000    // Max chars per summary (0 = disabled)
}
```

### Smarter Nudge Thresholds (`compress.minSavingsThreshold`)

Adds a minimum token savings threshold for compression nudges (default: 0 / disabled). When context is between min/max limits, the plugin estimates how many tokens are actually compressible. If below the threshold, the nudge is suppressed — avoiding wasteful compressions that destroy prompt cache for negligible savings.

```jsonc
"compress": {
    "minSavingsThreshold": 5000    // Min estimated token savings to nudge (0 = disabled)
}
```

### Enhanced Debug Logging

When `debug: true`, logs detailed metrics for stale tool pruning (token counts, tool names), summary budget compliance (over-budget warnings), nudge threshold decisions, and per-invocation session metrics.

---

Automatically reduces token usage in OpenCode by managing conversation context.

![DCP in action](assets/images/dcp-demo9.png)

## Installation

### Prerequisites

**Bun is required.** OpenCode uses Bun to install npm plugins at startup. If Bun is not installed, the plugin install will silently fail.

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install

From the CLI:

```bash
opencode plugin @vikrant82/opencode-dcp@latest --global
```

Or manually add to your `~/.config/opencode/opencode.json`:

```json
{
    "plugin": ["@vikrant82/opencode-dcp"]
}
```

Then restart OpenCode. The plugin is cached in `~/.cache/opencode/packages/`.

### Verify

After restarting, check the DCP log to confirm the plugin loaded:

```bash
grep "DCP initialized" ~/.config/opencode/logs/dcp/daily/$(date +%Y-%m-%d).log
# Expected: INFO DCP initialized | version=3.3.2 | strategies={...}
```

### Troubleshooting

If no DCP log appears after restart, check the OpenCode system log for errors:

```bash
# Find the latest log
ls -lt ~/.local/share/opencode/log/ | head -2

# Search for plugin errors
grep -i "vikrant82\|dcp\|failed" ~/.local/share/opencode/log/<latest>.log
```

Common issues:

- **`ENOENT ... failed to resolve plugin server entry`** — Bun/npm install failed. Clear cache and retry: `rm -rf ~/.cache/opencode/packages/@vikrant82`
- **No plugin lines at all** — Check that `@vikrant82/opencode-dcp` is in the `plugin` array in `opencode.json`
- **Plugin loaded but wrong version** — Clear cache: `rm -rf ~/.cache/opencode/packages/@vikrant82` and restart

## Project Status

Development on DCP has slowed because most new context-management work has moved to [Sleev](https://sleev.ai) and the `sleev` CLI. Sleev is a local proxy for Claude Code, Codex, and OpenCode that builds on DCP's core ideas with newer context-management features and will work with any harness/client.

DCP remains available for OpenCode plugin users, but new features are landing in Sleev first. If you are starting fresh, we recommend trying Sleev:

```bash
npm i -g sleev
sleev
```

## How It Works

DCP reduces context size through a compress tool and automatic cleanup. Your session history is never modified — DCP replaces pruned content with placeholders before sending requests to your LLM.

### Compress

Compress is a tool exposed to your model that replaces closed, stale conversation content with high-fidelity technical summaries. You can think of this as a much smarter version of Opencode's compaction process. Instead of triggering statically when your session reaches its maximum context and on the entire coding session, Compress allows the model to pick when to activate based on task completion, and to only compress the specific messages that are no longer needed verbatim.

DCP supports two compression modes:

- `range` mode compresses contiguous spans of conversation into one or more summaries.
- `message` mode (experimental) compresses individual raw messages independently, letting the model manage context much more surgically.

In `range` mode, when a new compression overlaps an earlier one, the earlier summary is nested inside the new one so information is preserved through layers of compression rather than diluted away. In both modes, protected tool outputs (such as subagents and skills) and protected file patterns are kept in compression summaries, ensuring that the most important information is never lost. You can also enable `protectUserMessages` to preserve your messages verbatim during compression, though note that large prompts (e.g. copy-pasting log files in the prompt) will then never be compressed away.

### Deduplication

Identifies repeated tool calls (same tool, same arguments) and keeps only the most recent output. Recalculated when the compress tool runs, so prompt cache is only impacted alongside compression.

### Purge Errors

Prunes inputs from errored tool calls after a configurable number of turns (default: 4). Error messages are preserved; only the potentially large input content is removed. Recalculated on compress tool use.

## Configuration

DCP uses its own config file, searched in order:

1. Global: `~/.config/opencode/dcp.jsonc` (or `dcp.json`), created automatically on first run
2. Custom config directory: `$OPENCODE_CONFIG_DIR/dcp.jsonc` (or `dcp.json`), if `OPENCODE_CONFIG_DIR` is set
3. Project: `.opencode/dcp.jsonc` (or `dcp.json`) in your project's `.opencode` directory

Each level overrides the previous, so project settings take priority over global. Restart OpenCode after making config changes.

> [!NOTE]
> If you use models with smaller context windows, such as GitHub Copilot models or local models, lower `compress.minContextLimit` and `compress.maxContextLimit` in your configuration to match the available context.

> [!IMPORTANT]
> Defaults are applied automatically. Expand this if you want to review or override settings.

<details>
<summary><strong>Default Configuration</strong> (click to expand)</summary>

```jsonc
{
    "$schema": "https://raw.githubusercontent.com/Opencode-DCP/opencode-dynamic-context-pruning/master/dcp.schema.json",
    // Enable or disable the plugin
    "enabled": true,
    // Automatically update npm-installed DCP when a newer npm latest is available.
    // Version-locked plugin specs are not updated.
    "autoUpdate": true,
    // Enable debug logging to ~/.config/opencode/logs/dcp/
    "debug": false,
    // Notification display: "off", "minimal", or "detailed"
    "pruneNotification": "detailed",
    // Notification type: "chat" (in-conversation) or "toast" (system toast)
    "pruneNotificationType": "chat",
    // Slash commands configuration
    "commands": {
        "enabled": true,
        // Additional tools to protect from pruning via commands (e.g., /dcp sweep)
        "protectedTools": [],
    },
    // Manual mode: disables autonomous context management,
    // tools only run when explicitly triggered via /dcp commands
    "manualMode": {
        "enabled": false,
        // When true, automatic cleanup (deduplication, purgeErrors)
        // still runs even in manual mode
        "automaticStrategies": true,
    },
    // Protect from pruning for <turns> message turns past tool invocation
    "turnProtection": {
        "enabled": false,
        "turns": 4,
    },
    // Experimental settings
    "experimental": {
        // Allow DCP processing in subagent sessions
        "allowSubAgents": false,
        // Enable user-editable prompt overrides under dcp-prompts directories
        // When false (default), prompt override files/directories are ignored
        "customPrompts": false,
    },
    // Protect file operations from pruning via glob patterns
    // Patterns match tool parameters.filePath (e.g. read/write/edit)
    "protectedFilePatterns": [],
    // Unified context compression tool and behavior settings
    "compress": {
        // Compression mode: "range" (compress spans into block summaries)
        // or experimental "message" (compress individual raw messages)
        "mode": "range",
        // Permission mode: "allow" (no prompt), "ask" (prompt), "deny" (tool not registered)
        "permission": "allow",
        // Show compression content in a chat notification
        "showCompression": false,
        // Let active summary tokens extend the effective maxContextLimit
        "summaryBuffer": true,
        // [FORK] Max characters for compression summaries (0 = disabled).
        // When set, the compress tool prompt instructs the LLM to keep
        // summaries within this budget.
        "summaryBudget": 0,
        // [FORK] Minimum estimated compressible tokens to trigger a nudge
        // (0 = disabled). When context is between min/max limits and
        // estimated savings are below this, the nudge is suppressed.
        "minSavingsThreshold": 0,
        // Soft upper threshold: above this, DCP keeps injecting strong
        // compression nudges (based on nudgeFrequency), so compression is
        // much more likely. Accepts: number or "X%" of model context window.
        "maxContextLimit": 100000,
        // Soft lower threshold for reminder nudges: below this, turn/iteration
        // reminders are off (compression less likely). At/above this, reminders
        // are on. Accepts: number or "X%" of model context window.
        "minContextLimit": 50000,
        // Optional per-model override for maxContextLimit by providerID/modelID.
        // If present, this wins over the global maxContextLimit.
        // Accepts: number or "X%".
        // Example:
        // "modelMaxLimits": {
        //     "openai/gpt-5.3-codex": 120000,
        //     "anthropic/claude-sonnet-4.6": "80%"
        // },
        // Optional per-model override for minContextLimit.
        // If present, this wins over the global minContextLimit.
        // "modelMinLimits": {
        //     "openai/gpt-5.3-codex": 50000,
        //     "anthropic/claude-sonnet-4.6": "25%"
        // },
        // How often the context-limit nudge fires (1 = every fetch, 5 = every 5th)
        "nudgeFrequency": 5,
        // Start adding compression reminders after this many
        // messages have happened since the last user message
        "iterationNudgeThreshold": 15,
        // Controls how likely compression is after user messages
        // ("strong" = more likely, "soft" = less likely)
        "nudgeForce": "soft",
        // Tool names whose completed outputs are appended to the compression
        "protectedTools": [],
        // Preserve text wrapped in <protect>...</protect> when compressed
        "protectTags": false,
        // Preserve your messages during compression.
        // Warning: large copy-pasted prompts will never be compressed away
        "protectUserMessages": false,
    },
    // Automatic pruning strategies
    "strategies": {
        // [FORK] Prune completed tool outputs after N turns
        "staleTools": {
            "enabled": true,
            // Number of turns before completed tool outputs are pruned
            "turns": 3,
            // Additional tools to protect from pruning
            // (`skill` is already protected by default)
            "protectedTools": [],
        },
        // Remove duplicate tool calls (same tool with same arguments)
        "deduplication": {
            "enabled": true,
            // Additional tools to protect from pruning
            "protectedTools": [],
        },
        // Prune tool inputs for errored tools after X turns
        "purgeErrors": {
            "enabled": true,
            // Number of turns before errored tool inputs are pruned
            "turns": 4,
            // Additional tools to protect from pruning
            "protectedTools": [],
        },
    },
}
```

</details>

### Commands

DCP provides a TUI panel and one prompt-producing slash command:

- `/dcp` — Opens the DCP panel with context, stats, and manual-mode controls.
- `/dcp-compress [focus]` — Asks the model to run one compression pass. Optional focus text directs what content to compress, following the active `compress.mode`.

### On-demand pruning (no LLM)

`/dcp prune` marks old tool outputs for removal from the outbound prompt. Placeholders land on the
next request; stored session history is never touched, and `/dcp unprune` reverts.

```
/dcp prune --older-than 150                                       # completed + errored tools ≥150 LLM steps old
/dcp prune --older-than 150 --tools serena_*,codebase-memory-*    # only these tool globs (overrides protection)
/dcp prune --older-than 150 --dry-run                             # preview candidates + estimated savings
/dcp unprune                                                      # revert the last prune batch
/dcp unprune --all                                                # revert all manual prune batches
```

Notes:

- `question`, `edit`, and `write` outputs are skipped unless explicitly selected via `--tools`.
- Tools already inside active compression blocks, or already pruned, are skipped (reported).
- Prune batches persist with the session state; undo survives restarts.

### Prompt Overrides

DCP exposes six editable prompts:

- `system`
- `compress-range`
- `compress-message`
- `context-limit-nudge`
- `turn-nudge`
- `iteration-nudge`

This feature is disabled by default. Set `experimental.customPrompts` to `true` in your DCP config to activate it.

When enabled, managed defaults are written to `~/.config/opencode/dcp-prompts/defaults/` as plain-text prompt files. A single `README.md` in that directory explains each prompt and how to create overrides.

To customize behavior, add a file with the same name under an overrides directory and edit it as plain text.

To reset an override, delete the matching file from your overrides directory.

### Protected Tools

By default, these tools are always protected from pruning:
`task`, `skill`, `todowrite`, `todoread`, `compress`, `batch`, `plan_enter`, `plan_exit`, `write`, `edit`, `get_feedback`

The `protectedTools` arrays in `commands` and `strategies` add to this default list.

For the `compress` tool, `compress.protectedTools` ensures specific tool outputs are appended to the compressed summary. By default it includes `task`, `skill`, `todowrite`, and `todoread`.

## Impact on Prompt Caching

LLM providers cache prompts based on exact prefix matching. When DCP prunes content, it changes messages, which invalidates cached prefixes from that point forward.

**Trade-off:** You lose some cache reads but gain token savings from reduced context size and fewer hallucinations from stale context. In most cases, especially in long sessions, the savings outweigh the cache miss cost.

> [!NOTE]
> In testing, cache hit rates were approximately 85% with DCP vs 90% without.

**No impact for:**

- **Request-based billing** — Providers like GitHub Copilot that charge per request, not tokens.
- **Uniform token pricing** — Providers like Cerebras that bill cached and uncached tokens at the same rate.

## License

AGPL-3.0-or-later
