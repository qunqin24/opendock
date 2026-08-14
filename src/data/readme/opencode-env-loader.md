# opencode-env-loader

OpenCode 插件，自动加载项目环境变量并注入到 shell 子进程。

## 工作原理

插件通过 OpenCode 的 `shell.env` 钩子工作。每次 OpenCode 启动 shell 子进程前，插件从当前工作目录的 `.opencode/env-loader/` 扫描**所有文件**，按文件名排序后逐个解析为 `KEY=VALUE`，合并所有变量注入到 shell 环境。

- 后读覆盖先读（按文件名字典序）
- 文件命名无限制（命名只是 skill 生成时为人类可读性而设）
- 不再需要拦截命令或维护白名单

## 安装

在 `opencode.json` 中注册插件：

```json
{
  "plugin": ["opencode-env-loader"]
}
```

## 配置

插件**不接受**任何配置参数。所有项目级 env 文件都从 `.opencode/env-loader/` 目录下读取。

## `.opencode/env-loader/` 文件格式

每个文件是纯 `KEY=VALUE` 格式，每行一个变量：

- 空行和 `#` 开头的注释行会被忽略
- 支持 `$VAR` 和 `${VAR}` 引用（运行时从 `process.env` 展开）
- 变量名仅支持 `A-Z`、`0-9`、`_`，且不能以数字开头
- 支持同文件内 `$VAR` / `${VAR}` 引用：先定义的变量会被后续行展开（递归展开，循环引用返回空串）
- 文件中未匹配的变量回退到 `process.env` 查找
- 循环引用（如 `A=$B` + `B=$A`）返回空串，不会无限递归

文件命名无限制。常见命名约定（仅供人类辨识，插件对所有文件一视同仁）：

- `.java-env` — Java / JVM 工具链
- `.node-env` — Node.js
- `.python-env` — Python
- `.go-env` — Go
- `database.conf` — 数据库相关变量
- `secrets.env` — 密钥类

Java 示例（`.opencode/env-loader/.java-env`）：

```bash
# SDKMAN 配置
JAVA_HOME=$HOME/.sdkman/candidates/java/17.0.18-tem
PATH=$JAVA_HOME/bin:$PATH
```

Python 示例（`.opencode/env-loader/.python-env`）：

```bash
# pyenv 配置
PATH=$HOME/.pyenv/versions/3.12.0/bin:$PATH
```

Node 示例（`.opencode/env-loader/.node-env`）：

```bash
# fnm 配置
PATH=$HOME/.fnm/current/bin:$PATH
```

Go 示例（`.opencode/env-loader/.go-env`）：

```bash
# goenv 配置
GOROOT=$HOME/.goenv/versions/1.22.0
PATH=$HOME/.goenv/versions/1.22.0/bin:$PATH
```

任意命名的自定义文件（`.opencode/env-loader/database.conf`）：

```bash
DB_HOST=localhost
DB_PORT=5432
```

## 使用 `project-env-init` Skill

插件自带一个 `project-env-init` Skill，可以自动为项目生成 `.opencode/env-loader/` 下的 env 文件。

在 OpenCode 中运行：

```
/skill project-env-init
```

Skill 会：

1. 自动检测项目语言（通过 `pom.xml` / `package.json` / `pyproject.toml` / `go.mod`）
2. 检测本地已安装的版本管理器
3. 列出本地可用版本供你选择
4. 提取环境变量差异
5. 生成对应的 `.opencode/env-loader/.java-env`（或对应语言）文件

## 限制

- 不支持 shell alias 和 function（纯 `KEY=VALUE` 格式）
- 不支持 `unset` 语句（无法删除环境变量）
- 不支持 Windows 平台
- 仅扫描 `cwd/.opencode/env-loader/`，不向上 walk-up
- 不支持 v2.0.0 旧版格式（旧文件直接放 `.opencode/.{java,node,...}-env` 会被忽略）

## 测试

```bash
npm test
```

项目使用 [Vitest](https://vitest.dev/) 运行测试，覆盖解析器、hook 和端到端场景。

## License

MIT
