# opencode-dream-memory

Two pieces that give an OpenCode agent memory across sessions:

1. **A plugin** that injects memory files into the system prompt of every
   request, so the memory survives context compaction.
2. **A nightly job** that writes those files from past sessions.

`AGENTS.md` does not survive compaction. When a session gets long, OpenCode
summarizes the conversation and the instructions file goes with it. A plugin
hook runs on every agent-loop request, so the same block is re-sent each turn.

## Install

Requirements: `opencode` and `jq` on `PATH`, `curl` or `wget` to download, and
systemd for the timer.

```bash
curl -fsSL https://raw.githubusercontent.com/vasilvestre/opencode-dream-memory/main/install.sh | sh
```

One command installs both pieces. The plugin lands in
`~/.config/opencode/plugins`, the job in `$BIN_DIR` (default `~/.local/bin`)
next to its two agents and two systemd user units. Then restart the service to
load the plugin:

```bash
opencode service restart
```

Do **not** also list the plugin file path in `plugins` in `opencode.jsonc`:
OpenCode warns that a configured plugin path must be a directory, and a path
entry placed next to a discovered copy loads the plugin twice. Two instances
with the same id make OpenCode drop every plugin.

The installer leaves the nightly timer disabled on purpose. `dream` spends two
agent runs per invocation, and a one-line install cannot ask a question, so a
job that spends money must not start by itself. Enable it once a manual run
looks right, with `-s --` passing the flag to the script:

```bash
curl -fsSL https://raw.githubusercontent.com/vasilvestre/opencode-dream-memory/main/install.sh | sh -s -- --enable
```

The installer also creates `~/dreams` with `MEMORY.md`, an empty `projects/`
tree, `DREAMS.md`, an empty project list and a commented `dream-models` file. It
rewrites the unit's `ExecStart` to the chosen `BIN_DIR`, and it never overwrites
`MEMORY.md`, `DREAMS.md`, `dream-projects`, `dream-models` or a project memory
file. An existing symlink at
`~/.config/opencode/plugins/dream-memory.js` stays as it is, so a clone that
symlinks its own copy keeps working.

The deep pass leaves an audit trail: `dreaming/deep/<date>.md` lists each
promoted fact with the light-report line that supports it, so a fact stays
checkable after the corpus is gone.

If `opencode` is not on the systemd default `PATH`, write its directory to
`~/.config/dream.env`, which the unit reads when present:

```bash
echo 'PATH=/opt/opencode/bin:/usr/local/bin:/usr/bin:/bin' > ~/.config/dream.env
```

### From a clone instead

```bash
git clone https://github.com/vasilvestre/opencode-dream-memory
cd opencode-dream-memory
sh install.sh            # install, timer stays disabled
sh install.sh --enable   # install, then enable and start the 04:30 timer
```

The clone itself is what to symlink when you want the plugin to track edits:

```bash
ln -sf "$PWD/.opencode/plugins/dream-memory.js" ~/.config/opencode/plugins/dream-memory.js
```

## Memory layout

```
~/dreams/
  MEMORY.md                        shared facts, injected in every session
  projects/homelab/MEMORY.md       one project's facts, injected there only
  projects/<name>/MEMORY.md
  DREAMS.md                        the diary
  dreaming/{light,deep}/<date>.md  staging and audit reports
  .dreams/                         corpus and cursor, gitignored
```

Only `.dreams/` is gitignored. `MEMORY.md`, `projects/` and `dreaming/` stay
tracked, so a `$DREAM_HOME` git repo keeps a history of every promotion.

## What the plugin injects

Two files, read fresh on every request:

| File | Content | Cut at |
|---|---|---|
| `~/dreams/MEMORY.md` | facts true in every project | 1 000 characters |
| `~/dreams/projects/<name>/MEMORY.md` | facts about the current project | 3 000 characters |

`<name>` is the base name of the project directory: `~/homelab` reads
`projects/homelab/MEMORY.md`. The corpus uses the same tag, so a candidate
lands in the file of the project it came from. OpenCode creates one plugin
instance per project location, so the hook knows which project it serves; a
worktree uses the name of its main repository.

The block opens with a header saying the content comes from a nightly pass and
may be stale. Top-level titles are dropped. A part that is missing, empty or
unreadable contributes nothing: the hook runs on every request, so it fails
silent instead of breaking the session. Move the whole tree with `DREAM_HOME`.

Nothing is injected when both parts are empty.

## Privacy

The corpus is built from your real sessions. Each message contributes up to 400
characters, and the whole corpus is sent to whichever model `dream` runs.

- Inspect `~/dreams/.dreams/session-corpus/<date>.txt` before enabling the
  timer, and again after any session where you pasted something sensitive.
- The corpus skips the dream's own sessions, so the job cannot feed on its own
  output. It also redacts labelled secrets (`API_KEY=`, `token:`, `password=`,
  `secret=`, `bearer ...`). A bare key with no label still gets through, so this
  is a net, not a guarantee.
- `opencode session export --sanitize` is not an option: it replaces every
  message with `[redacted:text:...]`, which makes the corpus useless.
- For a private setup, set a local model in `~/.config/opencode/dream-models`
  (see below), or set `DREAM_HOME` on an encrypted volume and skip the timer.
- The dream job is instructed never to write secrets into a memory file, and the
  plugin injects those files into every request. A secret that reaches one is
  re-sent on every turn.
- Before the deep pass, `dream` commits `$DREAM_HOME` when it is a git repo, so
  a bad rewrite is one `git revert` away. The corpus is excluded from that
  commit even when your `.gitignore` forgets it.

### Which model runs each stage

`dream` reads `~/.config/opencode/dream-models`, one line per stage. The first
word is the stage, the rest is a list of models:

```
light opencode-go/deepseek-v4.1-flash
deep  opencode-go/deepseek-v4-pro
```

The script tries the models left to right and keeps the first that runs, so a
fallback after the first choice is fine. A stage with no line uses the script's
own defaults: `deepseek-v4.1-flash` for `light`, which reads the raw session
text, and `deepseek-v4-pro` for `deep`, which only sees staged candidates. Both
are paid models on purpose. A free model may train on its input, and a nightly
job that silently falls back to one sends your session text there.

Do not set the model in `dream/agents/*.md` for the job: `dream` passes `-m`,
and that flag beats the agent's pinned model. Override the file path with
`DREAM_MODELS`.

## Limits

- Each part is cut on its own: 1 000 characters for shared memory, 3 000 for a
  project file. Past that, the tail is dropped on a line boundary and the block
  says how much was dropped.
- `dream-deep` is told to keep the files under 900 and 2 800 characters, below
  the cuts. It deletes older entries to stay there, because a memory file that
  only grows eventually loses its own tail.
- One project's memory cannot squeeze out another's: the files share no budget.
- A run takes a lock on `$DREAM_HOME/.dreams/run.lock`. A second run exits at
  once instead of interleaving writes, so the 04:30 timer cannot collide with a
  manual run.
- The corpus goes back to each project's last successful run, and never further
  than 24 hours. After missed nights, run `DREAM_SINCE_HOURS=96 dream` to widen
  that window, for example to 96 hours.
- The files are read on each request, never cached, so a nightly rewrite shows
  up in the next turn at the cost of two small reads.

## Commands

| Command | What it does |
|---|---|
| `dream` | builds the corpus, then the light and deep passes |
| `dream corpus` | only the corpus, no model, no cost |
| `dream status` | one screen of state, read-only |
| `dream reset` | deletes memory, diary, staging and corpus under `DREAM_HOME` |

`dream reset` asks for confirmation; add `--yes` to skip it. It never touches
your projects, and it refuses a `DREAM_HOME` that does not look like a dream
home. When `$DREAM_HOME` is a git repo, the preimage commits keep the old
content one `git checkout` away.

`dream-corpus` and `dream-status` stay installed as standalone commands; they do
the same thing as the two subcommands.

## Test

```bash
npm test
```

The plugin checks: the hook registers, missing files inject nothing, shared
memory alone injects one block, the current project's file is appended after it
while another project's stays out, an oversized file is truncated without the
whole block growing, and titles are dropped. Then the corpus checks: the dream's
own sessions stay out, a labelled secret is redacted, a torn session export is
skipped instead of fatal, and a git data directory gets a preimage commit before
the deep pass.

## Licence

MIT.
