# OpenCode Schedule Center（定时任务）

OpenCode Desktop 的 GUI 插件：可视化查看、创建、暂停、恢复和删除实验性定时任务（`experimental.schedules`）。

## 功能

- **任务列表**：扫描全部会话，聚合并展示所有定时任务；状态徽章（进行中/已暂停/已结束）、下次触发倒计时（每秒刷新）、上次触发结果（已触发/延迟/失败…）
- **新建任务**：四种触发方式（延迟 `in` / 定时 `at` / 间隔 `every` / cron 表达式），实时校验 cron 格式、预览未来 5 次触发时间、可选最多触发次数
- **管理操作**：暂停 / 恢复 / 删除，展开卡片查看详情（绑定会话、提示词、触发次数、创建时间）
- **入口**：设置页（Settings → 定时任务）、标题栏「定时任务」按钮、命令面板 ⌘⇧P 搜「定时任务」、快捷键 ⌘⌥S

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

## 实现说明

- **数据源**：`client.experimental.schedule.{list,create,pause,resume,delete}`（官方 client SDK）。API 的 `list` 按会话过滤且必填 `sessionID`，因此面板分页扫全部会话后逐会话聚合，按「进行中 → 已暂停 → 已结束、下次触发时间」排序。
- **挂载会话**：任务必须绑定真实会话；新建任务时自动创建一个专用会话（标题「定时任务：xxx」）作为唤醒目标，创建失败会回滚删除该会话。
- **cron 预览**：内置 5 字段 cron 解析器（支持 `*/n`、区间、逗号、星期日的 0/7 双写法、dom/dow 标准 OR 语义），用于格式校验、人性化描述（「工作日 09:00」）和未来触发时间预览。
- **构建**：`@opencode/plugin/gui/vite` preset 产出单文件 CommonJS 到 `dist/gui-experimental.cjs`；`solid-js` 与 `@opencode/plugin/gui` 由宿主提供，不打包。

## 已知限制

- 定时任务 API 本身是实验性的（`/api/experimental/schedule`），OpenCode 小版本升级可能变动
- 定时触发依赖 OpenCode 后台服务存活；机器休眠或服务退出时任务不会触发
- 暂无「立即运行」按钮（API 未提供该操作）

## License

MIT
