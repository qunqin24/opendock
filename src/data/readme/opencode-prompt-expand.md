# opencode-prompt-expand

![opencode-prompt-expand featured image](assets/featured.png)

Expand a rough draft in the **OpenCode Desktop** composer into a structured prompt, in place.

The plugin is a small OpenCode Desktop extension: it reads the current draft, asks your own connected model to expand it, writes the result back into the composer, and leaves the send action to you. It never sends a message, never writes session history, and never proxies model credentials.

**Status:** `v0.1.1` experimental. The package is published on npm. The OpenCode Desktop GUI plugin API is still marked experimental upstream; pin the OpenCode version you test against.

[中文说明](docs/README.zh-CN.md)

**Who it is for:** OpenCode Desktop users who write natural-language prompts and want a more structured first draft without leaving the composer. It is not a TUI plugin and it does not send messages for you.

## What it does

- Turns vague requests into prompts with scope, constraints, output format, and acceptance criteria.
- Writes the result back into the composer so you can edit it before sending.
- Keeps up to five generated versions in memory for the current window.
- Adds toast actions for **Undo** and **Regenerate**.
- Can read a small, whitelisted set of project facts to make the expansion more specific.
- Supports a concise mode (~800 characters) and a full-expansion mode.

It does not:

- send the prompt
- modify session history
- read `.env`, keys, or source files
- call the plugin author's servers

## Requirements

- OpenCode Desktop **2.2.5** (the version this release was built and tested against)
- Node.js **^20.19.0 or >=22.12.0** and npm, if you build from source
- A provider/model connected in OpenCode. The plugin uses your own provider account (BYOK).

The TUI is not supported. The GUI composer API used here is only available in OpenCode Desktop.

## Install from GitHub

```bash
git clone https://github.com/ConnorYyy/opencode-prompt-expand.git
cd opencode-prompt-expand
npm ci
```

`npm ci` runs the `prepare` script, which builds `dist/`. You can also run `npm run build` explicitly.

The build produces:

```text
dist/index.js              server part
dist/rpc.js                RPC contract
dist/gui-experimental.cjs  Desktop GUI bundle
```

Add the plugin to the **global** OpenCode config. Desktop reads GUI plugins only from the global file:

- macOS / Linux: `~/.config/opencode/opencode.jsonc`
- Windows: `C:\Users\<you>\.config\opencode\opencode.jsonc`

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-prompt-expand",
      "options": {
        "mode": "concise",
        "model": "auto",
        "projectContext": true,
        "timeoutMs": 30000
      }
    }
  ]
}
```

On Windows, use forward slashes or escaped backslashes in the path, for example:

```jsonc
"package": "D:/path/to/opencode-prompt-expand"
```

Then reload the Desktop window or restart OpenCode Desktop. The GUI bundle is loaded at window start; reloading only the server is not enough after a first install.

Confirm the install:

- **Settings > Extensions > Plugins** shows `prompt-expand` as enabled.
- The command palette has **Expand prompt**.
- A mounted session shows the `⚡ Expand Prompt` pill above the composer.
- Home / new-session drafts show the bottom `⚡ Expand Prompt` button (see below).

### Install from npm

Install it with the OpenCode CLI:

```bash
opencode plugin add opencode-prompt-expand
```

Pin a specific version when needed:

```bash
opencode plugin add opencode-prompt-expand@0.1.1
```

Then verify it is configured:

```bash
opencode plugin list
```

Package page: https://www.npmjs.com/package/opencode-prompt-expand

## Usage

1. Write a draft in the composer, for example:
   `帮我做一个数据看板，包含筛选和导出`
2. Click `⚡ Expand Prompt`, run **Expand prompt** from the command palette, or type `/expand <text>`.
3. Wait for the model. The draft is replaced in place.
4. Review or edit the result, then press Enter yourself.

### Entry points

| Entry | How |
|---|---|
| Pill | Click `⚡ Expand Prompt` above a session composer |
| Draft button | On Home / new-session drafts, use the bottom `⚡ Expand Prompt` button |
| Command palette | Search `Expand prompt` |
| Slash command | `/expand <text>` |
| Regenerate | Toast action, or command palette **Regenerate prompt** |
| Restore original | Toast **Undo**, or command palette **Restore original prompt** |
| Previous / next version | Command palette **Previous expanded version** / **Next expanded version** |
| Toggle mode | Command palette **Toggle expansion mode** |

There are **no default keyboard shortcuts**. Commands are registered in **Settings > Shortcuts**; assign your own:

```text
prompt-expand.expand
prompt-expand.regenerate
prompt-expand.restore
prompt-expand.previous
prompt-expand.next
prompt-expand.mode
prompt-expand.settings
```

### Versions

- Up to 5 generated versions per draft, in memory for the current window.
- Editing the draft resets the version stack; the next expansion starts from the edited text.
- Toast actions are guarded: if you switched sessions or edited the text, Undo will not overwrite your changes.
- The failure toast includes the server `code` and `message` when available, so timeout, model, and validation failures are distinguishable.

## Home and new-session drafts

The official `ctx.screen.current()?.composer` API is `undefined` on Home and on a draft session; `Sessions.current()` is also `undefined` there. The session `ComposerPill` therefore cannot render before the first message creates a mounted session.

For those pages the plugin adds a bottom `⚡ Expand Prompt` button. Because no official draft composer API exists, it uses a **best-effort DOM adapter**:

- it finds the bottom-most visible `textarea`, text input, or contenteditable;
- it reads and writes that element directly;
- it only runs when there is no mounted session;
- it is hidden on Settings and other plugin pages.

Impact and limits:

- It is not an official OpenCode API and may break if the Desktop composer changes.
- It may fail on a complex rich-text composer or if the editor changes during the model call.
- `@` mentions and attachments are not supported on drafts.
- The draft has no composer model, so the model comes from the server default or your configured model.
- Disable it with `draftFallback: false` if you only want to expand in mounted sessions.
- After the first message creates a session, the normal composer pill is used.

## Settings

Open **Settings > Prompt Expand**, or run **Prompt Expand settings** from the command palette (command `prompt-expand.settings`).

| Setting | Description |
|---|---|
| Mode | `concise` (~800 chars) or `full` |
| Model | `auto`, `composer`, `provider/model`, or empty |
| Project context | Read `package.json`, rule files, and git status |

Settings persist through `Store.global`. An unset field, or a model field of `auto`, follows the `options` from `opencode.jsonc`; an explicit setting overrides it. This matters on Home/draft pages, where no composer model is available.

## Configuration

Options are passed through the plugin entry:

| Key | Default | Description |
|---|---|---|
| `model` | `"auto"` | `auto`, `composer`, or `"provider/model"` |
| `mode` | `"concise"` | `concise` / `full` |
| `maxRounds` | `5` | Total generations per draft, including v1 |
| `timeoutMs` | `30000` | Abort and leave the composer untouched after this long |
| `maxGrowth` | `5` | Reject output larger than `original × maxGrowth` **and** > 2000 chars |
| `minChars` | `10` | Below this, skip |
| `maxPromptChars` | `6000` | Above this, skip |
| `skipPatterns` | built-in | Array of regex strings; replaces the built-in list |
| `skipOnMentions` | `true` | Skip drafts containing `@path` |
| `projectContext` | `true` | Read project facts |
| `projectContextBudget` | `2048` | Character budget for injected context |
| `draftFallback` | `true` | Enable the DOM fallback on Home / new-session drafts |
| `prompts` | built-in | Map of glob → prompt; `*gpt*` and `*claude*` included |

### Model selection

- `composer` uses the model currently selected in the composer.
- `auto` prefers the composer model, then the session model, then the server default, then a cheap chat model.
- Explicit `provider/model` is used as-is.

If `auto` falls back to a free model and that model has hit its usage limit, set the model to `composer` or an explicit paid model.

The composer model is mapped from `{ providerID, modelID }` to the generation API's `{ providerID, id }`.

### Project context

Only these sources are read:

- `package.json` (name, description, dependency names)
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.windsurfrules`, `CONVENTIONS.md`, `.github/copilot-instructions.md`
- current branch and changed file names (filtered to exclude `node_modules/`)

The directory is resolved from the mounted session first, then the directory supplied by the Desktop window, then the plugin instance location. The result is cached for 5 minutes per directory and limited to `projectContextBudget` characters.

## Privacy and side effects

- The draft is sent only to the provider you connected in OpenCode.
- The plugin does not persist drafts, keys, or credentials.
- It does not send messages, write session history, or occupy the session context window.
- Project context never reads `.env`, `.pem`, `credentials*`, or source files.
- The plugin has no telemetry and no author-operated proxy.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:gui
npm run verify       # typecheck + tests + build + GUI smoke
```

`src/index.ts` is the server part, `src/gui.tsx` is the Desktop GUI bundle, and `src/rpc.ts` is the shared contract.

`scripts/smoke-gui.cjs` loads the built GUI bundle with stubbed host modules and exercises expand, regenerate, undo, settings, pill, and the draft fallback slot.

### Project layout

```text
src/
├── index.ts              server and RPC registration
├── rpc.ts                RPC contract
├── gui.tsx               Desktop GUI entry
├── gui/
│   ├── commands.ts       command palette / slash commands
│   ├── controller.ts     expand, regenerate, undo, versions
│   ├── draft.ts          DOM fallback for Home / drafts
│   ├── failure.ts        RPC error detail
│   ├── pill.ts           composer pill
│   ├── settings.tsx      settings page
│   └── state.ts          per-session version stack
├── optimizer.ts          bypass, cleaning, validation
├── prompts.ts            default and model-family prompts
├── model.ts              model selection
├── project-context.ts    whitelist and budget
└── config.ts             option resolution
```

### CI

The repository includes a GitHub Actions workflow that runs `npm ci` and `npm run verify` on Windows and Ubuntu with Node 20.19 and 22.12.

## Limitations

- The Desktop GUI plugin API is experimental. Pin `@opencode/plugin` to the OpenCode version you run.
- The Home/draft DOM fallback is best-effort and not an official composer API.
- `composer.setText()` replaces text and keeps attachments, but it cannot rewrite `@` mention parts. Drafts containing `@path` are skipped.
- There is no TUI implementation.
- A slow model can exceed `timeoutMs`; raise it if your provider is slow.

## FAQ

### Is this a TUI plugin?

No. It uses the OpenCode Desktop GUI composer API. The terminal TUI is not supported.

### Does it send the prompt automatically?

No. The plugin only reads the composer, writes the expanded text back, and leaves Enter to you. It does not create session messages or write conversation history.

### Which model does it use?

By default, `auto` prefers the composer model, then the session model, then the server default, then a cheap chat model. You can also set `composer` or an explicit `provider/model` in settings.

### Why are there no default keyboard shortcuts?

Shortcuts are user-specific and can conflict with host bindings. The commands are registered in **Settings > Shortcuts**; assign the ones you want.

### Why does the new-session page use a bottom button instead of a composer pill?

OpenCode does not expose an official composer API on Home or draft sessions. The bottom button is a best-effort DOM fallback and is marked experimental. Once the first message creates a mounted session, the normal composer pill is used.

### Does it support `@` file mentions?

Drafts containing `@path` references are skipped because rewriting the text can desynchronize mention attachments. Plain email addresses are not treated as mentions.

### Does it store my prompts?

No. Drafts are not persisted by the plugin. The version stack is in memory for the current window only.

### What happens when expansion fails?

The original composer text is left unchanged. The toast includes the server `code` and `message` when available, such as timeout, model, or validation failure.

### Is it free?

The plugin is MIT-licensed. You pay your own model provider for generation; there is no author-operated proxy or telemetry.

### How is it different from a generic prompt optimizer?

It works inside the OpenCode Desktop composer, writes back in place, keeps a small version stack, and can use the model you already selected. It does not require copying prompts into another chat window.

## Sponsor

If this plugin saves you time, you can support maintenance and testing through Buy Me a Coffee:

[buymeacoffee.com/connory](https://buymeacoffee.com/connory)

[![Buy Me a Coffee QR code](assets/bmc-qr.png)](https://buymeacoffee.com/connory)

Scan the QR code or use the link. Support is optional; the plugin remains MIT-licensed.

## License

MIT
