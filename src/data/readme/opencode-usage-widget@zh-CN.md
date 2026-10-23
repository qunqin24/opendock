<p align="center">
  <img src="logo.png" alt="opencode-usage-widget" width="128" height="128">
</p>

# opencode-usage-widget

[English](README.md) | **中文**

OpenCode TUI 插件：在侧边栏显示 OpenCode Go 套餐用量（滚动 / 每周 / 每月），并支持被动自动刷新（回复结束、定时、手动）。

## 侧边栏

**Go Usage** 区块可折叠。点击标题即可收起或展开。默认展开；折叠状态保存在 OpenCode KV（`opencode.usage.open`），下次启动会恢复。

展开时，每个窗口各自显示进度条、百分比，以及该窗口的重置倒计时（精确到剩余分钟，例如 `in 3h 15m`、`in 2d 4h 15m`）：

![OpenCode 侧边栏中的 Go Usage：Rolling 29%、Weekly 90%、Monthly 48%，各自带精确到分钟的重置倒计时](screenshot.png)

折叠时，标题旁显示三个窗口中最高的百分比：

```
▶ Go Usage  90%
```

为零的单位会省略（`in 3h`、`in 2d`）；已到期或已过期显示为 `in 0m`。

## 环境要求

- opencode >= 1.18.0（TUI 插件系统）
- 已开通套餐的 OpenCode 账号（例如 OpenCode Go），并在 opencode 中配置来自 <https://opencode.ai/auth> 的 API key
- 仅本地源码安装需要：在本仓库执行 `bun install`

## 从 npm 安装

包发布之后：

```bash
opencode plug opencode-usage-widget -g
```

去掉 `-g` 则只装到当前项目。也可以在 TUI 的 Plugins 对话框里安装（`shift+i`）。装完后请完全退出再打开 opencode。

这会在 `tui.json` 写入类似 `["opencode-usage-widget", { "order": 600 }]` 的条目。钉死版本用 `opencode plug opencode-usage-widget@0.1.2 -g`。已有条目可用 `--force` 覆盖。

## 从源码安装（本地）

把 TUI 配置指向**源文件**，让 OpenCode 自己编译 JSX。开发时用这种方式；不要指向 `dist/tui.js`（再打进一份 `solid-js` / `@opentui/solid` 会导致渲染异常）。

编辑 `~/.config/opencode/tui.json`（没有就新建），保留已有字段，加入：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["file:///Users/xin/work/AI/opencode-go-usage/src/index.tsx", { "order": 600 }]
  ]
}
```

必须用 `file://` URL，不要用裸路径。修改 `tui.json` 或插件源码后，请完全退出再启动 opencode。侧边栏 files 区块下方会出现 `Go Usage`。

## 发布到 npm

需要 npm 账号并执行 `npm login`。不要设置 `main` 字段（否则 OpenCode 会当成 server 插件）。TUI 产物用 `esbuild-plugin-solid` 编译（与能正常显示的 OpenCode TUI 插件相同），`solid-js` / `@opentui/solid` / `@opentui/core` 保持 external，使用宿主那一份。用 `bun build` 会打出 `jsx-dev-runtime`，插件显示 active 但侧边栏是空的。

```bash
npm whoami
bun test && bun run typecheck && bun run build
npm pack --dry-run    # 确认包含 dist/tui.js，且没有密钥
npm publish --access public
```

`prepublishOnly` 会再跑一遍测试 / 类型检查 / 构建。插件安装带 `--ignore-scripts`，所以 tarball 里必须已经有 `dist/tui.js`。

## 配置

| 选项                    | 类型    | 默认值                 | 说明                             |
| ----------------------- | ------- | ---------------------- | -------------------------------- |
| `apiKey`                | string  | —                      | 显式 OpenCode API key（可选）    |
| `baseUrl`               | string  | `https://opencode.ai`  | Console 地址（自托管/企业）      |
| `order`                 | number  | `600`                  | 侧边栏区块顺序                   |
| `refreshInterval`       | number  | `300`                  | 自动刷新秒数（`0` 关闭定时器）   |
| `showWhenUnavailable`   | boolean | `true`                 | 无凭证时是否隐藏整块             |

API key 按以下顺序解析（命中即停）：

1. `apiKey` 选项
2. `OPENCODE_API_KEY` 环境变量
3. 依次在下列目录查找 `auth.json`，再找 `opencode.db`：
   - `api.state.path.state`（XDG state 目录，常见为 `~/.local/state/opencode`）
   - 若已设置则用 `OPENCODE_DATA_DIR`
   - `$XDG_DATA_HOME/opencode` 或 `~/.local/share/opencode`
4. `auth.json` 中先 `opencode-go` 再 `opencode`（`type: "api"`）
5. `opencode.db` 的 `credential` 表（`CredentialKey.key`）

如果只通过 OAuth 登录过 opencode，请显式设置 `apiKey` 或 `OPENCODE_API_KEY`——用量接口不接受 OAuth token。

## 手动刷新

在命令面板中运行 `usage.refresh`。

## 开发

```
bun install
bun test          # 单元测试（fetch/parse、凭证、格式化、store）
bun run typecheck
bun run build     # 产出 dist/tui.js，供 npm 使用（gitignore）
```

`dist/` 是构建产物，不进 git；本地源码安装不需要它。设计说明见
`docs/superpowers/specs/2026-08-18-opencode-usage-widget-design.md`。
