<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" width="220" alt="curlycoder, the lazy senior dev">
  </picture>
</p>

<h1 align="center">CurlyCoder</h1>

<p align="center">
  <strong>Give AI coding agents a bias toward simpler, safer implementations.</strong>
</p>

<p align="center">
  <em>Understand the problem first. Reuse what already exists. Build only what is necessary.</em>
</p>

<p align="center">
  <strong>Current release: v5.7.4</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/bhardwj-sarvesh-projects/curlycoder?style=flat-square&color=111111&label=stars" alt="Stars">
  <img src="https://img.shields.io/github/v/release/bhardwj-sarvesh-projects/curlycoder?style=flat-square&color=111111&label=release" alt="Release">
  <img src="https://img.shields.io/npm/v/@bhardwj-sarvesh-projects/curlycoder?style=flat-square&color=111111&label=npm" alt="npm">
  <img src="https://img.shields.io/badge/works%20with-20%20agents-111111?style=flat-square" alt="Works with 20 agents">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

<p align="center">
  <a href="https://trendshift.io/repositories/50668" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/50668/daily" alt="bhardwj-sarvesh-projects/curlycoder | Trendshift" width="250" height="55"/></a>
  <a href="https://trendshift.io/repositories/50668" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/50668/weekly" alt="bhardwj-sarvesh-projects/curlycoder | Trendshift" width="250" height="55"/></a>
</p>

<p align="center">
  <strong>~54% less code (up to 94%) &middot; ~20% cheaper &middot; ~27% faster &middot; 100% safe</strong><br>
  <sub>Measured on real Claude Code sessions editing a real open-source repo (FastAPI + React), against the same agent with no skill. ~54% is the mean across 12 feature tasks (Haiku 4.5, n=4); it reaches 94% where an agent over-builds (a date picker) and is near zero where the code is already minimal. CurlyCoder keeps every safety guard while a bare "write one-liners" prompt drops one. (The earlier single-shot benchmark reported 80-94% as a flat figure; against a fair agentic baseline that is the per-task ceiling, not the average.) <a href="benchmarks/results/2026-06-18-agentic.md">Full writeup</a> &middot; <a href="benchmarks/">reproduce it</a>.</sub>
</p>

<p align="center">
  <sub><a href="README.es.md">Español</a> &middot; <a href="README.ko.md">한국어</a></sub>
</p>

---

## Before / after

You ask for a date picker. Your agent installs flatpickr, writes a wrapper component, adds a stylesheet, and starts a discussion about timezones.

With CurlyCoder:

```html
<!-- CurlyCoder: browser has one -->
<input type="date">
```

More survivors in [examples/](examples/).

## Numbers

The honest measurement is a real agent doing real work: a headless Claude Code session editing [tiangolo's full-stack-fastapi-template](https://github.com/fastapi/full-stack-fastapi-template) (a real FastAPI + React repo), scored on the `git diff` it leaves behind. Twelve feature tickets, the same agent with and without the skill, n=4, Haiku 4.5.

<p align="center">
  <img src="assets/benchmark-agentic.svg" width="860" alt="Each arm as a percent of the no-skill baseline across LOC, tokens, cost and time (Haiku 4.5). CurlyCoder is lowest on every metric (LOC 46%, tokens 78%, cost 80%, time 73%); caveman rises above 100% on tokens, cost and time; yagni-oneliner LOC 67%. Safety, separate adversarial tier: baseline, caveman and CurlyCoder 100%, yagni-oneliner 95%.">
</p>

| vs no-skill baseline | LOC | tokens | cost | time | safe |
|---|--:|--:|--:|--:|--:|
| **CurlyCoder** | **-54%** | **-22%** | **-20%** | **-27%** | **100%** |
| caveman (terse-prose control) | -20% | +7% | +3% | +2% | 100% |
| "YAGNI + one-liners" prompt | -33% | -14% | -21% | -30% | 95% |

CurlyCoder is the only arm that cuts every metric, and the only one that stays fully safe while doing it. The cut is biggest where there is a real over-build trap (date picker 404 to 23 lines, color picker 287 to 23, because it reaches for a native `<input>` instead of a component) and near zero on code that is already minimal. Full method, per-task tables, and limitations: [benchmarks/results/2026-06-18-agentic.md](benchmarks/results/2026-06-18-agentic.md).

<details>
<summary><strong>Older single-shot numbers (isolated generation)</strong></summary>

Five everyday tasks, three models, three arms (no skill, [caveman](https://github.com/JuliusBrussee/caveman), curlycoder), ten runs, median reported. One prompt, one completion, counting lines of the answer:

<p align="center">
  <img src="assets/benchmark-3model.svg" width="860" alt="Median lines of code per arm across Haiku, Sonnet and Opus">
</p>

This showed **80-94% less code**. [#126](https://github.com/bhardwj-sarvesh-projects/curlycoder/issues/126) fairly pointed out that the bare-model baseline pads its answer with prose and options, so that gap is partly a conversational-baseline artifact. The agentic numbers above are the corrected, defensible version. Reproduce the single-shot run with `npx promptfoo eval -c benchmarks/promptfooconfig.yaml`.

</details>

**The rule was never "fewest tokens."** It is: write only what the task needs, and never cut validation, error handling, security, or accessibility. The code ends up small because it is necessary, not golfed. Lower cost and latency are a side effect on the models that follow the ladder; a terse reasoning model that spends thinking tokens deliberating the rungs can go the other way (on GPT-5.5 it does).

## How it works

Before writing code, the agent stops at the first rung that holds:

```
1. Does this need to exist?   → no: skip it (YAGNI)
2. Already in this codebase?  → reuse it, don't rewrite
3. Stdlib does it?            → use it
4. Native platform feature?   → use it
5. Installed dependency?      → use it
6. One line?                  → one line
7. Only then: the minimum that works
```

The ladder runs *after* it understands the problem, not instead of it: it reads the code the change touches and traces the real flow before picking a rung. Lazy about the solution, never about reading.

Lazy, not negligent: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

## Install

The most effort CurlyCoder will ever ask of you:

The Claude Code and Codex plugins run two tiny Node.js lifecycle hooks, so `node` needs to be on your PATH (note for Nix/nvm users: it must be on the non-interactive shell's PATH). If it isn't, the skills still work, the always-on activation just stays quiet instead of erroring on every prompt.

### Claude Code

```
/plugin marketplace add bhardwj-sarvesh-projects/curlycoder
```
```
/plugin install curlycoder@curlycoder
```
(You have to send two separate prompts for the install to work) 

Same steps in the Claude Code Desktop app's Code tab: type the two `/plugin` commands above into the prompt box, or click the **+** button next to it, choose **Plugins** → **Add plugin** to browse your configured marketplaces, and manage marketplaces from **Customize** in the sidebar.

### Codex

```bash
codex plugin marketplace add bhardwj-sarvesh-projects/curlycoder
codex plugin add curlycoder@curlycoder
```

Run `codex` and open `/hooks`, review and trust its two lifecycle hooks, and start a new thread.

This same install also covers the Codex desktop app: restart the app after installing and it picks up the plugin.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add bhardwj-sarvesh-projects/curlycoder
copilot plugin install curlycoder@curlycoder
```

In an interactive Copilot CLI session, use the slash equivalents:

```
/plugin marketplace add bhardwj-sarvesh-projects/curlycoder
/plugin install curlycoder@curlycoder
```

Copilot CLI namespaces plugin commands by plugin name. For example:

```text
/curlycoder:curlycoder ultra
/curlycoder:curlycoder-review
```

### Pi agent harness

```
pi install git:github.com/bhardwj-sarvesh-projects/curlycoder
```

### OpenCode

Add to `opencode.json`:

```json
{ "plugin": ["@bhardwj-sarvesh-projects/curlycoder"] }
```

Run from a checkout instead (the plugin reuses `hooks/` and `skills/`):

```json
{ "plugin": ["./.opencode/plugins/curlycoder.mjs"] }
```

Injects the ruleset every turn at the active level; adds the `/curlycoder` commands (see [Commands](#commands)). OpenCode also auto-loads this repo's `AGENTS.md`, so the rules hold even without the plugin. The plugin adds the `lite/full/ultra/off` levels.

The `./` path resolves against your project's `opencode.json`; to share one checkout across projects, point it at the absolute path of the `.mjs` instead (it finds its `hooks/` and `skills/` relative to its own file).

### Gemini CLI

```bash
gemini extensions install https://github.com/bhardwj-sarvesh-projects/curlycoder
```

Loads the ruleset as always-on context every session and registers the `/curlycoder` commands; the `skills/` ship too, activated when a task needs them.
The Gemini adapter intentionally does not ship a root `hooks/hooks.json`: Gemini auto-loads that path, while curlycoder's lifecycle hooks use Claude/Codex event names.

### Qoder

Qoder auto-loads `AGENTS.md` from the repo root as always-on context, so running curlycoder from a checkout works with zero setup. For per-project rules, copy [`.qoder/rules/curlycoder.md`](.qoder/rules/curlycoder.md) into your project's `.qoder/rules/`. The six CurlyCoder skills (`/curlycoder`, `/curlycoder-review`, `/curlycoder-audit`, `/curlycoder-debt`, `/curlycoder-gain`, `/curlycoder-help`) are available via Qoder's Skill system; the plugin manifest at [`.qoder-plugin/plugin.json`](.qoder-plugin/plugin.json) points at the `skills/` directory.

For full plugin-tier support (automatic mode activation + ruleset injection on every prompt), add the hooks from [`hooks/qoder-hooks.json`](hooks/qoder-hooks.json) to your `.qoder/settings.json`. Replace `curlycoder_DIR` with the path to your CurlyCoder checkout. Qoder's `UserPromptSubmit` hook activates the default mode on first prompt and injects the ruleset every turn; `PreToolUse` with `task|Task` matcher injects the ruleset into subagents. Level switches (`/curlycoder lite|full|ultra|off`) work automatically.

### Antigravity CLI

Google is renaming Gemini CLI to Antigravity CLI (the `agy` binary); the same extension installs there:

```bash
agy plugin install https://github.com/bhardwj-sarvesh-projects/curlycoder
```

It reuses this repo's `gemini-extension.json`. One difference: Antigravity converts the `/curlycoder` commands into skills, so you type them into the chat (e.g. `/curlycoder-review` as a message) instead of picking them from a slash menu. Until the migration completes (around June 18, 2026), `gemini extensions install` still works too. To run it as an always-on rule instead, drop the ruleset into `.agents/rules/`.

### Hermes Agent

```bash
hermes plugins install bhardwj-sarvesh-projects/curlycoder --enable
```

Restart Hermes after installing. The plugin injects the active curlycoder mode before each LLM turn, registers the bundled skills as `curlycoder:<skill>`, and adds `/curlycoder`, `/curlycoder-review`, `/curlycoder-audit`, `/curlycoder-debt`, `/curlycoder-gain`, and `/curlycoder-help`. In shared gateways, restrict `/curlycoder` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

### CodeWhale

Reads `AGENTS.md` from the project root, zero setup. Copy [`AGENTS.md`](AGENTS.md) to your project, or run `codewhale` from a checkout of this repo. That's it.

### Swival

Stage the collection in your library first, then add the skills you want:

```bash
swival skills add --global https://github.com/bhardwj-sarvesh-projects/curlycoder  # stage into ~/.config/swival/library
swival skills add curlycoder                                             # install the collection into this project
swival skills add --global curlycoder                                    # or activate it in every project
```

Swival also reads `AGENTS.md` from the project root and `~/.config/swival/AGENTS.md` globally, the instruction-only fallback.

On the command line, use a `$` prefix to explicitly activate a skill. For example: `$curlycoder-review`.

### Devin CLI

```bash
devin plugins install bhardwj-sarvesh-projects/curlycoder
```

Installs curlycoder as a Devin plugin; skills are available as `/curlycoder:curlycoder`, `/curlycoder:curlycoder-review`, and so on.

### OpenClaw

```bash
clawhub install curlycoder
```

Installs CurlyCoder as an OpenClaw skill from ClawHub; the review, audit, debt, gain, and help skills install the same way (`clawhub install curlycoder-review`, and so on). OpenClaw applies it on coding tasks and also exposes it as a `/curlycoder` command. Without ClawHub, copy [`.openclaw/skills/curlycoder`](.openclaw/skills/) into `~/.openclaw/skills/`.

### Grok Build

```bash
grok plugin install bhardwj-sarvesh-projects/curlycoder --trust
```

Enable the plugin (off by default): `/plugins` → Plugins → Space on `curlycoder`, or in `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["curlycoder"]
```

Start a new session (or reload plugins). Skills show as `/curlycoder`, `/curlycoder-review`, `/curlycoder-audit`, `/curlycoder-debt`, `/curlycoder-gain`, `/curlycoder-help`. Verify with `grok inspect`. Grok can auto-invoke curlycoder for coding tasks from its skill description; use `/curlycoder` (or `/curlycoder lite`, `/curlycoder full`, `/curlycoder ultra`) when activation needs to be explicit. Grok lifecycle hooks are not used because their SessionStart output cannot inject instructions.

`AGENTS.md` still works instruction-only from a checkout without the plugin.

That was it. He'd be proud. He won't say it.

Active every session, with a handful of commands (see [Commands](#commands)). `/curlycoder ultra` exists for when the codebase has wronged you personally. Startup and mode-change text shows the current mode.

Set the level for every new session with the `curlycoder_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/curlycoder/config.json` (`%APPDATA%\curlycoder\config.json` on Windows). The default is `full`.

While active, the ruleset is also injected into every subagent spawned via the Agent tool. To scope that to specific agent types (say, keep it off read-only search agents), set the `curlycoder_SUBAGENT_MATCHER` env var to a regex tested against the subagent's `agent_type`. It is unanchored and case-insensitive: `explore|general` matches either, `^general$` is exact, and plugin agent types look like `plugin:name`. Unset means inject into every subagent (the default); an invalid regex, or a subagent whose type the platform doesn't report, also falls back to injecting.

Cursor, Windsurf, Cline, GitHub Copilot Chat (the VS Code, JetBrains, and Visual Studio editor extension, not the standalone Copilot CLI covered under [Install](#install)), Aider, Kiro, Zed, CodeWhale, Swival, Qoder: copy the matching rules file from this repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/), [`.qoder/rules/`](.qoder/rules/)).

Kiro: copy `.kiro/steering/curlycoder.md` to `~/.kiro/steering/` (global) or `.kiro/steering/` in your project.

GitHub Copilot CLI fallback (instruction-only mode): it reads `AGENTS.md` and `.github/copilot-instructions.md` in a project, or copy the rules into `~/.copilot/copilot-instructions.md` to run CurlyCoder in every project. This path keeps always-on guidance, but does not add plugin mode switches or hooks.

VS Code with the Codex extension reads `AGENTS.md`, which this repo ships, so it works from the repo root with no setup (`~/.codex/AGENTS.md` makes Codex global).

JetBrains Junie can read `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (it is not automatic yet). This repo ships `AGENTS.md`; `.junie/guidelines.md` is Junie's legacy path.

Amp (Sourcegraph) reads `AGENTS.md` from the working directory and parent directories up to `$HOME`, which this repo ships, so it works with no setup (`~/.config/amp/AGENTS.md` works globally).

Jules (Google) reads `AGENTS.md` from the repository root, which this repo ships, so it picks up the ruleset with no setup.

Which files map to which agent: [Agent portability](docs/agent-portability.md).

### Uninstall

| Host | Command |
|------|---------|
| Claude Code | `/plugin remove curlycoder` |
| Codex | `codex plugin remove curlycoder` |
| Devin CLI | `devin plugins remove curlycoder` |
| Grok Build | `grok plugin uninstall curlycoder` |
| Pi agent | `pi uninstall curlycoder` |
| Cursor / Windsurf / Cline / Qoder / etc. | Delete the copied rule file |

These remove the plugin's own files. They leave behind a small amount of state CurlyCoder writes outside the plugin folder: the mode flag, `~/.config/curlycoder/config.json`, and (if you accepted the setup nudge) a `statusLine` entry in `~/.claude/settings.json`. Run `node scripts/uninstall.js` to clean those up too. **Run it before the host remove command above** â€” the script is itself a plugin file, so removing the plugin first deletes it (or run it from a separate clone of this repo). It only removes the statusLine entry if it points at CurlyCoder's own script, so a statusline you set up yourself is left untouched.

## Commands

| Command | What it does |
|---------|--------------|
| `/curlycoder [lite \| full \| ultra \| off]` | Set the intensity, or turn it off. No argument reports the current level. |
| `/curlycoder-review` | Review the current diff for over-engineering, hands back a delete-list. |
| `/curlycoder-audit` | Audit the whole repo for over-engineering, not just the diff. |
| `/curlycoder-debt` | Harvest the `curlycoder:` shortcuts you've deferred into a ledger, so "later" doesn't become "never". |
| `/curlycoder-gain` | Show the measured impact scoreboard (less code, less cost, more speed) from the benchmark. |
| `/curlycoder-help` | Quick reference for the commands above. |

Commands need a skill-capable host (Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival, Hermes Agent, Qoder, Grok Build). In Codex they're skills, invoke with `@` (`@curlycoder-review`). The instruction-only adapters (Cursor, Windsurf, Cline, Copilot, Kiro, Antigravity) load the always-on ruleset without the commands.

## Development

When changing the compact rule text, keep the agent copies aligned:

```bash
node scripts/check-rule-copies.js
npm test
```

The OpenClaw skill package (`.openclaw/skills/`) is generated from `skills/`; rerun `node scripts/build-openclaw-skills.js` after changing a skill, the test suite fails if it is stale. To publish the skills to ClawHub, run `clawhub login` once, then `node scripts/publish-openclaw-skills.js` (it publishes all six at the `package.json` version; pass `--dry-run` to preview).

The correctness benchmark spawns Python for email and CSV checks; `python3` is tried before `python`. CSV checks need `pandas` installed locally.

## FAQ

**Can I use it with [caveman](https://github.com/JuliusBrussee/caveman)?**
Yes, and you should. Caveman shrinks what the agent says; CurlyCoder shrinks what it builds. Different halves, no overlap: caveman leaves code byte-for-byte exact, CurlyCoder stays out of the prose. Terse talk about minimal code.

**Does it need a config file?**
No. An optional `~/.config/curlycoder/config.json` or `curlycoder_DEFAULT_MODE` env var can set the default level, but nothing is required.

**What if I really need the 120-line cache class?**
You don't. Insist anyway and he'll build it. Slowly. Correctly. While looking at you.

**Does it scale?**
The code you never wrote scales infinitely. Zero bugs, zero CVEs, 100% uptime since forever.

**Why "CurlyCoder"?**
You know exactly why.

## Sponsored by

<a href="https://blockonmate.com">
  <img src="./assets/blockonmate-logo.png" alt="BlockOnMate">
</a>

**BlockOnMate** is a technology company specializing in **Blockchain, Web3, AI, and modern software engineering**, building secure and scalable solutions for startups, enterprises, and digital businesses.

As the **parent company and technology partner behind CurlyCoder**, BlockOnMate supports the project's development, infrastructure, and open-source ecosystem.

[Visit BlockOnMate →](https://blockonmate.com)
</p>

## License

[MIT](LICENSE). The shortest license that works.

## Star History

<a href="https://www.star-history.com/bhardwj-sarvesh-projects/curlycoder#history">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/curlycoder&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/curlycoder&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=bhardwj-sarvesh-projects/curlycoder&type=Date" />
 </picture>
</a>
