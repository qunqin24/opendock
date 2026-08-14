# idarouter OpenCode plugin

This plugin makes any OpenCode instance use an idarouter server as a live model/provider source.

When `IDAROUTER_URL` and `IDAROUTER_API_KEY` are both set, the plugin enables only router-discovered providers/models and hides all other OpenCode providers. `IDAROUTER_KEY` is also accepted as a backwards-compatible API key name. When credentials are missing, the plugin is a no-op: it does not add idarouter providers and leaves normal OpenCode providers/models unchanged.

## Install from npm

Add the npm package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-idarouter-provider"]
}
```

Then set the router URL and API key with environment variables:

```bash
export IDAROUTER_URL="https://ai.idanya.cc"
export IDAROUTER_API_KEY="sk-idarouter-..."
opencode
```

If an existing environment already uses `IDAROUTER_KEY`, that works too.

OpenCode installs npm plugins automatically at startup and caches them under `~/.cache/opencode/node_modules/`.

To pin a specific version:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-idarouter-provider@0.1.0"]
}
```

## Install locally

Copy or symlink `idarouter-provider.js` into one of these folders:

- Project: `.opencode/plugins/idarouter-provider.js`
- Global: `~/.config/opencode/plugins/idarouter-provider.js`

Then set the router URL and API key with environment variables:

```bash
export IDAROUTER_URL="http://YOUR_ROUTER_HOST:2400"
export IDAROUTER_API_KEY="sk-idarouter-..."
opencode
```

Or configure it explicitly in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["./.opencode/plugins/idarouter-provider.js", {
      "baseURL": "http://YOUR_ROUTER_HOST:2400",
      "apiKey": "sk-idarouter-..."
    }]
  ]
}
```

## Publish

From this directory:

```bash
npm login
npm run check
npm pack --dry-run
npm publish
```

For updates:

```bash
npm version patch
git push origin main --follow-tags
```

After publishing, restart OpenCode on each machine. If config uses an unpinned package name, OpenCode can install the latest version on startup; if config pins `@x.y.z`, update that version in `opencode.json`. See `RELEASE.md` for the first publish and trusted publishing setup.

## Behavior

- On OpenCode startup, if router credentials are configured, the plugin calls `GET /api/providers` with `Authorization: Bearer <api key>`.
- It replaces `cfg.provider` with returned providers, sets `enabled_providers` to those provider IDs, and points `model`/`small_model` to the first router model if the current defaults are outside the router.
- If router credentials are missing, it returns without changing config.
- It polls idarouter every 5 seconds by default and updates the same provider config object in place.
- Restart OpenCode only to install/change the plugin, plugin options, or environment variables. OpenCode config/plugins are startup-loaded.
- Model/admin changes in idarouter are reflected on the next poll. Because idarouter discovery uses a short model cache by default, changes made in the web UI should appear almost instantly after refreshing models or waiting for cache TTL.

Disable polling or change interval:

```json
{
  "plugin": [
    ["./.opencode/plugins/idarouter-provider.js", {
      "baseURL": "http://YOUR_ROUTER_HOST:2400",
      "apiKey": "sk-idarouter-...",
      "pollIntervalMs": 2000
    }]
  ]
}
```

## Recommended deployment

- Create a dedicated API key in idarouter Web UI -> API Keys for each OpenCode machine/user.
- Put `IDAROUTER_URL` and `IDAROUTER_API_KEY` in the machine's shell profile, systemd user environment, direnv file, or secrets manager. Existing setups can use `IDAROUTER_KEY` instead of `IDAROUTER_API_KEY`.
- Avoid embedding API keys in project `opencode.json` if the project is shared.
