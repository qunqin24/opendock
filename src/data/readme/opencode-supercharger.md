# OpenCode Supercharger

**Security guardrails for OpenCode. Install once, forget forever.**

---

## Why

OpenCode can delete your database, force-push to main, or run a shell script from the internet. Nothing in the default config stops it.

This plugin does.

---

## Install

```bash
npm install -g opencode-supercharger
npx opencode-supercharger init
```

Or clone and run the install script:

```bash
git clone https://github.com/smrafiz/opencode-supercharger.git
cd opencode-supercharger
bash install.sh
```

---

## What You Get

| Feature | What It Does |
|---------|-------------|
| **Command blocking** | Stops `rm -rf /`, `DROP TABLE`, `curl | bash`, fork bombs before they execute |
| **Git guardrails** | Blocks force-push, `reset --hard`, branch deletion, `stash drop` |
| **Secret detection** | Catches AWS keys, GitHub tokens, API keys in commands and output |
| **Code scanning** | Warns on `eval()`, `innerHTML`, SQL injection, hardcoded secrets, weak crypto |
| **Loop detection** | Warns when the same tool repeats 3x in 30 seconds |
| **Audit trail** | Logs every action to JSONL, auto-redacts secrets, 30-day rotation |
| **Config scan** | Detects prompt injection in CLAUDE.md, AGENTS.md files |
| **Self-teaching** | Learns from blocked commands and user corrections |
| **Context advisor** | Warns at 50%, 70%, 80%, 90% context usage |
| **Verify on stop** | Warns if files were modified but no tests ran |
| **Agent routing** | Suggests specialized agents based on task |
| **Scope alerts** | Warns when >5 files touched |
| **Status line** | Displays files modified, session cost in TUI footer |
| **Checkpoint** | Auto-saves on git commit, restores on new session |
| **/interview** | Deep interview command for requirement gathering |
| **/devlog** | Development log command |
| **Per-project config** | Override features via `.supercharger.json` |

---

## New Slash Commands

| Command | Use For |
|---------|---------|
| `/interview` | Deep interview to clarify requirements before planning |
| `/devlog` | Create structured development log entries |

---

## Per-Project Configuration

Create `.supercharger.json` in your project:

```json
{
  "disableHooks": ["loop-detector", "scope-alert"],
  "disableAgents": ["debugger"],
  "customRules": ["no-debug-code"]
}
```

---

## Status Line (Optional)

Add to your `opencode.json` to show supercharger stats in the TUI footer:

```json
{
  "tui": {
    "status_line": {
      "templates": {
        "session_footer": "files: {supercharger_files} | cost: ${supercharger_cost}"
      }
    }
  }
}
```

---

## What Gets Blocked

- **Destructive**: `rm -rf /`, `mkfs`, `dd if=`
- **Pipe-to-shell**: `curl ... | bash`, `wget ... | sh`
- **SQL**: `DROP TABLE`, `DROP DATABASE`
- **Git**: Force-push, `reset --hard`, `clean -f`, branch deletion
- **Credentials**: AWS keys, `ghp_` tokens, `sk-` keys, `PASSWORD=`
- **Clipboard**: `pbcopy`, `pbpaste`, `xclip`
- **Sensitive paths**: Keychain, 1Password, `.password-store`
- **Shell history**: `.bash_history`, `.zsh_history`
- **Package mismatch**: Running `npm` in a pnpm/yarn/bun project

---

## Code Security Scanner

Scans code before it lands on disk:

| Language | Catches |
|----------|--------|
| JavaScript/TypeScript | `eval()`, `new Function()`, `.innerHTML`, `dangerouslySetInnerHTML` |
| Python | `pickle.load()`, `exec()`, `os.system()`, `subprocess(shell=True)` |
| SQL | f-string SQL, string-concatenated queries |
| All | Hardcoded passwords, API keys, `crypto.createHash('md5')` |

---

## Install Modes

| Mode | Hooks | Features |
|------|-------|----------|
| **Safe** | 8 | Command blocking, code scanner, audit, secret scan |
| **Full** | All | Everything + self-teaching, context advisor, verify-on-stop |

---

## Quick Config

```json
{
  "plugins": ["@opencode-supercharger/plugin"],
  "instructions": [
    "configs/rules/guardrails.md",
    "configs/rules/economy-lean.md"
  ]
}
```

---

## Agents (Included)

| Agent | Use For |
|-------|---------|
| `@engineer` | Writing, fixing code |
| `@debugger` | Root-cause analysis |
| `@reviewer` | Code review |
| `@writer` | Docs, READMEs |
| `@architect` | Design plans |
| `@planner` | Task breakdown |
| `@researcher` | Research, comparisons |
| `@analyst` | Data, SQL |
| `@generalist` | General questions |

---

## Commands (Included)

| Command | Use For |
|---------|---------|
| `/think` | 5-step structured reasoning |
| `/challenge` | Adversarial stress-test |
| `/refactor` | Code quality sweep |
| `/audit` | Consistency check |
| `/test` | Generate unit tests |
| `/doc` | Generate documentation |

---

## MCP Support

Add to your config for enhanced capabilities:

```json
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.io/mcp"
    }
  }
}
```

---

## Uninstall

```bash
bash uninstall.sh
```

---

## FAQ

**Will it break my workflow?**
No. It blocks commands that are never part of legitimate AI coding tasks.

**Can the AI disable it?**
No. Writing to `opencode.json` is blocked. The plugin cannot modify itself.

**Where are the logs?**
`~/.config/opencode/supercharger/audit/YYYY-MM-DD.jsonl`

---

## Credits

A port of [Claude Supercharger](https://github.com/smrafiz/claude-supercharger) for OpenCode.

---

## License

MIT