<p align="center">
  <picture>
    <img src="assets/manbun-logo.svg" width="220" alt="Manbun, the lazy but chatty senior dev">
  </picture>
</p>

<h1 align="center">Manbun</h1>

<p align="center">
  <em>He still writes one line. But now he tells you why.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

---

You know him. Tight manbun. Solid beard. Sunglasses indoors. You show him fifty lines; he looks at them, and replaces them with one — but unlike his ponytailed cousin, he'll actually tell you why before he does it.

Manbun puts him inside your AI agent.

This is a fork of [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). Same lazy ladder, same six-skill lineup, same install mechanics across agent hosts — see the upstream repo for its benchmark methodology, showcase projects, and sponsors. What's different is below.

## The Manbun Philosophy

A senior-engineer mode for your AI: build the smallest correct solution (YAGNI, stdlib/native before dependencies, surgical diffs that never touch unrelated code) but never ship silently — explain the "why" before the code.

### 1. Think Before Coding
No assumptions. No hidden confusion. If multiple interpretations exist, Manbun names them instead of guessing. He reads the task and traces the real flow end-to-end before touching the keyboard.

### 2. The Lazy Ladder (YAGNI)
Before writing any code, Manbun stops at the first rung that holds:
1. **Does this need to be built at all?** (Speculative need → skip it)
2. **Already in this codebase?** (Reuse existing helpers)
3. **Stdlib does it?** (Use it)
4. **Native platform feature?** (Use it)
5. **Installed dependency?** (Use it)
6. **Can this be one line?** (Make it one line)
7. **Only then:** write the minimum code that works.

Lazy about the solution, never about reading: trust-boundary validation, data-loss handling, security, and accessibility are never on the chopping block.

### 3. Surgical Changes
Manbun touches only what the request requires. No "improving" adjacent code, no refactoring unbroken things, and strict adherence to your existing code style.

### 4. Teach, Don't Just Do
No silent code drops. Before the code, you get a short brief covering:
- **Why this shape:** The architectural reasoning.
- **Data flow:** What moves where.
- **Trade-offs:** What this choice costs, and when that cost stops being worth it.

### 5. Goal-Driven Planning
Any task with more than one meaningful step gets a plan before code:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

## Breaking the Silence

Manbun is a fork of [Ponytail](https://github.com/DietrichGebert/ponytail), and this is the one real difference. Ponytail's own rules are explicit about staying silent:

> Code first. Then at most three short lines: what was skipped, when to add it. No essays, no feature tours, no design notes.

Manbun keeps every rung of ponytail's lazy ladder but drops that vow of silence, and adds the plan step above (#5). Everything else — the six-skill lineup, the install mechanics, the `manbun:` shortcut-comment convention — is unchanged from ponytail, just renamed.

One consequence worth knowing: ponytail's published benchmark numbers measured a model that says almost nothing. Manbun's mandatory "why" brief adds tokens ponytail never spent, so those numbers describe ponytail, not this fork — there's no separate benchmark for manbun yet.

## Before / after

You ask for a date picker. Your agent installs flatpickr, writes a wrapper component, adds a stylesheet, and starts a discussion about timezones.

With manbun:

```html
<!-- manbun: browser has one -->
<input type="date">
```

More survivors in [examples/](examples/).

## Install

The most effort manbun will ever ask of you:

The Claude Code and Codex plugins (and the Cursor hooks) run two tiny Node.js lifecycle hooks, so `node` needs to be on your PATH (note for Nix/nvm users: it must be on the non-interactive shell's PATH). If it isn't, the skills still work, the always-on activation just stays quiet instead of erroring on every prompt.

### Claude Code

```
/plugin marketplace add yyg27/manbun
```
```
/plugin install manbun@manbun
```
(You have to send two separate prompts for the install to work)

Same steps in the Claude Code Desktop app's Code tab: type the two `/plugin` commands above into the prompt box, or click the **+** button next to it, choose **Plugins** → **Add plugin** to browse your configured marketplaces, and manage marketplaces from **Customize** in the sidebar.

### Codex

```bash
codex plugin marketplace add yyg27/manbun
codex plugin add manbun@manbun
```

Run `codex` and open `/hooks`, review and trust its two lifecycle hooks, and start a new thread.

This same install also covers the Codex desktop app: restart the app after installing and it picks up the plugin.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add yyg27/manbun
copilot plugin install manbun@manbun
```

In an interactive Copilot CLI session, use the slash equivalents:

```
/plugin marketplace add yyg27/manbun
/plugin install manbun@manbun
```

Copilot CLI namespaces plugin commands by plugin name. For example:

```text
/manbun:manbun ultra
/manbun:manbun-review
```

### Pi agent harness

```
pi install git:github.com/yyg27/manbun
```

### OpenCode

Add to `opencode.json`:

```json
{ "plugin": ["./.opencode/plugins/manbun.mjs"] }
```

Run from a checkout (the plugin reuses `hooks/` and `skills/`). Injects the ruleset every turn at the active level; adds the `/manbun` commands (see [Commands](#commands)). OpenCode also auto-loads this repo's `AGENTS.md`, so the rules hold even without the plugin. The plugin adds the `lite/full/ultra/off` levels.

The `./` path resolves against your project's `opencode.json`; to share one checkout across projects, point it at the absolute path of the `.mjs` instead (it finds its `hooks/` and `skills/` relative to its own file).

### Gemini CLI

```bash
gemini extensions install https://github.com/yyg27/manbun
```

Loads the ruleset as always-on context every session and registers the `/manbun` commands; the `skills/` ship too, activated when a task needs them.
The Gemini adapter intentionally does not ship a root `hooks/hooks.json`: Gemini auto-loads that path, while Manbun's lifecycle hooks use Claude/Codex event names.

### Qoder

Qoder auto-loads `AGENTS.md` from the repo root as always-on context, so running manbun from a checkout works with zero setup. For per-project rules, copy [`.qoder/rules/manbun.md`](.qoder/rules/manbun.md) into your project's `.qoder/rules/`. The six manbun skills (`/manbun`, `/manbun-review`, `/manbun-audit`, `/manbun-debt`, `/manbun-gain`, `/manbun-help`) are available via Qoder's Skill system; the plugin manifest at [`.qoder-plugin/plugin.json`](.qoder-plugin/plugin.json) points at the `skills/` directory.

For full plugin-tier support (automatic mode activation + ruleset injection on every prompt), add the hooks from [`hooks/qoder-hooks.json`](hooks/qoder-hooks.json) to your `.qoder/settings.json`. Replace `MANBUN_DIR` with the path to your manbun checkout. Qoder's `UserPromptSubmit` hook activates the default mode on first prompt and injects the ruleset every turn; `PreToolUse` with `task|Task` matcher injects the ruleset into subagents. Level switches (`/manbun lite|full|ultra|off`) work automatically.

### Antigravity CLI

Google is renaming Gemini CLI to Antigravity CLI (the `agy` binary); the same extension installs there:

```bash
agy plugin install https://github.com/yyg27/manbun
```

It reuses this repo's `gemini-extension.json`. One difference: Antigravity converts the `/manbun` commands into skills, so you type them into the chat (e.g. `/manbun-review` as a message) instead of picking them from a slash menu. To run it as an always-on rule instead, drop the ruleset into `.agents/rules/`.

### Hermes Agent

```bash
hermes plugins install yyg27/manbun --enable
```

Restart Hermes after installing. The plugin injects the active Manbun mode before each LLM turn, registers the bundled skills as `manbun:<skill>`, and adds `/manbun`, `/manbun-review`, `/manbun-audit`, `/manbun-debt`, `/manbun-gain`, and `/manbun-help`. In shared gateways, restrict `/manbun` to trusted users with Hermes slash-command access controls; runtime mode is process-local.

### CodeWhale

Reads `AGENTS.md` from the project root, zero setup. Copy [`AGENTS.md`](AGENTS.md) to your project, or run `codewhale` from a checkout of this repo. That's it.

### Swival

Stage the collection in your library first, then add the skills you want:

```bash
swival skills add --global https://github.com/yyg27/manbun  # stage into ~/.config/swival/library
swival skills add manbun                                     # install the collection into this project
swival skills add --global manbun                             # or activate it in every project
```

Swival also reads `AGENTS.md` from the project root and `~/.config/swival/AGENTS.md` globally, the instruction-only fallback.

On the command line, use a `$` prefix to explicitly activate a skill. For example: `$manbun-review`.

### Devin CLI

```bash
devin plugins install yyg27/manbun
```

Installs manbun as a Devin plugin; skills are available as `/manbun:manbun`, `/manbun:manbun-review`, and so on.

### OpenClaw

```bash
clawhub install manbun
```

Installs manbun as an OpenClaw skill from ClawHub; the review, audit, debt, gain, and help skills install the same way (`clawhub install manbun-review`, and so on). OpenClaw applies it on coding tasks and also exposes it as a `/manbun` command. Without ClawHub, copy [`.openclaw/skills/manbun`](.openclaw/skills/) into `~/.openclaw/skills/`.

### Grok Build

```bash
grok plugin install yyg27/manbun --trust
```

Enable the plugin (off by default): `/plugins` → Plugins → Space on `manbun`, or in `~/.grok/config.toml`:

```toml
[plugins]
enabled = ["manbun"]
```

Start a new session (or reload plugins). Skills show as `/manbun`, `/manbun-review`, `/manbun-audit`, `/manbun-debt`, `/manbun-gain`, `/manbun-help`. Verify with `grok inspect`. Grok can auto-invoke manbun for coding tasks from its skill description; use `/manbun` (or `/manbun lite`, `/manbun full`, `/manbun ultra`) when activation needs to be explicit. Grok lifecycle hooks are not used because their SessionStart output cannot inject instructions.

`AGENTS.md` still works instruction-only from a checkout without the plugin.

### Cursor

```bash
git clone https://github.com/yyg27/manbun
node manbun/scripts/cursor-hooks.js install
```

Merges two native hooks into `~/.cursor/hooks.json` (add `--project` to write `<project>/.cursor/hooks.json` instead) and keeps any hooks you already have there. The entries run `node` from that checkout, so leave it where it is or re-run the install after moving it. Cursor reloads the file on save; open a new chat and the ruleset for your default level arrives through `sessionStart`. Send `/manbun lite`, `/manbun full`, `/manbun ultra` or `/manbun off` as a plain message to switch the level for the rest of the conversation; `/manbun` reports it. Cursor's `subagentStart` cannot inject context, so subagents run without the ruleset, and cloud agents never fire `sessionStart`. The always-on rule (`.cursor/rules/manbun.mdc`) and the hooks are alternatives: while the rule is in a workspace the hooks inject nothing and the mode commands answer with a notice, so delete the rule to let the hooks manage the level. Uninstall: `node manbun/scripts/cursor-hooks.js uninstall`.

That was it. He'd be proud. He won't say it.

Active every session, with a handful of commands (see [Commands](#commands)). `/manbun ultra` exists for when the codebase has wronged you personally. Startup and mode-change text shows the current mode.

Set the level for every new session with the `MANBUN_DEFAULT_MODE` env var (`lite`/`full`/`ultra`/`off`), or a `defaultMode` field in `~/.config/manbun/config.json` (`%APPDATA%\manbun\config.json` on Windows). The default is `full`.

While active, the ruleset is also injected into every subagent spawned via the Agent tool. To scope that to specific agent types (say, keep it off read-only search agents), set the `MANBUN_SUBAGENT_MATCHER` env var to a regex tested against the subagent's `agent_type`. It is unanchored and case-insensitive: `explore|general` matches either, `^general$` is exact, and plugin agent types look like `plugin:name`. Unset means inject into every subagent (the default); an invalid regex, or a subagent whose type the platform doesn't report, also falls back to injecting.

Cursor (rule-only alternative to the [hooks install](#cursor)), Windsurf, Cline, GitHub Copilot Chat (the VS Code, JetBrains, and Visual Studio editor extension, not the standalone Copilot CLI covered under [Install](#install)), Aider, Kiro, Zed, CodeWhale, Swival, Qoder: copy the matching rules file from this repo ([`.cursor/rules/`](.cursor/rules/), [`.windsurf/rules/`](.windsurf/rules/), [`.clinerules/`](.clinerules/), [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), [`.kiro/steering/`](.kiro/steering/), [`.qoder/rules/`](.qoder/rules/)).

Kiro: copy `.kiro/steering/manbun.md` to `~/.kiro/steering/` (global) or `.kiro/steering/` in your project.

GitHub Copilot CLI fallback (instruction-only mode): it reads `AGENTS.md` and `.github/copilot-instructions.md` in a project, or copy the rules into `~/.copilot/copilot-instructions.md` to run manbun in every project. This path keeps always-on guidance, but does not add plugin mode switches or hooks.

VS Code with the Codex extension reads `AGENTS.md`, which this repo ships, so it works from the repo root with no setup (`~/.codex/AGENTS.md` makes Codex global).

JetBrains Junie can read `AGENTS.md` once you point it there in Settings → Tools → Junie → Project Settings → Guidelines Path (it is not automatic yet). This repo ships `AGENTS.md`; `.junie/guidelines.md` is Junie's legacy path.

Amp (Sourcegraph) reads `AGENTS.md` from the working directory and parent directories up to `$HOME`, which this repo ships, so it works with no setup (`~/.config/amp/AGENTS.md` works globally).

Jules (Google) reads `AGENTS.md` from the repository root, which this repo ships, so it picks up the ruleset with no setup.

Which files map to which agent: [Agent portability](docs/agent-portability.md).

### Uninstall

| Host | Command |
|------|---------|
| Claude Code | `/plugin remove manbun` |
| Codex | `codex plugin remove manbun` |
| Devin CLI | `devin plugins remove manbun` |
| Grok Build | `grok plugin uninstall manbun` |
| Pi agent | `pi uninstall manbun` |
| Cursor hooks | `node scripts/cursor-hooks.js uninstall` (add `--project` for a project-level install); removes only manbun's entries from `hooks.json` |
| Cursor rule / Windsurf / Cline / Qoder / etc. | Delete the copied rule file |

These remove the plugin's own files. They leave behind a small amount of state manbun writes outside the plugin folder: the mode flag (`~/.claude/.manbun-active`, or `~/.cursor/.manbun-active` for Cursor), `~/.config/manbun/config.json`, manbun's entries in `~/.cursor/hooks.json`, and (if you accepted the setup nudge) a `statusLine` entry in `~/.claude/settings.json`. Run `node scripts/uninstall.js` to clean those up too. **Run it before the host remove command above** — the script is itself a plugin file, so removing the plugin first deletes it (or run it from a separate clone of this repo). It only removes the statusLine entry if it points at manbun's own script, so a statusline you set up yourself is left untouched.

## Commands

| Command | What it does |
|---------|--------------|
| `/manbun [lite \| full \| ultra \| off]` | Set the intensity, or turn it off. No argument reports the current level. |
| `/manbun-review` | Review the current diff for over-engineering, hands back a delete-list. |
| `/manbun-audit` | Audit the whole repo for over-engineering, not just the diff. |
| `/manbun-debt` | Harvest the `manbun:` shortcuts you've deferred into a ledger, so "later" doesn't become "never". |
| `/manbun-gain` | Show the measured impact scoreboard (less code, less cost, more speed) from the benchmark. |
| `/manbun-help` | Quick reference for the commands above. |

Commands need a skill-capable host (Claude Code, Codex, Devin CLI, OpenCode, Gemini, pi, Swival, Hermes Agent, Qoder, Grok Build). In Codex they're skills, invoke with `@` (`@manbun-review`). Cursor with the [hooks](#cursor) gets `/manbun` level switching only, typed as a plain message. The instruction-only adapters (Cursor's rule file, Windsurf, Cline, Copilot, Kiro, Antigravity) load the always-on ruleset without the commands.

## FAQ

**Does it need a config file?**
No. An optional `~/.config/manbun/config.json` or `MANBUN_DEFAULT_MODE` env var can set the default level, but nothing is required.

**What if I really need the 120-line cache class?**
You don't. Insist anyway and he'll build it. Slowly. Correctly. While looking at you.

**Why fork Ponytail instead of just using it?**
See [Breaking the Silence](#breaking-the-silence) above — the short version is he talks now.

## License

[MIT](LICENSE). The shortest license that works.
