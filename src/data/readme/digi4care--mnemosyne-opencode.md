# Mnemosyne OpenCode integration

Automatic project and shared memory for OpenCode, backed by Mnemosyne. You do not
need to manage a database or ask the AI to remember things: turn memory on once, then
check or correct it with a few simple commands.

- **[Working with memory](docs/working-with-memory.md)** — start here. What the plugin
  does, how to work with it, what it deliberately does not do, and why it is built this
  way. Read this before enabling it for the first time.
- **[Plugin reference](plugins/mnemosyne-opencode/README.md)** — command reference,
  configuration, environment variables, troubleshooting.
- **[Changelog](CHANGELOG.md)** — what changed in each package version.

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
"plugins": [ "@digi4care/mnemosyne-opencode" ]
```

Or, from a local checkout, use the absolute path to `plugins/mnemosyne-opencode`.
Then restart OpenCode and enable memory for your project:

```
/mnemosyne file
/mnemosyne on
```

Read the [plain-language guide](docs/working-with-memory.md) before turning on
shared memory. While shared mode is on, project-specific chat turns are saved there too.

Requires `uv`/`uvx` and Node.js 22.19.0+. The `embedded` backend additionally requires Ollama
with `nomic-embed-text`; `file` has no extra dependency.

## Repository layout

- `plugins/mnemosyne-opencode` — the plugin. This is what gets installed into OpenCode.
- `docs/` — working guide.
- `scripts/` — end-to-end smoke tests and runtime helpers.
- `interview/` — prior specs.
- `results/` — smoke test evidence.
- `.mnemosyne/` — local bank, gitignored.

## Development

```bash
cd plugins/mnemosyne-opencode
npm install
npm test

# end-to-end: proves automatic recall in a fresh session, per backend
OPENCODE_MODEL=opencode-go/cat-jam-free bash scripts/smoke-native-abc.sh
```
