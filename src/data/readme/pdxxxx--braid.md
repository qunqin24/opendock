> **Coding agents:** open [`README_FOR_AGENTS.md`](./README_FOR_AGENTS.md) and install Braid for the current host in one shot.

<p align="center">
  <img src="https://img.shields.io/badge/OpenCode-plugin-111111?style=for-the-badge" alt="OpenCode plugin" />
  <img src="https://img.shields.io/badge/Grok%20Build-plugin-111111?style=for-the-badge" alt="Grok Build plugin" />
  <img src="https://img.shields.io/badge/Claude%20Code-plugin-111111?style=for-the-badge" alt="Claude Code plugin" />
  <img src="https://img.shields.io/badge/version-0.1.2-0ea5e9?style=for-the-badge" alt="0.1.2" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="MIT" />
</p>

<h1 align="center">Braid</h1>

<p align="center">
  <strong>Always-on orchestration for OpenCode, Grok Build, and Claude Code.</strong><br />
  <em>Split independent work. Fan out same turn. Weave the results.</em>
</p>

<p align="center">
  Soft policy · zero runtime deps
</p>

---

## Why Braid?

Agent hosts can already run multiple subagents. Most sessions still **serialize** independent work: explore → implement → verify, one after another.

Braid injects a short orchestration policy every turn so the primary agent behaves like an **orchestrator**:

1. Split independent units  
2. Start them **in the same turn** (OpenCode/Claude: Task · Grok: `spawn_subagent`)  
3. Join, then synthesize  

It does **not** invent a multi-agent runtime. It **amplifies** each host’s existing tools.

**Default mode is `full`.** You do **not** need `/braid full` after every new session or compaction — policy re-injects automatically while mode ≠ `off`. Use `/braid` only to change mode.

```
  user message
       │
       ▼
  primary agent  ←── Braid inject
       │
       ├─ subagent A  ──┐
       ├─ subagent B  ──┼─ same turn
       └─ subagent C  ──┘
       │
       ▼
     summary → user
```

## Hosts

| Host | Surface | Fan-out tool |
|------|---------|--------------|
| **OpenCode** | `.opencode/plugins/braid.mjs` | Task / @mention |
| **Grok Build** | `grok-plugin/` | `spawn_subagent` |
| **Claude Code** | `claude-plugin/` | Task |

Shared mode state: `~/.config/braid/mode`  
Legacy OpenCode file still read: `~/.config/opencode/.braid-active`

---

## Install

Remote install assumes the GitHub repo is public: [pdxxxx/braid](https://github.com/pdxxxx/braid).

**Agents:** use [`README_FOR_AGENTS.md`](./README_FOR_AGENTS.md).

### OpenCode (remote)

```bash
# After npm publish:
npm install @pdxxxx/braid

# Or install from GitHub (no npm publish required):
npm install github:pdxxxx/braid
```

```json
{
  "plugin": ["@pdxxxx/braid"]
}
```

OpenCode resolves the package entry (`.opencode/plugins/braid.mjs`) at startup.

### OpenCode (local / this repository)

Plugins under `.opencode/plugins/` load automatically in this repo.

Optional pin:

```json
{
  "plugin": ["./.opencode/plugins/braid.mjs"]
}
```

Sample: [`examples/opencode.json`](./examples/opencode.json)

### Grok Build (remote)

```bash
# Install only the Grok plugin subtree from the monorepo:
grok plugin install pdxxxx/braid#grok-plugin --trust
# pin optional:
# grok plugin install pdxxxx/braid@v0.1.2#grok-plugin --trust

grok plugin enable braid
```

Requires **Node.js** on `PATH` (hooks run `node …mjs`).  
`--trust` is required for hooks to run.

### Grok Build (local)

```bash
grok plugin install ./grok-plugin --trust
grok plugin enable braid
grok plugin validate ./grok-plugin
```

After upgrades, reinstall so new hooks (e.g. SessionStart) are copied.

### Claude Code (remote)

Marketplace manifest: [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json) (plugin source `./claude-plugin`).

```text
/plugin marketplace add pdxxxx/braid
/plugin install braid@braid
```

Desktop app without `/plugin`: add marketplace from repository URL `https://github.com/pdxxxx/braid`, then install **braid**.

Requires **Node.js** on `PATH`.

### Claude Code (local)

```text
/plugin marketplace add <absolute-or-relative-path-to-this-repo>
/plugin install braid@braid
```

Or enable the `claude-plugin/` folder via the Claude plugin UI.

---

## Modes

| Mode | Behavior |
|------|----------|
| **`full`** (default) | ≥2 independent units → same-turn fan-out required |
| **`lite`** | Prefer fan-out; suggestion only |
| **`off`** | No inject |

```
/braid lite
/braid full
/braid off
/braid          → full
```

- Mode is written immediately; injection of the **new** mode applies on the **next** turn.  
- **No re-arm:** missing state file = `full`; session start / compact / each prompt re-injects while mode ≠ `off`.

**State file** (one line):

| OS | Path |
|----|------|
| Unix / default | `~/.config/braid/mode` |
| Windows | `%USERPROFILE%\.config\braid\mode` |
| XDG | `$XDG_CONFIG_HOME/braid/mode` |
| Legacy (read fallback) | `~/.config/opencode/.braid-active` |

## What gets injected

When mode ≠ `off`:

1. You are the **orchestrator** — do not solo multi-unit work  
2. Split units (explore / implement / verify / research, …)  
3. Start multiple subagents **in the same turn**; wait; synthesize  
4. Serialize only when there is a real dependency  
5. Intensity follows `full` / `lite`

### OpenCode hooks

| Hook | Behavior |
|------|----------|
| `experimental.chat.system.transform` | Push policy into system |
| `command.execute.before` | Persist `/braid` mode |
| `experimental.session.compacting` | Re-push policy into compaction **context** |
| `tool.execute.before` | Under `full`, soft-log when `task` runs — **never** hard-blocks |

### Grok Build hooks

| Event | Behavior |
|-------|----------|
| `SessionStart` | Re-inject policy (default full; no slash needed) |
| `UserPromptSubmit` | Persist `/braid`; re-inject policy |
| `PreCompact` | Re-push policy |
| `PreToolUse` (`spawn_subagent` / `Task`) | Soft stderr under `full` — **never** denies |

### Claude Code hooks

| Event | Behavior |
|-------|----------|
| `SessionStart` (`startup\|resume\|clear\|compact`) | Re-inject policy |
| `UserPromptSubmit` | Persist `/braid`; re-inject every turn |
| `PreToolUse` (`Task`) | Soft stderr under `full` — **never** denies |

## Honesty limits

- Soft policy only — weak models may still serialize  
- No hard concurrency quota  
- Does not spawn agents or replace host Task / `spawn_subagent` UI  
- Inject depends on host honoring hook `additionalContext`  

## Develop

```bash
npm test
# → node --test tests/braid.test.mjs
```

```
lib/braid-core.mjs              # shared core (sync to plugin lib/ copies)
.opencode/plugins/braid.mjs     # OpenCode entry
.opencode/command/braid.md
grok-plugin/                    # Grok Build plugin root
claude-plugin/                  # Claude Code plugin root
examples/opencode.json
tests/braid.test.mjs
```

When editing core, update **`lib/braid-core.mjs`**, **`grok-plugin/lib/`**, and **`claude-plugin/lib/`** (tests enforce identical content).

## License

[MIT](./LICENSE) © pdxxxx

---

<p align="center">
  <sub>Weave independent threads. Don’t pull them one by one.</sub>
</p>
