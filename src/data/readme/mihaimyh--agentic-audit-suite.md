# agentic-audit-suite

Nine portable [Agent Skills](https://agentskills.io) for serious engineering work: a stateful, evidence-gated codebase audit, a zero-regression TDD remediation loop, documentation drift recovery, and behavioral product design.

One source of truth. Works in **Codex, Claude Code, Cursor, GitHub Copilot, Google Antigravity and OpenCode** — no forks, no per-tool prompt rewrites.

```bash
npx github:mihaimyh/agentic-audit-suite install   # straight from this repository
npx @mihaimyh/agentic-audit-suite install         # npm registry, same code
```

The installer guesses nothing and writes only into the documented skill directories of each host. Use `--dry-run` first if you prefer.

## Why this exists

Most "review my codebase" prompts produce a wall of opinion. This suite produces **state on disk and reproductions that fail**:

- every claimed bug needs a runnable reproduction that fails against current HEAD, or it is discarded;
- every claimed bottleneck needs a multi-scale benchmark (`N=100/1k/10k`) or it is not reported;
- every fix needs a test that fails before the patch and a green domain suite after it;
- the audit survives context loss, because the queue lives in `.tmp/audit/audit_state.json`, not in the chat.

## Install

| Host | Command | Skills land in |
| :--- | :--- | :--- |
| All detected hosts | `npx @mihaimyh/agentic-audit-suite install` | see below |
| OpenAI Codex | `npx @mihaimyh/agentic-audit-suite install --targets codex` | `~/.agents/skills/` |
| Cursor | `... --targets cursor` | `~/.cursor/skills/` |
| GitHub Copilot (VS Code) | `... --targets copilot` | `~/.copilot/skills/` |
| Claude Code | `... --targets claude` | `~/.claude/skills/` |
| Google Antigravity | `... --targets antigravity` | `~/.gemini/config/skills/` |
| OpenCode | `... --targets opencode` | `~/.config/opencode/commands/` |

Useful flags:

```bash
--project            # install into the current repo instead of your home directory
--link               # symlink skill folders (junction on Windows), so edits are live
--force              # overwrite existing skill folders
--skills audit-init,fix-next
--dry-run
uninstall            # subcommand: removes only what this tool installed (tracked in a manifest)
```

Project installs go to `.agents/skills/` (Codex, Cursor, Copilot, Antigravity), `.claude/skills/` (Claude Code), `.github/skills/` (Copilot) and `.opencode/commands/` (OpenCode) — commit them if you want the whole team to share the workflow.

### Claude Code plugin marketplace

```text
/plugin marketplace add mihaimyh/agentic-audit-suite
/plugin install agentic-audit-suite@agentic-audit-suite
```

Commands are namespaced by the plugin: `/agentic-audit-suite:audit-init`.

### OpenCode plugin

The same package is a valid OpenCode server plugin that registers each skill as a native slash command, so arguments are passed through the command API instead of being appended as text:

```jsonc
// ~/.config/opencode/opencode.json
{
  "plugins": ["@mihaimyh/agentic-audit-suite"]
}
```

Pick **either** the plugin **or** the generated command files (`--targets opencode`) for a given machine — both register the same names.

## The pipeline

```
audit-init ──► audit-next × N ──► audit-final ──► fix-init ──► fix-next × N
     │              │                  │              │             │
  partition      one module        synthesis      queue by       one defect,
  + test_cmd     verified only     + PR plan      severity       red → green → commit
```

## Runbook

Run these in order. Every step is safe to interrupt: state lives on disk, so the next command resumes from `.tmp/`.

### 1. Audit

```text
/audit-init          # once: review the test-command table, confirm, state is written
/audit-next          # repeat until it reports SYNTHESIS_READY
/audit-status        # any time: where am I, what is next
/audit-final         # once, when every module is complete
```

`audit-next` **is** the loop: one module per turn. It splits a module that is too large instead of returning a partial report, and it refuses to count a finding it cannot reproduce.

### 2. Remediate

```text
/fix-init            # once: builds the severity-ordered queue from the findings
/fix-next            # repeat, one defect per turn
/audit-status        # check what is left and what is blocked
```

`fix-next` commits locally and stops there. Repeat until it reports `ALL_FIXES_COMPLETED`.

### 3. Independent of the pipeline

```text
/docs-audit          # documentation drift; report-only unless the arguments contain "apply"
/ux-plan <feature>   # product and UX review; asks three questions when the feature is omitted
```

Codex users invoke these as `$audit-init`, `$audit-next`, and so on. Every other host uses `/`.

### Stop conditions

| State you see | What to do |
| :--- | :--- |
| `SYNTHESIS_READY` | run `audit-final` |
| `ALL_FIXES_COMPLETED` | review the local commits, then push or open the PRs yourself |
| a fix marked `BLOCKED` | reproduce it by hand, or rebuild the queue with `audit-reset confirm fix` |
| inconsistent state file | `audit-status` names the inconsistency; `audit-reset confirm` restarts cleanly |

Reference for every skill:

| Skill | Purpose | Writes |
| :--- | :--- | :--- |
| `audit-init` | Partition the repo into cohesive modules, confirm test commands | `.tmp/audit/audit_state.json` |
| `audit-next` | Audit one module: reproductions, benchmarks, findings | `.tmp/audit/findings/<module>.md` |
| `audit-status` | Read-only progress, queue state, inconsistent state detection | nothing |
| `audit-final` | Cross-boundary review, master bug table, roadmap, PR plan | `FINAL_AUDIT_REPORT.md` |
| `audit-reset` | Confirmation-gated cleanup of `.tmp/` scratch state | deletes `.tmp/*` only |
| `docs-audit` | Documentation drift vs real code, with proposed diffs | `.tmp/docs-audit/drift-report.md` |
| `fix-init` | Ordered remediation queue, Critical first | `.tmp/fix/fix_state.json` |
| `fix-next` | One defect: failing test, minimal patch, suite gate, atomic local commit | source + test |
| `ux-plan` | Behavioral UX, CRO and growth design grounded in the codebase | `.tmp/ux/<slug>.md` |

Two skills are independent of the pipeline: `docs-audit` and `ux-plan`.

## Safety model

- **No `git push`, ever.** `fix-next` commits locally with an explicit Conventional Commit and stops there.
- **No `git add .`.** Only the target file and its regression test are staged.
- **No silent overwrites.** Every command guards on existing state and tells you how to resume or reset.
- **No destructive cleanup without `confirm`.** `audit-reset` is a dry run by default.
- **No host lock-in.** Skills avoid host-specific placeholders; argument handling is plain prose.
- **Uninstallable.** Each install writes a manifest, so `--uninstall` removes only its own entries.

## Repository layout

```
skills/<name>/SKILL.md     # the product: nine portable skills
plugin/index.ts            # OpenCode server plugin (native slash commands)
src/                       # zero-dependency installer
bin/cli.mjs                # npx entry point
scripts/validate.mjs       # repo gate: frontmatter, naming, portability rules
docs/                      # pipeline, portability matrix, writing skills
.claude-plugin/            # Claude Code marketplace manifests
```

## Writing a new skill

```bash
mkdir skills/my-skill
$EDITOR skills/my-skill/SKILL.md
npm test                    # validates frontmatter, naming and portability rules
npx @mihaimyh/agentic-audit-suite install --skills my-skill --dry-run
```

Rules enforced by `npm test`:

1. `name` equals the folder name: lowercase, hyphens, max 64 characters.
2. `description` is required, under 1,024 characters, and states **when** to use the skill.
3. The body is imperative, self-contained, and at least 300 characters.
4. No `$ARGUMENTS`, no host-only frontmatter, no absolute paths, no CRLF.

See [docs/writing-skills.md](docs/writing-skills.md) for the full authoring contract.

## Compatibility matrix

| Feature | Codex | Claude Code | Cursor | Copilot | Antigravity | OpenCode |
| :--- | :-- | :-- | :-- | :-- | :-- | :-- |
| Skill format | `SKILL.md` | `SKILL.md` | `SKILL.md` | `SKILL.md` | `SKILL.md` | `SKILL.md` |
| Slash invocation | `$name` / skills menu | `/name` | `/name` | `/name` | `/name` | `/name` |
| Auto-invocation by description | yes | yes | yes | yes | yes | yes |
| Native command args | yes | yes | yes | appended | mentioned by name | yes |

Details and caveats: [docs/portability.md](docs/portability.md).

## Contributing

Issues and PRs are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md); `npm test` must pass, and every new skill needs a real use case, not a hypothetical one.

## License

MIT
