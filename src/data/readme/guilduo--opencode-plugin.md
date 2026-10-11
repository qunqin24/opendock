[English](README.md) · [日本語](README.jp.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [한국어](README.ko.md) · [简体中文](README.zh-Hans.md) · [Русский](README.ru.md)

# Guilduo

> **Build the strongest party with AI by your side.**

**Humans are not the only ones who can commission work.**

Guilduo is a **Human × AI Work Platform** where people and AI Agents can commission, own, hand off, and review work in the same workspace. It treats real-world work as Quests and moves it forward through shared Relays, Evidence, and Decisions.

## Public Links

### New users start here

- Learn about Guilduo: [Official site](https://guilduo.com/)
- Work in Guilduo: [Guilduo / Relay Forge](https://app.guilduo.com/)
- Connect an AI client: `https://mcp.guilduo.com/mcp`

| Entry point | Link | Purpose |
|---|---|---|
| Official LP | [Guilduo Landing Page](https://guilduo.com/) | Learn about Guilduo's principles, features, and workflow |
| Official Web App | [Guilduo / Relay Forge](https://app.guilduo.com/) | Open the public beta Command and Quest workspace |

`/next/relay-forge/` is a deployment path inside an Appwrite Site, not the official Web App URL. Appwrite Sites generated deployment URLs and the old `workers.dev` URL are retained for validation, compatibility, and rollback. The canonical path for new users is the Guilduo domain above. The currently deployed candidate is `0.6.0-beta.8`, managed separately from tagged releases.

### What each public URL is for

| Role | Canonical URL | Status |
|---|---|---|
| Official site / LP | `https://guilduo.com` | canonical root |
| Web App | `https://app.guilduo.com` | Appwrite Site Custom Domain |
| MCP | `https://mcp.guilduo.com/mcp` | Canonical Remote HTTP MCP endpoint |
| Appwrite API | `https://api.guilduo.com/v1` | Official Appwrite API endpoint (origin: `https://api.guilduo.com`) |
| Documentation | `https://guilduo.com/docs/` | Static Japanese Docs; published |
| English Documentation | `https://guilduo.com/docs/en/` | Static English Docs; published |
| Documentation subdomain | `https://docs.guilduo.com` | Reserved / Future |

`https://www.guilduo.com` is reserved for redirects to `https://guilduo.com`. The old `workers.dev` URL remains for compatibility connections and rollback. `api.guilduo.com` is for the Appwrite API and is used by the browser Appwrite client and the Worker's `APPWRITE_ENDPOINT`; it is not the public origin for the Worker's REST `/v1` or MCP `/mcp` routes.

See [BRAND.md](BRAND.md) for approved brand language and expression.

Guilduo is an independent project and is not affiliated with, endorsed by, or an alternative service to Habitica. Product names and trademarks belong to their respective owners.

### Explore Guilduo by use case

- [MCP task management for humans and AI agents](https://guilduo.com/solutions/en/mcp-task-management/) — Shared Quests, ownership and completion criteria for your external AI.
- [AI agent handoff and human review](https://guilduo.com/solutions/en/ai-agent-handoff/) — Bring human checks and saved text feedback back into the work.

## Public Beta Scope

| Area | Status |
|---|---|
| Web / PWA | Core of the public beta |
| Appwrite Google sign-in and device guest storage | Available (authentication configured) |
| Quest CRUD, archiving, Quest Tree, and MP battle | Available |
| Agent Registry, MCP client linking, and Handoff | Available |
| REST API 2.7.0 / MCP `/mcp` | 54 tools / OpenAPI 52 paths |
| `app.guilduo.com/` Guilduo / Relay Forge | Public beta of the official Web App (Desktop / Mobile). Internal `/next/relay-forge/` is a deployment and compatibility path |
| 9 languages | Available in the root UI; the beta UI covers the primary navigation |
| Google Calendar, Google Tasks, Notion, and Toggl | **Early Access / OAuth preparation** |
| Unity Battle Lab, native Android/iOS, and autonomous Agent execution | Pending |

The app version is the `0.6.0-beta.8` candidate, REST/MCP is `2.7.0`, and the data Schema is `7`. External Provider OAuth is disabled by default while public beta safety and review preparation are prioritized. Accounts and user state are being migrated to Appwrite.

## Design Principles

1. **People own the goal and final decision**: AI suggestions remain reviewable and are never completed or published without approval.
2. **Separate work from rewards**: Earn MP through Quests, then choose when to battle and which command to use.
3. **Read, preview, execute**: Make dry-run the default for writes, bulk updates, and Handoffs.
4. **Archive before deleting**: Keep history, rewards, and external links; archive Quests that are no longer needed.
5. **Put humans and AI in the same party**: Astra is a companion character, Agents represent roles, and users remain separate as accounts.
6. **Do not lock data in**: REST, MCP, CLI, and Web UI use the same Worker and domain logic.

## Screens and Data

- `/`: The current UI. Before login, data is stored on the device; after login, it syncs to Appwrite through the Worker.
- `/lp/` and `/lp/en/`: The official Guilduo Landing Page in Japanese and English. CTA URLs come from Runtime Config and are safely disabled when unset.
- `/interaction-lab/`: The Next source route for local development and captures.
- `/next/` and `/next/relay-forge/`: Implementation and compatibility routes on Appwrite Sites. The official entry for new users is `https://app.guilduo.com/`, which internally forwards to the Relay Forge entry through a host-based rewrite. On desktop, only the central Today/Tree list scrolls; on mobile, the whole page scrolls.
- `https://guilduo.com/` routes to `/lp/` on the same Appwrite Site, while `https://app.guilduo.com/` routes to `/next/relay-forge/`. See [`docs/appwrite-site-routing.md`](docs/appwrite-site-routing.md) for the actual DNS and rewrite configuration.
- The visual source of truth is [`DESIGN.md`](DESIGN.md), the technical source of truth is [`PROJECT_SPEC.md`](PROJECT_SPEC.md), and the Next-specific delta design is [`interaction-lab/DESIGN.md`](interaction-lab/DESIGN.md). See [`design/TOKENS.json`](design/TOKENS.json) for numeric tokens, [`design/COMPONENTS.md`](design/COMPONENTS.md) for components, and [`design/SCREENS.md`](design/SCREENS.md) for screen composition.
- On reconnect, Appwrite Auth state is restored and previously synced data remains available read-only when present. Quest lists are not cleared during reconnection; the UI shows a skeleton, reconnect button, and write lock.
- Quest completion state and Agent Handoff state are managed separately. One-off To Dos are archived when completed; dailies, habits, and recurring To Dos return for their next occurrence.
- Public profiles expose only the display name, `@handle`, bio, avatar, and level. Quest content, notes, UID, and OAuth information remain private.

## Appwrite / Worker Architecture

| Layer | Responsibility |
|---|---|
| Appwrite Sites | Web/PWA delivery |
| Appwrite Auth / TablesDB | Google sign-in and per-user Quest and character state |
| Cloudflare Worker | REST, OAuth, MCP, Webhooks, and extension boundary |
| Cloudflare D1 | Agent Registry, MCP connections, profiles, and integration metadata |
| Cloudflare KV | OAuth state, short-lived state, and MCP clients |

Tokens, API keys, and secrets are never stored in public Appwrite rows or browser Local Storage. Appwrite API Keys live only in Worker Secrets. Agent Registry also never stores model API keys, passwords, or execution URLs.

## MCP

The stable connection endpoint is:

```text
https://mcp.guilduo.com/mcp
```

MCP `2.7.0` exposes 54 tools covering Quests, archiving, Quest Tree, Agent Handoff, Agent Registry, profiles, parties, battle, and the Toggl Focus contract. `/mcp-next` is a validation lane for the new SDK and adds Resources and Workflow Prompts. Keep using `/mcp` for normal use to preserve compatibility with existing clients.

During the migration, the old `workers.dev` `/mcp` remains available for compatibility, but new registrations and reconnections should use `mcp.guilduo.com/mcp` above.

### Register a new MCP connection with OAuth

This procedure is for clients such as ChatGPT, Codex, Claude, and OpenClaw that support Remote HTTP MCP and OAuth. For a first connection, follow steps 1–6 in order. If you only need to verify an existing connection, start at step 7.

1. If a pre-migration Guilduo / QuestForge connection remains in the client, disconnect or remove it first. Old OAuth Grants and Tokens cannot be reused.
2. Open the client's MCP or Connector settings and register a connection named `Guilduo` with type Remote HTTP MCP.
3. Set the URL to the stable `https://mcp.guilduo.com/mcp`. Do not use `/mcp-next` for ordinary connection tests.
4. When the client offers an authentication choice, select `OAuth`. Do not enter an API Key, Bearer Token, or Client Secret.
5. When the browser shows “Connect to Guilduo,” sign in with the same Appwrite account used for the Web version of Guilduo, review the requested permissions, and approve them.
6. Return to the MCP client and confirm that it reports the connection as connected or available. At this point OAuth is complete, but an Agent may not be linked yet.
7. Open Connections in [Guilduo / Relay Forge](https://app.guilduo.com/) and link the connected Client to the desired Agent. If no Agent exists, create one first from Party > “Register Agent.”
8. Restart or reload the MCP client and run the connection test below.

For clients that add Remote MCP through a configuration file, use this example:

```json
{
  "mcpServers": {
    "questforge": {
      "type": "http",
      "url": "https://mcp.guilduo.com/mcp",
      "authentication": "oauth"
    }
  }
}
```

MCP clients discover OAuth metadata automatically. Use the following URLs only when manual verification is necessary.

```text
Authorization Server Metadata
https://mcp.guilduo.com/.well-known/oauth-authorization-server

Protected Resource Metadata
https://mcp.guilduo.com/.well-known/oauth-protected-resource/mcp
```

### Verify the Agent Context in the connection test

Check the following sequence from the client:

1. MCP initialization succeeds.
2. `tools/list` returns 54 tools.
3. `list_registered_agents` returns only your own Agent.
4. Call `get_current_agent_context`.

Before an Agent is linked, the normal response is `linked: false` with `agent: null`. After linking in Connections, it becomes `linked: true` and returns `agent` and `effectiveScopes`. This confirms that OAuth authentication, UID separation, and Agent linking work through the same connection.

Example test request:

```text
Guilduo MCPのtools/listを確認し、get_current_agent_contextを実行してください。
Agentがリンク済みか、Agent ID、Role、effectiveScopesだけを報告してください。
Token、Client ID、UIDは表示しないでください。
```

### Troubleshoot 401 errors and unlinked Agents

| State | Response |
|---|---|
| 401 immediately after connecting | Old OAuth information remains. Delete the connection, register the same `/mcp` URL again, and re-authorize it. |
| Cannot return from the OAuth screen | Confirm that you are signed in with the same Appwrite account as the Web version of Guilduo. Also check extensions that may block the callback back to the client. |
| `linked: false` | OAuth succeeded. Link the Client to an Agent in Relay Forge Connections. |
| `agents:read` permission error | Re-authorize the connection and confirm Agent read permission on the consent screen. Agent-side settings cannot add OAuth permissions. |
| Agent link does not appear | Reload the MCP client and run `get_current_agent_context` again. |

Do not paste Tokens, API Keys, or complete UIDs into connection settings or logs. After OAuth authorization, Tokens are managed by the MCP client and Cloudflare KV.

### AI clients

- ChatGPT / Codex: Register the production `/mcp` URL above in the Remote MCP App or developer mode.
- Claude: Add OAuth Remote MCP from Settings > Connectors.
- Gemini CLI: `gemini mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- GitHub Copilot CLI: `copilot mcp add --transport http questforge https://mcp.guilduo.com/mcp`
- OpenClaw / Hermes: Use the same Remote HTTP MCP in the upcoming connection recipe.

After registration, create or edit Agents in **Party** in Relay Forge and link authorized MCP clients to an Agent in **Connections**. An Agent cannot increase an MCP client's permissions.

## CLI

The CLI has a separate role from MCP. MCP is for AI tool discovery and approval; the CLI is for REST/JSON operations by people and CI.

```bash
npm run cli -- doctor --json
npm run cli -- quests list --view today --json
npm run cli -- quests add --title "公開前チェック" --due 2026-08-20 --json
npm run cli -- quests add --title "公開前チェック" --execute --json
npm run cli -- quests complete quest-id --execute --json
npm run cli -- agents list --json
npm run cli -- handoff quest-id review_required --expected-state working --execute --json
npm run cli -- mcp-config --json
```

Writes return only a dry-run or execution plan unless `--execute` is supplied. Authentication uses `QUESTFORGE_TOKEN` or `--token-stdin`, and tokens are never written to logs. General production users use OAuth rather than a fixed API key.

## DSH plugin: install and connect

The Guilduo plugin for **DeepSeek Harness (DSH)** is available on npm as [`@guilduo/dsh-oauth-poc`](https://www.npmjs.com/package/@guilduo/dsh-oauth-poc). As of October 10, 2026, `latest` and `beta` both resolve to **0.6.0-beta.17**. It adds **Settings → Guilduo**, browser OAuth and the `guilduo-workflows` Skill. Tested host: Windows, DSH **0.2.0-rc.2**. [Official DSH guide](https://guilduo.com/docs/en/dsh/).

Stop the Web/Desktop hosts before installing or updating this existing Web profile:

```powershell
dsh plugin --profile web add @guilduo/dsh-oauth-poc@latest --ignore-scripts
```

Restart the host and reload the browser. Open a conversation → **Settings → Guilduo → 接続 → ブラウザーで認証**, then approve in the browser. Desktop uses its native plugin manager, with the same package and version.

See the **[English How-to](docs/guilduo-dsh-howto.md)** / **[日本語の導入・使い方](docs/guilduo-dsh-howto.jp.md)** for sharing, updates, safe removal and troubleshooting. Beta.17 includes the independently reviewed maintenance fixes. The user's beta.16 public OAuth, MCP reads/writes and Desktop saved authentication reuse are accepted; beta.17's full Human/Handoff and settings-free workflow acceptance remains open. All three plugins are entering the polish phase; see [current acceptance status](docs/guilduo-dsh-status.md).

## OpenCode, OpenClaw and Claude Code extensions

Guilduo's independent extensions reuse each host's native OAuth MCP connection and bundle the `guilduo-workflows` Skill. They preserve existing MCP aliases and other plugins. Installation does not grant Quest write permission or register a new Agent.

| Host | Package | Guide |
| --- | --- | --- |
| OpenCode 1.18.32 / 1.18.35 | `@guilduo/opencode-plugin@0.6.0-beta.16` (`latest` / `beta`) | [Official guide](https://guilduo.com/docs/en/opencode/) / [日本語](https://guilduo.com/docs/opencode/) |
| OpenClaw 2026.9.9 | `@guilduo/openclaw-plugin@0.6.0-beta.16` (`latest` / `beta`) | [Official guide](https://guilduo.com/docs/en/openclaw/) / [日本語](https://guilduo.com/docs/openclaw/) |
| Claude Code 2.1.286+ | `guilduo@guilduo` `0.6.0-beta.2` (Claude Code marketplace `ELRdn/Guilduo`, not npm) | [Official guide](https://guilduo.com/docs/en/claude/) / [日本語](https://guilduo.com/docs/claude/) |

Use the official guides for installation, OAuth, updates and removal. OpenCode's optional phase reminder is off by default and can start an additional model request when explicitly bound to a session. OpenClaw uses the standard Settings / Accounts connection UI. `latest` selects the recommended published prerelease; version numbers and acceptance limits remain visible in the [release status](docs/guilduo-host-extensions-status.md) and [independent completion assessments](docs/guilduo-plugins-completion.md).

## Skill / OpenAI Plugin / MCP App

OpenAI / ChatGPT, Codex, Grok Bot and Muse Code beta.12 candidates reuse the canonical Skill. See the [English installation and acceptance guide](docs/guilduo-next-hosts.md) / [日本語](docs/guilduo-next-hosts.jp.md). OpenAI submission uses a separate hooks-free ZIP; Codex includes optional trusted lifecycle assistance. Grok and Muse real-model acceptance is not implied by candidate distribution.

- Official Skill: [`skills/questforge-workflows/SKILL.md`](skills/questforge-workflows/SKILL.md)
- OpenAI Plugin preparation package: [`plugins/questforge/`](plugins/questforge/)
- MCP App registration template: [`plugins/questforge/.app.json.example`](plugins/questforge/.app.json.example)
- Submission checklist: [`plugins/questforge/openai-submission.json`](plugins/questforge/openai-submission.json)

The Skill teaches AI the sequence of read, dry-run, confirm, execute, and return a review. OpenAI official review is not completed automatically. After real-account acceptance, privacy, and account-deletion paths are verified in the public beta, an operator submits the application from the Dashboard.

## 9 Languages

Guilduo supports Japanese, English, Spanish, Brazilian Portuguese, French, German, Korean, Simplified Chinese, and Russian. Language settings are stored per device and are not included in cloud sync. Dates, numbers, and sort order use the Intl API.

## External Services Roadmap

The current priority is to establish contracts and safe presentation; Provider OAuth remains on hold as Early Access.

1. Google Calendar: read-only availability windows
2. Google Tasks: bidirectional sync without deletion
3. Toggl Track: time tracking, estimates, and MP conversion
4. Notion: daily log export
5. Todoist, Discord / Slack: sync and notifications
6. OpenClaw, Hermes Agent: connection recipes and Skill reuse

Initial sync requires a preview, and Guilduo never automatically deletes external data. Provider Secrets live only in Worker Secrets.

## Performance and Telemetry

Targets use a Pixel 9-class device: LCP at or below 2.5 seconds, INP at or below 200 ms, CLS at or below 0.1, and initial compressed JavaScript at or below 250 KB. Anonymous telemetry applies only to users who explicitly consent; Quest content, notes, email, UID, tokens, and external content are not sent. Permitted implemented events are Web Vitals, JavaScript errors, sync results, first Quest completion, MCP connection, and Agent assignment. Nothing is sent after telemetry is declined or withdrawn. Before public release, an administrator must configure `TELEMETRY_ENDPOINT` and D1 migration 0006.

## Local Development

Requirements are Node.js 22+ and Wrangler. Manage Appwrite resources through the Appwrite Console or MCP.

```bash
npm install
cp appwrite-config.example.js appwrite-config.js
cp runtime-config.example.js runtime-config.js
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Use `Copy-Item` in PowerShell. The main commands are:

```bash
npm run check
npm run typecheck
npm test
npm run build
npm run api:generate
npm run worker:dev
```

During TypeScript development, the Worker runtime types are generated from the Wrangler configuration. `npm run typecheck` combines type generation, generated-output consistency checks, explicit `any` and `@ts-nocheck` checks, and strict type checks for the browser, Worker, Node, and battle prototype. Vite transformation and type checking are separate, while API/MCP contracts are maintained by dedicated tests.

Public deployment is reserved for `v*` tag GitHub Actions. The pipeline gates D1 migration, Worker deployment, and health checks in that order, then smoke-tests the Appwrite Sites publication. Follow [`APPWRITE_MIGRATION.md`](APPWRITE_MIGRATION.md) for Firebase migration validation and cutover.

## Documentation

- [Visual design source of truth](DESIGN.md)
- [Technical specification](PROJECT_SPEC.md)
- [Design tokens](design/TOKENS.json)
- [Component specification](design/COMPONENTS.md)
- [Screen blueprints](design/SCREENS.md)
- [Asset manifest](design/ASSET_MANIFEST.md)
- [Golden references](design/reference/README.md)
- [Public beta roadmap](ROADMAP.md)
- [Public URL guide](docs/public-urls.md)
- [API / MCP / OAuth setup](API_MCP_SETUP.md)
- [Tagged release setup](RELEASE_SETUP.md)
- [Guilduo E2 brand rollout](docs/brand-rollout.md)
- [Privacy](PRIVACY.md)
- [Terms](TERMS.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Assets](ASSETS.md)
- [License](LICENSE)

## License

Guilduo is licensed under GNU AGPL-3.0-only. If you provide a modified version over a network, follow the source-availability requirements of that license.
