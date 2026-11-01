# opencode-skill-management

给 OpenCode 的 skill 装一个开关：**列出、诊断、停用、恢复** —— 全部通过全局权限规则实现，不删除、不移动、不改写任何 skill 文件。

## 它解决什么问题

- skill 装多了，模型每轮都要看一大串用不上的描述，想把一部分先关掉。
- 某个 skill 明明装了却加载不了，想弄清被哪一条规则挡住、对哪个 agent 挡住了。
- 想临时停用一个 skill，但删文件太重、改回来又麻烦。

`skill_management` 把这些都做成一次工具调用。停用的载体是全局配置顶层 `permissions` 数组里的一条**精确规则**，因此可以被精确定位、精确撤销。

## 四个动作

| 动作 | 做什么 | 写配置 |
|---|---|---|
| `list` | 列出所有已注册 skill 及它们**对当前调用者 agent** 的有效状态（`available` / `disabled` / `ask`），附配置与 sidecar 一致性提示 | 否 |
| `inspect` | 单个 skill 的详情：结论、命中的规则、逐 agent 差异、id 是怎么来的 | 否 |
| `disable` | 写一条全局规则把它关掉：默认 `deny`（隐藏 + 拒绝加载），`effect: "ask"` 为软停用 | 是（可 `dryRun` 预览） |
| `enable` | 删掉挡路的那**一条**精确全局规则，恢复可用 | 是（可 `dryRun` 预览） |

逐字段说明、错误码与真实输出示例见文档站：[list](https://sogeisetsu.github.io/opencode-skill-management/actions/list/) · [inspect](https://sogeisetsu.github.io/opencode-skill-management/actions/inspect/) · [disable](https://sogeisetsu.github.io/opencode-skill-management/actions/disable/) · [enable](https://sogeisetsu.github.io/opencode-skill-management/actions/enable/)。

## 安装

```pwsh
opencode plugin add opencode-skill-management                          # npm（推荐；升级交给宿主）
opencode plugin add github:sogeisetsu/opencode-skill-management        # git spec（不经过 npm 注册表）
node tools/install.mjs                                                 # 离线单文件：复制到 <config>/plugins/
```

同一个 plugin id 只能装一份：npm 包与 `<config>/plugins/skill_management.js` 并存时宿主会报 `Duplicate plugin ID` 并让其中一份加载失败。切换渠道、`--check` / `--uninstall` / `--force` 等细节见[安装页](https://sogeisetsu.github.io/opencode-skill-management/installation/)。

## 边界

- 只改**全局**配置里的 `skill` 权限规则；不碰项目级配置、不碰 skill 文件、不碰 `SKILL.md` frontmatter、不写 `policies`、不写 `opencode.managed.json`。
- 规则求值走宿主：`findLast` + glob（`*` / `?`）；**无任何规则命中时宿主回退 `ask`，不是 `allow`**，所以 `ask` 既可能是显式软停用，也可能是压根没命中 —— `inspect` 区分两者。
- `enable` 只在能唯一定位那一条精确规则时删除；规则有歧义、或挡路的是通配规则 / agent 级 `permissions` / `policies` 时**只报告，不代改**。
- 写配置是最小文本编辑（保留注释、缩进、键顺序、CRLF/LF 与 BOM）+ 原子写；写完 `reload` 并轮询回读校验，不符则回滚。
- 每个动作返回**一个 JSON 对象**，不是 Markdown；工具声明了 `output` schema，宿主会校验结果。

## 兼容

- **1.x 兼容承诺**：四个动作的入参与 JSON 输出信封/字段、写入的规则形状、行尾 marker、单文件结构，在 1.x 内不破坏。
- **1.1.0 的偏差（已接受）**：1.0.0 → 1.1.0 把输出从 Markdown 换成 JSON，是破坏性变更却落在 minor。1.1.0 已发布、不回收；影响是解析正文的调用方要改读 JSON（`ok` / `error.code`），迁移见 [Compatibility](https://sogeisetsu.github.io/opencode-skill-management/compatibility/)。除此之外 1.x 没有破坏性变更。

## 链接

- 文档站（英 / 中）：<https://sogeisetsu.github.io/opencode-skill-management/>
- 兼容性、1.x 承诺与升级说明：[Compatibility](https://sogeisetsu.github.io/opencode-skill-management/compatibility/)
- 设计规范：[.openchamber/plans/skill-management-spec.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/.openchamber/plans/skill-management-spec.md)
- 宿主实测与踩过的坑：[docs/preflight.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/docs/preflight.md)
- 验收证据与开发流程：[docs/acceptance.md](https://github.com/sogeisetsu/opencode-skill-management/blob/main/docs/acceptance.md) · [开发与验收（333 项断言 A–J）](https://sogeisetsu.github.io/opencode-skill-management/development/)
- 版本变更：[CHANGELOG.md](./CHANGELOG.md)

MIT © 2026 sogeisetsu
