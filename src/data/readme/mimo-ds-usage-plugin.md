# MiMo DS Usage Monitor

OpenCode / MiMo Code TUI 插件，在侧边栏实时监控 MiMo Token Plan 用量和 DeepSeek 账户余额。

仓库里有两个包，对应两套互不兼容的 TUI 插件 API：

| 包 | 目标 | 插件 API | 状态 |
|----|------|----------|------|
| `packages/opencode/` | OpenCode **2.x** | `@opencode/plugin/tui` | 已迁移到 2.0（`2.0.0`） |
| `packages/mimocode/` | MiMo Code | `@mimo-ai/plugin/tui` | 仍是 1.x 实现 |

## 安装

### OpenCode 2.x

在 OpenCode 中按 `Ctrl + P` 打开命令面板，搜索 `Plugins`，按 `shift + i` 输入 `mimo-ds-usage-plugin`；
或者用命令行：

```bash
opencode plugin add mimo-ds-usage-plugin
```

本地目录方式（2.x 的本地 TUI 插件必须是**目录**，入口固定叫 `tui.tsx`）：

```bash
mkdir -p ~/.config/opencode/plugins/mimo-ds-usage
cp packages/opencode/{tui.tsx,mimo-panel.tsx,ds-balance.tsx,shared.ts} ~/.config/opencode/plugins/mimo-ds-usage/
```

再在 `~/.config/opencode/cli.json` 里登记：

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["~/.config/opencode/plugins/mimo-ds-usage"]
}
```

> OpenCode 1.x 用的是 `~/.config/opencode/tui.json` + `"plugin": [...]`，且插件模块形状完全不同。
> 仍在 1.x 上请装 `mimo-ds-usage-plugin@1`。

### MiMo Code

```bash
npm install -g mimo-ds-usage-plugin-mimocode
```

在 `~/.config/mimocode/tui.json` 中添加：

```json
{
  "plugin": ["mimo-ds-usage-plugin-mimocode"]
}
```

## 使用

| 命令 | 说明 |
|------|------|
| `/mimo` | 设置 MiMo 平台 Cookie |
| `/mimo-logout` | 清除 MiMo Cookie |
| `/ds` | 设置 DeepSeek API Key |
| `/ds-logout` | 清除 DeepSeek API Key |

## 功能

- **MiMo Token Plan 用量** — 显示本月和总套餐的进度条、已用/总量
- **DeepSeek 余额** — 显示总额、赠金、充值金额，并标注当前价格时段（峰时"梁文峰价"/谷时"梁文谷价"）
- 自动刷新（每 60 秒）
- 根据当前会话使用的 provider 自动显示对应面板
- 无套餐时显示"当前未订阅套餐"
- Cookie 过期时提示重新设置
- 点击面板标题可折叠/展开，状态持久化

## 项目结构

```
mimo-ds-usage-monitor/
├── packages/
│   ├── opencode/          # OpenCode 2.x 版本
│   │   ├── tui.tsx            # 插件入口 Plugin.define({ id, setup })
│   │   ├── mimo-panel.tsx     # MiMo Token Plan 面板
│   │   ├── ds-balance.tsx     # DeepSeek 余额面板
│   │   ├── shared.ts          # 主题取色 / 进度条 / 接口请求
│   │   ├── package.json
│   │   └── README.md
│   └── mimocode/          # MiMo Code 版本（1.x API）
│       ├── mimo-usage.tsx
│       ├── ds-balance.tsx
│       ├── package.json
│       └── README.md
└── README.md
```

## License

MIT
