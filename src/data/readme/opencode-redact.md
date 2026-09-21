# opencode-plugins

This directory holds **independently installable** OpenCode plugins. Install only what you need — they do not depend on each other.

| Directory | npm package | Install independently |
|-----------|-------------|------------------------|
| [`opencode-redact/`](./opencode-redact) | `opencode-redact` | `"plugin": ["opencode-redact"]` |
| [`opencode-auto-approve/`](./opencode-auto-approve) | `opencode-auto-approve` | `"plugin": ["opencode-auto-approve"]` |

## Install one plugin

```bash
# only redaction
npx opencode-redact install redact

# only auto-approve
npx opencode-redact install auto-approve
```

Or write `opencode.json` yourself (any subset):

```json
{
  "plugin": ["opencode-redact"]
}
```

```json
{
  "plugin": ["opencode-auto-approve"]
}
```

Both:

```json
{
  "plugin": ["opencode-redact", "opencode-auto-approve"]
}
```

Then install npm deps under `~/.config/opencode` for whichever package names you listed.

## Local install from this directory

```bash
# each plugin is a standalone package under this folder
npx opencode-redact/src/cli.ts install --local ./opencode-redact
# auto-approve from a local path entry in opencode.json:
#   "plugin": ["file:///abs/path/opencode-plugins/opencode-auto-approve/src/index.ts"]
```

## Develop

```bash
bun install
bun test
```

Each subdirectory is a normal npm package (`package.json` + `src/`). Publish them separately if needed.

## License

MIT
