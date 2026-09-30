# opencode-ntfy-plugin

一个 OpenCode V2 插件：把任务执行结果推送到 [ntfy](https://ntfy.sh)，让你在手机、桌面或浏览器上第一时间知道 OpenCode 什么时候做完了、失败了，或者正在等你授权。

本插件通过 npm 包名加载，安装后只需在 `opencode.jsonc` 里填一次 topic 即可使用。

## 功能特性

OpenCode 运行过程中，以下事件会推送到你配置的 ntfy topic：

| 事件 | 通知标题 | 默认 |
| --- | --- | --- |
| `session.execution.succeeded` | `[opencode] 主任务·已完成` / `子任务·已完成` | 开 |
| `session.execution.failed` | `[opencode] 主任务·执行失败` | 开 |
| `permission.asked` | `[opencode] 主任务·需要授权` | 开 |
| `form.created` | `[opencode] 主任务·需要回答问题` | 开 |
| `session.idle` | `[opencode] 主任务·已失败` / `已中断` / `已完成` | 开 |
| `session.execution.started` | `[opencode] 主任务·开始` | 关 |
| `session.retry.scheduled` | `[opencode] 主任务·即将重试` | 关 |

说明：

- 同一个会话的成功或失败只推送一次（多种事件之间自动去重，不会重复打扰）。去重集合有容量上限（20 条，只保留最近的键），语义仍是"防重"，只丢最老的键。
- 授权请求按**工具调用**精确去重：同一次工具调用（同一消息 + 同一 tool id）无论权限请求 id 如何变化只推送一次，宿主对同一次工具调用重复发起授权也不会重复打扰；不同的工具调用即使动作和资源完全相同也算新请求，会正常推送。没有来源信息（source）的授权请求退化为按"会话 + 动作 + 资源"去重。
- 表单（`form.created`）按**表单 ID**（`frm_` 开头的稳定 ID）精确去重：同一表单被宿主重复推送只通知一次；不同的表单即使会话、标题完全相同也算新表单，会各通知一次（仅当表单缺少 ID 的旧版数据才退化为按"会话 + 标题"去重）。`form.replied` / `form.cancelled` 只做簿记、不另发通知；已通知记录予以保留，宿主在用户回答或取消后重复推送同一表单不会再打扰。
- 主任务和子任务分别由 `notifyRoot` / `notifyChildren` 控制，详见[配置](#配置)。
- 通知标题不含 emoji，图标由 ntfy 的 Tags 提供（如对勾、红叉、警示灯）。
- 正文中的 Token 汇总为整个会话的**累计值**，不是单轮增量。
- 插件只推送启动后发生的事件；重启 OpenCode 之前已经跑完的任务不会补发通知。
- 事件流意外断开时插件会无限重连（1s 起步指数退避、60s 封顶、带抖动），但**断线间隙内的事件不补发**：宿主没有补发/回放接口，去重机制只对实际收到的事件防重。重连失败只在开启 debug 时记录日志，不会刷屏、不会放弃。

## 安装

**前置要求**：Node.js 18+，以及已安装的 [OpenCode](https://opencode.ai) V2。

1. 安装插件。在项目目录执行（这一步只是预装，也可以跳过——OpenCode 检测到 `plugins` 里的 npm 包时会自动安装）：

   ```bash
   npm install opencode-ntfy-plugin
   ```

2. 在项目的 `opencode.jsonc` 中注册插件并填入 topic：

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       {
         "package": "opencode-ntfy-plugin",
         "options": { "topic": "你的topic" }
       }
     ]
   }
   ```

3. **重启 OpenCode**。必须重启，否则加载的还是旧代码（见[常见问题](#常见问题)）。

4. 用 ntfy App 或 [ntfy.sh 网页版](https://ntfy.sh/app)订阅你的 topic，然后在 OpenCode 里跑一个任务，即可收到通知。

## 配置

完整配置示例（`token`、`tag`、`priority` 为可选项，未列出时使用下表默认值）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-ntfy-plugin",
      "options": {
        "server": "https://ntfy.sh",
        "topic": "你的topic",
        "notifyRoot": true,
        "notifyChildren": true,
        "notifyStarted": false,
        "notifyFailed": true,
        "notifyPermission": true,
        "notifyRetry": false,
        "sessionTimeoutMs": 5000
      }
    }
  ]
}
```

| options | 环境变量 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `server` | `NTFY_SERVER` | `https://ntfy.sh` | ntfy 服务地址 |
| `topic` | `NTFY_TOPIC` | 无 | **必填**，缺失则启动告警且不发送 |
| `token` | `NTFY_TOKEN` | 无 | 访问令牌，发送 `Authorization: Bearer ...` |
| `tag` | `NTFY_TAG` | 按结果自动选择 | 覆盖默认 ntfy tag |
| `priority` | `NTFY_PRIORITY` | 成功 3、失败/中断 4 | 整数 1..5 |
| `notifyRoot` | `NTFY_NOTIFY_ROOT` | `true` | 主任务通知 |
| `notifyChildren` | `NTFY_NOTIFY_CHILDREN` | `true` | 子任务通知 |
| `notifyStarted` | `NTFY_NOTIFY_STARTED` | `false` | 任务开始通知 |
| `notifyFailed` | `NTFY_NOTIFY_FAILED` | `true` | 失败通知 |
| `notifyPermission` | `NTFY_NOTIFY_PERMISSION` | `true` | 授权请求通知 |
| `notifyRetry` | `NTFY_NOTIFY_RETRY` | `false` | 重试通知 |
| `sessionTimeoutMs` | `NTFY_SESSION_TIMEOUT_MS` | `5000` | 单次会话查询超时（ms），超出跳过该事件；钳制范围 1000~30000 |
| `configFile` | `NTFY_CONFIG_FILE` | 默认 `$HOME/.config/opencode/ntfy.local.jsonc`（首次运行自动创建） | 外部本地配置文件路径，承载本机差异配置；显式指定时只读取、不创建 |

- 优先级（从高到低）：`options` 内联 > 环境变量 > 外部本地配置文件 > 内置默认值。外部文件说明见[多电脑配置](#多电脑配置外部本地文件)。
- 两者均未配置 `topic` 时，插件不发送任何通知，只会在启动时给出告警。
- 布尔类环境变量支持 `true/1/yes/on` 与 `false/0/no/off`，无法识别的值按默认值处理。
- `sessionTimeoutMs` 非法值（空串、非数字、0 或负数）回退默认 5000ms，合法值按 1000~30000ms 钳制。

## 多电脑配置（外部本地文件）

如果你在**多台电脑**上使用同一个项目，`opencode.jsonc` 通常通过 git 同步保持一致，但每台电脑的 ntfy topic（以及 server、token）往往不同。解决办法：把**本机差异**写进一个外部本地配置文件，`opencode.jsonc` 只保留公共部分，再把本地文件加入 `.gitignore` 即可。

默认文件在插件首次运行时会**自动创建**（含目录），并带上一份写满中文注释的模板，照着填写即可用。

### 文件位置

固定为**单一默认路径**（不再有 XDG / `%APPDATA%` 搜索链）：

```
$HOME/.config/opencode/ntfy.local.jsonc
```

Windows 上 `HOME` 取 `USERPROFILE`，即 `C:\Users\<用户名>\.config\opencode`。

行为规则：

- **首次运行自动创建**：默认文件不存在时，插件自动创建目录与文件，写入[带中文注释的默认模板](#默认模板首次自动创建)，`topic` 等留空占位等你填写。
- **已存在绝不覆盖**：文件已存在时原样读取，你的注释和取值都保留。
- **旧文件名兼容提示**：如果只有 0.1.1 及之前版本的 `ntfy.local.json`、还没有 `.jsonc`，插件**不会**自动创建新文件，而是在日志里提示你把旧文件重命名为 `ntfy.local.jsonc`（否则一个空 topic 的新模板会把你的真实配置悄悄盖住）。
- **不可写不崩溃**：默认目录不可写（无权限、路径被文件占用等）时只记一条错误日志，插件继续使用其他配置来源。
- **显式指定只读不建**：用 `options.configFile` 或环境变量 `NTFY_CONFIG_FILE` 指定任意路径时，**只读取、不创建**（用户指定的路径不擅自动手）。**建议使用绝对路径**——相对路径按 OpenCode 进程的工作目录解析，不确定时不推荐。

### 文件格式

JSONC，容忍 `//` 行注释和 `/* */` 块注释（**不支持**尾逗号）。只读取白名单字段（与上表 `options` 相同，另含 `debug`），未知字段忽略：

```jsonc
{
  // 本机差异配置：默认位于 ~/.config/opencode/ntfy.local.jsonc，
  // 已被 .gitignore，不会同步
  /* 块注释 */
  "server": "https://ntfy.sh",
  "topic": "这台电脑的topic",
  "token": "可选",
  "tag": "可选",
  "notifyStarted": true
}
```

- 文件不存在（显式路径）→ **静默跳过**，不影响其他配置来源；默认路径不存在则[自动创建](#默认模板首次自动创建)。
- 文件存在但解析失败（非法 JSON，或内容不是 JSON 对象）→ 记一条错误日志，插件继续使用其他来源，**不会崩溃**。
- 文件中的 `debug` 同样会启用调试日志。

### 默认模板（首次自动创建）

默认文件缺失时自动写入（即 `$HOME/.config/opencode/ntfy.local.jsonc`）。每个字段都带中文注释说明用途、格式和默认值；`topic` / `token` / `tag` 留空待填；`priority` 默认注释掉，保持"按结果自动选择优先级"；其余取值与内置默认值一致，创建后行为与默认值完全相同：

```jsonc
{
  // =====================================================
  // ntfy 通知插件 · 本机差异配置（首次运行时自动创建）
  //
  // 文件用途：存放只对「这一台电脑」生效的 ntfy 插件配置
  //   （topic、server、token 等）。路径固定为：
  //   $HOME/.config/opencode/ntfy.local.jsonc
  //   （Windows 即 C:\Users\<用户名>\.config\opencode），
  //   按机器各自维护，请勿随 git 同步（加入 .gitignore）。
  //
  // 与 opencode.jsonc 的分工：
  //   - opencode.jsonc（项目/全局，可跟 git 同步）：放各处一致的
  //     公共配置，如通知开关、server 等；
  //   - 本文件：放本机差异，主要是 topic、token 以及排障用的 debug。
  //
  // 优先级（从高到低）：
  //   opencode.jsonc 的 options 内联值
  //     > 环境变量（NTFY_TOPIC 等 NTFY_* 变量）
  //       > 本文件
  //         > 内置默认值
  //
  // 格式：JSON，支持 // 行注释和 /* */ 块注释（不支持尾逗号）；
  //   只读取下方列出的字段，其它字段一律忽略。
  //   修改本文件后需要重启 OpenCode 才会生效。
  // =====================================================

  // ntfy 服务地址。默认 https://ntfy.sh；自建服务填你自己的地址。
  "server": "https://ntfy.sh",

  // topic：必填。通知发送到哪个 ntfy topic。
  //   公共 ntfy.sh 上 topic 名相当于"密码"，请使用足够长、难猜测的
  //   名字（如 my-opencode-alerts-8f3k2j），避免无关人员也能收到。
  //   留空则插件不发送任何通知（启动时会给出告警）。
  "topic": "",

  // token：可选。ntfy 访问令牌，用于私有/受保护的 topic，
  //   发送时以 Authorization: Bearer <token> 请求头携带。
  //   与通知正文里的"Token 消耗"无关。仅自建或受保护的服务需要。
  "token": "",

  // tag：可选。覆盖默认的 ntfy 图标标签（emoji 短代码，如
  //   white_check_mark、warning、rotating_light、x、information_source）。
  //   不填则按通知类型自动选择。
  "tag": "",

  // priority：可选，整数 1~5（1 最低、5 最高）。
  //   不填则按结果自动选择：成功 3、失败/中断 4、需要授权 5。
  //   填了固定值则所有通知统一使用该优先级。
  // "priority": 3,

  // notifyRoot：主任务（无父会话的执行）完成/失败时是否通知。
  "notifyRoot": true,

  // notifyChildren：子任务（有父会话的执行）完成/失败时是否通知。
  "notifyChildren": true,

  // notifyStarted：任务刚开始执行时是否推送一条通知（默认关，避免刷屏）。
  "notifyStarted": false,

  // notifyFailed：任务执行失败时是否通知。
  "notifyFailed": true,

  // notifyPermission：工具调用需要你授权（批准/拒绝）时是否通知。
  "notifyPermission": true,

  // notifyRetry：请求失败、即将自动重试时是否通知（默认关）。
  "notifyRetry": false,

  // debug：是否输出调试日志（[ntfy-debug] 前缀，写入 OpenCode 日志）。
  //   排障时打开，平时保持关闭。
  "debug": false,

  // sessionTimeoutMs：单次会话信息查询的超时时间（毫秒）。
  //   超出即跳过该次事件的通知，避免卡住整个事件循环。
  //   合法范围 1000~30000，默认 5000。
  "sessionTimeoutMs": 5000
}
```

### .gitignore

在同步 `opencode.jsonc` 的仓库里加入（两个名字都加上，兼容旧版文件；如果文件放在仓库内，也加上对应路径）：

```gitignore
ntfy.local.jsonc
ntfy.local.json
```

### 优先级与分工

优先级从高到低：

1. `opencode.jsonc` 的 `options` 内联值
2. 环境变量（`NTFY_*`）
3. 外部本地配置文件（默认 `ntfy.local.jsonc`，或 `configFile` 指定的文件）
4. 内置默认值

推荐的用法：

- **公共配置**（通知开关等各处一致的）放 `opencode.jsonc`，跟 git 走；
- **本机差异**（topic、server、token、debug）放 `ntfy.local.jsonc`（首次运行自动创建，填入即可），各电脑自行维护、gitignore；
- **临时覆盖**用环境变量，只对当次进程生效。

`opencode.jsonc`（公共部分）示例：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-ntfy-plugin",
      "options": {
        "server": "https://ntfy.sh",
        "notifyRoot": true,
        "notifyChildren": true,
        "notifyStarted": false
      }
    }
  ]
}
```

每台电脑首次运行插件时会在 `$HOME/.config/opencode/ntfy.local.jsonc` 自动生成模板，填入各自的 `topic`、`token`，重启 OpenCode 后生效。

## 通知内容示例

通知标题形如 `[opencode] 主任务·已完成`，正文为多行纯文本。

**任务成功**

```text
标题：修复登录页样式
类型：主任务
项目：web-app
目录：/home/you/web-app
模型：anthropic/claude-sonnet-4
结果：成功
执行时长：2m 15s
Token：输入 10万｜输出 0.8万｜推理 0.3万｜缓存读 2.5万｜缓存写 0.5万｜缓存率 19.2%
会话 ID：ses_abc123
```

**任务失败**（多出 `错误` 一行）

```text
标题：修复登录页样式
类型：主任务
项目：web-app
目录：/home/you/web-app
结果：失败
错误：command not found: pnpm
模型：anthropic/claude-sonnet-4
执行时长：45s
Token：输入 10万｜输出 0.8万｜推理 0.3万｜缓存读 2.5万｜缓存写 0.5万｜缓存率 19.2%
会话 ID：ses_abc123
```

**需要授权**（OpenCode 执行某个工具前请求批准时）

```text
标题：安装项目依赖
类型：主任务
项目：web-app
目录：/home/you/web-app
权限：bash
资源：npm install
说明：安装 package.json 中的依赖
模型：anthropic/claude-sonnet-4
会话 ID：ses_def456
```

**需要回答问题**（表单交互，问题最多列 10 条）

```text
标题：选择部署环境
类型：主任务
项目：web-app
目录：/home/you/web-app
问题：
- [env] 部署到哪个环境 (staging、production)
- [replicas] 副本数量 (数字)
- [clear_cache] 是否清空缓存 (是/否)
模型：anthropic/claude-sonnet-4
会话 ID：ses_ghi789
```

开启 `notifyStarted` / `notifyRetry` 后，还会额外收到两种通知：`开始`（含标题、项目、目录、模型、会话 ID）与`即将重试`（附第几次、失败原因）。

## 常见问题

### 改完配置没有生效？

**重启 OpenCode**。不论是修改 `opencode.jsonc`、更新插件版本还是切换环境变量，都必须完整重启 OpenCode，否则运行的是旧代码。

### Windows 下 npm 命令报“无法加载文件 npm.ps1，因为在此系统上禁止运行脚本”？

这是 PowerShell 执行策略禁用了 `.ps1` 脚本。请改用 `npm.cmd`、`npx.cmd`，例如 `npm.cmd install opencode-ntfy-plugin`。

### 收不到通知，按什么顺序排查？

1. 确认 topic 已配置：`opencode.jsonc` 的 `options.topic`、`NTFY_TOPIC` 环境变量，或外部本地文件 `ntfy.local.jsonc`（见[多电脑配置](#多电脑配置外部本地文件)——默认路径首次运行会自动创建，需要手动填入 topic）。
2. 重启 OpenCode。
3. 打开 ntfy App 或 ntfy.sh 网页，订阅同一个 topic，先手动发一条测试消息，确认能正常收到。
4. 在 OpenCode 里跑一个任务直到完成或失败，确认它确实触发了上表中的事件（例如授权通知需要一次真实的权限请求）。
5. 另外注意：插件只推送启动**之后**发生的事件，重启前已经跑完的任务不会补发；事件流断开重连期间的间隙事件同样不补发（详见[功能特性](#功能特性)）。

### 手机上怎么接收？

安装 ntfy App（Android / iOS），订阅你的 topic 即可，**无需登录**。使用公共 ntfy.sh 时，topic 名相当于“密码”，建议用足够长、难猜测的名字，避免无关人员也能收到你的通知。

### `token` 是什么？

`token` 是 ntfy 服务的访问令牌，用于访问受保护的私有 topic，与通知正文里的“Token 消耗”无关。

### 想让所有项目都收到通知，或只让某个项目收到？

- **所有项目**：把配置写进全局 `~/.config/opencode/opencode.jsonc`，插件包由 OpenCode 自动安装（无需也不依赖 `npm install -g`）。
- **单个项目**：把配置写进该项目根目录的 `opencode.jsonc`，并在该项目里 `npm install opencode-ntfy-plugin`。

## License

[MIT](LICENSE) © mofapifeng

仓库：https://github.com/scookiem/ntfy-opencode2.git
