# opencode-session-diff

> **非 OpenCode / SST 官方产品。** 本插件为社区作品，与 OpenCode 官方无隶属或背书关系。

[English](README.md) | **简体中文**

[![npm version](https://img.shields.io/npm/v/opencode-session-diff.svg)](https://www.npmjs.com/package/opencode-session-diff)
[![license](https://img.shields.io/github/license/imdlan/opencode-session-diff.svg)](LICENSE)

> OpenCode 侧边栏「Changes」面板：一眼看清当前会话动了哪些文件。

这是一个 [OpenCode](https://opencode.ai) TUI 插件，在会话侧边栏增加 **Changes** 板块：列出当前会话修改/新增/删除的全部文件，附 ± 行数统计，实时高亮正在编辑的文件，点击可直接打开官方 diff 查看器。

<!-- 截图 / GIF 占位 -->

```
▼ Changes (4)                              +154 −18
• src/agent/loop.ts                        +28 −9
• src/tools/fs.ts                          +110 −3
• test/loop.test.ts                        +13
• src/legacy/runner.ts                     −6
```

## 特性

- **会话级范围**：只显示本次对话改动的文件，数据来自服务端 `session.diff` 快照，非客户端推测
- **增/改/删分类**：每行带 `+新增 −删除` 计数，右对齐到内容区右缘
- **实时高亮**：正在编辑的文件整条路径变为 warning 色，约 5 秒后褪色（`session.tool.*` 事件驱动，文件监视器兜底）
- **点击审查**：打开官方 diff 查看器，直接定位到本会话的变更
- **事件驱动**：回合结束 / `/undo` 后刷新，无后台轮询
- **主题自适应**：颜色全部取自宿主主题（深色/浅色/自定义）
- **零配置**

## 安装

```sh
opencode plugin add opencode-session-diff@latest
```

建议同时设置宿主配置，让 diff 查看器默认打开会话变更而非 git 分支：

```jsonc
// ~/.config/opencode/cli.json
{
  "diffs": { "source": "turn" }
}
```

侧边栏在空间足够时显示（`session.sidebar: "auto"`），可用 `Ctrl+X` 然后 `B` 切换。

## 使用

| 操作 | 效果 |
|---|---|
| 点击 **Changes** 标题 | 折叠 / 展开 |
| 点击文件行 | 打开 diff 查看器（会话 source） |
| `Ctrl+P` → **Toggle collapse**（Changes 分组） | 键盘折叠 |

折叠状态会被持久化。

## 环境要求

- OpenCode ≥ 2.0.x（V2 插件 API，`@opencode/plugin/tui`）
- 不要求 git 仓库；面板由会话快照驱动

## 实现要点

1. 通过 `@opencode/plugin` 的 `ui.slot` 注册 `sidebar.content` 边界之后的 claim（位于其他板块下方、footer 上方）
2. 拉取 `client.session.diff({ sessionID })`，按权威 `status`（`added`/`deleted`/`modified`）分类，缺失时按 ± 计数降级
3. 500ms 防抖刷新，触发事件：`session.execution.succeeded`、`session.idle`、`session.revert.*`
4. 宿主只绘制 slot render 的同步快照，因此状态变化时重建 claim（详见 `docs/DEVELOPMENT.md`）

## 已知限制

- 官方 diff 查看器不支持从 API 聚焦单个文件；点击打开整个会话 diff（进入后用 `n` / `p` 切换文件）
- 仅支持 V2 TUI；因宿主加载器要求，包内附带一个空操作的 server 入口

## 开发

```sh
bun install
bun run build      # 产出 dist/index.js + dist/tui.js（宿主依赖保持 external）
bun test           # 34 个单元测试
bun run typecheck
```

更多经过实证的 API 契约与边界情况见 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)。

## 许可证

[MIT](LICENSE)
