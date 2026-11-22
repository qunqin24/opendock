# opencode-automation-manager

An experimental GUI plugin for **OpenCode Desktop 2.3.2+** that manages the built-in
automations the way ChatGPT's *Scheduled* page does: one list to review, create, edit,
pause/resume, run now, and inspect past runs.

界面为中文。

## 功能

| 能力 | 说明 |
|---|---|
| 列表 | 全局任务；状态徽章、下次运行倒计时、上次结果与输出、已运行次数；按状态筛选 + 搜索 |
| 新建 | 提示词或代码动作；触发方式：延迟 / 定时 / 间隔 / Cron；时区、结束时间、执行目录、模型与思考等级 |
| 编辑 | 官方 API 没有 update，保存 = 先建新任务再删旧任务（任务 ID 变化、运行计数清零，其余配置保留；暂停态保持暂停） |
| 暂停 / 恢复 / 删除 | 调用官方接口；删除只删任务，不删会话 |
| 立即运行 | 官方没有 run 接口，这里新建一条 `at: in 1 minute` 的一次性任务复用原动作与目标，触发后自动清理 |
| 运行记录 | 子代理任务读取 `ses_<任务ID>_<序号>` 运行会话；独立会话任务读取绑定会话里的运行轮次（提示词 + 回复）；可一键打开会话 |
| 多服务器 | 面板顶部切换本机或任意已在 **设置 → 服务器** 接入的远程 OpenCode；列表、新建、编辑、暂停、立即运行、运行记录全部落在所选服务器上，打开会话也会跳到对应服务器 |

## 多服务器

面板每次打开都默认落在**本机**（不记忆上次选择）。存在两台以上服务器时才显示选择器：

- 选项显示服务器名与主机；本机带「（本机）」后缀，未连接的标「· 未连接」，健康检查不通过标「· 版本不匹配」。
- 切换会清空当前列表与缓存并重新读取，不会把两台服务器的任务混在一起。
- 选远程时，表单里的模型、子代理、思考等级、目录建议都来自**那台机器**；执行目录是远程路径。
- 任务在远程执行，在本机关闭时也能照常触发（只要远程服务在跑）；相反，远程服务停止期间不会触发。
- 任务打开会话按钮通过 `ctx.tabs.open({ server, id })` 打开远程会话。

远程前提：那台机器同样需要 `experimental.automations: true`，且 OpenCode 版本与桌面端兼容（同属 2.3.2 一代；旧的 schedule 接口已删，不兼容）。若接口不存在，界面会直接提示去开这个开关，而不是抛原始 404。

## 安装

> npm 上目前是 **0.1.0**（单服务器）。本文档描述的 0.2.0 只存在于仓库源码，尚未发布到 npm；在那之前请用下面的「本地目录」方式。

```bash
opencode plugin add opencode-automation-manager
```

或手动在 `~/.config/opencode/opencode.json` 中声明：

```jsonc
{
  "plugins": ["opencode-automation-manager"],
  "experimental": { "automations": true }
}
```

本地开发可以直接指向目录（改完 `npm run build` 由宿主热重载）：

```jsonc
{
  "plugins": ["C:/path/to/automation-manager"]
}
```

放进全局插件目录则**不需要任何配置**，宿主会自动发现并加载：

```text
~/.config/opencode/plugins/automation-manager/
```

删掉该目录即停用；`dist/gui-experimental.cjs` 变化时宿主会自动重载 GUI。

## 入口

- 标题栏「自动任务」按钮
- 快捷键 `Ctrl+Alt+A`（命令 ID `opencode-automation-manager.open`）
- 设置页 → 自动任务
- 命令面板搜索「自动任务」

## 运行方式（每次新建会话 / 同一会话）

「执行目标」决定任务每次触发落在哪种会话上：

| 选项 | 服务端行为 | 运行身份 | 代价 |
|---|---|---|---|
| **每次新建会话**（`to.subagent`） | 每次触发新建 `ses_aut_<任务ID>_<序号>` 会话运行，上下文独立 | 只能是子代理：`to: {}` 与主 agent（如 `build`）都被服务端拒绝（`Agent build is primary-only`） | 每次重建上下文，前缀缓存命中少；会话数线性增长 |
| **固定会话**（`to.session`） | 提示词投进任务绑定的同一会话，历史累积 | 该会话自己的 agent，默认主 agent（`build`） | 上下文越来越长，迟早触发压缩；多次运行会互相影响 |

所以"每次干净上下文"和"用主 agent 跑"不能同时满足，这是接口约束，不是插件取舍。

代码动作不新建会话，直接在绑定会话里执行。编辑任务沿用原绑定会话，只有新建任务才建载体会话。

## 模型与思考等级

模型不是 automation 的字段，官方接口里它属于会话：

- **独立会话**任务：模型即该任务专用会话的模型，改模型等于切换这个会话。
- **子代理**任务：子代理会继承父会话（任务会话）的模型与思考等级；若该子代理在自身配置里固定了模型，以它的配置为准，表单会给出提示。
- **代码**动作以 Code Mode 运行，不调用模型。

思考等级即 API 里的 `variant`（`minimal` / `low` / `medium` / `high` / `xhigh` 等，取决于模型）。

## 前置条件

1. OpenCode Desktop 2.3.2+（GUI 插件是桌面端专属）
2. `experimental.automations: true`（本机与每台要管理的远程服务器都要开）
3. 任务在 OpenCode 后台服务运行时触发；应用退出则不会触发（远程任务只受远程服务是否运行影响）

## 开发

```bash
npm install
npm run build          # 生成 dist/gui-experimental.cjs
npm run dev            # vite build --watch，宿主监听并热重载 GUI
npm run typecheck
npm test               # 纯逻辑 + headless 渲染冒烟测试
```

服务端日志确认加载：`~/.local/share/opencode/log/opencode.log` 中
`msg="loading plugin" id=...automation-manager`。

## 已知限制

- GUI 插件 API 属 experimental，与 OpenCode Desktop 版本绑定（当前 `@opencode/*` 2.3.2）。
- 编辑即重建：任务 ID 变化、运行计数清零。官方将来提供 update 接口后可无缝替换。
- 立即运行有约 1 分钟延迟（复用原生 `at` 触发，不绕过调度语义）。
- 事件（`event`）触发的任务只支持暂停、立即运行、删除，暂不支持编辑。
- 每次新建任务会创建一个「自动任务：名称」的载体会话，这是任务的运行载体。
- 远程服务器必须先在 设置 → 服务器 中连接成功；只列在配置里但没通过认证的服务器会显示为「未连接」，无法管理。
- 远程任务的执行目录是远程机器的路径，本机的近期目录列表帮不上忙。

## License

MIT
