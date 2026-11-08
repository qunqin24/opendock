# NearToken in Magpie

把 [NearToken](https://neartoken.cc) 接进 [magpie](https://github.com/yetone/magpie) 的**单包插件**：侧边栏「插件」一组里多一个 NearToken 页面，负责登录绑定、余额与代金券、消耗看板和充值；模型与路由交回 magpie 自己的供应商页。

它不预装、不编进 magpie 的安装包，也不占用 magpie 的内置页面：`@fish-under-sea/magpie-neartoken` 就是一个可以单独下载、单独安装、单独卸载的包。**这个仓库只放插件本身**，不含 magpie 的源码、补丁或改动。

## 下载

当前版本：**1.1.4**。这是 NearToken 独立 npm 包的版本；magpie 定制宿主的对接要求见 [`docs/HOST-接口对接.md`](docs/HOST-接口对接.md)，宿主升级目标 **2.2.2** 属于另一仓库和发行物。

| 方式 | 命令 / 入口 |
| --- | --- |
| npm（推荐） | `magpie plugin add @fish-under-sea/magpie-neartoken` |
| GitHub 仓库 | `magpie plugin add github:Fish-under-sea/magpie-neartoken` |
| 离线包 | 在 [Releases](https://github.com/Fish-under-sea/magpie-neartoken/releases) 下载 `fish-under-sea-magpie-neartoken-1.1.4.tgz`，解包后把目录添进「插件」页 |

装完在 magpie 的「插件」页打开 NearToken。卸载就是删掉这个包，magpie 的其它部分不受影响。

## 它做什么

| 页面上的事 | 数据从哪来 |
| --- | --- |
| 连接 NearToken | 站点的设备授权（RFC 8628 形状）：页面显示确认码，你在站点自己的页面登录并批准 |
| 余额、已用、代金券 | 站点钱包端点，用连接签下来的密钥读 |
| 消耗看板（日 / 周 / 月） | 站点用量端点，按模型堆叠 |
| 充值 | 站点充值端点，支付页交给系统浏览器 |
| 模型目录 | 站点 `/api/pricing` |

**账号只有一个。** 不支持手动粘贴密钥，也不支持多账号：连接由页面发起，断开在页面点。

登录全在站点自己页面上完成——密码、GitHub、Discord、LinuxDo、OIDC、Telegram、微信、Passkey 都走站点原生流程；插件不收密码，也不存密码。

## 模型：每模型一行，按分组路由

包里的 `index.mjs` 同时提供 magpie 的 auth / provider 能力：

- 每个模型只输出一行，不再按「分组 × 模型」重复展开。
- 从模型可用且未禁用的分组中选择最低倍率，并通过 `x-neartoken-group` 传递路由标识。
- 页面点击模型卡片修改 `disabledModels`；供应商列表是否即时刷新还需宿主正确刷新插件 options 与模型目录。
- 左侧分组按钮仅筛选页面，不切换推理分组，也不直接禁用整组模型。
- 图标、模型输出类型和余额由插件相应能力提供；图片、视频等模型的最终展示以宿主分类为准。

目录来自站点公开的 `/api/pricing`。插件后台计划每 5 分钟拉取，页面每分钟重载本地快照；网络与运行时状态会影响更新，不承诺一分钟内取得最新站点数据。

## 三个视角

页面上方三个标签：

| 标签 | 内容 |
| --- | --- |
| 原本界面 | 账户、余额与代金券、消耗看板、充值和推荐计划 |
| 模型广场 | 分组、类型和供应商筛选；模型卡片启停；网格 / 列表切换 |
| 使用日志 | 这个窗口里每个模型花了多少、用了多少 token、占比多少，可按日 / 周 / 月切 |

## 页面怎么用

1. 装上包，侧边栏「插件」→「NearToken」。
2. 点「连接 NearToken」，页面给一个确认码。
3. 点「打开确认页」，用平时的方式登录站点，确认码一致后批准。
4. 批准后由宿主接入；余额、用量和充值依赖相应接口。接口暂不可用时可前往网页，不将缺失数据当作零。
5. 断开连接会撤销站点上这把密钥，并删掉 magpie 里这一条供应商。

## 页面调用（`magpie.calls`）

| 调用 | 作用 |
| --- | --- |
| `neartoken:state` | 连接状态、账户、代金券、未完成的授权、汇率、目录规模 |
| `neartoken:connect` | 发起一次设备授权（`affCode` 可选，站点侧的邀请码） |
| `neartoken:cancel` | 放弃进行中的授权 |
| `neartoken:open` | 用系统浏览器打开正在等的那页确认页 |
| `neartoken:disconnect` | 撤销密钥、删供应商、清本地数字 |
| `neartoken:refresh` | 立刻重读钱包与目录 |
| `neartoken:usage` | `{range: day\|week\|month}` 的用量窗口 |
| `neartoken:topup` | 不带 `amount` 读档位；带 `amount` 与 `paymentMethod` 下单并打开支付页 |

页面跑在 magpie 的沙箱帧里（`connect-src 'none'`），自己发不出网络请求，所以上面每一件事都经 `magpie.call` 由 magpie 本体代发。这几条调用属于宿主能力，由 magpie 侧提供；插件这边只负责声明它们，并按返回的数据画页面。

## 仓库结构

仓库根就是那个 npm 包（`package.json` 在根，`npm pack` 直接可用）：

```
/
├── package.json        插件清单：magpie.page / magpie.icon / magpie.calls
├── index.mjs           provider 插件：设备授权、模型目录、余额、分组路由
├── scripts/            stamp.mjs：把 package.json 版本写进 page/version.js
└── page/               页面本体：index.html · app.js · style.css · market.css
                        · pricing.js（目录快照）· star.png（侧边栏）· icon.png（包图标）
├── LICENSE
└── README.md
```

**三个图标各管一处，不要混用：**

| 文件 | 用在哪 | 清单字段 |
| --- | --- | --- |
| `page/icon.png` | 插件包图标、页面头部 mark、供应商卡图标 | `magpie.icon`（及 `index.mjs` 的 `auth.icon`） |
| `page/star.png` | **只有侧边栏**那个标签 | `magpie.page.icon` |
| `page/icon.svg` | 包内备用线稿，不参与清单 | — |

站点 logo 就是 `page/icon.png`，侧边栏要的是空心五角星，两者是分开的；改图标时别把 `magpie.icon` 一起改掉。

## 设计取舍

- **登录用设备授权，不收密码。** 站点自己的登录页负责认证与 2FA，插件只轮询结果。设备授权返回值作为请求凭据使用，具体可访问接口以站点鉴权规则为准。
- **模型选择不重做。** magpie 已经有供应商、模型、路由、失败切换这一整套；插件只把站点目录写进供应商，剩下的交回窗口。
- **展示价格有明确来源。** 模型广场使用公开计价规则、当前分组及币种设置；账户、钱包和看板数据由宿主返回。
- **读不到就说不知道。** 站点没有用量端点时页面写「站点未提供用量统计」，不画一张空图——空图会被读成「这段时间没有消耗」。

## 1.3.0 接上宿主的供应商自愈钩子 `neartoken:relist`

### 这次接了什么

magpie **2.3.2**（`v0.1.3240+fish.27`）新增了一条专用恢复钩子 `neartoken:relist`：宿主把「被 setAside 的供应商记录」放回并触发重列，用户不用再手动点「加回来」。**用户显式移除的不会恢复**，这点由宿主保证。

插件页在已连接时调一次；失败静默隔 3 秒再试一次，之后不再打扰（每会话最多两次）。老宿主没有这条通道，调用失败直接跳过，不影响其它功能。

```js
call('neartoken:relist')   // magpie.calls 里已声明
```

这条正好补上「插件重载窗口里 provider 被判成移除」之后的恢复路径——之前只能人工点「加回来」。

### `magpie.min` → 2.3.2

fish.27 起才有 `relist` 与五类分区。

### kind 核对：值仍是 `audio`，不是 `speech`

宿主文档把语音分区写作 `kind: speech`，那是**分区名**。代码里 `pluginKind` 认的字段值仍是：

```go
case "audio":  c.Serves = speechKindOf(m.ID)
case "embedding": c.Serves = embedKindOf(m.ID)
```

插件 1.1.8 起发的就是 `audio` / `embedding` / `image` / `video`，与 2.3.2 一致，不需要改。

### 一个实测发现：语音模型走不了标准音频端点

拿宿主凭据直接探测站点：

| 端点 | 结果 |
| --- | --- |
| `/v1/audio/speech`（带分组头） | **500** `convert_request_failed` / `not implemented` |
| `/v1/audio/transcriptions` | **503** `No available channel for model whisper-1` |
| `/v1/music/generations` | **404** `Invalid URL` |

站点自己声明的端点类型全集里也没有 `audio`：

```
anthropic, gemini, image-generation, openai, openai-response, openai-video
```

也就是说：NearToken 的 TTS / 转写 / 音乐模型在站点上只挂 `gemini` 与 `openai` 端点，`/audio/*` 这条路虽然路由存在，但没有渠道能接。所以：

- **分类照旧标 `audio`**（它们产出的确实是音频，分类语义没错）；
- 但 magpie 的 `generate_audio` 现在会在这条路上失败，需要宿主支持「gemini 原生 TTS」或站点开放 audio 渠道才能真正可用——这不在插件能改的范围。

音乐模型（`suno_*`）也走 `["openai"]` 端点，没有独立的 `/music/generations`，所以不涉及「独立 API 分流」那种情况。

## 1.2.0 修掉日志里模型名被硬裁

### 现象

日志表格的「模型」列，同一个模型有时完整、有时被切掉尾巴：

```
gpt-6.1-sol  high   ← 有思考强度，正常
gpt-6.1-sc          ← 没有思考强度，被裁
```

奇怪的是**没有思考强度反而更短**，却更早被裁。

### 根因：不是宽度不够，是胶囊不参与收缩

`.lg-pill` 的基础样式里有 `width: fit-content`。它在 flex 容器里会被当成内容宽度，**不参与收缩**，于是按完整模型名的宽度撑开，溢出 grid 列后被外层直接裁掉——因为溢出发生在胶囊之外，连 `text-overflow: ellipsis` 都没机会生效。

带思考强度的那行之所以正常，是因为多了一个兄弟元素，flex 反而进入了收缩路径。

### 改法

```css
/* 容器撑满整列，胶囊才有收缩空间 */
.logs .lg-model-inline { width: 100%; min-width: 0; }

/* 覆盖 .lg-pill 的 width: fit-content */
.logs .lg-model-pill { width: auto; flex: 0 1 auto; min-width: 0; overflow: hidden; }

/* 文字自己省略，图标不参与收缩 */
.logs .lg-model-pill > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.logs .lg-model-pill > svg, .logs .lg-model-pill > img, .logs .lg-model-pill > i { flex: none; }
```

同时把 9 列全部套上 `minmax(0, …)`：`fr` 的默认下限是内容最小宽度，`nowrap` 的内容会把列撑开、让整行溢出容器。套上之后列可以真正收缩，内部的 `overflow: hidden` 才会生效。

### 验证

无头 Chrome 实测（1700px 宽、2x 像素比）：

```
deepseek-flash  High     有强度
gpt-6.1-sol              无强度，现在完整显示
gemini-3.1-pro-preview  Low
grok-4.6-xhigh  High
```

第二行正是原本被截成 `gpt-6.1-sc` 的那个模型。

## 1.1.8 收紧模型分类，适配宿主 fish.25 的 kind 接入

宿主 `v0.1.3140+fish.25` 起会把插件声明的 `kind` 接进分类：

| 插件给的 `kind` | 宿主认成 | 落点 |
| --- | --- | --- |
| `image` | `Draws` | 供应商编辑器「图像模型」、设置 → 图像 |
| `video` | `Films` | 「视频模型」、设置里的视频行 |
| `audio` | `Serves = speech` | 「语音模型」、设置 → 语音模型 |
| `embedding` | `Serves = embedding` | 「向量模型」、设置 → 向量模型 |
| `chat` / 不给 | `Serves = ""` | 对话模型 |

插件侧的取值本来就是这五个，这次只**收紧判定**，不动取值。

### 语音：只看输出侧

以前把模型名、分组名、描述一起丢进正则，`gpt-4o-audio-preview` 这类「能听音频、输出仍是文本」的对话模型会被卷进语音分区。现在：

```js
// 端点类型或分组名说了算，模型名不参与
if (ends.some((e) => /^(audio|tts|asr|transcription|speech)$/i.test(e))) return 'audio'
if (/tts|asr|text-to-speech|speech|suno|语音|转文字/i.test(groups)) return 'audio'
```

### 向量：只认完整的 embedding 词

去掉裸 `embed` 匹配——`embedded-agent-v2`、`embed-sandbox` 这类不再误判。判据是 `embedding` / `jina-rerank` 端点、分组名含向量/embedding，或模型名含完整的 `embedding`。

### 不是改判，是收紧

用包内快照的 109 个真实模型逐一对比改动前后：

```
改前: audio=11  chat=70  embedding=3  image=20  video=5
改后: audio=11  chat=70  embedding=3  image=20  video=5
发生变化的模型 0 个
```

### 老宿主兼容

`kindOutput('audio')` 与 `kindOutput('embedding')` 仍带 `text: true`，所以在不认 `kind` 的老宿主上，这些模型至少还能当对话模型看到，不会被彻底丢掉。

### `magpie.min` 已抬到 2.3.1

宿主 2.3.1（`v0.1.3207+fish.26`）落地了 #42 的插件 kind 接入，`magpie.min` 相应从 `2.2.2` 抬到 `2.3.1`。

需要说明一点实测结论：**宿主当前的清单解析根本不读 `min` 这个字段**。`internal/plugin/page.go` 解 `magpie` 段时只认 `page` / `panels` / `actions` / `permissions` / `calls`，没有 `min`。所以它不影响装不装得上，作用只是把「最低需要 2.3.1」这件事写在清单里给人看。

真正决定行为的是宿主版本：2.3.1 起 `plugin.Model.Kind` 生效，老宿主上这些模型仍按对话模型显示（`kindOutput` 保留 `text: true` 就是为了这个）。

## 1.1.7 删掉自动检查更新与热重载

插件以前会每分钟向 npm registry 问一次最新版本，写进 `page/latest.js`，页面再比对并自动重载。这套东西有两个问题：

- **多余的网络请求**：插件运行时每隔一分钟打一次 `registry.npmjs.org`，与「少去打扰外部服务」的方向相反；
- **重复了宿主的职责**：magpie 自己就有插件更新检查（`plugin-updates.json`），版本号显示也由 `page/version.js` 提供，插件不需要再造一份。

现在删除：

| 位置 | 删掉的东西 |
| --- | --- |
| `index.mjs` | `stampLatest()`、`latestAskedAt`、两处调用（`usage` 与 `models` 钩子里） |
| `page/app.js` | 整块「检查更新」：`cmpVersion`、`loadLatest`、`autoHotReload`、`startHotReload` 及其调用 |
| `page/latest.js` | 整个文件 |
| `page/index.html` | `#update-note` 提示元素 |
| `page/style.css` | `.update-note` 三条样式 |

**保留**：头部版本号胶囊 `#version`、`page/version.js`（由 `scripts/stamp.mjs` 按 `package.json` 生成），以及 `boot()` 里填充版本号的逻辑。

### 注意

这条改动与「供应商偶发掉出」**无关**，不要混为一谈：掉出是宿主在插件重载窗口里把 provider 判成「用户已移除」，已开宿主 issue `FISH-DOCK-Plugins#41`（provider sticky）跟踪。

## 1.1.6 五分钟掉一次供应商的成因与防护

### 宿主那 5 分钟是怎么来的

宿主 `plugin_relist.go`：

```go
relistEvery = time.Hour       // 正常每小时重列
relistFirst = time.Minute     // 启动 1 分钟后首次
relistSoon  = 5 * time.Minute // 有模型「离开列表」时，5 分钟后立刻再列一次
```

`KeepPluginsListed` 每次重列都对比前后两份列表，只要有模型这次没出现，就调用 `dropGonePluginPicks` 把用户对这个模型的选择移出，并把下次重列提前到 5 分钟。所以「过几分钟掉一次」不是插件崩了，而是**某次重列给出的模型表比上次少**。

### 插件为什么会给少

`catalog()` 有三级兜底：站点实时表 → 包内快照 → 空。包内快照是打包那一刻的站点状态，站点后来新增的模型它没有。只要某次走到快照，列表就比上次少，宿主立刻按「模型下架」处理。

### 1.1.6 的两道防护

**防护 1：列表单调不减**

```js
mergeModelsWithLastGood(table, lastGood)
```

保留上一次「站点实时」拿到的表，本次缺哪个就补哪个。站点偶发少给几个模型时，用户的选择不会被误删。

**防护 2：非实时数据打标记**

本次数据不是站点实时（用了包内快照或彻底失败）时，在返回表上写：

```js
safe[Symbol.for('magpie.fellBack')] = true
```

宿主 `host.js` 认这个标记，而 Go 侧 `pluginListedIDs` 与 `keptListed` 都会跳过 `FellBack` 的 provider——**打了标记的列表不参与「谁不见了」的判断**，也就不会丢 pick。

已核实本机安装的 magpie.exe（61 MB）内含 `magpie.fellBack`、`pluginListedIDs`、`KeepPluginsListed`、`left its plugin's list`，宿主确实支持这条通道。

### 验证

- 单元测试 87 项全部通过，新增 `tests/relist-guard.test.mjs`：站点少给模型时必须补齐、站点多给模型时不受影响、首列来自包内快照时必须打标记、`models()` 永不抛异常。
- `page/health.js` 现在记录 `source`（live / snapshot / empty）与 `restored`（本次补回几个），方便实机核对。

## 1.1.5 日志靠重建模型表拿凭据 · 类型与计费详情按站点真实数据

### 日志凭据

宿主调插件的 `models` 钩子时会带第二个参数 `{ auth, signal }`，`auth` 是 `plugin-auth.json` 里该账号凭据的副本。**重列模型这个动作本身就会把令牌送到插件手上**——启动首列、每小时重列、手动「获取模型」都算。

插件在 `models(_given, ctx)` 里收下 `ctx.auth.access` 并立即抓一次逐条日志，不再依赖 reconnect，也不再依赖宿主调 `auth.usage`。

### 类型按站点真实值映射

实测 `/api/log/token` 的 `type` 是数字（当前账号全是 `2`），不是字符串。现在按站点编码映射：`1 充值 / 2 消费 / 3 管理 / 4 系统 / 5 错误 / 6 退款`，未知值原样回显。

### 详情列还原真实单价

之前把 `model_ratio` 当成了「元/百万 token」，这是错的。真实还原有两条路：

**表达式计费**——解码 `expr_b64`，取该档位里 `p` 与 `c` 的系数：

| 模型 | 实测显示 | 官网显示 |
| --- | --- | --- |
| gpt-6.1-sol | `0_272k · ¥2 / ¥10/M` | 一致 |
| gpt-6-astra | `0_272k · ¥10 / ¥50/M` | 一致 |

**倍率计费**——输入 `model_ratio × 2`、输出 `model_ratio × completion_ratio × 2`：

| 模型 | 字段 | 实测显示 | 官网显示 |
| --- | --- | --- | --- |
| gpt-6.1-terra | `0.5` / `5` | `标准 · ¥1 / ¥5/M` | 一致 |

时段档位显示中文：`off_peak` → 谷时、`peak` → 峰时；`0_272k` 这类长度分层保留站点原写法。缓存读写系数是 `cr` / `cc`，变量名同样含字母 `c`，正则加了 `(?<![a-z])` 负向断言。

### 页面

- 列序：`时间（含消耗 + 令牌）→ 分组 → 模型 → 费用 → 请求体大小 → 流 → Token → 耗时 → 详情`；
- 耗时竖条按秒数分档：**< 5s 绿 / 5–15s 橙黄 / ≥ 15s 红**；
- 模型胶囊改为液态玻璃；代金券去掉左侧竖条与虚线票根，并修掉组名重复。

## 1.1.4 日志凭据改由宿主重列送来 · 空态说人话

1.1.3 只从 `auth.usage` / `auth.loader` 取令牌，实测这两条在普通使用路径上都不会跑（`logs-meta` 长期 `no-auth`）。

真正的通道在宿主 `host.js:2060`：

```js
ph.models(given, { auth: authCopy(k), signal })
```

**宿主每次列举模型（启动首列、每小时重列、手动「获取模型」）都会把凭据副本一起递进来。** 插件的 `models(_given, ctx)` 现在先收下 `ctx.auth.access`，再抓一次逐条日志——所以「刷新模型」这个动作本身就足以补齐日志，不需要 reconnect，也不需要宿主另开通道。

同时把日志空态从「读取失败」改成说清差哪一步，并给出可执行动作。
## 1.1.3 页面刷新不再每分钟敲一次宿主 · 日志凭据自备

### 「页面隔一会刷新一下」的真身

`tick()` 以前每 60 秒调一次 `load()`，而 `load()` 第一行就是 `neartoken:state`。宿主的 `state()` 第一行又是 `settle()`——命中时 `handOver()` → `dropHostProvider()` 会删掉宿主侧的 provider 条目。

也就是说：**插件页每开一分钟，就给宿主一次删 provider 的机会**。这正是「隔一会刷新一下」「供应商反复掉出」能被连起来的那条链。

现在：

- 每 60 秒只刷用量（`neartoken:usage`），**不再碰 state**；
- `neartoken:state` 降到启动时 + 显式动作 + 每 10 分钟一次；
- 页面从后台切回来时同样只刷用量，只有超过 10 分钟才重新问 state。

### 日志为什么一直空

`page/logs-meta.js` 实测给出 `stage: "no-auth"`：宿主从来没有把凭据递进来。宿主的 `state()` 只回 `configured` 与令牌名，不回令牌本身；逐条日志要 `getAuth`，而它只在「宿主要余额」或「发请求」时才有。

现在连接成功那一刻就把令牌留在进程内（只放内存、不落盘），并立即抓一次日志；`fetchLogs` 的钥匙来源改为「宿主递的 → 连接时的 → 都没有才报 no-auth」。页面空态也会直接写清「重新连接一次即可补齐」。

### 验证

- 单元测试 68 项全绿。
- 包内 35 个文件；`logs.js` / `logs-meta.js` / `health.js` 均为占位。
## 1.1.2 单一真相：停用只由宿主过滤 · 清掉旧 options

这一版把「谁来决定模型出现」收敛成一个答案。

### 之前为什么会互相打架

停用状态曾经有**两份**：宿主 `pluginCatalog` 按 `neartoken-prefs.json` 剔一次，插件 `provider.models()` 又按 `page/prefs.json` 剔一次。两边不同步时：

- 宿主剔光、插件还留着 → 供应商「有卡片、无模型」；
- 插件剔光、宿主不知道 → 空表 → 供应商掉出。

### 现在

- `provider.models()` **一律返回站点全量**，不再读任何偏好文件；停用完全交给宿主 `modelFilter`。
- 插件彻底不再读插件 options（`disabledModels` / `disabledGroups` / `enabledByGroup` / `disabledByGroup`），页面启动也不再 `bridge.options.get()`。旧版写进宿主 `plugins.json` 的那几个键变成纯历史，插件侧不再受其影响。
- 其中 `options.disabledGroups` 是隐患：它曾能**静默过滤整组模型**，是「模型数忽多忽少」的现成来源，现已移除。
- `page/logs-meta.js` 暴露逐条日志抓取阶段（`no-auth` / `no-key` / `no-list` / `ok` / `error`），页面据此说清「为什么没有日志」。

### 同时提交给宿主的两条 issue

- [FISH-DOCK-Plugins#36](https://github.com/Fish-under-sea/FISH-DOCK-Plugins/issues/36)：重列钩子（`neartoken:refresh` 顺带 `plugin.Providers`）、`handOver` 删除防抖、`PrefModel.Groups` 参与隐藏判定、旧 options 迁移清理。
- [FISH-DOCK-Plugins#37](https://github.com/Fish-under-sea/FISH-DOCK-Plugins/issues/37)：逐条日志数据来源（`/api/dsh/device/usage` 无 rows，`/api/log/token` 有）+ 宿主日志落盘位置。

### 已知边界

- 宿主没有 `neartoken:prefs` 时，停用只在本页生效，不会影响 magpie 的模型列表。
- 分组粒度的明细只能存本页（`localStorage`）；宿主只表达「整模型停用」。

## 1.1.1 供应商掉出的根因修掉 · 并入 1.0.1 / 1.0.2

### 掉出的根因（实测，不是推断）

宿主真实数据根 `…\credentials\magpie-runtime\data` 里的实测数字：

| 项 | 实测 |
| --- | --- |
| `neartoken-prefs.json` 停用条目 | **109**（带分组 109） |
| 站点目录模型数 | 109 |
| 停用后仍启用 | **0**（覆盖率 100%） |
| `plugin-providers.json` 的 neartoken 条目 | 存在，`models=109` |

宿主 `pluginCatalog` 会调 `modelFilter("neartoken")` → `LoadPrefs().ModelIDs()`，把 `disabled` 里的模型**整个**从清单剔除；109 个全在名单里，过滤后就是空表，供应商于是表现为「掉出」。

**语义错配**才是病根：页面的启停是**分组级**（模型在哪些组关掉），而宿主的模型清单**没有分组这一维**——`disabled` 里出现一个模型就等于整模型下线。于是：

- 在 A 组关掉某模型 → 它在 B 组也被隐藏；
- 「全不选」把所有模型的**所有分组**一起写进 `disabled` → 宿主拿到空表 → 供应商掉出。

### 本版修法

- **只把「所有分组都停用」的模型交给宿主**：还有任意一组开着就不写，分组明细只存本机（`localStorage`）。宿主隐藏 = 模型真的全关，不再因为一组关掉就整模型消失。
- **「全不选」只作用于当前视图分组**（选定分组就是它，否则是每个模型最便宜那组），不再把每个模型的所有分组一起关。这条正是 `109 × 全组` 的写入源头。
- **读回时区分两种记录**：宿主 `disabled` 里的模型按「整模型停用」展开成该模型所有分组停用（`hostOff`），本机存储保留分组粒度。
- **点开模型即解除宿主整模型停用**：`toggleModel` 与「全选」会清掉 `hostOff`，宿主侧随之放开。

### 并入 1.0.1

- 日志窗口没有逐条记录时显示「这个窗口没有逐条记录。」，不再回落到聚合视图。
- Token 列补**缓存副值**（`缓存 27,520`）。
- 流列区分**流式 / 非流式**（`非流` 用灰色，对应 `.lg-flow.off`）。
- 补 `magpie.min = "2.2.2"`。

### 并入 1.0.2

`provider.models()` 绝不向宿主返回空表或抛异常（三层兜底），已在 1.1.0 带入，本版继续保留。

### 已经装了旧版的人怎么回到正常

旧数据里 109 个模型可能都还挂在宿主清单上。在模型广场点一次「全选」即可：它会清掉宿主侧的整模型停用，供应商随即回来；之后按新的分组语义操作不会再触发掉出。

## 1.1.0 回到 1.0.0 基线 · 对齐宿主 prefs 协议

本版**以 `1.0.0` 为基线**重做，`1.0.1`–`1.0.3` 的页面增量（模型表诊断行、日志空态文案）不包含在内。这样处理是为了先把「供应商反复掉出」这件事查清楚，而不是继续在会掉出的版本上叠功能。

保留的 1.0.3 修复（`index.mjs`，与掉出直接相关，已实测）：

- **币种换算不再回退 `per:1`**：`/api/status` 读不到时沿用上一次成功的值，从没成功过才用站点约定默认 `1 美元 = 500000 额度`。旧的回退会把 quota 原值直接当金额显示，余额放大 50 万倍。
- **模型表三层兜底**：`catalog()` 内部异常或返回空表时，先用包内快照重建、再忽略页面偏好重建，`provider.models()` 外层再挡一次异常，**绝不向宿主抛 rejected Promise 或返回空表**——宿主拿不到模型表就会判定「这个供应商没有模型」，也就是掉出。
- **`config` 不再声明 `models`**：空对象会被宿主理解成「声明了 0 个模型」，模型表统一由 `provider.models()` 提供。

本版新增（对齐宿主）：

- **`neartoken:prefs` 调用**：页面读写启用状态改用宿主协议 `{op:"get"}` / `{op:"set", disabled:[{model, groups}]}`，落宿主的 `neartoken-prefs.json`，**不经插件 options**，所以写偏好不会重建插件宿主、也不会让供应商掉出。旧版本页面写的是 `{get:true}` / `{set:{…}}`，宿主不认。
- **`magpie.calls` 补 `neartoken:prefs`**：宿主只保留插件在 `package.json` 里声明过的调用，1.0.0 缺这一条，宿主即使实现了也会被丢掉。

配套文档（不进 npm 包）：

- [`docs/HOST-接口对接.md`](docs/HOST-接口对接.md)：宿主需实现的接口全集，逐条标注宿主实现状态与插件依赖。
- [`docs/DEPRECATED-废弃接口与字段.md`](docs/DEPRECATED-废弃接口与字段.md)：不再作为对接依据的 10 项接口、字段与文件，带代码位置与清理条件。

已知边界：宿主镜像的 `page/prefs.json` 是 JSON，页面沙箱读不到，页面以 `neartoken:prefs {op:"get"}` 为准；插件侧 `readPrefs()` 与宿主 `pluginCatalog` 的过滤重复，列入废弃项。

## 1.0.0 首个正式版

功能与 0.7.0 一致，里程碑意义在于：核心能力已经稳定并各自有实测依据。

- **供应商与模型**：每模型一行、按分组路由、请求自补 `x-neartoken-group`，供应商不再掉出。
- **模型广场**：表格列表（模型/类型/价格/缓存/供应商/端点/分组）、价格两位小数约分、端点与分组单行 `+N` 截断、供应商两列与固定优先级、状态胶囊、列切换。
- **使用日志**：宿主代取站点逐条流水写 `page/logs.js`，费用按真实 `quota_per_unit` 换算，吞吐按「输出 /(总时长 − 首字)」，时间补零，最新在最上，映射浮层。
- **账户页**：余额、代金券（总额 + 分组徽标）、充值档位、邀请计划。
- **页面与宿主**：`config` 声明显示名 `@NearToken`、自动热重载、全站胶囊化。

README 补了上游署名：magpie（yetone）、OpenCode（SST）、new-api（Calcium-Ion）、Vercel AI SDK 与 NearToken 站方。

## 0.7.0 日志数据修正（吞吐 · 排序 · 时间 · 字段解包）

这一版集中修正日志数据的正确性，字段都按站点真实响应校准：

- **吞吐 tps 公式修正**：改为 `输出 token / (总时长 − 首字耗时)`。之前用总时长做分母，导致 144 t/s 被算成 16 t/s。已用上游 4 条真实数据反推验证，3 条精确命中，第 4 条差异来自站点 `use_time` 只保留一位小数。
- **排序修正**：去掉原来的 `.reverse()`（它假设接口返回旧→新），改为按时间戳显式降序，**最新一条在最上面**。
- **时间格式补零**：`toLocaleString('zh-CN')` 给的是 `2026-11-6 6:04:04`，改为手动补零，输出 `2026-11-06 06:04:04`。
- **首字耗时单位自适应**：`other.frt` 多数部署是毫秒、个别是秒；改为按数值判断（> 30 视为毫秒），避免 7 ms 被当成 7 秒。
- **模型字段解包**：站点有时把 `response_model` 等给成对象，直接渲染会显示 `[object Object]`；新增 `pickModel`，字符串直接用、对象取 `name`/`id`。
- **字段兜底**：`prompt/completion/use_time/quota` 增加 `other.*` 二级兜底，避免某部署写法不同导致整列为空。

## 0.6.19 插件显示名 · 真实逐条日志 · 费用精确

插件身份：

- 新增 `config` 钩子声明 provider 显示名，列表里显示 `@NearToken`，点进详情显示 npm 包名 `@fish-under-sea/magpie-neartoken`。

使用日志（关键：不再只有 1 条聚合）：

- **宿主代取站点逐条流水**：新增 `fetchLogs()`，用插件钥匙请求 `/api/log/token`（失败兜底 `/api/log/self`），归一化后写入 `page/logs.js`，随目录同步每 5 分钟一次；页面加载该脚本并**优先使用它的 `rows`**，宿主 `neartoken:usage` 的 `rows` 作为次选。
- **费用精确**：不再写死 500000，改为从 `/api/status` 读取真实 `quota_per_unit`（实测该站 500000），费用 = `quota / quota_per_unit`，显示到 6 位小数。
- **分组倍率**：从快照 `groups` 取倍率并跟在分组徽标后（如 `低价 DeepSeek x0.4`）。
- **令牌胶囊可点击复制**，复制结果用页面顶部 toast 提示（2 秒淡出），按钮本身不再叠加对勾徽标。
- **模型映射浮层**：点模型名或右侧连线图标即可展开「请求模型 / 上游请求模型 / 响应模型」；修正 `overflow: hidden` 导致的裁剪，浮层真正浮在内容之上且不撑高行高。
- **费用胶囊**：逐条行的费用改为胶囊并与首行同一基线（实测与 Token 列中线一致）。
- **耗时单位**：`首字 / 耗时` 补上 `s`。
- 令牌图标换成站点那种「圆形钥匙头 + 短柄」。

## 0.6.18 模型广场表格列表 · 全站胶囊化 · 代金券与充值区对齐

模型广场：

- 列表模式改为原站那种**表格**：模型 / 类型 / 价格（输入·输出 + CNY / 1M Token，两位小数约分）/ 缓存 / 供应商 / 端点 / 分组（+N）；删除「标签」列；整行可点切换启用。
- 端点单行不换行、超长省略，多出的收进 `+N`。
- 分组单元格按原站 `OverflowList` 语义：胶囊保持完整自然宽度，容器裁边，`+N` 固定不裁。
- 供应商默认展开并改为**横向两列**（实测 174px 宽、17 个供应商、0 溢出，窄于 360px 自动单列）；按指定优先级排序：OpenAI → Anthropic → Google → xAI → Moonshot → 智谱 → 阿里 → DeepSeek → 腾讯 → MiniMax → 小米 → 字节 → 其余按名称。
- 定价类型 / 端点类型默认展开；折叠标题不再有整行高光。
- 卡片「已启用 / 未启用」改为带圆点的状态胶囊（绿点/红点）；复制按钮换成双框 SVG，点击叠加对勾徽标不再清空图标。
- 筛选卡：标题 + 说明 + 右上角带回转图标的重置；有筛选时显示「筛选已启用」胶囊。
- 侧栏滚动条默认隐藏、滚动时出现，并挪到左侧。

使用日志（在 0.6.17 基础上）：

- 行内垂直居中（单行值与两行块中心同一水平线），行高收到 50px；空值用 CSS 横线，与数字墨迹中心误差 0.25px。
- 刷新图标换成双箭头 SVG，拉取时旋转；只刷新当前区间。
- 表格底部新增分页（总计 / 每页行数 10–100 / 前后翻页 / 页码），整块日志包在一个大容器里。
- 模型列加映射按钮（请求模型 / 上游请求模型 / 响应模型）；流列改为蓝色「流」+ 灰色 t/s。

账户页：

- 标签栏胶囊化，「原本界面」改为「账户总览」。
- 推荐计划图标换成分享图标（圆形底）。
- 代金券新增**总额**行，券名用分组徽标 + 组名渲染，每条券胶囊化。
- 充值区：自定义金额 / 待支付金额 / 兑换码输入统一 36px 胶囊；「订单历史」改为按钮，去支付不可用时缩 2px、可用时等高。
- 「节省 N」用绿色并与金额同基线。

## 0.6.17 使用日志对齐原站 · 页头整理

使用日志按原站 `/usage-logs/common` 对齐（在 0.6.13 基础上继续）：

- 筛选全部胶囊化；分组 / 所有类型 / 查看改用自定义下拉（深色浮层、当前项 ✓、`管理`/`登录` 带「已弃用」徽标），靠右菜单向左展开避免裁切。
- 「展开」改为展开第二行筛选（令牌名称 / 请求 ID / 上游请求 ID），按钮在「展开 ▾ / 收起 ▴」间切换。
- 动作区：`10s`（5/10/30/60s 间隔菜单）、眼睛（睁眼/闭眼双态，隐藏敏感信息）、`搜索`（蓝色胶囊，点击脉冲并刷新）、`重置`、`查看`（切换列）；已删除「导出」。
- 表格：令牌列钥匙图标、模型列厂商品牌 logo、分组徽标、思考档；Token 千分位（逐条模式「输入 / 输出」）、费用胶囊、耗时绿条；列可切换隐藏。
- 控件统一 32px，箭头与文字垂直居中，动效尊重 `prefers-reduced-motion`。

页头：

- 删除「检查更新」；改为自动热重载（定时比对 `page/latest.js`，发现新版本带破缓存参数重载本页，同版本只重载一次）。
- 「断开连接」改为与「已连接」同款胶囊，红色底/边/字。

逐条流水与账号级分组筛选仍需宿主 `neartoken:usage` 提供 `rows`（见 FISH-DOCK-Plugins #33）。

## 0.6.13 使用日志按原站重做

- 结构对齐原站「通用日志」：标题、筛选条（时间范围 / 模型名称 / 分组 / 类型 / 展开）、统计条（用量 / RPM / TPM）与右侧动作（10s 刷新 / 显示切换 / 重置 / 搜索 / 导出 / 查看）。
- **时间范围可用了**：点范围框弹出面板，含「今天 / 近 7 天 / 近 30 天 / 近 90 天」快捷项与起止 `datetime-local`，应用后按区间切换站点用量粒度（日 / 周 / 月）并重新拉取。之前那种点了没反应的按钮一并换成真实交互。
- 明细表按原站列序（时间 / 令牌 / 模型 / 流 / Token / 请求体大小 / 费用 / 耗时 / 详情），窄屏自动隐藏后四列。

## 0.6.12 分组头必达 · 启停不再碰宿主 options

两个问题分别修：

**一、调用 503「No available channel for model … under group default」**

站点按 `x-neartoken-group` 选渠道；头没到站点就会回落 `default` 组，那边常常没有渠道，于是 503。以前把分组头挂在模型的 `headers` 上，宿主未必透传。现在 `auth.loader.fetch` 自己补：解析请求体里的 `model`，从目录里查到它实际走的分组 ref，直接写进请求头。模型自带的 `headers` 仍保留一份。

**二、改模型启用状态导致供应商掉出**

写 `options` 会让宿主重建插件宿主，这一步本身就可能把供应商判成「没有模型」，之前几版都在跟它赛跑（缓存、快照、超时），仍然会掉。本版直接不再写：页面启停状态改存 `localStorage`，provider 一律返回站点全量模型表，任何残留的 `disabledModels` / `enabledByGroup` / `disabledByGroup` 都不再参与过滤。

代价写清楚：**停用的模型仍会出现在 magpie 的模型列表里**，页面上的启用状态只决定本页的高亮与分组统计。这是用「少一个筛选能力」换「供应商不再掉出」。

## 0.6.11 改开关不再掉供应商

现象：在模型广场里改任意一个模型的启用状态，供应商那块就会掉。定位到冷启动这一步——写 options 后宿主会重建插件宿主，进程内的目录缓存随之清空，而首次列举模型还要等网络，宿主等不到就把供应商判成「没有模型」。

- 冷启动不再赌网络：直接读包内 `page/pricing.js` 快照返回（毫秒级），实时目录在后台拉取并替换缓存。
- 配合 0.6.9 已在做的两件事：作废旧 `disabledModels`、版本探测不阻塞列举。

现在改开关触发的重新列举是同步级的，供应商不会再因为等网络而消失。

## 0.6.10 模型字段补齐与 API 方言

按上游 `site/public/docs/plugins.html` 的 Model 契约逐项对齐：

- `id`：每行都带模型 id（宿主按 id 取、按 name 显示）。
- `limit: {context, output}`：来自站点 `context_window` / `max_tokens`，站点没给就是 0。
- `capabilities.input`：由站点 `input_modalities` 映射成 `{text, image, audio, video, pdf}`；默认 `text`。
- `capabilities.attachment`：有图片或 PDF 输入时为 true。
- `capabilities.reasoning` + `variants: {low, medium, high}`：仅对话模型，宿主据此给出「思考强度」。
- `api.npm`：按模型实际端点选方言——有 openai / openai-response / 图片 / 视频的用 `@ai-sdk/openai-compatible`，只挂 anthropic 的用 `@ai-sdk/anthropic`，只挂 gemini 的用 `@ai-sdk/google`。之前一律塞 openai-compatible，纯 anthropic 模型因此可能发错协议。

站点没有给出 USD 单价，所以 `cost`（含缓存读写）不填——留空是契约允许的，填错会让宿主显示假价格。

## 0.6.9 模型广场改版与供应商掉出修复

**这次掉出的真正原因找到了**：旧版本写入的 `options.disabledModels` 还留在宿主里（可能有一百多个模型名），provider 一直按它过滤，所以模型列表只剩那几个、「全选」也救不回来——因为全选只清新的分组表。本版启动时作废该字段，写回时把它清成空数组。

- 模型广场改版：筛选分节可折叠（分组 / 类型 / 供应商 / 定价类型 / 端点类型，展开状态会记住，收起带方向箭头与命中计数）；卡片换成上游定价页的层次——品牌图标头像、两行描述、按量/动态/按次徽标、带分隔线的价格行、端点小胶囊、状态条与详情入口。
- provider 取数改为「先给结果、后台刷新」：目录环境加 90 秒内存缓存，冷启动最多等 2.5 秒就退回包内快照；npm 版本探测不再阻塞模型列举。这样在模型广场里改一个开关，宿主重新列举时不会因为等网络而把供应商判成没模型。
- 对话模型补 `capabilities.reasoning` 与 `variants: {low, medium, high}`，宿主才会给出「思考强度」档位；图片 / 视频 / 语音 / 向量模型不声明该能力。

## 0.6.8 分组级启停修正与模型名裸显示

- 启停状态改为「只记停用例外」：`options.disabledByGroup` 只在某模型于某分组被停用时才写一条，默认全部分组启用。旧版把每个模型在哪些分组启用整张表写进 options，体积大且一旦主形态不符（缺记录 / 形状不对 / 写入失败）就会把模型整体判成停用——表现就是「重进页面已启用变停用」和「供应商模型表空掉、看起来掉出」。
- 读取侧同步容错：`disabledByGroup` 形状不合法一律当没有记录；旧的 `enabledByGroup` 仍兼容，但不合法时绝不把模型判成停用。写回时顺带清掉旧的大字段，避免宿主里留过期映射。
- magpie 原生模型选择列表只显示模型名，不再带「分组 + 倍率 · 名称」前缀；分组与倍率仍通过 `x-neartoken-group` 走路由，不丢信息。
- 插件页内的分组状态、说明横幅、定价 / 端点筛选、品牌图标与小标签配色保持 0.6.7 的行为。

## 0.6.7 分组状态、分组级启停与筛选补齐

- 分组侧栏：含启用模型的分组整块淡绿提亮，没有启用模型的一律灰化；熄灭态降透明并去色，避免彩色标签看着仍像启用。
- **启停按分组独立**：options 新增 `enabledByGroup`，记录「模型在哪些分组启用」。在某个分组里启停模型只影响该分组，同一模型在别的分组不受牵连；默认与「全选」按模型列出的所有分组点亮。
- 想用更贵分组（如官Key）时切到该分组再启用即可，该组会亮，provider 也随之改走这一组；不存在永远点不亮的项。
- 选中分组后，模型区顶部显示分组说明横幅：分组标签 + 倍率 + 站点 `usable_group` 原文；切回「所有分组」自动隐藏。
- 卡片在选定分组时只显示该组，未选定时显示首个分组并用 `+N` 折叠其余分组。
- 供应商 chip 前置官网同款品牌图标（16 个本地 SVG）与模型数。
- 侧栏补齐「定价类型」（所有模型 / 按量 / 按次 / 任务）与「端点类型」（Chat / Response / Anthropic / Gemini / Rerank / 图片 / 嵌入 / 视频），均带数量并可叠加其他筛选。
- 小标签统一为同一尺寸、圆角、字重与描边，只换底色；站点自带的 🥚 / ?? / AIS 等标签照原文显示，功能词不再重复成小标签，反重力用浅青。
- 修复模型卡片复制按钮：原先复用设备登录页的复制逻辑，在市场页点击无反应；现独立实现并给按钮即时反馈。
- `provider.models()` 增加包内离线快照兜底：`/api/pricing` 失败时仍返回完整模型表，不再需要重新注入供应商。

排查结论与宿主侧待验证项见 [MAGPIE-供应商掉出排查-0.6.7.md](./MAGPIE-供应商掉出排查-0.6.7.md)。本次只发布独立插件，不修改或发布宿主。

## 0.6.6 计价、排序与网页兜底

- 选定分组后仅显示该分组并采用对应倍率；覆盖标准 / 充值、币种、按次 / 用量、停用档位与当前时段。
- 四项排序：最新版本、名称、价格升序、价格降序；默认最新版本，价格按当前展示的主价格排序。不同计费单位不直接代表成本可比。
- 详情直达官网对应模型，保留分组、单位和计价模式；不再误触模型启停。
- 页头、状态失败页、充值 / 用量不可用时提供网页入口及复制地址，不自动重发充值。网页登录不等于插件授权完成。
- 本次公开快照含 109 个模型，288 个模型 / 分组报价组合与官网运行时对账无差异；31 项单元检查与 43 项浏览器检查通过。

设备命名目标为 /api/magpie/device/*。2026-11-05 核验时新路径尚未匹配路由，本版按用户确认保留既有兼容调用，等待上游与宿主同步迁移；不宣称迁移已经完成。八条 neartoken:* 桥接通道保持不变。

需要 magpie 配合的事项见 [MAGPIE-依赖交接-0.6.6.md](./MAGPIE-依赖交接-0.6.6.md)。本次只发布独立插件，不修改或发布宿主。

## 0.6.5 分组标题样式

- 官Key、满血、其他三个分组标题统一为 11px、700 粗体。
- 分别使用蓝色、玫红色和灰色，并优先采用宿主主题颜色。
- 仅调整标题样式，分组筛选和卡片布局保持不变。

## 0.6.4 修复与已知边界

- 分组、类型、供应商和工具条原位更新，保留侧栏滚动与焦点；后台重绘保留页面及侧栏位置。
- 模型区按实际可用宽度显示双列；卡片区不足 470px 时退回单列，列表模式保持单列。
- 页面发起设备授权时传入宿主已有的 `affCode` 参数。推广参数传递不等于邀请归属已经成立。
- 更正兑换与同步提示：当前兑换按钮尚未接入真实兑换调用。邀请数、本人推荐链接与奖励仍需账户归属和接口联调。
- 22 项浏览器回归通过；覆盖 760 / 900 / 1267 / 1482px。预览使用测试宿主，不替代真实账户验证。

接口事实与待确认事项见 [HANDOFF-上游站适配.md](./HANDOFF-上游站适配.md)。该文档随仓库提供，不包含在 npm 运行包中。

## 上游与致谢

这个插件是**第三方扩展**，不属于 magpie 官方，也不代表上游作者的观点。能做到今天这些能力，全靠下面这些项目：

### 宿主：magpie

- **作者**：[yetone](https://github.com/yetone)
- **仓库**：<https://github.com/yetone/magpie>

本插件的 `auth`（`authorize` / `loader` / `usage`）、`config`、`provider.models`、页面插件机制（`magpie.page`、`magpie.calls`、`page/_magpie/bridge.js`）全部按 magpie 的插件契约实现。没有 magpie 的「一个网关、多供应商、插件化页面」这套设计，这个包无从存在。

### 插件形状：OpenCode

- **作者**：SST（[sst/opencode](https://github.com/sst/opencode)）
- magpie 沿用了 OpenCode 的 v1 插件形状（`export async function(ctx) => ({ config, auth, provider })`），本插件按同一形状编写，因此也能被 OpenCode 形态的加载器读取。

### 站点底座：new-api

- **作者**：Calcium-Ion 与贡献者
- **仓库**：<https://github.com/Calcium-Ion/new-api>

NearToken 的模型目录、分组倍率、额度与日志接口沿用 new-api 的约定（`/api/pricing`、`/api/status`、`/api/log/token`、`quota_per_unit` 等）。本插件对这些接口的字段映射、`other` 字段解析与额度换算，都以 new-api 的行为为准。

### 模型方言：Vercel AI SDK

- `@ai-sdk/openai-compatible`、`@ai-sdk/anthropic`、`@ai-sdk/google` 等由 [Vercel AI SDK](https://github.com/vercel/ai) 提供。每个模型用哪个方言，遵循上游目录给出的 `api.npm`。

### 服务与数据

- [NearToken](https://neartoken.cc)：提供账户、模型目录、分组路由与用量数据。站点图标（`page/icon.png`）取自站方，仅用于识别该服务。
- 模型广场的分组徽标分类、层级与配色，参考站点 `/pricing` 与 `/usage-logs/common` 的公开界面实现。

### 明确边界

- 本仓库**只放插件本身**：不含 magpie 源码、补丁或改动，也不进 magpie 的内置页面或发行物。
- 上游接口变动可能导致本插件字段映射失效；以站点真实响应为准，不以本文档推断为准。

## 许可

MIT。站点图标（`page/icon.png`）取自 `neartoken.cc`，仅用于识别该服务。