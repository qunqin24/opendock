# CloudBase Bridge

[English](README.md) | [简体中文](README.zh-CN.md)

通过你自己部署的 `aiProxy` 云函数，把腾讯云开发 CloudBase「小程序成长计划」的 AI 额度接入 [Magpie](https://usemagpie.ai)，作为普通的 OpenAI 兼容供应商使用。装好之后，它就是你账号下的一个普通供应商，各个 agent 都能直接用。

> 社区项目：和 Magpie、腾讯云都没有关系，也没有经过 Magpie 官方审核或收录。

![「小程序成长计划」赠送额度：10 亿 Token + 10 万张生图（云开发控制台截图）](docs/images/growth-plan-quota.png)

## 为什么要经过一个云函数？

成长计划送的额度只认 CloudBase SDK 这条通道，直接去调 `/v1/ai/*` 模型端点会被拒（`403 AI_CHANNEL_NOT_ALLOWED`）。所以这个插件不直连模型，而是走官方的函数调用端点，让你环境里的 `aiProxy` 云函数用 `@cloudbase/node-sdk` 去调模型——这条路是允许的：

```
Agent ─► magpie 网关 ─► 插件 ── POST /v1/functions/aiProxy ──► aiProxy（你的环境）── SDK ──► 模型
```

云函数一次性返回完整结果，插件把它整理成 OpenAI Chat Completions 格式；agent 要流式输出时，插件在本地合成 SSE。

## 模型

| 模型 ID | 上下文长度 |
| --- | --- |
| `hy3` | 256K |
| `hy4` | 1M |
| `hy4-preview` | 1M |
| `deepseek-v4.1-flash` | 1M |
| `deepseek-v4.1-flash-1017` | 1M |

这些模型不用在控制台开启，用量会自动从赠送额度里扣。个别模型在部分环境不一定放开——如果 CloudBase 返回 `AI_MODEL_NOT_SUPPORTED`，以你环境的实际支持为准。

## 准备工作

1. 一个开通了成长计划（或买了 Token 资源包）的 CloudBase 环境；
2. 在这个环境里部署 `aiProxy` 云函数（见下一节）；
3. 一个服务端 API Key：在控制台「环境设置 → API Key」创建。

> API Key 是整个环境的最高权限凭证，只保存在你本机的 Magpie 认证存储里（`~/.config/magpie/plugin-auth.json`，权限 600），不要写进任何文件或交给别人。

## 部署 aiProxy

完整步骤（控制台上传、CLI、常见坑）见 [`cloudfunctions/aiProxy/README.md`](cloudfunctions/aiProxy/README.md)。命令行快速版：

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
- 不支持工具调用和图片输入，`max_tokens` 也会被忽略（SDK 通道只接受 `{ model, messages, temperature, topP }`）；
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
