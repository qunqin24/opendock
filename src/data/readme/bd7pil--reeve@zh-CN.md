# REEVE

**在 OpenCode v2 上自有的多智能体编排层。**

REEVE 管三件事，这三件事合起来就是它的名字：

| 干什么 | reeve 的历史含义 |
|---|---|
| 把活派给不同的专家 agent | 派工 |
| 自持子任务台账，知道谁在跑、谁死了 | 管账 |
| 不接受 subagent 自述，亲自拿产物验收 | 验活 |

（shire reeve → sheriff：监督并管账的地方官。）

[English](README.md)

## 它是什么

一个 OpenCode v2 插件 + 一个可选的 OpenChamber 面板。它补齐 v2 缺的那几件事——
子任务状态、静默死亡、并发上限、墙钟超时——并且**绝不写 `agents.*.model`**（那是面板的键）。

```
GATE       插件内的代理层：路由 / 回退链 / 台账 / 模型目录
编排层     8 个 subagent + 1 个可见的 foreman、review skill、派工纪律
记账层     子任务台账、并发闸门、超时、跨重启对账
审查层     独立 diff 审查（固定 rubric）
面板       OpenChamber 扩展：链 / 统计 / 台账 / 免费车道
```

GATE 是插件里的纯 JS：**没有代理二进制、没有独立服务、没有 Bifrost/9router**
（后两者已分别在 0.1.8/0.1.5 退役）。

## 环境要求

- Node.js **>= 22**
- OpenCode **v2**（实测 2.0.32 与 2.1.3）
- OpenChamber **>= 2.3.3**（面板；实测 2.5.0）
- `~/.local/share/opencode/auth.json` 里至少一个 provider 凭据

## 安装

### 1. 引擎插件

在 `~/.config/opencode/opencode.jsonc`（或 `opencode.json`）里加：

```jsonc
{
  "model": "reeve/standard",
  "plugins": ["@bd7pil/reeve@0.2.1"]
}
```

- **`model` 必需**。不写的话，裸 `opencode run` / 新 composer 会话可能用引擎默认模型，
  静默绕过 GATE。`reeve/standard` 是成本优先的默认；想换可用
  `reeve/pro` / `reeve/flash` / `reeve/multimodal`。0.2.0 移除了 `reeve/manual`
  单目标档位——要指定模型就在 composer 里直接选。
- 插件自己注册四个档位和全部 agent，并在首次启动时补 `providers.reeve`
  （`http://127.0.0.1:18080/v1`）；只加不改、先备份、保留注释。
- 默认 GATE 端口 **18080**。如果 8080 被占用，显式写：

```jsonc
{
  "model": "reeve/standard",
  "plugins": [
    { "package": "@bd7pil/reeve@0.2.1", "options": { "gate": { "enabled": true, "port": 18080 } } }
  ],
  "providers": {
    "reeve": {
      "package": "@ai-sdk/openai-compatible",
      "settings": { "baseURL": "http://127.0.0.1:18080/v1" }
    }
  }
}
```

### 2. OpenChamber 面板（可选但推荐）

Settings → Extensions，安装：

- **可自更新（git）**：`https://github.com/BD7PIL/reeve#reeve`
- **固定 zip**：`https://github.com/BD7PIL/reeve/releases/download/reeve-latest/reeve.zip`

装完授权 `sessions` + `filesystem`。面板只读快照和 GATE 配置，不会启动会话或发 prompt。

## 档位与 agent

| 档位 | 链 | agent | 用途 |
|---|---|---|---|
| `reeve/pro` | `reasoning` | planner / advisor / critic | 最强推理；文本优先 |
| `reeve/standard` | `standard` | executor / reviewer | 通用中型，支持图片 |
| `reeve/flash` | `free-first` | scout / librarian | 免费优先，失败走付费 |
| `reeve/multimodal` | `vision` | looker | 磁盘图片/PDF；也是图片改道链 |

`foreman` 是唯一可见的主编排 agent，跟随会话选择的模型（顶层默认 `reeve/standard`）。

`looker` 是 hidden、只读的子代理，只处理**磁盘路径**的图片/PDF；粘贴图片由 GATE 直接改道。

默认链（面板可编辑；配置在 `~/.config/opencode/reeve/fallback.jsonc`）：

- `standard`：zhipu glm-5.3-flash → lmuai glm-5.3-flash → 免费 → deepseek
- `reasoning`：zhipu glm-5.3 → deepseek → lmuai glm-5.3-flash → 免费
- `free-first`：免费 → zhipu glm-5.3-flash → lmuai → deepseek
- `vision`：zhipu glm-5.3-flash → lmuai → 免费 → deepseek

## 图片

四个档位都声明 image，引擎不会在 GATE 看到附件前把它剥掉。`reasoning` 收到图片时，
GATE 只把**这一次请求**改走 `vision`；会话模型和 composer 选择都不变，文本请求仍走 GLM-5.3。

OpenCode v2 里粘贴图片没有文件路径（base64 存在会话库里）；纯文本模型只能看到错误文本，
内置 `subagent` 工具也不能带附件。所以粘贴图由代理层改道，`looker` 只负责磁盘路径。

## 免费车道

链里可以写 `@free`。请求时 GATE 从 OpenCode Zen / OpenRouter 发现免费模型，
按 `https://models.dev/api.json` 的 `modalities.input` 过滤（6 小时 TTL，失败保留上一份好数据），
最多展开 `free.max` 个。`require_image: true` 时只保留能吃图的免费模型；元数据拿不到就直接走付费，
不会猜纯文本模型。免费模型失败按全局冷却（默认 3 次 → 600 秒）。

Bifrost 和 9router 已退役，免费路由是 GATE 原生实现。

## 文件与状态

| 路径 | 是什么 |
|---|---|
| `~/.config/opencode/opencode.jsonc` | 引擎配置（插件 + `model`） |
| `~/.config/opencode/reeve/fallback.jsonc` | GATE 链/provider/free 策略（面板可编辑） |
| `~/.reeve/ledger.json` | 面板读的只读快照 |
| `~/.reeve/gate.jsonl` | GATE 请求台账（不含密钥） |

## 升级注意

- 删掉配置里的 per-agent `model` 覆盖；agent 定义由插件负责。
- `reeve/coding` 已不存在，改用 `reeve/standard`。
- 0.2.0 移除了 `reeve/manual` 档位和 manual 链。默认用 `reeve/standard`，要指定模型就在
  composer 里直接选。删掉 `fallback.jsonc` 里的 `manual` 链、`agents.foreman`、
  `chain_for_model["reeve/manual"]`，把 `"model": "reeve/manual"` 改成 `reeve/standard`；
  配置没清干净时插件启动会打警告。
- 删掉旧的 `free.image_models` 静态列表；图片过滤已改为动态。
- Bifrost/9router 的配置、二进制、自启项都已过时，直接删。
- 顶层 `model` 仍然必需。

## 开发

```bash
npm install
npm --prefix plugin test             # 10 个测试文件，194 项断言
npm run test:coverage                # 覆盖率硬门槛
npm run lint
npm --prefix extensions/reeve run build
node extensions/reeve/scripts/audit.mjs --fixture   # 40 项 UI 审计
```

CI 跑 lint、插件测试（Ubuntu 22/24 + Windows 24）、覆盖率、扩展构建/产物一致性、UI 审计、
配置样板和公开树门禁。发布用 npm Trusted Publishing（OIDC）+ SLSA provenance。
发布记录见 [CHANGELOG.md](CHANGELOG.md)。

开发记录（PLAN / HANDOFF / PROGRESS / research）只留在私有开发树，不在公开仓库；
公开文档只链接本仓库里存在的文件。

## 已知限制

- 免费模型目录和限流会变，可用性是 best-effort。
- 第三方中转可能有额度/缓存问题；默认链保留可核对的官方付费兜底。
- 图片改道需要 GATE 启用；PDF/视频没有声明，先转文本或抽文本。
- 审查 subagent 的误报率还没有长周期统计。

## 许可

REEVE 是 MIT。外来内容见 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)：
MIT 的记账实现、Apache-2.0 的审查规则。**不包含 `oh-my-openagent`（SUL-1.0）的任何代码或 prompt 字面。**
