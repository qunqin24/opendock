# OpenDock

opencode 插件目录与排行榜。自动收录、自动排名、自动更新 —— 没有需要人工维护的列表。

## 它解决什么问题

现有的 opencode 插件发现方式都是人工维护的 awesome-list：更新滞后、无法比较、看不出哪些已经废弃。
OpenDock 每天从 npm 与 GitHub 重新抓取全量数据，给出多维度排名和明确的健康度提示。

- **1400+ 插件**，来源是 npm 上带 `opencode-plugin` 关键词的全部包
- **五个排行榜** —— 综合评分、星标、本周飙升、下载量、最新收录
- **健康度徽章** —— 已归档 / 半年未更新 / 缺少文档 / 无协议
- **一键安装配置** —— 每个详情页提供可复制的 `opencode.json` 片段
- **纯静态** —— 无后端、无数据库、无追踪

## 技术栈

| | |
|---|---|
| 框架 | Astro 7（静态输出 + ClientRouter 软导航） |
| 交互 | React 19 island（仅 `/plugins` 与分类页的搜索筛选水合） |
| 样式 | Tailwind CSS v4 + shadcn/ui 设计令牌 |
| 搜索 | Fuse.js —— 页内筛选，以及全站 ⌘K 命令面板（索引按需加载） |
| 部署 | Vercel |
| 数据刷新 | GitHub Actions 每日 cron |

## 本地开发

```bash
pnpm install
```

数据快照已提交在仓库里，所以可以直接起服务：

```bash
pnpm dev
```

需要重新抓数据时（完整跑一次约 10–20 分钟）：

```bash
pnpm data
```

只想快速验证管线，抓 120 个包就够了：

```bash
pnpm data:dev
```

抓取结果会缓存在 `.cache/`（20 小时过期），所以中断后重跑只补缺失的部分。
想强制全量重抓加 `--fresh`。

抓取脚本需要 GitHub token 才能用 GraphQL API。本地会自动读取 `gh auth token`，
CI 里用 `GITHUB_TOKEN`。没装 `gh` 的话手动导出即可：

```bash
export GITHUB_TOKEN=ghp_xxx
```

## 目录结构

```
scripts/
  fetch-plugins.mjs      抓取管线入口
  lib/categories.mjs     分类规则（改这里调整分类）
  lib/score.mjs          评分算法与健康度判定
  lib/http.mjs           带重试的 fetch / GraphQL / 并发控制
data/
  curated.json           人工层：精选、黑名单、分类覆盖
  history.json           每日星标快照，用于计算增长（自动生成）
src/
  data/plugins.json      生成的数据集（自动生成）
  data/readme/*.md       各插件 README（自动生成，独立文件避免拖慢构建）
  lib/plugins.ts         类型定义 + 排序视图
  lib/readme.ts          README 渲染与消毒
  components/            UI 组件
  pages/                 路由
```

## 调整数据

改分类规则 → `scripts/lib/categories.mjs`
改排名权重 → `scripts/lib/score.mjs`
精选 / 拉黑 / 手动修正某个包 → `data/curated.json`

```jsonc
{
  "featured": ["oh-my-opencode-slim"],   // 首页精选
  "include": ["some-package"],           // 强制收录（即使没有关键词）
  "blocklist": ["spam-package"],         // 永久排除
  "overrides": {                          // 覆盖自动推断的字段
    "some-package": { "category": "memory", "title": "更好的名字" }
  }
}
```

改完重跑 `pnpm data`。

## 部署

推到 GitHub 后在 Vercel 导入即可，框架会被自动识别为 Astro。
唯一需要改的是 `astro.config.mjs` 里的 `site` 字段 —— canonical URL、sitemap 和 RSS 都由它派生。

数据刷新走 `.github/workflows/refresh.yml`：每天 03:00 UTC 重新抓取、验证构建、提交快照，
提交本身会触发 Vercel 重新部署。

## 已知偏差

- **monorepo 星标继承** —— 发布自大型 monorepo 的包会继承整个仓库的星标，数字虚高
- **飙升榜需要历史** —— 增长指标靠对比每日快照，刚上线时是空的
- **只覆盖 npm** —— 纯本地插件无法被自动发现

详见站内 `/about` 页。

## 协议

[MIT](LICENSE)。

`src/data/` 下的数据快照来自 npm 与 GitHub 的公开元数据，各插件的 README 与代码
版权归其各自作者所有。

---

与 opencode 官方无隶属关系。
