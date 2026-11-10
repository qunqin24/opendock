# opencode-xfyun-maas-auth

[English](./README.md)

[magpie](https://usemagpie.ai) / [OpenCode](https://opencode.ai) 的**讯飞星辰 MaaS
平台(科大讯飞)**供应商插件——一个包,三个供应商:

| 供应商 id | 产品线 | 登录 | 模型 |
|---|---|---|---|
| `xfyun-maas` | 按量付费 API([maas.xfyun.cn](https://maas.xfyun.cn)) | API Key `ak-…` | 星火 X2.6/X2.5 系列 + GLM、DeepSeek、Kimi、Qwen、MiniMax 等开源模型 |
| `xfyun-coding` | Astron **Coding Plan 套餐** | 套餐专属 Key | `xsparkx2agent`、`xsparkx2`、`xsparkx2flash`、`auto` + 套餐内开源模型,带抵扣系数 |
| `xfyun-token` | Astron **Token Plan 套餐** | 套餐专属 Key | 按 token 计积分的套餐模型 |

三条线统一走 OpenAI Chat Completions(`/v2/chat/completions`,
`@ai-sdk/openai-compatible`);magpie 网关会把 Agent 发来的 Anthropic
Messages、Responses 等协议自动转换,所以 Claude Code、Codex、OpenCode、
Gemini CLI 等都能直接用 `xfyun-maas/spark-x2.6`、`xfyun-coding/xsparkx2agent`
这样的模型 id。

## 安装

```sh
magpie plugin add opencode-xfyun-maas-auth   # 从 npm
magpie plugin login xfyun-maas               # 粘贴 ak-… 开头的 key
magpie plugin login xfyun-coding             # Coding 套餐 key
magpie plugin login xfyun-token              # Token 套餐 key
```

也可以从文件夹或 git 添加:`magpie plugin add ./opencode-xfyun-maas-auth`。

## Key 在哪里拿

- **`xfyun-maas`** — [maas.xfyun.cn](https://maas.xfyun.cn) 控制台 →
  *API 调用 / APIKEY 管理*,形如 `ak-…`;模型 id 见 *API 调用* 页。
- **`xfyun-coding`** — 在[套餐订阅](https://maas.xfyun.cn/packageSubscription)页购买
  Coding Plan(高效版/速通版)后获得专属 Key;请求发往
  `maas-coding-api.cn-huabei-1.xf-yun.com`。
- **`xfyun-token`** — 在 [Token Plan](https://maas.xfyun.cn/tokenPlan/subscription) 页购买
  成员席位后获得专属 Key;请求发往 `maas-token-api.cn-huabei-1.xf-yun.com`。

凭据保存在 magpie 自己的 `plugin-auth.json`(权限 600),Agent 永远看不到。

## 插件对每个请求做的事

- 加 `Authorization: Bearer <你的 key>`。
- 把已废弃的 `max_tokens` 改名为 `max_completion_tokens`。
- 星火模型(`spark*`、`xspark*`、`auto`):把 OpenAI 风格的 `reasoning_effort`
  映射为讯飞的 `thinking: {type: "enabled"|"disabled"}`,并剥掉星火端点不支持的参数。
- 开源模型(`xop*` 等):剥掉星火专属的 `thinking` 对象,`reasoning_effort` 原样透传。
- 401 会以 `X-Magpie-Sign-In: expired` 报告给 magpie:账号被标记需重新登录,
  而不是悄悄失败;429/503 原样透传,magpie 据此退避并切换到下一个账号或模型。

每个账号登录后,插件还会问网关这个 key 能用哪些模型(`GET /v2/models`),
只列出实际有授权的模型——讯飞按 key 授权模型,账号不会看到一调用就 403 的
模型(有授权但不在静态表里的 id 会给通用条目;列表拉不到时退回完整静态表)。
星火模型默认开思考;用 `thinking: disabled`(或 `reasoning_effort: none`)关闭。

## Coding Plan 抵扣系数

magpie 把它们显示为模型的 `rate`(×5 模型的一次请求按五次套餐请求计):

| 模型 | 倍率 | | 模型 | 倍率 |
|---|---|---|---|---|
| xsparkx2agent | 2 | | xopdeepseekv4pro | 5 |
| xsparkx2 | 2 | | xopdeepseekv4flash | 2 |
| xsparkx2flash | 1 | | xopdeepseekv32 | 2 |
| auto | 2 | | xopkimi27code | 5 |
| xopglm52 | 5 | | xopkimik26 | 4 |
| xopglm51 | 4 | | xopkimik25 | 3 |
| xopglm5 | 3 | | xminimaxm25 | 2 |
| xopqwen35397b | 2 | | xopqwen36v35b / xopqwen35v35b | 1 |
| xop3qwencodernext | 1 | | xopglmv47flash | 1 |

倍率适用于 2026-07-23 起购买的高效版/速通版(官方表)。Coding Plan 的
5 小时/周/月窗口与 Token Plan 积分余额在 MaaS 控制台查看;讯飞没有公开
用量 API,所以本插件不实现 magpie 的 `usage` 钩子——请到控制台看用量。

## 说明与限制

- 模型表逐条转抄自官方文档(2.1/2.1.1/2.2/5.1/5.2),随版本更新;已下线、
  向量、重排、OCR 专用模型不收录。输出上限官方未公布——插件先给保守默认值,
  官方公布后再修正。
- Chat Completions 的 content parts 目前只支持文本,因此即使控制台标注了
  图像输入,模型统一按纯文本列出。
- 也可用于 OpenCode:包遵循 OpenCode 1.x 插件形式,并附带社区 OpenCode 2.x
  适配器。magpie 是经过测试的宿主;直接在 OpenCode 里用属尽力兼容。
- 非官方插件,与科大讯飞无隶属关系;Spark/讯飞/星辰 商标归科大讯飞所有。

## 开发

```sh
bun test              # 单元 + 集成测试(模拟网关)
bun scripts/check.mjs # 按 magpie 的方式加载检查
bash scripts/e2e-magpie.sh  # 真实 magpie CLI 沙箱 E2E(需要 tools/magpie.exe)
```

MIT 许可证。欢迎 PR。
