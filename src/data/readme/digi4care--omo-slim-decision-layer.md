# omo-slim-decision-layer

An [OpenCode](https://opencode.ai) plugin that adds a **decision layer** to
AI-assisted development: a typed, git-native decision register that records the
*why* of a project — requirements, constraints, assumptions and decisions —
alongside work items tracked by
[beads_rust (`br`)](https://github.com/Dicklesworthstone/beads_rust).

Built as a companion plugin for
[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim).

## Why we built it

An interview can produce a useful specification, and OMO-slim can turn that
specification into code. But the reasons behind the work can disappear between
sessions: which requirement matters, which assumption is still unverified, who
accepted a trade-off, and which evidence supports the finished change. A task
tracker alone answers *what to do*, not *why this approach was chosen*.

Decision-layer gives those reasons a small, reviewable home in Git. It may help
an agent pick up a project without silently re-deciding settled questions,
keep an interview's explicit proposals available for owner review, and connect
larger work to its source and verification. It does **not** infer decisions from
ordinary chat, prove that an agent followed its guidance, replace the interview
specification, or guarantee that every final answer contains a handoff.

| Question | Source of truth |
|---|---|
| Why, including requirements and accepted decisions? | `.decisions/register.yaml` |
| What is in progress, blocked, or done; where is its evidence? | The project's `.beads/` issues (`br`) |
| What was actually changed? | Git and the code/tests |
| What was agreed during an interview? | The completed interview spec |

## What it does

- **Typed decision records** — `REQ` (requirement), `CONSTRAINT`
  (non-negotiable), `ASSUMPTION` (unverified, with `needed_to_close`) and `DEC`
  (decision with rejected alternatives and consequences).
- **Closed assumptions** — an `ASSUMPTION` has a question in `needed_to_close`
  but no field for the answer. `decision-close` supplies it: `verified` or
  `refuted`, plus an optional reason, moving the record to `accepted`.
- **Single source of truth** — one YAML register at `.decisions/register.yaml`.
  All writes go through the plugin's tools; the generated markdown view is
  disposable and never authoritative.
- **Closed vocabularies** — status is `proposed | accepted | rejected |
  superseded`. Supersede instead of changing a decision in place: the prior
  record remains in the register.
- **Owner ratification** — agents draft records; only the owner ratifies.
  This is a convention enforced by discipline, not by a technical gate.
- **Interview integration (opt-in)** — a completed interview can be promoted
  only from explicit typed `decision-record-proposals` YAML inside `## Current
  spec`. The post-completion bridge requires a compatible interview host in the
  same JavaScript realm; do not assume it works in every host installation.
  Missing registers and other unresolved conflicts return `needs-review`; the
  plugin never initializes a register or ratifies/rejects proposals.
- **Skill availability** — on OpenCode v2 the plugin registers its own
  `skills/decision-layer/SKILL.md` at startup via `ctx.skill.transform`, so the
  discipline is loaded automatically without a separate install step. OpenCode
  v1 has no `skill.transform`; installing the skill to
  `~/.config/opencode/skills/decision-layer/` is not yet implemented.
- **Availability** — the reminder only fires when the configured register
  actually exists on disk. Enable the plugin *and* initialize the register for
  that project; creating a register alone does not enable the reminder.

## Compatibility

One package, two registration paths, sharing the same register and tool logic:

- **v1** (`@opencode-ai/plugin` 1.x): the default export provides a v1 `server`
  that registers the eleven tools, the `command.execute.before` hook, and the
  prompt reminder via `experimental.chat.system.transform`.
- **v2** (`@opencode/plugin` 2.x): the same default export also provides a v2
  `setup` that registers the tools via `ctx.tool.transform`, injects the
  prompt via `ctx.session.hook('prompt')`, and the reminder via
  `ctx.session.hook('context')`.

## Working with OMO-slim

This is an **opt-in** workflow, not a required sequence for every change.
For a small, clear fix, work directly; do not create a decision record just
because an agent was involved. For substantial or uncertain work:

1. **Set up the project deliberately.** Install the plugin, set
   `"decision-layer": { "enabled": true }` in your OpenCode configuration,
   and initialize this project's register with `decision-init` after the owner
   agrees. Check existing records with `decision-list` before changing a design.
   If you also want the limited delegation guard, opt in separately with
   `requireBeadsForDelegation` in the *project* config (see below). Ask before
   `br init` in any repository that does not already have `.beads/`.
2. **Clarify before building.** For a large or ambiguous feature, start an
   OMO-slim `/interview`. Review the evolving specification. Only explicit,
   typed candidates under its `## Current spec` section can become proposed
   register records; ordinary discussion cannot. Confirm interview completion;
   inspect the promotion result. If it says `needs-review`, resolve the stated
   issue and retry with `decision-promote-interview` using the completed spec
   path. A completed spec is not an instruction to run `/implement`.
3. **Make the determining choice.** Inspect proposed records and links with
   `decision-list` and `decision-query`. The owner explicitly requests
   `decision-ratify` or `decision-reject`; promotion never accepts records.
   If a determining architecture choice is not accepted, pause only the
   implementation that depends on it. Independent work may proceed. This
   pause is agent guidance, not a universal host-level gate.
4. **Plan and implement separately.** Use OMO-slim's direct delegation for
   bounded work, or `/deepwork` for a large, risky, multi-phase change. Start
   `/implement` on a completed interview spec **only when explicitly chosen**;
   it never starts automatically. For multi-round or delegated work, create a
   bead with the spec/source path and current record IDs (including their
   statuses). Work status belongs to beads, not the decision register.
5. **Verify and hand off.** After tests, add code/test paths, the test command,
   outcome, and unknowns to the bead. Add a commit hash only if a commit actually
   exists; do not present reconstructed historical evidence as a fresh test.
   Follow a record ID through closed beads with
   `br search '<record-id>' --all --json`, then inspect its comments and Git.
   If the broader goal is still open, offer concrete next actions, costs, and a
   recommendation instead of treating a scoped result as the whole project.

Do not initialize beads, rewrite another register, or ratify historical
decisions as a side effect of installing this plugin.

## Agent tools

The eleven tools carry no embedded discipline of their own. The discipline is
carried by the skill and by a short reminder in the system prompt — the
reminder is fixed text, never register contents, because injecting changing bytes
on every request would invalidate the provider prompt cache. The register is
fetched on demand through `decision-list`.
For enabled projects with a register, the reminder also asks the agent to
recommend concrete next actions when a scoped result leaves the larger task
unfinished. This is prompt guidance, not enforced host behavior; it does not
start `/implement`, change records, or apply where the reminder is disabled.
The same guidance asks agents to pause only code dependent on an unaccepted
determining architecture decision, while independent work may continue. It
cannot detect such decisions or enforce that pause for every execution path.

| Tool | Purpose |
|---|---|
| `decision-init` | Create the register (idempotent, never overwrites) |
| `decision-add` | Create a record (status `proposed`) |
| `decision-ratify` | `proposed` → `accepted` — owner act, never self-invoked |
| `decision-reject` | `proposed` → `rejected` |
| `decision-supersede` | Replace a record, preserving history |
| `decision-close` | Close an `ASSUMPTION` with `verified` or `refuted` |
| `decision-list` | List records, filter by status/type |
| `decision-query` | Orphans, or "what links to this record" |
| `decision-validate` | Validate the register against the schema |
| `decision-view` | Regenerate the markdown view |
| `decision-promote-interview` | Retry promotion from a completed spec; only explicit typed proposals in `## Current spec` are considered |

Proposal blocks use a fenced `decision-record-proposals` YAML array with stable
`key`, `type`, `title`, and `context`; type-specific fields follow the register
schema. A completed interview that returns `needs-review` can be retried with
`decision-promote-interview` after review. `/implement` also retries promotion,
but it **starts implementation**, so do not use it only to repair registration.
Normal-chat reminders are read-only and do not instruct agents to write records.

These links are an agent-maintained convention, not automatic link creation.
Do not supersede an accepted decision only to add an administrative bead link.
Older records may not link directly to their beads: search with `--all` and
check the evidence before treating the chain as verified.

## Configuration

By default the plugin is inert: it registers its eleven tools and does nothing
else. Enabling it turns on the always-available reminder, the interview
discipline, and — on v2 — the self-registered skill.

For example, put this complete, valid JSON configuration in
`<project>/opencode.json` (or use the same keys in `opencode.jsonc`):

```json
{
  "plugin": ["@digi4care/omo-slim-decision-layer@latest"],
  "decision-layer": {
    "enabled": true,
    "log": false,
    "registerPath": ".decisions/register.yaml",
    "requireBeadsForDelegation": true
  }
}
```

This lists **all four decision-layer options**. `log: false` avoids writing an
activation log; set it to `true` only when debugging and gitignore
`.decisions/activation.log`. The delegation gate is optional: with
`requireBeadsForDelegation: true`, create or initialize a project `.beads/`
directory **with the owner's permission** before using known delegation tools.
Set it to `false` if you do not want that guard. The `registerPath` value shown
is the default; change it only to a path within this project. Initialize the
register separately with `decision-init` after obtaining permission.

Configuration sources are merged **per key**, not per file:

| Source | Keys it contributes |
|---|---|
| `<project>/opencode.json(c)` | all four |
| `~/.config/opencode/opencode.jsonc` | `enabled`, `log` |
| `<project>/.opencode/decision-layer.json` (deprecated) | all four |

| Key | Meaning | Scope |
|---|---|---|
| `enabled` | turns the guidance on | **user** — safe to set globally |
| `log` | append one line per session to `.decisions/activation.log` | **user** — a debugging aid, off by default; gitignore the log |
| `registerPath` | where the register lives | **repository** — never read from the global file, or one path would apply to every repo on the machine |
| `requireBeadsForDelegation` | require a project `.beads/` directory before known delegation tool calls | **repository** — project-only, defaults to `false` |

Set both `enabled` and `requireBeadsForDelegation` in a project's config to opt
in; reload OpenCode after enabling. This checks known `task` (v1) and `subagent`
(v2) tool calls only. It is not a universal gate for OMO commands, multi-round
delegation, or architecture decisions.

Because precedence is per key, a project file that sets only `registerPath`
does not erase an `enabled` you set globally.

`OPENCODE_CONFIG` overrides the config root, either as a directory or as an
explicit file path.

A config file that exists but cannot be parsed is skipped with a `console.warn`
rather than failing silently — silent failure is the worst possible symptom of a
flag that defaults to off.

## Install

Add the plugin to your OpenCode config:

```jsonc
{
  "plugin": ["@digi4care/omo-slim-decision-layer@latest"]
}
```

OpenCode installs the plugin automatically from npm on the next start. To pin
a version, replace `@latest` with a published version. Installing is separate
from enabling it for a project.

**Local development.** For a local or private build, reference the build output
directly instead of a package name. The form depends on the host version:

- **OpenCode v1** (`@opencode-ai/plugin` 1.x) expects the bundle file:

  ```jsonc
  {
    "plugin": ["file:///absolute/path/to/node_modules/@digi4care/omo-slim-decision-layer/dist/index.js"]
  }
  ```

- **OpenCode v2** (`@opencode/plugin` 2.x) expects the directory:

  ```jsonc
  {
    "plugin": ["file:///absolute/path/to/node_modules/@digi4care/omo-slim-decision-layer/dist"]
  }
  ```

  Using the file path in v2 logs `configured plugin path must be a directory`
  and the plugin is not loaded.

`dist/index.js` is a single bundle; `@opencode-ai/plugin` and `zod` are
external dependencies supplied by the host or package installation.

**If you use `min-release-age` in your npm config:** OpenCode's own installer
enforces it too. A freshly published version cannot be installed by OpenCode
until it is older than that many days. `min-release-age-exclude` helps for
direct `npm install` calls but **not** for OpenCode's bundled installer
(observed on OpenCode 1.18.35). Until the window passes, use the `file://`
form above that matches your host version, or install into the OpenCode package
cache yourself (`bun add <pkg>` in `~/.cache/opencode/packages/<pkg>@latest`).

## Development

```bash
bun install
bun test          # bun test
bun run typecheck # tsc --noEmit
bun run check     # biome
bun run release   # build + pack tgz into release/
```

## Author

**Chris Engelhard** — [chrisengelhard.nl](https://chrisengelhard.nl) —
[chris@chrisengelhard.nl](mailto:chris@chrisengelhard.nl) —
[@digi4care](https://github.com/digi4care)

## License

MIT
