[English](README.md) | 中文版文档

# opencode-idle-continue

OpenCode插件，在空闲时自动发送提示词继续处理任务。

## 功能特性

- **空闲检测**：监控系统空闲状态，在OpenCode空闲时触发后续逻辑
- **自动发送提示词**：从指定的markdown文件中读取提示内容并发送给OpenCode继续处理
- **提示词热重载**：每次使用`prompt_file`时检查文件是否已修改。未修改则使用缓存内容，已修改则重新读入并更新缓存，无需重启插件
- **文件变更监控**：维护一个检测文件列表，监控这些文件的内容/时间戳是否变化
- **等待状态管理**：如果发送提示词后检测文件列表中的文件没有变化，则进入等待状态，支持间隔退避机制
- **用户活动抑制**：用户发送消息后，在配置的时间内（默认5分钟）抑制空闲检测
- **初始空闲延迟**：插件启动后等待指定时间（默认10分钟）才开始空闲检测
- **AI卡死检测与自动恢复**：监控AI响应活动，自动检测并恢复卡死状态
- **两种工作模式**：
  - **传统模式**：直接发送提示词，支持文件监控和间隔退避
  - **子代理模式**：通过OpenCode原生的Task工具启动子代理，自动管理会话生命周期

## 安装

### 方式一：全局安装

```bash
npm install -g opencode-idle-continue
```

全局安装后，可安装到指定位置：

```bash
# 安装到系统配置
opencode-idle-continue install system

# 安装到当前项目
opencode-idle-continue install local

# 安装到指定目录
opencode-idle-continue install /path/to/project
```

### 方式二：本地开发安装

```bash
bash install-local.sh
```

该脚本依次执行：
1. `npm run build` — 构建 `dist/`
2. `npm pack` — 从 `dist/` 创建 tarball `dist/opencode-idle-continue-1.0.0.tgz`
3. 复制 `dist/` 内容到 `.opencode/plugins/idle-continue/`
4. 在 `.opencode/` 下安装 `@opencode-ai/plugin` 依赖
5. 更新 `opencode.json` 添加插件引用 `./plugins/idle-continue/index.js`

完成后**重启opencode** 加载插件。

## 配置

所有参数通过 `idle-continue.json` 配置。配置文件查找顺序：

1. 项目根目录
2. `.opencode/` 目录
3. `~/.config/opencode/` 目录

### 提示词文件查找顺序

提示词文件（默认 `idle-prompt.md`）从当前目录开始逐级向上查找，每级目录检查两个位置：

1. `{dir}/{prompt_file}`（如 `idle-prompt.md`）
2. `{dir}/.opencode/{prompt_file}`（如 `.opencode/idle-prompt.md`）

然后 `{dir}` 向上逐级移动（父目录），每级同样检查上述两个位置。例如当前目录为 `/a/b/c/d`，查找顺序为 `/a/b/c/d`、`/a/b/c`、`/a/b`、`/a` 各自的 `{prompt_file}` 与 `.opencode/{prompt_file}`。始终不会查找系统根目录（如 `/`）。

如果提示词文件不存在：
- 当 `enable_default_prompt` 为 `false`（默认）时，不发送任何消息
- 当 `enable_default_prompt` 为 `true` 时，使用内置默认提示词

### 配置字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `prompt_file` | string | `"idle-prompt.md"` | 提示词文件路径 |
| `watch_files` | string[] | `["task.md", "wish-list.md"]` | 检测文件列表 |
| `check_interval_minutes` | number | `30` | 等待状态下的检测间隔（分钟） |
| `max_idle_cycles` | number | `5` | 连续空闲次数阈值，超限后间隔翻倍 |
| `enabled` | boolean | `true` | 是否启用插件 |
| `log_level` | string | `"none"` | 日志级别：`"debug"`（详细信息）、`"warn"`（警告和错误）、`"error"`（仅错误）、`"none"`（无日志） |
| `enable_default_prompt` | boolean | `false` | 提示词文件不存在时是否启用默认提示词 |
| `subagent_enabled` | boolean | `false` | 是否启用子代理模式 |
| `subagent_agent_type` | string | `"explore"` | 子代理类型（仅 subagent_enabled=true 时生效） |
| `subagent_delay_ms` | number | `60_000` | 子代理触发延迟（毫秒，仅 subagent_enabled=true 时生效） |
| `debounce_delay_ms` | number | `60000` | idle 状态去抖确认延迟（毫秒），默认 60 秒（1分钟） |
| `initial_idle_delay_minutes` | number | `10` | 初始空闲延迟时间（分钟），默认 10 分钟 |
| `user_activity_suppress_seconds` | number | `300` | 用户活动抑制时间（秒），默认 300 秒（5分钟） |
| `stuck_threshold_minutes` | number | `20` | AI 卡死检测阈值（分钟，默认 20 分钟） |
| `ai_stuck_action` | string | `"ignore"` | AI 卡死处置策略：`"ignore"`、`"abort"` 或 `"abort_and_retry"` |
| `ai_stuck_retry_prompt` | string | `"continue"` | ai_stuck_action 为 `"abort_and_retry"` 时的重发提示词 |

### 示例 `idle-continue.json`

```json
{
  "prompt_file": "idle-prompt.md",
  "watch_files": ["task.md", "wish-list.md"],
  "check_interval_minutes": 30,
  "max_idle_cycles": 5,
  "enabled": true,
  "debounce_delay_ms": 60000,
  "initial_idle_delay_minutes": 10,
  "user_activity_suppress_seconds": 300,
  "stuck_threshold_minutes": 20,
  "ai_stuck_action": "abort_and_retry",
  "ai_stuck_retry_prompt": "continue"
}
```

## 工作原理

### 模式 1：传统模式（默认）

1. **空闲检测**：监控系统空闲状态。当 opencode 处于空闲状态时触发后续逻辑。
2. **用户活动检测**：
   - **消息检测**：检测用户发送的消息（通过 `chat.message` hook）
   - **活动抑制**：用户活动后，在配置的时间内（默认 5 分钟）抑制空闲检测
   - **初始空闲延迟**：插件启动后等待指定时间（默认 10 分钟）才开始首次空闲检测
   - **去抖延迟**：确认空闲状态的可配置延迟（默认 1 分钟）
3. **发送提示词**：从指定的 markdown 文件中读取提示内容并发送给 opencode 继续处理。如果提示词文件不存在：
    - 当 `enable_default_prompt` 为 `false`（默认）时，不发送任何消息
    - 当 `enable_default_prompt` 为 `true` 时，发送内置默认提示词
4. **AI 卡死检测与自动恢复**：
    - 通过心跳事件（消息更新、部分更新、增量更新）监控 AI 响应活动
    - 当会话处于 busy 状态但超过配置阈值（默认 20 分钟）无活动时检测卡死状态
    - 可配置的恢复策略：
      - `"ignore"` - 不做任何处理（默认）
      - `"abort"` - 中断卡死的会话
      - `"abort_and_retry"` - 中断会话，等待 30 秒，然后发送重试提示词
5. **提示词热重载**：每次使用 `prompt_file` 时检查文件是否已修改。未修改则使用缓存内容，已修改则重新读入并更新缓存，无需重启插件。
6. **文件变更监控**：维护一个检测文件列表，监控这些文件的内容/时间戳是否变化。
7. **等待状态**：如果发送提示词后检测文件列表中的文件没有变化，则进入等待状态。等待状态需要同时满足：
    - 系统持续空闲
    - 检测文件列表中的文件没有改变
8. **间隔退避**：在等待状态下，每隔一定时间间隔（默认 30 分钟）发送一次提示词。如果连续 5 次检测仍然处于空闲状态（文件未变化），则下一次的等待间隔翻倍。

### 模式 2：子代理模式

1. **空闲检测**：同传统模式，监控系统空闲状态。
2. **延迟执行**：检测到真正空闲后等待指定时间（默认 60 秒）。
3. **触发子代理**：通过主 agent 调用 Task 工具启动子代理。利用宿主（OpenCode Host）的原生能力自动创建子会话、渲染可点击链接、保存完整消息历史。
4. **子代理管理**：宿主自动完成子会话的生命周期管理，包括创建、执行、完成和保存历史记录。
5. **用户交互**：用户可点击链接切换到子会话视图，查看子代理的完整输出。

## 文件说明

- `idle-prompt.md` — 默认提示词文件，包含发送给 opencode 的提示内容
- `task.md` — 默认检测文件之一，记录当前任务
- `wish-list.md` — 默认检测文件之一，记录待办愿望清单
- `idle-continue.json` — 配置文件

**默认提示词**：当 `enable_default_prompt` 为 `true` 且提示词文件不存在时，使用内置的默认提示词：
```
You are a helpful AI assistant. Please continue working on the current task or project context. Review any existing files, understand the current state, and suggest next steps or continue with the implementation.
```

## CLI 命令

```bash
# 安装到系统配置
opencode-idle-continue install system

# 安装到当前项目
opencode-idle-continue install local

# 安装到指定目录
opencode-idle-continue install /path/to/project

# 刷新插件缓存
opencode-idle-continue update

# 移除插件
opencode-idle-continue uninstall

# 显示帮助
opencode-idle-continue --help

# 显示版本
opencode-idle-continue --version
```

## 构建与打包

源码是纯 JavaScript ESM，无需 transpile。构建时将 `src/` 复制到 `dist/`：

```bash
npm run build
```

构建命令：
```
node tools/build.mjs
```

输出：
- `dist/index.js` — 插件入口（与 `src/index.js` 一致）
- `dist/opencode-true-idle-detector.js` — 空闲检测模块，包含用户活动和卡死检测
- `dist/subagent-trigger.js` — 子代理触发模块
- `dist/wait-state.js` — 等待状态模块
- `dist/file-utils.js` — 文件工具模块
- `dist/cli/index.js` — CLI 入口
- `dist/package.json` — npm 包分发清单

不依赖 bun，node 和 bun 均可使用。

## 项目结构

```
opencode-idle-continue/
│
├── src/
│   ├── index.js                          ← 插件唯一入口。导出 { id, server }
│   ├── opencode-true-idle-detector.js    ← OpenCodeTrueIdleDetector 类（空闲检测去抖状态机）
│   ├── subagent-trigger.js               ← SubagentTrigger 类（子代理触发器）
│   ├── wait-state.js                     ← WaitState 类（等待状态与退避）
│   ├── file-utils.js                     ← 文件工具（提示词加载、文件快照、变更检测）
│   └── cli/
│       └── index.js                      ← CLI 入口，提供安装命令
│
├── src/__tests__/
│   ├── opencode-true-idle-detector.test.js  ← 空闲检测状态机测试
│   ├── prompt.test.js                       ← 提示词文件读取/热重载测试
│   ├── file-watch.test.js                   ← 文件快照/变更检测测试
│   ├── wait-state.test.js                   ← 等待状态与退避测试
│   └── index.test.js                        ← 集成测试
│
├── dist/
│   ├── index.js                          ← 构建产物
│   ├── opencode-true-idle-detector.js    ← 构建产物
│   ├── subagent-trigger.js               ← 构建产物
│   ├── wait-state.js                     ← 构建产物
│   ├── file-utils.js                     ← 构建产物
│   ├── cli/
│   │   └── index.js                      ← CLI 入口
│   └── package.json                      ← npm 包分发清单
│
├── tools/
│   └── build.mjs                         ← 构建脚本
│
├── install-local.sh                      ← 构建 + 本地安装脚本
├── clean.sh                              ← 卸载脚本
│
├── package.json                          ← npm 包配置（build → dist/）
├── README.md                             ← 英文文档
├── README.zh.md                          ← 中文文档
├── LICENSE
└── .gitignore
```

## 许可证

MIT

## 更新日志

各版本的变更列表请参阅 [CHANGELOG.md](CHANGELOG.md)。