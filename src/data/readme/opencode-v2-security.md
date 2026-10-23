# opencode-v2-security

OpenCode v2 全自动执行边界安全插件。Linux 原生 shell 与内置文件工具采用静态 ALLOW/ASK 和统一动态授权；workspace-write 是审查基准，读写会话的获准命令单次直接执行，不再被插件沙箱二次否决。没有等待人工确认的判定分支。插件使用 v2 effect 插件 API（`{ id, effect(ctx) }`，`effect` 返回 `Effect.Effect`）。

1.5.0 保持现有配置和 category 名称兼容；研究和冻结验证依据见 [RESEARCH-v1.5.0.md](./RESEARCH-v1.5.0.md)。授权针对同一命令与事实报告，不把未选项的绝对概率、弱提示或批准后的随机重审当成新的拒绝理由。

## 1.8.0 本地源码后端（尚未发布到 npm）

- **范围**：Linux shell 和 OpenCode 内置文件工具。全部 codemode 工具、MCP、其他直连自定义工具不纳入新链路；本轮不实现 Windows 文件或网络沙箱。TUI 只负责当前模式与授权状态展示。
- **三种模式**：TUI 统一显示 `[Read only]`、`[Auto mode]`、`[Bypass mode]`。Auto 可追加 `, bypassing: filesystem,network` 和 `, custom bypassing on`；custom 授权正文不显示在状态栏。
- **用户切换**：`/perm r`、`ro`、`readonly`、`read-only` 选择 Read only；`/perm w`、`rw`、`auto` 选择 Auto；`/perm bypass` 选择 Bypass。`/bypass all`、`*`、`ALL`、`yolo` 也选择 Bypass，不再表示“全部类别”。类别和 custom 豁免属于 Auto 的附加授权，祖先只读上限仍优先。
- **单一策略**：HARD 策略已移除，不能通过配置或旧审查器选择。旧 `strictness: "LOOSE"` 仅作为单一策略的兼容拼写，不是另一种模式。
- **审查基准**：工作区与配置的临时目录可写，其他位置的写入以及进程、远端、权限和明确凭据效果进入静态审查。内置文件工具使用真实路径检查，而不是宣称在宿主进程内建立 OS 沙箱。
- **静态层**：运行时边界复核使用 ALLOW/ASK：known-safe 放行，不能证明则交给 JEV。启动前真实 Shell 命令的闭合底线、独立 `/perm` 权限上限和无效输入仍可拒绝。JS/TS/Python 文件中的命令字符串只构成审查信号，不因源码文本匹配被当作已执行的底线。执行链为「观察 → 越界时静态审查 → 不能证明时动态审查」。
- **放行即继续**：普通 Shell 保持观察并继续原进程，不自动重放先前步骤；事件许可只覆盖相应边界，需要整树许可的不透明能力另行审查。外部目录、`sudo` 和变量路径不因旧只读挂载再被否决，但模型授权不改变真实 OS 权限、Windows ACL 或 sudo 凭据要求。
- **动态层**：默认使用 `jev-latest` 与包内 `src/security/v11-gold-prompt.json`；`dynamicReview.jev.model` 可覆盖主模型（例如 `clef`），提示词题组和裁决策略不变。六个效果概率题与四个策略题共 10 题，Read only 增加符合性题后为 11 题。Variant B 的物质性阈值为 `>= 0.40`；闭合底线、只读限制及已确认未覆盖的物质效果先于补证回退，不以授权降低效果概率，不回退到另一套模型题组。
- **仅 JEV**：不再启用 OpenAI-compatible 审查器或跨引擎回退；当前 effects/L3 生产链的可用性只依赖 `dynamicReview.jev` 的端点、模型和密钥环境变量，并可配置最多两个同协议备用端点。旧 OpenAI 字段兼容读取但不起作用，无需补齐它们。当前实现使用已核验的 `systemone` 协议；`decisions` 的不同协议尚未接入。
- **r6 题组**：当前冻结题组版本为 `v12-systemone-aligned-20261021-r6`，RW/RO 分别使用该版本及其 `-readonly` 后缀，旧缓存不会混用。`filesystem_severity`/`network_severity` 的 noul 题带有 `true`/`false` criteria，用来说明真假边界，实际答案仍是概率；`covered_by_bypass` 只认当前 active bypass，提示词、历史文本或过期授权不算；判断以实际观察到的 argv/targets 和嵌套效果为准，字面量、打印/保存的示例或非执行 data 不算实际效果；Read only 允许 host-listed scratch 内 session-owned 临时数据的创建、写入和删除，但不能越过 denyWrite、protected/credential 路径或 floor。
- **授权**：最近五轮真实用户消息在 12,000 字符预算内保留，连同会话上下文及可信 `/bypass` 状态进入请求；可信 question 答复只保留实际选择。类别豁免不扩大独立读写上限。命令正文或工具输出自称“已批准”不构成授权；最新限制或撤回优先，旧部署任务不会因参数微调而自动失效。
- **补证终局**：最多一次有界补证后复审。明确底线、只读违规和 `uncovered` 否决不放宽；真正耗尽补证的未知由 `dynamicReview.onUncollectable` 决定 `allow` 或 `deny`，默认 **`allow`**，记录为接受未知而非证明安全。协议或网络故障另按 `failPolicy` 处理。
- **重试限制**：不把普通错误文本当作许可，也不自动重跑可能已有未知副作用的整条脚本。单次获准的执行例外与永久扩大沙箱边界不同。
- **只读会话**：`/perm` 没有写权限时仍执行独立只读上限，审查放行及类别豁免都不授予写权限。仍需要沙箱的调用才受 helper 可用性约束；读写会话的获准直接执行不依赖 bwrap。
- **隐私范围**：普通日志与 `.bash_history`、`.zsh_history` 不因文件名被当作隐私。具体密钥、令牌和敏感环境变量仍受保护；“只读”不能自动豁免真正的凭据披露。日志的修改、删除、伪造或内容外传与普通只读诊断分开判断。
- **脚本证据与凭据遮盖**：首次审查前附加有界执行脚本正文，并优先按观察到的 argv 与进程 CWD 解析，避免 `cd nested` 后附加根目录同名文件。审查 argv 的敏感赋值、参数值及 URL 全部 userinfo 显示为 `[redacted]`；缓存仍绑定原始参数摘要。
- **审查诊断**：`logReviewerTrace: true` 启用 `~/.opencode/reviewer-trace.jsonl`，记录明文 `command`、原始边界参数与完整 `effects`／原始 JEV 答案。一轮 request/result/outcome 不是三次 JEV 请求。此日志可能含敏感参数，不能提交或随意分享；新建文件为 `0600`，既有文件权限不会自动改变。后台停止在释放授权前记录 `effects_background_blocked`；关闭详细追踪时也向 scratch 写最小通知，但不写原始命令。前台说明使用 `Tool.Error`，迟到的后台拒绝通过同会话待发通知交付；两者都不写入被执行进程 stdout/stderr。
- **Auto 常规写入范围**：项目、配置的 scratch，加 `~/.cache` 与 `~/.npm/_cacache`。这是有限的缓存范围扩展，不包含整个 HOME、用户设置、用户状态或 Windows 目录；缓存根及目标的符号链接越界不继承这个放行，凭据/系统路径判定优先。Read only 不获得缓存写权限。
- **全局临时目录**：Linux `/tmp` 与原生 Windows `$env:TEMP` 的目录本身和全部真实后代，在所有模式下无条件可写，不受文件名、工作区、denyWrite 或控制面写保护例外影响；敏感读取仍独立审查，外部链接目标不在授权内。其余临时根（配置的 scratch、`/var/tmp`、`TMPDIR` 及 WSL 的 Windows 临时目录）保留规范路径与 HOME/工作区限制；显式 scratch 可以尚未创建。Windows 路径从继承环境或常规用户目录推导，不为探测启动 `cmd.exe`。内部 broker 已迁至 `~/.opencode/run`。
- **插件开发目录**：会话工作区明确位于当前插件包目录内时，允许正常开发写入；其他工作区仍保护插件安装目录。运行中的观察器二进制与 broker 通信目录不随开发豁免放开。

只调整补证终局时，在现有配置的 `dynamicReview` 对象内加入：

```json
"onUncollectable": "allow"
```

也可选择 `"deny"`。配置文件仍采用浅层覆盖，修改嵌套对象时须保留该层所需的其他字段。本轮不会自动修改本机配置或重启服务。下文的单次提权协议和旧审查器字段描述属于已发布 1.5.0 的旧链路，不应拿来解释新的 Linux 统一审查入口。

## v1 → v2 hook 映射

| v1（opencode 1.x） | v2（本插件实现） | 说明 |
|---|---|---|
| 函数插件 `{ id, server }` | `export default { id, effect(ctx) }`，`effect` 返回 `Effect.Effect<void>` | v2 effect 插件形状（阻断为单次调用的 typed `Tool.Error` 失败；hook 回调返回 `Effect`） |
| `config` hook（覆写 config.shell） | `ctx.shell.hook("create.before")` | spawn 前改写 `ev.shell`/`ev.env` |
| `shell.env`（注入 `OPENCODE_REAL_BASH`） | 同上（`ev.env.OPENCODE_REAL_BASH = ev.shell`） | 仅 Windows 且 supervisor 二进制存在时生效 |
| `tool.execute.before` | `ctx.tool.hook("execute.before")` | 静态 + 动态审查管线；`ev.input` 可变（`timeout`/`command`） |
| `tool.execute.after` | `ctx.tool.hook("execute.after")` | 子会话权限继承；已退场的 HARD 失败裁决不再参与 |
| 工具名 `bash` / `apply_patch` | `shell`（兼容 `bash`）/ `patch`（兼容 `apply_patch`） | `patch` 检查 `input.patchText` |
| `bash_classifier_confirm` + `context.ask` | **已移除** | v2 `Tool.Context` 无 `ask`，`fail_ask` 归一化为 `fail_close`（见下） |
| `client.session.abort` | 不用于新的审查拒绝 | 只拒绝当前调用，不因旧 HARD 检测中断整个会话 |
| `event` hook（`session.deleted`） | `ctx.event.subscribe()`（`Stream`）`Stream.runForEach` + `Effect.forkScoped` | wire 事件 `{ type, data: { sessionID } }`；插件 scope 关闭时中断消费 fiber（替代手动 cleanup 循环） |
| `pluginContext.directory/worktree` | `ctx.session.get({sessionID}).location.directory`（按会话缓存，回退 `process.cwd()`） | v2 ctx 无 directory 域 |
| 配置来源 `rawOptions` | `ctx.options` + `options.configFile` | `plugins` 配置项 `{ package, options }` |

## 安装

新后端尚未发布到 npm；在 `opencode.json` 的 `plugins` 数组引用本地源码目录。下列目录名是配置示例，请换为实际源码路径：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "./plugins/opencode-v2-security",
      "options": {
        "failPolicy": "fail_close",
        "dynamicReview": {
          "reviewer": "jev",
          "onUncollectable": "allow",
          "jev": {
            "endpoint": "https://ollama.com/v1/systemone",
            "model": "clef",
            "apiKeyEnv": "OLLAMA_CLOUD_API_KEY",
            "fallbacks": [
              {
                "endpoint": "https://api.commandcode.ai/provider/v1/systemone",
                "model": "typesafe/jev-1.14.0",
                "apiKeyEnv": "COMMAND_CODE_API_KEY"
              }
            ]
          }
        }
      }
    }
  ]
}
```

将 `OLLAMA_CLOUD_API_KEY` 和 `COMMAND_CODE_API_KEY` 设为可供 OpenCode 服务读取的环境变量。配置对象仍沿用 `dynamicReview.jev` 命名，是为了兼容现有 SystemOne 协议；主端点是 Clef（`model: "clef"`），备用端点是已确认存在的固定模型 `typesafe/jev-1.14.0`（这是本场景示例值，不是默认模型）。插件只读取当前服务进程的环境变量，不会自动读取 `~/.env` 或其他密钥文件。当前 effects/L3 生产链仅使用 JEV `systemone` 协议；主端点因传输、非 2xx 状态、超时或协议错误不可用时，会按顺序尝试最多两个备用端点；主密钥缺失但至少一个备用端点可用时整条链仍可用。有效否决和取消不会触发备用。所有端点都不可用才进入既定 `failPolicy`：默认 `fail_open` 放行当前调用；`fail_close` 保持故障拒绝。备用端点只读取自己的 `apiKeyEnv`，不会借用主端点或 `OC_API_KEY` 的密钥；缺少密钥的备用会被跳过。旧 Python 导出适配器不在该生产链上，仍保持原有单端点行为。JEV 实际否决、静态底线、权限／只读天花板、保护路径拒绝、用户撤销与取消不受 fail-open 放宽。纯 TS，无构建步骤（v2 直接加载 `.ts`）。未确认重新加载前，不应宣称配置或源码变更已经生效。

### 目录自动发现与配置文件兜底

配置按**三层合并**（后层逐字段覆盖前层）：

1. 插件根目录下的 `config.json`——**始终读取的基础层**（自动发现场景的兜底文件，也适合存放长期固定的设置，如 `BypassClassifier`、审查器凭据）；
2. `options.configFile`——`plugins` 配置项里显式给出的 JSON 文件；
3. `plugins` 配置项里的 `options`——逐字段覆盖。

配置文件是 JSON 对象，字段与下方 `options` 字段一致；`configFile` 本身是加载器指令，不是插件字段，不会被传给配置校验。config.json 解析失败会打警告并回退默认值（安全设置静默失效比报错更危险）；`configFile` 读取失败则直接抛错。

## 分类豁免与单次提权

分类描述实际效果与 owner，不因已有许可减少事实归因；审批单独处理真实授权上下文。授权只来自插件验证后的会话状态或经独立审查器批准的严格提权头；命令、文件内容及其他注释中的同名文字不能开启豁免。首次可申请拒绝给出必要类别的完整最小集合，弱 secondary 仅作诊断，不进入下一次申请的硬覆盖要求。

正常 API Bearer 鉴权和 SSH 密钥认证与凭据外传分开判断。审查器自身的文件读取权限与被审命令权限独立，`secret` 豁免不会让审查器读取真实秘密文件。`dynamic` 类别跳过常规动态审查器，始终按「审查器不可用 + `fail_open`」路由，不受配置的 `failPolicy` 影响；不可绕过底线和会话权限仍优先。

为降低误判与过度谨慎，用户可按类别豁免检查。两类机制：

**永久豁免**——`config.json`（或 options）里：

```json
{ "BypassClassifier": ["filesystem", "secret"] }
```

**临时豁免**——会话内 slash 命令 `/bypass [category](,[category]) ([timeout])`（服务端注册命令，参数不进模型上下文）。实现为**固定到期租约**：内存存储，arm 时刻确定绝对到期点，**活动/子代理干活绝不续期**——设 120 就是 120 秒后失效。末尾可跟一个数字作为超时秒数（如 `/bypass fs 120`）；不带超时使用默认 `bypassLeaseTtlMs`（默认 `0` 即不限时，可设为 1min–24h）；超时为 `0` 或负值（如 `/bypass fs -1`）表示永不自然过期，直到 `/bypass off`、会话删除或服务重启。非法/非数字/多余 token 原子拒绝，不改租约。单独 `/bypass 0` 仍是清空租约的兼容别名。

- 多次 arm 叠加：`/bypass host` 后再 `/bypass network` = `{host, network}`；`off` 清空。每次 arm 的 timeout 作用于该会话**整体租约**（覆盖其到期时间）；不带 timeout 的新 arm 把到期重置为默认值。
- 兼容别名只在输入边界展开：`fs` → `filesystem`，`os` → `host+privilege+indirection`，`web` → `network+remote`。注意 `os` 是历史收窄后的写法，**不再覆盖 `remote`**（`git.remote-history-rewrite`、`infrastructure.*`、`database.*` 需要 `remote` 单独武装）。状态、RPC、提示词与永久配置状态只使用规范类别名；永久 `BypassClassifier` 若输入别名会展开并警告，不会把别名存为类别。
- `all/*/ALL/yolo` 均切换到 `[Bypass mode]`，不是逐类全开。它们是 `/bypass` 的控制语法，不是类别；提权注释和永久 `BypassClassifier` 都禁止使用 `all/*/ALL`。
- **子代理传导**（默认开，`bypassPropagateToSubagents: false` 关闭）：子代理会话继承父会话（沿祖先链并集）的 armed 类别与相同到期语义；继承是只读的，子代理活动不会延长父租约。
- **自定义授权**：`/bypass c <原文>` 等同于 `/bypass custom <原文>`，末尾数字也是授权正文，不作为超时。`/bypass c`、`/bypass custom`、`/bypass -c`、`/bypass -custom` 清空本会话自定义授权；`/bypass -c <索引或文本>`（也可用 `-custom`）按从 0 开始的本地索引删除一项，或删除所有包含该文本的项。数字超出索引范围时按文本匹配。删除不改变其他类别、Bypass 模式或剩余租约的截止时间，也不撤销祖先会话的授权。`+c`／`+custom` 必须附带非空正文。
- **命令帮助**：`/bypass help`（也可用 `?`、`-h`、`--help`）打开持续帮助对话框，显示当前模式、类别、自定义授权及用法；宿主无对话框接口时退回浮动提示。

### 通知（agent 与用户分离）

权限切换通过追加通知传达，不改写 system prompt 或已有会话历史。状态反馈分两条通道：

- **agent 侧**：变更、继承和到期只记录最新状态；宿主准备下一条真实用户消息时（`session.hook("prompt")`），在该消息入队之前用 `session.synthetic`（`resume:false`、`delivery:"steer"`）追加一条 user-role 通知，两者在同一次模型请求中送达。状态变更本身不入队：inbox 里待处理的 steer 项会让正在收尾的 runner 再发一次模型请求。排队（`queue`）的用户消息不携带通知（排队项每轮只提升一条，通知会单独占一轮），留给下一条 steer 消息。同一状态不重复通知，切回 Auto 也明确通知。旧通知保持为历史记录，不被覆盖、删除或重新插入历史前缀。
- **用户侧**：服务端通过 RPC（`src/bypass-rpc.ts`）同步状态，由 TUI 伴随入口（`src/tui.tsx`，package `exports["./tui"]`）刷新状态栏。只有成功执行 `/bypass`、`/perm` 后，带 `command` 标记的最终结果才弹一次 toast；多操作命令不提示中间结果。租约到期、子代理权限变化、`set_permission` 和跨实例同步只更新状态，不弹 toast。`/bypass help` 单独显示帮助对话框。参数非法时命令抛错，由宿主 TUI 显示错误；错误不回显给 agent。
- 到期或清除追加新的状态通知，先前通知不再表示当前授权。显式用户命令自身的正常执行不属于“权限提醒额外唤醒”。
- 无 TUI 伴随时，工具执行边界仍生效；通知不注册或修改模型 context hook。
- **本地目录安装**：host 对“目录”形式的插件目标只解析 `<dir>/index`（server）与 `<dir>/tui`（TUI），不看 package.json exports；因此仓库根有 `index.ts` / `tui.ts` 两个薄转发文件。npm 包则走 `exports`。

### 类别语义

| 类别 | 豁免内容 |
|---|---|
| `filesystem` | 文件系统检查：项目文件删除、数据破坏、重定向覆写、归档解包等 |
| `host` | **运行中系统状态**：进程/服务管理（systemctl、kill）、电源、包安装、持久化与反取证变更 |
| `privilege` | 实际权限或隔离政策改变：属主、capabilities、setuid、用户政策、内核参数、namespace 操作、特权容器、防火墙/MAC 等。普通 broker、仅选择 namespace 和已有政策事实不属于此类；同凭据对象保护弱化归 `secret`。瞬态 sudo/root 身份不单独计风险，但实际 OS 能力和沙箱路由仍需满足，见下方说明 |
| `secret` | 活跃凭据对象的值暴露、复制 staging、内容修改/删除、保护弱化。同一对象操作不再机械重复计 `filesystem` 或 `privilege`；摘要/长度、正常签发服务鉴权、收紧模式和仅提及路径不是值暴露 |
| `network` | 越出接收边界的敏感传输、未授权通信使用，以及非公开资源访问范围扩张；正常公开演示和未越原定边界的可信 loopback 不因此过报。不自动豁免秘密内容或远端破坏 |
| `remote` | 下载执行、远端仓库历史、数据库、云与集群状态变更 |
| `indirection` | 本地脚本、解释器包装、编码载荷、动态展开及无法完成的静态检查 |
| `dynamic` | **跳过动态 LLM 审查器**（静态层仍生效；跳过审查器始终按「不可用 + fail_open」处理，无视配置的 `failPolicy`） |
| `sandbox` | 本次 shell 移除 Linux OS sandbox；分类器、动态审查与权限层仍运行 |
| `slow` | 跳过慢命令优化拦截 |

真实独立风险按合取处理：凭据删除本身为 `secret`，同时删除普通资料仍需 `filesystem+secret`；凭据离机仍需 `secret+network`。取回并执行是一体 `remote` 动作，不重复计附随传输；同调用另有独立敏感传输则保留 `network`。瞬态 root/sudo 身份不单独成为风险，但真实 OS 权限与沙箱路由要求仍独立执行。

**特权路由与风险分开**：bwrap 的 `no_new_privs` 会使 sudo 等操作在隔离中失败。需要 OS 特权的调用必须有可用的已授权路由；读写 profile 可以使用现有 host-direct 路由，只读天花板不会被模型同意或 category 豁免解除。字符串、注释和仅保存的载荷不取得特权。无法提供路由时明确拒绝，不等待人工确认，也不静默执行注定失败的命令。

### 代理单次提权协议

普通拒绝消息会要求代理跳过非必要步骤，或使用下列**严格前缀**申请单次提权，而不是改写命令绕过检查。代理只需在 shell 输入中加入三行注释，不需要调用额外工具。阻断后的指导句是：`Skip the step (if unnecessary) or ask for escalation instead of trying alternative methods to bypass the check.`

完整提权用法（三行格式 + 合法类别列表）每个会话在当前**上下文周期**内只在第一个 classifier block（静态/动态/policy）附带一次；同周期后续 block 只保留上述短指导句。会话完成一次 compaction（`session.compaction.ended`）即视为新周期，压缩后第一个 block 重新附带完整用法；`session.deleted` 与插件卸载清除状态，插件重载自然按首次处理。同一会话的并发 block 同步认领，最多只有一个附带完整用法；命令被放行的路径不消耗首次资格，soft slow、permission 拒绝、patch 删除等本就不附带提权指导的路径不受影响。

```bash
# - REQUIRE_ESCALATION
# - CATEGORY: host,privilege,sandbox
# - JUSTIFICATION: install dependency required by the task
sudo apt install unzip
```

示例中的三个类别各管一层：`host` 豁免包管理这类运行系统状态变更的静态检查；`privilege` 覆盖 `sudo` 越权边界，并让该次调用以 host-direct 运行（不包裹 OS 沙箱，否则沙箱的 no_new_privs 会让 `sudo` 静默失败）；`sandbox` 则完全移除本次调用的 OS 沙箱（apt 需要写系统路径与真实网络，ro/rw 沙箱下都会失败）。按需请求类别：例如只改文件属主的 `chown` 只需要 `privilege`（可加 `sandbox`，当 ro 沙箱无法移除时避免 fail-loud）。

- 三行必须从命令第一个字节开始、顺序和大小写完全一致；第四行起才是真实命令。可申请的类别为七个静态类别加 `sandbox`（`filesystem`/`host`/`privilege`/`secret`/`network`/`remote`/`indirection`/`sandbox`），可多选；`dynamic` 与 `slow` 不可申请（提权不能用来关掉审查层本身），`all`、`*`、`ALL` 与输入兼容别名同样禁止。
- 插件把最近 **5 条用户消息**（每条最多 8000 字符，超长时保留头尾）、最多 **16 条用户/助手正文**（每条最多 4000 字符、合计 24000 字符）、实际 cwd/worktree、当前权限、命令、类别、理由及本会话既往失败申请交给独立 Python reviewer。推理文本、工具输出和插件通知不混入用户授权。结果仅为 `allow_once`、`collect_evidence` 或 `deny`；缺少必要事实时自动采证，不请求用户确认。
- 可完成的授权审查仍由独立 LLM 审查器裁决；模型实际否决不会被故障策略放宽。配置缺失或审查器不可用属于检查失败，统一按 `failPolicy` 放行或拒绝；故障放行不是模型批准。
- **送审前 floor 预检**：插件先用「会话现有类别 ∪ 本次请求类别 ∪ 全部静态类别」（reviewer 可能给出的最大授权；底线规则本就对任何类别免疫，全类别武装下仍命中的终结规则不可能被任何授权清除，也避免未请求的普通规则或前段的普通 DENY 遮蔽同脚本后段的底线规则）跑一遍静态分类；若结果命中任何**终结规则**——不可绕过底线（`isFloorRule`）、`permission.write` 权限上限、或不可审查输入（`input.empty`/`input.opaque`；opaque 的判定是 ASK，同样在 reviewer 之前短路，不会白调 reviewer）——则**短路**：不调用 reviewer，直接返回终结型拒绝并说明"提权无法越过硬底线"。该静态拒绝**不写入** reviewer 拒绝历史（静态预检不是 reviewer 的 deny 决定），但重复提交仍会在同一预检处再次被拒；仅有未映射的普通规则不在此短路（它们交给 reviewer 正常审查）。
- `allow_once` 只对当前命令与匹配事实报告有效，不改变会话租约。同报告批准后不再次随机运行普通动态归因追加类别；真实权限、底线与路由检查仍执行。脚本、权限、目标或政策变化会明确使旧报告失效，而不是静默扩权。
- 提权审查器单独限速为任意滚动 3 秒最多启动 2 次；仅此 reviewer 限速，普通分类和常规动态审查不限速。
- `collect_evidence` 进入有界的自动取证与新事实评估；不能把拿到正文直接当成安全。无法取得证据则明确拒绝，指出证据限制，不进入人工等待。
- 相同已拒绝申请仍受有界失败历史限制；基础设施错误与模型否决分源。终结型拒绝要求跳过无法安全执行的步骤，不以“请用户授权”作为继续路径。所有 agent 侧状态说明以 `opencode-v2-security:` 标明来源。

### 不可绕过底线

以下规则任何类别都不豁免，且在**完整脚本**上判定（不受 `|`/`&`/`;` 段拆分影响）：

- `filesystem.root-delete`（含 `/etc`、`/usr`、`/lib`、`/lib64`、`/sys`、`/proc`、`/mnt` 等 15 个系统根的**裸根或直接 glob**；根下的普通子路径如 `/var/tmp/...`、`/home/user/proj` 属 scoped 删除，可被 filesystem 豁免）、`brace-root-delete`、`root-glob-delete`、`find-delete-root`（`rm` 与 `find` 共用同一系统根列表）；
- `disk-destruction`；
- `execution.fork-bomb`（引号内容视为惰性文本；要求函数名作为管道一侧的命令词形成递归核心，`:(){ :|:& };:`、单侧递归 `f(){ f | g; }; f`、`while :; do $0& done` 均命中；`build(){ npm run build | tee log; }; build` 这类正常函数不误报）；
- `kernel-trigger`、`kernel-core-pattern`（覆盖重定向/`dd of=`/命令位的 `tee`/`cp`/`mv`/`rsync`/`install` 写入（目的地可为带引号、后接注释或重定向）及 `sysctl -w kernel.core_pattern=`；`echo tee /proc/...` 这类惰性文本不误报；读方向的 `cp /proc/sysrq-trigger /tmp/x` 不命中）；
- `network.reverse-shell`、`execution.literal-shell`。

动态审查器的 BYPASS RULE 提示词同样声明这些保持 DENY。

### 静态放行语义

arm 后命令不会被静态层直接 ALLOW：豁免对应检查后以 `bypass.static-allow` ASK 交常规动态审查器（配合对应 BYPASS RULE 提示词裁决）；检查不可用或失败统一按 `failPolicy` 处理（默认 `fail_open`，需在故障时拒绝则设为 `fail_close`），实际授权否决仍拒绝。v1.3.0 将无法确定是惰性载荷还是执行内容的情况交给动态层；可证明实际执行的底线仍拒绝。仅写入、打印或保存危险示例不等于执行，但实际写入目标、命令替换及同次调用中后续执行仍须审查。

## 会话权限层（r/w 能力上限）

公开界面只有 Read only、Auto、Bypass 三种模式；内部 r/w 能力上限仍与所有祖先相交，x 仅保留兼容且不展示。用户可选择模式；代理对直接子会话只能收紧为 Read only 或 Auto，不能开启 Bypass。声明 Auto 的子会话和它的后代不会越过该声明继承更上层的 Bypass。

本插件实际限制的是 Linux 原生 read/grep/glob 与 write/edit/patch、shell。Read only 的原生写动作被拒绝（全局临时目录除外），shell 仍执行独立只读上限；范围外的工具保留宿主原有处理。

### 执行面

- **`ctx.permission.hook("evaluate")`**：只对绑定到当前已批准原生调用的权限请求自动处理 ask；显式宿主 deny 保持最终有效。计划外动作或状态漂移会被拒绝，不转人工审批。
- **分类器 `permScope` 兜底**：无 `w` 时写/删形段 DENY（规则 `permission.write`）；类别豁免不能越过此权限拒绝。`permission.write` 是独立权限天花板，不被解释为模型反悔，也不进入等待用户确认的路径。
- **`set_permission` 原生工具**（`codemode:false`，`permission.registerTool` 可关）：模型只能收紧**直接子会话**（`session.created` 记录的父子链，回退 `session.get().parentID` 在线查证）；`sessionID` 为必填参数，缺失、空值、caller 自身、孙代或任意会话一律以 `Tool.Error` 形错误 fail closed；放宽同样拒绝。
- **子代理 `permission` 参数**（`permission.subagentPermission` 可关）：RO 父会话可以创建 RO 子代理；子会话继承父上限。若声明更窄权限，`session.created` 时立即绑定，并由 `execute.after` 再确认。
- **slash 命令**：`/perm <readonly|auto|bypass> [sessionID]`；r/ro/read-only 也是 Read only，w/rw 也是 Auto。用户可选择本会话或后代的模式；祖先只读上限始终优先。

`/bypass all`、`*`、`ALL`、`yolo` 都是 Bypass 模式选择，不再是全类别豁免。临时 Bypass 到期恢复进入前的能力基线，不会把先前的 Read only 永久放宽。代理接口推荐仅使用 `readonly` 或 `auto`。

### bypass vs permission

| | `/bypass` | `set_permission` + `/perm` |
|---|---|---|
| 作用 | 按类别放宽分类器检查 | 按能力位硬拒整个动作类 |
| 谁能调 | 只有用户，类别/custom 为附加授权，all/* 为模式切换 | `set_permission` 代理仅收紧；`/perm` 用户可调整 |
| 方向 | 按类别临时放宽 | 代理仅收紧；用户可恢复，但祖先仍封顶 |
| 时效 | 固定到期租约（默认 20min，可带秒超时；`<=0` 不过期），不随活动续期 | 会话生命周期，`session.deleted` 清除 |

优先级：permission deny 是硬拒绝，与 bypass 独立——arm 了 filesystem 豁免但 `w` 被剥除时，写操作仍被 `permission.write` 拦下。

### 权限变更通知

agent 侧在权限切换后的下一条用户消息之前追加合并的 user-role 状态通知（`session.synthetic`，`resume:false`），不改变 system prompt 或任何已有历史前缀，不唤醒会话，也不单独触发模型请求。TUI 通过 RPC 快照和状态事件更新；模式、类别、custom 标志与到期时间由同一时钟快照计算。

### 配置

| Option | 类型 | 默认 | 说明 |
|---|---|---|---|
| `permission.default` | string | `"rw"` | 每个会话的 r/w 能力基线上限 |
| `permission.webIsRead` | boolean | `true` | `false` 时 webfetch/websearch 不再计入 `r`（该 action 从映射删除，不再受权限约束） |
| `permission.registerTool` | boolean | `true` | 是否向模型注册 `set_permission` 工具 |
| `permission.subagentPermission` | boolean | `true` | 是否为 subagent/task 工具增加 `permission` 参数 |
| `permission.actionMap` | object | 内置映射 | action → `"r"\|"w"\|"x"` 覆盖；删除某 action 即不受权限约束 |

UI 不再展示 rwx/x/YOLO 字样。状态尚未同步时显示未知状态，而不是错误地断言 Bypass 仍在生效。

## 运行时边界观察（opencode-boundary-watch）

启用 sandbox 的 shell 命令由 `bin/opencode-boundary-watch`（`native/linux-sandbox/opencode-boundary-watch.c`，`make -C native/linux-sandbox` 构建）以纯 ptrace 方式监督：payload 不经过 mount/NNP/Landlock 包裹直接运行，插件内没有任何脚本内容/危害分析；只有越过声明写根、只读上限、凭据路径、网络/IPC、特权或 opaque 能力（io_uring、ptrace、进程间句柄、CLONE_UNTRACED、foreign ABI 等）的 syscall 才在进入点暂停并向本进程内的 broker 通道（AF_UNIX NDJSON）请求一次裁决。裁决分三段：观察器发现越界 → **静态审查**（只返回 ALLOW/ASK）→ 静态不能证明时 **动态审查**（JEV）。回复语义：`allow` 对已批准命令 detach 全树改原生执行（setuid/interop 可用，lease/模式撤回仍能 killpg 全组）；`continue` 只放行本次 syscall（L2 缓存命中路径）；`deny`、超时（`--approve-timeout-ms`，默认 35s）或通道 EOF 一律 kill 整个 tracee 树，助手退出码 126 并说明"该操作未执行，此前步骤可能已生效"。payload 最终退出后 broker 关闭前，助手发送一行 `{type:"exit","exit":<真实0..255码>}` 终态帧（无需回复），供 background 调用在没有工具返回的情况下结算缓存与清理。

- **拒绝与取消说明**：helper 只通过认证 broker 控制帧报告拒绝、取消和终态，不向子进程 stdout/stderr 输出拦截文案。前台失败使用 `Tool.Error`：已确认审查否决为 `Command blocked` 并保留 `Do not bypass this denial...`；检查故障、取消和权限变化为 `Command failed`，不伪装成模型否决。运行时说明保留实际触发点，明确可能已部分执行且没有回滚；首次原因不被后续 EOF 覆盖。普通 OS 错误保留原始输出，不能据此推断为插件拒绝。
- **后台拒绝通知**：工具已返回 `status:"running"` 后不能再改写原调用的 `Tool.Error`。后台终态先按会话保存完整拒绝说明及禁止绕过指导，并记录 `effects_background_blocked`，再释放授权。通知在既有模型请求中可见，并由下一个已完成工具结果前置送达，或在下一条真实用户提示前通过 `session.synthetic`（`resume:false`、`steer`）持久化；不会单独唤醒 runner，也不写入后台进程 stderr。临时上下文副本不算已送达，工具结果或成功的真实提示发布才清理对应通知；会话删除时清理待发通知。
- **故障放行**：以上故障拒绝仅适用于 `fail_close`。`fail_open` 向 helper 传入 `--fail-open`：broker EOF／协议错误／审批超时放开整棵进程树，启动检查失败时直接执行原载荷；不生成拒绝文案。用户取消和模式／权限撤销使用独立 cancel 帧，仍终止命令，不能把它们当作故障 EOF 放行。
- **取消帧完整性**：broker 等待 cancel 写入完成后才关闭通道；未能确认发送时走原执行器的中断兜底。观察器在空闲期按完整 NDJSON 帧组装控制消息，最多 511 字节、1 秒。已开始但截断、超时或超限的控制帧按取消处理，不因 fail-open 放开进程树。
- **detach 后仍受监督**：'allow' detach 的进程保持登记，取消（broker EOF/撤销/host SIGTERM·INT·HUP）仍按 pid 逐个 SIGKILL——`setsid` 只能逃出 killpg，逃不出登记表；watcher 是 child subreaper，孤儿后代 reparent 到 watcher 一并收割。**终态语义**：root 退出只记录结果，唯一 terminal exit 帧在整树被 waitpid 收割干净（ECHILD）后发出——后台命令的 cache 推进不会因为 root 先退而提前兑现；监督期 broker 关闭一律视为取消（会到达每个后代）。宿主 SIGKILL 无法捕获，仍是声明限制（残留后代此时确实会漏）。
- **控制面保护（--protect）**：broker socket 目录、watcher 二进制、包自身代码目录按受保护路径处理——写其内部**或**其祖先（父目录 rename/unlink/chmod 会整个换掉控制面）都触发边界事件，即使会话 workspace 就是本仓库。与内容审查无关，是完整性边界；另有启动指纹（dev:ino:size:mtimeNs）兜底，镜像被换即拒绝并要求重启会话。
- **/dev 与 stdio**：仅白名单设备（/dev/null、/dev/pts/* 等）的 **I/O** 放行；其余 /dev 节点写操作一律边界事件；metadata 操作（chmod/chown/xattr/utime）对设备节点**不豁免**。`/dev/fd/N`、`/dev/std{in,out,err}` 先按 **tracee** 的 fd 表解析成真实对象再分类（realpath 只会绑到监督器自己的 fd）——`/dev/fd/3` 指到普通文件时事件 target 就是该真实路径；fd 0–2 同样经 /proc/pid/fd 解析，管道/tty 放行、被重定向到真实文件即按对象写边界。
- **/proc 敏感对象**：其他进程的 mem/environ/fd/map_files 读为 read 边界，写一律 opaque（read 类别不会绕过写上限）。
- **越界时的静态审查**（`staticCrossingReview`）：网络越界在整条命令被 `classifyBoundaryCommand` 证明 known-safe 时 ALLOW（如 `git push`、`npm install`、回环 `curl`），另有可信 git 的远端读取和 `workspaceNetwork: "on"`；ALLOW 只 `continue` 本次 syscall，整棵树继续受观察。凭据/denyRead 读、根外或受保护写、privilege/interop/opaque 以及所有 requiresFullApproval 事件一律 ASK：命令文本证明不了运行时才发现的目标，而后者唯一的正向回复会 detach 整棵树。整条命令的静态证明每次调用最多算一次，规则 ID 进入审查 trace 的 `staticRules`。
- **无需审批的拒绝（errno 注入）**：观察器把某些 syscall 在入口改为空操作并在出口返回错误码，只减少能力、不放行，整棵树继续受观察：`io_uring_setup` → `ENOSYS`（libuv/Node、Bun、tokio 回退到 epoll/线程池）；连接 nscd 套接字 → `ENOENT`（glibc 自行读取用户/组数据库，`ls -l`、`ps`、`id`、`stat` 不再越界）；读取 watcher 自身 `/proc/<pid>/*`（cmdline 含 broker token）与 root 所有的 procps `ps` 扫描其他进程 environ → `EACCES`。其他程序读其他进程 environ 仍是 read 边界。
- **直接放行**：信号 0（只探测存在，uutils `tail` 的 `kill(0,0)`）；连接 root 所有、目录不可写的 `/run/systemd/userdb/*`；发往内核（`nl_pid` 0）的 netlink（`getifaddrs` 等查询；非 root 的 tracee 无法获得修改网络状态的能力）。
- **interop 判定**：按 binfmt_misc 规则读文件头 `MZ`，不看文件名：ELF 格式的 `bun.exe`、`opencode.exe` 原生执行，不再是 interop 事件；改名的 PE 仍是。读不到文件头时退回 `.exe` 后缀判定。所有运行时观察的调用设置 `GIT_OPTIONAL_LOCKS=0`，只读 Git 命令不再在 worktree 的主仓库 gitdir 写 `index.lock`。
- **缓存范围**：L1 按 (会话、securitySnapshot、边界核心摘要) 键控——核心摘要是越界本身而不是命令文本：事件 kind/syscall/operation/写入效果、目标稳定身份（canonical path、domain、exists、dev/ino/mode、父目录 dev:ino，不含 size/mtime/ctime）、执行映像身份与 basename、跨越进程 argv 摘要（bash/sh/dash/zsh/ksh/fish/busybox sh 等 shell 解释器除外——其 argv 是整条命令行）、运行 cwd、只读/可写审查政策版本与活动豁免面。`| tail -30` 改成 `| tail -20` 或追加 `; echo x` 命中同一越界的 L1；原生文件工具同理按 (工具 + 解析目标 + 身份 + 模式) 而非原始输入键控。正向条目（allow，L1 与 L2）TTL 20 分钟且**滑动续期**（每次命中重置），只绑定安全快照——新用户消息不再使其失效，任何安全状态变化（/perm、/bypass、kill switch、租约到期）清空该会话全部缓存；负向条目（deny，仅 L1）TTL 5 分钟不滑动，仍绑定 adjudicated 时的用户消息摘要——新消息可能授权曾被拒绝的操作，故拒绝在新消息后未命中。L2 只给非 fullApproval 的 write 级操作，按 (path, 父目录 dev:ino) + 对象身份（dev/ino/mode——同 inode 的 chmod 即失效，内容 mtime 不失效）绑定，调用结束（含非零退出码，不含被拦截）后推进到落盘对象。L2 还绑定写入效果并且不会放宽：`replace`（O_TRUNC/truncate/creat）⊃ `overwrite` ⊃ `append` ⊃ `fd-write`，`mkdir` 单列；符号链接、硬链接、设备节点不进入 L2。旧快照范围的查询只是未命中，不会清空当前缓存；最多保留 64 个会话的缓存状态。ReadOnly 会话也复用 read/network 越界的审查结果。opaque/requiresFullApproval 事件**完全不缓存正向**（exe 未变不等于同一动作；间接可变输入无法绑定），deny 结果仍可缓存。
- **审查文本脱敏**：复核收到遮盖敏感值后的 argv、command 和证据命令文本；带空格的单／双引号参数和赋值同样显示为 `[redacted]`。原始 argv 摘要只供宿主缓存使用；显式详细追踪仍可能记录原始命令和边界参数，须按敏感本地日志保护，不能把它当作已脱敏的复核请求。
- **环境继承取舍**：payload 原样继承宿主环境（含密钥）。启动代码钩子（`BASH_ENV`、`ENV`、`BASH_FUNC_*`、`SHELLOPTS`、`PROMPT_COMMAND`、`LD_*` 等）在外层 shell 被改名为 `OPENCODE_DEFER<N>_*`（置原名空串——已核实宿主 `packages/core/src/shell.ts` 在 hook 前物化 env 且 spawner 不合并父 env，空串语义稳妥），存储名与原名以 `--defer <storage>=<name>` 显式对传给 helper：traced child 只恢复被声明的对子，用户自有同前缀变量原样透传。**槽位耗尽即拒绝启动**（任一钩子拿不到空闲存储名或超 256 对上限→ 命令在 payload 存在前被 sandboxDenyCommand 拦截，外层固定 /bin/sh，不保留原钩子、不静默丢值）。
- **NOFOLLOW-last**：unlink/rmdir/rename/lchown/l*xattr/linkat 目的端等操作按 canonical(parent)+basename 判定——删除指向外部的根内符号链接不是外部删除；rename/link 事件同时携带源与目标两个 target（硬链接会改源 inode 元数据）。路径解析遵守内核遍历顺序：realpath 先跟符号链接再处理 `..`，不做词法折叠——`a/link/../f` 与 `a/f` 可能是不同对象；linkat 源端仅在 `AT_SYMLINK_FOLLOW` 时 follow。
- **ABI**：每个 syscall-entry 用 `PTRACE_GET_SYSCALL_INFO.arch` 校验 x86_64；compat/x32/int80 一律 opaque `exec-domain` 全批事件，不会按 x86_64 表误判静默漏拦。
- **兄弟线程冻结**：入口 gate 的 syscall 在消费过**可变 tracee 状态**（路径串、sockaddr/msghdr、解析出真实路径的共享 fd）时，兄弟暂停保持到该 syscall 的 exit stop；未消费可变状态（如写管道——fd 解析为非路径即返）则入口检查后立即释放，同进程 rendezvous 不会死锁。已在真实 stop 上停住的兄弟即视为已冻结（消费其 stop 延后回放，而非等不来的 INTERRUPT 事件）；task 枚举失败、拒绝 INTERRUPT 的线程一律整条命令 fail closed——刚 clone 未登记的 born-stopped 线程经 INTERRUPT 收敛（running 会停在确认 stop，born-stopped 的待决 EVENT_STOP 也会确认，EPERM 才 fail）。recv 族例外——cmsg 在 exit stop 重新冻结检查。排空窗口为有界残留。
- **在途 fd 绑定保护**：gate 每消费一个 fd 当前绑定（fd→路径/pipe/socket/"已关闭" 均为可变事实）就记录该 fd 号；同一 fd 表（`CLONE_FILES` 组，含跨 tgid）里兄弟对它执行 `close`/`dup2`/`dup3`/`close_range` 重绑时，该 syscall 在其**自己的 entry stop**被挂起，直到消费方 syscall 退出——被审查的对象即实际执行的对象。只挂起重绑者本身，其它兄弟照常运行，普通 pipe 并发不受影响；`dup`/`fcntl F_DUPFD`/`open`/`accept`/SCM_RIGHTS 只分配新槽位，不打扰在途绑定，不挂起。
- **残留限制（未声明已覆盖）**：detach 阶段**新出生**的、未经 ptrace 登记且通过新 session 逃逸的后代，仅在成为孤儿 reparent 后才可被收割（subreaper 覆盖，非实时登记）；宿主对 watcher 的 SIGKILL 无法捕获，此时残留后代确实会漏（TERM/INT/HUP 已覆盖）；同 dev:ino 上仅 mtime/atime 变化不失效 L2 grant（按设计，mode/身份变才变）；外部进程经非 ptrace 通道并发改文件不能完全杜绝；白名单外 `ioctl` 一律 opaque 事件；`MZ` 文件头/DrvFs 路径 exec 走 interop 事件但 Windows 端真实执行未做线上验证；`opencode` CLI 写自身日志目录与 `/sys/kernel/debug/tracing/trace_marker`、不带 `-readonly` 的 `sqlite3` 以读写方式打开根外数据库，仍是写边界；setuid `sudo`/`su` 仅在 'allow' detach 后可运行；线上真实 OpenCode V2 宿主与 JEV 后端未做端到端验收。

### 额外写根：`sandbox.allowWrite`（1.7.0，未发布）

可显式把工具的日志、缓存等路径列为附随写根，例如：

```json
{
  "sandbox": {
    "allowWrite": ["~/.local/share/opencode/log"]
  }
}
```

只接受绝对路径，支持 `~`、`~/…`；尚未创建的路径按最深的已存在父目录校验。符号链接叶节点或被重定向的根不采用。`/`、HOME 及其祖先，与凭据存储、denyWrite、插件包或观察器重叠的路径、实际运行的 broker 子树以及敏感路径，会逐项警告并忽略。`/tmp` 的无条件写授权独立于此配置生效，不能通过这些排除规则收回；内部 broker 存放于 `~/.opencode/run`，不再占用 `/tmp/opencode`。数组类型、字符串类型或相对路径错误仍是配置错误。

这些路径与原有附随写根一样，在 **Auto 和 Read only** 中加入观察器允许列表；denyWrite、protect、凭据与敏感目标的排除仍优先，不会扩大独立权限上限。JEV 只在现有的 `Current allowed write roots` 中看到它们。

显式根与 worktree 私有根同时保持逐目标观察：普通附随写入由本地检查直接 `continue`，不调用 JEV；敏感目标不享受根豁免，Auto 走正常审查／拒绝链，Read only 拒绝写入。仅传入 `--root` 而跳过目标检查不构成此项授权。

### L3：重复写入建议的临时写根（1.7.0，未发布）

仅 Auto/可写会话启用。20 分钟内，三个不同 shell 工具调用分别获准写入同一规范父目录（含静态、JEV 或 L1/L2 放行），会触发一次**独立后台** JEV 选择题；当前命令不等待它。每个会话/目录每 20 分钟最多一次，`none` 再抑制 20 分钟。只提交代码预先筛好的目录及最多三个祖先，顺序从窄到宽，绝不提交 HOME 或更高层级。

候选不能覆盖工作区或已有根，也不能与凭据、denyWrite、protect 或控制面重叠。候选的名称扫描不超过三层、5000 项；凭据样式名称、数据库、任何类型的 `.git` 条目（包括 linked worktree 的指针文件）、扫描截断或错误均不能带来授权。像 `~/.local/share/opencode` 中的 `auth.json` 和 `opencode.db` 会淘汰宽根，而纯日志子目录仍可候选。JEV 只能选择给定候选或 `none`，不根据概率改写答案；上下文不支持继续使用工具，或写入是任务操作而非例行日志/缓存/锁等附随活动时应选 `none`。

获准根仅存在于当前会话内存，20 分钟到期、最新真实用户消息摘要变化或安全快照变化后，在下次使用时失效；Read only 不使用 L3。新 shell 调用加入有效根；临时根同时保留观察器的逐写入事件，用本地有效期/排除检查直接回复 `continue`，不走静态/JEV 复审，也不会让长命令沿用已到期的根。L3 的模型、协议、扫描错误只意味着不扩根，绝不因此拒绝命令。审计事件为 `l3_root_request/granted/declined/error/expired`，只保留命令 SHA-256 和目录路径，不记录原始命令或凭据。

会话删除会清除 L3 授权和重复记录，并阻止在途建议重新安装授权；超过窗口的目录记录在访问时及现有维护定时器中清理。

### 链接 worktree 的私有 git 目录（1.7.0，未发布）

会话工作区是 git 链接 worktree（`git worktree add`）时，`cwd/.git` 是一个 `gitdir:` 指针文件，指向主仓库 `.git/worktrees/<name>` 下的私有元数据目录——index 刷新、HEAD、reflog、MERGE_HEAD 等例行记账都写在那里，不在工作区内。没有额外根时，linked worktree 里一次普通 `git status` 都按根外写入计一次边界审查。

Auto/可写会话的 shell 路径把该目录加入写根（`src/security/worktree-roots.ts` 的 `linkedWorktreePrivateDir`）。返回前逐条验证：`cwd/.git` 必须是含 `gitdir:` 指针的普通文件；指针规范化后必须是现存目录且含 `commondir`；`commondir` 目标必须是带 `HEAD` 文件与 `objects` 目录的真实公共 git 目录；私有目录必须恰为 `<commondir>/worktrees/<name>`；私有目录的 `gitdir` 必须回指 `cwd/.git`——指向其他 worktree 私有目录、公共 `.git` 本身或无关路径的伪造 `.git` 文件一律忽略。任一环节不符都只是不加根，绝不拒绝命令。

只读会话与原生文件工具不获得该根；公共 `.git`（objects、refs）不在授权内，`git commit`/`git checkout` 的公共写入仍是边界事件。该根与 `sandbox.allowWrite` 走同一套 denyWrite、protect、凭据与敏感目标排除。

## 跨实例共享安全状态（1.7.0，未发布）

宿主按会话位置各加载一个插件实例，但所有实例运行在同一服务进程内。过去存于各实例闭包的用户权限/会话安全状态——Bypass 租约、会话 rwx 基线与祖先链、显式禁 Bypass 屏障、permStash、安全快照基线/epoch、审批缓存、L3 授权与会话通知快照——现在统一保存在 `src/security/shared-state.ts` 的进程级注册表（`globalThis[Symbol.for("opencode-v2-security.state.v1")]`）。效果：一个位置里 arm 的 `/bypass` 或设置的 `/perm` 对由其他实例服务的会话同样生效；某位置重启导致插件重载时，新实例直接接管既有状态而不是静默清空；一条安全通知由处理该会话 prompt hook 或工具结果的任一实例恰好送达一次；任一实例的安全快照变化都会清空该会话的共享审批缓存。

实例变更共享映射后发布 `session-state-changed`，其余实例的反应与本地变更相同：刷新合并安全通知（顺带撤销本实例运行中的受监督调用）、重新同步后代、经自己的 RPC 通道重发 TUI 快照。反应幂等，实例销毁时注销监听。ctx 句柄、broker、RPC 注册、定时器与在途审查仍按实例持有。状态仍是纯内存，无文件持久化——服务重启清空全部租约与基线。

默认权限、永久豁免和继承策略按会话所属位置（directory/workspaceID）推导，而非使用当前处理通知的实例配置。同一位置的配置注册冲突只警告一次，并保留权限／豁免的更严格交集；所属实例缺失或重载期间收紧为不可写，不借故障策略扩权。通知认领仅表示在途发布，跨实例按会话串行，成功或失败均释放；已送达去重独立保存。

网络 L1 另绑定观察到的地址族、规范 IP、端口及 IPv6 scope ID，allow 和 deny 都不会跨已识别端点串用。端点不能完整识别时不缓存正向决定，负向决定仍按观察证据与用户消息摘要缓存。

## 行为总览

```text
shell 请求
  -> 真实权限与不可绕过底线检查
  -> 静态事实 + 内在效果审查 -> 同一命令/事实/政策报告
       需要证据 -> 有界自动取证 -> 新事实重新评估
       可执行 -> opencode 原生 shell
       可申请拒绝 -> 最小完整类别集合，代理自主申请单次授权
  -> 自动 reviewer: allow_once | collect_evidence | deny
       allow_once -> 复用对应报告，不二次随机归因
       collect_evidence -> 自动取证，不等待人工
       deny -> 明确拒绝，不把模型选择与程序底线混为一谈
  -> 执行准入：真实 permission / sandbox / 事实变化检查仍有效
```

静态事实收集（cd 追踪、脚本身份、目录清单等）仍由本地分类器执行；风险归因与自动授权协议分别处理。JEV 直连已配置 System One 端点，OpenAI-compatible 通道使用现有配置；不通过 opencode client 代发模型请求，也不自动修改用户端点或密钥配置。

### LOOSE 语义放行（仅读写会话）

LOOSE 读写会话中，一个段在所有危险扫描都通过后，若能证明只读，就直接静态 ALLOW，不再交给动态审查器：

- Python：`python3 -c`、`python3 - <<'EOF'`、本地 `.py` 脚本，由 `src/security/python-readonly.py` 做 AST 只读证明（模块白名单、只读 `open`、只读 SQL；拒绝 URL、敏感文件名和环境变量读取；同目录被 import 的模块一并检查）；
- sqlite3 只读 SQL、`gh` 读子命令与 `gh api` GET、tmux 只读命令、版本/帮助查询、`python -m json.tool`；
- 仅限 loopback 的 `curl` GET/HEAD（不写文件）。语义放行不覆盖任何远程联网请求；
- RO 会话的只读词汇（git 读子命令等，不含解释器、awk、curl）、`for`/`if` 等复合语句里逐段可证明的命令、字面量变量赋值与循环变量绑定、不会匹配凭据文件名的 glob 读参数；
- `trustedCommands` 中的命令。

任何一步无法证明都回退原判定（通常是 ASK）。HARD 会话保持 1.3.0 判定（回放逐行一致）；只读会话（`permScope.w=false`）不启用上面这些**语义放行**，但共享词法/词汇层的放宽（`sed -n … 2>/dev/null`、`~` 路径、`for`/`if` 复合体、`:` 内建、`git worktree list`、glob 读参数），其写上限不变。同期的漏报修复（git `--output`/`--ext-diff`/`--open-files-in-pager`、find `-fprint*`/`-fls`、awk `getline`/`print >`/`print |`、sed `w`、`xxd -r`、tar/zip 执行类选项、同目录 Python 模块遮蔽 stdlib）在所有模式下生效。

### 只读会话本轮修复的三个逃逸面（1.3.0 就存在）

1. **复合关键字遮蔽 interop 写**：分段遗留的 `then`/`do`/`if`/`else`/`!`/`{` 前缀把真正的可执行文件藏在了 RO 互操作与变异检查之外，`if true; then pwsh.exe -Command 'Remove-Item …'; fi` 在内核强制的只读会话里被当作"无法识别的叶子"直接放行——Linux 内核沙箱管不住 Windows 侧进程。现在这些形式与裸命令判定完全一致（DENY）。
2. **temp 豁免绕过执行器扫描**：`sed -n '1e id' x > /tmp/o`、`awk 'BEGIN{system(…)}' > /tmp/o` 曾借 "/tmp 目标全受限" 早放行在所有模式下执行代码。temp 豁免现在先过执行器能力检查；awk（system/getline/print 管道形态，带引号内容屏蔽，`" || "` 字符串不会误判）加入 sed/rg/`git grep` 的执行器检查。
3. **内联代码点名凭据文件**：`python3 -c "print(open('/home/u/.ssh/id_rsa').read())"`、`node -e "…readFileSync('/home/u/.ssh/id_rsa')…"` 里的路径永远不构成可分类的路径 token，"纯读"证明与内核直通都会放行。现在凭据词表（与路径注册表同源）会扫描参数与代码文本：无内核的只读会话 DENY，内核强制的只读会话转 ASK 审查。固定回放里只读（内核强制）静态放行而动态审查拒绝的命令从 4 条降到 0 条（29→25 全部为既有基线）。

## 配置字段（与 v1 一致）

v1.4.0 的静态放行、RO 修复与验证方法见 [v1.4.0 研究与验证摘要](./RESEARCH-v1.4.0.md)；同期 JEV 载荷/执行边界改进见 [迭代报告](./RESEARCH-JEV-PAYLOAD-20261003.md)与[优化提示词](./JEV-EXECUTION-SCOPE-PROMPT.md)。v1.3.0 的提示词实验、真实拒绝取证、误拦/漏判结果及剩余限制见 [v1.3.0 摘要](./RESEARCH-v1.3.0.md)。研究比例不是线上误拦率；复杂嵌套载荷仍可能被动态模型误判。

`options` 支持以下字段（白名单校验，未知字段会抛错）：

| Option | 类型 | 默认 | 说明 |
|---|---|---|---|
| `shell` | string | 环境探测 | 分类器方言提示；v2 无 `config` hook，不能读取 opencode 配置里的 shell，仅由此字段 + `SHELL` 环境变量 + 平台默认决定 |
| `securityEnabled` | boolean | `true` | 整体开关 |
| `strictness` | `"LOOSE"`（旧兼容拼写） | `"LOOSE"` | 只有一个当前策略；旧 HARD 输入被拒绝 |
| `failPolicy` | `"fail_open" \| "fail_close"` | `"fail_open"` | 所有插件检查故障的统一策略：基础设施／协议／超时、helper／沙箱／ptrace、broker、证据检查、会话查询、目标变化、缓存及未预期异常；`fail_open` 放行，`fail_close` 拒绝。真实安全拒绝和用户取消／撤销始终生效。`fail_open` 优先于 `sandbox.onUnavailable: "fail_close"`，加载时警告一次。旧 `fail_ask` 归一化为 `fail_close` |
| `dynamicReview.baseURL` | string | — | OpenAI-compatible base URL（自动补 `/chat/completions`）；仅 loopback 允许 http |
| `dynamicReview.model` | string | — | 模型 ID |
| `dynamicReview.apiKey` | string | — | API key（`apiKey`/`apiKeyEnv` 二选一） |
| `dynamicReview.apiKeyEnv` | string | — | 存 key 的环境变量名 |
| `dynamicReview.timeoutMs` | number | `30000` | 当前 effects/L3 链的**总预算**（1–120000）：每次尝试按“剩余预算 ÷ 剩余可用端点”分配，备用端点只在预算内运行。旧 Python 导出适配器仍按原语义把该值作为子进程预算：常规审查直接使用，提权审查器为 `max(timeoutMs, 120000)`；父进程把「预算 − min(2000, 预算/2) 毫秒」作为整次审查的唯一绝对期限 |
| `dynamicReview.onUncollectable` | `"allow" \| "deny"` | `"allow"` | 新 Linux 链路：补证耗尽且 `floor=no` 时的终局；不适用于 floor、协议或基础设施故障 |
| `dynamicReview.maxRounds` | number | `1` | 旧适配器兼容字段，范围 1–3；新冻结效果链只做有界补证后的一次复审 |
| `dynamicReview.allowFullReadAccess` | boolean | `false` | 允许审查器只读工具访问整个文件系统 |
| `dynamicReview.pythonPath` | string | PATH 查找 | Python 解释器 |
| `dynamicReview.auditorPath` | string | — | 已废弃：仅为兼容旧配置而接受，不再使用 |
| `dynamicReview.jev.enabled` | boolean | `true` | 关闭 JEV 审查链；显式 `false` 时不发起任何审查 |
| `dynamicReview.jev.endpoint` | string | `https://opencode.ai/zen/v1/systemone` | SystemOne 主端点；必须 https，仅 loopback 允许 http；禁止 userinfo 和 fragment |
| `dynamicReview.jev.model` | string | `jev-latest` | 主模型 ID；实际用于 effects 与 L3 请求，不再固定为冻结题组中的默认模型 |
| `dynamicReview.jev.apiKeyEnv` | string | `JEV_API_KEY` | 主端点密钥环境变量；`OC_API_KEY` 只作为主端点的兼容后备，不供备用端点使用 |
| `dynamicReview.jev.fallbacks` | array | `[]` | 最多两项同协议备用端点；每项必须提供自己的 `endpoint`、`model`、`apiKeyEnv`。缺密钥的备用会被跳过；无效端点/模型/环境变量名是硬配置错误，不会尝试其他端点 |
| `detachedStartIsolation` | boolean | `true` | supervisor 未激活时对 `start`/`Start-Process` 追加句柄隔离 |
| `slowCommands` | boolean | `true` | 拦截安全但必耗时的命令（系统/挂载树的无界扫描、`-f` 流式、超长 `sleep`），除非调用方显式给了 timeout。底层默认参数：`maxDepth=16`（find/rg/fd 的 `-maxdepth` 阈值，超过才拦）、`sleepThresholdSeconds=120`（sleep 阻断阈值，`>=` 即拦）、`allowExplicitTimeout=true`（调用方传入工具参数 timeout 时不拦） |
| `logReviewerTrace` | boolean | `false` | 完整审计轨迹开关。每轮动态审查写请求与结果/错误，另写最终裁决；不含原始命令或凭据。故障放行始终记录 `fail_open_pass` 和简短故障码：开启时写入 `~/.opencode/reviewer-trace.jsonl`，关闭时仅写入 `sandbox.scratch/reviewer-trace.jsonl`。可用时附加非阻断 metadata；日志写入失败不阻断调用 |
| `trustedCommands` | string[] | `[]` | 用户信任的命令及参数前缀，支持 `*` / `?`。读写会话中，整条 shell 调用仅含匹配命令且静态检查通过时，命令自身及其子进程的边界行为免动态审查。外部文件重定向、替换执行或未列入的附加命令不获此豁免；只读和显式保护仍优先。裸名不匹配 `./tool`；条目不能包含 shell 语法。详见下节 |
| `supervisorEnabled` | boolean | Windows 下 `true` | 使用原生 shell supervisor |
| `supervisorPath` | string | 包内默认 | supervisor `bash.exe` 路径 |
| `BypassClassifier` | string[] | `[]` | 永久豁免类别列表：`filesystem`/`host`/`privilege`/`secret`/`network`/`remote`/`indirection`/`dynamic`/`sandbox`/`slow`；未知类别警告并忽略 |
| `bypassLeaseTtlMs` | number | `0`（不限时） | 临时豁免与 Bypass 模式租约的默认时长（无 timeout 时使用）；`0` 表示不自然过期；否则到期为固定时刻，活动不续期，范围 60000–86400000 |
| `bypassPropagateToSubagents` | boolean | `true` | 子代理会话继承父会话的临时豁免 |
| `permission` | object | 见权限层表 | 会话 r/w 能力层：`default`/`webIsRead`/`registerTool`/`subagentPermission`/`actionMap`（详见「会话权限层」） |
| `configFile` | string | — | JSON 配置文件路径（加载器指令，不是插件字段） |

另支持 `reviewCommand`（仅测试注入用，插件自身从不装配）。

### trustedCommands：受信任 CLI 的运行时绕行

在插件的 `config.json`（或插件 options）中按需加入：

```json
{
  "trustedCommands": [
    "opencode",
    "ask-gemini",
    "agent-browser open *",
    "google-chrome --headless *"
  ]
}
```

这是信任授权，不是命令沙箱：请只列入你信任其**所有匹配参数及内部行为**的工具。默认列表为空，不自动信任已安装工具。配置加载仍是浅层覆盖，后配置的列表替换前列表；需重新加载插件后生效。

- 按 shell 拆分后的 argv 匹配，不以原始字符串的 `startsWith` 判断。无通配符时保持 argv 前缀语义；`*` 匹配词内任意字符、`?` 匹配一个字符，末尾独立 `*` 也匹配零个或多个参数。`agent-browser open *` 不匹配 `agent-browser close`；引号中的 `;` 只是参数数据。
- 裸名 `opencode` 匹配 PATH 命令，不匹配 `./opencode` 或 `/other/opencode`；绝对路径需单独配置。通配符只做匹配，不在配置中执行 shell 展开。
- `opencode run --session ses_... "prompt" 2>&1` 的工具日志写入、`ask-gemini` 的联网、匹配的浏览器及其子进程行为可以直接放行，不调用 JEV，也不据此生成其他命令可用的 L3 目录授权。
- `opencode api ... > /outside/abc.log`、`ask-gemini ...; other-command`、`opencode "$(other-command)"` 仍走原有边界审查。变量赋值／环境前缀、无法解析的复合脚本也不走此运行时捷径。
- 此捷径只用于具有完整读写权限的会话；取消、授权撤销、静态底线及当前边界的显式写保护仍优先。首次可放行边界即授权整条受信任调用脱离系统调用观察，保持 CLI 子进程及浏览器启动的原生行为；随后内部行为不再逐次检查，但取消监督仍保留。不要用宽泛规则信任 shell／解释器，否则它们执行的任意载荷也会被信任。

### 可写目录与 mkdir

**Linux 的 `/tmp` 本身及全部真实后代在所有模式下都可写，包括只读和 Auto。插件不对其中任何目录或文件施加写保护**：不因凭据式文件名、工作区位于 `/tmp`、内部目录命名或 `denyWrite` 条目而例外拦截；`denyWrite` 中解析到 `/tmp` 的条目会被忽略。符号链接若指向 `/tmp` 外部，实际外部目标不享受此授权。只读权限限制仍保护 `/tmp` 之外的非临时目标；敏感内容的读取审查不受这项写授权影响。

**原生 Windows（`process.platform === "win32"`）的 `$env:TEMP` 采用相同写授权**，覆盖目录本身和全部真实后代，包括凭据式文件名；路径比较遵循 Windows 的盘符、大小写和目录边界规则。支持识别 `$env:TEMP`、`${env:TEMP}` 和 `%TEMP%` 路径写法。指向 TEMP 外部的符号链接／junction 不享受此授权；未设置或非绝对的 TEMP 不会推测为任意目录。此为共享路径策略，当前 Linux 运行时观察器不等于 Windows 原生执行验证。

其他可写根目录的授权覆盖根目录本身及其普通子目录；根目录尚不存在时，也允许 `mkdir -p` 创建它及所需的缺失父目录。对已存在条目的 `mkdir` 不会修改它，只保留系统原有的成功／`EEXIST` 结果，不因前置 `mkdir -p /tmp/opencode` 而安全阻断整条命令。父目录例外仅允许建目录，不授权重命名、删除或修改父目录内容；`/tmp` 之外的显式保护仍有效。

内部运行时通信目录已移至 `~/.opencode/run/security-boundary-*`，与可写临时工作区分开。`/tmp/opencode` 不再整树标记为保护区，普通临时目录、子目录和文件写入无需经过内部通信目录的保护判定；真正的通信目录仍受保护。旧的已加载实例需重新加载插件后才采用此布局。

## 与 v1 的行为差异（v2 约束所致）

1. **全自动失败处理**：不再暴露 `fail_ask` 模式；旧配置值兼容读取为 `fail_close`，无需编辑现有配置。审查器不可用、模型否决、证据限制与权限底线各有明确来源，没有等待用户确认的分支。
2. **拒绝语义**：`execute.before` 是 v2 唯一可失败的 tool hook（失败通道 `Tool.Error`，`execute.after` 为 `never`）。effect 形态下，宿主运行每个 hook 回调返回的 `Effect`；本插件把判定主体包在 `Effect.tryPromise({ try, catch })` 里，所有阻断都经 `catch` 路由成一个 `_tag: "Tool.Error"` 的值（源码核实：session runner 对 `_tag === "Tool.Error"` 的失败执行 `catchTag` → `failTool`，把消息作为**本次工具调用**的失败返回给模型；其他失败会让整个 step 失败）。`catchTag` 按 `_tag` 判别，故假对象无需是真正的 `Tool.Error` 实例。静态/动态/policy 拒绝消息带有“跳过不必要步骤或申请提权，不要尝试替代方式绕过检查”的指导。
3. **目录解析**：v2 ctx 无 `directory/worktree`，按会话从 `ctx.session.get().location.directory` 解析（带 30 分钟 TTL 与 512 条目上限的缓存），失败回退 `process.cwd()`。effect ctx 下 `ctx.session.*` 返回 `Effect`，经插件内部捕获的宿主 runtime 桥接运行，保留宿主服务。
4. **会话清理**：`session.deleted` 事件经 `ctx.event.subscribe()`（`Stream`）以 `Stream.runForEach` + `Effect.forkScoped` 消费；插件 scope 关闭时中断 fiber，事件形状为 `{ type, data: { sessionID } }`。

## Windows 进程 supervisor

与 v1 相同：Windows 下若 `native/windows-bash-supervisor/target/release/bash.exe` 存在，则把真实 shell 放入 Job Object，避免后台子进程持有输出管道导致 opencode 挂起。真实 shell 经 `create.before` 注入 `OPENCODE_REAL_BASH`（取 v2 已解析的 `ev.shell`，无硬编码回退；缺失时 supervisor 以状态 125 退出）。非 Windows 平台自动跳过。

重新构建 supervisor：

```bash
cargo build --release --manifest-path native/windows-bash-supervisor/Cargo.toml
```

## 安全边界

- 这是纵深防御：静态分类器、动态审查器、Linux OS sandbox（启用时）、r/w 权限层与 opencode 原生权限共同构成边界。
- `sandbox` 类别可逐次移除当前 shell 调用的 Linux OS sandbox；其他静态、动态、permission 与原生权限层仍在。`sandbox` 不是关闭整个插件的别名。
- `privilege` 类别与 OS 沙箱的一致性：bwrap 无条件设置 NO_NEW_PRIVS 并丢弃 capabilities，`sudo`/`chown` 在沙箱内会**静默失败**。因此当生效豁免集合含 `privilege` 且命令需要特权时，该次调用不以沙箱包裹（host-direct）；无法去沙箱（ro profile）时显式终止（fail-loud）。生效集合不含 `privilege` 时，即使审查器 ALLOW 也在动态审查前显式终止，并提示用 `/bypass privilege` 或在提权时附加 `privilege`——绝不静默运行时失败。
- 静态分类与 LLM 审查都会出错；`ALLOW` 只是风险降低，不保证安全。
- 动态审查器会收到命令、路径与本地脚本内容；启用第三方端点前请阅读 v1 README 的披露说明。
- opencode 原生权限系统仍在本插件之后运行，是最终关卡。

## 慢命令检测已知限制

- **Windows / PowerShell 不生效**：慢命令检测的 `isExpensiveRoot` 要求路径以 `/` 开头（`C:\…` 直接返回 false），PowerShell 输入整体跳过（避免误报），因此在 Windows 下实际零效果。
- **双层以上包装壳不追踪**：`bash -c "…"` 递归解包上限为 2 层；三层及以上嵌套（如 `bash -c 'bash -c "bash -c \"sleep 999\""'`）不会被检测到。
- **`cd` 链不追踪**：`cd / && find .` 中的 `.` 按工具启动 cwd 解析，不会跟随 `cd /`。

## TUI 常驻指示器

TUI 伴随在输入框正上方（`session.composer.top` 槽位）常驻渲染当前会话的权限与豁免状态：淡绿 `[RO]`（会话缺写位）、橙 `[RW, Bypassing:<类别>]`（豁免生效中）、灰 `[RW]`（无限制）。状态来自实时 `BypassRpc` 事件，外加每次会话切换时的 `status` method 拉取——重连或后挂载的 TUI 永远不会显示过期状态（过期的指示器比没有更危险）。豁免跳变的 toast 行为不变。宿主在加载时编译 `.tsx`（运行时 solid 转译 + 注入 solid-js/@opentui 模块），插件保持零构建。
