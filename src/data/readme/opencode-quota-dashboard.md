# opencode-quota-dashboard

OpenCode Desktop 的额度面板：会话右上角悬浮胶囊（显示 `opencode-go` 订阅总使用率）+ 右侧面板，集中查看：

- **DeepSeek**：API 余额、可用状态、赠金、充值余额；
- **OpenCode Go**：本期 $60 用量池、5 小时 / 本周窗口、重置时间、分模型标价额度与自动校准；
- **GLM / Z.AI**：账户余额、累计消费、Coding Plan 5 小时 / 周窗口、本地按天采样的用量图；
- **MiMo**：余额（现金 / 赠金）、Token Plan credits、近 3 / 7 / 30 天用量图。

数据层从 [dsh-quota-dashboard](https://github.com/bricika/dsh-quota-dashboard) 移植；UI 按 OpenCode GUI 插件 API 重写。DSH 版单独发布为 `dsh-quota-dashboard`，本包只适用于 OpenCode。

## 安装

从 npm 安装（推荐）：

```powershell
opencode plugin add opencode-quota-dashboard
```

或手动加到全局 `~/.config/opencode/opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-quota-dashboard"]
}
```

保存后 OpenCode 会自动重载插件；如果悬浮胶囊没有出现，重开一次窗口。Desktop 用户可在 **Settings > Extensions > Plugins** 查看。

### 本地开发

```powershell
git clone https://github.com/bricika/opencode-quota-dashboard.git
cd opencode-quota-dashboard
npm install
npm run build
```

然后在全局配置里指向本地目录：

```jsonc
{
  "plugins": ["C:/path/to/opencode-quota-dashboard"]
}
```

GUI 改动后 `npm run dev` 会监听并重载窗口；服务端 `src/index.ts` 改动后重载插件或重启 Desktop。

## 使用

- **悬浮额度胶囊**：会话右上角、上下文使用率下方只显示**当前会话所用 provider** 的额度：OpenCode Go 显示 `opencode-go` 订阅总使用率（如 `opencode-go 42%`），DeepSeek 显示 API 余额，GLM 显示余额或 Coding Plan 窗口，MiMo 显示余额或 Token Plan。分模型明细在面板的 Go 标签里看。红点表示额度告警。点击直接打开右侧额度面板。
- **`/quota`**：打开额度面板。有活动会话时开右侧面板；没有会话时开对话框。
- **`/quota-settings`**：直接打开设置页。
- **面板标签**：概览 / Go / DeepSeek / GLM / MiMo / 设置。
- **胶囊显隐**：右侧面板打开时胶囊自动隐藏；窗口宽度小于 1400px 时也隐藏，避免压到对话。可在设置里关闭“悬浮额度胶囊”。
- **日期范围**：3 天 / 7 天 / 30 天；影响 GLM 与 MiMo 的用量图，以及 GLM 本地历史。
- **刷新**：悬浮胶囊每 2 分钟刷新当前 provider 的额度（Go 为总使用率）；面板按设置间隔（默认 5 分钟）刷新，也可点刷新按钮立即取数。

## 凭据

优先读取 OpenCode 自己的 integration，不复制、不落盘、不写日志任何 key：

| 插件 | OpenCode integration | 环境变量兜底 |
|---|---|---|
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| OpenCode Go | `opencode-go` | `OPENCODE_GO_API_KEY` / `OPENCODE_API_KEY` |
| GLM / Z.AI | `zai` | `ZAI_API_KEY` / `ZHIPU_API_KEY` / `BIGMODEL_API_KEY` / `GLM_API_KEY` |
| MiMo | `xiaomi` | `XIAOMI_API_KEY` / `MIMO_API_KEY` |

MiMo 还没有在 OpenCode 里连接时，可以在设置页粘贴 MiMo Key（只存到插件自己的 `ctx.storage`，不会出现在 RPC 或日志里）。Token Plan 需要单独的 `tp-` key 时，也在设置页填写。

## 数据来源

| 数据 | 请求 |
|---|---|
| DeepSeek 余额 | `GET https://api.deepseek.com/user/balance` |
| Go 总额度 / 5 小时 / 周窗口 | `GET https://opencode.ai/console/api/go/status` |
| Go 分模型 30 天用量 | `GET https://opencode.ai/console/api/usage/models?range=30d&pageSize=100` |
| Go 本期标价用量 | `GET https://opencode.ai/console/api/activity/go?range=mtd` |
| GLM 余额 | `GET https://open.bigmodel.cn/api/biz/account/query-customer-account-report` |
| GLM Coding Plan | `GET https://open.bigmodel.cn/api/monitor/usage/quota/limit` |
| GLM 按日用量 | 官方不提供；插件按天采样累计消费差，存 `ctx.storage` |
| MiMo 余额 | `GET https://api.xiaomimimo.com/v1/platform/balance` |
| MiMo Token Plan | `GET https://token-plan-cn.xiaomimimo.com/v1/platform/token_plan` |
| MiMo 日用量 | `GET https://api.xiaomimimo.com/v1/platform/usage/daily?start_date=…&end_date=…` |

## Go 口径

Go 的 `go/status` 给的是**一个共享用量池**（当前 `$60`），不是每个模型独立钱包：

- `$10/月` 是订阅价，`$60` 是本期包含的用量价值；
- 分模型表里的 `$80` / `$100` / `$60` / `$15` 是同一个池按模型标价折算出的单模型上限，不能相加；
- 自动校准只对本期用量最多的模型生效：用 `本期标价用量 × 用量池 / 官方池已用` 反推，并吸附到 OpenCode 实际提供过的档位（$80 / $100 等）；
- 手动覆盖优先，且不会被自动校准改掉。

## 已知限制

- **DeepSeek 官网按日用量不可用**：它依赖 `platform.deepseek.com` 的账号登录态，OpenCode 只保存 API Key；本插件只显示 API 余额。
- **GLM 按日用量是本地采样**：官方接口只返回累计消费；插件从运行起按天记录累计消费差，历史会逐步积累，首次运行前几天可能不完整。
- **MiMo 需要先连接**：在 OpenCode 里 `/connect` 选择 Xiaomi，或在设置页粘贴 MiMo Key；否则 MiMo 标签显示未连接。
- **GUI 插件 API 是实验性的**：OpenCode 次版本升级后可能需要按新的 `@opencode/plugin` 版本重新构建。
- **入口位置由宿主布局决定**：Desktop 2.2.7 在当前单标签布局里不显示 `TitlebarItem`，因此常驻入口改为会话右上角的悬浮胶囊；它使用固定定位，只在 `session.header` 槽存在的会话页显示，首页用 `/quota` 打开。Go 时胶囊显示 `opencode-go` 订阅总使用率，分模型明细在面板里。

## 故障排查

| 现象 | 处理 |
|---|---|
| 所有 provider 都显示“未配置” | 在 OpenCode 里运行 `/connect`，确认 `deepseek` / `opencode-go` / `zai` 有连接 |
| Go 显示 401 | 检查 `OpenCode Go` 是否连接；插件会优先使用 active 连接，其次环境变量 |
| GLM 显示 401 | 默认接口是 `open.bigmodel.cn`；如果使用的是国际站 key，在设置里把 GLM 地址改成对应域名 |
| MiMo 显示未连接 | `/connect` 连接 Xiaomi，或在设置页填 MiMo Key |
| 悬浮胶囊/面板没有出现 | 重开窗口；确认 `opencode plugin list` 有 `quota-dashboard`，且 `dist/gui-experimental.cjs` 存在 |
| 面板数字不更新 | 点刷新；确认 OpenCode 服务端能访问 `api.deepseek.com`、`opencode.ai`、`open.bigmodel.cn` |

服务端日志：`~/.local/share/opencode/log/opencode.log`；Desktop 日志：`%APPDATA%\ai.opencode.desktop\logs\<会话目录>\`。

## 开发

```powershell
npm install
npm test          # 纯函数测试
npm run build     # 生成 dist/gui-experimental.cjs
npm run dev       # Vite watch，改 GUI 后自动重载窗口
```

服务端入口 `src/index.ts` 由 OpenCode 运行时直接加载；改动后重载插件或重启 Desktop。GUI 入口 `src/gui.tsx` 由 Vite 构建成单个 CJS 文件。

发布前自检：

```powershell
npm run build
npm test
npm pack --dry-run
```

`prepublishOnly` 会在 `npm publish` 前自动执行 build + test。发布到 npm：

```powershell
npm login
npm publish
```

如果改成 scoped 包名（例如 `@bricika/opencode-quota-dashboard`），使用 `npm publish --access public`。

## 卸载 / 回滚

- npm 安装：`opencode plugin remove opencode-quota-dashboard`；
- 手动配置：从 `~/.config/opencode/opencode.jsonc` 的 `plugins` 里删除条目；
- 本地目录：删除配置条目并删除目录。

插件设置存在 OpenCode 的 plugin storage 里，不再加载后不会影响 OpenCode 本体。

## 安全

- API key 只在 OpenCode 服务端内存中使用；RPC 只返回布尔状态、脱敏标签和整形后的数字。
- 诊断/日志不包含 key。
- 外部请求只有 DeepSeek、OpenCode、GLM / Z.AI、小米 MiMo 官方接口，没有遥测。

## License

MIT
