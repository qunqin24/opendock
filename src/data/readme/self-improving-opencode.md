# Self-Improving AI

A single starting skill that helps an AI agent get better through use. It turns
verified work, user corrections, failures, and repeatable workflows into new or
improved Agent Skills instead of making the user repeat the same steering.

This is self-improving AI in a deliberately basic, practical sense. It does not
retrain the model. It improves the context and procedures the model receives on
future tasks.

## Memory and skills

The loop has two durable outputs:

- Memory stores facts, decisions, preferences, corrections, and ongoing context.
- Skills store reusable procedures, decision rules, tool usage, and verification.

It pairs naturally with [GBrain](https://github.com/garrytan/gbrain): GBrain
provides the memory layer, while this starting skill grows and refines the
procedural skill layer. GBrain is optional; agents without it can use their
existing memory mechanism.

## Install

The skill defines what to learn. OpenCode, Claude Code, and Codex also have a
completion adapter that runs the skill once after a substantial session. Follow
the section for your client to install both parts.

### OpenCode

Install the skill globally for OpenCode:

```bash
npx skills add https://github.com/hueyexe/self-improving-ai \
  --skill self-improving --agent opencode --global --yes
```

For OpenCode v2, append this entry to the existing `plugins` array in
`~/.config/opencode/opencode.json`. Keep your other plugin entries:

```json
{
  "package": "self-improving-opencode@latest",
  "options": { "minMessages": 8, "gbrain": false, "debug": false }
}
```

For OpenCode v1, append this entry to the existing `plugin` array instead:

```json
[
  "self-improving-opencode@latest",
  { "minMessages": 8, "gbrain": false, "debug": false }
]
```

Fully quit and restart OpenCode. OpenCode installs the package from the npm
registry at startup
and runs one completion review after a session reaches 8 messages.

### Claude Code

Install the skill globally for Claude Code:

```bash
npx skills add https://github.com/hueyexe/self-improving-ai \
  --skill self-improving --agent claude-code --global --yes
```

Then add the plugin marketplace and install the completion adapter inside
Claude Code:

```text
/plugin marketplace add hueyexe/self-improving-ai
/plugin install self-improving@self-improving-ai
```

Start a new session after installation. The adapter runs one completion review
after the transcript reaches 12,000 bytes.

### Codex

Install the skill globally for Codex:

```bash
npx skills add https://github.com/hueyexe/self-improving-ai \
  --skill self-improving --agent codex --global --yes
```

Then add the plugin marketplace and install the completion adapter:

```bash
codex plugin marketplace add hueyexe/self-improving-ai
codex plugin add self-improving@self-improving-ai
```

Open `/hooks` in Codex and trust the new hook, then start a new thread. The
adapter runs one completion review after the transcript reaches 12,000 bytes.

### Other agents

Other clients can use the skill without an automatic completion adapter. Install
it for every client supported by the Skills CLI:

```bash
npx skills add https://github.com/hueyexe/self-improving-ai --all --global
```

Eve and PromptScript currently report failures because they do not support
global skill installation. Other supported clients still install successfully.

## Configure

Each adapter runs at most once per session and skips short sessions. OpenCode
defaults to 8 messages. Claude Code and Codex default to 12,000 transcript
bytes.

### Optional [GBrain](https://github.com/garrytan/gbrain) context

GBrain is off by default. In OpenCode, set `gbrain` to `true` in the plugin
entry. For Claude Code or Codex, set this environment variable before launching
the client:

```bash
export SELF_IMPROVING_GBRAIN=1
```

This does not install or configure GBrain. Follow the
[GBrain repository](https://github.com/garrytan/gbrain) for setup. The flag only
tells the review to use GBrain, when available, for durable non-procedural
memory while keeping procedures in Agent Skills.

Threshold overrides:

```bash
export SELF_IMPROVING_MIN_TRANSCRIPT_BYTES=12000 # Claude Code and Codex
export SELF_IMPROVING_MIN_MESSAGES=8             # OpenCode env fallback
```

Set a threshold to `0` to review every session. Lower thresholds increase cost
and make low-value skill churn more likely.

Set OpenCode's `debug` option to `true`, or set `SELF_IMPROVING_DEBUG=1`, to
record threshold decisions and completion-review outcomes in the OpenCode log.
Debug logging does not add messages to the session.

## Manage the skill

List the installed skill and its source:

```bash
npx skills list --global
```

Update it from GitHub:

```bash
npx skills update self-improving --global --yes
```

Remove it:

```bash
npx skills remove self-improving --global --yes
```

## Release the OpenCode package

Maintainers publish releases explicitly. Update `version` in `package.json`,
then run:

```bash
bun test
bun publish --access public
git tag -a "v$(bun -p 'require("./package.json").version')" -m "Release"
git push origin main --follow-tags
gh release create "v$(bun -p 'require("./package.json").version')" \
  --generate-notes --verify-tag
```

## Skill conventions

- `skills/self-improving` is the only starting skill.
- Skills created by the loop use clear capability-based names.
- Generated skills carry independent provenance, maturity, category, and scope
  metadata so they remain easy to organize and export.
- New workflows start as `candidate`, become `validated` after focused testing
  or successful reuse, and become `proven` after repeated use.
- Repository-specific procedures remain with their repository rather than being
  generalized into this collection.

The repository is the collection boundary. Skill metadata describes where each
skill came from, what kind of skill it is, how mature it is, and where it
belongs without forcing those details into its public name.

```yaml
metadata:
  provenance: self-improving
  maturity: candidate
  category: workflow
  scope: global
```

Each directory under `skills/` follows the [Agent Skills
specification](https://agentskills.io/specification).
