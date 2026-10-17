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

- **自动发现**：宿主每次列举模型时重新获取（magpie：启动一次，其后每小时）。id 带 `-free`、Zen 的列表里就有就提供，**不等**目录；下线（`retired`/`disabled`/退役日期已生效）与 SystemOne 排除，标 `deprecated` 但 Zen 仍在服务的照常提供。
- **上限按实测对齐**：目录会少报上下文 / 输出 / `input`，插件按实测与路由自述对齐——例如 `deepseek-v4.1-flash-free` 目录 20 万上下文 / 3.2 万输出，付费同源是 100 万 / 38.4 万。依据与复测方法见 [`MAINTAINING.md` 的 “Limits Zen under-reports”](MAINTAINING.md#limits-zen-under-reports)。
- **目录读不到 ≠ fallback**：Zen 的列表读到了它就是当前该提供的；只有**列表本身**读不到才沿用上一次结果。
- 请求一个不再免费的模型 → 404，并列出当时免费的模型；刚转免费的模型会在重新获取列表后照常服务。可用性与限流归 Zen 管，插件看不到剩余额度。

## 免费层不再应答时

插件给出的 403 会写明措辞来自哪个 OpenCode 版本，先从它查起：

```sh
bun run check:gate          # 问 Zen 还认哪代指纹；只要有一代 floor 被应答，退出码为 0
bun run capture -- --dry    # floor 全被拒时：取新采集并报告差异，不写入
bun run capture             # 确认差异后才写入
```

闸门并不稳定：结论只代表此刻，信之前再跑一遍；同一地址反复被拒后还可能进冷却期。逐代结论、失败判读与排查细节见 [`MAINTAINING.md` 的 “The loop”](MAINTAINING.md#the-loop) 与 [“Reading a failure”](MAINTAINING.md#reading-a-failure)。

## 请求

发往 `https://opencode.ai/inference/v1`，按每个模型原生协议走（Chat Completions / Responses / Anthropic Messages），流式与普通 JSON 都支持。

- **宿主的工具不会被丢**：Zen 调 OpenCode 工具名时，按大小写与 `_`/`-` 对上唯一匹配的宿主工具（`bash`↔`Bash`、`todowrite`↔`todo_write`）；对不上就略去并在正文说明。工具仍在宿主执行，调用一律带非空 id。
- **只借 OpenCode 的样子**：请求头、User-Agent、工具必须同属一代（`bash`/`glob`/`grep`/`read` 是 1.x，`shell`/`read` 是 2.x）；宿主缺的 `required` 工具由插件补发描述（背后没有实现，正文注明），宿主自带的 User-Agent 原样透传。
- **请求头是刻意挑出的最小集合**：`content-type`、`accept`、`user-agent`、`x-opencode-project`、`x-opencode-session(-id)`（同一 id）、`x-opencode-client: cli`、`authorization: Bearer public`（走 Messages 时 `x-api-key: public` + `anthropic-version`；`anthropic-beta` 只在宿主设了才发）。**不要加别的头**：两个各自无害的组合起来也会被拒——单试一个得不出结论。
- **会话 id** 按会话首条消息生成并记住，同一会话各轮共用；宿主的 id 形状合法就原样传。
- **提前掐断的流**：有内容且无未完成调用 → 按普通回答收尾并注明截断，再问会续；否则请求失败，错误写明回复 id 与已收字节。Messages / Responses 被截断同样失败。
- **错误正文不会冒充完整**：只读一小段找 Zen 自陈的上限；没读完的部分换成说明（保留上游状态码，已读开头放 `upstream` 字段）。

## 排查

| 看到的现象 | 这是什么 | 怎么办 |
| --- | --- | --- |
| 每个请求都是 `403 FreeTierError` | `fingerprint.json` 里的措辞过期了 | 跑 `bun run check:gate`；全被拒时跑 `bun run capture` |
| `426 Upgrade Required` | 这个包自称的 OpenCode 版本比 Zen 要的旧 | 升级插件，或者在更新的 OpenCode 里运行 |
| `404 … not available as an OpenCode Zen free model now` | Zen 不再免费开放这个模型 | 从错误信息列出的模型里换一个 |
| `Model is not an available free model for this protocol` | 请求发来时列表变了 | 让宿主刷新模型列表再试 |
| `uses the public credential` | 存的密钥不是 `public` | 用 `public` 重新登录 |
| 不带 `FreeTierError` 的 403 | 是别的 403：正文原样透传，只去掉描述旧字节的长度、编码与校验头 | 按 Zen 自己的错误来读，别当成这个插件的 |

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
