# lsp-suggest

Tell the agent when a language server is missing, and stay quiet when OpenCode
already runs one.

When the agent reads or edits a file whose language server is not installed,
the plugin appends a short hint to the tool output:

```
LSP server 'rust' for .rs is NOT INSTALLED.
Command not found: rust-analyzer

To install:
  rustup component add rust-analyzer

ACTION REQUIRED: ASK THE USER whether to install this LSP server.
If the user declines, proceed without LSP and do not ask again.
```

The agent sees the hint and asks you. Nothing is installed, nothing is blocked.

When the binary is already on `PATH` but OpenCode still runs no server, the
plugin appends a shorter note instead. An installed binary is not proof that
OpenCode uses it:

```
LSP server 'pyright' is installed, but OpenCode runs no server for it.
v2 runs no language server at all, so no setting turns it on. The port is
tracked in https://github.com/anomalyco/opencode/issues/38528
```

Each server gets this note once per session.

## Install

```bash
opencode plugin add @vasilvestre/opencode-lsp-suggest
```

Or list it in `opencode.jsonc`:

```jsonc
{
  "plugins": ["@vasilvestre/opencode-lsp-suggest"]
}
```

Requires OpenCode 2. The plugin has no dependency.

## When it stays quiet

The plugin says nothing when any of these is true:

| Condition | Why |
| --- | --- |
| You set `"lsp": true` in the plugin options | You told the plugin that OpenCode runs every server |
| OpenCode downloads that server itself | It would fight the download, so it stays out of the way |
| You declined that server before | The decision is in `lsp-install-decisions.json` |
| The file is outside the project directory | The project's `node_modules` and config do not apply |
| The tool call failed | The hint belongs on a working result |

OpenCode 2.2.5 drops the `lsp` key before the runtime sees it, and a plugin has
no way to read it either. The plugin therefore cannot know whether LSP is on.
If you run every server, mirror that in the plugin options:

```jsonc
{
  "plugins": [
    ["@vasilvestre/opencode-lsp-suggest", { "lsp": true }]
  ]
}
```

With `"lsp": true` the plugin says nothing, ever.

When the option stays unset, the hint also says that no `lsp` setting turns a
server on in 2.2.5. Installing the binary alone changes nothing.

## Servers OpenCode downloads itself

These servers never produce a hint, because OpenCode fetches them when `lsp` is
on: `astro`, `bash-ls`, `clangd`, `kotlin-ls`, `lua-ls`, `php`, `svelte`,
`terraform-ls`, `tinymist`, `vue`, `yaml-ls`.

Set `OPENCODE_DISABLE_LSP_DOWNLOAD=true` if you want to install them yourself
instead. The plugin still stays quiet, because OpenCode would use the binary on
your `PATH` once it exists.

## The `lsp` permission

`config.lsp` decides which servers start. The `lsp` permission decides whether
the agent may query them at all. It is one switch for everything, with no
per-server scope.

A `deny` permission makes the hint pointless, because OpenCode will not query
the server you install.

## Modes

| Mode | Behavior |
| --- | --- |
| `warn` (default) | Append the hint to the tool output |
| `silent` | Log the match to stderr, change nothing |

```jsonc
{
  "plugins": [
    ["@vasilvestre/opencode-lsp-suggest", { "mode": "silent" }]
  ]
}
```

## Decisions

The plugin reads and writes `lsp-install-decisions.json` in the OpenCode
config directory, the same file OmO uses:

```json
{
  "gopls": { "decision": "declined", "decidedAt": "2026-08-24T11:49:55.509Z" }
}
```

A `declined` entry silences the hint for that server. The plugin never writes
the file on its own: it only reads it. To silence a server, add the entry by
hand, or let the agent do it.

## Known limits

- OpenCode v2 runs no language server at all; the port is tracked in
  https://github.com/anomalyco/opencode/issues/38528. In 2.2.5 the editor
  config endpoint (`GET /api/config`) returns the document without the `lsp`
  key, so no block starts anything. The plugin still fires because the
  install advice holds once the port lands.
- The plugin checks that the binary exists. It does not check that the server
  starts, nor that it answers.
- The hint fires on `read`, `edit`, `write`, `multiedit` and `patch`. A file
  opened by another tool gets no hint.
- The server table covers 38 servers. A language outside it gets no hint.
- The plugin does not install anything. It only tells the agent what to run.
- A server that OpenCode does not ship as a built-in only helps when you add it
  to the `lsp` block yourself. The table also carries servers from the OmO
  list, such as `biome`, `ruff` and `texlab`.
- Plugins loaded from the `plugins/` directory get no options. To set `mode` or
  `lsp`, list the package in the `plugins` array instead of the directory.

## Test

```bash
npm test
```

## License

MIT. The server table derives from `@code-yeongyu/lsp-tools-mcp`, see
`NOTICE`.
