# opencode-reasoning-pruner

Prunes historical `reasoning` parts from the message history before it is re-sent to the LLM, keeping only the last turn's reasoning. Saves context window and tokens on reasoning models (DeepSeek, GLM, Kimi, Qwen, ...) without touching what the model sees in the current turn.

- Model-agnostic: strips any `part.type === "reasoning"`, regardless of provider key naming (`reasoning_content` vs `reasoning` / `reasoning_details`).
- Zero regex, zero event-stream manipulation, zero system-prompt injection.
- Reasoning is still visible in the TUI (`/thinking`) and still consumed during generation — only the historical copies are pruned.

## Install

```sh
npm i @ghilteras/opencode-reasoning-pruner
# or: bun add @ghilteras/opencode-reasoning-pruner
```

Then add it to the `plugin` array of `opencode.json`:

```json
{
  "plugin": ["@ghilteras/opencode-reasoning-pruner"]
}
```

## How it works

Hooks `experimental.chat.messages.transform`: finds the index of the last `KEEP_TURNS` user message(s) and removes every `reasoning` part before that index. Default `KEEP_TURNS = 1` (keeps the reasoning of the current turn, prunes everything older).

## Config

Edit the `KEEP_TURNS` constant in `plugin.js` (default 1).

## Notes

- opencode's built-in `compaction.prune` only trims tool-output bytes — it does NOT touch reasoning parts. This plugin complements it.
- Adjacent plugins exist for tool-output pruning (DCP/ACP) and for the opposite direction (preserving reasoning to fix provider 400s); none strip reasoning parts from history.

## License

MIT © 2026 Angelo Pantano
