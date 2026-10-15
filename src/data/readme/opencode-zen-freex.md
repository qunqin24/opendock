# OpenCode Zen FreeX

[magpie](https://github.com/yetone/magpie)的拓展插件，为其提供OpenCode Zen的免费模型

本项目是 `magpie-community/plugins` 里[zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free)插件的维护分支，分叉的理由是magpie-community已放弃对OpenCode Zen免费模型继续维护，维护步骤见 [MAINTAINING.md](MAINTAINING.md)；想确认现在还能不能用，跑 `bun run check:gate`。

## 目录

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

已下线的模型和 SystemOne 模型会被排除。这份列表在宿主每次列举模型时重新获取（magpie 在启动时做一次，之后每小时一次）：Zen 不再免费开放的模型会退出列表，新转为免费的模型会加入列表。如果读不到 Zen 的列表，就沿用上一次的结果；第一次还没读到之前，用的是打包在插件里的那份，所以这个 provider 不会空着。请求一个当前并不免费的模型，会得到一个 404 并列出当时免费的模型；若某个模型是在上次列举之后才转免费的，请求会在重新获取列表后照常服务（最多每分钟一次）。可用性和限流由 Zen 决定，插件这边拿不到剩余额度。

## 免费层不再应答时

过期的指纹和好用的指纹看起来一模一样，直到有人被拒绝。要问 Zen 它还认哪几代 OpenCode：

```sh
bun run check:gate
```

每一代的结论是 `answered`（正常应答）、`refused`（被拒，403）、`superseded`（426——Zen 要求的 OpenCode 比这份指纹声称的更新）或 `unreachable`（根本联系不上）。只要还有一代能用，一代被拒就不算失败；只有全部应答时退出码才是 0。发版之前、以及有人报告 403 的时候，都该跑一次。`ZEN_CHECK_MODEL` 可以指定探测用的模型，`ZEN_BASE_URL` 可以指定端点，默认值不合适时就改这两个。

如果每一代都被拒，就从当前版本的 OpenCode 重新采集措辞：把一个 release 指向本地服务器，从它发出的请求里把工具读出来。`bun run capture -- --dry` 取一份新采集并报告差异，`bun run capture` 才真正写入。插件在拒绝时会直接说出发出去的措辞是哪个版本、去哪里找，而不是让人自己猜。

要注意这个闸门并不稳定：摸索它的过程中它一天之内挪动过不止一次，而且同一个地址反复被拒之后，接下来一段时间反而会被应答。这里的结论只能读成"此时此刻"，信之前再跑一遍。

`bun test` 是这个循环的另一半。它从不联网，所以它回答不了指纹是否还有效——它只能说明这个包的行为和以前是否一致。

## 请求

请求发往 `https://opencode.ai/inference/v1`，按每个模型原生的 Chat Completions、Responses 或 Anthropic Messages 接口来走。流式和普通 JSON 两种回复都支持。

宿主自己的工具会被完整保留。Zen 的模型经常去调 OpenCode 的工具名；这种调用会被对上宿主那个只差大小写的工具（`bash` 对 `Bash`），或者只差大小写和 `_`/`-` 的那个（`todowrite` 对 `todo_write`、`webfetch` 对 `web_fetch`），前提是恰好只有一个对得上。找不到对应工具（或者调用根本没有名字）的，不放进回复里，回复的正文会说明哪个名字被略去了；如果这一轮所有调用都被略去，这一轮就以一段普通回答结束。工具仍然在宿主里执行。

Zen 的免费层读请求体，也读请求头，只有当整个请求都属于 OpenCode 的同一代时才作答：User-Agent、请求头和工具三者必须一致。当前一共有两代，请求带的工具说明是哪一代：`shell` 和 `read` 属于 2.x，`bash`、`glob`、`grep` 和 `read` 属于 1.x。如果宿主本身就是 OpenCode，它自己的 User-Agent 已经说明是哪一代，这个值会被原样传出去，而不是被钉死，所以永远不会落后。没有任何一方说明时，以工具为准，User-Agent 跟着工具走。

在同一代之内，Zen 认得名字的工具——`bash`、`glob`、`grep`、`read`、`write`、`edit`——必须在场，并且要按 OpenCode 的说法描述。前四个在宿主缺了的时候会补上；后两个只在宿主本来就有的时候才去读。工具永远不会被丢弃：宿主自己的工具原封不动地保留，只有发往上游的措辞被替换掉，所以模型发出的调用仍然适配真正执行它的那个工具。别的名字的工具一概不看。

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

`anthropic-version` 和 `anthropic-beta` 也会发出去，但只在走 Messages 时，而且只在宿主自己设了它们的时候。

`x-opencode-request` 在 2026-10-14 实测被拒，而且从未测出它是必需的，所以不发。`x-session-affinity` 和 `x-session-id` 出现在 OpenCode 上游自己的请求头集合里，实测被拒，所以同样不发——不过进来的同名请求头仍然会被读，用来判断这次请求属于哪个会话。测试按名字钉住了发出的这组请求头，因为多加一个请求头是弄坏这个插件最容易的方式。

Zen 的免费层会检查 session id 是否是 OpenCode 能生成的那种：时间戳加每毫秒计数器截成十二位十六进制，后面接十四个随机的 base62 字符；session 的那一种还会把低位取反。宿主给的 id 如果本来就是这个形状，就原样传出去；否则按会话的首条消息生成一个并记住，这样同一会话的各轮请求会共用一个 session id。

偶尔 Zen 会在发出 `[DONE]` 之前就结束一个流式的 Chat Completions 回复。如果回复已经说了内容、且其中没有未完成的工具调用，就以普通回答结束，正文里会说明它被截断了；再问一次就会接着往下走。如果是带着未完成的工具调用被截断、或者什么都没说就断了、或者被折叠给一个不支持流式的客户端，请求就会失败，错误信息里写明这个回复的 id 和收到了多少。走 Anthropic Messages 或 Responses 的回复被截断同样会失败：magpie 能把它和完整的回复区分开，并且在该模型支持的情况下继续往下走。

## 排查

| 看到的现象 | 这是什么 | 怎么办 |
| --- | --- | --- |
| 每个请求都是 `403 FreeTierError` | `fingerprint.json` 里的措辞过期了 | 跑 `bun run check:gate`；如果每一代都被拒，跑 `bun run capture` |
| `426 Upgrade Required` | 这个包自称的 OpenCode 版本比 Zen 要的旧 | 升级插件，或者在更新的 OpenCode 里运行 |
| `404 … not available as an OpenCode Zen free model now` | Zen 不再免费开放这个模型 | 从错误信息列出的模型里换一个 |
| `Model is not an available free model for this protocol` | 请求发来时列表变了 | 让宿主刷新模型列表再试 |
| `uses the public credential` | 存的密钥不是 `public` | 用 `public` 重新登录 |
| 不带 `FreeTierError` 的 403 | 是别的 403，原样透传 | 按 Zen 自己的错误来读，别当成这个插件的 |

这个插件给出的 403 会写明发出去的措辞来自哪个 OpenCode 版本。那正是 `check:gate` 在问的那份指纹，所以从它开始查，而不是从请求头开始查。

模型的可用性和限流归 Zen 管，插件拿不到剩余额度可显示。同一个地址反复被拒，也可能被放进一个冷却期，表现得和被拒很像。

## 许可

分叉自 [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free)（MIT）。
