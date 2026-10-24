# opencode-tokenwatch

[English](./README.en.md) · **简体中文**

![Sidebar](./assets/sidebar.png)

OpenCode CLI的终端监控插件，在侧边栏实时显示Token用量、缓存命中率与模型响应速度，并支持一键生成网页版可视化用量报表。

> 本项目是 [TTWK/opencode-tokenwatch](https://github.com/TTWK/opencode-tokenwatch) 的 fork，npm 包名为 `@jasonencode/opencode-tokenwatch`。

---

## 主要特性

- **侧边栏实时看板**：会话中随时查看各模型的输入输出Token、预估花费、缓存命中率，以及当前会话的平均首字延迟与生成速率。
- **缓存命中率与趋势**：按模型追踪缓存利用效率，用箭头标注近几次请求的命中率是在上升还是下降。
- **上下文窗口占用**：显示当前会话最后一个 assistant 请求的上下文用量（已用 / 模型上限 / 百分比），接近上限时变色提醒；压缩（`/compact`）后会随最新消息回落。
- **Token构成归类**：自动将Token按系统提示词、用户输入、工具调用和模型输出分别统计，清楚定位上下文占用大头。
- **交互式用量报告**：在终端输入 `/usage` 即可在浏览器中打开ECharts 交互仪表盘，查看历史用量趋势、模型横向对比与失败请求统计；也可一键导出为JSON或Markdown文件。
- **面向 OpenCode 2.x**：基于 2.1.3 的 Plugin API 与 OpenTUI 0.6.6 构建，直接使用宿主提供的实时事件与侧边栏插槽。

---

## 安装与配置

### 1. 安装

推荐使用 OpenCode 自带的插件管理器（会安装到全局插件缓存并写入全局配置）：

```sh
opencode plugin add @jasonencode/opencode-tokenwatch
```

需要固定版本时：

```sh
opencode plugin add @jasonencode/opencode-tokenwatch@0.7.0
```

### 2. 升级 / 启用

`opencode plugin add` 会自动启用插件。升级已安装的旧版本：

```sh
opencode plugin update
```

如果升级后仍加载旧版本，删除对应缓存目录后重新安装：

- Windows：`%USERPROFILE%\.cache\opencode\npm\@jasonencode\opencode-tokenwatch@latest`
- macOS / Linux：`~/.cache/opencode/npm/@jasonencode/opencode-tokenwatch@latest`

> scoped 包会在 `npm` 目录下多一层 `@jasonencode` 子目录。

本地开发（尚未发布）时，可在项目的 `opencode.json`（或 `opencode.jsonc`）里用绝对路径指向本仓库：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-tokenwatch"]
}
```

> OpenCode 2.x 按包名解析插件时会优先使用自身缓存；如果缓存里仍是旧版本，仅修改项目配置不会自动刷新。用 `opencode plugin add/update` 可保证缓存与配置同步。若只希望在 CLI 侧启用（例如连接远程服务端），也可在 `cli.json` 中配置同样的 `"plugins"` 数组。

---

## 常用操作

在终端对话框中输入 `/usage` 即可唤出操作菜单：

- **HTML 报告**：选择统计日期范围，在默认浏览器中打开交互式图表。
- **导出数据**：导出结构化 JSON 或 Markdown 报告，默认保存在 `~/.opencode/reports/` 目录下。
- **设置**：在弹出的交互菜单中开关各个显示区块或切换中英文显示。改动会自动保存，不需要手动修改配置文件。

---

## 系统要求

- **OpenCode CLI**：2.x（以 2.1.3 为基线）
- **OpenTUI**：≥ 0.6.6（由 OpenCode 宿主提供，无需单独安装）

---

## 相关项目

- [opencode-throughput](https://github.com/Howardzhangdqs/opencode-throughput) — 实时 LLM 性能监控，采集 TTFT/TPS/延迟和成本
- [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — TUI 侧边栏缓存命中率可视化，Token 分布分析
- [magic-context](https://github.com/cortexkit/magic-context/) — 缓存感知的无限上下文 + 跨会话记忆系统

---

## 协议

MIT
