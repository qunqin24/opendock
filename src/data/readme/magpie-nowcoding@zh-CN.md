# NowCoding

[English](README.md) · [简体中文](README_zh.md) · [NowCoding Cloud](https://nowcoding.cc)

NowCoding 读取本机 AI 编程工具的用量，展示 Token、估算费用、常用模型和连续活跃天数，并生成公开主页、GitHub SVG 卡片和社交分享图片。

[![tianpeng-dev 的 NowCoding 活动卡片](https://nowcoding.cc/u/tianpeng-dev/card.svg?v=20261120)](https://nowcoding.cc/u/tianpeng-dev)

## 快速开始

### Magpie

1. 使用 Magpie 0.1.4079 或更高版本，在终端执行下方命令安装 NowCoding。
2. 打开侧栏的 **NowCoding**，选择允许读取的工具并保存，即可查看本机用量。
3. 如需创建公开主页，打开「同步与设备」，用 GitHub 登录，再同步选中的工具。

```sh
magpie plugin add npm:magpie-nowcoding
```

### 命令行

使用 Node.js 20 或更高版本安装 CLI。在浏览器中完成 GitHub 登录后，执行同步。

```sh
npm install -g nowcoding
nowcoding login
nowcoding sync
```

用 `nowcoding sync --watch` 可以持续同步。macOS 和 Linux 也可安装后台服务。[命令行使用说明](apps/cli/README_zh.md)

## 分享编程活动

在 `https://nowcoding.cc/u/你的GitHub用户名` 查看公开主页，了解近期活动、每日用量、连续活跃天数和年度热力图。

- **GitHub README** · 从公开主页复制 Markdown，或使用下方示例。将 `YOUR_GITHUB_USERNAME` 替换成你的 GitHub 用户名。点击卡片可打开 NowCoding 仓库。
- **社交媒体** · 分享公开主页链接以生成预览，或下载 PNG 图片后发布。
- **卡片样式** · 用自己的公开用量预览社区样式，并分享选中的样式。[浏览卡片样式](https://nowcoding.cc/cards)
- **徽章** · 可嵌入 `/u/YOUR_GITHUB_USERNAME/badge/streak.svg`，也可使用 `today`、`week`、`total`、`model` 或 `live`。

```md
[![NowCoding 活动](https://nowcoding.cc/u/YOUR_GITHUB_USERNAME/card.svg)](https://github.com/tianpeng-dev/nowcoding)
```

GitHub 会缓存 README 图片，卡片的刷新时间可能晚于公开主页。

## 支持的工具与隐私

支持 Claude Code、Codex、Gemini CLI、GitHub Copilot CLI、OpenCode 等有本地用量记录的工具。[完整工具清单与日志格式](docs/parsers.md)

Magpie 面板可在本机查看用量。启用同步时，NowCoding 上传用量汇总和基于哈希的会话统计。提示词、回复、源码和凭据保留在本机。项目名与主机名按隐私设置处理，公开排行榜可自行选择是否加入。[Cloud 与设备授权](docs/cloud.md) · [安全说明](SECURITY.md)

## 自托管

使用 `apps/web` 和 Postgres 部署单用户实例。配置 `DATABASE_URL`、`NOWCODING_USERNAME`、`NOWCODING_API_TOKEN` 和 `CRON_SECRET`，再初始化数据库。[部署指南](docs/deploy.md) · [环境变量](docs/env.md)

安装 CLI 后，生成用于上传数据的令牌，将它填入服务配置，再通过 CLI 连接并同步。

```sh
nowcoding gen-token
nowcoding init --endpoint https://your-nowcoding.example
nowcoding sync
```

打开实例的 `/setup` 检查部署状态。主页位于 `/`，卡片位于 `/card.svg`，徽章位于 `/badge/`。

## 开发与贡献

使用 Node.js 20 或更高版本及 pnpm 9。

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
```

- `apps/magpie-plugin` · Magpie 面板和本机服务。[插件开发说明](apps/magpie-plugin/README.md)
- `apps/cli` · 命令行和后台同步。`packages/collector` 和 `packages/parsers` 负责数据采集。
- `apps/cloud` · 托管主页、账号和设备。[Cloud 部署说明](docs/cloud-deploy.md)
- `apps/web` · 单用户 Web 应用。[本地验证说明](docs/local-dev.md)

提交 PR 请参阅[贡献指南](CONTRIBUTING.md)。漏洞报告方式见[安全说明](SECURITY.md)。

## 许可证

[MIT](LICENSE)。项目致谢见 [NOTICE](NOTICE)。
