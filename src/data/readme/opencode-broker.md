# opencode-broker

A model broker for [opencode](https://opencode.ai). It is for people who run
several opencode sessions at once across their own GPUs and one or more cloud
subscriptions, and are tired of pinning models by hand, hitting a plan's limit
halfway through a task, or leaking private work to a cloud model by accident.

One small daemon owns the decision "which model serves this session right now".
Every opencode process asks it through a plugin, and it hands out *leases*:
cost-tiered, aware of how much of each subscription window is left, aware of
which local models are loaded and how many slots they have free, and bounded by
the privacy profile the session is on. The same package includes an
OpenAI-compatible gateway that gives non-opencode clients the same routing, a
TUI cockpit (the HUD), and a janitor for the child sessions that delegation
leaves behind.

## Install

```sh
git clone https://github.com/sudolulo/opencode-broker ~/opencode-broker
cd ~/opencode-broker && npm install
ln -s ~/opencode-broker/plugin/router.js ~/.config/opencode/plugin/opencode-broker.js
```

Node 20.18 or later. `npm install` only fetches the HUD's renderer
(`@opentui/solid`, optional); the broker and plugins have no runtime
dependencies.

## Quick start

1. **Describe your models.** Copy the minimal example and edit the model ids:

   ```sh
   mkdir -p ~/.config/opencode-broker
   cp ~/opencode-broker/examples/minimal.config.json ~/.config/opencode-broker/config.json
   ```

   It declares one cloud subscription (two models), one llama.cpp model, the
   tier lanes, two privacy profiles and the subscription's 5-hour window.
   `examples/config.example.json` shows every option.

2. **Run the broker.** It listens on a unix socket under
   `~/.local/share/opencode/model-routing/`; no TCP port is opened.

   ```sh
   node ~/opencode-broker/bin/opencode-broker serve
   ```

   To keep it running, a systemd user unit is enough:

   ```ini
   # ~/.config/systemd/user/opencode-broker.service
   [Service]
   ExecStart=/usr/bin/env node %h/opencode-broker/bin/opencode-broker serve
   Restart=on-failure

   [Install]
   WantedBy=default.target
   ```

3. **Start opencode.** The router plugin (linked during install) leases a model
   for every turn. Check what it decided and why:

   ```sh
   node ~/opencode-broker/bin/opencode-broker status      # leases, circuits, budgets
   node ~/opencode-broker/bin/opencode-broker decisions 20
   ```

4. **Optional extras.** Link any of these into `~/.config/opencode/plugin/` as
   well: `plugin/model-default.js` (new sessions start on your last manual model
   pick), `plugin/compaction-guard.js` (stops runaway compaction loops) and
   `plugin/session-janitor.js` (deletes finished subagent sessions). For the
   HUD, add the package to `~/.config/opencode/tui.json`:

   ```json
   {
     "plugin": ["file:///path/to/opencode-broker", "file:///path/to/opencode-broker/tui"],
     "keybinds": { "hud.menu": "f11", "hud.agents.list": "f10", "hud.usage.toggle": "f7", "hud.mode.cycle": "f9" }
   }
   ```

   The first entry is the HUD; the second records manual model picks for
   `model-default.js`.

## Configuration reference

The config is JSONC (comments allowed) at `~/.config/opencode-broker/config.json`,
or wherever `OPENCODE_BROKER_CONFIG` points. With no config the broker still
serves and every lease fails with a clear error: no model name is compiled in,
so nothing is ever spent on a provider you did not list.

| Key | Meaning |
|---|---|
| `targets` | The models. Each has `providerID`, `modelID` and `kind` (`cloud` or `local`). Local targets add `capacity` (the server's `--parallel`), `context` (tokens per slot) and optionally `prepareCommand` (argv, run when the model is not loaded), `minContextTokens`, `outputReserve`, `contextHeadroom` and `modelCapacity`. Any target may add `fit` (per-tier preference weight) and `effort` (per-tier reasoning variant). |
| `targets.*.modelCapacity` | For local targets that share one model (say a coder lane and a classifier lane on the same server model): how many leases the *model* may already carry, summed over every target that names it, for this target to take another. A second limit next to `capacity`, which still caps the target's own share. Set it below `--parallel` on one target to keep slots free for the others, or for callers that reach the model server without a lease. Unset: only `capacity` applies. |
| `tiers` | Ordered target lists for `deep`, `smart`, `build`, `fast-build`, `review`, `worker` and `classifier`. |
| `fallbacks` | Per tier, ordered groups consulted only when the tier's own list has nothing eligible. |
| `agentTiers` | Which tier each opencode agent rides. Exact names, or a trailing `*` for a prefix; values are a tier, `inherit` (ride the parent session's tier) or `classifier`. Merged over the defaults: `build`→build, `plan`→smart, `general`→inherit, `explore`→worker, tier-named agents to their tier, and opencode-guard's `fleet-classifier*` agents to classifier. |
| `defaultAgentTier` | Tier for any agent `agentTiers` does not match. Default `worker`. |
| `tierAliases` | Lease another tier's lane instead, for example `{ "build": "smart" }` when both would hold the same model. Upward only. |
| `profiles` | The routing profiles and their lanes, in the order the HUD offers them. `auto` and `manual` always exist and are not declared here. |
| `offlineProfiles` | Profiles with no network at all. Default: any profile named `private` or ending in `-offline`. |
| `profileTitles` | Display names. Default: the name, title-cased. |
| `profileFallbacks` | Per profile, fallback groups like `fallbacks`. Cloud targets are dropped unless the profile is in `profileCloudEgress`. |
| `profileFallbackAfterMs` | Per profile, one non-negative delay per `profileFallbacks` rung, positionally. A rung opens for ordinary selection only once the caller has waited that long; a rung with no entry opens immediately, as every rung did before this setting. Delays travel with their rung through the cloud-target drop above, so a deleted group never shifts another group's delay onto it. |
| `profileCloudEgress` | Profiles that may fall back to cloud targets. Offline profiles are refused here. |
| `profileTools` | Extra tools (`localOnlineExtra`) and tool-name prefixes (`localOnlinePrefixes`) that LAN-only profiles may use. |
| `budgets` | Per provider, the subscription's `windows` (`id`, `periodMs`, `meter`: `requests` or `tokens`, `capacity`, optional `anchor`) and optionally `planUsage.type` (`anthropic-oauth`, `openai-oauth`, `bailian-cli`, or the generic `http`) to read exact usage from the provider. |
| `deals` | Time-limited discounts (`providerID`, `multiplier`, optional `modelPrefix`, `daily`, `window`) the balancer leans into. |
| `tierProviderWeights` | Per tier, a provider preference weight (>1 leans toward, <1 saves for other tiers). |
| `trustedSubscriptionProviders` | Providers admitted without proving OAuth (flat-rate plans that use API keys). |
| `modelVariants` | `"provider/model": ["low", "high", ...]` reasoning variants known to work, when the catalog does not advertise them. |
| `localModelsUrl` | The local server's model list (llama.cpp router mode `/v1/models`), polled to see what is loaded. |
| `localContextHeadroom` | Fraction of a local window the router will lease into (default 0.6) when a target declares no `outputReserve`. |
| `workerLocalShareDenominator` | One in N `auto` worker assignments goes to a local target (default 4; 1 disables). |
| `burstFence` | How full a short window must be before it counts as a balancing input (default 0.9). |
| `watch.notifyCommand` | argv that `opencode-broker-watch` runs when the catalog changes. `{title}`, `{body}` and `{kind}` in it are replaced; a command naming neither `{title}` nor `{body}` gets the title and body appended. No shell is involved. |
| `burnWatch` | The [burn watch](#the-burn-watch): `enabled` (default `true`), `notifyCommand` (argv like `watch.notifyCommand`, which it defaults to; `[]` only logs) and the thresholds listed there. |
| `slotWatch` | The [slot watch](#the-slot-watch): `enabled` (default `true`), `intervalMs` (60000), `deferredSamples` (2), `notifyCooldownMs` (1800000). Notifies through `burnWatch.notifyCommand`. |
| `hud` | The HUD's options; see [The HUD](#the-hud). |

Environment:

| Variable | Default |
|---|---|
| `OPENCODE_BROKER_CONFIG` | `$XDG_CONFIG_HOME/opencode-broker/config.json` |
| `OPENCODE_BROKER_LOCAL_MODELS_URL` | `localModelsUrl` from config |
| `OPENCODE_MODEL_BROKER_SOCKET` | `~/.local/share/opencode/model-routing/broker.sock` |
| `OPENCODE_MODEL_ROUTING_DIR` | `~/.local/share/opencode/model-routing` (state; see [docs/STATE.md](docs/STATE.md)) |
| `OPENCODE_SESSION_JANITOR_DIR` | `~/.local/share/opencode/session-janitor/children` |
| `OPENCODE_BROKER_HUD_GUARD` | unset; `on` or `off` overrides guard detection |

The broker's socket protocol is documented in [docs/API.md](docs/API.md); the
bundled plugins are clients like any other.

### Delayed fallback rungs

A fallback rung normally opens the instant the profile's own lane has nothing eligible. That is
the right answer for an interactive lane, and the wrong one for a bursty background lane sharing
a scarce target: "my lane is busy" arrives constantly, so the rung stops being overflow and
becomes a second primary. `profileFallbackAfterMs` makes a rung wait first.

```jsonc
"profileFallbacks":       { "memory": [["local-27b"], ["haiku"]] },
"profileFallbackAfterMs": { "memory": [300000, 900000] }
```

Read that as: `memory` serves from its own lane; after five minutes of waiting it may also use
`local-27b`; after fifteen it may also go to `haiku`.

- **Positional, and aligned after normalization.** Each delay belongs to the rung at the same
  index. Delays are attached before the cloud-target drop that `profileCloudEgress` governs, so
  a rung deleted for naming a cloud target on a LAN profile takes its delay with it and never
  shifts another rung's delay onto a neighbour.
- **A missing entry means 0**, and a profile with no entry at all keeps the immediate fallback
  it has always had. This setting can only ever delay a rung, never introduce one.
- **The first eligible group in authored order wins.** Delays need not increase; once two rungs
  are both open, the earlier one is chosen, so a later rung with a shorter delay serves only
  until the earlier one opens.
- **The clock is the caller's own wait, not the target's.** A gateway caller accumulates it only
  after its first *waitable* refusal, and starts from zero again on a new forward attempt. Time
  spent waiting for an answer is not time spent waiting for a slot.
- **Only callers that report a wait are delayed.** The gateway does; the router plugin does not,
  so plugin-driven profiles such as `local` and `private` keep immediate fallback regardless of
  what is configured here. Configure delays for lanes the gateway serves.
- Two things deliberately ignore the delay: refusal classification, so a full-but-delayed rung
  still reads as `target-busy` (keep waiting) rather than "no target exists"; and the
  context-overflow last resort, so an oversized session is never denied the roomiest window
  just because its clock has not run out.

### Generic HTTP plan usage

An administrator-controlled HTTP endpoint can supply the same canonical plan
report as the built-in sources:

```jsonc
"budgets": {
  "example-provider": {
    "windows": [
      { "id": "wk", "periodMs": 604800000, "meter": "tokens", "capacity": 1000000 }
    ],
    "planUsage": {
      "type": "http",
      "url": "https://usage.example.invalid/v1/plan-usage",
      "authRef": "provider-credential"
    }
  }
}
```

`authRef` is an exact top-level key in opencode's auth JSON
(`~/.local/share/opencode/auth.json` by default). The broker reads that file
fresh for each uncached request, takes the first non-empty credential from
`key`, `apiKey`, then `access`, and sends it only as the `x-api-key` header.
The URL must be absolute HTTP or HTTPS and must not contain a username or
password.

The endpoint must return this canonical JSON shape; every field shown is
required, and `windows` may contain more than one window:

```json
{
  "windows": [
    {
      "id": "5h",
      "percent": 42,
      "resetsAt": "2026-09-22T12:00:00Z",
      "active": true,
      "severity": "warning"
    },
    {
      "id": "wk",
      "percent": 7,
      "resetsAt": null,
      "active": false,
      "severity": null
    }
  ],
  "lockedUntil": null
}
```

`lockedUntil` is either `null` or epoch milliseconds. A missing credential,
invalid URL or report, non-2xx response, timeout, or network failure produces
no new exact reading: the broker serves its last good report when one exists,
backs the failed source off for ten minutes, and otherwise continues using its
local estimates.

## The burn watch

A session caught in a loop (a compaction that repeats, a context-pruning plugin
that keeps invalidating the prompt cache) can spend a large share of a
subscription window in minutes. Every opencode process already reports each
provider request's tokens to the broker, so the broker watches the rate across
all sessions and acts on two kinds of signal:

- **Stop.** A session that re-sends most of its prompt uncached again and again,
  or spends far more than any working session does, has its turn aborted by the
  router plugin, with a toast saying why. Nothing is deleted; sending another
  message continues deliberately, and the counters start over.
- **Notify.** Fast spend by one session, fast spend by one provider across all
  sessions, or a plan window climbing fast (read from the provider's own usage
  report, where `planUsage` is configured) runs `burnWatch.notifyCommand`, at
  most once per subject per cooldown. Every stop is announced the same way and
  logged to `decisions.jsonl` as `policy: "burn-stop"`.

Local providers are never counted. Spend is weighted tokens: input + output +
cache write + 0.1 x cache read. The defaults were chosen by replaying a week of
real usage from frontier models with contexts up to ~450K: they would have
stopped the four runaway bursts in that week and no other session. Tune them
under `burnWatch`:

| Key | Default | Meaning |
|---|---|---|
| `rewriteTokens` | 100000 | A step is a *full re-send* when its uncached prompt (input + cache write) is at least this and at least half the prompt. |
| `rewriteCount` | 4 | Stop after this many full re-sends inside `rewriteWindowMs` ... |
| `rewriteVolumeTokens` | 1500000 | ... that carry at least this many tokens between them. |
| `rewriteWindowMs` | 300000 | |
| `sessionSpendTokens` | 3000000 | Notify when one session spends this much inside `sessionSpendWindowMs`. |
| `sessionStopTokens` | 6000000 | Stop when one session spends this much inside `sessionSpendWindowMs`. |
| `sessionSpendWindowMs` | 300000 | |
| `providerSpendTokens` | 3000000 | Notify when one provider, across all sessions, spends this much inside `providerSpendWindowMs`. |
| `providerSpendWindowMs` | 300000 | |
| `planWindow` | `"5h"` | The plan-usage window id to watch for a fast climb. |
| `planRisePoints` | 6 | Notify when that window rises this many percentage points inside `planRiseWindowMs`. |
| `planRiseWindowMs` | 600000 | |
| `notifyCooldownMs` | 900000 | At most one notification per session, provider or plan in this long. |

The notify command gets a short title and body, and `{kind}` is one of `stop`,
`session-spend`, `provider-spend` or `plan-rise`. For a notifier that takes a
priority and a tag after the message:

```jsonc
"burnWatch": {
  "notifyCommand": ["/usr/local/bin/notify", "{title}", "{body}", "high", "{kind}"]
}
```

## The slot watch

`capacity` and `modelCapacity` cap what the broker leases on a local model, but services
pointed straight at the model server reach it without a lease, and the broker never sees
them. Once a minute the broker reads llama.cpp's own `requests_deferred` for each resident
model a local target names (from `/metrics?model=` on `localModelsUrl`'s origin). That
count includes every caller. Two non-zero readings in a row mean every slot is busy and
requests are queueing, so it runs `burnWatch.notifyCommand` with `{kind}` =
`slot-deferred`, at most once per model per `notifyCooldownMs`. It only notifies: what to
move off a saturated model is a routing decision.

## Tuning local windows: the usage log

Every provider request's size lands in `usage.jsonl` in the routing state directory:
session, model, the lease's target and lane, `prompt` (everything the model read) and
`output` tokens, and that prompt split into `input`, `cacheRead` and `cacheWrite`. The split
is always written, zeroes included: after a burn-watch stop the question is whether the
session was re-sending an uncached prompt, and `cacheRead: 0` is exactly that signal, so the
total alone cannot answer it. opencode deletes subagent and workflow child sessions when their
work is done, and their token history goes with them, so this is the record that survives. It
is also the only one with each session's real PEAK: a lease records a session's size when its
turn starts, and a subagent's long turn grows well past that. `opencode-broker usage [days]`
(default 7) prints, per model, request and session-peak percentiles, and for each local target
how many session peaks fit what it routes (`context` minus `outputReserve`, else the headroom
fraction). That is the number to size a slot's context and a server's slot count by. It also
names each model's top callers: `opencode` for routed sessions, and for the gateway the client
address and the model name it asked for.

## The gateway

Services that only speak `OPENAI_BASE_URL + key + model` (a chat UI, a voice
assistant, a memory service's ingestion model) get a pinned model and no
failover. Point them at `opencode-broker-gateway` instead: every request gets a
fresh lease, the broker's circuits and budgets apply, and usage lands in the
same ledger as the opencode sessions.

```sh
head -c 32 /dev/urandom | base64 > ~/.config/opencode-broker/gateway-key
chmod 600 ~/.config/opencode-broker/gateway-key
HOST=0.0.0.0 PORT=8790 node ~/opencode-broker/gateway/bin/opencode-broker-gateway
```

It reads `~/.config/opencode-broker/gateway.json` (or `OPENCODE_BROKER_GATEWAY_CONFIG`)
and refuses to start without a key file (`OPENCODE_BROKER_GATEWAY_KEY_FILE`).
It listens on 127.0.0.1 unless `HOST` says otherwise.

```jsonc
{
  "tier": "worker",                   // the tier every request leases
  "profile": "auto",
  "providers": {                      // the lanes the gateway can forward to
    "llamacpp": { "baseUrl": "http://localhost:8080/v1", "timeoutMs": 15000 },
    "deepseek": { "baseUrl": "https://api.deepseek.com/v1", "authRef": "deepseek" }
  },
  "modelProfiles": {                  // model names a client may ask for
    "local-27b": { "profile": "local", "maxContextTokens": 32768, "timeoutMs": 60000 }
  },
  "routedModelId": "routed"           // what /v1/models lists for "let the broker pick"
}
```

`authRef` names an entry in opencode's `auth.json`; provider keys are read per
request and never logged. Per provider you can also set `headers`,
`bodyExtras`, `dropBodyKeys` (for a lane that rejects a parameter the client
sends), `streamIdleMs`, `streamUsage: false`, `jsonMode: "instruct"`, `responsesApi: true` and
`mirrorTextFormat: true` (copy a /responses `text.format` into `response_format`,
for llama.cpp, which enforces only the latter).

It serves `POST /v1/chat/completions` and `POST /v1/responses` (the OpenAI
Responses API, which the Vercel AI SDK's OpenAI provider uses by default).
A /responses request is offered only to providers with `responsesApi: true`
(llama.cpp serves it natively), and otherwise behaves like chat: same leasing,
extras, failover and usage accounting.

- **A client's `model` is a routing request, not an order.** A name listed in
  `modelProfiles` leases that profile; anything else routes on the configured
  tier. Profile names never leave the gateway. A name may override the
  provider's `maxContextTokens`, `timeoutMs` and `prepareWaitMs`, and layer its
  own `bodyExtras` over the provider's key by key. A key set to `null` injects
  nothing, so the client's value, or the model's default, stands: a lane that
  turns thinking off for every local model can still serve one name with
  `"bodyExtras": { "chat_template_kwargs": null }` and its model's own default.
- **A busy local slot is waited out for everyone; a missing local model only
  for a name that asks.** With `"waitForLocal": true` a name also waits, on its
  `prepareWaitMs` budget, while its local-only lane has no resident model (a
  server restart, a swap that displaced it) instead of failing at once. Use it
  for background writers that lose data on a failed call: a memory service that
  records a failed extraction as "no memories" and never retries it.
- **A long wait stays visible to the client.** An HTTP client gives up on a silent
  connection long before a patient wait is over: Bun's fetch after about 5 minutes
  with no bytes, undici's `headersTimeout` at 5 minutes. With `"holdOpenMs": 30000` a
  name's buffered (non-streaming) requests that are still unanswered after 30 s get
  their `200` head, then a space every 30 s, then the JSON. Leading whitespace is
  valid JSON, so the body still parses. A failure after that point arrives as the
  error object under the 200; one inside the first `holdOpenMs` keeps its real
  status. Pair it with `waitForLocal` for writers that must not lose a call.
- **Streaming is a real SSE passthrough, and failover ends at the first
  frame.** Up to the first byte relayed, a failing lane is retried on a fresh
  lease exactly like a buffered request. After it, the response is committed:
  a lane that dies mid-stream ends the client's stream with an OpenAI-shaped
  error frame and is reported to the broker, but a second model's tokens are
  never spliced onto the first one's sentence. The stream watchdog measures
  silence, not total duration, so long generations are not cut off.
- **Usage accounting is not the client's option.** The gateway asks every
  upstream for streamed usage and strips the extra frame for clients that did
  not ask. When an upstream sends none it estimates, and says so; it never
  reports zero, because a zero teaches the balancer that a paid lane is free.
- **Waiters are served in arrival order.** Requests waiting on one profile form a
  queue: only the oldest retries, a new request does not try ahead of a non-empty
  queue, and a request that gets its lease wakes the next at once. Without it a
  freed slot went to whichever retry landed first, and a busy lane's worst wait
  was dozens of times its median.
- **Waiting is for requests that asked for a specific model.** When the broker
  says a model is being loaded (`target-preparing`), a mapped request waits up
  to `prepareWaitMs` (default 3 minutes). An unmapped one fails at once rather
  than holding a client that did not ask for that model. A model whose slots
  are all busy (`target-busy`) is waited out for every request.

## The HUD

`hud/tui.js` is a TUI plugin that keeps the routing state on screen:

| Surface | Shows |
|---|---|
| Prompt badge | The session's routing profile (`R:local`), `FALLBACK:<target>` when the broker degraded it, and the burn of the current provider's tightest window (`ant 42% 5h`, `!` from 85%). |
| Bottom panel | Subagents and background shells with status, elapsed time and tokens; recently finished jobs and workflow runs. Arrow keys move into it, Enter opens a subagent. |
| Sidebar | Every budgeted provider's windows, any provider that is quarantined, on probation or behind an open circuit, and the model each tier would get right now (shown under the prompt on the home screen too). |
| F11 | One menu for the profile picker, usage block, subagent list and MCP servers. Choosing a profile for a running session offers "switch next reply" or "new clean session"; on the home screen it arms the next session. |

With [opencode-guard](https://github.com/sudolulo/opencode-guard) installed, the
badge also shows the guard's permission mode (manual / edits / auto / god) and
its floor level, F9 cycles the mode, and the menu gains both controls. The HUD
detects the guard from its package, its plugin file, a mention in
`opencode.json` or its state files; `hud.permissionModes: true | false` (or
`OPENCODE_BROKER_HUD_GUARD=on|off`) overrides the detection. Without the guard
those controls are not shown at all, because a badge saying "manual" would
claim a protection nobody enforces.

HUD options live in the broker config under `hud`:

```jsonc
"hud": {
  "permissionModes": "auto",
  "profiles": {
    "big-70b": {
      "badge": "R:70b",
      "description": "Takes both GPUs and evicts every other local model until you leave",
      "prepareNotice": "Loading the 70B across both GPUs -- several minutes."
    }
  },
  "swapBack": {                        // off unless command is set
    "profiles": ["big-*"],
    "command": ["/usr/local/bin/model-swap", "default"],
    "activeMarker": "~/.local/state/model-swap/active"
  },
  "backgroundShells": "~/src/opencode-background-shells/lib/bg-store.js"
}
```

`profiles` replaces the picker text a profile otherwise gets from what it is
(offline, LAN-only, or allowed a cloud rung). `swapBack` runs a command once the
last session leaves a group of profiles whose models displaced the resting ones;
the swap *in* is the broker's job, through the target's `prepareCommand`.
`backgroundShells` points at the job store of opencode-background-shells when
that plugin is not installed as a package.

## The session janitor

Every native `task` call creates a child session, and nothing deletes it; a
week of delegation leaves hundreds. `plugin/session-janitor.js` deletes each
one once it can prove the child is finished and idle, which is harder than it
sounds: the result text arriving does not mean the server's agent loop has
stopped, and the creating process exiting says nothing about a loop that runs
server-side. So retirement is always the same sequence: learn ownership only
from the parent's persisted task part and confirm the child's parent id with the
server, abort, wait for an idle barrier, read the parent again, delete, and
read back an explicit 404. Records live in a durable registry so work
interrupted by a crash is retired at the next startup, and a retirement claim
keeps two opencode processes from deleting the same child. There is no
wall-clock deadline: a timeout cannot tell a wedged child from a busy one.

It is the same protocol as the one inside opencode-agent-workflows; do not load
both, or point `OPENCODE_SESSION_JANITOR_DIR` at that plugin's registry so they
share records.

## Other pieces

| Piece | Role |
|---|---|
| `bin/opencode-broker` | The daemon and its CLI: `serve`, `status`, `selection`, `decisions [n]`, `rearm [target or provider:<id>]`, `quarantine provider:<id>`. |
| `bin/opencode-broker-watch` | Run daily: refreshes opencode's model catalog and its resolver view (`opencode models --pure`, stored as `resolvable-models.json` in the routing state directory), republishes the broker's inventory, and reports new models and newer releases of the ones you pin through `watch.notifyCommand`. Catalog discovery admits only models present in that resolver view, so a catalog entry this host cannot address never becomes a routing target; until the first run writes the view, discovery admits nothing and every tier stays on its configured targets. |
| `plugin/router.js` | Leases a model at `chat.message`, tracks each session's context size, reports usage and failures, enforces profile tool rules, waits out a busy or loading local model, and stops a turn the burn watch flags. |
| `plugin/model-default.js`, `tui/` | Start new sessions on the model you last picked by hand. |
| `plugin/compaction-guard.js` | Works around three compaction failures seen with opencode 1.18: a resumed summary parented to the wrong message (so the next turn resends the whole history), overflow and auto-compaction repeating without end, and a context-pruning plugin treating a cancelled compaction as a finished one. It uses only stock hooks and routes. |

## Design

```
 opencode TUI      opencode run      Open WebUI, voice assistant, ...
      |                 |                          |
 router plugin     router plugin          opencode-broker-gateway
      \                 |                          /
       \   lease / usage / failure  (unix socket, JSON)
        \               |                        /
         +------------ opencode-broker ---------+
         |  tiers   profiles   budgets   health |    broker.json
         +----------+-------------------+-------+    decisions.jsonl
                    |                   |
          polls /v1/models        leases only; no prompts,
          (what is loaded)        no provider credentials
                    |
       local GPU server               cloud subscriptions
       (llama.cpp)                    (OAuth or trusted keys)
```

**A lease broker, not a proxy.** Every opencode process is separate: a TUI, a
headless `opencode run`, a delegated subagent. Each could pick its own model,
but then none of them knows that another has just taken the last slot on the
local GPU or burned the last of a 5-hour window. The broker is the one place
that knows, and it serializes requests, so two processes cannot both take the
last slot. It never sees prompts or credentials, only which session holds
which model: the plugin still talks to the provider itself. A lease expires
after two hours without a heartbeat; the assignment behind it (which model the
session is on) lasts longer and is the session's pin. The price is a daemon to
run and a single point of failure. When the broker cannot be reached, the
router refuses the turn with an error that says why rather than quietly sending
it to whatever model the session last had, because an unrouted turn is exactly
the failure this exists to prevent. The client retries a broker hiccup once,
and a stuck request handler is cut off after 30 seconds so one bad request
cannot stall every session.

**Tiers are a cost ladder.** `worker` (mechanical) < `review` (read and judge)
< `fast-build` < `build` (implement) < `smart` (design decisions) < `deep`.
Each agent rides the cheapest tier adequate for its work, set by `agentTiers`.
Two things raise the floor: a delegated `general` subagent inherits its
parent's tier, so design work delegated from a `smart` session does not land
on a worker model, and a deterministic content check raises medical, legal,
financial and electrical-safety questions to `smart` or `deep` whatever agent
asked. That check matches phrases, not single words, because coding briefs are
full of words like "circuit breaker" and "stroke".

**Local and cloud are mixed on purpose.** A local target is eligible only when
the model server reports it *loaded* (a configured-but-unloaded model would
either fail or load on top of its GPU-mate and crawl), when it has a free slot
(per target, and per model when several targets share one and declare
`modelCapacity`), and when the session's context fits the slot with room to
grow. Room is an absolute `outputReserve` where declared, because reasoning
budget and answer size do not scale with window size, and a fraction
(`localContextHeadroom`) otherwise. One in four `auto` worker assignments goes
local by default, so the local GPU does useful work without becoming a
bottleneck. A model that is not loaded but has a `prepareCommand` is swapped in
by the broker, and the lease answers `target-preparing` so the client waits
instead of failing; a model whose slots are all busy answers `target-busy` and
is waited out the same way. When a swap would evict a model someone is using,
who asks matters: the broker runs `prepareCommand` with
`MODEL_SWAP_YIELD_TO_ACTIVE=1` for an opencode session, which can wait, and
without it for a gateway client, which has a person or a device on the other
end. Honouring the flag is the swap script's job.

**Profiles are egress boundaries.** `auto` routes on the tiers, `manual` never
leases, and every declared profile is its own lane. A profile made of local
targets confines the session to the LAN, and anything *derived* from it
inherits the confinement: its fallback rungs are filtered to local targets at
load unless the profile is listed in `profileCloudEgress`, a separate
allowlist, so pasting a cloud-heavy rung list into the wrong place cannot open
the boundary. Offline profiles go further: web and MCP tools are refused and
shell commands run in a bubblewrap sandbox with no network. Lanes the
machinery dispatches itself follow one rule: a lane that processes the
*conversation* (compaction) follows the conversation's profile, so an
uncensored session is never summarized by a censored model; a lane that
processes something else (opencode-guard's command classifier) routes on its
own tier but never outside the conversation's egress boundary, because command
lines carry paths, hostnames and secrets. Under a LAN-only profile with no
local classifier available the guard fails closed. That is deliberate: the
user chose privacy over convenience. A cloud target is only ever admitted if
its provider proved an OAuth login at inventory time or is explicitly trusted,
so merely configuring a metered API key in opencode never spends money.

**Subscription windows are balanced, not just capped.** Each provider's
windows (a 5-hour request window, a weekly token window, ...) are tracked from
the usage every client reports, and new sessions go to the provider with the
most headroom relative to its capacity, so several subscriptions burn at a
similar rate instead of one running dry on Tuesday. Capacities are estimates
and are learned: a rate-limit error records the spend at that moment as the
real ceiling. Where a provider publishes usage (`planUsage`), its exact numbers
replace the estimate, including usage by other tools on the same plan.
Balancing only steers; the hard stop is a provider-wide circuit that stays open
until the reset time the provider reported. Balancing happens when a session
gets its first model. After that the session keeps it until the model cannot
serve it (circuit, quota, not loaded, outgrown), because moving a long session
to another model means a model that did not write the transcript re-reads all
of it at full price.

**Failures are evidence, not verdicts.** A failed request opens a short circuit
on that target and records evidence against the provider; two different
failing targets within 15 minutes quarantine the provider, which returns
through probation, one lease at a time. Timeouts, aborts, malformed requests
and the router's own errors are classified separately so that they cannot
quarantine a healthy provider. Every decision (grant, refusal, failure) is
appended to `decisions.jsonl`, so "why did this session get that model" can be
answered afterwards.

**What it relies on.** The plugins hook `chat.message`, the last hook that can
still change the model for the provider call, and verify at `chat.params`.
Several of the shapes involved are observed behavior of opencode rather than
documented API; the tests encode them, and they should be re-checked on every
opencode upgrade.

## Compatibility

opencode 1.x, tested on 1.18.22 or later. A port to opencode 2.x is planned.
Node 20.18 or later (22 recommended). The offline profiles need `bwrap`
(bubblewrap) on the host. The local lane is tested against llama.cpp's server
in router mode; any server with an OpenAI-style `/v1/models` that reports load
status works the same way.

## Upgrading from opencode-router

1.0.0 renames the project and changes config in ways an existing install must
follow; the old names keep working for now and the broker reports each one it
still reads (at startup and in `status`). See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
