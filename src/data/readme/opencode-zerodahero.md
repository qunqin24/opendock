# agent-kit

General-purpose agent skills, packaged as a Claude Code plugin.

## Install

In Claude Code:

```text
/plugin marketplace add zerodahero/agent-kit
/plugin install zerodahero-skills@zerodahero
```

Skills appear as `/zerodahero-skills:<skill>`. Typing `/<skill>` autocompletes to them.

### For a team

Add this to a project's `.claude/settings.json` so collaborators are offered the plugin
when they trust the project:

```json
{
  "extraKnownMarketplaces": {
    "zerodahero": {
      "source": { "source": "github", "repo": "zerodahero/agent-kit" }
    }
  },
  "enabledPlugins": {
    "zerodahero-skills@zerodahero": true
  }
}
```

### Other agents

The skills use the standard `SKILL.md` layout, so [skills.sh](https://skills.sh) can copy
them into Codex and other harnesses:

```bash
npx skills add zerodahero/agent-kit
```

### opencode

The opencode plugin is published to npm as
[`opencode-zerodahero`](https://www.npmjs.com/package/opencode-zerodahero). It needs
opencode 2.2.5 or later, and adds the `second-review` skill and the `/second-review`
command.

**1. Install the plugin.** opencode installs the package and adds it to your global
config:

```bash
opencode plugin add opencode-zerodahero
```

Or add it to the `plugins` array yourself, in `~/.config/opencode/opencode.json` for every
project, or in a project's `opencode.json` for that project only:

```json
{
  "plugins": ["opencode-zerodahero"]
}
```

opencode installs the latest version at startup. To pin one, write
`"opencode-zerodahero@0.2.0"`. To update, run `opencode plugin check`, then
`opencode plugin update`.

**2. Install the `second-reviewer` agent.** Its permissions let it write only its report
file and run only read-only shell commands. opencode plugins cannot add agents, so it is a
separate file:

```bash
mkdir -p ~/.config/opencode/agents
curl -fsSL -o ~/.config/opencode/agents/second-reviewer.md \
  https://raw.githubusercontent.com/zerodahero/agent-kit/main/opencode/agents/second-reviewer.md
```

For one project only, save it to `.opencode/agents/second-reviewer.md` in that project
instead. Without the agent, `/second-review` runs in your current agent, and the skill's
instructions are the only guard against edits.

### Plan capture (optional)

```text
/plugin install zerodahero-plan-capture@zerodahero
```

Each time you approve a plan, this copies it into `.claude/plan/NNN.md` in the repo and
updates `.claude/plan/current.md`. `/review` and `/second-review` then find the plan
without a path. The folder ignores itself, so it never shows up in `git status`.

## Skills

| Skill | What it does |
| --- | --- |
| `glossary` | Checks the domain terms a branch introduces against the codebase and the glossary, asks you to confirm each word, then renames and records them. |
| `review` | Reviews the branch with the `code-reviewer` agent, merges any second reviews, and triages every finding into should fix, could fix, out of scope, and skip. |
| `second-review` | An independent review from another harness or model. It writes its findings to a file for `/review` to merge. It edits nothing else and runs no tests. |

`glossary` uses [Plannotator](https://github.com/backnotprop/plannotator) for the review
step when it is installed. Without it, the skill asks through Claude Code's question
prompts instead.

## Second review

Run a second opinion from a different harness, model, or provider, then merge it into the
primary review:

1. In opencode (or Codex, or another Claude Code session), run `/second-review`. It
   writes `.claude/plan/second-review-<branch>-<reviewer>.md`.
2. In the session that made the changes, run `/review`. It merges every second review for
   the branch, tags each finding with who raised it, and marks a review stale when the
   branch has moved since.

A second review merges once per commit, so running `/review` again does not repeat it.

## Project overlay

Both reviewers follow one generic method. To teach them a repo's specifics, add
`docs/agents/code-review.md` to that repo. It lists only what differs, under the method's
section names, and it wins where it conflicts with the method. Every harness reads it, so
`/second-review` in opencode gets the same specifics.

```markdown
# Code review overlay

## Scope

Base ref: `refs/heads/dev`.

## Standards

`CODING_STANDARDS.md` binds all code. Biome and `tsc` own what they catch.

## Lenses

- **Authorization:** `@Roles()` is inert without `@UseGuards(RolesGuard)`.
- **Workflow determinism** (extra lens): no clocks, randomness, or I/O in a Temporal
  workflow's `run()`.

## Blast radius

| The diff changes | Grep the old string in |
| --- | --- |
| copy, a heading, an ARIA role, a test id | `smoke-tests/tests/` |
| a table or column | `database/alembic/versions/` |
```

## License

MIT. See [LICENSE](LICENSE).
