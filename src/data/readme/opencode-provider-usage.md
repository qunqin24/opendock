# opencode-provider-usage

> Live provider quota / balance / credits for OpenCode v2 — rendered in the TUI
> sidebar with gradient bars, trend ETA and a `/quota` detail dialog. 中文文档如下。

[opencode](https://opencode.ai) v2 插件：在 TUI **侧栏**实时显示当前模型提供商的额度 / 余额，
点击侧栏块或 `/quota` 查看明细。V2 原生插件（server + TUI 双端，RPC 通信）。

## 支持的提供商

插件内置的是各家的**用量接口适配器**，实际显示哪些完全由你的配置决定——**有可解析 key 的才进快照、才显示**：

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

没有公开余额/额度接口、只能去控制台看的常见服务商（连了 key 也不会显示）：MiniMax、
Kimi For Coding（kimi.com 订阅）、Qwen/百炼、火山方舟、Groq、Together、Mistral、xAI、
Perplexity、Fireworks 等。OpenRouter 用普通 Key 查询会得到明确的"需要 Management Key"提示。

### 发现规则

每次刷新前先做发现，而不是遍历固定列表：

1. 枚举 opencode 里实际配置的服务商（`ctx.provider.list()`），按 **integration id** 和 **baseURL 主机名** 匹配到已知适配器——所以你自己在 `opencode.jsonc` 里加的、指向已知端点的自定义服务商也会被认出来；
2. 凭据解析顺序：integration 连接 → 适配器声明的环境变量 → 旧 `auth.json`；
3. 解析不出 key 的适配器**不进快照**（侧栏、`/quota`、`/quota all` 一律不出现，不会有 `无key` 噪音）；
4. key 被移除后，该提供商会在下一轮刷新中自动从快照里消失。

新增一家没有适配器的服务商时，只需在 `src/providers.ts` 里加一个 `ids`/`hosts`/`fetch` 定义即可，其余逻辑不用动。CN/国际双站点的服务商（moonshot、siliconflow、zai）共用 `fetchSites` 助手：一个站点返回 401/403 时自动换另一个站点试，避免"国内 key 打国际站"的误报。

## 结构

opencode v2 的插件分两半，通过 RPC 通信：

- `index.ts` → `src/index.ts`：**server 插件**。只负责 opencode 接线（凭据解析、发现、storage、RPC、定时器、日志）；
  通过 RPC `isword.provider-usage` 暴露快照；每 2 分钟轮询、会话空闲 / 每轮结束时刷新。
- `tui.tsx` → `src/tui.tsx`：**TUI 插件**。只读 RPC，把当前提供商的状态渲染到侧栏（`sidebar.footer`），
  点击或 `/quota` 打开明细对话框；`/quota all` 查看全部（每家一行，适配对话框高度）。
- `src/providers.ts`：各提供商的官方用量接口实现（见上表，共 10 家适配器）。
- `src/backoff.ts`：429 指数退避（纯函数、可注入时钟）。
- `src/samples.ts`：趋势样本存储（1 小时窗口、重置骤降清零、纯函数）。
- `src/refresher.ts`：刷新状态机（状态、缓存 TTL、退避、趋势样本），时钟/抓取均可注入，全部单测覆盖。
- `src/validate.ts`：快照防御性校验/清洗，坏数据降级为空快照而不是炸渲染。

`index.ts` / `tui.tsx` 是 opencode 本地目录插件的约定入口（会自动监听文件变化）。
`package.json` 的 `exports`（`.` / `./tui` / `./rpc`）用于将来作为 npm 包发布。

## 安装

要求 **OpenCode v2**（≥ 2.0.3，在 2.0.24 上开发测试）。

### 1. 加入全局配置

编辑 `~/.config/opencode/opencode.json`（没有就新建一个）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-provider-usage"]
}
```

已有 `plugins` 数组的话追加一项即可。**`cli.json` 不用改**——TUI 部分通过包的
`./tui` 导出自动挂载，无需重复配置。

### 2. 重载

```bash
opencode service restart    # 或者直接重启 TUI
```

首次加载时 opencode 会自动从 npm registry 拉取包（视网络可能要几十秒）。

### 3. 给至少一家提供商配置凭据

插件只显示**解析得出 key** 的提供商。三种方式任选：

- TUI 里执行 `/connect`，按引导连接；
- 终端执行 `opencode auth login`；
- 或设置适配器声明的环境变量：`OPENCODE_API_KEY`（opencode/go）、
  `DEEPSEEK_API_KEY`、`ZHIPU_API_KEY` / `ZAI_API_KEY`（GLM）、`MOONSHOT_API_KEY`、
  `SILICONFLOW_API_KEY`、`OPENROUTER_API_KEY`（需 Management Key）、
  `SKYWORK_API_KEY`、`NOVITA_API_KEY`、`STEPFUN_API_KEY`。

### 4. 验证

```bash
opencode plugin list        # 应出现 opencode-provider-usage
```

进入会话后侧栏出现额度块即安装成功（首轮刷新最多等 2 分钟）；点击侧栏块
或执行 `/quota` 查看明细，`/quota all` 查看全部提供商。

### 排障

- 加载失败或侧栏无显示时看日志：
  `grep -i provider-usage ~/.local/share/opencode/log/opencode.log | tail`
- 部分网络环境访问 registry.npmjs.org 不通会导致拉包失败，多次
  `opencode service restart` 重试，或先在能访问的机器 `npm pack` 后改用本地路径安装。

### 更新

```bash
opencode plugin check                            # 检查可更新项
opencode plugin update opencode-provider-usage   # 更新本插件（省略参数 = 更新全部）
opencode service restart                         # 重载生效，或直接重启 TUI
```

`plugins` 里写不带版本号的包名时，opencode 每次服务启动会自动检查新版（仅提示，
不自动安装）；想锁定版本可写 `opencode-provider-usage@0.1.1`，精确版本不会被
`plugin update` 触碰。

### 本地开发

```bash
git clone https://github.com/IswordSun/opencode-provider-usage
```

把 `plugins` 指向仓库目录（改动自动重载）：

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-provider-usage"]
}
```

## 使用

- **侧栏块**（`sidebar.footer`，随会话侧栏出现）按当前模型自动切换：

  ```
  ⚡ GLM Coding Plan
  5h   ████████▌░░  62%
  7d   ████░░░░░░░  21%
  30d  █████░░░░░░  30%
   → 02:24 (2h left)
  ```

  - 条形按用量 6 档梯度变色（绿 → 青柠 → 黄 → 琥珀 → 橙 → 红），明暗主题自适应；
  - 重置倒计时青色高亮，只标注最紧张窗口；
  - 余额类一行显示：`💰 ¥299.59`; click the block to open details.
- **`/quota`**（或点击侧栏块）打开当前提供商的明细，额度窗口渲染为彩色进度条：

  ```
  OpenCode Usage
    5h   ░░░░░░░░░░░░░░░░░░░░    0% → 10-08 04:12 (5h left)
    7d   ░░░░░░░░░░░░░░░░░░░░    0% → 10-12 08:00 (4d left)
    30d  ██████░░░░░░░░░░░░░░   30% → 11-02 21:44 (26d left)
  ```

  明细弹窗内同样使用梯度配色，附窗口状态（`⚠limited`）、积分明细、涨跌箭头
  (`↑` orange / `↓` green)、趋势与预计用满时间。
- **`/quota all`**并列显示**全部有 key 的**提供商，名称对齐、每家一行摘要（额度窗口 + 趋势 / 余额 / ✗ 失败原因）。
- 失败显式呈现：`⚡ key无效` / `⚡ 限流退避中 12m` / `⚡ 查询失败`，不会用旧数据冒充最新值。
- 429 每提供商独立退避（10 分钟起，翻倍至 60 分钟），失败提示会显示剩余退避时长。
- 趋势样本持久化在插件 storage 中，展示 1 小时内的百分点变化与预计用满时间；重启后快照与样本从 storage 播种，首秒即有数据。

## 健壮性

- RPC 载荷在渲染前全部经过 `parseSnapshot` 校验清洗：非法条目丢弃、百分比钳制到 0-100、时间戳规整为 ISO、`status`/`note` 长度封顶。
- **缓存有过期时间**：查询失败时上一次成功结果只兜底 15 分钟，之后显式显示失败——key 被吊销不会永远展示旧余额。
- 多 location 共享一个进程级协调器：一份轮询、一份退避状态，不会随项目数量放大请求量；发现（凭据解析）并行执行；发现集合变化会打一条日志。
- 刷新循环整体 try/catch，单家提供商异常只影响自己。
- 响应体先读文本再解析 JSON，网关返回 HTML 时报"响应不是有效 JSON"；超过 2MB 的响应体直接拒绝。
- TUI 对 server 插件的连接是自愈的：初次拉取指数退避重试，RPC 就绪后补订 `updated` 事件，另有 2 分钟兜底轮询，事件丢失也能收敛。
- 终端宽度自适应：优先监听 renderer 的 `resize` 事件，事件不可用时由兜底轮询刷新。
- `/quota` 强制刷新有 15 秒超时，超时展示缓存；会话成本行会在 store 同步后自动补显。
- 关停（abort）与在途请求的竞态做了保护：停止时不写入失败状态，保留原有数据。

## 调试

```bash
OPENCODE_PROVIDER_USAGE_DEBUG=1 opencode service restart
tail -f ~/.local/share/opencode/log/provider-usage.log   # 发现/失败/恢复日志，超 1MB 自动截断
```

## 开发

```bash
bun install
bun test          # 单元测试（全部 mock，不访问真实接口）
bunx tsc --noEmit # 类型检查
```

## 备注

- zai 的 GLM monitor 接口在 key 失效时返回 HTTP 200 + `success:false`，插件会归类为 `key无效`。
- MIT License。
