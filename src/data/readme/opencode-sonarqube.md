# opencode-sonarqube

OpenCode plugin for SonarQube integration — enterprise-level code quality, right inside your AI coding session.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Built with Bun](https://img.shields.io/badge/built%20with-Bun-fbf0df)](https://bun.sh)
[![Tests](https://img.shields.io/badge/tests-740-brightgreen)](#quality-metrics)
[![npm version](https://img.shields.io/npm/v/opencode-sonarqube)](https://www.npmjs.com/package/opencode-sonarqube)

The plugin gives your OpenCode agent a `sonarqube` tool plus automatic, hands-off
quality feedback: it runs analysis when the agent goes idle, injects the current
quality-gate status into the system prompt, and surfaces new issues as you code.

## Features

- **`sonarqube` agent tool** with 15 actions (analyze, issues, hotspots, metrics, …)
- **Automatic analysis** when the agent becomes idle (configurable)
- **Clean as You Code** — focus on issues in *new* code via `newissues`
- **Quality-gate awareness** — status is injected into the system prompt automatically
- **Security hotspots** — review, resolve, and bulk-dismiss via the API
- **Git-aware** — detects pull/merge/push and suggests quality checks
- **Session-compaction safe** — quality context survives long conversations
- **Multi-language** — works with any language SonarQube supports
- **Configurable strictness** — `enterprise` / `standard` / `relaxed` / `off`

## Installation

### Option A — one-line installer (interactive)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/mguttmann/opencode-sonarqube/main/scripts/install.sh)
```

The installer checks prerequisites (Bun/npm), asks for your SonarQube URL,
username and password, tests the connection, registers the plugin in
`opencode.json`, and writes the environment variables to your shell profile.

For CI / non-interactive use, provide the values up front:

```bash
# SONAR_URL here is only the installer's input value: the installer persists it
# as SONAR_HOST_URL in your shell profile. The plugin/runtime reads SONAR_HOST_URL.
export SONAR_URL=https://your-sonarqube-server.com
export SONAR_USER=admin
export SONAR_PASSWORD=your-password
curl -fsSL https://raw.githubusercontent.com/mguttmann/opencode-sonarqube/main/scripts/install.sh | bash
```

### Option B — manual

```bash
bun add opencode-sonarqube   # or: npm install opencode-sonarqube
```

Register the plugin in your project's `opencode.json`:

```json
{
  "plugin": ["opencode-sonarqube"]
}
```

Then set the required environment variables (see below), restart OpenCode, and
initialize the project once with `sonarqube({ action: "setup" })`.

### Updating

```bash
bun add opencode-sonarqube@latest   # or: npm install opencode-sonarqube@latest
```

Restart OpenCode afterwards to load the new version.

## Configuration

Configuration comes from two places — **environment variables** for the server
and credentials, and an optional **`.sonarqube/config.json`** for plugin
behaviour. (`opencode.json` is only used to register the plugin, not to
configure it.)

### Environment variables (required)

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
export SONAR_HOST_URL="https://your-sonarqube-server.com"
export SONAR_USER="admin"
export SONAR_PASSWORD="your-password"   # a SonarQube token also works here
```

To change your URL, credentials, or settings later, run `./scripts/configure.sh`.

### Plugin behaviour (optional)

Create `.sonarqube/config.json` in your project root:

```json
{
  "level": "enterprise",
  "autoAnalyze": true,
  "newCodeDefinition": "previous_version"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `"enterprise"` \| `"standard"` \| `"relaxed"` \| `"off"` | `"enterprise"` | Analysis strictness |
| `autoAnalyze` | `boolean` | `true` | Auto-analyze when the agent becomes idle |
| `projectKey` | `string` | auto | SonarQube project key (derived from `package.json` or directory) |
| `projectName` | `string` | auto | Display name on SonarQube |
| `newCodeDefinition` | `"previous_version"` \| `"number_of_days"` \| `"reference_branch"` \| `"specific_analysis"` | `"previous_version"` | How "new code" is defined |
| `exclusions` | `string` | - | File exclusion patterns (glob) |

> `.sonarqube/` contains a generated project token — it is git-ignored by the
> installer and **must never be committed**.

### Strictness levels

| Level | Behaviour |
|-------|-----------|
| `enterprise` | All severities reported; 80%+ coverage expected for validation |
| `standard` | Major and above |
| `relaxed` | Only blocker / critical |
| `off` | Plugin disabled |

## Tool Actions

The plugin exposes a single `sonarqube` tool. `action` selects the operation
(`setup` and `init` are aliases):

| Action | Description |
|--------|-------------|
| `setup` / `init` | Initialize the project (auto-creates it on SonarQube if needed) |
| `analyze` | Run a full analysis and return issues |
| `issues` | All current issues |
| `newissues` | Only issues in **new** code (Clean as You Code) |
| `worstfiles` | Files with the most issues (prioritize refactoring) |
| `hotspots` | Security hotspots needing manual review |
| `reviewhotspot` | Review/resolve hotspots (`SAFE` / `FIXED` / `ACKNOWLEDGED`) |
| `duplications` | Code duplications across the project |
| `status` | Quality-gate status and metrics |
| `validate` | Check against enterprise quality standards |
| `metrics` | Detailed code metrics |
| `rule` | Explain a SonarQube rule (requires `ruleKey`) |
| `history` | Past analysis history |
| `profile` | Active quality profile |
| `branches` | Branch analysis status |

### Options

```typescript
sonarqube({
  action: "analyze" | "issues" | "newissues" | "worstfiles" | "status" |
          "validate" | "hotspots" | "reviewhotspot" | "duplications" | "rule" |
          "history" | "profile" | "branches" | "metrics" | "setup" | "init",
  scope: "all" | "new" | "changed",          // default: all
  severity: "blocker" | "critical" | "major" | "minor" | "info" | "all",
  fix: true | false,                          // include fix suggestions
  projectKey: "override-key",
  force: true | false,                        // force re-initialization
  ruleKey: "typescript:S1234",                // for "rule"
  branch: "feature-branch",                   // for multi-branch analysis
  hotspotKey: "uuid-of-hotspot",              // for "reviewhotspot" (omit for bulk)
  resolution: "SAFE" | "FIXED" | "ACKNOWLEDGED",
  comment: "Reason for the decision"
})
```

## Usage

```typescript
// First run: initialize the project
sonarqube({ action: "setup" })

// Run analysis with fix suggestions
sonarqube({ action: "analyze", fix: true })

// Only your recent changes (Clean as You Code)
sonarqube({ action: "newissues" })

// Files that need the most attention
sonarqube({ action: "worstfiles" })

// Only critical+ issues
sonarqube({ action: "issues", severity: "critical" })

// Explain a rule
sonarqube({ action: "rule", ruleKey: "typescript:S3776" })

// List security hotspots, then bulk-review them as safe
sonarqube({ action: "hotspots" })
sonarqube({ action: "reviewhotspot", resolution: "SAFE", comment: "Reviewed: no risk" })
```

See [`examples/basic-typescript`](./examples/basic-typescript) for a runnable
sample project with intentional issues to detect.

## Automatic behaviours

- **Session start** — checks for existing issues and injects quality status into the system prompt.
- **Idle** — when `autoAnalyze` is on and files were edited, runs analysis and reports new issues.
- **Git operations** — after `pull`/`merge`/`rebase`/`checkout` it suggests a re-check; after `push` it shows a toast.
- **Session compaction** — preserves the latest quality state across compaction.

## CLI usage

The plugin also works without OpenCode:

```bash
bun run src/index.ts --setup
bun run src/index.ts --analyze
bun run src/index.ts --status
bun run src/index.ts --issues
bun run src/index.ts --status --project-key=my-project
bun run src/index.ts --setup --force
```

## Project state

The plugin stores per-project state in `.sonarqube/project.json` (auto-generated,
git-ignored — contains the project token):

```json
{
  "projectKey": "my-project",
  "initializedAt": "2026-01-01T00:00:00.000Z",
  "languages": ["typescript", "javascript"],
  "setupComplete": true
}
```

## Troubleshooting

**Cannot connect to the server** — make sure `SONAR_HOST_URL` includes the
protocol (`https://`), the server is reachable, and credentials are valid:

```bash
curl -s "$SONAR_HOST_URL/api/system/status" | jq .status        # expect "UP"
curl -u "$SONAR_USER:$SONAR_PASSWORD" "$SONAR_HOST_URL/api/authentication/validate"
```

**Authentication failed (401)** — reload your shell (`source ~/.zshrc`) and check
that `SONAR_HOST_URL` / `SONAR_USER` / `SONAR_PASSWORD` are set. Quote passwords
containing special characters.

**Plugin doesn't load** — confirm it is listed in `opencode.json`
(`"plugin": ["opencode-sonarqube"]`), reinstall if needed, and restart OpenCode.

**Quality gate fails with no visible issues** — usually unreviewed security
hotspots. List them with `sonarqube({ action: "hotspots" })` and review with
`sonarqube({ action: "reviewhotspot", resolution: "SAFE" })`.

Requests time out after 30 seconds and are retried automatically (up to 3 times
with exponential backoff). If the server is offline the plugin skips silently and
reconnects when it is back.

## FAQ

**Where is configuration stored?** Server URL and credentials live in environment
variables; optional plugin behaviour lives in `.sonarqube/config.json`; the plugin
registration lives in `opencode.json`.

**Can I use a token instead of a password?** Yes — put the token in
`SONAR_PASSWORD` (keep your username in `SONAR_USER`), or leave `SONAR_USER` empty
and use the token as the password.

**Different servers per project?** Use [direnv](https://direnv.net/) with a
project-local `.envrc` that exports the `SONAR_*` variables, or source a
per-project env script before launching OpenCode.

**What happens offline?** Startup injection is skipped, analysis returns a clear
connection error, the last results stay cached in `.sonarqube/project.json`, and
requests auto-retry.

## Requirements

- SonarQube server 9.9+ (also tested against newer releases)
- Node.js 18+ or Bun
- OpenCode with plugin support

## Quality metrics

This project is built to enterprise-level standards and analyzed by its own
SonarQube quality gate in CI on every push.

| Metric | Value |
|--------|-------|
| Tests | 740 (705 passing, 35 skipped) |
| Function coverage | ~96% |
| Line coverage | ~91% |
| Runtime | Bun + TypeScript (strict mode) |
| Dependencies | `@opencode-ai/plugin`, `zod` |

## CI/CD

GitHub Actions builds and tests on every push, runs the SonarQube quality gate,
and publishes to npm on version tags once the gate passes.

```
Build & Test  ──▶  SonarQube Quality Gate  ──▶  Publish to npm (tags only)
```

Required repository secrets: `NPM_TOKEN`, `SONAR_TOKEN`, `SONAR_HOST_URL`.

## Documentation

| Document | Description |
|----------|-------------|
| [SonarQube Setup](./docs/SONARQUBE_SETUP.md) | Server installation guide |
| [Contributing](./CONTRIBUTING.md) | Development guidelines |
| [Changelog](./CHANGELOG.md) | Version history |
| [Security Policy](./SECURITY.md) | Reporting vulnerabilities |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Please open
an issue before large changes.

## License

[MIT](./LICENSE) © Manuel Guttmann

## Links

- [GitHub repository](https://github.com/mguttmann/opencode-sonarqube)
- [Issue tracker](https://github.com/mguttmann/opencode-sonarqube/issues)
- [SonarQube documentation](https://docs.sonarqube.org/)
