# @morning-start/dsh-magpie-creator

> Magpie 模式：在 DeepSeek Harness 里开发、调试、测试和发布 [magpie](https://usemagpie.ai) 插件。

DSH 的「创造模式」管的是 DSH 自己的插件。这个包管的是另一件事：**magpie 的插件**——供应商（OpenCode auth 插件）、网关中间件、路由策略、工具、页面、Agent 插件、异步网关钩子。

装上它以后，新建任务时多一个 **Magpie** 模式，里面有：

- 7 个工具：`magpie_doctor`、`magpie_plugin_new`、`magpie_plugin_check`、`magpie_sandbox`、`magpie_templates`、`magpie_registry_entry`、`magpie_plugin_accept`；
- 9 个 skill：按「一类插件一个」拆开，模型只在需要时读；
- 7 套模板：每种插件一个可以直接跑的最小实现，带测试；
- 沙箱：一个不碰你自己 magpie 的独立 magpie。

## 为什么需要它

magpie 插件有三个陷阱，靠记忆和文档很难全部避开：

1. **七种插件跑在三个不同的地方**。供应商、工具、异步钩子在 Bun 宿主里（能联网、能等、能装依赖）；中间件、路由策略、Agent 插件跑在 magpie 进程内的 moejs 里（**一个文件，没有定时器，没有 `fetch`，没有 Node API**）；页面跑在沙盒 iframe 里（**连网络都碰不到**）。写错地方不会报错，只会「没反应」。
2. **magpie 把入口模块导出的每个函数都当插件调用**。一个 `export function signRequest()` 就会让整个包加载失败，而报错信息不会告诉你原因。
3. **正在开发的插件不该进你真正在用的 magpie**。你的 magpie 里有真实登录、真实供应商、真实用量。

这个包把这些都做成可执行的检查：`magpie_plugin_check` 把 moejs 的限制、页面沙盒的策略、导出规则、包名约定逐条查一遍；`magpie_sandbox` 给你一个独立的 magpie，`magpie plugin` 的输出就是「magpie 真正加载到了什么」。

## 安装

```sh
# 在 DSH 里
plugin_manager { action: "install_bundle", target: "<这个包的目录>" }
```

装上以后在 **设置 → 插件** 里能看到 **Magpie**，新建任务时可以选择它。

## 用法

```
> 帮我写一个 magpie 插件，接 Acme 的编程套餐，用 API key 登录，能看额度。

Magpie 模式会：
1. 跑 magpie_doctor 确认 magpie 在哪、网关在不在；
2. 定形态（供应商），一次问清包名、显示名、描述；
3. magpie_plugin_new 生成骨架，报告里 0 fail；
4. 填实现，bun test 全绿；
5. magpie_sandbox 建沙箱、装进去，magpie plugin 的输出证明它真的加载了；
6. 告诉你哪些没验（真实的厂商登录、页面长什么样）。
```

## 工具

| 工具 | 做什么 |
|---|---|
| `magpie_doctor` | 只读：magpie 在哪、版本、网关是否在跑、配置目录、Bun 宿主、已装插件 |
| `magpie_plugin_new` | 从模板生成插件包（7 种之一），确定性，自带一次检查 |
| `magpie_plugin_check` | 只读：按 magpie 的加载规则检查一个包；`load: true` 还会真的 import 它、用替身 client 调用它的插件函数 |
| `magpie_sandbox` | 独立 magpie：`create` / `install` / `list` / `login` / `test` / `status` / `command` / `remove` |
| `magpie_templates` | 列出模板，以及每种跑在哪个运行时 |
| `magpie_registry_entry` | 生成并校验 `registry.json` 条目（magpie 的插件页读的那份，一处类型不对就丢掉全部条目） |
| `magpie_plugin_accept` | 让 magpie 自己回答：沙箱里装上、读 `plugin --json`、看它会调用哪些钩子 |

### 包名约定：`@author/name`

所有插件包的包名都是 `@作者名/插件名`，例如 `@acme/calc`、`@morning-start/opencode-acme-auth`。

- **作用域是必填的**：`magpie_plugin_new` 拒绝裸包名（`calc`），`magpie_plugin_check` 报 `name-scope` fail。一个没有作用域的包名说不清是谁的，发出去之后又没法加作用域——那会让每一个 `magpie plugin add` 过时。
- **kind 不写在包名里**：magpie 从 `magpie` 字段和文件判断这个包是什么，所以 `@acme/toolkit` 可以是页面、`@acme/guard` 可以是中间件。
- 社区仓库 `magpie-community/plugins` 仍按 `<kind>-<name>` 命名（`tools-calc`、`middleware-reserve`），因为那份仓库按 kind 分组；那是**社区仓库**的规矩，不是所有包的规矩。

## 技能

| Skill | 什么时候用 |
|---|---|
| `magpie-plugin-new` | 「我想加点什么」→ 定形态、生成、验收 |
| `magpie-plugin-provider` | 供应商：登录方式、loader、模型、额度、续期、签到 |
| `magpie-plugin-gateway` | 中间件 / 路由策略 / 异步钩子：moejs 限制、钩子签名、超时 |
| `magpie-plugin-tools-agent` | 工具（MCP）与 Agent 插件 |
| `magpie-plugin-page` | 页面、面板、菜单项 |
| `magpie-plugin-sandbox` | 在沙箱里测，不碰用户的 magpie |
| `magpie-plugin-debug` | 装不上 / 不生效 / 登录失败 / 页白屏 |
| `magpie-plugin-release` | 发版、`magpie://` 链接、registry.json、GitHub 标签 |
| `npm-package-manager` | npm 账号侧：Trusted Publisher、token 与 OIDC、dist-tag、deprecate、404/403/ENEEDAUTH 反查 |

## 模板

`templates/<kind>/` 下是每种插件的最小实现，`magpie_plugin_new` 把 `{{packageName}}`、`{{id}}`、`{{short}}` 之类的占位符替换掉。

| 模板 | 运行时 | 自带测试 |
|---|---|---|
| `provider` | Bun | `index.test.mjs` |
| `middleware` | moejs | `cases.json` + 测试（社区仓库的 harness 也能跑） |
| `routing` | moejs | `strategies.json` + 测试 |
| `tools` | Bun | `index.test.mjs` |
| `page` | 沙盒 iframe | `page.test.mjs`（读取都声明了、不联网） |
| `agent` | moejs | `{{short}}.test.mjs` |
| `hooks` | Bun | `{{short}}.test.mjs` |

每个模板还带一份 `.github/workflows/publish.yml`：本地改 `package.json` 的 `version`，提交，打 `v<版本>` tag 推上去，GitHub Actions 会核对 tag 和版本号、跑 `bun test`、带 provenance 发到 npm，再开一个 GitHub Release。第一个版本要注意：trusted publishing 只对已经存在的包有效，所以要么本地手动发一次，要么给仓库加 `NPM_TOKEN` secret 让 Action 用 token 建包；之后 tag 就行。

## 命令

```sh
node scripts/doctor.mjs                     # 这台机器能不能写插件
node scripts/new-plugin.mjs --kind page --name @acme/notes --dir ./notes
node scripts/repo-handler.mjs ./notes          # 建仓库或更新已有仓库：公开、magpie-plugin topic、repository 指向
node scripts/check-plugin.mjs <包目录>       # 退出码 1 表示 magpie 会拒绝加载
node scripts/check-plugin.mjs <包目录> --load  # 再真的 import 它、调用它的插件函数
node scripts/check-registry.mjs <包目录>      # 生成并校验 registry.json 条目
node scripts/check-registry.mjs registry.json # 校验一整份列表
node scripts/sandbox.mjs create dev
node scripts/sandbox.mjs install dev ./my-plugin
node scripts/sandbox.mjs list dev
node scripts/try.mjs ./my-plugin            # 检查 + 沙箱 + 安装 + 列出加载结果
node scripts/accept-plugin.mjs ./my-plugin  # 沙箱里真装一次，读 magpie 说它加载到了什么
node scripts/check-privacy.mjs . --all      # 扫一遍：有没有把开发者自己的路径/邮箱/密钥带出去
node scripts/release.mjs ./my-plugin        # 发版前检查 + registry 条目 + 发布命令
```

## 能力范围（装之前先看）

这个包的检查报告里有一条 `security:capabilities` warn，内容是真的，不是误报：

| 能力 | 在哪 | 为什么 |
|---|---|---|
| 运行命令 | `lib/magpie.mjs` 起 magpie 进程 | `magpie_doctor`、`magpie_sandbox`、`scripts/*` 都要调 magpie 命令行 |
| 建仓库 | `lib/repo.mjs` 调 `gh` 和 `git` | `repo-handler` 建仓库或更新已有仓库：公开、`magpie-plugin` topic、`repository` 指向 |
| 读环境变量 | `lib/magpie.mjs`、`lib/doctor.mjs` | 找 `MAGPIE`、`PATH`、`XDG_*`、`HOME` |
| 写文件 | `lib/scaffold.mjs`、`lib/sandbox.mjs`、`lib/repo.mjs`、`tools/index.js` | 生成插件包、建沙箱目录、改 `package.json` 的 `repository` |
| 联网 | 只在 `templates/provider/` 的模板代码里 | 模板是给人看的示例，插件运行时不代发请求 |

它**不**做这些：不往用户的 magpie 里装东西（那是用户自己点「安装」或自己跑 `magpie plugin add`）、不登录、不改 profile 的 `package.json`、不发任何遥测。

（报告里把 `lib/check.mjs` 列进「运行命令」，是因为它用了 `RegExp.exec()`；这条具体归属是启发式的误判，整体结论仍然成立。）

## 这个包的结构

```
index.js              Host 行（今天只占位，注册任何东西都在 ctx.effect 里）
cordis.patch.yml      bundle patch：一个 Host 行 + 一个 magpie 预设
tools/index.js        7 个工具，只挂进 magpie 预设
lib/                  magpie 定位、包检查、加载检查、脚手架、沙箱、registry、doctor
skills/               9 个 skill，只在这个包的 provider 下可见
templates/            7 种插件的模板
scripts/              命令行入口，和工具共用 lib/
test/                 159 个测试
docs/                 更长的说明
```

预设是**新建**的，不覆写 DSH 自带的任何一个：标准、PTC、极简、创造模式都不受影响。`scripts/check-patch.mjs` 保证「从 DSH 复制过来的那一段」和 DSH 实际的一致，DSH 升级后能立刻发现漂移。

## 已验证什么

| 验了什么 | 怎么验的 | 结果 |
|---|---|---|
| 包装得上、组合得出来 | 沙箱里 `rehearse` | installed and composed |
| Magpie 模式注册了、是健康的 | 沙箱 `agentPresets/list` | `magpie`，没有 `broken` |
| 模式能选 | 沙箱里新建任务的模式选择器 | 列出「magpie 模式」 |
| 7 个工具都注册 | `test/tools.test.mjs` 对着 mock 上下文 | 19 个测试通过 |
| 7 套模板都检查干净 | `test/scaffold.test.mjs` | 7 种，0 fail 0 warn |
| 检查器和真包一致 | 跑社区仓库全部 65 个包 | 1 条，是真 bug |
| 加载检查不误报 | 同上，加 `--load` | 同样只有那 1 条 |
| registry 规则对得上 | 跑社区仓库真实的 `registry.json` | 0 问题 |
| 复制的那段和 DSH 一致 | `scripts/check-patch.mjs --upstream` | 32 行，完全一致 |
第一条路走错过一次，值得记下来：**预设挂上了不等于能用**。第一版工具插件没写 Cordis 的 `inject`，组合没问题、服务也起得来，但预设自检报 `cannot get property "tools" without inject`，于是 `agentPresets/list` 里这条带着 `broken`，模式选择器（只列健康预设）就静默不显示它。静态检查全绿，模式却「不存在」。修法是两个导出：

```js
export const name = 'magpie-tools'
export const inject = ['tools']
export function apply(ctx) { … }
```

## 已知限制

- 沙箱里没有模型凭据：页面要用户自己开 `magpie web` 看，真请求要用户自己加供应商；
- `magpie_plugin_check` 是静态检查，不能证明真实厂商的登录能走通；
- 桌面版的 DSH 装在 `app.asar` 里，`check-patch.mjs` 读不到它自带的预设，需要 `--upstream <文件>` 或 `DSH_WEB_APP_DIR`；
- 工具只在 magpie 预设里可见。要装进别的预设，改 `cordis.patch.yml` 里 `preset-magpie` 的 `plugins` 列表。

## 许可

MIT
