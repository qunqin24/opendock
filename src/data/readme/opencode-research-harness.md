# opencode-research-harness

An opencode plugin for multi-topic research workspaces (a repo with `topics/<slug>/TOPIC.md`, such as `jflowers/research`). It enforces what used to be prompt conventions:

- **Topic scope per session.** `/topic` sets the session's topic. Dewey searches get `source_id: "disk-<slug>"`, learnings get `tag: "<slug>"`, session-notes get `topic:<slug>`, and writes stay in `topics/<slug>/`. Whatever the harness fills in is listed at the top of that tool's result ("Filled in by the harness …") and published per call for the supervisor (`injectedArgs` in the shared state).
- **Epistemic ledger.** Claims with topic-defined layers, calibrated confidence and evidence, stored in `topics/<slug>/claims.jsonl` (committed) with a SQLite working copy in `.research/ledger.sqlite`.
- **Synthesis gate.** A synthesis can't be written while hypotheses are open, citations are wrong, or required dimensions are missing.
- **Dewey export.** Verified claims become Dewey learnings with `validity` / `as_of` / `evidence`, plus a generated `CLAIMS.md`.
- **Ratchet.** An exploratory-call budget per session (default 8). At budget it reminds the agent to distill (`warn`, the default) or rejects further exploration (`block`, opt-in per topic). A claim whose evidence cites something explored since the last reset clears the budget; any other claim gives back half.

The design is in [SPEC.md](SPEC.md). Phase 1 is topic, ledger, gate and export; phase 2 is the ratchet.

## Install

In the research workspace's `opencode.json` (or the global
`~/.config/opencode/opencode.jsonc`, since the plugin does nothing outside a
research workspace):

```jsonc
{
  "plugin": ["opencode-research-harness"]
}
```

In a research workspace the plugin also loads its `research-ledger` skill;
there is nothing to copy into `.opencode/skills/`. To run a checkout instead
of the release, `bun install` in it and list its absolute path in place of the
package name.

Load it **once**: from the global config or the project config, not both. A second copy for the same directory disables itself and logs a warning. Do not load `opencode-agent-supervisor` from the project config either; it is already global.

The plugin does nothing in a directory without `topics/`.

## Configuration

Optional `.opencode/research-harness.json`, or plugin options (`["<path>", { … }]`). Defaults are in [src/config.ts](src/config.ts). Per-topic overrides go in a `## Harness` section of `TOPIC.md`:

````markdown
## Harness

```json
{ "minCitations": 5, "synthesisGlobs": ["findings/*synthesis*.md"], "ratchetMode": "block", "ratchetBudget": 10 }
```
````

### Ratchet

- **Exploratory calls:** `read`, `grep`, `glob`, `list`, `webfetch`, `websearch`, `codesearch`, every `tavily_*` tool, the Dewey read tools, and `bash` commands matching `ratchet.bashPattern` (`curl`, `gh`, `grep`, `cat`, `git log`, …). Only calls that actually ran are counted, and each session (subagents included) has its own count.
- **Modes:** `warn` (default) appends a reminder to the tool output from the budget-th call on; `block` rejects exploratory calls at budget; `off` disables it. Set it globally under `ratchet` or per topic with `ratchetMode` / `ratchetBudget`.
- **What counts as "explored":** file paths, folders searched, URLs (also matched as `owner/repo:path` for GitHub pages), and URLs in matching `bash` commands. Evidence matches when it is the same locator or inside it.
- Warnings, blocks and resets are logged in `ratchet_events`; `ledger_status` shows the topic's totals. Switch a topic to `block` once the warnings show the budget is regularly overrun (D7).

### Injected arguments (cross-plugin contract)

Topic scoping edits tool arguments in `tool.execute.before`, and opencode stores the edited input. The model and any auditor then see those values as if the model had written them. So the harness publishes, per call, what it filled in. The [supervisor](https://github.com/jflowers/opencode-supervisor) reads this to tell its auditor that those args were not the agent's.

```ts
type InjectedArgsRecord = { sessionID: string; tool: string; args: Record<string, unknown> }
type HarnessSharedState = { injectedArgs?: Map<string /* callID */, InjectedArgsRecord> }

const state = (globalThis as Record<symbol, HarnessSharedState | undefined>)[
  Symbol.for("opencode-research-harness.shared-state")
]
const injected = state?.injectedArgs?.get(callID)?.args
```

- **What `args` holds.** Only the injected part. A key the model left out (`source_id`, `tag`, `path`) carries the whole value the harness set. For an array (`tags`) it lists only the elements the harness appended (`["topic:<slug>"]`). For a scalar the harness changed (the case of `tag`) it carries the new value.
- **When.** The record is written in `tool.execute.before`, after scoping and before the tool runs. A call with nothing injected, or one the harness rejected, has no record.
- **Bounds.** At most 512 callIDs; the oldest are evicted first. Treat the map as read-only, and a missing record as "nothing injected or no harness loaded". Other fields on the state object are internal.

## Tools

| Tool | Does |
|---|---|
| `research_topic` | show / set / list / new / all (cross-topic) |
| `ledger_upsert_claim` | create or update a claim |
| `ledger_challenge_claim` | append counter-evidence, downgrade to hypothesis or refuted, and lower the confidence |
| `ledger_status` | counts, open hypotheses, claim table with `[claim:<id>]` tags |
| `ledger_export` | verified claims → Dewey learnings; regenerate `CLAIMS.md` |

## Releasing

Releases go through [`jflowers/ship`](https://github.com/jflowers/ship)'s shared
npm workflow, the same one the other opencode plugins use, so the pipeline
is fixed in one place. To release:

1. Make sure CI passed on `main`. There is no version bump: `package.json`
   holds `0.0.0-development`, and the release sets the version from the tag.
2. Dispatch the Publish workflow with the tag (don't push tags yourself):

   ```bash
   gh workflow run publish.yml -f tag=vX.Y.Z
   ```

ship's preflight checks the tag (semver, new, newer than the last), that CI
passed on `main`, and that there are unreleased commits, then creates the
tag. The package is published to npm with provenance through trusted
publishing (no token) and the GitHub release is created with generated
notes. A version already on npm is skipped, so a re-run is safe.

npm trusts `publish.yml` by name: renaming it breaks publishing until the
trusted publisher on npmjs.com is updated.

## Development

```bash
bun test
bun run typecheck
```
