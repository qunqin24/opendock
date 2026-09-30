# opencode-plugin-plan-review

An [opencode](https://github.com/anomalyco/opencode) v2 plugin that replaces a wall-of-markdown plan with a short, structured one you review in the terminal, and keeps you in the loop while it runs, without a mode to switch into.

- **No mode switch.** The build agent decides for itself when a task needs a plan: small changes just run; multi-file, ambiguous or hard-to-undo work gets clarifying questions and a plan first. The **architect** agent is there for when you want a plan up front.
- **Short plans.** Steps that need a human decision carry a one-line `⚑` saying what to decide. Routine steps fold into a single line, so you read the decisions, not the whole plan.
- **Questions as one form.** Every clarifying question arrives at once, with options and the agent's recommendation.
- **Per-step review.** Approve, reject, ask to revise, edit or comment on each step, then send the review back or execute.
- **Planning keeps going during execution.** When the agent finds work the plan missed, it amends the plan: routine additions inside the approved files run on, anything risky or new pauses for you.
- **Inspect as it runs.** Each finished step records how it was verified and which files it touched; a high-risk step or a failed check pauses at a checkpoint so you look before the next step.
- **What changed.** When the plan finishes, a digest lists the steps riskiest first with their checks, the files they touched, and any drift from the plan; `d` opens the diff.

Status: draft. It targets the opencode v2 plugin API, which is still pre-stable.

## Install

The plugin ships a server entry and a TUI entry in one package; opencode loads the TUI half of every active server plugin on its own.

```jsonc
// opencode.jsonc
{
  "plugins": ["@smykla-skalski/opencode-plugin-plan-review"]
}
```

For local development, point `plugins` at a checkout: `"plugins": ["/path/to/opencode-plugin-plan-review"]`. opencode watches the files and reloads the plugin when they change.

## Use

1. Describe the change to the build agent as usual, or switch to the **Architect** agent to plan first.
2. If the agent needs answers, the panel shows every question as one form. Answer and press `ctrl+s`.
3. When a plan arrives, the panel opens with the steps that need you; `.` shows the folded routine ones. Review with the keys below.
4. Press `s` to send the review for another round, or `x` to execute the approved steps.
5. The panel reopens on its own when an amendment needs approval, at a checkpoint (`x` continues, `s` asks for changes), and when the plan finishes with the "what changed" digest.

`/plan` or `<leader>p` reopens the panel. The line above the prompt shows the plan version and a tally, and the sidebar shows an outline.

| Key | Plan panel | Questions form |
| --- | --- | --- |
| `j` / `k` | next / previous step | next / previous option |
| `a` / `r` / `v` | approve / reject / ask to revise the step | |
| `e` | edit the step (counts as approved) | |
| `c` | comment on the step | |
| `A` | approve every undecided step | |
| `n` | general feedback | |
| `s` / `x` | send review (revise) / execute or continue | |
| `.` | show or fold routine steps | |
| `d` | open the diff viewer | |
| `tab` / `shift+tab` | | next / previous question |
| `space`, `enter` | | select option, type a text answer |
| `ctrl+s` | | send answers |
| `o` / `f` / `q` | toggle summary / fullscreen / close | fullscreen / close |

Review drafts are saved on disk, so a half-finished review survives a restart.

## Options

```jsonc
{
  "plugins": [
    {
      "package": "@smykla-skalski/opencode-plugin-plan-review",
      "options": {
        "agent": "architect",
        "buildAgent": "build",
        "gate": "ask",
        "checkpoint": "risky",
        "autoPlan": true
      }
    }
  ]
}
```

| Option | Default | What it does |
| --- | --- | --- |
| `agent` | `architect` | Id of the planning agent the plugin defines. |
| `buildAgent` | `build` | Agent that executes approved steps. |
| `gate` | `ask` | What happens when the build agent edits a file no approved step lists: `ask`, `deny`, or `off`. |
| `checkpoint` | `risky` | When execution pauses for you after a step: `risky` (high-risk step, failed check, or blocked), `every` step, or `off`. |
| `autoPlan` | `true` | Tell the build agent to decide on its own when a task needs questions and a plan. |

## How it works

```text
build or architect ──plan_ask──────► form in panel ──ctrl+s──► <plan-answers> wakes the agent
build or architect ──plan_propose──► review panel ──s──► <plan-review action=revise> ──► plan vN+1
                                                   └──x──► build agent runs the approved steps
build ──plan_step in_progress → edit → verify → plan_step done + check──► next step
      │                                                   └─ high risk / failed check ──► checkpoint ──x──► continue
      └─plan_amend──► routine & inside approved files ──► runs on
                      └─ risky, ⚑ or new files ──► paused for review ──x──► continue
last step done ──► "what changed" digest: checks, touched files, drift, riskiest first
```

- The tools return immediately and the agent ends its turn, so nothing waits in memory: plans, questions and drafts live in plugin storage and survive restarts.
- The review reaches the model as a synthetic message; the timeline shows a one-line notice such as `Plan review v2: 5✓ 1✗ 2✎ → revise`.
- Planning agents do not get opencode's one-question-at-a-time `question` tool; `plan_ask` replaces it. `plan_step` and `plan_amend` exist only while a plan executes.
- Touched files come from the edit permission check: each edit is attributed to the step in progress, and an edit outside that step's files shows as drift.

## Known gaps

These need changes in opencode itself; the plugin works around them.

- **Mermaid inside the panel** shows as source. opencode renders mermaid in chat, but it does not expose its renderer to plugins.
- **No rich card in the timeline.** Tool calls without a built-in renderer show as one generic line; the panel and the line above the prompt carry the plan instead.
- **Shell commands are not gated** to the approved files; only edit, write and patch are.
- **Web and desktop apps** do not render the panel; they see the markdown plan in the tool output.

## Development

```sh
mise install
mise run install
mise run check   # typecheck, oxlint, markdownlint, actionlint + zizmor, tests, npm pack
```

The plan logic (`src/plan.ts`, `src/render.ts`, `src/gate.ts`, `src/tui/draft.ts`) is pure and unit tested; the server and TUI entries are thin wiring over the v2 plugin API.

## License

MIT
