# @wy3366/opencode-quota

在 OpenCode 的侧边栏显示**当前模型所属提供商**的剩余额度。

只显示一个提供商，跟随 `/models` 里选中的模型自动切换；不支持的提供商不占用侧边栏空间。

## 支持的数据源

| 当前模型 providerID | 侧边栏显示 | 含义 |
| --- | --- | --- |
| `opencode-go` | `Go 5h 24% · 7d 9% · 1M 18%` | 滚动 5 小时 / 本周 / 本月已用比例（Console 登录和 API key 连接都支持） |
| `ollama`、`ollama-cloud` | `Ollama $58.04 / $60` | Ollama Cloud 剩余额度 / 总额度 |
| `deepseek` | `DeepSeek ¥110.00` | DeepSeek 官方 API 预付余额 |
| 其它（`xai`、`openrouter`…） | 不渲染 | — |

颜色随剩余量变化：Go 已用 ≥ 75% 变黄、≥ 90% 变红；Ollama 余额 < 25% 变黄、< 10% 变红；DeepSeek 余额 < 30 变黄、< 10 变红。

## 行为

- **跟随模型**：切换模型后立即换成对应提供商的数据，并保留各提供商的上次结果，切回来秒开。
- **只轮询当前提供商**：默认 60 秒一次，切换时立即刷新，请求可中止。
- **限流退避**：Ollama 返回 `429` 时按 `Retry-After` 等待，不会继续打接口。
- **容错**：未登录 Console、未配置 key、key 无效、接口异常都只显示一行短提示，不会影响 TUI。

## 命令

| 命令 | 作用 |
| --- | --- |
| `/quota`（别名 `/balance`） | 弹窗显示各时间窗已用比例、重置时间、控制台链接 |
| 命令面板 `Quota: refresh now` | 立即刷新当前提供商的额度 |

## 配置项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `pollSeconds` | `60` | 刷新间隔，最小 15 秒 |
| `go` | `true` | 是否启用 OpenCode Go 数据源 |
| `goKey` | — | 手动指定 Go API key；不填则自动查找（`OPENCODE_API_KEY` → 集成凭据 → `auth.json`） |
| `goBaseURL` | — | Go 推理接口地址；不填则用 provider 配置的 `baseURL`，最后回退 `https://opencode.ai/zen/go/v1` |
| `goUsageURL` | `https://opencode.ai/console/go` | 仅 API key 模式下 `/quota` 里显示的控制台链接 |
| `ollama` | `true` | 是否启用 Ollama Cloud 数据源 |
| `ollamaKey` | — | 手动指定 Ollama Cloud key；不填则自动查找 |
| `ollamaBaseURL` | `https://ollama.com` | Ollama Cloud 接口地址 |
| `deepseek` | `true` | 是否启用 DeepSeek 数据源 |
| `deepseekKey` | — | 手动指定 DeepSeek key；不填则自动查找 |
| `deepseekBaseURL` | `https://api.deepseek.com` | DeepSeek 接口地址 |
| `homeFooter` | `false` | 同时在首页底部状态行显示 |

## 数据来源

- **OpenCode Go**：优先调用本机 OpenCode server 的 `experimental.usage.limits`，复用已登录的 Console 账号；如果用 `/connect` 粘贴的是 Go API key（没有 Console 工作区），则改用 `GET <provider baseURL>/usage` 并用该 key 认证。插件不接触或记录 token 之外的任何账号信息。
- **Ollama Cloud**：请求 `GET https://ollama.com/api/balance`。Bearer token 依次取自插件 `ollamaKey` → `OLLAMA_API_KEY` → 集成凭据（按 provider 的 `integrationID` 匹配）→ `auth.json`；key 不会出现在日志、toast 或异常信息中。
- **DeepSeek**：请求 `GET https://api.deepseek.com/user/balance`。key 依次取自插件 `deepseekKey` → `DEEPSEEK_API_KEY` → 集成凭据 → `auth.json`；按返回的 `balance_infos` 展示各币种余额，`/quota` 里能看到赠送与充值明细。

## 已知限制

1. Go 接口只返回百分比，不返回美元；额度上限按模型不同，因此不做金额换算。
2. `experimental.usage.limits` 与 Go 的 `/usage` 端点都是实验接口，字段可能变化；解析做了容错，缺字段时整行不渲染。
3. 侧边栏区块只支持 `prepend` / `append`，无法插入到内置区块中间。
4. 侧边栏默认收起（`session.sidebar: "hide"`），需要 `alt+b` 展开。

## 许可

MIT
