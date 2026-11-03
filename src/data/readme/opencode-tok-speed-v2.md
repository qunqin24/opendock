# opencode-tok-speed-v2

OpenCode **V2** TUI 插件：在输入框状态栏（`prompt.footer.status`）实时显示模型输出 token 速率和 TTFT。

```
42.3 tok/s · TTFT 1.6s
```

## 效果

| 场景 | 显示 |
| --- | --- |
| 刚提交，还没吐第一个 token | `0.0 tok/s · TTFT 1.2s`（TTFT 实时累加） |
| 正常输出 | `42.3 tok/s · TTFT 1.6s` |
| 工具调用间隙 / 思考停顿 | 回落到 `0.0 tok/s` |
| 回合结束 | 保留最后读数，速率归 `0.0` |

TTFT 会实时往上爬，所以能直观看到「这一轮卡了多久」——上下文变长后变慢，最先有反应的就是这个数字。

## 安装

```bash
opencode plugin add opencode-tok-speed-v2
```

或者手动放进全局插件目录（改完自动热加载，无需重启）：

```bash
git clone https://github.com/lcssos/opencode-tok-speed-v2 \
  ~/.config/opencode/plugins/opencode-tok-speed-v2
```

仅用于 TUI、不连远端 server 的场景，也可以写进 `~/.config/opencode/cli.json`：

```jsonc
{
  "plugins": ["opencode-tok-speed-v2"]
}
```

确认已加载：

```bash
opencode plugin list
```

## 开发与构建

入口 `tui.tsx` 是源码，**发布入口是预编译的 `tui.js`**。改完源码必须重新构建并提交产物：

```bash
npm install
npm run build     # tui.tsx → tui.js
```

`tui.js` 要一起提交，`publish.yml` 与 `release.sh` 都会校验两者同步，落后就中止发布。

### 为什么必须预编译

OpenCode 的 solid JSX 转译插件只处理 `node_modules` 之外的文件（`bun-plugin-solid` 的 onLoad filter 显式排除了 `node_modules`）。插件从 npm 装进来时入口就位于 `node_modules/opencode-tok-speed-v2/` 内，如果 `exports["./tui"]` 直接指向 `.tsx`，JSX 不会被转译，运行时会去解析 `@opentui/solid/jsx-dev-runtime` 并失败：

```
Cannot find package '@opentui/solid' imported from
  ~/.cache/opencode/npm/opencode-tok-speed-v2@latest/.../opencode-tok-speed-v2/tui.tsx
```

这个报错看起来像「少了 peer 依赖」，实际是「入口没被转译」。把 `.tsx` 编译成 `.js`（与宿主同样的 `babel-preset-solid` + `generate: "universal"`）后即可正常加载。

## 为什么不用内置的 `session.tps`

`cli.json` 里的 `session.tps: true` 只在**助手消息底部**显示这一轮的平均速率，不进状态栏。

本插件挂在 `prompt.footer.status` 子槽，位置由布局系统分配，不会像绝对定位那样压住别的元素。

与同类插件（如 `oc-tps`）相比，本插件重点在读数可信度：

| | 本插件 | 常见做法 |
| --- | --- | --- |
| token 估算 | 字符数 × 比例，每步用真实 tokens 校正（EMA） | 字节数 ÷ 固定值，永不校正 |
| 事件重复 | 按 `event.id` 去重 | 无去重，重放会翻倍 |
| 多代实例 | `globalThis` 单例，新实例接管旧实例 | 各自持有状态，重复计数 |
| 时间轴 | 一律用服务端 `event.created` | 混用本地钟，批量投递时速率虚高 |
| TTFT 起点 | `step.started.data.started`（按 step 精确计时） | 会话级起点，会把上一段时间算进去 |

## 数值口径

### 速率

```
(累计字符 × 每字符 token 比例) / (请求开始 → 最后一个 token)
```

- 生成中拿不到真实 token 数，只能按字符估算；比例初始 0.5（中文约 2 字符/token），每一步结束后用服务端返回的 `tokens.output + tokens.reasoning` 校正并做 EMA 平滑，所以会越用越准。
- 每步结束再用真实 tokens 把这步的数值校正一次，与内置 assistant footer 的 tok/s 基本一致。
- 口径含首 token 延迟（TTFT），所以和内置 footer 对得上。

### TTFT

```
首个流式 token 的时间 - session.step.started 的 data.started
```

起点用 `step.started.data.started` 而不是 `session.execution.started`：一次执行里可能有多个 step（中途调用工具），用 execution 起点会把上一个 step 的时间也算进来。

## 实现上踩过的坑

这四点如果不处理，读数会明显失真：

1. **TUI 会多次 `setup` 同一个插件**（多代实例共存，旧实例不清理）。每个实例都订阅事件会导致 token 双倍计数、标签重复出现。所以状态与订阅收敛到 `globalThis` 单例，新实例接管时先拆掉旧实例。
2. **事件流会重放**，同一个 `event.id` 可能投递多次，必须去重，否则 token 数翻倍。
3. **不能用本地 `Date.now()` 当速率时间轴**。服务端会把多个增量压在同一毫秒投递，本地时间还受 read 批次影响，跨度被压扁会让速率虚高好几倍。一律用 `event.created`（服务端时间）；只有「多久没收到 token」这种静默判断才用本地钟。
4. **累计均值比瞬时窗口可信**。真实事件节奏下，最近 N 秒的瞬时速率会在几十到几百之间来回跳，累计均值单调逼近最终值。

## 配置

都在 `tui.tsx` 顶部（改完记得 `npm run build`）：

| 常量 | 默认 | 说明 |
| --- | --- | --- |
| `SHOW_TTFT` | `true` | 设 `false` 退回纯 `x.x tok/s` |
| `MIN_TTFT_MS` | `200` | 低于此值不显示 TTFT（`started` 与首个 token 同毫秒时没信息量） |
| `IDLE_MS` | `1000` | 超过这么久没收到 token 就把速率归零 |
| `HIDE_WHEN_IDLE` | `false` | 改 `true` 则回合结束后整格消失 |
| `TICK_MS` | `500` | 刷新间隔 |
| `MIN_SPAN_MS` | `1200` | 数据不足时先不显示，避免闪出偏低的数 |
| `MIN_CHARS` | `40` | 同上，字符数门槛 |
| `DEFAULT_TOKENS_PER_CHAR` | `0.5` | token/字符初始比例，会按步自动校正 |

想把思考过程排除在速率外，删掉 `session.reasoning.delta` 那条订阅即可。

## 兼容性

在 OpenCode **v2.2.5** 上开发和验证。依赖 `@opencode/plugin/tui` 的 `context.data.on` 与 `context.ui.slot`，事件名取自 V2 schema：

`session.step.started` / `session.step.ended` / `session.step.failed` / `session.text.delta` / `session.reasoning.delta` / `session.idle`

## 发版

### 一键发版（推荐）

```bash
npm run release patch    # 0.1.0 → 0.1.1
npm run release minor    # → 0.2.0
npm run release major    # → 1.0.0
npm run release 1.2.3    # 指定版本号
```

脚本 `scripts/release.sh` 会依次：改版本号 → 提交 → 打 `vX.Y.Z` tag → 推送。

推送 tag 后由 GitHub Actions（`.github/workflows/publish.yml`）自动发布到 npm。

发布前会做四道检查，任何一道不满足都会直接退出：

| 检查 | 说明 |
| --- | --- |
| 工作区干净 | 有未提交改动就拒绝，避免把无关改动混进发布提交 |
| 当前在 `main` | 其他分支拒绝 |
| `tui.js` 与 `tui.tsx` 同步 | 落后会重新构建并把差异报出来，提示先提交 |
| 版本号格式 | 只接受 `patch` / `minor` / `major` 或 `X.Y.Z` |

CI 侧还会校验 tag 与 `package.json` 版本一致、npm 上该版本是否已存在、`tui.js` 与 `tui.tsx` 是否同步、入口有无残留 JSX。

查看发布进度：

```bash
gh run watch
```

### 首次配置：npm Trusted Publisher

CI 使用 **OIDC trusted publishing**，仓库里不保存任何 npm token。需要在 npm 网页上授权一次：

1. 打开 <https://www.npmjs.com/package/opencode-tok-speed-v2/access>
2. 找到 **Trusted Publisher** 区域，点击 **GitHub Actions**
3. 填写：

   | 字段 | 值 |
   | --- | --- |
   | Organization or user | `lcssos` |
   | Repository | `opencode-tok-speed-v2` |
   | Workflow filename | `publish.yml` |
   | Environment name | 留空 |
   | Allowed actions | 勾选 **Allow npm publish** |

4. 保存。

注意事项：

- 配置后必须在 **2 天内完成首次发布**，否则配置过期，需要删除重建。
- `package.json` 的 `repository.url` 必须与 GitHub 仓库完全一致（npm 会比对，不一致会拒发）。
- 发布成功后 npm 会自动为包生成 provenance 证明（来源：公开仓库 + OIDC）。

### 手动发布（备选）

没有配好 OIDC、或只想临时发一次时：

```bash
npm publish --access public
```

npm 现强制发布必须满足其一：

- 账号开启了 2FA，发布时输入 TOTP 6 位码；
- 使用勾选了 **Bypass two-factor authentication** 的 Granular Access Token。

Token 方式适合非交互环境，注意不要提交进仓库。

## License

MIT
