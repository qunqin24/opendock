# opencode-model-escalator

OpenCode plugin: start each coding task on a cheap model, then **escalate up a chain** when the same test keeps failing after repairs — or retry in place when the current model is rate-limited / unavailable.

Not a task router. Not a generic fallback. Capability only moves **up** inside one task, then resets on the next user task.

**Look for this after install:** the session tool `model_escalator_control` (`status` / `enable` / `disable` / `reset`). If that tool is missing, the plugin did not load — jump to [Verify](#4-verify-it-loaded) and [Install errors](#install-errors).

Verified against **OpenCode 1.18.21**. Requires OpenCode `>= 1.18.21`.

---

## Is this the plugin you want?

| You want… | Use this? |
|---|---|
| Cheap model by default; stronger model only after the agent is *logically stuck* on the same failing test | **Yes** |
| Same-session replay so the stronger model inherits the original request + failed attempts | **Yes** |
| 429 / 5xx / unavailable handled as infra retries, **without** burning an escalation slot | **Yes** |
| Route *every* message to fast/medium/heavy subagents up front (`opencode-model-router`) | No — different problem |
| Swap models only when a provider is down (`opencode-model-fallback` and similar) | Partial overlap on Category A only; this plugin also escalates on repeated identical test failures |
| Another abort/replay plugin on the same sessions (`opencode-auto-resume`, a second fallback plugin) | **No** — this plugin must be the single owner of abort/replay |

---

## Install

Two files in your project: register the plugin in `opencode.json`, and add the required `.opencode/escalator.json` chain (next section). Never copy plugin source into `.opencode/plugins/` — auto-discovery loads it with no options and the load fails.

### Register the plugin — npm (recommended)

Add the package name to the `plugin` array in your project's `opencode.json`. OpenCode installs it automatically with Bun at startup and caches it under `~/.cache/opencode/node_modules/`. You do **not** run `npm install` yourself.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-model-escalator"]
}
```

If `opencode.json` already exists, keep every other key and **append** `"opencode-model-escalator"` to the existing `plugin` array — back it up first (`cp opencode.json opencode.json.bak`) and do not replace the whole file with this example. Restart OpenCode after editing.

This is the same file on macOS, Linux, and Windows. On Windows keep the project path, the sidecar path, and the `opencode` binary in the **same** environment (native vs WSL).

### Register the plugin — curl installer (alternative, no npm registry)

Prefer npm above. The installer is a no-npm alternative: it wires OpenCode to fetch the plugin straight from GitHub (`github:josz5930/opencode-model-escalator`) and edits `opencode.json` for you.

**Need:** OpenCode `>= 1.18.21` on `PATH`, Bash, `curl`, and one of `python3` / `node` / `bun`. Never `sudo`. Git Bash / WSL work too — from WSL use the WSL path (`/mnt/c/Users/me/project`) and run OpenCode from that same environment.

```bash
cd /path/to/your-opencode-project
curl -fsSL https://raw.githubusercontent.com/josz5930/opencode-model-escalator/main/install | bash
```

Target a project without `cd`:

```bash
curl -fsSL https://raw.githubusercontent.com/josz5930/opencode-model-escalator/main/install | bash -s -- --dir /path/to/your-opencode-project
```

Review before running:

```bash
installer_file="$(mktemp)"
curl -fsSL https://raw.githubusercontent.com/josz5930/opencode-model-escalator/main/install -o "$installer_file"
less "$installer_file"
bash "$installer_file"
```

The script is idempotent. It:

1. Adds `"github:josz5930/opencode-model-escalator"` to `opencode.json` (or `.opencode/opencode.json` if that already exists).
2. Creates `.opencode/escalator.json` **only if missing**. It will not overwrite an existing chain.

It **refuses** `opencode.jsonc` (JSON with comments). Add the plugin string by hand in that case.

### Finished layout

```text
your-project/
├── opencode.json                 # plugin: ["opencode-model-escalator"]  (npm)
└── .opencode/
    └── escalator.json            # required models[] chain
```

---

## 2. Required config: `.opencode/escalator.json`

`models` is mandatory. There is **no** shipped default chain. Missing sidecar + no inline options → load fails with `` `models` is required ``. That is intentional.

```json
{
  "models": [
    { "model": "openrouter/google/gemini-2.5-flash-lite" },
    { "model": "openrouter/openai/gpt-4.1-nano" },
    { "model": "openrouter/openai/gpt-5-nano" }
  ]
}
```

Replace those ids with ones **your** instance actually has.

1. Start OpenCode in the project.
2. `/connect` every provider the chain will use.
3. `/models` and copy ids exactly. Do not invent slugs.
4. Restart OpenCode after saving the sidecar.

Ids are `provider/model`, split on the **first** `/`. `openrouter/google/gemini-2.5-flash-lite` is one OpenRouter model, not a Google connection.

A well-formed but unknown catalog id is **not** rejected at load. It fails later when OpenCode tries to use it. Copy from `/models`.

Per-stage patience:

```json
{ "model": "openrouter/openai/gpt-5-nano", "same_failure_threshold": 3 }
```

### Config that looks valid and is not

A `github:` / package-name tuple **does not** deliver options. OpenCode still calls the plugin with `options === undefined`.

```json
["opencode-model-escalator", { "models": [ ... ] }]
```

That object is ignored. Put the chain in `.opencode/escalator.json`.

The only form that passes inline options is a **local path** tuple (this repo's dogfood):

```json
["./src/plugin/model-escalator.ts", { "models": [ ... ] }]
```

Do **not** drop `model-escalator.ts` into `.opencode/plugins/` (or `plugin/`). Auto-discovery loads it with no options → `` `models` is required ``.

---

## 3. Start it

```bash
cd /path/to/your-opencode-project
opencode
```

Submit tasks normally. Defaults:

- New top-level user task → `models[0]`.
- Recognized test command via `shell_tool_name` (default `bash`) + exit code → fingerprint.
- Identical failure counts again only after a mutating tool (`edit` / `write` / `patch` / …) succeeds.
- At `same_failure_threshold` (default `2`) → abort, switch to the next model, **replay the last user turn in the same session**.
- Top of chain + still stuck → abort, notify, latch. No token loop.
- 429 / 5xx / unavailable → same-model retry. Does **not** increment the capability counter.

---

## 4. Verify it loaded

Ask the agent, verbatim:

```text
Call model_escalator_control with action status.
```

A live plugin returns JSON-ish fields including `stage`, `activeModel`, `repeats`, `enabled`, and the resolved config.

| Result | Meaning |
|---|---|
| Tool exists, `enabled: true`, `activeModel` = `models[0]` | Installed and idle. Leave it alone. |
| Tool missing | Plugin never loaded. Check OpenCode startup log, then [Install errors](#install-errors). |
| Load error `` `models` is required `` | Sidecar missing, empty, or you used a `github:` options tuple. |
| Tool exists, tasks never escalate | Tests not seen (wrong runner / not `bash`), or no code edit between identical failures. See [It loaded but does nothing](#it-loaded-but-does-nothing). |

`model_escalator_control` is a **tool**, not a `/models` catalog entry and not a slash command. You will not find it in the model picker.

| Action | Effect |
|---|---|
| `status` | Stage, active model, repeat count, effective config. |
| `disable` | Escalation off for this session. |
| `enable` | On again. |
| `reset` | Clear failure state + session overrides, restore `enabled` to config default, return live model to `models[0]`. |

No auth on the tool. Anyone who can invoke tools in the session can `disable` / `reset`. Gate it with OpenCode `permission` if that matters — [`docs/CONFIGURATION_REFERENCE.md`](./docs/CONFIGURATION_REFERENCE.md) §5.

---

## Install errors

Most reports are one of these.

| Symptom | Cause | Fix |
|---|---|---|
| `` `models` is required `` | No `.opencode/escalator.json`, or options stuffed into a `github:` tuple, or file copied into `.opencode/plugins/` | Sidecar with a non-empty `models` array. Do not use auto-discovery. |
| Installer: `refusing to run as root` | `sudo` | Re-run as your user. Writes only inside the project. |
| Installer: `need python3, node, or bun` | Nothing to edit JSON | Install one of those, or merge the plugin string by hand. |
| Installer: `opencode.jsonc … will not rewrite` | JSONC | Add `"github:josz5930/opencode-model-escalator"` to `plugin` yourself; write the sidecar. |
| Installer: `is not valid JSON` | Broken `opencode.json` | Fix JSON first. The script will not guess. |
| Installer: `directory does not exist` | `--dir` pointed at a missing path, or you piped the script from the wrong cwd | Pass `--dir /real/project` or `cd` first. |
| Plugin not fetched | Ran `npm install` in *this* repo and expected that to wire the **target** project | The target project's `opencode.json` must list the `github:` spec. Restart OpenCode; Bun fetches it into `~/.cache/opencode/`. |
| Model error on first escalate / first task | Id not in `/models`, or provider not `/connect`ed | Copy ids from `/models`. `openrouter/...` needs an OpenRouter key, not a Google/OpenAI key. |
| Existing `opencode.json` settings vanished | Replaced the whole file with the minimal example | Restore from backup; **append** to `plugin`. |
| Two plugins fighting (abort loops, surprise session resets) | Combined with another abort/replay plugin | Remove the other one from these sessions. |
| `curl` missing (Ubuntu) | Minimal image | `sudo apt-get install curl`, then re-run the installer without sudo. |

Windows-specific: keep project path, sidecar path, and the `opencode` binary in the **same** environment (native vs WSL). Mixing `C:\...` config with a WSL `opencode` is a common miss.

---

## It loaded but does nothing

The detector is conservative. Ambiguous signal → no escalation.

1. Tests must run through `shell_tool_name` (default **`bash`**) and return an exit code. A missing exit code is ignored.
2. The command string must match `test_commands` (case-sensitive **substring**). Defaults: `pytest`, `python -m pytest`, `npm test`, `npm run test`, `pnpm test`, `yarn test`, `bun test`, `vitest`, `jest`, `go test`, `cargo test`, `dotnet test`, `mvn test`, `gradle test`.
3. Supplying `test_commands` **replaces** the default list. Keep every built-in you still need.
4. With `require_code_change_between_failures: true` (default), two identical failing runs with **no** edit count as one. The agent must actually write code via `edit` / `write` / `patch` / `multiedit` / `apply_patch` (or whatever you put in `mutating_tools` — also a replace, not a merge).
5. Custom test binary (`just test`, `make check`, `uv run pytest`) → add a substring to `test_commands`.
6. Subagents live in a child `sessionID`. Their test noise does not escalate the parent.

Turn on `"debug": true` in the sidecar and watch OpenCode logs if you need the fingerprint / ignore reason.

---

## Key options

Full list and validation rules: [`docs/CONFIGURATION_REFERENCE.md`](./docs/CONFIGURATION_REFERENCE.md).

| Key | Default | Meaning |
|---|---|---|
| `models` | — (required) | Cheap → strong chain. Length ≥ 1. Length 1 never escalates; it detects and stops. |
| `same_failure_threshold` | `2` | Identical failing repair cycles per stage before escalate. |
| `require_code_change_between_failures` | `true` | Count a repeat only after a mutating tool succeeded. |
| `reset_on_new_user_task` | `true` | New top-level user task → back to `models[0]`. |
| `stop_at_max_model` | `true` | Top tier: abort and latch. `false` still aborts each stuck cycle but does not latch. |
| `test_commands` | list above | Recognized test command substrings. |
| `mutating_tools` | `edit`, `write`, `patch`, `multiedit`, `apply_patch` | Tools that mark "code changed". |
| `retry_on_errors` | `[429,500,502,503,504]` | Infra (Category A). Retried, never escalated. |
| `provider_failover` | `true` | Bounded same-model recovery from infra errors. |
| `max_infra_retries` | `2` | Same-model infra retries per failure. |
| `infra_retry_cooldown_ms` | `1000` | Base delay for exponential infra backoff. |
| `notify` / `notify_on_escalation` | `true` / `true` | Toasts. Both must be true for escalation toasts. |
| `debug` | `false` | Verbose structured logs. |
| `fingerprint.*` | all on | Normalization before hashing (ANSI, durations, line numbers, temp paths, addresses). |

---

## How a decision is made

Two categories, never mixed:

- **A — infrastructure:** 429 / 5xx / unavailable. Retry same model. Does not move the stage.
- **B — capability:** same normalized test failure after enough repair cycles. Move one stage up, replay last user turn in the **same** session.

"Stuck" is exit code + fingerprint. No second LLM, no wall-clock, no randomness.

```
src/plugin/model-escalator.ts     only SDK file: load config, map events, back effects
src/session.ts                    single owner of abort / replay / notify
src/detection.ts                  test-command match, normalize, fingerprint, A vs B
src/counter.ts                    repair-cycle counts
src/config.ts                     load-time validation
src/replay.ts                     last user-turn payload
```

| OpenCode signal | Hook | Purpose |
|---|---|---|
| `tool.execute.after` (`bash`) | `onTestResult` | Fingerprint + count. |
| `tool.execute.after` (edit/write/…) | `onFileEdited` | Mark code changed. (`file.edited` has no `sessionID`; it is debug-only.) |
| `event: session.error` | `onSessionError` | Category A. |
| `chat.message` | `onChatMessage` | Task boundary / reset. |

Effects the adapter actually calls: `client.session.abort`, same-session `promptAsync` replay, `client.tui.showToast`, `client.app.log`.

---

## Develop / fork

```bash
git clone https://github.com/josz5930/opencode-model-escalator.git
cd opencode-model-escalator
npm install
```

| Command | What |
|---|---|
| `npm test` | Vitest: core + orchestrator + adapter offline. |
| `npm run test:live` | Real OpenCode. Needs `OPENCODE_LIVE=1` and `OPENROUTER_API_KEY`. Fails closed if unset. |
| `npm run typecheck` | Pure core. |
| `npm run typecheck:plugin` | Adapter vs `@opencode-ai/plugin`. |
| `npm run build` | `dist/`. Also runs on publish via `prepublishOnly`. |

No-symlink filesystems: `npm install --no-bin-links`, then call `node node_modules/vitest/vitest.mjs run`.

This repo dogfoods via a local `[path, options]` tuple in its own `opencode.json`. That is why there is no `.opencode/escalator.json` here.

Put new decision logic in `src/` with **no** `@opencode-ai/plugin` import. Keep the adapter thin. Acceptance bar is `AC-1 … AC-15` in [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md). Spec wins over code: [`docs/README.md`](./docs/README.md).

Invariants: bounded top of chain; A vs B never conflated; stage only increases inside a task; same-session replay; deterministic detection; count repair cycles not raw commands; one owner of recovery; ignore ambiguous signal.

MIT. Replay / `pendingModel` / `inFlight` patterns forked from [`opencode-model-fallback`](https://github.com/ShutovKS/opencode-model-fallback) (MIT — keep the notice). Stall-detection *ideas* only from [`opencode-auto-resume`](https://github.com/Mte90/opencode-auto-resume) (GPL-3.0). Do not copy GPLv3 source. See [`docs/ATTRIBUTION.md`](./docs/ATTRIBUTION.md) and [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

Unaffiliated with the OpenCode project.

---

## License

MIT © 2026 Joseph Zeng (josz5930). [`LICENSE`](./LICENSE).
