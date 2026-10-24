# opencode-skill-management

给 OpenCode 的 skill 装一个开关：**列出、诊断、停用、恢复**，全部通过全局权限规则实现 —— 不删除、不移动、不改写任何 skill 文件。

> 适配 OpenCode V2（在 2.0.32 上完整验收：Windows 与 Linux 双平台 + 新进程真机 e2e）。插件是单文件、纯 Node 内置模块，无第三方依赖、不调用 shell。
>
> **1.0.0 兼容承诺**：四个动作（`list` / `inspect` / `disable` / `enable`）的入参与输出语义、写入的规则形状 `{ "action": "skill", "resource": <id>, "effect": "deny"|"ask" }`、规则行的同行 marker 注释格式，以及**单文件**结构，在 1.x 内不破坏（`enable` 的归属判定依赖 marker 格式）。

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

### list —— 先看清现状

按调用者 agent 求值（同一个 skill 在 `build` 下可能可用、在 `explore` 下被 deny，这是正常的），所以输出里会写明 `调用者 agent：...`。如果同一个 id 在别的 agent 下结论不同，会额外提示一行，详细的逐 agent 表在 `inspect` 里。

### inspect —— 出事时的第一站

回答三个问题：现在能不能用？被哪条规则命中？为什么？（规则原文会贴出来。）`id` 缺失或从路径反推时，也会写明推导过程。

### disable —— 关掉它

```jsonc
{ "action": "skill", "resource": "windows-shell", "effect": "deny" } // skill_management
```

写进去的就是这么一行（行尾注释是本工具做来源标记用的）。`deny` 之后：

- 该 skill 从注入给模型的可用列表里消失；
- 内置 `skill` 工具加载它会被权限拒绝。

`effect: "ask"` 是软停用：仍然列在模型可见的列表里，但每次加载都要确认。`dryRun: true` 只回显将要写的内容，不落盘。

写入是**原子写**（同目录 `.tmp` + `rename`），保留原文件的缩进、键顺序、行尾风格（CRLF/LF）与 BOM；目标文件含 MCP 凭据，所以备份**只保留 1 份**。写完会 `reload` 并**轮询回读**校验，不符则回滚。

回读判据是「规则**确实被宿主读入**」：`deny` 看调用者求值是否为 deny；`ask` 看调用者规则集里该 `{skill, id, ask}` 规则的**条数是否增加**（1.0.0 修正：旧判据「不是 deny」会被宿主的 ask 回退、以及 agent 自有 allow 同时满足，等于没校验）。写入成功但对调用者不产生该效果时（agent 自有规则排在全局规则之后），输出会写明**实际效果**，不会把"已写入"说成"已生效"。

### enable —— 恢复它

判据是「能否唯一定位挡路的那一条精确全局规则」，**不要求它是本工具写的**：

1. 行尾标记注释命中 → 删除；
2. 没有标记，但本工具的 sidecar 记录里有、且配置里恰好一条完全相同的规则 → 删除并告警；
3. 两者都没有 → 拒绝，并把该 id 的规则原文贴出来（不会瞎猜着删）。

以下情况**只报告、不代改**：规则有歧义（同 id 多条 / 多行带标记）；挡路的是通配规则（`resource: "*"`）、agent 级 `permissions` 或 `policies`。删除后会报告这条规则的来源，以及调用者 agent 的**实际生效效果**（如果仍被更宽的规则压成 deny，会说明原因）。

## 安装

**首选：git spec（无注册表、无 token）**

```pwsh
opencode plugin add github:sogeisetsu/opencode-skill-management
```

**第二通道：npm**

```pwsh
opencode plugin add opencode-skill-management
```

**兜底：直接放进插件目录**

```pwsh
node tools/install.mjs          # 复制到 <config>/plugins/skill_management.js
node tools/install.mjs --dry-run
```

宿主会自动加载 `<config>/plugins/*.js`，不需要在配置里登记。确认装上了：

```pwsh
opencode plugin list --builtin
# skill_management   local   C:\Users\suyue\.config\opencode\plugins\skill_management.js
```

> 注意必须带 `--builtin`：不带时本地目录插件不会出现在列表里，会显示 `No plugins found`。在全新的配置目录里，前两次调用可能为空，重试一次即可。

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
node tools/verify.mjs              # 248 项断言，全部跑在临时配置目录，不碰真实全局配置
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
