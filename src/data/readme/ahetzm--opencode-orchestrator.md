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

Works with opencode v2 and with v1 (1.18.29 or newer) from the same package.

## Install

### opencode v2

```sh
opencode plugin add @ahetzm/opencode-orchestrator
```

or add it to the `plugins` array in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@ahetzm/opencode-orchestrator"]
}
```

Check it loaded with `opencode plugin list`; the id is `opencode-orchestrator`.

### opencode v1 (1.18.29+)

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
them, use the object form of the `plugins` entry:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@ahetzm/opencode-orchestrator",
      "options": {
        "orchestrator": { "model": "anthropic/claude-opus-4-5" },
        "minion": { "model": "anthropic/claude-sonnet-4-5" }
      }
    }
  ]
}
```

On v1 the equivalent is the tuple form, `"plugin": [["@ahetzm/opencode-orchestrator", { ...options }]]`.
The options themselves are identical on both versions.

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
| `model` | string | Model id as `provider/model`, optionally `provider/model#variant` |
| `variant` | string | Model variant, e.g. a reasoning-effort preset |
| `temperature` | number | Sent as a request body parameter |
| `top_p` | number | Sent as a request body parameter |
| `prompt` | string | Replace the built-in system prompt entirely |
| `appendPrompt` | string | Append extra instructions to the built-in prompt |
| `description` | string | Description shown in the agent picker |
| `color` | string | TUI color |
| `disable` | boolean | Skip registering this agent |

Anything you leave unset is not written to the agent at all, so opencode's own
defaults apply.

### Appending house rules

`appendPrompt` is the low-risk way to customize behavior without losing the
built-in instructions:

```json
{
  "plugins": [
    {
      "package": "@ahetzm/opencode-orchestrator",
      "options": {
        "minion": {
          "appendPrompt": "Always run `bun test` before reporting success."
        }
      }
    }
  ]
}
```

### Precedence

Lowest to highest:

1. This plugin's built-in defaults
2. Plugin options in `opencode.json`
3. An explicit `agents.orchestrator` / `agents.minion` block in `opencode.json`
   (`agent.*` on v1)

So if you need to reach a field this plugin doesn't expose, set it directly on the
agent and it will win:

```json
{
  "plugins": ["@ahetzm/opencode-orchestrator"],
  "agents": {
    "minion": {
      "permissions": { "shell": "ask" }
    }
  }
}
```

The one field the plugin always sets is `mode` (`primary` for the orchestrator,
`subagent` for the minion), since that split is the whole point.

## Nested delegation

By default the minion is denied the `subagent` permission (`task` on v1), which
keeps the delegation tree exactly one level deep. If you want minions to fan out
further, set `allowMinionDelegation: true`. Be aware that this makes cost and
runtime much harder to predict.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build
```

If you install from behind a corporate npm mirror, bun writes the mirror's
tarball URLs into `bun.lock`, which breaks installs for anyone who can't reach
it. Run `bun run lock:clean` before committing to strip them back to the
default-registry form.

The package ships a single entrypoint that satisfies both plugin APIs: a default
export with `id` + `setup(ctx)` for v2, plus a `server(input, options)` method for
v1. Only types are imported from `@opencode/plugin` and `@opencode-ai/plugin`, so
the built bundle has no runtime dependencies.

### Running a local checkout in opencode v2

v2 resolves directory plugins to `<dir>/server` or `<dir>/index`, not to
`package.json`'s `main`. The repo ships an `index.js` shim that re-exports
`dist/index.js` for exactly this, so after `bun run build` you can reference the
checkout directly:

```json
{
  "plugins": [{ "package": "./path/to/opencode-orchestrator" }]
}
```

Then `opencode service restart` and inspect with `opencode debug agents`.

## Releasing

Bump `version` in `package.json` and push to `main`. The release workflow checks
whether that version already exists on npm, and if it doesn't, it runs the
typecheck/test/build gate, publishes, and cuts a matching `vX.Y.Z` GitHub Release.

Because the check is against the registry rather than the commit diff, re-running
the workflow or force-pushing can't double-publish. A push that doesn't change the
version is a no-op.

## License

MIT
