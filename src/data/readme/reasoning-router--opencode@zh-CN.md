# reasoning-router

[English](README.md) | 简体中文 | [日本語](README_JA.md) | [한국어](README_KO.md)

[![CI](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml/badge.svg)](https://github.com/robertn702/reasoning-router/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40reasoning-router%2Fproxy?label=%40reasoning-router%2Fproxy)](https://www.npmjs.com/package/@reasoning-router/proxy)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**质量不降，推理更省。** `reasoning-router` 会向分类器询问编码会话中的每一步需要多少推理强度，
这样一个强大的模型就能同时胜任快速编辑和高难度调试，而无需你手动切换强度档位。它可用于
OpenCode、Pi、Codex CLI，以及任何能与本地代理通信的客户端，分类器由你自行选择。

![推理强度路由示意：分类器为重命名降低推理强度，为调试竞态条件保持高推理强度。](assets/readme.gif)

在我们于 GPT-6 Astra 上进行的 SWE-bench Verified 测试中，固定 `high` 推理强度能解决的任务，
Jev 路由的推理强度全部解决了，而节省多少取决于任务难度。在一个简短的 Flask 修复中，Jev
少用了 **52% 的输出 token**（含推理），耗时约为一半。在较难的 Django 和 pytest 问题上，
输出仅减少 5–7%，耗时变化不到 10%。这些只是少数挑选出的任务，请视为示例，而非预期的节省幅度。
[查看评测](eval/results/router-consolidated-2026-09-25.md)。

> **状态：alpha。** 请按各软件包 README 中的说明，从 npm 安装下列软件包。

## 快速开始

选择你的 harness。每个示例都使用 Jev 和 [TypeSafe](https://typesafe.ai/) 密钥；其他分类器请参阅[分类器](#classifiers)。

**OpenCode** — 将插件添加到 `opencode.json`
（[完整指南](packages/opencode/README_CN.md)）：

```jsonc
{
  "plugins": [{ "package": "@reasoning-router/opencode", "options": {
    "classifier": { "provider": "jev", "apiKey": "{env:REASONING_ROUTER_CLASSIFIER_API_KEY}" },
    "wrap": { "openai": ["openai/gpt-6-astra"] }
  }}],
  "model": "reasoning-router/gpt-6-astra"
}
```

**Pi** — 仅支持 Claude 模型（[完整指南](packages/pi/README_CN.md)）：

```bash
export REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key>
pi install npm:@reasoning-router/pi
pi --model reasoning-router/claude-opus-5-5
```

**Codex CLI 或任何 Responses/Messages 客户端** — 运行本地代理，并将客户端指向
`http://127.0.0.1:4320/v1`（[完整指南](packages/proxy/README_CN.md)）：

```bash
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
REASONING_ROUTER_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
REASONING_ROUTER_UPSTREAM_AUTH=bearer \
REASONING_ROUTER_UPSTREAM_API_KEY=<openai-key> \
npx @reasoning-router/proxy
```

对于 Codex，在 `~/.codex/reasoning-router.config.toml` 中添加一个配置文件（profile），它保留模型，只替换 provider，然后运行 `codex -p reasoning-router`（需要 Codex 0.161.0 或更高版本），可加上 `-m gpt-6-sol` 或其他模型来覆盖默认模型。直接运行 `codex` 不受影响。推理强度由分类器选择，因此 Codex 自身的推理强度设置会被忽略。若要使用 ChatGPT 订阅而非 API 密钥，请将代理串联到 CLIProxyAPI（[指南](packages/proxy/README_CN.md#chatgpt-subscription-through-cliproxyapi)）：

```toml
model = "gpt-6-astra"
model_provider = "reasoning-router"

[model_providers.reasoning-router]
name = "reasoning-router"
base_url = "http://127.0.0.1:4320/v1"
wire_api = "responses"
```

如果分类器响应缓慢或不可用，请求仍会照常执行，使用回退强度（默认为 `high`）。

## 工作原理

对于每个主请求，路由器会：

1. 将近期对话的有限摘要发送给分类器，由分类器选出推理强度（例如重命名用 `low`，
   修复失败的测试用 `high`）。
2. 将该强度作为 OpenAI `configuration_update` 条目或 Anthropic 仅含强度的系统消息添加到请求中。
   之前的更新保持不变，因此提示词前缀仍可被缓存。
3. 将请求发送到你的模型端点，并原样将响应以流式方式传回。

## 数据发送范围

- **发送给分类器：** 近期用户文本和助手文本的有限摘录、最多 8 条近期工具结果
  （含工具名称和错误标记）、一份简短的失败摘要，以及模型 ID。托管工具和 computer-use
  的载荷不会发送。Laya、Kev、CLM 和 SGLang 运行在你自己的服务器上。
- **发送给你的端点：** 完整请求，并附加强度更新。
- **日志记录：** 仅记录元数据（ID、模型、强度、延迟、token 数量），并且只输出到代理的
  stdout 或你启用的决策日志。提示词、工具输出、凭据和原始错误绝不会被记录。

详情请参阅 [docs/behavior.md](docs/behavior.md)。

## 为什么需要

同一个模型在低强度和最高强度下的差异，可以像不同模型档位之间的差异一样大，无论是能力还是价格。

你可以把编码会话中较简单的步骤路由到更便宜的模型，但切换模型会使提示缓存失效。
在较长的会话中，重建上下文的开销可能超过更便宜模型所节省的费用。

允许在对话中途调整推理强度的模型可以保留缓存，因此整个会话可以一直使用同一个强大的模型。
简单的编辑和工具调用可以使用低强度，把 high 或 max 留给架构设计和高难度调试。
`reasoning-router` 为每一步挑选合适的强度。

## Alpha 阶段的限制

- **已测试环境：** Node.js 24.x、OpenCode V2 2.0.18、Pi 1.0.4，以及 Codex CLI 0.159.0
  和 0.161.0（通过代理）。其他版本可能可用，但未经测试。
- **模型：** 仅限[支持的模型](#supported-models)中列出的模型。其他模型会在本地被拒绝。Pi 仅路由 Claude 模型。
- **分类器：** 路由器向已配置的分类器发出询问并采用其答案；对于任何分类器在你的工作负载上选择强度的效果，
  它不做任何保证。
- **代理：** 仅限可信的本地使用；请参阅其
  [信任模型](packages/proxy/README_CN.md#trust-model)。

请按照 [SECURITY.md](SECURITY.md) 中的说明报告漏洞。

## 设计意图

`reasoning-router` 会向分类器询问智能体会话中的每一步需要多少推理强度，然后在不破坏提示缓存的前提下，
将该强度应用到发出的模型请求上。

- **任意分类器。** [Jev](https://typesafe.ai/) 只是可用于判断某一步需要多少推理的若干决策模型之一，
  而且更多模型正在陆续发布。使用哪个分类器是配置问题，而不是依赖项：
  `reasoning-router` 不得依赖 Jev 或任何单一提供方。
- **任意 harness。** 同样的路由可以在 OpenCode、Pi 或任何能与独立代理通信的客户端中运行。

软件包如下：

- [`@reasoning-router/core`](packages/core/README_CN.md)：共享的、与 harness 和分类器无关的路由器。
- [`@reasoning-router/opencode`](packages/opencode/README_CN.md)：OpenCode V2 插件。
- [`@reasoning-router/classifiers`](packages/classifiers/README_CN.md)：各分类器
  （Jev、Cloudflare Clef、Laya、Kev、OpenAI Decisions、CLM、Microsoft-Decision-1、Liquid d1 和 SGLang），通过 `classifier.provider` 选择。
- [`@reasoning-router/pi`](packages/pi/README_CN.md)：Pi 扩展（目前仅支持 Claude 模型）。
- [`@reasoning-router/proxy`](packages/proxy/README_CN.md)：独立的
  Responses/Messages 代理（命令为 `reasoning-router`）。

问题陈述、软件包规划和待决问题请参阅 [docs/architecture.md](docs/architecture.md)，
路由器的线路行为请参阅 [docs/behavior.md](docs/behavior.md)。

<a id="classifiers"></a>
## 分类器

通过 `REASONING_ROUTER_CLASSIFIER`（代理和 Pi）或插件的 `classifier.provider` 选项（OpenCode）
选择分类器。下面的示例使用代理；OpenCode 插件接受相同的设置，对应为 `classifier.apiKey`、
`classifier.baseUrl`、`classifier.accountId` 和 `classifier.model`，并会回退到这些环境变量。
全部设置请参阅 [docs/environment.md](docs/environment.md) 和
[`@reasoning-router/classifiers`](packages/classifiers/README_CN.md)。

### Jev（默认）

[Jev](https://typesafe.ai/) 是 TypeSafe 提供的托管决策模型。获取 TypeSafe API 密钥，然后：

```bash
REASONING_ROUTER_CLASSIFIER=jev \
REASONING_ROUTER_CLASSIFIER_API_KEY=<typesafe-key> \
reasoning-router
```

如果要改用 Vercel AI Gateway 密钥，还需设置
`REASONING_ROUTER_CLASSIFIER_BASE_URL=https://ai-gateway.vercel.sh/typesafe`。

### Cloudflare Clef

[Clef](https://developers.cloudflare.com/workers-ai/models/clef/) 运行在 Cloudflare Workers AI 上。
创建一个具有 Workers AI 权限的 Cloudflare API token，然后：

```bash
REASONING_ROUTER_CLASSIFIER=clef \
REASONING_ROUTER_CLASSIFIER_API_KEY=<cloudflare-token> \
REASONING_ROUTER_CLASSIFIER_ACCOUNT_ID=<cloudflare-account-id> \
REASONING_ROUTER_CLASSIFIER_MODEL=clef \
reasoning-router
```

将 `REASONING_ROUTER_CLASSIFIER_MODEL` 设置为 `clef`、`clef-omni` 或 `clef-flash`。此项为必填。

### Laya

[Laya](https://huggingface.co/convaiinnovations/laya) 是一个开源的、与 Jev 兼容的决策模型，由你自行运行。
路由器只通过 HTTP 调用它，绝不会安装或加载该模型。先启动 Laya 的 `laya-serve`，然后让路由器指向它：

```bash
pip install "laya[serve]"
LAYA_HOST=127.0.0.1 LAYA_PRELOAD=1 laya-serve   # http://127.0.0.1:8000
REASONING_ROUTER_CLASSIFIER=laya reasoning-router
```

默认的基础 URL 是 `http://127.0.0.1:8000`。远程服务器必须使用 HTTPS。仅当服务器设置了
`LAYA_API_KEY` 时才需要设置 `REASONING_ROUTER_CLASSIFIER_API_KEY`，并通过
`REASONING_ROUTER_CLASSIFIER_MODEL` 选择检查点（`english`、`multilingual` 或 `typed-decisions`）。

### Kev

[Kev](https://github.com/jaredpalmer/kev) 是一个开源的、与 Jev 兼容的决策模型系列，
由你通过其 `kev.serve` 自行运行。路由器只通过 HTTP 调用它：

```bash
uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0   # http://127.0.0.1:8008
REASONING_ROUTER_CLASSIFIER=kev reasoning-router
```

固定的版本、已确认的 HTTP 契约、认证、限制以及尚未验证的内容，请参阅
[docs/proposals/kev.md](docs/proposals/kev.md)。

### OpenAI Decisions

`openai-decisions` 分类器使用你自己的 OpenAI API 密钥调用 OpenAI 的 Decisions API
（公开测试版，模型为 `gpt-6-luna`）：

```bash
REASONING_ROUTER_CLASSIFIER=openai-decisions \
REASONING_ROUTER_CLASSIFIER_API_KEY="$OPENAI_API_KEY" \
reasoning-router
```

它只针对模拟响应进行过测试；实际兼容性和强度选择质量均未经验证。隐私边界、区域端点和费用请参阅
[packages/classifiers](packages/classifiers/README_CN.md#openai-decisions-provider-openai-decisions)。

### CLM

[CLM](https://github.com/Contrastive-LM/CLM) 是由你通过其 `clm-serve` 自行运行的决策模型。
`clm-serve` 另需一个你同样自行运行的池化后端（Qwen3-8B 嵌入，例如 vLLM）。路由器只通过 HTTP 调用
`clm-serve`：

```bash
vllm serve Qwen/Qwen3-8B --served-model-name qwen3-8b --runner pooling --max-model-len 2048 --host 127.0.0.1 --port 8090
clm-serve --host 127.0.0.1 --no-ui   # http://127.0.0.1:8700
REASONING_ROUTER_CLASSIFIER=clm reasoning-router
```

默认的基础 URL 是 `http://127.0.0.1:8700`。仅当服务器设置了 `CLM_API_KEY` 时才需要设置
`REASONING_ROUTER_CLASSIFIER_API_KEY`，并通过 `REASONING_ROUTER_CLASSIFIER_MODEL` 选择 CLM head
（服务器默认使用 `clm-latest`）。固定的版本、池化后端以及 2,048 token 的截断，请参阅
[docs/classifiers/clm.md](docs/classifiers/clm.md)。目前只验证了 API 兼容性，尚未验证推理强度决策的质量。

### Microsoft-Decision-1

[Microsoft-Decision-1](https://learn.microsoft.com/azure/foundry/foundry-models/how-to/use-foundry-models-microsoft-decision)
是 Microsoft 在 Microsoft Foundry 上提供的决策模型。在你的 Foundry 资源中部署它，然后使用部署详情页面上的
资源端点、部署名称和 API 密钥：

```bash
REASONING_ROUTER_CLASSIFIER=microsoft-decision \
REASONING_ROUTER_CLASSIFIER_BASE_URL=https://<resource>.services.ai.azure.com \
REASONING_ROUTER_CLASSIFIER_MODEL=<deployment-name> \
REASONING_ROUTER_CLASSIFIER_API_KEY=<foundry-api-key> \
reasoning-router
```

这三项设置均为必填。仅支持 API 密钥，不支持 Microsoft Entra ID token。它只针对模拟响应进行过测试；
实际兼容性和强度选择质量均未经验证。详情请参阅
[packages/classifiers](packages/classifiers/README_CN.md#microsoft-decision-1-provider-microsoft-decision)。

### Liquid d1

[Liquid d1](https://docs.liquid.ai/lfm/models/d1) 是 Liquid AI 提供的托管决策模型。在
[console.liquid.ai](https://console.liquid.ai) 创建密钥，然后：

```bash
REASONING_ROUTER_CLASSIFIER=liquid \
REASONING_ROUTER_CLASSIFIER_API_KEY=<liquid-key> \
reasoning-router
```

如果要改用 Vercel AI Gateway 密钥，还需设置
`REASONING_ROUTER_CLASSIFIER_BASE_URL=https://ai-gateway.vercel.sh/typesafe`。
将 `REASONING_ROUTER_CLASSIFIER_MODEL` 设置为 `d1:free` 可使用 Liquid 免费的纯文本模型。
它只针对模拟响应进行过测试；实际兼容性和强度选择质量均未经验证。详情请参阅
[packages/classifiers](packages/classifiers/README_CN.md#liquid-d1-provider-liquid)。

### SGLang

[SGLang](https://docs.sglang.io/docs/supported-models/decision_models) 为聊天模型（v0.5.21 及更高版本）和决策检查点
（例如 PPLX-Decider，需使用 nightly 构建）提供 System One 端点。服务器由你自行运行；
路由器只通过 HTTP 调用它：

```bash
python -m sglang.launch_server --model-path Qwen/Qwen3.8-27B --host 127.0.0.1 --port 30000
REASONING_ROUTER_CLASSIFIER=sglang reasoning-router
```

默认的基础 URL 是 `http://127.0.0.1:30000`。仅当服务器使用 `--api-key` 运行时才需要设置
`REASONING_ROUTER_CLASSIFIER_API_KEY`。固定的版本、模型和模板限制，以及聊天模型的 next-token 分数与
经过校准的决策检查点之间的区别，请参阅 [docs/classifiers/sglang.md](docs/classifiers/sglang.md)。
目前只验证了 API 兼容性，尚未验证推理强度决策的质量。

<a id="supported-models"></a>
## 支持的模型

路由器会在本地拒绝任何其他模型。你的上游账户能否使用某个模型则是另一回事。

| 模型 | ID | API | 强度 | 基础强度 | Pi |
| --- | --- | --- | --- | --- | --- |
| GPT-6 Astra | `gpt-6-astra` | Responses | low–max | medium | 否 |
| GPT-6 Luna | `gpt-6-luna` | Responses | none–max | medium | 否 |
| GPT-6 Sol | `gpt-6-sol` | Responses | none–max | medium | 否 |
| GPT-6.1 Sol | `gpt-6.1-sol` | Responses | low–max | medium | 否 |
| Claude Fable 5.1 | `claude-fable-5-1` | Messages | low–max | high | 是 |
| Claude Mythos 5.1 | `claude-mythos-5-1` | Messages | low–max | high | 否 (Pi 1.0.4) |
| Claude Opus 5.5 | `claude-opus-5-5` | Messages | low–max | medium | 是 |
| Claude Opus 5 | `claude-opus-5` | Messages | low–max | high | 是 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Messages | low–max | medium | 是 |

强度由低到高依次为 none、low、medium、high、xhigh、max。基础强度是模型默认的请求级强度，
可通过 `REASONING_ROUTER_BASE_EFFORT` 覆盖。分类失败时，路由器会使用回退强度，对所有模型默认均为
`high`；可通过 `REASONING_ROUTER_FALLBACK_EFFORT` 或插件的 `fallbackEffort` 选项进行设置。
请参阅 [docs/behavior.md](docs/behavior.md) 和
[docs/classification-policy.md](docs/classification-policy.md)。模型注册表位于
[`packages/core/src/models.ts`](packages/core/src/models.ts)。

## 开发

需要 Node.js 24.x。

```bash
npm ci
npm run check   # typecheck + lint + test
```

完整的命令列表和仓库约定请参阅 [AGENTS.md](AGENTS.md)。

可逆的设计和工具决策记录在 [docs/architecture.md](docs/architecture.md#decisions) 中。

## 许可证

[MIT](LICENSE)
