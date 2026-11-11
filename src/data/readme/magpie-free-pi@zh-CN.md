<p align="center">
  <img src="https://raw.githubusercontent.com/wawaTuna/magpie-free-pi/main/assets/banner.png" alt="magpie-free-pi" width="100%">
</p>

# magpie-free-pi

给 Magpie 用的免费模型，靠广告养活 —— 不要 API key、不用绑卡，GitHub 登录一次即可。

**DeepSeek V4.1 Flash、DeepSeek V4 Flash、GLM 5.3 Flash、Particle，在 [Magpie](https://usemagpie.ai) 里免费无限用。**

![CI](https://github.com/wawaTuna/magpie-free-pi/actions/workflows/ci.yml/badge.svg) [![npm](https://img.shields.io/npm/v/magpie-free-pi)](https://www.npmjs.com/package/magpie-free-pi) ![License](https://img.shields.io/badge/license-MIT-blue.svg)

**[快速开始](#快速开始) · [多账号](#多账号) · [原理](#原理) · [隐私](#隐私) · [English](README.md)**

## 快速开始

**1 · 安装。**

```bash
magpie plugin add github:wawaTuna/magpie-free-pi
```

<details>
<summary>其他安装方式</summary>

```bash
# 本地克隆 / 文件夹（原地加载）
git clone https://github.com/wawaTuna/magpie-free-pi
magpie plugin add ./magpie-free-pi
```

</details>

**2 · 登录。**（登录即接受 free-pi 的条款 —— 先读 [隐私](#隐私) 一节。）

```bash
magpie plugin login free-pi     # GitHub 设备流，令牌有效期 90 天
```

**3 · 验证。**

```bash
magpie provider test free-pi    # 真实调一发
magpie quota                    # 看今天还剩多少额度
```

之后各 agent 就能以 `free-pi/deepseek-v4.1-flash` 这样的方式用这些模型。额度输出示例：

```
$ magpie quota
free-pi · free-pi (young) · chenbeigao (free-pi)
  subscription · today · 15000 / 15000 credits left · ↻ tomorrow 08:00
  $1.1250 left today
```

## 你能得到什么

- **免费无限档不花钱。** free-pi 标记为 Free Unlimited 的模型（写作时为 DeepSeek V4.1 Flash、DeepSeek V4 Flash、GLM 5.3 Flash、Particle）永远不占用预算。
- **其余模型走每日预算。** 每个账号每天 15,000 点（约 $1.125），UTC 00:00（北京时间 08:00）刷新。扣费模型（DeepSeek V4 Pro、GPT-6 系列、Kimi 等）按真实上游成本 × 目录倍率扣。
- **模型列表是实时的。** 来自 free-pi 自己的目录接口，它增删模型这边立刻跟随，不用更新插件。
- **额度可见。** 每个账号的剩余预算会显示在 `magpie quota`、Providers 界面里，也参与 Magpie 的路由决策。

## 多账号

每个 free-pi 账号就是一个 GitHub 账号，各有一份每日预算。Magpie 原生支持一个 provider 挂多个账号；这个插件把登录按你的 free-pi 用户名存档，所以换一个 GitHub 账号再登录一次是**新增**账号，而不是替换第一个：

```bash
magpie plugin login free-pi     # 换另一个 GitHub 账号重复一次
```

之后 Magpie 自己在账号间做故障切换（某个账号限流或令牌被拒，请求自动转到下一个），并按本插件上报的额度给账号加权。两个账号 = 扣费模型每天 2 × 15,000 点；免费无限档在每个账号上都免费。

这些登录同时会进入一份本机共享的账号池（`~/.free-pi/agent/`，0600 权限），姊妹项目 [dsh-free-pi](https://github.com/wawaTuna/dsh-free-pi) 和 free-pi-plugins 单体仓库里的独立代理共用它 —— 一台机器上登录一次，处处可用。

## 原理

Magpie 的 provider 插件是 OpenCode v1 插件形态；这个插件是架在一个小共享核心上的薄适配层：

- **Provider 声明。** `config` 把 provider 注册为 `@ai-sdk/openai-compatible`，`api: https://api.freepi.ai/v1`。
- **登录。** `auth` 提供 GitHub 设备流作为 oauth 登录法，另有一个粘贴 JWT 的兜底法（适合手头已有令牌）。
- **loader 的 fetch 本身就是反代。** free-pi 后端要求三样普通 OpenAI 客户端不会发的东西 —— `Authorization: Bearer <JWT>`、每装一份稳定的 `x-session-id`、`x-client-version`（服务器会拦低于最低版本的客户端）—— 这个 fetch 按账号逐个注入。
- **实时目录。** `provider.models` 把 free-pi 无需鉴权的 `/client-version` 目录映射成 Magpie 的模型形态（上游没有 `/v1/models`）。
- **额度上报。** `auth.usage` 读账号的 `/me` 记录，上报今天的窗口（已用 / 15,000 点、刷新时间、剩余美元）。

同一核心还有一个独立的 OpenAI 兼容代理（给没有插件系统的宿主用），在 free-pi-plugins 单体仓库里。

## 隐私

free-pi 由广告**和用会话数据训练模型**养活。它的同意文本 —— 你登录时即接受 —— 写明：你的编码会话（提示词、代码、文件、模型回复）会被保存为轨迹、用于训练模型，并可能共享或出售给第三方；广告商会拿到你近期对话的摘录来选广告。完整条款：https://freepi.ai/terms

只用你能接受这个交换的账号和代码登录。这一条对你经 free-pi 发送的一切内容都适用，与从哪个宿主用它无关。

## 常见问题

#### 预算什么时候刷新？

每天 UTC 00:00。`magpie quota` 会显示每个账号的精确倒计时。

#### "免费无限"是永久的吗？

不是 —— 这是 free-pi 的限时促销，随时可能结束。结束后扣费模型仍可走每日预算。

#### 令牌过期了怎么办？

令牌约 90 天有效期。过期后 Magpie 会标记该账号，再跑一次 `magpie plugin login free-pi` 即可，其他什么都不用重做。

#### free-pi 会封这种客户端吗？

它的后端官方只服务它自己的终端客户端。本插件以同样方式调同一后端，但 free-pi 可能收紧校验（比如要求真实广告会话）。

## 参与贡献

欢迎提 issue 和 PR。

## 许可

MIT —— 见 [LICENSE](LICENSE)。

*非官方插件。与 free-pi、Magpie 及各模型提供方无隶属关系。"free-pi" 与各模型名称归其各自所有者所有。*
