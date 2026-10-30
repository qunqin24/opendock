# opencode-glance

中文 · [English](./README.md)

一个 OpenCode v2 插件，用一条胶囊状态条展示当前会话的关键指标：

```
◷ 7 轮 135 步 · 126 tok/s        ▤ 16.2M tok · 缓存命中 94%        ◔ 18%
```

同一个包同时提供 **GUI** 和 **TUI** 两个 part，指标口径一致：

| 指标 | 口径 |
| --- | --- |
| 轮 / 步 | 当前会话的 user 消息数 / assistant 消息数（可改为工具调用数） |
| tok/s | `Σ(output + reasoning) / Σ(step 结束 - step 开始)`，只统计已完成的 step |
| 总 tok | 当前会话及已知子 agent 会话的 `input + output + reasoning + cache.read + cache.write` |
| 缓存命中 | `cache.read / (input + cache.read + cache.write)` |
| 上下文 % | 最近一次 assistant step 的 token 总量 / 模型 `limit.context`，与内置 Context 指示器同一口径 |

## 结构

```
src/
├─ index.ts          # 最小 server part，提供插件 id
├─ tui.tsx           # TUI part：session.composer.top 上的圆角状态条
├─ gui.tsx           # GUI part：window.bottom 上的胶囊状态条
├─ gui/
│  ├─ glance.tsx     # 状态条组件
│  └─ styles.ts      # 注入的 CSS（使用 --v2-* 主题变量）
├─ shared/
│  ├─ metrics.ts     # 两端共用的纯计算
│  └─ glance.ts      # 两端共用的响应式聚合与文案
└─ i18n/             # 共用语言包（en / zh / zht / ja / ko / de / fr / es / pt / it）
```

- TUI part 直接以 TSX 加载，改源码会热重载。
- GUI part 必须先构建成单个 CommonJS 文件：`dist/gui-experimental.cjs`。

## 开发

```bash
npm install
npm run typecheck
npm test           # 指标纯函数的单元测试
npm run build      # 构建 GUI
npm run dev        # vite build --watch，改 GUI 代码自动重载
```

`dist/gui-experimental.cjs` 已提交到仓库，便于 clone 后直接以 `file://` 方式安装；修改 GUI 源码后记得重新 `npm run build` 并一起提交。CI 会校验提交的 bundle 与重新构建的结果一致。

## 安装

从 npm 安装：

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode-glance"]
}
```

也可以直接从 GitHub / 本地目录加载。`opencode.json(c)` 是 GUI 读取插件的地方；包里有 server part，所以 TUI part 也会随 server 加载。

```jsonc
{
  "plugins": [
    "file:///absolute/path/to/opencode-glance"
  ]
}
```

需要给 GUI 配置选项时使用对象形式（TUI 选项要写在下面的 `cli.json` 里）：

```jsonc
{
  "plugins": [
    {
      "package": "file:///absolute/path/to/opencode-glance",
      "options": {
        "show": true,
        "steps": "assistant",
        "rate": "auto"
      }
    }
  ]
}
```

### TUI：去掉旧的 Context 块（可选）

TUI 的内置 Context 块可以被配置禁用，这样状态条就是真正的替代品。TUI 的插件选项必须写在 `cli.json` 里：通过 server 清单加载的 TUI part 不会携带 `options`。

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "opencode-glance",
      "options": { "locale": "zh", "rate": "auto" }
    },
    "-opencode.sidebar.context"
  ]
}
```

本地目录同样适用：

```jsonc
{
  "plugins": [
    {
      "package": "file:///absolute/path/to/opencode-glance",
      "options": { "locale": "zh", "rate": "auto" }
    },
    "-opencode.sidebar.context"
  ]
}
```

### GUI 的限制

GUI 的内置 Context 指示器属于 app 内置插件，**第三方 GUI 插件无法移除它**（GUI slot 只支持追加/排序，内置插件在设置里也没有开关）。所以桌面端是“新增状态条 + 旧指示器保留”。如果必须让旧 Context 消失，请使用 TUI。

## 命令

两个界面都注册了 `Glance: toggle status bar` 命令，可在命令面板里显示/隐藏状态条。

## 选项

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `show` | `true` | 启动时是否显示状态条；之后可用命令切换 |
| `steps` | `"assistant"` | `"assistant"` 按 assistant 消息计步，`"tool"` 按工具调用计步 |
| `rate` | `"auto"` | `"auto"` 运行中用流式文本估算实时速度（带 `~`），空闲显示最近一步真实速度；`"average"` 始终用全历史平均；`"last"` 始终用最近一步真实速度 |
| `icons` | `true` | TUI 是否显示 `◷ ▤ ◔` 图标 |
| `locale` | `"auto"` | TUI 文案：`"auto"` 跟随系统语言，也可指定 `zh`、`zht`、`en`、`ja`、`ko`、`de`、`fr`、`es`、`pt`、`it`。GUI 跟随 app 语言 |

## 国际化

- **GUI**：跟随 OpenCode Desktop / Web 的界面语言，由 `Plugin.define({ i18n: messages })` 提供。
- **TUI**：默认 `locale: "auto"`，按系统语言匹配；也可在 `cli.json` 的 options 里指定。
- 当前语言包：`en`、`zh`、`zht`、`ja`、`ko`、`de`、`fr`、`es`、`pt`、`it`。
- 其他语言回退英文。新增语言只需要在 `src/i18n/index.ts` 加一份 `Catalog`，并加入 `locales`。
- 轮/步使用了 `Intl.PluralRules`，英文、法文、德文等单复数形式正确。

## 指标细节

- `steps` 默认按 OpenCode `SessionStats` 的口径统计 assistant 消息；设置 `"steps": "tool"` 可改为统计工具调用数。
- `tok/s` 的严格实时值拿不到：OpenCode 只在 step 结束时写入 `tokens`。`rate: "auto"` 在运行中用已流出的文本估算 token（CJK 按字、其他字符按 1/4），每秒刷新并带 `~` 前缀；空闲时回落到最近一步的真实速度。运行工具时显示工具名和已用时，而不是速度。
- 运行中的状态条会优先显示当前动作：工具执行显示 `bash 8s`，等待首 token 显示 `等待响应 3s`，流式生成显示 `~131 tok/s · 12s`。
- 速度分母是 `time.streamed - time.created`，包含首 token 等待时间和请求分发，因此是端到端生成速度，不是纯解码速度。
- 总 token 和缓存命中按 session family 汇总（根会话 + 已同步的子 agent），与内置 cost 的 family 口径一致。
- 上下文百分比只取根会话最近一次有效 assistant step，且跳过已压缩内容和 undo 边界之后的消息，与内置 Context 面板一致。
- 无数据时显示 `—`，不会出现 NaN。

## 发布

OpenCode 官方没有集中式插件市场，分发路径是：

1. **npm**：`npm publish --access public`，用户用 `opencode plugin add opencode-glance`。
2. **opencode.im**：发布到 npm 后，它会按 `opencode-plugin` keyword 自动发现；也可以手动提交。
3. **官方 Ecosystem 列表**：向 `anomalyco/opencode` 的 `packages/web/src/content/docs/ecosystem.mdx` 提交 PR。
4. **awesome-opencode**：向社区列表提交 PR。

本仓库已包含 `opencode-plugin` keyword、MIT License 和 CI。发布前：

```bash
npm login
npm publish --access public
```

也可以用 tag 触发 `.github/workflows/release.yml`：先配置 `NPM_TOKEN` secret，然后 `git tag v0.1.0 && git push --tags`。

`prepublishOnly` 会先跑 `typecheck` 和 GUI 构建。

## 许可证

MIT。见 [LICENSE](./LICENSE)。

## 注意

- GUI part 使用 experimental API（`./gui-experimental`），OpenCode 小版本升级可能需要跟进。
- TUI 状态条依赖 `session.composer.top` slot；不要把 `sidebar.content` 整体 `replace`，否则会连带移除内置 todo、MCP、limit 块。
