# Eficy：包内运行时的交互预览

一个 OpenCode 插件同时提供 `eficy` skill、`eficy_validate` 工具与 `.eficy` GUI 预览。服务端插件 ID 为 `eficy`，SDK 使用 `@opencode/plugin` 2.2.0。iframe 内打包真实 Eficy browser、shadcn、React 与样式，运行时不从 CDN 下载依赖。

## 安装（OpenCode 2）

在连接服务的全局 `opencode.json(c)` 中加入 npm 包，保留已有配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@eficy/opencode2-plugin@0.1.0"]
}
```

配置保存后由 OpenCode 重新加载插件。终端可使用 skill 和校验工具；可视化预览需要支持标准 `./gui-experimental` 入口的 GUI 宿主。GUI API 仍为实验性接口，本版本针对 `@opencode/plugin` 2.2.0 构建。

也可从 [GitHub Releases](https://github.com/yee94/opencode-eficy/releases) 下载 tgz，在本地目录运行 `npm install /path/to/eficy-opencode2-plugin-0.1.0.tgz`，再将安装后的 `node_modules/@eficy/opencode2-plugin` 绝对路径加入全局 `plugins`。

## 本地构建与安装

本目录为独立包，在此目录执行：

```sh
npm ci --ignore-scripts
npm run build
npm run typecheck
npm test
npm pack --dry-run
```

将目录绝对路径加入连接服务的**全局** `opencode.json(c)`，保留已有配置：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-eficy"]
}
```

包的 `.` 导出服务端入口，`./gui-experimental` 导出预构建 GUI bundle。远程连接时应在远端服务安装同一包；仅本地放置 GUI 产物不会给远端 agent 注册技能。GUI 开关不取消服务端 skill/tool 注册。

## 生成与预览

向 agent 请求：

> 使用 eficy 技能生成一个带计数按钮和姓名输入框的 demo.eficy，先用 eficy_validate 验证，再保存并返回链接。

`.eficy` 是单文件纯 TSX，直接默认导出一个 React 组件。只允许静态导入 `eficy` 和 `shadcn`。完整 Signals 示例见 [`skills/eficy/SKILL.md`](skills/eficy/SKILL.md)。保存到磁盘后，点击 `[打开预览](demo.eficy)` 或侧边文件树中的文件，在现有文件标签页内渲染预览。

源码变化会重新求值模块，模块级 Signal 状态可能重置；同内容更新不应重载。预览状态不是持久数据。文件读取失败、语法或渲染失败必须显示错误；真实浏览器保存更新、交互和恢复流程由集成验收确认。

页面内的 `<a href>` 本地文件链接通过标准 `ctx.links.open` 交给宿主：支持绝对路径、`file://` URL 和相对当前文件目录的路径，继续在文件标签页中渲染。消息中的文件链接也进入同一文件预览链路。iframe 不自行跳转到本地路径；文件不存在或当前服务无权访问时按宿主文件错误显示。

## 校验与隔离边界

`eficy_validate({ path, source })` 只处理传入文本，不读取目标路径、不执行代码、不解析网络或磁盘依赖。Sucrase 执行真正的 TSX 语法解析；同一语法 token 流用于检查默认导出和 import 边界。源码限制为 **128 KiB UTF-8**。失败返回 `valid: false`、`code` 和 `error`，区分缺失输入、路径、超限、语法、默认导出、导入与 frame 文档边界问题。

格式要求直接 `export default`；命名导出、重导出、相对路径、远程 URL、其他 npm 包、动态 import、`require`、`loadModule` 均不支持。不写 HTML 文档、script 标签、CDN 模板或 React Hooks；初始化与挂载属于 frame。可用 import 是包内模块映射，不是网络 import map。

静态校验不是类型检查或安全沙箱，也不能证明默认导出值可渲染。用户源码只应在隔离 iframe 运行；宿主不求值它。iframe 权限、CSP、消息来源校验和资源清理由 frame 承担。源码不得依赖父页 DOM、宿主 SDK、Node API 或网络数据。

iframe 采用 `allow-scripts allow-forms`，不授予 same-origin 权限。`allow-forms` 让 React 的 `onSubmit` 可以收到原生表单事件，CSP 的 `form-action 'none'` 仍禁止网络表单提交。消息通过 source 与独立 frameId 校验；opaque origin 的首次握手只能使用通配目标，不传递宿主凭据。

## 文件类型图标

GUI 同包携带 `.eficy` 的 E 字母文件图标，通过官方 `Registry.define` 注册到
Yuri 的可选 `yuri.file-icon` 扩展。文件树、标签页和文件引用共享此图标；关闭插件
GUI 后恢复宿主默认图标。图标随 GUI bundle 更新，不需要修改 Yuri 内置扩展名表。
这不是 OpenCode SDK 的内置文件图标接口，其他宿主若不消费该 registry，仍可使用
同一插件的预览和 skill。

```ts
const FileIcon = Registry.define<{
  id: string;
  extensions: readonly string[];
  svg: string;
  lightSvg?: string;
}>('yuri.file-icon');
ctx.add(FileIcon, { id: 'eficy', extensions: ['eficy'], svg: fileIcon });
```

## 版本与更新

依赖版本以 `package.json` 和锁文件为源。构建产出 `dist/runtime-manifest.json`，契约为 `{ pluginVersion, packages: { "包名": "精确版本" } }`。服务端启动时读取同包 manifest，将版本动态注入 skill；skill 模板不另抄版本 pin。

更新包依赖后须重新构建内置运行时和 GUI，运行验证，更新插件版本，并把运行时产物、manifest 与 skill 同包发布。不能只改 skill 里的文字来宣称运行时已升级。解析器使用已固定 Sucrase 版本的内部 token API，升级 Sucrase 时同时验证 parser 测试和浏览器编译行为。

构建同时校验安装版本与 lock，版本号只来自 `package.json`，不在构建脚本另抄一份。官方 browser 1.2.4 的 standalone 仍含动态分块，因此先用标准 Webpack context 和单 chunk 构建合并官方文件，再作为文本内置于标准 GUI CJS；没有改写上游源码。生成资产内嵌同一 manifest，旧资产与新版本清单不匹配时构建失败。

## 验证范围

`tests/parser.test.ts` 覆盖真实语法、默认导出、导入策略、字节边界、文档标签与 skill 示例；`tests/server.test.ts` 使用真实 SDK 定义执行 skill/tool transforms，检查 manifest 注入和工具错误结果。先构建运行时，再运行测试。

自动测试不能替代浏览器验收。实际宿主应检查：文件链接与侧边文件树打开后的文件标签页预览、Signals 输入和按钮、源码更新/同内容不重载、错误与修复、跨文件/会话隔离、关闭与卸载清理，以及断网时内置依赖仍可加载。

### 本次验收（2026-10-28）

- 插件 42 项测试、Yuri GUI 宿主 71 项相关测试通过；类型检查、Web/VS Code 构建及打包检查通过。压缩安装包约 586 KiB。
- 安装生成的 tgz 后，仅使用 production dependencies，服务端入口、skill 版本注入、工具校验及样例文件读取通过。
- 真实 OpenCode 服务确认 `eficy` 的 server/gui 为 active；当前会话实际加载 `eficy` skill，并执行 `eficy_validate` 的成功及失败用例。
- 真实 Yuri Web 从文件树打开 `samples/workbench.eficy`，内联显示且没有弹窗；输入、添加、勾选、筛选、源码切换和关闭重开通过。
- 三次磁盘修改到可见更新约 0.51 / 1.80 / 1.99 秒；同内容保存保留交互状态，源码错误保留旧画面，渲染异常修复后恢复。整组更新保持同一 iframe，load 事件为 0。这里测的是保存到显示，不能当作纯渲染耗时；宿主仍采用 2 秒前台 stat。
- 宿主会话目录已改用当前 session 元数据，避免全局项目选择把预览路径切到其他项目；回归覆盖无关目录更新和元数据迟到。

以上是当前分支 Web 实机与自动测试证据，不代表原生 Electron、iOS/Android 或 VS Code 实机验收；没有据此宣称任意用户代码的帧耗时或无限次热更新内存得到保证。
