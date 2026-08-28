# opencode-nested-skills

Claude Code style **downward** skill discovery for [opencode](https://opencode.ai).

opencode only walks *up* from your working directory to the git worktree root, so a skill living in
`packages/api/.claude/skills/` is invisible when you start opencode at the repo root. This plugin
walks *down*, registers what it finds, and surfaces the right skills when you touch files in their
directory.

```
repo/                              ← opencode started here
├── .opencode/skills/
│   └── house-style/               ✅ opencode finds this on its own
└── packages/
    └── api/
        ├── .claude/skills/
        │   └── db-migrations/     ❌ invisible to opencode  →  ✅ with this plugin
        └── src/handler.ts         ← reading this announces db-migrations
```

## What it does

1. **Registers nested skills.** They appear in `/skills` in the TUI, in `GET /skill`, and load
   through the built-in `skill({ name })` tool — nothing is reimplemented.
2. **Reveals them as you navigate.** A registered nested skill is filtered *out* of the
   `<available_skills>` listing in the system prompt until a tool reads or edits a file inside its
   directory. Enter `packages/api/`, and that package's skills appear — and stay, for the rest of the
   session. This is the lazy behaviour Claude Code has, and it is what keeps a monorepo's hundreds of
   skills from sitting in context on every request.
3. **Announces the ones that just unlocked**, appended to the output of the tool that touched the
   file, so the model acts on them in the same turn rather than the next one.
4. **Shows a TUI notification** naming what loaded, so you can see it happen:

   ```
   43 skills loaded · repos/backend
   adding-a-publish-channel, auditing-business-events, authenticating-api-requests,
   authoring-temporal-workflows, authorizing-with-rebac-and-entitlements, …
   ```

On a tree holding 130 nested skills, the listing costs ~20,750 tokens per request unregulated. Gated,
it is ~50 tokens at session start and ~5,900 once you enter a subproject.

## Install

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-nested-skills"]
}
```

With options:

```jsonc
{
  "plugin": [
    ["opencode-nested-skills", { "maxDepth": 4, "mode": "inject" }]
  ]
}
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `containers` | `[".opencode/skills", ".opencode/skill", ".agents/skills", ".agents/skill", ".claude/skills"]` | Directory shapes that hold skills, highest priority first. |
| `maxDepth` | `6` | How many levels below the root to walk. |
| `ignore` | see below | Extra directory names to skip; always **added** to the defaults. |
| `mode` | `"announce"` | `announce` lists name + description; `inject` pastes the whole `SKILL.md`; `off` disables the file-access trigger and only registers. |
| `register` | `true` | Add discovered skills to `skills.paths` so they show in `/skills`. |
| `annotate` | `true` | Append the scope table to the `skill` tool description. |
| `gate` | `true` | Hide unvisited path-scoped skills from the system prompt's `<available_skills>` listing. Set `false` to list every nested skill from session start. |
| `toast` | `true` | Show a TUI notification naming the skills that just loaded. |
| `toastLimit` | `5` | How many names to list in the notification before an ellipsis. The title always carries the full count. |
| `toastDuration` | `6000` | How long the notification stays up, in milliseconds. |
| `onConflict` | `"skip"` | What to do when a nested skill's name is already registered outside the nested tree. See below. |
| `followSymlinks` | `true` | Follow symlinked directories while walking. |
| `watchBash` | `false` | Also mine `bash` commands for paths. Noisy; off by default. |
| `root` | `"worktree"` | Walk from the git worktree root, or from the session `directory`. |
| `debug` | `false` | Log discovery and activation decisions to stderr. |

Default ignores: `.git`, `.hg`, `.jj`, `.svn`, `node_modules`, `bower_components`, `vendor`, `dist`,
`build`, `out`, `target`, `obj`, `.next`, `.nuxt`, `.svelte-kit`, `.turbo`, `.parcel-cache`,
`.cache`, `coverage`, `.venv`, `venv`, `__pycache__`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`,
`.tox`, `.gradle`, `.terraform`, `.idea`, `.vscode-test`.

## Priority

Two skills can claim the same `name`. The winner is picked by **specificity**:

1. **Deeper wins.** `packages/api/.claude/skills/lint` beats `packages/.claude/skills/lint`.
2. **Then container rank**, for a tie at the same directory: `.opencode` > `.agents` > `.claude`.
3. Then path order, for stability.

This matters because opencode loads every discovered `SKILL.md` with unbounded concurrency and
last-write-wins on the name — duplicates are resolved by a race. So the plugin resolves collisions
itself and registers **one directory per winning skill**, never a whole skills root. Discovery is
deterministic on every start.

The one case the plugin cannot win is a collision with a skill opencode found natively (a root
`.opencode/skills` entry, a global `~/.claude/skills` entry, or the built-in `customize-opencode`),
because those are registered by opencode itself. Default `onConflict: "skip"` leaves the native skill
alone and logs the nested one it dropped. `onConflict: "override"` registers the nested skill anyway
and lets opencode's race decide — nondeterministic, and only worth it if you know the names don't
actually clash.

## What gets injected

`mode: "announce"`, appended to the output of the tool that touched the file:

```
<nested-skills scope="packages/api">
The file you just touched is covered by 1 path-scoped skill(s).
Read the relevant one with skill({ name: "<name>" }) before continuing work here.

- db-migrations: How to write and apply migrations in this service.
</nested-skills>
```

`mode: "inject"` skips the round trip and pastes the full `SKILL.md` body in a `<skill_content>`
block instead, matching the shape of the native `skill` tool's own output. Costs tokens on every
first touch of a directory; use it when the skills are short and always relevant.

## Requirements

opencode with the `skills.paths` config key and the `tool.definition` plugin hook — 1.18.x or newer.
The plugin degrades to registering nothing if no nested skills exist.

## Development

```bash
npm install
npm test        # builds, then runs the suite against a generated fixture tree
```

To try it in a real project before publishing, point `plugin` at the checkout — opencode accepts a
local path or `file://` URL as a plugin spec:

```jsonc
{ "plugin": [["/abs/path/to/opencode-nested-skills", { "debug": true }]] }
```

`debug: true` prints discovery and activation decisions to stderr. opencode swallows plugin stderr in
most contexts, so set `NESTED_SKILLS_LOG=/tmp/nested-skills.log` to get the same lines appended to a
file instead — that is the only way to see what the gate did during a real session:

```
hid 130 unvisited path-scoped skills across 1 system prompt part(s); 22 skill(s) remain listed
activated adding-a-publish-channel, auditing-business-events, … via read
hid 87 unvisited path-scoped skills across 1 system prompt part(s); 65 skill(s) remain listed
```

`opencode debug skill` lists the registry as JSON without starting a session, which is the fastest
way to check what got registered. Note that it shows everything registered — the gate governs the
system prompt, not the registry, so `/skills` and this command both list all of them by design.

## License

MIT
