# OpenCode TypeSafe Variant Router

> **Scope:** This plugin is written exclusively for the OpenCode TUI, is currently compatible with OpenCode v1 only, and is primarily intended to run on Linux with KDE using `secret-tool` for Secret Service credential access.

An OpenCode plugin that uses TypeSafe to automatically assign eligible requests to a suitable model and reasoning variant.

## What the plugin does

The plugin makes two related decisions:

1. **Select an agent** — choose the primary agent that should handle the task.
2. **Select a reasoning variant** — choose how much reasoning the target model should use.

Agent selection is enabled by default. The three available agents are permanently bound to these models:

| Agent | Model | Best suited for |
|---|---|---|
| `luna` | `openai/gpt-5.6-luna` | simple, objectively verifiable tasks, formatting, and boilerplate |
| `terra` | `openai/gpt-5.6-terra` | clearly scoped changes and structured subtasks |
| `sol` | `openai/gpt-5.6-sol` | regular implementation, reviews, refactorings, and more demanding repository work |

Selection is based solely on the task. The plugin gives all three agents the same project permissions and tools; they differ in their fixed model assignment and task profile.

The plugin then selects a reasoning variant for the chosen model. Depending on the model, available variants may include `none`, `low`, `medium`, `high`, `xhigh`, or `max`. `none` is a valid variant and means that no additional reasoning level is enabled.

## Requirements

- OpenCode 1.18.31 or newer
- a TypeSafe API key
- Linux: `secret-tool` and a working Secret Service integration if the key is not provided through the environment

## Installation

Add the npm package to your global OpenCode configuration at:

```text
~/.config/opencode/opencode.jsonc
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-plugin-variantizer",
      {
        "fallbackVariant": "medium",
        "notify": "always",
        "logLevel": "info"
      }
    ]
  ]
}
```

OpenCode installs npm plugins and their dependencies automatically with Bun. Quit and restart OpenCode after changing the configuration.

The plugin does not create the three primary agents itself. To make `luna`,
`terra`, and `sol` available in every project, install their agent definitions
globally in:

```text
~/.config/opencode/agents/
```

Copy the files from this repository's `.opencode/agents/luna.md`,
`.opencode/agents/terra.md`, and `.opencode/agents/sol.md` into that directory.
If the definitions exist only under a project's `.opencode/agents/` directory,
the agents and routing notifications are visible only in that project.

Disable OpenCode's built-in `plan` and `build` agents in the same global
configuration so the selector exposes only the routing ring:

```jsonc
{
  "agent": {
    "plan": { "disable": true },
    "build": { "disable": true }
  }
}
```

Do not load the plugin a second time through a project-local
`.opencode/plugins/` wrapper when it is already configured globally.

For local development, replace the npm package name with an absolute file URL to the checked-out entry point:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///ABSOLUTE/PATH/opencode-plugin-variantizer/src/index.ts"
  ]
}
```

## API key

The plugin first reads `TYPESAFE_API_KEY` from the process environment. On Linux, the key can alternatively be stored once in the Secret Service:

```sh
secret-tool store --label="TypeSafe API Key" service typesafe credential api-key
```

The plugin then reads it with:

```sh
secret-tool lookup service typesafe credential api-key
```

The key, request contents, and confidential error details are never logged.

## Variant-only mode

To use only variant selection and keep the currently selected agent, disable agent selection:

```jsonc
{
  "agentSelection": {
    "enabled": false
  }
}
```

In this mode, the current model remains unchanged and TypeSafe selects only a reasoning variant from the model catalog available at runtime.

## Notifications

With `notify: "always"`, the plugin shows a notification after applying the selection, for example:

```text
Selected variant "high" for openai/gpt-5.6-terra (routing confidence: 83%).
```

For agent routing, the confidence value refers to the agent selection. In variant-only mode, it refers to the variant selection. When it is below 60%, the notification also includes a warning:

```text
Selected variant "none" for openai/gpt-5.6-terra (routing confidence: 14%). Low routing confidence.
```

Possible `notify` values:

- `off` — disable notifications
- `fallback` — notify only when a fallback is applied
- `always` — also notify for successful and manual selections

## Security and fallbacks

The plugin sends only the bounded context needed for routing to TypeSafe. API keys, tool output, attachments, provider options, effective system prompts, and raw error or response data are not stored or logged.

If the API key is missing, the response is invalid, or a timeout or network error occurs, the configured fallback variant is used when it is valid for the current model. If no valid fallback is available, the existing model options remain unchanged.

The selection is validated before the provider is called. If the model, agent, variant, or runtime catalog no longer matches later in the pipeline, the turn is aborted instead of silently executing a different request.

## Debugging

With `logLevel: "debug"`, the plugin also logs safe TypeSafe events, including:

- the TypeSafe response without the API key or request payload
- the agent and variant decisions
- the target model, variant, status, and confidence

The OpenCode log is typically located at:

```text
~/.local/share/opencode/log/opencode.log
```

## Development

The repository uses [mise](https://mise.jdx.dev/) to pin Node.js, Bun, and the OpenCode CLI and to expose the supported development commands:

```sh
mise install
mise run install
mise tasks
mise run ci
```

`mise run ci` performs the same type-check and offline test suite used by GitHub Actions.

## Releases

Conventional commits on `main` are collected by Release Please. It opens or updates a release pull request containing the version bump and changelog. Merging that reviewed pull request creates the matching `vX.Y.Z` GitHub release and publishes the package to npm with provenance through GitHub OIDC.

Before merging the first release pull request, configure npm Trusted Publishing for package `opencode-plugin-variantizer` with:

- GitHub owner: `Melivo`
- Repository: `opencode-plugin-variantizer`
- Workflow: `release.yml`
- Environment: `npm`

No long-lived `NPM_TOKEN` is required. Use `mise run release:status` to inspect pending release pull requests and workflow runs.

## Further documentation

The complete configuration reference, privacy details, and OpenCode TUI synchronization notes are available in [`docs/typesafe-variant-router.md`](https://github.com/Melivo/opencode-plugin-variantizer/blob/main/docs/typesafe-variant-router.md).

## License

MIT — see [LICENSE](LICENSE).
