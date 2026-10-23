# opencode-redact

**为 [OpenCode](https://opencode.ai) v2 提供双向密钥脱敏。**

[English](README.md) · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

[![npm](https://img.shields.io/npm/v/%40kkchengg%2Fopencode-redact)](https://www.npmjs.com/package/@kkchengg/opencode-redact)
[![license](https://img.shields.io/npm/l/%40kkchengg%2Fopencode-redact)](./LICENSE)

`opencode-redact` 会在你的 OpenCode 对话中，于内容**发送给模型之前**，把 API 密钥、令牌、密码等密钥替换为稳定的占位符；随后在**工具执行之前**把占位符还原成真实值。模型永远看不到密钥，但工具仍能拿到真值。

## 为什么需要它

OpenCode v2 更换了插件 API，因此 `opencode-vibeguard` 这类 V1 隐私插件已无法加载——而 v2 也没有内置脱敏功能。`opencode-redact` 用一个小型、零依赖的插件补上这个缺口，并针对 v2 钩子 API 编写。

## 工作原理

```text
                    脱敏                        还原
提示 ──▶ [REDACTED:aws-access-key:…] ──▶ 模型 ──▶ 工具输入 ──▶ 真实密钥
         (prompt + context 钩子)               (execute.before 钩子)
```

- **`prompt`** — 在你输入的文字被保存之前就进行脱敏。
- **`context`** — 在请求发送前，脱敏系统提示、消息历史（含先前的工具输出）与工具定义。
- **`execute.before`** — 在工具输入中把占位符还原成真实密钥，让需要该值的命令仍能运行。

每个密钥都会变成稳定的令牌 `[REDACTED:<规则>:<指纹>]`。同一个密钥永远得到同一个令牌，因此模型仍可引用它。

## 安装

**从 npm 安装**

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@kkchengg/opencode-redact@latest"]
}
```

**作为本地文件直接放入** — 将 `src/index.ts` 复制到 `~/.config/opencode/plugins/redact/index.ts`。全局插件会自动加载，无需配置文件条目。

## 会检测的密钥

| 规则 | 匹配 |
|------|------|
| `aws-access-key` | `AKIA…`、`ASIA…`、`AGPA…` 等 |
| `gcp-api-key` | `AIza…` |
| `github-pat` | `ghp_`、`gho_`、`ghu_`、`ghs_`、`ghr_` |
| `github-fine-grained` | `github_pat_…` |
| `gitlab-pat` | `glpat-…` |
| `openai-key` | `sk-…`、`sk-proj-…` |
| `anthropic-key` | `sk-ant-…` |
| `slack-token` | `xoxb-`、`xoxa-`、`xoxp-`、`xoxr-`、`xoxs-` |
| `stripe-key` | `sk_live_`、`sk_test_`、`rk_live_`、`rk_test_` |
| `npm-token` | `npm_…` |
| `pypi-token` | `pypi-…` |
| `jwt` | 以 `eyJ` 开头、由点分隔的三段 base64url |
| `private-key` | PEM `-----BEGIN … PRIVATE KEY-----` 区块 |
| `credential` | `password: …`, `api_key=…`, `secret=…`, `token: …` |

## 覆盖范围与限制

**受到保护** — 发送方向的提示、系统提示、消息历史（含工具输出）与工具定义；接收方向的工具输入。

**不受保护**

- 上表未列出的密钥格式。
- 经 base64 编码、加密或被拆分成多段的密钥，以及不符合 `key = value` 形式的密码。
- 大型或二进制字符串（`data:` URI、过大的 base64 块）会被刻意跳过，以免破坏图片与文件。
- 保险库位于进程内：服务重启后，旧历史中的占位符将无法还原。
- 还原取决于模型是否原样返回占位符。

脱敏保护的是离开你机器的内容。它是一层防御，而不是把真实凭据贴进对话的理由。

## 兼容性

OpenCode **v2.0.18+**（使用 v2 的 `prompt`、`context`、`tool.execute.before` 钩子）· Node **20+**。

## 开发

```bash
npm install
npm run build     # tsc -> dist/
npm test          # build + node --test
```

## 许可证

[MIT](./LICENSE)
