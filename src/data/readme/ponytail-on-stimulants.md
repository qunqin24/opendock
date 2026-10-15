# Ponytail on Stimulants

> **Ponytail stops over-engineering. On Stimulants stops under-executing.**

Same senior engineer. Now the ticket actually gets closed.

This is the completion-discipline plugin: smallest sound design, then finish the whole change. Packaged as `ponytail-on-stimulants` (do not confuse the product nickname **on steroids** with the package name). Soft fork of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). MIT.

**Unbounded persistence. Bounded scope.** Finish what the outcome requires. Do not turn persistence into unrelated refactoring.

## Install (30 seconds)

### Pi

```sh
pi install git:github.com/phall1/ponytail-on-stimulants
```

### Oh My Pi (OMP)

```sh
omp plugin marketplace add phall1/ponytail-on-stimulants
omp plugin install ponytail-on-stimulants@ponytail-on-stimulants
```

Restart the session so the shared Pi completion gate loads. OMP reads `.omp-plugin/marketplace.json` (Claude's `.claude-plugin/marketplace.json` is the fallback). The plugin's `package.json` `omp.extensions` points at the same `pi-extension` Pi uses.

### Codex

```sh
codex plugin marketplace add phall1/ponytail-on-stimulants
codex plugin add ponytail-on-stimulants@ponytail-on-stimulants
```

Then open `/hooks`, **review and trust** SessionStart, SubagentStart, UserPromptSubmit, PreToolUse, PostToolUse, and Stop, and start a new thread. Untrusted hooks never run. Codex uses `hooks/codex-hooks.json`; Claude retains its separate failure-event configuration.

Invoke skills as `$ponytail-on-stimulants:ponytail-on-stimulants` or `$ponytail-on-stimulants:ponytail-on-stimulants-review`. Append a mode to the primary skill to switch it.

### OpenCode

```json
{ "plugins": ["ponytail-on-stimulants"] }
```

From a checkout:

```json
{ "plugins": ["/absolute/path/to/ponytail-on-stimulants"] }
```

OpenCode 2 uses `plugins` and the V2 API. OpenCode 1 uses `plugin` and the adapter's legacy `server` entry. Local checkouts include a `.opencode/plugins/index.js` discovery entry.

### Claude Code

Send these as two separate prompts:

```text
/plugin marketplace add phall1/ponytail-on-stimulants
/plugin install ponytail-on-stimulants@ponytail-on-stimulants
```

Trust the plugin hooks when prompted, then start a new session.

---

| After install | Command |
|---------------|---------|
| Set mode | `/ponytail-on-stimulants focused\|full-send\|feral\|off` |
| Persist default | `/ponytail-on-stimulants default <mode>` |
| Show current / default | `/ponytail-on-stimulants status` |
| Review / audit / debt / gain / help | `/ponytail-on-stimulants-review` and siblings |

Upstream Ponytail can stay installed. This fork uses different package, plugin, command, skill, hook, and state names.

## What you get

1. Understand the repository and affected flow.
2. Choose the smallest sound architecture.
3. Execute the whole requested and mechanically implied change.
4. Verify in proportion to blast radius.
5. Run an adversarial second pass before stopping.

| Mode | Behavior | Forced completion passes |
|------|----------|--------------------------|
| `focused` | Complete the requested path with normal proportional verification. | 0 |
| `full-send` | Trace affected paths, do implied work, verify, explicit adversarial pass. **Default.** | 1 |
| `feral` | Stronger caller/edge search and broader reasonable verification; scope stays bounded. | at most 2 |
| `off` | Disable injected behavior in native adapters. | 0 |

Human input resets the counter. Extension/hook follow-ups do not. Hard caps and fail-open error handling prevent infinite agency.

## Host contract (honest)

| Host | Always-on instructions | Commands / skills | Operational completion gate |
|------|------------------------|-------------------|-----------------------------|
| **Pi** | Per-turn system prompt | Slash commands + skills | **Full.** `agent_end` queues a bounded follow-up before public settlement. |
| **OMP** | Same Pi extension | Same Pi commands + `skills/` | **Full.** Marketplace install loads `omp.extensions` → the same `pi-extension` + `completion-gate/`. |
| **Codex** | SessionStart inject | Namespaced `$ponytail-on-stimulants:<skill>` | **Stop hook.** Trust hooks; `decision: block` + `reason` continues. Tool outcomes remain unknown where the host supplies no reliable status. |
| **OpenCode 2 / 1** | V2 context/compaction hooks; V1 system transform | Slash commands + skills | **Best-effort.** V2 execution-success events / V1 idle events queue a bounded prompt. No undocumented in-loop stop hook. |
| **Claude Code** | SessionStart inject | `/ponytail-on-stimulants*` + skills | **Stop hook.** Stop `additionalContext` continues the turn without a fake `agent_settled` event. |
| **Copilot CLI / VS Code** | Native namespaced startup hook | Portable skills + MCP; mode selection applies at next startup | None packaged. Prompt-hook output is not context injection. |
| **Gemini CLI / Qwen Code** | Extension `AGENTS.md` | Extension commands + skills | None packaged. |
| **Cursor** | Local `sessionStart` context | Mode selection applies on the next chat | None packaged. Native prompt hooks cannot inject context. |
| **Qoder** | UserPromptSubmit + SubagentStart | Skills + native mode tracking | None packaged. |
| **Hermes** | Pre-LLM user-turn context | Skills + commands | None packaged; mode is process-wide, including gateway chats. |
| **Static-rule hosts** | Host-enabled rule file | No mutable native mode | None. |

Jev stays optional, disabled by default, and Pi/OMP-only (in-process). File-hook hosts do not call TypeSafe.

### Experimental Jev judge

Jev is never the coding model. On feral's second stop attempt, Pi/OMP can send compact structured state to TypeSafe's System One API. Code calculates deterministic facts; Jev judges fuzzy completion questions; the coding agent reasons and executes.

```sh
export PONYTAIL_ON_STIMULANTS_JEV_ENABLED=1
export TYPESAFE_API_KEY=...
```

Optional settings:

- `PONYTAIL_ON_STIMULANTS_JEV_MODEL` (default `jev-latest`)
- `PONYTAIL_ON_STIMULANTS_JEV_TIMEOUT_MS` (default `2500`)
- `PONYTAIL_ON_STIMULANTS_JEV_RETRIES` (`0` or `1`, default `0`)
- `PONYTAIL_ON_STIMULANTS_JEV_ENDPOINT` (default official endpoint)

Missing credentials, timeout, transport errors, service errors, and malformed responses fail open. Jev is advisory: its judgment is shown to the coding model and never starts or suppresses execution directly. When enabled, the adapter sends only request/response length and claim flags, changed paths, tool-result fingerprints, and aggregate evidence to TypeSafe. It does not send task text, assistant-response text, file contents, tool output, or raw command text. Changed paths and fingerprints can still be sensitive metadata, so leave Jev disabled when repository metadata must not leave the machine. Core behavior has no TypeSafe dependency.

## Other installs

The portable Agent Plugins v1.0.0 core is `plugin.json`, `skills/*/SKILL.md`, `mcp.json`, and `mcp/server.js`. Native adapters below are extra.

### GitHub Copilot CLI

```sh
copilot plugin marketplace add phall1/ponytail-on-stimulants
copilot plugin install ponytail-on-stimulants@ponytail-on-stimulants
```

### Gemini CLI

```sh
gemini extensions install https://github.com/phall1/ponytail-on-stimulants
```

### Hermes Agent

```sh
hermes plugins install phall1/ponytail-on-stimulants --enable
```

### Cursor hooks

```sh
git clone https://github.com/phall1/ponytail-on-stimulants
node ponytail-on-stimulants/scripts/cursor-hooks.js install
```

Static-rule hosts can copy the uniquely named rule from `.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`, `.qoder/rules/`, `.kiro/steering/`, or `.github/copilot-instructions.md`. Enable **Always Apply** where the host requires it. `.agents/rules/` is a convenience copy, not a universal discovery standard. Windsurf's workspace copy explicitly declares `trigger: always_on`.

### Uninstall and state cleanup

Use each host's normal plugin/package removal command, then run `node scripts/uninstall.js` from an npm install or checkout to remove fork-owned user state. For a project-scoped Cursor hook installation, run `node scripts/cursor-hooks.js uninstall --project` from that project. These scripts match only `ponytail-on-stimulants` files and leave upstream Ponytail and unrelated hooks untouched.

## Configuration

Default-mode resolution:

1. `PONYTAIL_ON_STIMULANTS_DEFAULT_MODE`
2. `~/.config/ponytail-on-stimulants/config.json` (or XDG/Windows equivalent)
3. `full-send`

Pi and OMP persist mode per session. File-hook native adapters preserve a selected mode across resume/compact events but share one fork-specific mode file per host profile; Claude/Codex fresh startup resets it to the configured default; Cursor restores the saved selection (including off) on the next local chat. Copilot and Qoder also retain profile mode until changed. Concurrent conversations in those hosts can therefore observe the most recent mode switch. Completion-turn evidence is stored per `session_id` so caps stay isolated.

## Development

```sh
node scripts/build-openclaw-skills.js
npm run check
npm test
npm run test:completion
python3 benchmarks/agentic/run.py --selftest
python3 benchmarks/agentic/complete.py --selftest-offline
```

`npm test` inherits one upstream pandas-backed correctness check; install pandas in your environment or an isolated virtualenv for the CI-equivalent run.

See [docs/harness-compatibility.md](docs/harness-compatibility.md) for reviewed API sources, adopted upstream fixes, and verification limits. See [UPSTREAM.md](UPSTREAM.md) for ownership and sync policy, [RELEASE.md](RELEASE.md) for the release checklist, and [benchmarks/completion/](benchmarks/completion/) for fork-specific completion evaluation.

## Attribution

Ponytail on Stimulants is derived from [Ponytail](https://github.com/DietrichGebert/ponytail), created by Dietrich Gebert, and retains the upstream MIT license and copyright notice. Fork-specific branding and behavior are maintained by [phall1](https://github.com/phall1).
