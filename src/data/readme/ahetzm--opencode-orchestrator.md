# @ahetzm/opencode-orchestrator

An [opencode](https://opencode.ai) plugin that adds two agents:

- **`orchestrator`** (primary) — does meta work only. It coordinates, briefs, and
  synthesizes. It delegates *all* actual work, including exploration and one-line
  edits, to minions.
- **`minion`** (subagent) — a focused executor that does the work and reports back.
  It cannot spawn further subagents.

The point is to keep the coordinating agent's context clean. Investigation and
implementation noise stays inside minion sessions; the orchestrator only ever sees
their summaries.

## Install

Add it to the `plugin` array in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@ahetzm/opencode-orchestrator"]
}
```

opencode installs npm plugins automatically at startup. Nothing else to do.

Then pick `orchestrator` as your agent (`Tab` in the TUI, or `opencode --agent orchestrator`).

## Configuration

Both agents use your default opencode model unless you say otherwise. To configure
them, use the tuple form of the `plugin` entry — `["package-name", { options }]`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@ahetzm/opencode-orchestrator",
      {
        "orchestrator": { "model": "anthropic/claude-opus-4-5" },
        "minion": { "model": "anthropic/claude-sonnet-4-5" }
      }
    ]
  ]
}
```

A common setup is a strong reasoning model for the orchestrator and a cheaper,
faster model for the minions — you'll be spawning a lot of them.

### Options

| Option | Type | Description |
| --- | --- | --- |
| `orchestrator` | object | Overrides for the orchestrator agent (see below) |
| `minion` | object | Overrides for the minion agent (see below) |
| `allowMinionDelegation` | boolean | Allow minions to spawn their own subagents. Default `false` |

Each agent override object accepts:

| Field | Type | Description |
| --- | --- | --- |
| `model` | string | Model id as `provider/model` |
| `variant` | string | Model variant, e.g. a reasoning-effort preset |
| `temperature` | number | |
| `top_p` | number | |
| `prompt` | string | Replace the built-in system prompt entirely |
| `appendPrompt` | string | Append extra instructions to the built-in prompt |
| `description` | string | Description shown in the agent picker |
| `color` | string | TUI color |
| `disable` | boolean | Skip registering this agent |

Anything you leave unset is not written to the agent config at all, so opencode's
own defaults apply.

### Appending house rules

`appendPrompt` is the low-risk way to customize behavior without losing the
built-in instructions:

```json
{
  "plugin": [
    [
      "@ahetzm/opencode-orchestrator",
      {
        "minion": {
          "appendPrompt": "Always run `bun test` before reporting success."
        }
      }
    ]
  ]
}
```

### Precedence

Lowest to highest:

1. This plugin's built-in defaults
2. Plugin options in `opencode.json`
3. An explicit `agent.orchestrator` / `agent.minion` block in `opencode.json`

So if you need to reach a field this plugin doesn't expose, set it directly on the
agent and it will win:

```json
{
  "plugin": ["@ahetzm/opencode-orchestrator"],
  "agent": {
    "minion": {
      "permission": { "bash": "ask" }
    }
  }
}
```

## Nested delegation

By default the minion gets `permission.task = "deny"`, which keeps the delegation
tree exactly one level deep. If you want minions to fan out further, set
`allowMinionDelegation: true`. Be aware that this makes cost and runtime much
harder to predict.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build
```

## Releasing

Bump `version` in `package.json` and push to `main`. The release workflow checks
whether that version already exists on npm, and if it doesn't, it runs the
typecheck/test/build gate, publishes, and cuts a matching `vX.Y.Z` GitHub Release.

Because the check is against the registry rather than the commit diff, re-running
the workflow or force-pushing can't double-publish. A push that doesn't change the
version is a no-op.

## License

MIT
