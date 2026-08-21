# MiMo DS Usage Monitor

OpenCode / MiMo Code TUI 插件，在侧边栏实时监控 MiMo Token Plan 用量和 DeepSeek 账户余额。

## 安装

### OpenCode（推荐本地文件方式）

> **注意**：OpenCode 加载 npm 包插件存在已知问题，推荐使用本地文件方式安装。

1. 克隆本仓库
2. 将 `packages/opencode/` 下的 `mimo-usage.tsx` 和 `ds-balance.tsx` 复制到 `~/.config/opencode/plugins/`
3. 创建或编辑 `~/.config/opencode/tui.json`：

```json
{
  "plugin": ["./plugins/mimo-usage.tsx"]
}
```

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
- 根据当前使用的 provider 自动显示对应面板
- 无套餐时显示"当前未订阅套餐"
- Cookie 过期时提示重新设置

## 项目结构

```
mimo-ds-usage-monitor/
├── packages/
│   ├── opencode/          # OpenCode 版本
│   │   ├── mimo-usage.tsx
│   │   ├── ds-balance.tsx
│   │   ├── package.json
│   │   └── README.md
│   └── mimocode/          # MiMo Code 版本
│       ├── mimo-usage.tsx
│       ├── ds-balance.tsx
│       ├── package.json
│       └── README.md
├── tui.json               # OpenCode 配置示例
└── README.md
```

## License

MIT
