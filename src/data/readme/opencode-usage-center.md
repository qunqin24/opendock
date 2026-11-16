# 模型用量 · opencode-usage-center

给 OpenCode Desktop 的本地用量面板：**Token、费用、成本归因、OpenCode Go 额度、凭据时效、响应时延和会话回放**。

![设计草图](design/sketch.png)

> npm 最新发布版 **`0.3.2`**（2026-11-15 发布）：会话回放真分页、长会话性能与生命周期可靠性。变更清单见 [CHANGELOG.md](CHANGELOG.md)。数字来自本机真实数据库快照，界面会随本机数据变化。完整版本历史见 [ROADMAP.md](ROADMAP.md)。

## 功能

- **总览**：有效 Token、估算费用、请求数、缓存命中率、30 天趋势、费用构成、成本归因（agent / 项目）与费用异常提示
- **模型分布**：按有效 Token 排序，显示占比、请求数、费用；点模型行直接跳到按该模型筛选的会话列表
- **凭据与额度**：一个页签管完所有供应商——卡片按集成展示登录状态、多账号、凭据有效期，有订阅额度的卡内嵌各窗口用量 meters 并默认展开（未登录的靠后）；OAuth 一键登录、API Key 管理、启用/删除凭据，实时跟随服务端事件刷新
- **模型浏览**：按 provider 分组的全部可用模型；当前时间范围常用区（真实请求次数）、上下文/价格/用量一览、本地隐藏标记（仅本地偏好）
- **时延**：首字 P50/P95、按模型 P95 对比、慢请求比例、输出 tok/s、样本明细、模型效率散点对比（成本 × P95 × 用量）
- **会话明细**：最多 500 条，支持搜索、项目 / 模型 / 日期组合筛选和 CSV 导出
- **会话回放**：点击任一会话，按回合查看用户提示、每次模型请求、思考 / 回复、工具调用输入输出、缓存命中、首字 / 总时延和费用；费用瀑布按回合定位高消耗；长会话分页懒加载
- **会话内搜索**：按提示词、模型、工具名或输出过滤回合并自动展开前几个命中；工具输入 / 输出与思考过程一键复制（截断内容明确标注）；结构化 JSON 导出（脱敏开关默认开）与 CSV 导出
- **缓存拆解**：每个会话和每次请求都显示缓存读取、缓存写入、未缓存输入、命中率，以及按回合的 Token 节奏
- **范围筛选**：全部项目 / 当前项目 / 指定项目；今日 / 7 天 / 30 天 / 全部
- **独立弹窗**：顶栏「用量」或 `⌥U` 打开，可拖动调整大小，弹窗内可跳转设置页
- **顶栏布局**：左侧标签布局下，插件图标改为横排并显示文字（同时影响插件中心的图标）
- **实时刷新**：`session.usage.updated` 等事件触发刷新，60 秒兜底轮询
- **本地优先**：数据库只读，不上传会话内容；额度请求只发往对应供应商自己的接口

## 安装

发布到 npm 后：

```json
{
  "plugins": ["opencode-usage-center@0.3.2"]
}
```

本地开发（先 `npm run build`，保留 `dist/`）：

```json
{
  "plugins": ["/Users/you/path/to/opencode-usage-center"]
}
```

已在 **OpenCode Desktop 2.2.5 / plugin API 2.2.5** 验证。数据库结构属于内部格式，升级后如果字段变化，页面会显示只读错误，不会影响 OpenCode 本身。

重启 OpenCode 后：

- 顶栏「用量」胶囊 / 快捷键 `⌥U` → 独立弹窗
- 设置 → 模型用量 → 完整页面

## 数据来源

| 数据 | 来源 |
| --- | --- |
| 总量 / 趋势 / 模型 / 时延 | 本机 `~/.local/share/opencode/opencode.db`，只读查询 `session_message` + `session_v2`；时延按模型聚合 |
| 会话回合 / 工具调用 | 按需读取单个会话的 `session_message`，解析 `content` 中的 `text`、`reasoning`、`tool`；输入输出只在界面预览，不回传服务器 |
| OpenCode Go 额度 | `https://opencode.ai/zen/go/v1/usage`，使用本机 `opencode-go` 凭据 |
| Trae CN 额度 | `https://api.trae.cn/trae/api/v2/pay/ide_user_ent_usage`，使用 `trae-cn` / `trae-cn-ent` 凭据里的 Cloud-IDE-JWT（企业租户不暴露额度明细，显示说明） |
| Qoder CN 额度 | `https://openapi.qoder.com.cn/sash/api/v2/me/usage`，使用 `qoder` 凭据里的设备令牌 |
| 凭据到期 | 本机 `credential` 表（只读），RPC 返回类型、`integration_id` 与到期时间，不返回密钥；GUI 的登录状态以此为准，host API 只负责登录/删除/启用等写操作 |
| 实时更新 | `session.usage.updated` / `session.execution.*` 事件 |

性能：

- 总量、趋势、模型、时延按天聚合，历史天复用落盘聚合、只有当天现算，分批合并控制内存峰值；本机 5.4 万条 assistant 消息下，30 天约 0.3 秒，全部约 1 秒。
- 内存缓存 60 秒；重复打开设置页/弹窗先显示上次快照，再在后台静默刷新。
- 额度接口独立加载，最多 8 秒超时也不会阻塞本地用量快照。
- 首次读取没有缓存时显示骨架屏，不阻塞页面结构。
- 会话回放按需查询，只读取目标会话；默认一次返回最近 60 个回合，长会话可继续加载更早回合，单会话解析约 30 毫秒。
- 会话详情打开后 2 分钟内复用缓存，手动「刷新」强制更新；缓存最多保留 4 个会话。
- 工具输入 / 输出和思考过程有预览上限，避免超大 shell 输出拖慢渲染；完整内容仍保留在本机数据库。

指标定义：

- **有效 Token** = `input + output`，不包含 cache read/write
- 会话列表里的 Token / 费用按当前时间范围聚合；打开会话回放后显示该会话的完整历史
- **缓存命中率** = `cache.read / (cache.read + input)`
- **首字时延** = `time.streamed - time.created`
- **输出速度** = `output / 总时延`
- **慢请求** = 总时延 > 30 秒

页内入口：独立弹窗 / 设置页页脚的「指标口径」按钮可展开以上定义（随版本更新）。

## 权限与隐私

- 数据库以只读方式打开。
- 密钥只在服务端读取，用于请求额度接口；不进入渲染进程、不写日志、不显示在界面。
- 会话回放只在本地读取并展示；提示词、回复和工具输出不写日志、不上传，且只在打开会话时按需读取。
- 会话标题和内容只在本地页面展示；CSV 导出由本地浏览器完成，不上传；云同步经评估决定不做（见 ROADMAP）。

## 开发

```bash
npm install
npm run typecheck
npm run build
npm run test:data    # 用本机数据库验证查询
npm run test:plugin  # 检查 RPC 输出与 Schema 编码
```

目录：

```text
src/index.ts          服务端插件：只读 DB + Go 额度 RPC
src/contract.ts       RPC 契约（Standard Schema）
src/server/store.ts   查询、聚合、时延分位、凭据
src/gui.tsx           SettingsPage / TitlebarItem / Command
src/gui/page.tsx      页面与图表
src/gui/session-detail.tsx  会话回放 / 工具调用 / 缓存分析
design/               设计草图和说明
preview/              本地渲染预览（不发布）
```

## Roadmap

详细版本规划见 [ROADMAP.md](ROADMAP.md)。概要：

- **0.3.x 稳定化**（已完成）：凭据与额度合并、数据源统一、DB 兼容检测与降级、口径说明、会话组合筛选、告警冷却、回放复制、性能基线
- **0.3.2**（2026-11-15 已发布）：会话回放真分页（服务端 seq 游标、首屏只读当前页、10k 回合 167 页全链 < 0.5s）、长会话性能（汇总缓存，翻页不重复汇总）、生命周期可靠性（16 组请求竞态修复：切换 / 刷新乱序 / loadMore 并发 / Revert / Delete / 卸载）、成本归因（agent × 项目）与费用瀑布、模型效率散点对比、费用异常检测、结构化 JSON 导出 + 脱敏开关、主题变量化与键盘导航——原 0.5 / 1.0 规划内容随本版一并交付
- ~~0.4 监控闭环~~（暂不做：额度历史、预算、限流 hook 收益不足，决策记录见 ROADMAP；未经重新评估不恢复）
- 下一阶段（0.3.3 及以后）：**待规划**，功能目标与发布日期均未确定

## 发布

> 本地 `npm publish` 已被 `prepublishOnly` 守卫禁止；版本只通过推送 `v*` tag 由 GitHub Actions 发布（`.github/workflows/publish.yml`）。

发布流程（包已在 npm 上，走 Trusted Publishing）：

1. 发布决策确认后，把 `package.json` 与 `package-lock.json` 的根版本**同步**更新为目标版本（如 `0.3.3`；`npm version 0.3.3` 一步完成两处并自动建 tag），并核对 [CHANGELOG.md](CHANGELOG.md) 已有对应条目；
2. 提交并推送 tag：

```bash
git push origin main
git push origin v0.3.3
```

3. `publish.yml` 自动执行：校验 tag 与 `package.json` 版本一致 → `npm ci` → typecheck → build → `npm publish --access public --provenance`；
4. 发布后在 npm 包页面确认 provenance 徽标（0.3.1 起已验证 OIDC Trusted Publishing 链路实际生效，0.3.2 同路径发布成功）。

说明：npm 的 Trusted Publisher 要求包存在后才能配置；本包首个版本（0.1.0）已于 2026-11-08 手动发布完成，此限制已成历史，不再需要本地或令牌发布。

## License

MIT
