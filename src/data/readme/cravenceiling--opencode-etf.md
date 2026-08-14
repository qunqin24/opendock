# opencode-etf

**Exclude These Files** - An OpenCode plugin that prevents the AI Agent from accessing ignored files.

## Overview

`opencode-etf` acts as a guardrail for your OpenCode sessions. It automatically reads your `.gitignore` file (and defaults to blocking `.env`) to prevent the agent from accidentally reading or modifying sensitive or ignored files.

It intercepts:
- File system operations (read, write, edit)
- Bash commands (cat, grep, cp, etc.)

## Installation

Add the plugin to your `opencode.json` or `opencode.jsonc` config file:

```bash
{
  "plugin": ["@cravenceiling/opencode-etf"]
}
```

For more details on managing plugins, see the [OpenCode Plugin Documentation](https://opencode.ai/docs/plugins).

## How It Works

1.  **Scans Configuration:** On startup, it looks for `.gitignore` in your workspace root.
2.  **Intercepts Tools:** Before a tool executes, the plugin checks the target file paths.
3.  **Blocks Access:** If a path matches an ignored pattern (or is `.env`), the tool execution is blocked with an "Access denied" error.

## ⚠️ Limitations & Security Notice

**This plugin is a safety guardrail, NOT a security sandbox.**

It allows you to define "out of bounds" files to keep the context clean and prevent accidental edits to generated files or secrets. However, it relies on static string matching of arguments.

**Known Limitations:**
- **Shell Expansion Bypass:** The plugin parses command arguments as written. It does *not* simulate shell expansion.
  - ❌ `cat .env` -> **Blocked** (Explicit match)
  - ⚠️ `cat .?nv` -> **Allowed** (The plugin sees `.?nv`, which isn't ignored. Bash then expands this to `.env` and executes.)
- **Indirect Access:** Scripts or binaries run by the agent that internally access files are not monitored.
- **Visibility:** This plugin does not "hide" the existence of files (e.g., `ls -la` will still show them). It only blocks operations that attempt to read or modify them directly.

**Do not rely on this plugin to secure highly sensitive environments against malicious actors.** It is designed to prevent *accidental* context pollution and mishandling of ignored files by the AI.

## License

MIT
