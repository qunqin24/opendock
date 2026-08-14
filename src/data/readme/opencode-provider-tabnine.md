# opencode-provider-tabnine

OpenCode plugin that exposes Tabnine Agentic models as provider `tabnine`.

## Install

Install OpenCode, then install the provider plugin from npm:

```bash
opencode plugin -g opencode-provider-tabnine
opencode auth login --provider tabnine
```

Enter your Tabnine tenant URL when prompted, then choose browser or manual login. `TABNINE_HOST` configures normal provider operation but is not used to prefill the interactive login prompt.

## Use From Source

Add the plugin to an OpenCode config:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-tabnine"]
}
```

Then authenticate:

```bash
opencode auth login tabnine
```

For normal provider operation, set `TABNINE_HOST` or make sure Tabnine CLI has `~/.tabnine/agent/settings.json` with `general.tabnineHost`. Use your Tabnine tenant URL:

```bash
export TABNINE_HOST=https://tabnine.example.com
```

Browser login starts a local callback server and opens Tabnine's custom-token login page. The plugin also honors `TABNINE_TOKEN`, `TABNINE_JWT`, and `TABNINE_REFRESH_TOKEN` for non-interactive configuration.

After the first login, restart OpenCode so the config hook can load the persisted Tabnine host and refresh token, then choose provider `tabnine`.

## Models

When credentials are available, the plugin calls `GET /chat/v2/models`, filters to models with the `agent` capability, and registers the live list. Model IDs are tenant-specific, so the plugin does not bundle a fallback catalog.

## Development

```bash
bun install
bun run check
bun run clean && bun run build
npm pack --dry-run
```
