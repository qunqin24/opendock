# 🎯 OpenCode session goals

🤖 A persistent goal plugin for **OpenCode 1.19.4**, following the session-scoped lifecycle described in [Codex's Goals documentation](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex).

🌱 This is an independent community plugin, not built by or affiliated with the OpenCode team or OpenAI.

🚀 Give a session a verifiable objective. When a turn finishes and the session is idle, the plugin continues work until the model verifies completion, you stop it, a budget is reached, or progress cannot continue.

## 📦 Install from npm

📦 Published as [opencode-session-goals](https://www.npmjs.com/package/opencode-session-goals) by `fir3pho3nixx`. Add it to `opencode.json`, then restart OpenCode:

```json
{
  "plugin": ["opencode-session-goals@0.1.2"]
}
```

🤖 OpenCode installs the package and dependencies. This release targets **1.19.4**; OpenCode 2.x has a different API.

## 🐙 Install from GitHub

📥 Add the versioned release package to `opencode.json`, then restart OpenCode:

```json
{
  "plugin": ["https://github.com/RealOrko/opencode-goals/releases/download/v0.1.2/opencode-session-goals-0.1.2.tgz"]
}
```

🤖 OpenCode installs the package and dependencies. This release targets **1.19.4**; OpenCode 2.x has a different API.

## 🛠️ Install a development checkout

🟢 Requires Node.js 22+ for development and OpenCode 1.19.4 to run. Clone [RealOrko/opencode-goals](https://github.com/RealOrko/opencode-goals), then:

```sh
npm ci
npm run install:global
```

🔄 Restart OpenCode. The installer adds this checkout's built plugin to `~/.config/opencode/opencode.json`, preserving other settings and making a backup. Keep this checkout and its `node_modules` in place. After code changes, run `npm run build` and restart OpenCode.

📂 For project-only installation, build the package and add its absolute file URL to that project's `opencode.json` instead:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-goals/dist/index.js"]
}
```

🧹 Use `npm run uninstall:global` to remove the global registration. This preserves saved goals.

## ⌨️ Commands

```text
/goal Make the full test suite pass without changing the public API
/goal
/goal status
/goal pause
/goal resume
/goal clear

/goal --tokens 200000 Fix and verify the flaky integration test
/goal --turns 20 Implement the migration and verify all milestones
/goal budget 300000
/goal budget off
```

🪙 Limits are optional and must be explicitly supplied. `--turns` limits additional automatic continuations; the initial user turn is not an automatic continuation. `/goal budget N` sets the total goal token budget, not additional tokens. Changing a stopped goal's budget does not resume it; follow with `/goal resume`. To replace an unfinished goal or change a continuation cap, clear it and create a new goal. `--` ends option parsing, for example `/goal -- pause` creates the literal objective “pause”.

🧰 The model also gets `create_goal`, `get_goal`, and `update_goal` tools. It may create a goal on an explicit user request, inspect it, mark it complete with evidence, or report a recurring external blocker. Pause, resume, clear and budget changes belong to the user. Send ordinary follow-up messages to steer the work within the same objective.

## 🔄 Behavior

Goal status uses the same icons in chat: ▶️ active · ⏸️ paused · 🚧 blocked · ✅ complete · 🛑 budget limited.

- 💾 One persisted goal per OpenCode session. Goals never become repository instructions or carry into another session or subagent.
- 🎛️ State transitions are applied by the plugin. `/goal pause` does not depend on the model choosing to call a pause tool.
- 🕰️ Idle events are debounced. Before dispatch, the plugin checks fresh session status and the latest user and assistant messages. Busy sessions, pending permission/questions, errors, incomplete turns, and plan mode do not dispatch work.
- 🔒 A durable, locked lease deduplicates continuation across duplicate events and multiple plugin instances. Each synthetic prompt is checked again in `chat.message`; user steering, pause or clear invalidates stale prompts before they are persisted.
- 🧭 An automatic turn with no work tool calls pauses the goal. Failed work tools allow another attempt. Goal bookkeeping tools alone do not keep the loop alive.
- ⏸️ Interruptions and session errors pause the goal. Declining a permission or question also pauses it. Resume is explicit.
- 🚧 The same blocker must be reported in three distinct consecutive turns to enter `blocked`. Repeated calls within one turn count once. Resuming clears that blocker audit.
- 🧠 The goal is injected into each model request and compaction context. The selected working agent, model and reasoning variant are preserved on continuation.
- 🪙 Token usage is incremental and deduplicated by assistant message ID. The budget counts uncached input, cache reads/writes, output and reasoning tokens as separately reported by OpenCode. Earlier session usage and unrelated turns while paused are excluded; remaining output from a goal turn already in progress is included.
- 🛑 Budget exhaustion stops automatic work and requests an abort of the current turn when usage is reported. It never marks the objective complete.
- ✅ Completion requires nonempty evidence and a completed non-goal tool call from the goal's work. The model must judge whether that evidence actually satisfies every requirement; this is not an independent proof checker.

## 💾 State and boundaries

💾 State is saved under `${XDG_STATE_HOME:-~/.local/state}/opencode-goals/<directory-hash>/<session-id>.json`, with private file permissions, interprocess locking and atomic replacement. `OPENCODE_GOALS_STATE_DIR` changes the storage root. Corrupt or unsupported state produces an error and is preserved. Locks abandoned by a crashed process expire after 5 seconds; writes retry long enough to recover them on the first command after restart.

🌅 Server startup does not launch unattended work in every saved session. Saved state becomes available when the session is opened or used; `/goal resume` explicitly starts work again when needed. An OpenCode process must stay running for automatic continuation.

🎯 This release targets the installed **1.19.4 plugin API**. It does not claim OpenCode 2.x compatibility. It does not add a native Codex-style progress row.

💬 OpenCode 1.19.4 always starts a model turn after its server-side command hook. As a result, `/goal status`, pause, clear and budget controls still produce a short model acknowledgement. The state change happens first; a tool guard prevents that acknowledgement from changing the goal or doing substantive work. Command acknowledgements are excluded from goal usage. Removing this extra model call needs a host command API that can return a handled result, or a separate client integration. No sentinel exception is thrown to hide the command.

🚦 The host does not expose an atomic “only admit if idle and no user input is queued” operation to v1 plugins. This plugin checks fresh state and validates its lease at admission, but cannot promise identical scheduling to Codex's native dispatcher. Token budgets are enforced at the host's usage-reporting boundaries, so one in-flight model step can exceed the remaining budget.

## 🧪 Development and verification

```sh
npm run build
npm test
npm run test:integration
```

🧪 The integration test starts a real OpenCode server with isolated config/data/state directories and a local deterministic OpenAI-compatible provider. It makes no paid model calls and does not load your provider credentials. It verifies plugin registration, an actual idle-triggered continuation with shell tools and evidence-based completion, goal persistence across server restart, no-tool loop suppression, token-budget stops, pause/clear and actual running-turn interruption.

📌 `@opencode-ai/plugin` is pinned to match the host. Its dependency tree currently produces npm audit advisories in upstream `zod` and `toml` dependencies. This package does not override the host's Effect runtime or upgrade its API underneath it.

## 🚢 Publishing a release

🚢 Run the checks above, create a versioned package with `npm pack`, and publish the tested tarball with `npm publish <tarball> --access public`. npm requires publishing authentication. GitHub release installation is also available independently of npm publication.
