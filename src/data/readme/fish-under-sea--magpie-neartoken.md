# NearToken in Magpie

把 [NearToken](https://neartoken.cc) 接进 [magpie](https://github.com/yetone/magpie) 的**单包插件**：侧边栏「插件」一组里多一个 NearToken 页面，负责登录绑定、余额与代金券、消耗看板和充值；模型与路由交回 magpie 自己的供应商页。

它不预装、不编进 magpie 的安装包，也不占用 magpie 的内置页面：`@fish-under-sea/magpie-neartoken` 就是一个可以单独下载、单独安装、单独卸载的包。**这个仓库只放插件本身**，不含 magpie 的源码、补丁或改动。

## 下载

当前版本：**0.6.5**。这是 NearToken 独立 npm 包的版本；后续 magpie 定制宿主升级目标 **2.2.1** 属于另一仓库和发行物。

| 方式 | 命令 / 入口 |
| --- | --- |
| npm（推荐） | `magpie plugin add @fish-under-sea/magpie-neartoken` |
| GitHub 仓库 | `magpie plugin add github:Fish-under-sea/magpie-neartoken` |
| 离线包 | 在 [Releases](https://github.com/Fish-under-sea/magpie-neartoken/releases) 下载 `fish-under-sea-magpie-neartoken-0.6.5.tgz`，解包后把目录添进「插件」页 |

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
4. 批准后自动接入：余额、代金券、看板、充值一次到齐；模型同时出现在 magpie 的供应商页。
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
- **金额口径只有一份。** 汇率来自站点状态接口，钱包、看板、代金券都用它折算，三处数字不会互相打架。
- **读不到就说不知道。** 站点没有用量端点时页面写「站点未提供用量统计」，不画一张空图——空图会被读成「这段时间没有消耗」。

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

## 许可

MIT。站点图标（`page/icon.png`）取自 `neartoken.cc`，仅用于识别该服务。