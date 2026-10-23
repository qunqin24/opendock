# opencode-http-capture

> 看清 OpenCode 发出了什么、模型返回了什么，无需代理。

这是一个默认关闭的 OpenCode 插件：选择 `block` 截获并阻断模型请求，将脱敏 JSON 保存到临时文件；选择 `record` / `all` 透传记录真实请求和响应。用于研究 opencode 对话 prompt、消息结构、工具定义和生成参数等。

[English](README.md) · [规范](SPEC.md) · [版本记录](CHANGELOG.md)

## 能看到什么

这不是聊天记录导出，而是对 OpenCode 中经过 `globalThis.fetch` 的 HTTP 交互进行检查：

| 你想排查的问题 | 推荐模式 | 产物与效果 |
| --- | --- | --- |
| 最终发给模型的 prompt、消息历史、工具定义、模型参数是什么？ | `block` | 保存脱敏请求，不发送被识别的模型请求；没有真实模型回复 |
| 请求发出后，provider 实际返回了什么？ | `record` | 请求正常发送、回复仍流式显示，同时保存请求与响应状态、headers 和支持的正文 |
| 除模型调用外，还有哪些 fetch 请求？ | `all` | 扩大录制范围到当前包装器覆盖的 fetch 流量；不是全进程抓包 |

请求正文在受支持且未超限时可包含 `messages`、`input`、`contents`、`tools` 等字段，具体取决于 provider 协议。响应中的文本增量、工具调用片段、结束原因和用量信息按 provider 实际返回内容保留，不额外生成或补全。**录制不会自动合并 SSE delta 为最终答案，也不提供请求回放。**

## 安装

环境要求：支持外部插件的 OpenCode v1 版本。

### npm（推荐）

[`0.1.1`](https://www.npmjs.com/package/opencode-http-capture/v/0.1.1) 已作为首个 npm 版本发布；下方的本地源码安装方式仍然保留。

**第一步：配置插件。** 在项目的 `opencode.json`（仅该项目）或 `~/.config/opencode/opencode.json`（全局）的 `plugin` 数组中添加包名。选择一种作用范围，保留已有 provider、插件等配置，不要用下面的最小示例覆盖整个配置文件：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-http-capture@0.1.1"]
}
```

**第二步：重启 OpenCode。** 它会从 npm 自动安装配置中的包，首次安装需要能访问 registry。无需全局 `npm install -g`、运行 `install.sh` 或保留源码目录。它是插件，不是独立 CLI，不通过 `npx opencode-http-capture` 启动。

**第三步：显式选择模式。** 仅安装不会开启捕获。先检查请求而不调用模型：

```bash
OPENCODE_CAPTURE=block opencode
```

需要真实回复时改用 `OPENCODE_CAPTURE=record opencode`，但它会真实调用 provider、产生费用并可能执行工具，详见下方录制说明。未设置变量时按平常方式启动 `opencode`，插件不修改 fetch。

npm 包分发 ESM JavaScript，没有第三方运行时依赖。Node.js 构建与测试工具链要求 Node.js 24+；普通用户不需要执行构建，插件使用 OpenCode 的 Bun 运行时。

**升级与回退：** 示例固定版本以便复现。升级时将 `@0.1.1` 改为已发布的目标版本，再重启 OpenCode；回退同理，指定仍可用的旧版本。可用 `npm view opencode-http-capture versions --json` 查询已发布版本。安装报 E404 时核对包名、版本及实际发布状态；登录或网络问题不会因改为本地抓包模式而解决。

从本地安装迁移时，请先在旧源码目录执行 `bash uninstall.sh`，再添加 npm 配置，不要同时启用两种安装方式。不设置启用模式的 `OPENCODE_CAPTURE` 时，插件仍默认关闭。

### 本地源码安装

```bash
git clone git@github.com:hymsk/opencode-http-capture.git
cd opencode-http-capture
bash install.sh
```

安装器在 `~/.config/opencode/plugins/` 创建符号链接。请保留源码目录，安装后重启 OpenCode。可在运行安装器时通过 `OPENCODE_CONFIG_DIR` 指定其他配置目录。

## 使用方式

只用一个环境变量选择模式：

| `OPENCODE_CAPTURE` | 行为 |
| --- | --- |
| 未设置、空字符串、`false`、`0` | 关闭，不修改 fetch |
| `block` | 捕获并阻断模型请求，其他请求透传 |
| `record` | 透传真实流量，仅录制模型请求和响应 |
| `all` | 透传真实流量，录制当前 fetch 包装器覆盖的全部请求和响应 |

取值严格区分大小写，不去除首尾空白。除下述 legacy `1` / `true` 外，其他非空值在安装前抛出明确配置错误，不静默关闭或切换模式。这只会拒绝插件初始化，并非进程级网络防火墙；请勿忽略插件加载错误。

开启模型请求阻断并启动 OpenCode：

```bash
OPENCODE_CAPTURE=block opencode
```

查看已有 Session 的继续请求时，使用 fork 避免向原会话追加内容：

```bash
OPENCODE_CAPTURE=block opencode run --session ses_xxx --fork "继续"
```

## 透传记录请求和响应

```bash
OPENCODE_CAPTURE=record opencode

# 捕获当前 fetch 包装器覆盖的全部请求，而不只是模型请求
OPENCODE_CAPTURE=all opencode
```

**`record` 和 `all` 都会真实调用 provider、产生费用并可能执行工具。** `--fork` 仅保护原会话，不隔离工具副作用。不显式启用时插件默认关闭。

启动时 stderr 输出录制目录；每个请求对应 `<目录>/<ID>.json`。响应保持流式交付，响应正文在读取结束后**不脱敏落盘**。请求 headers/body 和响应元数据（包括 headers）继续凭据脱敏。查看 `state` 和请求/响应 `bodyState` 确认完整性，pending/streaming 不代表完整录制。录制失败不会阻断真实请求。

### 从启动到查看结果

以下命令会正常调用你配置的 provider，先确认可接受费用及工具副作用。目录建议放在仓库之外，不要把真实录制数据纳入 Git：

```bash
mkdir -p "$HOME/opencode-captures"
OPENCODE_CAPTURE=record OPENCODE_CAPTURE_DIR="$HOME/opencode-captures" opencode
```

启动后会输出类似提示，实际路径每次不同：

```text
[opencode-http-capture] Recording to /home/user/opencode-captures/opencode-http-capture-AbCdEf
```

正常发起对话并等待回复结束，然后在另一个终端检查对应文件。**一次对话可能产生多次 HTTP 请求，因此可能有 `1.json`、`2.json` 等多个文件；ID 是本次安装的请求序号，不是 Session ID。** 录制模式仍显示模型回复，不会像 block 模式那样用文件路径替代回复。

```bash
# 换成上面实际输出的目录
CAPTURE_DIR='/home/user/opencode-captures/opencode-http-capture-AbCdEf'

# 先检查请求/响应是否完整保存
jq '{id, state, requestBodyState: .request.bodyState, status: .response.status, responseBodyState: .response.bodyState}' "$CAPTURE_DIR/1.json"

# 查看模型实际收到的请求正文（落盘副本已做凭据脱敏）
jq '.request.body' "$CAPTURE_DIR/1.json"

# JSON 响应：显示解析后的对象
jq '.response.body' "$CAPTURE_DIR/1.json"

# SSE / text 响应：将 JSON 字符串解码为可读文本
jq -r '.response.body // empty' "$CAPTURE_DIR/1.json"
```

例如，下面是**虚构且省略部分元数据**的 SSE 录制文件。`response.body` 是原事件流文本，而不是拼接后的 `Hello`：

```json
{
  "id": 1,
  "mode": "record",
  "blocked": false,
  "state": "complete",
  "request": {
    "method": "POST",
    "url": "[URL_REDACTED]",
    "headers": { "authorization": "[REDACTED]" },
    "bodyState": "complete",
    "body": { "model": "example-model", "messages": [{ "role": "user", "content": "Hi" }], "stream": true }
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "text/event-stream" },
    "bodyState": "complete",
    "body": "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\ndata: [DONE]\n\n"
  }
}
```

### 如何判断录制是否完整

| 结果 | 含义 |
| --- | --- |
| `state=complete` 且 `response.bodyState=complete` | 响应流已消费完，支持的正文已保存；空文本也属于完整正文 |
| `pending` / `streaming` | 尚未结束，或进程退出前未消费完；不是实时逐 token 落盘 |
| `bodyState=omitted-limit` | 超过正文上限，整个正文省略，不保留前缀 |
| `bodyState=omitted-incomplete` | 流中断或取消，正文省略 |
| 其他 `omitted-*` / `empty` | 正文不支持、不可用、无法解析或没有响应 body；详见规范 |

只看到 `state=complete` 不代表正文一定存在，也不代表 HTTP 状态是成功。查看 `response.status` 和 `bodyState`；网络错误可能没有响应元数据。录制增加内存、CPU 和磁盘开销，不承诺零延迟。

### 范围、限制与敏感信息

默认每个请求和响应正文上限为 1 MiB，可用 `OPENCODE_CAPTURE_MAX_BYTES` 设置正整数字节数。完整 JSON 响应解析后保存，不脱敏；SSE（`text/event-stream`）及其他 `text/*` 响应保存为 UTF-8 文本，保留事件格式、空白和内容，不做协议重组。缓冲完成后统一解码，因此 chunk 边界不影响录制文本；无效 UTF-8 使用替换字符。交给调用方的响应字节不变。二进制及未知/缺失 content-type 省略（`omitted-unsupported`），无效 JSON 省略（`omitted-unparseable`）；超限或中断时全部省略（`omitted-limit` / `omitted-incomplete`），不保存部分前缀。`bodyState=complete` 表示支持的正文已保存（包括空文本），`empty` 表示没有响应 body 流。请求仅记录通过 `init.body` 传入的 JSON 字符串，Request 内置 body 和上传流不读取。未知端点的这类请求请用 all 范围捕获元数据。

请求快照支持普通数据属性参数和可安全重读的 Headers、字符串键值对象、字符串二元组数组。一次性迭代器、getter、Proxy 等无法安全检查的参数会直接跳过整个录制，all 范围也不例外。locked、bodyUsed 或包装失败的响应原样返回，录制标记为不可用。实例 `clone()` 保留响应元数据并沿用原生流分支/取消行为。录制采用有界字节缓冲，不逐 chunk 保留对象；扩容、文本/JSON 处理和调用方主动创建的克隆队列仍有额外内存开销。常见私钥字段和 PEM 私钥仅在请求及响应元数据中脱敏，仍不保证识别其中任意机密。

all 不覆盖 WebSocket、子进程或绕过 fetch 的通信；这不是全进程抓包或逐字节存档。**响应正文有意保留全部内容，包括 provider 返回的 API key、token、URL、个人信息或其他机密；使用者承担敏感信息风险，并负责安全存储、访问控制和删除。** 请求即使凭据脱敏也可能包含敏感 prompt、代码和工具结果，请勿公开捕获文件。没有自动轮转或清理，长时间录制需关注磁盘占用。

## 获取结果（block 模式）

对于 Chat Completions，assistant 回复为捕获文件的绝对路径：

```text
/tmp/opencode-http-capture-AbCdEf/1.json
```

使用 `jq` 查看或保存请求体：

```bash
jq '.request.body' /tmp/opencode-http-capture-AbCdEf/1.json
jq '.request.body' /tmp/opencode-http-capture-AbCdEf/1.json > request.json
```

指定捕获文件的父目录时，先创建该目录：

```bash
mkdir -p /tmp/my-captures
OPENCODE_CAPTURE=block OPENCODE_CAPTURE_DIR=/tmp/my-captures opencode
```

所有启用模式均可选配 `OPENCODE_CAPTURE_DIR`，默认父目录为系统临时目录。录制模式（`record` / `all`）可选配 `OPENCODE_CAPTURE_MAX_BYTES`；`block` 不使用该限制。

## Legacy 兼容

仅 `OPENCODE_CAPTURE=1` 或 `true` 读取 `OPENCODE_CAPTURE_MODE`（默认 `block`，可选 `record`）和 `OPENCODE_CAPTURE_SCOPE`（默认 `model`，可选 `all`，仅录制时生效）。因此旧命令 `OPENCODE_CAPTURE=1 OPENCODE_CAPTURE_MODE=record` 仍然录制，不会变成阻断；追加 `OPENCODE_CAPTURE_SCOPE=all` 仍录制全部 fetch 流量。非法 legacy MODE，或录制时的非法 SCOPE，会抛出配置错误。

新值 `block` / `record` / `all` 完全忽略 MODE 和 SCOPE，即使旧值冲突或非法也如此；关闭值也忽略它们。目录和录制大小设置仍可选。安装按进程去重；切换模式或关闭已安装的包装器需重启 OpenCode。

## 关闭捕获

退出 OpenCode，随后不带 `OPENCODE_CAPTURE` 重新启动，或将它设为空字符串、`false`、`0`，日常不影响正常使用。

## 卸载

npm 安装：从 `plugin` 数组移除 `opencode-http-capture@0.1.1`（或实际配置的版本）。本地安装：在原源码目录执行：

```bash
bash uninstall.sh
```

卸载后重启 OpenCode。捕获文件保留，查看后自行清理。

## 开发与发布

使用 Node.js 24+ 和 npm。构建及测试没有第三方依赖，无需先执行 `npm install`：

```bash
npm test
git diff --check
npm pack --dry-run
```

`npm run build` 使用 Node 内置 `stripTypeScriptTypes` 去除可擦除的类型语法，改写本地引用并输出 `dist/*.js`，不执行类型检查。`npm test` 重新构建后，对 JavaScript 产物运行行为测试，并在临时目录离线安装真实 tarball，使用模拟 fetch 验证包名加载，不调用真实 provider。包级测试禁用安装脚本，消费者也无需自行构建。

维护者检查及须另行授权的发布步骤见 [RELEASING.md](RELEASING.md)。构建产物和 tarball 不提交。

本机安装 OpenCode 后，可运行 `npm run test:host`：在临时 HOME、独立配置和 Session 存储中加载真实 tarball 的 JavaScript 入口，使用仅监听回环地址的虚构 provider 验证 `block`、`record`、`all`。该检查不继承真实 provider 凭据，不使用现有会话；宿主可能需要下载 SDK 依赖，因此不保证全程离线。可通过 `OPENCODE_BIN` 指定待测 OpenCode 可执行文件。

## 许可证

[AGPL-3.0-or-later](LICENSE)。
