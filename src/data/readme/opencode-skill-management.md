# opencode-skill-management

OpenCode V2 的 `skill_management` 工具：**列出 / 诊断 / 停用 / 恢复**已安装的 skill。

停用的实现方式是往全局配置的 `permissions` 数组写一条 `skill` 规则（`effect: "deny"`），
它会让该 skill 从模型可见列表里消失、并拒绝加载 —— **不动任何 skill 文件**。

> 状态：**已实现并已在本机 OpenCode 2.0.32 上完整验收通过**（含写真实全局配置的 §7(4)(5)(6)(7)，配置已逐字节还原）。
> 规范 v5 的三项变更（`enable` 判据放宽 · 备份 1 份 + 原子写 · description 硬化）已落地，`tools/verify.mjs` 共 167 项断言全绿。
> npm：**`opencode-skill-management@0.1.0`**（由 CI 通过 trusted publishing 发布，带 SLSA provenance）。

## 目录

```
src/skill_management.js                       插件本体（单文件，纯 Node 内置模块）
tools/install.mjs                             安装到 <config>/plugins/
tools/verify.mjs                              可重复跑的验收脚本（167 项断言）
docs/preflight.md                             preflight 实测结果 + 实现期发现的宿主坑
docs/acceptance.md                            §7 验收证据
.github/workflows/verify.yml                  CI：Windows + Linux 双跑验收
.github/workflows/publish.yml                 CI：tag 触发 npm 发布（trusted publishing）
.openchamber/plans/skill-management-spec.md   实现规范（唯一权威，v5）
```

## 安装

**首选：git spec（零摩擦，无注册表 / 无 token）**

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

宿主会自动加载 `<config>/plugins/*.js`（`plugin` 与 `plugins` 两种目录名都扫，已实测）。
确认任一安装方式生效：

```pwsh
opencode plugin list --builtin
# skill_management    local    C:\Users\suyue\.config\opencode\plugins\skill_management.js
```

> git spec 与 npm 两种方式都已实测：CLI 收下、写入配置、**新进程里可正常加载并调用**（细节见规范 §11 / `docs/preflight.md`）。

## 验收

```pwsh
node tools/verify.mjs           # 167 项断言，全部跑在临时配置目录，不触碰真实全局配置
node tools/verify.mjs --keep    # 保留临时目录（排查用）
node tools/verify.mjs --section G   # 只跑某一段（A–G，按标题前缀匹配）
```

覆盖：模块形状与纯度 · glob/权限求值 · id 推导与来源归类 · JSONC 最小文本编辑（含 CRLF/BOM/严格校验）·
端到端 disable/dryRun/enable（含备份、sidecar、回读校验、拒绝分支、空块清理、跨 agent 回归）·
§11 变更（enable 三级定位、歧义与更宽规则、备份 1 份、原子写、description）。

CI（`.github/workflows/verify.yml`）在 `ubuntu-latest` 与 `windows-latest` 上跑同一套断言，不需要任何 secret。

## 工具用法

```
skill_management({ action: "list" })
skill_management({ action: "inspect", id: "windows-shell" })
skill_management({ action: "disable", id: "windows-shell" })
skill_management({ action: "disable", id: "windows-shell", dryRun: true })
skill_management({ action: "disable", id: "windows-shell", effect: "ask" })   # 软停用
skill_management({ action: "enable",  id: "windows-shell" })
```

`id` 是主键（宿主注册表直接给），`name` 可作别名；重名时返回候选而不猜。

## 关键事实（来自本机 OpenCode 2.0.32 源码 / 实测）

- 规则形状：`{ "action": "skill", "resource": "<skill id>", "effect": "deny" }`，写在全局配置顶层 `permissions` 数组里。
- 求值：`findLast` + glob 匹配（`*` / `?`），**无命中时宿主回退 `ask`（不是 `allow`）**。
- 效果：既从注入给模型的可用 skill 列表里过滤掉，也让内置 `skill` 工具的权限断言抛错。
- 载体：本地插件 `{ id, setup(ctx) }`，在 `setup` 里用 `ctx.tool.transform(editor => editor.add({...}))` 注册工具。
- **`ctx.skill.list()` / `ctx.agent.list()` 返回 `{ location, data }` 信封，不是数组**；真正的注册表数组要走
  `ctx.<domain>.transform(draft => draft.list())`。详见 `docs/preflight.md`。
- `enable` 的判据是**能否唯一定位挡路的那一条精确全局规则**，不要求这条规则是本工具写的：
  (a) 同行标记注释命中 → 删；(b) 无标记但 sidecar 有记录且配置里恰好一条完全相同 → 删并告警；
  (c) 两者都没有 → 拒绝并给出原文。通配规则 / agent 级 `permissions` / `policies` 只报告，不代改。
  删除后报告该规则的来源与**删除后的生效效果**（仍为 deny 时说明原因）。
- 写入用**原子写**（同目录 `.tmp` + `renameSync`），备份只保留 **1 份**（配置文件含 MCP 凭据，副本越少越好）。
- 注册表项自带 `id` 时直接用；**没有 `id` 时**按规范 §3.5 从 `path`/`location` 反推，`inspect` 会写出反推过程，`list` 会在统计行下注明数量。
