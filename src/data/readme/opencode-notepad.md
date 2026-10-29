# opencode-notepad

An OpenCode Desktop plugin that adds a Markdown notepad to the session side panel, one per chat. The note's top section is a checklist. The coding agent can add to it, so "add this to the list" in chat is enough.

## Parts

- **Server** (`src/index.ts`) owns the note file and serializes every edit. It registers the agent tools and the `notepad` RPC.
- **GUI** (`src/gui.tsx`, built to `dist/gui-experimental.cjs`) adds the **Notepad** side tab, a composer pill with the open-item count, and the **Toggle Notepad** command (`mod+alt+n`).
- **RPC** (`src/rpc.ts`) is the contract between the two parts. The server emits `updated` on every change, including edits made in other apps.

## Send a selection

Highlight text anywhere in the window, such as part of a chat message. A floating bar appears above it:

- **Quote** attaches the selection to your next message as a quote and opens its comment box, in one step. It first dispatches a cancelable, bubbling `opencode:quote` event with `detail: { text }` on the selection. A view with its own composer, such as an [opencode-side-chat](https://github.com/parzival1l/opencode-side-chat) side chat, cancels it and takes the quote instead.
- **Add to list** adds each selected line as a checklist item. It drops list markers like `-`, `1.`, and `•`.
- **Add to notes** appends the selection to the notes as a blockquote.

The keyboard does the same: `mod+alt+l` sends the selection to the list, and `mod+alt+k` sends it to the notes. The bar stays hidden for selections inside inputs, the composer, and the Notepad itself. The GUI API has no hook into the timeline, so the bar reads the window's selection. Selected text arrives as plain text, without Markdown formatting.

## Note format

Each chat has its own plain Markdown file, `~/.local/share/opencode-notepad/<session ID>.md` (under `$XDG_DATA_HOME` when set). A subagent writes to its parent chat's note. A chat gets a file on its first edit. Set `options.dir` to keep the files elsewhere. The run of task lines at the very top is the checklist. Everything after the first non-task line is free Markdown.

```markdown
- [ ] Review the citation flow
- [x] Ship the PR

## Notes

Anything you like.
```

## Agent tools

All tools work on the calling chat's note.

| Tool | What it does |
|------|--------------|
| `notepad.add` | Adds checklist items. Triggered by "add this to the list", "remind me to", and similar. |
| `notepad.check` | Checks or unchecks items by text `query` or by `index`. |
| `notepad.read` | Returns the numbered checklist and the notes. |
| `notepad.append_note` | Appends Markdown to the notes section. |

## Install

Requires OpenCode Desktop 2.2.0 or later.

1. Add the package to `plugins` in the global `~/.config/opencode/opencode.jsonc`. OpenCode Desktop loads GUI parts only from the global config.

   ```jsonc
   {
     "plugins": [
       "opencode-notepad",
       // Or keep the notes in another folder:
       // { "package": "opencode-notepad", "options": { "dir": "~/notes/opencode" } },
     ],
   }
   ```

2. Open a session, then pick **Notepad** from the side panel's **+** menu, or press `mod+alt+n`.

OpenCode installs the package and reloads plugins when the config changes.

## Develop

1. Clone the repo, then run `bun install` and `bun run build`.
2. In `plugins`, replace `"opencode-notepad"` with the absolute path of your clone.

- `bun run dev` rebuilds the GUI on every change. Each rebuild reloads the GUI in every window.
- The server reloads when a file in `src/` changes.
- `bun run test` covers the note format and the file store. `bun run typecheck` runs `tsc`.
- `bun run test:e2e` drives the highlight bar in Chrome with real mouse presses, including while the page streams and scrolls. Set `CHROME_PATH` if Chrome is not in `/Applications`.

## Release

1. Bump `version` in `package.json` and commit it as `Release <version>`.
2. Push to `main`.

The `Release` workflow runs the checks on every push. On `main`, it publishes the version to npm if npm does not have it yet, then creates a GitHub release `v<version>`. It publishes through npm trusted publishing, so the repo holds no npm token.

## Markdown Preview

The toolbar button opens the note in [Markdown Preview](https://github.com/pluk-inc/markdown-preview) through its `md-preview://file/<path>` URL scheme. There you can read it with an outline, or click its checkboxes. The panel picks up those edits. The checklist styles adapt Markdown Preview's task-list rules (MIT): done items are muted, not struck through.

## Limits

- The server runs one plugin instance per project directory. Each instance serializes its own writes. Two instances that write to one chat's note in the same few milliseconds can still lose one edit.
- The GUI API is experimental. This plugin pins `@opencode/plugin@2.2.0`, which matches OpenCode Desktop 2.2.0.
