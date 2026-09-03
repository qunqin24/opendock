# Fableit

[![npm](https://img.shields.io/npm/v/@seedexr/fableit)](https://www.npmjs.com/package/@seedexr/fableit)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Fableit teaches your AI coding assistant to work like a careful senior
engineer.** It is a small ruleset you install once. After that, the model
checks facts before stating them, reads the code before changing it, fixes
root causes instead of symptoms, finishes the whole task instead of narrating
the next step, verifies its own work before reporting, and tells you honestly
what it did and did not do.

It packages the engineering process of **Claude Fable 5.1** (released
September 1, 2026) so that **any model in any agent tool can run it**: Claude
Code, OpenCode, Cursor, Codex CLI, Gemini CLI, aider, and anything else that
reads an instructions file. Fableit is for every model, with or without
Fable access.

> **v1.1.0 (2026-09-02): distilled from Fable 5.1.** The ruleset now carries
> the behaviors Anthropic documented for 5.1 (see below), costs the same or
> fewer tokens per rule, and the `[FABLEIT]` statusline chip works on Windows
> and sits next to any statusline you already have. Run
> `npx @seedexr/fableit@latest` to upgrade an existing install.
> (Older notice: v1.0.0 blocked prompts on Windows; v1.0.1 fixed it, details in
> [PR #1](https://github.com/SeedeXR/fableit/pull/1).)

## Where this comes from

Anthropic's Fable 5.1 launch material (the announcement, the system card, and
the "Prompting Claude Fable 5.1" guide) says the same thing the Fable 5
analysis said: the lead over older models is not raw intelligence on short
tasks. It is learnable behavior, and it shows up on long, complex work:

- **Goal persistence**: 5.1 "keeps its own records, reprioritizes as things
  change, and picks up where it left off" (Shopify). Re-anchor on the goal
  after every error or detour instead of drifting.
- **Killing incorrect beliefs**: treat your theory as a hypothesis and drop it
  the moment evidence contradicts it. That is how 5.1 "correctly identified
  the root cause of every broken build" Red Hat tested.
- **Self-verification as a reflex**: 5.1 "can write its own tests to check
  its work", and the system card found it falsely claims a task is done less
  often than previous models. Test your own work before presenting it.
- **Keep looking before asking**: exhaust what you can find yourself before
  interrupting the human.
- **Finish the whole task**: a step you have decided on is something to run,
  not to announce. Never end a turn on "Next, I'll…".
- **Effort and tokens as a resource**: 5.1 at medium effort roughly matches
  Fable 5 at lower cost. Think hard on the hard parts, move fast
  through the mechanical parts, batch tool calls, edit surgically, draft once.
- **Abstain when you do not know**: the one measured regression in 5.1 is that
  it abstains less, so it gets more answers right and more answers wrong.
  Fableit's grounding protocol is the counterweight: familiarity is not
  knowledge, and "I don't know yet, checking" is the rule.
- **Memory discipline**: with persistent memory, Fable improved 3x more than
  Opus.

Fableit injects those behaviors as an always-on ruleset:
**ground → comprehend → reason → design → execute → verify → report.**
In plain terms: check the facts, read the code, think, plan, do the work,
test it, then report honestly.

## How it works

Two files matter, and they say the same thing at different sizes:

- [`SKILL.md`](SKILL.md) is the full blueprint (about 4,000 words, roughly 5,400 tokens), written
  for the model to read on demand when it needs the complete process, with
  the published sources cited at the end.
- [`hooks/fableit-instructions.js`](hooks/fableit-instructions.js) holds the
  condensed ruleset that gets injected into every session. One source of
  truth for every host.

Once installed, the ruleset is added to the model's instructions
automatically at the start of every session. You never have to remember to
turn it on. A `[FABLEIT]` chip in the statusline shows it is active.

## Install

Fableit is published on npm as
[`@seedexr/fableit`](https://www.npmjs.com/package/@seedexr/fableit), owned by
the [SeedeXR](https://github.com/SeedeXR) organization. (It was previously also
published under the short name `fableit`; that name is now **deprecated** and
frozen. Use `@seedexr/fableit`. Existing `fableit` installs keep working.)

### Claude Code

Recommended: the installer wires everything (hooks, skill, statusline chip).

```bash
npx @seedexr/fableit

# or straight from GitHub:
npx github:SeedeXR/fableit
```

What the installer does, step by step:

- Adds three hooks to `settings.json` in your Claude config dir:
  - **SessionStart** injects the ruleset when a session begins,
  - **SubagentStart** makes sub-agents follow the same rules,
  - **UserPromptSubmit** tracks level switches like `/fableit ultra`.
- Installs the `fableit` skill and copies the package to `~/.claude/fableit`.
- Adds the `[FABLEIT]` / `[FABLEIT:LITE]` / `[FABLEIT:ULTRA]` statusline chip.
  It runs on Node, so it works on Windows, macOS, and Linux. If you already
  have a statusline (your own script, another plugin's chip such as
  `[PONYTAIL]`), fableit keeps it: the chip script runs your existing command
  first and appends `[FABLEIT]` on the same line. Uninstalling hands your
  original statusline back.

It refuses to touch a `settings.json` it cannot parse. Restart Claude Code or
`/clear` to activate.

Alternative: install through the plugin marketplace.

```
/plugin marketplace add SeedeXR/fableit
/plugin install fableit@fableit
```

Skill only (no hooks, load on demand with `/fableit`):

```bash
git clone https://github.com/SeedeXR/fableit ~/.claude/skills/fableit
```

To remove everything the installer added (hooks, skill, flag, chip, OpenCode
entry, installed copy), while leaving your other settings untouched:

```bash
npx @seedexr/fableit uninstall
```

### OpenCode

```bash
npx @seedexr/fableit opencode
```

This wires the plugin into `~/.config/opencode/opencode.json`, pointing at
the stable `~/.claude/fableit` copy. Or: `npm i -g @seedexr/fableit` and add
`"plugin": ["@seedexr/fableit"]` to your opencode.json. The plugin appends the
ruleset to every turn's system prompt and registers the `/fableit` command.

### Other tools (Cursor, Codex CLI, Copilot, Gemini CLI, Windsurf, aider, ...)

Any tool that reads an instructions file can run fableit: append the ruleset
to whatever file your tool loads.

```bash
npx @seedexr/fableit print >> AGENTS.md      # Codex, aider, many others
npx @seedexr/fableit print >> .cursorrules   # Cursor
npx @seedexr/fableit print >> GEMINI.md      # Gemini CLI
npx @seedexr/fableit print lite              # smaller variant, to stdout
```

## Levels

Fableit ships three intensity levels. Each level includes everything from
the one before it and adds more.

| Level | Adds | Size (words / est. tokens) |
|-------|------|----------------------------|
| `lite` | Grounding and zero hallucination (incl. "familiarity is not knowledge" and "never fabricate inputs"), comprehension first, the solution ladder with "scope is the deliverable", root-cause debugging with the evidence check before state-changing commands, verify before report with no gate bypassing, finish the whole task, honest reporting. | 712 / ~960 |
| `full` (default) | + goal persistence with the compaction map, effort and token economy (batch tool calls, surgical edits, draft once, delegate reads and keep working), deciding vs asking, progress updates and session rhythm with memory discipline. | 1,112 / ~1,500 |
| `ultra` | + a mandatory verification gate: every claim in the final report must trace to observed evidence, and reports end with a "Verified:" list. | 1,194 / ~1,610 |

Token counts are estimates (words × 1.35, a fair proxy for current Claude
tokenizers) and are guarded by a test so the ruleset cannot quietly grow. The
1.0.x ruleset was 721 / 1,017 / 1,127 words with roughly a third fewer rules,
so the per-rule cost went down. On downgrade (`/fableit lite` from `full`),
the hook sends a one-line directive instead of re-injecting the ruleset.

Which one to pick: `lite` is the core discipline and the cheapest in tokens.
`full`, the default, adds the behaviors that matter on long tasks. `ultra`
adds a strict "no evidence, no claim" gate, built for models that tend to
guess confidently.

Switch anytime with `/fableit lite|full|ultra|off` (both Claude Code and
OpenCode). Turn it off with `stop fableit` or `normal mode`. All states,
including off, persist until changed. Set the default level with the
`FABLEIT_DEFAULT_MODE` env var or `~/.config/fableit/config.json`
(`{"defaultMode": "ultra"}`).

## Why it helps other models

The behaviors above are process, not parameters. A model that re-anchors on
the goal after every error, refuses to state unobserved facts, finishes the
task instead of announcing it, spends tokens only where they change the
result, and runs a verification gate before reporting closes most of the gap
this ruleset was distilled from. The `ultra` gate exists precisely for models
that hallucinate confidently: no evidence, no claim.

## Sources

- [Introducing Claude Fable 5.1 and Claude Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1) (Anthropic, Sept 1, 2026)
- [Claude Fable 5.1 & Claude Mythos 5.1 System Card](https://www.anthropic.com/claude-fable-5-1-mythos-5-1-system-card) (Anthropic, Sept 1, 2026)
- [Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) and [What's new in Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1) (Anthropic docs)
- [Claude Fable 5.1 tops the Artificial Analysis Intelligence Index](https://artificialanalysis.ai/articles/claude-fable-5-1)
- [Claude Fable 5 and Claude Mythos 5](https://www.anthropic.com/news/claude-fable-5-mythos-5) (the analysis the first edition distilled)

## Development

```bash
npm test        # node --test (unit, token budget, installer + chip, hook bash-validity)
```

PRs welcome. Keep the spirit: it is a decision process, not a style guide.
Every addition should be a behavior a model can actually execute, grounded in
something observed or published, not vibes. The token-budget test will fail if
the injected ruleset grows; raise the ceiling only with a reason.
