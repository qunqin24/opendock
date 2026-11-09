# Sibyl-System

> 本文件另有 [English](../README.md) 版本。

[![npm version](https://img.shields.io/npm/v/sibyl-system.svg)](https://www.npmjs.com/package/sibyl-system) ![license MIT](https://img.shields.io/badge/license-MIT-green.svg)

一个独立的 [opencode](https://opencode.ai) 插件，为你的 agent 工作流加入独立的、
fail-closed（失败即拒绝）的评审能力：它产出的任何结论，都不可能被起草它的
那一方批准；而缺席或坏掉的评审者，永远不能算作同意。

## 为什么是三个投票者

一个 AI 评审自己的计划，等于给自己布置作业再给自己打分：产出工件的盲点，
同样产出了评审。Sibyl 的回答是结构性的，不是性格性的。三个评审人格
（persona）独立且并行地审计每一个工件，批准需要 3 票中至少 2 票、且零个
坏席。沉默、崩溃、读不懂的回复都*反对*批准，从不赞成批准。一个起草的
agent 也许能磨掉三道独立检查，但它无法变成三道检查本身。

它给你的：

- **`sibyl_consult`** — 三票评审议事庭（MELCHIOR / BALTHASAR / CASPER），
  按目标审计工件，返回 **fail-closed 判决**（`APPROVE` / `REJECT` /
  `CANNOT_ANSWER`）。
- **`sibyl_swarm`** — 轻量工作蜂群：ARCHITECT 人格规划依赖有序的任务图，
  确定性工人按波次执行，结果聚合为判决。
- **`sibyl_review` / `sibyl-chamber`** — 通用评审议事堂：隔离的角色会话，
  最终结论由一个声音说出一句话（见下文）。
- **`sibyl_audit`** — 作为产品器官的外部通道：完成性评审自动由一个全新的
  根会话召集，因此评审者在结构上与起草该工件的任何链条无关（见 Tools）。
- **`sibyl_status` + 验证原语**（`sibyl_anchor_check`、`sibyl_time_probe`、
  `sibyl_attribute`）— 只读检查：运行账本视图、用引擎自己的记录复核声称
  发出过的人类指令、时钟完整性、提交归因。

与 team-mode 或编队编排零耦合：没有 `team_*` 工具，没有跨 agent 消息总线。
一切通过普通的 opencode 子会话完成。

## 会话卫生

议事庭投票者、蜂群工人和蜂群裁判都作为**调用会话的子会话**运行
（工具上下文里的 `parentID`）：TUI 会话选择器只列根会话，所以任何评审票
都不会污染你的顶层会话列表。文字记录留在数据库里，从父会话可达，并镜像
进该次运行的封存回复文件。无席位（CLI/无头）调用方退回顶层创建，其投票
行**在成功后被垃圾回收**（回复文件是持久记录；失败的投票保留数据库行以便
打捞）。`sibyl_review` 的角色全部在 /tmp 下隔离运行，自带
HOME/DB（`src/lane/isolated.ts`），绝不碰你的。

## 评审议事堂（民主集中制）

名字就是设计：对内充分讨论，对外一个声音。`sibyl_review` +
`sibyl-chamber` 是一台**通用**评审装置：任何工件（文档、计划、代码、
agent 行为考卷包）都要经过 广泛取证 → 盲态 PRO/CON 交锋加交叉批评 →
独立抽签产生的裁判（裁判池与抽签种子在开跑前登记）→ 恰好一个声音说出
一句结论（APPROVE / REJECT / NEEDS_HUMAN）。内部异议以路径+哈希封存于
运行目录，从不外泄。所有角色会话在 /tmp 下隔离（你的主会话列表里零条）；
运行可抽查（`sha256sum -c CHECKSUMS.txt`）并落追加式账本。
法律与机制：https://github.com/TachikomaGundam/Sibyl-System/tree/main/docs。

```
sibyl-chamber run --target doc.md --goal "Is this sound?" --model your-provider/your-model
sibyl-chamber status --tail 5
sibyl-chamber spotcheck <runDir|runId>
sibyl-chamber kill <runDir> <role>
sibyl-chamber run --target - --goal "Evaluate candidate behavior" --profile exam --model your-provider/your-model --scenario scenarios/<id>.json
```

## 安装

### 要求

使用 `package.json` `engines` 声明的 Node 版本。Linux + Bubblewrap 提供
硬化文件系统隔离。macOS 和 Windows 只能在配置 `credentialProxy` 时使用
可移植隔离；它保护凭据，但挡不住工件读取运行账号可访问的文件。

按包名注册已发布的 npm 包（opencode 会从 npm 解析）：

```jsonc
{
  "plugin": ["sibyl-system"]
}
```

也可以按路径注册本地检出。在 `~/.config/opencode/opencode.jsonc`
（Windows：`%USERPROFILE%\.config\opencode\opencode.jsonc`）里加一行注册。
这**只是文档示例**——插件永不修改你的配置：

```jsonc
{
  "plugin": [
    [
      "/abs/path/to/sibyl-system/src/index.ts",
      {
        "modelPool": {
          "default": { "providerID": "your-provider", "modelID": "your-model" }
        },
        "concurrencyK": 4
      }
    ]
  ]
}
```

直接注册 TS 入口是受支持的（opencode 用 Bun转译插件源码）。元组的第二个
元素会**逐字**作为选项对象传入，所以选项字段位于它的**顶层**（如示例）；
未知键会被大声拒绝，绝不被静默忽略。选项对象是**唯一**的配置面——没有
其他配置文件（`SIBYL_STATE_FILE` 和 `SIBYL_CHAMBER_LEDGER` 两个环境变量
仅作为测试/CI 的显式隔离缝存在，见 State）。

非法选项绝不让宿主崩溃：插件向 stderr 打印
`[sibyl] SIBYL plugin DISABLED — fix options (no sibyl_* tools registered)`，
什么都不注册，返回空钩子。

## Tools

以下全文：*回执*指机器可核验的结果记录——标识符和哈希可对照引擎自己的
存储复核，而不是抄件。

| Tool | 参数 | 行为 |
|------|-----------|----------|
| `sibyl_consult` | `{ artifact, goal }` | `artifact` 是文件路径或内联多行文本（≤ 256 KiB）。三位议员并行审计；每份回复解析成判决（每票一次会话内 JSON-only 修复）。返回票数统计、合并后的理由/必改项、run id、逐票回复文件路径。 |
| `sibyl_audit` | `{ artifact, goal }` | 独立审计通道：议事庭由引擎新开的根会话召集（与任何起草链条在结构上无关），所以评审进入生效路径时不沾染调用方身份。回执：审计会话 id（保留、可对账数据库）、起止两点绑定的工件 sha256（中途漂移 => VOID）、判决面。新召集者只要是 INDEPENDENT 以外的任何值 => 拒发，无回执。 |
| `sibyl_swarm` | `{ artifact, goal, judge? }` | ARCHITECT 把目标+工件分解为严格 JSON 的工作流 schema；工人确定性地铸造、按依赖波次派发；草稿落在 run 的 space 目录。判决：`APPROVE` / `REJECT` / `EXHAUSTED`；当某个已声明工人没留终结行（下述规则 W2）或零份草稿产出时，强制 `CANNOT_ANSWER`。`judge: true` 时，一次额外的裁判可以替换派生判决——裁判回复不可识别或失败则保留派生判决。 |
| `sibyl_status` | `{ runId? }` | 只读。列出全部已记录 run（最新在最后）+ 议事堂账本尾部，或显示单个 run 的完整记录与 space 目录。 |
| `sibyl_review` | `{ target, goal, seed?, maxRounds? }` | 通用民主集中制议事堂：以后台方式启动 取证→交锋→裁判 的隔离流水线并返回回执（明确**不是**判决）；单一声音在终态落入 run 记录。CLI 孪生：`sibyl-chamber`。 |
| `sibyl_anchor_check` | `{ sessionId, index?, body?, expectSha256?, label? }` | “人类锚”声称（机主声称发出过的指令/批准消息）的只读复核器：对照引擎自己的会话存储复核声称，而不是相信抄件。封闭四态判决 `MATCH` / `MISMATCH` / `ABSENT` / `ERROR`；回执携带所读规范化视图的哈希，之后存储被改动会以视图哈希差异现形。未给 `expectSha256` 声称 → 非判决。 |
| `sibyl_time_probe` | `{ endpoints?, toleranceMs? }` | 对照独立 HTTP `Date` 头的时钟完整性检查（默认池：cloudflare / google / mozilla；同一 owner dept 的源坍缩为**一个**源）。判决：`SYNCED` / `DRIFT` / `INSUFFICIENT-SOURCES`（< 2 个不同 owner 永远不构成同意）。默认容差 300000 ms。`endpoints` JSON 做形状校验，每个 URL 在任何 fetch 前过外发闸门（保留/内网形状按规则名拒绝；被拦 = 失败回执，绝非同意）。仅 HEAD，零载荷，不跟随重定向。 |
| `sibyl_attribute` | `{ moves, commits, roster }` | 纯比对器（自身零网络/零 git）：对照名册把 git ref 移动归因到提交者身份。逐移动判决：`ATTRIBUTED` / `UNATTRIBUTED`（静默外发情形）/ `AMBIGUOUS`（逐字节相等的名册对 = 注册表缺陷，拦下，绝不挑一个）。身份匹配按设计逐字节精确——不做规范化。`moves`/`roster` JSON 做形状校验；畸形输入按名拒绝（带条目索引），绝不猜。 |

## 选项

所有键可选；类型错误或缺必填项（如 `modelPool.default`）会以逐字段
`[sibyl] config error: …` 行禁用插件。未知键同样大声拒绝——所以打错的
选项键或写错的嵌套层级（例如把整体包进 `{ "options": { … } }`）会以具名
键错误禁用插件，而不是静默按默认值运行。

| 键 | 默认 | 含义 |
|-----|---------|---------|
| `modelPool` | `{ default: { providerID: "", modelID: "" } }` | 具名 `{providerID, modelID}` 槽位。`default` 条目**必填**。空字符串 provider/model 是哨兵值，含义是"用宿主默认"。逐人格解析：调用方覆盖槽 → 人格自己的槽（`melchior`/`balthasar`/`casper`/`architect`）→ `pool.default`；缺具名槽从不致命。 |
| `voters` | 全部 `"default"` | `{ MELCHIOR, BALTHASAR, CASPER }` → 池槽名，让每位议员跑在不同模型上。 |
| `swarm` | 全部 `"default"` | `{ judge, pro, con }` → 蜂群角色的池槽名。 |
| `maxRounds` | `4` | 蜂群轮次预算（波次循环）。整数 1–16。 |
| `timeoutMs` | `240000` | 单子会话超时（create + prompt 共用预算）。整数 ≥ 1。 |
| `concurrencyK` | `4` | 每波并行工人上限（同时受 schema 自身 `concurrency` 约束）。整数 1–8。 |
| `staggerMs` | `2000` | 一波内工人启动间隔，避免限流突发。整数 ≥ 0。 |
| `lane` | 见下文 | `sibyl_review` / `sibyl-chamber` 的隔离通道机制（`src/lane/isolated.ts`）。子键：`runRoot`（字符串，默认 `"/tmp"`）—— run 目录的父目录；`opencodeBin`（非空字符串；发现顺序：`$OPENCODE_BIN` → `~/.local/bin/opencode` → `/usr/local/bin/opencode` → `/usr/bin/opencode` → PATH 裸名 `"opencode"`；绝不为空，猜错会在 spawn 时大声失败并点名 bin）—— 每个隔离角色启动的二进制；`configSource`（默认 `~/.config/opencode/opencode.jsonc`）—— 仅在缺 `credentialProxy` 时只读复制，绝不写回；`roleTimeoutMs`（整数 ≥ 5000，默认 `1200000`）—— 逐角色挂钟预算；`roleSalvageGraceMs`（整数 ≥ 0，默认 `900000`）—— 期限后的宽限窗：期限内仍要收尾的角色被保留并披露（账本/notes 标 `SALVAGED … past its deadline`，判决走正常缺口通道降级）；宽限耗尽仍 SIGKILL 并记 timedOut=true，所以挂死的角色会死——fail-closed 不变；`examMaskDirs`（绝对路径数组，默认 `[]`）—— 对考生以 tmpfs 遮蔽的目录（评分文件、其他 run）；空 = 不遮蔽的考场，且会在最终报告里如实说明。 |
| `modelPolicy` | `{ allowedPrefixes: ["local-"] }` | 模型入座白名单：只有 `providerID/modelID` 以这些前缀开头的池模型可以入座；其余在启动时拒绝。非空字符串数组，**至少 1 项**（空列表按"拒绝一切"的手滑被拒）。请改成你自己机器的 provider——出厂默认是前缀模式，不是具体模型。 |
| `credentialProxy` | 缺省 | 可选的环回凭据中继，供隔离角色使用。配置后，每个入座的 provider 必须出现在 `providers` 里；Sibyl 拒绝未声明的席位，而不是退回宿主配置。每个 provider 声明 `baseUrl`、`keyFile`/`keyEnv`/`keyless: true` 恰好其一、可选 OpenAI 兼容的 `npm`、以及允许的 `models`。`maxRequestsPerRole` 默认 `2000`。 |
| `chamber` | 见下文 | 评审议事堂的席位与轮次。子键：`maxRounds`（整数 1–8，默认 `3`）—— 交锋/交叉批评轮上限；`roles`（`{ evidence, pro, con, judge }` → 池槽名，各自默认 `"default"`）；`judgePool`（非空槽名数组，默认 `["default"]`）—— 独立裁判可从中抽签的槽位池（池与抽签种子在开跑前登记）。 |

### 隔离角色的凭据中继

当评审或考生角色可能运行不可信工件或提示时，使用 `credentialProxy`。
Sibyl 为该次运行启动一个仅环回的中继，在可信运行器里一次性读取每个
provider 的密钥，并给每个角色一枚短期限域令牌。角色收到的是合成的
仅-provider 的 OpenCode 配置：它**不**复制你的宿主 `configSource`，
也永远拿不到上游 API key。

```jsonc
{
  "plugin": [["sibyl-system", {
    "modelPool": {
      "default": { "providerID": "review-gateway", "modelID": "review-model" }
    },
    "modelPolicy": { "allowedPrefixes": ["review-gateway/"] },
    "credentialProxy": {
      "providers": {
        "review-gateway": {
          "baseUrl": "https://gateway.example.com",
          "keyFile": "~/.config/sibyl/review-gateway.key",
          "models": ["review-model"]
        },
        "local": {
          "baseUrl": "http://127.0.0.1:8000",
          "keyless": true,
          "models": ["local-review"]
        }
      },
      "maxRequestsPerRole": 2000
    }
  }]]
}
```

`keyFile` 是推荐的生产选项。把它存放在项目树之外、仅属主可读。
`keyEnv` 支持由现成机密管理托管的运行器秘密，但 Sibyl 只在中继启动时
读一次；它绝不传播给角色进程。`keyless: true` 用于无需认证的本地
OpenAI 兼容服务。`baseUrl` 是上游源站，中继负责加请求路径。它放行
POST `/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、
`/v1/responses`，以及 GET `/v1/models` 或 `/v1/models/*`。其余路径一律
404。中继拒绝重定向、执行角色配额、在运行目录记录脱敏后的请求回执。
它不记录请求体、authorization 头、上游密钥或角色令牌。

迁移是自愿的：加上 `credentialProxy` 会把隔离角色从"宿主配置副本"变成
"仅中继配置"。启用前先补上角色可能用到的每个 provider；漏掉的 provider
会在角色启动前就让运行失败。先用可吊销/非生产凭据试跑，然后轮换任何
曾暴露在角色环境里的密钥。

角色沙箱禁用 agent 可控的 shell 与 web 工具，使用隔离命名空间，但保留
经环回中继的正常模型-provider 连通。中继是凭据边界，不是目的地的网络
防火墙。共享运行账号的敌意本地用户、或不遮蔽的考场，在此边界之外；
这些威胁模型请用专用 OS 账号或容器。

### 可移植性（发布原则）

已发布包**不钉死任何设备端模型授权**：出厂仅有的模型默认是空字符串哨兵
（= "宿主默认"）和通用的 `local-` 入座前缀。具体的 provider/model id 只
存在于**你的**配置里——注册元组的选项对象（按操作者的 `modelPool` /
`modelPolicy` / `--model` 旗标）。共享编队上的操作者惯例上把具体值放在
操作者本地文件里，由自己的 shell 或 OpenCode 配置在注册时注入那个选项
对象；该文件位于包边界之外——`package.json` `files` 只发布 `dist/`、
`README.md`、`LICENSE`，ship.sh 门 5a 会在 tarball 出现任何其他文件时
让发布失败。`./ship.sh` 还会在任何已发布面上发现厂商模型 id 重现时让
发布失败。

## 状态布局

所有持久数据位于同一个目录 `~/.sibyl`（首次使用时创建；Windows
`%USERPROFILE%\.sibyl`）。插件在其之外唯一写入的地方是议事堂/考场的隔离
运行根（`lane.runRoot`，默认 `/tmp`，定义见选项）——那里按运行封存目录。

- **议事堂账本**：`~/.sibyl/chamber-ledger.jsonl` — 追加式历史，每行一条
  JSON 记录，每次运行盖一个逐次递增的序号；`sibyl_status` 读它的尾部。
- **运行文件**：`~/.sibyl/runs.json`（Windows：`%USERPROFILE%\.sibyl\runs.json`）—
  每次运行一条记录（id、种类、工件、目标、状态、判决、时间戳，加上工具
  在运行节点记录的 notes，由 `sibyl-chamber status` 展示），与 `spaces/`
  同放在唯一的状态根 `~/.sibyl` 下，所以 npm 升级（带来全新的按版本目录）
  永远不会抹掉你的运行史。写入是原子的（tmp + rename；父目录按需创建）。
- **逐运行空间**：`~/.sibyl/spaces/<runId>/`（Windows：`%USERPROFILE%\.sibyl\spaces`）—
  consult 的完整投票回复（`MELCHIOR.md` 等），swarm 的工人草稿
  （`<workerId>.draft.md`）。
- **测试/CI 覆盖**：`SIBYL_STATE_FILE` 把运行文件指到自定义路径；
  `SIBYL_CHAMBER_LEDGER` 显式把追加式议事堂账本指到另一路径。两个设置都
  不隐式生效；在隔离 CI 运行里两者都要用。
- `load()` 从不抛异常：缺失或损坏的运行文件会恢复为空列表（附 stderr
  警告），下一次写入替换损坏文件——所以如果运行史重要，请备份
  `~/.sibyl`；议事堂账本是独立的追加式文件，不受该恢复影响。个别畸形
  条目被丢弃，不致命。

## Fail-closed 政策

直白地说——任何组合恰好落在一种状态里：

- **APPROVE** 需要 ≥ 2 张真实赞成票**且**零张错误/缺票。三票时即恰好
  3A 或 2A+1R。
- **REJECT**：议事庭答复了——三票都真实投出但没达到批准，或者无论第三席
  如何都有 ≥ 2 张真实反对（2R+1error 仍是 REJECT——"不"已经决定性）。
- **CANNOT_ANSWER**：其他一切组合（2A+1error、1A+1R+1error……）：机制
  本身坏了。那**不是**"否"，也永远不能被当作"是"：修好坏的部分，重新
  运行。
- 单票一次修复后仍解析不了的回复**不是**反对票——它把该席标为错误，
  阻断批准，可能迫使 CANNOT_ANSWER。不存在任何一条路径让坏掉的回复帮
  什么东西过关。
- 每张选票还带一个自报 `confidence`（0..1）：记录给人类读者看，从不参与
  计票。
- 钉死的默认政策是 `majority2of3`；存在更严的政策（见 Architecture），
  从不存在更松的。设计上就没有宽松模式。以上全部由
  `test/council.test.ts` 锁死。

## 选票完整性法律

这些规则的存在是因为本产品在日常内部使用期间发生过真实故障（事故记录
本身不在发布包里）。四条管选票本身；其中三条带着代码库与文档通用的短名
`W1`–`W3`，第四条——被拒的启动要留记录——源自一次具体议事裁决，没有
短名。第五条规则 `W4` 管的是发布，写在它适用的地方：本文末尾的
 Release process 一节。

- **召集者回避（W1）。** 每次 consult/swarm/review 运行都通过引擎自己的
  会话存储（`session.get` 父链——绝不采信自报）解析召集执行链，并扫描
  其中对工件的起草证据（以工件为目标的 write/edit 部件，或内容命中）。
  亲缘命中把运行标为 `independence=NOT-INDEPENDENT`：选票作为 DATA 保留，
  但不在任何生效路径里。读不出来的链盖 `UNVERIFIABLE`——读不出来永远
  不等于静默清白。
- **被拒的启动要留记录。** 显式 `--run-id` 若缺少工具预置的
  `launch-context.json` 或其畸形，即被 REFUSED，并在私有 run 目录写入
  `launch-refusal.json`——钉死的 id 声称一次从未预置发现记录的启动是
  来源谎言，不是缺席。裸 CLI 通道（无 `--run-id`）保留具名
  `UNVERIFIABLE` 腿，而议事堂运行器一旦重新生成其运行记录，该记录压过
  任何被反驳的预置声称（"记录说了算"）。
- **缺席是失格（W2）。** 任何计票被采信之前，每个已声明的投票者/工人
  都必须在运行的 `TERMINALS.txt` 里留下终结行（`ok|error|timeout` +
  详情）。缺行的已声明席位在第一行回执上计作 `dead-without-record=N`
  并强制 `CANNOT_ANSWER`——绝不折进赞成或反对。内容空空的工人会话是
  失败，不是完成票。
- **评分规则随选票同行（W3）。** 每条终结记录内嵌 `instrument:
  {rulesHash, components}`——构建实际发送的每个人格提示/评分标准文本的
  sha256（议员、architect、裁判、修复语法、议事堂角色）。改任何规则
  `rulesHash` 就变，所以"按新规则重新评"可复现可比较；`rules=<12hex>`
  标签随行于每条结果行和 `sibyl_status` 输出。

## 安全说明

披露渠道（GitHub 私密 advisory）、完整数据外发地图、如实命名的局限，
见 **[SECURITY.md](https://github.com/TachikomaGundam/Sibyl-System/blob/main/SECURITY.md)**。
摘要：

- consult/swarm 会把工件文本发给你配置的模型池 provider。
- `sibyl_time_probe` 在 URL 通过外发闸门之前什么都不发：保留/内网地址
  形状、单标签主机、非 http(s) 协议、userinfo 和非默认端口按规则名拒绝；
  被拦的源是失败回执，永远不是同意。
- 插件只在自己的状态路径下写（运行文件与逐运行空间），以及议事堂/考场
  通道在 `lane.runRoot`（默认 `/tmp`）下的封存运行目录；插件创建的每个
  目录 `0700`（mkdir 模式 + 显式 chmod：无论 umask 如何，组/其他都进不
  来）——角色家目录、文字记录、pid 文件、CHECKSUMS。
- 投票者/工人的回合在每次提示中禁用 `bash`、`edit`、`write`。
- 供应链：CI actions 按 SHA 钉死，安装带 `--ignore-scripts`，每周
  `npm audit`（`.github/workflows/scheduled-audit.yml`，也接受仓库自己
  发起的 workflow_dispatch 运行）由发布前的活性闸门在服务端见证（一次
  绿的审计运行，在闸门钉死的新鲜度窗口内、绑定被发布的确切提交——判定
  表与生效默认值一起锁在 `test/publish-gate.test.ts`，它从
  `scripts/publish-gate.mjs` 导入默认值）。每条向量的诚实状态账本，无论
  开闭：[OPEN-VECTORS.md](https://github.com/TachikomaGundam/Sibyl-System/blob/main/OPEN-VECTORS.md)。
- 本产品派生的引擎会话按有界年龄保留（`npm run reap`，默认 dry-run；
  审计召集者 ≥ 90 天，按机主裁决，对账数据存于封存 manifest）。

## 架构（`src/`）

依赖只向下指：

```
index.ts            插件入口：解析选项 → 共享一个 RunStore + client
                    适配器 → 注册八个 sibyl_* 工具
├── engine/         runPersona()：通过结构化 client 缝创建+提示一个子会话；
│                   逐阶段超时；从不抛异常——每个失败都是结构化
│                   PersonaRunResult
├── verdict/        严格 JSON 判决契约：容忍代码块的提取 → 校验 → 恰好一次
│                   修复 → fail-closed REJECT
├── council/        议员人格 + tallyVotes（默认 majority2of3，另导出
│                   unanimous）；纯聚合，零 IO
├── state/          RunStore：原子 RMW runs.json，逐运行空间目录；
│                   议事堂记录：EOF 追加账本，最终报告最后重新生成，
│                   CHECKSUMS + spotcheck
├── swarm/          planner（ARCHITECT schema）→ minter（确定性工人名册）
│                   → dispatcher（依赖波次、错峰、限流即停、恢复）
│                   → aggregate（报告 + 判决派生；完整草稿从不内联）
├── lane/           隔离 opencode-run 启动器（环境钉死、argv-only spawn、
│                   pid 文件定向 kill）+ 入座政策预滤
├── chamber/        审议协议（取证 → 盲态交锋 → 交叉批评 → 抽签裁判，
│                   有界轮次）+ 综合（一个声音，fail-closed，异议按
│                   路径+哈希封存）
├── exam/           场景即数据的行为考卷，机械的文字记录/磁盘信号评分，
│                   canary 否决
├── personas.ts     注册表：3 议员 + ARCHITECT + 裁判/修复文本，模型槽位
│                   —— 一切评分规则文本的单一来源（规则 W3 对其做哈希）
├── terminal.ts     规则 W2 终结行语法（ok|error|timeout），解析 +
│                   dead-without-record 的声明减记录差集
├── instrument.ts   规则 W3 尺：在线提示/标准文本的 sha256 集合 +
│                   确定性 rulesHash 折叠
├── independence.ts 规则 W1 召集者回避：引擎存储链走 + 起草证据扫描
│                   （INDEPENDENT / NOT-INDEPENDENT / UNVERIFIABLE，
│                   读不出即 fail-closed）
├── options.ts      zod v4 schema + parseOptions（从不抛异常）；配置默认
│                   值的单一来源之家（DEFAULT_TIMEOUT_MS）
├── cli.ts          sibyl-chamber 可执行：run | status | spotcheck | kill
├── util.ts         唯一定义：withTimeout + errMessage
└── tools/          sibyl_consult / sibyl_swarm / sibyl_status /
                    sibyl_review + 审计原语（锚点 / 时钟探针 / 归因）
                    胶合层 + 共享助手（模型槽链、工件读取器）
```

## 与其他多 agent 工具的关系

如果你见过"蜂群"风格的工具箱——比如
[oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 捆绑的
多 agent 编排，它通过共享工具和消息总线协调长生命周期的具名 agent——
这**不是**那种东西。没有 `team_*` 工具，没有跨 agent 消息总线，没有任何
编队编排依赖——它从零写成（产品代码约 5K 行，不含注释，仅 `src/`），
只是恰好共享同一个问题域。`sibyl_swarm` 是单工具调用，驱动普通子会话上
的 PLAN→MINT→DISPATCH→AGGREGATE 流水线。

## 开发

```bash
npm run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
npm test            # 完整单元测试，全程离线（无网络、无 LLM；输出会打印确切数量）
npm run reap        # 会话保留收割器：默认 dry-run 出清单；-- --apply 经引擎 API 删除
npm run coverage    # 离线套件 + 覆盖率下限棘轮（下限只升不降；CI 门）
npm run build       # esbuild 打包 → dist/index.js + dist/cli.js (ESM)
node smoke/run-smoke.mjs   # 对已发布面的离线烟测（见 smoke/README.md）
./ship.sh           # 完整发布门：以上全部 + 对打包 tarball 的可移植性扫描
```

在线端到端证据（真实 opencode、真实模型会话）：

- `.omo/evidence/t10/`（内部工作证据，不随包发布）— 主干路径：3 个真实
  投票者审计一个埋了缺陷的工件，返回 fail-closed **REJECT 0A/3R**，点名
  全部 3 类埋入缺陷；议事庭挂钟 95.6 秒 ≈ 最慢单个投票者（Σ 168.2 秒），
  证明真并行扇出。
- `.omo/evidence/t11/`（内部工作证据，不随包发布）— 故障路径，31/31 断言：
  坏的模型槽产生 3 张错误票，运行 fail-closed；运行中途 SIGINT 后存储
  依然有效，被打断的运行诚实地冻结在 `running`。（记录中的票数早于
  `test/council.test.ts` 钉死的判定表法；按今天的锁定表，全错选票归
  CANNOT_ANSWER，绝不再是 REJECT——见 fail-closed 政策表。）
- `smoke/` 随包发布一套确定性的离线复查（构建 + 入口 + status 面），供
  CI 使用。

## 命名

产品名取自《心理测量者》（*Psycho-Pass*）中的 **Sibyl System**：一个分布
式、fail-closed 的裁决网络，输出判决——对投票议事庭而言恰如其分的名字。
议员名 **Melchior / Balthasar / Casper** 作为对最初三票设计的 EVA（新
世纪福音战士）MAGI 式致敬保留。项目在开发期名为 MAGI，在首次发布前改名
Sibyl-System。

## 许可

MIT

## 发布流程

发布一个版本共三步：

1. 写发布记录（`docs/release/v<version>.md` — 按 tag 命名，含 v），列出
   验证证据，含一行逐字的 `gate: PASS`；
2. 领发布租约（`scripts/release-lease.sh`）—— 发布人自己 `~/.config/
   sibyl/` 里的锁文件，阻止同一维护者同时打两个发布 tag（它是按用户
   防撞，不是分布式锁）；
3. 创建 tag 并推送。

其余无需手工：推送 tag 是最后一步人类动作。tag 触发的 CI 工作流随后
复核文书并发布到 npm。强制分两层诚实落实：

- **本地（快速失败，可绕过）：** 推送钩子（规则 `W4`）检查 tag 自带凭证
  ——它从被推 tag 自身指向的确切文件（`git show <oid>:<path>`）读取发布
  记录和 `package.json` 版本，绝不读工作副本，并要求 tag 内版本等于
  tag 名。tag 消息也在扫描之列：家目录路径和邮箱形状按规则名拒绝，因为
  tag 消息是公开的——用哈希或 run id 引用事实。钩子还拒绝任何本地租约
  （第 2 步）未点名该版本的 tag 推送。钩子按 clone 存在、必须安装
  （`scripts/install-hooks.sh`），且 `git push --no-verify` 可以跳过——
  它们让你少挨一次拒推，但它们不是门。
- **服务端（门）：** CI 发布工作流重新执行 tag 文书——tag 名必须等于
  `package.json` 版本，且发布记录 `docs/release/v<version>.md`（tag 名，
  含 v）必须存在于被 tag 的树里并携带逐字 `gate: PASS` 行
  （`scripts/tag-paperwork.mjs`，由 `test/tag-paperwork.test.ts` 锁死）
  ——此外，若最近一次由仓库自身发起（定时或手动）的安全审计运行没有
  绿色跑在被发布的确切提交上，同样拒绝（提交绑定与钉死的新鲜度窗口见
  安全说明里的 "Supply chain" 条）。跳过本地钩子跳不过这道；钩子的四项
  检查里两项没有服务端回显——tag 消息卫生扫描，和按设计无法回显的租约
  检查（租约是操作者本地按用户的文件，第 2 步）。npm 发布本身在有
  provenance 的 CI 身份下运行，所以注册表精确记录包产自哪个仓库提交。
- 以上全部有回归锁（`test/hook-prepush.test.ts` 用 git 发给钩子的同款
  推送信息喂钩子；`test/publish-gate.test.ts` 锁死服务端门的判定表）。
