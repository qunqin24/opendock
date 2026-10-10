# opencode-provider-usage

> Live provider quota / balance / credits for OpenCode v2 — in the TUI sidebar,
> with gradient bars, trend ETA and a `/quota` dialog. 中文文档如下。

[opencode](https://opencode.ai) v2 插件：在 TUI 侧栏实时显示各模型提供商的额度 / 余额，点击侧栏块或 `/quota` 查看明细。

## 效果

侧栏块随当前模型自动切换：

```
⚡ GLM Coding Plan
5h   ████████▌░░  62%
7d   ████░░░░░░░  21%
30d  █████░░░░░░  30%
 → 02:24 (2h left)
```

`/quota` 打开当前提供商明细，`/quota all` 并列显示全部有 key 的提供商：

```
OpenCode Usage
  5h   ░░░░░░░░░░░░░░░░░░░░    0% → 10-08 04:12 (5h left)
  7d   ░░░░░░░░░░░░░░░░░░░░    0% → 10-12 08:00 (4d left)
  30d  ██████░░░░░░░░░░░░░░   30% → 11-02 21:44 (26d left)
```

- 条形按用量 6 档梯度变色（绿 → 红），明暗主题自适应；余额类一行显示：`💰 ¥299.59`。
- 明细含窗口状态、积分明细、涨跌箭头、趋势与预计用满时间；重启后首秒即有数据。
- 查询失败显式标注（`⚡ key无效` / `⚡ 限流退避中 12m` / `⚡ 查询失败`），不用旧数据冒充最新值；429 每家独立退避。

## 支持的提供商

| 适配器 | 内容 | 接口 |
|---|---|---|
| opencode / opencode-go | 订阅额度（5h / 7d / 30d） | `opencode.ai/zen/go/v1/usage` |
| deepseek | 账户余额（CNY / USD） | `api.deepseek.com/user/balance` |
| stepfun | 账户余额（CNY） | `api.stepfun.com/v1/accounts` |
| zai / zhipuai | GLM Coding Plan 积分（5h / 周 / 月） | `open.bigmodel.cn` / `api.z.ai` |
| openai-codex | ChatGPT 订阅额度（主 / 次窗口） | `chatgpt.com/backend-api/wham/usage` |
| moonshot / kimi | 账户余额（.cn 为 CNY，.ai 为 USD） | `api.moonshot.cn` / `api.moonshot.ai` `/v1/users/me/balance` |
| siliconflow | 账户余额（.cn 为 CNY，.com 为 USD） | `api.siliconflow.cn` / `.com` `/v1/user/info` |
| openrouter | 预付费 Credits 剩余（需 Management Key） | `openrouter.ai/api/v1/credits` |
| skywork | 账户余额（自带币种字段） | `api.skyworkmodel.ai/api/v1/balance` |
| novita | 账户余额（接口单位为 1/10000 USD，已换算） | `api.novita.ai/openapi/v1/billing/balance/detail` |

- 没有公开余额接口、只能去控制台看的厂商（MiniMax、Qwen/百炼、火山方舟、Groq、Together、Mistral、xAI 等）连了 key 也不会显示。
- 插件按 opencode 实际配置的服务商自动发现（含自定义 baseURL），解析得出 key 的才显示，无 `无key` 噪音；key 移除后自动消失。
- 新增适配器只需在 `src/providers.ts` 加一个 `ids`/`hosts`/`fetch` 定义。CN / 国际双站点（moonshot、siliconflow、zai）一家 401/403 自动换另一家试。

## 安装

要求 **OpenCode v2**（≥ 2.0.3，在 2.0.24 上开发测试）。

**1. 加入全局配置** —— 编辑 `~/.config/opencode/opencode.json`（没有就新建）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-provider-usage"]
}
```

已有 `plugins` 数组的话追加一项即可，`cli.json` 不用改。

**2. 重载**

```bash
opencode service restart    # 或直接重启 TUI
```

首次加载会从 npm 拉包，视网络可能要几十秒。

**3. 配置凭据**（至少一家，三种方式任选）

- TUI 里执行 `/connect`；
- 终端执行 `opencode auth login`；
- 设置环境变量：`OPENCODE_API_KEY`、`DEEPSEEK_API_KEY`、`ZHIPU_API_KEY` / `ZAI_API_KEY`、`MOONSHOT_API_KEY`、`SILICONFLOW_API_KEY`、`OPENROUTER_API_KEY`（需 Management Key）、`SKYWORK_API_KEY`、`NOVITA_API_KEY`、`STEPFUN_API_KEY`。

**4. 验证**

```bash
opencode plugin list        # 应出现 opencode-provider-usage
```

进入会话后侧栏出现额度块即成功（首轮刷新最多等 2 分钟）。

## 更新

```bash
opencode plugin update opencode-provider-usage   # 省略参数 = 更新全部
opencode service restart
```

想锁定版本可在 `plugins` 里写 `opencode-provider-usage@0.1.2`，精确版本不会被 `plugin update` 触碰。

## 排障

- 侧栏无显示：`grep -i provider-usage ~/.local/share/opencode/log/opencode.log | tail`
- 拉包失败（registry 不通）：多次 `opencode service restart` 重试，或在能访问的机器 `npm pack` 后改用本地路径安装。

## 开发

```bash
bun install
bun test          # 单元测试（全部 mock，不访问真实接口）
bunx tsc --noEmit # 类型检查
```

本地调试：把 `plugins` 指向仓库绝对路径，改动自动重载；`OPENCODE_PROVIDER_USAGE_DEBUG=1 opencode service restart` 打开详细日志：

```bash
tail -f ~/.local/share/opencode/log/provider-usage.log
```

架构：server 插件（`src/index.ts`，凭据解析 + 发现 + 轮询 + storage）与 TUI 插件（`src/tui.tsx`，只读 RPC 渲染侧栏）通过 RPC 通信；各提供商接口在 `src/providers.ts`。

## 备注

- zai 的 GLM monitor 接口在 key 失效时返回 HTTP 200 + `success:false`，插件归类为 `key无效`。
- MIT License。
