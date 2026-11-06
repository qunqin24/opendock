# 腾讯 Marvis · magpie 供应商插件

把**腾讯 Marvis**（应用宝 AI 助手）背后的模型接进 [magpie](https://usemagpie.ai) /
OpenCode —— 不用 API key，用你的 **QQ 或微信** 登录。

> 非官方插件。Marvis 是腾讯的产品，本插件只是把它自己的模型网关接到 magpie 上，
> 与腾讯无关。边界见下方「已知边界」。

## 它能给你什么

| | |
|---|---|
| **模型** | DeepSeek V4 Pro、Kimi K2.5、Claude Opus 4.6 / Sonnet 4.6、GPT-5.4、混元 2.0、GLM 5V Turbo、Hy3 预览 —— 共 18 个槽位 |
| **额度** | Marvis 免费账号的 1000 万 tokens（卡片上实时显示） |
| **流式** | ✅ SSE 逐 token |
| **思考** | ✅ `reasoning_content` 可见 |
| **工具调用** | ✅ 完整 function calling |
| **系统提示词** | ✅ 完全可替换（`messages[0]`） |

## 装

```bash
magpie plugin add MYCF711/magpie-marvis
```

装完在 magpie 设置里 **供应商 → 添加 → 腾讯 Marvis**，选登录方式：

- **QQ 登录** / **微信登录**：打开浏览器授权 → 把地址栏里的整条 URL 粘回来
- **从本机 Marvis 导入**：装了 Marvis 客户端并且登录过的话，一条命令读出来

## 为什么需要 `native/`

模型网关要求请求头 `Ual-Access-MarvisExt` 里带一个 **uskey** —— 那是腾讯 Beacon SDK
本地生成的设备指纹，没有它一律 `403 风控拦截`。

插件把 Beacon SDK 的 4 个文件打进了 `native/`（11 MB）：

```
native/beacon_napi.node      Node 绑定（NAPI）
native/qimei.dll             设备指纹
native/beacon_sdk.dll        Beacon 核心
native/beacon_wrapper.dll    Windows 适配层
```

⚠ **这 4 个必须一起**。`beacon_napi.node` 的 PE 导入表里看不到它依赖谁 ——
它运行时按自己所在目录 `LoadLibrary` 兄弟 DLL。少一个（尤其 `qimei.dll`）
不报错，只是 `getUskey()` **静默返回 null**，然后你会在网关上收到 403。

**装了本插件就不需要安装 Marvis 客户端。**

## 一个 uskey 只能用两次

上游对 uskey 有配额：**同一个 uskey 第 3 次请求起 403**（等 75 秒仍 403，是配额不是频率）。
所以插件**每次请求都现签一个**（`getUskey()` 是本地调用，毫秒级，不联网）。

## 已知边界

- **非官方**：Marvis 随时可能改协议。改了就提 issue。
- **登录态 30 天**：`refresh` 会**成对轮换** token，旧的立刻失效。插件已经串行化了刷新
  （同账号同时只允许一次），但如果你在 Marvis 客户端里也登录同一个号，两边会互相打掉。
- **只支持 Windows**：Beacon SDK 只有 Windows 二进制。
- **`/v1/chat/completions` 不需要 UAL 签名**：那是 `/v3/*` 业务接口的事。把签名头加到模型
  网关上会从 `403 风控` 变成 `401 登录态过期`。

## 开发

```bash
node scripts/check.mjs      # 合规检查（退出码非 0 就是不合规）
node --test                 # 语义测试
node tests/e2e-live.mjs     # 真实网关端到端（需要有效登录态）
```

## 许可

MIT。详见 [LICENSE](./LICENSE)，归属说明见 [NOTICE.md](./NOTICE.md)。
