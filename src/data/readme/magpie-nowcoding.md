# NowCoding

[English](README.md) · [简体中文](README_zh.md) · [NowCoding Cloud](https://nowcoding.cc)

NowCoding reads usage from your local AI coding tools and turns it into a public profile, an SVG card for GitHub, and an image for social sharing. Track tokens, estimated cost, top models, and coding streaks.

[![Live NowCoding activity card for tianpeng-dev](https://nowcoding.cc/u/tianpeng-dev/card.svg?v=20261120)](https://nowcoding.cc/u/tianpeng-dev)

## Get started

### Magpie

1. Install NowCoding in Magpie 0.1.4079 or later with the command below.
2. Open **NowCoding** in the sidebar. Select the tools you want to read and save your selection to see local usage.
3. To publish a profile, open **Sync & Devices** (同步与设备), sign in with GitHub, and sync the selected tools.

```sh
magpie plugin add npm:magpie-nowcoding
```

### Command line

Install the CLI with Node.js 20 or later. Sign in with GitHub when the browser opens, then sync your usage.

```sh
npm install -g nowcoding
nowcoding login
nowcoding sync
```

The CLI also supports continuous sync with `nowcoding sync --watch` and background services on macOS and Linux. [CLI reference](apps/cli/README.md)

## Share your activity

Open your Cloud profile at `https://nowcoding.cc/u/YOUR_GITHUB_USERNAME`. It shows recent activity, daily usage, your streak, and a yearly heatmap.

- **GitHub README** · Copy the Markdown from your public profile or use the snippet below. Replace `YOUR_GITHUB_USERNAME` with your username. The card links to the NowCoding repository.
- **Social media** · Share your profile link for a preview, or download a PNG from your profile.
- **Card styles** · Preview designs with your own public usage and share the selected style. [Browse card styles](https://nowcoding.cc/cards)
- **Badges** · Use `/u/YOUR_GITHUB_USERNAME/badge/streak.svg` or choose `today`, `week`, `total`, `model`, or `live`.

```md
[![NowCoding activity](https://nowcoding.cc/u/YOUR_GITHUB_USERNAME/card.svg)](https://github.com/tianpeng-dev/nowcoding)
```

GitHub caches README images, so the card may refresh after the public profile does.

## Supported tools and privacy

NowCoding supports Claude Code, Codex, Gemini CLI, GitHub Copilot CLI, OpenCode, and other tools with local usage records. [Full list and supported log formats](docs/parsers.md)

The Magpie panel can display usage locally. When you sync, NowCoding uploads aggregated usage and hashed session statistics. Prompts, replies, source files, and credentials stay on your device. Project names and hostnames follow your privacy settings. Joining the public leaderboard is optional. [Cloud and device authorization](docs/cloud.md) · [Security](SECURITY.md)

## Self-host NowCoding

Deploy the single-user web app from `apps/web` with Postgres. Set `DATABASE_URL`, `NOWCODING_USERNAME`, `NOWCODING_API_TOKEN`, and `CRON_SECRET`, then initialize the database schema. [Deployment guide](docs/deploy.md) · [Environment variables](docs/env.md)

With the CLI installed, generate an ingest token, configure the app with that token, and connect the CLI to your deployment.

```sh
nowcoding gen-token
nowcoding init --endpoint https://your-nowcoding.example
nowcoding sync
```

Check `/setup` on your deployment for readiness. Your instance serves the profile at `/`, the card at `/card.svg`, and badges under `/badge/`.

## Develop and contribute

Use Node.js 20 or later and pnpm 9.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
```

- `apps/magpie-plugin` · Magpie panel and local service. [Plugin development](apps/magpie-plugin/README.md)
- `apps/cli` · CLI and background sync. `packages/collector` and `packages/parsers` handle collection.
- `apps/cloud` · Hosted profiles, accounts, and devices. [Cloud deployment](docs/cloud-deploy.md)
- `apps/web` · Single-user web app. [Local verification](docs/local-dev.md)

See the [contribution guide](CONTRIBUTING.md) for pull requests and the [security policy](SECURITY.md) for vulnerability reports.

## License

[MIT](LICENSE). See [NOTICE](NOTICE) for credits.
