# OpenCode 中文技能工坊（opencode-skill-creator-zh）

把 [antongulin/opencode-skill-creator](https://github.com/antongulin/opencode-skill-creator) 改写成**中文 + 单 CLI 工具**的 OpenCode 插件：一个工具、一个 `args` 字符串、一套中文帮助与错误文案。

> 当前状态：**B0–B6 全部完成**，7 个子命令均已可用，`npm test` 可跑（287 例全绿，Node 22.3+ 与 24 均实测）；上游继承缺陷台账目前是**已修 7 条 + 待修 0 条**（见 [docs/design/上游携带缺陷台账.md](docs/design/上游携带缺陷台账.md)）；**CI 已补**（`.github/workflows/ci.yml`：push / PR 跑 typecheck + test + `npm pack --dry-run`）。**npm 发布尚未做**：由用户手动执行 `npm publish`。落地批次与实测结论见 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 是什么

面向中文用户与中文技能（`SKILL.md` 用中文写）的技能创建工具，覆盖技能开发期的完整闭环：

```
新建骨架 → 校验结构 → 评测触发率 → 迭代 descriptions → 打包交付
```

只做技能开发期辅助：不改变 OpenCode 自身的技能加载/发现机制，也不替 agent 决定技能写什么内容。

## 单工具理念

上游把 14 个 `skill_*` 工具一次性塞进工具列表：英文 snake_case 命名、每个工具各带一段 description 与一套参数 schema，常驻上下文却大部分时间用不上。

本版收敛成 **1 个 CLI 风格工具** `skill_zh`：

| 约定 | 做法 |
|---|---|
| 工具数量 | 只注册 1 个 `skill_zh`，其余能力藏在子命令后面 |
| 入参 | 只有一个 `args: string`，形如 `"validate ./skills/demo"`，由插件内部解析 |
| 自解释 | `skill_zh help` 覆盖全部子命令与可复制示例，模型不用猜 |
| 描述极简 | 工具 description ≤ **60** 字符，只讲做什么，不讲用法（用法交给 `help`） |
| 失败可修 | 错误统一三段式：`错误：` / `改法：` / `可用：skill_zh help` |
| 自包含 | 文案与文档不指向其它技能目录 |

## 安装

两种方式都要求重开 OpenCode 后生效。细节（路径、共存、回滚）见 [docs/installation.md](docs/installation.md)。

### 方式一：npm 包

```sh
npm i -g @xiaoqiong0v0/opencode-skill-creator-zh
```

在 `~/.config/opencode/opencode.jsonc` 的 plugin 列表里加入包名，重启 OpenCode：

```jsonc
{
  "plugin": ["@xiaoqiong0v0/opencode-skill-creator-zh"]
}
```

### 方式二：本地插件目录

适合开发调试或离线环境：先 `npm run build` 产出 `dist/`，再让 OpenCode 从本地路径加载该插件目录，重启 OpenCode。

### 技能装在哪

插件 npm 包内自带唯一一份 `skill/`（与 `dist/` 平级）。安装后技能落在 `~/.config/opencode/skills/opencode-skill-creator-zh/`，与上游英文版技能（`opencode-skill-creator/`）**目录名不同、可共存**。为什么入包、配套约束是什么，见 [docs/design/技能打包决策.md](docs/design/技能打包决策.md)。

装到用户级技能目录 **≠** 一定生效：若 `~/.claude/skills`、`~/.agents/skills` 或项目级目录存在同名技能，按扫描顺序可能被后者覆盖，详见 [docs/installation.md](docs/installation.md)。

## skill_zh 子命令速查

| 子命令 | 作用 | 示例 |
|---|---|---|
| `help` | 打印完整用法与全部示例 | `skill_zh help` |
| `new` | 按中文模板生成技能骨架（`SKILL.md` + `references/`） | `skill_zh new api-doc-writer --dir ./skills` |
| `validate` | 校验 `SKILL.md` 结构、frontmatter 字段与 description 长度（`--strict` 把长度与命名从提示升为错误） | `skill_zh validate ./skills/api-doc-writer` |
| `eval` | 跑触发率评测，给通过率、失败用例与汇总数据 | `skill_zh eval ./skills/api-doc-writer --runs 3 --workers 4` |
| `optimize` | 按评测失败迭代改写 description（训练/测试集切分） | `skill_zh optimize ./skills/api-doc-writer --iterations 5` |
| `package` | 只导出可分发技能目录（`--out` 必填；npm 发布由用户手动执行） | `skill_zh package ./skills/api-doc-writer --out ./skills-package/api-doc-writer` |
| `install` | 把包内 `skill/` 装到用户级技能目录（`--dry-run` 只探测不写盘；`--force` 才覆盖本地改过的 `SKILL.md`；`--dir` 改目标根） | `skill_zh install [--dry-run] [--force] [--dir <目标根>]` |

逐个子命令的参数、输出示例与失败示例见 [docs/tools.md](docs/tools.md)。

## 开发

```sh
npm run build      # prebuild 先清 dist/，再由 tsc 直出 dist/
npm test           # node --test --experimental-test-module-mocks（要求 Node >= 22.3）
npm run typecheck  # tsc --noEmit
```

- `dist/` 不入库（`.gitignore` 已忽略），发布产物只有 `dist/`、`skill/`、`templates/`、`README.md` 四部分（`templates/` 是 `new` 生成骨架的运行必需）。
- 上述命令在本仓当前可直接运行（要求 Node ≥ 22.3）；`npm test` 287 例全绿。
- 编码规范见 [docs/CONVENTIONS.md](docs/CONVENTIONS.md)，需求与验收口径见 [docs/SPEC.md](docs/SPEC.md)。

## 与上游区别

| 维度 | 上游（0.3.6） | 本版 |
|---|---|---|
| 工具数量 | 14 个 `skill_*` 工具 | 1 个 `skill_zh`（子命令分发） |
| 注册点 | 每个工具各注册一次 | `src/` 下只有 1 处工具注册 |
| 语言 | 英文 description / 输出 / 错误 | 全中文（含 `help` 与错误改法） |
| 入参形态 | 每个子命令一套 typed args | 单 `args: string` |
| 构建 | bun 打包脚本产出单文件 | `tsc` 直出 `dist/`，`node --test` 跑测试 |
| 技能分发 | 启动时安装随包技能到用户级目录 | 保留入包分发，目录名与本包一致（`-zh` 后缀） |
| 非核心能力 | 另含 gold ×4、review ×3 共 7 个工具，以及 benchmark 汇总、HTML 报告 2 个工具（合计 9 项） | **这 9 项不注册为工具**：gold / review 的 7 项实现保留在 `src/lib/`；benchmark 汇总与 HTML 报告不单独注册、也不单独开子命令——本版 `eval` 只输出**文本汇总 + JSON 报告**，**HTML 查看器未提供** |
| 包名 / 版本 | `opencode-skill-creator` | `@xiaoqiong0v0/opencode-skill-creator-zh`，独立版本线 |

未改动：`src/lib/` 承接的上游执行逻辑（校验、评测、迭代改写、报告、安装器），本版只做接线与中文化，不重写已验证算法。

## 相关文档

| 文档 | 用途 |
|---|---|
| [docs/README.md](docs/README.md) | 文档索引 |
| [docs/SPEC.md](docs/SPEC.md) | 需求与验收口径（R1–R7） |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 批次 B0–B6 实施清单 |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | 编码与文档规范 |
| [docs/tools.md](docs/tools.md) | `skill_zh` 子命令参考 |
| [docs/installation.md](docs/installation.md) | 安装、共存、升级与回滚 |
| [docs/design/技能安装与目录问题.md](docs/design/技能安装与目录问题.md) | 技能安装与目录的 6 条坑（发现源、拷贝范围、元数据、禁用手段、大小写、升级保护） |

## 来源与许可

本项目是 [antongulin/opencode-skill-creator](https://github.com/antongulin/opencode-skill-creator) 的中文 fork，未经上游团队背书。上游以 Apache License 2.0 发布，本版沿用同一许可，全文见仓库根目录 `LICENSE`。

保留的上游资产（`src/lib/` 执行逻辑、随包技能正文与模板）同样受该许可约束；二次分发请保留许可与版权声明。
