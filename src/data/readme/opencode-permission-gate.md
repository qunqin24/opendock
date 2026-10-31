# opencode-plugins

Plugins for OpenCode v2 (`opencode2`). Each plugin is a separate npm package in `plugins/<name>/`.

## Plugins

| Plugin | What it does |
| --- | --- |
| [permission-gate](./plugins/permission-gate) | Reviews permission requests with a model, so OpenCode can run in an "auto mode" with simple permission rules. |

## Develop

Install the dependencies from the repository root:

```bash
npm install
```

Run the checks:

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

See [AGENTS.md](./AGENTS.md) for how to add a plugin.

## License

MIT
