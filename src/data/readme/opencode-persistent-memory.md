# opencode-persistent-memory

[![npm version](https://img.shields.io/npm/v/opencode-persistent-memory)](https://www.npmjs.com/package/opencode-persistent-memory)
[![license](https://img.shields.io/npm/l/opencode-persistent-memory)](./LICENSE)

**OpenCode 跨会话记忆插件** — 让 AI 记住你的编码偏好、架构决策和项目习惯，跨会话持久保留。

- 📦 **零数据库依赖** — 无需 Docker、无需外部数据库，JSON 文件落地
- 🧠 **Dual-LLM 沙箱** — 记忆提取使用独立的无工具权限 LLM 调用，物理隔绝 Prompt Injection
- 📐 **时间衰减算法** — 30 天半衰期，自动遗忘陈旧偏好
- 🔄 **双轨存储降级** — ruvector（高性能）→ vectorvault（纯 TypeScript 磁盘持久化），自动切换
- 🔧 **可配置 LLM 提供商** — 支持 anthropic / openai / deepseek，自动检测可用凭证

> **注意**：记忆提取需要有效的 LLM API Key。语义搜索和相似记忆去重当前因 OpenCode 沙箱限制不可用（详见下方 [已知限制](#已知限制)）。

---

## 前置要求

| 依赖 | 最低版本 | 备注 |
|------|---------|------|
| OpenCode | ≥ 1.14 | `opencode --version` 检查 |
| LLM API Key | — | Anthropic / OpenAI / DeepSeek 任选其一 |
| Node.js | ≥ 18 | OpenCode 内置，无需单独安装 |

---

## 安装

### 步骤 1：确认 OpenCode 环境

```bash
opencode --version
# 应输出 ≥ 1.14
```

### 步骤 2：配置 API Key

OpenCode 的 API Key 存储在 `auth.json` 中。插件复用此文件，**不额外存储密钥**。

**Windows 路径**：`C:\Users\<用户名>\.local\share\opencode\auth.json`

支持两种格式：

**格式 A：对象格式（OpenCode 实际使用的格式）**

```json
{
  "deepseek": {
    "type": "api",
    "key": "sk-xxxxxxxx"
  }
}
```

**格式 B：数组格式**

```json
[
  {
    "id": "openai",
    "key": "sk-xxxxxxxx"
  }
]
```

两种格式均兼容。如果你的 `auth.json` 已经是 OpenCode 自动生成的格式（格式 A），**无需做任何修改**。

### 步骤 3：设置 LLM 提供商

插件默认使用 `anthropic`，但会自动检测 `auth.json` 中的可用提供商并降级。

**推荐**：显式指定提供商，避免启动时的降级警告。

**Windows（PowerShell，以管理员身份运行）：**

```powershell
[Environment]::SetEnvironmentVariable("OPENCODE_MEMORY_PROVIDER", "deepseek", "User")
```

**Linux / macOS：**

```bash
echo 'export OPENCODE_MEMORY_PROVIDER=deepseek' >> ~/.bashrc
source ~/.bashrc
```

> ⚠️ **Windows 用户注意**：设置后必须**关闭当前终端窗口，重新打开**，变量才能生效。

验证：

```bash
# Windows CMD
echo %OPENCODE_MEMORY_PROVIDER%

# Windows PowerShell / Linux / macOS
echo $env:OPENCODE_MEMORY_PROVIDER
```

支持的提供商：`anthropic`、`openai`、`deepseek`

### 步骤 4：安装插件

在**项目目录**中执行：

```bash
opencode plugin "opencode-persistent-memory"
```

安装成功后，OpenCode 会在项目下生成 `.opencode\opencode.json`，内容类似：

```json
{
  "plugin": ["opencode-persistent-memory"]
}
```

---

### ⚠️ 常见安装坑

#### 坑 1：安装时报 `No matching version found`

**原因**：你的 npm 镜像（一般是 npmmirror.com）同步延迟，未缓存最新版本。

**解决**：临时切换到 npm 官方源：

```bash
npm config set registry https://registry.npmjs.org/
opencode plugin "opencode-persistent-memory"
npm config set registry https://registry.npmmirror.com
```

#### 坑 2：`Failed to change directory` 死循环

**现象**：OpenCode 启动后反复打印 `子进程意外退出，将自动重建`，控制台被刷屏。

**原因**：安装了 **v1.0.5 及更早** 的版本。旧版 daemon 使用 `spawn` 启动子进程，被 OpenCode 进程管理器劫持。

**解决**：升级到最新版（≥ v1.0.6）：

```bash
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\opencode\packages" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".\opencode" -ErrorAction SilentlyContinue
# 按上方"安装"步骤 4 重新安装
```

#### 坑 3：启动日志出现 `Dual-LLM 沙箱凭证失效`

**现象**：`[PersistentMemory] Dual-LLM 沙箱凭证失效，记忆提取将跳过云端点。请检查 auth.json。`

**原因**：`auth.json` 不存在、路径错误、或格式不兼容。

**排查**：
1. 确认 `auth.json` 存在于 `C:\Users\<用户名>\.local\share\opencode\`（Windows）或 `~/.local/share/opencode/`（Linux）
2. 确认格式为对象格式（格式 A）或数组格式（格式 B）
3. 确认 `key` 字段存在且有效

#### 坑 4：设置了 `OPENCODE_MEMORY_PROVIDER` 但不生效

**原因**：Windows 的环境变量只在**窗口打开时**加载一次。用 `[Environment]::SetEnvironmentVariable` 设置后，必须关闭当前终端重新打开。

**验证**：新窗口执行 `echo %OPENCODE_MEMORY_PROVIDER%`

---

### 步骤 5：验证安装

在项目目录中执行：

```bash
opencode --print-logs
```

正常输出应包含以下行（顺序可能不同）：

```
[PersistentMemory] ruvector 不可用: ...，降级至 vectorvault
[VectorvaultStore] 降级存储初始化完成（纯 TypeScript + 磁盘持久化模式）
[EmbeddingDaemon] 嵌入引擎已禁用 — 语义搜索和去重暂不可用
[PersistentMemory] 插件初始化完成 — 项目: proj_xxxxx，LLM 提供商: deepseek
```

如果看到的是 `[EmbeddingDaemon] 嵌入引擎启动失败: sharp...`，说明安装的是过期版本。按上方"坑 2"的步骤清除缓存重装。

---

## 使用

### 首次使用流程

1. 在 OpenCode 中正常写代码，执行 `bash`、`edit`、`write` 等操作
2. 插件在后台自动提取编码偏好 → 存入 PENDING 状态
3. 输入 **"看看你都记住了什么"** 查看待审批记忆
4. 输入 **"审批并保存全部记忆"** 激活记忆
5. 下次新会话启动时，这些记忆会自动注入

### 自然语言工具

无需记忆任何命令，直接对 LLM 说话即可：

| 你说的话 | 触发的工具 | 效果 |
|---------|----------|------|
| "看看你都记住了什么" | `memory_digest` | 展示 PENDING 记忆表格 |
| "审批并保存全部记忆" | `memory_approve` | PENDING → ACTIVE |
| "审批记忆 abcdef12" | `memory_approve` | 审批指定的某一条 |
| "删除记忆 abcdef12" | `memory_forget` | 标记为 INVALID |
| "搜索关于 React 的记忆" | `memory_search` | ⚠️ 当前不可用 |

### 自动化功能

| 功能 | 触发条件 | 效果 |
|------|---------|------|
| 记忆提取 | 执行 `bash` / `edit` / `write` 后 | 分析对话，提取编码偏好 → PENDING |
| 上下文注入 | 创建新会话时 | 静默注入当前项目的 ACTIVE 记忆 |
| 时间衰减 | 每次工具执行后 | 30 天未使用的记忆减半；PENDING 超 90 天自动失效 |

### 存储位置

记忆数据存储在：

```
~/.config/opencode/memory_store/vectorvault_memories.json
```

（Windows 上为 `C:\Users\<用户名>\.config\opencode\memory_store\`）

---

## 已知限制

### 嵌入引擎已禁用

OpenCode 的插件沙箱**不支持**以下两种方式运行 CPU 密集型推理：

| 方式 | 失败原因 |
|------|---------|
| `spawn` 子进程 | OpenCode 进程管理器劫持 `spawn` 调用，把 `worker.js` 当 `cwd` → `Failed to change directory` 死循环 |
| 进程内 `import @xenova/transformers` | OpenCode 的 Node.js 环境缺少原生模块 `sharp` → `sharp-win32-x64.node not found` 错误 |

**受影响功能**：

| 功能 | 状态 |
|------|------|
| `memory_search` 语义搜索 | ❌ 返回"嵌入引擎未就绪" |
| 相似记忆自动去重 | ❌ 静默跳过，新记忆均视为全新 |
| 记忆提取 | ✅ 正常（使用 LLM API，不依赖嵌入） |
| `memory_digest` | ✅ 正常 |
| `memory_approve` | ✅ 正常 |
| `memory_forget` | ✅ 正常 |
| 会话上下文注入 | ✅ 正常 |
| 数据持久化 | ✅ 正常 |

---

## 工作原理

```
用户对话 → tool.execute.after 触发 → sandboxFetch(LLM API) 提取记忆
         ↓
     存储到 vectorvault（ruvector 不可用时自动降级）
         ↓
    PENDING 记忆 → 用户审批 → ACTIVE 记忆
         ↓
     新会话创建(event钩子) → 检索 ACTIVE → 静默注入系统提示
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 嵌入模型 | 已禁用 | OpenCode 沙箱不支持 ONNX WASM |
| 主存储 | ruvector | 高性能 Rust 向量数据库（如不可用则降级） |
| 降级存储 | vectorvault | 100% TypeScript，JSON 文件持久化 |
| 安全沙箱 | Dual-LLM REST 调用 | 绕过 SDK，Payload 无 tools 字段 |
| 时间衰减 | W = cos_sim × e^(-0.0231×Δt) | 30 天半衰期 |

---

## 安全性

- **记忆数据本地存储** — 存储在 `~/.config/opencode/memory_store/`
- **Dual-LLM 物理沙箱** — 记忆提取的 API 请求不包含 `tools` 字段，无法执行破坏性操作
- **项目隔离** — 记忆强制绑定项目 `proj_xxxxx` ID，不同项目互不污染
- **凭证本地读取** — API Key 从 OpenCode 的 `auth.json` 读取，不额外存储、不联网上传

---

## 从源码构建

```bash
git clone https://github.com/wenbokun434-sketch/opencode-persistent-memory.git
cd opencode-persistent-memory
npm install
npm run build
npm test
```

构建产物在 `dist/` 目录。

---

## License

MIT
