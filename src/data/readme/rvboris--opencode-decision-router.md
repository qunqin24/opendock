# @rvboris/opencode-decision-router

[English](README.md) · [Русский](README.ru.md)

OpenCode **V2 plugin** that classifies delegated subagent tasks through a
"decisions" API (default: OpenRouter Microsoft Decision) and routes the child
model to `omniroute/light` or `omniroute/heavy`. No server runtime dependencies (the TUI uses host-provided peer dependencies),
JS ESM, Node >= 18. Install from npm with `npm install @rvboris/opencode-decision-router`.

**V2 only.** Local mock integration verifies native delegation on OpenCode
2.0.28, including foreground, background and same-session resume. The installed
**oh-my-opencode-slim 3.0.2** server entry passes the mock matrix in both plugin
orders through an isolated directory adapter, subject to the configuration and
resume requirements below. Six additional end-to-end cases passed with the real
Microsoft Decision API and mock worker inference (native and both OMO plugin
orders, light/heavy). No real worker-model inference was used. See
[VALIDATION.md](VALIDATION.md) for evidence and limitations.

### Optional model + effort profiles

Merge `profiles` from [examples/profiles.json](examples/profiles.json) into the router
configuration to select a model and effort in one classification call. Without
`profiles`, the existing `models.light` / `models.heavy` behavior is unchanged.
The initial allowlist is `light_medium`, `light_high`, `heavy_high`, `heavy_xhigh`.
Each entry has `model` (qualified `provider/model#variant`), `label` (`light` or
`heavy`), `effort` (`medium`, `high`, `xhigh`), and a nonempty `description` used
as its classifier criterion. IDs must equal `label_effort`; the target variant
must match effort, while the provider/model name is configurable independently
of the display label. Any nonempty selection of these label/effort combinations
is supported; the four examples are not a hardcoded allowlist. No low/max/ultra
profiles are added automatically.

The classifier favors quality when uncertain, without always choosing maximum
effort. Only allowlisted IDs are accepted; arbitrary response model parameters
are never used. Routing sets the native `input.model` including `#variant`, not
an invented effort argument. Errors/timeouts preserve the original input with
no paid retries. Explicit unrelated model pins and resumed sessions are preserved.
Eligible model bases come from profiles, not the legacy mappings in this mode.

Successful JSONL entries and hook results retain `choice: "light" | "heavy"`
for old consumers, adding `profile` (selected ID) and `effort` in profiles mode;
`model` is always the exact qualified target including variant. These extra
fields are absent in legacy mode. For OMO resume, pass the **full model#variant**
from the routed child along with its session ID. Local mock wire verification
can establish SDK serialization, not real upstream support for effort levels.

Mock-only validation commands (isolated temporary HOME/XDG directories; no real
Decision or worker API calls):

```sh
node --test test/unit/config.test.js test/unit/policy.test.js test/unit/client.test.js test/unit/router.test.js test/unit/profiles.test.js
node scripts/integration.mjs --profiles --cases profiles-matrix
```

The profiles matrix covers all four targets in native and both OMO plugin orders,
foreground/background/resume, plus fallback, pin and mixed-profile concurrency.
It asserts actual HTTP `reasoning_effort` alongside the wire model, the child's
recorded provider/model/variant in OpenCode's database, exact `model#variant`
router logs, and unchanged child session on resume. Its saved
`worker.json`, `child-models.json`, `router.jsonl`, and `results.json` are the evidence; a target string
alone is not evidence that effort reached inference. These new checks must pass
on the installed runtime before enabling profiles in production.

### OMO configuration requirements

Router-managed OMO agents (for example fixer and explorer) must use
`inheritModelFrom: "session"` with **no scalar `model`** in their effective config.
Remove scalar model pins from active presets and override layers as well as native
agent configuration. Unrelated agents and the orchestrator may retain fixed models.
Otherwise OMO switches the routed child back to its configured profile model before
inference. Classification failure with session inheritance falls back to the parent
model, rather than a fixed specialist profile.

For an OMO-managed completed child, retrieve/acknowledge it with `task_result`
before native resume. Pass its existing qualified model along with `sessionID`:
OMO 3.0.2 otherwise switches an inherited child to the parent's model on resume.
The router skips classification for resume. The mock gate explicitly verifies the
same session and unchanged model, with no child `model-switched` history entries.
Native resume without OMO does not need that explicit model.

Run `node scripts/integration.mjs` for the isolated loopback-only matrix, or
`node --test test/integration/*.test.mjs` for transport fixtures. All built-in MCPs,
including `gh_grep`, are disabled in the scratch OMO config.

## Installation and opt-in

Install the public package into the environment used by OpenCode:

```sh
npm install @rvboris/opencode-decision-router
```

Routing is **disabled by default**. Load the V2 plugin directly from the
absolute installed package directory in the OpenCode `plugins` array (do not add a
wrapper module). The npm package directory is typically
`node_modules/@rvboris/opencode-decision-router`; resolve it to an absolute path.
The plugin remains disabled unless `OPENCODE_DECISION_ROUTER_CONFIG` points to a
valid, enabled JSON file:

```jsonc
{
  "plugins": ["/absolute/path/to/node_modules/@rvboris/opencode-decision-router"]
}
```

The root `index.js` re-exports `src/index.js` and is required by the tested V2
directory loader; package exports alone did not activate the plugin. Setup returns
idempotent cleanup that aborts pending classifications and disposes the hook
registration. The plugin reads its JSON configuration from an absolute path in the
environment:

```sh
export OPENCODE_DECISION_ROUTER_CONFIG=/absolute/path/to/config.json
```

If that variable is unset or empty, `setup()` installs no hooks and the plugin
has no effect. If the config file is missing, invalid JSON, or fails
validation, routing is also disabled (fail-safe) and a metadata message is
written to stderr (file contents are never echoed).

See `examples/config.json` for a full annotated example.

## Configuration

| Field | Default | Notes |
|---|---|---|
| `enabled` | `false` | Master switch; must be `true` to install the hook. |
| `endpoint` | `https://openrouter.ai/api/alpha/decisions` | **Configurable.** HTTPS required; plain HTTP only for loopback (`localhost`/`127.0.0.1`) test endpoints. Credentials in the URL are rejected. |
| `apiKeyEnv` | `OPENROUTER_API_KEY` | **Configurable.** Name of the environment variable holding the bearer key. |
| `apiKeyFile` | `null` | **Configurable.** Optional absolute path to a raw key file. Content must be exactly one unambiguous token (trimmed; internal whitespace, quotes and comment markers are rejected). Takes effect only when the env var is unset. |
| `decisionModel` | `microsoft/microsoft-decision-1` | Model used for the classification request. |
| `models.light` / `models.heavy` | `omniroute/light` / `omniroute/heavy` | The only two targets the classifier may choose. |
| `agents` | explorer, librarian, fixer, oracle, designer, observer | Allowlist of subagent names that may be re-routed. |
| `timeoutMs` | `5000` | Integer from 1 to 60000; covers the entire request, including the response body. |
| `maxTaskChars` | `4000` | Integer from 1 to 16000; the delegated prompt (or description fallback) is truncated to this before sending. |
| `logFile` | `null` | Optional absolute path. Structured JSON-lines metadata only. |

## Routing policy

The `execute.before` hook fires only for the native `subagent` tool and only
for allowlisted agents. An event is skipped (untouched) when:

- the tool is not `subagent`;
- the agent is not in `agents`;
- `input.sessionID` is set (resume of an existing child session keeps its model);
- an explicit model is set that is **not** one of the configured light/heavy
  pair — including any `#variant` of an unrelated model. Variants of the
  configured pair *are* re-classified, which is how an existing pinned
  heavy/light rule can be replaced.

Otherwise the bounded task text is classified. On a strictly valid answer
(`answers.routing.type === 'choice'` with `choice` exactly `light` or `heavy`)
only `event.input.model` is rewritten; every other argument is preserved. Any
failure — no key, network error, timeout, HTTP error, redirect, malformed
answer — preserves the event entirely (fail-open). No retries.

## Exports (from `src/index.js`)

- `default` — `{ id: 'decision-router', async setup(ctx) }` (the V2 plugin)
- `createRouter(config, dependencies?)` — testable core:
  `{ handleEvent(event), evaluateEvent(event), config }`;
  `dependencies: { fetchImpl, now, log }`
- `loadConfigFromEnv(env?)`, `loadConfigFile(path)`, `validateConfig(raw)` — config helpers
- `resolveApiKey(cfg, env?, readFile?)`, `parseApiKeyFileContent(raw)`
- `evaluateEvent(event, cfg)`, `parseModelId(model)`, `validateDecisionResponse(body, cfg)`
- `classifyTask(cfg, task, apiKey, { fetchImpl })`, `buildDecisionRequest(cfg, task)`
- `ConfigError`, `DecisionsRequestError`, `DEFAULTS`

## Privacy

- Only the **bounded delegated task text** is sent — not the session history,
  not files. **Truncation is partial filtering, not a secret guarantee**: task
  text may itself contain sensitive content, and it is transmitted to the
  configured endpoint. This trade-off is explicit and opt-in.
- Credentials (env var or key file) are never written to logs or error
  messages, and redirects are refused so the key is never forwarded elsewhere.
- Logs (`logFile`) contain structured metadata only: event/session IDs,
  agent, chosen model, fallback reason, latency. Never prompt, key, or
  response body.

## TUI routing statistics

Open **Decision Router: статистика** in the native TUI command palette. The separate,
scrollable dialog leaves the footer unchanged. **Tab** switches between the current
session and all retained log records; **R** rereads the journal; **↑/↓** scroll;
**Esc** closes. On the home screen, switch to all records to see statistics.

The panel shows successful decisions, model and model/effort profile counts and
percentages (one decimal), and agents with their profile breakdowns. Percentages
use successful decisions only; an agent's profile percentages use that agent's
successful decisions. Fallback is shown separately. Legacy records without effort
are marked as unspecified, never inferred from today's configuration.

Compact summary, models, effort and agents sections use aligned counts and shares.
The active scope has a visible marker; theme accents distinguish light and heavy,
with warnings for fallback and invalid records and muted explanatory text. Labels
remain meaningful without color. Long names are shortened to the available terminal
cell width; very narrow tables stack names above numbers.

All table sections (models, effort, agents) share one fixed grid: the name column,
right-aligned counts, one-decimal percentages and an 8-cell proportional share bar
sit on the same cells in every section, so rows line up vertically. Share bars
appear everywhere at once — models `━`, effort `═`, agents `─`, on a common `·`
background — and only when the content area is at least 48 columns wide; below
that the bar column is dropped uniformly. Each section gets its own rule
character (`═ ИТОГ`, `─ МОДЕЛИ`, `┄ EFFORT`, `┈ АГЕНТЫ`) so the hierarchy reads
at a glance, and agent sub-profiles are marked with a fixed `└` indent that keeps
them on the same numeric columns. The panel measures its actual content width,
including when the terminal resizes.

The full configured JSONL is read locally on open/refresh, not the footer's last
400 lines. Invalid lines are reported for the whole journal. The all-records view
means **saved records only**, not all OpenCode history. Skips are not journaled;
there is no invented skip count, cost, token usage, or upstream-execution claim.
Loading, disabled, missing-file and read-error states do not expose paths or error
bodies. Closing or changing sessions prevents an older read from publishing.

Build with `cd tui && bun run build`. Automated checks do not establish that the
running host has loaded the command; live keyboard/layout checks remain separate.

## TUI routing indicator

The package also ships a TUI plugin (`export "./tui"`) that renders the latest
routing decision for the current session in the OpenCode status footer
(`prompt.footer.status` slot):

- `DR · librarian → heavy` / `DR · explorer → light` — latest logged agent and chosen model class, without provider/model paths, confidence, or latency;
- `DR · fixer · fallback` (warning) — classification fell back; no kept model is claimed from absent metadata;
- `DR · выкл` (muted) — `OPENCODE_DECISION_ROUTER_CONFIG` is not set, or the referenced config has `enabled: false`;
- `DR · ожидание` (muted) — no logged decision for this session yet, including a log not created yet;
- `DR · конфиг недоступен`, `DR · ошибка конфига`, `DR · лог не задан`, or `DR · лог недоступен` (warning) — actual local read/config diagnostics, without paths or error bodies.

Older entries without an agent use `агент неизвестен` rather than inferring one.
Only the last decision is shown; color is secondary to the text.

The indicator remains visible before the first decision. Local environment/config
presence is **not** proof that the server router is active. Session changes clear
the previous decision immediately; an older asynchronous read cannot restore it.

It reads the `logFile` from the env-referenced config, refreshes on session
lifecycle events plus a 2 s poll, and cleans up (slot, listeners, interval) on
dispose. The package exposes a separate `./tui` entry. Build it with:

```sh
cd tui && bun run build
```

Build and automated checks do not prove that the client loaded this entry or
rendered the slot. Actual loaded TUI/footer display still needs a separate visual check.

Indicator formatting and injected read/session-state logic live in
`tui/src/format.js` and `tui/src/read-state.js`, covered by
`test/unit/tui-format.test.js` and `test/unit/tui-read-state.test.js`.

## Tests and release

Portable, offline tests and package verification (Node.js 18+, Bun for the TUI build):

```sh
npm ci
cd tui && bun install --frozen-lockfile && bun run build && cd ..
env -u OPENCODE_DECISION_ROUTER_CONFIG npm test
npm run test:pack
```

`npm test` runs unit, local loopback integration, and fixture/runner tests only. It
does not contact paid APIs or require an installed OpenCode/OMO environment. The
separate `scripts/integration.mjs` mock host matrix and
`scripts/real-validation.mjs` real-API validation are not part of portable CI.
The package check creates a real tarball and imports the unpacked server exports.

Releases use Release Please on `main`: conventional commits update a release PR
with the version, changelog, and manifest. CI validates that PR; merge it to create
a GitHub Release, which alone triggers npm publishing with provenance via GitHub
OIDC. Configure npm Trusted Publishing manually before release: on npmjs.com,
open the package's **Publishing access** settings and add a GitHub Actions trusted
publisher with owner `rvboris`, repository `opencode-decision-router`, workflow
`.github/workflows/release-please.yml`, and environment (none). Grant the GitHub
Actions workflow `contents: write`, `pull-requests: write` for Release Please and
`id-token: write` for npm publishing. No npm token secret is used. The first push
does not publish; only a Release Please-created release does.
