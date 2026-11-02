# 足迹 · opencode-footprints

OpenCode 侧边栏的**用户提问时间线**：按日期分组列出当前会话里你说过的每一句，点一下跳回去，滚动时自动跟随，还能按天快速切换。

> 由 [huahai0202/opencode-user-timeline](https://github.com/huahai0202/opencode-user-timeline) 分叉而来，在原版基础上重做了交互与配色。MIT 协议。

---

## 效果

![足迹面板](docs/screenshot.png)

```
◆ 足迹 (96)
跨度 1 天 3 小时
◀ 10-30 ▶  3/3
01:12 ─ 现在还有什么可以改进的吗
01:16 ─ 我决定自己建仓库，发布属…
01:18 ─ 我感觉这个配色不好
01:24 ─ 算了还是换成最开始那种配…
01:30 ─ 可以
01:32 ● 以及我觉得他不应该在右侧…
```

## 功能

| 功能 | 说明 |
|---|---|
| **时间线列表** | 按日期分组，固定高度，超出部分滚动 |
| **点击跳转** | 点任意节点，主会话跳到那条消息 |
| **当前节点跟随** | 滚动主会话时，圆点自动移到视口对应的那条 |
| **日期切换** | `◀` / `▶` 在日期之间跳，时间线滚到那天第一条 |
| **跨度统计** | 显示这段会话跨了多久、共多少条 |
| **悬停预览** | 鼠标停在节点上，标题下方展开两行完整内容 |
| **摘要自适应** | 摘要按面板实际宽度截断，不硬编码列数，侧边栏拉宽拉窄都跟得上 |
| **贴底联动** | 主会话回到底部（如 jump to latest）时，时间线也回到最新 |
| **可调步长** | 滚轮每格 1/2/3/5 行，用命令切换 |
| **细滚动条** | 右侧 1 列宽，只在内容超出时出现 |

## 安装

**npm / GitHub（发布后）**

```bash
opencode plugin add opencode-footprints
# 或
opencode plugin add github:你的用户名/opencode-footprints
```

**本地目录**

`opencode.json`：

```jsonc
{
  "plugins": ["D:/path/to/opencode-footprints"]
}
```

路径必须是**目录**（OpenCode 会读目录里的 `package.json` 和 `exports["./tui"]`）。

## 配置

```jsonc
{
  "plugins": [
    {
      "package": "opencode-footprints",
      "options": {
        "visibleRows": 10,   // 面板固定显示几行，默认 10
        "scroll": true       // false = 退回静态显示最新 N 条，不启用滚动区
      }
    }
  ]
}
```

`scroll: false` 是给个别 beta 版本留的退路——scrollbox 走原生渲染核心，个别版本上可能不稳定。

## 命令

| 命令 | 快捷键 | 说明 |
|---|---|---|
| `/footprints` | `alt+u` | 显示 / 隐藏面板 |
| `/footprints-step` | — | 循环切换滚轮步长（1 / 2 / 3 / 5 行） |

命令面板里搜「足迹」也能找到这两条。步长设置会持久保存。

## 配色

跟随 OpenCode 当前主题，但会把主题色的饱和度压到 0.28 以下再显示，避免高饱和主题（Dracula、Solarized）刺眼。

| 用途 | 取自主题 | 兜底 |
|---|---|---|
| 强调（标题 / 圆点 / 滚动条 / 日期） | `text.action.primary` 的 selected 状态 | `#e0a458` 琥珀 |
| 正文 | `text.base` | `#ece3d4` 暖白 |
| 悬停摘要 | `text.faint` | `#8a7d6a` 暖灰棕 |
| 次要（时间 / 计数 / 跨度） | `text.muted` | `#9a9088` 暖灰 |
| 分隔线 | `border.base` | `#4a4238` 暖灰 |
| 跳转遮罩 | `background.raised.base` | `#2a2622` 暖深灰 |

主题缺字段时退回上面那套暖色兜底，不会退化成纯白或纯黑。面板本身透明，用终端自己的底色。

## 与上游的差异

相对 `huahai0202/opencode-user-timeline@0.2.4`：

- **滚轮步长**：原版插件自建的 scrollbox 没传 `scrollAcceleration`，退回默认实现（每格 1 行），长会话几乎翻不动（上游 issue #3）。这里传了自定义加速器，并做成可调命令。
- **当前节点跟随**：新增。按 `screenY` 反查视口顶部对应的用户消息，自动更新圆点；跳转期间抑制，避免刚选中就被弹回。
- **日期切换**：新增。`◀`/`▶` 按分组跳转，用行号计算 `scrollTo` 位置。
- **悬停预览**：新增。两行、固定高度，不会因为撑高布局而频闪。
- **贴底联动**：新增。主会话回到底部时时间线跟随（边沿触发，手动滚动后 3 秒内不打扰）。
- **配色**：改为暖色系固定色板。
- **命令**：加 `footprints.*` 前缀，新增步长切换。

同时修了上游仓库 main 落后于 npm 的问题（`@opencode-ai/plugin` → `@opencode/plugin`），否则源码构建出来加载不了。

## 已知限制

- **依赖宿主渲染结构**：当前节点跟随靠 `context.renderer.root.findDescendantById` 和 `screenY`。OpenCode 改布局就可能失效，届时跟随会退化成"不更新"而不是报错。
- **需要 OpenCode 2.x**（`@opencode/plugin` 2.0.x 系列）。
- 气泡/圆点的位置以**视口顶部**为准：视口顶部是助手回复时，圆点停在上一条用户消息。

## 开发

```bash
npm install
npm run build     # babel src -> dist
npm run typecheck # tsc --noEmit，babel 不做类型检查
npm test          # node:test，31 + 18 个用例
npm run verify    # typecheck + build + test，发版前跑这个
```

改完 `dist` 后，OpenCode 会热重载本地插件目录（不行就重启）。

## License

MIT，见 [LICENSE](./LICENSE)。原版版权归原作者。
