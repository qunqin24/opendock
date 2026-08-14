# OpenCode Model Tracker

An OpenCode plugin that records model, agent, token, cost, and quality metrics locally. All data stays on your machine.

## What it does

The plugin hooks into the OpenCode event stream and intercepts tool execution to capture:

- **Per-task metrics**: agent name, model, provider, token counts (input, output, cache read/write), cost, and wall-clock duration.
- **Quality signals**: retry count, finish reason, and error presence drive an automatic inferred quality score (1–5). You can override it with `rate_last_task`.
- **Composite score**: a single 0–1 signal combining quality (50%), token efficiency (30%), and speed (20%).

Metrics are written to a local SQLite database under your OpenCode config directory. A localhost admin dashboard lets you browse records, manage the model registry, and sync agent assignments.

No data is sent to any external service.

## Installation

For normal OpenCode usage, add the package name to `opencode.json` in the next section. OpenCode resolves plugin packages from the config entry, so a separate global install is usually unnecessary.

For local development or explicit installation, install from npm:

```bash
npm install -g opencode-model-tracker
```

Or add it as a project dependency:

```bash
npm install opencode-model-tracker
```

## OpenCode configuration

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-model-tracker"]
}
```

The plugin starts automatically when OpenCode loads. A log line is written to stderr confirming the admin UI address:

```
[model-tracker] Admin UI: http://127.0.0.1:4747
```

## Dashboard

The admin dashboard is available at `http://127.0.0.1:4747` and is bound exclusively to localhost. It is not accessible from other machines.

To retrieve the URL from within an OpenCode session, call the plugin-provided OpenCode tool:

```
model_tracker_status
```

The tool returns the current dashboard URL. Open it in a browser to view performance records, inspect per-agent and per-model stats, and manage the model registry.

The dashboard embeds a random admin token in the served HTML at startup. Write endpoints (registry updates, record mutations) require this token via the `x-model-tracker-admin-token` request header. The token is not persisted and rotates on each service restart.

## Model registry and assignment sync

On first run, the plugin seeds a user-local `models.json` from the bundled `models.example.json`. This registry maps model IDs to metadata and assigns default models to named agents.

You can edit the registry through the dashboard or by directly modifying the registry file at the path shown in `REGISTRY_PATH` (see [Configuration](#configuration)). The sync function reads agent definitions from your OpenCode config directory and writes model assignments back to `opencode.json`.

The bundled `models.example.json` is updated with each package release and is never overwritten once the user registry exists.

## Data stored locally

By default the plugin writes to:

| Path | Contents |
|---|---|
| `$HOME/.config/opencode/model-tracker/model-performance.sqlite` | Performance metrics database |
| `$HOME/.config/opencode/model-tracker/models.json` | User model registry |

Both paths can be overridden with environment variables (see [Configuration](#configuration)).

**To purge all metrics:**

```bash
rm "$HOME/.config/opencode/model-tracker/model-performance.sqlite"
```

**To reset the model registry to the bundled defaults:**

```bash
rm "$HOME/.config/opencode/model-tracker/models.json"
```

The registry is reseeded from `models.example.json` on the next plugin load.

## Configuration

All paths are resolved at startup. Override them with environment variables before launching OpenCode.

| Variable | Default | Description |
|---|---|---|
| `OPENCODE_CONFIG_DIR` | `$HOME/.config/opencode` | Root OpenCode config directory. Affects all defaults below. |
| `MODEL_TRACKER_REGISTRY_PATH` | `$OPENCODE_CONFIG_DIR/model-tracker/models.json` | User model registry file. |
| `MODEL_TRACKER_DB_PATH` | `$OPENCODE_CONFIG_DIR/model-tracker/model-performance.sqlite` | SQLite metrics database. |
| `MODEL_TRACKER_AGENT_DIR` | `$OPENCODE_CONFIG_DIR/agent` | Directory scanned for agent definitions during sync. |
| `MODEL_TRACKER_OPENCODE_JSON` | `$OPENCODE_CONFIG_DIR/opencode.json` | OpenCode config file updated by assignment sync. |

Example — redirect all plugin data to a project-local directory:

```bash
export OPENCODE_CONFIG_DIR="$PWD/.opencode"
opencode
```

## Security and privacy

- **Localhost only**: the admin service binds to `127.0.0.1:4747`. It is not reachable from other network interfaces.
- **Random admin token**: a cryptographically random token is generated at service startup and embedded in the served HTML. Write endpoints reject requests without this token.
- **No remote telemetry**: all data is written locally. No metrics, session IDs, or model names leave the machine.
- **Text truncation**: task descriptions and notes are capped at 200 characters before persistence and at the point of capture.
- **Path isolation**: health and error responses do not include local filesystem paths.
- **Generated files ignored**: `models.json`, `*.sqlite`, `*.sqlite-*`, and `model-performance.json` are listed in `.gitignore` and excluded from the published npm package.

## Development

Requirements: Node.js `>=22.5.0`.

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Fail on high/critical dependency advisories
npm run audit:high

# Scan publication-relevant files for private paths
npm run check:private-paths

# Preview the npm package contents without publishing
npm run pack:dry-run
```

Tests use the Node.js built-in test runner (`node --test`). No additional test framework is required.

## Publishing

The package is published to npm as `opencode-model-tracker`.

Releases are automated from Conventional Commits on `main` using semantic-release. npm publishing runs through GitHub Actions with npm Trusted Publishing, so releases include provenance and do not require long-lived npm tokens.

Maintainers should create release commits using Conventional Commit messages (`feat:`, `fix:`, etc.); semantic-release determines the next version and publishes it automatically.

## Release status

The package is published on npm as `opencode-model-tracker`.

## Troubleshooting

**`node:sqlite` not found / SQLite backend missing**

The plugin uses `node:sqlite` (available in Node.js from v22.5.0) when running under Node.js, and `bun:sqlite` when running under Bun. If you see an error about a missing SQLite backend:

- Verify your Node.js version is `>=22.5.0`: `node --version`
- If OpenCode runs under a Bun-compatible runtime, the `bun:sqlite` backend is used automatically.
- Upgrade Node.js or switch to a Bun-backed OpenCode distribution if neither backend is available.

**`ExperimentalWarning: SQLite is an experimental feature`**

This warning is expected on Node.js 22 and can be safely ignored. It does not affect functionality. Node.js 24 and later promote `node:sqlite` to stable.

**Plugin not loading**

Check that `opencode-model-tracker` appears in the `plugin` array in `opencode.json` and that the package is installed in a location OpenCode can resolve. Run `npm list opencode-model-tracker` to confirm installation.

**Admin UI not reachable**

Confirm port 4747 is not in use by another process. The plugin writes the resolved URL to stderr on startup — check OpenCode's log output for the `[model-tracker] Admin UI:` line.

## License

MIT. See [LICENSE](LICENSE).
