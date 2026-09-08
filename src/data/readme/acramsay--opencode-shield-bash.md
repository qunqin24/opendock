# opencode-shield-bash

[opencode](https://opencode.ai) plugin that gates every bash tool call through a second
session. A judge session, prompted with a fixed policy, returns an allow/deny JSON verdict
before the command runs. Denials throw into the calling session, so the agent sees why the
command was blocked.

The judge session is created lazily as a child of the calling session's root, titled "Shield Bash"
— one judge per root session, shared by that root's subagent sessions. That
matters for more than bookkeeping: it is reachable with the TUI's child-session navigation,
stays out of the roots-only session list, is deleted with its parent, and is never
auto-shared. The judge transcript doubles as the audit trail.

## Install

Add the package to your `opencode.json` plugin array:

```json
{ "plugin": ["@acramsay/opencode-shield-bash"] }
```

opencode installs npm plugins with Bun at startup. No build step: the package ships
TypeScript, which Bun loads natively.

## Config

The plugin reads `shield-bash.json` from your opencode config directory at runtime. It is
user-side configuration and never ships with the package.

```json
{
  "providerID": "vercel",
  "modelID": "zai/glm-5.3-flash",
  "failure": "deny"
}
```

| field | meaning |
| --- | --- |
| `providerID` | provider that serves the judge model |
| `modelID` | model that judges the commands |
| `failure` | behavior when the judge session errors: `deny` (default), `allow`, or `ask` |

`ask` defers to opencode's normal permission evaluation, which today means whatever your
permission config resolves to. A true tri-state re-prompt is blocked upstream; see
[Known limitation](#known-limitation).

Environment overrides:

- `SHIELD_BASH_MODEL="provider/model"` overrides the configured judge model. Only the first
  slash splits provider from model, so model IDs that contain a slash (like
  `zai/glm-5.3-flash`) work as-is.
- `SHIELD_BASH_TTL_HOURS` sets the verdict cache TTL in hours (default 24).

Missing config falls back to `vercel/zai/glm-5.3-flash`.

## What gets denied

The full policy lives in `POLICY_PROMPT` in `src/lib.ts`. The judge must return one JSON
object: allow, or deny with a category (`DG1` through `DG8`), a one-line reason, and
optionally a safer alternative. Categories, in short:

- DG1 destructive unlink (rm/find -delete/shred scoped to a home, bare root, or indiscriminate)
- DG2 disk and device writes (mkfs, dd to device nodes)
- DG3 piping remote output into an interpreter
- DG4 privilege elevation or security erosion (sudo, /etc rewrites, history shredding)
- DG5 shells and listeners (nc -e, bash -i to /dev/tcp, socat EXEC)
- DG6 secret exfiltration to a remote endpoint
- DG7 resource bombs (fork bombs, unbounded recursion)
- DG8 system-wide installs (OS package managers, npm -g, bare pip; project-scoped installs are fine)

Whole pipelines are judged, so one bad segment denies the chain.

## Caching

Verdicts are cached in `~/.cache/shield-bash/verdicts.json` (respecting `XDG_CACHE_HOME`),
keyed by command string, expiring after the TTL, capped at 1000 entries. A cache hit skips
the judge entirely.

## Known limitation

opencode's `permission.ask` hook is declared in `@opencode-ai/plugin` types but never
triggered by the server ([anomalyco/opencode#7006](https://github.com/anomalyco/opencode/issues/7006)).
`tool.execute.before` can only throw (deny) or return (defer to config), so binary
allow/deny plus config-deferred `ask` is the complete behavior space today. Once upstream
wires the hook, the tri-state verdict is future work. The policy and the DG categories stay
fixed either way.

## Development

```sh
bun install
bun run typecheck
bun test src/                  # unit: verdict parsing, cache, prompt shape
bun run test:integration       # fixtures through a live judge; skips if no server
```

The integration suite drives the commands in `test/fixtures.json` through a running
`opencode serve` (default `http://localhost:4096`). Start one with:

```sh
opencode serve --port 4096 --hostname 127.0.0.1
```

It needs a provider API key and a reachable server; otherwise it skips. Each fixture gets a
fresh judge session (a reused one recycles earlier reasoning into later verdicts), tests run
serially, and each gets one retry to absorb provider flakiness.

Test-time env vars:

- `SHIELD_BASH_TEST_OPENCODE_URL` — server URL (default `http://localhost:4096`)
- `SHIELD_BASH_TEST_CONFIG` — path to a `shield-bash.json` for the judge model (default:
  `test/shield-bash.json`, which pins the fallback model)
- `SHIELD_BASH_MODEL` — overrides both, with the same provider/model split as the plugin

## Releases

Trunk-based: work merges to `main` and semantic-release runs in CI on every push to `main`.
Conventional commits drive the bumps (`feat` minor, `fix` patch, breaking changes major); each
release publishes to npm, updates `package.json` and `CHANGELOG.md`, and creates a GitHub release.
Never push a `v*` tag by hand, and never publish from a local machine.

## License

MIT
