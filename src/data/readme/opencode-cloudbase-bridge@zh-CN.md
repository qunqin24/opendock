<p align="center"><img src="https://raw.githubusercontent.com/DaBinBinah/cloudbase-bridge/main/docs/images/logo.png" width="110" alt="CloudBase Bridge logo"></p>

# CloudBase Bridge

<p align="center">[English](README.md) | [简体中文](README.zh-CN.md) · **GitHub**：[DaBinBinah/cloudbase-bridge](https://github.com/DaBinBinah/cloudbase-bridge)</p>

通过你自己部署的 `aiProxy` 云函数，把腾讯云开发 CloudBase 模型接入 [Magpie](https://usemagpie.ai)，作为 OpenAI 兼容供应商使用。

> 社区项目：和 Magpie、腾讯云都没有关系，也没有经过 Magpie 官方审核或收录。

![「小程序成长计划」赠送额度：10 亿 Token + 10 万张生图（云开发控制台截图）](docs/images/growth-plan-quota.png)

## 为什么要经过一个云函数？

插件不直连 `/v1/ai/*` 模型端点，而是调用你环境里的 `aiProxy` 云函数，由函数用 `@cloudbase/node-sdk` 调模型。使用 SDK 不会改变原请求的额度适用范围。

```
Agent ─► magpie 网关 ─► 插件 ── POST /v1/functions/aiProxy ──► aiProxy（你的环境）── SDK ──► 模型
```

云函数一次性返回完整结果，插件把它整理成 OpenAI Chat Completions 格式；agent 要流式输出时，插件在本地合成 SSE。

## 模型

| 模型 ID | 上下文长度 | 图片输入 |
| --- | --- | --- |
| `hy4-flash` | 1M | 支持 |
| `hy4` | 1M | 支持 |
| `hy4-preview` | 1M | 官方列表未注明，图片会照常转发（2026-12-07 下线，之后按 `hy4` 提供） |
| `hy3` | 256K | 不支持 |
| `deepseek-v4.1-flash` | 1M | 支持 |
| `deepseek-v4.1-flash-1017` | 1M | 支持 |

图片输入以[官方模型列表](https://docs.cloudbase.net/ai/available-models)为准，需要 aiProxy 1.3.0 及以上。图片放在 user 消息里，用 OpenAI 的 `image_url` 格式（`http(s)` 链接或 `data:image/...;base64` 地址），大小计入 6 MiB 的请求上限。

模型和计费以当前环境为准。[官方调用来源规则](https://docs.cloudbase.net/ai/ai-inspire-plan-usage-governance)明确：Magpie 等第三方调用即使经过云函数，也不抵扣成长计划赠送的生文或生图额度，可能扣套餐额度，或调用失败。

**DSH 生图（插件 0.2.9 起支持，默认关闭）：** 只用聊天的用户，包括仍在用 0.2.4 的用户，都不用改配置、升级插件或重新部署。

1. **新用户只部署一个 `aiProxy`**：下载[聊天＋生图合并 ZIP](https://github.com/DaBinBinah/cloudbase-bridge/releases/download/aiproxy-2026.11.27/aiProxy-unified-with-deps.zip)，上传到普通云函数 `aiProxy`（Node.js 20、`index.main`、关闭自动安装依赖，生图建议超时 600 秒）。在函数测试中执行 `{"action":"checkImage","prompt":"画猫，2K，5:2"}`，应返回 `requestedSize: "2560x1024"`、`modelCalled: false`；不指定比例和分辨率时默认 `1024x1024`。
2. 在 Magpie 插件选项中打开「启用 DSH 生图」，在 DSH 选择 `cloudbase/hy-image-v3.5-preview`，输入文字提示词。
3. 从 0.2.10 起，DSH 网页版的新回复直接显示图片，也可点「打开原图」另存。如果仍只看到网址，打开 Magpie 插件选项「始终显示图片预览」并保存；即使请求不带 DSH 标记，插件也会返回 Markdown 图片。此开关影响所有经该配置生图的客户端，不改变聊天或旧回复。需要原始 HTTPS 链接的非 DSH 客户端请保持此项关闭。

**老用户不必迁移。** 插件 0.2.11 在生图前用 `ping` 检查已配置的聊天函数；支持生图就调用它，未声明支持就沿用独立 `generateImage`。探测失败不会生图，生图失败不会换函数重发。插件 0.2.9/0.2.10 仍依赖独立函数，仍有旧客户端时不要删除它。Magpie 的生图开关不代替云端鉴权；有权直接调用合并函数的客户端也有权发起生图。

**2K / 4K：** 使用上面的新版云函数 ZIP 即可，Magpie 插件保持 0.2.11。把 `2K` 或 `4K` 用逗号单独隔开，例如 `画猫，4K，5:2`。方图边长分别为 2048、4096 像素；非方图长边分别为 2560、3840 像素，短边按比例取最接近的整数。不写分辨率，尺寸沿用原规则。先用 `checkImage` 查看实际请求尺寸，不会消耗生图额度。

**生图标识（可选）：** 把 `IMAGE_FOOTNOTE_MODE` 设在实际生图的函数上（环境变量不会从 `generateImage` 自动复制到 `aiProxy`）。`empty`（默认）传空字符串，`space` 传一个半角空格，`omit` 不传字段。合并包用 `{"action":"checkImage"}`，独立函数用 `{"action":"check"}` 查看 `footnoteMode`，均不调用模型。[CloudBase 文档](https://docs.cloudbase.net/ai/image-model/custom-watermark)只定义了自定义水印，不保证空格的效果；发布或分享时仍须遵守[生成内容标识要求](https://cloud.tencent.com/document/product/301/97822)。

想保留图片就在链接过期前下载。每个新提示词单独生成一张图，不传聊天历史、参考图或工具。不要把此模型用于自动路由、后台任务或「测试模型」，每次调用都可能产生生图费用。

## 准备工作

1. 有对应模型权限、且有适用于当前调用来源的额度的 CloudBase 环境；
2. 在这个环境里部署 `aiProxy` 云函数（见下一节）；
3. 一个服务端 API Key：在控制台「环境设置 → API Key」创建。

> API Key 是整个环境的最高权限凭证，只保存在你本机的 Magpie 认证存储里（`~/.config/magpie/plugin-auth.json`，权限 600），不要写进任何文件或交给别人。

## 部署 aiProxy

需要聊天和生图时，使用上面的[合并 ZIP](https://github.com/DaBinBinah/cloudbase-bridge/releases/download/aiproxy-2026.11.27/aiProxy-unified-with-deps.zip) 即可。**以下 CLI 仅部署聊天／看图函数，不要用它覆盖合并包。** [聊天函数操作指南](cloudfunctions/aiProxy/README.md)：

```bash
cp cloudbaserc.example.json cloudbaserc.json   # 把 envId 改成你的
tcb login
tcb fn deploy aiProxy --force
tcb fn invoke aiProxy --params '{"action":"ping"}'   # 应返回 {"ok":true,...}
```

几个要点：普通事件函数（不是 HTTP 函数）、Nodejs18.15 及以上、超时设 120 秒、开云端安装依赖。环境 ID 不用配，运行时会自动注入 `TCB_ENV`；想增减模型就改函数的环境变量 `AI_PROXY_ALLOWED_MODELS`（逗号分隔）。

## 安装和登录

```bash
magpie plugin add DaBinBinah/cloudbase-bridge   # 也可：npm 包 opencode-cloudbase-bridge，或 ./cloudbase-bridge 本地加载
magpie plugin login cloudbase
```

登录时会依次问：API Key、环境 ID、区域（中国大陆 / 国际站）、云函数名（直接回车就是 `aiProxy`）。之后模型就会出现在供应商列表里，名字是 `cloudbase/hy3`、`cloudbase/hy4-preview` 这样（如果 `cloudbase` 这个 id 被占了，Magpie 会自动改叫 `cloudbase-plugin`，两种前缀都能用）。每个账号实际可选哪些模型，以你部署的函数白名单为准——插件登录后会自动去问它。

登出：`magpie plugin logout cloudbase`。

## 先在沙盒里试试

不会碰你正在用的 magpie 配置和登录信息：

```bash
sb=$(mktemp -d)
m() { env HOME=$sb XDG_CONFIG_HOME=$sb/.config XDG_CACHE_HOME=$sb/.cache MAGPIE_ADDR=127.0.0.1:3499 magpie "$@"; }
m plugin add ./cloudbase-bridge </dev/null
m plugin login cloudbase
m provider test cloudbase        # 或只测一个模型：m provider test cloudbase hy3
```

还没有 CloudBase 环境？可以先对着仓库自带的 mock 网关把流程走一遍：

```bash
node scripts/mock-ai-proxy.mjs --port 8787
m plugin options cloudbase-bridge '{"gatewayBaseUrl":"http://127.0.0.1:8787"}'
```

`gatewayBaseUrl` 只用于测试——它会把所有请求（包括 API Key 请求头）都发到这个地址。用完记得清掉：`m plugin options cloudbase-bridge off`。

## 可调的选项

| 选项 | 作用 | 默认 |
| --- | --- | --- |
| `envId` / `region` / `functionName` | 登录信息之外的后备值（纯 OpenCode 环境下登录提问不一定有，可以用它兜底） | — / `cn` / `aiProxy` |
| `timeoutMs` | 单次调用云函数的最长等待 | 150000 |
| `gatewayBaseUrl` | 测试用的网关地址覆盖 | 不设置 |

## 出错了怎么办

错误会以 OpenAI 风格的 `{ error: { message, code } }` 返回，message 里通常已经写清原因。常见的几种：`FUNCTIONS_NOT_FOUND`（函数没部署或环境不对）、`AI_CHANNEL_NOT_ALLOWED`（函数必须走 Node SDK 调模型）、`AI_MODEL_NOT_SUPPORTED`（你的环境不支持这个模型）、401 `PERMISSION_DENIED`（API Key 不对或类型不对）、超时、`EXCEED_TOKEN_QUOTA_LIMIT`（额度用完或过期）。逐条的排查办法见 [`docs/troubleshooting.md`](docs/troubleshooting.md)。

## 已知限制

- 没有真流式：上游是一次性返回，SSE 在本地合成，所以首 token 要等整段生成完；
- 工具调用需要 aiProxy 1.1.0 及以上——插件从 0.2.4 或更早版本升级后，要重新部署一次云函数（`tcb fn deploy aiProxy --force`）；
- 图片输入需要 aiProxy 1.3.0 及以上，且只能放在 user 消息里；`hy3` 只接受文字，视频和文件输入不转发；
- 特别长的输出可能撞上云函数 120 秒超时；
- 没有额度展示（官方没给查询 API）；赠送额度本身有期限（6 个月）。

## 本地开发

```bash
npm install
npm run check     # 类型检查 + 构建 + 34 个单元测试 + 模拟宿主加载检查，全程不用网络和真实凭证
```

发布与收录的步骤见 [`docs/publish-checklist.md`](docs/publish-checklist.md)。

## 许可证

[MIT](LICENSE)
