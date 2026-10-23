# OpenCode Qwen Auth 插件

[![npm version](https://img.shields.io/npm/v/@melodyoftears/opencode-qwen-auth)](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
[![npm downloads](https://img.shields.io/npm/dm/@melodyoftears/opencode-qwen-auth)](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
[![GitHub stars](https://img.shields.io/github/stars/1579364808/opencode-qwen-auth)](https://github.com/1579364808/opencode-qwen-auth)

使用 qwen.ai 账号为 OpenCode CLI 登录。该插件可让你使用 Qwen OAuth 模型（`coder-model` 与 `vision-model`），享受每天免费请求额度，无需 API Key 或信用卡。

[English](./README.md)

## 功能

- OAuth Device Flow (RFC 8628) - 基于浏览器的安全登录
- PKCE 支持 (RFC 7636) - 增强公共客户端安全性
- 自动轮询 - 授权完成后自动检测，无需手动输入
- Token 自动刷新 - 过期前自动续期
- 兼容 qwen-code - 复用 `~/.qwen/oauth_creds.json` 凭据
- 免费额度 - 通过 OAuth 每天 2,000 次请求

## 前置条件

- 已安装 OpenCode CLI
- 一个 qwen.ai 账号（可免费注册）

## 安装

### 1. 安装插件

```bash
cd ~/.opencode && npm install @melodyoftears/opencode-qwen-auth
```

### 2. 启用插件

编辑 `~/.opencode/opencode.jsonc`：

```json
{
  "plugin": ["@melodyoftears/opencode-qwen-auth"]
}
```

## 使用

### 1. 登录

```bash
opencode auth login
```

### 2. 选择 Provider

选择 **"Other"**，输入 `qwen-code`

### 3. 完成授权

选择 **"Qwen Code (qwen.ai OAuth)"**

- 浏览器会自动打开授权页
- 插件自动轮询并检测授权完成
- 无需复制验证码或手动回车

## 可用模型

| 模型 | ID | 输入 | 输出 | 上下文 | 最大输出 |
|------|----|------|------|--------|----------|
| Qwen Coder (Qwen 3.5 Plus) | `coder-model` | text | text | 1M tokens | 65,536 tokens |
| Qwen VL Plus (Vision) | `vision-model` | text, image | text | 128K tokens | 8,192 tokens |

### 指定模型运行

```bash
opencode --provider qwen-code --model coder-model
opencode --provider qwen-code --model vision-model
```

## 工作原理

1. Device Flow 打开 `chat.qwen.ai` 授权页面
2. 插件自动轮询授权结果
3. 凭据保存到 `~/.qwen/oauth_creds.json`
4. Access Token 在到期前 30 秒自动刷新

## 使用限制

| 计划 | 频率限制 | 每日限制 |
|------|----------|----------|
| 免费（OAuth） | 60 req/min | 2,000 req/day |

配额按 UTC 零点重置。

## 故障排查

### Token 过期或异常

插件会自动刷新 Token。如仍有问题：

```bash
# 删除旧凭据
rm ~/.qwen/oauth_creds.json

# 重新登录
opencode auth login
```

### `auth login` 中看不到 provider

`qwen-code` 是插件注入的 provider。请在 `opencode auth login` 中：

1. 选择 **"Other"**
2. 输入 `qwen-code`

### 遇到 429 限流

- 等待 UTC 零点配额重置
- 配额耗尽时切换账号并重新登录

## 开发

```bash
# 克隆仓库
git clone https://github.com/1579364808/opencode-qwen-auth.git
cd opencode-qwencode-auth

# 安装依赖
bun install

# 构建
bun run build

# 类型检查
bun run typecheck
```

### 本地联调

编辑 `~/.opencode/package.json`：

```json
{
  "dependencies": {
    "@melodyoftears/opencode-qwen-auth": "file:///absolute/path/to/opencode-qwencode-auth"
  }
}
```

然后重新安装：

```bash
cd ~/.opencode && npm install
```

## 项目结构

```
src/
├── constants.ts        # OAuth 端点、模型配置
├── types.ts            # TypeScript 接口
├── index.ts            # 主插件入口
├── cli.ts              # 手动授权 CLI 助手
├── qwen/
│   └── oauth.ts        # OAuth Device Flow + PKCE
├── plugin/
│   ├── auth.ts         # 凭据管理
│   └── utils.ts        # 工具函数
└── errors.ts           # 错误处理
```

## 相关项目

- [qwen-code](https://github.com/QwenLM/qwen-code) - Qwen 官方 CLI
- [OpenCode](https://opencode.ai) - AI 驱动的开发 CLI

## 链接

- [npm 包](https://www.npmjs.com/package/@melodyoftears/opencode-qwen-auth)
- [GitHub 仓库](https://github.com/1579364808/opencode-qwen-auth)

## 支持

如果这个项目帮助到你，可以请我喝杯咖啡：

<p align="center">
  <img src="assets/付款码.png" alt="付款码" width="300">
</p>

## 许可证

MIT
