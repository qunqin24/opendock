<p align="center">
  <img src="./assets/agent-wingman-logo.svg" width="190" alt="Agent Wingman: a friendly winged robot keeping watch" />
</p>

<h1 align="center">Agent Wingman for OpenCode</h1>

<p align="center"><strong>No agent goes alone.</strong></p>

<p align="center">
  A local, detector-first OpenCode plugin that notices repetitive, low-progress work and gives a concise nudge before the loop becomes expensive.
</p>

> **Status:** `0.1.0` release candidate. The package is prepared for public npm publishing but is not published yet. This is a community project, not an official OpenCode product.

## Why Agent Wingman

Coding agents can repeat the same failing command, revisit the same file or search, restate a plan, or keep consulting without changing the hypothesis. Agent Wingman watches OpenCode's local event stream for those patterns and intervenes only when repetition and low progress occur together.

The detector is deterministic and bounded. It does not call another model, upload transcripts, or block tool execution.

## What it does

- Observes terminal tool results through both `tool.execute.after` and the stable event stream, deduplicating the two paths.
- Observes completed assistant text without treating user prompts as agent struggle.
- Detects repeated failures, error-family recurrence, read/search churn, plan repetition, consultation churn, and dense low-progress windows.
- Applies confidence scoring, cooldowns, per-episode caps, and global rate limits.
- Defaults to a bounded, visible user-role advisory in the next model request; notification-only and shadow modes remain available.
- Fails open: detector or delivery errors never block OpenCode.
- Uses a version-neutral runtime adapter with no OpenCode package dependency or exact-version gate.

## Inline advisory

When the detector identifies a high-confidence low-progress loop, Agent Wingman queues a fixed advisory for the next model request in the same active run. The native message-transform hook persists a labelled user-role message through `session.prompt` with `noReply: true`, then includes it in the current model request. The `chat.message` hook preserves the active agent, model, variant, tool mask, system, output format and execution metadata on that exact plugin-created message. A new user-message boundary may cause one additional sequential model request; the plugin does not explicitly launch another run. Advice expires, is cleared at idle, and is discarded when the user message or execution generation changes. Compaction requests do not receive advice. If compaction creates a new user-message root, the old advice is discarded.

The advisory is visible in the conversation as a separate user-role message labelled as plugin-generated, not user-authored.

## Install

### From source today

```bash
git clone https://github.com/spyd3r83/agent-wingman.git
cd agent-wingman
bun install
bun run verify
bun run build
mkdir -p /path/to/project/.opencode/plugins
cp dist/src/index.js /path/to/project/.opencode/plugins/agent-wingman.js
```

OpenCode automatically loads JavaScript files in `.opencode/plugins/` on startup.

### After the first npm release

```bash
opencode plugin opencode-agent-wingman
```

Or add it to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-agent-wingman"]
}
```

## Modes

| Mode | Model-visible | Behaviour |
|---|---:|---|
| `inject` | Yes | Default. Persists a labelled user-role advisory at the next model request; unknown context falls back to notify. |
| `notify` | No | Shows a warning toast and writes a structured local log. |
| `shadow` | No | Logs eligible interventions without displaying them. Good for calibration. |

Example with options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [["opencode-agent-wingman", { "mode": "shadow", "threshold": 9 }]]
}
```

See [CONFIGURATION.md](./CONFIGURATION.md) for every bounded option.

## Privacy and safety

- No telemetry or external service is added. Visible delivery persists the advisory in the local OpenCode conversation through its SDK.
- Detector state does not retain raw prompts, tool arguments, tool output, source files, or command results. Visible delivery briefly copies the active message metadata to preserve worker context; OpenCode stores that metadata with the advisory.
- Secret-shaped values are redacted before fingerprinting.
- Fingerprints use an ephemeral per-process HMAC key, so they cannot be correlated across restarts.
- Advisories are fixed templates and never quote untrusted tool output.
- Session observations, episode state, and deduplication state all have hard memory bounds.

Read [PRIVACY.md](./PRIVACY.md) and [SECURITY.md](./SECURITY.md) for the full boundaries.

## Validation

```bash
bun test
bun run typecheck
bun run trace:replay
bun run smoke
bun run package:check
```

CI additionally loads the same distributable through real OpenCode minimum, midpoint, and npm `latest` runtimes. If OpenCode is installed locally, `bun run smoke:opencode` runs the same isolated load check. The trace corpus separately enforces precision, recall, and duplicate-intervention gates. See [COMPATIBILITY.md](./COMPATIBILITY.md) for the precise support contract.

## Scope

Agent Wingman is advisory. It does not browse, execute tools, mutate files, delegate agents, make access-control decisions, or claim that deterministic detection can identify every unproductive loop. Start in `shadow` mode when evaluating unfamiliar workflows.

The default advisory is a fixed template labelled as plugin-generated in a visible user-role message. If the host lacks the prompt surface, the advisory remains a synthetic part of the model request. It never includes raw prompts, tool arguments, tool output, source text, or command results. Set `mode` to `notify` for user-only delivery or `shadow` for log-only calibration.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Detection changes need a labelled synthetic trace that explains the false positive or false negative being addressed.

## License

Apache-2.0. See [LICENSE](./LICENSE).
