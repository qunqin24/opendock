# OpenCode V2 Token Usage Plugin

An **OpenCode V2** plugin that brings the real-time **Token Usage & Context Window Analytics** feature from **Kilo Code / Kilo CLI** into OpenCode.

It provides real-time visibility into LLM context window saturation, token consumption breakdowns (input, output, reasoning, prompt caching), and accurate session cost tracking across OpenCode's TUI and agent tool surfaces.

---

## ✨ Features

- **Context Window Saturation Meter**:
  - Live indicator of active context size vs. model capacity (e.g. `48k / 200k (24%)`).
  - Visual Unicode gauge bar: `[████░░░░░░░░░░] 24%`.
  - Color-coded saturation states:
    - 🟢 **Normal (< 60%)**: Safe operating headroom.
    - 🟡 **Warning (60% – 80%)**: Context is filling; compaction is approaching.
    - 🔴 **Critical (> 80%)**: High risk of context overflow or truncation.
- **Comprehensive Token Breakdown**:
  - **Input Tokens**: Prompt and attachment tokens.
  - **Output Tokens**: Generated completions.
  - **Reasoning Tokens**: Dedicated accounting for reasoning/thinking models (e.g. o1/o3, Claude Thinking, DeepSeek R1).
  - **Cache Read (Hit)**: Tokens served from prompt cache.
  - **Cache Write**: Tokens written to prompt cache.
  - **Cache Hit Rate**: Percentage of prompt tokens retrieved from cache.
- **Cost & Savings Tracking**:
  - Real-time session USD cost.
  - Estimated dollar savings from prompt cache hits.
- **Features**:
  - **Collapsible Sidebar Widget (`sidebar.content`)**: Expandable panel with gauge and detailed table. State persists across restarts.
  - **Agent Tool (`token_usage`)**: Programmatic tool for agents to check token budget in Code Mode or subagent workflows.
  - **Slash Command (`/tokens`)**: Quick token summary in session chat.

---

## 📸 TUI Preview

### Collapsible Sidebar

```
▼ Token Usage
  Model              claude-3-7-sonnet
  Context Window     [████░░░░░░░░]
   Usage             48k / 200k (24%)
   Remaining         152k tokens
  Session Tokens     57k
   Input             10k
   Output            2k
   Reasoning         500
   Cache Read (hit)  40k
   Cache Write       5k
   Cache Hit Rate    80%
  Estimated Cost     $0.045
   Cache Savings     ~$0.108
  Last Turn (#1)     $0.030
   Prompt / Out      8k / 1.2k
```

### Collapsed Sidebar

```
▶ Token Usage (24% • $0.045)
```

---

## 🚀 Installation & Usage

### 1. Enable in OpenCode Configuration

Add the plugin to your `opencode.jsonc` (project or global `~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-v2-token-usage"],
}
```

To load it specifically for the TUI interface, you can also add it to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["opencode-v2-token-usage"]
}
```

### 2. Chat Slash Command

In any OpenCode chat session, you can run `/tokens` to output a token summary in the conversation.

---

## 🛠️ Development

This plugin is built with:

- [TypeScript](https://www.typescriptlang.org/)
- [Solid JS](https://www.solidjs.com/) & [@opentui/solid](https://opentui.org/)
- [esbuild](https://esbuild.github.io/) & [Babel](https://babeljs.io/)

### Build

```bash
bun run build
```

### Type Check

```bash
bun run check
```

### Run Tests

```bash
bun test
```

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
