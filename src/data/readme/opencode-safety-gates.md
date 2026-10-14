# opencode-safety-gates

Safety gates for [OpenCode](https://opencode.ai) — run your Claude Code
bash-gate scripts inside OpenCode, deny self-revoking commands, and catch
fabricated CLI syntax before it reaches a production shell. **Zero runtime
dependencies.**

Built on the OpenCode **V2 plugin API** (`{ id, setup(ctx) }`). If your V1
plugin died with *"Plugin must export a default definition with an id and an
effect or setup function"* at the v2 upgrade, this repo is also a working
reference for the full V1→V2 hook mapping (see
[anomalyco/opencode#53706](https://github.com/anomalyco/opencode/issues/53706)).

## The three gates

| Gate | Default | What it does |
|---|---|---|
| **Bash gate** | on when gate scripts exist | Wraps the built-in bash/shell tool executor and runs your Claude Code `PreToolUse`/Bash gate scripts — unchanged, from the same `settings.json` wiring — inside OpenCode. One script, both tools. |
| **verify-cli-syntax** | config-driven (inert without config) | After each assistant turn, scans the reply for high-risk CLI syntax claims and checks the session for verification evidence (`--help`, man page, authoritative source). Sends one corrective prompt per session when a claim is unverified. |
| **Session-log injection** | off (`options.sessionLog`) | Injects the head of a per-project `SESSIONLOG.md` into the system prompt once per session. |

## Why

Two failure modes this plugin was built around, both from real incidents:

1. **Self-revocation.** An agent ran `systemctl stop sssd` on an IPA-enrolled
   host. That took out its own sudo, its own SSH key resolution, and user
   lookup — so the follow-up `systemctl start` could never execute. Recovery
   was console-only. An agent shell has no persistent channel back to the
   host; any command that destroys the session's own access is unrecoverable
   *by the session itself*.
2. **Fabricated-from-recall CLI syntax.** An agent recommended a plausible
   CLI invocation from memory, shipped it into a doc, and later cited its own
   doc as the source. The syntax was wrong. Fabricated syntax is
   indistinguishable from correct syntax until it fails on a production
   shell — so the gate forces verification (`--help`, man page, upstream
   source) before a claim survives.

And one meta-lesson: **a security gate that dies silently protects no one.**
Both real-world breakages of this plugin's private predecessor were silent —
a renamed script here, an API break there. So setup always logs a health
line; make checking it part of your install (below).

## Install

Add to `opencode.json` (project root or `~/.config/opencode/opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-safety-gates"]
}
```

Restart OpenCode. The bash gate activates automatically if you already have
gate scripts wired in Claude Code's `settings.json`
(`hooks.PreToolUse` with matcher `Bash`). No duplicated configuration — the
same wiring, the same scripts, both tools.

To also load the bundled example gate (recommended if you have no gate
scripts of your own):

```jsonc
{
  "plugins": [
    { "package": "opencode-safety-gates", "options": { "exampleGates": true } }
  ]
}
```

### Verifying it is alive

After install/upgrade/restart, check the health line:

```sh
grep "opencode-safety-gates" ~/.local/share/opencode/log/opencode.log | tail -2
```

You want:

```
[opencode-safety-gates v1.0.0] bash gate active: 2 script(s) [settings: ..., example: ...]
```

A `WARN: no gate scripts active — bash gate is INERT` line means the bash
gate found nothing to run — nothing is being blocked.

Functional check: ask the agent to run a denied command (with the example
gate: `systemctl stop sssd`) — it should come back with a `Blocked: … Fix: …`
message instead of executing.

## Options

| Option | Default | Effect |
|---|---|---|
| `exampleGates` | `false` | Load the gate scripts bundled in this package's `example-gates/` dir. |
| `sessionLog` | `false` | `true` or `{ "enabled": true, "headLines": 30 }` — inject the per-project SESSIONLOG.md head once per session. |

## Writing your own gate script

Gate scripts are plain executables speaking the Claude Code `PreToolUse`
contract — the same file works in both tools:

- **stdin**: one JSON object: `{"tool_input": {"command": "<the bash command>"}}`
- **exit 0** (or anything other than 2): allow
- **exit 2**: deny; **stderr** is shown to the model — make it a `Fix: …`
  that names the safe alternative, not just the prohibition

Wire them in Claude Code's `settings.json` and both tools pick them up:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "/home/you/.claude/hooks/your-gate", "timeout": 10 }]
      }
    ]
  }
}
```

Fail **open** on anything unexpected — a gate that wedges every bash call
gets disabled, and then it guards nothing.

## verify-cli-syntax configuration

Inert until configured. Global: `~/.config/opencode/verify-cli.json`.
Per-project: `<worktree>/.opencode/verify-cli.json` (extends the global set):

```json
{
  "bins": ["kubectl", "pveum"],
  "sources": [
    { "match": "kubernetes.io/docs", "appliesTo": ["kubectl"] }
  ]
}
```

- `bins` — binaries whose `<bin> <subcommand>` invocations count as claims.
  Bare mentions ("see the kubectl docs") are not claims.
- `sources` — strings whose presence in the session counts as an
  authoritative fetch. `appliesTo` scopes a source to specific binaries;
  omit it for "clears any claim".

A claim is cleared by: `--help`/`-h` or `man` for that binary anywhere in
the session, or a matching source fetch. Otherwise the gate sends one
corrective prompt per session telling the model to verify before restating.

## Security notes

- **Zero runtime dependencies** — nothing to supply-chain. The plugin itself
  is node-builtins-only TypeScript compiled to one file; the bundled example
  gate is a single stdlib-only python script.
- **Fail-open by design** — see "Writing your own gate script". The
  corollary is the health line: check it after every install.
- The bash gate inspects only tool calls that carry a command string.

## Compatibility & maintenance

- OpenCode **v2.0.28+** (V2 plugin API). Untested on v1.
- Maintenance: best-effort, PRs welcome, no roadmap. The plugin API is young
  and will churn; expect major-version bumps when it does.
- MIT license.

## Development

```sh
bun install   # none needed — zero deps — but harmless
bun test      # hermetic: fixture gates + tmp CLAUDE_CONFIG_DIR, never touches ~/.claude
bun run build # bundles src/index.ts -> dist/index.js
```
