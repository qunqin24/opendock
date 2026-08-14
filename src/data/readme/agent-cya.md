# AgentCYA

[![npm version](https://img.shields.io/npm/v/agent-cya?logo=npm)](https://www.npmjs.com/package/agent-cya)

A second-LLM permission reviewer for AI coding harnesses (Claude Code, OpenCode).

## Why

You're usually choosing between two bad options: `--dangerously-skip-permissions` lets the agent rip but auto-approves anything it dreams up, while the default permission flow buries you in a prompt for every other command. AgentCYA is the middle path — a separate LLM reviews each tool call (including the contents of any script it's about to execute) and returns `allow` / `deny` / `ask` on the merits. Routine work keeps moving, you only get pulled in when the risk actually warrants it.

### How is this different from Claude Code's allow/ask/deny rules?

Those rules are static string/glob patterns. They work great for stuff you can enumerate (`git status`, `npm test`) — but:

- **Blind to script contents.** Allowing `bash` allows `bash anything.sh`, including a script the agent just wrote.
- **Not flag-aware.** `git push --force` and `git push --force-with-lease` look identical to a glob.
- **Can't reason about composition.** `curl example.com | sh` and `curl example.com > out.txt` share a prefix.
- **Can't predict novel commands.** Anything you didn't enumerate falls through to the prompt.

AgentCYA composes with your existing rules — your allowlist still short-circuits everything, AgentCYA only fires on the asks. And `agent-cya suggest` graduates repeat-allows back into the static allowlist so the fast path keeps growing.

## How It Works

AgentCYA sits between the coding harness and execution:

```
stdin JSON → Structural rules → File enrichment (Bash) → LLM review → stdout JSON + audit log
```

1. **Structural rules** — tree-sitter parses each Bash command into an AST, and ~30 structural predicates flag destructive patterns before any LLM call. Some emit `deny` (`rm -rf /`, `curl | sh`, `sudo`, `mkfs`, fork bombs); others emit `ask` (`git push --force-with-lease`, `git reset --hard`, `npm publish`, `kubectl delete`, `chmod 777`). Flag-aware: `git push --force` denies, `--force-with-lease` only asks.
2. **File enrichment** — when a Bash command runs a script (`bash foo.sh`, `node x.js`, `./run`, `python3 script.py`), AgentCYA reads it from disk and includes its contents in the LLM prompt. The reviewer sees what's actually about to execute, not just the invocation — which closes the create-then-execute loophole where a write step slips past unreviewed.
3. **LLM review** — everything else goes to the reviewer for a security assessment. By default this is the `claude` or `opencode` CLI binary spawned locally; `--reviewer openai` makes an HTTP call to an OpenAI-compatible API configured at `~/.agent-cya/config.json` (see [Configuration](#configuration)).
4. **Audit log** — every decision is appended to `~/.agent-cya/audit.log`.

## Install

```bash
# CLI (for use as a Claude Code hook)
npm install -g agent-cya

# Or just as a dependency (if you only use the OpenCode plugin)
npm install agent-cya
```

Requires Node 22+.

## Setup — Claude Code

Add a `PermissionRequest` hook to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "agent-cya hook claude-code",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

The hook only fires when Claude Code would otherwise prompt for permission — already-allowlisted commands skip it. AgentCYA's `allow` / `deny` / `ask` decisions map directly to `PermissionRequest` behaviors; `ask` falls through to Claude Code's standard permission dialog. To gate file edits too, widen the matcher to `"Bash|Write|Edit"`.

> ⚠️ **Watch out for "autopilot accept" on fallback prompts.** When the reviewer LLM returns `ask` (or is unreachable), Claude Code surfaces its standard approval prompt — visually identical to any other permission ask, with no AgentCYA reasoning attached. Clicking through reflexively can `allow` something AgentCYA was uncertain about, or worse, `Yes, and don't ask again for X` bypasses the hook for future matches.
>
> Pass `--min-ask-ms <ms>` (e.g. `--min-ask-ms 30000` for 30s) to hold `ask` decisions open long enough to actually read. Allows and denies still return as fast as the LLM does. Make sure the hook `timeout` (seconds) exceeds `--min-ask-ms / 1000` plus your LLM's worst-case review time.

To use a different reviewer for this hook (e.g. `openai`), see [Per-harness reviewer override](#per-harness-reviewer-override).

## Setup — OpenCode

```bash
npm install agent-cya
```

```json
// opencode.json
{ "plugin": ["agent-cya/opencode"] }
```

The plugin's `permission.ask` handler emits the AgentCYA decision directly as OpenCode's `output.status` — same review pipeline as the CLI hook, in-process (no spawn, no JSON parsing).

> ⚠️ **Upstream caveat:** OpenCode currently gates `permission.ask` so it doesn't fire for first-encounter commands or in non-interactive `opencode run` sessions, which means the AgentCYA decision never lands. The plugin loads fine and works when invoked directly; this is tracked at [anomalyco/opencode#19927](https://github.com/anomalyco/opencode/issues/19927). Once OpenCode forwards every permission ask to plugins, the integration works as documented.

To use a different reviewer for the plugin (e.g. `openai`), see [Per-harness reviewer override](#per-harness-reviewer-override).

## Configuration

The `claude` and `opencode` reviewers need no configuration — they pick up the local CLI's existing auth. The `openai` reviewer makes an HTTP call to an OpenAI-compatible API and needs to know which endpoint, which model, and which API key to use. That lives in `~/.agent-cya/config.json`:

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/agent-cya/config.schema.json",
  "reviewers": {
    "openai": {
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o-mini",
      "apiKey": "sk-..."
    }
  }
}
```

The `$schema` line is optional — it enables autocomplete, inline docs, and typo detection in any editor that understands JSON Schema (VS Code, JetBrains, Neovim with a JSON LSP, etc.).

Keep the file readable only by you:

```bash
chmod 600 ~/.agent-cya/config.json
```

AgentCYA warns on stderr if the mode is more permissive, but does not refuse to read it.

### API key via credential helper

Set `apiKeyCmd` to a shell command whose stdout is the key; AgentCYA runs it and uses the trimmed output. If both `apiKey` and `apiKeyCmd` are present, `apiKeyCmd` wins (matches git's credential-helper precedence).

Examples:

- **1Password CLI** (any platform):

  ```json
  { "apiKeyCmd": "op read op://Personal/openai-agent-cya/credential" }
  ```

- **macOS Keychain**:

  ```bash
  security add-generic-password -s agent-cya-openai -a "$USER" -w "sk-..."
  ```

  ```json
  { "apiKeyCmd": "security find-generic-password -s agent-cya-openai -w" }
  ```

- **Windows Credential Manager** (via PowerShell SecretManagement):

  ```powershell
  Set-Secret -Name agent-cya-openai -Secret 'sk-...'
  ```

  ```json
  {
    "apiKeyCmd": "powershell -NoProfile -Command \"Get-Secret -Name agent-cya-openai -AsPlainText\""
  }
  ```

- **Bitwarden CLI** (any platform):

  ```json
  { "apiKeyCmd": "bw get password agent-cya-openai" }
  ```

- **HashiCorp Vault** (any platform):

  ```json
  { "apiKeyCmd": "vault kv get -field=apikey kv/agent-cya/openai" }
  ```

The helper command runs with `shell: true` and a 5-second timeout. Its stderr is surfaced in error messages.

### Per-harness reviewer override

By default, each harness uses a sensible reviewer for its environment — the Claude Code hook uses `claude`, the OpenCode plugin uses `opencode`. To override per harness, add a `harnesses` block to `~/.agent-cya/config.json`:

```json
{
  "$schema": "https://cdn.jsdelivr.net/npm/agent-cya/config.schema.json",
  "reviewers": {
    "openai": { "baseUrl": "...", "model": "...", "apiKey": "..." }
  },
  "harnesses": {
    "opencode": { "reviewer": "openai" },
    "claudeCode": { "reviewer": "openai" }
  }
}
```

The override only applies to the matching harness. The `reviewers` block is only needed when one of the overrides uses `openai`.

**Precedence** (highest wins):

1. The `--reviewer` flag on the CLI (e.g. `agent-cya --reviewer claude hook claude-code`).
2. `harnesses.<harness>.reviewer` from the config file.
3. The harness's built-in default (`claude` for the Claude Code hook, `opencode` for the OpenCode plugin).

Raw `agent-cya review` (without a harness) ignores `harnesses.*` — pass `--reviewer` to override its `claude` default.

### Using a local model as the reviewer

The OpenAI-compatible API spec is widely implemented, so the `openai` reviewer works against any locally-running inference server. Reasons you might want to:

- **Privacy** — every tool call and the contents of every script being executed reach the reviewer. With a local model, nothing leaves your machine.
- **Cost** — no per-call API fees. A small (~7B-9B) model on a modern laptop reviews each call in ~5 seconds, comparable to spawning the `claude` CLI.
- **Offline** — works on planes, in restricted networks, behind corporate proxies.

Anything OpenAI-compatible works: Ollama, vLLM, LM Studio, llama.cpp's built-in server, MLX-LM, oMLX, LiteLLM, and most other runtimes. For local servers without auth, set `apiKey` to any non-empty placeholder — the field is required but the server can ignore the header.

Example with Ollama:

```bash
ollama pull qwen2.5-coder:7b
```

```json
{
  "reviewers": {
    "openai": {
      "baseUrl": "http://127.0.0.1:11434/v1",
      "model": "qwen2.5-coder:7b",
      "apiKey": "unused"
    }
  }
}
```

Cloud and hosted services (OpenAI, Together, Groq, Mistral, etc.) work identically — just point `baseUrl` at the provider, set `model` to one they offer, and supply your real API key.

## CLI

```
agent-cya [--reviewer <reviewer>] review              # review a tool call (stdin JSON)
agent-cya [--reviewer <reviewer>] hook claude-code    # Claude Code PermissionRequest hook
agent-cya suggest                                     # surface candidates for your harness allowlist
```

`--reviewer` is `claude` (default), `opencode`, or `openai`. The first two spawn the matching CLI binary; `openai` calls the HTTP endpoint in your config.

### Input (stdin)

```json
{
  "toolType": "Bash",
  "command": "rm -rf /tmp/build",
  "fileContent": null,
  "workingDirectory": "/Users/dev/project"
}
```

### Output (stdout)

```json
{
  "decision": "deny",
  "reason": "Command matches denied pattern: rm\\s+-rf\\s+\\*"
}
```

Exit code `0` for `allow` / `ask` (proceed), `1` for `deny` / error.

### Suggesting allowlist entries

After a few sessions, `agent-cya suggest` surfaces Bash commands you've allowed often enough that you may want to add them to your harness allowlist directly — which skips the AgentCYA hook entirely for those commands and removes the per-call overhead.

```bash
agent-cya suggest                          # default human-readable table
agent-cya suggest --json                   # structured output for scripting
agent-cya suggest --min-allows 10          # raise the threshold (default 5)
agent-cya suggest --audit-log /tmp/foo.log # read from a non-default audit log
```

Sample output:

```
Scanned 1247 Bash entries from ~/.agent-cya/audit.log (+1 rotated).

Suggested commands (≥5 allows, 0 denies):
  git status                  47 allows  last seen 2d ago
  npm run lint                23 allows  last seen 1d ago

Clusters worth reviewing manually:
  npm test  → 47 variants, 112 total allows

Copy individual commands into your harness allowlist;
for clusters, consider a wildcard pattern after review.
```

**Safety:** suggestions are always **exact command strings** — never patterns. `git push` and `git push -f` are different keys, so a clean suggestion for `git push` cannot authorize `git push -f` if you paste it into your harness allowlist verbatim. Wildcard patterns are never auto-suggested; the _clusters_ section just shows you which prefixes have high-volume variants in case you want to wildcard them after reviewing the raw audit log.

The audit log itself lives at `~/.agent-cya/audit.log` (plus `audit.log.1` after rotation). `--audit-log <path>` overrides the location if you point AgentCYA at a non-default file.

## Privacy

By default AgentCYA makes no network calls — the `claude` and `opencode` reviewers spawn their local CLI binary and your tool calls never leave the machine that runs them. HTTP only happens when you opt in with `--reviewer openai`, and even then you choose the endpoint: a hosted provider, a self-hosted inference server, or a model on `localhost`. The audit log at `~/.agent-cya/audit.log` is local-only and is never transmitted anywhere.

## License

ISC
