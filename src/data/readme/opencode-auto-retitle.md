# opencode-auto-retitle

An [OpenCode](https://opencode.ai) plugin that keeps session titles current when a long session changes topic.

OpenCode names a session from its first message. Three hours and two topics later, the title still describes where
you started. opencode-auto-retitle has a cheap model check the title as you work, and renames the session when the topic
has clearly moved on.

## Highlights

- 🔄 Titles follow the work: checked after every compaction, every N messages, or both.
- 🪙 Costs a fraction of a cent per check: a small model reads how the session started, the last compaction summary and
  the latest messages, never tool output.
- 🧘 Leaves good titles alone: the model replies `KEEP` unless the topic has clearly changed, not for a short detour.
- ⌨️ `/retitle` renames the session now, and `/retitle <title>` sets a title that is never changed automatically.
- 🌍 Titles in your language: `"auto"` follows what you write, or set one such as `"English"`.
- 🧩 Subagent sessions are left alone.

## Getting started

You need [OpenCode](https://opencode.ai) 2.2 or later and a small model, such as Claude Haiku. Add the plugin to
`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-auto-retitle",
      "options": {
        "models": ["anthropic/claude-haiku-4-5"],
        "everyMessages": 15,
        "language": "auto"
      }
    }
  ]
}
```

OpenCode installs and loads it on save. Then, in any session:

```text
/retitle                  # Name the session after what it's about now.
/retitle Fix login bug    # Set the title, and keep it.
```

## Documentation

- [Configuration](docs/configuration.md): every option, and when the checks run.
- [Releasing](RELEASE.md): changesets and publishing to npm.

## Development

```sh
pnpm install
pnpm typecheck            # Type-check the plugin.
pnpm changeset            # Describe a change for the changelog.
```

To try local changes, set `package` to the absolute path of your checkout.

## License

[MIT](LICENSE)
