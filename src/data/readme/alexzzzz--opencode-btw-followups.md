# @alexzzzz/opencode-btw-followups

An OpenCode plugin that gives side questions a thread of their own.

[![npm](https://img.shields.io/npm/v/@alexzzzz/opencode-btw-followups)](https://www.npmjs.com/package/@alexzzzz/opencode-btw-followups)

## Contents

- [What does it do?](#what-does-it-do)
- [Why use it?](#why-use-it)
- [Getting started](#getting-started)
  - [Keyboard shortcuts](#keyboard-shortcuts)
- [Working in the window](#working-in-the-window)
  - [Reasoning in side answers](#reasoning-in-side-answers)
- [Things to keep in mind](#things-to-keep-in-mind)
- [Compatibility](#compatibility)
- [Agent instructions](#agent-instructions)
  - [Install](#install)
  - [Update](#update)
  - [Remove](#remove)
- [Release checks](#release-checks)
- [License](#license)

## What does it do?

The plugin replaces OpenCode's built-in `/btw` with a separate window for side questions. It keeps every question and answer in that window and sends the whole thread with each new question. Follow-up questions build on earlier answers, while your main session stays untouched.

## Why use it?

The built-in `/btw` answers one question, then forgets the exchange. A follow-up starts from scratch. Asking a side question in the main session also adds the question and answer to the session's context and transcript, which is not always what you want.

If you only have one question to ask, the built-in `/btw` is all you need.

## Getting started

In the session prompt, type `/btw` followed by your question:

```text
/btw why does the ci fail on the second test?
```

If you'd rather open the window first, run `/btw` on its own, then type your question inside the window.

### Keyboard shortcuts

From a session, you can use these shortcuts:

1. Press `Ctrl+Up` to open the window.
2. Press `Ctrl+Up` again to open the quick prompts. Use `Up` and `Down` to choose one, then press `Enter`, or click a question.
3. Press `Ctrl+Down` to close the quick prompts.
4. Press `Ctrl+Down` again to close the window.
5. Press `Ctrl+Shift+C` to copy the whole side thread. The command palette also has "Copy the whole side thread".

The same shortcuts work in subagent sessions, so you can ask your subagents side questions, too.

![The /btw window with the quick prompts open over a long thread](docs/btw-window.png)

## Working in the window

Ask follow-up questions as you would in a normal chat. Each new question includes the earlier questions and answers, so the model has the context it needs.

Use `PageUp`, `PageDown`, or the mouse wheel to read a long thread. Click a completed part of an answer to copy that section. A click during the answer's reveal copies nothing. To copy the whole thread, press `Ctrl+Shift+C`, choose "Copy the whole side thread" from the command palette, or use `copy thread`. Releasing a text selection over `copy thread` keeps the selection instead of replacing it. To clear the thread, press `Delete` twice while the input field is empty and no answer is active. With text in the field, `Delete` stays a forward delete. It also leaves the thread alone while the quick prompts are open.

The quick prompt list wraps on a narrow terminal. On a short terminal, it uses the rows above the composer and scrolls to keep the chosen prompt visible.

![The btw badge in the status bar](docs/btw-badge.png)

If you close the window while an answer is being prepared, a `btw` badge appears below the input field. Click it to open the window for that session. The badge also appears when questions are waiting or a request has failed. You can close the window at any time and come back to it later.

If an answer is empty or a request throws an error, the queue pauses. The failed question and every question behind it stay visible, and opening the window again keeps the error. Press `Enter` with an empty input field or click `retry question` to retry. Asking a new question also acknowledges the error and resumes the saved queue in order.

### Reasoning in side answers

The header shows how much side answers reason. It reads `reasoning as is` at first, and clicking it asks for the least reasoning the model offers. When the model can turn reasoning off, the label reads `reasoning off`. When it cannot, but has a cheaper level such as `low` or `minimal`, the label names that level instead. The command palette has the same action as "Toggle reasoning in side answers". There is no keyboard shortcut for it.

The setting applies to the next question you ask, including one already waiting in the queue. A request that has already gone out keeps the setting it was sent with. It belongs to the plugin rather than to a session, so every window shows the same value, and it survives closing the window and restarting OpenCode.

Side questions still use your session's model, and your main conversation keeps its own reasoning setting either way. Turning the toggle off asks the provider to skip reasoning when it can, or to use its cheapest cheaper level when it cannot skip reasoning completely. The level comes from the model's own catalogue, and the toast names the level the request will use. Some models offer nothing cheaper than `high`; for those the label reads `reasoning n/a` whatever the toggle says, and clicking it says the model has no useful reasoning level and leaves the setting alone. The question is still asked, and the answer may still think.

## Things to keep in mind

- **Model and context:** The window uses the same model as your session. Each new question sends the whole side thread, so a long thread uses more context. If your session is already close to its context limit, a side question may fail. Side questions and answers stay out of the session's context and transcript.
- **Tools:** The model cannot use tools in the side window. It cannot read files, run commands, or take other actions. If it tries to use a tool, the answer may fail, and the window shows the question that failed.
- **Storage:** Threads are kept in memory only. They are lost when OpenCode stops or when you delete the session.
- **Terminal:** The window needs a terminal that is at least 15 rows tall.

## Compatibility

The minimum tested host is OpenCode 2.0.19 with `@opencode/plugin` 2.0.19, OpenTUI 0.5.12, and Solid 1.9.12. The current tested host is OpenCode 2.4.2 with `@opencode/plugin` 2.4.2, OpenTUI 0.9.9, and Solid 1.9.20.

The package supports OpenCode 2.x hosts that provide OpenTUI `>=0.5.12 <0.10.0` and Solid `>=1.9.12 <2.0.0`. The release smoke installs both tested host sets on Windows and Linux. Versions between the minimum and current tested versions are not each tested separately.

## Agent instructions

### Install

```text
Goal: install @alexzzzz/opencode-btw-followups and make `/btw` use it instead of the built-in command.

1. Run `opencode debug paths config`. Use the printed directory as `<config>`.
2. Run `opencode plugin add @alexzzzz/opencode-btw-followups`.
3. Open `<config>/cli.json` and add `-opencode.btw` to `plugins`. Keep every other entry. This turns off the built-in `/btw`; without it both answer the same command.
4. Run `opencode plugin list` and check that `btw-followups` is listed.
5. Run `opencode reload`.
6. Ask the user to run `/btw` and check that the plugin window opens.

Done when `/btw` opens the plugin window.

The path command reports the directory OpenCode uses, including `XDG_CONFIG_HOME` and `OPENCODE_CONFIG_DIR` when they are set. If `cli.json` is missing, create it with `{"$schema":"https://opencode.ai/v2/cli.json","plugins":["*","-opencode.btw"]}`. If a command fails, report it instead of guessing.
```

### Update

```text
Run `opencode plugin update @alexzzzz/opencode-btw-followups`.
```

### Remove

```text
Goal: remove @alexzzzz/opencode-btw-followups and restore the built-in `/btw`.

1. Run `opencode plugin remove @alexzzzz/opencode-btw-followups`.
2. Run `opencode debug paths config`. Use the printed directory as `<config>`.
3. Open `<config>/cli.json` and remove `-opencode.btw` from `plugins`. Keep every other entry. This lets the built-in `/btw` load again.
4. Run `opencode plugin list` and check that `btw-followups` is gone.
5. Run `opencode reload`.
6. Ask the user to run `/btw` and check that the built-in command opens.

Done when `/btw` opens the built-in command.

If `cli.json` is missing, the built-in `/btw` is already on. If `btw-followups` still appears with a local path, report it and do not delete files. If a command fails, report it instead of guessing.
```

## Release checks

Run the release smoke from a clean checkout before publishing:

```sh
bun install --frozen-lockfile
bun run release:smoke
```

The command runs the typecheck, tests, and build first. It then copies the Git source files to a temporary directory without `dist/`, installs the locked development dependencies, and runs `npm pack`. The `prepack` script builds both public entry points before npm reads the package contents.

The smoke installs the tarball into an empty project for each tested host set. It imports the server and terminal entry points in a plain Bun process, then runs the real OpenCode path command and checks `deploy` and `deploy:check` against temporary config directories. Any failed pack, install, import, or deploy check stops the command. GitHub Actions runs the same smoke on Windows and Linux.

`npm publish` runs the release smoke through `prepublishOnly`, so a failed check stops publication.

## License

[WTFPL v2](LICENSE)
