# DS节约插件（ds-saver）

OpenCode 2.4.x 与 DeepSeek Harness (DSH) 的上下文/杂活插件，针对 DeepSeek V4.1 Flash 长会话优化：用便宜模型筛掉大段工具输出、预测换窗时机、在质量拐点交接，而不是原地焚化。

## 它做什么

| 工具 | 作用 |
|---|---|
| `misc` | 用便宜官方模型筛选工具输出/日志/文档，只把短结论传回主模型；`agent` 模式最多 3 轮只读文件 |
| `ctx_status` | 只读查看当前会话上下文、缓存命中、成本（调用 `ctx-usage.py`，一键包装到 `~/.local/share/opencode/ds-saver/tools/`） |
| `ctx_forecast` | 预测下一次重开首轮注入、当前任务截至 token、剩余轮次区间与 handoff 回本 |
| `ctx_calibrate` | 预测偏差 > 阈值时，重算 growth/base 范围，写校准交接文档；Qwen3.8 Flash 可选 |
| `ctx_report` | 采集一条匿名会话指标到本地 `metrics.jsonl`，用于真实数据反馈与阈值校准 |
| `handoff` | 生成交接文档并落盘，到 55–60% 时开新窗口，而不是原地焚化 |
| `tree` | 只读输出紧凑目录树；默认忽略依赖/构建目录，拒绝敏感路径，超限标注截断 |
| `rag` | 轻量本地检索；优先 `DS_SAVER_RAG_CMD`，否则内置分词行匹配，返回「文件:行号: 摘要」；`filter: true` 先用便宜模型筛 3–5 条再注入 |

**不做**：不改历史、不删消息、不做原地压缩、不跑 shell、不改文件。

## 模型策略（2026-11-26）

- 主模型：DeepSeek 官方 `deepseek-flash`（即 V4.1 Flash 1017）
- 杂活模型只用三家便宜的官方 API，默认顺序：

| 顺序 | 别名 | 官方模型名 | 官方 Base URL | 输入 / 输出 / 缓存命中（元/百万） |
|---|---|---|---|---|
| 1 | `hy4` | `hy4-flash` | `https://tokenhub.tencentmaas.com/v1` | 0.5 / 2 / 0.02（11-30 前 5 折） |
| 2 | `mimo` | `mimo-v2.6-flash` | `https://api.xiaomimimo.com/v1` | 1 / 2 / 0.02 |
| 3 | `qwen` | `qwen3.8-flash` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 0.8 / 2.7 / 0.1 |

不读取本机 `scnet` / `alibaba-cn` 等路由别名；不把本机模型目录当默认。

## 配置

创建 `~/.config/opencode/ds-saver.json`（建议 600）：

```json
{
  "order": ["hy4", "mimo", "qwen"],
  "timeoutSec": 60,
  "maxOutputTokens": 2048,
  "providers": {
    "hy4":  { "apiKeyEnv": "TOKENHUB_API_KEY" },
    "mimo": { "apiKeyEnv": "MIMO_API_KEY" },
    "qwen": { "apiKeyEnv": "DASHSCOPE_API_KEY" }
  }
}
```

兼容旧版：若新配置不存在但 `~/.config/opencode/ctx-memory.json` 存在，会继续读旧文件；环境变量 `DS_SAVER_*` 优先，旧 `CTX_MEMORY_*` 作为 fallback（含 `HANDOFF_DIR`、`WORKSPACE`、`CONFIG`、`METRICS_FILE`、`CALIBRATION_DIR`、`CALIBRATION_FILE`、`LAST_FORECAST`、`CTX_USAGE`、`SESSION_METRICS`、`SESSION_FORECAST`，以及各 provider 的 `_KEY`）。指标与校准默认写 `~/.local/share/opencode/ds-saver/`，旧目录已有数据且新目录不存在时回退旧目录。

密钥也可以直接写 `"apiKey": "..."`（文件保持 600），或用环境变量：

```sh
export TOKENHUB_API_KEY=...
export MIMO_API_KEY=...
export DASHSCOPE_API_KEY=...
```

### 自定义 provider

```json
{
  "order": ["myvendor"],
  "providers": {
    "myvendor": {
      "baseURL": "https://api.example.com/v1",
      "model": "some-cheap-model",
      "apiKey": "sk-...",
      "body": { "reasoning_effort": "no_think" }
    }
  }
}
```

工具调用时用 `provider/model` 覆盖模型：`{"model":"myvendor/another-model"}`。

## 安装

### 一键安装（推荐）

```sh
git clone https://github.com/T1113047/ds-saver.git
cd ds-saver
DS_SAVER_WORKSPACE=/path/to/your/workspace ./install.sh
```

一次装好：OpenCode 插件 + 三个 skills（`local-index-rag` / `opencode-rag` / `make-decision`）+ 计量与索引工具 + RAG 配置模板。安装器只写模板，不读写密钥，覆盖前自动备份。

只想要插件 shim：`./install.sh --plugin-only`。完整说明见 [`bundle/README.md`](bundle/README.md)。

### OpenCode 手动加载

或在 `opencode.json(c)` 里直接加载本地目录 / npm 包：

```jsonc
{
  "plugins": ["ds-saver"]
}
```

`install.sh` 会在 `~/.config/opencode/plugins/ds-saver/index.js` 建一个 shim。重启 OpenCode 服务，或新开 `opencode --standalone` 会话后生效。

### DeepSeek Harness (DSH)

已在 DSH `0.2.2-rc.5` 的**全新 headless profile** 上实测通过：官方 `dsh plugin add` 安装，`tree` / `rag` / `misc` / `handoff` 四个工具全部被模型实际调用成功。

```sh
# npm 已发布
dsh plugin --profile <profile> add ds-saver

# 本地目录（开发）
dsh plugin --profile <profile> add /path/to/ds-saver
```

Desktop 版可在 **设置 → 插件** 里添加本地目录或 npm 包；命令行里的 profile 换成你实际使用的 `web` / `headless` / 自定义 profile 名。装完 `/restart`（或重启 Desktop）让新行生效。

包内 `cordis.patch.yml` 会以 `ds-saver/dsh` 插入插件行。DSH 端提供 `misc` / `tree` / `rag` / `handoff`；`ctx_status`、`ctx_forecast`、`ctx_calibrate`、`ctx_report` 依赖 OpenCode 会话数据，DSH 不可用。

DSH 端**不 import** `@deepseek-ai/dsh-tools`：第三方插件以 `link:` / 本地目录注入时，Node 不会从 DSH 安装目录解析该 peer（pnpm 会明确警告 linked dependency 不解析 peer）。`dsh/index.js` 内置等价的 `defineDshTool`（参数 DSL → 原始 JSON Schema + 参数校验），因此本地目录、`file:`、npm 三种安装方式都能直接跑。

DSH 需要 `>=0.2.2-rc.5 <0.3.0-0`，实测 0.2.2-rc.5。`tree` / `rag` / `handoff` 不需要密钥；`misc` 仍需配置自己的便宜模型（见上）。完整实测记录见 [`docs/dsh-verification.md`](docs/dsh-verification.md)。

### 不会调试？

把 `README.md`、[`bundle/README.md`](bundle/README.md) 和 [`docs/dsh-verification.md`](docs/dsh-verification.md) 直接喂给 AI，让它按你的工作区、OpenCode/DSH 版本改配置并跑验证。`bundle/` 一键安装包内含 3 个预置 skill 提示词（`local-index-rag` / `opencode-rag` / `make-decision`）和配置模板，装完即可用。

## 用法

主模型可这样调用：

```text
misc(task="从这份构建日志里找出失败原因", paths=["logs/build.log"], max_lines=10)
misc(task="筛选这次 grep 结果里与登录相关的行", material="...", max_lines=20)
misc(task="读这两个文件，找出配置差异", paths=["a.conf","b.conf"], mode="agent")
tree(path="src", depth=3, maxEntries=400)
rag(query="setup 注册了哪些工具", path="src", topK=8, include="*.js")
rag(query="重试逻辑在哪", path="src", filter=true, filter_topK=5, model="hy4")
```

`tree` 默认忽略 `.git`、`node_modules`、`__pycache__`、`.next`、`dist`、`build`、`backups`、`*.pyc`；`rag` 未配置 `DS_SAVER_RAG_CMD` 时用内置检索（单文件 ≤512KB、最多 5000 个文件）。

`rag(filter=true)` 会取最多 12 条候选、命中行前后各 2 行（每条约 800 字符）交给便宜模型，模型返回 JSON 数组后只保留落在候选集合内的 3–5 条，输出 `文件:行号 — 摘要（理由）` 和 `picked N / candidates M`。筛选失败（无 key、HTTP 错误、JSON 非法、空结果）自动回退原始命中，并在 metadata 里标 `filter_fallback` / `filter_error`；`filter=true` 会强制走内置检索，以便拿到结构化路径与行号。

`agent` 模式只允许 `read`：模型返回 `{"read":["路径"]}` 时插件读文件并继续，最多 3 轮；不会执行命令或改文件。

## 实际数据反馈

每个会话可调用 `ctx_report()`：

- 写一条匿名记录到 `~/.local/share/opencode/ds-saver/metrics.jsonl`（600）
- `handoff` 落盘时也会自动写一条（失败不影响交接）
- 字段只有：session hash、模型、消息数、上下文、累计思维链、C/R、tool/reasoning/text 占比、政策档位、成本
- **不含**提示词、正文、代码、路径、标题、IP、密钥
- 是否把 JSONL 提交到 issue 完全自愿

这条链路用于校准阈值，而不是“上传遥测”。插件不自动联网、不自动上传。

公开聚合数据：`data/deepseek-context-2026-11-26.json`  
完整分析：`docs/deepseek-context-data.md`

## 新会话成本（实测）

换窗不是零成本，但比想象便宜：

- 首请求 prompt（system + tools + skills + 首条消息）：**5.4K（p50）/ 10K（p90）**
- 其中 **98% 命中跨会话共享缓存**；未命中仅 **1.2K（p50）/ 5K（p90）**
- 加 handoff + 任务数据 1–5K 后：热启动约 **0.003–0.013 元**，冷启动约 **0.008–0.018 元**
- 对比 500K 旧上下文每轮约 0.010 元：一次 handoff 约 **1–3 轮回本**
- 改 `AGENTS.md` / skills / 工具定义会让共享前缀失效，按冷启动算

详细表格见 `docs/deepseek-context-data.md` §6。

## 动态预测（ctx_forecast）

`ctx_forecast()` 返回：

- 本次任务截至 token：`prompt_total` / `cache_read_total` / `uncached_total` / `output` / `reasoning` / `total_tokens`
- 当前窗口、C/R、每轮增长分位
- 距 300/500/650/800K 的轮次区间（fast/mid/slow，**粗估**）
- 下一次重开首轮 prompt/cost：p50/p90（含 handoff 与任务数据）
- handoff 回本：旧上下文每轮缓存成本 vs handoff + 新会话
- `explain: true`：用 Qwen3.8 Flash 生成 3 行解释（需 DashScope key；没有则只回数学结果）

公式：

```text
C = input + cache.read + cache.write
R = Σ reasoning
G25/G50/G75 = 最近 10 次上下文增量的分位
N(t) = (t - C) / G
P_next = P_base + H_doc + D_task
U_next = U_base + H_doc + D_task
Cost_next = (U_next×p_in + Cache_base×p_cache + O_base×p_out) / 1e6
Payback = (H_doc×p_out + Cost_next) / (C×p_cache)
```

校验（100 个 DS 会话）：

- 首请求预测：**MAE 435 tokens / MAPE 8.5%**
- 到 500K 轮次：**MAE 41 轮 / MAPE 35.7%**；p25–p75 区间覆盖约 **50%**
- 所以“首请求注入”可以当预测用；“还剩几轮”只作粗估，不作为承诺

### 偏差过大时：`ctx_calibrate`

`ctx_forecast` 每次会写 `~/.local/share/opencode/ds-saver/last-forecast.json`。  
若实际偏差 > 50%（上下文 / 下次注入 / 轮次任一），调用：

```text
ctx_calibrate(actual_turns=20, actual_context=620000, actual_next_prompt=11200, explain=true)
```

它会：

- 读最近预测快照 + 实际值
- 重算 `growth_multiplier` 与 `base prompt`（数学确定性）
- `multiplier` 限制在 0.5–2.0；触上限/下限时标 `saturated: true`，提示按绝对阈值行动
- 写 `calibration/latest.json` + 一份 `calibration-*.md` 交接文档
- `explain=true` 时用 Qwen3.8 Flash 写 5 行校准说明
- 下一次 `ctx_forecast` 自动读取 `latest.json`

完整协议见 `docs/calibration-protocol.md`。

## 数据与文档

- `docs/deepseek-context-data.md`：18,471 条 DS 消息、67 个长会话的完整测算与插件页文案
- `docs/calibration-protocol.md`：预测偏差 > 阈值时的 `ctx_calibrate` 协议与交接模板
- `docs/dsh-adapter.md`：双端入口、参数差异与 `engines.dsh` 约束
- `docs/dsh-verification.md`：全新 DSH profile 的安装与四工具实测记录
- `docs/release-automation.md`：GitHub Actions 自动发布与 Community Market 部署说明
- `docs/article-dsh-fresh-install.md`：从翻车到修复的完整发布文章
- `data/deepseek-context-2026-11-26.json`：可公开的聚合数据（无正文/路径/密钥）
- `scripts/measure-context.py`：复现组成、分桶、前后半段、最终分布
- `scripts/session-metrics.py`：`ctx_report` 使用的单会话匿名指标

## 安全边界

- 拒绝读取 `03-密钥`、`.env*`、`auth.json`、私钥、`credentials/secrets` 等路径。
- 材料命中私钥/`sk-`/`tp-`/`api_key=` 等模式时中止，不发给外部 API。
- 材料有总量上限（默认 24K 字符），单文件截断并标注行号。
- 日志不打印密钥。

## 策略建议

- 绿 0–300K：正常，不干预。
- 黄 300–500K：`misc` 筛工具输出，准备 handoff。
- 橙 500–650K：在自然断点 handoff 换窗。
- 红 650–800K：必须换窗；>800K 不建议常驻。
- 50% 窗口（524K）作为绝对提醒上限；60%（629K）作为硬换线。
- 只有必须保留同一会话、且预计还剩 >50 轮时，才考虑原地删工具输出；DS 的缓存价差 50×，小步多次焚化会亏。
- `ctx_status` 在接新任务前跑一次；`ctx_report` 在 handoff 前后各跑一次，积累真实数据。
