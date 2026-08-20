# opencode-explained-right

**English** | [简体中文](README.zh-CN.md)

Make the OpenCode agent **tell you why** it wants to access files **outside the project directory** — out loud, before it does.

A server-only plugin. No TUI changes, no popups — it injects a system-prompt rule so the AI states the reason itself, right in the conversation.

## Install

Published on npm. **One-liner (recommended):**

```bash
opencode plugin opencode-explained-right
```

**Or copy this into any opencode session and let opencode install it for you:**

```text
Please install the opencode-explained-right plugin (it makes the agent state, out loud, which external path it is about to access and why, before doing so).

Steps:
1. Run the command: opencode plugin opencode-explained-right
2. Check that ~/.config/opencode/opencode.json contains "opencode-explained-right" in its "plugin" array; add it if missing.
3. Tell me the result in one sentence, and remind me to "restart opencode for it to take effect".
```

Or add it to your config manually:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugin": ["opencode-explained-right"]
}
```

> **Restart opencode after installing.** Alternatively, install straight from the GitHub repo with `opencode plugin github:Ryan9438/opencode-explained-right`.

Optional: confirm external directories require approval (this is already the default):

```jsonc
{
  "permission": { "external_directory": "ask" }
}
```

## How it works

`explained-right.ts` (a single-file server plugin) injects a strong rule into the system prompt via `experimental.chat.system.transform`: *before touching any file or directory OUTSIDE the project working directory, the agent MUST tell the user out loud — in the user's language, as one short line starting with ⚠️ — the exact external path and the reason, and write that line as the last thing before the tool call.*

So the agent states its purpose in the conversation before the permission prompt fires. Approval still belongs entirely to OpenCode's native once/always/reject dialog.

Tested (opencode 1.18.10, agent reading `/etc/hosts`):

```
⚠️ 我将访问项目外文件 /etc/hosts：读取系统文件内容以回答你的问题。
```

> Tip: the permission dialog is fullscreen by default. Press `ctrl+f` to minimize it so you can see what the agent just said while deciding.

## Configuration (no config file needed)

| Env var | Effect | Default |
|---|---|---|
| `EXPLAINED_RIGHT_SYSTEM_RULE` | Set `false` to disable system-prompt injection | enabled |
| `EXPLAINED_RIGHT_RULE` | Custom rule text injected into the system prompt | built-in default |
| `EXPLAINED_RIGHT_DEBUG` | Set `1` to write diagnostics to `/tmp/explained-right-debug.log` | off |

## Limitations

- Relies on the model following the system prompt; occasionally the agent may forget, but it usually complies.
- For stricter enforcement, a `tool.execute.before` interceptor (requiring the agent to restate the reason on external paths) could be added; not enabled by default.
- If upstream lands [issue #37164](https://github.com/anomalyco/opencode/issues/37164) or adds a `reason` field to permission requests, the reason could be embedded directly in the approval dialog in the future.

## Contributing

Development and publishing: see [CONTRIBUTING.md](./CONTRIBUTING.md).
