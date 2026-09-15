# mempalace_mth — opencode × MemPalace 自动长期记忆管道

让 opencode 的每一次会话自动沉淀为长期记忆、并在下次会话首条消息自动召回。
基于 [MemPalace](https://mempalaceofficial.com) 记忆宫殿，单一 serve 容器 + 双插件闭环。

## 架构

```
  ① AI 会话工具            ② 自动开采                 ③ 自动注入
  mempalace_search 等      mempalace-sync.ts          mempalace-recall.ts
  (opencode remote MCP)    session.idle 防抖15min      chat.message 首条注入
        │                        │                          │
        │                   uv run sync 脚本            TS 内置 MCP 客户端
        │                   (Python McpHttp)                │
        └────────────────┬───────┴──────────────────────────┘
                         │  全部走 MCP 协议（initialize + tools/call）
                         ▼
              ┌──────────────────────────────┐
              │  mempalace-serve 容器         │
              │  127.0.0.1:8765 · Bearer     │
              │  唯一写者，直管 chroma/sqlite  │
              └──────────────────────────────┘
```

| 组件 | 位置 | 职责 |
|---|---|---|
| export_opencode_sessions.py | `scripts/` | session → JSONL 三级分流导出（high/mid/low + `proj-<slug>` 项目 wing） |
| sync_opencode_to_mempalace.py | `scripts/` | 增量同步编排（HTTP MCP → serve 容器，项目冷启动自动回填） |
| mempalace-sync.ts | `~/.opencode/plugins/` | `session.idle` 触发自动开采（15min 防抖） |
| mempalace-recall.ts | `~/.opencode/plugins/` | `chat.message` 首条消息注入项目记忆 |
| mempalace-serve | `docker/mempalace-serve/` | 宫殿服务容器（127.0.0.1:8765，Bearer token） |

## 配置步骤

### 0. 前置

- [uv](https://docs.astral.sh/uv/)（Python 环境与脚本运行）
- Docker（宫殿服务容器）
- [opencode](https://opencode.ai)（已登录可用）

### 1. 启动宫殿服务

```bash
cd docker/mempalace-serve
docker compose up -d --build
```

说明：

- **端口**：仅宿主 loopback 可达（`127.0.0.1:8765`）；容器内绑 `0.0.0.0` + Bearer token 鉴权
- **Token**：容器内非 loopback 绑定 → serve 首次启动自动生成 0600 token 文件
  `~/.mempalace/server/bearer-token`，后续重启复用同一 token
- **挂载卷**（见 `compose.yaml`）：
  - `~/.mempalace` → 宫殿全部状态（palace/、KG sqlite、锁、token）
  - `~/.cache/chroma` → onnx embedding 模型缓存（167M，避免重建容器时重下）
  - `~/.config/doc_crawler` → session jsonl 导出目录（mine 的 source 路径）
- **entrypoint** 会建立 `/home/zhao → /root` 软链对齐宿主绝对路径（palace 配置与锁
  的 path key 与宿主完全一致），并把 token 从文件注入 env（不进 argv，防 `ps` 泄漏）
- **重启语义**：`restart: unless-stopped`；若宿主残留的 stdio MCP 持有写锁，serve
  启动失败会循环重试，锁释放后自动就绪

验证（`/healthz` 是唯一免鉴权路由）：

```bash
curl http://127.0.0.1:8765/healthz   # → ok
```

### 2. opencode 注册 remote MCP

在 `~/.config/opencode/opencode.json` 的 `mcp` 段添加：

```json
{
  "mcp": {
    "mempalace": {
      "type": "remote",
      "url": "http://127.0.0.1:8765/mcp",
      "headers": {
        "Authorization": "Bearer {file:/home/zhao/.mempalace/server/bearer-token}"
      },
      "enabled": true
    }
  }
}
```

`{file:...}` 语法让 token 从文件读取，不必明文进配置。重启 opencode 后，
AI 会话即获得 40+ `mempalace_*` 工具（search / mine / kg / diary / logstream…）。

### 3. 安装自动化插件

#### 方式一：npm 安装（推荐，无需 clone 本仓库）

已发布为 npm 包 [`@zwidny/opencode-mempalace`](https://www.npmjs.com/package/@zwidny/opencode-mempalace)。
opencode 启动时用 bun 自动安装到 `~/.cache/opencode/node_modules/`：

```json
{
  "plugin": ["@zwidny/opencode-mempalace"]
}
```

插件自带的 Python 脚本（`scripts/` + `pyproject.toml` + `uv.lock`）随包分发，
`mempalace-sync` 触发 `uv run --project <包目录>` 时自动在包内建 venv（首次运行较慢）。

宫殿服务容器同理，从包路径启动（compose 已参数化 `${HOME}`，任意用户名可用）：

```bash
docker compose -f ~/.cache/opencode/node_modules/@zwidny/opencode-mempalace/docker/mempalace-serve/compose.yaml up -d --build
```

#### 方式二：git clone（开发本仓库时）

两个插件位于本仓库 `plugins/opencode/` 目录，**自包含入口、随仓库 git 管理**：

```text
mempalace_mth/plugins/opencode/
├── index.ts             # 聚合入口（目录无 package.json → opencode 自动认它）
├── mempalace-sync.ts    # session.idle → 防抖触发 sync 脚本
└── mempalace-recall.ts  # chat.message 首条 → 检索 proj wing → 注入
```

在 `~/.config/opencode/opencode.json` 中注册（与其他插件完全隔离）：

```json
{
  "plugin": [
    "file:///home/zhao/repos/mth/mempalace_mth/plugins/opencode",
    "file:///home/zhao/.opencode/plugins"
  ]
}
```

> **加载机制**（opencode 源码 `plugin/shared.ts` 的行为）：
> - 目录型入口只认 `index.ts`（或 `package.json` 的 main），**不扫描目录内散文件**
> - 文件/目录型入口由 loader **逐个独立加载**——单个插件故障只上报错误，不波及其他插件
> - 插件模块的导出按**引用去重**后逐个实例化（`export const X` 与同引用的 default 只算一个）
> - bun 原生执行 TS，无需构建步骤
>
> 采用独立目录而非寄生在共用 `~/.opencode/plugins/index.ts`，正是为了与 ECC 等
> 其他插件体系互不影响（同一形态的参考实现：opencode-hindsight）。

插件职责：

- **mempalace-sync**：`session.idle`（每轮回复结束）触发，15 分钟防抖，
  detached 运行 `uv run --project <本仓库> python scripts/sync_opencode_to_mempalace.py --recent 20`
- **mempalace-recall**：每个 session 的**首条用户消息**发出时，按当前项目目录
  检索 `proj-<slug>` 项目 wing（不足时全局 wing 兜底），把命中的
  「原文片段 + 出处」以 synthetic part 注入消息最前（1500 字符预算）

### 4. 同步脚本

```bash
uv sync   # 安装依赖（本仓库 pyproject）

# 手动用法（与插件等价，幂等可重跑）：
uv run python scripts/sync_opencode_to_mempalace.py --dry-run        # 预览
uv run python scripts/sync_opencode_to_mempalace.py --recent 30      # 增量同步
uv run python scripts/export_opencode_sessions.py --session <id> --force  # 单会话重导
```

分级策略：会话**不丢弃**，按价值分级导出——`high`（主会话全文）/ `mid`（调研类子任务，
滤过程播报）/ `low`（杂讯，仅任务描述+结论），分别进入 `opencode-sessions-high/mid/low`
或 `proj-<项目slug>` 项目专属 wing；项目首次出现新 session 时自动回填该项目全部历史。

> **wing key 策略**（与 opencode 的 project_id 同源，`packages/core/src/project.ts`）：
> 项目 wing 名优先由 **git origin remote** 归一化派生（如
> `proj-github.com-zwidny-opencode-hindsight`），无 remote 时回退目录 basename——
> 因此**目录改名不导致记忆断层**；确需改名的本地项目可用脚本内 `WING_ALIASES`
> 别名映射保持连续。

### 5. 验证闭环

1. 在任意项目目录打开 opencode，发送首条消息 → 消息前应出现
   `[MEMPALACE 项目记忆 | proj-<slug>]` 注入块（该项目 wing 非空时）
2. 让 AI 调用 `mempalace_status` / `mempalace_kg_query` → 返回宫殿概况与项目事实
3. 会话结束 15 分钟后查日志 `~/.config/doc_crawler/_docs/.opencode-sync.log`
   应出现本轮 session 的开采记录

## 运维与已知事项

- **日志**：`~/.config/doc_crawler/_docs/.opencode-sync.log`（sync）；
  `docker logs mempalace-serve`（容器）
- **已知坑**：
  - `.mdx` 不在 miner 扩展名白名单（`miner.py:138-179`），入库前需转 `.md`
  - opencode 插件的 `session.idle` 必须走官方 `event` 总分发器，不能写成独立 hook key
  - CLI 与 serve 并发写会锁冲突——所有写操作统一走 HTTP MCP（单写者模型）
- **接口决策**（2026-09-14）：评估过「插件绕开 MCP 直连 REST」，因收益 < fork 维护
  成本而放弃，MCP 为全系统统一接口层

## 记忆维护协议

会话收尾写日记、事实变更进 KG 等协议见 [AGENTS.md](AGENTS.md)；
已落定的关键事实（端口/版本/策略）可用 `mempalace_kg_query(entity="mempalace_mth")` 查询。
