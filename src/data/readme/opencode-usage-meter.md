# opencode-usage-meter

在 OpenCode Desktop 底部状态条实时显示 **OpenCode Go** 套餐用量。
不需要 API Key，数据来自桌面应用自己的 Console 会话。

> A GUI-only OpenCode Desktop plugin that shows your OpenCode Go usage in the
> bottom status bar. No API key required.

底部会显示一行：

```
Go · 5h 3% · 周 1% · 月 0%
```

分别是滚动 5 小时、每周、每月的已用百分比，每 30 秒刷新一次。
任意窗口额度受限时会追加 `· 已受限`。点击这一行可在浏览器打开
Console 的用量页面。

## 安装

在全局 `~/.config/opencode/opencode.json(c)` 中加入插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-usage-meter"]
}
```

已有配置用的是旧的 `plugin` 字段也可以，直接把包名加进那个数组。
保存后 Desktop 会自动重载，不需要重启。

在 **Settings → Extensions → Plugins** 中确认插件已启用。

## 要求

- OpenCode Desktop（GUI 插件 API 属于实验性接口，当前按 2.2.6 构建）。
- 已登录 OpenCode Console，并开通 OpenCode Go 套餐。
- 只支持 Desktop；TUI / CLI 不显示。

底部文字含义：

| 文字 | 含义 |
| --- | --- |
| `Go 用量加载中…` | 首次请求还没返回 |
| `登录 OpenCode Console 后显示 Go 用量` | 当前没有登录 Console |
| `未开通 Go 套餐` | 已登录，但工作区没有 Go 套餐 |
| `Go 用量获取失败` | 接口请求失败；若已有数据，保留上次数值并标记 `· 获取失败`，鼠标悬停可看原始错误 |

## 开发

```sh
npm install
npm run build      # 生成 dist/gui-experimental.cjs
npm test           # bun test
npm run typecheck
```

本地调试时把仓库的绝对路径加进 `plugin` / `plugins` 数组即可；
修改源码后重新 `npm run build`，Desktop 会自动热重载。

## 路线图

后续计划支持更多 coding plan（例如火山方舟 Coding Plan），
当前版本只处理 OpenCode Go。

## License

MIT
