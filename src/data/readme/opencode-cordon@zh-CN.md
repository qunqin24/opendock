<div align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/banner.svg" alt="opencode-cordon — 给 OpenCode 2 的权限警戒线" width="100%" />

  <h3>给 OpenCode 2 的权限警戒线：声明式策略 + 可审计的决策日志。</h3>

  <p>
    规则写在仓库里，判定发生在 <code>permission.evaluate</code>，<br/>
    每一次决定都脱敏落盘，一条命令变成可分享的 HTML 审计报告。
  </p>

  <p>
    <a href="https://www.npmjs.com/package/opencode-cordon"><img src="https://img.shields.io/npm/v/opencode-cordon.svg" alt="npm version" /></a>
    <a href="https://github.com/wangyuchen5110/opencode-cordon/actions/workflows/ci.yml"><img src="https://github.com/wangyuchen5110/opencode-cordon/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A5%2020-1f2937" alt="node >= 20" /></a>
    <a href="https://opencode.ai"><img src="https://img.shields.io/badge/OpenCode-2.2.x-1f2937" alt="OpenCode 2.2.x" /></a>
    <a href="REGRESSION.md"><img src="https://img.shields.io/badge/verified-2.2.5-3fb950" alt="verified on 2.2.5" /></a>
  </p>
</div>

---

**一段话说清问题。** OpenCode 的 agent 会自己读文件、跑 shell、改代码、推分支。原生权限是一个全局粗开关：不能按仓库 review，一次会话结束后也查不到“当时是哪条规则放行的”。某次 `.env` 被读走、某次 `rm -rf` 执行成功，事后没人说得清为什么。

**它补上的东西。** 一份进 git 的策略文件（`opencode-cordon`），在插件钩子上强制执行，并写进 append-only 日志。设计上**只能收紧、不能放宽**：`deny` 永远赢，`ask` 只把 `allow` 升级，没命中规则就完全不碰 OpenCode 自己的判定。配错了最坏是“太严”，不会“静默开门”。

```console
$ cordon evaluate --action shell --command "rm -rf /tmp/x"
deny  rule preset:destructive — irreversible shell command

$ cordon audit --log .opencode/cordon/audit.jsonl --html report.html
cordon audit …  decisions 7  deny 2 · ask 0 · pass 5  …  html report.html
```

## 真机效果

下面这张图是 OpenCode 2.2.5 真机会话生成的审计报告（细节见 [`REGRESSION.md`](REGRESSION.md)）：

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/audit-report.png" alt="opencode-cordon HTML 审计报告：25 条事件，2 次拒绝" width="92%" />
</p>

那一轮里，agent 被要求读 `.env` 并执行 `rm -rf ./scratch`，同时开着 `--auto`（原生对 `rm` 是 allow，对 `.env` 是自动放行的 ask）：

| 尝试 | 原生 | cordon | 结果 |
| --- | --- | --- | --- |
| `read .env` | `ask` | **`deny`** | `permission.rejected — regression: env files are off limits` |
| `shell: rm -rf ./scratch` | `allow` | **`deny`** | `Unable to execute command`，`scratch/keep.txt` 原样保留 |

两次判定都带着规则 id 和原因写进了 JSONL。这就是重点：**agent 被拦住了，而且你能证明是谁拦的。**

## 它怎么工作

<p align="center">
  <img src="https://raw.githubusercontent.com/wangyuchen5110/opencode-cordon/main/docs/assets/architecture.svg" alt="agent 工具调用 → permission.evaluate → cordon 策略判定 → deny/ask 或保持原生 → JSONL 审计 → HTML 报告" width="100%" />
</p>

插件是 OpenCode 2 的 server part，注册四个钩子：

- `permission.evaluate` — 在动作发生前求值策略，必要时收紧 effect；
- `tool.execute.before` / `tool.execute.after` — 记录每次工具调用和结果；
- `shell.create.before` — 记录每条被创建的命令。

### 最关键的一条规则：只收紧，不放宽

| 原生 `effect` | cordon `deny` | cordon `ask` | cordon `allow` / 无命中 |
| --- | --- | --- | --- |
| `allow` | **deny** | **ask** | allow（不碰） |
| `ask` | **deny** | ask（不碰） | ask（不碰） |
| `deny` | deny（不碰） | deny（不碰） | deny（不碰） |

用户规则里的 `effect: "allow"` 不会放宽任何东西——它的作用是**豁免**后续 cordon 规则，让这条调用直接走原生判定。这是从 preset 里开例外口子的唯一推荐方式。

## 安装

插件侧需要 **OpenCode 2.2.x**；CLI 需要 **Node ≥ 20**（ESM，零运行时依赖）。

```bash
# 装插件（OpenCode 下次启动时加载）
opencode plugin add opencode-cordon

# 装 CLI（可选，npx 也行）
npm install -g opencode-cordon    # 简写：cordon
```

CLI 可以独立使用：策略校验和审计报告不需要运行中的 OpenCode。

## 5 分钟快速开始

```bash
# 1. 给当前项目生成策略
npx opencode-cordon init
# → .opencode/cordon.jsonc（默认 balanced preset）

# 2. 校验：0 = 通过，2 = 无效
npx opencode-cordon check

# 3. 试几条判定，看退出码
npx opencode-cordon evaluate --action shell --command "rm -rf ./build"        # 20 = deny
npx opencode-cordon evaluate --action shell --command "git push origin main"  # 10 = ask
npx opencode-cordon evaluate --action read  --path "/repo/README.md"          #  0 = pass

# 4. 生成审计报告
npx opencode-cordon audit --log .opencode/cordon/audit.jsonl --html audit.html --open
```

## 策略文件

两个位置，同一种格式：

| 位置 | 用途 |
| --- | --- |
| `.opencode/cordon.jsonc` | 项目策略，跟仓库走、进 code review |
| `~/.config/opencode/cordon.jsonc` | 全局策略，跨项目复用 |

```jsonc
{
  "version": 1,
  "preset": "balanced",            // balanced（默认）| strict | relaxed
  "audit": {
    "enabled": true,
    "path": ".opencode/cordon/audit.jsonl",
    "redact": true,
    "storeCommand": true,
    "commandHash": false           // true = 命令只存 sha256，不存明文
  },
  "rules": [
    {
      "id": "no-destructive",
      "effect": "deny",            // deny | ask | allow
      "match": { "action": "shell", "command": "rm -rf *" },
      "reason": "destructive shell command"
    },
    {
      "id": "protect-env",
      "effect": "deny",
      "match": { "action": "read|edit", "path": ["**/.env*", "**/.ssh/**"] },
      "reason": "secrets never enter the context"
    },
    {
      "id": "exempt-fixtures",
      "effect": "allow",
      "match": { "action": "read", "path": "test/fixtures/**" },
      "reason": "tests may read fixtures"
    }
  ]
}
```

### 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | number | 目前固定 `1` |
| `preset` | string | `balanced`（默认）/ `strict` / `relaxed` |
| `audit.enabled` | boolean | 是否写 JSONL（默认 `true`） |
| `audit.path` | string | 默认 `.opencode/cordon/audit.jsonl` |
| `audit.redact` | boolean | 落盘前脱敏（默认 `true`） |
| `audit.storeCommand` | boolean | 存脱敏后的命令文本（默认 `true`） |
| `audit.commandHash` | boolean | 只存命令的 SHA-256（默认 `false`） |
| `rules` | array | 用户规则，先于 preset 求值 |

策略里没写 `preset` 时按 `balanced` 求值；**完全没有策略文件时插件保持空闲**——只打一行日志，不猜规则。

### 匹配

`match` 支持五个字段；写了几个就都要匹配（AND），数组值是 OR：

| 字段 | 匹配对象 | 是否路径模式 |
| --- | --- | --- |
| `action` | 权限动作（`shell`、`read`、`edit`…） | 否 |
| `tool` | 工具名（缺省回落到 `action`） | 否 |
| `command` | 请求里的 shell 命令 | 否（`*` 可跨空格） |
| `path` | 请求涉及的文件路径 | 是（`*` 不跨目录） |
| `agent` | agent id | 否 |

Glob：`*`（路径模式下不跨 `/`）、`**`（跨目录，`**/` 可匹配零层目录）、`?`（单字符）、`{a,b}`（或）、`a|b`（action/tool/agent 的或）。大小写不敏感。

求值顺序：**用户规则按声明顺序，然后 preset 规则；首个命中生效。** 没命中就不碰原生判定。

命令规则还会再对 `bash -c`、`sh -c`、`powershell -Command`、`cmd /c` 里面的文本匹配一次，包括 `/bin/bash` 这种带路径的写法。原始命令仍然会测，包装层只会多一次命中机会。管道保持整句匹配，`curl * | *sh*` 对得上完整字符串。`git -C repo push --force` 仍然对不上 force-push 规则，因为 cordon 不会重排 git 的全局参数。

### Preset

| Preset | 额外内容 |
| --- | --- |
| `relaxed` | 拦密钥路径 + 不可逆 shell；对外网命令问一句 |
| `balanced` | `relaxed` + 对 `git push`、发布命令、web fetch 问一句 |
| `strict` | `balanced` + 每条 shell 命令、每次编辑都问 |

`cordon check` 会打印当前有多少条用户规则和 preset 规则生效。

## CLI

| 命令 | 作用 | 退出码 |
| --- | --- | --- |
| `check [--policy f] [--json]` | 校验策略、打印生效规则 | 0 通过，2 无效 |
| `evaluate --action a [--command c] [--path p] [--tool t] [--agent id]` | 判定单条调用 | 0 pass，10 ask，20 deny |
| `audit --log f [--html out] [--open] [--json]` | 汇总日志、检查哈希链、生成 HTML | 0 成功，4 日志缺失，5 链断裂 |
| `init [--preset p] [--out f] [--force]` | 生成起始策略 | 0 成功，1 已存在/用法错误 |
| `redact [file]` | 从文件或 stdin 脱敏 | 0 |

## 审计日志与报告

JSONL 每行一个事件（`decision` / `tool` / `shell`）：

```json
{"v":1,"ts":"2026-11-03T03:57:37.927Z","event":"decision","sessionID":"ses_…","agent":"build","action":"shell","decision":"deny","nativeEffect":"allow","effect":"deny","rule":"deny-rm","reason":"regression: no destructive rm","command":"rm -rf ./scratch","commandHash":"dfc8ec3b…"}
```

字段：`ts`、`event`、`sessionID`、`agent`、`action`、`tool`、`decision`（deny/ask/allow/pass）、`nativeEffect`、`effect`、`rule`、`reason`、`paths`、`command`（已脱敏）、`commandHash`、`redactions`、`prev`、`hash`，以及工具事件的 `status` / `durationMs`。`prev` 和 `hash` 从 0.1.5 起写入。

`cordon audit --html report.html` 会生成带摘要卡（含哈希链）、规则排行、可筛选时间线的单文件报告。敏感值在落盘前脱敏，命令始终带稳定哈希，方便在不保留明文的前提下对账。同一个进程顺序追加这条链。没有哈希的旧日志仍然按成功汇总。

## 已验证

| 项 | 结果 |
| --- | --- |
| 真机回归 | **OpenCode 2.2.5 通过**（2026-11-03）：`--auto` 下 `.env` 读取被 `ask → deny`、`rm -rf ./scratch` 被 `allow → deny`，两次都落盘，目标文件保留 —— [`REGRESSION.md`](REGRESSION.md) |
| 单元 + 适配层测试 | **61 个全部通过**（`node --test test/guard.test.mjs test/plugin.test.mjs`），其中一套用真实 `@opencode/plugin` 钩子 + 假 context 驱动插件 |
| 打包 | 已发布 [`opencode-cordon`](https://www.npmjs.com/package/opencode-cordon)，`npx opencode-cordon --version` 可用 |
| CI | Node 20/22/24 × Ubuntu/Windows |

## 它不是什么

- **不是沙箱。** 不做进程、文件系统、网络隔离；它只看 OpenCode 的 permission 决策和工具/命令事件，你在终端里绕过 OpenCode 跑的东西不在范围内。
- **不是原生 permission 的替代。** 只收紧、不放宽；想放宽只能改 OpenCode 自己的 permission 配置。
- **不是 secrets manager / DLP 产品。** `redact` 是基于规则的最佳努力；最稳的做法仍然是用规则把密钥路径挡在上下文之外。
- **不是密码学防篡改。** 新记录带 `prev` 和 `hash`，`cordon audit` 能发现被改过、删过或调换过的一行（退出码 5）。能整文件重写的人也可以重算这条链。要更强保证，就把 JSONL 送到外部只追加的存储。
- **不是 V1 兼容层。** 1.18.x 没有对应的 permission 钩子。
- **不是把判定交给 LLM 的插件。** 判定是本地、确定性的规则：不花 token、不引入网络调用。

完整的威胁模型和漏洞报告流程见 [SECURITY.md](../SECURITY.md)。

## 路线图

- [x] OpenCode 2.2.5 真机回归 + 钩子 payload 样例
- [ ] `session.panel` TUI 面板：实时显示“现在正在拦什么”
- [ ] `cordon check --explain`：解释为什么命中、改哪条会怎样
- [x] 审计哈希链，由 `cordon audit` 检查（链断裂时退出码 5）
- [ ] GitHub Action：PR 删掉危险规则时失败
- [ ] 社区策略模板

## 调研

项目起源于对 OpenCode 生态的调研，原始报告已提交：

- [`research/scout-tooling.md`](research/scout-tooling.md) — 工具链、安全、DB 运维、迁移
- [`research/scout-visual.md`](research/scout-visual.md) — TUI/视觉插件与空白
- [`WHY.md`](WHY.md) — 为什么是“策略 + 审计”，以及 cordon 不是什么

## 贡献

欢迎 issue 和 PR。提交前跑 `npm ci && node --test test/guard.test.mjs test/plugin.test.mjs`；请保持零运行时依赖（只用 `node:` 内置模块），新增规则匹配或脱敏模式时补测试。

## License

[MIT](../LICENSE) © 2026 wangyuchen5110

[English](../README.md) · **简体中文**
