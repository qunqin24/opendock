# opencode-provider-balance

OpenCode TUI 插件 · 在侧边栏实时显示 DeepSeek 账户余额

![License](https://img.shields.io/badge/license-MIT-green)

---

## 功能

- **余额展示**：在 TUI 侧边栏显示 DeepSeek 账户的总余额、赠金余额、充值余额
- **可用状态**：实时显示账户是否可调用 API
- **自动刷新**：每次 LLM 输出完成后自动查询余额
- **手动刷新**：输入 `/balance` 命令立即刷新
- **折叠面板**：默认折叠，点击标题展开查看详情
- **自适应主题**：颜色跟随 OpenCode 主题自动适配

## 安装

### 方式一：命令面板安装

在 OpenCode 中按 **`Ctrl + P`** 打开命令面板，搜索 `install plugin`，输入：

```
opencode-provider-balance@latest
```

### 方式二：手动配置

创建或编辑 `~/.config/opencode/tui.jsonc`：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-provider-balance@latest"]
}
```

## 使用

安装后重启 OpenCode，侧边栏即可看到余额面板：

![Screenshot1](https://raw.githubusercontent.com/CMBill/opencode-provider-balance/master/assets/image1.png)

点击展开：

![Screenshot2](https://raw.githubusercontent.com/CMBill/opencode-provider-balance/master/assets/image2.png)

### 斜杠命令

| 命令       | 功能         |
| ---------- | ------------ |
| `/balance` | 手动刷新余额 |

### API Key 配置

插件按以下优先级自动获取 DeepSeek API Key：

1. **auth.json** — 通过 `/connect` 选择 DeepSeek 时自动存储于 `~/.local/share/opencode/auth.json`
2. **环境变量** — `DEEPSEEK_API_KEY`

## 开发

```bash
git clone <repo-url>
cd opencode-provider-balance
pnpm install
pnpm tsc          # 编译
pnpm typecheck    # 类型检查
```

## License

MIT
