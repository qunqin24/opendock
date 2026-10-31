# Recursive skill file listings for OpenCode

**A skill is a tree, not a bag of files.** Root `SKILL.md`, plus `reference/`, `scripts/`, `templates/`, `data/` — and, in real practice, **sub-skills**: nested directories that each carry their own `SKILL.md` and cover one distinct capability. Progressive disclosure is the whole design: the agent gets a little metadata up front and reads deeper only when the task calls for it.

That only works if the agent can see the shape of the tree. OpenCode's skill loader samples only the first 10 supporting files in a skill directory; this plugin rewrites the `skill` tool result so the agent sees every file in the directory — recursive, realpaths resolved, capped at 500.

## A skill is a tree

The format says so, and so does practice.

- **The spec defines skills as trees of files.** The [Agent Skills specification](https://agentskills.io/specification) allows a skill directory to contain `scripts/`, `references/`, `assets/`. Anthropic's own write-up calls these "the third level (and beyond) of detail" — [Equipping agents for the real world with agent skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).
- **Practitioners keep building trees-of-skills anyway.** [claude-code#28266](https://github.com/anthropics/claude-code/issues/28266) is a user with a parent skill and 27 nested sub-skills, filed because the harness only detects the parent. It was closed as a duplicate — of three other requests for the same thing ([#18192](https://github.com/anthropics/claude-code/issues/18192), [#20805](https://github.com/anthropics/claude-code/issues/20805), [#10238](https://github.com/anthropics/claude-code/issues/10238)). This is the pattern being built in the wild while upstream doesn't discover it.
- **Third-party repos use the term.** [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) is built as an orchestrator: one root `SKILL.md` routes the agent down into a set of sub-skills.
- **OpenCode states the boundary explicitly.** The [OpenCode skills docs](https://opencode.ai/v2/docs/skills/) say: "A directory containing `SKILL.md` is one skill. OpenCode does not search inside it for more skills." It does officially support `SKILL.md` nested in *grouping* directories (`skills/teams/release/SKILL.md`).

**Being honest about it:** the specs describe trees-of-*files*. Nesting whole skills inside skills is a practitioner convention that no major harness fully discovers. This plugin doesn't invent sub-skill discovery — it makes sure the files are visible.

## What the loader shows you

When OpenCode loads a skill, core injects a `<skill_files>` block. It is a **sample, not the directory**. `Skill.prepare()` (`packages/core/src/skill.ts`) does three things, in this order:

1. **Drops every `SKILL.md`** — `.filter((file) => path.basename(file) !== "SKILL.md")`, at any depth. No skill file is ever listed, root or sub-skill.
2. **Sorts** in UTF-16 code-unit order — `.toSorted()`.
3. **Keeps the first ten** — `.slice(0, 10)`.

The result is printed under `Note: file list is sampled.`, which sits *above* the opening tag. The agent gets a flat list of at most 10 paths and nothing else.

A second, related case: when the skill entry isn't the canonical `SKILL.md` (`basename(skill.path) !== "SKILL.md"`), core returns an **empty** `files` list — `<skill_files>` lists nothing at all.

## The listing is mechanical, not meaningful

Neither rule above asks *what this task needs*. The filter erases a sub-skill's entry point, so a branch reads as loose data files rather than as a capability. And the cut at ten is lexicographic: on a skill with more than ten supporting files, what gets dropped is decided by **path ordering**, not importance — a branch whose name sorts late can lose every file, and the agent never learns the branch exists.

It cannot read what it cannot see — and it cannot ask about a capability it has no evidence of.

## The principle: see what it needs, never what it doesn't

The full listing is a **map, not the territory**. Listing ~15 paths costs a few hundred tokens; reading files is what actually costs context. A complete map lets the agent be *more* selective, not less — it navigates precisely to the one branch the task needs instead of blind-reading everything or silently missing a branch.

That's the design goal: the agent sees what it needs and never sees what it doesn't.

## Worked example

[`examples/complex-skill/project-tracker/`](examples/complex-skill/project-tracker/) — 22 files, plus a [README](examples/complex-skill/README.md) alongside it.

```
project-tracker/
├── SKILL.md
├── reference/
│   ├── api-limits.md
│   ├── field-mapping.md
│   └── property-glossary.md
├── scripts/
│   ├── new-ticket.sh
│   ├── shared-auth.sh
│   └── status-report.sh
└── sub-skills/
    ├── calendar-scheduling/
    │   ├── SKILL.md
    │   ├── reference/
    │   │   ├── business-hours.md
    │   │   └── timezones.md
    │   ├── scripts/
    │   │   └── find-slots.sh
    │   └── templates/
    │       └── invite.md
    ├── reporting/
    │   ├── SKILL.md
    │   ├── queries/
    │   │   └── weekly-rollup.md
    │   ├── reference/
    │   │   └── metric-definitions.md
    │   └── templates/
    │       └── exec-summary.md
    └── task-creation/
        ├── SKILL.md
        ├── examples/
        │   ├── completed-task.md
        │   └── duplicate-check.md
        ├── reference/
        │   └── priority-rubric.md
        └── templates/
            ├── label.md
            └── task.md
```

Three **unrelated** sub-skills — `task-creation`, `calendar-scheduling`, `reporting` — unrelated on purpose: two different tasks on this skill need completely different branches. Each carries its own `SKILL.md`; that is what makes it a routable capability.

**Before — what core shows: 10 of 22.** All four `SKILL.md` files are filtered out first, then the ten-file cut applies to the remaining 18 eligible files — and it lands exactly on the `calendar-scheduling` → `reporting` boundary, hiding **two whole branches**: `reporting/` (3 files) and `task-creation/` (5 files). Paths below are relative to the skill root for readability — core actually emits absolute paths:

```xml
Note: file list is sampled.
<skill_files>
<file>reference/api-limits.md</file>
<file>reference/field-mapping.md</file>
<file>reference/property-glossary.md</file>
<file>scripts/new-ticket.sh</file>
<file>scripts/shared-auth.sh</file>
<file>scripts/status-report.sh</file>
<file>sub-skills/calendar-scheduling/reference/business-hours.md</file>
<file>sub-skills/calendar-scheduling/reference/timezones.md</file>
<file>sub-skills/calendar-scheduling/scripts/find-slots.sh</file>
<file>sub-skills/calendar-scheduling/templates/invite.md</file>
</skill_files>
```

The agent sees `sub-skills/calendar-scheduling/templates/invite.md` and `scripts/shared-auth.sh` — files from one sub-skill and the root — but nothing that says `reporting/` or `task-creation/` exist at all. Their `SKILL.md` entry points, and every supporting file beneath them, are gone.

**After — the plugin lists all 22.** Core's block above is untouched; the marker and the plugin's block are spliced immediately before `</skill_files>`:

```xml
Note: file list is sampled.
<skill_files>
<file>reference/api-limits.md</file>
<!-- …core's other 8 entries… -->
<file>sub-skills/calendar-scheduling/templates/invite.md</file>
<!-- recursive-skills: recursive list (22 files) -->
<file>SKILL.md</file>
<file>reference/api-limits.md</file>
<file>reference/field-mapping.md</file>
<file>reference/property-glossary.md</file>
<file>scripts/new-ticket.sh</file>
<file>scripts/shared-auth.sh</file>
<file>scripts/status-report.sh</file>
<file>sub-skills/calendar-scheduling/SKILL.md</file>
<file>sub-skills/calendar-scheduling/reference/business-hours.md</file>
<file>sub-skills/calendar-scheduling/reference/timezones.md</file>
<file>sub-skills/calendar-scheduling/scripts/find-slots.sh</file>
<file>sub-skills/calendar-scheduling/templates/invite.md</file>
<file>sub-skills/reporting/SKILL.md</file>
<file>sub-skills/reporting/queries/weekly-rollup.md</file>
<file>sub-skills/reporting/reference/metric-definitions.md</file>
<file>sub-skills/reporting/templates/exec-summary.md</file>
<file>sub-skills/task-creation/SKILL.md</file>
<file>sub-skills/task-creation/examples/completed-task.md</file>
<file>sub-skills/task-creation/examples/duplicate-check.md</file>
<file>sub-skills/task-creation/reference/priority-rubric.md</file>
<file>sub-skills/task-creation/templates/label.md</file>
<file>sub-skills/task-creation/templates/task.md</file>
</skill_files>
```

Four files reappear, and three of them are sub-skill entry points. Give a skill enough supporting files and the ten-file cut doesn't just strip entry points — it deletes whole branches outright. The plugin restores the four entry points **and** the eight files core dropped, two entire branches (`reporting/`, `task-creation/`) included.

To see it yourself: load the skill in OpenCode with and without the plugin, and diff the `<skill_files>` block.

(The `examples/` directory ships in the repo, not the npm tarball — `package.json` includes only `src/` — so the code blocks above are what npm readers get.)

## What it does

On every completed `skill` tool call, the plugin's `execute.after` hook:

1. Locates the skill directory — `result.metadata.directory` first, then the content's own `Base directory for this skill:` line.
2. Walks it recursively, resolving every path to its realpath (symlinks followed), up to the file cap.
3. Splices a full recursive listing — one `<file>` line per file, sorted — immediately before `</skill_files>` (or `</skill_content>`, or appended).

If the directory can't be resolved, it appends a visible HTML comment saying so and changes nothing else. It never throws and never blocks the tool pipeline.

## Install

Add it to `opencode.json(c)` — a plain string entry in `plugins`. This form works on both OpenCode majors and is the only path for local directories, so it leads:

```jsonc
{
  "plugins": ["opencode-recursive-skills"]
}
```

Or install with the CLI's `add` subcommand:

```bash
opencode plugin add opencode-recursive-skills
```

> **Historical (v1):** OpenCode v1 used the bare-positional form `opencode plugin <package>`. That form is v1-only — on v2 it exits 1. Use `plugin add` or the config array above.

With options:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-recursive-skills",
      "options": {
        "maxFiles": 300,
        "debug": false
      }
    }
  ]
}
```

> **Local development:** for a local checkout, prefer a `~/…` (home-relative) entry in `plugins`. On v2.1.2 an absolute-path or relative entry pointing at this package was silently ignored (its entrypoint is declared only via `package.json` `exports`, with no root-level `index.ts`), while the `~/…` form loaded fine. Confirm with `--print-logs`: look for `msg="loading plugin"` whose `id=` is your configured target.

## Verify it's working

Load any skill and look for the plugin's marker in the `skill` tool result, immediately before the closing tag:

```
<!-- recursive-skills: recursive list (N files) -->
```

`N` is the number of files the walk found (with `(capped at …)` appended if it hit the cap). If the directory couldn't be resolved, you'll instead see `recursive file list unavailable (skill directory could not be resolved)`.

For a step-by-step trace, set `RECURSIVE_SKILLS_DEBUG=1` (or `"debug": true` in options) and watch stderr for `[recursive-skills]` lines.

## The trade-off

The ten-file cap is deliberate — core prints `Note: file list is sampled.` and, for most skills, ten supporting files are enough. This plugin intentionally spends some context for completeness: on a large skill the spliced block adds many `<file>` lines to the tool result, and each line rides along on later turns that still carry that result.

- **Bound it** — set `maxFiles` (or `RECURSIVE_SKILLS_MAX_FILES`) low; the walk stops at the cap and the marker notes `(capped at N)`.
- **Opt out** — remove the plugin from `plugins` to restore core's sampled behavior. There is no per-skill toggle.

## Compatibility

- Requires **OpenCode V2**. Tested against **v2.1.2**.
- Depends on the `execute.after` hook payload shape — `event.tool`, `event.status`, and `event.result.content` as a string or an array of `{type:"text"}` parts containing `<skill_content`. v2.1.2 delivers the **array** form at runtime (a string branch is kept as fallback).
- If a future OpenCode changes that payload shape, or the skill directory can't be resolved, the hook **no-ops** — no error, no crash; the skill just loads unsampled.

## Options

| Option | Env var | Default | Effect |
|---|---|---|---|
| `maxFiles` | `RECURSIVE_SKILLS_MAX_FILES` | `500` | Safety cap on listed files |
| `debug` | `RECURSIVE_SKILLS_DEBUG=1` | `false` | Opt-in debug logging (silent by default) |

Options beat env vars beat the default.

## How it works

Registers `ctx.tool.hook("execute.after", ...)` via `Plugin.define` from `@opencode/plugin`. Only the `skill` tool is touched (`event.tool !== "skill"` returns early), and only completed results. Core re-reads `result.content` after hooks resolve, so the rewrite reaches the model. The content arrives as an **array** of `{type:"text"}` parts; the plugin finds the part containing `<skill_content`, rewrites that part's `text`, and returns a new result — a string-content branch is kept as a fallback.

## Limitations

- **Lists, doesn't promote** — nested `SKILL.md` files become visible as files; the harness still loads only the top-level skill.
- **Lists dotfiles** — the walk doesn't filter leading dots, matching core's own `dot: true` scan.
- **No general ignore-glob filtering** — only the hardcoded `SKIP_DIRS` set (`node_modules`, `.git`) is excluded from the walk; any other large tree counts against `maxFiles`.
- **500-file cap** — a ceiling, not a sample. Raise or lower it via `maxFiles`.

## Safety notes

- **Bounded** — the walk stops at `maxFiles`, which also guards symlink loops and pathological trees.
- **Fail-silent** — an unresolvable directory, a broken symlink, a vanished file, or any hook error is swallowed; the skill still loads. The unresolvable-directory case leaves a visible HTML comment rather than failing.
- **No network** — the plugin only reads the local filesystem.

## License

MIT
