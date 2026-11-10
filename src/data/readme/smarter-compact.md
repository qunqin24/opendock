# Smarter Compact

[![npm version](https://img.shields.io/npm/v/smarter-compact.svg)](https://www.npmjs.com/package/smarter-compact)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/github-bcmyguest%2Fsmarter--compact-blue)](https://github.com/bcmyguest/smarter-compact)

**Context management (smart compaction) for coding agents.** Long sessions keep small, cached prompts. Every message goes into a local SQLite session store. Once the prompt reaches your token limit, older turns leave it, and the next kept turn carries a pointer to them.

<p align="center">
<img src="docs/media/smarter-compact-demo.gif" alt="How it works: the prompt fills, turns 1–4 move to the session store, a search pulls a line back. Then a Claude Code session: the agent reads three log files, edits code and runs tests; the prompt crosses 95k and Smarter Compact moves 31 messages to the session store (97k to 51k); later the agent answers a question about the trimmed logs with smart_compact_sql and smart_compact_get (illustrative session); then the benchmark savings chart, 85% average." width="720" />
</p>

The agent searches the store with `smart_compact_search`, `smart_compact_sql`, and `smart_compact_get` when it needs a detail back. The cut stays put on later requests, so the prompt cache keeps hitting.

**Learn more:** [How it works](https://bcmyguest.github.io/smarter-compact/context-management/) · [Benchmarks](https://bcmyguest.github.io/smarter-compact/benchmarks/) · [Context proxy & port](https://bcmyguest.github.io/smarter-compact/context-proxy/) · [Context store](https://bcmyguest.github.io/smarter-compact/context-store/)

**Benchmarks:** On [ContextBench](https://github.com/RulinShao/ContextBench) ([paper](https://arxiv.org/abs/2609.37725), [dataset](https://huggingface.co/datasets/context-language-model/ContextBench)) with Haiku 5.5, smart compaction cost 85% less than keeping everything, averaged over four task sizes (v0.9.0, 2026-11-09). [Tables and charts](https://bcmyguest.github.io/smarter-compact/benchmarks/) · [Methods and caveats](https://bcmyguest.github.io/smarter-compact/context-research/#deviations-from-the-pre-registration).

<p align="center">
<img src="docs/media/contextbench-savings.png" alt="Average cost saving 85%: paired cost of Smarter Compact relative to keep everything, kv-store R4000 −86%, log-triage L1600 −68%, L6400 −90%, L12800 −94%; log-task score +0.46" width="720" />
</p>

Trimmed context is marked with a `[smarter-compact: …]` pointer.

You need Node 24 or newer (for `node:sqlite`). Agents that trim through the proxy also need LiteLLM `1.109.0rc1` (pinned) on `PATH` as `litellm`. `smarter-compact enable` installs it with `uv tool install` when it is missing or another version. Without uv, it stops and changes no agent config. The plugin has no API key of its own. Your agent keeps its own login.

### How agents integrate

Smart compaction needs something that **sees and rewrites the model request** before it is sent: a proxy or an in-process hook.

| Tier | Agents | What you get |
| --- | --- | --- |
| **Full trim (proxy)** | Claude Code, Codex, OpenCode 1 | `smarter-compact enable` points the CLI at the loopback LiteLLM proxy; every turn is stored and older turns drop off the wire at the token threshold. |
| **Full trim (in-process)** | OpenCode 2, Pi | JS port of the trim core in the agent's **`context` hook**; includes prose strip, observation masking and the progress note ([OpenCode plugin](docs/opencode.md), [Pi extension](https://pi.dev/docs/latest/extensions#context) in this package). No proxy URL. |

Cursor and Copilot CLI get hooks and MCP search tools only, with no automatic trim. See [Optional: Cursor and Copilot](#optional-cursor-and-copilot).

## Install

Install from npm with `npm install -g smarter-compact`, then register plugins with **`smarter-compact plugins add <claude|codex>`**. It finds the installed package itself, so you need neither `npm root -g` nor a git clone. **`smarter-compact enable -g`** detects Claude Code, Codex, and OpenCode (by config dir, or `opencode` on PATH), points each at the proxy, and starts the proxy. It prints each step to stderr; `-q` (or `SMARTER_COMPACT_QUIET=1`) prints only errors and warnings. Clone the repo only to develop the trimmer or to pin a checkout path.

### Claude Code

```sh
npm install -g smarter-compact
smarter-compact plugins add claude
smarter-compact enable claude
```

Start a new `claude` session after `enable`. The marketplace install registers the search tools and the compact command. `enable` points `ANTHROPIC_BASE_URL` at `http://127.0.0.1:4101`, starts the LiteLLM proxy in the background when needed, and stores a key in `~/.config/smarter-compact/proxy.env` (mode 600). Session hooks also ensure the proxy is up. `enable` saves any previous base URL in `~/.config/smarter-compact/proxy-backup.json`, and `smarter-compact disable claude` restores it. Logs: `~/.config/smarter-compact/proxy.log`. Set `SMARTER_COMPACT_AUTO_PROXY=0` to disable auto-start.

**Remote Control.** Claude Code refuses [Remote Control](https://code.claude.com/docs/en/remote-control) while `ANTHROPIC_BASE_URL` points anywhere but `api.anthropic.com` ("Remote Control is only available when using Claude via api.anthropic.com"). The `env` block in `~/.claude/settings.json` overrides the shell, so `unset` does not help. Run `smarter-compact disable claude` before `claude remote-control` or `/remote-control`, and `smarter-compact enable claude` afterwards. Sessions started while disabled bypass the proxy and are not trimmed.

On Claude Code 2.1.275 or later you can install the plugin from inside Claude Code instead of running `plugins add`:

```
/plugin install smarter-compact --marketplace bcmyguest/smarter-compact
```

That adds the search tools, hooks and commands. Trimming still needs `smarter-compact enable claude`, which points Claude Code at the proxy.

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

## Upgrade

Claude Code, Codex and OpenCode 1 send requests through the background proxy, which keeps running the version that started it. OpenCode 2 and Pi trim in-process and pick up the new version on their next start.

```sh
npm install -g smarter-compact@latest
smarter-compact proxy restart                                   # load the new proxy now
claude plugin marketplace update smarter-compact                # Claude Code: refresh the plugin,
claude plugin update smarter-compact@smarter-compact            # then restart claude
```

Skip `proxy restart` and the next session start restarts the proxy once it has been idle 60 s, showing `proxy restarted, <old> -> <new>`. A proxy that is busy, or that `smarter-compact` did not start, gets a warning naming what to restart instead. `proxy restart` stops only a litellm that `smarter-compact` started, or a Docker container publishing the port; it works on Linux, macOS and Windows. See [Updates](docs/context-proxy.md#updates) for the rules.

## CLI

After `npm install -g smarter-compact`, the command on your PATH is **`smarter-compact`**. From a clone, use `./plugin/scripts/smarter-compact` (or `node plugin/scripts/smarter-compact.mjs`).

## Commands

| Command | Effect |
| --- | --- |
| `/smarter-compact:status` | Trims, tokens saved (pre-trim estimate minus the billed prompt after the cut), and fail-opens in the last day |
| `/smarter-compact:compact` | Trim on the next request. The hook writes `sessions/<id>.force` |
| `smarter-compact plugins add <claude\|codex\|copilot>` | Add the bundled plugin marketplace to that CLI (Copilot: MCP only — no trim) |
| `smarter-compact path` | Print the installed package root (for custom scripts) |
| `smarter-compact enable -g` | Detect Claude/Codex/OpenCode and point each at the proxy |
| `smarter-compact install cursor` | Optional: MCP + hooks for Cursor Agent (no automatic trim) |
| `smarter-compact enable <claude\|codex\|opencode>` | Point one agent at the proxy |
| `smarter-compact disable <claude\|codex\|opencode>` | Remove that pointing and restore the backup |
| `smarter-compact proxy` | Run LiteLLM in the foreground (debugging; hooks normally start it detached) |
| `smarter-compact proxy restart` | Stop the background proxy and start a fresh one, e.g. after an upgrade (Linux, macOS, Windows) |
| `smarter-compact status` | Same numbers as the slash command |

A fail-open sends the request on untrimmed and records the error, so a failed trim never blocks a request.

## Where state lives

`SMARTER_COMPACT_STATE_DIR` defaults to `~/.local/share/smarter-compact` for smarter-compact and the plugin. The store is `$SMARTER_COMPACT_STATE_DIR/context`. Schema and file layout: [docs/context-store.md](docs/context-store.md).

Every setting and default: [configuration reference](docs/configuration.md).

### Proxy port

Default is **4101**. To use another port:

```sh
export CONTEXT_PROXY_PORT=4200
smarter-compact enable claude    # agent URLs and proxy.env both use 4200
```

Or set it once in `~/.config/smarter-compact/proxy.env` (same file as the LiteLLM key), then run `smarter-compact enable` again so agent configs pick up the port. The hook and auto-started proxy also read every proxy setting (`PROXY_ENV_CONTEXT_KEYS` in `plugin/lib/brand.mjs`) from that file when they are not already in the environment:

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

The OpenCode 2 `proxyPort` option sets the port that plugin probes; it starts a proxy there only when an agent config already points at that port. Other agents read `CONTEXT_PROXY_PORT`.

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

The docs site (Astro Starlight) builds from `docs/*.md`: `cd site && pnpm install && pnpm test && pnpm build` writes `site/dist/` and fails on a broken link.

CI runs the same `prek run --all-files` plus `npm test` and proxy unit tests, and `npm test` again on `windows-latest`. Tests that delete a home holding session databases must call `rmHome` from `tests/rm-home.mjs`, because Windows cannot delete an open file. Use `feat:`, `fix:`, `docs:`, `chore:`, etc. so **Prepare release** can bump semver with git-cliff.

## Releases

Version bumps follow [Conventional Commits](https://www.conventionalcommits.org/) via [git-cliff](https://git-cliff.org/) (`cliff.toml`). On `main`, run the **Prepare release** GitHub Action (dry-run first if you want the proposed version and notes). It bumps `package.json` (`npm version` copies the version into the plugin manifests; `npm run pack:check` fails if they differ), tags `vX.Y.Z`, and dispatches **Release** (tests, npm publish, GitHub Release body from git-cliff). Locally: `git-cliff --bumped-version` and `git-cliff --unreleased --strip header`.

## License

Apache-2.0. The trimmer comes from [openmem](https://github.com/bcmyguest/openmem).
