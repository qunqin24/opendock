<div align="center">

# opencode-prompt-optimization

**Expand rough drafts into structured prompts — in place, inside the OpenCode Desktop composer.**

[![CI](https://github.com/rwjxrj/opencode-prompt-optimization/actions/workflows/ci.yml/badge.svg)](https://github.com/rwjxrj/opencode-prompt-optimization/actions/runs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![OpenCode Desktop](https://img.shields.io/badge/OpenCode_Desktop-2.2.5-8b5cf6)

[English](README.md) · [简体中文](docs/README.zh-CN.md)

![opencode-prompt-optimization featured banner](assets/featured.png)

</div>

The plugin is a small OpenCode Desktop extension: it reads the current draft, asks your own connected model to expand it, writes the result back into the composer, and leaves the send action to you. It never sends a message, never writes session history, and never proxies model credentials.

**Status:** experimental, published to npm as `opencode-prompt-optimization@0.2.0`, plus the changes listed under *Unreleased* in [CHANGELOG.md](CHANGELOG.md). The OpenCode Desktop GUI plugin API is still marked experimental upstream; pin the OpenCode version you test against.

**Who it is for:** OpenCode Desktop users who write natural-language prompts and want a more structured first draft without leaving the composer. It is not a TUI plugin and it does not send messages for you.

## Screenshots

| Composer, idle | Composer, expanding |
|---|---|
| ![composer with the expand button left of send](assets/screenshots/composer-idle.png) | ![gradient composer border while the model works](assets/screenshots/composer-loading.png) |

The button sits left of the send button. The draft above is the one expanded in [Example output](#example-output).

![Prompt Optimization settings page](assets/screenshots/settings-en.png)

## What it does

- Turns vague requests into prompts with scope, constraints, output format, and acceptance criteria.
- Writes the result back into the composer so you can edit it before sending.
- Keeps up to five generated versions in memory for the current window.
- Adds toast actions for **Undo** and **Regenerate**.
- Can read a small, whitelisted set of project facts to make the expansion more specific.
- Supports a concise mode (~800 characters) and a full-expansion mode.
- Ships English and Simplified Chinese UI text.
- Ships an optional **session outline** panel that lists your messages on the right and scrolls to one when clicked.

It does not:

- send the prompt
- modify session history
- read `.env`, keys, or source files
- call any server other than your own model provider

## Requirements

- OpenCode Desktop **2.2.5** (the version this release was built and tested against)
- Node.js **^20.19.0 or >=22.12.0** and npm, if you build from source
- A provider/model connected in OpenCode. The plugin uses your own provider account (BYOK).

The TUI is not supported. The GUI composer API used here is only available in OpenCode Desktop.

## Install

Add the plugin to the **global** OpenCode config; Desktop reads GUI plugins only from the global file:

- macOS / Linux: `~/.config/opencode/opencode.jsonc`
- Windows: `C:\Users\<you>\.config\opencode\opencode.jsonc`

### From npm (recommended)

```bash
opencode plugin add opencode-prompt-optimization
```

To pin the version, append it: `opencode plugin add opencode-prompt-optimization@0.2.0`. A bare name stays on the version it installed; `opencode plugin update` moves it to the latest release.

Or configure it by hand:

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "opencode-prompt-optimization",
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

Without options, the bare string form is enough:

```jsonc
{
  "plugins": ["opencode-prompt-optimization"]
}
```

### With npm directly

`opencode plugin add` installs the package with npm for you. If you manage the install yourself:

```bash
npm install opencode-prompt-optimization@0.2.0
```

Then list the installed directory by absolute path, because OpenCode does not scan `node_modules` on its own:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/node_modules/opencode-prompt-optimization",
      "options": { "mode": "concise" }
    }
  ]
}
```

### From source

```bash
git clone https://github.com/rwjxrj/opencode-prompt-optimization.git
cd opencode-prompt-optimization
npm ci
```

`npm ci` runs the `prepare` script, which builds `dist/`. You can also run `npm run build` explicitly.

The build produces:

```text
dist/index.js              server part
dist/rpc.js                RPC contract
dist/gui-experimental.cjs  Desktop GUI bundle
```

Point the global config at the checkout:

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-prompt-optimization",
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
"package": "D:/path/to/opencode-prompt-optimization"
```

### Reload and confirm

Reload the Desktop window or restart OpenCode Desktop. The GUI bundle is loaded at window start; reloading only the server is not enough after a first install.

- **Settings > Extensions > Plugins** shows `prompt-optimization` as enabled.
- The command palette has **Expand prompt**.
- Every composer shows the expand icon button left of the send button; hover it for **Optimize prompt**.

## Usage

1. Write a draft in the composer, for example:
   `帮我做一个数据看板，包含筛选和导出`
2. Click the icon left of the send button, run **Expand prompt** from the command palette, or type `/expand <text>`.
3. The composer shows a moving gradient border while the model works; on success the icon turns into a green check, the border flashes green once, and both settle back to idle after about 1.5 s.
4. Review or edit the result, then press Enter yourself.

### References and commands

`@file` mentions, attached references and a leading `/command` are masked as `[[ref1]]`, `[[ref2]]` before the model call and restored verbatim afterwards, so only your prose is rewritten. Mentions stay real chips after expansion, undo and version switches, wherever they sit in the sentence. A placeholder may be reused when the rewrite refers to the same file again, but every reference must survive and no new one may appear; otherwise nothing is written and the toast says so.

### Entry points

| Entry | How |
|---|---|
| Toolbar icon | Click the icon left of the composer's send button (hover shows **Optimize prompt**) |
| Command palette | Search `Expand prompt` |
| Slash command | `/expand <text>` |
| Regenerate | Toast action, or command palette **Regenerate prompt** |
| Restore original | Toast **Undo**, or command palette **Restore original prompt** |
| Previous / next version | Command palette **Previous expanded version** / **Next expanded version** |
| Toggle mode | Command palette **Toggle expansion mode** |
| Session outline | Command palette **Toggle session outline**, or the side panel `+` menu |
| Settings | Command palette **Prompt Optimization settings** |

There are **no default keyboard shortcuts**. Commands are registered in **Settings > Shortcuts**; assign your own:

```text
prompt-optimization.expand
prompt-optimization.regenerate
prompt-optimization.restore
prompt-optimization.previous
prompt-optimization.next
prompt-optimization.mode
prompt-optimization.outline
prompt-optimization.settings
```

### Versions

- Up to 5 generated versions per draft, in memory for the current window.
- Editing the draft resets the version stack; the next expansion starts from the edited text.
- Toast actions are guarded: if you switched sessions or edited the text, Undo will not overwrite your changes.
- The failure toast includes the server `code` and `message` when available, so timeout, model, and validation failures are distinguishable.

## Example output

Draft, typed as-is:

> 帮我做一个数据看板，包含筛选和导出

With **Project context** on, one run (concise mode) returned this:

<details>
<summary>Expanded prompt</summary>

```markdown
## 目标
开发一个数据看板页面，支持对看板数据进行筛选和导出。

## 范围
- 做：数据看板的核心页面，含数据展示、筛选功能、导出功能。
- 不做：用户登录鉴权、后台管理、数据源搭建与数据库设计、移动端适配优化。

## 上下文
- 项目已依赖 @aliou/pi-guardrails、@oh-my-pi/pi-coding-agent、pi-hermes-memory，具体如何使用由实现方判断。
- 看板要展示的具体数据指标、数据来源、导出格式均未指定。
- 项目有 code-review-graph 知识图谱工具，探索代码时应优先使用图谱工具而非 Grep/Glob/Read。

## 要求
1. 看板需展示关键数据指标，具体指标以现有数据为准。
2. 提供筛选能力，至少支持按时间范围筛选，其他筛选维度可按数据特点扩展。
3. 筛选后看板中的所有图表和数据需同步更新。
4. 提供导出功能，将当前筛选结果下的看板数据导出为文件。
5. 界面简洁可用，筛选控件和导出按钮位置清晰。
6. 涉及不确定的第三方库 API 时，先查证官方文档，不确定处标注「未验证」。

## 产出
- 可运行的看板页面代码，含必要的组件划分。
- 附简短说明：如何启动、如何配置数据来源。
- 长度以覆盖上述功能为准，不强制页数。

## 验收
- 页面可正常打开并展示数据。
- 更改筛选条件后数据正确刷新。
- 导出的文件内容与当前筛选结果一致且可正常打开。
```

</details>

The draft named one feature. The result states the goal, what is in and out of
scope, the project facts that matter (existing dependencies, the
code-review-graph preference), numbered requirements, deliverables, and
acceptance checks you can verify yourself. `未验证` is requirement 6 in action:
the model flags a third-party API it has not checked instead of inventing one.

## How the button is mounted

The Desktop GUI API has no composer-toolbar slot, so the expand icon button is a **best-effort DOM injection**: it finds the composer's submit button (`[data-action=composer-submit]` inside `[data-slot=composer-actions]`), inserts itself directly left of it, and re-mounts when the host re-renders.

On Home and on a draft session `ctx.screen.current()?.composer` and `Sessions.current()` are `undefined`, so reading and writing the draft uses a second **DOM adapter**:

- it finds the bottom-most visible `textarea`, text input, or contenteditable;
- it reads and writes that element directly;
- it only runs when there is no mounted session;
- it is hidden on Settings and other plugin pages.

Impact and limits:

- Neither part is an official OpenCode API and both may break if the Desktop composer DOM changes.
- It may fail on a complex rich-text composer or if the editor changes during the model call.
- Mentions survive expansion there too when the editor uses the host composer; a plain `<textarea>`/`<input>` fallback writes `@path` text instead.
- The draft has no composer model, so the model comes from the server default or your configured model.
- Disable the draft adapter with `draftFallback: false` if you only want to expand in mounted sessions.

## Session outline (experimental)

Off by default. Turn it on in **Settings > Prompt Optimization**, then run **Toggle session outline** or pick **Session outline** from the side panel's `+` menu.

- Lists your own messages for the current session, numbered, with markdown markers stripped.
- Clicking an entry scrolls the timeline to that message and highlights the entry that follows the reading position.
- **Load earlier** pulls older pages through the official message store when a message is not rendered yet.
- **Latest** returns to the bottom of the timeline.

It also depends on host internals: the timeline exposes `data-message-id` rows and `message-<id>` anchors, but neither is a documented plugin API. The plugin degrades to a "message not loaded" toast instead of guessing a scroll position. Expect to re-check it after an OpenCode upgrade.

## Settings

Open **Settings > Prompt Optimization**, or run **Prompt Optimization settings** from the command palette (command `prompt-optimization.settings`).

| Setting | Description |
|---|---|
| Mode | `concise` (~800 chars) or `full` |
| Model | Full-width picker: search a connected provider/model, or type `provider/model` and use it directly |
| Thinking | Reasoning effort for expansions; empty follows the composer's variant |
| Project context | Read `package.json`, rule files, and git status |
| Session outline | Experimental right-side message list with click-to-scroll |
| Toolbar animation | Animate the icon while a draft is expanded (on by default) |

The model picker loads the provider catalog over the plugin's `catalog` RPC, so the GUI stays on public plugin APIs. Leaving it empty shows a muted placeholder and follows `opencode.jsonc`; `auto` and `composer` are preset pills in the picker.

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
| `minChars` | `10` | Below this, skip (the whole draft, references included) |
| `maxPromptChars` | `6000` | Above this, skip |
| `skipPatterns` | built-in | Array of regex strings; replaces the built-in list |
| `projectContext` | `true` | Read project facts |
| `projectContextBudget` | `2048` | Character budget for injected context |
| `draftFallback` | `true` | Enable the DOM fallback on Home / new-session drafts |
| `prompts` | built-in | Map of glob → prompt; `*gpt*` and `*claude*` included |

### Model selection

- `composer` uses the model currently selected in the composer.
- `auto` prefers the composer model, then the session model, then the server default, then a cheap chat model.
- Explicit `provider/model` is used as-is.
- The settings picker writes `provider/model`, `auto`, `composer`, or empty back into the same field.
- The Thinking selector in the picker toolbar lists the model's variants (from its `reasoningEffort` settings). Empty follows the composer; a chosen value is sent as the request's `variant`, and the picker trigger shows the current value (`Follow composer` when empty).

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
- The plugin has no telemetry and no maintainer-operated proxy.

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

`scripts/smoke-gui.cjs` loads the built GUI bundle with stubbed host modules and exercises expand, regenerate, undo, settings, toolbar and style registration, and the session outline panel.

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
│   ├── toolbar.ts        composer toolbar button (DOM injection)
│   ├── settings.tsx      settings page
│   ├── catalog.ts        provider catalog helpers for the picker
│   ├── outline.ts        session outline panel
│   └── state.ts          per-session version stack
├── optimizer.ts          bypass, cleaning, validation
├── prompts.ts            default and model-family prompts
├── model.ts              model selection
├── project-context.ts    whitelist and budget
└── config.ts             option resolution
```

### CI

The repository includes a GitHub Actions workflow that runs `npm ci`, `npm run verify`, and `npm pack --dry-run` on Windows and Ubuntu with Node 20.19 and 22.12.

## Limitations

- The Desktop GUI plugin API is experimental. Pin `@opencode/plugin` to the OpenCode version you run.
- The composer toolbar button and the Home/draft fallback are best-effort DOM code, not official APIs.
- `composer.setText()` replaces text and keeps attachments, but it flattens `@` mention chips into text. The plugin therefore writes the `[data-component="composer-editor"]` DOM directly to keep the mention spans; if that editor is not found it falls back to `setText` and references become plain `@path` text.
- The Thinking selector appears only after an explicit model is picked: the settings page cannot read the composer's model on the settings route, so `auto` / `composer` / empty always mean "follow the composer".
- There is no TUI implementation.
- The session outline depends on undocumented timeline attributes (`data-message-id`, `message-<id>`). Unrendered messages are located by briefly scrolling the virtualised timeline; if the message is older than the loaded history, load earlier pages first.
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

### Why is the button injected into the composer instead of using a plugin slot?

The Desktop GUI API has no slot inside the composer toolbar. The plugin finds the send button in the composer DOM and inserts an icon button before it. If the host markup changes, the button stays hidden until a composer is matched again.

### Does it support `@` file mentions?

Yes. Mentions are masked before the model call and restored as real chips afterwards, wherever they sit in the sentence, including after undo and version switches. Plain email addresses are not treated as mentions.

### Does it store my prompts?

No. Drafts are not persisted by the plugin. The version stack is in memory for the current window only.

### What happens when expansion fails?

The original composer text is left unchanged. The toast includes the server `code` and `message` when available, such as timeout, model, or validation failure.

### Is it free?

The plugin is MIT-licensed. You pay your own model provider for generation; there is no maintainer-operated proxy or telemetry.

### How is it different from a generic prompt optimizer?

It works inside the OpenCode Desktop composer, writes back in place, keeps a small version stack, and can use the model you already selected. It does not require copying prompts into another chat window.

## License

MIT

This project is a modified derivative of
[opencode-prompt-expand](https://github.com/ConnorYyy/opencode-prompt-expand)
by ConnorYyy, used under the MIT License. The original copyright notice is
retained in [LICENSE](LICENSE).
