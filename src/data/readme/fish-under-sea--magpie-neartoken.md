# NearToken in Magpie

把 [NearToken](https://neartoken.cc) 接进 [magpie](https://github.com/yetone/magpie) 的**单包插件**：侧边栏「插件」一组里多一个 NearToken 页面，负责登录绑定、余额与代金券、消耗看板和充值；模型与路由交回 magpie 自己的供应商页。

它不预装、不编进 magpie 的安装包，也不占用 magpie 的内置页面：`@fish-under-sea/magpie-neartoken` 就是一个可以单独下载、单独安装、单独卸载的包。**这个仓库只放插件本身**，不含 magpie 的源码、补丁或改动。

## 下载

| 方式 | 命令 / 入口 |
| --- | --- |
| npm（推荐） | `magpie plugin add @fish-under-sea/magpie-neartoken` |
| GitHub 仓库 | `magpie plugin add github:Fish-under-sea/magpie-neartoken` |
| 离线包 | 在 [Releases](https://github.com/Fish-under-sea/magpie-neartoken/releases) 下载 `fish-under-sea-magpie-neartoken-<版本>.tgz`，解包后把目录添进「插件」页 |

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

## 模型：按分组展开，带倍率

包里的 `index.mjs` 同时是一个 magpie 的 provider 插件（`auth` + `provider` + `usage`），所以模型不用 magpie 侧代填：

- **模型表按「分组 × 模型」展开**：一个模型在几个分组里就是几行，id 形如 `#56::gpt-5.6-sol`。
- **名字带站点原文的组名与倍率**：`[低价] GPT 福利 0.2x · gpt-5.6-sol`。组名里的 emoji 与备注照抄，不翻译。
- **每行带自己的 `x-neartoken-group` 头**：选哪一行就走那个分组，不用手填任何路由。
- **生图与视频模型单独标注**（`output: image` / `video`），进 magpie 的图片生成与视频生成。
- **图标来自包里那张图**（`data:image/png`），不联网抓，断网也不会变成灰书页。
- **余额走 magpie 的用量卡**（`auth.usage`）：显示 `￥3.60`，已用金额单列一行。

模型目录读的是站点的 `/api/pricing`（公开、全量），不用 `/v1/models`——那个端点按令牌分组过滤，很多账号拿到的是空列表，magpie 的「重新获取模型」就会报 `no models listed`。这里不碰它。

## 三个视角

页面上方三个标签：

| 标签 | 内容 |
| --- | --- |
| 原本界面 | 账户、余额与代金券、消耗看板、分组开关、充值、供应商说明 |
| 模型广场 | 按站点返回的分组重绘：低价 / 满血 / 图片 / 视频 / 语音 / 向量，每组一枚可点的开关（关掉即从 magpie 的模型列表里移除） |
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
├── page/               页面本体：index.html · app.js · style.css · icon.svg · icon.png
├── LICENSE
└── README.md
```

## 设计取舍

- **登录用设备授权，不收密码。** 站点自己的登录页负责认证与 2FA，插件只轮询结果。连接签下来的密钥就是站点的一张普通令牌。
- **模型选择不重做。** magpie 已经有供应商、模型、路由、失败切换这一整套；插件只把站点目录写进供应商，剩下的交回窗口。
- **金额口径只有一份。** 汇率来自站点状态接口，钱包、看板、代金券都用它折算，三处数字不会互相打架。
- **读不到就说不知道。** 站点没有用量端点时页面写「站点未提供用量统计」，不画一张空图——空图会被读成「这段时间没有消耗」。

## 许可

MIT。站点图标（`page/icon.png`）取自 `neartoken.cc`，仅用于识别该服务。