# opencode-colorful-timeline

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个 OpenCode Desktop 插件：通过注入一条作用域受限的样式表，让 GUI 会话时间线里的
Markdown 呈现与 TUI 一致的配色。

## 染色范围

会话区的 Markdown 将使用 TUI 渲染时相同的 `markdown-*` 配色：标题、粗体、斜体、
引用块、列表标记和行内代码。每个颜色都是 `light-dark(<浅色>, <深色>)` 组合，
自动跟随当前外观模式。

刻意弱化的区域不受影响：推理（reasoning）部分、工具输出、路径行内代码
仍保留它们自己的配色。

## 启用

将包添加到全局配置 `~/.config/opencode/opencode.json(c)`：

```jsonc
{
  "plugins": ["@qthinker/opencode-colorful-timeline"],
}
```

也可以直接安装：

```sh
opencode plugin add @qthinker/opencode-colorful-timeline
```

重新构建后，GUI 部分会在每个窗口自动重载；本插件没有服务端部分，其余组件
无需重启。可在 **Settings > Extensions > Plugins** 中禁用，或直接移除该配置项。

## 本地开发

```bash
npm install
npm run build
```

GUI 产物输出到 `dist/gui-experimental.cjs`。想试用本地构建时，把 `plugins`
配置项指向本仓库的绝对路径即可（替代包名）。

### 修改配色

编辑 `src/tui-colors.css` 并运行 `npm run watch`，每次构建都会实时生效。
每个颜色对为 `light-dark(<浅色>, <深色>)`，匹配当前外观模式。

## 许可证

[MIT](./LICENSE)
