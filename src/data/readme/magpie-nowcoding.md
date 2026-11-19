# NowCoding

[English](README.md) | [简体中文](README_zh.md)

NowCoding shows what builders are coding with AI right now, then turns that live activity into profiles, README cards, badges, and social proof.

NowCoding collects usage from local AI coding tools, normalizes it into daily
token and cost buckets, and publishes a privacy-aware profile with embeddable
SVG cards and badges. Use the hosted Cloud path for zero-server setup, or
self-host the open-source web app when you want to own the full deployment.

<a href="https://nowcoding.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://nowcoding.vercel.app/card.svg?theme=dark" />
    <img src="https://nowcoding.vercel.app/card.svg" alt="NowCoding activity card" width="800" />
  </picture>
</a>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding&env=NOWCODING_USERNAME,NOWCODING_API_TOKEN,CRON_SECRET&envDescription=Set%20your%20public%20NowCoding%20username%2C%20paste%20a%20secret%20token%20from%20%60npx%20nowcoding%20gen-token%60%2C%20and%20add%20a%20strong%20random%20cron%20secret.&envLink=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding%2Fblob%2Fmain%2Fdocs%2Fenv.md&project-name=nowcoding&repository-name=nowcoding)

## Install the Magpie plugin

Enter `magpie-nowcoding` in the plugin installer in Magpie 0.1.4079 or later, or install it from the command line.

```sh
magpie plugin add npm:magpie-nowcoding
```

Open NowCoding in the Magpie sidebar and select the tools to include. To sync your usage to NowCoding Cloud, open the device tab and sign in with GitHub. [Plugin development instructions](apps/magpie-plugin/README.md)

## What it shows

- Today, last 7 days, last 30 days, and all-time token totals.
- Estimated cost, calculated on the server from normalized model usage.
- Live status from heartbeat or recent sync activity.
- Streaks and yearly heatmap using the configured owner timezone.
- Top models and tools used over the selected period.
- GitHub-ready SVG cards and badges. The V2 README card includes tokens,
  estimated cost, live status, a 7-day token sparkline, top model, estimated
  AI-assisted time saved, peak activity, streak, and one highlighted milestone.

## Completeness snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Local collection | Complete | CLI discovers supported AI coding tools and parses local usage files. |
| Parser coverage | Complete for v1 | 18 registered sources, 16 full parsers, 2 disabled. |
| Sync pipeline | Complete | Buckets and sessions are deduplicated by source, model, project, hostname, and time. |
| API auth | Complete | Ingest and heartbeat endpoints require bearer token auth. |
| Public profile | Complete | Shows live, today, week, total, cost, streak, heatmap, models, and tools. |
| SVG embeds | Complete | Card plus `today`, `week`, `total`, `model`, `streak`, and `live` badges. |
| Background sync | Complete | Watch mode plus daemon support for macOS launchd and Linux systemd user services. |
| Deployment | Complete | Vercel app with standard Postgres documented in `docs/deploy.md`; Cloud V2 uses Supabase. |
| Privacy controls | Complete | Local and server privacy gates are both required before optional fields are stored. |
| Multi-device storage | Partial UI | Hostname is stored for dedupe; device dashboards are not first-class yet. |
| Realtime GitHub display | External cache | GitHub README images are cached by GitHub and may update minutes later. |

## Architecture

```text
Local AI tool logs
        |
        v
nowcoding CLI parsers
        |
        v
bucket/session aggregation
        |
        v
POST /api/usage/ingest + /api/usage/heartbeat
        |
        v
Postgres
        |
        v
profile page, API routes, SVG card, SVG badges, OG images
```

The app does not send prompt text. It stores normalized usage metadata such as
source, model, token counts, estimated cost, bucket time, optional project name,
and optional hostname depending on privacy settings.

## Supported tools

NowCoding currently registers 18 parser sources.

Full source-specific parsers:

```text
claude-code, codex, gemini-cli, github-copilot-cli, opencode, openclaw,
pi, qwen-code, kimi-code, amp, droid, hermes, kiro, cline, roo-code,
antigravity
```

Disabled by design:

```text
cursor, windsurf
```

Cursor and Windsurf are registered so their status is explicit, but they are not
parsed until their local data formats are safe and stable enough for this
project. See [docs/parsers.md](docs/parsers.md) for the current parser matrix
and fixture requirements.

## NowCoding Cloud

Hosted V2 is the lowest-friction path when you want official profile, card,
badge, streak, and Arena leaderboard links without deploying your own server:

```bash
npm install -g nowcoding
nowcoding login
nowcoding daemon install
nowcoding daemon start
nowcoding status
```

Official Cloud will live under `https://nowcoding.cc`. Planned public surfaces:

- `https://nowcoding.cc` for product, login, and account entry.
- `https://nowcoding.cc/u/<username>` for official public profiles.
- `https://nowcoding.cc/u/<username>/card.svg` for README cards.
- `https://nowcoding.cc/u/<username>/badge/<type>.svg` for badges.
- `https://nowcoding.cc/leaderboard` for the opt-in public leaderboard.

`nowcoding login` opens GitHub OAuth and binds the CLI to your Cloud account
with a scoped NowCoding device token. The normal path should return directly to
the terminal after OAuth succeeds; extra confirmation is reserved for unusual
risk or consent changes. Arena powers the hosted leaderboard and remains
separate from Cloud profile/card/badge upload.

Self-hosted mode does not contact NowCoding Cloud or Arena unless you explicitly
run `nowcoding login` or `nowcoding arena connect`.

## Self-hosted quick start

Deploy the open-source self-host web app:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding&env=NOWCODING_USERNAME,NOWCODING_API_TOKEN,CRON_SECRET&envDescription=Set%20your%20public%20NowCoding%20username%2C%20paste%20a%20secret%20token%20from%20%60npx%20nowcoding%20gen-token%60%2C%20and%20add%20a%20strong%20random%20cron%20secret.&envLink=https%3A%2F%2Fgithub.com%2Ftianpeng-dev%2Fnowcoding%2Fblob%2Fmain%2Fdocs%2Fenv.md&project-name=nowcoding&repository-name=nowcoding)

Requirements:

- Node.js 20 or newer.
- pnpm 9 or newer.
- A Vercel project.
- A Supabase Postgres database or any standard Postgres database.

Verify the GitHub source:

```bash
git clone https://github.com/tianpeng-dev/nowcoding.git
cd nowcoding
corepack enable
pnpm install
pnpm --filter nowcoding build
node apps/cli/bin/nowcoding.js --help
```

Generate an ingest token:

```bash
npx nowcoding gen-token
```

Deploy the web app, then configure these environment variables:

```text
NOWCODING_USERNAME=peng
NOWCODING_API_TOKEN=<token from gen-token>
CRON_SECRET=<strong random secret>
DATABASE_URL=<Supabase pooler or standard Postgres connection string>
```

Push the database schema:

```bash
DATABASE_URL='<Postgres connection string>' pnpm db:push
```

Connect the local CLI to your deployed app:

```bash
npx nowcoding init --endpoint https://your-name.vercel.app
npx nowcoding sync
```

For continuous updates, use watch mode:

```bash
npx nowcoding sync --watch
```

Or install the daemon:

```bash
npm install -g nowcoding
nowcoding daemon install
nowcoding daemon start
nowcoding status
```

Daemon install supports macOS launchd and Linux systemd user services. It
requires a stable binary path and refuses transient `npx` or `pnpm dlx` paths.

## Embed in GitHub

Add the SVG card to a GitHub profile README:

```md
<a href="https://nowcoding.vercel.app">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://nowcoding.vercel.app/card.svg?theme=dark" />
    <img src="https://nowcoding.vercel.app/card.svg" alt="NowCoding activity" />
  </picture>
</a>
```

For your own deployment, replace `https://nowcoding.vercel.app` with your
official Cloud profile URL or your self-hosted Vercel URL. Add badges:

```md
![Today](https://your-name.vercel.app/badge/today.svg)
![Week](https://your-name.vercel.app/badge/week.svg)
![Streak](https://your-name.vercel.app/badge/streak.svg)
![Live](https://your-name.vercel.app/badge/live.svg)
```

GitHub caches README images outside of NowCoding. The SVG routes send a short
cache lifetime, but GitHub may still refresh images after several minutes or
longer.

## CLI commands

```bash
nowcoding init [--endpoint <url>] [--token <token>] [--hostname <name>]
nowcoding sync [--dry-run] [--source <name>] [--strict]
nowcoding sync --watch [--watch-interval <ms>]
nowcoding heartbeat
nowcoding status
nowcoding doctor
nowcoding gen-token
nowcoding daemon status
nowcoding daemon install
nowcoding daemon start
nowcoding daemon stop
nowcoding daemon restart
nowcoding daemon uninstall
nowcoding daemon foreground
```

See [apps/cli/README.md](apps/cli/README.md) for CLI-specific setup and daemon
details.

## API and pages

| Route | Purpose |
| --- | --- |
| `/` | Public activity profile. |
| `/card.svg` | Embeddable README profile card with V2 engagement metrics. Supports `theme=dark`. |
| `/badge/[type]` | SVG badge for `today`, `week`, `total`, `model`, `streak`, or `live`. |
| `/api/stats` | JSON stats for `today`, `7d`, `30d`, or `all`. |
| `/api/now` | Current live/recent/idle/inactive state. |
| `/api/heatmap` | Yearly activity heatmap data. |
| `/api/usage/ingest` | Authenticated local usage ingest. |
| `/api/usage/heartbeat` | Authenticated heartbeat ingest. |
| `/setup` | Local setup helper page. |

## Development

Install dependencies:

```bash
corepack enable
pnpm install
```

Run checks:

```bash
pnpm typecheck
pnpm test
pnpm --filter @nowcoding/web build
```

Other useful commands:

```bash
pnpm lint
pnpm db:push
pnpm --filter @nowcoding/web dev
```

End-to-end local verification is documented in
[docs/local-dev.md](docs/local-dev.md).

## Repository layout

```text
apps/web        Next.js App Router web app and API routes
apps/cli        Node CLI published as nowcoding
packages/badge  SVG rendering helpers
packages/core   Shared domain logic and privacy rules
packages/db     Drizzle schema, migrations, and query helpers
packages/parsers Local AI tool parsers and fixtures
docs            Deployment, environment, parser, and migration docs
```

## OSS, Cloud, and Arena boundary

The public `nowcoding` repository contains the trust-critical local and
self-hosted code:

- CLI, parsers, daemon, diagnostics, privacy trimming, and upload client.
- Self-hosted web app, ingest API, profile page, SVG card, badges, heatmap, and
  public JSON endpoints.
- Shared schemas, cost estimation, public rendering, and self-host deployment
  docs.

The public workspace includes the hosted application in `apps/cloud`:

- GitHub OAuth, official accounts, username ownership, and device tokens.
- Official profile/card/badge hosting under `https://nowcoding.cc`.
- Arena leaderboards, anti-abuse, moderation/admin tools, teams, and future
  billing.

Arena is opt-in. Self-hosted deployments do not contact NowCoding Cloud or Arena
unless you explicitly run a Cloud login/connect command.

## Privacy model

NowCoding uses a fail-closed privacy model:

- Prompt and completion text are never stored.
- Project names are hidden by default.
- Hostname upload is enabled by default for multi-device dedupe and can be
  disabled locally.
- Optional fields are stored only when both local config and server settings
  allow them.
- Sessions are represented by hashes instead of raw local session identifiers.
- Ingest endpoints require `NOWCODING_API_TOKEN`.

See [SECURITY.md](SECURITY.md) for the threat model and reporting process.

## Deployment

The self-hosted production path is Vercel plus standard Postgres. The hosted
Cloud V2 path uses GitHub OAuth, Postgres and Next.js API routes behind `https://nowcoding.cc`.

1. Fork or clone this repository.
2. Create a Vercel project from the repo.
3. Provision Supabase Postgres or provide another standard `DATABASE_URL`.
4. Set `NOWCODING_USERNAME`, `NOWCODING_API_TOKEN`, and `CRON_SECRET`.
5. Run `pnpm db:push`.
6. Configure the local CLI with `nowcoding init`.
7. Run `nowcoding sync` or start the daemon.

Detailed instructions are in [docs/deploy.md](docs/deploy.md) and
[docs/env.md](docs/env.md).

## Known limits

- Cursor and Windsurf parsing are disabled until their local storage formats are
  safe enough to support.
- GitHub README images are not truly realtime because GitHub controls its image
  cache.
- The current product is single-tenant by default.
- Hostname is stored for dedupe and future multi-device analytics, but the
  profile UI does not yet expose a device leaderboard.

## Documentation

- [docs/local-dev.md](docs/local-dev.md): first-time local verification.
- [docs/deploy.md](docs/deploy.md): production deployment.
- [docs/env.md](docs/env.md): environment variables.
- [docs/cloud.md](docs/cloud.md): Cloud architecture and device authorization.
- [docs/migration.md](docs/migration.md): migration notes from vibe-usage.
- [docs/parsers.md](docs/parsers.md): parser support and contribution guide.
- [docs/v1.5-backlog.md](docs/v1.5-backlog.md): deferred work.

## License

MIT. This project is derived in spirit from
[vibe-usage](https://github.com/peeerdat/vibe-usage); see [NOTICE](NOTICE).
