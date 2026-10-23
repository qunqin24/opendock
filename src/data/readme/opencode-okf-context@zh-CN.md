# opencode-okf-context

[English](./README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/opencode-okf-context)](https://www.npmjs.com/package/opencode-okf-context) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

一个 [OpenCode](https://opencode.ai) 插件，为 [OKF（开放知识格式，Open Knowledge Format）](https://github.com/GoogleCloudPlatform/knowledge-catalog) 知识包提供**渐进式披露**与**用完即卸**能力——让 AI agent 能读取整座知识库，却不会把上下文窗口撑爆。

设计借鉴了 [DCP](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)：和 DCP 一样，它只在消息发往 LLM 的途中重写，**永不修改真实会话历史**。但 DCP 用 LLM 摘要剪枝通用内容，本插件利用 OKF 原生结构（YAML `description`、`index.md`）做**确定性、零额外 token** 的披露与卸载。

> **它不是记忆插件。** 本插件是**知识访问**插件：读取*人工维护*的 OKF 知识包，低成本查询大型知识库且不长期占用上下文。它**不**记录对话、不自动生成记忆——需要记忆能力请改用记忆类插件（如 `echoes-vault-opencode`）。

## 它如何工作

```
L0 清单（始终在系统提示里，约几百字符）
   bundle 列表 + 根索引（标题 + 描述）+ 使用说明
        │ okf_list 下钻
L1 索引（按需，体积小）──────────────────────────┐
   某个 bundle 或子目录的索引（标题 + 描述，无全文）
        │ okf_read 加载  /  okf_search 定位
L2 全文（按需，体积大，有生命周期）
   concept 的完整 markdown 进入上下文
        │ 经过 N 轮用户消息（默认 4）  ·  或  okf_unload
卸载：全文 → 占位符
   "[OKF] concept tables/customers 已卸载 — 释放约 3.2k 字符。
    保留摘要：customers [BigQuery Table] — 客户主表…
    用 okf_read(id: \"tables/customers\") 重新加载。"
```

三套机制：

| 机制 | 发生了什么 |
|---|---|
| **确定性卸载** | 已加载 concept 的 `okf_read` 输出，在足够轮次后或显式 `okf_unload` 时，被替换为紧凑占位符（标题 + 类型 + 描述）。无需调用 LLM。陈旧的检索结果同样老化（保留最近一次检索）。 |
| **去重（deduplication）** | 同一个 concept 被读取两次时，只保留最新一次的全文；同词重复搜索同理只保留最新结果；较早的读取折叠为"已去重"占位符。 |
| **软提醒（soft nudge）** | 当留存的 OKF 内容超过阈值，会在最后一条用户消息上锚定一行提醒（绝不新增消息）。 |

保护机制：最近的 `keepRecent` 次读取和 `protectedConcepts` glob 永不自动卸载；显式 `okf_unload` 优先级最高。所有重写只发生在出站消息——真实历史永不改变。

## 工具一览

| 工具 | 参数 | 返回 |
|---|---|---|
| `okf_list` | `bundle?`、`path?` | 某个 bundle 或子目录的索引（仅标题 + 描述） |
| `okf_read` | `id` 或 `ids: [...]`、`bundle?` | concept 的完整 markdown（单个，或批量整体加载）+ 出/入边引用元数据 + 末尾一行"用完请 okf_unload"引导 |
| `okf_search` | `query`、`bundle?`、`maxResults?` | 先搜元数据（title/description/tags），仅当无匹配时回退搜正文；返回精简引用 + 一行片段，绝不返回全文 |
| `okf_write` | `id`、`type?`、`title?`、`description?`、`tags?`、`body?`、`bundle?`、`mode?` | 新建 / 更新 / 删除 concept。`update`（默认）只改传入字段；`delete` 删除文件、移除其 `index.md` 条目并记入 `log.md` |
| `okf_validate` | `id?` 或 `all: true`、`bundle?` | 只读校验报告（概念级；`all:true` 还含 bundle 级）；每个问题附带一条可直接运行的 `okf_write(...)` 修复命令 |
| `okf_unload` | `id?` 或 `all: true`、`bundle?` | 标记 concept 立即卸载 |
| `okf_refs` | `id`、`bundle?` | 查询某个 concept 的引用图谱（谁引用了它 + 它引用了谁），仅元数据、不加载正文。用于影响分析（"改这个表会影响谁？"） |

`okf_validate` 按规则检查每个 concept 并对每个问题给出修复命令——它本身绝不写文件，运行它建议的 `okf_write` 命令即可：

```
✓ Validated 3 concept(s) in bundle "demo": 1 valid, 2 with issues (1 error, 3 warnings).

▶ tables/bad_type  (bundle: demo, 2 issues)
  ✗ [error] type: `type` is missing or empty. The OKF spec requires `type` …
    → fix: okf_write(id: "tables/bad_type", bundle: "demo", mode: "update", type: "<your type, …>")
```

检查范围：frontmatter 的 `type`/`title`/`description`/`tags` + 正文（概念级）；`okf_version`、`log.md`、断裂的交叉链接（bundle 级，用 `all:true`）。concept 的 YAML 损坏不再拖垮整个 bundle——它会以空 frontmatter 加载并报 `yaml-error`。

## CLI：`okf`（其他 Agent、人、CI）

包内还附带独立的 **`okf`** 命令——与上述工具同一套操作，服务于插件触达不到的环境：其他编码 Agent（通过它们的 shell 工具）、人、以及 CI。

> **装插件 ≠ 有 CLI。** `opencode plugin …` 只抓取插件入口文件，不执行 npm 的 bin 链接。CLI 来自对同一个包的 npm 安装：`npm install -g opencode-okf-context`（或一次性 `npx -p opencode-okf-context okf …`）。建议插件与 CLI 锁定同一版本；`okf version` 会自报实际加载的构建。

```bash
okf list                                     # 浏览 bundle 索引
okf search customer churn                    # 元数据优先的搜索
okf read tables/customers                    # 全文
okf read reference/api_schema --section Authentication --max-chars 2000
okf validate --all                           # 仓库门禁：校验有 error 时退出码 1
okf manifest                                 # 给非 opencode Agent 的规则文件片段
```

- **读取摄入控制**是 CLI 的上下文手段（opencode 之外没有自动卸载）：`--fields`（只看元数据）、`--section <标题>`、`--max-chars <n>`——从源头少加载，而非事后卸载。
- **默认只读**：`write`/`update`/`delete` 需要 `--write`（或在 `.okf.jsonc` 里设 `write.enabled: true`）。长正文用 `--body-file <路径|->`（支持 stdin）。
- 配置：`<项目>/.okf.jsonc`（与插件配置同一 schema）；`--root <路径>` 直达某个 bundle，`--bundle <名称>` 指定。
- 退出码 `0`/`1`/`2`（正常 / 错误 / 用法）——CI 友好。

## 安装

已发布到 [npm](https://www.npmjs.com/package/opencode-okf-context)，包名 `opencode-okf-context`：

```bash
opencode plugin opencode-okf-context@latest --global
```

或手动加到 `~/.config/opencode/opencode.json`：

```json
{ "plugin": ["opencode-okf-context@latest"] }
```

验证 7 个工具已注册：

```bash
opencode debug agent build | grep okf   # -> okf_list/read/search/write/validate/unload/refs: true
```

> **关于包名：** 社区有一个独立的 `opencode-okf` 包，专注于 OKF bundle 的*创作与校验*。本插件（`opencode-okf-context`）与之互补——管*读取与上下文管理*。两者可同时安装、互不冲突。

## 配置

分层加载（深度合并，后者覆盖前者）：`~/.config/opencode/okf.jsonc` → `$OPENCODE_CONFIG_DIR/okf.jsonc` → `<项目>/.opencode/okf.jsonc` → `opencode.json` 里的插件选项。完整 schema 见 [`okf.schema.json`](./okf.schema.json)。

```jsonc
// .opencode/okf.jsonc
{
  "enabled": true,
  "scan":   { "enabled": true, "maxDepth": 4 },
  "bundles": [{ "path": "docs/knowledge", "name": "project-kb" }],
  "remotes": [{ "url": "https://git.example.com/team/wiki-kb.git", "name": "team-wiki" }],
  "disclosure": { "injectManifest": true, "maxManifestChars": 2000 },
  "unload": {
    "afterTurns": 4,          // 加载后经过 4 轮用户消息即卸载（按大上下文窗口调优）
    "keepRecent": 2,          // 最近 2 次读取永不自动卸载
    "placeholder": "description"
  },
  "nudge":   { "threshold": 25000, "frequency": 3, "force": "soft" },
  "write":   { "enabled": true, "updateIndex": true, "appendLog": true },
  "protectedConcepts": ["tables/*"],
  "debug": false
}
```

自动扫描会跳过构建/VCS 目录（`node_modules`、`dist`、`.git` 等）和隐藏目录——唯一例外是 **`.opencode` 会被扫描**，放在其中的 bundle（如 `.opencode/skill/`）可被自动发现。

### 远程知识源（git）

`remotes` 指向 git 托管的知识库——团队分发通道：知识库作者 push 到 git，所有 agent 自动拉取。发现之前，每个 remote 会被 clone/更新（`--depth 1` 浅克隆 + `reset --hard`）到**共享缓存**（`~/.cache/opencode-okf/remotes/<hash(url+ref)>`，可用 `$OKF_REMOTE_CACHE` 覆盖），checkout 内发现的 OKF bundle 会像本地 bundle 一样注册——同样的 L0/L1/L2 渐进披露、同样的卸载语义。

```jsonc
"remotes": [
  { "url": "https://git.example.com/team/wiki-kb.git", "name": "team-wiki" },
  { "url": "https://git.example.com/team/glossary.git", "ref": "v1.2", "subdir": "kb" },
  { "url": "https://git.example.com/private/ops-kb.git", "auth": "env:GIT_TOKEN" }
]
```

- **故障绝不阻断会话**：源不可达时降级使用现有缓存（stderr 一条警告）；首次 clone 失败则跳过该 remote。
- **同步日志**：每次同步向 `~/.cache/opencode-okf/sync.log` 追加一行（可用 `$OKF_SYNC_LOG` 覆盖）——状态、耗时、拉到的 commit、注册的 bundle，成功也留痕。日志行绝不包含 remote URL（ssh URL 含 `user@host`），只有显示名和缓存目录哈希；`debug: true` 时额外镜像到 stderr。
- **设计上只读**：`okf_write` 拒绝 remote bundle——下次同步的 `reset --hard` 会冲掉本地改动。git 仓库是唯一事实源；本插件保持知识*访问*层定位，不做写回同步。
- **鉴权**：`auth: "env:VARNAME"` 在同步时从环境变量读 token（GitLab/GitHub PAT 风格，`authUser` 默认 `oauth2`）——token 绝不落进会被提交的 okf.jsonc。ssh URL 直接走你的 ssh agent。
- **命名**：仓库里只有一个 bundle 时直接用 `name`；多 bundle 仓库按根目录各注册一个，命名为 `name/<叶子目录>`。
- **自仓库感知**：把当前项目自己的 git origin 配成 remote 会被识别（URL 比对对协议/`git@`/`.git` 后缀不敏感）并跳过——不产生冗余克隆、不重复注册 bundle；`okf sync` 会将其报告为 `skipped`。
- **CLI 对齐**：`okf sync` 强制更新全部 remote（任一失败退出码 1——可作 CI 门禁）；其余 `okf` 命令首次使用时 clone、之后走缓存（`--sync` / `--no-sync` 可覆盖）。

## 开发

```bash
bun install
bun test            # 168 个测试
bunx tsc --noEmit   # 类型检查
```

本仓库通过 `.opencode/plugin/okf.ts`（重导出 `src/index.ts`）dogfood 自己——在仓库根目录运行 `opencode` 即从源码加载插件，并自动发现 `fixtures/sample-bundle`。完整架构说明见 [AGENTS.md](./AGENTS.md)。

## 打包与发布

```bash
bun run build       # tsup 打包 JS（yaml 已 bundle）+ tsc 生成 d.ts
npm publish         # 需先 npm login
```

`@opencode-ai/plugin` 作为 peerDependency 由 opencode 运行时提供，包本身运行时零外部依赖。

## 范围 / 不做的事（v1）

- 不做 LLM 生成的摘要（OKF 的 `description` 就是确定性摘要）；提醒分层仅 soft。
- 校验覆盖概念级与 bundle 级检查；交叉链接的*完整性修复*不在范围内（属于 `opencode-okf`）。

## 许可证

MIT
