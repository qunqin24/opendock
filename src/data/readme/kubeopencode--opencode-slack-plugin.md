# kubeopencode-plugins

First-party plugins for [KubeOpenCode](https://github.com/kubeopencode/kubeopencode) — a Kubernetes-native AI Agent Platform built on [OpenCode](https://opencode.ai).

Each plugin is an independent npm package published under the `@kubeopencode` scope. Plugins follow the [OpenCode plugin API](https://opencode.ai/docs) and can be installed into any KubeOpenCode Agent via `spec.plugins`.

## Plugins

| Plugin | npm | Description |
|--------|-----|-------------|
| [opencode-slack-plugin](./opencode-slack-plugin/) | [`@kubeopencode/opencode-slack-plugin`](https://www.npmjs.com/package/@kubeopencode/opencode-slack-plugin) | Slack Socket Mode integration — chat with your Agent from Slack threads |

## Quick Start

### Install in KubeOpenCode

Declare the plugin in your Agent spec:

```yaml
apiVersion: kubeopencode.io/v1alpha1
kind: Agent
metadata:
  name: my-agent
spec:
  plugins:
    - name: "@kubeopencode/opencode-slack-plugin"
      target: server
  credentials:
    - secretRef:
        name: slack-credentials
```

### Install in standalone OpenCode

Add to your `opencode.json`:

```json
{
  "plugin": ["@kubeopencode/opencode-slack-plugin"]
}
```

## Development

### Prerequisites

- Node.js >= 22 (local development)
- Node.js >= 24 is used in CI for npm OIDC trusted publishing (npm 11.5.1+ required)

### Build

```bash
make install      # install dependencies
make typecheck    # type-check (tsc --noEmit)
make build        # build (tsup -> dist/)
```

### Build a specific plugin

```bash
make build PLUGIN_DIR=opencode-slack-plugin
```

## Release

Releases are automated via GitHub Actions using [npm OIDC Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) — no npm tokens required.

### Publishing a new version

1. Update the version in the plugin's `package.json`:

   ```bash
   cd opencode-slack-plugin
   npm version patch   # or minor / major
   ```

2. Commit and push:

   ```bash
   git add -A
   git commit -s -m "release: opencode-slack-plugin v0.1.1"
   git push origin main
   ```

3. Tag and push to trigger CI:

   ```bash
   make release   # or: make release PLUGIN_DIR=opencode-slack-plugin
   ```

   This creates a git tag `opencode-slack-plugin/v0.1.1` and pushes it. GitHub Actions will automatically build, verify, and publish to npm with provenance.

### Tag format

Tags follow the pattern `<plugin-dir>/v<version>`, e.g. `opencode-slack-plugin/v0.1.0`. This supports independent versioning when more plugins are added.

### First-time setup for a new plugin

OIDC Trusted Publishing requires the package to already exist on npm. For a brand-new plugin:

1. Publish the first version manually:

   ```bash
   npm login
   make publish PLUGIN_DIR=my-new-plugin
   ```

2. Configure Trusted Publisher on [npmjs.com](https://www.npmjs.com):
   - Go to the package settings > Trusted Publisher
   - Owner: `kubeopencode`
   - Repository: `kubeopencode-plugins`
   - Workflow: `publish.yaml`
   - Environment: `release`

3. Create a `release` environment in GitHub repo settings (if not already done).

After this one-time setup, all subsequent releases are fully automated.

## Repository Structure

```
kubeopencode-plugins/
  README.md                         # This file
  AGENTS.md                         # AI agent development guidelines
  Makefile                          # Build and release targets
  .github/workflows/publish.yaml   # CI: automated npm publish on tag
  opencode-slack-plugin/            # Slack Socket Mode plugin
    src/index.ts
    package.json
    tsconfig.json
    dist/
    README.md
```

## Contributing

1. Each plugin lives in its own directory at the repo root
2. Use TypeScript with ESM (`"type": "module"`)
3. Use `@opencode-ai/plugin` as a peer dependency
4. See [AGENTS.md](./AGENTS.md) for detailed plugin architecture and conventions

## License

MIT
