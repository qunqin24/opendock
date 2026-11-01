# opencode-shield-bash

[opencode](https://opencode.ai) v2 plugin that gates every shell tool call through a second
session. A judge session, prompted with a fixed policy, returns an allow/deny JSON verdict
before the command runs. Denials throw into the calling session, so the agent sees why the
command was blocked.

The judge session is created lazily as a child of the calling session's root, titled "Shield Bash"
— one judge per root session, shared by that root's subagent sessions. Judge prompts are
serialized, so parallel shell calls are judged one at a time. That placement matters for more
than bookkeeping: it is reachable with the TUI's child-session navigation, stays out of the
roots-only session list, is deleted with its parent, and is never auto-shared. The judge
transcript doubles as the audit trail.

The judge runs as an ordinary session with no registered agent. Its isolation comes from a
deny-all permission set plus a context hook that, for the judge session only, replaces the
system prompt with the policy, empties the tool set, and pins temperature to zero. That keeps the
package drop-in: no agent definitions to install, and no reliance on undocumented agent
behavior.

This package targets opencode **v2**. It has no v1 entrypoint.

Every gated call is recorded in a SQLite event log, and the derived counters are exposed over
RPC. A bundled TUI part renders them in the sidebar: allow/deny/ask totals, cache hits, deny
categories, judge errors, and total judge wait time.

## Install

Add the package to the `plugins` array in your `opencode.json`, using the object form so its
options are passed through:

```json
{
  "plugins": [
    {
      "package": "@acramsay/opencode-shield-bash",
      "options": {
        "providerID": "openrouter",
        "modelID": "z-ai/glm-5.3-flash",
        "failure": "deny"
      }
    }
  ]
}
```

opencode installs npm plugins with Bun at startup. No build step: the package ships TypeScript,
which Bun loads natively. The package also ships a TUI part, which opencode loads automatically
so the sidebar appears without extra config. It declares `@opentui/core`, `@opentui/solid`, and
`solid-js` as peer dependencies.

## Config

Configuration lives in the plugin's `options` object. Unknown keys are rejected, so a typo fails
loudly at startup instead of silently using a default.

| field | meaning |
| --- | --- |
| `providerID` | provider that serves the judge model (required) |
| `modelID` | model that judges the commands (required) |
| `failure` | behavior when the judge is unavailable: `ask` (default), `allow`, or `deny` |
| `timeoutMs` | how long to wait for a verdict before treating the judge as unavailable (default `10000`) |
| `dbPath` | override the event database path (default `$XDG_CACHE_HOME/shield-bash/sqlite.db`) |

`failure` maps to real behavior in v2:

- `deny` fails closed — the command is blocked.
- `allow` lets the command through.
- `ask` defers to opencode's permission prompt. The gate flags the call and a permission hook
  upgrades it to a real ask, so it prompts interactively (and auto-approves under `--auto`). A
  config rule that hard-denies the action stays final.

## What gets denied

The full policy lives in `POLICY_PROMPT` in `src/lib.ts`. The judge must return one JSON
object: allow, or deny with a category (`DG1` through `DG8`), a one-line reason, and
optionally a safer alternative. Categories, in short:

- DG1 destructive unlink (rm/find -delete/shred scoped to a home, bare root, or indiscriminate)
- DG2 disk and device writes (mkfs, dd to device nodes)
- DG3 piping remote output into an interpreter
- DG4 privilege elevation or security erosion (sudo, /etc rewrites, history shredding)
- DG5 shells and listeners (nc -e, bash -i to /dev/tcp, socat EXEC)
- DG6 secret exfiltration to a remote endpoint (also: reading a secrets file's output, since that
  output always reaches the LLM)
- DG7 resource bombs (fork bombs, unbounded recursion)
- DG8 system-wide installs (OS package managers, npm -g, bare pip; project-scoped installs are fine)

Whole pipelines are judged, so one bad segment denies the chain.

## Event log and caching

Every gated call is one row in `shield_events`, a SQLite table at
`~/.cache/shield-bash/sqlite.db` (respecting `XDG_CACHE_HOME`). The same table backs the dedup
cache, keyed by `(root session id, command)`. A cache hit skips the judge entirely, so a
command judged once is not re-judged on every repeat within the same root session; a new
session re-judges it, by design.

Rows are deleted when their root session is deleted (`session.deleted`). On startup the plugin
also sweeps rows whose session the server no longer knows about, which clears crash orphans and
manual deletions. There is no TTL or row cap.

## Metrics and the sidebar

The bundled TUI part renders the counters in the sidebar:

```
🛡 shield-bash
 42 ✓   3 ✕   2 ?
 cached:  30✓  2✕
 denied:  DG1×2 DG8×1
 asked:   1 once  1 always  0 reject
 errors:  1 timeout  2 inference
 wait:    12.3s
```

Counters come from the event log, so they survive a server restart. The TUI reads them over
RPC (`shield-bash.stats`) and follows live updates from the `verdict` event.

The RPC route resolves to the server's default location unless the call names one. The TUI part
passes the session's location, so the sidebar works whether the plugin is installed globally or
per project.

## Development

```sh
bun install
bun run typecheck
bun test src/                  # unit: config validation, verdict parsing, cache, judge lifecycle
bun run test:integration       # real opencode + a local provider stub; skips if opencode is absent
```

The unit suite fakes the plugin context, so it needs nothing external. The integration suite
spawns a real `opencode run --standalone --auto` in a temporary project, with the plugin loaded
from source and a local OpenAI-compatible stub standing in for both the agent and the judge. It
covers plugin loading, `session.create` with a `parentID`, the context-hook policy injection,
and `execute.before` denial. Point it at a specific binary with `SHIELD_BASH_TEST_OPENCODE`; it
skips when `opencode` is not on `PATH`.

The repo's own `opencode.json` disables the published package and loads the source dev entry
(`./src/dev`), so running `opencode` from this directory exercises the working tree. The dev
entry registers under `shield-bash-dev` (server) and `shield-bash-tui-dev` (TUI) so it can load
alongside the published plugin without an id collision.

## Releases

Trunk-based: work merges to `main` and semantic-release runs in CI on every push to `main`.
Conventional commits drive the bumps (`feat` minor, `fix` patch, breaking changes major); each
release publishes to npm, updates `package.json` and `CHANGELOG.md`, and creates a GitHub release.
Never push a `v*` tag by hand, and never publish from a local machine.

## License

MIT
