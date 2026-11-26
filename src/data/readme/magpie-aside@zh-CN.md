# magpie-aside

把 **Aside** 订阅模型接入任意 agent 的 magpie 供应商插件，模型以 `aside/<model>` 的形式出现。插件直连
Aside 自己的 AI 网关（`https://api.aside.com/ai/v1`），读取本机已登录的 Aside 浏览器账号，并按模型把请求
发到它真正使用的端点。

> 状态：v0.1.6。81 个单测通过。2026-11-25 真机验证通过：聊天流式、工具调用、Anthropic Messages、
> OpenAI Responses、图片输入。详情见 [CHANGELOG.md](./CHANGELOG.md)。

## 安装

```bash
magpie plugin add ./magpie-aside        # 本地目录
magpie plugin add magpie-aside          # npm，发布后可用
```

应用内：**插件 -> 添加插件** -> 粘贴目录路径或包名。

## 登录

`magpie plugin login aside` 提供三种方式：

| 方式                        | 前提                   | 行为                                                                                 |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| **使用 Google 登录**        | 已安装 Aside 应用      | 本地已有可用会话时直接成功；否则打开 Aside，在应用里完成 Google 登录后自动接管新会话 |
| **读取本机 Aside 登录账号** | Aside 浏览器登录过一次 | 读取 `~/.aside/accounts.json`（或 `ASIDE_HOME`），必要时刷新令牌，并向网关验活       |
| **粘贴 Aside 访问令牌**     | 一个访问令牌（JWT）    | 用 1 个 token 的请求验活；适合临时排查或非标准安装                                   |

前两种方式的密钥输入框接受 `auto`（默认值），表示"读取本机账号"。直接输入令牌则等同于粘贴方式。

### 关于 Google 登录

Aside 的 Google OAuth 由它的本地守护进程代理：包括 `accounts.auth.startGoogleOAuth` 和
`/auth/callback/*` 在内的所有 tRPC 调用都指向 `http://127.0.0.1:21420`，而守护进程只接受由浏览器扩展
私钥签名的会话令牌。插件既不能注册回调地址，也不能签这个挑战，因此无法独立完成授权流程。插件的做法是：
打开 Aside，让应用完成 Google 登录，再接管它写入的会话。

## 使用

```
aside/gpt-6-luna            # OpenAI Responses
aside/claude-haiku-5-5      # Anthropic Messages
aside/gemini-4-argon        # Chat Completions
aside/glm-5.3-flash         # Chat Completions
```

模型目录来自 `/ai/catalog/v2`（免鉴权，60 秒缓存），按账号套餐（`free` < `pro` < `max`）和
`visibleModelIds` 过滤。未登录或目录不可用时使用 2026-11-25 的内置快照。

| 家族                 | 端点                      | SDK                                       |
| -------------------- | ------------------------- | ----------------------------------------- |
| `openai-responses`   | `/ai/v1/responses`        | `@ai-sdk/openai`（模型级覆盖）            |
| `anthropic-messages` | `/ai/v1/messages`         | `@ai-sdk/anthropic`（模型级覆盖）         |
| chat                 | `/ai/v1/chat/completions` | `@ai-sdk/openai-compatible`（供应商默认） |

插件会从配置的 origin 重建每个请求的 URL，凭据只会发往你配置的主机。

## 额度卡片

插件用账号令牌读取 `GET /billing/subscription`，展示真实订阅额度：

- 套餐、账号邮箱与续费日期；
- 本月额度窗口：剩余与总额、已用百分比、重置日期（例如 `剩 $17.99 / $18.00`，2026-12-24 重置）；
- 账号有附加额度时，额外显示一个附加额度窗口；
- 一个只用于展示的会话窗口，显示访问令牌剩余时间（例如 `访问令牌剩余 52 分钟`），方便观察长任务跨越
  令牌刷新。

结果缓存 60 秒。计费接口不可用时，回退为套餐加会话窗口，临时故障不会让账号信息消失。不会编造
`used` 或 `limit`。

## 令牌处理

- 访问令牌有效期 1 小时。剩余不足 5 分钟时插件会刷新。
- 网关**不会**轮换 refresh token。用同一个 refresh token 连续刷新两次都返回 200，且返回的
  `refreshToken` 完全相同（实测），因此刷新不会把浏览器踢下线。
- 刷新成功后原子写回 `accounts.json`；若文件已被其他进程改过则跳过写入，不会覆盖 Aside 守护进程刚写入的
  令牌。
- 每次使用都读文件（3 秒缓存）；请求遇到 401 且文件里已有更新令牌时，自动重试一次。
- 每次成功刷新都会往 magpie 插件日志写一行 `token refreshed: expires <iso> (written)`，长任务结束后可以
  据此核对刷新记录。

## 选项

插件在 `package.json` 里声明了默认选项，所以 **插件 -> 已安装 -> 选项** 会出现一个 JSON 编辑框。命令行
等价写法是 `magpie plugin options aside '<json>'`。编辑框的起始内容：

```json
{
  "lang": "auto",
  "showHiddenModels": false,
  "allowRefresh": true,
  "dataDir": "",
  "baseOrigin": "https://api.aside.com",
  "debug": false
}
```

没有保存过时，使用插件内置的默认值。

| 选项               | 默认值                  | 含义                                                                                                                                           |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseOrigin`       | `https://api.aside.com` | 上游地址                                                                                                                                       |
| `dataDir`          | `""`                    | Aside 数据目录或 `accounts.json` 路径；留空按 `ASIDE_HOME`、`~/.aside` 探测                                                                    |
| `lang`             | `auto`                  | 界面语言：`auto` 跟随系统区域设置，也可固定为 `zh` 或 `en`                                                                                     |
| `allowRefresh`     | `true`                  | 允许用 `/auth/token/refresh` 刷新过期令牌；设为 `false` 则只读文件                                                                             |
| `showHiddenModels` | `false`                 | 同时暴露被 `visibleModelIds` 隐藏的 6 个模型，包括 1M 上下文的 `glm-5.3`、`glm-5.3-flash`、`deepseek-v4-flash`、`deepseek-v4-pro`、`kimi-k3.1` |
| `debug`            | `false`                 | 输出调试日志，只记录字段名，绝不记录值                                                                                                         |

## 排查

先跑探针。它会打印账号、令牌到期时间和实时目录，且不会打印令牌：

```bash
npm run probe
npm run probe -- --live      # 追加一个 1 token 的聊天请求
```

| 现象                          | 可能原因                               | 处理                                         |
| ----------------------------- | -------------------------------------- | -------------------------------------------- |
| `登录已失效`                  | 令牌过期且刷新失败                     | 打开 Aside，或用 **使用 Google 登录**        |
| `没有找到 Aside 应用`         | Aside 不在标准安装位置                 | 从 `aside.com/download` 安装，或改用粘贴令牌 |
| `403` 且含 `error code: 1010` | Cloudflare 拦了 User-Agent             | 检查宿主是否覆盖了插件的 `User-Agent`        |
| `426`                         | 模型被发到了错误端点                   | 更新插件；端点选择是按模型家族做的           |
| 额度卡片显示 `访问令牌已过期` | 文件里的令牌过期且 `allowRefresh` 关闭 | 重新开启刷新或重新登录                       |
| 刷新写回失败                  | `accounts.json` 只读                   | 插件在内存里继续用新令牌；修好权限即可持久化 |

## 安全

- 访问令牌只发往配置的 `baseOrigin`；请求 URL 从该 origin 重建，从不使用传入的 URL。
- 禁止跟随重定向（`redirect: "error"`）。
- 令牌不会出现在日志或错误信息里；`debug` 只记录字段名。
- 除刷新后的原子、带比较的写回外，插件对 `accounts.json` 只读。
- Google 方式只启动 `%ProgramFiles%\Aside\Application`（或 `/Applications/Aside.app`）下找到的 Aside
  可执行文件，绝不执行用户提供的命令。

## 限制

- Google 登录需要安装 Aside 应用，授权流程在应用内部。
- 卡片只覆盖订阅额度窗口和令牌剩余时间，不展示按请求的用量。
- 模型目录没有模态字段，插件统一声明为文本加图片。图片输入已在 `gemini-4-argon` 上验证；纯文本模型会
  透出厂商自己的错误。
- 本插件是非官方集成，与 Aside 官方无关。

## 开发

```bash
npm test                       # 单测，离线
ASIDE_E2E=1 npm test           # 追加真机网关测试
npm run e2e                    # 真机 E2E，本地生成报告
npm run probe                  # 只读协议探针
```

英文 README：[README.md](./README.md)。

## 许可

MIT。见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。
