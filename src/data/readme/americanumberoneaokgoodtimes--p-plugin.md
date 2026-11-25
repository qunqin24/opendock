# Prompt Manager for agentic coding harness platforms (`p-plugin`)

A prompt manager plugin for **Antigravity**, **Claude Code**, and **OpenCode** that lets you save, edit, list, and send reusable prompt instructions (templates) by ID using `/p <id>` and edit using `/p e <id> <text>`.

Built with zero external runtime dependencies (Node.js `>= 18`), it pairs deterministic pre-model hook interception with a `SKILL.md` slash command, a stdio MCP server, and a standalone CLI.

---

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
  - [Antigravity (App, CLI, IDE)](#antigravity-app-cli-ide)
  - [Claude Code](#claude-code)
  - [OpenCode](#opencode)
- [Usage](#usage)
  - [Save or Edit a Prompt (`/p e <id> <text>`)](#save-or-edit-a-prompt-p-e-id-text)
  - [Inspect a Saved Prompt (`/p e <id>`)](#inspect-a-saved-prompt-p-e-id)
  - [Send a Saved Prompt (`/p <id>`)](#send-a-saved-prompt-p-id)
  - [Delete a Saved Prompt (`/p d <id>`)](#delete-a-saved-prompt-p-d-id)
  - [List Saved Prompts (`/p`)](#list-saved-prompts-p)
  - [Manage Prompts via Natural Language (MCP Tools)](#manage-prompts-via-natural-language-mcp-tools)
  - [Standalone CLI (`scripts/p.mjs`)](#standalone-cli-scriptspmjs)
- [Storage & Cross-Tool Sync](#storage--cross-tool-sync)
- [Testing & Validation](#testing--validation)
- [Troubleshooting](#troubleshooting)

---

## Requirements

- **Node.js `>= 18`** available on your `PATH` as `node`.
- No `npm install` step is required.

---

## Installation

### Antigravity (App, CLI, IDE)

#### Option 1: Install globally from a local clone

```bash
git clone https://github.com/americanumberoneaokgoodtimes/prompt-manager-plugin-opencode-claude-agy-etc.git agy-plugin-p
agy plugin install ./agy-plugin-p
```

On Windows PowerShell:

```powershell
agy plugin install C:\path\to\agy-plugin-p
```

#### Option 2: Install directly from GitHub

```bash
agy plugin install https://github.com/americanumberoneaokgoodtimes/prompt-manager-plugin-opencode-claude-agy-etc
```

#### Option 3: Load per-workspace (without global install)

Copy or symlink the repository into `.agents/plugins/prompt-manager` inside any project workspace.

#### Verify & manage in Antigravity

```bash
agy plugin validate ./agy-plugin-p
agy plugin list
agy plugin enable prompt-manager
agy plugin disable prompt-manager
agy plugin uninstall prompt-manager
```

Inside an interactive Antigravity CLI session, run `/skills` (or `/skills reload`) to confirm `/p` is loaded, `/hooks` to inspect the `PreInvocation` hook, and `/mcp` to see the `prompts` MCP server.

---

### Claude Code

This repository includes `.claude-plugin/plugin.json`, `hooks/hooks.json` (`UserPromptSubmit`), `.mcp.json`, and `skills/p/SKILL.md`.

> **Note:** Claude Code namespaces plugin skills as `/prompt-manager:p` in the slash-command menu (both `/p ...` and `/prompt-manager:p ...` are handled by the `UserPromptSubmit` hook).

#### Option 1: Install as a plugin

```bash
claude plugin install /path/to/agy-plugin-p
```

Or inside Claude Code chat:

```text
/plugin install /path/to/agy-plugin-p
```

#### Option 2: Load for a single session

```bash
claude --plugin-dir /path/to/agy-plugin-p
```

---

### OpenCode

This repository exports the OpenCode plugin from `package.json` and `opencode/plugin.js`, registering `/p`, `command.execute.before`, `chat.message`, and the local `prompt-manager` MCP server automatically.

#### Option 1: Install via `opencode plugin add` (recommended)

```bash
opencode plugin add @americanumberoneaokgoodtimes/p-plugin
```

#### Option 2: Reference in `opencode.json`

Add `@americanumberoneaokgoodtimes/p-plugin` to `~/.config/opencode/opencode.json` (global) or `./opencode.json` (project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@americanumberoneaokgoodtimes/p-plugin"
  ]
}
```

#### Option 3: Reference local file path URL

Add the plugin file URL to `~/.config/opencode/opencode.json` (global) or `./opencode.json` (project):

macOS / Linux:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///path/to/agy-plugin-p/opencode/plugin.js"
  ]
}
```

Windows:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///C:/path/to/agy-plugin-p/opencode/plugin.js"
  ]
}
```

---

## Usage

### Save or Edit a Prompt (`/p e <id> <text>`)

Use `e` as the first argument to add a new prompt or overwrite an existing one:

```text
/p e 1 "begin doing the things you do best, but only if you think it's the best thing to do. Begin if you think you're ready, and if not then ask me about it for more information"
```

- **ID rules**: `<saved_prompt_ID>` can be numeric (`1`, `2`) or named (`review`, `plan-api`), cannot contain whitespace, and cannot be `e` (reserved for edit/inspect) or `d` (reserved for delete).
- **Quoting**: Outer matching `"..."` or `'...'` quotes are stripped (with `\"` / `\'` / `\\` unescaped). Unquoted multi-word text and multi-line prompts are also preserved:
  ```text
  /p e review Review staged git changes for bugs, edge cases, and missing tests
  ```
- **Safe save behavior**: Saving confirms that the ID was stored or updated **without** executing the saved text as an instruction.

---

### Inspect a Saved Prompt (`/p e <id>`)

Run `/p e <id>` (with no text) to view the full saved text for `<id>` before overwriting or deleting it:

```text
/p e 1
```

---

### Send a Saved Prompt (`/p <id>`)

Pass any saved ID (other than `e` or `d`) as the first argument to expand and send that saved instruction to the agent:

```text
/p 1
```

You can also append extra per-turn context after the ID:

```text
/p review focus on src/auth/session.ts
```

- If the ID exists, the stored instruction is sent to the model (with any trailing text appended).
- If the ID does not exist, the hook reports that it was not found, lists currently saved IDs, and shows how to create it with `/p e <id> "<text>"`.

---

### Delete a Saved Prompt (`/p d <id>`)

Use `d` as the first argument to remove a saved prompt by ID:

```text
/p d 1
```

---

### List Saved Prompts (`/p`)

Run `/p` with no arguments to view all saved prompt IDs, previews, and command syntax:

```text
/p
```

---

### Manage Prompts via Natural Language (MCP Tools)

When the bundled MCP server (`prompts` in Antigravity/Claude Code, `prompt-manager` in OpenCode) is active, you can also manage prompts conversationally:

- *"List my saved prompts"* → calls `list_prompts`
- *"Show the full text of saved prompt `1`"* → calls `get_prompt`
- *"Save a prompt under ID `docs` to write concise JSDoc comments"* → calls `save_prompt`
- *"Delete saved prompt `1`"* → calls `delete_prompt`

---

### Standalone CLI (`scripts/p.mjs`)

You can manage your prompt store directly from any terminal (or via `p` if linked with `npm link`):

```bash
# List all saved prompts (add --json for JSON output)
node scripts/p.mjs list

# Print a saved prompt by ID (add --json for metadata + timestamps)
node scripts/p.mjs get 1

# Add or update a prompt (or pipe stdin / pass --stdin for multi-line text)
node scripts/p.mjs set 1 "Check every edge case carefully"
cat prompt.txt | node scripts/p.mjs set 1

# Delete a prompt
node scripts/p.mjs delete 1

# Print the active prompt store path
node scripts/p.mjs path
```

---

## Storage & Cross-Tool Sync

Prompts are stored atomically as JSON (`{ "version": 1, "prompts": { ... } }`). The store path is resolved in this order:

1. `PROMPT_MANAGER_STORE_PATH` — explicit file path override (supports leading `~/`)
2. `~/.prompt-manager/prompts.json` — shared default across Antigravity, Claude Code, OpenCode, and `scripts/p.mjs` (used if already present)
3. Existing legacy/tool store if present (`${PLUGIN_DATA}/prompts.json`, `${CLAUDE_PLUGIN_DATA}/prompts.json`, or `~/.gemini/config/prompt-manager/prompts.json`)
4. `~/.prompt-manager/prompts.json` — default location when creating a new store

### Overriding the storage location

Set `PROMPT_MANAGER_STORE_PATH` in your shell/environment if you want to store your prompt library in a custom location (such as a synced dotfiles repo):

macOS / Linux (`~/.zshrc` or `~/.bashrc`):

```bash
export PROMPT_MANAGER_STORE_PATH="$HOME/.config/prompt-manager/prompts.json"
```

Windows PowerShell (`$PROFILE`):

```powershell
$env:PROMPT_MANAGER_STORE_PATH = "$HOME\.config\prompt-manager\prompts.json"
```

Example `prompts.json` format:

```json
{
  "version": 1,
  "prompts": {
    "1": {
      "text": "begin doing the things you do best, but only if you think it's the best thing to do.",
      "createdAt": "2026-11-24T22:49:09.340Z",
      "updatedAt": "2026-11-24T22:49:09.340Z"
    }
  }
}
```

---

## Testing & Validation

Run the unit and integration test suite:

```bash
npm test
# or directly:
node --test scripts/prompt-manager.test.mjs
```

Validate the Antigravity plugin bundle:

```bash
agy plugin validate .
```

> **Note on multi-tool validation warnings:** When running `agy plugin validate .`, Antigravity reports `0` errors and `3` expected warnings for files belonging to Claude Code or shadowed by `.antigravity-plugin/plugin.json` (`.mcp.json`, `hooks/hooks.json`, and root `plugin.json`).

---

## Troubleshooting

- **`/p` does not appear in autocomplete**: Restart your session, or in Antigravity CLI run `/skills reload`. Verify the plugin is enabled via `agy plugin list`.
- **Prompts saved in Antigravity don't appear in Claude Code / OpenCode (or vice versa)**: Set `PROMPT_MANAGER_STORE_PATH` globally so all three tools point to the same JSON file.
- **Hook fails silently or does not intercept**: Confirm `node --version` outputs `v18` or newer and `node` is on your non-interactive `PATH`.
