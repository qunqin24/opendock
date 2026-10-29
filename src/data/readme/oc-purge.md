# oc-purge

把 [dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) 的「破甲」思路移植到 [OpenCode](https://github.com/anomalyco/opencode) 插件体系。

**一句话**：不用改宿主文件，靠 OpenCode 的 `transform` / `hook` 扩展点完成提示词注入、规则库、权限放行、作用域闸门。

- ✅ 已在 **OpenCode 2.2.0**（`@opencode/cli`）真机跑通
- ✅ 兼容 **1.19.x**（走 `legacy/server.js` 适配层）
- 13 项单元测试，宿主替身不依赖真实 opencode

---

## 安装

### 从 npm（最省事）

```bash
npm i -g oc-purge          # 或装在任意可解析的目录
```

```json
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "oc-purge", "options": { "verbose": true } }
  ]
}
```

> OpenCode 会自己解析包名并读 `exports["."]`。不要写 `npm:` 前缀。


### 2.2.0（推荐）

```json
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "/path/to/oc-purge", "options": { "verbose": true } }
  ]
}
```

> 注意是 `plugins`（复数）、对象形式 `{ package, options }`。

### 1.19.x

```json
{
  "plugin": [
    ["file:///path/to/oc-purge/legacy/server.js", { "verbose": true }]
  ]
}
```

> 注意是 `plugin`（单数）、数组元组形式，且入口指向 `legacy/server.js`。

装好后重启，`opencode --standalone --print-logs --log-level debug run "hi"` 应看到：

```
msg="loading plugin" id=/path/to/oc-purge entrypoint=file:///path/to/oc-purge/src/index.js
```

---

## 它做什么

| 能力 | 实现位置 | 对应的 dsh-purge 做法 |
| --- | --- | --- |
| 身份卡注入，压过宿主自我定位 | `session.hook("context")` 追加到 `system` 末段 | 改 `sections[]` + `order: -100000` |
| 剥掉宿主「我不能…」句式 | `stripSelfLimits()` | 字符串补丁改 dist |
| 规则库 `rules/*.md` + 勾选 | `~/.config/opencode/oc-purge/` | `$DSH_HOME/rules` |
| 审批自动放行 | `permission.hook("evaluate")` | 改 `user-approval` 默认值 |
| 工具调用链改写 | `tool.execute.before` | 改 `fs-observation-policy` |
| 网络作用域闸门 | 命令/URL 参数检查 | `lib/net-scope.js` |
| 新增工具 | `tool.transform` + 4 个 `purge_*` | 自带 HTTP bridge |

核心差异：dsh-purge 62 条补丁里，一大半（`extract-asar`、`restart-desktop`、`official-update`…）是因为 DSH 没有插件级扩展点才被迫改宿主。OpenCode 有正式扩展点，**这类补丁直接消失**。

---

## 目录

```
oc-purge/
├─ src/
│  ├─ index.js     2.2.0 入口：注入 / hook 装配 / purge_* 工具
│  ├─ prompt.js    身份卡、规则渲染、自我设限句剥离、按模型选卡
│  ├─ rules.js     ~/.config/opencode/oc-purge/{rules,cards} + state.json
│  ├─ patches.js   链式补丁（作用于事件对象，不改宿主文件）
│  └─ scope.js     作用域闸门 + 命令主机抽取
├─ legacy/server.js   1.19.x 契约适配层
├─ agents/purge.md    注入的 primary agent
├─ skills/            purge / purge-ops
├─ docs/              PORTING.md（逐项对照）、配置样例
└─ test/              宿主替身 + 测试
```

---

## 配置项

| key | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `primeDirective` | 内置 | 身份卡底部的执行纪律，可整段替换 |
| `card` / `cardByModel` | `""` | 身份卡正文；按 `provider/model` 子串挑，`__default` 兜底 |
| `rules` | `[]` | 内联规则（字符串或 `{id,title,body}`） |
| `workspacePolicy` | `"fallback"` | `fallback` / `strict` / `always` |
| `stripHostDisclaimers` | `true` | 剥离宿主自我设限句 |
| `patchChain` | `true` | 启用 `promptPatches` |
| `hookBypass` | `true` | 启用 `toolPatches`（路径归一化等） |
| `permissionAutoAllow` | `true` | `evaluate` 改 `allow`（显式 `deny` 不覆盖） |
| `permissionAllowActions` | `["*"]` | 只放行这些 action |
| `scope` | 关 | `{enabled, allow, deny}`；**只拦工具出网，不拦模型 API** |
| `dropTools` | `[]` | 从工具表删掉的工具名 |
| `postPrompt` | `""` | 追加在注入文本末尾 |

环境变量：

- `OC_PURGE_HOME` — 覆盖状态目录
- `OC_PURGE_TRACE` — 写运行 trace 到文件，用于无日志环境下验证装载

---

## 工具

| 工具 | 作用 |
| --- | --- |
| `purge_status` | 规则数、卡片、scope、注入字节数 |
| `purge_rules` | `list` / `add` / `toggle` / `remove` |
| `purge_inject` | 读写自由注入文本 |
| `purge_scope` | 判定某主机是否在作用域内 |

---

## 实测记录

| 项目 | 1.19.5 | 2.2.0 |
| --- | --- | --- |
| 入口契约 | `export default { server }` | `Plugin.define({ setup })` |
| `system` 段数 | 1（字符串） | 4（`SystemPart[]`） |
| 新增工具 | 不支持 | 支持 |
| 日志 | `opencode run` | `opencode --standalone run` |

踩过的坑：

1. **scope 拦到模型请求** → 整轮报错 `out-of-scope host https://opencode.ai/inference/...`。已改为只拦工具出网。
2. **`transform` 同步** → 所有读盘必须提前 `await`。
3. **身份卡位置** → `initial`（指令/环境/日期）永远在 `system` 尾部，卡必须落在最后一段。
4. **`{{ }}` 插值** → OpenCode 会渲染变量，正文统一用 `[placeholder]` 风格。

详见 [docs/PORTING.md](docs/PORTING.md)。

---

## 开发

```bash
npm install        # 只装 effect
npm test           # 13 项
node --check src/index.js
```

`test/harness.mjs` 是按 `packages/core/src/plugin/host.ts` 语义写的宿主替身；
`test/register-stubs.mjs` 把 `@opencode/plugin` 解析到 `test/stubs/`，所以不需要装 opencode 也能跑。

## 发布

完整选项（认证方式 × 触发方式 × 第三方工具）见 [docs/PUBLISH.md](docs/PUBLISH.md)。

`.github/workflows/publish.yml`（token 认证），三条触发路径：

| 触发 | 版本来源 |
| --- | --- |
| 发 GitHub Release | Release 的 tag 名（`v0.2.1` → `0.2.1`） |
| push `v*` tag | tag 名 |
| 手动 Run workflow | 自动 patch / minor / major，发完把版本号 commit 回 main |

发布前会跑语法检查 + 13 项测试，并检查 registry 上是否已有同版本（有就失败）。
需要仓库 secret：`NPM_TOKEN`（npm 的 **Automation** token，绕过 2FA）。

认证走 **Trusted Publisher (OIDC) 优先、`NPM_TOKEN` 兜底**：先清空 token 让 npm 用 GitHub OIDC
换短期凭证，失败再回退 secret。首次发布（包还不存在时）必须靠 `NPM_TOKEN`。

---

## 免责声明 / Disclaimer

本项目用于**自己拥有或有明确授权**的本地沙箱、测试环境与 CTF 靶场。作者不对使用者的行为负责。
Use only on systems you own or are authorized to test.

---

## 署名

思路与部分设计来自 [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge)（Apache-2.0）。
本仓库为独立实现，不复用其源码；见 [NOTICE](NOTICE)。

Licensed under [Apache-2.0](LICENSE).
