# opencode-squad

OpenCode plugin that packages the Squad agent and tool runtime.

> [!WARNING]
> **Early alpha:** `opencode-squad` is still evolving quickly. Expect breaking changes in configuration, bundled agents, tools, commands, and runtime behavior before a stable release.
> For production or shared setups, pin a concrete package version instead of using `@latest`.

## What it provides

`opencode-squad` extends OpenCode with:

- primary agents with stable routing keys such as `primary/alpha`, `primary/architect`, `primary/developer`, and `primary/orchestrator`
- hidden slash-command agents such as `beta` for `/beta` second-opinion reviews, with stable `squad/*` routing keys for configuration
- specialized subagents for codebase analysis, code review, project documentation, web research, and council-style reasoning
- custom tools for container inspection, isolated execution, external repository research, SearXNG search, scratchpad state, handoffs, review context, file inspection, and diagnostics
- bundled container definitions used by containerized tools
- strict JSON configuration through `squad.json`

## Local usage

```json
{
  "plugin": ["/absolute/path/to/opencode-squad"]
}
```

Or with inline plugin options:

```json
{
  "plugin": [
    [
      "/absolute/path/to/opencode-squad",
      {
        "models": {
          "providers": {
            "gpt": ["openai/gpt-5.5", "opencode/gpt-5.2-codex"]
          },
          "handlers": {
            "primary": "@provider/gpt"
          }
        }
      }
    ]
  ]
}
```

For npm/package usage, add the package name instead of a local path:

```json
{
  "plugin": ["@geck-dev/opencode-squad@latest"]
}
```

## Configuration

The plugin reads `squad.json` from:

1. global OpenCode config dir: `$OPENCODE_CONFIG_DIR/squad.json` or `~/.config/opencode/squad.json`
2. project config: `<project>/.opencode/squad.json`
3. plugin tuple options in `opencode.json` — highest priority

See [`docs/dev/configuration.md`](docs/dev/configuration.md).

For editor validation in `squad.json`, use the raw schema URL:

```json
{
  "$schema": "https://raw.githubusercontent.com/geck-dev/opencode-squad/main/schema/squad.schema.json"
}
```

Do not use GitHub's `/blob/` URL for `$schema`; it returns an HTML page, not raw JSON.

## Documentation

- Public main manual: <https://geck.dev/opencode-squad/>
- Internal architecture and development docs: [`docs/dev`](docs/dev)
- [Architecture](docs/dev/architecture.md)
- [Agents](docs/dev/agents.md)
- [Tools](docs/dev/tools.md)
- [Containers](docs/dev/containers.md)
- [Configuration](docs/dev/configuration.md)
- [Development](docs/dev/development.md)
- [Roadmap](docs/dev/roadmap.md)

## Development

```bash
bun install
bun run check
```

Build the optional static manual into the ignored root `manual/` directory:

```bash
bun run manual:build
```
