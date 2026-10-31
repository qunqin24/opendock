# opencode-temporal

[Temporal](https://temporal.io) tools for [OpenCode](https://opencode.ai) — schedules and workflow operations through the `temporal` CLI, authenticated with **OAuth login instead of static API keys**.

```jsonc
// opencode.json(c)
{
  "plugins": ["opencode-temporal"],
}
```

```sh
opencode plugin add opencode-temporal
```

## Why

The existing Temporal integrations for AI agents authenticate with a static
API key pasted into the host's environment: long-lived, account-wide, and the
highest-value secret on the machine. This plugin takes a different path —
everything runs through the official `temporal` CLI, so:

- **No static keys.** Authentication is the OAuth login stored by
  [`temporal cloud login`](https://docs.temporal.io/cli/cloud#interactive-login)
  (browser sign-in). The CLI mints, uses and refreshes short-lived tokens
  itself; nothing long-lived is stored in any config or environment.
- **RBAC-scoped identity.** Every call runs as the logged-in identity, so
  access is exactly what that user's Temporal Cloud role allows. Deactivate
  the user, revoke everything.
- **Permission gating.** Mutating tools (`pause_schedule`, `unpause_schedule`,
  `trigger_schedule`) route through OpenCode's permission system, so
  `opencode.json(c)` rules can require confirmation before paid or destructive
  operations.
- **Single credential consumer.** The CLI owns its token lifecycle, which
  avoids refresh-token rotation failures between multiple clients sharing one
  profile.

## Prerequisites

- [Temporal CLI](https://docs.temporal.io/cli) ≥ 1.9 on `PATH`
- For Temporal Cloud: the
  [Cloud extension](https://docs.temporal.io/cli/setup-cli#install-the-temporal-cloud-extension)
  and a one-time login:

```sh
brew install temporalio/brew/temporal-cloud   # extension (Public Preview)
temporal cloud login                          # browser OAuth sign-in
```

If a tool call ever fails with an auth error, run `temporal cloud login`
again — no configuration changes needed.

## Install

```sh
opencode plugin add opencode-temporal
```

or from GitHub:

```sh
opencode plugin add github:MehdiZare/opencode-temporal
```

or pin it in `opencode.json(c)`:

```jsonc
{
  "plugins": ["opencode-temporal"],
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-temporal",
      "options": {
        "host": "bina-live.hhoqx.tmprl.cloud:7233",
        "namespace": "bina-live.hhoqx"
      },
    },
  ],
}
```

| Option    | Default                          | Meaning                                                      |
| --------- | -------------------------------- | ------------------------------------------------------------ |
| `host`    | `"localhost:7233"`               | Temporal Service address                                     |
| `namespace` | `"default"`                    | Default namespace for every tool                             |
| `profile` | CLI default                      | Temporal CLI configuration profile (`temporal cloud login --profile work`) |
| `tls`     | auto (`true` for `*.tmprl.cloud`) | Force TLS on or off                                         |
| `timeout` | `90000`                          | Per-call timeout in milliseconds                             |

## Tools

| Tool                | Kind      | Purpose                                                        |
| ------------------- | --------- | -------------------------------------------------------------- |
| `list_schedules`    | read      | All schedules in the namespace (JSON)                          |
| `describe_schedule` | read      | One schedule: spec, pause state, notes, next action times      |
| `list_workflows`    | read      | Workflow executions matching a visibility query                |
| `describe_workflow` | read      | One execution: status, timing, task queue, history length      |
| `pause_schedule`    | mutating  | Stop future firings (survives boot-time upserts)               |
| `unpause_schedule`  | mutating  | Resume a schedule — on paid lanes, resumes paid generation     |
| `trigger_schedule`  | mutating  | Fire a schedule's workflow now, bypassing the interval         |

Read tools return JSON (`-o json`); mutating tools return the CLI's human
output.

## Permission rules

Mutating tools assert `temporal.schedule.pause`, `temporal.schedule.unpause`
and `temporal.schedule.trigger` permissions carrying the schedule ID as the
resource. Example rules:

```jsonc
{
  "permissions": [
    {
      "action": "temporal.schedule.trigger",
      "resources": ["company-onepager-*"],
      "effect": "ask"
    }
  ]
}
```

## Scope

Every call targets the configured `host` and `namespace` — the tools cannot
reach other namespaces. To operate on a different namespace, load a second
plugin instance with different options.

## Development

```sh
bun install          # installs dependencies (bun.lock is committed)
bun test             # test suite — stubs the temporal CLI, no server needed
bunx tsc --noEmit    # typecheck
npm publish --dry-run  # validate the tarball
```

`AGENTS.md` documents the architecture and conventions for coding agents
working in this repository. The plugin's OpenCode id is `temporal`; disable it
for a project with `"-temporal"` in that project's `plugins` array.

## License

[MIT](LICENSE)
