# opencode-aicodemirror-auth

将 [AICodeMirror](https://www.aicodemirror.ai/) 接入 [Magpie](https://usemagpie.ai) / [OpenCode](https://opencode.ai)，在同一个 `aicodemirror` provider 中提供 **Claude、OpenAI、Gemini、Grok** 四族共 25 个模型。

Claude 使用 Anthropic Messages，OpenAI、Gemini、Grok 统一使用官方 `/v1` Responses，无需全局切换协议。运行时依赖为零，AI SDK 由 Magpie 宿主提供。

## 安装与登录

```sh
magpie plugin add opencode-aicodemirror-auth
magpie plugin login aicodemirror
magpie provider test aicodemirror claude-sonnet-5-5
```

在 [AICodeMirror 控制台](https://www.aicodemirror.ai/) 创建 API Key。也可以直接从 GitHub 安装：

```sh
magpie plugin add github:itgo067/magpie-plugin-aicodemirror
```

如果之前手动添加过同名 custom provider，插件登录后会自动使用 `aicodemirror-plugin/<model>`，避免覆盖原有配置。此时把测试命令中的 `aicodemirror` 换成 `aicodemirror-plugin` 即可，无需删除 custom provider。

## 线路选择

默认使用全球高保线路 `https://api.aicodemirror.ai`。在 Magpie 的 AICodeMirror provider 编辑器中开启 **“国内优化线路”**，即可切换到 `https://api.claudecode.net.cn`；关闭开关即恢复全球高保线路。开关会立即参与后续模型配置和请求路由，无需重装插件。

也可以通过 CLI 设置：

```sh
magpie plugin options opencode-aicodemirror-auth '{"baseURL":"https://api.claudecode.net.cn"}'
```

切回全球高保线路：

```sh
magpie plugin options opencode-aicodemirror-auth '{"baseURL":"https://api.aicodemirror.ai"}'
```

UI 的“国内优化线路”开关优先于 CLI 的 `baseURL`。`baseURL` 只接受上述两个地址，空值或其他地址会回退到全球高保线路，避免 API Key 被发送到非预期主机。`magpie plugin options` 使用安装后的 npm 包名，而不是 GitHub 仓库名。

## 协议与模型路由

| 模型族 | AI SDK | 相对 baseURL 的路径 | 接口 |
| --- | --- | --- | --- |
| Claude | `@ai-sdk/anthropic` | `/api/claudecode/v1` | Anthropic Messages |
| OpenAI | `@ai-sdk/openai` | `/v1` | Responses |
| Gemini | `@ai-sdk/openai` | `/v1` | Responses |
| Grok | `@ai-sdk/openai` | `/v1` | Responses（与 `xai.responses()` 线协议相同） |

每个模型都显式保存自己的 SDK 和 URL，因此四族模型可以同时出现在一个 provider 中。所有模型声明工具调用和 `low` / `medium` / `high` 推理档位；Claude 使用 `thinking.budgetTokens`，其他协议使用 `reasoningEffort`。

可分别测试四族模型：

```sh
magpie provider test aicodemirror claude-sonnet-5-5
magpie provider test aicodemirror gpt-6.1-terra
magpie provider test aicodemirror gemini-3.8-flash
magpie provider test aicodemirror grok-4.7
```

## 模型与官方标准价格

下表价格为 **USD / 百万 tokens**，依次是输入、输出、缓存创建、缓存读取。插件用这些官方标准价展示成本，不会把某个渠道的折扣写死；实际费用以 AICodeMirror 账户和 API Key 绑定渠道为准。

| 模型 | 输入 | 输出 | 缓存创建 | 缓存读取 |
| --- | ---: | ---: | ---: | ---: |
| `claude-fable-5-1` | $10 | $50 | $12.5 | $0.25 |
| `claude-opus-5-5` | $4 | $20 | $5 | $0.2 |
| `claude-sonnet-5-5` | $2 | $10 | $2.5 | $0.2 |
| `claude-haiku-5-5` | $0.1 | $0.5 | $0.125 | $0.01 |
| `claude-opus-5` | $5 | $25 | $6.25 | $0.5 |
| `claude-fable-5` | $10 | $50 | $12.5 | $1 |
| `claude-sonnet-5` | $2 | $10 | $2.5 | $0.2 |
| `claude-opus-4-8` | $5 | $25 | $6.25 | $0.5 |
| `claude-opus-4-7` | $5 | $25 | $6.25 | $0.5 |
| `claude-opus-4-6` | $5 | $25 | $6.25 | $0.5 |
| `claude-sonnet-4-6` | $3 | $15 | $3.75 | $0.3 |
| `claude-haiku-4-5-20251001` | $1 | $5 | $1.25 | $0.1 |
| `gpt-6-astra` | $10 | $50 | $12.5 | $1 |
| `gpt-6.1-terra` | $1 | $5 | $1.25 | $0.05 |
| `gpt-6.1-sol` | $2 | $10 | $2.5 | $0.1 |
| `gpt-6-sol` | $2 | $10 | $2.5 | $0.2 |
| `gpt-5.6-sol` | $5 | $30 | $6.25 | $0.5 |
| `gpt-5.6-terra` | $2 | $12 | $2.5 | $0.2 |
| `gemini-4-argon` | $2 | $10 | — | $0.1 |
| `gemini-3.8-flash` | $0.75 | $3.75 | — | $0.075 |
| `gemini-3-flash-preview` | $0.5 | $3 | — | $0.05 |
| `grok-4.7` | $2 | $6 | — | $0.5 |
| `grok-4.6` | $2 | $6 | — | $0.5 |
| `grok-4.5` | $2 | $6 | — | $0.3 |
| `grok-build-0.1` | $1 | $2 | — | $0.2 |

### 长上下文阶梯价

超过表中的上下文阈值后，该请求按以下价格计费；未列出的模型没有额外阶梯价。

| 模型 | 阈值 | 输入 | 输出 | 缓存创建 | 缓存读取 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `claude-haiku-5-5` | >100K | $0.5 | $2.5 | $0.625 | $0.05 |
| `gpt-6-astra` | >272K | $20 | $75 | $25 | $2 |
| `gpt-6.1-terra` | >272K | $2 | $7.5 | $2.5 | $0.1 |
| `gpt-6.1-sol` | >272K | $4 | $15 | $5 | $0.2 |
| `gpt-6-sol` | >272K | $4 | $15 | $5 | $0.4 |
| `gpt-5.6-sol` | >272K | $10 | $45 | $12.5 | $1 |
| `gpt-5.6-terra` | >272K | $4 | $18 | $5 | $0.4 |
| `grok-4.7` | >200K | $4 | $12 | — | $1 |
| `grok-4.6` | >200K | $4 | $12 | — | $1 |
| `grok-4.5` | >200K | $4 | $12 | — | $0.6 |
| `grok-build-0.1` | >200K | $2 | $4 | — | $0.4 |

Magpie 的静态成本字段无法随单次请求上下文长度自动切换，因此模型目录记录标准价，阶梯价在此单独说明。

### 渠道倍率

渠道与 API Key 绑定，倍率作用于官方价格：

- Claude：官方渠道稳定 `0.56x`、官方渠道 `0.42x`、CC 外场景专用 `0.42x`、三方逆向 `0.16x`。
- OpenAI：官方直连 `0.75x`、官方订阅 `0.07x`。
- Gemini：官方直连 `0.52x`、官方订阅 `0.09x`。
- Grok：官方订阅 `0.06x`。

## 配置覆盖

插件逐字段合并已有配置。例如只修改显示名，不会丢失协议、价格、限制和推理档位：

```json
{
  "provider": {
    "aicodemirror": {
      "models": {
        "claude-sonnet-5-5": {
          "name": "Claude Sonnet 5.5（日常）"
        }
      }
    }
  }
}
```

模型目录是静态的，不会把服务返回的未知模型自动标记成免费，也不会猜测未知模型的上下文和能力。

## 开发

```sh
bun test
bun run icon
npm pack --dry-run
magpie plugin add .
```

修改 `assets/icon.jpg` 后必须运行 `bun run icon`，将新图标重新内联到 `package.json` 的 `magpie.icon`。测试不访问真实服务；在线模型测试需要有效的 AICodeMirror API Key。

插件导出 `AICodeMirrorAuthPlugin` 和仅供测试使用的 `_internal`。

## License

MIT
