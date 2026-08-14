# opencode-codex-doubao-shim

> [opencode](https://github.com/opencode-ai/opencode) 的 OpenAI 兼容 embedding 代理插件。让 [`opencode-mem`](https://www.npmjs.com/package/opencode-mem)——或者任何 OpenAI 兼容的 embedding 客户端——透明地跟火山方舟的 `doubao-embedding-vision-250615`（2048 维）对话。

## 为什么要它

`opencode-mem` 和绝大多数 OpenAI 兼容工具链期望 embedding 端点返回：

```json
{ "data": [{ "embedding": [...], "index": 0, "object": "embedding" }] }
```

而火山方舟 `/api/plan/v3/embeddings/multimodal` 返回的是：

```json
{ "data": { "embedding": [...] } }
```

形状不一样，`data` 是非标准的对象（不是数组），而且是多模态优先设计（要 `{type:"text", text:"..."}` 输入）。这个 shim 做的事：

1. 本地起一个 Bun HTTP 服务器监听 `:4748`（幂等 —— 已有的会复用）。
2. 接受标准的 `POST /v1/embeddings`（或 `/embeddings`），支持 `{ input: "..." }` 或 `{ input: ["...", "..."] }`。
3. 转发到方舟多模态端点，把返回体归一到 OpenAI 形状再吐回去。
4. opencode 关闭（SIGTERM）时自动清理。

总量：~80 行代理 + ~80 行插件。除了 Bun 和 node 标准库以外零依赖。

## 前置

- 装了 **[Bun](https://bun.sh)**（`bun --version` 能跑）。
- 有一把开通了 `doubao-embedding-vision-250615` 的火山方舟 API key。在 <https://console.volcengine.com/ark> 领。

## 安装

```bash
npm install opencode-codex-doubao-shim
```

导出方舟 key（写在 shell rc 或 opencode 环境变量都行）：

```bash
export ARK_KEY="ark-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxx"
```

在 `~/.config/opencode/opencode.jsonc` 里：

```jsonc
{
  "plugin": [
    "opencode-codex-doubao-shim",
    "opencode-mem"
  ]
}
```

在 `~/.config/opencode/opencode-mem.jsonc` 里：

```jsonc
{
  "embeddingApiUrl": "http://127.0.0.1:4748/v1",
  "embeddingApiKey": "not-used-shim-ignores",
  "embeddingModel": "doubao-embedding-vision-250615",
  "embeddingDimensions": 2048
}
```

> ⚠️ **字段名是 `embeddingDimensions`（复数）**。写成 `embeddingDim` 会静默回退到 768，之后每次插入都会失败。

重启 opencode。第一次跑应该看到：

```
[codex-doubao-shim] spawned pid=… at :4748
[codex-doubao-shim] health OK at :4748
```

## 验证

```bash
curl -s http://127.0.0.1:4748/health
# → {"ok":true,"model":"doubao-embedding-vision-250615"}

curl -s http://127.0.0.1:4748/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input":"hello world","model":"doubao-embedding-vision-250615"}' \
  | jq '.data[0].embedding | length'
# → 2048
```

## 环境变量

| 变量 | 默认 | 含义 |
| --- | --- | --- |
| `ARK_KEY`   | *（必填）*                                            | 方舟 API key |
| `ARK_URL`   | `https://ark.cn-beijing.volces.com/api/plan/v3/embeddings/multimodal` | 覆盖端点 |
| `ARK_MODEL` | `doubao-embedding-vision-250615`                    | Embedding 模型 |
| `PORT` / `OPENCODE_SHIM_PORT` | `4748`                            | shim 监听端口 |

## 故障排查

| 症状 | 原因 | 解决 |
| --- | --- | --- |
| `ARK_KEY env var not set — shim will not start` | 环境变量没设 | 在 shell rc 里 `export ARK_KEY=…`，然后重启 opencode。 |
| `ark http 401` | key 错 / 模型没开通 | 到火山方舟控制台核 key。 |
| `ark: unexpected response shape` | 方舟改了返回格式 | 提个 issue，把失败 payload 贴上。 |
| `port 4748 already in use` 且健康检查失败 | 有僵尸进程 | `lsof -i :4748` 杀掉，或者 `OPENCODE_SHIM_PORT=4749` 换端口。 |

## 许可

MIT © Yulimfish
