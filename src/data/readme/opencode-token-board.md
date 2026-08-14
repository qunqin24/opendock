# opencode-token-board

OpenCode CLI 的实时 Token 统计面板，同时支持 Mimo Code。

本项目基于 [opencode-token-watch](https://github.com/Howardzhangdqs/opencode-token-watch) 修改而来，特此鸣谢原项目作者。

**全部折叠**

![preview1](./assets/preview1.png)

**折叠子项**

![preview2](./assets/preview2.png)

**全部展开**

![preview3](./assets/preview3.png)

## 安装

```sh
npm install opencode-token-board
```

在 `opencode.json` 或 `opencode.jsonc` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-token-board"]
}
```

也可以在 OpenCode TUI 中按 `Ctrl+P` 打开命令面板，选择 **Install plugin**，输入 `opencode-token-board` 安装。

## 配置

在 OpenCode TUI 中输入 `/usage` → **设置**，可交互式开关各显示项和切换界面语言，配置自动持久化，无需手动编辑配置文件。

## 用法

在 OpenCode TUI 中输入 `/usage`，选择：

- **HTML 报告** — 选择日期范围，生成仪表盘并在浏览器打开
- **JSON 导出** — 导出完整用量数据至 `~/.opencode/reports/`
- **文本报告** — 导出 Markdown 格式至 `~/.opencode/reports/`
- **设置** — 开关侧边栏显示项、切换语言

## 配置 OpenCode Go 套餐余量查询

1. 输入 `/usage`，点击 **Go 配置**
2. 打开用量查询页面 <https://opencode.ai/workspace/wrk_xxx/go>，将 `wrk_xxx` 填入 **Workspace**
3. 按 `F12` 打开开发者工具 → **应用程序** → **Cookie**，找到 `auth`，复制整段文本填入 **Cookie**
4. 点击完成后重启 TUI

## 数据文件

| 文件 | 路径 | 说明 |
|------|------|------|
| JSONL 日志 | `~/.opencode/tokenwatch.jsonl` | 原始请求日志 |
| 聚合统计 | `~/.opencode/tokenwatch-stats.json` | 持久化性能统计 |
| 报告输出 | `~/.opencode/reports/` | HTML / JSON / Markdown 报告 |

## 系统要求

- OpenCode CLI（支持 `opencode db` 命令）
- Node.js 18+

## 构建

```sh
npm install
npm run build
```

## 相关项目

- [opencode-throughput](https://github.com/Howardzhangdqs/opencode-throughput) — 实时 LLM 性能监控，采集 TTFT/TPS/延迟和成本
- [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — TUI 侧边栏缓存命中率可视化，Token 分布分析
- [magic-context](https://github.com/cortexkit/magic-context/) — 缓存感知的无限上下文 + 跨会话记忆系统
- [opencode-token-watch](https://github.com/Howardzhangdqs/opencode-token-watch) — OpenCode 侧边栏显示 Token 用量
- [AIUsageTracker](https://github.com/rygel/AIUsageTracker) — Windows 托盘小软件，查看模型使用情况

## 许可

MIT
