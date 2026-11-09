# SCNet × Magpie 插件

让 [Magpie](https://usemagpie.ai) 网关出现 **SCNet 超算互联网** 模型服务：
各 Agent（Claude Code、Codex、Gemini CLI、OpenCode…）用你的 SCNet 账号
直接使用超算互联网的模型（DeepSeek、Kimi、GLM、Qwen、MiniMax、SCNet-Max 等）。

## 安装

```sh
magpie plugin add scnet-magpie
```

或从 GitHub 安装：

```sh
magpie plugin add github:zhang3776813/scnet-magpie
```

或 Magpie → Plugins → 添加本地目录（开发模式）。

## 登录

```sh
magpie plugin login scnet
```

会要求输入 SCNet 账号密码与图形验证码（与 SCNet 客户端登录一致）。
登录成功后插件自动向平台换取 LLM API Key（`sk-...`），存入本机
`~/.config/magpie/plugin-auth.json`。

也可以直接粘贴 API Key（在 SCNet 控制台或客户端创建）。

## 给 Agent 选模型

Magpie → Agents → 点某个 Agent 的模型 → 从「超算互联网 SCNet」分组里选。
开新会话生效。

```sh
magpie plugin            # 查看登录状态
magpie provider test scnet # 测试连通
```

## 机制

| 项 | 实现 |
|---|---|
| 平台登录 | `POST https://www.scnet.cn/ac/api/auth/loginDesktopClient.action`（账号密码 + 图形验证码） |
| 平台会话 | 登录返回的 `Token` cookie + `myCookie`，存于 magpie 凭证库 |
| API Key | `POST https://www.scnet.cn/acx/llm/api-key/createActivityApiKey`（平台会话认证，优先）；被拒（API010010）时走客户端同款团队 Key 流程（query/detail/create） |
| 聊天端点 | `POST https://api.scnet.cn/api/llm/v1/chat/completions`（OpenAI 兼容；Magpie 网关自动做 Anthropic 等协议互转） |
| 平台会话认证 | `/acx/...` 平台接口靠**全量 Cookie** 认证（登录 set-cookie，含 `Token=...`）；单独 `Token` 头会 401 |
| 客户端身份头 | 所有请求带 `User-Agent: SCNet-Client`、`source: Electron`、`version: 4.1.0`（与客户端 axios 默认头和网络层 UA 一致，取自客户端 app.asar） |
| 请求头 | `Authorization: Bearer <sk-key>` |
| Key 轮换 | 请求 401 → 用平台会话向 `www.scnet.cn` 换新 Key 并重试一次（与客户端 `createScnetModelStream` 一致）；`auth.refresh` 供 Magpie 定期续期；换 Key 失败 → 重登信号 |
| 模型列表 | 登录后 `GET https://www.scnet.cn/acx/llm/api/console/model` 实时拉取；只保留 `modelType==="LLM"`（剔除文档/OCR 服务条目）；未登录用内置兜底表 |

## 故障排查

| 现象 | 处理 |
|---|---|
| 401 / 提示重新登录 | Key 或平台会话失效 → `magpie plugin login scnet` |
| 验证码错误 | 登录时验证码过期/输错 → 重试登录 |
| 模型列表为空 | 登录后自动拉取真实列表；未登录只显示兜底表 |
| 余额不足 | SCNet 平台账号计费，按平台规则 |

## 开发

```sh
node test/smoke.mjs   # 协议自检（不登录，只验证端点可达性）
```

## 凭证安全

每个用户登录**自己的** SCNet 账号；凭证只保存在本机 magpie 的
`plugin-auth.json`，不共享、不导出、不上传。