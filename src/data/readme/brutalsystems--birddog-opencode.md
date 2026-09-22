# birddog

[![license](https://img.shields.io/github/license/BrutalSystems/birddog)](./LICENSE)

birddog watches live coding-agent sessions on one machine and tells an
orchestrating agent what it observed — a session went idle, asked for input,
exited, or went quiet. It never sends a prompt, never approves anything, and
never starts, stops or restarts a session.

**birddog monitors sessions; it does not manage their work.** Stopping birddog
leaves every watched agent running.

It is the observation half of a pair: [muster](https://github.com/BrutalSystems/muster)
launches instructed agents, [tincan](https://github.com/BrutalSystems/tincan)
lets them message each other, birddog watches them.

> **Status: working, early.** Instances run, observe Claude Code sessions and
> Codex threads, report what deserves attention, and can deliver alerts into a
> Claude Code orchestrator's inbox. The opencode adapter is next. What each
> runtime actually exposes — and does not — is in
> [`docs/providers.md`](./docs/providers.md).

## Try it

```sh
go build -o birddog ./cmd/birddog
./birddog discover                     # what can be watched
./birddog doctor                       # what can and cannot be observed
```

Then watch something. Take a `session_id` (and, for Claude Code, the `pid` and
`proc_start` beside it) from `discover` into a config — see
[`examples/`](./examples/) — and start an instance:

```sh
./birddog start --config birddog.json
./birddog status --instance <id>
./birddog events --instance <id> --after <cursor> --wait 30
./birddog stop --instance <id>
```

The instance keeps observing after the shell that started it is gone, and
stopping it leaves every watched session running.

```
NAME          PROVIDER  STATUS       PID    SESSION                               CWD
api-refactor  claude    busy         41207  11111111-2222-3333-4444-555555555555  /work/api
auth-thread   codex     unavailable  41880  01a0c46d-1afb-7b52-80d5-f91870af433f  /work/auth
checkout-7f   claude    idle         41996  66666666-7777-8888-9999-000000000000  /work/checkout
```

## Seeing more

Two things birddog cannot observe from outside a session, both opt-in and both
per-user:

```sh
birddog hooks install      # Claude Code: tool calls and permission requests
```

```toml
# opencode: nothing outside the process can see it at all
[plugins.birddog]
npm = "@brutalsystems/birddog-opencode"
```

Sessions already running pick hooks up without restarting. Both preserve what
is already configured, and both can be removed.

## What it will not tell you

Liveness is only ever reported on evidence. A Claude Code session is live when
its socket answers **and** the process at its PID is still the one the registry
recorded; a Codex thread is live when a running process holds its writer lock.
When the evidence fails, the last observed status is preserved and marked
`(stale)` rather than presented as current.

`unavailable` is a real answer, not a gap to be filled in. Codex reports its
threads as `notLoaded` to anyone who does not own them, which describes the
asking process rather than the session — so birddog says it cannot see the
state instead of guessing one.

Nor will it tell you a worker is unblocked. No provider exposes permission
requests to an outside observer today, so every target reports input-request
visibility as `unavailable`. An absence of observation is never reported as
evidence of absence — and a turn ending is not work finishing.

## Start here

- [`docs/README.md`](./docs/README.md) — index and current status
- [`docs/decisions.md`](./docs/decisions.md) — what has been decided, and why
- [`docs/providers.md`](./docs/providers.md) — what each runtime actually
  exposes to an outside observer, and what it does not

## Scope of the first version

macOS. Claude Code, Codex and opencode. Terminal and programmatically launched
sessions. Desktop apps are out of scope.
