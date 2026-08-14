# opencode-yaml-workflows

[中文](./README.zh-CN.md) | **English**

Run repeatable opencode workflows from YAML. Use `/workflow` to run an existing workflow, or ask it to create a new one for review, audit, research, migration, or any other multi-agent routine you want to keep, edit, and reuse.

## Install

Add the plugin to your opencode config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-yaml-workflows"]
}
```

Restart opencode after changing the config.

For local development:

```bash
git clone https://github.com/dingyi222666/opencode-yaml-workflows
cd opencode-yaml-workflows
bun install
bun run build
```

Then point your config at the local path:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/absolute/path/to/opencode-yaml-workflows"]
}
```

## Use

Put workflow files in one of these places:

- `~/.config/opencode/workflows/`
- `.opencode/workflows/`
- `.workflows/`

Then run an existing workflow with:

```text
/workflow review the current diff
```

Or ask the model to create a new workflow:

```text
/workflow create a release-check workflow for this repo and save it
```

The model will either find a matching workflow, or generate a new YAML workflow from your request. If you ask it to save the result, it can write the workflow to `.workflows/` or `.opencode/workflows/` for reuse.

## Why YAML?

Claude Code Dynamic Workflows generate JavaScript orchestration scripts at runtime. This plugin uses YAML instead, so the workflow is easy to read, diff, commit, and share with a team.

Use it when you want stable workflows that live with your project, such as code review, security audit, release checks, or recurring research.

## Docs

- [Install](./docs/install.md)
- [Writing Workflows](./docs/workflows.md)
- [Running Workflows](./docs/running.md)
- [Dynamic Workflows Comparison](./docs/dynamic-workflows.md)
- [Development](./docs/development.md)

## Development

```bash
bun test
bun run check
bun run build
npm pack --dry-run
```

## License

MIT
