# opencode-plugin-ask-questions-in-right-panel

把 OpenCode Desktop 的 Question 卡片从底部输入区移到右侧面板，避免它挡住正在阅读的回复或计划。

<p align="center">
  <img src="docs/preview.png" alt="Question 面板显示在右侧，底部不再有遮挡" width="900">
</p>

<p align="center">
  <sub>真实 Desktop 会话：多个问题一次展开，自定义答案在「其他…」卡片内输入，底部不再有遮挡。</sub>
</p>

## 功能

- 有新的提问时，右侧自动打开并选中 **Questions** 标签页
- 一个问题表单里的所有问题**上下排列、一次看全**，不再左右翻页
- 每个问题独立作答；顶部显示 `已答 n / N`，已答的问题带标记
- 支持单选、多选、选项描述、自定义答案（`custom`）以及纯文本问题
- 树中同时有多个待答问题（主会话 + 运行中的子会话）时，顶部显示队列，标注来源会话
- 面板可见时隐藏底部 Question dock；面板被关闭、侧栏被收起或切换会话后，底部 dock 自动恢复
- 窗口宽度小于 768px 时插件完全不介入，继续使用宿主原来的底部卡片
- 明暗主题跟随宿主 `--v2-*` token；中文 / English 文案

## 环境

- OpenCode Desktop `2.2.x`（使用 `@opencode/plugin@2.2.1` 的 GUI 插件 API）
- 依赖宿主现有的 `data-component="dock-prompt"` / `data-kind="question"` 选择器来隐藏底部卡片

## 安装

包名：

```text
@devdengchao/opencode-plugin-ask-questions-in-right-panel
```

在全局配置 `~/.config/opencode/opencode.jsonc` 中加入插件。Windows 上通常是
`C:\Users\<用户名>\.config\opencode\opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-ask-questions-in-right-panel"
  ]
}
```

也可以固定版本：

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-ask-questions-in-right-panel@0.1.0"
]
```

保存后如果 GUI 没有重新加载，重启 Desktop，或在 **Settings > Extensions > Plugins** 中确认插件已启用。

### 从源码安装

```bash
git clone git@github.com:DevDengChao/opencode-plugin-ask-questions-in-right-panel.git
cd opencode-plugin-ask-questions-in-right-panel
npm ci
npm run build
```

构建产物是 `dist/gui.cjs`。把全局配置指向本地目录：

```jsonc
{
  "plugins": [
    "file:///E:/my/open-source/opencode-plugin-ask-questions-in-right-panel"
  ]
}
```

## 使用

提问出现后不需要手动操作：右侧面板会自动展开。有未答问题时，也可以从侧栏的 **+** 菜单重新打开 Questions。

- **作答**：点选项或输入自定义答案，然后按 **Submit**（`Ctrl/⌘ + Enter`）
- **忽略**：按 **Dismiss** 或 `Esc`，等价于宿主原来的取消
- **关闭面板**：点标签页上的 ×，底部 dock 会恢复；同一个问题不会再自动弹出，下一个新问题仍会自动打开
- **多个问题**：全部展开，滚动查看；已答的问题会显示「已答」
- **多个待答表单**：顶部队列可切换，回答后自动落到下一个

## 工作原理

插件只使用宿主公开的 GUI 插件 API：

- `Panel`（`region: "side"`、`transient`）注册右侧标签页
- `ctx.sessions.current()` + `session.server.data.session.form.{list,sync,reply,cancel}` 读取和回答表单
- `ctx.layout.open/state/close/narrow` 控制侧栏与窄屏行为
- 一个 `createEffect` 在「面板可见且仍有待答问题」时给 `<html>` 加上 `data-aqrp-dock`，配套 CSS 隐藏底部卡片；条件不成立时属性移除，dock 自动恢复
- 表单按 `metadata.kind === "question"` 识别，树遍历顺序与宿主的 `session-request-tree` 一致

不会修改宿主文件，也不会把宿主 DOM 搬进侧栏。

## 已知限制

- 隐藏底部 dock 依赖宿主内部的 `data-component` / `data-kind` 属性名；宿主大版本改名后，最坏情况是「不隐藏」，底部会出现第二份卡片，不会崩溃
- 时间线里的 question 工具调用卡片不属于 dock，本插件不处理
- 只对当前路由会话及其运行中的子会话执行 `form.sync`，与宿主原有行为一致
- 自定义答案使用多行文本框，宿主的折叠/展开动画没有复刻

## 开发

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev      # vite build --watch
npm run demo     # 在 http://localhost:5173 预览面板的各个场景
```

目录：

```text
src/index.ts            server 端插件，声明 id
src/gui.tsx             Panel / Style / 自动打开 / dock 隐藏
src/question-panel.tsx  面板 UI
src/forms.ts            树遍历、字段提取、answer 构造（纯函数，有单测）
src/labels.ts           中英文文案
src/styles.css          面板样式 + dock 隐藏规则
tests/forms.test.ts     vitest
```

## License

MIT
