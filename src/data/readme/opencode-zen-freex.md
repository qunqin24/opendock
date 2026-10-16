# OpenCode Zen FreeX

[magpie](https://github.com/yetone/magpie)的拓展插件，为其提供OpenCode Zen的免费模型

## 为什么有这个分支

上游 [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free) 是这个插件的前身。它一直在维护，修bug也不慢，但对「给免费模型适配」这件事的态度摇摆不定，时而维护而放弃维护故催生本分支：

| UTC | 提交 | 那一下说了什么 |
| --- | --- | --- |
| 2026-10-13 23:53 | [`643ef50`](https://github.com/magpie-community/plugins/commit/643ef5018e63be78c4aa7554696831d4220ac9c9) | README 加上说明：免费层「只在 OpenCode 本体里能用」，`this plugin doesn't work around that`，请改用 Zen 付费 key 或 OpenCode Go；提交说明里写着 `No version bump … The code on main is left as it is` |
| 2026-10-14 10:57 | [`a810ee7`](https://github.com/magpie-community/plugins/commit/a810ee7e882012ab106e2deb742176cd43db781a) | 0.1.6 把那段说明**删掉**，改为发 OpenCode 1.19.0 原样的请求头——距加上去 11 小时 |
| 2026-10-14 17:59 | [`5fc0a75`](https://github.com/magpie-community/plugins/commit/5fc0a75292f0e5c0c10cf65a188bff5545d6b8e9) | 0.1.7：`free models answer again` |

本分支切于 2026-10-15 00:14 UTC，就在那段声明被删掉之后、从 0.1.6 派生出来。所以这里不去赌下一次会往哪边倒：**指纹在这个仓库里可以随时重新采集**（`bun run capture`），不必等上游发版，也不必先有人被 403 挡住。维护步骤（重新采集、读闸门结果、发版）见 [MAINTAINING.md](https://github.com/tkhs101/OpenCode-Zen-FreeX/blob/main/MAINTAINING.md)。

上游的修复是跟着报告走的——0.1.1 到 0.1.8 的每一个版本提交都挂着一位具名的报告者。没人遇到、没人报告，就没有那一次修复。这里的 `bun run check:gate` 把「去问 Zen 现在还认哪一代」变成一条随时能跑的命令。

上游修好的东西会照常跟进。**版本号与上游不可比**：0.2.x 长在上游 0.1.6 上，之后按需合并上游的修复，同时保留自己的取舍（比如工具措辞按代从真实 OpenCode 采集，而不是钉死某一个版本）。升级看这个仓库的提交，别拿版本号大小跟上游排。

## 目录

- [为什么有这个分支](#为什么有这个分支)
- [安装](#安装)
- [登录](#登录)
- [模型](#模型)
- [免费层不再应答时](#免费层不再应答时)
- [请求](#请求)
- [排查](#排查)

## 安装

```sh
magpie plugin add opencode-zen-freex
magpie plugin login opencode-zen-free
```

## 登录

在密钥一栏填 `public`。不需要个人的 API key。

凭据保存在 OpenCode 的 `auth.json` 或 magpie 的 `plugin-auth.json` 里。

## 模型

插件会去发现 Zen 当前的免费模型，包括它们的上下文窗口和思考（reasoning）等级。用 `opencode-zen-free/<模型名>`，例如 `opencode-zen-free/big-pickle`。

免费模型的目录上限有时被 Zen 少报，而少报的那一边没有谁会报错：`deepseek-v4.1-flash-free` 在目录里是 20 万上下文 / 3.2 万输出，而同一上游模型的付费 id 是 100 万 / 38.4 万。上下文窗口太小只会让宿主安静地早点压缩，输出上限太小会把回复截断成看起来像模型自己停下的样子，所以插件对这类模型按实测与路由自述对齐（依据与复测方法见 `MAINTAINING.md` 的 “Limits Zen under-reports”），并在运行中采用上游自报的窗口。

已下线的模型和 SystemOne 模型会被排除。这份列表在宿主每次列举模型时重新获取（magpie 在启动时做一次，之后每小时一次）：Zen 不再免费开放的模型会退出列表，新转为免费的模型会加入列表——**不等** OpenCode 的目录或文档写到它：只要 Zen 的列表里有、id 里带 `-free`，就按 provider 自己的协议（OpenAI 兼容 / chat）提供，目录晚一步也不影响。

目录或文档读不到时**不算 fallback**：Zen 的列表已经读到了，它就是当前该提供的东西；报成 fallback 会让宿主保守地沿用上一次完整读到的列表，于是读不到 `raw.githubusercontent.com` 或 `models.opencode.ai` 的机器永远看不到之后新转免费的模型。只有**列表本身**读不到才沿用上一次结果；第一次还没读到之前，用的是打包在插件里的那份，所以这个 provider 不会空着。请求一个当前并不免费的模型，会得到一个 404 并列出当时免费的模型；若某个模型是在上次列举之后才转免费的，请求会在重新获取列表后照常服务（最多每分钟一次）。可用性和限流由 Zen 决定，插件这边拿不到剩余额度。

## 免费层不再应答时

过期的指纹和好用的指纹看起来一模一样，直到有人被拒绝。要问 Zen 它还认哪几代 OpenCode：

```sh
bun run check:gate
```

每一代问两次，因为插件发出的形状和 OpenCode 本体发出的形状并不是同一个：

| 形状 | 发出去的工具 | 是什么 |
| --- | --- | --- |
| `floor` | `required` 里的名字 | 宿主一个都没有时，插件替它补上的那几个。**这才是插件真实发出的形状，退出码由它决定** |
| `full` | 这一代携带的全部工具 | 宿主本来就是 OpenCode 时发出来的形状。用来看措辞有没有过期，不决定退出码 |

每一代的结论是 `answered`（正常应答）、`refused`（被拒，403）、`superseded`（426——Zen 要求的 OpenCode 比这份指纹声称的更新）、`failed`（Zen 答了，但不是 403，所以它没有对指纹表态）、`malformed`（请求根本没法构造：`required` 里的某个名字在 `fingerprint.json` 里没有对应的工具。Zen 没被问到，那一行会点名是哪一代、哪种形状、缺的是哪个名字）或 `unreachable`（根本联系不上）。只要还有一代的 `floor` 被应答，退出码就是 0；`malformed` 不算应答，所以整轮都是它的时候退出码非 0，并且会说明这是指纹文件的问题、不是网络的问题。

某个 `floor` 被拒、而它自己的 `full` 被应答时会单独点出来：那意味着带着自己那套 OpenCode 工具来的宿主能用，而插件真正要服务的那种宿主会被拒。全部联系不上时它不会说指纹过期，只会说问不到——这两件事得分开，而且最后的判断只读 `floor` 那几行：某个 `full` 请求拿到 5xx 说明的是那次请求，不足以把「没有一代被服务」说成「去查网络」。

闸门问的时候用的就是插件自己那份请求：请求头的名字来自 `provider.mjs` 里的 `outboundHeaders`，工具来自插件所顶替的同一份 `required`。所以它绿了是在说「插件真发的那个请求」被应答了，而不是在说「照抄的一份」被应答了——照抄的那一份曾经少发一个 `accept`，而且没有任何东西因此报错。

发版之前、以及有人报告 403 的时候，都该跑一次。`ZEN_CHECK_MODEL` 可以指定探测用的模型，`ZEN_BASE_URL` 可以指定端点，默认值不合适时就改这两个。

如果每一代的 `floor` 都被拒，就从当前版本的 OpenCode 重新采集措辞：把一个 release 指向本地服务器，从它发出的请求里把工具读出来。`bun run capture -- --dry` 取一份新采集并报告差异，`bun run capture` 才真正写入。插件在拒绝时会直接说出发出去的措辞是哪个版本、去哪里找，而不是让人自己猜。

要注意这个闸门并不稳定：摸索它的过程中它一天之内挪动过不止一次，而且同一个地址反复被拒之后，接下来一段时间反而会被应答。这里的结论只能读成"此时此刻"，信之前再跑一遍。

`bun test` 是这个循环的另一半。它从不联网，所以它回答不了指纹是否还有效——它只能说明这个包的行为和以前是否一致。

## 请求

请求发往 `https://opencode.ai/inference/v1`，按每个模型原生的 Chat Completions、Responses 或 Anthropic Messages 接口来走。流式和普通 JSON 两种回复都支持。

宿主自己的工具会被完整保留。Zen 的模型经常去调 OpenCode 的工具名；这种调用会被对上宿主那个只差大小写的工具（`bash` 对 `Bash`），或者只差大小写和 `_`/`-` 的那个（`todowrite` 对 `todo_write`、`webfetch` 对 `web_fetch`），前提是恰好只有一个对得上。找不到对应工具（或者调用根本没有名字）的，不放进回复里，回复的正文会说明哪个名字被略去了；如果这一轮所有调用都被略去，这一轮就以一段普通回答结束。工具仍然在宿主里执行。

Zen 的免费层读请求体，也读请求头，只有当整个请求都属于 OpenCode 的同一代时才作答：User-Agent、请求头和工具三者必须一致。当前一共有两代，请求带的工具说明是哪一代：`shell` 和 `read` 属于 2.x，`bash`、`glob`、`grep` 和 `read` 属于 1.x。如果宿主本身就是 OpenCode，它自己的 User-Agent 已经说明是哪一代，这个值会被原样传出去，而不是被钉死，所以永远不会落后。没有任何一方说明时，以工具为准，User-Agent 跟着工具走。

在同一代之内，插件把这一代的工具名都带上——`bash`、`glob`、`grep`、`read`、`write`、`edit`——并且要按 OpenCode 的说法描述。前四个（`required`）在宿主缺了的时候会补上；后两个只在宿主本来就有的时候才去读。实测只有 `read` 是 Zen 咬住不放的：只发 `read` 会被应答，发齐其余五个却不带 `read` 会被拒。那为什么四个都补？因为超集是被接受的，而多出来的名字只在宿主本来没有它时才有代价——一段不会被调用的工具的描述——却能在 Zen 哪天收紧时先挡住一次。这份清单因此刻意留得比实测更宽。

工具永远不会被丢弃：宿主自己的工具原封不动地保留，只有发往上游的措辞被替换掉，所以模型发出的调用仍然适配真正执行它的那个工具。别的名字的工具一概不看。

被*补上*的工具背后什么都没有：宿主没有这个工具，调它也会被丢弃。但 Zen 要求按 OpenCode 的样子描述它，而这么描述又会让模型想去调它，所以在 Zen 会读的正文开头之后、它不读的那段收尾之前，插一句说明。那句话是只针对这一个工具写的：实测过一句笼统的"这些工具不可用"，会连宿主自己的工具也一起不用。

发出去的请求头就是下面这些，一个不多，而这份清单是刻意从 Zen 曾经接受过的全部头里挑出来的子集：

| 请求头 | 值 |
| --- | --- |
| `content-type` | `application/json` |
| `accept` | `*/*` |
| `user-agent` | 上面说的那一代的值 |
| `x-opencode-project` | 宿主的 project id，或 `global` |
| `x-opencode-session` | 整个会话共用的一个 id |
| `x-opencode-session-id` | 同一个 id |
| `x-opencode-client` | `cli` |
| `authorization` | `Bearer public`；走 Messages 时是 `x-api-key: public` |

`anthropic-version` 在走 Messages 时总是发出去（宿主设了就用它的，没设就是 `2023-06-01`）；`anthropic-beta` 只在宿主自己设了的时候才发。

`x-opencode-request`、`x-session-affinity` 和 `x-session-id` 都在 OpenCode 自己的请求头集合里，但没有一个是必需的，所以都不发——不过进来的同名请求头仍然会被读，用来判断这次请求属于哪个会话。这不是「一个个试过不行」得出的结论，2026-10-15 实测（1.x，其余不动）：

| 加进基准请求的 | 结果 |
| --- | --- |
| 任意一个，单独 | 应答 |
| `x-opencode-request` + `x-session-id` | 应答 |
| `x-session-affinity` + `x-session-id` | 应答 |
| **`x-opencode-request` + `x-session-affinity`** | **被拒**（复现三次；同一次运行里被拒与通过交替出现，所以不是冷却期） |
| 三个一起 | 被拒（复现四次） |

两个各自无害的头放在一起会被拒，所以「某个头能不能加」不能靠单个试出来。测试按名字钉住了发出的这组请求头，因为多加一个请求头是弄坏这个插件最容易的方式。

Zen 的免费层会检查 session id 是否是 OpenCode 能生成的那种：时间戳加每毫秒计数器截成十二位十六进制，后面接十四个随机的 base62 字符；session 的那一种还会把低位取反。宿主给的 id 如果本来就是这个形状，就原样传出去；否则按会话的首条消息生成一个并记住，这样同一会话的各轮请求会共用一个 session id。宿主既不声明会话、又没有可作依据的用户消息时，这一轮就拿一个自己的 id——没有东西可以据以记住它，所以它不会被并进另一个会话里去。

偶尔 Zen 会在发出 `[DONE]` 之前就结束一个流式的 Chat Completions 回复。如果回复已经说了内容、且其中没有未完成的工具调用，就以普通回答结束，正文里会说明它被截断了；再问一次就会接着往下走。如果是带着未完成的工具调用被截断、或者什么都没说就断了、或者被折叠给一个不支持流式的客户端，请求就会失败，错误信息里写明这个回复的 id 和收到了多少。走 Anthropic Messages 或 Responses 的回复被截断同样会失败：magpie 能把它和完整的回复区分开，并且在该模型支持的情况下继续往下走。

失败回复的正文会被读一小段，用来找 Zen 自己说出的上下文窗口或输出上限（见下）。因此透传给你的错误正文有两个规矩：读完的按原样给，只去掉描述旧字节的长度、编码与校验头；**没读完的不会冒充完整正文**——状态码仍是上游的，正文换成一段说明（写明上游的状态、读到了多少），并把读到的开头放在 `upstream` 字段里。不这么做的话，超长的错误正文会被截断成一段解析不了的 JSON，看起来像是解析出错而不是 Zen 说了什么。

## 排查

| 看到的现象 | 这是什么 | 怎么办 |
| --- | --- | --- |
| 每个请求都是 `403 FreeTierError` | `fingerprint.json` 里的措辞过期了 | 跑 `bun run check:gate`；如果每一代的 `floor` 都被拒，跑 `bun run capture` |
| `426 Upgrade Required` | 这个包自称的 OpenCode 版本比 Zen 要的旧 | 升级插件，或者在更新的 OpenCode 里运行 |
| `404 … not available as an OpenCode Zen free model now` | Zen 不再免费开放这个模型 | 从错误信息列出的模型里换一个 |
| `Model is not an available free model for this protocol` | 请求发来时列表变了 | 让宿主刷新模型列表再试 |
| `uses the public credential` | 存的密钥不是 `public` | 用 `public` 重新登录 |
| 不带 `FreeTierError` 的 403 | 是别的 403：正文原样透传，只去掉描述旧字节的头（`content-length`、`content-encoding`、`transfer-encoding`、`content-md5`、`etag`、`last-modified`） | 按 Zen 自己的错误来读，别当成这个插件的 |

这个插件给出的 403 会写明发出去的措辞来自哪个 OpenCode 版本。那正是 `check:gate` 在问的那份指纹，所以从它开始查，而不是从请求头开始查。

模型的可用性和限流归 Zen 管，插件拿不到剩余额度可显示。同一个地址反复被拒，也可能被放进一个冷却期，表现得和被拒很像。

## 许可

MIT，分叉自 [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free)。`LICENSE` 的 MIT 正文原样未改，版权行有两条：上游原作者的 `Copyright (c) 2026 xiaozhou26`，和本分支贡献者的 `Copyright (c) 2026 OpenCode-Zen-FreeX contributors`。本分支的来源与维护缘由写在 [NOTICE](https://github.com/tkhs101/OpenCode-Zen-FreeX/blob/main/NOTICE)，这样许可证扫描器读到的是一份标准的 MIT 文件，而想知道这个分支为什么存在的人仍然找得到答案。
