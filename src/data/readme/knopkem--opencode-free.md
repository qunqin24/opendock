# ocf - Opencode Free

Automatic routing and failover for OpenCode's free models.

`ocf` finds zero-cost models, routes each request to the best healthy one, and
switches automatically when a provider is slow, rate-limited, or unavailable. It
never falls back to a paid model.

Published on npm as
[`@knopkem/opencode-free`](https://www.npmjs.com/package/@knopkem/opencode-free).

## Install

Requires OpenCode 2.x and Node.js 22 or newer.

```bash
npm install --global @knopkem/opencode-free
opencode plugin add @knopkem/opencode-free
```

Restart OpenCode, then start it through `ocf`:

```bash
ocf
```

The first launch discovers your free models automatically. To inspect the
catalog first, run `ocf init`.

## Usage

```bash
ocf                              # start OpenCode
ocf run "Fix the failing tests"  # pass arguments to OpenCode
ocf status                       # show current routes and cooldowns
```

Automatic routing stops for a session once you manually choose a model. Start a
new session to resume it.

## Commands

| Command | Purpose |
|---|---|
| `ocf init` | Discover free models and create settings |
| `ocf scan` | Refresh the free-model catalog |
| `ocf probe` | Check which models are currently reachable |
| `ocf status` | Show routes, health, and cooldowns |
| `ocf why` | Explain the last routing decision |
| `ocf profile quality\|balanced\|fast` | Change the routing profile |
| `ocf pin build provider/model` | Pin a model |
| `ocf unpin build` | Remove a pin |
| `ocf ignore provider/model` | Exclude a model |
| `ocf ignore-provider provider` | Exclude a provider |
| `ocf allow-provider provider` | Undo a provider exclusion |
| `ocf auto` / `off` | Enable or disable routing |
| `ocf config` | Show settings and state locations |

Most commands accept `--json`. Run `ocf help` for all options.

## How it works

- Free models are discovered from catalog price metadata, not model names.
- Candidates are ranked using public benchmark priors, observed reliability,
  and recent speed.
- Unreachable or rate-limited models are skipped and retried later.
- Paid models are never eligible, including as a fallback.
- Model selection is written only into the OpenCode process, not your global
  config.

If no free model is available, routing stops with a cooldown instead of
spending money.

## Configuration

Settings live in `~/.local/state/opencode-free/settings.json`. Most users do not
need to edit them. Common changes:

```bash
ocf profile fast
ocf pin build opencode/model#variant
ocf ignore-provider subscription-provider
```

Use `ocf config` to see the effective settings and paths. Set
`OPENCODE_FREE_HOME` to use a different state directory.

## Privacy

- Probes send only the fixed text `Reply with exactly: ok`.
- Prompt text and source code are not stored.
- Free-model retention and training policies vary by provider. Exclude models
  or providers you do not trust.

## Development

```bash
npm install
npm test
npm run check
```

For local plugin development:

```bash
npm link
ocf install
```

## License

[MIT](LICENSE)
