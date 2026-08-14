# SuperBased — Eyes AND Hands for OpenCode

Screenshot capture, AI vision, OCR, screen recording, visual regression testing, token compression, voice dictation, proactive screen monitoring, **and full GUI automation with humanization v2** — all via 72 MCP tools, directly inside [OpenCode](https://opencode.ai).

## Install

The plugin ships as an npm package. Install it globally so OpenCode can resolve it from your `opencode.json`:

```bash
npm install -g superbased-opencode-plugin superbased
```

Then add both the plugin and the MCP server to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["superbased-opencode-plugin"],
  "mcp": {
    "superbased": {
      "type": "local",
      "command": ["superbased", "mcp"],
      "enabled": true
    }
  }
}
```

A reference `opencode.json` ships in this package at the root if you want to copy from it.

## Prerequisites

- **OpenCode** ≥ the version that supports the TypeScript plugin SDK (`@opencode-ai/plugin`)
- **SuperBased CLI** installed globally on PATH: `npm install -g superbased`
- (Optional) **SuperBased desktop app** running on Windows or macOS — auto-detected via the PID file at `~/.superbased/`. When the desktop app is running, `superbased mcp` acts as a stdio↔HTTP bridge so the desktop and OpenCode share state.
- Node.js 20+

## What this plugin does

OpenCode plugins are TypeScript modules that hook into the OpenCode lifecycle. The 72 SuperBased tools live in the **MCP server** (`superbased mcp`), which OpenCode reaches via the `mcp.superbased` config above. **This npm package is the lifecycle wrapper around that MCP server**, adding three ergonomic value-adds:

1. **Pre-flight safety check** — when a destructive SuperBased GUI action (`_click`, `_type`, `_drag`, `_form_fill`, `_sequence`, etc.) is called without `confirm: true`, the plugin warns proactively. The MCP server enforces this rejection anyway, but the client-side warning gives a faster and clearer UX.
2. **Post-flight telemetry** — expensive SuperBased calls (`_recording`, `_narrate`, `_scroll_capture`, `_describe_frames`, `_compress_text`) get their durations logged when they exceed 5 seconds, so you notice the cost.
3. **Audit-log surface** — when permission is asked for a SuperBased tool the first time in a session, the plugin surfaces where the NDJSON audit log lives so you know where actions are recorded.
4. **Init probe** — at plugin load time, verifies the `superbased` CLI is on PATH and prints the version. If not installed, surfaces an actionable error before the first MCP call fails opaquely.

You can use SuperBased with OpenCode without this plugin (just configure the MCP server). The plugin adds polish, not capability.

## Skills (11)

Skills are reference-only on OpenCode — the package ships them so you can read them, paste relevant ones into your context, or fork them into your own opencode prompt. They don't auto-load the way Claude Code skills do.

| Skill | Topic |
|-------|-------|
| **screenshot** | When to capture the screen and at what resolution |
| **visual-qa** | Record baseline → make changes → record again → diff → annotate workflow |
| **monitor** | Proactive screen watching during deploys, tests, or builds |
| **compress** | Convert large text to token-efficient images |
| **redact** | Auto-redact secrets / PII before sharing screenshots |
| **dictation** | Voice input, audio transcription, speech-to-text |
| **annotate** | Highlighting areas, marking regressions |
| **walkthrough** | Multi-frame product walkthrough (capture, narrate, export) |
| **gui-automation** | Reliability pyramid + sequence patterns + safety rails for the click/type/drag surface |
| **captcha-solving** | Image grid / drag puzzle / rotation puzzle / checkbox CAPTCHA patterns |
| **humanization** | Picking the right `humanize` profile per call |

## Commands (26)

Same situation as skills — reference markdown, not auto-loaded. Useful for prompting OpenCode like "use the SuperBased :form command pattern to fill this out" — paste the relevant `commands/<name>.md` into context.

## Agents (3)

`agents/visual-qa/AGENT.md`, `agents/monitor/AGENT.md`, `agents/gui-automation/AGENT.md` — same reference pattern. Useful when forking your own OpenCode subagent off the SuperBased orchestration patterns.

## Humanization v2

GUI automation actions (`click`, `type`, `drag`, `hover`) ship with a humanization layer to reduce the bot-detection signal: sin-shaped velocity envelope on cursor walks, gaussian click-target jitter, gamma-distributed pre-click settle dwell, 50–110 ms click hold variation, 45–95 ms key hold, wired typo simulation with QWERTY same-row neighbors, pre-click tremor on the target element, occasional 2–4× micro-pauses, per-process cross-session salt mixed into seeds, inter-action catch-up pause, and opt-in idle cursor drift.

Four profiles selectable per call: `humanize: 'off' | 'light' | 'human' | 'paranoid'`. Default `light`. Bump to `human` or `paranoid` for sites with active bot detection — see the **humanization** skill.

## CAPTCHA solving

Plugin ships proactive guidance for the four CAPTCHA classes: image grids (vision identifies, batched click sequence), drag puzzles (one-motion drag with `humanize: 'light'`), rotation puzzles (calibrate-then-execute), and checkbox-only Turnstile. Plus the honest "what humanization can't defeat" list (server-side fingerprinting, audio CAPTCHAs, hCaptcha enterprise mode). See the **captcha-solving** skill.

## MCP Tools (72)

The 72 tools come from the SuperBased MCP server, not this plugin. See [the source-of-truth Claude Code plugin README](https://github.com/marmutapp/superbased-claude-code-plugin#mcp-tools-72) for the full categorized list with collapsibles.

Categories: Capture & View (5), AI & OCR (8), Gallery (2), Privacy & Annotations (2), Dictation & Voice (2), Recording & Visual QA (7), Settings/Auth/System (6), and **GUI Automation (40)**.

## Development

```bash
git clone https://github.com/marmutapp/superbased-opencode-plugin
cd superbased-opencode-plugin
npm install
npm run build         # tsc → dist/
```

Plugin entry: `src/index.ts` (default export is the OpenCode `Plugin` async function).

The runtime probe in `src/mcp-bridge.ts` spawns `superbased --version` to verify the CLI is reachable; fails open (logs a warning) so the plugin never blocks OpenCode startup.

## Links

- [SuperBased](https://superbased.app) — Desktop app + npm CLI
- [npm: superbased](https://www.npmjs.com/package/superbased) — The CLI providing the MCP server
- [npm: superbased-opencode-plugin](https://www.npmjs.com/package/superbased-opencode-plugin) — This package
- [OpenCode docs](https://opencode.ai/docs/plugins) — Plugin SDK reference
- [Source-of-truth Claude Code plugin](https://github.com/marmutapp/superbased-claude-code-plugin) — Where shared content (skills/commands/agents) is mastered
