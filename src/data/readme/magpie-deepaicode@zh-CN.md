# magpie-deepaicode

把 **DeepAI Code** 的模型接入 magpie：所有 Agent 都能以 `deepaicode/<模型>` 使用。
直连 `https://api.deepai.org/deepai_code`，发送**真实设备指纹**领取每日 Theos，
与官方桌面端行为一致。

> 状态：v0.2.1 —— 61 个单测全绿。2026-11-06/07 已在真实账号上完成回归：
> 对话、流式、工具调用、图片输入均可用；额度与签到读到真实值。
> 上游思维链在 `reasoning` 字段，magpie 已确认原生渲染（PROTOCOL.md §4）。

## 安装

```bash
magpie plugin add magpie-deepaicode            # npm
magpie plugin add github:aqiu817/magpie-deepaicode
magpie plugin add ./magpie-deepaicode          # 本地文件夹
```

应用里：**插件 → 添加插件** → 填文件夹路径或包名。

## 登录

`magpie plugin login deepaicode` 提供三种方式：

| 方式 | 需要什么 | 说明 |
|---|---|---|
| **浏览器登录 DeepAI**（推荐） | 一个 DeepAI 账号 | 打开 `desktop_auth`，在随机 `127.0.0.1` 端口等回调，换回 Key；监听失败时降级为粘贴回调里的 `code` |
| **读取本机 DeepAI Code 凭据** | DeepAI Code 桌面端登录过一次 | 读 `~/.deepai-code/userdata/secrets/deepai-account.bin`（明文 JSON）；Key 提示填 **`auto`**（也可以直接粘贴 Key 改用粘贴的值） |
| **粘贴 API Key** | 一个 DeepAI API Key（UUID 形态） | 保存前先用 `/theos` 验活 |

`auto` 是哨兵值，表示"读桌面端凭据"（magpie 对 `api` 方式要求 Key 非空）。

> 终端提示：插件的提问之后，magpie 还会从 stdin 再读一个 Key。插件自己返回了 Key
> （桌面端 / 浏览器）时这个值会被忽略——随便填。应用里的流程只显示插件的提示。

## 使用

```
deepaicode/glm-5.3-flash          # 免费模型（2026-11-06 快照：14 个里 8 个免费）
deepaicode/claude-opus-5-5        # premier 模型，消耗 Theos
deepaicode/gpt-6-astra            # 仅 Responses 通道
```

模型目录动态拉取（`/deepai_code/models`），拉不到时用 2026-11-06 快照兜底。
`theosPerRequest == "0"` → magpie 的 `free: true`；premier 的价格（3/10/15/25/50）→ `rate`。

`gpt-6-astra` 用模型级 npm 覆盖（`@ai-sdk/openai`），magpie 会把它发往 Responses 端点。

## 额度与签到

- 额度 = 该账号的 `/theos` + `/get_usage_summary`。结果带进程内缓存（成功与错误
  均 10 分钟），面板最短 5 秒一刷也不会变成对上游的高频请求；
- 签到 = 调一次 `/theos` 触发并锁定当日额度，用 `refresh_at` 变化判断"刚领到"；
- 若上游回 `403 "restarted its check-in too many times today"`（它对"当天反复重启
  签到"的防刷保护），插件 6 小时内不再请求 `/theos`，面板显示中性的"明日恢复"提示
  而非红色报错。不是故障，聊天不受影响。

每日免费 Theos 按 **(机器指纹, 账号)** 每天发一次。指纹是真实设备标识
（SMBIOS UUID / `MachineGuid` / IOPlatformUUID / `/etc/machine-id`），哈希方式与桌面端一致。
同一台设备上的多个账号共享该设备的一次每日额度——这是 DeepAI 自己的设备配额设计，
插件不做任何绕过。

## 选项

通过插件选项传入（应用里「已安装 → 选项」，或 `magpie plugin options deepaicode '<json>'`）：

| 选项 | 默认 | 含义 |
|---|---|---|
| `baseOrigin` | `https://api.deepai.org` | 上游地址 |
| `laneVersion` | `"auto"` | `X-DeepAI-Code-Theos` 车道版本：自动探测 `/models`（免鉴权）取当前受理值并缓存；传 `"4"` 之类的显式值可固定 |
| `secretDir` | `""` | 桌面端凭据目录（留空自动探测） |
| `lang` | `zh` | 界面语言（`zh` \| `en`） |
| `debug` | `false` | 输出详细日志——只记录字段**名**，不记录值 |

## 排查

**自己的 DeepAI 账号登录失败** —— 先跑探针，它会打印状态码与上游原话（Key 已脱敏）：

```bash
node scripts/probe.mjs --secret-dir ~/.deepai-code
```

如果探针超时但 magpie 自己能连上游，说明系统设了代理而 Node 的 `fetch` 默认不读代理：
用 `NODE_USE_ENV_PROXY=1` 重跑（Node 24+）。magpie 的 Bun 宿主也会读 `HTTPS_PROXY`。

**DNS 被污染的网络（部分运营商环境）**：插件的请求从 magpie 进程里发出，
magpie 应用内设置的「全局代理」**不覆盖插件自己的 fetch**。给 magpie 进程显式配代理
（Bun 的 fetch 原生读取环境变量）：

```bash
HTTP_PROXY=http://127.0.0.1:7897 HTTPS_PROXY=http://127.0.0.1:7897 NO_PROXY=localhost,127.0.0.1 magpie
```

（已在 Linux ARM64 板子上实测验证：系统 DNS 对 `api.deepai.org` 返回假记录导致登录
超时，给进程配上环境变量后登录与额度立即正常。）

| 探针输出 | 最可能的原因 | 怎么办 |
|---|---|---|
| `403` / `email_unverified` | 邮箱未验证 | 点 DeepAI 发来的验证链接 |
| `401` | Key 失效（重新登录会换 Key） | 桌面端重新登录，或粘贴新 Key |
| 网页能登、API 立刻 `302`/`401` | 读到旧凭据 | 重新读取桌面端凭据文件 |
| `426` "This version … no longer supported" | 上游抬高了车道版本 | `laneVersion: "auto"`（0.2.1 起默认）会自动跟进；旧版插件需要升级 |
| `400` "This request is not one DeepAI Code sends." | 旧版插件（<0.2.1）触发上游客户端校验——Node 宿主下是默认 `user-agent: node` 所致 | 升级插件到 0.2.1+ |
| `403` "restarted its check-in too many times today" | DeepAI 的每日防刷：当天签到流程重启太多次（换指纹、反复登录等） | 不是故障，次日重置自动恢复；聊天不受影响 |

**Agent 看不到思考内容** —— 已验证可用：magpie 原生渲染上游的 `reasoning`
（PROTOCOL.md §4 #8）。

## 安全

- DeepAI Key **只**发往配置的上游；请求 URL 一律从配置的基地址重建，不会跟随传入 URL 的主机。
- 拒绝重定向（`redirect: "error"`）：无效 Key 不能被 302 到登录页"伪装成 200"。
- Key 不出现在日志或错误文案里；`debug` 日志只记字段名；探针输出做了脱敏。
- 非流式响应有大小上限；流式响应原样透传，不缓冲、不改内容。
- 桌面端凭据只读；除 magpie 自己的登录存储外，插件不写任何凭据。
- 机器指纹是真实设备标识；插件不派生每 Key 指纹，不做绕过 DeepAI 每日设备配额的事。

## 开发

```bash
npm test                                  # node --test（54 个用例）
node scripts/smoke.mjs                    # 直接调钩子：models/usage/checkin/loader（直连上游）
node scripts/probe.mjs                    # 协议取证（脱敏）
```

协议事实与证据等级见 [PROTOCOL.md](./PROTOCOL.md)。

## 许可

MIT。协议知识最初借助 DeepAICode2API（MIT）梳理，见 [NOTICE](./NOTICE)。
