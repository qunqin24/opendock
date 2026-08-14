# create-opencode-plugin

Scaffold a new OpenCode plugin with a single command.

## Usage

```bash
bun create opencode-plugin my-plugin
cd my-plugin
bun install
bun dev
```

Or create in the current directory:

```bash
bun create opencode-plugin .
```

## What's included

- TypeScript configuration
- Build setup with Bun
- oxlint + oxfmt for linting and formatting
- `bun dev` - run OpenCode with your plugin loaded from source
- `bun check` - run all checks (format, lint, typecheck)
- `npm publish` ready

## Plugin structure

```
my-plugin/
  src/
    index.ts     # Plugin entry point
  dev.ts         # Development script
  package.json
  tsconfig.json
  .oxlintrc.json
  .oxfmtrc.json
  .gitignore
  README.md
```

## License

MIT
