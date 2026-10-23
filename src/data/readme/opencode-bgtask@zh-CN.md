# opencode-bgtask

在 OpenCode 中后台运行 Shell 命令，不阻塞 AI 会话。支持完整的作业生命周期管理：启动、列表、查看输出、终止。

## 安装

### 在线安装（推荐）

在 `opencode.json` 中添加：

```json
{
  "plugin": ["opencode-bgtask"]
}
```

重启 OpenCode 即可。npm 包由 OpenCode 自动安装。

### 本地安装

将 `index.ts` 放到 `.opencode/plugins/` 目录下，重启 OpenCode。

## 工具

### bg_start

启动后台命令。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `command` | string | 是 | 要执行的 shell 命令 |
| `shell` | string | 否 | 指定 shell：pwsh, powershell, cmd, bash, sh, zsh。不指定则自动检测 |
| `cwd` | string | 否 | 工作目录，默认为项目根目录 |
| `timeout` | number | 否 | 超时秒数，超时后自动终止作业 |

### bg_list

列出所有后台作业及状态（运行中/已完成/失败/已终止/超时）。

### bg_output

查看作业输出。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 作业 ID |
| `lines` | number | 否 | 返回最近 N 行，默认 50，最大 500 |

### bg_stop

终止运行中的作业。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 要终止的作业 ID |

## 支持 Shell

| Shell | Windows | Linux/macOS |
|-------|---------|-------------|
| pwsh (PowerShell 7+) | ✅ 默认 | — |
| powershell (Windows PowerShell 5.1) | ✅ 备选 | — |
| cmd | ✅ 备选 | — |
| bash | ✅ (Git Bash) | ✅ 默认 |
| sh | — | ✅ 备选 |
| zsh | — | ✅ |

## 限制

- 最大并发作业数：20
- 日志文件上限：50MB（超出后截头保尾）
- 历史记录保留：最近 100 条
- 输出文件存储于 `~/opencode/bg/`，不污染项目目录

## 许可

MIT
