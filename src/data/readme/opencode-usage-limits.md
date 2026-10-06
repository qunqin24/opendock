# usage-limits

[![npm version](https://img.shields.io/npm/v/opencode-usage-limits?color=blue)](https://www.npmjs.com/package/opencode-usage-limits)
[![npm downloads](https://img.shields.io/npm/dw/opencode-usage-limits)](https://www.npmjs.com/package/opencode-usage-limits)
[![license](https://img.shields.io/npm/l/opencode-usage-limits)](./LICENSE)
[![OpenCode v2](https://img.shields.io/badge/OpenCode-v2-6E56CF)](https://opencode.ai/v2/docs/)

> 在 OpenCode 右侧侧边栏实时显示订阅方案的用量限额（5 小时 / 周 / 月）。

[简体中文](./README.md) · [English](./README.en.md)

一个 [OpenCode](https://opencode.ai/v2/docs/) **V2 TUI 插件**。当当前选中的模型属于
**OpenCode Go** 或 **ClinePass** 时，右侧侧边栏会自动出现用量区块，展示三个滚动窗口的
占用百分比、进度条与重置倒计时。

```text
▾ USAGE · OpenCode Go
5 hours                          0%
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
↻ 5h                       $0.00 / $12.00

Weekly                           1%
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
↻ 6d 4h                    $0.30 / $30.00

Monthly                         60%
███████████████████░░░░░░░░░░░░░░░░░
↻ 7d 14h                  $36.00 / $60.00
```

## 功能

- **两个用量来源**：OpenCode Go、ClinePass，按当前模型自动切换。
- **三个窗口**：5 小时滚动 / 周 / 月，含百分比、进度条、重置倒计时。
- **绿黄红提醒**：< 50% 绿、50–79% 黄、≥ 80% 红（阈值见 `core.ts`）。
- **金额显示**：OpenCode Go 显示 `已用 / 限额`（$12 / $30 / $60）；ClinePass 的限额从 `/users/me/plan` 实时读取。
- **整体折叠**：点标题行收起，只留一行；状态持久化，重启保持。
- **不打扰**：选中其他 provider 时**完全不渲染**，不占空间。
- **限流退避**：遇 429 / 5xx / 网络失败自动指数退避（最长 5 分钟），并显示 `retry in Ns`。
- **数据过期提示**：数据变旧（超过约 75 秒，即 2.5 个轮询间隔）时，标题行才显示年龄并变黄；平时不显示，不产生噪音。
- **密钥安全**：从 OpenCode 的 `auth.json` 实时读取，插件不存储任何凭据。

## 支持的数据源

| Provider ID | 名称 | 用量接口 | 显示金额 |
| --- | --- | --- | --- |
| `opencode-go` | [OpenCode Go](https://opencode.ai/docs/go) | `GET https://opencode.ai/zen/go/v1/usage` | 是（$12 / $30 / $60） |
| `cline-pass` | [ClinePass](https://docs.cline.bot/getting-started/clinepass) | `GET https://api.cline.bot/api/v1/users/me/plan/usage-limits` | 是（从 `/users/me/plan` 实时读取套餐上限） |

> Cline 的公开文档见 [Cline API](https://docs.cline.bot/api/overview)。

## 要求

- [OpenCode](https://opencode.ai/v2/docs/) **v2.0.0 或更高版本**
- 已通过 `/connect` 连接 **OpenCode Go** 或 **ClinePass** 订阅
- 能访问对应用量接口的网络环境（端点见上方数据源表）

## 安装

**从 npm 安装（推荐）**：

```sh
opencode plugin add opencode-usage-limits
```

装完重启 TUI 即可。也可使用 Git 规格安装：

```sh
opencode plugin add github:GamingNowEdward/opencode-usage-limits
```

**从本地目录安装**：把插件目录加入 OpenCode 的 CLI 配置 `cli.json`（全局位于 `~/.config/opencode/cli.json`）：

```jsonc
{
  "plugins": [
    {
      "package": "C:/path/to/opencode-usage-limits",
      "options": { "refreshMs": 30000 }
    }
  ]
}
```

CLI 插件在本地 TUI 进程内运行，因此可以直接读取 `auth.json` 与访问网络；它也会在连接
远程 server 时保持可用。详见 [CLI 插件文档](https://opencode.ai/v2/docs/build/plugins/cli)。

## 使用

- 选中 `opencode-go` 或 `cline-pass` 的任意模型，侧边栏即出现对应区块。
- **点击标题行**折叠 / 展开，或在命令面板搜索 **Toggle usage panel**。
- 切换到其他 provider 时区块自动消失。

## 配置项

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `refreshMs` | number | `30000` | 轮询间隔（毫秒） |
| `limits` | object | — | 覆盖内置额度，如 `{ "opencode-go": { "monthly": 100 } }` |

配色阈值写在源码中：`core.ts` 的 `WARN_AT` / `DANGER_AT`，`tui.tsx` 的 `readPalette`。

## 工作原理

插件在 `setup()` 中做三件事：

1. **注册侧边栏 slot**：`context.ui.slot({ prepend: "sidebar.content", ... })`。
2. **读取当前模型**：`context.ui.model.current()?.providerID`（响应式）。
3. **按 provider 拉取用量**：从 `auth.json` 取密钥，带 `Authorization: Bearer` 请求用量接口，
   30 秒轮询一次，1 秒刷新倒计时。

密钥解析顺序：环境变量 `<PROVIDER>_API_KEY` → `~/.local/share/opencode/auth.json`。

## 文件结构

| 文件 | 说明 |
| --- | --- |
| [`tui.tsx`](./tui.tsx) | TUI 插件主体 |
| [`core.ts`](./core.ts) | 鉴权、API 客户端、格式化、阈值（纯逻辑，无 JSX） |
| [`index.ts`](./index.ts) | server 入口（no-op） |
| [`tui.ts`](./tui.ts) | 发现入口，re-export `tui.tsx` |
| [`preview.mjs`](./preview.mjs) | 离线预览脚本 |
| [`AGENTS.md`](./AGENTS.md) | 开发约定 |
| [`CHANGELOG.md`](./CHANGELOG.md) | 变更日志 |

## 离线预览

无需启动 TUI 即可验证接口与排版（会读取你本机的真实密钥）：

```powershell
node preview.mjs             # 两个来源
node preview.mjs cline-pass  # 只预览一个
```

## 排障

1. 确认当前模型属于 `opencode-go` 或 `cline-pass`。
2. 插件文件**保存即热重载**，无需重启；只有新增/删除被 import 的文件时才需退出 TUI 重进。
3. 查看日志：`~/.local/share/opencode/log/opencode.log`，筛 `role=cli` 与 `plugin`。

## 相关

- [OpenCode V2 文档](https://opencode.ai/v2/docs/)
- [插件开发](https://opencode.ai/v2/docs/build/plugins) · [CLI 插件](https://opencode.ai/v2/docs/build/plugins/cli)
- 社区同类插件：[leleor/opencode-usage-limits-sidebar](https://github.com/leleor/opencode-usage-limits-sidebar)

## 许可

[MIT](./LICENSE) © 2026 GamingNowEdward