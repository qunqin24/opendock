# opencode-v2-security

OpenCode v2 全自动执行边界安全插件：在原生 `shell` 执行前形成原因报告，进行自动 LLM 审查、自动采证与单次授权，同时执行会话权限上限。没有等待人工确认的判定分支。插件使用 v2 effect 插件 API（`{ id, effect(ctx) }`，`effect` 返回 `Effect.Effect`）。

1.5.0 保持现有配置和 category 名称兼容；研究和冻结验证依据见 [RESEARCH-v1.5.0.md](./RESEARCH-v1.5.0.md)。授权针对同一命令与事实报告，不把未选项的绝对概率、弱提示或批准后的随机重审当成新的拒绝理由。

## v1 → v2 hook 映射

| v1（opencode 1.x） | v2（本插件实现） | 说明 |
|---|---|---|
| 函数插件 `{ id, server }` | `export default { id, effect(ctx) }`，`effect` 返回 `Effect.Effect<void>` | v2 effect 插件形状（阻断为单次调用的 typed `Tool.Error` 失败；hook 回调返回 `Effect`） |
| `config` hook（覆写 config.shell） | `ctx.shell.hook("create.before")` | spawn 前改写 `ev.shell`/`ev.env` |
| `shell.env`（注入 `OPENCODE_REAL_BASH`） | 同上（`ev.env.OPENCODE_REAL_BASH = ev.shell`） | 仅 Windows 且 supervisor 二进制存在时生效 |
| `tool.execute.before` | `ctx.tool.hook("execute.before")` | 静态 + 动态审查管线；`ev.input` 可变（`timeout`/`command`） |
| `tool.execute.after` | `ctx.tool.hook("execute.after")` | HARD 失败记录；exit 读 `ev.result.metadata.exit` |
| 工具名 `bash` / `apply_patch` | `shell`（兼容 `bash`）/ `patch`（兼容 `apply_patch`） | `patch` 检查 `input.patchText` |
| `bash_classifier_confirm` + `context.ask` | **已移除** | v2 `Tool.Context` 无 `ask`，`fail_ask` 归一化为 `fail_close`（见下） |
| `client.session.abort` | `ctx.session.interrupt({ sessionID })` | HARD 绕过检测时 best-effort 中断会话 |
| `event` hook（`session.deleted`） | `ctx.event.subscribe()`（`Stream`）`Stream.runForEach` + `Effect.forkScoped` | wire 事件 `{ type, data: { sessionID } }`；插件 scope 关闭时中断消费 fiber（替代手动 cleanup 循环） |
| `pluginContext.directory/worktree` | `ctx.session.get({sessionID}).location.directory`（按会话缓存，回退 `process.cwd()`） | v2 ctx 无 directory 域 |
| 配置来源 `rawOptions` | `ctx.options` + `options.configFile` | `plugins` 配置项 `{ package, options }` |

## 安装

在 `opencode.json` 的 `plugins` 数组（v2 用复数键）引用 npm 包：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-v2-security@1.5.0",
      "options": {
        "strictness": "HARD",
        "failPolicy": "fail_open",
        "dynamicReview": {
          "baseURL": "https://api.example.com/v1",
          "model": "your-model-id",
          "apiKeyEnv": "MY_REVIEW_API_KEY"
        }
      }
    }
  ]
}
```

将 `MY_REVIEW_API_KEY` 设为可供 OpenCode 服务读取的环境变量，并把示例 endpoint 与模型换成实际的 OpenAI-compatible 服务；没有可用的动态审查器时，单次提权申请会被拒绝。纯 TS，无构建步骤（v2 直接加载 `.ts`）。重启 OpenCode 后生效。若使用本地源码而非 npm 包，可把 `package` 换为源码目录的绝对路径。

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

**临时豁免**——会话内 slash 命令 `/bypass [category](,[category]) ([timeout])`（服务端注册命令，参数不进模型上下文）。实现为**固定到期租约**：内存存储，arm 时刻确定绝对到期点，**活动/子代理干活绝不续期**——设 120 就是 120 秒后失效。末尾可跟一个数字作为超时秒数（如 `/bypass fs 120`）；不带超时使用默认 `bypassLeaseTtlMs`（20 分钟，可调 1min–24h）；超时为 `0` 或负值（如 `/bypass fs -1`）表示永不自然过期，直到 `/bypass off`、会话删除或服务重启。非法/非数字/多余 token 原子拒绝，不改租约。单独 `/bypass 0` 仍是清空租约的兼容别名。

- 多次 arm 叠加：`/bypass host` 后再 `/bypass network` = `{host, network}`；`off` 清空。每次 arm 的 timeout 作用于该会话**整体租约**（覆盖其到期时间）；不带 timeout 的新 arm 把到期重置为默认值。
- 兼容别名只在输入边界展开：`fs` → `filesystem`，`os` → `host+privilege+indirection`，`web` → `network+remote`。注意 `os` 是历史收窄后的写法，**不再覆盖 `remote`**（`git.remote-history-rewrite`、`infrastructure.*`、`database.*` 需要 `remote` 单独武装）。状态、RPC、提示词与永久配置状态只使用规范类别名；永久 `BypassClassifier` 若输入别名会展开并警告，不会把别名存为类别。
- `*` 或小写 `all` 武装全部十类；大写 `ALL` 是关闭本插件全部检查的独立 kill switch。它们是 `/bypass` 的控制语法，不是类别；提权注释和永久 `BypassClassifier` 都禁止使用 `all/*/ALL`。
- **子代理传导**（默认开，`bypassPropagateToSubagents: false` 关闭）：子代理会话继承父会话（沿祖先链并集）的 armed 类别与相同到期语义；继承是只读的，子代理活动不会延长父租约。

### 通知（agent 与用户分离）

权限状态说明不是新的会话输入。`session.synthetic` 属于持久化 input admission，不能作为权限变化通知使用。状态反馈分两条通道：

- **agent 侧**：`session.hook("context")` 在下一次真实模型请求中注入当前有效权限与 bypass 状态。变更、继承和到期只更新状态快照，不追加 synthetic/prompt、不启动 idle runner，不堆积过期授权消息。
- **用户侧**：服务端注册 event-only RPC（`src/bypass-rpc.ts`），由本包的 TUI 伴随入口（`src/tui.ts`，package `exports["./tui"]`）订阅并弹 toast 显示 armed/updated/cleared/expired/status。参数非法时命令抛错，TUI 显示 usage；usage 不再回显给 agent。
- 下一次模型请求读取最新状态；到期或清除后不会残留旧的有效授权说明。显式用户命令自身的正常执行不属于“权限提醒额外唤醒”。
- 无 TUI 伴随时，context 中的权限边界仍生效；旧 host 缺 context hook 时不回退为会唤醒会话的新输入。
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
- 单次提权必须有已配置且可用的 `dynamicReview` 端点、模型与密钥，并取得独立 LLM 审查器的批准。配置缺失或审查器不可用时申请会被拒绝，命令不执行；静态预检不会兜底批准。此时提权申请仍按失败处理，与显式设置 `escalationEnabled: false`（提权前缀作为普通注释）不同。
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

arm 后命令不会被静态层直接 ALLOW：豁免对应检查后以 `bypass.static-allow` ASK 交常规动态审查器（配合对应 BYPASS RULE 提示词裁决）；若常规审查器不可用，按 `failPolicy` 处理（默认 `fail_open`，需在故障时拒绝则设为 `fail_close`）。单次提权申请则始终需要独立 LLM 审查器批准，审查失败时拒绝。v1.3.0 将无法确定是惰性载荷还是执行内容的情况交给动态层；可证明实际执行的底线仍拒绝。仅写入、打印或保存危险示例不等于执行，但实际写入目标、命令替换及同次调用中后续执行仍须审查。

## 会话权限层（r/w 能力上限）

与 bypass 正交的收紧型 r/w 能力层：每个会话以 `rw` 为默认能力基线；内部保留 `x` 位用于兼容和标签显示，但 `x` 始终可用且不可切换。UI 因此显示 `rwx`（RO 显示 `r-x`），不代表 `permission.default` 可以授予或撤销 x。生效 r/w 能力 = `permission.default` ∩ 所有祖先基线 ∩ 自身基线。代理工具只能收紧，用户 `/perm` 可调整本会话基线；祖先上限始终生效。

语义：`r` = read/grep/glob/web/skill/question/subagent/task 等读取或委派类动作；`w` = edit/write/patch 与未知 MCP 动作。shell 保持可调用，其写形命令由静态分类器和 RO sandbox 阻断。

### 执行面

- **`ctx.permission.hook("evaluate")`**（主通道）：每次工具权限断言都经过它，缺位即把 `ev.effect` 降为 `"deny"` 并附说明。只收紧、永不放宽已计算的 effect。
- **分类器 `permScope` 兜底**：无 `w` 时写/删形段 DENY（规则 `permission.write`）；类别豁免不能越过此权限拒绝。`permission.write` 是独立权限天花板，不被解释为模型反悔，也不进入等待用户确认的路径。
- **`set_permission` 原生工具**（`codemode:false`，`permission.registerTool` 可关）：模型只能收紧**直接子会话**（`session.created` 记录的父子链，回退 `session.get().parentID` 在线查证）；`sessionID` 为必填参数，缺失、空值、caller 自身、孙代或任意会话一律以 `Tool.Error` 形错误 fail closed；放宽同样拒绝。
- **子代理 `permission` 参数**（`permission.subagentPermission` 可关）：RO 父会话可以创建 RO 子代理；子会话继承父上限。若声明更窄权限，`session.created` 时立即绑定，并由 `execute.after` 再确认。
- **slash 命令**：`/perm <ro|rw|w|none> [sessionID]`，用户可调整本会话或后代会话基线；祖先上限仍生效。

权限字符串：`r`/`ro`/`r--`/`4`、`w`/`-w-`/`2`、`rw`/`rw-`/`6`、`none`/`0`。任何含 `x` 的输入和八进制 `1/3/5/7` 都拒绝。

### bypass vs permission

| | `/bypass` / 单次提权 | `set_permission` + `/perm` |
|---|---|---|
| 作用 | 按类别放宽分类器检查 | 按能力位硬拒整个动作类 |
| 谁能调 | 用户 `/bypass`；代理注释须经独立审查 | `set_permission` 代理仅收紧；`/perm` 用户可调整 |
| 方向 | 按类别临时放宽 | 代理仅收紧；用户可恢复，但祖先仍封顶 |
| 时效 | 固定到期租约（默认 20min，可带秒超时；`<=0` 不过期），不随活动续期 | 会话生命周期，`session.deleted` 清除 |

优先级：permission deny 是硬拒绝，与 bypass 独立——arm 了 filesystem 豁免但 `w` 被剥除时，写操作仍被 `permission.write` 拦下。

### 权限变更通知

复用 bypass 的两条通道：agent 侧在生效集合跳变时追加明确的用户授权 synthetic 消息（首次等于 default 时不发）；用户侧走 `BypassRpc` 的 `permission` 事件，TUI 伴随弹 toast。

### 配置

| Option | 类型 | 默认 | 说明 |
|---|---|---|---|
| `permission.default` | string | `"rw"` | 每个会话的 r/w 能力基线上限 |
| `permission.webIsRead` | boolean | `true` | `false` 时 webfetch/websearch 不再计入 `r`（该 action 从映射删除，不再受权限约束） |
| `permission.registerTool` | boolean | `true` | 是否向模型注册 `set_permission` 工具 |
| `permission.subagentPermission` | boolean | `true` | 是否为 subagent/task 工具增加 `permission` 参数 |
| `permission.actionMap` | object | 内置映射 | action → `"r"\|"w"\|"x"` 覆盖；删除某 action 即不受权限约束 |

UI label 显示 `rwx`（RO 为 `r-x`），因为 `x` 始终可用且不可切换；这不改变 `permission.default` 的 `rw` 默认值。

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
| `strictness` | `"LOOSE" \| "HARD"` | `"LOOSE"` | 静态规则集 + 动态系统提示 |
| `failPolicy` | `"fail_open" \| "fail_close"` | `"fail_open"` | 常规动态审查器不可用/失败时的自动处理；单次授权审查失败仍拒绝。旧 JSON 值 `fail_ask` 仅作兼容输入归一化为 `fail_close`，不是可选择的人工确认模式 |
| `dynamicReview.baseURL` | string | — | OpenAI-compatible base URL（自动补 `/chat/completions`）；仅 loopback 允许 http |
| `dynamicReview.model` | string | — | 模型 ID |
| `dynamicReview.apiKey` | string | — | API key（`apiKey`/`apiKeyEnv` 二选一） |
| `dynamicReview.apiKeyEnv` | string | — | 存 key 的环境变量名 |
| `dynamicReview.timeoutMs` | number | `30000` | Python 审查超时（1–120000）。常规动态审查直接使用该值；提权审查器开启 thinking、真实延迟常达数十秒，因此其子进程预算为 `max(timeoutMs, 120000)`。父进程把「预算 − min(2000, 预算/2) 毫秒」作为**整次审查的唯一绝对期限**经环境变量下发给两个 Python reviewer（严格小于任何正预算；覆盖动态审查的全部工具轮次），慢端点因此返回干净的传输错误而不是被 SIGKILL |
| `dynamicReview.maxRounds` | number | LOOSE `1`，HARD `2` | 工具轮数（LOOSE 1–3，HARD 1–5） |
| `dynamicReview.allowFullReadAccess` | boolean | `false` | 允许审查器只读工具访问整个文件系统 |
| `dynamicReview.pythonPath` | string | PATH 查找 | Python 解释器 |
| `dynamicReview.auditorPath` | string | 内置 `auditor.py` | 审查脚本路径 |
| `detachedStartIsolation` | boolean | `true` | supervisor 未激活时对 `start`/`Start-Process` 追加句柄隔离 |
| `slowCommands` | boolean | `true` | 拦截安全但必耗时的命令（系统/挂载树的无界扫描、`-f` 流式、超长 `sleep`），除非调用方显式给了 timeout。底层默认参数：`maxDepth=16`（find/rg/fd 的 `-maxdepth` 阈值，超过才拦）、`sleepThresholdSeconds=120`（sleep 阻断阈值，`>=` 即拦）、`allowExplicitTimeout=true`（调用方传入工具参数 timeout 时不拦） |
| `logReviewerTrace` | boolean | `false` | 审计轨迹开关。为真时每次动态审查（判决或错误）及每次动态缓存命中（allow/deny）向 `~/.opencode/reviewer-trace.jsonl` 追加一行 JSONL（含时间戳、命令、endpoint/model、判决/原因/错误）；写入失败静默忽略，不影响审查流程 |
| `trustedCommands` | string[] | `[]` | 用户信任的命令前缀（如 `"agent-browser"`、`"opencode2 --version"`）。仅在 LOOSE 读写会话生效：某段 argv 以其中一项开头、且所有危险扫描都通过时静态 ALLOW。裸名只匹配 PATH 查找（`./tool` 不匹配 `tool`）；条目含 shell 语法时配置报错 |
| `supervisorEnabled` | boolean | Windows 下 `true` | 使用原生 shell supervisor |
| `supervisorPath` | string | 包内默认 | supervisor `bash.exe` 路径 |
| `BypassClassifier` | string[] | `[]` | 永久豁免类别列表：`filesystem`/`host`/`privilege`/`secret`/`network`/`remote`/`indirection`/`dynamic`/`sandbox`/`slow`；未知类别警告并忽略 |
| `bypassLeaseTtlMs` | number | `1200000`（20 分钟） | 临时豁免租约默认时长（无 timeout 时使用）；到期为固定时刻，活动不续期；范围 60000–86400000 |
| `bypassPropagateToSubagents` | boolean | `true` | 子代理会话继承父会话的临时豁免 |
| `escalationEnabled` | boolean | `true` | 是否允许代理通过 `# - REQUIRE_ESCALATION` 三行前缀申请单次提权。为 `false` 时该前缀只是普通 shell 注释（命令照常分类），不会调用提权审查器或写入提权失败记录，且所有阻断文案不再提及提权机制；常规动态审查器仍可能按分类结果运行，`/bypass`、`/perm`、`BypassClassifier` 不受影响 |
| `permission` | object | 见权限层表 | 会话 r/w 能力层：`default`/`webIsRead`/`registerTool`/`subagentPermission`/`actionMap`（详见「会话权限层」） |
| `configFile` | string | — | JSON 配置文件路径（加载器指令，不是插件字段） |

另支持 `reviewCommand`（仅测试注入用，插件自身从不装配）。

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
