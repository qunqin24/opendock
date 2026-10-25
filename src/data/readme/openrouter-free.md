# opencode-free-router

[![ci](https://github.com/ERKPRIME/openrouter-free/actions/workflows/ci.yml/badge.svg)](https://github.com/ERKPRIME/openrouter-free/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/openrouter-free.svg)](https://www.npmjs.com/package/openrouter-free)
[![npm downloads](https://img.shields.io/npm/dm/openrouter-free.svg)](https://www.npmjs.com/package/openrouter-free)
[![Coverage Status](https://coveralls.io/repos/github/ERKPRIME/openrouter-free/badge.svg?branch=master)](https://coveralls.io/github/ERKPRIME/openrouter-free?branch=master)

An [opencode](https://opencode.ai) plugin that always runs on the **best free model available right now**.

Pick one model, `free/auto`, and the plugin does the rest:

- **Ranked, not random.** Free models are scored with [LMArena](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset) and [Artificial Analysis](https://artificialanalysis.ai).
- **Sticky.** A session keeps its model; new sessions get newer/better models.
- **Failover.** Quota, rate-limit or removed models go on cooldown and the turn continues on the next model.
- **Free only.** An explicit allowlist; subscription plans priced 0 are never used.

## Requirements

- `opencode 2` (`opencode --version` reports 2.x)
- Node.js 22.18+ (or Bun on POSIX)

## Install (npm)

The recommended way to install is via npm:

```sh
npm install -g openrouter-free
openrouter-free
```

After installing, run `openrouter-free` (or `opencode-free`) to start using it. Your normal `opencode` command is unaffected.

## Other install options

If you prefer to install from a checkout (for example to choose the install folder, or on Windows without npm):

```sh
git clone https://github.com/ERKPRIME/openrouter-free.git
cd openrouter-free

# macOS / Linux / WSL / Git Bash:
./scripts/install.sh

# Windows Command Prompt:
install.cmd

# Windows PowerShell:
.\install.ps1
```

Options: `--bb` also registers a "Free (auto)" ACP agent in bb; `--dir PATH` chooses the install folder; `--no-rank` skips the first ranking.

Re-running the installer upgrades in place and never overwrites your config, keys or state.

## Usage

```sh
openrouter-free                 # TUI on free/auto
openrouter-free run "..."       # one-shot (quote the message)
openrouter-free acp             # ACP agent (bb, Zed, JetBrains…)
openrouter-free doctor          # versions, paths, what is missing
openrouter-free rank --status   # ranking, cooldowns, model per session
```

`openrouter-free` is plain `opencode` with the free-router config layered on top via `OPENCODE_CONFIG`.

## Free models

Without keys you get OpenCode Zen's free models. Each key you add grows the pool:

| Provider | Env var |
|---|---|
| OpenRouter | `OPENROUTER_API_KEY` |
| NVIDIA | `NVIDIA_API_KEY` |
| Z.AI / Zhipu | `ZHIPU_API_KEY` |
| ModelScope | `MODELSCOPE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| Google AI Studio | `GOOGLE_GENERATIVE_AI_API_KEY` |

Keys from `opencode auth login` or your shell work automatically. Otherwise put them in `~/.config/opencode/free-router/providers.env` (Windows: the install folder).

Use free-plan accounts: Groq, Cerebras, Google and Mistral free tiers may charge if billing is enabled.

## Configuration

Everything is optional. `config.json` merges key by key with the defaults. `pins.json` pins, bans and aliases models:

```json
{
  "pin":   ["opencode/space-bunny-free"],
  "ban":   ["openrouter/liquid/lfm-2.5-2.6b:free"],
  "alias": { "opencode/some-model-free": "leaderboard-name" }
}
```

Run `openrouter-free rank --status` after editing.

## Update / uninstall

```sh
npm update -g openrouter-free
npm uninstall -g openrouter-free
```

Data (`config.json`, keys, `ranking.json`, state) is kept unless you purge it manually.

## License

[BSD-2-Clause](LICENSE)

Model scores come from LMArena and Artificial Analysis; not affiliated with either, or with opencode.
