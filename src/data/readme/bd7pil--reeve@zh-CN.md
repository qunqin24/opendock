# REEVE

**在 opencode v2 上自有的多智能体编排层。**

REEVE 管三件事，这三件事合起来就是它的名字：

| 干什么 | reeve 的历史含义 |
|---|---|
| 把活派给不同的专家 agent | 派工 |
| 自持子任务台账，知道谁在跑、谁死了 | 管账 |
| 不接受 subagent 自述，亲自拿产物验收 | 验活 |

（shire reeve → sheriff：监督并管账的地方官。）

## 为什么需要它

被控端从 **opencode v1 + `oh-my-openagent`(omo)** 迁往 **openchamber + opencode v2**，
而 **omo 在 v2 上加载即失败，且上游明确拒绝移植**（issue #9389，维护者原话：
*"We are not taking the full port into this repo… the full omo experience is shipped as OmO Native."*）。
omo 在 v2 上拿到的全部支持是"加载 + 每次启动弹一个指向 OmO Native 的广告"（PR #10439，4 个文件）。

于是**不 fork**，改为把四件事拆成四层，各用各的许可：

```
代理层   跨 provider 回退        GATE（插件内，自己写的）     没有二进制、没有独立服务；与引擎版本无关
编排层   调度纪律 / 四阶段流程    prompt + agent 定义（自写）  机制 v2 原生给足，这层是文本
记账层   台账 / 静默死亡 / 并发    本仓库的 opencode plugin     v2 只缺这八条
审查层   代码 diff 独立审查       吸收 OCR 的规则（Apache-2.0） 不装工具，抄 rubric
```

## 读什么

> **本项目的读者是从零开始的执行 agent。** 开工前先读 **[docs/PLAN.md](docs/PLAN.md)**
> ——它给出组件与所有权、实施顺序（步 0→5）、每步的硬门槛。
> **[docs/HANDOFF.md](docs/HANDOFF.md) §15（执行协议）** 给出最小必读集、必须问使用者的四件事、不许跨过的红线。
> **写代码前必读** **[docs/research/opencode-v2-plugin-api.md](docs/research/opencode-v2-plugin-api.md)**
> ——v2.0.32 插件 API 的实测施工图；**HANDOFF §6.1 的旧挂载点写法已被它取代**。

| 想干什么 | 读 |
|---|---|
| **开工（先读这个）** | **[docs/PLAN.md](docs/PLAN.md)**（组件与所有权 / 步 0→5 / 硬门槛） |
| 写插件前 | **[docs/research/opencode-v2-plugin-api.md](docs/research/opencode-v2-plugin-api.md)**（v2 API 实测施工图） |
| 理解全貌与所有决策依据 | [docs/HANDOFF.md](docs/HANDOFF.md)（16 节；**注意标了"勘误"的段落**） |
| 看做到哪了 | [docs/PROGRESS.md](docs/PROGRESS.md)（每步验收记录） |
| 查一手证据 | [docs/research/orchestration-stack-verdict.md](docs/research/orchestration-stack-verdict.md)（归档，**若干条已被取代**） |
| 引入外来内容前 | [NOTICE.md](NOTICE.md)（许可边界） |

> **公开树不含 `docs/`**：GitHub 上的 `main`、以及 npm 包，只发布代码 / 配置 / README / 许可文本。
> 上面的开发记录（PLAN、HANDOFF、PROGRESS、research）与 `.zcode/` 施工草稿**只留在开发仓库**，
> 用 `bash scripts/publish-repo.sh` 导出公开树时被剪掉，也不进公开历史。
> 所以下文里 `§6.11` 这类引用指的都是那份本地记录。

## 状态（2026-10-19 晚）

**步 0–6 全部产出完成，并已在 EL7 上跑完整轮实机验收**（隔离 `HOME` 的 staging；生产 v1 引擎全程未动）。

| 步 | 产出 | 实机验收 |
|---|---|---|
| 0 | 计划 / 施工图 / HANDOFF 勘误 | — |
| 1 | `agents/*.md` 9 个 agent（8 个 subagent 标 `hidden`） | ✅ 权限闸门、验收独立性、多轮评审；**前台只可见 `foreman`** |
| 2 | `plugin/` 记账层（**135** 项测试） | ✅ 并发排队 / 墙钟中断 / 跨重启对账 / 台账落账与读回 / **名册补进 `subagent` 工具描述** / **代理自持（纯插件形态）** / **链热更（≤4 s）** / **性能统计与代理侧互校** |
| 3 | `skills/review/` 审查层 | ✅ 真 diff 抓到、带行号、结构化输出 |
| 4 | ~~`proxy/` Bifrost 链 + 部署脚本~~（**已被 GATE 取代**：插件内路由/回退/台账，无二进制） | ✅ 历史记录；现态见上文「代理层」与 [docs/GATE.md](docs/GATE.md) |
| 5 | `extensions/reeve/` 控制台面板（**链编辑 + 统计 + 台账**） | ✅ 真装进 openchamber 2.3.3、真渲染、台账经宿主文件桥读到；**面板里改链 → 保存 → 运行时规则热更 → 显示"已生效"** |
| 6.7 | **整个系统搬进插件包** | ✅ agent 与 skill 由插件注册；**配置目录里只剩 `opencode.jsonc`**；EL7 实测（配置目录清空后委派照常） |
| 6.8 | **端点自举** | ✅ 配置里**只剩插件一行**：插件首次启动自己写 `providers.reeve`（只加不改/备份/自校验/保留注释）；EL7 实测 |
| 6 | `config/` 引擎样板 + 前台可见性 + 同步语义 | ✅ 见 [PROGRESS.md](docs/PROGRESS.md) §6（含四组 Bifrost 同步实验） |
| 6.6 | **纯插件形态**：代理归插件自持 + **配置瘦身** | ✅ 取件/拉起/复用/守护全在插件里；**配置只剩「两行端点 + 一行插件」**；EL7 全新机器模拟实测（无脚本、无 VK、无 ocrc） |
| 6.11 | **可视化面板**：链编辑（只写 `~/.reeve/chain.json`）+ 性能统计（Bifrost 归因 / 编排台账） | ✅ EL7：面板里调序 + 加回退 → 保存 → 运行时 `routing_rules` 变、快照 `appliedAt` 前进；统计与直读 `logs.db` 互校 PASS；四轮多模态评审「可以收尾」 |
| 6.12 | **发布链**：CI 四道闸门 + npm 发布（OIDC / provenance）+ 公开树导出 | ✅ `@bd7pil/reeve@0.1.1` **由 CI 发布、带 SLSA provenance**（registry `latest`）；CI 四 job 全绿；远程 `docs/` = 404、无内网地址；**EL7 实测 registry 形态真装载**（取件 → `loading plugin` → 8 agent / 1 skill / 名册注入 / 端点自举 / 快照落盘） |

> ⚠️ **一条必读**：裸 `opencode run`（不带 `--model` / `--agent`）会**静默旁路** REEVE ——
> 客户端会自带一个默认模型，服务端照用（实测消息里 `agent=foreman` 但 `model=opencode/minimax-…`
> 且代理里没有任何对应行）。要让默认会话就走档位：引擎配置里加一行 `"model": "reeve/pro"`
> （已实测：加了之后裸 run 也出 `rule=reeve/pro` 日志）。详见 [PROGRESS.md](docs/PROGRESS.md) §6.11。

**四处关键未知已实测解决**：opencode v2 忽略响应体的模型名（→ 代理可用虚拟别名，但**引擎侧永远看不到真服务模型**）；
v2 插件 API 的真实形态（钩子真名、**`codemode:false` 才是工具可见性开关**、存储键是 `plugin:<hex(id)>:` …）；
**agent 可见性的三个开关**（`mode` / `hidden` / `disabled`）与 openchamber 的两条直达路径（composer 选 primary、`@` 提及列非 primary 且非 hidden）；
**v2 的 provider 传输层钩子能替换请求**（`http.request`/`retry`，见 PROGRESS §6.5）。

**仍开放的一项**（如实标着，不冒充通过）：
**审查 subagent 的误报率** —— 按默认"severity 都不卡流程"跑两周再统计。

> 「零冲突」两层都已验：**机制层**（插件无 `agents`/`model` 写路径；引擎配置 mtime/hash
> 在 6+ 轮会话后不变）+ **面板层**（在 EL7 的 openchamber 的 Agents 页真保存一次：
> 只新增一个 user 作用域 agent md，`opencode.jsonc` / `opencode.managed.json` / staging 配置
> **逐字节未变**；缺项目上下文时是 400 + 界面报错，不是静默）。见 [PROGRESS.md](docs/PROGRESS.md) §5.5。

**下一步的活（都在别的仓库）**：
1. 配置目录隔离（杠杆 = **`HOME`**，两端已实测）落进 ocrc 的实例启动行；
2. GATE 的配置同步（`~/.config/opencode/reeve/`）进 ocrc 的 sync 清单；
3. 9router（免费车道）在两端的常驻安装与 pin。

> 上机踩到的坑（**各自都是静默失败**：配置合法、能加载、只是必然出错）与逐条证据：
> [docs/PROGRESS.md](docs/PROGRESS.md) §4.4（12 条）+ §5.3。

## 安装与发布

**插件（引擎侧）**：从 npm registry 一行装 —— 引擎自己把它取进全局 npm 缓存，机器上不需要检出。

```jsonc
// $HOME/.config/opencode/opencode.json
{ "model": "reeve/pro", "plugins": ["@bd7pil/reeve"] }
```

（`plugins` 条目过 `npm-package-arg`：包名 / 版本 / tag / git spec / 绝对路径都支持；
目录形态是 EL7 上实测过的，registry 形态走的是同一条路径。完整配置见 [plugin/README.md](plugin/README.md)。）

**CI 与发布**（都在公开仓库上跑，`.github/workflows/`）：

| 动作 | 触发 | 干什么 |
|---|---|---|
| CI | push `main` / PR | 插件 **135** 项测试（node 22 与 24 各一遍）· npm 包内容断言（许可文本要在、`docs/` 与密钥不许在）· 扩展守门 + **重建后产物必须逐字节一致** · 引擎配置样板校验 |
| **发布（正路）** | `bash scripts/publish-repo.sh --tag` | 导出公开树 → 把 `v<plugin 版本>` 标签打在**公开树那次提交**上 → CI 用 OIDC 发布（**带 SLSA provenance**）；标签已存在就跳过 |
| 发布（手动） | 推 tag `v<版本>`（或派发工作流，默认彩排） | 标签↔版本对表 → 这个版本还没发过 → 测一遍 → 包内容断言 → `npm publish --access public --provenance` |

**发布凭据：npm Trusted Publishing（OIDC）——仓库里没有任何 npm secret。** 已配好（`npm trust github @bd7pil/reeve --file publish.yml --repo BD7PIL/reeve --allow-publish`）。
引导顺序有个硬约束：`npm trust` **要求包已存在**，所以第一版（0.1.0）是本机手动发的（走 npm 网页 2FA、不带 provenance）；
**0.1.1 起全部由 CI 发布、带 provenance**（registry 上 0.1.1 的 `dist.attestations.provenance.predicateType = slsa.dev/provenance/v1`）。
要改走 token 方案时，加一个仓库 secret `NPM_TOKEN` 就行——工作流是"有它用 token、没有回落 OIDC"，代码不用动。

**面板扩展**（`extensions/reeve/`）走宿主另一套：路径 / 公网 zip / git 分支三种装法，
**只有 git 形态能自更新**（宿主 `updateGuest` 只认 git 源）。发布走
`.github/workflows/reeve-extension.yml`（手动 dispatch）：

- `reeve.zip` → Release 资产；pin `reeve-<版本>` 不变，通道 `reeve-latest` 每次覆盖，
  稳定安装地址 `https://github.com/BD7PIL/reeve/releases/download/reeve-latest/reeve.zip`
- `extensions/reeve` → `git subtree split` 镜像到 `reeve` 分支
  （`https://github.com/BD7PIL/reeve#reeve`，可自更新）

**`provision.json`（插件包根，随 npm tarball 发布）** 是给装配器（ocrc）读的安装契约：
插件 spec 与目录回退、扩展 zip、要同步的配置路径、发布后检查。
**没有二进制工件** —— GATE 代理层是插件里的纯 JS，手动安装就是上面两条命令。

## 命名派生

```
品牌        REEVE
机器标识    reeve
仓库        github.com/BD7PIL/reeve （公开树：不含 docs/ 与 .zcode/）
npm 包      @bd7pil/reeve          插件（MIT）
扩展目录    extensions/reeve        panel.id = reeve
台账        ~/.reeve/ledger.json
配置        ~/.config/opencode/reeve.jsonc（用户级）/ .opencode/reeve.jsonc（项目级）
tag         插件 v<ver>（发布用）；扩展 reeve-<ver> / reeve-latest（资产，待建）
发布资产    reeve.zip（面板扩展，待建）
```

## 许可

本仓库自写的代码自行决定。**但有两处外来内容必须随行声明**：

- 抄自 **`oh-my-opencode-slim`（MIT）** 的记账实现 → 带上其 `LICENSE`
- 抄自 **`alibaba/open-code-review`（Apache-2.0）** 的规则文档 → 带上其 `NOTICE`/`LICENSE`

**绝不可引入 `oh-my-openagent` 的任何代码或 prompt 字面**——它是 SUL-1.0，不可再授权、永久。
详见 [docs/HANDOFF.md](docs/HANDOFF.md) §10。
