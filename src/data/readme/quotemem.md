# QuoteMem

[![npm](https://img.shields.io/npm/v/quotemem)](https://www.npmjs.com/package/quotemem) [![PyPI](https://img.shields.io/pypi/v/quotemem)](https://pypi.org/project/quotemem/) [![CI](https://github.com/edsml-jz2321/QuoteMem/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/edsml-jz2321/QuoteMem/actions/workflows/ci.yml)

QuoteMem is a long-term memory service for AI agents that keeps the exact words behind every memory.

- **Every memory keeps its exact quote.** Each memory is a short statement
  tied by byte range to the words it came from.
- **Updates keep the old version.** When a fact changes, a new version is
  written and the old one is kept and marked as replaced.
- **"Forget" is carried out and stays forgotten.** The memories the request
  matches are taken out of reads and are not learned again later, except
  from the user's own later, dated statement of it in the `agent` Add mode.

<p align="center"><img src="https://raw.githubusercontent.com/edsml-jz2321/QuoteMem/main/docs/images/how-quotemem-works.svg" width="900" alt="Conversation, extraction with a byte-range quote, review against the nearby memories, memory with versions, then recall with the quote, or forget with a tombstone"></p>

## Demo

[`examples/demo`](https://github.com/edsml-jz2321/QuoteMem/blob/main/examples/demo/README.md)
tells one short story to a running service, for a new user. Chat 1:
"I live in Beijing. My cat is called Bob. I work as a nurse." Chat 2:
"I moved from Beijing to Shanghai last month." Chat 3: "Forget my cat's
name." It runs from a clone of the repository, after `npm install -g quotemem`
and `quotemem setup`:

```bash
git clone https://github.com/edsml-jz2321/QuoteMem.git
cd QuoteMem
quotemem serve &
node examples/demo/demo.mjs
```

This is a real run with the default preset (output shortened):

```text
$ node examples/demo/demo.mjs
2. Chat 2, the user says: "I moved from Beijing to Shanghai last month."
   stored: 1 corrected
3. The memories, each with its quote:
   [past] The user lives in Beijing.
   [current] The user moved from Beijing to Shanghai last month.
     quote: "I moved from Beijing to Shanghai last month."
   ...
   history of the city, newest first:
   update: The user moved from Beijing to Shanghai last month.
   create: The user lives in Beijing.
4. Recall:
   search "Where does the user live now?", first hit:
   The user moved from Beijing to Shanghai last month. (said on ...)
   Status: current
   - user: "I moved from Beijing to Shanghai last month."
5. Chat 3, the user says: "Forget my cat's name."
   prepare, goes: The user's cat is named Bob.
   confirm: verified
6. After the forget:
   [current] The user has a cat.
     quote: "My cat"
   ...
   search "What is the name of the user's cat?", first hit:
   The user has a cat. (said on ...)
   "Bob" in the memories or the search: no
```

These lines came out the same in ten runs, each with a new user. The script
ends with the same list from `quotemem memories`.

## Quick start

You need Node 20.3 or later and [uv](https://docs.astral.sh/uv/) on `PATH`.
The default preset uses one Alibaba Cloud Model Studio (DashScope) API key,
from [bailian.console.aliyun.com](https://bailian.console.aliyun.com) (China region).

1. Install the command and set it up once:

   ```bash
   npm install -g quotemem
   quotemem setup
   ```

   Setup asks for the preset (Enter takes `default`), the review (Enter takes
   `standard`) and your key, which is not shown as you type. It checks the
   settings with one call to each model and ends with
   `ok: the settings work. ...`. For scripts,
   `quotemem setup --yes --preset default --review standard` takes the key
   from `DASHSCOPE_API_KEY`.

2. Install one tool, for example Cursor: `quotemem install cursor --write`.
   It writes `~/.cursor/hooks.json` and `~/.cursor/mcp.json`, and prints the
   rule to copy into each project. `quotemem doctor` checks the setup.

3. Say something in a chat: "I live in Beijing. My cat is called Bob." The
   first chat starts the memory service in the background (the first start
   downloads it). The chat is saved in the background every few turns, and
   once it has been idle for 5 minutes. Then `quotemem memories` lists each
   memory with its quote:

   ```text
   [current] The user's cat is named Bob.
     remembered 2026-11-24, changed 2026-11-24; id 01M86JY92FDXTXP53TJ1MRZ58D
     - user, 2026-11-24: My cat is called Bob.
   ```

4. Ask in a new chat: "Where do I live?" The plugin adds the matching memory
   to the prompt, with its quote from the first chat, in a line like
   `- user: "I live in Beijing"`.

5. Say "Forget my cat's name." The plugin forgets it and tells the agent.
   Then `quotemem memories` shows `The user has a cat.` with the quote
   `My cat`, and no name. A later "What is my cat called?" finds no name.

`quotemem status` shows the service; `quotemem stop` stops it.

## Works with your tools, and they share one memory

Every tool's plugin talks to one local service, so what you tell one tool is
recalled in the others, and what you ask one tool to forget is forgotten in
all of them. They all use one memory by default: `QUOTEMEM_USER_ID`, which
defaults to your OS user name.

| Tool | Set it up |
|---|---|
| Claude Code | `claude plugin marketplace add edsml-jz2321/QuoteMem --sparse .claude-plugin integrations`, then `claude plugin install quotemem@quotemem` |
| Codex CLI | `codex plugin marketplace add edsml-jz2321/QuoteMem --sparse .agents --sparse integrations/codex`, then `codex plugin add quotemem@quotemem`, then trust the hooks once with `/hooks` |
| Cursor | `quotemem install cursor --write`, plus the rule it prints, in each project |
| OpenCode | `quotemem install opencode` prints the block to merge into `opencode.jsonc` |
| Gemini CLI | `quotemem install gemini` prints the `gemini extensions install` command |
| Cline (VS Code) | `quotemem install cline --write`, then turn on Enable Hooks |
| goose | `quotemem install goose --write`, then set `GOOSE_MOIM_MESSAGE_FILE` as it prints |
| OpenClaw | `quotemem install openclaw` prints the `openclaw plugins install` command |
| DSH | `dsh plugin --profile quotemem add quotemem` (needs [pnpm](https://pnpm.io) on `PATH`), then start `dsh --profile quotemem` |

The service runs on `127.0.0.1:8765`. To use a port of your own, put
`QUOTEMEM_URL=http://127.0.0.1:<port>` in `~/.quotemem/env` and in the
environment Claude Code, Codex and DSH start in. The service keeps the proxy settings of the tool
or shell that starts it; if your proxy is only for downloads, add the model
host to `NO_PROXY` (`.aliyuncs.com` for the default preset). More tools and details:
[Use with your agents](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/agents.md).

## Use it from code

The HTTP service takes a bearer token from its data folder:

```bash
TOKEN_FILE=~/.local/share/quotemem/token
curl -s http://127.0.0.1:8765/memory/add \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "session_id": "s1",
       "messages": [{"role": "user", "content": "I moved to Lisbon last spring."}]}'
curl -s http://127.0.0.1:8765/memory/search \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" -H "Content-Type: application/json" \
  -d '{"user_id": "u1", "query": "Where do I live?"}'
```

Any MCP client can use the memory tools (search, add, history, forget):

```json
{
  "mcpServers": {
    "quotemem": { "command": "npx", "args": ["-y", "quotemem", "mcp"] }
  }
}
```

Without Node: `uvx quotemem serve`, or `pip install "quotemem>=0.3"`, then
`quotemem serve` ([what it needs](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/service.md#install)).

## Result

In the Agent Memory Leaderboard (AMLB) Cycle 2 official results,
QuoteMem scored **59.83** overall and ranked **23rd of 125** entries in
*Textual Memory · Closed-source Methods*, where it is listed as "QuoteMem"
with a link to this repository:
<https://agentmemoryleaderboard.ai/results/cycle-2/#industry-textual>.

## Documentation

The [docs](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/README.md) have the full guides:
[what it does](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/README.md#what-it-does), [the service and its routes](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/service.md),
[configuration and review](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/configuration.md), [forgetting](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/forgetting.md),
[commands and the memory list](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/cli.md), [agents](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/agents.md),
[benchmarks](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/benchmarks.md) and [development](https://github.com/edsml-jz2321/QuoteMem/blob/main/docs/development.md).
Changes are in the [changelog](https://github.com/edsml-jz2321/QuoteMem/blob/main/CHANGELOG.md).

CI runs ruff, pyright, a service smoke test and a checked build on Python 3.12,
3.13 and 3.14, and the Node tests (`npm test`, `npm run check`) on Node 20 and 24
([ci.yml](https://github.com/edsml-jz2321/QuoteMem/blob/main/.github/workflows/ci.yml)).
To send a change, see [CONTRIBUTING.md](https://github.com/edsml-jz2321/QuoteMem/blob/main/CONTRIBUTING.md).
Please open a GitHub issue for questions, bug reports and suggestions. Report a
security issue privately, as [SECURITY.md](https://github.com/edsml-jz2321/QuoteMem/blob/main/SECURITY.md) describes.

## Licence

QuoteMem is released under the MIT License, see [LICENSE](https://github.com/edsml-jz2321/QuoteMem/blob/main/LICENSE).
The included HeavenBase is MIT-licensed too. Third-party components and the
licences of the benchmark sources are listed in [NOTICE](https://github.com/edsml-jz2321/QuoteMem/blob/main/NOTICE).
Benchmark datasets are not redistributed here and keep their own licences.
