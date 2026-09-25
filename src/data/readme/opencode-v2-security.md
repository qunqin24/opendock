# opencode-v2-security

OpenCode v2 执行边界安全插件：在原生 `shell` 工具执行命令前进行静态审查，并可配置动态 LLM 审查、单次提权和会话权限上限。插件使用 v2 effect 插件 API（`{ id, effect(ctx) }`，`effect` 返回 `Effect.Effect`）。

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
      "package": "opencode-v2-security@1.0.1",
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

动态审查提示词按当前生效类别组装。授权只来自插件验证后的会话状态或经独立审查器批准的严格提权头；命令、文件内容及其他注释中的同名文字不能开启豁免。历史拒绝按当前权限重新判断。

正常 API Bearer 鉴权和 SSH 密钥认证与凭据外传分开判断。审查器自身的文件读取权限与被审命令权限独立，`secret` 豁免不会让审查器读取真实秘密文件。`dynamic` 类别跳过常规动态审查器，始终按「审查器不可用 + `fail_open`」路由，不受配置的 `failPolicy` 影响；不可绕过底线和会话权限仍优先。

为降低误判与过度谨慎，用户可按类别豁免检查。两类机制：

**永久豁免**——`config.json`（或 options）里：

```json
{ "BypassClassifier": ["filesystem", "secret"] }
```

**临时豁免**——会话内 slash 命令 `/bypass <category|*|all|ALL|off>`（服务端注册命令，参数不进模型上下文）。实现为**活动续期租约**：内存存储，默认 TTL 20 分钟（`bypassLeaseTtlMs` 可调，1min–24h），会话有活动事件（查看、收件、执行、shell 启动）即续期；关掉 TUI 或服务重启后失效，必须重新 arm。

- 多次 arm 叠加：`/bypass host` 后再 `/bypass network` = `{host, network}`；`off` 清空。
- 兼容别名只在输入边界展开：`fs` → `filesystem`，`os` → `host+privilege+indirection`，`web` → `network+remote`。注意 `os` 是历史收窄后的写法，**不再覆盖 `remote`**（`git.remote-history-rewrite`、`infrastructure.*`、`database.*` 需要 `remote` 单独武装）。状态、RPC、提示词与永久配置状态只使用规范类别名；永久 `BypassClassifier` 若输入别名会展开并警告，不会把别名存为类别。
- `*` 或小写 `all` 武装全部十类；大写 `ALL` 是关闭本插件全部检查的独立 kill switch。它们是 `/bypass` 的控制语法，不是类别；提权注释和永久 `BypassClassifier` 都禁止使用 `all/*/ALL`。
- **子代理传导**（默认开，`bypassPropagateToSubagents: false` 关闭）：子代理会话继承父会话（沿祖先链并集）的 armed 类别；子代理干活会续期父会话租约。

### 通知（agent 与用户分离）

v2 不存在“用户可见但模型不可见”的会话消息类型：`synthetic`/`system`/`shell` 都会进入模型上下文，且无 `description` 的 `synthetic` 在 TUI 聊天里还会被过滤掉。因此状态反馈分两条通道，互不共用：

- **agent 侧**：以 `session.synthetic`（`resume:false`）追加一条普通 user 消息。内容明确写成 “The user temporarily allowed…” 的可信用户授权说明，并逐项解释实际放宽的检查；它不再使用 `<system_reminder>` 或注入样式包装。仅在状态跳变时发送，不主动唤醒会话。
- **用户侧**：服务端注册 event-only RPC（`src/bypass-rpc.ts`），由本包的 TUI 伴随入口（`src/tui.ts`，package `exports["./tui"]`）订阅并弹 toast 显示 armed/updated/cleared/expired/status。参数非法时命令抛错，TUI 显示 usage；usage 不再回显给 agent。
- “是否变化”以**已告知 agent 的集合**为准（而非当前 `activeBypass`）：sweep 运行时租约已过期，若按当前集合重算会得出“无变化”而漏报到期的结束提示。
- 无 TUI 伴随（旧 host 无 RPC 域或未加载 CLI 插件）时静默降级：agent 警告仍生效，用户 toast 不可用。
- **本地目录安装**：host 对“目录”形式的插件目标只解析 `<dir>/index`（server）与 `<dir>/tui`（TUI），不看 package.json exports；因此仓库根有 `index.ts` / `tui.ts` 两个薄转发文件。npm 包则走 `exports`。

### 类别语义

| 类别 | 豁免内容 |
|---|---|
| `filesystem` | 文件系统检查：项目文件删除、数据破坏、重定向覆写、归档解包等 |
| `host` | **运行中系统状态**：进程/服务管理（systemctl、kill）、电源、包安装、持久化与反取证变更 |
| `privilege` | **跨越权限/隔离边界**：sudo/doas/pkexec/su/sudoedit/runuser/setpriv/capsh、chown/chgrp/权限位与 setcap/setfacl、用户与身份管理（useradd/usermod/userdel/passwd/chpasswd/visudo）、内核参数（`sysctl -w`、写 `/proc/sys`）、命名空间逃逸、内核模块与内核操作（modprobe/insmod/rmmod/kexec）、特权容器（`--privileged`/`--pid=host`/挂 docker.sock）、防火墙/MAC 边界（iptables/nft/ufw/setenforce）与 loop 设备（losetup）。`privilege` 同时改变沙箱路由：生效集合含 `privilege` 且命令在**命令位置**执行需要 OS 特权的操作（上述各族 + 设置 setuid/setgid 位的 chmod；按 `;`/`&&`/`||`/`|`/换行分段判定，`sh -c`/`eval`/命令替换载荷递归检查；字符串、参数、注释位置出现这些词一律不触发）时，生效集合含 `privilege` 的**该次调用以 host-direct 运行（不包裹 OS 沙箱）**；rw profile 复用既有 `sandbox.allowSudo`/host-direct 路由经 helper 执行。若该次无法去沙箱（ro profile 忽略 allowSudo），改为**终止型显式拒绝**（fail-loud），文案指向 `/bypass sandbox`、提权时附加 `sandbox` 类别、或配置 `sandbox.allowSudo`。生效集合**不含** `privilege` 的，即使动态审查器 ALLOW 也不让命令在沙箱内静默失败：该次调用在动态审查前即**终止型拒绝**，文案要求 `/bypass privilege` 或在提权时附加 `privilege`（rw profile 只有 `sandbox.allowSudo` 提供 host-direct 路由；`sandbox` 类别或 `mode:"full"` 已去沙箱时不触发）。host-direct 那次调用会向 agent 追加一条 `opencode-v2-security:` 前缀提醒（开启 `logReviewerTrace` 时另附审计行）。限制：命令位置与 `sh -c`/`eval`/命令替换载荷之外，交给 shell 消费的 heredoc 脚本体（`bash <<'EOF' … EOF`、`sh <<EOF … EOF`，引号与否皆可；`sudo`/`env`/`command` 前缀亦可）同样识别；但 heredoc 体交给非 shell 消费者（`cat`/`python3`/`tee`）以及经 stdin 管道（如把 `echo 'sudo id'` 管给 `sh`）不在识别范围内 |
| `secret` | 凭据/敏感文件检查：`.env`、`~/.ssh/*`、`/etc/shadow`、`/proc/*/environ` 的读取/修改/删除。读取需要 `secret`，修改/删除需要 `filesystem+secret` 合取 |
| `network` | 网络目的地与数据传输；不自动豁免秘密内容或远端破坏 |
| `remote` | 下载执行、远端仓库历史、数据库、云与集群状态变更 |
| `indirection` | 本地脚本、解释器包装、编码载荷、动态展开及无法完成的静态检查 |
| `dynamic` | **跳过动态 LLM 审查器**（静态层仍生效；跳过审查器始终按「不可用 + fail_open」处理，无视配置的 `failPolicy`） |
| `sandbox` | 本次 shell 移除 Linux OS sandbox；分类器、动态审查与权限层仍运行 |
| `slow` | 跳过慢命令优化拦截 |

规则可以要求多个类别，且按合取处理：删除凭据需要 `filesystem+secret`，凭据外传需要 `secret+network`，远端下载执行需要 `network+remote`。只武装其中一类不会放行另一类风险。

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
- 插件把用户当前输入、最近上下文、当前权限、命令、类别、理由及本会话既往失败申请交给独立 direct Python reviewer；它开启 thinking、关闭 JSON output，且最终只输出 `allow_once`、`ask_user` 或 `deny`。
- 单次提权必须有已配置且可用的 `dynamicReview` 端点、模型与密钥，并取得独立 LLM 审查器的批准。配置缺失或审查器不可用时申请会被拒绝，命令不执行；静态预检不会兜底批准。此时提权申请仍按失败处理，与显式设置 `escalationEnabled: false`（提权前缀作为普通注释）不同。
- **送审前 floor 预检**：插件先用「会话现有类别 ∪ 本次请求类别 ∪ 全部静态类别」（reviewer 可能给出的最大授权；底线规则本就对任何类别免疫，全类别武装下仍命中的终结规则不可能被任何授权清除，也避免未请求的普通规则或前段的普通 DENY 遮蔽同脚本后段的底线规则）跑一遍静态分类；若结果命中任何**终结规则**——不可绕过底线（`isFloorRule`）、`permission.write` 权限上限、或不可审查输入（`input.empty`/`input.opaque`；opaque 的判定是 ASK，同样在 reviewer 之前短路，不会白调 reviewer）——则**短路**：不调用 reviewer，直接返回终结型拒绝并说明"提权无法越过硬底线"。该静态拒绝**不写入** reviewer 拒绝历史（静态预检不是 reviewer 的 deny 决定），但重复提交仍会在同一预检处再次被拒；仅有未映射的普通规则不在此短路（它们交给 reviewer 正常审查）。
- `allow_once` 只对当前 shell 调用有效。插件随后按“会话现有类别 ∪ 本次批准类别”继续执行未被这些类别豁免的普通静态/动态/permission/sandbox 检查（不是全绕过），也不会改变会话租约。若批准类别含 `privilege` 且命令需要特权，该次调用按上表语义以 host-direct 运行（或 fail-loud）。
- 提权审查器单独限速为任意滚动 3 秒最多启动 2 次；仅此 reviewer 限速，普通分类和常规动态审查不限速。
- `ask_user` 或 `deny` 后，本会话不能再对相似命令重复申请；相似判断读取本会话与**祖先会话链**（父子 subagent 链，最多 64 级）失败记录的只读并集，子会话逐字重试父会话已被拒的申请同样被本地拒绝。失败历史最多保留 8 条；达到上限后，为保持有界且不重新开放旧失败，本会话后续注释提权全部 fail closed。用户仍可直接使用 `/bypass` 授权；`/bypass` 本身不清除记录。记录只在 `session.deleted` 事件或插件卸载时清除，因此“本会话不得对相似命令重复申请”这一限制不受 `/bypass` 影响。
- 无法通过再次提交注释申请解决的提权失败（已在途、历史容量饱和、相似命令被拒、审查器不可用、会话上下文读取失败、会话结束、reviewer 的 `ask_user`/`deny`）使用**终结型结尾**：引导跳过该步骤或请用户用 `/bypass <请求类别>`（无类别时为 `/bypass` 或 `/perm`）授权，不再拼接“ask for escalation”；审查器基础设施错误额外说明“本次未记录失败、稍后可用同一申请重试”。所有 agent 侧提醒（bypass 生效/结束/ALL/权限变更）以 `opencode-v2-security:` 前缀标明来源。

### 不可绕过底线

以下规则任何类别都不豁免，且在**完整脚本**上判定（不受 `|`/`&`/`;` 段拆分影响）：

- `filesystem.root-delete`（含 `/etc`、`/usr`、`/lib`、`/lib64`、`/sys`、`/proc`、`/mnt` 等 15 个系统根的**裸根或直接 glob**；根下的普通子路径如 `/var/tmp/...`、`/home/user/proj` 属 scoped 删除，可被 filesystem 豁免）、`brace-root-delete`、`root-glob-delete`、`find-delete-root`（`rm` 与 `find` 共用同一系统根列表）；
- `disk-destruction`；
- `execution.fork-bomb`（引号内容视为惰性文本；要求函数名作为管道一侧的命令词形成递归核心，`:(){ :|:& };:`、单侧递归 `f(){ f | g; }; f`、`while :; do $0& done` 均命中；`build(){ npm run build | tee log; }; build` 这类正常函数不误报）；
- `kernel-trigger`、`kernel-core-pattern`（覆盖重定向/`dd of=`/命令位的 `tee`/`cp`/`mv`/`rsync`/`install` 写入（目的地可为带引号、后接注释或重定向）及 `sysctl -w kernel.core_pattern=`；`echo tee /proc/...` 这类惰性文本不误报；读方向的 `cp /proc/sysrq-trigger /tmp/x` 不命中）；
- `network.reverse-shell`、`execution.literal-shell`。

动态审查器的 BYPASS RULE 提示词同样声明这些保持 DENY。

### 静态放行语义

arm 后命令不会被静态层直接 ALLOW：豁免对应检查后以 `bypass.static-allow` ASK 交常规动态审查器（配合对应 BYPASS RULE 提示词裁决）；若常规审查器不可用，按 `failPolicy` 处理（默认 `fail_open`，需在故障时拒绝则设为 `fail_close`）。单次提权申请则始终需要独立 LLM 审查器批准，审查失败时拒绝。无 bypass 的会话行为与旧版一致——仅有的例外是三类**修复目标**：fork bomb 全形状、`tee`/`cp`/`sysctl` 形式的 kernel 写入、`/lib64` 系统根——旧版这些只被兜底 ASK 挡住，现在被对应 floor 规则正确 DENY。

## 会话权限层（r/w 能力上限）

与 bypass 正交的收紧型 r/w 能力层：每个会话以 `rw` 为默认能力基线；内部保留 `x` 位用于兼容和标签显示，但 `x` 始终可用且不可切换。UI 因此显示 `rwx`（RO 显示 `r-x`），不代表 `permission.default` 可以授予或撤销 x。生效 r/w 能力 = `permission.default` ∩ 所有祖先基线 ∩ 自身基线。代理工具只能收紧，用户 `/perm` 可调整本会话基线；祖先上限始终生效。

语义：`r` = read/grep/glob/web/skill/question/subagent/task 等读取或委派类动作；`w` = edit/write/patch 与未知 MCP 动作。shell 保持可调用，其写形命令由静态分类器和 RO sandbox 阻断。

### 执行面

- **`ctx.permission.hook("evaluate")`**（主通道）：每次工具权限断言都经过它，缺位即把 `ev.effect` 降为 `"deny"` 并附说明。只收紧、永不放宽已计算的 effect。
- **分类器 `permScope` 兜底**：无 `w` 时写/删形段 DENY（规则 `permission.write`）；类别豁免不能越过此权限拒绝。`permission.write` 阻断消息不附提权指南也不消耗每周期首次完整指南——权限上限是独立检查，文案直接要求用户用 `/perm +w` 或 `/perm rw` 授权。
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
| 时效 | 租约 TTL，活动续期 | 会话生命周期，`session.deleted` 清除 |

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
  -> escalation stage（仅当 byte 0 有严格三行前缀）
       direct Python reviewer: allow_once | ask_user | deny
       allow_once -> 只把本次所选类别加入当前 shell 的检查上下文
       ask_user/deny -> 拒绝；同会话相似命令不可再次申请
  -> 本地静态分类器（逐段、最坏结果合并）
       permission / Linux OS sandbox gates remain active
       ALLOW -> opencode 原生 shell
       DENY  -> 拒绝（消息对模型可见）
    ASK 或强制上下文 -> 动态 LLM 审查器（OpenAI-compatible）
                   ALLOW -> opencode 原生 shell
                    DENY  -> 拒绝（HARD：绕过尝试还会中断会话）
```

静态分类（LOOSE/HARD 策略、cd 追踪、脚本指纹、目录清单等）沿用 v1 `-next` 规则集（`src/security/classifier.ts`、`src/security/reviewer.ts`、`src/security/auditor.py`），在此之上新增了 bypass 类别豁免机制与审查器提示词加固（见上方 BypassClassifier 章节）。动态审查器完全直连 OpenAI-compatible 端点，不经 opencode client。

## 配置字段（与 v1 一致）

`options` 支持以下字段（白名单校验，未知字段会抛错）：

| Option | 类型 | 默认 | 说明 |
|---|---|---|---|
| `shell` | string | 环境探测 | 分类器方言提示；v2 无 `config` hook，不能读取 opencode 配置里的 shell，仅由此字段 + `SHELL` 环境变量 + 平台默认决定 |
| `securityEnabled` | boolean | `true` | 整体开关 |
| `strictness` | `"LOOSE" \| "HARD"` | `"LOOSE"` | 静态规则集 + 动态系统提示 |
| `failPolicy` | `"fail_ask" \| "fail_open" \| "fail_close"` | `"fail_open"` | 常规动态审查器不可用/失败时的行为；单次提权审查失败始终拒绝，不受此项影响。**`fail_ask` 在 v2 归一化为 `fail_close`**（v2 无法交互确认），拒绝消息会注明原因 |
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
| `supervisorEnabled` | boolean | Windows 下 `true` | 使用原生 shell supervisor |
| `supervisorPath` | string | 包内默认 | supervisor `bash.exe` 路径 |
| `BypassClassifier` | string[] | `[]` | 永久豁免类别列表：`filesystem`/`host`/`privilege`/`secret`/`network`/`remote`/`indirection`/`dynamic`/`sandbox`/`slow`；未知类别警告并忽略 |
| `bypassLeaseTtlMs` | number | `1200000`（20 分钟） | 临时豁免租约 TTL，活动续期；范围 60000–86400000 |
| `bypassPropagateToSubagents` | boolean | `true` | 子代理会话继承父会话的临时豁免 |
| `escalationEnabled` | boolean | `true` | 是否允许代理通过 `# - REQUIRE_ESCALATION` 三行前缀申请单次提权。为 `false` 时该前缀只是普通 shell 注释（命令照常分类），不会调用提权审查器或写入提权失败记录，且所有阻断文案不再提及提权机制；常规动态审查器仍可能按分类结果运行，`/bypass`、`/perm`、`BypassClassifier` 不受影响 |
| `permission` | object | 见权限层表 | 会话 r/w 能力层：`default`/`webIsRead`/`registerTool`/`subagentPermission`/`actionMap`（详见「会话权限层」） |
| `configFile` | string | — | JSON 配置文件路径（加载器指令，不是插件字段） |

另支持 `reviewCommand`（仅测试注入用，插件自身从不装配）。

## 与 v1 的行为差异（v2 约束所致）

1. **`fail_ask` 移除**：`failPolicy: "fail_ask"` 被归一化为 `fail_close`——审查器不可用时直接拒绝，而非弹出确认工具。拒绝消息会显式说明 "interactive user confirmation is unavailable in v2"。
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
