# opencode-handoff

Persistent working memory for [OpenCode](https://opencode.ai): one automatically maintained handoff per git branch, plus shared project knowledge available on every branch.

The extension records recent turns, periodically folds them into concise Markdown, and injects the result into future sessions. Nothing is written into your repository.

## Install

Add the plugin to `~/.config/opencode/opencode.json` (or a project's `opencode.json`) and restart OpenCode:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["git@github.com:FleetingEcho/opencode-handoff.git#v1.1.0"]
}
```

## How memory is organized

opencode-handoff keeps three kinds of memory with different lifetimes:

| Memory | Scope | Purpose |
|---|---|---|
| `handoff.md` | Current branch | Goal, progress, decisions, active files, and next steps |
| Project knowledge | Every branch | Reviewed architecture, conventions, workflows, reusable decisions, and pitfalls |
| Pinned rules | Every branch | Hard rules and explicit preferences that automated summaries must never rewrite |

Each git branch has an independent `handoff.md`. Switching branches switches handoffs automatically. Project knowledge and pins live in `project.md` and are injected on every branch. Outside a git repository, the directory uses one `default` branch.

## Everyday use

Normally, just work. A background refresh runs roughly every three turns, sooner when a large amount of material accumulates, and before context compaction. Buffered events are durable, so quitting does not need to wait for a model call.

OpenCode exposes plugin control through the agent-facing `handoff` tool rather than plugin slash commands. Ask naturally—for example, “show handoff status”, “refresh the handoff now”, or “start a fresh handoff”—and the agent invokes the corresponding action.

### Pausing

Ask the agent to “pause the handoff” when you want a stretch of conversation left out. Nothing is collected and no refresh runs while paused, so the paused stretch leaves nothing behind — there is no gap content to filter out afterwards. Work buffered *before* the pause is kept and folds in once you say “resume the handoff”.

Injection keeps working while paused, so the agent still reads the existing `handoff.md` and `project.md`, and pins, `project_add`, and an explicit `flush` still work — pausing suppresses automatic recording, not deliberate actions.

A pause lasts only for the current opencode run. Restarting always resumes recording, so a pause can never silently mute a project forever.

On the next session, start with “keep going” or “what’s left?”; the previous branch handoff is already in context.

## Shared project knowledge

Ask the agent to “refresh project knowledge”, then “review project suggestions”. The tool uses `project_refresh` and `project`; `project` defaults to review, matching pi-handoff's `/pi-handoff project` behavior.

Refresh only calls the model after a branch handoff changes. Changed branches are scanned in bounded batches; each successful batch is checkpointed. Deleted/archived branch stores are skipped by default; request `all=true` when you deliberately want to mine them too. Review shows the exact change, evidence, source branches, and stable candidate ID before anything is applied.

The actions `project_add` and `project_forget` manage knowledge directly. `project_accept` and `project_reject` accept a displayed number, ID prefix, or unique statement substring.

Direct additions default to `Conventions`. Available sections are:

- `Project Overview`
- `Architecture`
- `Conventions`
- `Workflows`
- `Decisions and Rationale`
- `Known Pitfalls`

The agent-facing `handoff` tool can queue ordinary project knowledge with `project_propose`. Proposals still require user review.

## Pinned rules

Pins are the protected tier. Use them for hard constraints that should never be rephrased or removed automatically:

Ask the agent to pin or unpin a rule; it uses the `pin` and `unpin` actions.

Do not pin current task progress, branch-specific state, duplicated documentation, or secrets. Those either belong in the branch handoff or should not be stored.

## Tool actions

You normally do not need to write tool-call JSON. Tell the agent what you want in plain language:

| Action | Purpose | What to say |
|---|---|---|
| `status` | Inspect the current store, branch, queue, and suggestions | “Show handoff status.” |
| `flush` | Refresh the current branch handoff immediately | “Refresh the current branch handoff now.” |
| `clear` | Start a fresh branch handoff while keeping project knowledge and pins | “Start a fresh handoff.” |
| `pause`, `resume` | Stop and restart recording for this opencode run; injection stays active | “Pause the handoff.” / “Resume the handoff.” |
| `project` | Review pending suggestions; performs no automatic acceptance | “Review pending project suggestions.” |
| `project_refresh` | Extract changed active branches; optional `all=true` includes archived stores | “Refresh project knowledge from changed branches.” |
| `project_propose` | Queue durable knowledge discovered during current work; accepts `note` and optional `section` | “Propose ‘Events are durable pending-work records’ under Architecture.” |
| `project_accept`, `project_reject` | Resolve a suggestion by number, ID prefix, or unique text | “Accept project suggestion 2.” / “Reject project suggestion a13f.” |
| `project_add` | Directly add shared knowledge; accepts `note` and optional `section` | “Add ‘Events are the durable source of pending work’ under Architecture.” |
| `project_forget` | Remove shared knowledge by a unique substring | “Forget the project knowledge containing ‘legacy build command’.” |
| `pin` | Add a protected project-wide rule | “Pin ‘Deploys must go through ops/deploy.sh’.” |
| `unpin` | Remove a protected rule by a unique substring | “Unpin the rule containing ‘ops/deploy.sh’.” |

`project` is review-only: it lists pending suggestions but never accepts them automatically. After reviewing the displayed evidence and source branches, explicitly use `project_accept` or `project_reject`. Ambiguous selectors and ambiguous `project_forget`/`unpin` matches make no changes.

## Storage

All files live outside the project:

```text
~/.agent/agent-handoff/<project>/
├── project.md                 shared knowledge and pinned rules
├── project-candidates.json    suggestion and review state
├── project-meta.json          per-branch project-scan revisions
└── <branch>/
    ├── handoff.md             current branch handoff
    ├── events.jsonl           durable events and document snapshots
    └── meta.json              cursors and session metadata
```

The project key uses the git repository root, so launching OpenCode from different subdirectories reaches the same store. The root is found by walking up from the working directory to the nearest `.git` (a directory, or the file used by worktrees and submodules); `git rev-parse` is only a fallback, so detection still works when git is absent or refuses the directory as dubiously owned. Outside a repository the working directory itself is the key. Symlinked paths are resolved, sanitized-name collisions are disambiguated, and older layouts migrate automatically. Set `OPENCODE_HANDOFF_DIR` to use another storage root.

If older stores keyed to a subdirectory of the current repo are still on disk — from launches predating repo-root keying, or from a period when git detection was failing — `handoff status` lists them. Nothing is moved or deleted automatically: copy anything worth keeping across with `project_add`, then remove those directories yourself.

The branch document contains seven fixed sections: Current Goal, Progress, Decisions, Constraints, Open Questions, Active Files, and Next Steps. It is capped at roughly 16,000 characters while preserving all section headings.

Shared project knowledge is capped at roughly 16,000 characters because it is injected on every request. When it approaches the limit, replace or remove stale facts before adding more; protected pins use a separate section.

### Storage limits

| File/content | Limit | Cleanup behavior |
|---|---:|---|
| `handoff.md` | 24k characters / 96 KB | Oversized model output is compacted by section; oversized writes are rejected |
| Project knowledge | 16k characters | Existing oversized sections are compacted; new facts are rejected at the limit |
| Pinned rules | 200 rules, 500 characters each, 16k total | New pins are rejected; legacy duplicate/overflow pins are removed with a marker |
| `project.md` | 128 KB | Enforced on every atomic write |
| `events.jsonl` | 1,000 lines / 4 MB | Trims toward 900 lines / 2 MB; pending overflow leaves a summarizer-visible marker |
| `project-candidates.json` | 200 pending + 500 reviewed, 240 characters per field, 1 MB | Oldest excess candidates are removed automatically |
| `project-meta.json` | 2,000 branch hashes / 2 MB | Oldest scan hashes are removed automatically |
| branch `meta.json` | 32 KB | Unknown fields are discarded and known values are normalized on startup |

A collected turn contributes at most about 12k excerpt characters and 200 changed-file paths.

## Reliability and privacy

- Events are appended synchronously before background summarization.
- Document and metadata replacements use unique temporary files plus atomic rename.
- Short-lived filesystem locks coordinate event, metadata, project knowledge, and proposal writes across OpenCode processes; model calls never hold a lock.
- A background refresh refuses to overwrite a handoff edited while its model call was running.
- Refresh cursors only advance past events actually sent to the model.
- Project extraction checkpoints only branch batches actually processed by the model.
- Events arriving during a refresh remain pending for the next batch.
- `events.jsonl` is bounded to 1,000 lines and 4 MB. Trimming prefers folded history; if pending history alone exceeds the hard limit, the newest records are retained with an explicit overflow marker for the summarizer.
- Secret denylist redaction runs before excerpts touch disk, before model calls, and on model output. It is a safeguard, not a guarantee; never intentionally place secrets in handoffs or pins.
- Malformed JSONL tail records are ignored rather than breaking startup.

Two sessions on different branches are isolated. Sessions on the same branch coordinate short disk transactions with filesystem locks; competing summaries use revision checks and retry rather than overwriting a newer document. opencode-handoff still warns when it detects another live owner because simultaneous agents may produce noisier combined task history.

## Troubleshooting

**The handoff is not updating.** Ask the agent to show handoff status. A small pending buffer is normal. If refreshes fail, run with `OPENCODE_HANDOFF_DEBUG=1`; authentication is inherited from the active OpenCode model.

**Quitting did not refresh.** This is intentional. In-flight work is aborted promptly, while buffered events remain in `events.jsonl` and are folded during a later session.

**The content is stale or wrong.** Edit the Markdown directly, ask for a fresh handoff, or use `project_forget` for incorrect shared knowledge. Pin only corrections that must remain permanent.

**I need an older handoff.** Previous documents are stored as `snapshot` records in `events.jsonl`:

```bash
grep '"snapshot"' /path/to/events.jsonl | tail -1 | jq -r .doc
```

## Development

```bash
npm install
npm run typecheck
```

OpenCode runs the TypeScript source directly through Bun. `@opencode-ai/plugin` is the sole runtime dependency; the SDK types, Node types, and TypeScript compiler are development-only.

Main files:

| File | Role |
|---|---|
| `index.ts` | Lifecycle, refresh queue, hooks, and agent tool |
| `store.ts` | Paths, migrations, project knowledge, events, and atomic persistence |
| `collector.ts` | Deterministic redacted turn collection |
| `summarizer.ts` | Branch refresh and project-knowledge extraction |
| `injector.ts` | Branch and project context injection |
| `redact.ts` | Secret denylist |

The package also includes the `write-handoff` skill for manually writing a handoff to a user-selected path.
