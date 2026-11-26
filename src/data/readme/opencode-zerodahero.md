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

An agent file does not update with the plugin. Download it again after each release that
changes it. 0.7.0 does: the agent now denies `rg --pre`, which runs any command, and
allows only `git branch --show-current` instead of every `git branch` form.

### Plan capture (optional)

```text
/plugin install zerodahero-plan-capture@zerodahero
```

Each time you approve a plan, this copies it into `.claude/plan/NNN.md` in the repo and
updates `.claude/plan/current.md`. `/review` and `/second-review` then find the plan
without a path. The folder ignores itself, so it never shows up in `git status`.

## Skills

| Skill           | What it does                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glossary`      | Checks the domain terms a branch introduces against the codebase and the glossary, asks you to confirm each word, then renames and records them.                                                                                                        |
| `human-review`  | Prepares a layered review that you walk yourself: short purpose, design, flow, and test-name docs, then the full diff in tuicr. It writes a [korin](https://github.com/zerodahero/korin) wizard pinned to one range, so every run shows the same thing. |
| `plan-review`   | Red-teams a plan in plan mode with an opencode reviewer over several rounds, and records every finding in a ledger at the end of the plan. You see only the decisions that need you.                                                                    |
| `review`        | Reviews the branch with the `code-reviewer` agent, merges any second reviews, and triages every finding into should fix, could fix, out of scope, and skip.                                                                                             |
| `second-review` | An independent review from another harness or model. It writes its findings to a file for `/review` to merge. It edits nothing else and runs no tests.                                                                                                  |

`human-review` needs `korin` 0.1.2 or later, `tuicr`, and either Plannotator or `nvim` on
the `PATH` when you run the wizard. Run it from the repo root with `korin run
.reviews/<id>/<range>/review.korin`. The wizard is a korin guide: it pauses before each
stage instead of asking for approval. Each layer doc opens in Plannotator, and your
annotations become your notes. Without Plannotator, it opens in nvim beside a notes pane;
set `HUMAN_REVIEW_PREVIEW` to an nvim command, such as `MdKite start`, for a live preview
there. korin keeps its run journal in `.korin/` at the repo root, so add that directory to
a gitignore.

`glossary` uses [Plannotator](https://github.com/backnotprop/plannotator) for the review
step when it is installed. Without it, the skill asks through Claude Code's question
prompts instead.

## Output styles

The plugin ships one output style, `neurospicy`. Select it with `/output-style` and pick
`zerodahero-skills:neurospicy`.

`neurospicy` shapes replies for a reader with ADHD or a similar working-memory load. Replies
lead with the point, use plain short sentences, and end with one concrete next step. Long
tasks repeat their full progress every phase, and tangents collect in one group at the end.
See [`output-styles/neurospicy.md`](output-styles/neurospicy.md) for the full rules.

## Second review

Run a second opinion from a different harness, model, or provider, then merge it into the
primary review:

1. In opencode (or Codex, or another Claude Code session), run `/second-review`. It
   writes `.claude/plan/second-review-<branch>-<reviewer>.md`.
2. In the session that made the changes, run `/review`. It merges every second review for
   the branch, tags each finding with who raised it, and marks a review stale when the
   branch has moved since.

A second review merges once per commit, so running `/review` again does not repeat it.

**Hand it off.** `/review second` runs both reviewers from the Claude Code session. It
starts the `code-reviewer` agent and an opencode second review in a fresh session, in
parallel, then triages both in one report. Name the opencode model after the keyword:
`/review second openai/gpt-6.2-sol`. Without one, opencode uses its default model. When
the second review fails, you get the primary triage alone, and its verdict line says why.

It needs `opencode` 2.4 or later, `jq`, and the `second-reviewer` agent from the opencode
section above. Claude runs the launcher script with the sandbox disabled, because opencode
writes its log outside the sandbox. Add this to `~/.claude/settings.json` so it runs
without a prompt, with your home directory in place of `/Users/you`. Claude types the
script's full path, and the rule matches only the installed plugin's copy:

```json
{
  "permissions": {
    "allow": [
      "Bash(/Users/you/.claude/plugins/cache/zerodahero/zerodahero-skills/*/skills/review/review/run-second.sh *)"
    ]
  }
}
```

The two-session flow above still works.

## Plan review

`plan-review` red-teams a plan in Claude Code's plan mode before you read it. Claude
drafts a locked **anchor** of what scoping agreed, and you approve it. Claude then writes
the plan, and an opencode `plan-reviewer` agent reviews it in one persistent session over
several rounds. Claude records each finding in a review ledger at the end of the plan and
decides to accept, rebut, or defer it. Disputes and shifts away from the anchor come to
you as questions. The plan reaches Plannotator with its revision notes and
ledger already in place.

Claude offers it when a plan settles architecture, a data model, an external contract, or
a scope boundary. Run `/plan-review` in plan mode to start it yourself. To set it up:

1. **Install the `plan-reviewer` agent.** It denies every tool except reading the repo,
   read-only `git` and search commands, and writing its own report:

   ```bash
   mkdir -p ~/.config/opencode/agents
   curl -fsSL -o ~/.config/opencode/agents/plan-reviewer.md \
     https://raw.githubusercontent.com/zerodahero/agent-kit/main/opencode/agents/plan-reviewer.md
   ```

2. **Let the scripts run unprompted.** Claude runs `run-round.sh` and `ledger.py` with
   the sandbox disabled: opencode writes its log outside the sandbox, and the plan file
   sits outside it too. A `sandbox.excludedCommands` entry does not match these commands,
   because their instructions arrive in a multi-line heredoc. Add the allow rules to
   `~/.claude/settings.json`, with your home directory in place of `/Users/you`, so each
   call skips the prompt:

   ```json
   {
     "permissions": {
       "allow": [
         "Bash(/Users/you/.claude/plugins/cache/zerodahero/zerodahero-skills/*/skills/review/plan-review/run-round.sh *)",
         "Bash(/Users/you/.claude/plugins/cache/zerodahero/zerodahero-skills/*/skills/review/plan-review/ledger.py *)"
       ]
     }
   }
   ```

3. **Pick a model.** Pass one as `/plan-review openai/gpt-6.2-sol`, or set `model` in
   your opencode config. opencode's free default model runs out of quota quickly.

The scripts need `opencode` 2.4 or later, `jq`, and Python 3. Each round writes its
frozen plan input, prompt, report, and event log to `.claude/plan/`, which ignores itself.

The reviewer runs only read-only `git` and search commands. For a repo where a read-only
tool would settle questions better, such as a linter that checks a config without running
it, copy the agent to `.opencode/agents/plan-reviewer.md` in that repo and add an allow
rule for the tool. A project agent replaces the global one.

The reviewer's model provider receives the full plan, the ledger, and any source the
reviewer reads. opencode keeps the session in its own store. Delete a finished review
with `opencode session delete <id>`, using the `Session` ID from the plan's ledger.

With `zerodahero-plan-capture` installed, `ExitPlanMode` writes `.claude/plan/current.md`
before you approve the plan, so `/review` can pick up a draft you rejected. `plan-review`
copies the approved plan there again once you approve it.

After you build the plan, review the code with `/review second`, or with `/second-review`
in a fresh opencode session. The plan reviewer approved the plan, so it reads code that matches the plan too
kindly.

## Project overlay

Both reviewers follow one generic method. To teach them a repo's specifics, add
`docs/agents/code-review.md` to that repo. It lists only what differs, under the method's
section names, and it wins where it conflicts with the method. Every harness reads it, so
`/second-review` in opencode gets the same specifics. The plan reviewer reads only its
`## Plan lenses` section.

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

## Plan lenses

- **Workflow determinism:** a plan that adds a workflow step names its patch or
  versioning strategy.

## Blast radius

| The diff changes | Grep the old string in |
| --- | --- |
| copy, a heading, an ARIA role, a test id | `smoke-tests/tests/` |
| a table or column | `database/alembic/versions/` |
```

## Changelog

Both plugins and the opencode package release together at one version. See
[CHANGELOG.md](CHANGELOG.md) for what each release changed.

## License

MIT. See [LICENSE](LICENSE).
