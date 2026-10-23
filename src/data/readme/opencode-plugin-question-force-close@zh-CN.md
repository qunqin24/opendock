# opencode-plugin-question-force-close

[English](./README.md) | 简体中文

一个 [opencode](https://opencode.ai) **TUI 插件**，在 `question` 工具等待输入时强制显示一个可点击的**关闭按钮**。

opencode 内置的 question 对话框本身没有关闭控件——通常只能按 <kbd>esc</kbd> 来关闭。当对话框滚出屏幕，或者在 <kbd>esc</kbd> 操作不便的环境下，就没有可见的方式来中止问答。本插件渲染一个醒目的 `✕ Force close question` 按钮，点击后调用 `question.reject` 来中止工具——等价于按 <kbd>esc</kbd>，但始终可见且可点击。

<img src="./screenshot.png" alt="截图展示强制关闭按钮" width="600">

---

## 安装

### 从 npm 安装（推荐）

将插件添加到 opencode **TUI** 配置中：

```jsonc
// .opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-plugin-question-force-close"]
}
```

opencode 启动时会通过 Bun 自动安装 npm 插件。

### 从本地文件安装

```jsonc
// .opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["../path/to/plugin.tsx"]
}
```

然后在项目根目录安装插件的运行时依赖：

```bash
bun install   # 或: bun add solid-js@1.9.12 @opentui/solid@0.4.5
```

---

## 使用方法

1. 启动**交互式** TUI：

   ```bash
   opencode
   ```

   > `opencode run "..."` 以无头模式运行，**不会**加载 TUI 插件。必须使用交互式 TUI。

2. 触发任何调用 `question` 工具的 agent。

3. 右下角会出现一个红色的 `✕ Force close question` 按钮，紧贴在 question 对话框下方。点击它（鼠标）即可关闭问答并中止工具。问答被回答或关闭后，按钮会自动隐藏。

---

## 工作原理

插件通过 TUI 事件总线订阅 question 生命周期：

| 事件                | 动作                         |
| ------------------- | ---------------------------- |
| `question.asked`    | 记录待处理的请求 id，显示按钮 |
| `question.replied`  | 清除待处理状态，隐藏按钮     |
| `question.rejected` | 清除待处理状态，隐藏按钮     |

点击时，它调用 `api.client.question.reject({ requestID, directory })`，与内置的 <kbd>esc</kbd> 键绑定使用相同的 SDK 调用。

按钮通过 opencode 的 host-slot 系统（`api.slots.register`）使用 SolidJS 渲染——opencode TUI 也是使用相同的响应式框架构建的。

---

## 限制

- **位置在右下角，不是右上角。** opencode 的 TUI 使用相对盒子布局，没有原生的浮动覆盖层插槽。question 对话框本身（及其 `esc dismiss` 提示）是硬编码在 opencode 源码中的，插件无法注入。`app_bottom` host slot——被包裹在 `flexShrink: 0` 的盒子中，紧贴在 session 区域下方——是在 question 等待时保证可见的最接近的插槽。真正的右上角浮动按钮需要修改 opencode 本身。
- **需要交互式 TUI。** 无头模式（`opencode run`）不加载 TUI 插件。
- **使用未文档化的 API。** opencode 官方插件文档只覆盖了*服务器*插件（hooks）。TUI 渲染插件（`{ id, tui }` 模块、`api.slots`、TUI 事件总线）在 opencode 1.18.x 中是内部/未文档化的。如果这些内部实现改变，本插件可能需要更新。

---

## 依赖要求

| 包                  | 版本     | 说明                                                      |
| ------------------- | -------- | --------------------------------------------------------- |
| opencode            | ≥ 1.18.0 | TUI 插件 + host-slot 系统                                 |
| `@opentui/solid`    | 0.4.5    | 精确锁定；与 opencode 1.18.x 主程序互锁                   |
| `solid-js`          | 1.9.12   | 精确锁定；`@opentui/solid@0.4.5` 的 peerDependency        |
| `@opencode-ai/plugin` | 1.18.13 | 可选 peer（运行时仅用于类型）                            |

> opencode 捆绑了自己的 `solid-js` 和 `@opentui/solid` 副本，并在运行时将插件导入重定向到主程序实例，因此即使插件携带了自己的副本，也不会出现"双重 SolidJS 实例"问题。

---

## 项目结构

```
opencode-plugin-question-force-close/
├── plugin.tsx              # 插件（默认导出 { id, tui }）
├── package.json            # npm 元数据 + 锁定版本依赖
├── README.md
├── README.zh-CN.md
├── LICENSE
└── .opencode/              # 本地开发/测试环境（不发布）
    ├── opencode.json
    └── tui.json            # 通过 "../plugin.tsx" 加载插件
```

---

## 开发

```bash
git clone https://github.com/zylcold/opencode-plugin-question-force-close.git
cd opencode-plugin-question-force-close
bun install                # 在根目录安装 solid-js + @opentui/solid
opencode                   # 交互式 TUI；触发一个 question 来测试
```

本仓库的 `.opencode/tui.json` 已经指向 `../plugin.tsx`，所以克隆 + `bun install` + `opencode` 即可本地运行插件。

### 调试技巧

TUI 插件失败默认是**静默**的——交互式渲染器会吞掉 `console.*`。如果没有任何东西渲染，在 `plugin.tsx` 内部注入一个磁盘探针：

```ts
import { appendFileSync } from "node:fs"
const diag = (stage: string, data?: unknown) =>
  appendFileSync("/tmp/qfc.log", `${stage} ${JSON.stringify(data ?? "")}\n`)
diag("module-imported")  // 跟踪每个生命周期阶段
```

---

## 许可证

[MIT](./LICENSE)