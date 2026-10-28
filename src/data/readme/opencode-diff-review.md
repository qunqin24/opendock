# opencode-diff-review

给 **OpenCode v2** 用的「AI 改了什么」逐文件查看与撤回插件。

AI 每写一次文件，插件就会在写入前保存一份原始内容快照。于是你可以随时：

| 需求 | 做法 |
| --- | --- |
| **快速查看** | `ctrl+shift+r` 或 `/diff-review` 打开 IDEA 风格双栏页，按改动块浏览，可打字过滤文件 |
| **同意 / 不同意** | 每块中间列有两个可点的箭头：`✓ 同意`（保留并前移基线）/ `✗ 不同意`（还原这块）；顶部工具条同样有块级、文件级、全部级的同意/不同意 |
| **逐行处理** | 块上按 `⋮`，或页面内 `ctrl+shift+j/k` 选块后操作；不同意时也可以只挑其中某几行 |
| **单文件撤回** | 左侧文件树每行末尾的 `↺`，把文件恢复到 AI 第一次改它之前 |
| **全部撤回** | 工具条 `✗不同意全部`，一条命令把所有被 AI 改过的文件还原 |
| **查看 diff** | 左栏是 AI 修改前，右栏是当前，行号左右对齐，删除行与新增行按改动块配对显示 |

> 只依赖 OpenCode 自身，不需要 git 仓库，也不会动你的 `git index`。

**三份文档的分工**：

| 文档 | 面向谁 | 装什么 |
| --- | --- | --- |
| [教程.md](教程.md) | 使用者 | **安装方式的唯一权威来源**：四种装法、验收、实战、升级卸载 |
| [使用文档.md](使用文档.md) | 使用者 | 装好之后怎么用：界面细节、场景、配置、排错 |
| README（本文件） | 维护者 | 原理、配置项、开发、**发布到 npm** |

> **命令名说明**：本文统一用 `opencode` 指 **OpenCode v2** 的命令行。若你的机器上 v2 的可执行文件
> 叫别的名字（例如和 v1 并存时的 `opencode2`），把命令里的 `opencode` 换成它即可。

---

## 1. 它是怎么工作的

```
AI 调用 write/edit/patch
        │
        ├─ execute.before ──► 快照文件当前内容（每个文件只存第一次）
        │
        └─ execute.after  ──► 读回新内容，和快照比对
                              相同 → 忽略（读文件之类的工具不会污染列表）
                              不同 → 进入待撤回列表
```

撤回时：

- 修改过 → 把**首次快照**写回文件（所以改 10 次也只还原到动手前的状态）
- AI 新建的文件 → 直接删除
- AI 删掉的文件 → 把快照写回

只撤其中一块或一行时，不是靠快照覆盖，而是**反向应用选中的 diff 行**：
`add` 行删除、`del` 行恢复、未选中的行原样保留，然后整份文件按原换行风格写回。
选中的行覆盖了全部改动时，退化为整文件还原，直接写回首次快照。

快照写到 OpenCode 数据目录下的自有仓库，**不进项目工作区**：

```
~/.local/share/opencode/opencode-diff-plugin/v1/<project hash>/<path hash>.json
```

每个文件一条独立记录，服务端只负责采集写入，面板进程直接读同一份数据。

---

## 2. 安装

**一行命令**（OpenCode v2 自带的能力）：

```bash
opencode plugin add opencode-diff-review
```

装完 `opencode plugin list` 能看到 `opencode.diff.tracker`：

```
ID                     VERSION  SOURCE
opencode.diff.tracker  2.1.0    opencode-diff-review
```

### 四种安装方式

| 方式 | 命令 | 能配 options | 说明 |
| --- | --- | --- | --- |
| **① npm**（推荐） | `opencode plugin add opencode-diff-review` | ✗ | 从 npm 拉，装进 OpenCode 缓存目录 |
| **② Git** | `opencode plugin add git@github.com:wuwei-apc/opencode-diff-review.git` | ✗ | 从 Git 仓库拉 |
| **③ 配置引用** | `opencode.json` 里写 `{ "package": "/你的/插件目录", "options": { … } }` | ✓ | 插件放任意位置，**唯一能配选项**的方式 |
| **④ 手动放目录** | 解压 `.tgz` 或 `git clone` 到 `~/.config/opencode/plugins/opencode-diff-review/` | ✗ | 零配置、可离线 |

**只选一种**。装两种会被加载两次，每次改文件记两条。

完整的安装步骤、作用域规则、镜像源处理、每种方式的升级与卸载，见 **[教程.md 第 2 节](教程.md#2-安装)**。

### 插件的两个入口

插件由两个入口组成，必须在**同一个包**里：

- `index.ts` — 服务端插件，负责采集（`tool.hook`）
- `tui.ts` — 终端面板，负责界面与快捷键

两者通过**磁盘上的共享仓库**交换数据，不依赖插件 RPC，所以**缺一不可**。
OpenCode 按包的 `exports` 解析这两个入口（`"."` → 服务端，`"./tui"` → 面板），
一条配置就把两个部分都加载起来。

### 关于依赖

`@opencode/plugin` 是插件自己的 `dependencies`；`@opentui/solid`、`@opentui/core`、`solid-js`
声明为 `peerDependencies`——它们由 OpenCode 运行时提供，`opencode plugin add` 会自动装好，
不会在你的机器上多出第二份 Solid 运行时。

手动放目录（方式 ④）**不会自动装依赖**。正常情况不用管；如果面板报「找不到 `@opentui/solid`」，
在该目录里跑一次 `npm install --omit=dev` 即可（这条命令依赖 `peerDependencies` 写的是版本范围而不是
精确锁死，理由见第 7 节）。

只有要自己跑类型检查 / 测试时才需要：

```bash
npm install        # 或 bun install
```

---

## 3. 使用

| 入口 | 说明 |
| --- | --- |
| `ctrl+shift+r` | 默认快捷键 |
| `/diff-review` | 斜杠命令（可改名，见配置） |
| 命令面板搜索「查看 / 撤回 AI 文件变更」 | 同上 |

### 页面结构

```
 ┌ ▲ ▼ 块 1/3  ✓同意块  ✗不同意块 │ ✓同意全部  ✗不同意全部 │ ⟳刷新  ⏻退出(Esc) ┐
 │ 文件 3           │          AI 修改前            │ → │        当前          │
 │ M  src/app.ts ↺✓ │  - 12  const x = old()       │ ✓ │ + 12  const x = next() │
 │ A  src/util.ts ↺✓│  - 40  return data           │ ✗ │ + 40  return rows      │
 │ …                │  …                           │   │  …                     │
 └ 共 932 行 · 块 1/3 · > 同意 · < 不同意 · 滚轮 / ctrl+shift+u d 滚动 · Esc 退出 ┘
```

中间那一列既是分隔线也是操作面：每个改动块的前两行分别是 `✓`（同意这块）和 `✗`（不同意这块），鼠标可点。
左栏文件树每行末尾是 `↺`（撤回整个文件）和 `✓`（保留整个文件 = 停止追踪）。

### 快捷键（页面内）

| 键 | 作用 |
| --- | --- |
| `ctrl+shift+j` / `ctrl+shift+k` | 下一块 / 上一块 |
| `ctrl+shift+n` / `ctrl+shift+m` | 块内下一行 / 上一行（选中行） |
| `ctrl+shift+f` / `ctrl+shift+v` | 同意这块 / 不同意这块（逐行模式下只作用于选中行） |
| `ctrl+shift+o` / `ctrl+shift+p` | 下一个文件 / 上一个文件 |
| `ctrl+shift+w` / `ctrl+shift+x` | 同意整个文件 / 不同意整个文件 |
| `ctrl+shift+u` / `ctrl+shift+d` | 向上 / 向下滚动（鼠标滚轮也可以） |
| `ctrl+shift+q`、`Esc` | 退出页面回到对话 |

页面内的快捷键**只在页面打开时生效**。页面关闭时插件完全不参与按键分发，`Esc` 仍然是 OpenCode 的
「中断会话 / 收起补全」，`ctrl+shift+d` 仍然是输入框的「删除整行」。

状态前缀：`M` 修改、`A` 新增、`D` 删除、`?` 基线缺失（不可撤回）。

### 只有一种交互

2.0 起删掉了旧的 dialog 菜单：`ctrl+shift+r` 打开的就是 IDEA 双栏页，块 / 行 / 文件 / 全部的
同意与不同意都在页面上完成。页面是 Solid JSX，`@opentui/solid` 与 `solid-js` 已声明为
`peerDependencies`，`opencode plugin add` 或 `npm install` 会装好；如果依赖缺失，插件会弹一条
toast 说明原因（而不是静默失效）。缺少 `ui.router` 的构建会提示「无法打开双栏视图」。

---

## 4. 配置项

服务端选项（和 TUI 选项写在同一个 `options` 对象里）：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `maxFileBytes` | `2097152`（2 MiB） | 单文件快照上限；超过的文件会显示在列表但**不可撤回** |
| `contextLines` | `3` | diff 上下文行数 |
| `maxLines` | `600` | diff 文本最多渲染多少行 |
| `trackTools` | `[]`（全部） | 只跟踪这些工具名，例如 `["write", "edit", "patch"]` |
| `pendingTTLMs` | `600000` | 单次工具调用的待配对快照保留时长 |

TUI 选项：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `keybind` | `"ctrl+shift+r"` | 快捷键；不想用就设成 `""`，只留 `/diff-review` |
| `slash` | `"diff-review"` | 斜杠命令名 |

---

## 5. 覆盖范围与已知限制

- **只跟踪文件类工具的写入**（`write` / `edit` / `patch` / `apply_patch` 及其变体）。通过 `bash` 里的重定向、`sed -i`、代码生成脚本产生的改动无法归因到具体文件，因此**不在本插件范围内**。
- **每个文件默认 2 MiB 上限**。超限的文件仍会出现在列表里，但会标记「无法撤回」，撤销时**绝不会**去删或写它。
- **二进制文件可以撤回**，但 diff 视图只提示「二进制文件」。
- **状态在磁盘上**：快照写到 OpenCode 数据目录（见第 1 节），因此重启 opencode 后列表仍在；
  记录超过 7 天未被触碰会自动清理。
- 忽略 `node_modules`、`.git`、`.hg`、`.svn` 下的路径。
- 所有路径都会被限制在会话目录内，越界路径直接丢弃。

### 和内置 `/undo` 的关系

两者互补，不冲突：

| | 内置 snapshots / `/undo` | 本插件 |
| --- | --- | --- |
| 粒度 | 整个对话边界 | 单个文件 |
| 依赖 | 需要 git worktree | 不依赖 git |
| 持久化 | 跨重启（git 对象库） | 跨重启（自有数据目录） |
| 适合 | 「把刚才那轮全部退回去」 | 「只撤掉这个文件」 |

---

## 6. 排错

**列表一直是空的**
先确认服务端在采集：

1. `opencode plugin list` 能列出 `opencode.diff.tracker`；
2. `%TEMP%\opencode-diff-plugin\diag.json` 里 `stage` 为 `ready`、`hooksRegistered` 为 `true`、`selfTest.ok` 为 `true`；
3. 数据目录里有条目：`~/.local/share/opencode/opencode-diff-plugin/v1/<hash>/`。

> `opencode api get /api/plugin` 在 2.0.32 和 2.2.0 上对本插件恒返回空数组，**不要**用它判断是否加载成功。

**安装命令报 `Invalid global configuration`**
`opencode.json` 写坏了（多余逗号、BOM、编码不是 UTF-8）。先 `opencode debug config` 确认能解析，再重试。

**`opencode plugin add` 报 404 / ETARGET（npm 方式装不上）**
你的 npm registry 是镜像源，包还没同步过去。`npm view opencode-diff-review` 确认一下，
必要时 `npm config set registry https://registry.npmjs.org`。

**Plugins 面板里 `TUI` 是 failed（`react` 或 `@opentui/solid` 找不到）**
≤ 1.0.2 的打包安装才会这样：`src/diffview.tsx` 的 JSX 被按 React 编译。Bun 只从**当前工作目录**读
`tsconfig.json`，插件自己目录里的那份不会被采用，所以从 1.0.2 起改用逐文件 `/** @jsxImportSource @opentui/solid */`。
升级：`opencode plugin update`。

**快捷键按了没反应**
和本机已有的 keybind 冲突，换个键（例如 `"keybind": "ctrl+shift+y"`），或者直接用 `/diff-review`。

**`Esc` 在对话里没反应（按了不能中断会话）**
2.0.0 及更早版本有个 bug：页面快捷键注册在一个永远开启的全局层里，把 OpenCode 自己的 `Esc`
（`session.interrupt` 中断会话 / `prompt.autocomplete.hide` 收起补全）和 `ctrl+shift+d`
（`input.delete.line` 输入框删行）一起吞掉了。2.0.1 起，页面那一层只在 diff 页面打开时启用，
页面关闭时插件完全不参与按键分发，宿主的快捷键原样可用。升级：`opencode plugin update`。

**列表是空的，但文件确实被改过**
那次写入多半不是通过文件工具完成的（例如 shell 命令），或者文件超过了 `maxFileBytes`。

**某个文件没有「撤回此文件」**
该项是灰的，说明没保存到修改前的基线（超限或被跳过）。可以选择「停止追踪」把它从列表里去掉。

**安装的 OpenCode 用的是 `@opencode-ai/plugin/v2` 入口而不是 `@opencode/plugin`**
两套入口在 v2 beta 期间并存过。如果你的版本只认前者，把这两个 import 换掉即可
（数据通路已经不走 RPC，所以没有第三个 import 要改）：

| 文件 | 改成 |
| --- | --- |
| `src/server.ts` | `import { Plugin } from "@opencode-ai/plugin/v2"` |
| `src/tui.ts` | `import { Plugin } from "@opencode-ai/plugin/v2/tui"` |

---

## 7. 开发

```bash
bun test               # 单元测试（diff / paths / tracker / layout / tree / tui-keymap）
bun run smoke          # 入口冒烟：真实加载 index.ts + tui.ts，跑一遍采集→diff→撤回
bunx tsc --noEmit      # 类型检查
npm run check          # 上面三件事一起跑
```

`bun test` 用的是 `node:test` + `node:assert/strict`，所以 `bun test` 和 `node --test` 都能跑；
如果你的 Bun 版本对 `node:test` 支持不完整，把测试文件顶部两行换成 `bun:test` 即可。
它不需要安装 `@opencode/plugin`：只有两个入口文件 import 它，单元测试不碰。
`bun run smoke` 才会真的加载两个入口，所以要先 `npm install`（装 devDependencies 里的
`solid-js` / `@opentui/solid` 供 JSX 与类型使用）。

代码结构：

```
index.ts              服务端入口（转导出 src/server.ts）
tui.ts                TUI 入口（转导出 src/tui.ts）
src/contracts.ts      我们实际用到的 v2 插件 API 结构 + 单点类型断言
src/options.ts        两端共享的选项解析（保证快照上限一致）
src/store.ts          磁盘仓库：每条变更一个 JSON，原子写入
src/paths.ts          工具参数 → 路径，路径越界防护
src/snapshot.ts       快照读写、二进制识别
src/diff.ts           LCS 行级 diff、unified hunk 渲染（有复杂度上限）
src/tracker.ts        变更追踪 + 撤回语义（无状态，读写仓库）
src/server.ts         tool hooks：采集前/后镜像
src/tui.ts            面板命令、快捷键、页面控制器
src/diffview.tsx      IDEA 风格双栏页（Solid JSX，走 ui.router）
src/layout.ts         页面栅格宽度、中间操作面的单元格
src/tree.ts           文件树标签截断与图标列
src/rpc.ts            旧 RPC 契约的兼容再导出（当前数据通路是磁盘）
src/types.ts          面板与追踪器共享的载荷类型
src/selftest.ts       启动自检：真实跑一遍采集→diff→按块/按行撤回
src/diagnostics.ts    启动自检落盘（排错用）
scripts/smoke.ts      入口冒烟脚本（bun run smoke）
test/                 bun test 单元测试
```

设计上有意为之的几点：

- **钩子里全部用同步 I/O**，不依赖宿主是否 await 异步钩子，避免读到写了一半的文件。
- **捕获失败宁可不记**：读不到当前状态时直接跳过，绝不用「文件不存在」去猜，否则撤回可能误删文件。
- **进程间不共享内存，也不依赖 RPC**：状态放在磁盘仓库里，两个进程各读各写，
  契约只是文件系统。v2 的 `client.rpc()` 在 CLI 侧会拒绝定义对象（`RPC is unavailable`），
  这条路已经放弃。
- **v2 插件 API 仍是 beta**：`src/contracts.ts` 把依赖面收窄成一个小接口，其他文件不直接碰 SDK 类型，升级时只改一处。
- **只有一条交互路径**：页面是唯一入口，不存在「页面不可用就退回菜单」的第二套逻辑，行为可预测；
  页面依赖的 `@opentui/solid` / `solid-js` 是声明式运行时依赖，缺失时用 toast 明确报错。
- **运行时依赖走 `peerDependencies`**：`@opentui/solid`、`@opentui/core`、`solid-js` 由 OpenCode
  提供，声明成 peer 可以避免装出第二份 Solid 运行时（两份运行时的 context 会错位）。
  版本怎么写是有讲究的，**别随手改成精确锁死**：

  | 包 | 声明 | 原因 |
  | --- | --- | --- |
  | `solid-js` | `1.9.12`（精确） | `@opentui/solid` 的**每一个**版本（0.6.6 / 0.6.8 / 0.7.0）对它的 peer 都是精确的 `1.9.12`。写成范围会让 npm 在 `@opentui/solid` 内部再嵌一份 `solid-js`，两份 Solid 运行时并存 → context 错位 |
  | `@opentui/solid` / `@opentui/core` | `>=0.6.6 <0.8.0` | 这两个跟着**宿主的 OpenTUI 大版本**走：OpenCode 2.0.x 是 0.6.x，2.2.x 是 0.7.x。锁死成 `0.6.6` 会和 `@opencode/plugin@2.2.0` 的 `peerOptional @opentui/solid@0.7.0` 直接冲突，`npm install` 报 ERESOLVE 装不上 |

  范围写宽之后，npm 会顺着 `@opencode/plugin` 的 peer 声明自动选到与宿主同一代的 OpenTUI，
  整棵树里 `solid-js` 仍然只有一份。宿主升级 OpenTUI 时，只要不跳出 `0.8.0` 就**不用改这里**。

---

## 8. 发布到 npm

本插件就是一个普通 npm 包：**npm 包名 `opencode-diff-review`**，
`exports` 把 `"."` 映射到服务端入口、`"./tui"` 映射到面板入口——这正是 OpenCode 官方约定的
插件包结构。装的人只要一条 `opencode plugin add opencode-diff-review`。

### 8.1 包结构

`npm pack` 按 `package.json` 的 `files` 打包，共 24 个文件：
`index.ts`、`tui.ts`、`src/`、`tsconfig.json`、`README.md`、`使用文档.md`、`教程.md`、`LICENSE`。
测试和脚本不进包。

发的是 **TypeScript 源码**而不是编译产物：OpenCode 跑在 Bun 上，直接加载 `.ts` 即可，
用户不需要装构建链，也不会遇到「源码和编译产物不同步」。

### 8.2 发布步骤

```bash
npm install              # 装齐依赖
npm run check            # 单测 + 入口冒烟 + 类型检查（publish 前必跑）

npm run package          # → dist/opencode-diff-review-2.1.0.tgz，先看看包内容对不对
npm publish              # 真正发出去
npm view opencode-diff-review
```

`npm publish` 会自动触发 `prepublishOnly`（也就是 `npm run check`），**测试没过就发不出去**。

`package.json` 里已经写死了发布目标：

```jsonc
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org"
}
```

写死 registry 是有意的：很多人本地把 registry 指到镜像源（`npmmirror` 等），而镜像源不收包。
**但这也意味着发布前必须先登录官方源**：

```bash
npm login --registry=https://registry.npmjs.org
# 或者用 token（推荐，CI / 自动化场景）
npm config set //registry.npmjs.org/:_authToken <TOKEN>
```

### 8.3 建议先发一个预发布版本

`opencode plugin add` 不接受 tarball，所以 **npm 这条安装路径只能在发布之后才验证得了**。
稳妥的做法是先发一个预发布版本，实测通过再发正式版：

```bash
npm version 2.1.0-rc.0        # 显式指定预发布版本号
npm publish --tag next
```

> `npm version prerelease --preid=rc` 也能用，但它会把版本推到**下一个 patch** 的预发布
> （`2.1.0` → `2.1.1-rc.0`），容易和正式版号对不上，发布前记得看一眼 `package.json`。

然后在一台干净的机器上：

```bash
opencode plugin add opencode-diff-review@next
opencode plugin list                     # 应显示 opencode.diff.tracker
```

确认面板能打开、`/diff-review` 有反应之后，再发正式版：

```bash
npm version 2.1.0
npm publish                             # 默认 tag 是 latest
```

预发布版本带着 `-rc.0` 后缀，`opencode plugin add opencode-diff-review` **不会**自动装它
（npm 默认 tag `latest` 指向正式版），要装预发布必须显式写 `@next`。

### 8.4 版本号规则

本项目用语义化版本：

| 改动 | 版本位 |
| --- | --- |
| 修 bug、文档调整 | patch（`2.1.1`） |
| 加功能、加安装方式 | minor（`2.2.0`） |
| 改配置项语义、删功能 | major（`3.0.0`） |

**每次发版都要同步三处**：`package.json` 的 `version`、本文档里的版本号示例、
以及 `教程.md` / `使用文档.md` 里出现的版本号。

### 8.5 GitHub Release

GitHub Release 挂**同一个 `.tgz`**（`npm run package` 的产物）即可，用户可以：

```bash
tar -xzf opencode-diff-review-2.1.0.tgz -C ~/.config/opencode/plugins/
mv ~/.config/opencode/plugins/package ~/.config/opencode/plugins/opencode-diff-review
```

`.tgz` 就是 gzip 压缩的 tar，Windows 10+ / macOS / Linux 都自带 `tar`，不用额外准备 zip。

## License

MIT

