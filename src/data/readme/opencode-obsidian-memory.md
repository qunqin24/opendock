# opencode-obsidian-memory

Long-term memory for the [OpenCode](https://opencode.ai) coding agent, stored as Markdown notes in
[Obsidian](https://obsidian.md) vaults.

OpenCode forgets everything when a session ends. With this plugin it keeps what matters (your preferences, the rules
and decisions of each project, lessons from past mistakes) and brings it back when it helps. You can read and edit
every note in Obsidian.

This is the OpenCode V2 port of `pi-obsidian-memory`. OpenCode V1 is not supported.

## Requirements

| What | Why | Required? |
|---|---|---|
| [OpenCode](https://opencode.ai) V2 | Runs the plugin. Built against `@opencode/plugin` 2.4.1. | Yes |
| Node 22.19 or later | The plugin runs on it (`engines` in `package.json`). | Yes |
| A chat model in OpenCode | The observer, the consolidator and the memory agent run on it. | For memory in vaults |
| A TypeSafe key and a `typesafe` decision model in the catalog | Jev decides which notes help each message. | Strongly recommended |
| [Obsidian](https://obsidian.md) | Reading and editing the notes. | No: notes are plain Markdown |

Without a decision model no notes are added to your messages; without a config file the plugin still observes and
compacts the session with the model in use, and writes nothing to a vault.

## Install

Add the package to the `plugins` array of `opencode.jsonc` (global, in `~/.config/opencode`, or per project), or run:

```bash
opencode plugin add opencode-obsidian-memory
```

`opencode plugin add` installs the package and writes it into the global configuration. Until the package is on npm,
put the checked-out folder in `plugins` instead — the end-to-end tests load it that way:

```jsonc
{
  "plugins": ["<path to the opencode-obsidian-memory folder>"]
}
```

The terminal and desktop parts need no separate registration: OpenCode loads the package's `./tui` export in the
terminal and its `./gui-experimental` bundle in the desktop app, from the same entry; the terminal and desktop
end-to-end scenarios configure nothing but `plugins`.

### Jev

Per-message memory asks OpenCode for the decision model `typesafe/jev-1.14.0` (a fixed version; it was served as
`jev-latest` before TypeSafe stopped accepting that name) through OpenCode's own model catalog. The provider entry the
plugin needs, and that the end-to-end tests use, is:

```jsonc
{
  "providers": {
    "typesafe": {
      "name": "TypeSafe",
      "env": ["TYPESAFE_API_KEY"],
      "package": "@opencode/ai/providers/typesafe-ai",
      "settings": { "baseURL": "https://api.typesafe.ai/v1" },
      "models": {
        "jev-1.14.0": {
          "name": "Jev 1.14.0",
          "package": "@opencode/ai/providers/typesafe-ai/decisions",
          "type": "decision",
          "limit": { "context": 64000, "output": 0 }
        }
      }
    }
  }
}
```

The key comes from `TYPESAFE_API_KEY`, declared in the provider entry's `env`; it is never written to this package's
config. `/memory-doctor` says when the catalog has no such model or the provider is not active.

### Laya

Laya is the local alternative: a `laya-serve` on `http://127.0.0.1:8000/v1/systemone` (the default endpoint, model
`multilingual`, `maxTokens` 8192, `headMaxTokens` 192). Laya ships no cutoffs: you set the gate and the relevance cutoff
in `/memory-setup`, otherwise per-message memory stays off and the session says so. Choosing Laya in `/memory-setup`
asks for the endpoint.

## First run

1. Run `/memory-setup`. It asks for the chat model of the observer and the consolidator (one answer fills both), the
   chat model of the memory agent, whether the global vault is a new folder or an existing one, and its path; then it
   shows what leaves the machine and writes the config and the vault.
2. Run `/memory-init` in a project folder to give that project its own vault. A folder without a project vault uses
   the global vault only.
3. Use OpenCode as usual. Say "remember that …" to save something at once; the rest is saved as the session grows.

Run `/memory-setup` again at any time to open the settings screen. Each question goes to the client's own dialog: the
terminal part and the desktop part have theirs; elsewhere it is OpenCode's question form.

## How it works

### Two vaults

- **Global vault:** about you — how to address you, your preferences, your patterns.
- **Project vault:** about one project — its rules, decisions, facts, open issues.

Each note holds one point. Its file name is the statement (for example `pnpm/Use pnpm, never npm.md`), the body has the
detail, and the frontmatter says what kind of memory it is:

```markdown
---
id: 01JABCDE7XKQ2M9V3RTN8WPZ5F
type: rule
created: 2026-10-04
updated: 2026-10-04
dontForget: true
---

Use pnpm for every install and script. In CI: `pnpm install --frozen-lockfile`.
```

Types: `rule`, `procedure`, `constraint`, `fact`, `issue`, `question`, `decision`, `lesson`, `goal`, `risk`, `idea`,
`reference`. Notes are written in English. A note is never deleted: retiring it moves it to `archive/`, and a replaced
note links to its successor. A vault holds only notes, their `index.md` files, `_templates/` and `Memory.base`.

### During a session

1. **Session start.** Every note marked `dontForget: true` is loaded into the system prompt in full, and the memory map
   (the names of the notes in both vaults) is added, sized by `compaction.mapTokens`.
2. **Each message.** Jev decides whether stored memory would help. If yes, memory searches the vaults, reads the hits,
   and Jev scores the notes; the notes that help are added right after your message, within `context.budgetChars`.
3. **Observer.** Each time a step or an execution ends, the observer reads the new stretch of conversation (about
   `observer.chunkTokens` tokens, up to `observer.concurrency` at a time) with the observer model and saves dated
   observations in the session.
4. **Consolidator.** When the observations kept in the session pass `consolidator.atPoolTokens`, the consolidator turns
   the oldest into notes, in the background, until about `consolidator.poolTargetTokens` remain. It never asks: what it
   is unsure of is not saved.
5. **Compaction.** When the context reaches `compaction.atContextTokens` and the conversation since the last compaction
   has grown by `observer.chunkTokens`, memory builds the compaction block (journey, work state, memory map and
   observations) and asks OpenCode to compact the session; OpenCode's own compactions use the same block.

### Compaction

How much conversation stays word for word after a compaction is OpenCode's own setting, `compaction.keep.tokens` in
`opencode.jsonc`. The package has no setting of its own for it: it reads the value from OpenCode's config files in
OpenCode's order (global, then project) and uses 15000 when no file sets it. `/memory-doctor` shows the value and the
file it came from.

Calls that need a system prompt and a reasoning level (import, observer, consolidator, origin checks) run in a helper
session the plugin creates, reuses during the task and deletes at the end, titled `obsidian-memory: observe`,
`obsidian-memory: consolidate`, `obsidian-memory: import` or `obsidian-memory: check origins`. OpenCode cannot hide it,
so it shows in the session list while it runs.

### Vault guard

The agent reaches the vaults only through the memory tools. Before any tool runs, a path that hits a registered vault is
refused:

> Vault files are reachable only through memory_search and memory_get, never with file tools or the shell.

The check covers the tools `read`, `write`, `edit`, `grep`, `glob`, `shell` and `patch`. You and Obsidian are not
affected.

### Other compaction plugins

OpenCode keeps only one compaction. If a plugin that compacts sessions is loaded beside this one, remove it from the
`plugins` list. `/memory-doctor` warns while a plugin whose id contains `observational-memory` is loaded — the
`pi-observational-memory` package in particular, whose files `/memory-import` can bring into the vaults.

## Tools

| Tool | Does |
|---|---|
| `memory_search` | Finds notes by words and by meaning, in the global vault, the project vault or both |
| `memory_get` | Reads a note in full, or a folder's index (`""` is the vault root); `archive/` paths can be read |
| `memory_add` | Saves a new note (scope, folder, statement, type, body, Don't forget) |
| `memory_update` | Changes a note's body, type or Don't forget mark |
| `memory_archive` | Moves a note to `archive/` |
| `memory_succeed` | Replaces a note with a new one; both link to each other |

`memory_add`, `memory_update`, `memory_archive` and `memory_succeed` are documented to the model as usable only when
the user explicitly asks to remember, change, retire or replace something; saving the rest of the conversation is the
observer's job.

## Commands

| Command | Asks | Does |
|---|---|---|
| `/memory-setup` | First run: the chat models, the vault mode and path. Afterwards: one line per setting | Writes the config and the global vault; later, the settings screen |
| `/memory-init` | The project name (default: the folder name) and the vault path | Registers the working folder as a project; creates the vault when missing |
| `/memory-import` | Nothing | Reads what `pi-observational-memory` wrote in `.memory/` of the project and saves it as notes |
| `/memory-export` | The folder (default: the working folder) and the file name | Saves both vaults as one `.zip` |
| `/memory-doctor` | Whether to complete each blank note, and its type and body | Checks the vaults, the config, the models, the keys, the cutoffs and OpenCode's compaction settings |

`/memory-doctor` reports, per vault: invalid notes, copied ids, blank notes (no frontmatter), leftover temporary files
and files it could not read. Then the observer, consolidator and memory-agent models, the embeddings provider, the
decision model (with a live call for Laya), the cutoffs and their source, and OpenCode's `compaction.keep.tokens` and
`compaction.auto`. Its only offer is to complete a blank note, after asking.

## Settings

Every setting is changed in the `/memory-setup` screen or in the file; the schema, the defaults and every key are in
[docs/config.md](docs/config.md). Changes apply on the next use; the Don't forget block and the memory map already
built for a conversation stay as they were until the next session.

## Where things are stored

| What | Where |
|---|---|
| Notes | The vault folders you chose |
| Settings | `~/.config/opencode/opencode-obsidian-memory/config.json` (`$OPENCODE_CONFIG_DIR` and `$XDG_CONFIG_HOME` are honoured) |
| Search index | `index/` beside it; rebuilt from the notes when needed |
| Local search model | `models/` beside it; downloaded once |

## Privacy

- The observer, the consolidator and the memory agent send conversation and note content to the chat models you chose.
- Observations, the journey and the work state stay in the OpenCode session.
- Jev sends your messages and candidate notes to TypeSafe.
- Search by meaning runs on your machine by default; OpenAI or Google receive note content, secrets included, and
  queries only if you choose them.
- `/memory-setup` shows each of these before it saves.
- The config file never holds a key.

## Troubleshooting

Run `/memory-doctor` first.

| You see | Do |
|---|---|
| "Memory is off: ask the user to run /memory-setup" | Run `/memory-setup` |
| "Run /memory-setup first" in `/memory-init`, `/memory-import` or `/memory-export` | Run `/memory-setup` |
| "No chat model is available. Connect a model in OpenCode…" | Connect a model, then run `/memory-setup` again |
| "Memory observer failed: …" | The text names the cause, for example a model without a key. It tries again in a minute |
| "… so OpenCode compacted it on its own" | The observer had not covered the start of the session yet. Nothing to do |
| "Memory could not compact the session: …" | Nothing was compacted. Memory tries again once the conversation has grown |
| "Per-message memory is off: the decision model has no cutoff for …" | Set both cutoffs in `/memory-setup` (Laya) |
| "OpenCode has no typesafe jev-1.14.0 classifier model" in `/memory-doctor` | Add the `typesafe` provider entry above |
| "No API key for typesafe" in `/memory-doctor` | Set `TYPESAFE_API_KEY` or enable the provider in OpenCode |

## Known limits

- Laya has no shipped cutoffs; nothing supports a default (see [docs/decision-thresholds.md](docs/decision-thresholds.md)).
- If the decision model is unavailable, nothing is added for that message; no other model takes its place.
- The vault guard checks the paths a tool call names. It covers the tools listed above and reads shell commands as
  text, so a path a script builds at run time is not seen.
- Helper sessions show in the session list while a task runs.
- How well the consolidator judges what to save is checked only by end-to-end scenarios.
- The package has no read-only entry: loading it registers all six tools.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test              # offline: pure tests and tests on a real temporary disk
npm run test:e2e      # the real opencode serve, through OmniRoute and the real Jev
npm run test:model    # live tests: Laya, the local embeddings model, the model download
npm run build:gui     # builds dist/gui-experimental.cjs for the desktop app
```

`npm test` runs the `unit` project (everything except `*.model.test.ts` and `tests/e2e/`); in this repository it ran
291 files and 2239 tests (3 skipped) in 161 seconds.

`npm run test:e2e` starts the real `opencode serve` (from `@opencode/cli`, or `OPENCODE_BIN`) with a temporary home,
`OPENCODE_CONFIG_DIR`, `OPENCODE_DB` and project folder, and temporary vaults, and loads the package through the
`plugins` array, the way a user installs it. The conversation model is OmniRoute's `cc/claude-haiku-5-5`;
`OMNIROUTE_URL`, `OMNIROUTE_API_KEY` and `TYPESAFE_API_KEY` come from the environment when set, and otherwise the helper
reads the URL from your `~/.config/opencode/opencode.jsonc` and the keys read-only from OpenCode's credential database
(`~/.local/share/opencode/opencode.db`). No secret is printed or written. The scenarios cover the API, the web app,
the terminal in a pseudo-terminal, and the desktop app; the desktop scenario runs the app on a private Windows desktop
(`CreateDesktop`), checks that no window reached your desktop, and needs the desktop app installed (or
`OPENCODE_DESKTOP_BIN`); it skips when the app is absent. One test file at a time, one run at a time.

`npm run test:model` needs a live `laya-serve` for the Laya and threshold tests and downloads the local embeddings
model once.

More: [vision](docs/VISION.md), [settings](docs/config.md), [decision thresholds](docs/decision-thresholds.md),
[roadmap](docs/ROADMAP.md).

## License

MIT
