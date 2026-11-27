# InMemoria

**TL;DR:** InMemoria gives OpenCode a memory of the product, not just the codebase. It documents who uses the product, what they need, and which business rules the code implements. When your team explains why a workflow exists or why an idea was ruled out, `/inmemoria:memorize` keeps that reasoning available the next time you discuss a feature.

## Human-friendly guide

### Install and get started

1. Open `~/.config/opencode/opencode.json` to install the plugin for all projects, or `opencode.json` in a project to install it only there.
2. Add `opencode-inmemoria@latest` to `plugins` and save the file. Keep any existing entries. The example stores your notes in `~/Documents/MyVault`; replace that path with your own folder or Obsidian vault, or omit `options` to use the default location.

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       {
         "package": "opencode-inmemoria@latest",
         "options": { "memoryDirectory": "~/Documents/MyVault" }
       }
     ]
   }
   ```

3. Open your project in OpenCode **2.3.0** and run `/inmemoria:build-memory`. Once it finishes, try asking “Who uses this project, and what do they use it for?” in a new session.

### When does it remember something?

**You choose which sessions to save.** OpenCode can read project memory during a conversation without a command. If you explain why your team abandoned a workflow, run `/inmemoria:memorize` in that session to keep the correction. If you skip it, the conversation does not change InMemoria's notes.

| Command | What it does |
| --- | --- |
| `/inmemoria:build-memory` | Reads the project and creates its initial reference: what the product does, who uses it, and where to find the relevant code. |
| `/inmemoria:memorize` | Saves a summary of the current session and updates the relevant project notes or initiatives. |

### What does the memory look like?

Each project gets a folder of **plain Markdown files**. Open `index.md` in any Markdown reader:

```text
projects/<project-name>/
  index.md       Start here to find a note.
  core/          What the team knows about the product and its code today.
  initiatives/   Changes the team is considering or working on across sessions.
  memories/      Summaries of the sessions you chose to save.
```

By default, the notes live under `~/.local/share/inmemoria/`. **You can choose your own folder**, including an existing **Obsidian vault**: set `memoryDirectory` to the vault's path (for example, `~/Documents/MyVault`). The notes appear under `projects/<project-name>/` alongside your own notes. No Obsidian plugin is required. See the [configuration example](#where-the-notes-live) or [move an existing vault](#moving-an-existing-vault).

The notes are local files. The OpenCode model you select processes the source files during exploration and the session content during memorization.

## AI-friendly guide

### How it works

- **`/inmemoria:build-memory`** reads the selected project directory, including eligible uncommitted files. Explorers cite files by their assigned numbers; the plugin supplies paths relative to the selected root in accepted reports. A rejected report is retried independently, up to three attempts per lot, while other workers continue. If lots remain blocked, the command reports them without publishing an incomplete core. Running it again reuses accepted reports for unchanged lots. An examined lot needs no finding to count as read. The coverage note separates files read, partial reads, unread material, exclusions and unresolved questions. Once published, the initial core is not replaced by a repeated build.
- **Ask a project question** in a new session. InMemoria starts with current knowledge and relevant initiatives and falls back to historical sessions or normal project tools. Reading does not create files.
- **`/inmemoria:memorize`** records the current session, then reconciles corrections, proposals, completed changes and abandoned initiatives. Evidence in the saved session can justify revising a rule or removing an entirely obsolete core note. Abandonment or a file missing on another branch is insufficient. Session and initiative history remain readable after removal. Run the command again for a dated revision or to resume interrupted reconciliation. A session with no project relevance gets only its own memory and index entry.

Notes, workflow instructions and command summaries are in English. Local terms, identifiers and paths remain searchable. Authored source, including migrations, documentation and existing tests, is eligible for exploration. Identifiable credential files are excluded; workers and memory authors must omit credentials from other material as well.

Core notes answer independently useful questions. Local indexes link by the optional `question` in a note's header, falling back to the title for older notes. The core index points to its immediate subjects and areas rather than listing every nested note. Projects can document evidenced decisions and operating procedures without creating a mandatory folder tree.

Exploration has a fixed limit of ten concurrent explorers. Each worker receives its file list privately, submits evidence through `inmemoria_submit_report`, and returns only a short status to the coordinator. A worker finishing without a saved report does not count as coverage. Detailed findings are available to the coordinator during synthesis.

### Select a project root

Place an empty regular file named `.inmemoria-root` in the directory you want a session to use. For example, run `touch Moonfen/.inmemoria-root` to share one memory across `Moonfen/pipelines/`, `Moonfen/warehouse/` and `Moonfen/contracts/`. The first two can be independent Git repositories and the third a plain directory. You can commit the marker to share the root choice; it contains no key, notes or storage settings.

Read, search, `/inmemoria:memorize` and `/inmemoria:build-memory` look upward from the invoking session's real directory. **The nearest directory with a marker or existing memory wins**, even across a Git boundary. Evidence includes a registered project directory, a legacy key-based `index.md`, a `build.json` checkpoint (including an unfinished build), or a pending `publication.json` journal. A shared vault or matching display name alone does not select a source root: mark a plain or multi-repository root when sharing notes without its registry. Discovery creates nothing and never recovers a journal.

From `warehouse/models/`, a `.git` entry alone does not override `Moonfen/`. To give `warehouse/` its own memory, run `touch Moonfen/warehouse/.inmemoria-root` before invoking a memory command. Existing warehouse notes already qualify without the marker. Selecting a nested memory does not move notes from the parent. A build explicitly targeting the parent still inventories eligible sources in both repositories.

With no declaration or existing memory, the fallback is the nearest Git working copy, or **exactly the invoking directory** outside Git. Open the desired plain directory for a first build, or mark it before working from a subdirectory. Merely having repositories somewhere underneath a directory does not make it a project.

Inside a working copy, Git lists tracked and untracked, non-ignored paths; the build reads their current contents. Outside Git, the build walks regular files, pruning known dependency and output directories, credential names, and most hidden entries. Authored files such as `contracts/schema.sql` remain eligible. Symlinks, binary content, recognized private key material, root markers and InMemoria's own data are excluded. A pruned directory appears once in coverage with its reason.

### Where the notes live

**Default:** InMemoria keeps everything under `~/.local/share/inmemoria/` (or `$XDG_DATA_HOME/inmemoria/`). New notes use `projects/<project-name>/`. Checkpoints, locks, reports and pending publications use `runs/`. The source directory and Git working copies stay where they are.

**One vault for every project (optional):** In your global `~/.config/opencode/opencode.json`, set `memoryDirectory` on the InMemoria entry as shown below. Use an absolute path or one starting with `~/`. A relative path such as `docs/memory` is rejected. Keep your other plugin entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-inmemoria@latest",
      "options": { "memoryDirectory": "~/Documents/MyVault" }
    }
  ]
}
```

Open `~/Documents/MyVault` itself in Obsidian or Git. It can already contain personal notes, `.obsidian/` or `.git/`. New projects use this layout:

```text
MyVault/
  projects/
    Moonfen/index.md
    Emberfinch/index.md
  runs/
    markdown-homes.json
    <project-key>/
```

Each project's index links to `core/`, `initiatives/` and `memories/`. The folder name comes from the **selected source root**: starting in `Moonfen/contracts/` still gives `projects/Moonfen/` when `Moonfen/` owns the session. Optionally set `displayName` for one project to change its label and initial folder name. Later label changes never move registered notes. If two identities request the same registered folder, choose a different project-specific `displayName`.

**Inside a repository:** An absolute setting such as `/work/Moonfen/docs/vault` uses `docs/vault/projects/Moonfen/` and `docs/vault/runs/`. Source references still start at `/work/Moonfen`; storage artifacts are excluded from exploration.

**Git sharing:** You can version the vault as one repository. To share only Markdown, ignore `runs/` and commit the complete `projects/<name>/` after publication finishes. A colleague selecting the same project name can search and read recognized notes without a local checkpoint. A valid core index and the generated `core/exploration-coverage.md` protect a published core from rebuilding; indexes created by `/inmemoria:memorize` alone do not. If you also transfer `runs/`, retain the matching notes and coordinate writes: syncing copies of a lock is not distributed locking.

#### Moving an existing vault

1. Finish active memory commands and back up the vault. Move the **whole vault**, including `projects/` and `runs/`, or move those directories into an existing Obsidian vault. Use an unused destination for each directory; do not merge over another project's files.
2. Set global `memoryDirectory` to the **new vault root**. Changing the setting alone never moves files.
3. Open a session in the same source project and read `index.md`. New registry and publication paths are relative to the vault, so moving a vault created by this version needs no per-project changes or rebuild.

**Upgrading older layouts:**

- Original `projects/<key>/` and matching `runs/<key>/` still work, at the default location or moved together. No rename is required. To adopt a readable name deliberately, move only the notes folder to an unused `projects/<name>/`, keeping `runs/<key>/` intact. If `runs/markdown-homes.json` already maps that key, update its value to `projects/<name>` while commands are stopped.
- For an intermediate `markdown/<name>/` installation, keep that directory alongside `runs/` or move the notes to `projects/<name>/`. If the old registry contains absolute paths, change the affected values in the backed-up registry's **working copy** to the corresponding vault-relative paths before relocating. For example, `"/old/vault/markdown/Emberfinch"` becomes `"projects/Emberfinch"` if you moved those notes there. Keep the project keys unchanged.
- An old exact `memoryDirectory` or `markdownHome` meant **one project's notes**, not the vault. Finish pending publications with the previous version. Move those notes under `projects/<name>/`, bring the matching `runs/` from the old application directory, and update the registry as above. Replace the old option with `memoryDirectory` pointing to the common parent.

Moving **the source checkout** is different from moving the vault. Git keys derive from the real Git common directory: linked worktrees share a key, separate clones do not. Other roots hash their canonical source path. A moved standalone Git repository can reconnect with its former `projectKey` in project-specific options; an override ambiguous between enclosing Git repositories is rejected.

OpenCode's permission rules apply. The parent needs permission to launch `explore`, workers need `read` on their assigned sources, and the plugin asserts `inmemoria_read` and `inmemoria_write` against the project key. A denied permission, unavailable service, malformed worker report or unsupported checkout is reported rather than interpreted as successful coverage.

### Develop from source

Use OpenCode **2.3.0**, its registered local background service, Git and **Bun 1.4.0 or newer**. From the source checkout:

```sh
bun install --frozen-lockfile
bun run check
```

To load your working copy, use its absolute directory path instead of the npm package name in `plugins`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/InMemoria"]
}
```

### License

See [LICENSE](./LICENSE) for the Apache License 2.0 and the Commons Clause 1.0. These terms permit internal use, including by businesses, but do not grant the right to sell the software as defined by the Commons Clause.
