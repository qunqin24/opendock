# OpenCode Agent Response Time

在 OpenCode Desktop 的会话里，悬浮到 agent 回复底部的耗时上，查看这一轮响应完成的具体时间。

<p align="center">
  <img src="https://raw.githubusercontent.com/DevDengChao/opencode-plugin-show-agent-response-time/main/docs/preview.jpg" alt="悬浮 agent 响应耗时查看完成时间" width="900">
</p>

<p align="center">
  <sub>悬浮 agent 回复底部的耗时，用与用户消息时间提示一致的样式查看本轮响应完成的具体时间。</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@devdengchao/opencode-plugin-show-agent-response-time">
    <img alt="npm" src="https://img.shields.io/npm/v/@devdengchao/opencode-plugin-show-agent-response-time">
  </a>
  <a href="https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/actions/workflows/ci.yml/badge.svg">
  </a>
  <img alt="OpenCode Desktop" src="https://img.shields.io/badge/OpenCode%20Desktop-2.2.x-111">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

<p align="center">
  <a href="./README.md"><strong>简体中文</strong></a> · <a href="./README.en.md">English</a>
</p>

OpenCode 默认会在 agent 回复底部显示本轮耗时，例如 `4 分钟 46 秒`。这个插件让耗时可悬浮：鼠标停留后，用与用户消息时间提示一致的样式显示完整时间，例如：

```text
2026年10月30日星期五 GMT+8 00:46:42
```

显示的是这一轮响应**完成**的时间，和底部耗时终点的含义一致。

## 功能

- **悬浮查看**：悬浮 agent 回复底部的耗时，显示完整日期、时区和秒级时间
- **与原生一致**：复用 OpenCode 的紧凑 tooltip 样式，跟随亮色/暗色主题
- **跟随语言**：使用 `Intl.DateTimeFormat` 和当前界面语言，和用户消息时间提示格式相同
- **精确到本轮**：从当前会话消息中计算该轮最后一条助手消息的 `time.completed`
- **不打断布局**：只在时长项上增加悬浮行为，不改变底栏布局
- **自动清理**：时间线虚拟滚动、消息重新渲染、切换会话或卸载插件后自动恢复
- **只读**：不修改 Markdown、消息内容、数据库或其他客户端

## 快速开始

### 环境要求

- OpenCode Desktop **2.2.x**（本项目在 2.2.1 上开发和验证）
- 使用 npm 安装时不需要额外安装 Node.js
- 从源码构建时需要 Node.js **20.19+** 和 npm
- Windows、macOS 或 Linux 上的 OpenCode Desktop

### 从 npm 安装（推荐）

包名：

```text
@devdengchao/opencode-plugin-show-agent-response-time
```

在全局配置文件 `~/.config/opencode/opencode.jsonc` 中加入插件。Windows 上通常是
`C:\Users\<用户名>\.config\opencode\opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-show-agent-response-time"
  ]
}
```

也可以固定版本：

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-show-agent-response-time@0.1.0"
]
```

OpenCode 会从 npm 安装并加载这个包，不需要克隆仓库或手动构建。

保存后如果 GUI 没有重新加载，可以重启 Desktop，或在 **Settings > Extensions > Plugins**
中确认 `opencode-plugin-show-agent-response-time` 已启用。

### 从源码安装（开发）

```bash
git clone git@github.com:DevDengChao/opencode-plugin-show-agent-response-time.git
cd opencode-plugin-show-agent-response-time
npm install
npm run build
```

构建产物为 `dist/gui.cjs`。然后把全局配置指向本地目录：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///E:/my/open-source/opencode-plugin-show-agent-response-time"
  ]
}
```

路径需要换成你本机的绝对路径。macOS / Linux 示例：

```jsonc
"plugins": [
  "file:///Users/you/opencode-plugin-show-agent-response-time"
]
```

保存后重启 OpenCode Desktop。也可以在 **Settings > Extensions > Plugins** 中确认插件已启用。

### 调试

可以把插件配置改成对象形式，查看 renderer 日志：

```jsonc
{
  "plugins": [
    {
      "package": "file:///E:/my/open-source/opencode-plugin-show-agent-response-time",
      "options": {
        "debug": true
      }
    }
  ]
}
```

日志前缀为 `[agent-response-time]`。

## 使用

1. 打开一个已经完成的 OpenCode 会话。
2. 把鼠标移到某条 agent 回复上，底栏会显示 `Build · 模型 · 耗时`。
3. 再把鼠标停留在耗时（例如 `4 分钟 46 秒`）上。
4. 约 800ms 后出现完整时间 tooltip。
5. 时间格式与悬浮用户消息时间时一致。

耗时仍在生成、响应被中断且没有完成时间、或消息数据尚未加载时，不会显示 tooltip。

## 兼容性

- 当前验证版本：**OpenCode Desktop 2.2.1**
- 依赖 OpenCode Desktop 的 GUI 插件 API；该 API 目前仍是 **experimental**
- 只处理会话时间线中的助手回复底栏
- **不支持 TUI**。TUI 没有对应的消息底栏扩展点

> 如果 OpenCode 修改了会话时间线的 DOM 结构，这个插件可能需要适配。相关选择器集中在
> `src/response-time.ts` 顶部，便于后续维护。

## 工作原理

OpenCode Desktop 会把每条助手回复渲染成类似下面的结构：

```html
<div data-message-id="msg_user_xxx">
  <div data-component="text-part" data-timeline-part-id="part_text_xxx">
    <div data-slot="text-part-body">...</div>
    <div data-slot="text-part-copy-wrapper">
      <button>复制</button>
      <span data-slot="text-part-meta">
        <span data-slot="text-part-meta-item">Build</span>
        ...
        <span data-slot="text-part-meta-item">4 分钟 46 秒</span>
      </span>
    </div>
  </div>
</div>
```

插件监听 `[data-slot="session-timeline-scroll"]`，用 `MutationObserver` 找到回复底栏，并标记耗时项。悬浮时通过当前会话的已同步消息数据：

```ts
ctx.sessions.current()?.server.data.session.message.list(session.id)
```

找到对应的用户消息，再取该轮最后一条助手消息的 `time.completed`。格式化后使用与 OpenCode 用户消息时间提示相同的 tooltip 结构显示。插件只修改 DOM 的悬浮状态，不写入会话内容。

## 开发

```bash
npm run demo       # 浏览器独立演示页，默认 http://localhost:5173
npm run typecheck  # TypeScript 类型检查
npm run test       # jsdom 单元测试
npm run build      # 构建 dist/gui.cjs
npm run dev        # 监听构建
```

本地调试时，把全局配置中的 `plugins` 指向本项目目录。修改源码后运行 `npm run dev` 或 `npm run build`。

### 文件结构

```text
src/
├─ index.ts          # server 入口：提供插件 id，输出加载日志
├─ gui.ts            # GUI 入口：注入样式、安装响应时间增强
├─ response-time.ts  # 时间线扫描、耗时定位、tooltip 与清理
├─ session-time.ts   # 从会话消息计算本轮响应完成时间
├─ format-time.ts    # 与用户消息一致的完整时间格式化
└─ styles.css        # 悬浮态、tooltip 兜底样式
demo/                # 浏览器演示页
tests/               # jsdom 单元测试
```

## 常见问题

### 悬浮后没有出现时间

请依次检查：

1. OpenCode Desktop 是否为 2.2.x。
2. **Settings > Extensions > Plugins** 中插件是否已启用。
3. 会话中的回复是否已经完成；流式生成中的回复没有完成时间。
4. 是否悬浮在回复底栏的**耗时**上，而不是模型名或复制按钮上。
5. 如果是本地源码安装，确认已经执行过 `npm run build`，并且 `dist/gui.cjs` 存在。
6. 打开调试选项后查看 Desktop renderer 日志中是否有 `[agent-response-time]` 输出。

### 时间与耗时终点对不上

tooltip 显示的是该轮最后一条助手消息的 `time.completed`；底栏耗时是同一终点减去用户消息 `time.created`，两者语义一致。若消息被中断或数据尚未同步，可能没有完成时间。

### 会修改会话内容吗？

不会。插件只读取已同步的消息数据并修改当前页面的悬浮显示，不修改 Markdown、数据库或其他客户端。

### 支持 TUI 吗？

不支持。TUI 没有对应的消息底栏扩展点。

## 已知限制

- 只增强会话时间线中的助手回复，不增强设置页、侧边栏等位置。
- 依赖 OpenCode Desktop 当前的 DOM 结构，升级后可能需要适配。
- 目前仅支持鼠标悬浮和键盘聚焦，不支持触屏长按。
- 只在响应完成后显示；没有 `time.completed` 时不显示。
- 时间格式由浏览器/系统时区和当前界面语言决定。

## 参与贡献

欢迎提交 Issue 和 Pull Request。

- [问题反馈](https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/issues)
- [更新日志](./CHANGELOG.md)
- [English README](./README.en.md)

## License

[MIT](./LICENSE) © 2026 DevDengChao
