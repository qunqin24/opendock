<div align="center">

# opencode-prompt-optimization

**在 OpenCode Desktop 的 composer 里，把粗糙草稿原地扩展为结构化提示词。**

[![CI](https://github.com/rwjxrj/opencode-prompt-optimization/actions/workflows/ci.yml/badge.svg)](https://github.com/rwjxrj/opencode-prompt-optimization/actions/runs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
![OpenCode Desktop](https://img.shields.io/badge/OpenCode_Desktop-2.2.5-8b5cf6)

[English](../README.md) · [简体中文](README.zh-CN.md)

![opencode-prompt-optimization](../assets/featured.png)

</div>

在 **OpenCode Desktop** 的 composer 里，把粗糙草稿扩展成结构化提示词，并原地写回。

**状态：** 实验版，已发布到 npm：`opencode-prompt-optimization@0.2.0`，另有 [CHANGELOG.md](../CHANGELOG.md) 中 *Unreleased* 列的改动。OpenCode Desktop 的 GUI 插件 API 仍是 experimental，请锁定你测试的 OpenCode 版本。

## 适合谁

- 使用 OpenCode Desktop 的个人开发者
- 习惯用自然语言描述需求，但不想每次手写结构化提示词
- 希望结果留在 composer 里，自己检查、修改后再按 Enter

不适用于终端 TUI。插件不会自动发送消息，也不会写入会话历史。

## 截图

| composer（空闲） | composer（展开中） |
|---|---|
| ![发送按钮左侧的展开图标](../assets/screenshots/composer-idle.png) | ![模型工作时的渐变边框](../assets/screenshots/composer-loading.png) |

按钮在发送按钮左侧；上图的草稿就是下面「输出示例」里的那一句。

![提示词优化设置页](../assets/screenshots/settings-zh.png)

模型选择器可搜索供应商/模型，也可直接输入 `provider/model`：

![模型选择器](../assets/screenshots/settings-zh-picker.png)

## 功能

- 把模糊需求补成：目标、范围、约束、产出、验收方式
- 原地写回 composer，可继续编辑
- toast 提供「撤销」和「重生成」
- 最多保留 5 个版本，仅在当前窗口内存中
- 简洁模式（约 800 字符）和充分展开模式
- 界面提供英文与简体中文文案
- 可读取白名单内的项目信息：`package.json`、规则文件、git 状态
- 支持 `*gpt*` / `*claude*` 家族指令
- 可选「会话目录」：右侧面板列出你的消息，点击跳转到对应位置

## 要求

- OpenCode Desktop **2.2.5**（当前验证版本）
- Node.js **^20.19.0 或 >=22.12.0**（仅从源码构建时需要）
- 已在 OpenCode 中连接 provider/model

## 安装

把插件加入**全局** OpenCode 配置；Desktop 只从全局配置加载 GUI 插件：

- macOS / Linux：`~/.config/opencode/opencode.jsonc`
- Windows：`C:\Users\<you>\.config\opencode\opencode.jsonc`

### 从 npm 安装（推荐）

```bash
opencode plugin add opencode-prompt-optimization
```

要锁定版本，在后面追加版本号：`opencode plugin add opencode-prompt-optimization@0.2.0`。只写包名时停留在安装时的版本；`opencode plugin update` 会更新到最新版。

也可以手动配置：

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "opencode-prompt-optimization",
      "options": {
        "mode": "concise",
        "model": "auto",
        "projectContext": true,
        "timeoutMs": 30000
      }
    }
  ]
}
```

不需要 options 时，直接写包名即可：

```jsonc
{
  "plugins": ["opencode-prompt-optimization"]
}
```

### 直接用 npm 安装

`opencode plugin add` 内部会调用 npm。如果你想自己管理安装：

```bash
npm install opencode-prompt-optimization@0.2.0
```

然后用绝对路径把安装目录加入配置，因为 OpenCode 不会自动扫描 `node_modules`：

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/node_modules/opencode-prompt-optimization",
      "options": { "mode": "concise" }
    }
  ]
}
```

### 从源码构建

```bash
git clone https://github.com/rwjxrj/opencode-prompt-optimization.git
cd opencode-prompt-optimization
npm ci
```

`npm ci` 会通过 `prepare` 自动构建 `dist/`。

构建产物：

```text
dist/index.js              服务端
dist/rpc.js                RPC 契约
dist/gui-experimental.cjs  Desktop GUI bundle
```

把全局配置指向源码目录：

```jsonc
{
  "shell": "powershell",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-prompt-optimization",
      "options": {
        "mode": "concise",
        "model": "auto",
        "projectContext": true,
        "timeoutMs": 30000
      }
    }
  ]
}
```

Windows 路径示例：

```jsonc
"package": "D:/path/to/opencode-prompt-optimization"
```

### 重载并确认

重载 Desktop 窗口，或重启 OpenCode Desktop。GUI bundle 在窗口启动时加载，首次安装后只重载服务端不够。

- **Settings > Extensions > Plugins** 中会出现 `prompt-optimization`
- 命令面板有 **Expand prompt**
- composer 发送按钮左侧有展开图标，悬停显示 **Optimize prompt**

## 使用

1. 在 composer 写草稿，例如：`帮我做一个数据看板，包含筛选和导出`
2. 点击发送按钮左侧的图标，或在命令面板搜索 **Expand prompt**，或输入 `/expand <text>`
3. 等待模型返回期间工具栏图标会显示旋转的渐变光环，结果会写回 composer
4. 自己检查/修改，然后按 Enter 发送

**引用与命令**：`@文件` 引用、附件引用和开头的 `/命令` 在调用模型前会替换成 `[[ref1]]`、`[[ref2]]` 占位符，返回后原样还原，只改写你的正文。引用在句首、句中、句尾都一样处理，优化、撤销、切换版本后仍是可点击的 mention 芯片。同一条引用可以在改写结果里重复出现（指代同一个文件时），但每个引用必须至少保留一次、且不得出现新的编号，否则结果不会写回，并会弹出提示。

入口：

| 入口 | 方式 |
|---|---|
| composer 工具栏 | 点击发送按钮左侧的图标（悬停显示「提示词优化」） |
| 命令面板 | 搜索 `Expand prompt` |
| 斜杠 | `/expand <text>` |
| 重生成 | toast 按钮，或命令面板 **Regenerate prompt** |
| 撤销 | toast 按钮，或命令面板 **Restore original prompt** |
| 版本切换 | 命令面板 **Previous expanded version** / **Next expanded version** |
| 切换模式 | 命令面板 **Toggle expansion mode** |
| 会话目录 | 命令面板 **Toggle session outline**，或侧栏 `+` 菜单 |
| 设置 | 命令面板 **Prompt Optimization settings** |

没有默认快捷键。可在 **Settings > Shortcuts** 绑定：

```text
prompt-optimization.expand
prompt-optimization.regenerate
prompt-optimization.restore
prompt-optimization.previous
prompt-optimization.next
prompt-optimization.mode
prompt-optimization.outline
prompt-optimization.settings
```

## 输出示例

草稿，原样输入：

> 帮我做一个数据看板，包含筛选和导出

开启「项目感知」后，一次运行（简洁模式）的结果：

<details>
<summary>展开后的提示词</summary>

```markdown
## 目标
开发一个数据看板页面，支持对看板数据进行筛选和导出。

## 范围
- 做：数据看板的核心页面，含数据展示、筛选功能、导出功能。
- 不做：用户登录鉴权、后台管理、数据源搭建与数据库设计、移动端适配优化。

## 上下文
- 项目已依赖 @aliou/pi-guardrails、@oh-my-pi/pi-coding-agent、pi-hermes-memory，具体如何使用由实现方判断。
- 看板要展示的具体数据指标、数据来源、导出格式均未指定。
- 项目有 code-review-graph 知识图谱工具，探索代码时应优先使用图谱工具而非 Grep/Glob/Read。

## 要求
1. 看板需展示关键数据指标，具体指标以现有数据为准。
2. 提供筛选能力，至少支持按时间范围筛选，其他筛选维度可按数据特点扩展。
3. 筛选后看板中的所有图表和数据需同步更新。
4. 提供导出功能，将当前筛选结果下的看板数据导出为文件。
5. 界面简洁可用，筛选控件和导出按钮位置清晰。
6. 涉及不确定的第三方库 API 时，先查证官方文档，不确定处标注「未验证」。

## 产出
- 可运行的看板页面代码，含必要的组件划分。
- 附简短说明：如何启动、如何配置数据来源。
- 长度以覆盖上述功能为准，不强制页数。

## 验收
- 页面可正常打开并展示数据。
- 更改筛选条件后数据正确刷新。
- 导出的文件内容与当前筛选结果一致且可正常打开。
```

</details>

差别在于：草稿只说了一个功能，结果补上了目标、做与不做、项目里真实存在的事实（已有依赖、code-review-graph 的使用要求）、编号要求、产出物和可自行验证的验收项。`未验证` 是第 6 条要求起了作用——模型宁愿标注没查证的第三方 API，也不编造用法。

## 会话目录（实验）

默认关闭。先在 **Settings > Prompt Optimization** 中启用，然后运行 **切换会话目录**，或在右侧面板的 `+` 菜单里选择 **会话目录**。

- 按顺序列出当前会话里你发的消息，去掉 markdown 标记并编号
- 点击条目滚动到对应消息；阅读位置所在条目会高亮
- **加载更早** 通过官方消息存储拉取更早的分页
- **最新** 回到时间线底部

它依赖宿主的内部结构：时间线会输出 `data-message-id` 行和 `message-<id>` 锚点，但这两个都不是公开插件 API。找不到目标时插件会提示「消息尚未加载」，而不是猜测位置。OpenCode 升级后需要重新验证。

## 设置

打开 **Settings > Prompt Optimization**，或运行 **Prompt Optimization settings**。

| 设置 | 说明 |
|---|---|
| Mode | 简洁 / 充分展开 |
| Model | 通栏选择器：搜索已连接的供应商/模型，或直接输入 `provider/model` 使用 |
| Thinking | 扩展时的思考强度；留空跟随 composer |
| Project context | 是否读取项目信息 |
| Session outline | 实验性右侧消息目录，点击跳转 |
| Toolbar animation | 扩展草稿时播放图标动效（默认开启） |

模型选择器通过插件的 `catalog` RPC 读取供应商目录，GUI 只使用公开插件 API。留空时显示灰色占位并跟随 `opencode.jsonc`；`auto` 与 `composer` 是选择器里的预设胶囊。选择器工具条右侧的「思考强度」列出该模型的 variant（对应供应商的 `reasoningEffort`）：留空跟随 composer，选中值作为本次请求的 `variant`；触发框右侧显示当前取值（留空显示「跟随 composer」）。

设置通过 `Store.global` 保存。未设置或 Model 为 `auto` 时，回退到 `opencode.jsonc` 的 options；显式设置会覆盖。Home / draft 页面没有 composer 模型，因此这一回退尤其重要。

## 配置

选项通过插件入口的 `options` 传入：

| 键 | 默认值 | 说明 |
|---|---|---|
| `model` | `"auto"` | `auto`、`composer` 或 `"provider/model"` |
| `mode` | `"concise"` | `concise` / `full` |
| `maxRounds` | `5` | 每份草稿的总生成次数（含 v1） |
| `timeoutMs` | `30000` | 超时后中止，输入框保持不变 |
| `maxGrowth` | `5` | 输出超过 `原文 × maxGrowth` **且** 大于 2000 字符时拒绝 |
| `minChars` | `10` | 少于该长度直接跳过（按整份草稿计，含引用） |
| `maxPromptChars` | `6000` | 超过该长度直接跳过 |
| `skipPatterns` | 内置 | 正则字符串数组；会替换内置列表 |
| `projectContext` | `true` | 是否读取项目信息 |
| `projectContextBudget` | `2048` | 注入上下文的字符预算 |
| `draftFallback` | `true` | 是否启用 Home / 新会话草稿的 DOM 回退 |
| `prompts` | 内置 | glob → prompt 映射；包含 `*gpt*` 与 `*claude*` |

### 模型选择

- `composer` 使用 composer 当前选中的模型。
- `auto` 依次尝试 composer 模型、会话模型、服务器默认模型，最后回退到便宜的 chat 模型。
- 显式 `provider/model` 原样使用。
- 设置页选择器把 `provider/model`、`auto`、`composer` 或留空写回同一个字段。
- 选择器工具条右侧的「思考强度」列出该模型的 variants（来自其 `reasoningEffort` 设置）。留空跟随 composer，选中值作为请求的 `variant`；触发框显示当前取值。
- 如果 `auto` 回退到免费模型且该模型触发用量限制，请改为 `composer` 或显式付费模型。
- composer 模型会从 `{ providerID, modelID }` 映射到生成 API 的 `{ providerID, id }`。

### 项目感知

只读取以下来源：

- `package.json`（名称、描述、依赖名）
- `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`.cursorrules`、`.windsurfrules`、`CONVENTIONS.md`、`.github/copilot-instructions.md`
- 当前分支与被改动文件名（过滤 `node_modules/`）

目录优先取已挂载会话，其次取 Desktop 窗口给出的目录，最后取插件实例所在位置。结果按目录缓存 5 分钟，并受 `projectContextBudget` 限制。

## 常见问题

**会发送消息吗？**  
不会。插件只读写 composer，发送由你按 Enter 完成。

**支持 TUI 吗？**  
不支持，只支持 OpenCode Desktop。

**为什么按钮是插进 composer 而不是用官方插槽？**  
Desktop GUI API 没有 composer 工具栏插槽。插件在 composer DOM 里按 `[data-slot=composer-actions]` 内的 `[data-action=composer-submit]` 找到发送按钮，把图标按钮插到它左边，宿主重渲染后会重新挂载；宿主结构变化时按钮会暂时不显示。Home / draft 没有官方 composer API，读写草稿仍走 DOM 适配器，属于 best-effort。

**支持 `@` 文件引用吗？**  
支持。引用在调用模型前会被替换成占位符，返回后还原成真正的 mention 芯片（句首、句中、句尾都可以），只改写引用之外的正文。普通邮箱地址不会被误判。

**失败会改输入框吗？**  
不会。失败时原文不变，toast 会尽量显示服务端 code/message。

**会保存我的提示词吗？**  
不会。版本栈只在当前窗口内存中。

## 隐私

- 草稿只发送给你在 OpenCode 中连接的 provider
- 不经过维护者运营的代理
- 不读取 `.env`、`.pem`、`credentials*` 或源码文件
- 项目感知只读取白名单文件，并限制字符预算
- 无 telemetry

## 限制

- GUI 插件 API 仍是 experimental
- Home / draft 的 DOM 回退不是官方 API
- `setText()` 会把 `@` mention chip 压平成纯文本；因此插件直接改写 `[data-component="composer-editor"]` 以保留 mention 节点（每个 mention 芯片在优化、撤销和版本切换后都保留），找不到该编辑器时才回退 `setText`
- 思考强度选择器只在选定显式模型后出现：设置页在 settings 路由读不到 composer 的模型，因此 `auto` / `composer` / 留空一律表示「跟随 composer」
- 没有 TUI 实现
- 会话目录依赖未公开的 `data-message-id` / `message-<id>`；未渲染的消息会通过短暂滚动时间线来定位，比已加载历史更早的消息需要先「加载更早」
- 慢模型可能超过 `timeoutMs`

## 开发

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run smoke:gui
npm run verify       # typecheck + tests + build + GUI smoke
```

`src/index.ts` 是服务端，`src/gui.tsx` 是 Desktop GUI bundle，`src/rpc.ts` 是共享契约。

`scripts/smoke-gui.cjs` 用桩模块加载构建后的 GUI bundle，覆盖 expand、regenerate、undo、设置页、工具栏与样式注册、会话目录面板。

仓库包含 GitHub Actions 工作流：在 Windows 与 Ubuntu、Node 20.19 与 22.12 下执行 `npm ci`、`npm run verify`、`npm pack --dry-run`。

## License

MIT

本项目是 [opencode-prompt-expand](https://github.com/ConnorYyy/opencode-prompt-expand)（作者 ConnorYyy）的修改衍生版本，依 MIT License 使用，原始版权声明保留在 [LICENSE](../LICENSE) 中。
