# opencode-rewind

[English](./README.md) | [中文](./README.zh-CN.md)

为 [opencode](https://opencode.ai) 提供的类 Claude Code `/rewind` 插件 — **无 git 依赖**，基于 prompt 的快照。

每个用户 prompt（非 `/` 命令）都会自动快照到 `.opencode/rewind/snapshots/<id>/` 并记录在 `.opencode/rewind/history.json`。通过 `/rewind` 列出，用方向键选择，6 选 1 恢复。

## 与项目目录的关系

* **项目根目录** = 你的 `opencode.json` 所在、运行 `opencode` 的目录。插件通过 opencode 传入的 `directory` 读写 `<项目>/.opencode/rewind/`。
* **必须同时具备两部分：**
  1. **Plugin**（`src/index.ts` / `plugin/rewind.ts`）— 监听 `chat.message` 与 `tool.execute.after`，提供 `rewind`/`list_checkpoints`/`restore_checkpoint` 三个工具。通过 `opencode.json: plugin` 加载。
  2. **Command**（`command/rewind.md`）— 定义斜杠命令 `/rewind`（内部用 `question` 调上述工具做箭头交互）。需放在 `.opencode/commands/rewind.md`（项目级）或 `~/.config/opencode/commands/rewind.md`（全局）。缺少它则工具存在但 TUI 输入 `/` 看不到 `/rewind`。

## 安装

### 方式 A — npm（推荐）— 两种位置

#### A1. 项目 `node_modules`（最简单）

在**项目根**（`opencode.json` 所在目录）执行：

```bash
npm i @nameused/opencode-rewind
# 或 bun add / pnpm add / yarn add
# 安装到 <项目>/node_modules/@nameused/opencode-rewind
```

#### A2. `.opencode` 隔离（保持项目 `package.json` 干净）

把包安到与项目根同级的 `.opencode` 目录内（`project/.opencode`，opencode 支持 `<项目>/.opencode/package.json`，见 `opencode.ai/docs/plugins: Dependencies`）：

```bash
mkdir -p .opencode
cat > .opencode/package.json <<'JSON'
{
  "dependencies": {
    "@nameused/opencode-rewind": "^1.0.2"
  }
}
JSON
# 安装到 <项目>/.opencode/node_modules
(cd .opencode && npm install)
# 或: (cd .opencode && bun install)
```

A1 与 A2 均可，A2 的包位于 `<项目>/.opencode/node_modules/@nameused/opencode-rewind`，与项目根的 `.opencode` 目录同级且隔离。

在**项目根**的 `opencode.json`（不存在则新建，`opencode.jsonc` 也可）：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@nameused/opencode-rewind"]
}
```

`@nameused/opencode-rewind` 发布包已包含 `command/` 与 `plugin/`（`package.json: files`），**但 opencode 不会自动安装 command 文件**，需手动拷一次：

```bash
mkdir -p .opencode/commands
# A1 源: <项目>/node_modules/...
cp node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
# A2 源: <项目>/.opencode/node_modules/...
# cp .opencode/node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
# 若跳过 npm i 直接靠 opencode.json 自动安装，源则在：
# cp ~/.cache/opencode/node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
```

> 全局安装：`mkdir -p ~/.config/opencode/commands && cp <源>/command/rewind.md ~/.config/opencode/commands/rewind.md`，并把 `plugin` 写到 `~/.config/opencode/opencode.json`。

重启 opencode。输入 `/` 应能看到 `/rewind` 与 `/checkpoint`。

> 包在何处：A1 `npm i` → `<项目>/node_modules/@nameused/opencode-rewind`；A2 `(cd .opencode && npm i)` → `<项目>/.opencode/node_modules/@nameused/opencode-rewind`（与项目根 `.opencode` 同级隔离）；经 `opencode.json` 自动安装 → `~/.cache/opencode/node_modules/@nameused/opencode-rewind`（opencode 启动时 `bun install`）。若无效果，清空 `~/.cache/opencode` 后重启，或查看日志（`service:"rewind"` 的 `client.app.log`）。

### 方式 B — 本地（不走 npm）

```bash
mkdir -p .opencode/plugins .opencode/commands
cp src/index.ts .opencode/plugins/rewind.ts
# 或 cp plugin/rewind.ts .opencode/plugins/rewind.ts（两者已同步）
cp command/rewind.md .opencode/commands/rewind.md
```

无需改 `opencode.json`。重启生效。

`src/index.ts` 为源文件（`plugin/rewind.ts` 每次发布前同步）。

### 验证

* 输入 `/` 能看到 `/rewind`
* 发一条普通消息（非 `/`），再 `/rewind` 能列出它
* agent 可用工具：`list_checkpoints`、`restore_checkpoint`、`rewind`

### 排障 — 看不到 `/rewind`

1. 是否把 `command/rewind.md` 拷到了 `.opencode/commands/rewind.md`（复数，旧文档曾写 `command/` 单数）？
2. 改完 `opencode.json` / 新增文件后是否重启了 opencode？
3. `opencode.json` 是否在项目根（全局则在 `~/.config/opencode/opencode.json`）？`opencode.jsonc` 也可。
4. 重启后 `~/.cache/opencode/node_modules/@nameused/opencode-rewind` 是否存在？不存在则 `rm -rf ~/.cache/opencode` 后重启。
5. opencode 版本是否支持 plugin（`>=0.10`）。

## 使用

| 命令 | 说明 |
|------|------|
| `/rewind` | 交互式列表（最近 10 条，最新在上，已过滤系统指令）→ 方向键 → 6 选 1 |
| `/rewind <index> --action=1` | 直接恢复：`1=code+conv, 2=conv, 3=code, 4=summarize-from, 5=summarize-upto, 6=never`（`--confirm` 为 `1` 的别名） |
| `/checkpoint [label]` | 手动快照，带标签（空则为 `manual-<ISO>`） |
| `list_checkpoints`（工具） | 供 agent 使用的同款过滤/排序列表 |
| `restore_checkpoint {steps, action}` | 编程式恢复 |

Agent 自然语言：

```
列出 checkpoints
恢复到第2个检查点
```

排序/过滤：`rewind`/`list_checkpoints` 均过滤 `isIgnorablePrompt` 并按 `timestamp` 降序截取。

## 存储

- 快照：`.opencode/rewind/snapshots/<id>/`
- 历史：`.opencode/rewind/history.json`（原子写入，超 100 条裁剪，开头重建索引，加载时过滤不存在的快照）

恢复：删除当前不在快照中的文件（含 `.opencode` 中被跟踪的文件），再拷回快照文件；空目录自动清理；恢复后重置 `lastPrompt` 为目标条目。

## 大项目说明

当前 `snapshotWorkingTree: src/index.ts:146` 为**全量拷贝**（精确还原，含新建/删除文件），与 Claude Code 仅跟踪已编辑文件不同。小/中型仓库适合；大仓库（`>10k` 文件）每次快照 `O(N)`，100 份占盘较大。缓解：

* 已忽略 `.git/node_modules/.opencode/.cache/dist/build/.next/coverage/tmp/logs/.turbo/out/.parcel-cache/.vite/.idea/.vscode`，跳过 `>50MB` 与软链（`1.0.1` 修复 `listFilesRecursive` 改用 `lstat`）、精确排除 `.opencode/rewind`。
* 风险 `bash` 前手动 `/checkpoint`（`bash` 仅启发式跟踪：`rm/mv/cp/mkdir/touch/echo/sed/perl/python/>/cat >`）。
* 后续可切增量模式（仅还原已编辑文件，与 Claude Code Limitations 一致），以精确性换速度，已列为增强项。

## 限制（与 Claude Code 一致）

- `bash` 改动、subagent、软链不完全跟踪 — 风险操作前请先 `/checkpoint`
- `>50MB` 大文件跳过
- 软链接跳过（`1.0.1` 修复 `listFilesRecursive` 用 `lstat`）

## 开发

```bash
node --check src/index.ts
# 修改 src/index.ts，发布前会同步到 plugin/rewind.ts
```

## 发布

```bash
npm login
npm publish --access public
```

## 许可证

MIT
