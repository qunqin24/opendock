# opencode-autoguard

Language: **中文** · [English](./README_en.md)

一个实验性的 OpenCode 权限审核插件：监听待审批权限，先运行本地拒绝规则，再交给 OpenAI-compatible LLM judge，最后通过 OpenCode 的权限 reply API 自动回复。

![OpenCode AutoGuard 封面](docs/assets/cover.png)

> 当前状态：核心逻辑和真实 HTTP reply 链路已验证，但 OpenCode 不同运行模式的事件桥接与 pending store 仍有宿主侧差异。它不是安全边界，也不应在无人值守的生产环境中直接使用。

版本历史见 [CHANGELOG.md](CHANGELOG.md)。

## 评测基线

项目用 562 例标注数据集回归权限审核链路。2026-08-31 基线结果：

- 本地规则层：0 漏拦、0 误拦，并作为 `npm run check` 的加载期回归门禁。
- judge 层：以 deepseek-chat 评测时，危险放行 0、注入攻击成功率 0、隐私泄漏 0。

完整数据集与 judge 层评测见 [eval/README.md](eval/README.md)。免费档 laguna 有速率限制，高频场景建议使用付费模型或本地 judge。

## 快速开始

> **重要：`auto: []` 不代表插件完全不工作。** 它只表示不自动接管任何权限 action。只要 `contentReview.enabled` 为 `true`（默认值），webfetch 正文仍会送入 judge。若要让插件完全停止审核，需同时设置 `auto: []` 和 `contentReview.enabled: false`。

需要 Node.js 22.14 或更高版本。

### 1. 安装

```sh
npm install opencode-autoguard
```

### 2. 配置 OpenCode（npm 安装，推荐）

在项目的 `opencode.json` 中加载，下面是云端 OpenAI-compatible endpoint 的通用写法；请从服务商当前的模型列表选择模型，并替换 endpoint、模型 ID 与凭据占位符：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "ask",
    "webfetch": "ask"
  },
  "plugin": [
    [
      "opencode-autoguard",
      {
        "auto": ["bash", "webfetch"],
        "defaultReply": "once",
        "judge": {
          "baseURL": "https://api.example.com/v1",
          "model": "<provider-model-id>",
          "apiKey": "<provider-api-key>",
          "timeoutMs": 10000
        }
      }
    ]
  ]
}
```

若使用本地 OpenAI-compatible 服务，仅替换 `judge` 配置，例如：

```json
"judge": {
  "baseURL": "http://127.0.0.1:8000/v1",
  "model": "<local-model-id>",
  "apiKey": "<local-endpoint-key>",
  "timeoutMs": 10000
}
```

模型 ID 必须以所接 endpoint 当前实际提供的名称为准；不要依赖 README 中固定的免费模型名称。

### 3. 开发安装（贡献者）

面向完整的 Git checkout：

POSIX / macOS：

```sh
cd /path/to/autoguard
npm ci
npm run check
```

Windows PowerShell：

```powershell
Set-Location C:\path\to\autoguard
npm ci
npm run check
```

在 `opencode.json` 中用本地源码绝对路径加载：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": "ask",
    "webfetch": "ask"
  },
  "plugin": [
    [
      "/absolute/path/to/autoguard/index.ts",
      {
        "auto": ["bash", "webfetch"],
        "defaultReply": "once",
        "judge": {
          "baseURL": "https://api.example.com/v1",
          "model": "<provider-model-id>",
          "apiKey": "<provider-api-key>",
          "timeoutMs": 10000
        }
      }
    ]
  ]
}
```

Windows 路径可写成 `C:/absolute/path/to/autoguard/index.ts`。

修改插件或配置后应完全重启 OpenCode。`permission: "ask"` 决定 OpenCode 是否产生待审批请求；`auto` 决定 AutoGuard 是否接管该 action。权限自动审核需要两者同时满足。

## 行为与安全约束

权限请求按 **Tier C → Tier A → Tier B** 三级分流：先拦住明确危险项（C），再秒放明确安全项（A），最后把其余不确定请求交给模型（B）。这个顺序确保凭据与高危规则先于白名单生效，同时只为不确定请求调用网络 judge。

<p align="center">
  <img src="docs/assets/autoguard-workflow.png" alt="AutoGuard permission review workflow: event validation, fail-closed safety review, and permission reply" width="100%">
</p>

该图用于概览主流程；精确的失败分支与竞态行为以以下约束和测试为准。插件不替用户处理的 pending permission 会继续保留给人工审批。

1. 只自动处理 `auto` 明确列出的 action；默认 `auto: []`，因此不会自动接管权限请求，但独立的 webfetch 内容审核仍按 `contentReview.enabled` 工作。
2. **Tier C（本地规则，瞬时）**：常见密钥文件（含 `cat .env` 这类命令内嵌路径）和高置信度危险 shell 命令直接命中本地拒绝规则；默认**保留人工审批**（`denyAction: "ask"`），配置为 `"reject"` 时自动拒绝（适合无人值守 serve）。
3. **Tier A（本地秒过，瞬时，0 网络）**：命中 `fastAllow` 白名单的常规只读/构建命令；或 edit/write 的目标文件全部是本会话 agent 自己写入过的产物（artifact ledger，来自 `session.diff` 与 `message.part.updated` 事件）。凭据文件检查先于本层，白名单无法绕过。
4. **Tier B（LLM judge）**：其余请求经本地脱敏、长度限制后发送给 judge，并附带会话上下文摘要（最近工具调用与 agent 写入过的文件路径，默认开启，`context.enabled` 可关）。judge 只允许返回严格的 `{"verdict":"allow|reject|ask","reason":"..."}` JSON：`ask` 或任何解析失败、超时、HTTP 错误都保留人工审批。超长资源按条目截断并打 `[truncated]` 标记（仿 codex guardian），只有截断后仍超预算才交回人工。
5. **拒绝熔断（仿 codex circuit breaker）**：同一会话 judge 连续拒绝 3 次、或最近 50 次判定中拒绝 10 次，即视为 agent 在反复试探——本会话后续 Tier B 请求不再调用 judge、不再自动放行，一律保留人工审批；任意人工回复即重置（`circuit` 可配阈值或关闭）。
6. **人工推翻回灌（GOLDEN）**：judge 判定过的请求若被人工在插件之外回复，会记录 `GOLDEN` 日志作为数据集金标签；其中“judge 拒绝但人工放行”的动作会进入后续 judge 的上下文（仿 codex developer 前缀），避免同一动作被反复拒绝。
7. **webfetch 内容级审核（纵深防御）**：抓取完成、正文进入模型上下文之前（`tool.execute.after`），正文经本地脱敏与截断（默认 8000 字符）交给 judge 判定是否含面向 AI 助理的注入、劫持或恶意诱导；`reject` 时原文被替换为拦截通知（canary 实测替换有效）。这一层失败时**保留原文并留痕**：权限层的 URL 审核是 fail-closed，内容层是 fail-open 的附加防线；不接受正文外发请设 `contentReview.enabled: false`。
8. reply 使用宿主公开 HTTP listener，支持 Basic Auth，并检查非 2xx 响应；失败时不会伪装成审批成功。
9. 同一请求会去重，最多并行审核 4 个；judge 判定按 `action+resources` 缓存（默认 10 分钟）；用户先手动回复时会取消仍在运行的 judge。
10. **结构化审计日志（默认关）**：`auditLog.enabled: true` 后，每次判定（含 Tier A/C、缓存、熔断留人工、judge 失败）、每次内容审核、每个人工回复都追加一行 JSON 到本地 `~/.opencode-autoguard/audit-YYYY-MM-DD.jsonl`（`verdict` × `source` 分类，仿 codex 日期分区与 claude code decision/source taxonomy）。人工推翻 judge 的行带 `override: true`，这个文件就是金标签数据集的原料。内容审核行只带 URL 与字符数，**永不落正文**；默认保留 14 天、单日 16 MB 上限；写盘失败绝不影响审批。

本地规则只是保守的快速拦截，不是 shell/PowerShell 解析器；bash 命令内的路径不做语义解析（例如 agent 用 bash 创建的临时文件不会进 ledger，但会出现在 `session.diff` 事件里）。**受保护路径**（仿 codex 可写根保护子路径，`protectPaths`）：edit/write 类操作的目标若命中提权载体——`.git/hooks/`、shell 启动文件（`.bashrc`/`.zprofile` 等）、`.gitconfig`、`authorized_keys`、`sudoers`/systemd/launchd、agent 自身配置（`opencode.json(c)`、`.opencode/`）——直接按 Tier C 留人工；bash 读取这类路径不拦截，但 judge 提示词会按高危处理。LLM 也可能误判或被提示注入影响，因此最终安全性仍取决于 OpenCode 自身权限配置和人工监督。设计细节与决策记录见 [docs/design/redesign-v0.3.md](docs/design/redesign-v0.3.md) 与 [docs/design/codex-iteration.md](docs/design/codex-iteration.md)。

## 数据边界

启用某个 action 后，它的 `action`、`resources`，以及 `defaultReply: "always"` 时的 `save` 范围会发送给配置的 judge。命令、路径和 URL 可能包含私有信息。上下文感知开启时（默认），还会发送最近工具调用的单行摘要（≤8 条）、本会话 agent 写入过的文件路径（≤20 条），以及“judge 拒绝但被人工放行”的动作摘要（≤5 条）——这些同样在本地脱敏后才外发；不接受该边界请设置 `context.enabled: false`。

**webfetch 正文同样会外发**：内容审核开启时（默认），每次 webfetch 抓取到的正文会在本地脱敏并截断（默认 ≤8000 字符）后发送给 judge，用于判定面向 AI 的注入；URL 与长度会出现在日志中，正文不会。敏感环境请设 `contentReview.enabled: false`。

插件会在本地拦截常见凭据文件，并脱敏常见 token、Authorization header、URL 密码和私钥形态，但无法保证识别所有秘密。敏感仓库建议使用本地 judge endpoint，或只启用非常窄的 `auto` 白名单。

**审计日志是本机文件**：开启 `auditLog` 后，脱敏后的 `action`/`resources`（单条 ≤600 字符截断）与判定结果会写入 `auditLog.dir`（默认 `~/.opencode-autoguard/`）下的本地 JSONL，不外发、不落 webfetch 正文；仍建议按“可能含私有信息”对待该目录并按 `keepDays` 定期清理。默认关闭。

## 配置

| 配置 | 默认值 | 说明 |
| --- | --- | --- |
| `auto` | `[]` | 自动审核 action 白名单；`["*"]` 风险较高 |
| `defaultReply` | `"once"` | judge 允许时回复 `once` 或 `always` |
| `fastAllow` | 内置白名单 | Tier A 秒过清单；token 边界前缀匹配、大小写敏感，空数组禁用 |
| `denyAction` | `"ask"` | 本地规则命中后留人工；无人值守 serve 可设 `"reject"` |
| `context.enabled` | `true` | 会话上下文感知（ledger + judge digest）开关 |
| `context.recentTools` | `8` | judge digest 携带的最近工具调用条数（1–16） |
| `cacheTtlMs` | `600000` | judge 判定缓存 TTL（100–3600000，0 禁用） |
| `judge.baseURL` | `https://opencode.ai/zen/v1` | OpenAI-compatible API base URL |
| `judge.model` | `laguna-s-2.1-free` | judge 模型 |
| `judge.apiKey` | `public` | zen 免费档的公共凭据；换成自己的 endpoint 时填自己的 key |
| `judge.timeoutMs` | `10000` | 100–120000 ms |
| `denyPatterns` | 内置规则 | 自定义正则会追加到内置 shell 拒绝规则 |
| `circuit.enabled` | `true` | 拒绝熔断开关 |
| `circuit.maxConsecutive` | `3` | 连续拒绝熔断阈值（1–20） |
| `circuit.windowSize` / `circuit.maxRecent` | `50` / `10` | 滑动窗口内拒绝数熔断阈值 |
| `policy` | 无 | 自定义策略文本，注入 judge system prompt（≤4000 字符，只能收紧不能放宽） |
| `protectPaths` | `true` | 提权载体路径（git hooks、shell rc、agent 配置等）强制人工审批 |
| `contentReview.enabled` | `true` | webfetch 内容级审核（`tool.execute.after`，fail-open） |
| `contentReview.maxChars` | `8000` | 进入 judge 的正文最大字符数（1000–20000，超出截断打标） |
| `auditLog.enabled` | `false` | 结构化审计日志（本地 JSONL，默认关） |
| `auditLog.dir` | `~/.opencode-autoguard` | 审计文件目录（`audit-YYYY-MM-DD.jsonl`） |
| `auditLog.keepDays` / `auditLog.maxBytes` | `14` / `16777216` | 保留天数（跨日清理）/ 单日字节上限（超过当日停写） |

`defaultReply: "always"` 会把一次模型判断变成持久授权，风险显著高于 `once`；除非你已审查 `save` 范围，否则不要启用。

环境变量优先于插件 options：

- `AUTOGUARD_AUTO`：逗号分隔；空字符串表示禁用
- `AUTOGUARD_FAST_ALLOW`：逗号分隔；空字符串表示禁用
- `AUTOGUARD_DENY_ACTION`：`ask` 或 `reject`
- `AUTOGUARD_CACHE_TTL_MS`
- `AUTOGUARD_BASE_URL`
- `AUTOGUARD_MODEL`
- `AUTOGUARD_API_KEY`
- `AUTOGUARD_TIMEOUT_MS`
- `AUTOGUARD_DEFAULT_REPLY`
- `AUTOGUARD_CIRCUIT`：`on` / `off`（覆盖 `circuit.enabled`）
- `AUTOGUARD_POLICY`：自定义策略文本（同 `policy`）
- `AUTOGUARD_CONTENT_REVIEW`：`on` / `off`（覆盖 `contentReview.enabled`）
- `AUTOGUARD_AUDIT`：`on` / `off`（覆盖 `auditLog.enabled`）

若 OpenCode server 设置了 `OPENCODE_SERVER_PASSWORD`，插件会使用同一环境变量发送 Basic Auth；用户名取 `OPENCODE_SERVER_USERNAME`，未设置时为 `opencode`。

## 验证

以下命令在 POSIX、macOS 和 PowerShell 中相同：

```console
npm run check
npm run test:integration
npm run eval:rules
```

- `npm run check` 运行类型检查和确定性的单元/模拟测试，其中包含 `test/rules.eval.test.ts`：仿 codex execpolicy 的 `match`/`not_match`，把 `eval/dataset` 中带 `expected.layer1` 标注的全部用例作为内置规则的加载期回归；它免费、离线，规则改动一旦破坏标注就会立即失败。
- `npm run test:integration` 启动真实本机 OpenCode listener 和本地 mock judge，创建 pending permission，显式注入 asked event，并验证认证 reply 后 pending 消失。它不声称验证了 TUI 自动转发事件。
- `npm run eval:rules` 用 562 例标注数据集回归本地规则层；`eval/` 目录还包含 LLM judge 层评测，结果见上方“评测基线”与 [eval/README.md](eval/README.md)。

实际使用前还要做一次 TUI 验收：重启 OpenCode，让 agent 请求一个安全且配置为 `ask` 的命令（例如 `npm test`），确认日志出现 `插件已加载`，随后工具真正继续执行。只看到 reply HTTP 2xx 不算通过。

## 兼容性与已知限制

- 代码同时识别 legacy `permission.asked` 和 `permission.v2.asked`，并分别调用对应 reply endpoint。
- 本轮在 OpenCode CLI 1.18.18 上验证真实 listener，在 `@opencode-ai/plugin` / SDK 1.18.19 上做类型检查。
- 包直接发布 TypeScript 源码，目标运行时是 OpenCode/Bun loader，不是通用 Node.js 库。
- 发布包只包含运行时文件；发布前由 `prepack` 自动运行仓库内的 `npm run check`。
- 直接通过 V2 permission API 创建请求时，本地 1.18.18 未把事件自动送入 legacy plugin hook；因此集成测试显式注入事件。
- OpenCode 社区仍有关于 in-process client、HTTP listener、TUI pending store 不一致的报告：[issue #28037](https://github.com/anomalyco/opencode/issues/28037)、[issue #36835](https://github.com/anomalyco/opencode/issues/36835)。
- `opencode run` 可能先于插件完成审批，更适合在 TUI/serve 场景中验证。

相关官方资料：[Plugins 文档](https://opencode.ai/docs/plugins)、[permission schema](https://github.com/anomalyco/opencode/blob/dev/packages/schema/src/permission.ts)、[plugin loader](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/index.ts)。
