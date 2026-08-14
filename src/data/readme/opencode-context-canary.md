# Context Canary

Context Canary is an [OpenCode](https://opencode.ai) plugin that watches for a
marker the model is instructed to append to each response. If the marker is
missing, it displays a one-time warning that response quality may be degrading
as context grows.

It is a heuristic, not a measurement of context-window usage. The plugin does
not compact sessions, change model settings, or send response content anywhere.

## Install

Add the package to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-context-canary"]
}
```

Restart OpenCode after changing its configuration.

## How It Works

1. Context Canary adds `<context-canary:ok>` to the system prompt and asks the
   model to emit it as the final line of each response.
2. It removes a detected marker before the response is displayed or persisted.
3. If a completed response omits the marker, it shows a warning once for that
   session.
4. A successful compaction resets the warning state.

The marker is only an indirect signal: models can omit it for reasons unrelated
to context pressure, and can preserve it even when their answer quality has
fallen. Treat the warning as a prompt to review the session, not a guarantee.

## Diagnostics

Run OpenCode with logs enabled to confirm that the plugin is active:

```sh
opencode --print-logs 2>&1 | tee ~/opencode.log
```

For each non-compaction response, the plugin emits one of these messages:

```text
context-canary: Context Canary marker detected and removed from completed response
context-canary: Context Canary marker missing from completed response
```

Diagnostics never include response content.

## Development

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run verify
```

`npm run verify` type-checks the source, runs the tests, and checks the npm
package contents without publishing it.

## Publishing

Publish the first version manually to reserve the package name:

```sh
npm publish --access public
```

Then configure npm trusted publishing for this repository and the
`opencode-context-canary` package. Subsequent GitHub releases are published by
GitHub Actions with npm provenance.

## License

[MIT](LICENSE)
