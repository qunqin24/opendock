# OpenCode Schedule Center（定时任务）

OpenCode Desktop 的 GUI 插件：可视化查看、创建、暂停、恢复和删除实验性定时任务（Automation）。

> **版本提示**：本插件从 **0.2.0** 起接入 OpenCode 2.3.2 的官方 **Automation API**。OpenCode 2.3.2 对实验性 API 做了**破坏性更新**（旧的 Schedule API 已被移除）。请按下方[版本兼容](#版本兼容必读)选择插件版本；升级前请阅读[数据迁移说明](#数据迁移说明必读)。

## 版本兼容（必读）

OpenCode 在 **2.3.2** 删除了旧的 `/api/experimental/schedule`，改为 `/api/experimental/automation`。两套 API 不兼容，插件版本必须与你本地 OpenCode 的版本匹配：

| 你的 OpenCode 版本 | 应使用的插件版本 | 底层 API |
|---|---|---|
| **2.3.2 及以上** | **0.2.0 及以上**（本版） | `experimental.automation` |
| 2.3.2 之前（如 2.2.5） | **0.1.x**（旧版，请锁定版本安装） | `experimental.schedule` |

- 这里的“OpenCode 版本”指你实际运行的 **Desktop CLI / `@opencode/*` 包版本**（如 `2.3.2`），不是 GitHub Release 的 tag。可在 OpenCode 的“关于”或 CLI 版本信息中查看。
- **如果你是 2.3.2 之前的老版本，请继续用 0.1.x，不要升级到本版**；反之，升级到 2.3.2 之后必须换到 0.2.0+，否则旧插件会因调用已删除的 `schedule.list()` 而报 `Cannot read properties of undefined (reading 'list')`。
- 两个版本不会互相降级安装。若升级后想回退，需要同时回退 OpenCode 与插件到上表对应的版本。

## 数据迁移说明（必读）

- 历史定时任务的迁移由 **OpenCode 宿主在数据库层自动完成**，且**不可逆**（宿主会删除旧的 `schedule` 表）。本插件**不参与、也不提供任何数据迁移**：它只按官方 Automation API 呈现、创建和管理任务，不会扫描旧任务、不会重建，也不会尝试恢复被丢弃的数据。
- **部分历史数据不会被迁移**。下列旧任务会被宿主在迁移时**直接丢弃**，升级后将不再可见，且无法由本插件找回：

  | 旧任务类型 | 迁移结果 |
  |---|---|
  | 设置了 `if` / `until` 运行条件（门禁）的任务 | 丢弃 |
  | 设置了“运行 N 次后结束”（`ends.times`）的任务 | 丢弃 |
  | 已结束（`done`）的任务 | 丢弃 |
  | 没有明确下次触发时间的任务 | 丢弃 |
  | 其余（进行中/已暂停、无条件、无次数限制、有下次触发时间） | 自动迁移为 Automation |

- 迁移由宿主自动触发，插件不提供迁移状态检查，也不保证迁移时机。**如果你有需要保留的旧任务，请在升级 OpenCode 前自行导出/记录**（尤其是带条件或次数限制的任务）。
- 新 API **不再支持**运行条件门禁（`if`/`until`）和运行次数上限；本插件已移除相关界面与入参，不再向官方接口提交这些字段。

## 功能

- **全局任务列表**：一次读取当前可见的全部 Automation，无需遍历会话；默认展示全部任务，状态徽章（进行中 / 已暂停 / 已结束）、下次触发倒计时、上次触发结果与输出。任务数较多时出现搜索框，可按名称 / 内容即时过滤。
- **操作即时生效**：暂停 / 恢复 / 删除只发一次请求并本地更新该卡片，不做全量重扫；删除需二次确认，只删任务、不删会话。
- **任务类型**：完整保留官方两种动作——提示词（prompt）与代码（code）；代码任务明确标注为「代码」，绝不与提示词混淆。
- **新建任务**：分段式触发方式（延迟 / 定时 / 间隔 / Cron），时间与 Cron 均有常用预设；可设置时区（IANA 名称，如 `Asia/Shanghai`）与按时间结束；高级选项可配置模型 / Agent / 执行目录。界面标注的“预计触发时间”仅供参考，权威时间以官方 `nextDueAt` 为准。
- **选择模型 / Agent**：按「Provider → 模型」级联选择，两级均支持搜索；留空则跟随会话默认。
- **详情与复制**：展开卡片可看完整信息（绑定会话、模型、Agent、目录、触发方式、提示词 / 代码、结束时间、触发次数、上次输出、创建 / 更新时间），内容可自由选中并一键复制。
- **弹窗**：设置页与独立弹窗复用同一套界面；弹窗尺寸更大，可拖拽边缘调整。
- **入口**：设置页（Settings → 定时任务）、标题栏「定时任务」按钮、命令面板 ⌘⇧P 搜「定时任务」、快捷键 ⌘⌥S。
- **可访问性**：尊重系统的「减弱动态效果」（`prefers-reduced-motion`）。

## 前置条件

1. **OpenCode Desktop 2.3.2 及以上**（GUI 插件 API 为桌面端专属）。
2. 开启实验性 Automation 开关，在全局配置 `~/.config/opencode/opencode.json` 中：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "experimental": {
    "automations": true
  }
}
```

> 旧配置 `experimental.schedules` 已废弃，不再生效。事件（event）触发器还需额外开启 `experimental.mcp_events`，且本插件只能展示、不能创建事件触发的任务。

3. 安装插件（本地路径方式）——在 `opencode.json` 的 `plugins` 中加入：

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
npm version minor  # 或 patch / major：自动改版本、提交并打 v* tag
git push --follow-tags origin main
```

CI 会校验 tag 与 `package.json` 版本一致、且 tag 指向已合并进 `main` 的提交，随后构建并发布到 npm。

> 本包在 npm 侧开启了 staged publishing：OIDC 信任发布后版本会在暂存区停留约 3–5 分钟才转正到 `latest`，属正常现象；如需即时上架，可在 npm 包设置中关闭 staged publishing 或改用 `NPM_TOKEN` 直发。

## 实现说明

- **官方 API**：底层为 `client.experimental.automation.{list,create,get,pause,resume,delete}`（`@opencode/client` 2.3.2，Experimental）。类型直接复用官方 `AutomationInfo` / `AutomationAction` 等，不做本地镜像；代码动作原样保留，不降级为提示词。
- **职责边界**：官方负责调度、执行与持久化；插件不内置调度器、不自算触发时间、不维护本地任务库、不伪造执行历史，也不承担任何数据迁移职责。
- **数据读取**：`automation.list()` 零参数即可枚举全部可见任务；会话（session）只用于补充展示模型 / Agent / 执行目录等元数据。
- **会话语义**：创建者 `sessionID` 与执行目标 `action.to.session` / `subagent` 是两个不同概念，分别对应“谁创建”和“执行到哪里”，不可混用。
- **结束条件**：界面上的“按时间结束”折算为官方 `expires`（重复任务的停止时间点）；新 API 没有运行次数上限字段，故不再提供该能力。
- **cron 预览**：内置 5 字段 cron 解析器，仅用于输入提示与参考预览（标注“仅供参考”），本地校验不作为创建门禁，创建结果以官方接口响应为准。
- **构建**：`@opencode/plugin/gui/vite` preset 产出单文件 CommonJS 到 `dist/gui-experimental.cjs`；`solid-js` 与 `@opencode/plugin/gui` 由宿主提供，不打包。

## 已知限制

- Automation API 仍是实验性接口，OpenCode 后续小版本仍可能变动，请留意版本兼容表。
- 事件（event）触发的任务只能展示，不能从本插件创建（官方要求从工具调用中创建）。
- 不支持运行条件（if/until）与运行次数上限——官方新 API 已移除这些能力。
- 暂不支持编辑已创建的任务：官方 API 没有 update，如需改配置只能删除后重建。
- 定时触发依赖 OpenCode 后台服务存活；机器休眠或服务退出时任务不会触发。
- 暂无「立即运行」按钮（API 未提供该操作）。

## License

MIT
