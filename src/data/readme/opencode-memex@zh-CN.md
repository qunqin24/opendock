# opencode-memex

[OpenCode](https://opencode.ai) 的持久化记忆与知识图谱插件。

让 AI 助手拥有真正的记忆。事实、决策、偏好、学习成果和纠正信息都保存在本地 SQLite 数据库中，跨会话自动召回。

> *命名致敬 Vannevar Bush 1945 年提出的 [Memex](https://zh.wikipedia.org/wiki/Memex) 概念——"一种设备，个人可以在其中存储所有的书籍、记录和通信，并能以极快的速度和灵活性进行查阅。"*

[English](./README.md)

---

## 特性

- **6 个 AI 工具** — `memory_save`、`memory_search`、`memory_status`、`memory_delete`、`kg_update`、`kg_query`
- **FTS5 全文搜索** — 使用 `unicode61` 分词器，支持中英文快速搜索
- **知识图谱** — 实体关系以结构化三元组存储（A --[谓词]--> B）
- **工作区隔离** — 每个项目目录拥有独立的记忆空间
- **自动去重** — 相同内容保存两次会自动去重，仅增加访问计数
- **系统提示注入** — AI 自动获得何时/如何使用记忆的指令
- **提示注入防护** — 存储的记忆用 `<memory_data>` 标签包裹并做清理
- **命令行工具** — Python 3 CLI，查看、搜索、删除记忆
- **零配置** — 安装即用，无需 API 密钥，无需外部服务

---

## 快速开始

### 方式一：从 npm 安装（推荐）

```json
// opencode.json
{
  "plugin": ["opencode-memex"]
}
```

就这样。OpenCode 下次启动时会自动安装插件。

### 方式二：手动安装

```bash
# 复制插件文件（OpenCode 自动加载）
curl -o ~/.config/opencode/plugins/memory.ts \
  https://raw.githubusercontent.com/anthropic-ai/opencode-memex/main/src/index.ts
```

### CLI 命令行工具（可选）

```bash
# 安装终端记忆管理工具
curl -o ~/.local/bin/memex \
  https://raw.githubusercontent.com/anthropic-ai/opencode-memex/main/memory
chmod +x ~/.local/bin/memex
```

仅需 Python 3（Linux/macOS 均已预装）。

---

## AI 工具

安装后，AI 自动获得以下工具：

| 工具 | 功能 |
|------|------|
| `memory_save` | 保存事实、决策、偏好、学习成果或纠正 |
| `memory_search` | 全文搜索历史记忆 |
| `memory_status` | 概览：统计、最近记忆、实体、知识图谱 |
| `memory_delete` | 按 ID 删除记忆 |
| `kg_update` | 记录实体关系（如"项目 X 使用 React"） |
| `kg_query` | 查询实体关系 |

### AI 何时自动保存

- 用户说 **"记住这个"** 或纠正 AI
- 提到用户偏好或编码规范
- 发现根本原因、修复方法或关键发现
- 做出架构决策或工具选择

### 记忆类型

| 类型 | 场景 |
|------|------|
| `fact` | 环境、项目、配置信息 |
| `decision` | 架构选择、工具选型 |
| `preference` | 用户编码风格、偏好 |
| `learning` | 根因分析、修复方法、新发现 |
| `correction` | AI 出错后用户的纠正 |

### 主题分类（Room）

`general`（通用）、`technical`（技术）、`config`（配置）、`troubleshooting`（故障排查）、`security`（安全）、`documentation`（文档）

---

## CLI 使用方法

```bash
# 列出当前目录的记忆
memex show

# 列出所有工作区的记忆
memex show --all

# 全文搜索
memex search "数据库配置"
memex search "react" --type decision

# 按 ID 删除
memex delete abc123

# 批量清理（需确认）
memex clear                    # 当前工作区
memex clear --before 7d        # 7天前的记忆
memex clear --all              # 全部清空

# 数据库统计
memex status

# 知识图谱
memex kg show
memex kg show --all
memex kg delete t_abc123
```

---

## 工作原理

### 数据库

所有数据存储在本地 SQLite 文件中：

```
~/.local/share/opencode-memory/memory.db
```

- **memories** — 文本内容，带 FTS5 全文索引
- **entities** — 命名实体（人、工具、项目等）
- **triples** — 实体关系，带时间有效性

### 工作区隔离

记忆按工作目录（workspace）隔离。AI 默认只搜索当前工作区——不同项目的记忆不会混在一起，除非用户明确要求跨工作区搜索。

### 去重

记忆 ID 是 `workspace + type + 原始内容` 的 SHA-256 哈希。相同内容保存两次只会增加访问计数，不会创建重复条目。

### 安全

- 存储的记忆在工具输出中用 `<memory_data>` 标签包裹
- 系统提示指示 AI 将 `<memory_data>` 内的内容视为数据而非指令
- 所有用户可控字段在渲染前都会做清理
- 数据永远不会离开你的机器——全部是本地 SQLite

---

## 项目结构

```
opencode-memex/
├── src/
│   └── index.ts       # 单文件 OpenCode 插件（TypeScript）
├── memory             # CLI 工具（Python 3，无外部依赖）
├── package.json
├── README.md          # 英文文档
├── README.zh.md       # 中文文档
└── LICENSE
```

插件是一个**单 TypeScript 文件**，除 `@opencode-ai/plugin` 外无任何外部依赖。使用 `bun:sqlite`（OpenCode 运行时内置）作为数据库。

CLI 是一个**独立 Python 3 脚本**，仅使用标准库（`sqlite3`、`os`、`sys`、`re`、`pathlib`）。无需 pip install。

---

## 常见问题

**问：需要 API 密钥或外部服务吗？**
答：不需要。全部本地 SQLite，无网络请求。

**问：支持哪些 LLM？**
答：所有 LLM 都支持。插件添加的工具任何模型都可以使用——OpenAI、Anthropic、Google、本地模型等。

**问：占用多少磁盘空间？**
答：极少。几百条记忆约 100 KB。FTS5 索引会增加一些开销。

**问：可以备份记忆吗？**
答：直接复制 `~/.local/share/opencode-memory/memory.db`，它是标准 SQLite 文件。

**问：上下文压缩（compaction）时记忆会丢失吗？**
答：不会。插件在压缩后自动重新注入记忆系统指令，AI 保持记忆感知。

---

## 许可证

MIT
