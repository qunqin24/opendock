# opencode-subagent-tools

Seven tools for OpenCode V2 that let an agent inspect and control subagent
sessions: list children and usage, cancel one session or the caller's running
descendants, steer or queue messages, and inject context.

> Plugin ID: `subagent-tools`. Default tool namespace: `subagent`.

Requires OpenCode 2.2.5+ with `ctx.session.list`.

## Quick start

```sh
opencode plugin add opencode-subagent-tools
```

GitHub:

```sh
opencode plugin add github:finnseefly/opencode-subagent-tools
```

After install, run `opencode reload` and ask the agent to call `subagent_list`.
For manual/local installation, see [installation](docs/installation.md).

## Tools

| Tool                          | What it does                                                 |
| ----------------------------- | ------------------------------------------------------------ |
| `subagent_list`               | List child sessions with status, age, cost, and token usage. |
| `subagent_usage`              | Read cost, tokens, and current context for a session.        |
| `subagent_cancel`             | Stop one session.                                            |
| `subagent_cancel_descendants` | Stop running descendants of the calling session.             |
| `subagent_steer`              | Send an instruction at the child's next model request.       |
| `subagent_queue`              | Queue a message as the next independent turn.                |
| `subagent_context`            | Inject a synthetic context message without starting a turn.  |

The plugin also registers a `subagent-tools` skill with operational guidance.
See the [tool reference](docs/reference.md#text-vs-json) for output formats and
per-tool defaults. Set `allowedOutputFormats` to `["text"]` or `["json"]` to
allow only one format; the default `["text", "json"]` enables the per-call
`format` choice.

Tool names above use the default `subagent` namespace. Change the `namespace`
option to use a different prefix. Nested subagents require
`experimental.subagent_depth` to be at least `2` in OpenCode; this is an OpenCode
setting, not a plugin option.

## Configuration

One power-user example; every option is optional. The values below are the
defaults. See [configuration](docs/configuration.md) for ranges and examples.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-subagent-tools",
      "options": {
        "namespace": "subagent", // tool prefix
        "enforcePermissions": true, // check mutations with subagent.control
        "sessionControlPolicy": "descendants", // mutations only; reads are unrestricted
        "allowedOutputFormats": ["text", "json"], // or ["text"] / ["json"]
        "registerSkill": true, // register SKILL.md as a skill
        "limits": {
          "maxDiscoveryNodes": 200,
          "maxDiscoveryDepth": 8,
          "maxDiscoveryPages": 5,
          "maxListRows": 20,
          "maxCancelBatch": 20,
          "maxTextLength": 16000,
        },
      },
    },
  ],
}
```

Mutations call the `subagent.control` permission action. Setting
`enforcePermissions: true` by itself does not prompt; add an `ask` or `deny` rule
to be asked or blocked. See [security model](docs/security-model.md).

## Pitfalls

- **Foreground children block the parent.** If you want to control a child while
  it runs, launch it as a background subagent.
- **`cancel` is a soft interrupt.** It does not cascade. A long tool call may
  finish first, and jobs owned by an idle session keep running.
- **Discovery stops at 200 nodes, 8 levels, or 5 pages by default.** Raise them
  for large trees. An empty or partial list is not proof that no subagents
  exist. See [limitations](docs/limitations.md).
- **Usage can lag while a child is running.** Values are persisted at step
  boundaries; `usageMayLag` means re-query after the step or after cancellation.
- **`cancel_descendants` stops up to `maxCancelBatch` running descendants per
  call.** It only touches the caller's subtree; use `cursor` to continue. Nested
  cancellation can wake an intermediate parent.
- **Permissions are not prompted by default.** Add an `ask` or `deny` rule for
  `subagent.control` if you rely on approval.

## Documentation

- [Installation](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Tool reference](docs/reference.md)
- [Security model](docs/security-model.md)
- [Security policy](SECURITY.md)
- [Limitations](docs/limitations.md)
- [Development](docs/development.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](./LICENSE).
