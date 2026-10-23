# opencode-cloudflare-ai-gateway-auth

[English](https://github.com/4sh0u0/opencode-cloudflare-ai-gateway-auth/blob/main/README.md) | 简体中文 | [日本語](https://github.com/4sh0u0/opencode-cloudflare-ai-gateway-auth/blob/main/README.ja.md)

一个 [OpenCode](https://opencode.ai) 供应商插件：把请求经由 [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) 发出，并用存放在网关中的厂商 key（BYOK）付费，而不是走 Cloudflare 的 Unified Billing（统一计费）。它还会列出网关能访问的模型。支持 OpenCode 1.x，也可以在 [magpie](https://usemagpie.ai) 中使用。

> 本项目与 Cloudflare 无隶属关系，也未获得 Cloudflare 的认可。

## 为什么不用 OpenCode 自带的 Cloudflare AI Gateway？

OpenCode 1.x 自带一个 `cloudflare-ai-gateway` 供应商。以 OpenCode 1.18.35 为准：

| | 自带供应商 | 本插件 |
|---|---|---|
| 网关里存的 Google、DeepSeek、xAI key | 用不上：这三家走 Cloudflare 的 REST API，Google 被转给 Vertex AI，DeepSeek 被转给 Fireworks | 用得上：经网关走各厂商自己的入口 |
| 某个厂商没有存 key 时 | 可能按统一计费扣费 | 直接失败（`cf-aig-no-wholesale`），除非你允许 |
| 模型列表 | models.dev 中该供应商的目录 | 只列网关里有 key 的厂商，取各厂商自己的列表 |
| BYOK key 别名 | 不支持 | 支持 |

装上插件后，它会接管 `cloudflare-ai-gateway` 供应商，自带的那个就不再使用。

## 准备工作

- 一个已开启认证的 Cloudflare AI Gateway，并在 **Provider Keys** 下存好厂商 key（BYOK）。建议开启 **Require provider credentials**（`byok_only`）。
- 一个具有 **Account → AI Gateway → Run** 和 **Account → AI Gateway → Read** 权限的 Cloudflare API token。仅 REST 模式还需要 **Workers AI → Read**。
- OpenCode 1.18.35 或更高的 1.x。不支持 OpenCode 2.x（它加载插件的方式不同）。也可以用 magpie 0.1.1110 或更高版本（见[下文](#在-magpie-中使用)）。

## 安装

在 `opencode.json`（全局配置是 `~/.config/opencode/opencode.json`，也可以用项目自己的）中加入插件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cloudflare-ai-gateway-auth"]
}
```

OpenCode 下次启动时会从 npm 安装它。本地副本同样可用：`"plugin": ["file:///path/to/folder"]`。

## 登录

```sh
opencode auth login
```

选择 **Cloudflare AI Gateway**，然后依次填写：

| 字段 | 填写内容 |
|---|---|
| Cloudflare account ID | 32 位十六进制字符，可在控制台的账户首页（Account home）找到 |
| AI Gateway ID | 网关的名称，例如 `my-gateway` |
| Upstream endpoint | **Native provider endpoints**（推荐）或 **Cloudflare REST API** |
| BYOK key alias | 仅原生模式需要；留空即使用 `default` key |
| API key | 上面那个 Cloudflare API token |

- TUI 的 `/connect` 会问同样的问题，但输入时不做检查：填错的话，该供应商不会出现在模型列表里，`opencode models --print-logs` 会写明哪里不对，重新登录即可。
- OpenCode 的 Web 和桌面 app 只会问 key，这不够用：请在终端里登录。
- OpenCode 每个供应商只保存一份登录。再登录一次会替换它，比如轮换 token、换网关或换模式。
- 插件接管该供应商的 `baseURL`：配置里给 `cloudflare-ai-gateway` 设置的 `baseURL` 会被替换。

## 模型

模型命名为 `<vendor>/<model>`；选用时写作 `cloudflare-ai-gateway/<vendor>/<model>`，例如原生模式下的 `cloudflare-ai-gateway/anthropic/claude-sonnet-5-5`，以及 REST 模式下的 `cloudflare-ai-gateway/anthropic/claude-sonnet-5.5`。`opencode models cloudflare-ai-gateway` 可以列出它们。

| 厂商 | 前缀 | 原生模式 API | REST 模式 API |
|---|---|---|---|
| OpenAI | `openai/` | Responses | Responses |
| Anthropic | `anthropic/` | Messages | Messages |
| Google AI Studio | `google/` | Chat Completions | — |
| DeepSeek | `deepseek/` | Chat Completions | — |
| xAI | `xai/` | Chat Completions | — |

REST 模式只能访问 OpenAI 和 Anthropic。通过 REST 时，Cloudflare 经 Vertex AI 提供 Google 模型、经 Fireworks 提供 DeepSeek，并且不使用网关中存储的 xAI key，所以网关里的 key 对这三家都不起作用。REST 还只接受 Cloudflare [模型目录](https://developers.cloudflare.com/ai/models/)中的 ID，因此 REST 模式只列出该目录中的 OpenAI 和 Anthropic 模型，并使用目录里的 ID。这些 ID 可能与厂商自己的 ID 不同：带小版本号的 Anthropic 模型，例如 `claude-sonnet-5-5`，在目录中写作 `claude-sonnet-5.5`。原生模式使用各厂商自己的 ID。

只会列出网关中存有 key 的厂商。原生模式下，每个厂商的模型列表经网关向厂商本身获取；获取失败时改用 [models.dev](https://models.dev)。REST 模式下，列表来自 Cloudflare 的模型目录页面；页面无法读取时，改用 models.dev 中该目录的副本。上下文窗口、推理强度档位和价格也来自 models.dev。

## 原生模式与 REST 模式

- **原生模式（Native）** 把各厂商自己的 API 请求发往 `gateway.ai.cloudflare.com/v1/<account>/<gateway>/<provider>/…`。中间不做任何协议转换，所以 prompt caching、extended thinking 和 Responses API 都会原样到达厂商。除非确实需要 REST，否则用这个；在 magpie 里，Claude Code 和 Codex 也用这个模式。
- **REST 模式** 带上 `cf-aig-gateway-id` 发往 `api.cloudflare.com/client/v4/accounts/<account>/ai/v1/…`。它不支持 key 别名，并且只列出 Cloudflare 目录中的 OpenAI 和 Anthropic 模型，使用目录里的 ID（见上文）。REST 只接受字符串形式的 Anthropic 系统提示词，所以插件会把各段拼接起来，系统提示词上的 prompt caching 也就不生效。

## 计费安全

每个请求都带有 `cf-aig-no-wholesale: true`，所以没有存储 key 的厂商会直接失败，而不会回退到 Unified Billing。在原生端点上表现为 400，已实测验证。在 REST 模式下，没有该 key 的网关返回了 402（code 7007），且未产生费用；但这次检查无法排除账户只是恰好没有 Unified Billing 额度的可能，所以请保持 **Require provider credentials** 开启：此时 REST 返回 403（code 2049）。要允许回退，给插件加一个选项：

```json
{
  "plugin": [["opencode-cloudflare-ai-gateway-auth", { "allowUnifiedBilling": true }]]
}
```

## 故障排查

| 现象 | 含义 |
|---|---|
| 模型列表为空，或者看不到这个供应商 | 运行 `opencode models --print-logs`：插件会在日志里写明原因（token 被拒、登录信息无效，或网关里没有存 key）。OpenCode 也会把日志保存在 `~/.local/share/opencode/log/` |
| `Plugin requires opencode >=1.18.35 <2` | 你的 OpenCode 低于 1.18.35，或者是 2.x |
| 模型返回 400（REST 模式：402 或 403） | 网关在你的别名下没有该厂商的 key（原生模式：code 2044）。400 也可能是插件在发出请求前就拒绝了它，例如厂商前缀未知、模型 ID 不是 `<vendor>/<model>` 形式，或在 REST 模式下使用 Google、DeepSeek 或 xAI；错误消息会说明是哪一种 |
| REST 模式下某个模型返回 404 或 500 | Cloudflare 的模型目录中没有这个 ID 的模型（例如用了厂商自己的 `claude-sonnet-5-5`，而目录中是 `claude-sonnet-5.5`）：请选择列表中的模型，或改用原生模式 |
| 厂商返回 401 | 厂商拒绝了网关中存储的 key。如果错误里带有 Cloudflare 的错误码 2009（原生模式）或 10000（REST 模式），则是你的 API token 被拒：重新登录即可 |
| 缺少某个模型 | 它的厂商在网关中没有 key，或者它不是聊天模型；在 REST 模式下，不在 Cloudflare 目录中的模型也不会出现 |

## 在 magpie 中使用

插件同样可以在 [magpie](https://usemagpie.ai) 0.1.1110 或更高版本中使用。

```sh
magpie plugin add opencode-cloudflare-ai-gateway-auth
```

也可以在 app 的 **Plugins → Discover → Unofficial**（中文界面：插件 → 发现 → 非官方插件 · GitHub）中找到它。若要直接从 GitHub 安装：`magpie plugin add github:4sh0u0/opencode-cloudflare-ai-gateway-auth`。本地副本同样可用：`magpie plugin add /path/to/folder`，或在 **Plugins → Add a plugin**（中文界面：插件 → 添加插件）中填入该文件夹。

```sh
magpie plugin login cloudflare-ai-gateway
```

字段与上面相同。每次登录对应一组网关、key 别名和模式，账户名为 `<gateway>[/<alias>] · <account ID's first 8>[ · REST]`（`<account ID's first 8>` 是账户 ID 的前 8 位）。要添加另一组，再登录一次即可；magpie 会在这些登录之间自动故障切换（failover）。故障切换只在同一模式的登录之间有效：原生模式与 REST 模式的模型命名不同，且 REST 只支持 OpenAI 和 Anthropic，所以不要把两种模式的登录配成一对。用相同的网关、别名和模式再次登录，会替换原有的那次登录，例如用来轮换 token。登录信息保存在 magpie 的 `plugin-auth.json` 中（权限 600）。如果 Cloudflare 拒绝了 token，magpie 会标记该账号，并提示你重新登录。

在 magpie 中允许回退到统一计费：

```sh
magpie plugin options opencode-cloudflare-ai-gateway-auth '{"allowUnifiedBilling": true}'
```

## 开发

```sh
bun test
bun --env-file=.env.local scripts/probe.mjs            # live checks, needs .env.local
scripts/opencode-sandbox.sh native anthropic/<model>   # OpenCode 1.x in a throwaway HOME
scripts/sandbox.sh native anthropic/<model>            # magpie in a throwaway HOME
```

## 许可证

MIT
