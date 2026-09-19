# @resonanceee/agent-police

[![publish](https://github.com/resonanceee/agent-police/actions/workflows/publish.yml/badge.svg)](https://github.com/resonanceee/agent-police/actions/workflows/publish.yml)
[![npm](https://img.shields.io/npm/v/@resonanceee/agent-police)](https://www.npmjs.com/package/@resonanceee/agent-police)
[![license](https://img.shields.io/npm/l/@resonanceee/agent-police)](./LICENSE)

Published on [npmjs](https://www.npmjs.com/package/@resonanceee/agent-police) and [GitHub Packages](https://github.com/resonanceee/agent-police/pkgs/npm/agent-police).

An [opencode](https://opencode.ai) plugin that puts a **police officer between your coding agent and your machine**: an LLM reviewer judges every bash command the agent wants to run, *before* it executes.

Catches agents that are **misaligned with the task** — whether from hidden malice, a prompt-injected payload, or a model that simply misunderstood the task and is about to do something destructive with confidence.

## What it does

Every `bash` tool call is paused and sent to a reviewer model with the recent conversation, the command, and any prior justifications. The reviewer returns one of three verdicts (strict JSON):

| Verdict         | Meaning                                              | Effect on the agent                    |
| --------------- | ---------------------------------------------------- | -------------------------------------- |
| `safe`          | Aligned with the task, not dangerous                 | Command runs as intended               |
| `elaborate`     | Ambiguous, unusual, or risky                         | Command blocked; reviewer asks **one concrete question** |
| `human-review`  | Dangerous, evasive, deceptive, or misaligned         | Command blocked until a **human** decides |

### Turn budget (min 1, max 3)

```
T1 (command only)          → safe | elaborate
T2 (after 1st justification) → safe | elaborate | human-review
T3 (after 2nd justification) → safe | human-review
```

- **Elaborate loop**: the block message contains the reviewer's question. The agent explains itself in chat and retries the exact same command; the retry is recognized and judged again.
- **Human review**: the agent (and you) get a block message with three options, decided by replying in chat:
  - `approve` — allow this command once
  - `follow up: <question>` — ask the agent a question before deciding
  - `cancel` — reject the command; the agent is told not to retry
- **Fail-closed**: reviewer timeout, HTTP failure, or malformed JSON never silently approves — it escalates to human-review.

## Setup

In the project (or global) opencode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@resonanceee/agent-police"]
}
```

Configure the reviewer model via environment variables:

| Variable                | Required | Default                          |
| ----------------------- | -------- | -------------------------------- |
| `AGENTPOLICE_API_KEY`   | yes      | —                                |
| `AGENTPOLICE_BASE_URL`  | no       | `https://api.openai.com/v1`      |
| `AGENTPOLICE_MODEL`     | no       | `gpt-4o-mini`                    |

Any OpenAI-compatible endpoint works (OpenRouter, Synthetic, vLLM, Ollama, …). Example for OpenRouter:

```bash
export AGENTPOLICE_API_KEY="sk-or-..."
export AGENTPOLICE_BASE_URL="https://openrouter.ai/api/v1"
export AGENTPOLICE_MODEL="z-ai/glm-5.3-flash"
```

## Judge recommendations

Given that this plugin has been built with the intention of bolstering security, when choosing a judge keep in mind that quality matters more than speed. From the 160-conversation fixture suite (`test/fixtures-*.json`: openly dangerous, openly safe, and ambiguous cases with malicious / confused / honest / lazy agent personalities):

| Model                       | Score    | Notes                                                        |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `z-ai/glm-5.3-flash`        | 160/160  | recommended default — cheap and catches narrative injection   |
| `inclusionai/ling-3.0-flash`| 138/160  | takes the agent's own transcript narrative at face value; approved attacker pip indexes, public S3 uploads, disabled security middleware |

## Behavior notes

- Only the `bash` tool is monitored; file edits stay under opencode's own permission system.
- Review state is in-memory, keyed by the exact command string; restarting opencode resets it.
- Human approval is detected by scanning for `approve` / `cancel` in user messages sent after the block.
- Latency: one fast-model call per new command (plus one per justification round). Keep the reviewer on a cheap flash-class model.

## Development

```bash
bun install
bun test/harness.ts --mock                # wiring check, no network
bun test/harness.ts --live --model=z-ai/glm-5.3-flash   # full 160-fixture judge run
RUN_INTEGRATION=1 bun test test/integration.test.ts     # boots real opencode in a sandbox project
bun run typecheck
```

## License

[MIT](./LICENSE)
