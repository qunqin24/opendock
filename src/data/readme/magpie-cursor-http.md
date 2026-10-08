# magpie-cursor-http

[magpie](https://usemagpie.ai) 插件：为 Cursor 来源设置 HTTP 兼容模式（关闭 / HTTP/2 / HTTP/1.1 / HTTP/1.0），对应 Cursor 自己的 Settings › Network › HTTP Compatibility Mode。

A magpie plugin that picks the HTTP version magpie's Cursor source talks over — off, HTTP/2, HTTP/1.1 or HTTP/1.0 — the way Cursor's own HTTP Compatibility Mode does.

## 为什么需要

magpie 的 Cursor 来源由社区插件 [`@magpie-community/opencode-cursor-auth`](https://github.com/magpie-community/plugins/tree/main/packages/cursor) 提供。它的每次对话都是 `agent.v1.AgentService/Run`，一条跑在 **HTTP/2** 上的 Connect 双向流。走 Zscaler 之类做 TLS 检查的代理、公司或学校网络时，HTTP/2 常被拦截或降级，表现为对话卡住、超时或直接失败。登录、模型列表这类普通请求却能正常返回。

本插件和 Cursor 插件跑在同一个插件宿主里，按所选模式接管发往 `*.cursor.sh` 的请求。

## 模式

| `mode` | 行为 |
|---|---|
| `off`（默认） | 不介入，Cursor 插件照原样走 HTTP/2 |
| `http2` | 同上，显式选择 HTTP/2 |
| `http1.1` | 对话改走 Cursor 客户端在没有 HTTP/2 时用的方式：回复从一条服务器流 `AgentService/RunSSE` 下来，客户端发的每条消息是一次单独的 `BidiService/BidiAppend` 调用。都走 HTTP/1.1，发往 `api2.cursor.sh` |
| `http1.0` | 同样的调用方式，并且 Cursor 的**所有**请求（对话流、追加消息、登录、模型、用量）都按 HTTP/1.0 的规则发：每个请求单独建连接并发 `Connection: close`；请求体整块发送并带 `Content-Length`，不分块；响应按 `Content-Length`、分块或连接关闭来定界；走代理时 `CONNECT` 也用 HTTP/1.0 |

关于 HTTP/1.0 请求行：Cursor 的网关（Envoy）对 `HTTP/1.0` 请求行回 `426 Upgrade Required`。插件先发 `HTTP/1.0`，收到 426 后把同一请求改用 `HTTP/1.1` 请求行重发一次，其余 1.0 规则不变，并按主机记住这个结果。所以链路上只认 HTTP/1.0 的代理照样能用，Cursor 那端也能收下。

还有一点：Cursor 的 agent 专用域名（`agentn.global.api5.cursor.sh` 和各区域的同类域名）只接受 HTTP/2，所以 1.x 模式下对话统一发往 `api2.cursor.sh`，这也是 Cursor 自家客户端回退时用的地址。

## 安装

前提：magpie 里已经装了 Cursor 社区插件，并且已登录。

```bash
magpie plugin add magpie-cursor-http
```

```bash
magpie plugin options magpie-cursor-http '{"mode":"http1.1"}'
```

### 在 magpie 界面里设置

1. 打开 **Plugins › Installed**，找到 `magpie-cursor-http` 这一行。它会标成 *Gateway middleware: onRequest*，见下面的说明。
2. 点这一行右侧的 **Options**，展开一个 JSON 编辑框。
3. 填入 `{"mode": "http1.0"}`（或 `off` / `http2` / `http1.1`），点保存（或按 ⌘↵）。
4. 下一个 Cursor 请求起按新模式发送，不用重启。

为什么会显示成中间件：magpie 的 Plugins 页只给网关中间件显示 Options 按钮，所以包里附带了一个什么都不改的中间件（`cursor-http.middleware.js`，请求原样放行），用来让界面出现这个按钮。界面保存的选项写在 `plugins.json` 里这个包的记录中，插件每秒最多检查一次这个文件，文件有变化就重新读取，所以不用重启插件宿主。

`mode` 的写法比较宽松：`"HTTP/1.1"`、`"1.1"`、`"h2"`、`"关闭"` 都能识别。认不出的值按 `off` 处理，并在 magpie 的日志里给出警告。

环境变量 `MAGPIE_CURSOR_HTTP` 的优先级高于选项，适合临时排查。

### 其它选项

| 键 | 默认值 | 说明 |
|---|---|---|
| `wire` | `"grpc-web"` | 1.x 模式下对话流用的协议：`grpc-web`（和已知能跑通的开源客户端一致）或 `connect`。一种不出结果时可以换另一种试 |
| `idleSeconds` | `120` | 对话流这么多秒没收到 Cursor 的任何数据，就报错结束，不再一直挂着。填 `0` 关闭 |
| `log` | `~/.cache/magpie/cursor-http.log` | 诊断日志路径，`false` 关闭。只记录每次对话的步骤和耗时，不记录 token |
| `debug` | `false` | 日志里额外记录每一帧和每次 BidiAppend |
| `hosts` | `["cursor.sh"]` | 接管哪些主机（含子域名） |
| `base` | `https://api2.cursor.sh` | 1.x 模式下对话发往的地址 |
| `proxy` | magpie 的代理 | 仅 `http1.0` 使用的 HTTP 代理，例如 `http://127.0.0.1:7890` |

## 排查：没有报错但也没有回复

先看 `~/.cache/magpie/cursor-http.log`。每次对话会记下这些：

- `running in magpie …, Bun …, host …, plugins: …`：插件启动时记下 magpie 和 Bun 的版本、插件宿主，以及装了哪些插件、各是什么版本；
- `http2.connect was set again …`：插件加载之后，有别的代码又设置了一次 `http2.connect` 或 `fetch`。插件会让新设置的那个排在自己后面，保证 Cursor 的请求仍然先经过本插件；
- `a chat comes for cursor/…`：一个对话请求到了插件这层（插件宿主对每个对话都会调用 `chat.headers` 钩子，本插件借此记录，不改请求内容）；
- `HTTP/2 session asked …ms after GetServerConfig`：Cursor 插件取完服务器配置后开始建立对话连接；如果 10 秒内没有建连，会记 `no HTTP/2 session in 10s after GetServerConfig`，并附上调用位置；
- `unhandled rejection in the plugin host`：插件宿主里有没被处理的异常；
- `looking for cursor-agent in PATH … took …ms`：Cursor 插件每次对话前都要在 PATH 里找 cursor-agent 来报版本号，这一行记下了找的耗时；哪个目录慢（网络盘、云盘挂载）会列在 `slow:` 后面；
- `an HTTP/2 session to … is opened`：Cursor 插件开始对话；
- `http1.0 … body read: …B in …ms`：1.0 模式下响应体读完；
- `http1.0 POST … via …`：1.0 模式下每个请求走的代理，以及它的状态码和耗时，失败时附原因；
- `run … start`：对话流开始，记录模式、协议和地址；
- `RunSSE 200 in …ms`：流建立成功，附响应头（`content-encoding`、`via` 等，可以看出有没有被代理改过）；
- `BidiAppend #0 … 200`：第一条消息送达；
- `first frame in …ms`：Cursor 第一次有数据下来；
- `end after …`：怎么结束的，附错误内容。

常见情况：

- `GetServerConfig … 200` 之后既没有 `body read`，也没有 `an HTTP/2 session`：读取响应体卡住了，请把日志发给插件作者。
- 有 `GetServerConfig … body read`，但没有 `an HTTP/2 session`：卡在 Cursor 插件自己找 cursor-agent 这一步，看 `looking for cursor-agent` 那行列出的慢目录，把它从 magpie 的 PATH 里去掉。
- 只有 `options` 一行，之后什么都没有：Cursor 插件没收到请求。确认 Cursor 账号在社区插件上（`magpie plugin move cursor`），而不是在内置 Cursor 上。
- 有 `http1.0 POST … via direct`，并且 `failed`、超时：这台机器直连不了 Cursor，需要代理。在选项里填 `proxy`，或在 magpie 里给 Cursor 设代理。
- 有 `RunSSE 200` 和 `BidiAppend #0 200`，但一直没有 `first frame`：响应被中间的代理攒着不发。把 `wire` 换成另一种试试；仍然不行，就是这个代理不支持流式响应。120 秒后插件会报 "Cursor sent nothing for 120s"。

1.0 模式下，每个请求等待响应开始最多 30 秒，等不到就报错，不会一直挂着。

## 代理

- `http1.1` 用插件宿主自己的 `fetch`，代理和 magpie 的其它请求完全一致。
- `http1.0` 自己建连接，经代理时用 `CONNECT … HTTP/1.0`。代理按以下顺序取：
  1. 选项里的 `proxy`；
  2. magpie 给这次请求的代理，包括给账号或服务商单独设的代理，以及 `direct`。插件宿主只把它交给自己的 `fetch` 和它启动的程序，插件就启动一个只打印环境变量的程序（`/usr/bin/env`，Windows 上是 `set`）把它读出来；
  3. 环境变量 `HTTPS_PROXY` / `ALL_PROXY`。

  `NO_PROXY` 生效。日志里每个请求都会注明走的哪个代理、代理从哪来，比如 `via http://127.0.0.1:7890 (magpie)` 或 `direct`。

## 局限

- 只作用于 Cursor **社区插件**。magpie 内置的 Cursor（Go 实现）不经过插件宿主，插件管不到。可以用 `magpie plugin move cursor` 把账号迁到社区插件。
- `http1.1` / `http1.0` 依赖响应能流式传下来。如果代理把整个响应缓存完才转发，纯文字回复会在结束时一次性出现；但带工具调用的那一步要等客户端回传结果才会结束，这种情况下会一直等到超时。这是这类代理的限制，HTTP/1.0 规则本身解决不了。
- 每条对话流每 5 秒的心跳在 1.x 模式下各是一次 `BidiAppend` 请求，`http1.0` 下每次都要新建连接。

## 原理

Cursor 插件在每次请求时才去查 `http2.connect`，用它建 HTTP/2 会话。本插件在加载时替换掉 `http2.connect`；`http1.0` 模式下还会替换 `fetch`。对 Cursor 的主机，插件返回一个替身会话：

- 插件写入的 Connect 帧，逐条变成 `BidiAppend`（`data` 为消息的十六进制，`append_seqno` 从 0 递增），按顺序串行发送；
- `RunSSE` 下来的帧原样交给 Cursor 插件；
- 服务器返回的错误（未登录、额度用尽、区域限制等）转成 Connect 的结束帧，Cursor 插件照常读出状态码和提示。

其它主机、以及 `off` / `http2` 模式，一律交回原来的实现。

## 开发

```bash
npm test
```

测试用一个原始 TCP 服务器模拟 Cursor 的 RunSSE / BidiAppend，检查两种模式在线上实际发出的内容：请求行版本、`Connection: close`、不分块、426 降级、错误映射。测试在 Node 和 Bun 下都能跑（`bun test`）。

## License

MIT
