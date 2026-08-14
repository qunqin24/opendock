# DoNice

An OpenCode plugin that locks an agent into a target — broken into
milestones — until independent evaluators say each one is done.

## What it does

You define a final goal split into ordered **milestones**. The plugin then:

1. Injects only the **current milestone** description into the agent's
   system prompt (upcoming titles are listed for context, not their bodies).
2. After every `session.idle`, runs:
   - the deterministic test scripts assigned to this milestone (any
     executable, exit 0 = pass);
   - a **fresh-context LLM reviewer** (a brand-new session with no
     prior history) that grades the workspace against this milestone's
     private rubric and returns concrete `how_to_fix` instructions per
     issue.
3. If the milestone passes, **auto-advances** to the next milestone with
   a hand-off message. When the final milestone passes, posts a one-time
   "target satisfied" notice and stops nagging.
4. If the milestone fails, pushes a steering message — including the
   reviewer's "How to fix" hints — back into the session so the agent
   keeps fixing the *current* milestone only.
5. Blocks every tool call that would let the agent peek at evaluation
   scripts or rubrics — so it can't reward-hack by reading the answer key.

## Install

Published as [`donice-evaluator`](https://www.npmjs.com/package/donice-evaluator)
on npm. OpenCode auto-installs the package via Bun — no `npm install`
or manual file copying needed.

### 1. Add it to `opencode.json`

For a single project, write `opencode.json` at the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "question": "allow" },
  "plugin": ["donice-evaluator"]
}
```

For all projects on the machine, write the same config to
`~/.config/opencode/opencode.json` instead.

`permission.question = allow` is required so `/donice-create` can use
OpenCode's question tool to interview you while authoring a target.

### 2. Run OpenCode

```bash
opencode
```

On first start, Bun fetches `donice-evaluator` into
`~/.cache/opencode/node_modules/`. The plugin then seeds
`.opencode/commands/donice-*.md` in your project. You'll see a one-line
notice in the terminal:

```
[donice-evaluator] wrote 13 command file(s) to <project>/.opencode/commands/.
Restart OpenCode to make them available in the / menu.
```

### 3. Restart OpenCode once

The TUI scans `.opencode/commands/` at startup, so the `/donice-*`
entries only appear after a restart. Subsequent starts are instant.

### 4. Author a target

```
/donice-create     # answer the agent's questions interactively
/clear             # wipe authoring context (the agent saw rubric content)
/donice-launch     # reset milestone state and start milestone 1
```

That's it.

### Pin a specific version (optional)

```json
{ "plugin": ["donice-evaluator@0.1.0"] }
```

### Use the GitHub source instead of npm (optional)

```json
{ "plugin": ["github:Rorical/DoNice"] }
```

Bun resolves the GitHub URL and uses the repo's `package.json`. Useful
for testing pre-release branches.

## Quick start

```text
/donice-create     # interactively author a target (uses the question tool)
/clear             # wipe authoring context (the agent saw rubric content)
/donice-launch     # reset milestone state and kick off implementation
```

After `/donice-launch` the agent receives milestone 1's description and
starts work. Every time it goes idle, the evaluator runs and either steers
it back to fixing the current milestone or advances it to the next.

## Layout (in your project after install)

```
your-project/
├── opencode.json             # references "donice-evaluator" in plugin[]
└── .opencode/
    ├── commands/             # auto-seeded by the plugin on first run
    │   ├── donice-create.md  donice-launch.md      donice-status.md
    │   ├── donice-evaluate.md donice-milestone.md  donice-advance.md
    │   ├── donice-pause.md   donice-resume.md      donice-reset.md
    │   ├── donice-toggle.md  donice-list-models.md donice-set-model.md
    │   └── donice-reload.md
    └── donice-target/        # (created by /donice-create or by you)
        ├── target.json       # public — title, description, milestones[]
        └── private/          # blocked from all tool access
            ├── tests/        # deterministic scripts (per-milestone filenames)
            └── milestones/   # one rubric.md per milestone
```

## Develop locally

Repo layout:

```
DoNice/                       # publishable as 'donice-evaluator'
├── index.ts                  # plugin entrypoint (the published source)
├── commands/                 # bundled command stubs (the published source)
├── package.json              # peerDeps on @opencode-ai/plugin
├── README.md
├── examples/                 # reference targets — opt-in, not auto-loaded
│   └── greet-py-target/      # 2-milestone CLI + docs example
└── .opencode/
    └── plugins/
        └── donice-evaluator.ts  # one-line shim re-exporting ../../index.ts
```

The repo deliberately does **not** ship an active `.opencode/donice-target/`,
so cloning it doesn't carry a stray answer key. To hack on the plugin
end-to-end:

```bash
bun install
cp -R examples/greet-py-target .opencode/donice-target   # opt in to the example
opencode
```

The `.opencode/plugins/donice-evaluator.ts` shim loads `index.ts` directly,
so edits show up on the next session restart. The bootstrap writes
`.opencode/commands/` on first plugin load — restart once, then iterate.

To publish:

```bash
bun install
npm publish --access public
```

## Slash commands

| Command | Effect |
|---|---|
| `/donice-create` | Interactively author a fresh target. The agent uses the `question` tool to gather info, then writes `target.json` + private files via the `donice_init_target` tool. |
| `/donice-launch` | Reset per-session state and post the implementation kickoff for milestone 1. Run after `/clear`. |
| `/donice-status` | Show steering state, milestone list, and last evaluation report. |
| `/donice-milestone` | Print the current milestone's description plus upcoming titles. |
| `/donice-evaluate` | Run the enabled evaluators on the current milestone now. |
| `/donice-advance` | Force-advance to the next milestone (manual override). |
| `/donice-pause` / `/donice-resume` | Suspend / resume the steering loop. |
| `/donice-toggle det` / `/donice-toggle llm` | Flip an evaluator on/off. |
| `/donice-list-models` | Print every provider/model OpenCode has connected. |
| `/donice-set-model <providerID>/<modelID>` | Switch the LLM reviewer live. |
| `/donice-reset` | Reset iteration counter, completion flag, and milestone index for this session. |
| `/donice-reload` | Re-read `target.json` from disk after a manual edit. |

## Authoring a target by hand

If you'd rather skip `/donice-create`, write `target.json` directly:

```json
{
  "title": "Short label",
  "description": "What 'done' looks like overall.",
  "evaluatorModel": { "providerID": "anthropic", "modelID": "claude-sonnet-4-20250514" },
  "enableDeterministic": true,
  "enableLLM": true,
  "maxSteerIterations": 25,
  "steerCooldownMs": 4000,
  "milestones": [
    {
      "id": "m1-cli",
      "title": "CLI behavior",
      "description": "Visible to the agent — what done looks like for this phase.",
      "tests": ["10-foo.sh", "11-bar.sh"],
      "rubric": "milestones/m1-cli.md"
    }
  ]
}
```

- `evaluatorModel` accepts any `providerID/modelID` OpenCode is connected
  to — `/donice-list-models` shows the live picker.
- `tests` is a list of filenames inside `private/tests/`. Each script
  must exit 0 on pass and write a short *abstract* failure message to
  stderr/stdout — that is the only thing the agent sees.
- `rubric` is a path relative to `private/`. The reviewer LLM reads it
  in a fresh session and returns strict JSON
  `{passed, summary, issues:[{what, how_to_fix}, …]}`.
- Omit `milestones` entirely and provide `private/rubric.md` + a flat
  `private/tests/` for legacy single-target mode.

## Reward-hacking guards

`tool.execute.before` rejects any call where a path argument resolves
into `.opencode/donice-target/private/` or `.opencode/plugins/`, plus
any `bash`/`grep`/`glob` whose command or pattern mentions those paths.
The plugin's own `donice_init_target` tool is the only writer allowed
into `private/`.

Note: during `/donice-create` the *authoring* session necessarily sees
rubric text the user dictates. That's why the create flow ends by
telling the user to `/clear` and `/donice-launch` — implementation
starts in a context that has no prior exposure.

## Stopping the loop

- `/donice-pause` — pauses steering globally until `/donice-resume`.
- `maxSteerIterations` — defaults to 25; the plugin posts a "steering
  halted" notice and stops.
- All milestones pass — the plugin marks the session completed and
  never steers it again (until `/donice-reset`).
- Delete `target.json` — the plugin idles.
