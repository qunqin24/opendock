# StateJar integrations

Client code that connects AI coding agents and assistants to [StateJar](https://statejar.com), the memory layer that
stores facts instead of transcripts:

- **one value per field**, checked by its type: a value that fails is refused, with a reason;
- **append-only versions**: every change is a new version, and the old value stays in history;
- **minimal-disclosure recall**: an assistant gets only what the question needs;
- **an audit trail** of every disclosure;
- **a handle per state** (`shm_…`, the SHA-256 of the canonical state), so any copy of the memory can be checked.

| Surface | Where | Status |
|---|---|---|
| Hosted MCP server (any client that speaks MCP over HTTP) | `https://statejar.com/mcp` | live with StateJar's next release |
| Claude Code plugin | [`plugins/statejar/`](plugins/statejar/), guide in [`claude-code/`](claude-code/) | marketplace: this repository |
| Codex plugin (the same plugin) | [`plugins/statejar/`](plugins/statejar/), guide in [`codex/`](codex/) | marketplace: this repository |
| OpenCode plugin | [`opencode/`](opencode/) | npm: `opencode-statejar` |
| Hermes Agent memory provider (`memory.provider: statejar`) | [`hermes/statejar/`](hermes/statejar/) | `hermes plugins install` from this repository |
| OpenClaw memory-slot plugin | [`openclaw/`](openclaw/) | npm: `openclaw-statejar` |
| Agent skill (any agent that reads `SKILL.md`) | [`skills/statejar/`](skills/statejar/) | copy into the agent's skills folder |
| CLI: `statejar login`, and `init, add, search, list, forget, export, status` | PyPI: `statejar` | `pip install statejar` (0.6.0 has `login`, `logout`, `whoami`; the other seven come in 0.7.0) |

Every integration uses a StateJar developer key (https://statejar.com/api-keys), scoped to your account. None of
them stores a transcript. Each removes secrets before anything is sent.

**Availability.** Recall and capture call StateJar's REST API at `https://api.statejar.com`, which is live. The hosted
MCP server at `https://statejar.com/mcp`, which the plugins' StateJar tools use, goes live with StateJar's next
release. Until then those tools cannot connect, and recall and capture work as they are.

## Any MCP client

Make a developer key at https://statejar.com/api-keys and put it in `STATEJAR_API_KEY`. Then:

```bash
# Claude Code
claude mcp add --transport http statejar https://statejar.com/mcp --header "Authorization: Bearer $STATEJAR_API_KEY"
# Codex
codex mcp add statejar --url https://statejar.com/mcp --bearer-token-env-var STATEJAR_API_KEY
```

OpenCode, in `opencode.json`:

```json
{
  "mcp": {
    "statejar": {
      "type": "remote",
      "url": "https://statejar.com/mcp",
      "oauth": false,
      "headers": { "Authorization": "Bearer {env:STATEJAR_API_KEY}" }
    }
  }
}
```

Any other client: a remote (HTTP) MCP server at `https://statejar.com/mcp` with the header
`Authorization: Bearer <your key>`. The ten tools are `remember`, `search`, `get`, `list`, `update`, `delete`,
`history`, `audit`, `verify` and `export`.

## Claude Code

```bash
claude plugin marketplace add KING-OF-FLAME/statejar-integrations
claude plugin install statejar@statejar
```

See [claude-code/README.md](claude-code/README.md).

## Codex

```bash
codex plugin marketplace add KING-OF-FLAME/statejar-integrations
codex plugin add statejar@statejar
```

Then trust the plugin's hooks with `/hooks`. See [codex/README.md](codex/README.md).

## OpenCode

Add `"plugin": ["opencode-statejar"]` and StateJar's MCP server to `opencode.json`. See
[opencode/README.md](opencode/README.md).

## Hermes Agent

```bash
hermes plugins install KING-OF-FLAME/statejar-integrations/hermes/statejar --enable
hermes memory setup          # choose statejar
```

See [hermes/statejar/README.md](hermes/statejar/README.md).

## OpenClaw

```bash
openclaw plugins install openclaw-statejar
openclaw statejar init       # the memory slot, autoRecall, autoCapture
```

See [openclaw/README.md](openclaw/README.md).

## Agent skill

Copy [`skills/statejar/`](skills/statejar/) into your agent's skills folder (for Claude Code, `~/.claude/skills/`). See
[skills/README.md](skills/README.md).

## How StateJar compares with Mem0, measured

On StateJar's memory-QA set (100 conversations, 300 questions), with **the same small local model for both systems**
(Qwen3-4B-Instruct-2507 Q4, on one GPU), StateJar's memory held the answer for **248 of 300** questions and Mem0's
(2.2.1, as shipped) for **152 of 300** (McNemar p = 1.4e-18). Answers written by one prompt from each system's memory
were right **218 of 300** times for StateJar and **159 of 300** for Mem0. This is one benchmark, in that setting only.
The method and the caveats: https://statejar.com/docs/mem0.html.

## Tests

```bash
python -m pytest tests/
claude plugin validate ./plugins/statejar && claude plugin validate .
```

End to end, against a local or staging StateJar (never production): a fact stated in one session of the real client
is recalled in a fresh one, through the hooks and through StateJar's MCP tools. Each run makes a throwaway account and
deletes it. With no model on the machine, a scripted stand-in (`e2e/scripted_model.py`) answers "OK" or calls
StateJar's `search` and repeats its output verbatim; `codex_e2e.py --model ollama:<name>` uses a real local model.

```bash
python e2e/codex_e2e.py --api http://127.0.0.1:8000/api/v1 --mcp http://127.0.0.1:8000/mcp --out /tmp/codex-e2e
python e2e/claude_code_e2e.py --api http://127.0.0.1:8000/api/v1 --mcp http://127.0.0.1:8000/mcp --out /tmp/cc-e2e
python e2e/opencode_e2e.py --api http://127.0.0.1:8000/api/v1 --mcp http://127.0.0.1:8000/mcp --out /tmp/oc-e2e
python e2e/hermes_e2e.py --api http://127.0.0.1:8000/api/v1 --out /tmp/hermes-e2e
python e2e/openclaw_e2e.py --api http://127.0.0.1:8000/api/v1 --out /tmp/openclaw-e2e     # Node 24.16+
python e2e/openclaw_discovery.py       # what OpenClaw itself loads from the plugin; no model, no StateJar
HERMES_PYTHON=/path/to/hermes/venv/bin/python python -m pytest tests/test_hermes_provider.py   # with Hermes's own loader
python e2e/codex_discovery.py          # what Codex itself loads from the plugin; no model, no StateJar
```

## Licence

MIT (see [LICENSE](LICENSE)). The StateJar service these clients talk to has its own terms: https://statejar.com/terms.
