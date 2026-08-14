<div align="center">

# opencode-rules-hub

**Centralized rules management for your AI coding agents.**

[![npm version](https://img.shields.io/npm/v/opencode-rules-hub?color=blue)](https://www.npmjs.com/package/opencode-rules-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Self-hosted](https://img.shields.io/badge/self--hosted-ready-green)](https://github.com/HarKro753/opencode-rules-hub)

</div>

---

Define your coding conventions once. Share them across every project, every repo, every team member's agent — automatically.

opencode-rules-hub is a self-hosted platform that stores rule sets as plain markdown files and serves them to any repo via a lightweight [OpenCode](https://opencode.ai) plugin. No copy-pasting rules between projects. No drift between teams. One source of truth.

- **No database** — rules are plain `.md` files on disk
- **Self-hostable** — runs anywhere, backs up to a folder
- **Dashboard included** — browse and edit rules in a web UI
- **Infinite TTL** — rules only update when you tell them to

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Plugin Commands](#plugin-commands)
- [API Reference](#api-reference)
- [Rule Storage](#rule-storage)
- [Self-Hosting](#self-hosting)
- [Docker](#docker-compose-recommended)
- [Development](#development)
- [License](#license)

## Architecture

Three packages, one monorepo:

| Package              | Description                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `packages/server`    | TypeScript HTTP server. Stores rules as `.md` files. REST API on port `3847`.                 |
| `packages/dashboard` | Next.js web UI. Browse, create, edit, and delete rule sets. Port `3848`.                      |
| `packages/plugin`    | OpenCode plugin. Fetches rules from the server, persists locally, injects into agent context. |

## Quick Start

### 1. Start the server

```bash
cd packages/server
npm install
npm run dev
```

Runs on `http://localhost:3847`. Set `PORT` to change it. Set `API_KEY` to secure write operations (defaults to `changeme`).

### 2. Open the dashboard

```bash
cd packages/dashboard
npm install
npm run dev
```

Opens on `http://localhost:3848`. Set `NEXT_PUBLIC_RULES_SERVER_URL` if your server is on a different host.

### 3. Configure a project

Add a config file to any repo:

```json
// .opencode/rules.json
{
  "server": "http://localhost:3847",
  "apiKey": "your-api-key",
  "sets": ["typescript", "company-conventions"]
}
```

### 4. Install the plugin

Add to your project's `opencode.json`:

```json
{
  "plugin": ["opencode-rules-hub"]
}
```

On the next session compaction, the plugin fetches your rule sets, saves them to `.opencode/rules-local.md`, and injects them into the agent's context. Rules only refetch when you run `/rules-sync`.

## Plugin Commands

| Command       | Description                                  |
| ------------- | -------------------------------------------- |
| `/rules-sync` | Force re-fetch all rule sets from the server |
| `/rules`      | Display the current locally cached rules     |

## API Reference

Read routes are public. All mutating routes require `Authorization: Bearer <api-key>`.

| Method   | Endpoint                    | Description                           |
| -------- | --------------------------- | ------------------------------------- |
| `GET`    | `/health`                   | Health check                          |
| `GET`    | `/sets`                     | List all available sets               |
| `GET`    | `/rules?sets=typescript,go` | Get merged markdown for multiple sets |
| `GET`    | `/rules/:set`               | Get a single rule set                 |
| `POST`   | `/rules/:set`               | Create a rule set (body: markdown)    |
| `PUT`    | `/rules/:set`               | Update a rule set (body: markdown)    |
| `DELETE` | `/rules/:set`               | Delete a rule set                     |

### Examples

```bash
# List all sets
curl http://localhost:3847/sets

# Fetch multiple sets merged
curl "http://localhost:3847/rules?sets=typescript,general"

# Create a new set
curl -X POST http://localhost:3847/rules/go \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: text/markdown" \
  -d "# Go Rules

- Use gofmt for all formatting.
- Handle errors explicitly — never ignore them."

# Delete a set
curl -X DELETE http://localhost:3847/rules/go \
  -H "Authorization: Bearer changeme"
```

## Rule Storage

Rules are plain markdown files in `packages/server/data/`:

```
data/
  general.md
  typescript.md
  company-conventions.md
```

Each file is a heading and a bullet list:

```markdown
# TypeScript Rules

- Use named exports — default exports make refactoring harder.
- Avoid the `any` type — use `unknown` and narrow explicitly.
- Use `import type` for type-only imports.
```

No database. No migrations. No ORM. Back up the `data/` folder and you have everything.

## Self-Hosting

### Docker Compose (recommended)

The fastest way to run the full stack:

```bash
cp .env.example .env
# Edit .env — set a strong API_KEY
docker compose up -d
```

Server → `http://localhost:3847`
Dashboard → `http://localhost:3848`

Rules are persisted in a named Docker volume (`rules-data`). To back up, copy the volume's contents or mount a host directory instead.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | `changeme` | Secures write operations — **change before deploying** |
| `RULES_SERVER_URL` | `http://server:3847` | URL the dashboard uses to reach the server |
| `SERVER_PORT` | `3847` | Host port for the server |
| `DASHBOARD_PORT` | `3848` | Host port for the dashboard |

### Manual (without Docker)

```bash
PORT=3847 API_KEY=your-secret DATA_DIR=./data node packages/server/dist/index.js
```

Point any number of projects at the same server. Rules update everywhere the moment you change them in the dashboard.

## Development

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Dev mode
npm run dev:server
npm run dev:dashboard
```

## License

MIT — see [LICENSE](./LICENSE).
