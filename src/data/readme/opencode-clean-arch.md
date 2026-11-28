# opencode-clean-arch

让聊天式迭代长出来的零散 Python 代码回到**主干清晰、契约显式、职责扁平、没有遗留版本、有图可看**的状态。

这是一个多宿主架构重构与性能调优插件，包含 10 个 skill、6 个斜杠命令和 5 个工具，同时支持 Antigravity、通用 MCP 客户端（Claude Code / Cursor / Codex）以及 opencode 1.x 与 2.x：

- **一眼看懂脉络，绝不过度抽象**：以**显式主干编排（30–50 行故事主线） + `@dataclass` 数据契约 + 扁平单向三层**为目标，严禁单实现 `ABC`/`Factory`、纯转发中间层和 `utils.py` 垃圾桶；
- **两轮浏览器评审演进**：先只读诊断（区分架构设计病灶与死代码噪音）→ **第一轮**在浏览器拍板“一页纸目标架构蓝图”并只做减法清扫消噪 → **第二轮**在干净代码上专项落地数据契约、I/O 边缘化与主干重塑；
- **不留中间版本**：合并/移动时同步更新所有调用方，删除旧实现，不加别名、转发、兼容开关；
- **架构与卫生双重门禁**：收尾不仅扫描平行版本、兼容层、断裂导入、注释代码，还通过 `rules.toml` 校验三层依赖方向与核心层纯净度；
- **短而准的架构文档**：4+1 视图 + 数据视图 + 设计决策，Mermaid 源码 + 渲染好的 SVG（CodeHub 等不渲染 Mermaid 的平台也能看）。

![工作流](docs/diagrams/workflow.svg)

## 包含什么

| Skill | 作用 |
|---|---|
| `clean-arch` | 总流程：基线 → 架构与卫生分离诊断 → 第一轮（目标蓝图对齐 + 减法清扫） → 第二轮（主干、数据契约与三层边界重塑） → 收尾门禁 → 文档 |
| `arch-diagnose` | 只读诊断：顺着入口追踪主干脉络、隐式字典契约、I/O 渗透、散落业务概念、反向依赖与过度抽象，与死代码卫生项分开汇报 |
| `arch-plan` | 编写带“一页纸目标架构蓝图”（主干步骤、`@dataclass` 清单、扁平三层模块表、反臃肿自检）的两轮重构方案，提交浏览器评审 |
| `arch-review` | 交互式评审会话（Antigravity 侧边栏 MCP App 或本地浏览器页面）：逐段批注评论/删除/替换、对比版本 Diff 并回传审批结论 |
| `restructure-modules` | 架构与模块重构剧本：提炼薄主干编排、散装 `dict` 升级为 `@dataclass`、剥离核心层 I/O、收拢散落概念与拆解 `utils`、合并平行版本；同一步更新所有引用 |
| `simplify-code` | 函数与类级别可读性简化（保持主干单一抽象层级、守卫语句、`dataclass` 参数、删除单实现投机抽象和防御性噪音） |
| `comment-hygiene` | 注释只写“为什么”和约束；删除改动叙述、历史、复述代码、注释掉的代码 |
| `clean-finish` | 完成门禁：遗留扫描、删除清单核对、`rules.toml` 三层与禁用依赖检查、目标蓝图与零臃肿核查、测试、diff 卫生 |
| `arch-map` | 生成突出主干流程与核心数据模型的 4+1 架构文档（≤80 行/页、≤20 节点/图）+ 面向 AI 的模块索引、术语表、分层规则 |
| `perf-tune` | 以测量与火焰图为准的性能与内存优化：环境与开源剖析器探测 → 基线（耗时 + 真实物理内存峰值 Peak RSS） → 自动调用 `py-spy`/`pyinstrument`/`memray`（或标准库保底）生成自包含 **CPU/内存/导入火焰图 SVG** → 逐项修改并生成**前后对比图 SVG**，收益超过噪声才保留 |

| 命令 | 说明 |
|---|---|
| `/clean-arch [范围]` | 完整两轮流程，范围可以是子目录或包名，留空为整个仓库 |
| `/arch-diagnose [范围]` | 只做架构脉络与卫生诊断，输出 `.clean-arch/diagnosis.md` |
| `/arch-map [范围]` | 只生成/更新架构文档，不改代码 |
| `/clean-finish [基准提交]` | 对当前改动跑收尾门禁 |
| `/perf-tune [目标/工作负载]` | 以测量与火焰图为准的性能与内存调优（基线 → CPU/内存火焰图 SVG → 方案评审 → 逐步调优与对比图） |
| `/arch-review [文件]` | 在浏览器评审任意 Markdown（默认 `.clean-arch/plan.md`） |

| 工具 | 说明 |
|---|---|
| `clean_arch_facts` | 静态架构事实与设计气味探测（只解析不导入代码）：入口、包/模块依赖与循环、显式数据模型、混杂 I/O 的面条编排函数、跨模块重复字典键簇（隐式数据结构）、弱字典边界、混杂外部 I/O 的核心模块、散落 I/O、`utils` 垃圾桶、单实现抽象与单方法伪类、重复代码、热点、Mermaid 草图、`importers` 全量引用查询、`check` 分层与禁用依赖校验、`verify` 图码一致性核对 |
| `clean_arch_leftovers` | 遗留扫描，支持 `since=<git ref>` 只看本次改动 |
| `clean_arch_render` | `*.mmd` → 自包含 SVG（颜色写死、无外部字体），适合代码托管平台直接预览；对渲染器不支持的写法和过宽的图给出警告 |
| `clean_arch_review` | 交互式评审：在 Antigravity 等 MCP App 宿主中默认通过 `panel` 打开侧边栏评审面板（非阻塞）；在 CLI / opencode / 普通 MCP 客户端中分两步：`open` 启动本地网页并立即返回链接，`wait` 阻塞等待结论并返回结构化批注 |
| `clean_arch_perf` | 性能与内存调优辅助（`perf-tune` 用），五个动作：`env` 探测解释器加速后端与已安装的开源剖析器（`py-spy`、`pyinstrument`、`memray`、`scalene`）；`profile` 自动调度开源剖析器（未安装时退回标准库 `cProfile`/`tracemalloc`/`-X importtime`）采集 CPU、内存与启动耗时并生成**自包含火焰图 SVG**；`bench` 多轮测量墙钟耗时与**跨平台真实物理内存峰值（`peak_mb`）**，对比基线时自动生成**前后对比图 SVG**；`scan` 静态扫描已知慢模式线索；`lessons` 检索或追加已验证的优化经验 |

## 安装

前置条件：Node.js ≥ 18（用于 Antigravity / 通用 MCP / CLI）或 opencode ≥ 1.16；Python ≥ 3.10（分析脚本只用标准库，已内置 `rules.toml` 与 `rules.json` 解析）。

### Antigravity（深度原生插件）

包含 `plugin.json`、`mcp_config.json`（MCP 工具 + 侧边栏交互式评审 **MCP App**）、`hooks.json`（诊断/待批阶段 `PreToolUse` 只读护栏）、`rules/AGENTS.md` 与全部 Skill（含 `/arch-review`）：

```bash
# dist/ 已随仓库预构建提交，仅需安装运行时依赖（改动源码后用 npm run bundle 重新生成 dist/）
npm install --omit=dev
# macOS / Linux 全局启用（推荐）：软链接到 Antigravity 全局插件目录
ln -s "$(pwd)" ~/.gemini/config/plugins/clean-arch
# Windows PowerShell 全局启用：创建目录联接（无需管理员权限）
New-Item -ItemType Junction -Path "$HOME\.gemini\config\plugins\clean-arch" -Target (Get-Location).Path
```

或在目标仓库的 `.agents/plugins.json` 中按项目启用：

```json
{ "entries": [{ "path": "/path/to/opencode-clean-arch" }] }
```

### 通用 MCP 客户端（Claude Code / Cursor / Codex 等）

1. 直接通过 npm 全局安装：`npm install -g opencode-clean-arch`（或克隆仓库后执行 `npm install --omit=dev`，`dist/` 已预构建入库）；
2. 把 `skills/` 复制或链接到客户端对应的 skills 目录（如 `.agents/skills/` 或 `.claude/skills/`）；
3. 在客户端 MCP 配置中挂载 Stdio Server（全局安装后可直接运行 `clean-arch-mcp`，或用 `npx` 免安装启动）：

```json
{
  "mcpServers": {
    "clean-arch": {
      "command": "npx",
      "args": ["-y", "-p", "opencode-clean-arch", "clean-arch-mcp"]
    }
  }
}
```

（若使用本地克隆目录，也可配置 `"command": "node", "args": ["/path/to/opencode-clean-arch/dist/mcp.js"]`。）

### opencode 1.x

```bash
# 从 npm 安装（推荐，自动走镜像源；加 -g 安装到全局）
opencode plugin opencode-clean-arch
```

或手动写配置：

```json
{ "plugin": ["opencode-clean-arch"] }
```

### opencode 2.x

```bash
opencode plugin add opencode-clean-arch
```

或手动写配置（注意 2.x 的键名是 `plugins`）：

```json
{ "plugins": ["opencode-clean-arch"] }
```

固定到某个发布版本时写 `opencode-clean-arch@0.4.4`，版本列表见 [npm](https://www.npmjs.com/package/opencode-clean-arch) 与 [Releases](https://github.com/Gipbear/opencode-clean-arch/releases)。两种写法也都支持直接从 Git 或本地目录安装（如 `"git+https://github.com/Gipbear/opencode-clean-arch.git#v0.4.4"`、`github:Gipbear/opencode-clean-arch`、`/path/to/opencode-clean-arch`）。

> **注意（防配置遮蔽与重启生效）**：若 `~/.config/opencode/`（或项目配置目录）下**同时存在** `opencode.json` 与 `opencode.jsonc`，部分版本的 `opencode plugin` CLI 会把条目写入 `opencode.json`，但启动时后加载的 `opencode.jsonc` 会整体覆盖同名 `"plugin"` 数组导致安装不生效。建议同一目录下**只保留 `opencode.jsonc`**，并在安装或升级插件后重启所有正在运行的 `opencode` 实例。

### 只用 skill，不装插件

把 `skills/` 下的目录复制到项目的 `.opencode/skills/`（或 `.claude/skills/`、`.agents/skills/`）。没有工具时，skill 会改为直接调用 `skills/clean-arch/scripts/*.py`；评审改为在对话里确认。

## 使用

```text
/clean-arch pkg/agent
```

Agent 会：

1. **基线与只读诊断**：跑测试建立基线（`.clean-arch/baseline.md`），顺着入口追踪主干脉络、隐式字典契约、I/O 边界与散落职责，与死代码卫生项分开写入 `.clean-arch/diagnosis.md`，给你 6–12 行摘要；
2. **第一轮评审与执行（目标蓝图对齐 + 减法清扫）**：在 `.clean-arch/plan.md` 顶部给出“一页纸目标架构蓝图”（主干故事线、核心 `@dataclass` 模型、扁平三层模块表），同时列出第一轮减法清扫步骤（删平行版本、合并重复、清死代码与无用兼容层）；你在浏览器评审页面选中文字**评论 / 删除 / 替换**并批准后，Agent 逐步执行清扫并跑验证；
3. **第二轮评审与执行（主干、数据契约与模块边界重塑）**：在噪音清零的代码上更新 `.clean-arch/plan.md` 与 `.clean-arch/rules.toml`，打开第二轮评审页面（自动对比上一轮）；批准后逐步建立 `@dataclass` 契约、将外部 I/O 推到边缘、合拢职责模块、提炼薄主干编排函数；
4. **收尾门禁与架构文档**：通过遗留扫描与 `rules.toml` 分层门禁后，生成/更新 `docs/architecture/`（4+1 视图与自包含 SVG）。

只想要文档：`/arch-map`；专项优化耗时与内存：`/perf-tune -m pkg.job --input sample.dat`；只想检查一次 Agent 改完的代码有没有留尾巴：`/clean-finish main`。

### 评审页面

- 默认监听 `127.0.0.1` 的随机端口，链接带一次性 token，Agent 会在回复里直接给出链接（远程或无桌面环境不会自动打开浏览器，需要自己点开），本机有桌面时也会尝试自动打开；
- 历史保存在 `.clean-arch/reviews/<文档名>/rN.md`（当次文本）和 `rN.json`（当次意见），下一轮自动对比；
- 页面草稿保存在浏览器本地存储，误刷新不会丢批注。

远程开发机（SSH / 云桌面）上使用：

```bash
# 开发机上固定端口
export CLEAN_ARCH_REVIEW_PORT=47123 CLEAN_ARCH_REVIEW_NO_OPEN=1
# 本地电脑转发后打开 Agent 给出的链接
ssh -L 47123:127.0.0.1:47123 <开发机>
```

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `CLEAN_ARCH_REVIEW_HOST` | `127.0.0.1` | 监听地址；设为 `0.0.0.0` 可在局域网访问（链接仍需 token） |
| `CLEAN_ARCH_REVIEW_PORT` | 随机 | 固定端口，便于端口转发 |
| `CLEAN_ARCH_REVIEW_PUBLIC_HOST` | — | 链接中显示的主机名（例如开发机域名） |
| `CLEAN_ARCH_REVIEW_TIMEOUT_MIN` | `120` | 等待评审的分钟数，超时后 Agent 改为在对话中确认 |
| `CLEAN_ARCH_REVIEW_NO_OPEN` | — | 设为 `1` 不自动打开浏览器 |
| `CLEAN_ARCH_PYTHON` | `python3` | 运行分析脚本的 Python |
| `CLEAN_ARCH_LESSONS` | `~/.clean-arch/perf-lessons.md` | `perf-tune` 积累的优化经验文件（用户级，所有项目共用，不进仓库）；Agent 只在实测有效或实测无效时追加，条目里不含路径和项目信息，你可以直接编辑或删除 |

## 产出物

```text
docs/architecture/            给人看：每页 ≤ ~80 行，表格优先；写入工作区但不自动提交
  README.md                   概览 + 系统上下文图 + 视图导航
  logical.md                  逻辑视图：核心类图（≤15 个类）
  development.md              开发视图：模块依赖、分层规则、新代码放哪里
  process.md                  进程视图：运行时进程/服务与通信
  physical.md                 物理视图：部署、资源、配置
  scenarios.md                场景视图：2–4 个关键时序图
  data.md                     数据视图（ML/数据项目）：数据集、模型、产物流向
  decisions.md                设计决策（ADR 精简版）
  diagrams/*.mmd + *.svg      Mermaid 源码与渲染结果
.clean-arch/                  给 AI 看，只在本机，不提交（自动加入 .git/info/exclude）
  modules.md                  模块索引：职责、依赖、新代码放哪
  glossary.md                 术语 ↔ 代码名
  rules.toml                  分层/禁止依赖/规模预算，clean_arch_facts check 校验
  baseline.md diagnosis.md plan.md finish-report.md
  plans/ reviews/             已批准方案与评审历史
  cache/                      临时文件
```

`.clean-arch/` 只是工作状态，换一台机器或重新克隆后不会有；需要长期留给团队的信息都写进 `docs/architecture/`。

Agent 不会自己 `git commit` 或 `git push`：重构的改动和 `docs/architecture/` 都留在工作区，生成的文档质量参差，先检查（Agent 会指出推断较多的页面），满意后再手动提交。

**关于 CodeHub 预览**：CodeHub（CodeArts Repo）目前没有文档化的 Mermaid 渲染（社区仍在提需求），HTML 文件在仓库页面里通常只显示源码而不会作为网页预览，因此文档里用 `![](diagrams/x.svg)` 嵌入 SVG 图片，同时保留 `.mmd` 源码便于修改。SVG 由插件本地渲染，颜色已写死、不引用外部字体，在 CodeHub、GitHub、GitLab、Gitee 和 IDE 预览里显示一致。

## 兼容策略

- 仓库内部的代码移动、改名、合并：**同一次改动里更新所有调用方并删除旧实现**，不留别名、转发函数、`try/except ImportError` 回退、废弃告警和 `_v2`/`_old` 副本；
- 只有方案里列为“外部契约”并经你确认的接口才保持兼容：已发布的包 API、外部脚本依赖的 CLI 参数、磁盘上的文件格式（checkpoint、`state_dict` 键名、pickle 类路径）、网络接口、数据库结构。

## 命令行

不经过宿主客户端也可以使用（支持 Node ≥ 18 或 [bun](https://bun.sh)）：

```bash
npm run bundle                                        # 编译 dist/mcp.js、dist/cli.js、dist/agy-hooks.js 与单文件 MCP App
node dist/cli.js render docs/architecture/diagrams   # 重新渲染 SVG，可放进 CI（有 bun 也可用 bun src/cli.ts）
node dist/cli.js review .clean-arch/plan.md          # 打开评审页面，结论打印到终端
python3 skills/clean-arch/scripts/arch_facts.py --root <repo> summary
python3 skills/clean-arch/scripts/arch_facts.py --root <repo> summary --brief     # 只输出指标表
python3 skills/clean-arch/scripts/arch_facts.py --root <repo> importers pkg.sub.mod  # 删除/移动前查全部引用
python3 skills/clean-arch/scripts/arch_facts.py --root <repo> verify docs/architecture  # 图与代码是否一致
python3 skills/clean-arch/scripts/leftover_scan.py --root <repo> --since main --fail-on high   # 默认退出码恒为 0，--fail-on 用于 CI
```

## 开发

```bash
npm install
npm run bundle       # 构建 Node 产物与 Antigravity MCP App 单文件 HTML
npm test            # 有 bun 时运行 bun test，否则自动使用 esbuild + node --test；随后运行 Python unittest
npm run typecheck
```

代码结构：`src/index.ts` 与 `src/commands.ts` 保留 opencode 1.x/2.x 入口；`src/tools.ts` 与 `src/review/` 为宿主无关核心；`src/adapters/mcp.ts` 提供通用 MCP Server 与 Antigravity 侧边栏 MCP App；`src/adapters/agy-hooks.ts` 提供 Antigravity 只读阶段 `PreToolUse` 护栏；`skills/` 是跨平台 Skill 正文与 Python 脚本。
