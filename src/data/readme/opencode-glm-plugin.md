# opencode-glm-plugin

**简体中文** | [English](https://github.com/huanlis/opencode-glm-plugin/blob/main/README.en.md)

[![npm](https://img.shields.io/npm/v/opencode-glm-plugin)](https://www.npmjs.com/package/opencode-glm-plugin)
[![license](https://img.shields.io/npm/l/opencode-glm-plugin)](./LICENSE)

源码与 issue：<https://github.com/huanlis/opencode-glm-plugin>

GLM Coding Plan（智谱）额度面板，OpenCode Desktop 插件。

在桌面端 GUI 的右侧边栏添加「GLM 额度」标签页：顶部「总览 / 个人套餐 / 团队套餐」页签切换，总览用环形图与曲线图展示各套餐进度和用量趋势；每个套餐有独立页面，含限额进度条、重置倒计时、该套餐自己的今天 / 最近 7 天 / 30 天用量（Token、缓存命中率、按模型分解）。另附侧边栏 + 菜单启动项与标题栏用量徽标（悬停显示各套餐百分比，点击打开面板）。

![GLM 额度面板：总览 / 个人套餐 / 团队套餐](https://raw.githubusercontent.com/huanlis/opencode-glm-plugin/main/assets/panel-tabs.png)

## 安装

```sh
opencode plugin add opencode-glm-plugin@latest
```

也可以直接写进全局 `~/.config/opencode/opencode.json`：

```json
{
  "plugins": ["opencode-glm-plugin@latest"]
}
```

`@latest` 让 OpenCode 在启动时检查更新（每 24 小时一次）；只写包名则会停在已安装的版本。

装好后打开桌面端：**Settings → Extensions → Plugins** 里能看到它，侧边栏 **+ 菜单 → GLM 额度**，或点标题栏徽标。

> 如果之前用本地目录（`file://…/opencode-glm-plugin`）加载过，先把那一项从 `plugins` 里删掉，再添加 npm 包，避免同一个插件被加载两次。

API Key 自动从 OpenCode 登录凭据读取（`~/.local/share/opencode/auth.json` 的 `zhipuai-coding-plan`），也可用环境变量 `GLM_API_KEY` 或插件 options 覆盖。

## Options

```json
{
  "plugins": [
    {
      "package": "opencode-glm-plugin@latest",
      "options": {
        "apiKey": "可选，覆盖 auth.json",
        "baseUrl": "可选，默认 https://open.bigmodel.cn；国际版 https://api.z.ai",
        "organization": "org-xxx，新版积分套餐需要",
        "project": "proj_xxx，新版积分套餐需要",
        "planType": 1
      }
    }
  ]
}
```

`planType`：新版积分套餐查询参数（1 个人 / 2 团队）。若面板提示「服务端未返回额度数据」，请到 bigmodel.cn 控制台（DevTools 里 `quota/limit` 请求）抄下 `bigmodel-organization` / `bigmodel-project` 头与 `type` 参数填入。

### 多套餐

账号下同时有个人套餐和团队套餐时，插件会自动把它们都查出来分组显示：用当前配置分别请求 `type=1` 和 `type=2`（个人在前、团队在后；配置了其他 `planType` 值时一并查询），返回空的结果自动忽略，同一个套餐只显示一份。团队套餐需要上面那组 `organization` / `project`，个人套餐无需额外配置。

`organization` 填控制台里的「组织ID」，`project` 填团队项目的「项目ID」，都在[组织管理页](https://bigmodel.cn/usercenter/proj-mgmt/org-mgmt)查看（页面左上角先切换到团队所在组织）：

![在控制台组织管理页查看组织ID与项目ID](https://raw.githubusercontent.com/huanlis/opencode-glm-plugin/main/assets/org-mgmt.png)

需要精确控制时（多个团队、自定义名称、只看某个套餐），用 `plans` 数组显式列出，写了它就不再自动发现：

```json
{
  "options": {
    "plans": [
      { "label": "个人", "planType": 1 },
      { "label": "团队", "planType": 2, "organization": "org-xxx", "project": "proj_xxx" }
    ]
  }
}
```

每项可写 `label` / `planType` / `organization` / `project`，未写的字段继承顶层 options；列表严格按条目查询，空或失败的套餐也会显示出来方便排查。

注意：用量按套餐分别取数——每个套餐页的今天 / 7 天 / 30 天是该套餐自己的数据，总览页显示各套餐合计（标注「账号总用量」）。用量接口不返回调用次数，面板展示 Token 与缓存命中率。

修改 options 后插件会自动重载，不需要重启应用。

## 数据源

- `GET {base}/api/monitor/usage/quota/limit` — 套餐窗口限额与重置时间
- `GET {base}/api/monitor/token-usage/usage-detail?startTime=&endTime=&type=&usageType=MODEL` — 按套餐的用量序列（个人 `type=1`，团队 `type=3`）、按模型汇总与缓存命中率

两个接口的 type 编号不同：options 里的 `planType` 沿用额度接口的语义（1 个人 / 2 团队），查用量时插件内部把团队换算成 `type=3`；额度接口的 `type=2` 在用量接口里是企业汇总（只有企业主账号可查）。

鉴权：`Authorization: <裸 key>`（无 Bearer 前缀）。

## 兼容性

- 面向 OpenCode Desktop **2.4.x**（`@opencode/plugin` 固定 2.4.1）构建。
- GUI 插件 API 仍标注 experimental，桌面端大版本升级后建议先更新插件。
- 只支持智谱官方的 GLM Coding Plan 套餐；第三方中转或非官方计费渠道没有对应的用量接口。

## 架构

- `src/index.ts` — server 半部（仅声明插件 id）
- `src/gui.tsx` — `./gui-experimental` 入口，窗口跑 `setup`、Electron 主进程跑 `main`
- `src/gui/main.ts` — 主进程拉取并缓存数据（Node fetch 无 CORS），经 `Ipc` 契约给窗口
- `src/gui/window.tsx` — 注册 Panel / MenuItem / TitlebarItem，5 分钟自动刷新
- `src/gui/panel.tsx` — 额度面板 UI（Solid），进度条 / 倒计时 / SVG 趋势图

## 开发

```sh
npm install
npm run dev      # vite build --watch，改动后窗口内热重载
npm run smoke    # 用宿主 stub 评估 bundle 并跑真实数据链路
npm run typecheck
```

本地目录加载（开发时）：在 `plugins` 里写 `"file://E:/opencodeProject/opencode-glm-plugin"`，改完代码 `npm run dev` 会热重载。

## 发布

```sh
npm whoami       # 先确认已登录
npm run check    # typecheck + build + smoke
npm publish      # prepack 会再跑一遍 typecheck 和 build
```

`files` 只带 `src` 和 `dist`，`prepack` 保证 tarball 里的 `dist/gui-experimental.cjs` 是最新构建产物。

## License

MIT
