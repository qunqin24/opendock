# opencode-model-failover

> Native model failover for [OpenCode](https://opencode.ai) **v2**.

When a session fails because a model is rate-limited, overloaded, or otherwise
unreachable, this plugin moves the session onto the next healthy model in a
chain you define. It runs entirely on the OpenCode v2 plugin API: no HTTP
client, no vendor SDK, no runtime dependencies.

## Why

OpenCode v2 has a different plugin API from v1, and the fallback plugins already
on npm are written against the v1 API, so they do not load in v2. This plugin is
v2-native.

- **No chain ships with it.** You name the models. Nothing about the author's
  provider setup is baked in, and the default chain is empty.
- **Failures are filtered.** Only retryable errors (rate limits, timeouts,
  provider and network errors, 429/502/503/504) trigger a failover. A validation
  error would fail on every model, so it is ignored instead of burning attempts.
- **Prompt replay is opt-in.** `autoRetry` is off by default, because re-sending
  a prompt is a state-changing action.
- **Cooldown.** A model whose switch fails is skipped for `cooldownMs`, so a
  broken target is not retried on every failure.

## Requirements

- OpenCode **v2** (`opencode --version` reports 2.x).
- Node **>= 22**.

## Install

### From npm

```bash
opencode plugin add opencode-model-failover
```

### From GitHub

```bash
opencode plugin add github:nabheet/opencode-model-failover
```

Or add it to `opencode.json(c)` directly:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-model-failover"]
}
```

### Manual

Copy this directory to `.opencode/plugins/opencode-model-failover/` (project) or
`~/.config/opencode/plugins/opencode-model-failover/` (global), then list it:

```jsonc
{
  "plugins": [{ "package": "./.opencode/plugins/opencode-model-failover" }]
}
```

The v2 loader resolves `index.js` inside the directory; the `package.json`
`main` field is not consulted.

## Options

The plugin does nothing until you supply a chain. Pass options through the
plugin entry in your OpenCode config:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-model-failover",
      "options": {
        "fallbackModels": ["provider-a/model-x", "provider-b/model-y"],
        "maxAttempts": 2,
        "cooldownMs": 60000,
        "autoRetry": false,
        "notify": true,
        "logFile": "/tmp/model-failover.log"
      }
    }
  ]
}
```

| Option           | Type       | Default | Description                                     |
| ---------------- | ---------- | ------- | ----------------------------------------------- |
| `fallbackModels` | `string[]` | `[]`    | Ordered `provider/model` chain, tried in order. |
| `maxAttempts`    | `number`   | `2`     | Failovers per session before giving up.         |
| `cooldownMs`     | `number`   | `60000` | Skip a model this long after a failed switch.   |
| `autoRetry`      | `boolean`  | `false` | Replay the last user message after switching.   |
| `notify`         | `boolean`  | `true`  | Log each failover to stderr.                    |
| `logFile`        | `string`   | `""`    | Also append log lines to this file.             |

A `provider/model` string is split on the first `/`. Entries without a `/` are
dropped from the chain.

## How it works

The plugin subscribes to the v2 event stream and reacts to one event type:

```js
ctx.event.subscribe({ signal })
// session.execution.failed
//   -> { data: { sessionID, error: { type, message } } }
```

On a retryable failure it:

1. reads the models that actually resolve with `ctx.model.list()`;
2. picks the first chain entry that resolves and is not cooling down;
3. moves the session with `ctx.session.switchModel({ sessionID, model })`.

If `autoRetry` is on, it then reads the transcript with
`ctx.session.context({ sessionID })` and replays the last user message with
`ctx.session.prompt({ sessionID, text })`.

The `id`/`setup` plugin shape, the `plugins` config key, and the four methods
above are the whole v2 surface it uses.

## Observing it

A server-side plugin is easy to miss, so every decision is logged with a
`[model-failover]` prefix. Set `notify: false` to silence stderr, and
`logFile` (or the `MODEL_FALLBACK_LOG` environment variable) to append to a
file:

```bash
MODEL_FALLBACK_LOG=/tmp/model-failover.log opencode
```

Typical lines:

```text
[model-failover] 2026-01-01T00:00:00.000Z setup: chain=[provider-a/model-x] maxAttempts=2 autoRetry=false
[model-failover] 2026-01-01T00:00:01.000Z failed event: session=ses_123 error=provider.rateLimit msg=429
[model-failover] 2026-01-01T00:00:01.010Z availability=12 models; looking for next in chain
[model-failover] 2026-01-01T00:00:01.020Z session ses_123 moved to provider-a/model-x (attempt 1/2)
```

## Compatibility

- Targets **OpenCode v2** (the `plugins` config key and the `id`/`setup` plugin
  definition). OpenCode v1 used a different plugin API and is not supported.
- No runtime dependencies. Only `node:` builtins are imported.

## Prereleases

Every push to a PR publishes an installable beta to the npm `beta` dist-tag:

```bash
opencode plugin add opencode-model-failover@beta
```

## Development

```bash
npm install
npm run lint       # biome check + markdownlint-cli2
npm run lint:fix   # apply safe fixes
npm test           # node:test
npm run check      # lint + test
```

## Releases (maintainers)

All publishing happens in GitHub Actions via npm **trusted publishing** (OIDC
provenance). Never publish from a local shell.

`.github/workflows/ci.yml` is the single workflow file (npm allows one trusted
publisher per package; the workflow filename must stay `ci.yml`):

- `test` — lint + plugin tests on `main` and PRs (Node 24).
- push to `main` → `publish` job publishes the next patch to `latest`, pushes a
  `vX.Y.Z` tag, and opens a GitHub release. The version is derived from the last
  published `latest`, so repeated merges never collide; an intentional
  minor/major bump in `package.json` is honored.
- tag `v*-beta*` → `publish` job publishes `beta` plus a prerelease GitHub
  release.
- every PR push → `prerelease` job publishes `<version>-beta.<run_number>` to
  `beta` (same-repo, non-draft, non-dependabot PRs; re-runs deduped).
- manual dispatch → next `-beta.X` staging publish from `main`, no git change.

One-time bootstrap: npm cannot attach a trusted publisher to a package that does
not exist yet, so `opencode-model-failover` must be published once by hand before
the workflow can publish. Then configure the trusted publisher on npmjs.com:
repository `nabheet/opencode-model-failover`, workflow filename `ci.yml`, and
tick **Allow `npm publish`**. A trusted publisher created after Sep 03 2026 is
stage-only by default, and stage-only sends CI publishes to the staging area to
wait for a 2FA approval instead of going live. A new config must also complete
its first successful publish within 2 days or it expires.

## License

MIT — see [LICENSE](./LICENSE).
