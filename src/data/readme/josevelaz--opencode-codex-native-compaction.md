# @josevelaz/opencode-codex-native-compaction

[![CI](https://github.com/josevelaz/opencode-codex-native-compaction/actions/workflows/ci.yml/badge.svg)](https://github.com/josevelaz/opencode-codex-native-compaction/actions/workflows/ci.yml)
[![Documentation](https://github.com/josevelaz/opencode-codex-native-compaction/actions/workflows/pages.yml/badge.svg)](https://josevelaz.github.io/opencode-codex-native-compaction/)

Use native OpenAI Codex checkpoints instead of text summaries when OpenCode compacts a conversation. The plugin sends model-facing history to Codex's `remote_compaction_v2` feature and restores its opaque checkpoint on later turns.

**[Documentation](https://josevelaz.github.io/opencode-codex-native-compaction/)** · **[Releases](https://github.com/josevelaz/opencode-codex-native-compaction/releases)** · **[Issues](https://github.com/josevelaz/opencode-codex-native-compaction/issues)**

> [!WARNING]
> Experimental. The recorded tested OpenCode version is `v0.0.0-beta-18286`, and the package pins that beta API. Newer V2 builds are not verified. This plugin uses the ChatGPT Codex subscription backend, not the public OpenAI API compaction endpoint.

## Quick start

You need OpenCode V2 and an OpenAI ChatGPT/Codex subscription connected in OpenCode. The request must use `https://chatgpt.com/backend-api/codex/*/responses`.

Once a release is available on npm, add the package to the `plugins` array in your `opencode.jsonc`. Preserve your other config entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@josevelaz/opencode-codex-native-compaction"]
}
```

Restart the service:

```sh
opencode2 service restart
opencode2 service status
```

Use an OpenAI subscription model for a normal turn before compacting. OpenCode still controls when compaction runs; the plugin adds no threshold settings. A successful native compaction writes this marker to the transcript:

```markdown
## Additional Context
OpenAI Codex native checkpoint [oc-codex:v1:<uuid>]
```

For installation before npm publication, version pinning, and debug settings, see [Getting started](https://josevelaz.github.io/opencode-codex-native-compaction/getting-started.html).

## Important limits

- **Keep the same model and variant.** A checkpoint can replay only on the OpenAI model and variant that created it. Switching to a different OpenAI subscription model blocks replay.
- **Other providers cannot read the checkpoint.** When a marker-bearing request switches to another provider or a non-subscription route, only messages after the checkpoint are sent, with a durable warning. Compaction there is blocked; switch back first.
- **Keep plugin storage.** The transcript marker is only an ID. It cannot restore a checkpoint if the stored data is missing. Disabling the plugin does not convert old checkpoints to text summaries.
- **Storage can contain sensitive context.** The plugin stores request context, retained history, and opaque provider data through OpenCode's storage API. It sends history to OpenAI. Session deletion does not explicitly remove all checkpoint records.
- **Backend changes can break compaction.** Malformed or incomplete native responses fail rather than creating a partial checkpoint.

Read [How it works](https://josevelaz.github.io/opencode-codex-native-compaction/how-it-works.html) for retention, provider switching, and data handling.

## Development

Use Bun with lockfile v2 support (Bun 1.4 or later) and Node.js 24 or later:

```sh
bun install --frozen-lockfile
bun run validate
bun run pack:check
```

`validate` runs the existing tests and TypeScript checks. See the [development guide](https://josevelaz.github.io/opencode-codex-native-compaction/development.html) and [release guide](https://josevelaz.github.io/opencode-codex-native-compaction/releases.html) for maintainer tasks.

## License

[MIT](LICENSE) © Jose Velazquez
