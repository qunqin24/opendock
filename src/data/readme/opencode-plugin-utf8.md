# opencode-plugin-utf8

OpenCode 插件：自动为 shell 环境注入 UTF-8 编码配置，解决 Windows 上中文乱码问题。

## 解决的问题

在 Windows 环境下使用 OpenCode 时，PowerShell 和 Python 子进程默认使用系统编码（如 GBK），导致中文输出乱码。本插件自动注入编码配置，无需手动设置��[...]

## 工作原理

插件通过两个 hook 实现：

1. **`shell.env`** — 为所有 shell 命令注入 Python UTF-8 环境变量：
   - `PYTHONIOENCODING=utf-8`
   - `PYTHONUTF8=1`

2. **`tool.execute.before`** — 在 PowerShell 命令前添加编码设置：
   - `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
   - `[Console]::InputEncoding = [System.Text.Encoding]::UTF8`

## 安装

```bash
npm install opencode-plugin-utf8
```

## 配置

在 OpenCode 配置文件 (`opencode.json` 或 `opencode.jsonc`) 中添加：

```json
{
  "plugin": ["opencode-plugin-utf8"]
}
```

或者本地开发时使用文件路径：

```json
{
  "plugin": ["./node_modules/opencode-plugin-utf8/src/index.js"]
}
```

## 兼容性

| 环境 | 状态 |
|------|------|
| Windows PowerShell | 支持 |
| Windows Python | 支持 |
| macOS / Linux | 无副作用，可安全启用 |

## License

MIT
