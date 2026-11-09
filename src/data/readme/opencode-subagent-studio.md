# opencode-subagent-studio

English | [简体中文](README_zh-CN.md)

Manage OpenCode V2 subagents from the desktop app: a settings page to view, create, edit, disable, rename subagent markdown files and move them to trash, with live sync for the user-level agents directory and on-demand refresh for project scopes.

> **Translate this README:** this document is maintained in English; the Chinese version lives in [README_zh-CN.md](README_zh-CN.md). If neither of these two languages works for you, you are welcome to translate this README with your own AI agent — the text is self-contained and machine-translation friendly.

> **UI dictionary disclaimer:** the plugin ships interface dictionaries for 11 languages (English, 简体中文, Français, Español, Português do Brasil, Русский, العربية, Deutsch, 日本語, हिन्दी, 한국어). They are AI-translated and may be ambiguous; when in doubt, the English copy is authoritative. The settings entry is named "Subagent" in every language.

> **Status:** feature-complete for OpenCode Desktop 2.2.5 and verified compatible with 2.2.6. The upstream plugin API is experimental, so a newer desktop release may still break the plugin. Source repository: <https://github.com/VicChenBike/opencode-subagent-studio>.

> **Naming note:** the npm package and this repository are named `opencode-subagent-studio`. The OpenCode plugin id remains `subagent-manager` — plugin ids cannot be renamed after registration — and the local plugin directory keeps the same name. So `[subagent-manager]` in log lines, `id: "subagent-manager"` in code, and an `opencode-subagent-manager` folder on disk are all expected; the "Studio" name lives in npm, GitHub and `package.json`.

---

## Features

| Feature | Description |
|---|---|
| **List** | User-level and project-level scopes, case-insensitive alphabetical sort, search, hidden badge, disabled badge |
| **Create** | Live ID validation, reserved-ID guard, no-clobber |
| **Edit** | Description, colour, model with reasoning effort, three-state permission matrix (allow / ask / deny), system prompt, max steps, hidden |
| **Rename** | Warning first, then the new ID; refuses an existing target |
| **V1 → V2 migration** | Whole-file conversion per the official rules, previewed before saving; comments and unknown fields preserved |
| **Trash** | Deleted agents move to `agents-trash/` beside the agents directory and can be restored by hand |
| **Built-in overrides** | Switch `general` / `explore` models at runtime through plugin storage; nothing is written to `opencode.jsonc` |
| **Live sync** | `fs.watch` + 300 ms debounce + `agent.reload()`; user-level directories refresh automatically. In the current build, external changes in a project scope need the Refresh button |
| **i18n** | 11 interface languages (en, zh, fr, es, br, ru, ar, de, ja, hi, ko), AI-translated; the settings entry reads "Subagent" in every language |

## Requirements

- **OpenCode Desktop 2.2.5** — the version this plugin was built against. **2.2.6** has been verified compatible.
- **Node.js 24+ and npm** — needed to install dependencies, run the tests and build the GUI bundle.
- **Windows 11** has been tested. macOS and Linux should work in principle but have not been verified.

## Compatibility

- **OpenCode Desktop 2.2.5 / 2.2.6** — built against 2.2.5, verified compatible on 2.2.6. The plugin API is marked experimental upstream, so later releases may change the API and break this plugin.
- The server half needs a Node-compatible runtime (the desktop ships one). The GUI half is a single CommonJS bundle loaded by the desktop renderer.
- The plugin makes no network requests and collects no telemetry.

## Install

The plugin is published on npm as [`opencode-subagent-studio`](https://www.npmjs.com/package/opencode-subagent-studio). The quickest install is to list the package name in the `plugins` array of `opencode.jsonc` — OpenCode downloads and caches it automatically:

```jsonc
{
  "plugins": ["opencode-subagent-studio"]
}
```

The steps below install from a local clone instead.

1. Clone the repository into the plugins directory, then install and build. If you already have this folder, skip the clone and run the three commands inside it.

```bash
git clone https://github.com/VicChenBike/opencode-subagent-studio ~/.config/opencode/plugins/opencode-subagent-studio
cd ~/.config/opencode/plugins/opencode-subagent-studio
npm install
npm run build
```

`dist/` is gitignored: the plugin will not load from a fresh clone until `npm run build` has produced `dist/gui-experimental.cjs`.

2. Add the **directory** to `opencode.jsonc`. The desktop reads `opencode.jsonc`, not `cli.json`, and the entry must point at the folder (not a file inside it):

```jsonc
{
  "plugins": [
    "<your home>/.config/opencode/plugins/opencode-subagent-studio"
  ]
}
```

Use your platform's path separator and escape backslashes in JSON, for example on Windows: `"C:\\Users\\<you>\\.config\\opencode\\plugins\\opencode-subagent-studio"`.

3. Restart the desktop app fully (quit from the tray, then relaunch — a window reload is not enough because the server half only loads at process start). Open **Settings → Agent capability → Subagent**.

## Usage

### List page

- **Scope menu** (top left): switch between `This computer · User` (default) and any project known to the desktop; project agents live in `<project>/.opencode/agents/`. The **count** next to it reflects the currently shown rows, so it shrinks while a search filter is active.
- **Search** filters by ID and description, case-insensitive. **Refresh** re-reads from disk. User-level directories refresh automatically; in the current build, external changes in a project scope require a manual refresh with this button.
- **New** opens a blank editor inheriting the current scope. The ID must match `^[a-z][a-z0-9-]{0,63}$` (lowercase letters, digits, hyphens; ≤ 64 chars) and cannot be one of the reserved IDs `build`, `plan`, `general`, `explore`, `compaction`, `title`, `summary`. An existing file is never overwritten.

### Rows

Each custom agent row shows a colour dot (theme grey when unset), the name, and a model badge (the raw `provider/model` or `provider/model#variant` string; no badge when no model is set). A "Hidden" badge marks `hidden: true`, a "Disabled" badge marks a switched-off agent; each row also has a switch and a trash button. Click a custom agent row to edit it.

- The **switch** is an enable switch (blue/on = enabled, following the host convention). Toggling it writes `disabled`: a disabled agent stays on disk but is removed from the loaded configuration; its row dims and shows the "Disabled" badge.
- The **trash button** moves the file to `agents-trash/` (see "Restore from trash" below) after a confirmation.

### Built-in group

Pinned at the bottom: `general` ("All tools") and `explore` ("Read-only"). They have no editor and no trash button — only the model can be changed, through the same model picker; choosing "Inherit default" clears the override.

### Editor page

- **Name** is read-only after creation; **Rename** first warns that the agent ID equals the file name, so references to it in prompts or other agents will break, then refuses an ID that already exists.
- **Colour**: eight preset dots plus "none"; writes `color: "#rrggbb"`.
- **Model** opens a picker grouped by provider with a search box; the **reasoning-effort** dropdown next to it lists the selected model's variants. The dropdown shows "None" when the model has no variants or when "Inherit default" is chosen. "Inherit default" simply omits `model` from the file.
- **Description** is required — it is what the parent model sees when choosing a subagent.
- **Permissions** is a three-state matrix over ten actions (`read`, `glob`, `grep`, `edit`, `shell`, `webfetch`, `websearch`, `skill`, `subagent`, `question`) plus a default: **allow** = runs normally, **ask** = the user is asked every time, **deny** = refused. Fine-grained rules already in the file are preserved and keep priority (the last matching rule wins).
- **System prompt** is the markdown body; **Max steps** writes `steps` (empty = unset); **Hidden** writes `hidden: true` — the agent stays callable, just not advertised to the model.
- **Saving a V1 file** first opens a side-by-side migration preview; confirming converts the whole file to V2 (see "How it works"). The editor already shows the content as it will be after migration (a legacy `prompt:` field appears as the body, `model` + `variant` as one reference), so toggling or saving a V1 agent never loses its prompt, variant, max steps or tool denials.
- **Save conflict**: the editor records the file hash when it opens. If the file changed on disk, the save is refused and a dialog offers **Reload** or **Overwrite**. **Reload** — or dismissing the dialog with Esc / a click outside — leaves the editor and returns to the list. **Overwrite** keeps your form and first copies the current disk content to the trash folder as `.backup-<timestamp>-<name>.md`.

## How it works

Two cooperating processes:

```
┌───────────────────────────────────────────────┐
│ GUI — desktop renderer (SolidJS)              │
│   src/gui/*  →  dist/gui-experimental.cjs     │
│   settings page: list / editor / model picker │
└───────────────┬───────────────────────────────┘
                │ RPC: 12 methods + "changed" event
┌───────────────▼───────────────────────────────┐
│ Server — Node (runs in the desktop server)    │
│   src/index.ts + src/core/*                   │
│   scans agents dirs, reads/writes markdown,   │
│   fs.watch, V1→V2 migration, builtin override │
└───────────────────────────────────────────────┘
```

**Data flow.** The markdown files under the `agents/` directories are the single source of truth. The server scans them recursively (case-insensitive alphabetical order; only files whose `mode` is exactly `subagent`) and exposes them through the `list` / `read` RPC methods; the GUI renders the result. File mutations (`create` / `update` / `remove` / `rename` / `setDisabled`) write markdown; `setBuiltinModel` writes plugin storage. Every mutation then calls `agent.reload()` and broadcasts the `changed` event. The GUI re-fetches the list on `changed`, except while the editor is open.

**Live sync.** The server watches the user-level `agents/` directory continuously. The `watchProject` RPC exists and the server can watch a project directory, but the current GUI does not call it, so external changes in a project scope are not picked up automatically — use **Refresh**. Disk changes are debounced for 300 ms (Windows fires several events per save), then trigger `agent.reload()` and a `changed` event. When the editor is open, the page only shows a "Disk changed" toast and does not overwrite the form.

**V1 → V2 migration.** If a file's frontmatter contains any of `permissions`, `request`, `system` or `disabled`, the whole file is read as V2; anything else is read as V1 (legacy). Saving a V1 file from the editor first shows a side-by-side migration preview: `permission` map → `permissions` rule array, `disable` → `disabled`, `model` + `variant` → `provider/model#variant`, `maxSteps` → `steps`; `name`, `temperature`, `top_p` and `options` are dropped; `tools` entries set to `false` become `deny` rules; V1 action names are renamed (`bash`→`shell`, `task`→`subagent`, `write`/`patch`→`edit`); nested permission values are expanded into multiple rules. The markdown body is kept as-is, except that a non-empty V1 `prompt` is merged into the body when the body is empty. The conversion rewrites the entire file in one pass with the `yaml` Document API, so comments, key order and unknown fields survive.

**Built-in overrides.** `general` and `explore` are OpenCode's built-in subagents; the plugin can only change their model. An override is stored in the plugin's own key-value storage (`builtin-model.general` / `builtin-model.explore`) and injected at runtime through `ctx.agent.transform`, which replays after every agent reload. Nothing is written to `opencode.jsonc`, and removing the plugin removes the overrides.

**Conflict detection.** Opening the editor records the file's hash. Saving sends that hash back; if the file changed on disk in the meantime, the server refuses with `conflict` and the GUI offers **Reload** (leave the editor and return to the list) or **Overwrite** (keep the form). Dismissing the dialog also leaves the editor. Forcing the overwrite first copies the current file into the trash folder as `.backup-<timestamp>-<name>.md`. All writes are atomic (temporary file + rename in the same directory), so a crash or full disk mid-write cannot truncate an agent file. Existing files keep their original line endings (LF or CRLF), and a UTF-8 BOM is dropped on the first write.

## Limitations

Honest list of what this plugin does not do:

- **Local scopes only** — no remote devices or SSH projects; "user" and "project" both mean this machine.
- **`mode: all` agents are not listed** — the list shows only files whose `mode` is exactly `subagent`.
- **Project-level live sync is not wired in the current build** — the `watchProject` RPC exists, but the GUI does not call it. External changes in a project scope need the Refresh button.
- **Project scopes depend on the desktop's project list** — a project the desktop has not indexed cannot be selected.
- **A V1 file is always migrated as a whole on first save from the editor** — the plugin cannot keep a file in the legacy V1 format.
- **No restore UI for the trash** — restoring is manual: move the file back into `agents/`.
- **Renaming breaks references** — the agent ID is the file name; prompts or other agents that call it by ID must be updated by hand.
- **Nested agent files are listed but cannot be created from the UI** — a file at `agents/team/reviewer.md` is shown with ID `team/reviewer` and can be edited; the New/Rename dialogs only accept flat IDs, and renaming a nested agent keeps it in its subfolder.
- **The host plugin API is experimental** — a newer OpenCode Desktop may change it and break this plugin (built against 2.2.5, verified on 2.2.6).
- **Built-in overrides live in plugin storage** — disabling or removing the plugin restores OpenCode's default models for `general` / `explore`.
- **Staying in the editor after a rename keeps the old path** — if you rename an agent while the form has unsaved edits and choose to stay in the editor, a further save reports `not found` (the rename already succeeded on disk). Leave the editor and reopen the renamed agent; the unsaved edits must be redone.
- **A persistently locked or ACL-denied agent file fails with a generic error** — transient Windows file locks are retried automatically; a persistent access-denied during a write surfaces an unknown-error toast. No data is changed (reads happen before any write).

## Troubleshooting

- **The settings page is missing.** Check that `opencode.jsonc` has the plugin **directory** (not a file) in `plugins`, that the desktop reads `opencode.jsonc` rather than `cli.json`, and that you fully restarted the app. On Windows, if the plugin silently fails to load, kill any leftover `opencode-cli.exe` processes and relaunch.
- **Server changes do not take effect.** `src/index.ts` and `src/core/*` load only at process start: quit the desktop fully and relaunch. A window reload is not enough.
- **GUI changes do not take effect.** Run `npm run build` (or keep `npm run watch` running), then reload the desktop window.
- **The list is empty.** Only files whose `mode` is exactly `subagent` are listed; `primary`, `all` and files without `mode` are excluded. Also check that you are in the expected user/project scope.
- **External changes in a project scope do not appear.** This is a known limitation in the current build: project-level live sync is not wired. Click **Refresh**.
- **A save reports a conflict.** The file changed on disk after you opened the editor. Choose **Reload** to discard your form and return to the list (which refetches), or **Overwrite** to keep your form; overwrite first creates a `.backup-` copy in `agents-trash/`.
- **A save reports invalid frontmatter.** The file's YAML has a structural defect (duplicate keys, bad indentation, unclosed quote). The plugin refuses to write rather than risk corrupting it; fix the YAML in a text editor, then save again.
- **`npm test` fails with `MODULE_NOT_FOUND` on Windows.** Use `npm test` (the script uses the glob `test/**/*.test.ts`); do not run `node --test test/` with a directory argument.
- **`npm install` is slow or fails.** Try the official registry: `npm install --registry=https://registry.npmjs.org`.

## Development

```bash
npm install       # install dependencies
npm test          # unit tests (node --test with type stripping)
npm run typecheck # tsc --noEmit
npm run build     # single-file CJS bundle at dist/gui-experimental.cjs
npm run watch     # rebuild the GUI on change; server changes need an app restart
```

The build must produce exactly one file in `dist/`. Modules the desktop provides (`solid-js`, `solid-js/web`, `@opencode/plugin/gui`, `@opencode/plugin/rpc`) stay external; the build fails if anything else from these packages is bundled. The GUI bundle must contain no dynamic imports.

Before opening a pull request, see [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and ground rules.

## Restore from trash

Deleted agents move to the trash folder beside the agents directory:

- User level: `~/.config/opencode/agents-trash/`
- Project level: `<project>/.opencode/agents-trash/`

Files are named `<yyyyMMdd-HHmmss>-<original-name>.md`; when two same-named files land in the same second, a `-1`, `-2`… suffix is inserted before `.md` so neither copy overwrites the other. Move the file back into `agents/` to restore it. **Drop the timestamp prefix to keep the original agent ID**; keeping it changes the ID (the file name is the ID). There is no restore UI in this version, and moving a file back does not ask before overwriting an existing file — check the target name first.

## Uninstall

1. Remove the plugin directory entry from the `plugins` array in `opencode.jsonc`.
2. Fully restart the desktop app.
3. Optionally delete the plugin folder. Your agent markdown files and `agents-trash/` are left untouched; built-in model overrides disappear with the plugin.

## Data and privacy

The plugin reads and writes only:

- the markdown files under the agents directories above;
- files in `agents-trash/` (deleted agents and `.backup-` copies made before a forced overwrite);
- one key per built-in override in the plugin's own storage (`builtin-model.general`, `builtin-model.explore`).

It makes no network requests and collects no telemetry.

## License

Released under the MIT license. See [LICENSE](LICENSE).

## Acknowledgements

- [opencode-agent-models](https://www.npmjs.com/package/opencode-agent-models) for the shape of a model-picker plugin and the pattern of storing overrides outside the config file. (This project has no public GitHub repository; the npm page is the canonical link.)
- [ZCode](https://github.com/zai-org/ZCode) for the settings page layout this UI follows (scope menu, count, row badges, built-in group).
- The OpenCode team for the plugin SDK and its documentation.
