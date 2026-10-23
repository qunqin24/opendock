# opencode-custom-provider

[English](README.md)

一个 OpenCode 插件，可以将任意兼容 OpenAI API 的端点转换为独立的
provider。配置端点和密钥后，插件会从 `GET {baseURL}/models` 自动发现模型列表。

插件不会修改 OpenCode 内置的 provider，因此官方 OpenAI、Anthropic、Google
等账号可以同时正常使用。

## 为什么需要它

OpenCode 目前只会为少数内置运行时（Ollama、LM Studio、vLLM）自动发现模型。
在 `opencode.json(c)` 的 `providers` 中声明 provider 时，通常需要手动列出每个模型。

另一种常见做法是通过 `settings.baseURL` 将内置的 `openai` provider 指向网关，
但这样会影响官方 OpenAI 账号，因为同一个 provider ID 只能配置一个端点。

本插件会为每个自定义端点创建独立的 provider ID。官方 provider 不受影响，
网关的模型列表也会直接从端点获取，无需手动维护。

## 要求

- OpenCode V2。
- 在 OpenCode 配置目录可解析的位置安装 `@opencode/plugin`，通常可以在
  `~/.config/opencode/package.json` 中配置：

  ```json
  {
    "dependencies": {
      "@opencode/plugin": "2.0.24"
    }
  }
  ```

- 一个实现了 `GET {baseURL}/models` 的兼容端点，返回格式如下：
  `{ "data": [{ "id": "...", "label": "..." }] }`。其中 `label` 是可选字段，
  用于作为 OpenCode 界面中的模型显示名称。

## 安装

将仓库克隆到 OpenCode 可以读取的任意位置，然后安装依赖并构建插件：

```sh
git clone https://github.com/ekworp/opencode-custom-provider.git \
  ~/nodejs/opencode-custom-provider
cd ~/nodejs/opencode-custom-provider
pnpm install
pnpm build
```

构建产物会写入 `dist/`，OpenCode 会使用它作为插件入口。

在 `~/.config/opencode/opencode.jsonc` 中注册插件：

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"plugins": [
		{
			"package": "~/path/to/opencode-custom-provider",
			"options": {
				"baseURL": "https://api.example.com/v1",
				"apiKeyEnv": "EXAMPLE_API_KEY",
				"models": {
					"example-model": {
						"context": "1M",
						"output": "128K"
					}
				},
				"reasoning": {
					"efforts": ["low", "medium", "high"]
				}
			}
		}
	]
}
```

这就完成了基本配置。provider ID 默认从主机名推导：
`api.example.com` 会得到 `example`，因此模型会显示为
`example/example-model`。

修改插件代码或注册配置后，重启 OpenCode 服务：

```sh
opencode service restart
```

然后检查模型是否发现成功：

```sh
opencode models | grep '^example/'
```

如果不想等待 `refreshInterval`，可以在 OpenCode 中执行以下命令立即刷新模型：

```text
/custom-provider-refresh
```

## 配置

### 单个 provider

最简配置只需要端点和密钥：

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"baseURL": "https://llm.acme.example/v1",
		"apiKey": "sk-..."
	}
}
```

也可以手动指定 provider ID 和显示名称：

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"id": "acme",
		"name": "Acme Gateway",
		"baseURL": "https://llm.acme.example/v1",
		"apiKeyEnv": "ACME_API_KEY"
	}
}
```

### 多个 provider

使用 `providers`，可以通过一个插件实例注册多个端点：

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"refreshInterval": 21600,
		"reasoning": {
			"efforts": ["low", "medium", "high"],
			"none": true
		},
		"providers": [
			{
				"baseURL": "https://api.example.com/v1",
				"apiKeyEnv": "EXAMPLE_API_KEY"
			},
			{
				"id": "local",
				"name": "Local vLLM",
				"baseURL": "http://127.0.0.1:8000/v1"
			}
		]
	}
}
```

### 配置项

| 配置项            | 类型   | 默认值                                     | 说明                                                       |
| ----------------- | ------ | ------------------------------------------ | ---------------------------------------------------------- |
| `baseURL`         | string | 必填                                       | 兼容 OpenAI API 的基础 URL。如果端点要求，需包含 `/v1`。   |
| `apiKey`          | string | `""`                                       | 直接填写 API 密钥，并以 `Authorization: Bearer ...` 发送。 |
| `apiKeyEnv`       | string | 无                                         | API 密钥所在的环境变量名，优先于 `apiKey`。                |
| `id`              | string | 根据主机名推导                             | 模型引用中的 provider 前缀，不能包含 `/` 或 `#`。          |
| `name`            | string | `id`                                       | 在 provider 列表中显示的名称。                             |
| `package`         | string | `@opencode/ai/providers/openai-compatible` | 此 provider 使用的 OpenCode 运行时包。                     |
| `headers`         | object | 无                                         | 同时发送到模型发现请求和模型请求的额外请求头。             |
| `models`          | object | 无                                         | 按模型设置本地覆盖。只应用已配置的 `context` 和 `output`。 |
| `reasoning`       | object | 无                                         | 为发现到的模型暴露思考强度 variants。                      |
| `providers`       | array  | 无                                         | 多个 provider 配置。存在时会忽略顶层 provider 字段。       |
| `refreshInterval` | number | `21600`（6 小时）                          | 刷新间隔，单位为秒。设置为 `0` 可禁用刷新。                |

顶层的 `apiKeyEnv` 会应用到没有单独设置该项的所有 provider 配置。

配置 `reasoning` 后，每个发现到的模型都会生成对应的 variant，可以使用
`provider/model#low`、`provider/model#medium` 等方式选择。默认请求参数名是
`reasoningEffort`，适用于大多数兼容 OpenAI API 的网关。如果端点使用其他 JSON
参数名，请设置 `reasoning.parameter`。设置 `reasoning.none` 为 `true` 可以增加
关闭思考的 `none` variant，该 variant 会发送 `reasoningEffort: "none"`。
如果端点将思考内容放在自定义的 assistant 消息字段中，可以设置
`reasoning.field`，例如 `reasoning_content`。

使用 `models` 可以为当前端点返回的模型补充本地元数据。只有列在该对象中的模型
会被修改，其他模型继续使用 OpenCode 的默认元数据。支持的字段是 `context` 和
`output`，单位均为 token，也可以使用 `"1M"`、`"200K"`、`"128K"` 等写法（采用十进制
单位，例如 `1M` 表示 1,000,000 个 token）。插件不会设置模型状态，并会忽略上游返回的其他无关字段，
例如 `longContext`。

### Provider ID 的推导

插件会从主机名中寻找第一个不是通用基础设施名称的部分，例如会跳过
`api`、`www`、`llm`、`gateway`、`proxy`、`openai`、`chat`、`v1` 以及常见顶级域名。

示例：

| `baseURL`                        | 推导出的 `id` |
| -------------------------------- | ------------- |
| `https://api.example.com/v1`     | `example`     |
| `https://llm.acme.example/v1`    | `acme`        |
| `https://gateway.example.com/v1` | `example`     |
| `http://127.0.0.1:8000/v1`       | `local`       |

如果推导结果不符合预期，或者多个端点产生了相同的 ID，请显式设置 `id`。

## 工作原理

1. 插件初始化时，为每个配置的 provider 请求 `{baseURL}/models`。
2. 返回的每个模型 ID 都会成为该 provider 的模型，并使用
   `Model.Info.default()` 创建；模型 ID 会原样发送到上游端点。如果返回了
   `label`，则使用它作为界面中的显示名称。可选的思考配置会转换为 OpenCode
   的模型 variants。
3. Provider 通过 `ctx.provider.transform` 发布，因此只在运行时存在，
   不会与内置 provider 共享配置。
4. 进程级共享调度器会重新获取模型列表，并调用 `ctx.provider.reload()`。多个
   OpenCode location 不会各自创建一个刷新定时器。相同 provider 的并发请求，或在
   60 秒合并窗口内完成的请求，会复用同一次 `/models` 请求及其结果，即使它们位于
   不同的插件上下文。只有真正发起请求的实例会输出 `discovered` 日志。
   `/custom-provider-refresh` 会绕过缓存立即获取。新增模型会自动出现，删除的模型
   也会消失，无需修改配置。
5. 刷新失败时会记录错误并保留上一次成功的列表。首次获取失败时，该 provider
   不会被注册。

## 注意事项

- `/models` 返回模型 ID，并可以附带显示名称。模型能力和限制会使用 OpenCode
  对未知模型的默认值：
  启用工具、支持文本和图像输入、文本输出、200k 上下文以及 32k 最大输出。
  如果模型实际能力不同，可以在 `loadModels()` 中按模型 ID 或前缀自定义 `limit`
  或 `capabilities`。
- 思考强度配置默认不会自动启用，必须显式设置 `reasoning`。上游端点必须支持
  配置的请求参数（默认为 `reasoningEffort`）；插件不会自动判断每个模型支持哪些
  思考等级。
- 可以使用 `/custom-provider-refresh` 立即刷新所有已配置的 provider。
- 不要在 `opencode.json(c)` 的 `providers` 中再次声明相同的 provider ID，
  否则两个定义会发生冲突。
- 本插件只负责模型发现，请求由 OpenCode 内置的兼容 OpenAI API 运行时处理。
- `/models` 返回的模型不一定都能正常工作；该接口只是端点实际提供模型的来源。
- 建议使用 `apiKeyEnv`，并通过以下命令设置密钥，避免将密钥写入配置文件：
  `opencode service set env EXAMPLE_API_KEY ...`

## 故障排查

检查插件是否加载以及模型发现是否成功：

```sh
grep -a "custom-provider" ~/.local/share/opencode/log/opencode.log | tail
```

常见日志信息：
- `discovered N models from .../models`：发现成功。
- `discovery failed: HTTP 401`：API 密钥错误或缺失。
- `discovery failed: HTTP 404`：`baseURL` 可能缺少 `/v1`，或指向了错误的主机。
- `skipping provider entry without baseURL`：配置缺少 `baseURL`。
- `duplicate provider id "..."`：两个端点推导出了相同的 ID，请显式设置 `id`。

如果 `/models` 返回为空，可以手动查询：

```sh
curl -s -H "Authorization: Bearer $EXAMPLE_API_KEY" \
  https://api.example.com/v1/models
```
