# opencode-idea

把当前项目接入 IntelliJ IDEA 的 MCP Server，让 OpenCode 在项目内优先使用 IDE 工具；同时提供远程执行 / 文件同步 / 远程部署。

> 只支持 **OpenCode V2** + **IntelliJ IDEA 2026.3+**，并需要安装配套插件
> [`idea-mcp-enhance`](https://github.com/syllr/idea-mcp-enhance)（当前 0.1.16 的
> `sinceBuild` 是 263，2026.2 装不上）。

## 它做什么

- **接入 IDE**：把当前项目注册成一个 MCP server（固定名 `ide`），模型看到的工具名是 `ide_*`
- **远程能力**：`remote_exec` / `remote_upload` / `remote_download` / `remote_list_servers`
- **部署**：通过 IDE 的 `RemoteProcess` run configuration 做「差量同步 + 远端启动」
- **工具治理**：合并工具引导、隐藏不需要的 IDE 工具、接管少数参数和描述

## 安装

```bash
opencode plugin add opencode-idea
```

等价配置（V2 使用 `plugins`）：

```jsonc
{
  "plugins": ["opencode-idea"],
}
```

### 本地开发

V2 解析目录插件时找 `<dir>/index.*`（仓库根的 `index.js` 负责转发到 `src/index.js`）。把全局配置指向仓库目录即可：

```jsonc
{
  "plugins": ["/Users/yutao/IdeaProjects/opencode-idea"],
}
```

本地目录会被**递归监听**：改插件源码会触发 OpenCode 热加载。正常使用请装 npm 包；开发时再临时指向源码目录。

### 前置条件

- IDEA 2026.3+，开启 **MCP Server**（Streamable HTTP `/stream`）和 **Brave Mode**
- 安装 `idea-mcp-enhance`；部署那组能力还要求 Ultimate
- 只实现了 macOS 的 `open -a` 自动拉起；其他平台需手动打开 IDE 和项目

## 命令

| 命令 | 作用 |
| --- | --- |
| `/open-in-ide` | 接入当前项目：探测、必要时打开项目、注册 IDE MCP |
| `/delete-in-ide` | 注销 IDE MCP 并删除本项目的接入标记 |
| `/remote-config-sync` | 全量双向对齐：IDE SSH 配置写回 hosts.json，deployment 推到 IDE |
| `/remote-shell` | 提示词命令：引导用 `remote_exec`，不拼 ssh/scp |
| `/remote-files` | 提示词命令：只做文件上传 / 下载 |
| `/remote-deploy` | 提示词命令：引导用 `ide_deploy_remote_process` 部署（需已接入 IDE） |

### `/open-in-ide` 的判定

- 从 `64342` 起扫描 `64342–64361`（IDE 端口可漂移/自配），用 `get_project_env` 比较项目路径
- **`ok`**：项目已打开 → 直接注册
- **`busy`**：端口在、但索引/忙导致没答完 → **只按 1/2/4 秒退避重试，绝不拉起 IDE**
- **`no-project`**：IDE 在、项目没开 → 显式命令前台 `open -a`；自动自愈用 `open -g`（不置前）
- **`down`**：TCP 连不上 → 允许拉起；自动路径用 `open -g`，实际拉起最多 3 次，之后只探测
- 每次探测/工具调用结束都会 `DELETE` MCP session，避免 IDE 侧堆积 abandoned session

`prompt` 钩子里的探测最多等 6 秒；后台探测 / 显式命令的探测预算 25 秒，拉起 IDE 后再另等最多 60 秒。初始化 5 秒，`get_project_env` 单次 15 秒。

### 结果反馈

- 成功类（`connected` / `deleted` / `synced`）走 `session.synthetic`：只入会话、不调度模型
- 失败或需要用户动手的（`mcp-unavailable` / `env-unready` / `sync-partial`）走 user 消息，立刻上屏

## 远程配置：`hosts.json`

deployment 的**唯一事实源**是项目里的 `.opencode/remote-shell/hosts.json`；IDE 的 Deployment 面板是它的投影。

### 三层来源

| 层 | 位置 | 用途 |
| --- | --- | --- |
| IDE | SSH Configurations | 连接信息与凭据；同名时优先 |
| 项目 | `<项目>/.opencode/remote-shell/hosts.json` | deployment 来源；`localPath` **必须相对项目根** |
| 全局 | `~/.config/remote-shell/hosts.json` | 跨项目服务器；`localPath` **必须绝对** |

- 项目级 `localPath` 用相对项目根的 `/` 路径（`apps/agent-server`）；绝对路径、`~`、`..`、`\` 一律报错
- `deployPath` 必须是远端 POSIX 绝对路径（`/srv/app`），不能是 `/` 本身，也不能含 `..`
- `exclude` 只支持路径前缀或精确文件；deployment 名全局唯一；`authType` 可省略
- 三层合并口径、重名冲突、哪些条目推 IDE：见 `remote-deployment` skill

### `/remote-config-sync`

- **server**：IDE SSH 配置 → hosts.json（只写连接字段，保留已有 `alias` / deployments / exclude）
- **deployment**：hosts.json → IDE Deployment 面板（只增/改，**不删**）
- IDE 里有、hosts.json 没有的条目以 `orphaned` 报回来
- 项目级 `localPath` 不合规会点名原因，其余合规条目照常推
- hosts.json 损坏时**不覆盖**：备份成 `hosts.json.bad` 并报错；插件写回是原子写
- server 级 `exclude` 会合并到推给 IDE 的 deployment
- **全局 hosts.json 的 deployment 不会推 IDE**，只参与本机 `remote_*`，列表标 `[全局，不推 IDE]`

### 改 hosts.json

没有单独命令：加载 `remote-deployment` skill，用它的 `assets/hosts.mjs`：

```bash
# $SKILL_DIR = 本 skill 的目录
node "$SKILL_DIR/assets/hosts.mjs" audit  --project .
node "$SKILL_DIR/assets/hosts.mjs" upsert --project . --server mbp --name my-app \
  --local-path apps/my-app --deploy-path /srv/my-app --exclude node_modules,logs
node "$SKILL_DIR/assets/hosts.mjs" remove --project . --name my-app --yes
```

改完下一次工具调用会自动对账；`remote_list_servers` 里每条 deployment 会带
`[已同步到 IDE（created/updated/unchanged）]`、`[待对账]`、`[全局，不推 IDE]` 或 `[未推到 IDE：…]`。

## 远程工具

| 工具 | 作用 |
| --- | --- |
| `remote_list_servers` | 服务器 + deployment；带 `[IDE]` / `[项目]` / `[全局]` 来源、`⚠`、推送状态 |
| `remote_exec` | 在远端执行一条命令；15 秒内没结束返回 `runID`，续查按 2/4/8 退避 |
| `remote_upload` | 本地目录 → 远端目录；默认 `overwrite`，`mirror` 删远端多余文件 |
| `remote_download` | 远端目录 → 本地目录；语义相同 |

- 每条 `remote_exec` 是独立 SSH 连接：`cd` / `export` 不跨命令保留，需要目录就传 `workingDirectory`
- **等待不要用裸 `sleep N`**：有返回值就等返回；有状态就在同一条命令里轮询终态（`sleep 0.5` 只在循环内）；有事件就监听事件，超时只作为失败上界
- `remote_upload` 源（本地）不存在：报告「未做任何修改」；目标远端目录不存在会自动创建
- `remote_download` 源（远端）不存在：报告「未做任何修改」，`mirror` 也绝不删本地；本地目标不存在会自动创建

## Run Configuration / Remote Process

run configuration 是项目资产：`.run/<名字>.run.xml`。增删改走 `idea-run-config-manager` skill，它同时维护项目根
`AGENTS.md` 里的运行档案块。

- **Run**（`ide_rerun_run_configuration`）：调试；Stop 会 kill 远端进程
- **Deploy**（`ide_deploy_remote_process`）：发布；差量同步 + 启动 + 打开 Run 标签页，Stop 只关日志
- 远程配置**必须用户授权才触发**；误触发会替换线上

`type="RemoteProcess"` 的 7 个字段：

| 字段 | 含义 |
| --- | --- |
| `server` | IDE SSH 配置名，且必须在 `hosts.json` 里 |
| `deployment` | 启动前同步的 deployment（`process` 必填） |
| `command` | 远端启动命令 |
| `workingDirectory` | 远端 `cd` 目标 |
| `logDir` | 应用自己的日志目录，仅用于查询 |
| `kind` | `process` / `docker`（留空按命令推断） |
| `container` | `docker` 容器名 |

命名文法 `base@env`：

- `env` **只有远端配置才写**，取值是 `hosts.json` 的 server 名
- 本机配置不写 `@env`
- 当同一应用需要构建 + 部署两条时，构建配置叫 `{应用}-build@{env}`

**一条 RemoteProcess = 一个进程 / 一个容器**。`docker compose up -d` 这类多容器发布不在这个模型里：
走 `remote_upload` + `remote_exec`，不要硬塞成一条配置。

## 技能边界

| skill | 负责 |
| --- | --- |
| `remote-deployment` | `hosts.json` 的 server / deployment、IDE Deployment 同步与遗留、deployment 审计 |
| `idea-run-config-manager` | `.run/*.run.xml`、Before launch、运行档案 |
| `run-job-manager` | 把可重复的确定性流程（构建 / 生成 / 迁移 / 发布 / 批处理）固化成 `job-*` skill |

发布 / 回滚 / 环境说明书归项目自己的部署 skill（如 `deploy-ops`）。

## 工具引导与接管

- `src/tool-guidance.template.md`：原生工具 + 远端工具，**始终注入**
- `src/ide-guidance.template.md`：IDE 工具，只在本次请求带 `ide_*` 时注入
- 两份都是纯 Markdown，无占位符
- 隐藏 60 个 IDE 工具（`HIDDEN_IDE_TOOL_SUFFIXES`），包括 VCS、Router、Debugger、Dev Kit、Inspection、
  解释器环境、IDE 终端、数据库、文件搜索、建文件、`execute_run_configuration`、`get_project_env`、
  `get_ssh_servers` / `sync_deployments`
- 14 条工具描述覆盖；参数接管：`rebuild` / `include_external` 删除，`list_directory_tree.maxDepth` 抬到至少 50
- IDE 工具的结构化输出会追加成文本（`structuredContent`），否则模型看不到 `history[]` / `beforeRunTasks[]`

## 配置

```jsonc
{
  "plugins": [
    {
      "package": "opencode-idea",
      "options": {
        "injectGuidance": true,
        "openInIde": true,
        "launchCooldownsMs": [1000, 2000, 4000],
        "launchMaxAttempts": 3,
        "mcpProbeTimeoutMs": 25000,
        "probeAttemptTimeoutMs": 15000,
        "probeRetryBackoffsMs": [1000, 2000, 4000],
        "mcpStartTimeoutMs": 60000,
        "toolRefreshTimeoutMs": 5000,
        "executionTimeoutMs": 600000,
        "feedback": "message",
      },
    },
  ],
}
```

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `injectGuidance` | `true` | 是否注入「工具使用规则」引导 |
| `openInIde` | `true` | 是否允许自动拉起 IDE；`false` 只连已运行端点 |
| `launchCooldownsMs` | `[1000, 2000, 4000]` | 与探测共用 1/2/4 退避 |
| `launchMaxAttempts` | `3` | 实际拉起 IDE 最多次数；之后只探测 |
| `mcpProbeTimeoutMs` | `25000` | 一次探测总预算 |
| `probeAttemptTimeoutMs` | `15000` | 单次 `get_project_env` 等待上限 |
| `probeRetryBackoffsMs` | `[1000, 2000, 4000]` | 单次探测内遇到 `busy` 的重试间隔 |
| `mcpStartTimeoutMs` | `60000` | 拉起 IDE 后等它就绪的上限（显式 `open -a` / 自动 `open -g`） |
| `toolRefreshTimeoutMs` | `5000` | 注册 MCP server 后等工具目录的上限 |
| `executionTimeoutMs` | `600000` | 单次 IDE 工具调用硬上限 |
| `feedback` | `"message"` | 成功走 synthetic 通知；失败立刻上屏；`false` 静默 |

## 行为与恢复

- 插件启动**不探测、不连接**；接入由 `/open-in-ide` 触发
- 已接入项目在请求驱动下自愈：`context` 路径后台重连，`prompt` 路径最多同步等 6 秒（这样本次请求就能带上工具）
- `busy` 只退避探测，绝不拉起；`down` / `no-project` 才允许拉起，自动路径用 `open -g`
- `OPENCODE_IDEA_LOG=/tmp/opencode-idea.log` 可把 `ide.setup` / `ide.probe` / `ide.launch` 追加到文件

## 限制

- 仅支持 OpenCode V2 插件 API
- IDE 需 2026.3+ 的 Streamable HTTP `/stream`；旧版 `/sse` 不支持
- 自动拉起 IDE 仅 macOS 实现；其他平台手动打开
- 插件热重载会断开 IDE 连接；重新执行 `/open-in-ide` 或等待请求驱动自愈

## License

MIT
