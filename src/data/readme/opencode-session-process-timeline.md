# opencode-session-process-timeline

Show the **operation timeline** of an OpenCode session — shell commands plus `grep` / `read` / `write` / `edit` (and `glob`) tool calls — in the terminal TUI and the OpenCode Desktop GUI.

一个 OpenCode 插件：在一个会话（session）里展示 agent 用 `shell`、`grep`、`read`、`write`、`edit`（及 `glob`）跑过的**操作时间线**，支持 TUI 和 Desktop GUI。

## Screenshots / 截图

The TUI `/procs` panel (left) and the Desktop Timeline panel (right). Every shell / file / search operation is one row with a type badge, a `working → closed` status, and the agent's intent as the headline.

| TUI `/procs` | Desktop Timeline |
| --- | --- |
| ![TUI process timeline](docs/tui.svg) | ![Desktop timeline](docs/gui.svg) |

## Features / 功能

- **One row per operation, with a type marker** — every shell command and every file/search tool call becomes a single timeline row that goes `working` → `closed`, with a type badge (`›` shell, `⌕` grep, `▤` read, `✎` write, `≡` edit, `*` glob). Once closed the duration is fixed.
  每种操作（shell/grep/read/write/edit/glob）各占一行并带类型标记；状态从运行中 `working` 到结束 `closed`，结束后时长固定。
- **Concise, substantive descriptions** — each row's headline is the agent's narration right before the call (its intent), or a short tool summary; the secondary line carries the key facts: target path / search scope, line range (`L120-200`), char count, and `old→new`.
  标题用执行前的意图说明或工具摘要；副行展示关键事实（目标路径/检索范围、行区间 `L120-200`、字符数、`old→new`）。
- **Filters OpenCode self-commands** — commands that are OpenCode's own operations (`opencode plugin list`, `opencode log`, `opencode api get`, reading `opencode.log` / `opencode.db`) are hidden from the timeline.
  自动过滤 opencode 自身命令（`opencode plugin list`、`opencode log`、`opencode api get`、读取 `opencode.log`/`opencode.db` 等）。
- **Auto-loads in Desktop** — the panel opens automatically for the active session.
  Desktop GUI 打开会话时自动弹出面板；也可用命令 `/procs`。
- Targets the **OpenCode 2.2.x** client API (`message.list`, `event.subscribe`). Check version compatibility.

## Install / 安装

```bash
opencode plugin add opencode-session-process-timeline
```

Or install straight from a git repository:

```bash
opencode plugin add github:vinojeff/opencode-session-process-timeline
```

## Usage / 使用

- **TUI**: run `/procs` to open the "Process timeline" panel.
- **Desktop**: the panel opens automatically for the active session, or open it via the session panel menu / command palette (`/procs`).

Each row shows:

| Field | Meaning |
| --- | --- |
| **Badge** | Operation type: `›` shell, `⌕` grep, `▤` read, `✎` write, `≡` edit, `*` glob |
| **Label** | The agent's narration for call intent, or a concise tool summary (e.g. `grep "timeout" in src`, `read src/config.ts`, `edit src/x.ts`) |
| **Detail** | Key facts: target path / search scope, line range (`L120-200`), char count, `old→new` |
| **State** | `working` (running; elapsed grows) or `closed` (done; fixed), plus `exit N` / `killed` / `timeout` / `error` |
| **Meta** | pid (shell), duration |

## Data source / 数据来源

The plugin reads the last `200` session messages via `client.message.list`, extracts `shell` and file/search tool calls (`grep` / `read` / `write` / `edit` / `glob`), and records each as a single operation row (collapsing `open`/`closed` into one). Shell commands that are clearly OpenCode's own operations are filtered out.

## Development / 开发

```bash
bun install
bun test                 # unit tests
vite build               # build the GUI bundle -> dist/gui-experimental.cjs
```

The GUI part is bundled with `vite` (see `vite.config.ts`) and published via the `./gui-experimental` export; the TUI and server parts are published as `src/` and transpiled by the OpenCode runtime.

## Compatibility / 兼容性

Built against `@opencode/plugin@2.2.5` (OpenCode 2.2.x). The GUI part uses the experimental `gui-experimental` API; the TUI and server parts are more stable. If you target a different OpenCode release, test the installed package (not only a workspace-linked copy) before publishing updates.

**Packaging**: the TUI part renders JSX with OpenTUI, so the package must declare `@opentui/core`, `@opentui/solid`, and `solid-js` as `peerDependencies` (OpenCode provides them at runtime). Do not publish them as `devDependencies` only — they are not installed for consumers and the TUI fails to load with `Cannot find package '@opentui/solid'`.

## License

[MIT](./LICENSE)
