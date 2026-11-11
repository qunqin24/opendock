# OpenCode Schedule Center（定时任务）

OpenCode Desktop 的 GUI 插件：可视化查看、创建、暂停、恢复和删除实验性定时任务（`experimental.schedules`）。

## 功能

- **任务列表**：扫描全部会话，聚合并展示所有定时任务；默认「全部」筛选，进入即可看到包括已结束在内的所有任务；状态徽章（进行中/已暂停/已结束）、下次触发倒计时（每秒刷新）、上次触发结果（已触发/延迟/失败…）；每张卡片直接展示创建时的高级选项（模型 / Agent / 执行目录），展开可看完整值与**上次输出**（可一键复制）；≥ 5 个任务时出现搜索框，按名称/提示词/会话名即时过滤
- **操作零等待**：暂停 / 恢复 / 删除只发一次请求并本地更新该卡片，不再全量重扫所有会话（旧版每次操作要重新请求 N 个会话）；模型 / Agent 目录等只在首次打开表单时拉取一次
- **新建任务**：分段式触发方式（延迟 / 定时 / 间隔 / Cron）+ 图标化切换，时间与 Cron 均有常用预设；实时展示「接下来」触发时间与一次性/重复说明，可选最多触发次数；宽容器（弹窗/设置页）下自动折成双栏——左侧触发、右侧提示词与高级选项——把弹窗的宽度用起来，默认不滚动；窄容器回退单栏
- **表单体验**：任务名为标题式输入，Provider / 模型 / Agent / 目录收进高级选项双列面板；底部操作栏吸底并显示是否能创建与首次触发时间（倒计时实时刷新），支持 ⌘/Ctrl + Enter 提交、Esc 逐级退出（收起高级面板 → 返回列表，返回前若表单已填写会出现**内联确认条**，不再弹原生 confirm）；模型选择支持搜索、清除与 Home/End 快速定位
- **选择模型**：高级选项里按「Provider → 模型」级联选择，两级都支持关键字搜索，重名模型会带上所属 Provider / 模型 ID 便于区分，并可选模型变体；留空则跟随会话默认模型
- **管理操作**：暂停 / 恢复 / 删除（删除需二次确认，防误触），展开卡片查看详情（绑定会话、模型、Agent、执行目录、提示词、触发次数、上次输出、创建时间）；详情里的内容可自由选中复制，模型 / 目录 / 提示词 / 会话 / 输出还提供一键复制；任务列表支持按状态筛选与关键字搜索
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

- **数据源**：`client.experimental.schedule.{list,create,pause,resume,delete}`（官方 client SDK）。API 的 `list` 按会话过滤且必填 `sessionID`，因此面板分页扫全部会话后逐会话聚合，按「进行中 → 已暂停 → 已结束、下次触发时间」排序。模型 / Agent / 目录不在 schedule 上而是挂在绑定会话上，列表每次加载会刷新会话缓存，从会话读取这些高级选项展示在卡片上。
- **挂载会话**：任务必须绑定真实会话；新建任务时自动创建一个专用会话（标题「定时任务：xxx」）作为唤醒目标，创建失败会回滚删除该会话。
- **模型选择**：`model.list` 拉取 chat 模型后按 `providerID` 分组，Provider 名称取自 `provider.list`；创建会话时把 `{ providerID, id, variant }` 传给 `session.create`，若宿主返回的会话模型与所选不一致，再调用 `session.switchModel` 兜底，确保任务按所选模型唤醒。
- **cron 预览**：内置 5 字段 cron 解析器（支持 `*/n`、区间、逗号、星期日的 0/7 双写法、dom/dow 标准 OR 语义），用于格式校验、人性化描述（「工作日 09:00」）和未来触发时间预览。
- **构建**：`@opencode/plugin/gui/vite` preset 产出单文件 CommonJS 到 `dist/gui-experimental.cjs`；`solid-js` 与 `@opencode/plugin/gui` 由宿主提供，不打包。

## 已知限制

- 定时任务 API 本身是实验性的（`/api/experimental/schedule`），OpenCode 小版本升级可能变动
- 定时触发依赖 OpenCode 后台服务存活；机器休眠或服务退出时任务不会触发
- 暂无「立即运行」按钮（API 未提供该操作）
- 暂不支持编辑已创建的任务：API 只有 create/list/get/pause/resume/delete，没有 update；如需改配置目前只能删除后重建

## License

MIT
