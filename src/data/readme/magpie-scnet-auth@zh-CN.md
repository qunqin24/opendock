# magpie-scnet-auth

**Magpie provider 插件：接入 SCNet 计算互联网（scnet.cn）的大模型。**

[English](README.md) | 简体中文

安装后，SCNet 平台提供的模型会作为 `scnet` 供应商出现在 magpie 中，magpie 驱动的所有 agent（Claude Code、Codex、dsh 等）均可直接选用。

- 支持账号密码登录，无需安装桌面客户端，无需抓包
- 使用标准 OpenAI Chat Completions 协议
- 透传工具调用与推理过程

---

## 支持的模型

平台 `GET /models` 返回 32 个模型，包括：

| 系列 | 模型 |
|---|---|
| 智谱 | GLM-5.3-Flash、GLM-5.3、GLM-5.2、GLM-5.1、GLM-5 |
| 通义 | Qwen3.8-Max、Qwen3.8-Flash、Qwen3.7-Max、Qwen3.7-Plus、Qwen3.6-Plus、Qwen3-235B-A22B |
| DeepSeek | DeepSeek-V4-Pro-0813、DeepSeek-V4.1-Flash、DeepSeek-V4.1-Flash-1017、DeepSeek-V4-Flash-0731 |
| Kimi | Kimi-K3.1-Pro、Kimi-K3、Kimi-K2.7-Code、Kimi-K2.6 |
| MiniMax | MiniMax-M3.1-Flash、MiniMax-M3、MiniMax-M2.7、MiniMax-M2.5 |
| 其他 | SCNet-Max、Spark-X2.5、MiMo-V2.5-Pro |

**额度按模型分配。** 账号并非对所有模型都有余额，未开通的模型调用会返回 `402 Insufficient Balance`。插件默认列出全部模型，并支持筛选（见「配置」）。

---

## 安装

```bash
# 从本地目录安装
magpie plugin add /path/to/magpie-scnet-auth

# 从 GitHub 安装
magpie plugin add github:RrOrange/magpie-scnet-auth

# 发布到 npm 后按包名安装
magpie plugin add magpie-scnet-auth
```

安装后，magpie 的「供应商」页面会出现 **SCNet**。

---

## 登录

### 账号密码（推荐）

在 magpie 窗口中：

1. 供应商 → **SCNet** → 点击 **＋**
2. 选择 **使用 SCNet 账号密码登录**
3. 输入用户名/手机号 → 下一步 → 输入密码 → 登录

密码仅用于当次换取 API Key，不会被保存；保存的是平台返回的 `sk-…` 密钥。

命令行等价方式：

```bash
node login.mjs          # 交互输入账号与密码
```

### 短信验证码

1. 供应商 → **SCNet** → **＋** → 选「① 发送短信验证码」，填手机号，会收到 6 位验证码
2. 再选「② 短信验证码登录」，填手机号和验证码

或命令行一步完成：

```bash
node login-sms.mjs
```

### API Key

若平台已创建密钥，登录时选择 **API Key**，粘贴 `sk-…`。

### 本机客户端凭据

若本机已安装并登录 SCNet 桌面客户端（`~/.sclaw/agent/scnet-credentials/`），登录时输入 `local`，插件会自动读取并校验可用的密钥。

### 其他兼容服务

登录时粘贴 JSON，可指向任意 OpenAI 兼容端点：

```json
{"baseUrl":"https://example.com/v1","apiKey":"sk-…","models":["model-a","model-b"]}
```

---

## 配置

通过环境变量控制，修改后执行 `magpie plugin off scnet-plugin` / `on scnet-plugin` 生效：

| 变量 | 说明 |
|---|---|
| `SCNET_MODELS` | `all`（默认）列出全部；`known` 仅列本机已验证有余额的模型；或逗号分隔的模型 ID |
| `SCNET_PROBE` | 设为 `1` 时逐个探测模型余额（`max_tokens:1`），仅保留可用模型 |
| `SCNET_BASE` | 覆盖 API 基址，默认 `https://api.scnet.cn/api/llm/v1` |
| `SCNET_AGENT_DIR` | 覆盖客户端配置目录，默认 `~/.sclaw/agent` |

---

## 鉴权与多账号

插件本身不包含鉴权层。凭据即用户的 API Key，保存在本机：

```
~/.config/magpie/plugin-auth.json     # 权限 0600，仅当前用户可读
```

身份校验由 SCNet 平台（Bearer Token）完成。同一份插件可被多人安装，各自使用自己的凭据。

magpie 支持同一供应商多账号：重复点击 **＋** 即可添加，可设置首选账号，当前账号额度耗尽时自动切换到下一个。

如需与他人共享额度，应共享 magpie 网关而非插件：

```bash
magpie gateway-key add friend --models 'scnet-plugin/*'
magpie gateway-key limit friend day --tokens 5000000
```

---

## 已知限制

- 额度按模型计算，未开通的模型返回 `402`。
- 上下文与输出上限取自客户端元数据（如 GLM-5.3-Flash：1048576 / 131072）。
- 服务端偶发 `500 internal_error`，重试即可。
- 插件仅代理对话能力，不包含平台的图片/视频生成接口。
- 并发受 `magpie.maxConcurrency` 限制（默认 4），以避免触发风控。

---

## 目录结构

```
magpie-scnet-auth/
├── index.mjs            provider 声明、凭据解析、模型发现
├── login.mjs            账号密码登录工具（换取 key 并写入 magpie）
├── login-sms.mjs        短信验证码登录工具（同上，一步完成）
├── package.json         包声明
├── README.md            英文文档
├── README.zh-CN.md      中文文档
└── LICENSE
```

---

## 许可

MIT
