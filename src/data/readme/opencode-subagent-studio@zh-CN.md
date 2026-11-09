# opencode-subagent-studio

[English](README.md) | 简体中文

在 OpenCode Desktop 的设置里管理 OpenCode V2 的子代理：查看、新建、编辑、停用、重命名、删除进回收站；用户级目录实时同步，项目级按需刷新。

> **翻译本 README：** 本文档为中文版，英文版见 [README.md](README.md)。如果你需要其他语言，欢迎用自己的 AI Agent 翻译本 README——正文自包含，便于机器翻译。

> **界面词典说明：** 插件内置 11 种语言的界面词典（English、简体中文、Français、Español、Português do Brasil、Русский、العربية、Deutsch、日本語、हिन्दी、한국어）。词典由 AI 翻译，个别措辞可能有歧义；如有疑问，以英文文案为准。设置入口在各语言下统一显示为 "Subagent"。

> **状态：** 功能已全部完成（基准版本 OpenCode Desktop 2.2.5），并已实测兼容 2.2.6。上游插件 API 仍属实验性，更新的桌面端版本仍可能使插件失效。仓库地址：<https://github.com/VicChenBike/opencode-subagent-studio>。

> **命名说明：** npm 包与 GitHub 仓库名为 `opencode-subagent-studio`。OpenCode 应用内的插件 id 仍为 `subagent-manager`（插件 id 注册后无法改名），本地插件目录也保留原名——因此日志里的 `[subagent-manager]`、代码中的 `id: "subagent-manager"`、磁盘上的 `opencode-subagent-manager` 目录均属正常；"Studio" 这个名字用于 npm、GitHub 与 `package.json`。

---

## 功能

| 功能 | 说明 |
|---|---|
| **列表** | 用户级与项目级作用域、按字母排序（大小写不敏感）、搜索、「隐藏」与「已停用」徽标 |
| **新建** | ID 实时校验、保留 ID 拦截、存在即拒绝 |
| **编辑** | 描述、颜色、模型（含思考深度）、三态权限矩阵（允许/询问/禁止）、系统提示词、最大步数、隐藏 |
| **重命名** | 先警告再输入新 ID；目标已存在则拒绝 |
| **V1 → V2 迁移** | 按官方规则整份转换，保存前预览；注释与未知字段保留 |
| **回收站** | 删除的文件移入 agents 目录旁的 `agents-trash/`，可手动恢复 |
| **内置模型覆盖** | 运行时通过插件存储为内置代理换模型；不写 `opencode.jsonc` |
| **实时同步** | `fs.watch` + 300 ms 去抖 + `agent.reload()`；用户级目录自动刷新。当前构建中，项目级目录的外部改动需要点**刷新** |
| **界面词典** | 11 种界面语言（en、zh、fr、es、br、ru、ar、de、ja、hi、ko），词典由 AI 翻译；设置入口在各语言下统一显示 "Subagent" |

## 前置要求

- **OpenCode Desktop 2.2.5** —— 本插件的开发基准版本。**2.2.6** 已实测兼容。
- **Node.js 24+ 与 npm** —— 用于安装依赖、运行测试和构建 GUI bundle。
- **Windows 11** 已实测；macOS 与 Linux 理论上可用，但尚未验证。

## 兼容性

- **OpenCode Desktop 2.2.5 / 2.2.6** —— 基于 2.2.5 开发，已在 2.2.6 实测兼容。上游的插件 API 标注为实验性，后续桌面端版本中该 API 可能变动，导致本插件失效。
- 服务端部分需要 Node 兼容运行时（桌面端自带）；GUI 部分是桌面渲染进程加载的单文件 CommonJS bundle。
- 插件不发起网络请求，也不收集遥测数据。

## 安装

本插件已发布到 npm：[`opencode-subagent-studio`](https://www.npmjs.com/package/opencode-subagent-studio)。最简安装是在 `opencode.jsonc` 的 `plugins` 数组里写包名——OpenCode 会自动下载并缓存：

```jsonc
{
  "plugins": ["opencode-subagent-studio"]
}
```

下面的步骤是从本地克隆安装的方式。

1. 把仓库克隆到插件目录，然后安装并构建。如果你已有该目录，跳过克隆，直接在文件夹里执行下面三条命令。

```bash
git clone https://github.com/VicChenBike/opencode-subagent-studio ~/.config/opencode/plugins/opencode-subagent-studio
cd ~/.config/opencode/plugins/opencode-subagent-studio
npm install
npm run build
```

`dist/` 被 `.gitignore` 忽略：新克隆的仓库必须先执行 `npm run build` 生成 `dist/gui-experimental.cjs`，否则插件无法加载。

2. 把**目录**写进 `opencode.jsonc`。桌面端读 `opencode.jsonc`，不读 `cli.json`；条目必须指向文件夹，不能指向文件夹里的某个文件：

```jsonc
{
  "plugins": [
    "<你的用户目录>/.config/opencode/plugins/opencode-subagent-studio"
  ]
}
```

注意使用当前平台的路径分隔符，并在 JSON 中转义反斜杠。Windows 示例：`"C:\\Users\\<你的用户名>\\.config\\opencode\\plugins\\opencode-subagent-studio"`。

3. 完全重启桌面端（从托盘退出后重新启动；仅刷新窗口不够，因为服务端部分只在进程启动时加载）。打开 **设置 → Agent 能力 → Subagent**。

## 操作指南

### 列表页

- **作用域菜单**（左上）：在「本机 · 用户」（默认）与桌面端已知的各项目之间切换；项目级代理位于 `<项目>/.opencode/agents/`。菜单旁的**计数**等于当前实际列出的行数，因此搜索过滤时会随之减少。
- **搜索**按 ID 与描述过滤，大小写不敏感；**刷新**强制从磁盘重读。用户级目录会自动刷新；当前构建中，项目级目录的外部改动需要点这个按钮。
- **新建**打开继承当前作用域的空白编辑页。ID 必须匹配 `^[a-z][a-z0-9-]{0,63}$`（小写字母、数字、连字符，≤64 字符），且不能是保留 ID：`build`、`plan`、`general`、`explore`、`compaction`、`title`、`summary`。已存在的文件绝不会被覆盖。

### 列表行

每个自定义代理行显示颜色圆点（未设置时用主题灰）、名称、模型徽标（原样显示 `provider/model` 或 `provider/model#variant`；未设置模型时不显示徽标）、`hidden: true` 的「隐藏」徽标、停用时显示「已停用」徽标，以及行内开关和垃圾桶。点击自定义代理行进入编辑。

- **开关**是「启用」开关（蓝色/开 = 启用，遵循宿主惯例）。切换开关时写入 `disabled` 字段：停用的代理保留在磁盘上、只是从已加载的配置中移除，行变暗并显示「已停用」徽标。
- 点击**垃圾桶**并确认后，文件移入 `agents-trash/`（见下文「从回收站恢复」）。

### 内置分组

置底显示 `general`（「全部工具」）与 `explore`（「只读」）。它们没有编辑入口、没有垃圾桶——只能通过模型弹窗（见下文「编辑页」）换模型，选「继承默认」即清除覆盖。

### 编辑页

- **名称**创建后只读；**重命名**先警告「代理 ID 就是文件名，提示词或其他代理里对它的引用会失效」，再拒绝已存在的目标 ID。
- **颜色**：8 个预设圆点 + 「无颜色」；写入 `color: "#rrggbb"`。
- **模型**打开按 provider 分组、带搜索框的弹窗；旁边**思考深度**下拉列出该模型的 variants。模型没有 variants 或选了「继承默认」时显示「无」。选「继承默认」就是文件里不写 `model`。
- **描述**必填——父模型挑选子代理时看到的就是它。
- **权限**是 10 个动作（action）（read / glob / grep / edit / shell / webfetch / websearch / skill / subagent / question）加一个默认档的三态矩阵：**允许**=正常执行，**询问**=每次问用户，**禁止**=拒绝。文件里已有的细粒度规则会被保留且保持其优先级（最后一条匹配的规则生效）。
- **系统提示词**就是 Markdown 正文；**最大步数**写 `steps`（留空 = 不设）；**隐藏**写 `hidden: true`——代理仍可被调用，只是不会展示给模型。
- **保存 V1 文件**会先弹左右对照的迁移预览；确认后整份转换为 V2（见「工作原理」）。编辑页显示的已经是迁移后的等效内容（旧版 `prompt:` 字段显示为正文、`model` + `variant` 显示为一条引用），因此对 V1 代理点开关或保存不会丢失提示词、variant、最大步数或工具禁用规则。
- **保存冲突**：打开编辑页时记录文件 hash；若文件在磁盘上被外部改动，保存会被拒绝，弹窗提供**重新加载**或**强制覆盖**。**重新加载**（或按 Esc / 点弹窗外关闭）会离开编辑页返回列表。**强制覆盖**保留你的表单，并先把当前磁盘内容备份到回收站目录（`.backup-<时间戳>-<原名>.md`）。

## 工作原理

两个协作的进程：

```
┌───────────────────────────────────────────────┐
│ GUI — 桌面渲染进程（SolidJS）                   │
│   src/gui/*  →  dist/gui-experimental.cjs     │
│   设置页：列表 / 编辑 / 模型弹窗                 │
└───────────────┬───────────────────────────────┘
                │ RPC：12 个方法 + "changed" 事件
┌───────────────▼───────────────────────────────┐
│ Server — Node（运行在桌面端服务进程）            │
│   src/index.ts + src/core/*                   │
│   扫描 agents 目录 / 读写 Markdown /           │
│   fs.watch / V1→V2 迁移 / 内置覆盖              │
└───────────────────────────────────────────────┘
```

**数据流。** agents 目录下的 Markdown 文件是唯一事实源。服务端递归扫描（按 ID 大小写不敏感字母序；只收录 `mode` 精确等于 `subagent` 的文件），经 `list` / `read` RPC 提供给 GUI，由 GUI 渲染；文件写操作（create / update / remove / rename / setDisabled）落盘，`setBuiltinModel` 写插件存储。所有写操作随后调用 `agent.reload()` 并广播 `changed` 事件；GUI 收到后重拉列表，编辑页打开时除外。

**实时同步。** 服务端常驻监听用户级 `agents/` 目录。`watchProject` RPC 已存在，服务端也能监听项目目录，但当前 GUI 没有调用它，因此项目级目录的外部改动不会自动反映到列表——请点 **刷新**。磁盘变化经 300 ms 去抖（Windows 下一次保存会连发多个事件）后，触发 `agent.reload()` 并广播 `changed`。编辑页打开时，页面只提示「磁盘已更新」，不会覆盖表单。

**V1→V2 迁移。** frontmatter 出现 `permissions` / `request` / `system` / `disabled` 任一字段，整份文件即按 V2 读；否则按 V1（旧格式）读。从编辑页保存 V1 文件时，先弹左右对照的迁移预览：`permission` 映射 → `permissions` 规则数组、`disable` → `disabled`、`model` + `variant` → `provider/model#variant`、`maxSteps` → `steps`；`name`、`temperature`、`top_p`、`options` 被删除；`tools` 中值为 `false` 的项转成 `deny` 规则；V1 动作名按官方映射改名（bash→shell、task→subagent、write/patch→edit）；嵌套 permission 值展开为多条规则。Markdown 正文默认原样保留，唯一例外是 V1 `prompt` 非空且正文为空时，`prompt` 会并入正文。转换用 `yaml` 的 Document API 一次性重写整份文件，注释、键顺序与未知字段全部保留。

**内置模型覆盖。** `general` 与 `explore` 是 OpenCode 的内置子代理，插件只能换它们的模型。覆盖值存在插件自己的键值存储里（`builtin-model.general` / `builtin-model.explore`），运行时经 `ctx.agent.transform` 注入（每次代理重载后重放）；不写 `opencode.jsonc`，移除插件后覆盖即消失。

**冲突检测。** 打开编辑页时记录文件 hash；保存时回传该 hash，若磁盘文件在此期间被外部改动，服务端返回 `conflict`，GUI 提供**重新加载**（离开编辑页返回列表）或**强制覆盖**（保留表单）；关闭弹窗也会离开编辑页。强制覆盖前先把当前文件备份进回收站目录（`.backup-<时间戳>-<原名>.md`）。所有写入都是原子的（同目录临时文件 + rename），即使写入中途崩溃或磁盘已满，也不会截断代理文件。已有文件写回时保留原始行尾（LF 或 CRLF），UTF-8 BOM 会在首次写入时去掉。

## 局限性

如实列出本插件不做的事：

- **仅本机作用域** —— 没有远程设备或 SSH 项目，「用户」「项目」都指本机。
- **`mode: all` 的代理不显示** —— 列表只显示 `mode` 精确为 `subagent` 的文件。
- **当前构建中项目级实时同步未接线** —— `watchProject` RPC 已存在，但 GUI 没有调用它；项目级目录的外部改动需要点**刷新**。
- **项目级作用域依赖桌面端的项目列表** —— 桌面端未索引到的项目无法选择。
- **V1 文件首次从编辑页保存时必定整份迁移** —— 插件不能让文件保持旧版 V1 格式。
- **回收站没有恢复界面** —— 恢复靠手动：把文件移回 `agents/`。
- **重命名会导致引用失效** —— 代理 ID 就是文件名，提示词或其他代理里按 ID 调用它的地方需要手动更新。
- **嵌套代理文件会显示但不能从 UI 新建** —— `agents/team/reviewer.md` 会以 ID `team/reviewer` 显示并可编辑；新建/重命名输入框只接受扁平 ID，重命名嵌套代理时文件仍留在原目录。
- **宿主插件 API 是实验性的** —— 更新的桌面端可能改动该 API，导致本插件失效（基于 2.2.5 构建，2.2.6 已实测兼容）。
- **内置模型覆盖仅存于插件存储** —— 停用或移除插件后，`general` / `explore` 恢复 OpenCode 默认模型。
- **重命名后选择留在编辑页时路径仍是旧路径** —— 表单有未保存修改时重命名成功并选择留在编辑页，再次保存会报「文件不存在」（磁盘上重命名其实已成功）。请离开编辑页后重新打开改名后的代理；未保存的修改需要重做。
- **被长期锁定或 ACL 拒绝的代理文件写入时表现为未知错误** —— Windows 瞬时文件锁会自动短重试；持续性的访问拒绝（ACL 异常）会弹「未知错误」。不会改动任何数据（写入前必须先读到原文件）。

## 排障

- **看不到设置页。** 检查 `opencode.jsonc` 的 `plugins` 里是否是插件**目录**（不是文件）、桌面端读的是 `opencode.jsonc` 而不是 `cli.json`，并确认已完全重启过应用。Windows 上如果插件静默不加载，先结束所有残留的 `opencode-cli.exe` 进程再启动。
- **服务端改动不生效。** `src/index.ts` 与 `src/core/*` 只在进程启动时加载：完全退出桌面端再启动，仅刷新窗口不够。
- **GUI 改动不生效。** 执行 `npm run build`（或保持 `npm run watch` 运行），然后重新加载桌面端窗口。
- **列表是空的。** 只显示 `mode` 精确为 `subagent` 的文件；`primary`、`all`、没有 `mode` 的文件都会被排除。也请确认当前用户级/项目级作用域是否正确。
- **项目级目录的外部改动不出现。** 这是当前构建的已知限制：项目级实时同步未接线。点**刷新**。
- **保存时提示冲突。** 打开编辑页后文件在磁盘上被改动过。选**重新加载**放弃表单并返回列表（列表会重拉），或选**强制覆盖**保留表单；强制覆盖会先在 `agents-trash/` 生成 `.backup-` 副本。
- **保存时提示 frontmatter 格式有误。** 文件的 YAML 有结构缺陷（重复键、坏缩进、引号未闭合）。插件拒绝写入以免损坏文件；请先在文本编辑器里修复 YAML，然后再次保存。
- **Windows 上 `npm test` 报 `MODULE_NOT_FOUND`。** 用 `npm test`（脚本里是 `test/**/*.test.ts` 的 glob）；不要用目录形式 `node --test test/`。
- **`npm install` 很慢或失败。** 可尝试改用官方 registry：`npm install --registry=https://registry.npmjs.org`。

## 开发

```bash
npm install       # 安装依赖
npm test          # 单元测试（node --test，原生运行 TS）
npm run typecheck # tsc --noEmit 类型检查
npm run build     # 生成 dist/gui-experimental.cjs 单文件 CJS bundle
npm run watch     # 监听重建 GUI；服务端改动需重启桌面端
```

构建产物在 `dist/` 内必须只有一个文件。桌面端提供的模块（`solid-js`、`solid-js/web`、`@opencode/plugin/gui`、`@opencode/plugin/rpc`）保持为外部依赖（external）；若打包了这些包之外的同系列模块，构建会失败。GUI bundle 内不能有动态 import。

提交 Pull Request 前，请先阅读 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md) 了解工作流程与基本规则。

## 从回收站恢复

删除的代理会移入 agents 目录旁的回收站目录：

- 用户级：`~/.config/opencode/agents-trash/`
- 项目级：`<项目>/.opencode/agents-trash/`

文件名形如 `<yyyyMMdd-HHmmss>-<原名>.md`；同一秒内出现两个同名文件时，会在 `.md` 前插入 `-1`、`-2`… 后缀，两份都不会互相覆盖。把它移回 `agents/` 即可恢复。**去掉时间戳前缀可保持原代理 ID**；保留前缀会改变 ID（文件名就是 ID）。本版本没有恢复界面；手动移回时不会询问是否覆盖同名文件，请先确认目标文件名。

## 卸载

1. 从 `opencode.jsonc` 的 `plugins` 数组里删掉插件目录条目。
2. 完全重启桌面端。
3. 可选：删除插件文件夹。你的各子代理的 Markdown 文件与 `agents-trash/` 不会被删除；内置模型覆盖会随插件一起消失。

## 数据与隐私

插件只会读写以下内容：

- 上述 agents 目录里的 Markdown 文件；
- `agents-trash/` 里的文件（删除的代理，以及强制覆盖前生成的 `.backup-` 副本）；
- 每个内置模型覆盖在插件存储中占一个键（`builtin-model.general`、`builtin-model.explore`）。

插件不发起网络请求，不收集遥测数据。

## 许可

本项目基于 MIT 许可证发布，全文见 [LICENSE](LICENSE)。

## 致谢

- 参考 [opencode-agent-models](https://www.npmjs.com/package/opencode-agent-models) 的模型选择插件形态与「把覆盖值存在插件侧」的做法。（该项目没有公开 GitHub 仓库，npm 页面是权威链接。）
- 参考 [ZCode](https://github.com/zai-org/ZCode) 的设置页布局（作用域菜单、计数、列表行徽标、内置分组）。
- 感谢 OpenCode 团队提供插件 SDK 与文档。
