# slopdocs

An agent skill for the [slopdocs](https://slopdocs.dev) convention. Teaches your coding agent to keep its planning docs, bug investigations, and feature write-ups in your repo where the next agent can find them.

## Install (OpenCode)

Add to your `opencode.json`:

```json
{
  "plugin": ["slopdocs"]
}
```

Restart OpenCode. The `slopdocs` skill is now available and will be loaded automatically when the agent is writing or deciding whether to create documentation. Requires OpenCode 1.18.29 or newer.

To track an unreleased version directly from the repo, install from git instead:

```json
{
  "plugin": ["slopdocs@git+https://github.com/ryanskidmore/slopdocs.git"]
}
```

### OpenCode 2

OpenCode 2 (`opencode2`) renamed the config key from `plugin` to `plugins`; everything else is the same:

```json
{
  "plugins": ["slopdocs"]
}
```

## Install (Claude Code)

Add this repo as a plugin marketplace, then install the plugin:

```
/plugin marketplace add ryanskidmore/slopdocs
/plugin install slopdocs@slopdocs
```

The `slopdocs` skill is now available and Claude will load it automatically when writing or deciding whether to create documentation.

## Install (Codex)

Codex (CLI, IDE extension, and desktop app) discovers skills from
`.agents/skills/<name>/SKILL.md` directories, so no plugin is needed. Run
this from your project root:

```
curl -fsSL https://raw.githubusercontent.com/ryanskidmore/slopdocs/main/install/codex.sh | sh
```

This places `skills/slopdocs/SKILL.md` at `.agents/skills/slopdocs/SKILL.md`
in the current project, unmodified. Codex detects it automatically (restart
Codex if it doesn't appear). Re-run the command any time to pick up updates.

To install for the current user instead, so it applies to every project:

```
curl -fsSL https://raw.githubusercontent.com/ryanskidmore/slopdocs/main/install/codex.sh | sh -s -- --global
```

See [Codex's skills documentation](https://developers.openai.com/codex/skills) for how skill discovery works.

## Install (pi)

```bash
pi install npm:slopdocs
```

This registers the `slopdocs` skill with [pi](https://pi.dev), Mario Zechner's coding agent (`@earendil-works/pi-coding-agent`). pi implements the [Agent Skills standard](https://agentskills.io/specification) directly, so the canonical `skills/slopdocs/SKILL.md` is picked up as-is — no bootstrap step or plugin needed. Its description is always in context; pi loads the full skill on demand when a task matches.

To track the latest commit from git instead of the npm release:

```bash
pi install git:github.com/ryanskidmore/slopdocs
```

## Manual install

Copy `skills/slopdocs/SKILL.md` into your project:

```
.opencode/skills/slopdocs/SKILL.md
```

Or for cross-tool compatibility (this is also what Codex reads):

```
.agents/skills/slopdocs/SKILL.md
```

## What it does

The skill teaches your agent the slopdocs convention:

- **`slopdocs/features/`** - one living doc per feature
- **`slopdocs/bugs/`** - date-prefixed bug investigations
- **`slopdocs/plans/`** - date-prefixed implementation plans

It also tells the agent when a doc is worth writing (architectural decisions, non-obvious bugs, new features) and when to skip (renames, trivial changes, dependency bumps).

Read more at [slopdocs.dev](https://slopdocs.dev).

## License

MIT
