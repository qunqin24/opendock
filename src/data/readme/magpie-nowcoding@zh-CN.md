# NowCoding

[English](README.md) | [简体中文](README_zh.md)

NowCoding 展示开发者此刻正在用 AI 创作什么，并把这种实时状态变成主页、README 卡片、徽章和可传播的社交证明。

NowCoding 会从本地 AI 编程工具中采集 token 使用数据，聚合成按天统计的
token、成本、活跃状态、streak 和模型分布，并生成可嵌入 GitHub README 的
SVG 卡片与徽章。你可以直接使用官方 Cloud，也可以自托管开源 Web 服务。

<a href="https://nowcoding.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://nowcoding.vercel.app/card.svg?theme=dark" />
    <img src="https://nowcoding.vercel.app/card.svg" alt="NowCoding activity card" width="800" />
  </picture>
</a>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding&env=NOWCODING_USERNAME,NOWCODING_API_TOKEN,CRON_SECRET&envDescription=Set%20your%20public%20NowCoding%20username%2C%20paste%20a%20secret%20token%20from%20%60npx%20nowcoding%20gen-token%60%2C%20and%20add%20a%20strong%20random%20cron%20secret.&envLink=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding%2Fblob%2Fmain%2Fdocs%2Fenv.md&project-name=nowcoding&repository-name=nowcoding)

## 安装 Magpie 插件

在 Magpie 0.1.4079 或更高版本的插件安装框中输入 `magpie-nowcoding`，也可以通过命令行安装。

```sh
magpie plugin add npm:magpie-nowcoding
```

打开 Magpie 侧栏中的 NowCoding，选择允许读取的工具即可查看本机用量。如需同步，在「同步与设备」中选择「使用 GitHub 登录」。[插件开发说明](apps/magpie-plugin/README.md)

## 能展示什么

- 今日、最近 7 天、最近 30 天和总计 token。
- 基于模型价格表估算的成本。
- 当前是否正在 coding，以及最近同步时间。
- 连续活跃天数 streak 和年度热力图。
- 常用模型、工具来源和 token 分布。
- GitHub README 可用的 SVG 卡片和徽章。

## 官方 Cloud

如果你不想搭建服务器，V2 推荐走官方 Cloud：

```bash
npm install -g nowcoding
nowcoding login
nowcoding daemon install
nowcoding daemon start
nowcoding status
```

官方 Cloud 计划使用 `https://nowcoding.cc`：

- `https://nowcoding.cc`：产品首页、登录和账号入口。
- `https://nowcoding.cc/u/<username>`：官方公开主页。
- `https://nowcoding.cc/u/<username>/card.svg`：README SVG 卡片。
- `https://nowcoding.cc/u/<username>/badge/<type>.svg`：SVG 徽章。
- `https://nowcoding.cc/leaderboard`：可选加入的公开排行榜。

`nowcoding login` 会打开 GitHub OAuth，并用受限的 NowCoding device token
把本机 CLI 绑定到你的 Cloud 账号。正常路径中，OAuth 成功后 CLI 应直接登录成功；
只有风险异常或公开字段授权变化时才需要额外确认。Arena 排行榜是独立 opt-in 状态：
你可以使用官方 profile/card/badge，但不加入排行榜。

## 自托管部署

自托管版本是完整开源产品，适合想自己持有数据库和部署环境的用户。

要求：

- Node.js 20 或更高版本。
- pnpm 9 或更高版本。
- Vercel 项目。
- Supabase Postgres 或其他标准 Postgres 数据库。

从 GitHub 源码验证：

```bash
git clone https://github.com/tianpeng-dev/nowcoding.git
cd nowcoding
corepack enable
pnpm install
pnpm --filter nowcoding build
node apps/cli/bin/nowcoding.js --help
```

生成 ingest token：

```bash
npx nowcoding gen-token
```

部署 Web 服务后设置环境变量：

```text
NOWCODING_USERNAME=peng
NOWCODING_API_TOKEN=<gen-token 生成的 token>
CRON_SECRET=<强随机 secret>
DATABASE_URL=<Supabase pooler 或标准 Postgres 连接串>
```

推送数据库 schema：

```bash
DATABASE_URL='<Postgres connection string>' pnpm db:push
```

连接本地 CLI：

```bash
npx nowcoding init --endpoint https://your-name.vercel.app
npx nowcoding sync
```

持续同步可以使用 watch 或 daemon：

```bash
npx nowcoding sync --watch
```

```bash
npm install -g nowcoding
nowcoding daemon install
nowcoding daemon start
nowcoding status
```

更完整的部署说明见 [docs/deploy.md](docs/deploy.md) 和
[docs/env.md](docs/env.md)。

## 嵌入 GitHub README

示例卡片：

```md
<a href="https://nowcoding.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://nowcoding.vercel.app/card.svg?theme=dark" />
    <img src="https://nowcoding.vercel.app/card.svg" alt="NowCoding activity" />
  </picture>
</a>
```

示例徽章：

```md
![Today](https://nowcoding.vercel.app/badge/today.svg)
![Week](https://nowcoding.vercel.app/badge/week.svg)
![Streak](https://nowcoding.vercel.app/badge/streak.svg)
![Live](https://nowcoding.vercel.app/badge/live.svg)
```

替换为你的官方 Cloud profile URL 或自托管 Vercel URL 即可。

## 支持的工具

NowCoding 当前注册 18 个 parser 来源。

已实现专用解析的来源：

```text
claude-code, codex, gemini-cli, github-copilot-cli, opencode, openclaw,
pi, qwen-code, kimi-code, amp, droid, hermes, kiro, cline, roo-code,
antigravity
```

明确禁用：

```text
cursor, windsurf
```

Cursor 和 Windsurf 已注册，但在本地数据格式足够稳定和安全前不会默认解析。
当前 parser 矩阵见 [docs/parsers.md](docs/parsers.md)。

## 隐私模型

NowCoding 默认采用 fail-closed 隐私模型：

- 不上传 prompt。
- 不上传 completion。
- 不上传源码、原始日志、API key 或 provider credential。
- 项目名默认隐藏。
- hostname 默认用于多设备去重，可在本地关闭。
- session 使用 hash，不保存原始本地 session id。
- 自托管 ingest API 必须使用 `NOWCODING_API_TOKEN`。

详见 [SECURITY.md](SECURITY.md)。

## OSS、Cloud 和 Arena 边界

公共 `nowcoding` 仓库包含：

- CLI、parser、本地 daemon、诊断、隐私裁剪和上传客户端。
- 自托管 Web、ingest API、profile、SVG card、badge、heatmap 和 JSON endpoint。
- shared schema、成本估算、公开渲染组件和自托管部署文档。

同一公开仓库中的 `apps/cloud` 提供以下功能：

- GitHub OAuth、官方账号、全局 username、device token。
- `https://nowcoding.cc` 官方 profile/card/badge 服务。
- Arena 排行榜、反作弊、审核后台、团队和未来计费。

自托管模式不会连接官方 Cloud 或 Arena，除非你明确运行 `nowcoding login`
或 `nowcoding arena connect`。

## 开发

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @nowcoding/web build
```

本地验证流程见 [docs/local-dev.md](docs/local-dev.md)。

## License

MIT。项目思路参考了
[vibe-usage](https://github.com/peeerdat/vibe-usage)，详见 [NOTICE](NOTICE)。
