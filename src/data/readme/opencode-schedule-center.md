# OpenCode Schedule Center（定时任务）

OpenCode Desktop 的 GUI 插件：可视化查看、创建、暂停、恢复和删除实验性定时任务（`experimental.schedules`）。

## 功能

- **任务列表**：扫描全部会话，聚合并展示所有定时任务；默认「全部」筛选，进入即可看到包括已结束在内的所有任务；状态徽章（进行中/已暂停/已结束）、下次触发倒计时（每秒刷新）、上次触发结果（已触发/延迟/失败…）；每张卡片直接展示创建时的高级选项（模型 / Agent / 执行目录），展开可看完整值与**上次输出**（可一键复制）；≥ 5 个任务时出现搜索框，按名称/提示词/会话名即时过滤
- **操作零等待**：暂停 / 恢复 / 删除只发一次请求并本地更新该卡片，不再全量重扫所有会话（旧版每次操作要重新请求 N 个会话）；模型 / Agent 目录等只在首次打开表单时拉取一次
- **新建任务**：分段式触发方式（延迟 / 定时 / 间隔 / Cron）+ 图标化切换，时间与 Cron 均有常用预设；四种方式都可选时区（IANA 名称，如 `Asia/Shanghai`）；本地展示「预计触发时间」并明确标注仅供参考（权威时间以官方 `nextDueAt` 为准）；可设置结束条件（按次数 / 运行时长 / 指定时间结束，默认不限）；高级选项里可配置官方 `if` / `until` 运行条件（Shell / Code，原样传给官方，不在本地执行）；宽容器（弹窗/设置页）下自动折成双栏——左侧触发、右侧提示词与高级选项——把弹窗的宽度用起来，默认不滚动；窄容器回退单栏
- **表单体验**：任务名为标题式输入，Provider / 模型 / Agent / 目录收进高级选项双列面板；底部操作栏吸底并显示是否能创建与首次触发时间（倒计时实时刷新），支持 ⌘/Ctrl + Enter 提交、Esc 逐级退出（收起高级面板 → 返回列表，返回前若表单已填写会出现**内联确认条**，不再弹原生 confirm）；模型选择支持搜索、清除与 Home/End 快速定位
- **选择模型**：高级选项里按「Provider → 模型」级联选择，两级都支持关键字搜索，重名模型会带上所属 Provider / 模型 ID 便于区分，并可选模型变体；留空则跟随会话默认模型
- **管理操作**：暂停 / 恢复 / 删除（删除需二次确认，防误触；只删任务，不删会话），展开卡片查看详情（绑定会话、模型、Agent、执行目录、触发方式与时区、if/until 条件、提示词、结束时间、触发次数、上次输出、创建/更新时间）；详情里的内容可自由选中复制，模型 / 目录 / 提示词 / 会话 / 输出还提供一键复制；任务列表支持按状态筛选与关键字搜索。操作失败时用官方 `schedule.get` 只核对受影响的单个任务，不全量重扫
- **入口**：设置页（Settings → 定时任务）、标题栏「定时任务」按钮、命令面板 ⌘⇧P 搜「定时任务」、快捷键 ⌘⌥S
- **可访问性**：尊重系统的「减弱动态效果」（`prefers-reduced-motion`）

## 前置条件

1. OpenCode Desktop（GUI 插件 API 为桌面端专属）
2. 开启实验性定时任务，在全局配置 `~/.config/opencode/opencode.json` 中：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "experimental": {
    "schedules": true
  }
}
```

3. 安装插件——在 `opencode.json` 的 `plugins` 中加入本地路径：

```jsonc
{
  "plugins": ["/path/to/opencode-schedule-center"]
}
```

## 开发

```sh
npm install
npm run dev        # vite build --watch，改完即重载
npm run typecheck
npm test           # esbuild 编译 + node:test，零新依赖
```

## 发布

版本发布只通过 GitHub Actions（`.github/workflows/publish.yml`）；本地 `npm publish` 已被 `prepublishOnly` 守卫禁止：

```sh
npm version patch   # 或 minor / major：自动改版本、提交并打 v* tag
git push --follow-tags origin main
```

CI 会校验 tag 与 `package.json` 版本一致，随后构建并发布到 npm。

> 本包在 npm 侧开启了 staged publishing：OIDC 信任发布后版本会在暂存区停留约 3–5 分钟才转正到 `latest`，属正常现象；如需即时上架，可在 npm 包设置中关闭 staged publishing 或改用 `NPM_TOKEN` 直发。

## 实现说明

- **职责边界**：官方负责调度与执行，插件只做管理与呈现——不内置调度器、不自算下次触发时间、不维护本地任务库、不伪造执行历史。类型直接复用 `@opencode/client` 导出的官方 Schedule 类型，不做本地镜像。
- **数据源**：`client.experimental.schedule.{list,create,get,pause,resume,delete}`（官方 client SDK，Experimental，需开启 `experimental.schedules`）。`list` 按会话过滤且必填 `sessionID`，因此面板分页扫全部会话后逐会话聚合，按「进行中 → 已暂停 → 已结束、下次触发时间」排序；分页达到安全上限或个别会话读取失败时会明确标记结果不完整，不把部分结果当作完整列表。`get` 只在操作失败后按需核对单个任务。模型 / Agent / 目录不在 schedule 上而是挂在绑定会话上，从会话读取这些高级选项展示在卡片上。
- **挂载会话**：任务必须绑定真实会话；新建任务时自动创建一个专用会话（标题「定时任务：xxx」）作为唤醒目标。创建明确失败时等待回滚删除；超时/结果未知或无法核对时保留会话并向用户说明，绝不冒险清理。删除任务只调用官方 schedule delete，不删会话、不按会话标题判断归属。
- **模型与 Agent**：`model.list` 拉取 chat 模型后按 `providerID` 分组，Provider 名称取自 `provider.list`；创建会话时把所选模型/Agent 传给 `session.create`，若宿主返回值与所选不一致，再分别调用 `session.switchModel` / `session.switchAgent` 并用 `session.get` 回读确认，无法确认则回滚不创建。
- **cron 预览**：内置 5 字段 cron 解析器（支持 `*/n`、区间、逗号、星期日的 0/7 双写法、dom/dow 标准 OR 语义），仅用于输入提示、人性化描述（「工作日 09:00」）和**参考预览**——界面明确标注「预计 / 仅供参考」，本地校验不作为创建门禁，创建是否成功以官方接口响应为准，绝不把本地计算当作官方 `nextDueAt`。
- **构建**：`@opencode/plugin/gui/vite` preset 产出单文件 CommonJS 到 `dist/gui-experimental.cjs`；`solid-js` 与 `@opencode/plugin/gui` 由宿主提供，不打包。

## 已知限制

- 定时任务 API 本身是实验性的（`/api/experimental/schedule`），OpenCode 小版本升级可能变动
- 定时触发依赖 OpenCode 后台服务存活；机器休眠或服务退出时任务不会触发
- 暂无「立即运行」按钮（API 未提供该操作）
- 暂不支持编辑已创建的任务：API 只有 create/list/get/pause/resume/delete，没有 update；如需改配置目前只能删除后重建

## License

MIT
