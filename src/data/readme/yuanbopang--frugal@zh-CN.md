<p align="center">
  <img src="assets/logo.png" width="260" alt="frugal — 刚在账单上发现一笔不认识的 $0.30 扣费的大叔" />
</p>

<h1 align="center">frugal</h1>

<p align="center"><b>给 coding agent 的云成本意识。</b></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@yuanbopang/frugal"><img src="https://img.shields.io/npm/v/%40yuanbopang%2Ffrugal?color=cb3837&label=npm" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
  <a href="https://github.com/yuanboP/frugal/actions/workflows/test.yml"><img src="https://github.com/yuanboP/frugal/actions/workflows/test.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/services-22%20groups-blue" alt="22 个服务组" />
  <img src="https://img.shields.io/badge/hosts-11%2B-8A2BE2" alt="11+ 宿主" />
</p>

<p align="center"><a href="README.md">English</a> | 简体中文</p>

---

Agent 部署 Vercel、开 Neon 数据库、跑 E2B 沙箱、一次 push 触发 GitHub Actions——全都按量计费，而不懂技术的用户往往月底看账单才傻眼。frugal 让 agent 花钱前先睁眼：首次触碰给出 free-tier 数字与 hard-pause / fail-open 形态，可选查用量，持久付费资源一句话报备，临时资源用完拆干净——**不拦截命令**。

支持 Claude Code、Codex、GitHub Copilot、Qoder、Gemini CLI、OpenCode、pi、Cursor、Windsurf、Cline、Kiro——一套规则，一个真相来源。

### 为什么要插件，而不是「跟模型说一句注意成本」？

模型自带的是 **训练截止时冻住的计费记忆**：免费额度、默认开关、「这家云怎么算钱」。云厂商的定价和 fail-open 陷阱每个季度都在变（Workflows 按步计费、Spend Management 默认只通知、免费档悬崖），agent 还在用「上一次 train 的历史故事」。

frugal 把配额数字和 tripwire **放在仓库里**——可版本化、可调研、可测试——并在每次会话 / 碰计费 CLI 时注入 agent 的 loop。升级包（或 pull 仓库）后，loop 拿到的是 **现行计费**，而不是权重里还记得的旧 free tier。

## 它如何帮你省钱

两层机制，上下文成本都很低（每会话约 1.7KB 规则 + 每天最多 5 条完整提醒，超出后新服务仍有一行纯数字提示，绝不挡路），并带吵闹度档位：

| 档位 | 注入内容 | 适用 |
|---|---|---|
| **quiet** | 只给 free-tier / 关键额度数字 | 懂行、嫌吵 |
| **normal**（默认） | 数字 + 一个 trap；查用量可选 | 大多数人 |
| **strict** | + 真实账单金额；危险动作要确认 | 非技术 / vibe coding |

- **会话规则**（SessionStart）：首次碰服务一句话说明计费形态、持久付费资源先报备、临时资源必须死、只在可怕消耗时升级提醒用户。
- **按需数据**（PreToolUse）：`vercel` / `wrangler r2` / 带 workflows 的 `git push` 等触发短提醒；事故金额只在 **strict**（以及 skill 全文）出现，普通 deploy 不吓人。

这个 skill 的范围是**正常使用但没留意计费方式导致账单起飞**——用错档位、忘了拆的资源、循环打到了付费额度、没人注意到的配置默认值。不处理密钥泄漏或欺诈,那是安全问题,不是成本意识问题。frugal 内化的 272 条 X 真实事故里几个代表案例，以及现在会先拦住它们的检测点：

| 真实账单 | 发生了什么 | frugal 的拦截 |
|---|---|---|
| **$36,000/月** | Cloudflare 队列自循环（3.13B 次 KV 写入） | `wrangler` → "CF 全线无硬顶——警惕递归" |
| **$104,000** | Netlify 爆红流量账单（改革前） | `netlify` → 讲清 credit 制度与硬暂停 |
| **$46,000** | 爆红流量打到 Vercel，Spend Management 只发了邮件 | `vercel` → Spend Management 默认只通知——要开 auto-pause |
| **$25,672** | GCP 花费冲破 $10 预算（告警滞后 24-48h） | 规则：**告警不是刹车**——要配额硬顶配合 |
| **约 $700/月** | agent push 循环在 macOS runner 上跑全量 CI | 带 workflows 的 `git push` → timeout-minutes + concurrency + macOS 约 10 倍价 |
| **$5,000/月** | 100 用户规模下 Firestore useEffect 读循环 | `firebase` → 按读计费 + maxInstances + 递归检查 |
| **$1,200** | Claude CLI 悄悄切到按 token 计费而非订阅 | 环境有 `ANTHROPIC_API_KEY` 时跑 `claude` → 双轨计费警告 |

## 它做什么

- **会话规则**（SessionStart，按档位裁剪）：计费形态一句话；持久付费资源报备；临时资源当场杀；可怕消耗才打断用户。
- **命令级即时提醒**（PreToolUse）：碰到计费 CLI 注入短提醒——每服务每会话一次，每天最多 5 条完整提醒（超出降为纯数字一行）。`normal` = 形态 + 一个 trap；`quiet` 只有数字；`strict` 才带 $ 故事。查用量命令 normal 起可选。
- **档位**：`/frugal quiet|normal|strict|off`，`/frugal default <level>`，或 `FRUGAL_MODE` / `~/.config/frugal/config.json`。
- **真实数据**：22 组服务配额表仍在 skill 里按需读；272 条 X 事故作研究底座，不再默认塞进每次 deploy。完整表格见 [`skills/frugal/references/`](skills/frugal/references/)。

## 安装

npm 包：[`@yuanbopang/frugal`](https://www.npmjs.com/package/@yuanbopang/frugal)

**Claude Code**：

```
/plugin marketplace add yuanboP/frugal
/plugin install frugal
```

**Codex**：`codex plugin marketplace add yuanboP/frugal && codex plugin add frugal@frugal`

**Copilot CLI**：`copilot plugin marketplace add yuanboP/frugal && copilot plugin install frugal@frugal`

**grok**：`grok plugin install https://github.com/yuanboP/frugal.git --trust`

**Gemini CLI**：`gemini extensions install https://github.com/yuanboP/frugal`

**OpenCode**：`opencode.json` 里加 `{ "plugin": ["@yuanbopang/frugal"] }`

**pi**：`pi install git:github.com/yuanboP/frugal`

**Cursor / Windsurf / Cline / Kiro**：静态规则副本随仓库自动生效；Cursor 用户级安装：把 `.cursor/rules/frugal.mdc` 拷到 `~/.cursor/rules/`。

**Qoder / CodeWhale / Swival**：自动读仓库根的 `AGENTS.md`，零配置。

## 测试

```
npm test
```

MIT
