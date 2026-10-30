# opencode-skill-management

给 OpenCode 的 skill 装一个开关：**列出、诊断、停用、恢复**，全部通过全局权限规则实现 —— 不删除、不移动、不改写任何 skill 文件。

> 适配 OpenCode V2（在 2.0.32 上完整验收：Windows 与 Linux 双平台 + 新进程真机 e2e）。插件是单文件、纯 Node 内置模块，无第三方依赖、不调用 shell。
>
> **1.1.0 兼容承诺**：四个动作（`list` / `inspect` / `disable` / `enable`）的入参、**JSON 输出字段**（`schemaVersion` / `action` / `ok` / `warnings` 及各动作字段，见下文「输出格式」）、写入的规则形状 `{ "action": "skill", "resource": <id>, "effect": "deny"|"ask" }`、规则行的同行 marker 注释格式，以及**单文件**结构，在 1.x 内不破坏（`enable` 的归属判定依赖 marker 格式）。
>
> **1.1.0 是一次破坏性变更**：1.0.0 的 Markdown 输出被 JSON 取代。除此之外没有破坏性变更。

## 它解决什么问题

- skill 装多了，模型每轮都要看一大串用不上的描述，想把一部分先关掉。
- 某个 skill 明明装了却加载不了，想弄清被哪一条规则挡住。
- 想临时停用一个 skill，但删文件太重、改回来又麻烦。

`skill_management` 把这些都做成一次工具调用。停用的载体是全局配置顶层 `permissions` 数组里的一条**精确规则**，因此可以被精确定位、精确撤销。

## 四个动作

| 动作 | 做什么 | 什么时候用 | 写配置 |
|---|---|---|---|
| `list` | 列出所有已注册 skill，以及它们**对当前调用者 agent** 的有效状态（`available` / `disabled` / `ask`），末尾给出「发现 N 个、已禁用 M 个、ask K 个」 | 想知道现在装了什么、哪些正被挡着 | 否 |
| `inspect` | 查单个 skill 的详情：当前结论、命中的是哪条规则、在各 agent 下的差异、id 是怎么来的 | 某个 skill 加载不了，或 `list` 的结论与预期不符 | 否 |
| `disable` | 写一条全局规则把它关掉。默认 `deny`；也可以 `effect: "ask"` 做软停用 | 想让它从模型可见列表里消失、并拒绝加载 | 是（可 `dryRun` 预览） |
| `enable` | 把挡路的那**一条**全局规则删掉，恢复可用 | 重新启用之前停用的 skill | 是（可 `dryRun` 预览） |

## 输出格式（JSON）

四个动作都返回**一个 JSON 对象**，不是 Markdown。插件同时给工具声明了 `output` schema，宿主会按它校验结果（声明后不返回 `output` 会被宿主判错）。

公共信封：

| 字段 | 类型 | 含义 |
|---|---|---|
| `schemaVersion` | number | 当前为 `1`；加字段不升，改语义才升 |
| `action` | string | 本次动作 |
| `ok` | boolean | 失败时为 `false`，并带 `error: { code, message }` |
| `warnings` | string[] | 人类可读提示（1.1.0 为中文）；无提示时为空数组 |

各动作另有字段：

- `list`：`callerAgent`、`summary`、`skills[]`、`config`、`sidecar`、`consistency`
- `inspect`：`skill`、`idDerivation`、`agents[]`、`caller`、`conclusion`
- `disable`：`changed`、`reason`、`before`、`diff`、`backup`、`sidecar`、`verification`
- `enable`：`changed`、`reason`、`location`、`rule`、`diff`、`verification`、`candidates[]`、`relatedRules[]`

逐字段说明与示例见文档站的四个动作页。错误码：`skill_not_found`、`name_ambiguous`、`missing_param`、`unknown_action`、`verification_failed`、`unverifiable_origin`、`ambiguous_rule`、`no_matching_rule`、`config_unparsable`、`internal_error`。

### list —— 先看清现状

按调用者 agent 求值（同一个 skill 在 `build` 下可能可用、在 `explore` 下被 deny，这是正常的），所以返回里的 `callerAgent` 写明用的是哪个 agent，`skills[].state` 是按该 agent 求值的结果。同一个 id 在别的 agent 下结论不同时，`summary.diverged` 计数并在 `warnings` 里提示一行；详细的逐 agent 结果在 `inspect` 的 `agents[]` 里。

### inspect —— 出事时的第一站

回答三个问题：现在能不能用？被哪条规则命中？为什么？（`caller.rule` 给出规则原文，`idDerivation` 写明 id 来源与推导过程。）

### disable —— 关掉它

```jsonc
{ "action": "skill", "resource": "windows-shell", "effect": "deny" } // skill_management
```

写进去的就是这么一行（行尾注释是本工具做来源标记用的）。`deny` 之后：

- 该 skill 从注入给模型的可用列表里消失；
- 内置 `skill` 工具加载它会被权限拒绝。

`effect: "ask"` 是软停用：仍然列在模型可见的列表里，但每次加载都要确认。`dryRun: true` 只在 `diff` 里回显将要写的行，不落盘。

写入是**原子写**（同目录 `.tmp` + `rename`），保留原文件的缩进、键顺序、行尾风格（CRLF/LF）与 BOM；目标文件含 MCP 凭据，所以备份**只保留 1 份**。写完会 `reload` 并**轮询回读**校验，不符则回滚。

回读判据是「规则**确实被宿主读入**」：`deny` 看调用者求值是否为 deny；`ask` 看调用者规则集里该 `{skill, id, ask}` 规则的**条数是否增加**（1.0.0 修正：旧判据「不是 deny」会被宿主的 ask 回退、以及 agent 自有 allow 同时满足，等于没校验）。写入成功但对调用者不产生该效果时（agent 自有规则排在全局规则之后），`verification.actual` 与 `warnings` 会写明**实际效果**，不会把"已写入"说成"已生效"。

### enable —— 恢复它

判据是「能否唯一定位挡路的那一条精确全局规则」，**不要求它是本工具写的**：

1. 行尾标记注释命中 → 删除；
2. 没有标记，但本工具的 sidecar 记录里有、且配置里恰好一条完全相同的规则 → 删除并告警；
3. 两者都没有 → 拒绝，并把该 id 的规则原文贴出来（不会瞎猜着删）。

以下情况**只报告、不代改**：规则有歧义（同 id 多条 / 多行带标记）；挡路的是通配规则（`resource: "*"`）、agent 级 `permissions` 或 `policies`。删除后 `location` 报告这条规则的来源，`verification.effect` 报告调用者 agent 的**实际生效效果**（如果仍被更宽的规则压成 deny，`warnings` 会说明原因）。

## 安装

### 最小安装（npm，一条命令）

```pwsh
opencode plugin add opencode-skill-management
```

这条命令做两件事：从 npm 装上包，并把 `opencode-skill-management` 写进全局 `opencode.json(c)` 的 `plugins` 数组。**不需要**再往 `<config>/plugins/` 里放文件。想固定版本就写全版本号：

```pwsh
opencode plugin add opencode-skill-management@1.1.0
```

装完在**新进程**里确认（旧进程可能还挂着上一份）：

```pwsh
opencode plugin list --builtin
# skill_management   1.1.0   opencode-skill-management@1.1.0
```

看到 `SOURCE` 是 `opencode-skill-management@1.1.0` 就说明走的是 npm 包。宿主会把包解到自己的缓存目录再加载（本机示例：`~/.cache/opencode/npm/opencode-skill-management@1.1.0/<hash>/node_modules/opencode-skill-management/`），这个位置由宿主管理，不要手改。

### 其它安装方式

**git spec（不经过 npm 注册表，也不需要 token）**

```pwsh
opencode plugin add github:sogeisetsu/opencode-skill-management
```

**离线：单文件直接放进插件目录**

```pwsh
node tools/install.mjs          # 复制到 <config>/plugins/skill_management.js
node tools/install.mjs --dry-run
```

宿主会自动加载 `<config>/plugins/*.js`，不需要在配置里登记；列表里显示为 `local` 加文件路径：

```pwsh
opencode plugin list --builtin
# skill_management   local   C:\Users\suyue\.config\opencode\plugins\skill_management.js
```

> 必须带 `--builtin`：不带时自动发现的本地文件插件不会出现在列表里，会显示 `No plugins found`。

### 不要装两份

同一份插件只能有一种来源。npm 包和 `<config>/plugins/skill_management.js` 同时存在时，`plugin list` 会出现两行 `skill_management`，两者注册同名工具，后加载的覆盖前者——能用，但排查问题时很容易看错版本。切换方式时先删掉旧的那一份。

## npm 包内容

`npm pack` 产物（也就是 `opencode plugin add` 拿到的东西）只有 5 个文件，不含测试、文档站和 CI：

```text
opencode-skill-management-1.1.0.tgz
├── package.json                # 包元数据；exports 指向 src/skill_management.js，files 只含 src 与 CHANGELOG
├── README.md                   # 本文件，随包发布
├── CHANGELOG.md                # 版本变更
├── LICENSE                     # MIT
└── src/
    └── skill_management.js     # 插件本体：单文件，仅用 node:fs / node:path / node:os，无第三方依赖
```

仓库里有、但**不进包**的部分：

```text
tools/            # verify.mjs（260 项断言）、install.mjs（离线安装）、linux-verify.sh
docs/             # 宿主实测（preflight.md）与验收证据（acceptance.md）
site/             # Astro + Starlight 文档站，单独部署
.github/          # CI 与发布 workflow
.openchamber/     # 设计规范
```

插件本体只有一个文件，是因为宿主会把 `<config>/plugins/` 下的每个 `.js` / `.ts` 文件和子目录都当插件加载——拆出辅助模块会被当成第二个插件。

## 用法

```
skill_management({ action: "list" })
skill_management({ action: "inspect", id: "windows-shell" })

skill_management({ action: "disable", id: "windows-shell" })
skill_management({ action: "disable", id: "windows-shell", dryRun: true })
skill_management({ action: "disable", id: "windows-shell", effect: "ask" })   # 软停用
skill_management({ action: "enable",  id: "windows-shell" })
```

`id` 是主键（宿主注册表直接给），`name` 可作别名；重名时返回候选，不猜。

## 兼容性与边界

- 只改**全局**配置的 `skill` 权限规则；不碰项目级配置、不碰 skill 文件、不写 `policies`。
- 规则求值走宿主：`findLast` + glob（`*` / `?`）；**无任何规则命中时宿主回退 `ask`，不是 `allow`**。
- 因此「某 skill 显示 `ask`」有两种可能：真的被写成 `ask`，或压根没有规则命中。`inspect` 会区分这两者。

## 开发与验收

```pwsh
node tools/verify.mjs              # 260 项断言，全部跑在临时配置目录，不碰真实全局配置
node tools/verify.mjs --section E  # 只跑某一段（A–I）
bash tools/linux-verify.sh         # Linux/WSL 一键验收：自带 Node + opencode，落在 $HOME 下，跑完自清
```

CI（`.github/workflows/verify.yml`）在 `ubuntu-latest` 与 `windows-latest` 上跑同一套断言，不需要任何 secret。
H 段是性能闸门（29 skills × 12 agents × 10 rules 下 `list` < 25 ms），I 段是发布闸门
（`npm pack --dry-run` 内容、`exports` 可解析、`install.mjs` 副本与 `src` 逐字节一致）。

- 设计规范：[.openchamber/plans/skill-management-spec.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/.openchamber/plans/skill-management-spec.md)
- 宿主实测与踩过的坑：[docs/preflight.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/docs/preflight.md)
- 验收证据：[docs/acceptance.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/docs/acceptance.md)

## License

MIT © 2026 sogeisetsu
