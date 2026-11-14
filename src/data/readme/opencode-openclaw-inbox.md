# opencode-openclaw-inbox

An OpenCode Desktop GUI plugin that gives tasks dispatched by another agent (OpenClaw, a script, a cron job) their own inbox, instead of piling them into Home and the session lists. The inbox lives in the macOS menubar, so you can see what your agents are doing without switching to OpenCode.

![Menubar item showing one running and two unread tasks](https://raw.githubusercontent.com/PeberWang/opencode-openclaw-inbox/master/docs/menubar.png)

![The session header badge and its task list](https://raw.githubusercontent.com/PeberWang/opencode-openclaw-inbox/master/docs/inbox-dropdown.png)

- **Dispatch** with `opencode run --archived --title "🦞 <task>" "<prompt>"`. `--archived` keeps the session out of Home and the session lists; the `🦞 ` title prefix puts it in the inbox.
- **Session header badge**: a quiet `🦞 ●1 ●2` at the top right of the session title row, beside the context usage. It shows a colored count only for tasks that are running, unread or failed. Click it for a list of every task: status, project and age, in a fixed-height list that scrolls. Click a row to open the task as a tab, which also marks it read.
- **macOS menubar item**: `🦞 🟡1 🟢2` stays in the menubar while OpenCode Desktop runs, even with its windows closed. Click a task in its menu and OpenCode comes forward on that session. A native menu cannot scroll, so it lists 15 tasks (running, failed and unread first, then the most recent) and ends with a "N more" row; the header list in the window has them all.
- **Get notified** when a task finishes: a system notification, or a toast while the window has focus.
- **Take over**: send a message from the desktop composer in an archived task and the plugin unarchives it, so it becomes a regular session. Home lists it under **All projects** or under its own project. Follow-ups from the dispatcher (`opencode run -s <id> "..."`) keep it archived.
- **Command palette**: "Open OpenClaw inbox" lists the same tasks from anywhere.

Read tasks leave the inbox after 24 hours by default. Anything running, unread or failed stays until you have seen it.

## Install

```bash
opencode plugin add opencode-openclaw-inbox
```

GUI parts load only from the global config (`~/.config/opencode/opencode.jsonc`), which `opencode plugin add` writes to. To set options, use the object form:

```jsonc
{
  "plugins": [{ "package": "opencode-openclaw-inbox", "options": { "locale": "zh", "days": 3 } }],
}
```

| Option   | Default         | Meaning                                       |
| -------- | --------------- | --------------------------------------------- |
| `prefix` | `"🦞"`          | Title prefix that marks a dispatched task     |
| `days`   | `1`             | Days a read task stays in the inbox           |
| `max`    | `15`            | Tasks in the menubar menu; the rest sit behind a "N more" row that opens OpenCode |
| `locale` | `"en"`          | `"en"`, `"zh"`, or `"auto"` to follow OpenCode |

## Using it with OpenClaw (or any agent)

A task only reaches the inbox if it is started with **both** `--archived` and the title prefix. Agents forget one of them more often than you would expect, especially smaller models that rebuild the command from memory. So instead of describing the convention in a prompt, give the agent a script that applies it:

```bash
d=~/.openclaw/workspace/skills/opencode-dispatch
base=https://raw.githubusercontent.com/PeberWang/opencode-openclaw-inbox/v0.3.1/integrations/openclaw/opencode-dispatch
mkdir -p "$d/scripts"
curl -fsSL "$base/SKILL.md" -o "$d/SKILL.md"
curl -fsSL "$base/scripts/opencode-dispatch" -o "$d/scripts/opencode-dispatch"
chmod +x "$d/scripts/opencode-dispatch"
openclaw skills info opencode-dispatch   # should say Ready
```

No clone needed; the URLs are pinned to a release tag, so you get exactly the reviewed files. From a checkout, `cp -R integrations/openclaw/opencode-dispatch ~/.openclaw/workspace/skills/` does the same.

That installs an OpenClaw skill with `scripts/opencode-dispatch`, a thin wrapper around `opencode run`. A new task always gets `--archived` and the prefix (a task without `--title` is refused); follow-ups with `-s <id>` pass through unchanged. Other agents can call the script the same way.

Then add a line like this to the agent's standing instructions (for OpenClaw, the workspace `AGENTS.md`):

> To hand work to OpenCode, always run `~/.openclaw/workspace/skills/opencode-dispatch/scripts/opencode-dispatch --title "<task>" ...` from the project directory. Never call `opencode run` directly for a new task.

If a task still slips through, fix it in place: `opencode api patch /api/session/<id> --data '{"title":"🦞 <task>","archived":true}'`.

## Develop

Load a local checkout by path instead of the package name, then rebuild on save:

```bash
npm install
npm run dev     # the desktop app reloads the GUI and the menubar item on every build
npm test
```

## How it works

- Tasks are root sessions whose title starts with the prefix, read from the desktop app's own server (`sidecar`). The window refreshes on session events and every 20 seconds; the main process follows the server's event stream and polls every 30 seconds.
- Status comes from the session itself: `time.busy` / `time.idle` for running, `time.viewed` for read, `outcome` for failure.
- The menubar item lives in the plugin's `main` part (Electron `Tray`). A click hands the session to a window through a typed `Ipc` state, so a window that opens late still receives it; with no window open, the app's own activate handler restores one first.
- Take-over detection: the desktop composer sends admission metadata with every prompt and `opencode run` sends none, so an enqueued user prompt with metadata, or one sent into the session the focused window is showing, unarchives the task through `PATCH /api/session/{id}`. The server plugin API ignores `archived` (anomalyco/opencode#61038), so this lives in the GUI part.
- Home lists one project at a time unless **All projects** is selected, so a taken-over task in a project you never opened appears there, not under the project you work in.

## Notes

- On a Mac with a notch, macOS hides menubar items that do not fit beside a long app menu. ⌘-drag `🦞` toward the clock to keep it visible.
- The menubar item is macOS only; the header badge works on every platform.
- Requires OpenCode Desktop 2.2.7 or newer. The GUI plugin API is experimental and may change between releases.

## 中文说明

给 OpenCode 桌面版加一个「OpenClaw 任务收件箱」：OpenClaw（或任何脚本）用 `opencode run --archived --title "🦞 任务名"` 派的活不再堆进主页，而是进收件箱。会话标题栏右上角有一个安静的 `🦞` 徽标，点开是可滚动的任务列表；macOS 菜单栏常驻 `🦞` 计数，点任务直接跳回 OpenCode 的对应会话。你在桌面端接手发消息时，任务自动转为普通会话，在主页「所有项目」里能找到。已读任务默认只保留 24 小时，未读和失败的一直保留到你看过为止。给 OpenClaw 用时，用上面「Using it with OpenClaw」一节的命令把 `opencode-dispatch` 技能装进 `~/.openclaw/workspace/skills/`（不用克隆仓库），并在 `AGENTS.md` 里要求它只用其中的 `opencode-dispatch` 脚本派活：脚本会强制加上 `--archived` 和 `🦞 ` 前缀，避免模型漏写导致任务进不了收件箱。界面默认英文，在插件选项里设 `"locale": "zh"` 切换为中文，设 `"auto"` 跟随 OpenCode 的界面语言。

## License

MIT
