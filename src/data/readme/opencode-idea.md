# opencode-idea

OpenCode 插件,面向 JetBrains 项目(IntelliJ IDEA / PyCharm / WebStorm 等),做三件事:

1. **接入 IDE MCP** —— 用 `/open-in-idea` 把当前项目在 IntelliJ IDEA 中打开,并把这个 IDE 的 MCP 服务(60 个工具:检索、读、改、构建、重构、调试、数据库……)注册进 OpenCode。
2. **优先使用 IDE 工具** —— IDE 可用时,向模型注入"项目内操作默认走 IDE MCP"的系统提示引导 + 能力映射;IDE 不可用时回退原生工具(正常回退,无需声明)。
3. **注入 IDE 环境变量** —— 从 IDE 集成终端读取它实际运行的环境(版本化管理的 Node、goenv 的 Go、SDKMAN 的 Java、Maven……)注入每个 OpenCode shell。

非 JetBrains 项目完全不受影响。**全部手动**:插件启动不探测、不连接 IDE,只有跑 `/open-in-idea` 时才连接。

## 工作原理

```text
setup(启动):
  a. 读 IDE 集成终端环境 → 通过 shell create.before 钩子注入每个 shell(null: 未连 IDE 时为空)
  b. 注册 /open-in-idea 命令 + session context 钩子(注入引导)
  不探测、不注册 MCP

/open-in-idea(手动触发):
  1. 探测本地 JetBrains IDE MCP 服务(/stream)
  2. 已就绪 → 直接连接
  3. 未就绪 → open -a "IntelliJ IDEA" <项目目录>(复用已运行实例),然后立即提示:
     在 IDEA 中开启 MCP 服务 + Brave Mode
  4. 本次命令 fast-fail 返回;用户手动开启后再次执行 `/open-in-idea`
  5. MCP 就绪时:
       a. 注册 IDE MCP(url /stream,header IJ_MCP_SERVER_PROJECT_PATH 锁定当前项目)
       b. 读 IDE 终端环境 → 更新注入每个 shell 的环境变量
       c. 启用系统提示引导(直接调用 `idea_*` 工具)+ IDEA MCP 工具描述前缀
  6. 发一条结果通知(用户看到干净气泡,模型只回"收到")
```

## 在 IDE 中打开项目(`/open-in-idea`)

在会话里输入 `/open-in-idea`:

1. 先探测 `/stream`;已就绪 → 直接加载能力;
2. 未就绪 → 用 `open -a "IntelliJ IDEA" <项目目录>` 拉起或激活 IDEA —— **复用已运行的实例**(不会重复开新实例);
3. 如果 MCP 仍未就绪,命令会**立即 fast-fail**,提示在 IDEA 的 `Settings → MCP Server` 开启 MCP 服务并启用 **Brave Mode**;
4. 用户手动完成设置后,再次执行 `/open-in-idea`;探测成功后才注册 IDE MCP、重读 IDE 环境并启用系统引导与 live tool catalog。

> **通知不触发 AI 干活**:默认 `feedback: "message"` 把结果作为一条**标注清楚的通知**发到会话里 —— 用户看到干净的通知气泡(经 `metadata.displayText`),模型只看到"这是通知,请只回复『收到』"的指令,因此不会执行任何操作、不会调用工具。`feedback: false` 则完全静默。

**可重入 / 启动保护**:IDEA 冷启动、索引或等待「Trust and Open Project」弹窗期间探测会失败。命令只发一次 MCP/Brave Mode 提示并 fast-fail,不会在后台轮询;重复触发共享同一次打开请求,按目录维护 `lastSpawnAt` / `attempts`,避免重复 spawn。开启 MCP + Brave Mode 后再次执行 `/open-in-idea` 即可接上。

**热更新会断开**:插件源码变更会触发 V2 热重载,注册随旧实例一起释放,`activePort` 归零。这是手动模式的预期行为 —— **改完插件后重跑一次 `/open-in-idea`** 即可恢复。

## IDE 工具优先(直接调用引导)

IDE MCP 可用时,插件通过两层轻量引导提高模型主动使用 IDEA MCP 的概率;不会修改原生工具的定义、描述或可用性:

1. **系统提示注入**(主):通过 `ctx.session.hook("context", …)` 往每次请求的 system 里追加一段「项目内操作优先使用 IDEA MCP」的直接调用引导 + 能力映射表(`src/ide-guidance.js`),含工具名(`idea_<name>`)与关键参数名:
   - 检索 → `idea_search_text` / `idea_search_regex` / `idea_search_file`(参数 `q`,可带 `paths` 收窄)
   - 读文件 → `idea_read_file`(`file_path` / `offset` / `limit`);目录 → `idea_list_directory_tree`
   - 改文件 → `idea_apply_patch`(`input`);新建 → `idea_create_new_file`(`pathInProject`)
   - 校验 → `idea_lint_files` / `idea_get_file_problems` / `idea_build_project`
   - 重构/格式化 → `idea_rename_refactoring` / `idea_reformat_file`;版本 → `idea_git_status`
   - 例外(直接用原生):IDE 不索引的目录、`git diff/log/blame`、MCP 无等价能力、IDE MCP 未连接/未注册

   连接成功后,插件只对 `idea_*` IDEA MCP 工具追加一段简短描述,要求模型直接调用、严格按当前 schema 传参;不会把整份工具目录重复塞进 system prompt,也不要求模型额外包一层 JavaScript 编排代码。

   IDEA MCP 工具自身的 description/schema 仍是参数使用的权威来源;工具返回业务错误时先修正参数,不要误判成工具不可用。MCP 不可用时立即提示用户执行 `/open-in-idea`,不重复探测或等待。

2. **IDEA MCP 工具描述增强**:插件通过 `ctx.tool.transform` 只更新 `idea_*` / `idea.*` 工具的 description,强调直接调用和按 schema 传参;原生 `edit` / `write` / `patch` / `shell` 完全不变。

引导只在 **IDE MCP 可用**时生效;MCP 不可用时仅保留 fast-fail 恢复提示。`injectGuidance: false` 可关闭系统提示注入。

## 环境变量注入

**唯一来源:IDE 集成终端**(`execute_terminal_command printenv`)。它反映 IDE 实际运行的环境 —— 版本化管理的 Node(如 fnm v14)、goenv 的 Go、SDKMAN 的 Java 等 —— 这些 .idea 配置里往往读不到。

抽取的变量(`src/ide-env.js` 的 `SDK_ENV_KEYS`):`JAVA_HOME` / `JRE_HOME` / `JDK_HOME` / `VIRTUAL_ENV` / `PYTHONPATH` / `PYTHONHOME` / `GOROOT` / `GOPATH` / `GOBIN` / `NODE_PATH` / `NVM_BIN` / `NVM_DIR` / `MAVEN_HOME` / `M2_HOME` / `GRADLE_HOME` / `SDKMAN_DIR` / `CONDA_PREFIX`。

- 注入通过 V2 的 `shell` `create.before` 钩子:只补这些变量 + 前置 PATH,不覆盖你原有的 PATH。
- 需要 IDE MCP 可达 + **Brave Mode**;拿不到时环境为空(不影响其他功能)。

> 与 [opencode-env-loader](https://github.com/syllr/opencode-env-loader) 的关系:两者独立。env-loader 负责 `.opencode/env-loader/*` 的**人工** KEY=VALUE 覆盖;本插件负责从 **IDE 实际环境**推导。可以同时使用。

## 前置条件

- JetBrains IDE 已开启 MCP 服务(IDE 设置里的 MCP Server / AI Assistant MCP),版本需 **2026.2+**(提供 Streamable HTTP 端点 `/stream`);若关闭,`/open-in-idea` 会立即提示如何重新开启。
- 要读 IDE 终端环境,需要在 IDE 里开启 **Brave Mode**(否则 `execute_terminal_command` 会等确认);MCP 未就绪时通知会同时提醒开启它。
- 插件注册给 OpenCode 的 MCP 配置形如:

```jsonc
{
  "type": "remote",
  "url": "http://127.0.0.1:64342/stream",
  "headers": { "IJ_MCP_SERVER_PROJECT_PATH": "<项目路径>" },
}
```

> **为什么是 `/stream` 而不是 `/sse`**:OpenCode V2 的远程 MCP 客户端**只支持 Streamable HTTP**,没有旧版 SSE 传输。IDE 的 `/sse` 是旧版 SSE(POST 会返回 405),V2 连不上(报 `Error POSTing to endpoint`)。IDE 2026.2 起额外提供 `/stream` 这个 Streamable HTTP 端点。**插件的探测也走 `/stream`**(一次 `initialize`),协议统一。

插件按 `ports` 顺序选择第一个可用端口,但会并发探测以避免多个端口的超时叠加;默认 `[64342, 6420, 6421, 63342]`。

## 安装

```json
{
  "plugin": ["opencode-idea"]
}
```

> 仅支持 **OpenCode V2**。若你日常跑的是 1.x 的 `opencode-ai`,它用的是旧插件 API,本插件不会生效;真机验证请用 V2 运行时。

### 本地开发 / 真机验证

插件未发布时,可以直接指向本地仓库目录。V2 解析**目录**插件时找的是 `<dir>/index.*`(或 `<dir>/server.*`),不会读 `package.json#main`,所以仓库根目录提供了 `index.js` 转发到 `src/index.js`。

全局配置 `~/.config/opencode/opencode.json`(V2 桌面端/CLI 共用):

```jsonc
{
  "plugins": [{ "package": "/Users/yutao/Projects/opencode-idea" }],
}
```

也可以沿用旧键 `plugin` 的元组写法:

```jsonc
{
  "plugin": [["/Users/yutao/Projects/opencode-idea", {}]],
}
```

配置保存后 V2 会监听并自动重载(日志里能看到它开始 watch `index.js` / `src/*.js`),无需重启。改插件源码也会触发重载(此时需重跑 `/open-in-idea`)。

另一种零配置方式:在 `~/.config/opencode/plugins/` 放一个转发文件(自动发现,但不能传 options):

```js
// ~/.config/opencode/plugins/opencode-idea.js
export { default } from "/Users/yutao/Projects/opencode-idea/src/index.js";
```

## 配置

```jsonc
{
  "plugin": [
    [
      "opencode-idea",
      {
        "ports": [64342, 6420, 6421, 63342],
        "injectEnv": true,
        "injectGuidance": true, // IDE 可用时向系统提示注入「默认走 IDE MCP」引导
        "openInIde": "idea", // false 关闭;或任意 macOS 应用名(如 "IntelliJ IDEA")
        "launchCooldownMs": 120000, // 启动保护冷却
        "launchMaxAttempts": 5,
        "mcpProbeTimeoutMs": 1000, // 单个 MCP 端口的短探测超时
        "feedback": "message", // "message"(默认,会话通知,AI 只回"收到")| false(静默)
      },
    ],
  ],
}
```

| 选项                | 类型                 | 默认                         | 说明                                                             |
| ------------------- | -------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `ports`             | `number[]`           | `[64342, 6420, 6421, 63342]` | 依次探测的 IDE MCP 端口                                          |
| `injectEnv`         | `boolean`            | `true`                       | 是否注入 IDE 终端环境变量                                        |
| `injectGuidance`    | `boolean`            | `true`                       | IDE 可用时是否向系统提示注入「默认走 IDE MCP」引导               |
| `openInIde`         | `boolean \| string`  | `"idea"`                     | 拉起哪个 IDE;`false` 关闭,`"idea"` 映射到 IntelliJ IDEA          |
| `launchCooldownMs`  | `number`             | `120000`                     | 启动保护冷却:冷却期内不重复 spawn                                |
| `launchMaxAttempts` | `number`             | `5`                          | 单次会话内最多 spawn 次数,超出后停止重试                         |
| `mcpProbeTimeoutMs` | `number`             | `1000`                       | 单个 MCP 端口的短探测超时                                        |
| `feedback`          | `"message" \| false` | `"message"`                  | 结果反馈:`message` 会话通知(用户可见,AI 只回"收到");`false` 静默 |

## 行为

- **JetBrains 项目**:启动即注入 IDE 终端环境(若此前已连过 IDE);`/open-in-idea` 接入 IDE MCP + 启用引导。
- **非 JetBrains 项目**:不改环境、不注册、不改描述。
- **纯手动**:启动**不探测、不连接 IDE MCP**;IDE MCP 注册、环境重读、系统提示引导全部由 `/open-in-idea` 触发。IDE 中途关闭不会自动撤销,需再执行一次 `/open-in-idea` 重新同步。
- **`/open-in-idea`**:手动打开当前项目并即时加载能力(已在 IDE 打开时则只重新加载);MCP 未开启时只发一次提示并 fast-fail,用户手动开启 MCP + Brave Mode 后重试。
- **IDEA 工具增强**:通过 `ctx.tool.transform` 只更新 `idea_*` / `idea.*` 工具 description,原生 `edit` / `write` / `patch` / `shell` 的定义、描述和可用性均不变。

## 限制

- 仅支持 **OpenCode V2** 插件 API(`ctx.tool` / `ctx.mcp` / `ctx.shell` / `ctx.command` / `ctx.session` / `ctx.location`)。
- IDE MCP 注册需要 IDE **2026.2+** 的 Streamable HTTP 端点 `/stream`;更早版本只有 `/sse`,OpenCode V2 无法连接。
- 环境变量依赖 `execute_terminal_command` + Brave Mode;拿不到时环境为空。
- 探测只确认「MCP 服务是否在监听」,不校验「当前项目是否已在 IDE 打开」;MCP 关闭时会用一次短探测并立即给出设置提示。
- 打开 IDE 仅实现 macOS(`open -a`);首次打开若弹 Trust 对话框,需确认后重试。
- IDE MCP 没有「打开项目」工具,因此打开动作走 OS/CLI,而非 MCP。
- 插件热重载会断开 IDE 连接,需重跑 `/open-in-idea`。
- 插件只修改 IDEA MCP 工具 description,不修改原生工具定义、描述或可用性;默认调用方式为直接 `idea_*` 工具调用。

## 测试

```bash
npm test
```

使用 [Vitest](https://vitest.dev/),含纯函数测试、IDE 环境解析、环境合并、启动保护状态机、IDE 启动器、引导文本,以及「假 IDE MCP 服务」的端到端探测与插件集成测试。

## License

MIT
