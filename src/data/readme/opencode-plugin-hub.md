# opencode-plugin-hub

OpenCode 桌面版的插件管理器：在应用内部浏览社区精选插件、按 npm 搜索、安装与移除，不用手改 `opencode.json`。

> OpenCode Desktop plugin manager — browse community plugins, search npm, inspect README/downloads, install and update without editing JSON.

GitHub: <https://github.com/meiyx7/opencode-plugin-hub>

入口：标题栏 **插件中心** Pill 或全局快捷键 `⌘⌥P` 打开独立弹窗；设置 → 插件中心 保留完整页面。

搜索到插件之后可以点开详情，直接看它到底做什么：npm 周/月下载量、发布者、许可证、最新发布时间、README、项目主页、源码仓库、依赖和包体积都在同一个弹窗里，不用跳去 npm 页面猜。

## 从 npm 安装

包名：`opencode-plugin-hub`。发布后页面是 <https://www.npmjs.com/package/opencode-plugin-hub>。

在 `~/.config/opencode/opencode.json` 的 `plugins` 里加一行：

```json
{
  "plugins": ["opencode-plugin-hub"]
}
```

然后完全退出 OpenCode 再打开。第一次安装时插件还没加载，不能用插件里的「彻底重启」，需要手动退出一次；之后就可以用标题栏 Pill、`⌘⌥P` 或设置页。

## 入口放在哪

OpenCode 的 GUI 插件 SDK 目前没有提供左侧「主页 / 新建会话」同级的导航注册表，所以没法把插件中心直接插进那条列表里。现在用三种方式保证它随时可达：

| 入口 | 位置 | 打开形式 |
|---|---|---|
| 标题栏 Pill | 窗口顶部标题栏 | 独立 `x-large` 弹窗 |
| 快捷键 | 任意界面 | `⌘⌥P`（`mod+alt+p`），可在 设置 → 快捷键 里改 |
| 命令面板 | 命令面板搜「插件中心」 | 同一个独立弹窗 |
| 设置页 | 设置 → 插件中心 | 完整设置页面 |

弹窗里保留了和设置页一致的紫渐变 Hero：说明文字和配置路径。统计合并到标签页（「已安装」标签带「可更新」数），打开配置 / 重载配置 / 彻底重启合并到标签页右侧的工具栏。只有大标题交给弹窗自己的标题栏，避免重复。标签栏做成 sticky，列表滚动时仍然能切换。弹窗默认约 1180×780（受窗口大小限制，最小约 720×480），内容在弹窗内滚动；右下角可以拖动调整大小。底部的「在设置中打开」会关闭弹窗并跳到设置里的插件中心页，想要更宽的空间也可以用这个入口。

如果以后 SDK 增加侧边栏导航注册表，可以把 Pill 换成真正的侧边栏同级项。

## 关于「插件市场」的实际情况

OpenCode **没有官方插件市场**。官方只提供两种加载方式（配置文件里写 npm 包名、或往 `plugins/` 目录放文件）和一个手写的 [ecosystem 文档页](https://opencode.ai/docs/ecosystem)，没有任何注册表接口、没有安装命令、也没有应用内商店。

但社区有一个事实标准：**awesome-opencode** 这个 curated 列表，仓库里带了自动导出的 `dist/registry.json`（当前 198 条，其中 97 条是插件/MCP/主题）。这是唯一机器可读的 OpenCode 插件目录，本插件就以它为数据源。

三条信息通道，按可信度排列：

| 来源 | 内容 | 能不能装 |
|---|---|---|
| 精选目录（registry.json） | awesome-opencode 社区维护的 97 条 curated 条目，带描述、分类、GitHub 地址；Hero 里的 awesome-opencode 可点击查看来源 | 75 条可在应用内直接安装，其余 22 条只发布在 GitHub |
| npm 搜索 | 带 `opencode-plugin` 标签的包，约 3000 个 | 能，但没有筛选，噪音多 |
| 内置快照 | 上面 97 条的构建期副本，断网时兜底 | 同精选目录 |

## 三个标签页

| 标签 | 说明 |
|---|---|
| 精选目录 | awesome-opencode 社区 curated 列表（Hero 里的来源名可点击），本地筛选（不打网络请求），可按类型过滤，标出可安装/仅 GitHub/已安装/可更新 |
| npm 搜索 | 直查 `keywords:opencode-plugin`，覆盖目录之外的长尾；显示周/月下载量、发布者、许可证，可按相关度、下载量或发布时间排序 |
| 已安装 | 读配置里的 `plugins` 数组，显示当前版本与最新版本，可查看详情、更新、移除 |

每张卡片右侧都有操作区：`详情` 打开完整信息弹窗，`源码` / `主页` / `npm` 用系统浏览器打开，`安装` / `更新` / `移除` 直接改配置。卡片正文也可以点击（有键盘焦点支持）。

安装 / 更新 / 移除成功后，提示条会提醒你点工具栏里的「彻底重启」；整个页面/弹窗只保留这一个常驻重启按钮，点一下就会退出应用、清掉旧的 `serve --service`，再自动打开。

安装写入配置时刻意走 jsonc 单节点编辑，**保留你原有的注释、缩进和行序**。

## 详情弹窗里有什么

详情数据来自 npm registry 的完整 packument 和 downloads API，主进程查一次后缓存 10 分钟：

| 区域 | 内容 |
|---|---|
| 顶部 | 包名、最新版本、已安装版本、可更新/已废弃标记、一句话描述 |
| 统计 | 周下载、月下载、已发布版本数、解包体积与文件数 |
| 元信息 | 许可证、最新发布时间、首次发布时间、维护者、关键词 |
| 链接 | 项目主页、源码仓库（monorepo 会定位到子目录）、npm 页面、问题反馈 |
| README | 用应用自带的 Markdown 渲染器展示，图片、代码块、表格都保留；超长时截断到约 30k 字符 |
| 依赖 | 可折叠的依赖列表 |

README 是判断「这个插件具体干啥」最直接的来源。很多包的 npm 描述只有一句话，但 README 里会写清楚它监听什么、改哪些配置、需要什么权限。

**下载量是 npm 的统计，不是实际使用人数。** 它只能用来横向比较热度，不能当成精确安装量。

## 搜索与详情的数据降级

- 搜索结果直接复用 npm search API 返回的 `downloads.weekly/monthly`，不额外发请求。
- 详情优先读完整 packument（包含 README）。超过 12MB 的包会退回只读 `/latest` manifest，此时没有 README 和发布时间。
- 下载量单独查 `api.npmjs.org/downloads/point`，查不到时显示 0，不影响详情其余部分。
- 详情查询失败会在弹窗里明确写出原因（404、网络错误、占位包没有发布版本等），不会伪装成空数据。

## 版本检查与更新

打开插件中心时会自动查一次 registry（只查已安装的插件，不查整个目录），也可以手动点「检查更新」。每个插件显示 `v当前 → v最新`，有新版本时出现「更新」按钮。结果在内存里缓存 5 分钟，重复切标签不会重复请求。

两条更新路径是不一样的：

| 配置里的形态 | 更新方式 | 备份 |
|---|---|---|
| npm 包名（`foo` 或 `foo@1.2.3`） | 改配置为 `foo@<最新版>`，精确锁版本 | 不需要，旧版本仍在 npm 缓存里 |
| 本地目录（`/abs/path`） | 从 registry 下载 tarball 解包覆盖目录；若目录里有 `scripts/repatch.mjs`，自动用它重打补丁 | 目录同级生成 `<dir>.backup-<时间戳>`，失败自动还原 |

本地目录这一路是为「从 npm 包复制出来再打补丁」的场景准备的（例如 `@magpie-community/opencode-trae-auth`）。两个细节：

- 目录里的真实包名和版本**从 `package.json` 读**，不是用文件夹名。所以已安装页显示的是 `@magpie-community/opencode-trae-auth v0.2.29`，而不是 `opencode-trae-auth`。
- 重打补丁时必须传 `--from <刚解包的目录>`。`repatch.mjs` 默认从 npm 缓存找源包，而缓存里还是旧版本，不加这个参数会用旧源把刚更新好的文件覆盖回去。

判定「有新版本」用三段式数字比较，只认裸版本号：`^0.2.29`、`latest`、`1.x` 这类 range 不参与比较，避免把范围当成版本。

**查询失败不等于没有更新。** registry 会时不时返回 `ECONNRESET`（尤其连续请求后），如果把失败当成空结果，界面就会显示「全部已是最新」——这是错的。所以查不到时单独标记为「未能检查」，条目上直接写出来，汇总提示也会说「N 个插件未能检查」。只有 404 才算「这个包不存在」这种确定结论。

## 包名是怎么确定的

`registry.json` 本身**不含 npm 包名**——只有 GitHub 地址和一段自由格式的安装说明。所以包名的确定方式是一套回退链：

1. 从 `installation` 文本里抓 `"plugin": ["..."]`
2. `displayName` 本身像包名时直接用
3. 用仓库名
4. 用 `@owner/repo`
5. 上述的小写变体（npm scope 必须小写）

每个候选都去 npm 实查，**优先选发布过 `latest` 的那个**。这一步很关键：`opencode-plugin-otel` 这种裸名在 npm 上存在，但只有 0 个版本（空壳占位），真身是 `@devtheops/opencode-plugin-otel`。不加这层判断就会装到一个装不上的包。

核验结果在构建期固化进 `src/gui/registry-snapshot.json`，运行时零成本。目录更新后用 `npm run refresh` 重建。

## 数据来源的降级链

```
网络（12 小时 TTL） → 本地缓存 ~/.cache/opencode/plugin-hub/registry.json → 内置快照
```

断网时页面不会空，会回退到内置快照，加载时会提示具体错误；Hero 里的 awesome-opencode 仍会链接到实际的 registry 来源。点「更新目录」可强制跳过缓存。

## 为什么装完要重启

OpenCode 在启动时对插件列表和 provider 模型目录做快照，改配置后运行中的进程不会重读。注意光关窗口不够，后台 `serve --service` 守护进程也要一起结束，而它经常比窗口活得久。

插件中心里已经内置了「**彻底重启**」按钮（只在顶部工具栏里保留一个）：

1. 弹窗确认后，主进程启动一个 detached shell 脚本；
2. 脚本先退出 OpenCode 桌面应用；
3. 清理残留的 `serve --service`；
4. 等进程真正退出后，用 `open -b ai.opencode.desktop` 重新拉起应用。

所以正常流程是：安装 / 更新 / 移除插件 → 点工具栏里的「彻底重启」→ 确认 → 应用自动退出并重新打开，不需要再手敲命令。

每次重启会往 `~/.cache/opencode/plugin-hub/restart.log` 追加时间、应用 PID、服务 PID 和当前步骤。自动重启没生效时，先看这个日志。

脚本只在 macOS 上执行，且只对打包版 OpenCode 生效（按 `.app` 路径和 bundle id 识别）。如果自动重启失败，回退到手动方式：

```bash
pkill -f "serve --service"
open -a OpenCode
```

第一次从旧版本升级到这个版本时，后台服务里还没有 `restart` 方法，需要手动彻底退出重开一次；之后就都可以用按钮了。

## 安装（本地开发态）

```bash
npm install
npm run build            # 产出 dist/index.js + dist/gui-experimental.cjs
```

在 `~/.config/opencode/opencode.json` 的 `plugins` 里加目录的绝对路径：

```json
{
  "plugins": [
    "opencode-qoder-bridge",
    "/Users/you/code/opencode-plugin-hub"
  ]
}
```

然后完全退出 OpenCode 再打开。

## 开发

```bash
npm run dev       # vite build --watch
npm run refresh   # 重建内置目录快照（会逐个查 npm，约 1-2 分钟）
```

| 文件 | 职责 |
|---|---|
| `src/index.ts` | 服务端部分，只声明插件 id `plugin-hub` |
| `src/gui.tsx` | GUI 入口：设置页、标题栏 Pill、命令快捷键，统一打开弹窗或设置页 |
| `src/contract.ts` | 窗口与主进程的 IPC 契约（effect Schema），含搜索、详情、安装、更新等 |
| `src/gui/page.tsx` | UI（Solid）：设置页与独立弹窗共用的三个标签页、卡片列表、详情弹窗、内联样式表 |
| `src/gui/admin.ts` | 主进程：读写配置、npm 搜索与详情、版本比对、更新（含目录插件）、打开链接/配置、reload |
| `src/gui/catalog.ts` | 主进程：拉取并降级解析社区目录 |
| `src/gui/registry-snapshot.json` | 构建期固化的目录快照，由 `npm run refresh` 生成 |
| `dist/index.js` | 服务端入口（npm 发布包使用） |
| `dist/gui-experimental.cjs` | GUI bundle（Vite 构建产物） |

窗口进程是浏览器沙箱，读不了文件也打不开外链；所有 I/O 走 `main` + IPC。

## 发布到 npm

> 发布只通过 GitHub Actions：`npm version patch` 后推送 `v*` tag，由 `.github/workflows/publish.yml` 构建并发布。本地 `npm publish` 已被 `prepublishOnly` 守卫禁止。下面的手动流程仅作历史/首次发布参考（首次发布 npm 无法用 OIDC）。

包名 `opencode-plugin-hub` 当前在 npm 上可用。注意：这台机器默认 registry 是 `registry.npmmirror.com`（淘宝镜像），**镜像不能发布**；`package.json` 的 `publishConfig.registry` 已经固定到官方 `registry.npmjs.org`，登录也要显式指定：

```bash
npm config get registry                # 当前大概率是 npmmirror
npm view opencode-plugin-hub version --registry=https://registry.npmjs.org/   # 404 = 名字可用
npm login --registry=https://registry.npmjs.org/
npm run typecheck
npm run build
npm pack --dry-run                     # 检查 tarball 内容
npm publish --access public            # publishConfig 会把它发到 registry.npmjs.org
```

说明：

- `prepublishOnly` 会自动跑 `typecheck` + `build`；`dist/index.js` 是服务端入口，`dist/gui-experimental.cjs` 是 GUI bundle。
- `files` 只带 `dist`、`src`、`LICENSE`；`README.md`、`package.json` 由 npm 自动包含。
- `repository` / `homepage` / `bugs` 已指向 <https://github.com/meiyx7/opencode-plugin-hub>；如果你 fork 或转移仓库，记得同步改这三项。
- 如果 `opencode-plugin-hub` 被占用，改用带 scope 的名字，例如 `@your-name/opencode-plugin-hub`，同步改 `package.json` 的 `name` 和安装文档。
- 更新版本：`npm version patch`（或 `minor` / `major`），再 `git push --follow-tags`，由 GitHub Actions 自动发布；本地 `npm publish` 已被 `prepublishOnly` 守卫禁止。
- 有 2FA 的账号发布时会提示输入一次性验证码。
- npm 发布是公开且难以撤回的，建议先 `npm pack`，在本地或测试机器上确认能装再发。
- 发布后用 `npm view opencode-plugin-hub version --registry=https://registry.npmjs.org/` 确认。npmmirror 是异步镜像，刚发布时可能还没同步；如果 OpenCode 通过镜像拉包暂时找不到，等几分钟或临时把 registry 指向官方 npm。

### 后续版本：GitHub Actions + Trusted Publishing

`0.1.0` / `0.1.1` 已发布。后续版本用 **push `v*` tag 自动发布**，仓库里不存 `NPM_TOKEN`。

先在 npm 配置 trusted publisher：

1. 打开 <https://www.npmjs.com/package/opencode-plugin-hub/settings>
2. **Trusted Publishing** → **Add a trusted publisher** → **GitHub Actions**
3. 填：
   - Organization or user: `meiyx7`
   - Repository: `opencode-plugin-hub`
   - Workflow filename: `publish.yml`
   - Environment: 留空
4. 保存

之后发新版本：

```bash
npm version patch
git push --follow-tags
```

`npm version` 会创建 `v0.1.2` 这样的 annotated tag；`git push --follow-tags` 把 main 和 tag 一起推上去，tag push 会自动触发 **Publish to npm**，不需要创建 Release，也不需要手动点。

`.github/workflows/publish.yml` 会：

- 校验 tag 和 `package.json` 的 version 一致
- 用 `id-token: write` 和 `npm publish --provenance` 发布
- 不需要 `NPM_TOKEN`

注意：

- `package.json` 的 `version` 必须先 bump，且不能和 npm 上已有版本重复。
- 已发布的 tag 不要强推；要重发就 bump 一个新版本。
- 如果还没配置 Trusted Publishing 就推 tag，publish workflow 会失败。
- 如果 tag 没有跟着 push 上去（极少数 `--follow-tags` 情况），补一个 `git push origin v0.1.2`。
- `.github/workflows/ci.yml` 仍然在 push / PR 时跑 typecheck 和 build；手动 **Publish to npm** 仅作为重试入口保留。

## 已知边界

- 只在 macOS 桌面版 2.2.5 上验证过。GUI Plugin SDK 仍是 experimental 接口，随时可能变。
- 精选目录来自社区维护的 awesome-opencode，**不是官方背书**，条目质量参差，装之前建议看一眼源码。
- 22 条只有 GitHub 发布，应用内装不了，只能点「源码」去看安装说明。
- 详情里的主页/仓库来自 npm 元数据。有些包（例如 `opencode-notify`）根本不填 `repository`，这时只能看 npm 页面和 README。
- 下载量来自 npm downloads API，统计的是 npm 安装/下载次数，不等于真实用户数。
- README 里可能包含外链图片（badge、截图），离线或被 CSP 拦截时不会显示，但不影响文字内容。
- 精选目录里的版本号是构建时的快照值；「可更新」判定用的是实时查到的 registry 版本，两者可能不一致。
- 目录插件的更新是覆盖式的：目录里自己手改的文件（除了 `package.json`、入口文件之外）如果被新版本同名文件覆盖，需要从 `.backup-*` 里取回。
- 本地目录插件的备份不会自动清理，确认新版稳定后可手动删掉 `<dir>.backup-*`。
- 不清理 `~/.cache/opencode/npm` 里的旧包，避免打断正在运行的插件。
- 不能移除插件中心自身。
- 「彻底重启」只在 macOS 上执行，依赖 `ps` / `kill` / `open`，并按 `.app` 路径和 bundle id `ai.opencode.desktop` 识别应用。开发态、绿色版或非标准安装路径可能识别不到，此时会提示你手动重启。
- 第一次从旧版本升级到带自动重启的版本时，后台服务里还没有 `restart` 方法，需要手动彻底退出一次；之后就能用按钮。
- 自动重启会关闭应用，正在运行的对话/任务会中断；会话通常会自动恢复，重新打开后可继续。
