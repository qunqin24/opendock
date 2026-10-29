# ima.copilot（本机客户端）for magpie

**把本机已登录的 ima.copilot 免费模型接进 magpie —— 不粘贴 cookie，不走 ima 的云端 agent。**
**最适合：给 `dsh-chess-context` 这类记忆压缩/棋谱摘要做免费摘要模型；不适合当 DSH agent 后端。**

```text
登录   本机 ima.copilot 客户端（profile 里的 DPAPI 凭证 / 种子文件）
模型   DeepSeek / Tencent HY，免费问答；Copilot 积分模型默认不列
流式   MESSAGE 正文 + THINKING 思考，SSE 增量
额度   免费问答不扣算力；卡片显示账号算力余额
```

---

## 功能

- **一键导入本机登录态** —— 读取 ima.copilot 客户端退出时写进 profile 的加密凭证（Windows DPAPI），不用去浏览器 DevTools 复制 `x-ima-cookie`。
- **真实模型目录** —— 登录后从 `/model_manage/get_models` 读账号自己的模型表，跟随 ima 账号上下架；未登录时用静态兜底表。
- **流式与思考** —— 正文按 `MESSAGE` 增量转发；思考模型走 `THINKING` 事件进 `reasoning_content`，不混进正文。
- **多轮会话** —— 一个 magpie 会话对应一个 ima session（30 分钟 TTL，60 轮兜底轮换）；新 session 会自动带上最近几轮上下文。
- **省心的错误语义** —— 登录失效返回 401 + `X-Magpie-Sign-In: expired`；模型不存在返回 404；限流/业务失败原样给出 ima 的 code 与 message。
- **不碰云端 agent** —— 只走 `robot_type=10000`（问问 ima 的普通问答）。Copilot 的 `robot_type=15` 是 ima 自己的 agent，本插件不列、不调；这正是 today 式结果被排除的原因。

---

## 最适合的用途：记忆压缩 / 棋谱摘要

这个插件**不适合当 DSH 的 agent 后端**（ima 模型有自己的身份和工具规则，会把调用方的 system prompt + tools 当成注入），但它非常适合**单轮、结构化、无工具**的摘要任务——也就是 `dsh-chess-context` 的 fold。

把 `dsh-chess-context` 的摘要模型指向它：

```yaml
summaryMode: hybrid
summarizationProvider: magpie
summarizationModel: ima/deepseek-v4.1-flash
```

实测（同一份 8 条失败边 + 2 条约束的合成会话，3 次采样）：

| 模板 | 死路保留 | 约束保留 | 摘要长度 |
|---|---|---|---|
| `dsh-chess-context` 棋谱模板 + ima V4.1-Flash | **8/8（3/3 次）** | **2/2（3/3 次）** | 1,887 字符 |
| 官方 8 段模板 | 5/8 | 0/2 | ~3,072 字符 |

结论：**ima 免费模型的价值在“压缩”这一层，而不是“agent”这一层。** 它免费、长上下文、单轮输出稳定；棋谱摘要的硬事实由规则给定，模型只负责压缩表达，正好避开它的系统提示词/工具短板。

> 复跑：`cd projects/dsh-chess-context && MAGPIE_MODEL=ima/deepseek-v4.1-flash node test/real-model.mjs --runs 3`

---

## 模型

**DeepSeek / Tencent HY** —— 登录后跟随 ima 账号目录；不同账号、不同客户端版本的目录可能不同。

| 发行商 | 代表模型 | 思考 | 计费 |
|---|---|---|---|
| DeepSeek | `deepseek-v4.1-flash` | 客户端可切快速/深度 | 免费（知识库问答） |
| Tencent | `hy3` | 同上 | 免费（知识库问答） |
| Tencent | `hy4-preview` | 同上 | 免费（知识库问答） |
| 智谱 | `glm-5.3-flash` | 同上 | 免费（知识库问答） |

> 每个基础模型在 ima 目录里还带一个深度思考变体（`deepseek-v4.1-flash-think` 等）；
> 插件会从 `sub_model_infos` 自动生成。真实目录由 `provider.models` 在登录后整份替换；
> 装好以后 `magpie plugin list` / 模型选择器里看到的才是账号当前的全部。

**Copilot 积分模型默认不列。** 用 `CLIENT-TYPE=256021` 的客户端指纹可以读到完整 Copilot
目录（Hy3 ×0.2、Hy4 preview ×0.9、DeepSeek-V4.1-Flash ×0.4 峰时、MiMo / GLM / MiniMax / Kimi…），
但 Copilot 是 ima 的云端 agent（`robot_type=15`），不是模型通道；本插件按“不做云端 agent”的
定位不接它。免费目录已经包含 V4.1-Flash / Hy3 / Hy4 / GLM-5.3，不需要为了这些模型开 Copilot。

---

## 签到

**没有每日签到。** `auth.checkin` 返回 `inactive`。

---

## 安装

在 magpie 的 **插件 → 发现** 搜 `magpie-ima-local-auth`，点**安装**。

装完点**登录**，选 **Use ima.copilot on this machine**。插件会读取本机 ima.copilot 的登录态并保存到 magpie 的账号文件。

> 前置条件：这台机器上的 ima.copilot 客户端**登录过一次**（之后不要求一直开着）。
> 登录态来自客户端 profile 的 `tencent.wxlogin` 段；如果客户端还没把凭证写盘，先打开它、登录，再退出一次。

如果 magpie 提示找不到登录态，有三种办法：

1. 再打开一次 ima.copilot，确认账号页显示已登录，然后回 magpie 重试；
2. 用种子文件：`node scripts/import-login.mjs --profile "<ima 的 User Data 目录>"`，它会把登录态写到 `~/.cache/magpie/ima-local-auth/login.json`；
3. 直接把导出的 JSON 路径给环境变量 `IMA_COPILOT_LOGIN_FILE`（适合 macOS / 多 profile）；
4. 如果客户端已经带 `--remote-debugging-port` 启动，用 CDP + native bridge 导入：`node scripts/import-cdp.mjs --port 9222`（同一个 `chrome.imaFrame` 接口，官方前端用的就是它）；
5. 自定义 profile 目录可以用 `IMA_COPILOT_PROFILE_DIRS`（路径分隔符分隔）告诉插件。

### 命令行

```bash
# 从 npm（发布后）
magpie plugin add magpie-ima-local-auth

# 从本仓库源码
magpie plugin add "<本仓库目录>"

# 登录
magpie plugin login ima
```

装完确认：

```bash
magpie plugin list
# magpie-ima-local-auth  on
#   ima (ima, N models)  signed in as ...
```

---

## 常见问题

**Q：需要 ima.copilot 一直开着吗？**
不用。登录导入之后，magpie 用 refresh token 续期；客户端只在导入那一下需要存在。

**Q：为什么没有 Copilot 的模型？**
Copilot 是 ima 的云端 agent（`robot_type=15`），不是模型通道。它的 V4.1 / Hy3 / Hy4 / GLM / MiMo / MiniMax / Kimi 目录确实存在、也支持流式思考；插件按“模型供应商”定位，不把 agent 包装成模型。

**Q：支持工具调用 / 图片吗？**
**工具调用仅基础模型支持**：ima 的问答接口没有原生 tools 字段，插件用文本工具协议模拟——把调用方的工具表写进问题，模型输出 `{"tool_calls":[...]}`，插件再转成 OpenAI 的 `tool_calls`；工具结果会作为 `role:"tool"` 回灌。已用 `task_plan` / `subagent_spawn` 实测。**Think 变体实测会把 DSH 工具契约当成 prompt injection，所以 `toolcall:false`，只做纯文本 chat。** 图片**不支持**（`attachment: false`）。

**Q：上下文窗口是多少？**
ima 的模型目录不下发窗口大小。插件把 `limit.context` 留 0，让 magpie 用它自己的模型库；不写一个猜的数字。

**Q：macOS 能用吗？**
协议与模型目录是同一套；但登录导入的 DPAPI 解密目前只做了 Windows。macOS 请用种子文件 / `IMA_COPILOT_LOGIN_FILE`。

**Q：token 存在哪？**
登录态由 magpie 保存在它自己的账号文件里（`plugin-auth.json`）；`~/.cache/magpie/ima-local-auth/login.json` 只是种子文件，权限 600。插件不写 magpie 的市场缓存。

---

## 参考源

| 来源 | 用在哪 |
|---|---|
| [magpie-plugin-scaffold](https://github.com/MYCF711/magpie-plugin-scaffold)（MIT） | 九项钩子骨架、`check.mjs`、发版流程 |
| [magpie-ima-auth](https://github.com/dongsujiang0205-coder/magpie-ima-auth)（MIT） | ima 的 `init_session` / `assistant/qa` / `model_manage` 协议事实 |
| [opencli-plugin-ima](https://github.com/whynpc9/opencli-plugin-ima) | ima 登录态、WebContents、`x-ima-cookie` 字段的交叉验证 |
| ima.copilot 本机客户端 | 2026-10-28 在本机实测的模型目录、`MESSAGE` / `THINKING` 事件、IUA 行为 |

> 更新记录：[CHANGELOG.md](./CHANGELOG.md)

## 许可

MIT。ima 与 ima.copilot 归腾讯所有；这是一个第三方插件，不是官方产品。
