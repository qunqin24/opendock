# eve-ai

把任意 OpenAI 兼容接口接入 Magpie 的 provider 插件。

这个插件负责模型接入层：API Key 登录、`/models` 模型列表、流式请求转发和工具调用能力声明。流式输出和工具调用由 Magpie 网关与 `@ai-sdk/openai-compatible` 处理，插件不改写请求正文，因此适合 OpenAI、OpenRouter、LiteLLM、One API、New API 以及自建 OpenAI 兼容网关。

## 安装

```sh
magpie plugin add npm:eve-ai
```

也可以从 GitHub 或本地目录安装：

```sh
magpie plugin add github:13718955293/eve-ai
magpie plugin add ./eve-ai
```

## 配置地址

默认地址是 `https://api.openai.com/v1`。接入其他 OpenAI 兼容服务时，修改插件选项：

```sh
magpie plugin options eve-ai '{"baseUrl":"https://your-gateway.example/v1","defaultModel":"your-model"}'
```

如果网关使用 `x-api-key` 而不是 `Authorization: Bearer`：

```sh
magpie plugin options eve-ai '{"baseUrl":"https://your-gateway.example/v1","authHeader":"x-api-key","authPrefix":""}'
```

## 登录和测试

```sh
magpie plugin login eve-ai
magpie provider test eve-ai
magpie plugin --json
```

插件会读取 `GET <baseUrl>/models`。如果模型列表接口暂时失败，插件会保留 Magpie 已经缓存的模型；如果还没有缓存，则回退到 `gpt-4o-mini` 或配置的 `defaultModel`。

## 模型能力覆盖

部分兼容网关不会在 `/models` 中返回上下文长度、最大输出或工具能力。可以在插件选项中覆盖：

```json
{
  "baseUrl": "https://your-gateway.example/v1",
  "defaultModel": "my-model",
  "modelOverrides": {
    "my-model": {
      "context": 200000,
      "output": 32000,
      "reasoning": true,
      "tool_call": true,
      "modalities": { "input": ["text", "image"], "output": ["text"] }
    }
  }
}
```

## 本地开发

```sh
npm test
npm run pack:check
```

测试会覆盖 provider 配置、API Key 请求头、`/models` 转换和自定义认证头。真实接口测试需要在本机 Magpie 沙盒中配置自己的 API Key，不要把密钥写进仓库。

## Magpie 沙盒测试

在 Windows PowerShell 中，可以使用一个临时配置目录，避免影响现有 Magpie：

```powershell
$sandbox = Join-Path $env:TEMP "eve-ai-test"
$env:HOME = $sandbox
$env:XDG_CONFIG_HOME = Join-Path $sandbox ".config"
$env:XDG_CACHE_HOME = Join-Path $sandbox ".cache"
magpie plugin add .
magpie plugin --json
magpie plugin login eve-ai
magpie provider test eve-ai
```

## 安全边界

API Key 只由 Magpie 保存和传入插件 loader。插件不打印请求正文、不把密钥写入仓库，也不包含任何固定的第三方密钥。请只安装你信任的插件包。

## 许可证

MIT
