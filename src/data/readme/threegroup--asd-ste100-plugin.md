<div align="center">

```text
 █████╗ ███████╗██████╗       ███████╗████████╗███████╗ ██╗ ██████╗  ██████╗
██╔══██╗██╔════╝██╔══██╗      ██╔════╝╚══██╔══╝██╔════╝███║██╔═████╗██╔═████╗
███████║███████╗██║  ██║█████╗███████╗   ██║   █████╗  ╚██║██║██╔██║██║██╔██║
██╔══██║╚════██║██║  ██║╚════╝╚════██║   ██║   ██╔══╝   ██║████╔╝██║████╔╝██║
██║  ██║███████║██████╔╝      ███████║   ██║   ███████╗ ██║╚██████╔╝╚██████╔╝
╚═╝  ╚═╝╚══════╝╚═════╝       ╚══════╝   ╚═╝   ╚══════╝ ╚═╝ ╚═════╝  ╚═════╝

██████╗ ██╗     ██╗   ██╗ ██████╗ ██╗███╗   ██╗
██╔══██╗██║     ██║   ██║██╔════╝ ██║████╗  ██║
██████╔╝██║     ██║   ██║██║  ███╗██║██╔██╗ ██║
██╔═══╝ ██║     ██║   ██║██║   ██║██║██║╚██╗██║
██║     ███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║
╚═╝     ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
```

**Your AI agent writes to you like an aircraft maintenance manual.**

Short sentences. One action per step. One term per object. The key result first.

`Claude Code` · `Codex` · `Copilot CLI` · `OpenCode` · `Antigravity` · `Kiro` · `VS Code` · `AGENTS.md`

**Turn it on or off at any time. Type `asd off` or `asd on`.**

[Article](Article.md) · [Install](#install) · [On and off](#turn-it-on-and-off) · [The rules](#the-rules) · [Limits](#limits)

</div>

---

## Contents

- [What it does](#what-it-does)
- [Before and after](#before-and-after)
- [Turn it on and off](#turn-it-on-and-off)
- [Install](#install)
- [The rules](#the-rules)
- [How it works](#how-it-works)
- [Stop, change, or remove it](#stop-change-or-remove-it)
- [Limits](#limits)
- [FAQ](#faq)
- [Repository layout](#repository-layout)
- [Development](#development)
- [Credits](#credits)

## What it does

ASD-STE100 is an international standard for controlled natural language. It was created to make aerospace and defense maintenance documentation clear and unambiguous.

This plugin loads a rules file at the start of every agent session. The agent then writes all prose to you in that style.

It is built for a supervisor. You do not have time to read long text. You must find the key result fast, find every question fast, and know how serious each problem is.

Andrej Karpathy suggested this idea on 2 October 2026. He asked language models to write in ASD-STE100, and said the output is "a lot more readable". Read the [Article](Article.md) for the full story.

## Before and after

**Before**

> I noticed that there might potentially be a problem with how the config is being loaded, which could possibly cause some issues down the line, so it may be worth taking a look when you get a chance.

**After**

> - Result: The config file does not load.
> - Severity: medium.
> - Cause: The path `conf/app.json` does not exist.
> - Action: Create the file, or change the path.

This example is illustrative. It is not a recorded log.

## Turn it on and off

You can switch the mode at any time. Type one of these in the chat:

| You type | Result |
|---|---|
| `asd off` | The agent writes normally. |
| `asd on` | The agent writes in ASD-STE100 again. |

`stop asd-ste100`, `start asd-ste100`, and `normal mode` also work.

The agent confirms with one line: `ASD-STE100 mode: off.` or `ASD-STE100 mode: on.`

**Does the switch stay after you close the session?**

| Tool | Chat switch | Stays after restart |
|---|---|---|
| Claude Code, Codex, Copilot CLI | `asd off` / `asd on` | Yes. A hook saves the switch. |
| OpenCode | `asd off` / `asd on` | Use the terminal switch below. |
| Kiro, VS Code, Antigravity, `AGENTS.md` | `asd off` / `asd on` (current session) | No. To remove it, run the `--remove` command below. |

**Terminal switch.** It works for the plugin installs (Claude Code, Codex, Copilot CLI, OpenCode). It takes effect in new sessions.

```bash
npx @threegroup/asd-ste100-plugin off
npx @threegroup/asd-ste100-plugin on
npx @threegroup/asd-ste100-plugin status
```

**Remove the rule file** (Kiro, VS Code, Antigravity, `AGENTS.md`). Run it in your project:

```bash
npx @threegroup/asd-ste100-plugin kiro --remove
npx @threegroup/asd-ste100-plugin vscode --remove
npx @threegroup/asd-ste100-plugin antigravity --remove
npx @threegroup/asd-ste100-plugin agents --remove
```

`--remove` deletes the file the installer made. For a shared file such as `AGENTS.md`, it removes only the block that the installer added.

**Disable in the tool.** Claude Code also has `/plugin disable asd-ste100-plugin@asd-ste100-plugin` and `/plugin enable asd-ste100-plugin@asd-ste100-plugin`.

The saved switch is one empty file: `~/.asd-ste100/off`. If the file exists, the mode is off.

## Install

`node` must be on your PATH. The Claude Code, Codex, and Copilot hooks need it. The skill still loads without `node`, but the always-on activation stays quiet.

| Tool | Method | Always-on |
|---|---|---|
| [Claude Code](#claude-code) | Plugin | Yes, session-start hook |
| [Codex](#codex) | Plugin | Yes, session-start hook |
| [GitHub Copilot CLI](#github-copilot-cli) | Plugin | Yes, session-start hook |
| [OpenCode](#opencode) | Plugin | Yes, system-prompt transform |
| [Antigravity CLI](#antigravity-cli) | Extension | Yes, context file |
| [Antigravity IDE](#antigravity-ide) | Rule file | Yes |
| [Kiro IDE and CLI](#kiro-ide-and-kiro-cli) | Steering file | Yes, `inclusion: always` |
| [VS Code](#vs-code) | Instructions file | Yes |
| [Other tools](#other-tools) | `AGENTS.md` | Yes |

### Install with npm

The npm package is `@threegroup/asd-ste100-plugin`. Node.js 18 or later is required.

**What npm can install**

| Tool | npm method |
|---|---|
| OpenCode | Yes. Add the package name to `opencode.json`. |
| Kiro IDE and CLI | Yes. Run the installer: `npx @threegroup/asd-ste100-plugin kiro` |
| Antigravity IDE | Yes. Run the installer: `npx @threegroup/asd-ste100-plugin antigravity` |
| VS Code | Yes. Run the installer: `npx @threegroup/asd-ste100-plugin vscode` |
| Any `AGENTS.md` tool | Yes. Run the installer: `npx @threegroup/asd-ste100-plugin agents` |
| Claude Code | No. Use the [plugin install](#claude-code) below. |
| Codex | No. Use the [plugin install](#codex) below. |
| Copilot CLI | No. Use the [plugin install](#github-copilot-cli) below. |

Claude Code, Codex, and Copilot CLI install plugins from a GitHub marketplace. The npm package does not install into them.

**Run once with `npx`** (no install):

```bash
cd your-project
npx @threegroup/asd-ste100-plugin kiro
```

**Install globally** (then run from any folder):

```bash
npm install -g @threegroup/asd-ste100-plugin
cd your-project
asd-ste100-plugin vscode
```

**Installer targets**

| Target | File written | Tools |
|---|---|---|
| `kiro` | `.kiro/steering/asd-ste100.md` | Kiro IDE, Kiro CLI |
| `antigravity` | `.agents/rules/asd-ste100.md` | Antigravity IDE |
| `vscode` | `.github/copilot-instructions.md` | VS Code, GitHub Copilot |
| `opencode` or `agents` | `AGENTS.md` | OpenCode, and any tool that reads `AGENTS.md` |

Add `--global` to the `kiro` target to write to `~/.kiro/steering/` for all projects.

**OpenCode with npm.** Add the package to `opencode.json`. OpenCode installs it at startup:

```json
{ "plugin": ["@threegroup/asd-ste100-plugin"] }
```

**Update.** Run `npm install -g @threegroup/asd-ste100-plugin@latest`, then run the installer target again. A repeat run does not duplicate a block in a shared file.

### Claude Code

Send these two commands as two separate prompts:

```
/plugin marketplace add JarrodAI/asd-ste100-plugin
```
```
/plugin install asd-ste100-plugin@asd-ste100-plugin
```

The same steps work in the Claude Code desktop app.

### Codex

```bash
codex plugin marketplace add JarrodAI/asd-ste100-plugin
codex plugin add asd-ste100-plugin@asd-ste100-plugin
```

1. Run `codex`.
2. Open `/hooks`.
3. Trust the session-start hook.
4. Start a new thread.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add JarrodAI/asd-ste100-plugin
copilot plugin install asd-ste100-plugin@asd-ste100-plugin
```

### OpenCode

Clone the repository:

```bash
git clone https://github.com/JarrodAI/asd-ste100-plugin
```

Add the plugin file to `opencode.json`. Use the absolute path:

```json
{ "plugin": ["/absolute/path/to/asd-ste100-plugin/.opencode/plugins/asd-ste100.mjs"] }
```

To skip the clone, use the npm package. See [Install with npm](#install-with-npm).

The plugin adds the rules to the system prompt on every turn. It also registers the skill.

### Antigravity CLI

```bash
agy plugin install https://github.com/JarrodAI/asd-ste100-plugin
```

This uses `gemini-extension.json`, which loads `AGENTS.md` as always-on context.

### Antigravity IDE

Run this in your project. It writes `.agents/rules/asd-ste100.md`.

```bash
npx @threegroup/asd-ste100-plugin antigravity
```

### Kiro IDE and Kiro CLI

Run this in your project. It writes `.kiro/steering/asd-ste100.md` with `inclusion: always`.

```bash
npx @threegroup/asd-ste100-plugin kiro
```

For all projects, add `--global`. It writes to `~/.kiro/steering/`.

A Kiro CLI custom agent does not load steering files by default. Add this line to the `resources` field of the agent:

```
"file://.kiro/steering/asd-ste100.md"
```

### VS Code

Run this in your project. It writes `.github/copilot-instructions.md`, or adds a marked block if the file exists.

```bash
npx @threegroup/asd-ste100-plugin vscode
```

### Other tools

Any tool that reads `AGENTS.md`:

```bash
npx @threegroup/asd-ste100-plugin agents
```

The installer never overwrites a shared file. It adds a block that starts with `<!-- asd-ste100-plugin -->`. It adds the block once only.


## The rules

All rules are in [`skills/asd-ste100/SKILL.md`](skills/asd-ste100/SKILL.md).

| # | Rule |
|---|---|
| 1 | Write short, direct sentences. One idea in each sentence. |
| 2 | Procedure sentences: 20 words or fewer. Other sentences: 25 words or fewer. |
| 3 | Use the active voice. Use the imperative for instructions. |
| 4 | Put the key result in the first line. |
| 5 | Write one action in each procedure step. Number the steps. |
| 6 | Put a warning before the step it applies to. |
| 7 | Use one term for one object. Never change the term. Never use a synonym. |
| 8 | Use a word in one meaning and one part of speech only. |
| 9 | Use simple words and articles. Do not use contractions. |
| 10 | One topic and six sentences or fewer in each paragraph. |
| 11 | No polite filler, apology, or recap. |

**Questions.** Every question starts with `Question:`. You find every request for your input in one glance.

**Observations.** Every observation has three parts: what the agent saw, a severity, and a recommended action.

| Severity | Meaning |
|---|---|
| High | Work stops, data is lost, or security is at risk. |
| Medium | The result is wrong or incomplete, but work continues. |
| Low | The result is correct, but there is a possible improvement. |

The agent does not use "high" for a risk that is only possible. It states what must be true for the risk to occur.

**Scope.** The rules apply to prose written to you. They do not apply to code, commands, file content, or quoted output.

## How it works

```text
              skills/asd-ste100/SKILL.md      <- the only file you edit
                         |
        +----------------+-------------------+
        |                                    |
   runtime read                         scripts/sync.js
        |                                    |
  +-----+------+                  +----------+-----------+-----------+
  |            |                  |          |           |           |
hooks/     .opencode/        AGENTS.md  .agents/rules/  .kiro/     .github/
activate.js  plugins/                                  steering/  copilot-
  |          asd-ste100.mjs                                       instructions.md
  |            |
SessionStart   system-prompt
(Claude Code,  transform
 Codex,        (OpenCode)
 Copilot)
```

- **Prompt hook.** `hooks/toggle.js` watches for `asd on` and `asd off`. It saves the switch in `~/.asd-ste100/off` and tells the agent the new mode.
- **Session-start hook.** `hooks/activate.js` reads the rules and prints them as hidden context. Claude Code and Codex get `hookSpecificOutput.additionalContext`. Copilot gets `additionalContext`. The hook runs on `startup`, `resume`, `clear`, and `compact`, so the rules survive a context reset.
- **OpenCode plugin.** `.opencode/plugins/asd-ste100.mjs` adds the rules to the system prompt on every turn. It also adds the `skills/` folder to the skill search path.
- **Static rule files.** Tools with no hook system load a rule file. `scripts/sync.js` generates these files from the skill file. A test fails if a copy is out of date.

## Stop, change, or remove it

**Turn it off or on.** See [Turn it on and off](#turn-it-on-and-off).

**Change the rules.**

1. Edit `skills/asd-ste100/SKILL.md`.
2. Run `npm run sync`.
3. Run `npm test`.

**Remove it.**

| Tool | Command |
|---|---|
| Claude Code | `/plugin uninstall asd-ste100-plugin@asd-ste100-plugin` |
| Codex | `codex plugin remove asd-ste100-plugin` |
| Copilot CLI | `copilot plugin uninstall asd-ste100-plugin` |
| OpenCode | Remove the entry from `opencode.json`. |
| `npx` installs | Delete the file that the installer printed. For a shared file, delete the block that starts at `<!-- asd-ste100-plugin -->`. |

## Limits

- **This is a style instruction. It is not a certified STE checker.** The plugin does not include the full ASD-STE100 approved dictionary. It does not check output against the standard. The ASD-STE100 maintainers state that no tool can replace a trained writer.
- **Readable is not correct.** A short sentence can be wrong. Verify the claims of the agent.
- **A model can look like STE without following STE.** Expect drift in long sessions. The session-start hook reloads the rules on `resume` and `compact`.
- **Not every install is tested.** See the table below.

| Tool | Status |
|---|---|
| Claude Code | Manifest validated. Plugin tested in a live session. |
| Codex | Plugin install tested in a temporary Codex home. |
| OpenCode | Plugin unit-tested. Not tested in a live session. |
| Copilot CLI | Not tested. |
| Antigravity CLI and IDE | Not tested. |
| Kiro IDE and CLI | Not tested. Steering format follows the Kiro documentation. |
| VS Code | Not tested. Format follows the Copilot instructions convention. |

## FAQ

**Why not paste the instruction into the chat?**
It works for a short time. The model drifts as the context grows, and you must paste it again in each new session. The plugin loads it for you.

**Does it change my code?**
No. The rules apply to prose only.

**Does it make the agent slower or more costly?**
The rules add a short block of text to each session. Short replies use fewer output tokens.

**Is this the same as the full 900-word ASD-STE100 vocabulary?**
No. See [Limits](#limits). Andrej Karpathy suggested asking for "80% of the way to ASD-STE100". This plugin is in that range.

**Can I use a stricter or softer version?**
Yes. Edit the skill file and run `npm run sync`.

**Does it work in languages other than English?**
No. ASD-STE100 is a standard for English.

## Repository layout

```text
asd-ste100-plugin/
├── skills/asd-ste100/SKILL.md      the rules (single source)
├── hooks/
│   ├── rules.js                    reads the rules from SKILL.md
│   ├── state.js                    the on/off switch (~/.asd-ste100/off)
│   ├── activate.js                 session-start hook
│   ├── toggle.js                   prompt hook: "asd on" / "asd off"
│   ├── claude-codex-hooks.json     hook config: Claude Code, Codex
│   └── copilot-hooks.json          hook config: Copilot
├── .claude-plugin/                 Claude Code plugin + marketplace
├── .codex-plugin/                  Codex plugin
├── .agents/
│   ├── plugins/marketplace.json    Codex marketplace
│   └── rules/asd-ste100.md         Antigravity rule (generated)
├── .github/
│   ├── plugin/                     Copilot plugin + marketplace
│   └── copilot-instructions.md     VS Code instructions (generated)
├── .kiro/steering/asd-ste100.md    Kiro steering (generated)
├── .opencode/plugins/              OpenCode plugin
├── gemini-extension.json           Antigravity CLI extension
├── AGENTS.md                       generic context file (generated)
├── bin/install.js                  npx installer
├── scripts/sync.js                 generates the copies
├── tests/rules.test.js             tests
└── Article.md                      the story behind this plugin
```

## Development

```bash
npm run sync   # regenerate AGENTS.md, .agents/rules, .kiro/steering, .github/copilot-instructions.md
npm test       # 7 tests: copies in sync, hooks, on/off switch, installer, OpenCode plugin
```

The tests need Node.js 18 or later.

## Credits

- [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/), maintained by ASD.
- Andrej Karpathy, for the suggestion to ask models for output in ASD-STE100.
- [Ponytail](https://github.com/DietrichGebert/ponytail), for the multi-tool plugin layout that this project follows.

This is an independent project. It is not affiliated with or endorsed by ASD, the ASD-STE100 maintainers, or Andrej Karpathy.

## License

MIT. See [LICENSE](LICENSE).
