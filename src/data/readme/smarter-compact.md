# Smarter Compact

[![npm version](https://img.shields.io/npm/v/smarter-compact.svg)](https://www.npmjs.com/package/smarter-compact)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/github-bcmyguest%2Fsmarter--compact-blue)](https://github.com/bcmyguest/smarter-compact)

**Context management (smart compaction)** keeps long coding-agent sessions under a token limit without an LLM summary. Every message goes into a local SQLite session store; older turns leave the context and the turn they precede carries a pointer to them.

<p align="center">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="docs/media/smart-compaction-dark.gif" />
<img src="docs/media/smart-compaction.gif" alt="Smart compaction: older turns move into the session store, the cut turn carries a pointer, smart_compact_search recovers a detail." width="720" />
</picture>
</p>

The agent searches the store with `smart_compact_search`, `smart_compact_sql`, and `smart_compact_get` when it needs a detail back. The cut stays put on later requests, so the prompt cache keeps hitting.

**Learn more:** [Smart compaction](https://bcmyguest.github.io/smarter-compact/context-management.html) (benchmarks and how it trims) · [Context proxy & port](https://bcmyguest.github.io/smarter-compact/context-proxy.html) · [Context store](https://bcmyguest.github.io/smarter-compact/context-store.html)

**Benchmarks:** In seed-matched [ContextBench](https://github.com/RulinShao/ContextBench) log tasks on Haiku 5.5, smart compaction scored **0.469** higher than keep-everything (95% bootstrap interval 0.339–0.578; eight pairs). Costs fell at R4000, L6400, and L12800. kv-store is a small ceiling test (all arms tie at R4000); the chart below is log-triage only. [Full tables and charts](https://bcmyguest.github.io/smarter-compact/context-management.html#benchmarks) · [methods](https://bcmyguest.github.io/smarter-compact/context-research.html).

<p align="center">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="docs/media/contextbench-quality-log-dark.png" />
<img src="docs/media/contextbench-quality-log.png" alt="ContextBench log-triage: smart compaction at 1.00 on L12800 overall vs 0.35 for native and keep-everything; lookup and count panels" width="480" />
</picture>
</p>

The stored text still uses the OpenMem wire format (`[smarter-compact: …]`, `<smarter-compact-recall>`). Memory recall on a trim is off unless you set `CONTEXT_COMPACTION_RECALL=1`.

You need Node 24 or newer (for `node:sqlite`) and, for agents that trim through the proxy, the LiteLLM dev build `v1.109.0-dev.1` on `PATH` as `litellm`. The plugin has no API key of its own. Your agent keeps its own login.

### How agents integrate

Smart compaction only works when something **sees and rewrites the model request** before it is sent. That happens in one of two ways:

| Tier | Agents | What you get |
| --- | --- | --- |
| **Full trim (proxy)** | Claude Code, Codex, OpenCode 1 | `smarter-compact enable` points the CLI at the loopback LiteLLM proxy; every turn is stored and older turns drop off the wire at the token threshold. |
| **Full trim (in-process)** | OpenCode 2, Pi | Same trim core in the agent's **`context` hook** ([OpenCode plugin](docs/opencode.md), [Pi extension](https://pi.dev/docs/latest/extensions#context) in this package). No proxy URL. |

Cursor and Copilot CLI are **not** supported for automatic trim (hooks + MCP only). See [Optional: Cursor and Copilot](#optional-cursor-and-copilot) if you still want search tools there.

## Install

Install from npm (`npm install -g smarter-compact`). Register plugins with **`smarter-compact plugins add <claude|codex>`** (resolves the installed package path itself; no `npm root -g`). You do not need a git clone for that. **`smarter-compact enable -g`** detects Claude Code, Codex, and OpenCode (config dirs or `opencode` on PATH), wires each one at the proxy, and starts the proxy. A **git clone** is optional if you are developing the trimmer or prefer a fixed checkout path.

### Claude Code

```sh
npm install -g smarter-compact
smarter-compact plugins add claude
smarter-compact enable claude
```

Start a new `claude` session after `enable`. The marketplace install registers the search tools and the compact command. `enable` points `ANTHROPIC_BASE_URL` at `http://127.0.0.1:4101`, starts the LiteLLM proxy in the background when needed, and stores a key in `~/.config/smarter-compact/proxy.env` (mode 600). Session hooks also ensure the proxy is up. A previous base URL is saved in `~/.config/smarter-compact/proxy-backup.json` and restored by `smarter-compact disable claude`. Logs: `~/.config/smarter-compact/proxy.log`. Set `SMARTER_COMPACT_AUTO_PROXY=0` to disable auto-start.

<details>
<summary>Optional: install from a git clone</summary>

```sh
git clone https://github.com/bcmyguest/smarter-compact.git
cd smarter-compact
./plugin/scripts/smarter-compact plugins add claude
./plugin/scripts/smarter-compact enable claude
```

Leave the clone in place; Claude resolves the marketplace from that path.

</details>

### Codex

```sh
npm install -g smarter-compact
smarter-compact plugins add codex
smarter-compact enable codex
```

`enable` sets `model_provider = "smarter-compact"` in `~/.codex/config.toml`. Codex keeps its ChatGPT login: the provider uses `requires_openai_auth` and LiteLLM's `/backend-api/codex` pass-through. Trust the hooks, quit Codex, and start it again.

<details>
<summary>Optional: install from a git clone</summary>

```sh
git clone https://github.com/bcmyguest/smarter-compact.git
cd smarter-compact
./plugin/scripts/smarter-compact plugins add codex
./plugin/scripts/smarter-compact enable codex
```

</details>

### Pi

```sh
pi install git:github.com/bcmyguest/smarter-compact
```

Pi loads `plugin/pi/smarter-compact.js`, which registers on Pi's **`context` hook** (documented on [pi.dev](https://pi.dev/docs/latest/extensions#context)) and runs the same in-process trim as OpenCode 2. Configure thresholds with `smarter-compact context set …` or `~/.config/smarter-compact/config.toml`. Command: `/smarter-compact compact` forces a trim on the next request.

<details>
<summary>Optional: git clone (local extension path)</summary>

```sh
git clone https://github.com/bcmyguest/smarter-compact.git
# Point Pi at smarter-compact/plugin/pi/smarter-compact.js per Pi's local-extension docs.
```

</details>

### OpenCode

```sh
npm install -g smarter-compact
opencode plugin smarter-compact        # project .opencode/opencode.json
opencode plugin -g smarter-compact   # global ~/.config/opencode/
```

**OpenCode 2** trims in the plugin (`context` hook). Add options on the plugin entry if you need them; see [docs/opencode.md](docs/opencode.md).

**OpenCode 1** has no context hook, so run `smarter-compact enable opencode` as well (the plugin starts the proxy when the agent is pointed at it). `enable opencode` refuses a proxy base URL when `opencode --version` reports major 2.

<details>
<summary>Optional: install from a git clone</summary>

```sh
git clone https://github.com/bcmyguest/smarter-compact.git
cd smarter-compact
opencode plugin "$PWD"               # or ./index.mjs if your OpenCode build accepts a file path
opencode plugin -g "$PWD"
smarter-compact enable opencode                   # OpenCode 1 only
```

</details>

## CLI

After `npm install -g smarter-compact`, the command on your PATH is **`smarter-compact`**. From a clone, use `./plugin/scripts/smarter-compact` (or `node plugin/scripts/smarter-compact.mjs`).

## Commands

| Command | Effect |
| --- | --- |
| `/smarter-compact:status` | Trims, estimated tokens saved, and fail-opens in the last day |
| `/smarter-compact:compact` | Trim on the next request. The hook writes `sessions/<id>.force` |
| `smarter-compact plugins add <claude\|codex\|copilot>` | Add the bundled plugin marketplace to that CLI (Copilot: MCP only — no trim) |
| `smarter-compact path` | Print the installed package root (for custom scripts) |
| `smarter-compact enable -g` | Detect Claude/Codex/OpenCode and point each at the proxy |
| `smarter-compact install cursor` | Optional: MCP + hooks for Cursor Agent (no automatic trim) |
| `smarter-compact enable <claude\|codex\|opencode>` | Point one agent at the proxy |
| `smarter-compact disable <claude\|codex\|opencode>` | Remove that pointing and restore the backup |
| `smarter-compact proxy` | Run LiteLLM in the foreground (debugging; hooks normally start it detached) |
| `smarter-compact status` | Same numbers as the slash command |

A fail-open sends the request on untrimmed and records the error. The request is not blocked.

## Where state lives

`SMARTER_COMPACT_STATE_DIR` defaults to `~/.local/share/smarter-compact` for smarter-compact and the plugin. The store is `$SMARTER_COMPACT_STATE_DIR/context`. Schema and file layout: [docs/context-store.md](docs/context-store.md).

| Variable | Default | Effect |
| --- | --- | --- |
| `CONTEXT_PROXY_ENABLED` | `1` | `0` forwards every request unchanged |
| `CONTEXT_TRIM_AT_TOKENS` | unset → per-model table | When **set** (env, `proxy.env`, OpenCode `trimAtTokens`, or `smarter-compact context set trim=N`), one threshold for **every** model. When **unset**, the model id is matched against `[context_proxy.trim_at]` in `~/.config/smarter-compact/config.toml` (built-in: `haiku` → 95000, else `default` 125000). Example: `smarter-compact context set haiku=88000`. |
| `CONTEXT_TRIM_TO_FRACTION` | `0.3` | In-turn tool steps kept while the request stays under this fraction of the threshold |
| `CONTEXT_COMPRESS_OVER_TOKENS` | `4000` | Tool results above this are stored in full and replaced by a short header |
| `CONTEXT_COMPACTION_RECALL` | `0` by default | `1` asks a memory bank named on the session registration |
| `CONTEXT_PROXY_PORT` | `4101` | LiteLLM listen port (env overrides `~/.config/smarter-compact/proxy.env`; `smarter-compact enable` writes the port in use) |

### Proxy port

Default is **4101**. To use another port:

```sh
export CONTEXT_PROXY_PORT=4200
smarter-compact enable claude    # agent URLs and proxy.env both use 4200
```

Or set it once in `~/.config/smarter-compact/proxy.env` (same file as the LiteLLM key), then run `smarter-compact enable` again so agent configs pick up the port. The hook and auto-started proxy also read trim settings from that file when they are not already in the environment:

```
CONTEXT_PROXY_PORT=4200
# Per-model thresholds (config.toml — preferred):
#   smarter-compact context set haiku=95000
#   smarter-compact context set default=125000
# Global override for every model:
#   smarter-compact context set trim=120000
# Or uncomment:
# CONTEXT_TRIM_AT_TOKENS=120000
```

OpenCode 2 plugin options: `"proxyPort": 4200` in the plugin entry (maps to `CONTEXT_PROXY_PORT` for in-process trim settings; proxy auto-start uses the same resolution).

## Tests

```
python3 -m unittest discover -s proxy/tests
node --test tests/plugin.test.mjs
```

The Python package is still `smarter_compact`. `plugin/lib/context-trim.mjs` is the OpenCode port of that package; the two stay on the same store contract.

### Optional: Cursor and Copilot

These agents expose **MCP and session hooks only**. They do not rewrite model traffic, so **context is not trimmed automatically**. Use them if you want `smart_compact_*` tools and session registration while you work in Claude, Codex, OpenCode, or Pi for long sessions.

**Copilot CLI:** `smarter-compact plugins add copilot` after the npm install.

**Cursor Agent:** `smarter-compact install cursor`, reload Cursor, enable the local plugin. `enable -g` does not install Cursor unless you set `SMARTER_COMPACT_INSTALL_CURSOR=1`.

## Developing (git clone)

```sh
npm ci
npm test
./setup_prek.sh   # prek hooks: file hygiene + Conventional Commits on commit-msg
```

CI runs the same `prek run --all-files` plus `npm test` and proxy unit tests. Use `feat:`, `fix:`, `docs:`, `chore:`, etc. so **Prepare release** can bump semver with git-cliff.

## Releases

Version bumps follow [Conventional Commits](https://www.conventionalcommits.org/) via [git-cliff](https://git-cliff.org/) (`cliff.toml`, same rules as [openmem](https://github.com/bcmyguest/openmem)). On `main`, run the **Prepare release** GitHub Action (dry-run first if you want the proposed version and notes). It bumps `package.json`, tags `vX.Y.Z`, and dispatches **Release** (tests, npm publish, GitHub Release body from git-cliff). Locally: `git-cliff --bumped-version` and `git-cliff --unreleased --strip header`.

## License

Apache-2.0. The trimmer comes from [openmem](https://github.com/bcmyguest/openmem).
