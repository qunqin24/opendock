# magpie-freepi

> [English](README.md) · 简体中文

把 [free-pi](https://freepi.ai)（`api.freepi.ai`，看广告换免费模型的聚合网关）接入 [magpie](https://usemagpie.ai) 的供应商插件。直连上游，无需任何本地代理或额外进程。

非官方插件，通过逆向 free-pi-cli 的协议实现（结构同 [FreePi2API](https://github.com/ErfanBagheri404/FreePi2API)）。

## 特性

- **直连上游**：登录凭据保存在 magpie 的 `plugin-auth.json`（权限 600），请求自动走 magpie 为该供应商设置的代理（可在选项中切直连）。
- **GitHub 设备码登录**：应用内点击登录 → 浏览器输入代码即可，无需 API key。
- **动态模型目录**：实时拉取上游目录（当前 26 个可用模型），自动标注免费模型与倍率；上游不可达时回退内置静态表。
- **真实每日额度**：额度页显示 free-pi 的每日 credits 额度与 UTC 零点重置时间，路由可据此权衡账号。
- **广告自动上报**：free-pi 要求客户端展示广告才放行 completion；插件在每次请求前自动取一条横幅广告并上报曝光（不点击、不阻塞、失败不影响请求），上报计数可在账号卡片查看。

## 安装

```sh
magpie plugin add magpie-freepi-auth              # 从 npm
magpie plugin add github:aqiu817/magpie-freepi    # 或从 GitHub，或本地文件夹路径
magpie plugin login freepi                        # 浏览器完成 GitHub 设备码授权
magpie provider test freepi
```

应用内：插件 → 添加插件 → 填入包名/仓库/路径 → 在 freepi 行登录。

## 模型

以 magpie 模型选择器实时列表为准。**每个模型都按自己的倍率消耗每日额度**——此前的免费不限量活动已结束。上游目录自带倍率标注，插件会转换显示：

- `deepseek-v4-flash` / `particle`（~1x）是日常最省的选择，`glm-5.3-flash` ~1.5x、`solar-pro-4` ~0.6x
- 高端模型 2–60x（`claude-haiku-5.5` 2x、`deepseek-v4-pro` 18x、uncensored/abliterated 微调 20–60x），`deepseek-v4.1-flash-1017-ultrafast` 高达 ~295x——选择前留意倍率
- 偶尔仍会有免费活动（🔥 Free Unlimited）出现；活动期间插件会自动把相应模型标为 free

剩余每日额度（当前 15,000 credits，UTC 零点重置）显示在账号卡片和 `magpie quota` 里。

上下文/输出上限来自 [models.dev](https://models.dev)（按上游 `stats_id` 反查）：多数模型 1M 级上下文；未收录模型按 128k/16k 保守标注。上游可能另有每请求限制。

## 选项

在 插件 → 已安装 → freepi 的选项里以 JSON 设置（或 `magpie plugin options freepi '{"direct":true}'`）：

| 选项 | 默认 | 说明 |
|---|---|---|
| `direct` | `false` | `true` 时绕过 magpie 代理链直连上游 |
| `adCount` | `true` | 在账号卡片以 aside 窗口显示本次运行已上报的广告曝光数（不参与路由） |

## 免责声明

- **非官方**：本插件与 free-pi 无关；协议逆向自 free-pi-cli，`consent`、版本门槛、广告接口随时可能变更导致失效。
- **广告机制**：free-pi 以广告收入支付推理成本，插件仿照 headless 代理的通行做法自动上报横幅曝光（仅曝光、不点击）。请知悉并自行判断是否符合你的使用意愿；如希望以真实浏览支持服务方，请使用官方 CLI。
- **数据提示**：上游目录标注 `muse-spark-1.3-contributor` 会用你的数据训练（free-pi + Meta）；登录时上游亦要求同意「会话可能用于训练模型」条款。介意者请避开相关模型或自行斟酌。
- **额度消耗**：倍率模型按上游规则消耗每日 credits，用完进入慢车道或等待。
- 仅供个人使用，请勿用于绕过付费服务的生产场景。

## 开发

```sh
node --test test/freepi.test.mjs
```

```
index.mjs            # 入口：FreePiPlugin（唯一插件导出）+ _internal
lib/upstream.mjs     # 上游契约：常量/版本自校准/头/device flow/广告门
lib/catalog.mjs      # 静态模型表 + 目录解析 + models.dev limits
test/                # node:test，mock fetch，不打真网
```

## License

MIT
