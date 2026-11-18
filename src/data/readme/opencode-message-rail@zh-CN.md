# opencode-message-rail

[English](README.md) | 简体中文

一个 [OpenCode](https://opencode.ai) TUI 插件：在对话区右侧边缘显示一条「消息导轨」，每轮用户消息对应一根刻度（tick），两端有上/下箭头，悬停停留后弹出预览卡片，点击刻度即可跳转到对应消息。

[![CI](https://github.com/maxvalla/opencode-message-rail/actions/workflows/ci.yml/badge.svg)](https://github.com/maxvalla/opencode-message-rail/actions/workflows/ci.yml)

要求 OpenCode **≥ 2.3.2**（TUI 插件 API 2.3.2）、OpenTUI **≥ 0.8.4**。

## 安装

```bash
opencode plugin opencode-message-rail -g    # 写入全局配置（~/.config/opencode）
opencode plugin opencode-message-rail       # 仅当前项目
```

这条命令会把包装进 OpenCode 的插件缓存，并写进 TUI 配置——`-g` 写
`~/.config/opencode/tui.json`，否则写项目内的 `.opencode/tui.json`：

```json
{
  "plugin": ["opencode-message-rail"]
}
```

装完重启 TUI。

如果从源码装：

```bash
git clone https://github.com/maxvalla/opencode-message-rail.git
cd opencode-message-rail
npm install                        # 安装依赖并构建 dist/
opencode plugin "$PWD" -g          # 注册这个目录
```

`npm install` 不能省：仓库里是源码，`dist/` 由 `prepare` 构建。

`opencode plugin github:maxvalla/opencode-message-rail` 在 OpenCode 2.3.2 上**不可用**：安装器会拦截包里的 `prepare` 脚本，不会生成 `dist/`。

## 按键

| 按键 | 作用 |
| --- | --- |
| `Alt+R` | 显示 / 隐藏导轨（跨重启保持） |
| `Alt+[` / `Alt+]` | 上一轮 / 下一轮 |
| 点击刻度 | 跳转到该轮 |
| 点击 `↑` / `↓` | 跳到视口上方 / 下方的最近一轮 |
| 在导轨上滚轮 | 滚动对话区（不需要点击） |
| `/rail` | 在输入框内切换开关 |

## 配置

选项写在插件的 `options` 里：

```json
{
  "plugins": [
    {
      "name": "opencode-message-rail",
      "options": { "enabled": true, "wheelLines": 3, "dwellMs": 120 }
    }
  ]
}
```

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 启动时是否显示导轨（仍可用 `Alt+R` 切换） |
| `wheelLines` | `3` | 在导轨上滚一格滚动多少行（限制在 1–5） |
| `dwellMs` | `120` | 悬停多久后弹出预览卡片 |
| `debugFile` | `""` | 把 JSON 状态快照写到这个路径，用于排障——见「隐私」 |

## 工作原理

- 导轨占用的位置是对话列自身的右侧内边距（2 列），坐标取自 scrollbox 的 `screenX`/`width` 与其父容器的矩形，**不用** renderer 的宽度。
- 能力分四档，逐级降级而不是报错：`0` 不在会话页，`1` 探针失败，`2` 知道轮次顺序但不知道位置（均匀排布），`3` 精确锚定。
- 所有宿主读取都包在 `guard()` 里：宿主结构变化只会让导轨消失，不会让 TUI 崩掉。10 秒内累计 3 次错误会锁定 30 秒。
- 跳转分级：直接滚动 → 展开窗口 → 回放宿主导航 → 分页加载历史。只有全部失败才弹 toast。
- 指针输入有两个来源、汇聚到同一个 sink：overlay 上的原生 JSX 回调，以及 `renderer.stdin` 上的原始 SGR 解析（宿主会在插件之前消费鼠标事件）。第一个能解析出真实导轨行的原生事件会让 SGR 解析器自动退休；`debugFile` 里的 `pointerSource` 会告诉你哪条路在生效。

## 兼容性

| | |
| --- | --- |
| OpenCode | ≥ 2.3.2；在 2.3.2（macOS）上做过交互验证 |
| OpenTUI | ≥ 0.8.4（原生后端的 `ScrollBox`） |
| 终端 | 建议 ≥ 44 列；更窄时导轨仍在，但预览卡片会变窄 |
| 平台 | macOS、Linux；Windows 终端未验证 |

版本按「宿主保证的下限」对齐、而不是追最新版，且所有更新的宿主能力都走 duck-typing：没有 `afterLayout` 或 `scrollChildIntoView` 的构建会回落到之前已验证的路径。

## 排障

**完全看不到导轨。** 看 `debugFile` 里的 `tier`：`0` 表示当前不在会话页；`1` 表示找不到或读不到对话区 scrollbox。如果另一个插件也占了 `session.composer.top`，两个 overlay 可能重叠。

**导轨在，但当前轮次从不高亮**（`tier` 一直停在 `2`）——已挂载的行没有携带消息 id。导轨仍可用，只是无法标出你正处在哪一轮。

**`pointerSource` 是 `"sgr"`。** 说明这个构建仍会在插件之前消费鼠标事件，点击是通过原始 stdin 序列路由的。功能正常，只是走了兜底路径。

**悬停卡片位置不对。** 请带 debug 快照开 issue——卡片锚定在刻度**实际被绘制的那一行**，出现偏差意味着布局变了。

**`opencode plugin github:…` 报 `git dep preparation failed`。** 在 2.3.2 上是预期行为：安装器拦截了 `prepare`，不会生成 `dist/`。请按上面的「从源码安装」操作。

**`Alt+R` 与别的插件冲突。** 用 `enabled: false` 关掉，或通过命令面板改键，命令 id 是 `message-rail.toggle`、`message-rail.prev`、`message-rail.next`。

## 隐私

插件**不发起任何网络请求**。它只从宿主的本地缓存读取当前会话的消息列表（id、时间戳、正文——正文用于预览卡片）。

`debugFile` 会定时写入 JSON 快照，其中**包含消息 id 与轮次列表**（不包含卡片渲染出的正文，但 id 与几何数据在）。仅用于排障，请指向临时路径，用完删除。

## 开发

```bash
npm install      # 会通过 prepare 构建 dist/
npm run typecheck
npm test
npm run build
```

测试需要 [Bun](https://bun.sh)（`bun test`）。测试必须带 `--conditions=browser`：solid-js 的 `node` 导出条件会解析到 SSR 构建，其中 `createMemo` 永不失效，controller 的测试就会对着一个冻结的 view 做断言。`src/geom.test.ts` 覆盖纯几何；`src/controller.test.ts` 用假宿主驱动真实 controller，不需要终端。

模块划分与必须守住的不变式见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT © maxvalla
