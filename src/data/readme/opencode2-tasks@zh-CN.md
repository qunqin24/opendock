# opencode2-tasks

**OpenCode V2 的任务清单插件：让 Agent 调用 `tasks` 工具维护计划，并在 TUI 侧边栏实时渲染可折叠、可嵌套的任务列表。**

[![CI](https://github.com/smallnest/opencode2-tasks/actions/workflows/ci.yml/badge.svg)](https://github.com/smallnest/opencode2-tasks/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode2-tasks.svg)](https://www.npmjs.com/package/opencode2-tasks)
[![license](https://img.shields.io/npm/l/opencode2-tasks.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/opencode2-tasks.svg)](./package.json)

[English](./README.md) · **简体中文**

![OpenCode 侧边栏中的 Tasks 面板](./docs/screenshot.png)

## 简介

长任务跑起来之后，如果计划一直不可见，就很难判断它到底做到哪一步了。OpenCode 自带会话级的任务工具，但状态只存在于对话记录里。这个插件让计划**落盘、可折叠、一眼能看**：

- **服务端入口（`index.ts`）** 注册 `tasks` 工具。Agent 每次下发**完整**列表，插件负责校验并按会话写入磁盘。
- **TUI 入口（`tui.tsx`）** 读取这些文件，在侧边栏（`sidebar.content`）渲染，支持子任务缩进、状态标记和主题配色。

两个入口运行在不同的运行时里，因此共用一个零依赖的模型模块（`src/tasks.ts`），存储格式不会各自为政。

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  OpenCode 服务端（Agent）     │        │  OpenCode TUI（侧边栏）       │
│                              │        │                              │
│  tasks 工具 ──► normalize ───┼──┐  ┌──┼──► flatten ──► <Tasks />     │
└──────────────────────────────┘  │  │  └──────────────────────────────┘
                                  ▼  │
                    $XDG_STATE_HOME/opencode-tasks/<session>.json
```

## 特性

| 特性 | 说明 |
| --- | --- |
| 🧩 **`tasks` 工具** | 一次调用即整体替换列表，模型不必自己 diff 或删除。 |
| 🧭 **内置 skill** | 自带 `task-planning` skill，模型会主动建清单，而不用等人提醒。 |
| 🌲 **嵌套任务** | 设置 `parent_id`，子任务会缩进显示在父任务下方。 |
| 🎨 **状态配色** | `done` / `blocked` / `in_progress` / `pending` / `cancelled`，取当前主题的语义色。 |
| 📁 **按会话存储** | XDG 状态目录下的纯 JSON，可自行查看、备份或删除。 |
| 🔒 **防御式归一化** | 未知状态、缺失字段、重复 id、父子成环都不会让渲染出错。 |
| 🗂️ **可折叠面板** | 点击 `Tasks` 标题即可折叠，行为与内置 MCP 区块一致。 |
| ⚡ **无需构建** | 直接以 TypeScript 源码分发，OpenCode 直接加载。 |

## 环境要求

- **OpenCode V2**（开发基于 `v2.0.18`）。
- **Node.js ≥ 22.18**（开发用；依赖原生类型擦除与内置测试运行器）。
- 支持 `XDG_STATE_HOME`；未设置时，状态存放在 `~/.local/state`。

## 安装

### 用 OpenCode 命令行安装

```bash
opencode plugin add opencode2-tasks   # 安装并写入全局配置
opencode reload                       # 无需重启服务即可生效
```

`opencode plugin add` 写的是**全局**配置，装完后所有项目都可用。只想在某个项目里启用，就别用 `add`，直接改该项目的 `opencode.json(c)`（见下一节）。

其余子命令：

```bash
opencode plugin list                        # 当前加载了哪些插件、来自哪里
npm view opencode2-tasks version            # 查最新版本号
opencode plugin add opencode2-tasks@x.y.z   # 固定版本
opencode plugin check                       # 是否有新版本
opencode plugin update                      # 升级到最新版
opencode plugin remove opencode2-tasks      # 卸载
```

`./tui` 导出会被自动发现，侧边栏面板随同一次注册一起加载。

### 手动编辑配置

```jsonc
// ~/.config/opencode/opencode.jsonc（全局）或 ./opencode.jsonc（项目级）
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-tasks"] // 追加 "@x.y.z" 即可固定版本
}
```

如果 OpenCode 连接的是**远程服务端**，请同时在仅 CLI 配置中注册本包，保证面板在本地也能工作：

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode2-tasks"]
}
```

### 从本地目录安装

```jsonc
{
  "plugins": ["/absolute/path/to/opencode2-tasks"]
}
```

**npm 包和本地目录只能二选一，不要同时注册**：否则插件会加载两次，`tasks` 工具和 `task-planning` skill 各注册两遍。

改完后用 `opencode reload` 生效；如果是在服务运行期间改的配置，也可以重启服务（`opencode service restart`）。

## 使用

安装后，Agent 会获得一个 `tasks` 工具。一次调用替换整个列表：

```json
{
  "tasks": [
    { "id": "T1", "status": "in_progress", "summary": "梳理任务模型" },
    { "id": "T1.1", "parent_id": "T1", "status": "done", "summary": "归一化工具入参" },
    { "id": "T1.2", "parent_id": "T1", "status": "pending", "summary": "增加成环保护" },
    { "id": "T2", "status": "blocked", "summary": "等待评审" }
  ]
}
```

侧边栏会显示为：

```
▼ Tasks
[~] T1 梳理任务模型
[x]   T1.1 归一化工具入参
[ ]   T1.2 增加成环保护
[!] T2 等待评审
```

### 工具参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `tasks` | `array` | ✅ | **完整**列表，用于整体替换上一次的结果。 |
| `tasks[].id` | `string` | ✅ | 简短唯一 id，例如 `T1`、`T1.1`。 |
| `tasks[].status` | `string` | ✅ | `pending`、`in_progress`、`blocked`、`done`、`cancelled` 之一。 |
| `tasks[].summary` | `string` | ✅ | 一行任务描述。 |
| `tasks[].parent_id` | `string` | | 父任务 id，用于嵌套；留空或省略表示顶层任务。 |

### 状态说明

| 状态 | 标记 | 颜色 |
| --- | --- | --- |
| `pending` | `[ ]` | 弱化色 |
| `in_progress` | `[~]` | 警告色 |
| `blocked` | `[!]` | 错误色 |
| `done` | `[x]` | 成功色 |
| `cancelled` | `[-]` | 弱化色 |

不在枚举内的状态会被归一化为 `pending`。

### 内置 skill

安装插件时会一并注册 `task-planning` skill。工具只给了模型**能力**，skill 补的是**规范**：什么时候该建清单（≥3 步、跨阶段、多次工具调用）、每一项的颗粒度、什么时候用嵌套、状态多久刷一次，以及收尾不许留 `pending`。

skill 由 `index.ts` 通过 `ctx.skill.transform` 注册，不需要额外安装或配置。`skills/task-planning/SKILL.md` 是唯一真相来源，插件启动时读取它，把去掉 frontmatter 的正文交给 OpenCode。

**不要**再把这份文件复制到 `~/.config/opencode/skills/` 或 `~/.agents/skills/`。两个来源会定义同一个 skill id，谁生效取决于注册顺序——内容一模一样，没必要引入这种不确定性。

## 工作原理

### 两个入口，一个模型

```
index.ts ─┐                      ┌─ OpenCode 服务端运行时（工具 + skill）
          ├── src/tasks.ts ─────┤
tui.tsx  ─┘                      └─ OpenCode TUI 运行时（侧边栏面板）
```

- `src/tasks.ts` 与 `src/skill.ts` 存放类型、存储路径和纯函数（`normalizeTasks`、`flattenTasks`、`parseSkillDocument`）。两者都**不引用任何 OpenCode API**，因此可以独立做单元测试。
- `index.ts` 引用它们并注册 `tasks` 工具和内置 skill。它对 `@opencode/plugin` 只使用 `import type`：服务端运行时自行解析该模块，类型导入在加载时会被擦除，而导出的对象本身已经满足 `{ id, setup }` 契约。
- `tui.tsx` 引用模型并渲染面板。侧边栏是同步渲染、而工具在另一个进程写盘，因此以 1.5 秒为间隔轮询状态目录，并在 `setup` 返回清理函数停掉定时器。点击区块标题会立即重读，展开时不会看到过期快照。

完整设计说明见 [`docs/architecture.md`](./docs/architecture.md)。

### 存储位置

```
$XDG_STATE_HOME/opencode-tasks/<url-encoded-session-id>.json
# 未设置 XDG_STATE_HOME 时：
~/.local/state/opencode-tasks/<url-encoded-session-id>.json
```

每个文件是一个任务 JSON 数组：

```json
[
  { "id": "T1", "parent_id": null, "status": "in_progress", "summary": "梳理任务模型" }
]
```

写入粒度保证读到半个文件时会被跳过；任务 id 经过 `encodeURIComponent` 转义，可安全用作文件名。

### 按会话隔离

任务清单是**按会话**的，面板只显示当前会话的那一份：

- 每个会话有独立文件，文件名就是会话 id。**新开会话就是一份空清单**，不会继承上一个会话的任务。
- 当前会话没有任务时 `Tasks` 区块不渲染；Agent 一旦写入就出现，清单被清空后又会消失。
- 面板会把**所有**会话的清单镜像到内存，所以切换会话是立即重绘、不用等重读；后台轮询和点击标题重读负责让这些镜像保持最新。
- 删掉某个会话的文件只影响那个会话。

## 开发

```bash
npm install          # 安装开发依赖
npm test             # 运行单元测试（node:test）
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
npm run check        # 类型检查 + 格式检查 + 测试（CI 运行的就是这一条）
```

### 目录结构

```
.
├── index.ts                 # 服务端入口：注册 `tasks` 工具与 skill
├── tui.tsx                  # TUI 入口：渲染侧边栏面板
├── src/
│   ├── tasks.ts             # 共享模型、存储路径、纯函数
│   └── skill.ts             # SKILL.md 的 frontmatter/正文解析
├── skills/
│   └── task-planning/
│       └── SKILL.md         # 启动时注册的计划 skill
├── test/
│   ├── tasks.test.ts        # 针对纯函数与存储的单元测试
│   └── skill.test.ts        # 针对 skill 解析器的单元测试
├── docs/
│   ├── architecture.md      # 双运行时设计的深入说明
│   └── screenshot.png       # 真实会话中的面板截图
├── .github/                 # CI 工作流、issue 与 PR 模板
├── package.json
├── tsconfig.json
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

### 本地验证

把本地目录加入 `plugins` 后重启 OpenCode，让 Agent 更新一次任务列表，侧边栏应出现 `Tasks` 区块。也可以直接查看原始状态：

```bash
cat "${XDG_STATE_HOME:-$HOME/.local/state}/opencode-tasks/"*.json
```

## 常见问题

**面板没有出现。**
`Tasks` 区块只在当前会话至少有一个任务时才渲染。先让 Agent 调用 `tasks` 工具，再等一个刷新周期（1.5 秒）。修改 `plugins` 后需要重启服务：`opencode service restart`。

**面板数据是旧的。**
TUI 每 1.5 秒重读状态目录，点击 `Tasks` 标题也会立即重读——手工改过任务文件的话，展开区块（或等一个周期）即可。

**`Tasks` 区块的行数比预期少。**
读不出的、或只写了一半的文件会被跳过，而不是让整块面板空白；而且每行只属于当前会话。用 `cat "${XDG_STATE_HOME:-$HOME/.local/state}/opencode-tasks/"*.json` 看看实际存了什么。

**报错 `Cannot find module '@opencode/plugin'`。**
`index.ts` 中的该导入是纯类型导入，运行时会被擦除。如果报错来自 `tui.tsx`，说明当前 OpenCode 版本还无法解析 `@opencode/plugin/tui`，请升级到支持的版本，或固定到兼容版本。

**`task-planning` skill 出现了两次，或者根本没出现。**
正常情况下它只应来自插件。请检查 `~/.config/opencode/skills/`、`~/.agents/skills/`、`.opencode/skills/` 下是否有人工复制或软链的副本，有就删掉。如果完全没有，说明安装时没有带上 `skills/` 目录——重新安装，或把 `skills/task-planning/SKILL.md` 复制到上述任一发现目录作为兜底。

## 参与贡献

欢迎提交 issue 和 PR，请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与[行为准则](./CODE_OF_CONDUCT.md)。提交前请确保 `npm run check` 通过。

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

[MIT](./LICENSE) © 2026 smallnest
