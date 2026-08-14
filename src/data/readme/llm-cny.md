# llm-cny

在 OpenCode TUI 右侧栏显示 DeepSeek V4、moonshot China 的人民币费用和账户余额，Xiaomi MiMo、ZhipuAI GLM、Alibaba Cloud Qwen、MiniMax M3、OpenRouter/xAI Grok Build、Anthropic Claude 和 OpenAI API Key 模式下 GPT 的人民币费用，以及 Codex 限额。

## 功能

- 统计 `deepseek` 提供商下的 `deepseek-v4-flash`、`deepseek-v4-pro`。
- 统计 `moonshotai-cn` 提供商下的 `kimi-k2.5`、`kimi-k2.6`。
- 统计 `xiaomi` 提供商下的 `mimo-v2.5`、`mimo-v2.5-pro`，仅统计费用，不查余额。
- 统计 `zhipuai` 提供商下的 `glm-5.1`、`glm-5-turbo`、`glm-5`，按上下文长度阶梯计费，仅统计费用，不查余额。
- 统计 `alibaba-cn` 提供商下的 `qwen3.7-max`、`qwen3.6-plus`，按上下文长度和当前优惠计费，仅统计费用，不查余额。
- 统计 `minimax-cn` 提供商下的 `minimax-m3`，按上下文长度和 2026-06-08 00:00 前特惠计费，仅统计费用，不查余额。
- 统计 `openrouter` 或 `xai` 提供商下的 `grok-build-0.1`、`x-ai/grok-build-0.1`，后台获取 USD/CNY 汇率并换算为人民币，仅统计费用，不查余额。
- 统计 `openrouter` 提供商下的 `qwen/qwen3.5-122b-a10b`、`qwen/qwen3.6-27b`、`qwen/qwen3.5-9b`、`qwen/qwen3.5-35b-a3b`、`qwen/qwen3.6-35b-a3b`、`qwen/qwen3.5-397b-a17b`、`qwen/qwen3.5-27b`、`nvidia/nemotron-3-ultra-550b-a55b`，后台获取 USD/CNY 汇率并换算为人民币，仅统计费用，不查余额。
- 统计 `anthropic` 提供商下的 `claude-sonnet-4-6`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-opus-4-8`，后台获取 USD/CNY 汇率并换算为人民币，仅统计费用，不查余额。
- 统计 `google` 或 `google-vertex` 提供商下的 `gemini-3.5-flash`，后台获取 USD/CNY 汇率并换算为人民币，仅统计费用，不查余额。
- 统计 `tencent-tokenhub` 提供商下的 `hy3-preview`，按输入长度阶梯计费，仅统计费用，不查余额。
- 统计 API Key 模式下 `openai` 提供商的 `gpt-5.5`、`gpt-5.4`、`gpt-5.4-mini`，后台获取 USD/CNY 汇率并换算为人民币；OpenAI OAuth 登录模式不显示价格，只显示 Codex 限额。
- 检测 `openai` provider 的 OAuth 登录状态并显示 Codex 限额。
- 基于当前 session 的 assistant 消息 token 用量重新计算人民币费用。
- 区分缓存命中输入、缓存未命中输入、输出 token；推理 token 按输出价格计费。
- `deepseek-v4-pro` 使用常态化特价。
- 新会话未使用已支持模型，且未启用 OpenAI OAuth 时只显示激活提示。
- 每次已支持模型回复完成后自动刷新对应余额；Xiaomi MiMo 仅统计费用，不触发余额查询。
- OpenAI OAuth 可用时自动刷新 Codex 限额，OpenAI API Key 模式下不显示该面板。
- 自动复用已有 API Key 读取余额，当前仅适用于 DeepSeek 和 moonshot China，来源依次为：
  - OpenCode provider 的 `key`
  - provider `options.apiKey`
  - provider 声明的环境变量，例如 `DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY`
  - 当前进程的 `DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY`
  - OpenCode 配置里的 `provider.<id>.options.apiKey`

## 价格

单位为人民币 / 百万 tokens。

| 模型 | 上下文 | 缓存命中输入 | 缓存未命中输入 | 输出 |
| --- | --- | ---: | ---: | ---: |
| deepseek-v4-flash | - | 0.02 元 | 1 元 | 2 元 |
| deepseek-v4-pro | - | 0.025 元 | 3 元 | 6 元 |
| kimi-k2.5 | - | 0.7 元 | 4 元 | 21 元 |
| kimi-k2.6 | - | 1.1 元 | 6.5 元 | 27 元 |
| mimo-v2.5 | - | 0.02 元 | 1 元 | 2 元 |
| mimo-v2.5-pro | - | 0.025 元 | 3 元 | 6 元 |
| glm-5.1 | < 32K | 1.3 元 | 6 元 | 24 元 |
| glm-5.1 | >= 32K | 2 元 | 8 元 | 28 元 |
| glm-5-turbo | < 32K | 1.2 元 | 5 元 | 22 元 |
| glm-5-turbo | >= 32K | 1.8 元 | 7 元 | 26 元 |
| glm-5 | < 32K | 1 元 | 4 元 | 18 元 |
| glm-5 | >= 32K | 1.5 元 | 6 元 | 22 元 |
| qwen3.7-max | 限时五折 | 1.2 元 | 6 元 | 18 元 |
| qwen3.6-plus | <= 256K | 2 元 | 2 元 | 12 元 |
| qwen3.6-plus | > 256K | 8 元 | 8 元 | 48 元 |
| minimax-m3 | <= 512K，2026-06-08 00:00 前限时五折 | 0.42 元 | 2.1 元 | 8.4 元 |
| minimax-m3 | <= 512K，2026-06-08 00:00 起 | 0.84 元 | 4.2 元 | 16.8 元 |
| minimax-m3 | > 512K 且 <= 1M | 1.68 元 | 8.4 元 | 33.6 元 |
| grok-build-0.1 / x-ai/grok-build-0.1 | USD/CNY 汇率换算 | 0.2 美元 | 1 美元 | 2 美元 |
| qwen/qwen3.5-122b-a10b | USD/CNY 汇率换算，缓存命中等同输入价 | 0.26 美元 | 0.26 美元 | 2.08 美元 |
| qwen/qwen3.6-27b | USD/CNY 汇率换算，缓存命中按 Ambient 端点 0.16 美元 | 0.16 美元 | 0.29 美元 | 3.2 美元 |
| qwen/qwen3.5-9b | USD/CNY 汇率换算，缓存命中等同输入价 | 0.04 美元 | 0.04 美元 | 0.15 美元 |
| qwen/qwen3.5-35b-a3b | USD/CNY 汇率换算，缓存命中按 DeepInfra 端点 0.05 美元 | 0.05 美元 | 0.14 美元 | 1 美元 |
| qwen/qwen3.6-35b-a3b | USD/CNY 汇率换算，缓存命中按 Ambient 端点 0.05 美元 | 0.05 美元 | 0.14 美元 | 1 美元 |
| qwen/qwen3.5-397b-a17b | USD/CNY 汇率换算，缓存命中按 Morph 端点 0.34 美元 | 0.34 美元 | 0.39 美元 | 2.34 美元 |
| qwen/qwen3.5-27b | USD/CNY 汇率换算，缓存命中等同输入价 | 0.195 美元 | 0.195 美元 | 1.56 美元 |
| nvidia/nemotron-3-ultra-550b-a55b | USD/CNY 汇率换算，DeepInfra 端点 cache_read 0.15 美元 | 0.15 美元 | 0.5 美元 | 2.5 美元 |
| claude-sonnet-4-6 | USD/CNY 汇率换算，缓存写入按 5m 价 3.75 美元 | 0.3 美元 | 3 美元 | 15 美元 |
| claude-opus-4-6 / claude-opus-4-7 / claude-opus-4-8 | USD/CNY 汇率换算，缓存写入按 5m 价 6.25 美元 | 0.5 美元 | 5 美元 | 25 美元 |
| gpt-5.5 | USD/CNY 汇率换算，<= 272K 输入 | 0.5 美元 | 5 美元 | 30 美元 |
| gpt-5.5 | USD/CNY 汇率换算，> 272K 输入 | 1 美元 | 10 美元 | 45 美元 |
| gpt-5.4 | USD/CNY 汇率换算，<= 272K 输入 | 0.25 美元 | 2.5 美元 | 15 美元 |
| gpt-5.4 | USD/CNY 汇率换算，> 272K 输入 | 0.5 美元 | 5 美元 | 22.5 美元 |
| gpt-5.4-mini | USD/CNY 汇率换算 | 0.075 美元 | 0.75 美元 | 4.5 美元 |
| gemini-3.5-flash | USD/CNY 汇率换算 | 0.15 美元 | 1.5 美元 | 9 美元 |
| hy3-preview | < 16K | 0.4 元 | 1.2 元 | 4 元 |
| hy3-preview | [16K, 32K) | 0.6 元 | 1.6 元 | 6.4 元 |
| hy3-preview | >= 32K | 0.8 元 | 2 元 | 8 元 |

ZhipuAI 的上下文档位按本次请求的缓存命中输入与缓存未命中输入之和判断，32K 及以上走高档。
Tencent TokenHub 的 hy3-preview 按本次请求的缓存命中输入与缓存未命中输入之和判断，< 16K 走低档，[16K, 32K) 走中档，>= 32K 走高档。
qwen3.7-max 当前按限时五折计价，官方暂未公布结束时间。qwen3.6-plus 超过 256K 上下文会在 TUI 中提示高价档。多轮对话后缓存命中为 0 时，TUI 会显示通用价格警告。
minimax-m3 的上下文档位按本次请求的缓存命中输入与缓存未命中输入之和判断，512K 以上走高档并提示价格高昂；低档限时五折特惠将于 2026-06-08 00:00:00 +08:00 结束。
Grok Build 价格单位为美元 / 百万 tokens，插件会异步请求 `https://huilv.lzy1.fun/api/huilv` 的 USD/CNY 汇率；成功后自动换算为人民币计费，未获取到汇率前会先显示等待提示。
Google 和 Google Vertex 的 Gemini 3.5 Flash 价格单位同样为美元 / 百万 tokens，并复用 USD/CNY 汇率换算。
Anthropic 和 OpenAI API 价格单位同样为美元 / 百万 tokens，并复用 USD/CNY 汇率换算；OpenCode 默认给 Anthropic 使用 5 分钟 prompt cache，插件因此将 Anthropic `cache.write` 按 5m 缓存写入价计费。当前 OpenCode TUI 消息只暴露汇总后的 `cache.write`，没有暴露 5m/1h 细分，因此如果未来用户自定义 1h cache TTL，插件无法从现有消息结构中区分。GPT-5.5 和 GPT-5.4 按本次请求的缓存命中输入与缓存未命中输入之和判断，超过 272K 输入 token 时，输入价格按 2 倍、输出价格按 1.5 倍计费。OpenAI OAuth 登录模式用于 Codex 限额展示，不纳入 OpenAI API 价格统计；只有检测到 OpenAI API Key 时才显示 OpenAI 模型价格。

## 安装

```bash
opencode plugin llm-cny
```

或在 `.opencode/tui.jsonc` 中手动添加：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "llm-cny",
      {
        "balanceRefreshMs": 600000,
        "showWhenEmpty": true
      }
    ]
  ]
}
```

## 本地开发

```bash
bun install
bun test
bun run typecheck
bun run build
```

本地调试时可以把插件入口写进 `.opencode/tui.jsonc`：

```jsonc
{
  "plugin": ["./llm-cny/src/tui.tsx"]
}
```

## 配置

- `balanceRefreshMs`：已激活内容的刷新间隔，默认 `600000`，最小 `60000`。用于余额和 Codex 限额刷新。
- `showWhenEmpty`：当前 session 未使用已支持模型且未启用 OpenAI OAuth 时，是否显示激活提示，默认 `true`。

## 说明

DeepSeek 余额接口使用 `GET https://api.deepseek.com/user/balance`，moonshot China 余额接口使用 `GET https://api.moonshot.cn/v1/users/me/balance`。Xiaomi MiMo、ZhipuAI、Alibaba Cloud、MiniMax、Tencent TokenHub 暂不支持余额接口，因此只统计费用。Codex 限额通过本地 OpenAI OAuth 凭据查询。插件不会显示或记录 API Key。费用统计只在本地 TUI 中展示，实际扣费与限额以官方账单和官方控制台为准。
