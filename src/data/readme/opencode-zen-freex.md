<div align="center">

# OpenCode Zen FreeX

为 [magpie](https://github.com/yetone/magpie) 提供 **OpenCode Zen 的免费模型**——共享凭据 `public` 即用，自动发现，原生流式协议

[![CI](https://img.shields.io/github/actions/workflow/status/tkhs101/OpenCode-Zen-FreeX/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/tkhs101/OpenCode-Zen-FreeX/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-zen-freex?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/opencode-zen-freex)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![Runtime: bun](https://img.shields.io/badge/runtime-bun-f472b6?style=flat-square&logo=bun&logoColor=white)](https://bun.sh)

</div>

## 为什么有这个分支

 [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free) 是这个插件的前身。先说清楚：上游一直在维护，修 Bug 也很快。问题在于它对**免费模型支持**这件事，始终缺少一个**稳定、明确的态度**

免费模型失效时，用户反馈issue，得到的答复却是**将不再支持**；过一段时间，相关问题又被悄悄修复，免费模型重新恢复可用。支持、放弃、再支持——用户只能跟着上游的态度**反复折腾**，却始终无法确定这份支持究竟能持续多久

既然有人依赖它，就值得一个明确的答案，而不是**反复摇摆**，这就是本项目诞生的原因
| UTC | 提交 | 上游说了什么 |
| --- | --- | --- |
| 2026-10-13 23:53 | [`643ef50`](https://github.com/magpie-community/plugins/commit/643ef5018e63be78c4aa7554696831d4220ac9c9) | README 加上说明：免费层「只在 OpenCode 本体里能用」，`this plugin doesn't work around that`，请改用 Zen 付费 key 或 OpenCode Go；提交说明里写着 `No version bump … The code on main is left as it is` |
| 2026-10-14 10:57 | [`a810ee7`](https://github.com/magpie-community/plugins/commit/a810ee7e882012ab106e2deb742176cd43db781a) | 0.1.6 把那段说明**删掉**，改为发 OpenCode 1.19.0 原样的请求头——距加上去 11 小时 |
| 2026-10-14 17:59 | [`5fc0a75`](https://github.com/magpie-community/plugins/commit/5fc0a75292f0e5c0c10cf65a188bff5545d6b8e9) | 0.1.7：`free models answer again` |

上游的后续更新会按需合并，同时保留自己的取舍（比如工具措辞按代从真实 OpenCode 采集，而不是钉死某一个版本）

## 安装

```sh
magpie plugin add opencode-zen-freex
magpie plugin login opencode-zen-free
```

## 登录

密钥一栏填 `public`，不需要个人 API key——填什么都会被丢掉，插件用的就是这把共享凭据。

个人 key 请加到 magpie 内置的 OpenCode Zen provider：那里收多把 key，能轮换、故障转移。凭据保存在 OpenCode 的 `auth.json` 或 magpie 的 `plugin-auth.json` 里。

## 模型

模型名 = `opencode-zen-free/<模型名>`，例如 `opencode-zen-free/big-pickle`。

- **自动发现**：宿主列举模型时重新获取，但一分钟内（`RELIST_AFTER`）重复列举复用上一次结果——magpie 启动一次、其后每小时，所以它每次列举都落到新的一次读取。一次成功的读取会写进缓存（`~/.cache/opencode-zen-freex/discovery.json`，Windows 在 `%LOCALAPPDATA%` 下；`OPENCODE_ZEN_FREE_DISCOVERY_CACHE` 可改路径，设为空字符串则不读也不写）：启动时用它替换包内的旧 bootstrap 表（旧表里已被路由移除的 id 不会再被展示），实时列表读到了就以实时为准；实时列表读不到时由它顶替，并把它的日期和年龄一并交给宿主。id 带 `-free`、Zen 的列表里有就提供，**不等**目录；不带后缀的 id 则要目录自己说它免费——`cost.input` 与 `cost.output` 都是 0，`big-pickle` 就是这样一条。判为下线：`status`/`lifecycle` 为 `retired`/`disabled`、布尔 `deprecated: true`、`deprecated_at`/`retirement_date` 写了日期（不看到期与否），以及 SystemOne 路由的模型；目录只把 `deprecated` 写成 `status`/`lifecycle`、而 Zen 仍在服务的，照常提供。
- **上限按实测对齐**：目录会少报上下文 / 输出 / `input`，插件按实测与路由自述对齐——例如 `mimo-v2.6-flash-free` 目录 20 万上下文 / 3.2 万输出，厂商自述 1048576 / 131072，但 2026-10-19 实测这条路由约 40.8 万 token 就拒绝，2026-10-20 又服务了 375,142 token，插件改按能过的最大点声明 37.5 万；`glm-5.3-flash-free` 的付费孪生声明 100 万，实测 34.3 万左右被拒，2026-10-20 测到能过的最大点是 323,107 token，改按 32.3 万。路由自己否掉的数量也照认：`deepseek-v4.1-flash-free` 的 100 万上下文是 2026-10-15 测出来的，2026-10-19 起路由改用自己的校验，约 32.7 万 token 以上的提示被 `context_length_exceeded` 拒绝且不报数字，这条覆盖随之改成实测能过的最大点向下取整：32.6 万（326,750 实测 3/3 被拒，326,702 是能过的最大值）；输出不再靠实测：查 models.dev 时先把模型 id 的 `-free` 后缀去掉，用同一网关 `opencode` provider 里的付费孪生 `limit.output`（例如 `deepseek-v4.1-flash-free` 查 `deepseek-v4.1-flash`，得到 384000；不会是 1048576 的上下文数字）；没有付费孪生时按 canonical 的第一方/最常见 output 声明，models.dev 没有描述的 id 才退回目录/旧表。除了这张手测表，插件运行时还会读 `limits-observed.json`（仓库里每小时跑一次的定时测量写出的结果，命令是 `bun limits-watch.mjs --sweep --write`，`--sweep --all` 则把能测的 id 全部重测（单独 `--all` 什么都不测）——目录声明 100 万以上的 id 由 models.dev 回答，不测，也不算“新的”；路径可用 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT` 改，设为空字符串表示不读）：手测表没写过的 id、或目录值已经搬走的轴由它按同一条路由的实测回答，被 bracket 过的墙可以抬高也可以压低声明，路由自己点名的窗口（快照行里的 `named`）按它自己说的那样声明、也能压低声明，没被 bracket 过的只能抬高。目录声明了 `input` 而它低于窗口时，插件把 `input` 抬到窗口值（只抬不降，目录没声明 `input` 就不动这一轴，手测表里点名了 `input` 的以表为准）；这里的窗口可以是手测表、每小时那次定时测量，也可以是运行中路由自己点名的值；magpie 的 `context_window` 取窗口与 `input` 中的较小值，不抬就会把模型显示得比实际能服务的小（`big-pickle` 曾因此显示成 16 万）。快照里的 `unavailable` 只记路由某天明确说过“这个模型没了”的历史，不是停用开关——插件不会因此隐藏、停用或改道模型，一次超时、429 或 5xx 也不会被记成下线；`bun limits-watch.mjs --status` 只读地报告这份快照的新鲜度与这些问题行（`--json` 给脚本读，`--stale-after` 改默认两小时的过期线；退出码 0 正常、2 已读但有问题、1 文件读不到，与只验形状的 `--check` 不同）。从 0.4.0 起，这份快照默认还会从仓库 `main` 上发布的同一份文件读（`https://raw.githubusercontent.com/tkhs101/OpenCode-Zen-FreeX/main/limits-observed.json`，即每小时那次测量合并进 `main` 的结果，所以新数字不用等发版）：启动时先用上次下载的缓存（`~/.cache/opencode-zen-freex/limits-observed.remote.json`，Windows 在 `%LOCALAPPDATA%` 下），之后每小时至多后台请求一次、单次最多 5 秒，失败就继续用缓存或包里那份——任何请求都不会等它；设了 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT`（给路径，或设为空字符串表示不读）就只用你指定的来源、远程随之关闭，把 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT_URL` 设为空字符串也能单独关掉远程。0.3.x 没有这条，要升级到 0.4.0 才有。依据与复测方法见 [`MAINTAINING.md` 的 “Limits Zen under-reports”](MAINTAINING.md#limits-zen-under-reports)。
- **这堵墙插件自己会学**：除了上面那张手测表，插件还会从它本来就要转发的请求里学路由当前执行的墙——服务过的最大请求把下限顶上去，路由自己关于窗口的拒绝里最小的那个把上限压下来（5xx、限流、与长度无关的 400 都不算数），不额外发请求去测；学到的值写进本地状态文件，重启后仍在，所以把声明的窗口用满的模型会被一步步试探得更大（只有真的把声明抬高了的那一次算数，没有抬高就不占下一次的需求、也不启动冷却），而被拒的模型会被自动收回到已经证明能过的尺寸。一个模型最多为这份学习付出四次未被推翻的被拒（路由随后又服务了同一个请求的话，这次被拒连同它占的名额一起退回），之后不再向上试探。学到的值要等宿主下次重建模型列表（启动、其后每小时、或显式刷新）才生效；状态文件位置、调参变量与调试输出见下面的排查表。
- **目录读不到 ≠ fallback**：Zen 的列表读到了它就是当前该提供的——目录或文档读不到，只影响它们各自描述的那部分。沿用上一次结果只有两种情形：**列表本身**读不到，或距上次读取不到一分钟（见上一条）。
- 请求一个不再免费的模型 → 404，并列出当时免费的模型；刚转免费的模型会在重新获取列表后照常服务。可用性与限流归 Zen 管，插件看不到剩余额度。

## 免费层不再应答时

插件给出的 403 会写明措辞来自哪个 OpenCode 版本，先从它查起（下面三条都是**从仓库副本里**跑的检查——`check:gate` 与 `capture` 不在发布包里，装好的用户那里没有这两个脚本，在装好的包里跑会得到一句“这要在仓库副本里跑”的话，而不是 `Module not found`）：

```sh
bun run check:gate          # 问 Zen 还认哪代指纹；只要有一代 floor 被应答，退出码为 0
bun run capture -- --dry    # floor 全被拒时：取新采集并报告差异，不写入
bun run capture             # 确认差异后才写入
```

闸门并不稳定：结论只代表此刻，信之前再跑一遍；同一地址反复被拒后还可能进冷却期。逐代结论、失败判读与排查细节见 [`MAINTAINING.md` 的 “The loop”](MAINTAINING.md#the-loop) 与 [“Reading a failure”](MAINTAINING.md#reading-a-failure)。

## 请求

发往 `https://opencode.ai/inference/v1`，按每个模型原生协议走（Chat Completions / Responses / Anthropic Messages），流式与普通 JSON 都支持。

- **对不上的名字照样交给宿主**：Zen 调 OpenCode 工具名时，按大小写，或按大小写加分隔符 `_`/`-`/`.`/空白对上唯一匹配的宿主工具（`bash`↔`Bash`、`todowrite`↔`todo_write`）；对不上或有歧义时**不猜也不丢**，按模型写的名字、原样的 id 与参数送达宿主，由宿主回它自己的"没有这个工具"，模型据此改名重来。只有**没有名字**的调用会被略去，并在正文说明。工具仍在宿主执行；Chat 形状的调用一律带非空 id，Responses / Messages 上模型自带什么 id 就原样转交，模型没自带就补一个（Responses 补 `call_id`、Messages 补 block 的 id；item 自己的 id 不补，因为流路径上它可能是上游后来才给的，给了就变成一个调用两个 id），免费层目前不在这两条路由上提供模型。
- **只借 OpenCode 的样子**：请求头、User-Agent、工具必须同属一代（`bash`/`glob`/`grep`/`read` 是 1.x，`shell`/`read` 是 2.x）；宿主缺的 `required` 工具由插件补发描述（背后没有实现，描述里注明别调它），宿主自带的 User-Agent 原样透传。
- **请求头是刻意挑出的最小集合**：`content-type`、`accept`、`user-agent`、`x-opencode-project`、`x-opencode-session(-id)`（同一 id）、`x-opencode-client: cli`、`authorization: Bearer public`（走 Messages 时 `x-api-key: public` + `anthropic-version`；`anthropic-beta` 这个头插件自己从不设置：只在宿主已经发了的时候原样透传）。**不要加别的头**：两个各自无害的组合起来也会被拒——单试一个得不出结论。
- **会话 id**：宿主给了 OpenCode 形状的会话 id 就原样传；给了别的名字就按它派生并记住——会话头 `x-opencode-session`/`x-opencode-session-id`/`x-session-affinity`/`x-session-id`/`session_id`/`conversation-id`/`conversation_id`、body 的 `conversation_id`、`metadata.session_id`，或 Claude Code 的 `metadata.user_id` 里的 `_session_<uuid>`；空字符串一律不算名字。都没有时用 system/instructions 与首条用户消息一起做种子（system 变了就是另一个会话），连首条消息也没有才看 `previous_response_id`，再没有则每次新生成——同一会话各轮共用同一个 id。
- **提前掐断的流**：有内容且无未完成调用 → 按普通回答收尾并注明截断，再问会续；否则请求失败，错误写明回复 id 与已收字节。Messages / Responses 被截断同样失败。
- **错误正文不会冒充完整**：只读一小段找 Zen 自陈的上限；没读完的部分换成说明（保留上游状态码，已读开头放 `upstream` 字段）。

## 排查

| 看到的现象 | 这是什么 | 怎么办 |
| --- | --- | --- |
| 每个请求都是 `403 FreeTierError`，正文没有 IP 封禁文案 | `fingerprint.json` 里的措辞过期了 | 在仓库副本里跑 `bun run check:gate`；全被拒时跑 `bun run capture`（这两个脚本不在发布包里，见上一节）。档缺失或坏掉时 `bun run capture` 会把它重写一份，而不是拒绝——所以补救命令自己跑得起来 |
| `403` 正文提到 `abusive traffic` / `abuse of traffic` / `free models aren't available … from your current network` | Zen 免费层封的是当前出口 IP——与请求措辞、指纹都无关，同一个 IP 上怎么改怎么重试都不会成功 | 换网络或 VPN 出口，或等封禁解除再试；插件不加本地冷却、不做出口轮换，也不会因此停用任何模型 |
| `426 Upgrade Required` | 这个包自称的 OpenCode 版本比 Zen 要的旧 | 升级插件，或者在更新的 OpenCode 里运行 |
| `404 … not available as an OpenCode Zen free model now` | Zen 不再免费开放这个模型 | 从错误信息列出的模型里换一个 |
| `Model is not an available free model for this protocol` | 请求发来时列表变了 | 让宿主刷新模型列表再试 |
| `uses the public credential` | 存的密钥不是 `public` | 用 `public` 重新登录 |
| 不带 `FreeTierError` 的 403 | 是别的 403：正文原样透传，只去掉描述旧字节的长度、编码与校验头 | 按 Zen 自己的错误来读，别当成这个插件的 |
| `400 … context_length_exceeded`，或 `Invalid max_tokens value, the valid range of max_tokens is [1, 393216]` | 路由按模型自己的上限校验请求：提示超出该模型当时执行的上下文，或 `max_tokens` 超出它的范围 | 让宿主压缩对话、把 `max_tokens` 调回范围内；这类拒绝不报窗口数字，别用插件的“模型多大”去推 |
| 窗口看着偏小、想让它重新学，或新设的 `OPENCODE_ZEN_FREE_*` 变量没生效 | 学到的墙存在本地状态文件里（Windows 是 `%LOCALAPPDATA%\opencode-zen-freex\limits.json`，其他平台是 `$XDG_CACHE_HOME`，都没有就 `~/.cache`）；学到的值要等宿主下次重建模型列表才生效，环境变量则只在宿主进程启动时读一次 | 删掉这个文件就能从头学；把 `OPENCODE_ZEN_FREE_LIMITS_STATE` 设为空字符串则只在内存里学、不落盘；`OPENCODE_ZEN_FREE_LIMITS_DEBUG=1` 会把每次抬高、每次被拒（含路由自报的窗口）以及每次被路由随后服务所推翻的被拒打到 stderr；改完环境变量要重启宿主 |
| 模型被问错了协议（Responses 的模型被问成 Chat） | 协议文档的表没读出来：表里没有这一插件会问的端点（`/v1/chat/completions`、`/v1/responses`、`/v1/messages`、`/v1/systemone`）时，每个模型都留在快照自己的协议上 | 设 `OPENCODE_ZEN_FREE_MODELS_DEBUG=1`，它会打印是哪一份文档、有几行、为什么没读出来；文档表改了列不要紧，解析是按端点格定位而不是按列号 |
| 想知道每小时那份快照是否新鲜、某个模型是不是被路由下线 | 快照的新鲜度、每行的年龄与 `unavailable`（路由明确说过模型没了的那天，只是历史，不是停用开关）都记录在文件里 | 在仓库副本里跑 `bun limits-watch.mjs --status`（`--json` 给脚本读，`--stale-after` 改默认两小时的过期线）；退出码 0 正常、2 已读但有问题、1 文件读不到 |
| 窗口数字一直停在发版时的旧值，或 `raw.githubusercontent.com` 连不上 | 远程快照只是优化：每进程每小时至多一次后台请求，读不到就退回上次缓存或包里那份，不会让请求变慢或失败 | 想换镜像就设 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT_URL`（空字符串关掉远程）；想固定用某份文件就设 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT`；缓存位置用 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT_CACHE`（空字符串不落盘）；刷新间隔与超时用 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT_REFRESH_MS` 与 `OPENCODE_ZEN_FREE_LIMITS_SNAPSHOT_TIMEOUT_MS` |

## 鸣谢

| 类别 | 项目 |
| --- | --- |
| 本插件前身 | [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free) |
| 插件载体 | [magpie](https://github.com/yetone/magpie) |
| 模型提供者 | [anomalyco/opencode](https://github.com/anomalyco/opencode) |
| 本仓库常用 Agent | [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) · [hermes-agent](https://github.com/NousResearch/hermes-agent) |
| 灵感来源 | [9router](https://github.com/decolua/9router) · [opencode2api](https://github.com/jasonxu114514/opencode2api) · [zen-gate](https://github.com/LAGcomcom/zen-gate) |

## 许可

MIT，分叉自 [zen-free](https://github.com/magpie-community/plugins/tree/main/packages/zen-free)，`LICENSE` 正文原样未改（版权行：上游原作者 `xiaozhou26` 与本分支 `OpenCode-Zen-FreeX contributors` 各一条）。来源与维护缘由见 [NOTICE](NOTICE)。
