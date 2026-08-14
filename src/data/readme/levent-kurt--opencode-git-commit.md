# Git Autocommit Plugin for OpenCode

[![npm version](https://badge.fury.io/js/@levent-kurt%2Fgit-autocommit.svg)](https://badge.fury.io/js/@levent-kurt%2Fgit-autocommit)

An OpenCode plugin that automatically commits changes when your coding session becomes idle.

## What It Does

This plugin monitors your OpenCode session and automatically creates git commits when:

1. The session goes idle (no active operations)
2. There are uncommitted changes in your working directory
3. A git repository exists (or can be initialized)

The commit message is intelligently extracted from the last assistant message in your conversation, making commits contextual and meaningful.

## Features

- **Automatic Commits** - Commits changes whenever your session becomes idle
- **Smart Commit Messages** - Extracts context from your last conversation to create meaningful commit messages
- **Auto-initialize** - Automatically initializes a git repository if one doesn't exist
- **Respects .gitignore** - Git handles ignored files automatically
- **Conventional Commits** - Uses `feat:` or `fix:` prefixes based on message content

## Installation

### Via Command Line
```bash
opencode plugin "@levent-kurt/git-autocommit@latest"
```

### Via Configuration
Add to your `.opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@levent-kurt/git-autocommit@latest"
  ]
}
```

### Manual Installation
```bash
npm install @levent-kurt/git-autocommit
```

Then add to `.opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///path/to/node_modules/@levent-kurt/git-autocommit/dist/index.js"
  ]
}
```

## How It Works

1. When a `session.idle` event is triggered, the plugin checks for git changes
2. If changes exist, it fetches the last assistant message from your session
3. Extracts the first line, sanitizes it, and uses it as the commit message
4. Stages all changes with `git add .`
5. Commits with `--no-verify` to bypass hooks

## Configuration

The plugin works out of the box with no configuration needed. Just install and it will start auto-committing.

## Requirements

- OpenCode with plugin support
- Node.js (for running the plugin)
- Git installed on your system

## License

MIT