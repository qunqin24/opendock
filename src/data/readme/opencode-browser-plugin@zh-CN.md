# OpenCode 浏览器插件

一个基于 [Playwright](https://playwright.dev/) 的浏览器自动化插件，专为 [OpenCode](https://opencode.ai) 设计。它提供浏览器控制工具，让 AI 代理可以在 OpenCode 会话中浏览网页、与页面元素交互、截图以及执行 JavaScript。

[English](./README.md)

## 功能特性

- **无头与有头模式** — 支持无界面运行或打开可见窗口用于调试/演示。
- **基于 Ref 的元素定位** — 通过 ARIA 快照为可交互元素生成稳定的 `ref` 标识（如 `e1`、`e2`），实现可靠的点击和输入操作。
- **多标签页支持** — 通过 `page_id` 同时打开和管理多个页面。
- **持久化浏览器配置** — 会话数据（cookies、localStorage 等）保存在 `~/.opencode/browser-profile`。
- **空闲自动关闭** — 浏览器在 30 分钟无操作后自动关闭，节省资源。
- **快捷工具** — 提供四个专用快捷工具（`browser_start`、`browser_snapshot`、`browser_click`、`browser_type`）用于最常用的操作。

## 安装

在 [OpenCode 配置文件](https://opencode.ai/docs/config/) 中添加插件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-browser-plugin"]
}
```

就这样。OpenCode 会在下次启动时自动安装插件。

> **注意：** 你还需要安装 Playwright Chromium：`bunx playwright install chromium`

## 使用方法

### 基本流程

```
1. 启动浏览器     →  browser(action: "start")
2. 打开网址       →  browser(action: "open", url: "https://example.com")
3. 获取页面快照    →  browser(action: "snapshot")
4. 与元素交互      →  browser(action: "click", ref: "e1")
                      browser(action: "type", ref: "e3", text: "hello")
5. 完成后关闭      →  browser(action: "stop")
```

### 主工具 — `browser`

一个通过 `action` 参数进行调度的多路复用工具：

| 操作         | 说明                       | 关键参数                             |
| ------------ | -------------------------- | ------------------------------------ |
| `start`      | 启动浏览器                  | `headed`                             |
| `stop`       | 关闭浏览器并清理             | —                                    |
| `open`       | 在新标签页中打开 URL         | `url`, `page_id`                     |
| `navigate`   | 在当前标签页导航到 URL       | `url`                                |
| `back`       | 浏览器后退                  | —                                    |
| `snapshot`   | 获取带元素 ref 的 ARIA 快照  | `path`                               |
| `screenshot` | 截取页面或元素的截图         | `ref`, `path`, `full_page`           |
| `click`      | 点击元素                    | `ref`, `selector`, `wait`            |
| `type`       | 在元素中输入文本             | `ref`, `selector`, `text`, `submit`, `slowly` |
| `evaluate`   | 在页面上下文中执行 JavaScript | `code`                               |
| `wait`       | 等待一段时间或网络空闲       | `wait`                               |
| `close`      | 关闭指定标签页               | `page_id`                            |

### 快捷工具

| 工具               | 说明                       | 关键参数                  |
| ------------------ | -------------------------- | ------------------------- |
| `browser_start`    | 启动浏览器（默认有头模式）   | `headed`                  |
| `browser_snapshot` | 获取页面可交互元素的 ref     | `page_id`                 |
| `browser_click`    | 通过 ref 点击元素           | `ref`, `page_id`          |
| `browser_type`     | 通过 ref 在元素中输入文本    | `ref`, `text`, `submit`, `page_id` |

### 示例：在网站中搜索

```
1. browser_start(headed: true)
2. browser(action: "open", url: "https://www.google.com")
3. browser_snapshot()
   → 返回 ref 如：e1 (textbox), e2 (button "Google Search"), ...
4. browser_type(ref: "e1", text: "OpenCode AI")
5. browser_click(ref: "e2")
```

### 示例：截图

```
browser(action: "screenshot", path: "output.png", full_page: true)
```

### 示例：执行 JavaScript

```
browser(action: "evaluate", code: "document.title")
```

## 架构

- **单文件** — 所有代码都在 `index.ts` 中，无需构建步骤。
- **模块级状态** — 浏览器状态保存在一个普通的 `state` 对象中（context、pages、refs 等）。
- **Ref 系统** — `buildSnapshot()` 在 `<body>` 上运行 Playwright 的 ARIA 快照，为可交互元素（按钮、链接、输入框等）分配递增的 `e1`、`e2`、… ref，并按页面存储。点击/输入操作通过 `getLocatorByRef()` 使用 `page.getByRole()` 解析 ref。
- **纯 ESM** — 项目使用 `"type": "module"`，通过 Bun 原生执行 TypeScript。

## 配置项

| 配置项 | 默认值 | 说明 |
| ------ | ------ | ---- |
| 配置文件目录 | `~/.opencode/browser-profile` | 浏览器数据（cookies、存储等） |
| 空闲超时 | 30 分钟 | 无操作后自动关闭浏览器 |
| 视口大小 | 1280 × 720 | 默认浏览器视口尺寸 |
| 默认超时 | 30 000 ms | 页面导航和操作的超时时间 |

## 许可证

MIT
