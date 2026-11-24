# opencode-plugin-muse

Use Muse models in [opencode](https://opencode.ai) with the `muse` CLI login you
already have. Muse appears in the model picker as the `muse` provider, and
requests go through the signed-in `muse` CLI, so no Muse credential reaches
opencode or your config.

`1.0.0` is published on npm with an immutable `v1.0.0` GitHub Release. X9a on
2026-11-24 passed on opencode 2.4.1 with Muse CLI 1.4.25: the plugin answered a
simple turn, a bridged shell call, and a resumed turn. X9b then installed the
published `1.0.0` and returned an exact nonce from a run that loaded only that
package. The package compiles against `@opencode/plugin` 2.3.2 and
`@muse-code/sdk` 1.4.24; that compile pair is not a live-tested pair in this
run. On 2.4.1, `opencode models`
does not list the plugin-injected `muse/*` provider even though `opencode run -m
muse/...` resolves it. See [compatibility](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/compatibility.md). This is a
republished build of
[`@rasyid_rafi/opencode-muse`](https://www.npmjs.com/package/@rasyid_rafi/opencode-muse)
with five patches. [CREDITS.md](https://github.com/jond34/opencode-plugin-muse/blob/main/CREDITS.md)
has the diffs; [docs/provenance.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/provenance.md)
has the build hash and what it does and does not prove. The first two patches
reconcile the published 0.1.9 tarball; the third contains Muse to inference, the
fourth makes opencode own the context, and the fifth finishes the effort, prompt,
and rewritten-history boundaries.

Unofficial: not affiliated with, endorsed by, or supported by Meta or opencode.
Best-effort maintenance by one person, with no support commitment. It never holds
Muse credentials and writes one file of its own (the token ledger); everything
else it keeps is in memory.

![opencode's model picker, showing Muse Ember under the Muse Code provider](https://raw.githubusercontent.com/jond34/opencode-plugin-muse/v1.0.0/media/opencode-model-picker.png)

## What it does

- registers the `muse` provider (labelled "Muse Code") with the current Ember,
  Wonder, and Spark model ids, usable as a main or subagent model
- implements `LanguageModelV3`, translating opencode turns into Muse CLI sessions
- runs a loopback-only MCP server (`127.0.0.1`, random port, per-start bearer
  token) so Muse can call opencode's tools
- starts `muse serve` with a private config: Muse's built-in tools and any MCP
  servers from your Muse config are off, its base prompt is replaced by a short
  control prompt, and every tool call crosses the bridge, so opencode's
  permissions and history stay authoritative
- forwards `museAgent` and `museInstructions` as session developer instructions
  and maps opencode's reasoning-effort variants to Muse's per-turn effort
  (`default` omits the field)
- answers titles and compaction locally instead of spending a Muse turn, and
  reseeds a rewritten transcript from the full prompt
- leaves the compaction decision to opencode. `MUSE_NATIVE_HISTORY=1` lets the
  compaction hook return a native replacement window, so the next turn continues
  the same Muse session instead of reseeding. The digest is the portable summary
  and fallback
- keeps a local token ledger (`usage-*.jsonl` under
  `$XDG_STATE_HOME/opencode-muse`) so token use and reseed reasons stay
  measurable

### Why `muse`, not `meta`

opencode's catalog has a `meta` provider, and a plugin can register an auth hook
for it that mints an inference key and keeps it in opencode's auth store. This
plugin cannot take that route without holding a credential it exists not to hold.
It registers its own `muse` provider, owns the model list and limits, and leaves
sign-in to `muse login`. The provider declares `canonical: "meta"` for the
model's catalog identity and picker icon; as of opencode 2.3.2, `canonical`
inheritance applies in the config-provider path, not to providers added by a
plugin transform. So the plugin supplies each model's limits itself, and the
model list stays the plugin's. The cost is UX parity: `/connect` does not list
it, and a model switch is a picker entry rather than an account connection. The
benefit is that the credential never reaches opencode, the config, or this
plugin. The MSP competitor also registers `muse`, so the split is about the
credential, not the id.

Muse Code authenticates in its own CLI. Meta attests the Muse Code client: a
subscription covers requests that client makes, and `api.meta.ai` refuses
requests carrying a subscription key from anything else (`permission_error`,
`code: client_attestation_denied`). The plugin therefore drives the signed-in CLI
(`muse serve`, via `@muse-code/sdk`) instead of calling the model API itself. It
never holds Muse credentials, and the API key it reports to opencode is a
placeholder that is never sent to Muse. A denial fails the turn with Muse's own
message intact; it is not an auth error, and logging in again does not clear it.

### The subscription credential

Meta's Model API Terms, §3.2, restrict the credential a Coding Harness
Subscription connects to the coding harness: it "may not be used to access the
Services outside the coding harness or to circumvent your subscription's usage
limits or billing." This plugin never receives that credential. It spawns the
signed-in `muse` CLI and speaks MSP to it over stdio, so every request is made by
Muse Code's own process under the account's own subscription; the API key
opencode sees is a placeholder. The plugin does not extract, cache, or forward a
token, and it adds no login flow of its own.

That is the mechanism the terms describe, not a claim that Meta has endorsed the
arrangement: Muse's documentation says the credential is "for use with Muse Code
only", and the SDK is a developer preview, so the arrangement can be restricted
at any time. If Meta restricts it, the failure is a refused turn, not a leaked
credential. Which credential the CLI spends is not visible from inside the
process: a subscription and a pay-as-you-go key look the same. `muse usage` is
the only meter, and it reports account-wide percentages rather than a per-turn
cost.

## Limits of the seam

- **Sampling.** Muse's session protocol has no temperature, top-p, top-k, max
  tokens, stop, or seed field. The models are registered as not accepting a
  temperature, and opencode settings that only change sampling do not reach the
  model.
- **Contributor mode.** The plugin starts `muse serve` with
  `--contributor-mode off`, so your code is not used for training. Muse's own
  default for a subscription is Contributor Services: training on, less
  allowance spent. `MUSE_CONTRIBUTOR_MODE=1` restores that default. The choice is
  per plugin run because the plugin hands Muse its own config directory.
- **Containment.** Muse's built-in tools, observer reminders, workflows, and
  skill catalog are off, and its toolset is pinned to the bridge. MCP tools stay
  on through Muse while Muse's own tools stay off, and subagents and workflows
  stay disabled. Their spawner tools are outside the pinned toolset, so spawning
  belongs to opencode. The model's tool surface is opencode's, and every call
  crosses opencode's engine. That covers the model, not the workspace: the plugin
  grants workspace trust because the bridge does not start without it, so a
  repo's `.muse/hooks.json` commands and project skills can load outside
  opencode's permissions, and `.agents/memory/MEMORY.md` can enter the prompt in
  an untrusted workspace.
- **One gate, one allowlist.** Muse runs with `allowAll` because the plugin holds
  no tool executor of its own: a bridged call is emitted into opencode, which
  decides and runs it. The allowlist is `mcp__opencode__*`; it limits what Muse
  may ask for, not what a granted tool does. There is no isolation behind that
  gate. opencode ships no OS sandbox, and every agent starts from a base policy
  that allows everything except `.env` reads. The hard stop that survives
  `--auto`, or an agent whose rules allow everything, is a configured `deny`;
  saved approvals never override one. The one above it is a `policies`
  statement, which outranks saved approvals and `--auto` and never prompts.
  Repo-supplied Muse hooks are refused when a session opens unless their exact
  hash is recorded with `bun run doctor --trust-hooks`;
  `MUSE_ALLOW_PROJECT_HOOKS=1` accepts one for a run. Installed plugin handlers
  remain allowed and are reported by origin. The measured posture and the
  double-gate constraint are in
  [docs/approval.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/approval.md).
- **Timeouts.** A host that stops answering is ended, not waited on: no first
  frame within 900 s, or 180 s of silence after frames start, fails the turn,
  asks the host to interrupt, closes it, and the next turn resumes the same
  native session. A bridged tool call in flight suspends the idle clock and is
  declared to the host as an external wait. A warning is logged after 90 s. Each
  budget is env-tunable and `0` disables it. On Windows the shutdown ladder has
  no graceful rung, so the host is ended after the drain window.
- **Posture and ceilings.** The plugin pins no permission profile and does not
  declare Muse's beta capability, so it cannot read the posture its own session
  runs under. `bun run doctor` does declare it on its own connection and prints
  the profile Muse would start under. The axes govern Muse's own shell, not the
  calls the plugin bridges. The plugin adds no turn ceiling: opencode's
  `agent.<name>.steps` is the knob that exists, off by default, enforced in
  opencode's prompt loop, and it counts a turn this plugin drives.
- **Model catalog.** The catalog is a snapshot taken at startup. Muse's session
  protocol has no catalog subscription, so a newly entitled model appears only
  after opencode restarts.
- **Deployment and accounts.** One host per user, spawned over stdio: no shared
  host, remote host, or socket to one. One signed-in identity per host; a second
  account is a second CLI login, not a second account inside the host. Switching
  is `muse logout`, a fresh login, and an opencode restart.
- **Network and attachments.** A turn needs a live host and the vendor. There is
  no offline path, local inference fallback, PDF, or text-file surface; images
  are the only attachment kind.
- **Platforms.** The offline suite passes on Linux, macOS, and Windows. The
  matrix proves the suite, not the Windows seam: its hosts are `.mjs` fixtures,
  so it says nothing about `muse.cmd`, UAC, or a close that leaves a process
  behind. On Windows the plugin spawns the native `muse-bin-<version>.exe`
  beside the shim, falling back to the newest such binary; `MUSE_BIN` overrides.
  Windows remains best-effort: the shutdown ladder has no graceful rung, the
  ledger and hook-trust record carry an inherited ACL, and the vendor's sandbox
  may ask for UAC consent at startup. The capability table is
  [docs/platform-support.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/platform-support.md).

### A hard stop, if you want one

opencode's base policy allows everything but `.env` reads, so a fresh install
stops nothing a bridged call might do. Two mechanisms stop it, and they are not
interchangeable. `policies` is the recommended one: a statement is binary, never
prompts, and is applied after agent rules and saved approvals. `permissions` is
the per-agent form, for when you want a prompt rather than a block.

Two `policies` statements reach this plugin, both measured on 2026-11-23:

```jsonc
// opencode.jsonc
{
  "policies": [
    { "action": "plugin.use", "resource": "/home/you/src/opencode-plugin-muse", "effect": "deny" },
    { "action": "provider.use", "resource": "muse", "effect": "deny" }
  ]
}
```

The first means the plugin is not loaded; the second means it loads and its
provider is hidden. Either way the turn fails with `Model unavailable:
muse/muse-spark-1.3`, while `opencode models` goes on listing the models. A
statement that fails validation is dropped, not rejected, and leaves a typo
indistinguishable from having written no policy at all. Check the log after
editing a `deny`, and prove the deny by its effect. `bun run doctor` closes the
local half: its `policies` row spawns `opencode --print-logs debug config` and
reports each dropped statement by pointer and action; a run that printed no log
output is `skipped`, never `ok`. A Console-delivered policy is decoded on the
vendor's side and unknown actions are filtered without a diagnostic
(`anomalyco/opencode#60252`), so on a managed machine the effect is the only
evidence. The precedence order is in
[docs/policy-remote.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/policy-remote.md).

`tool.use` is the denial that names itself. Its resource is `<action>:<value>`,
matched against every check the tool makes, so `read:*` covers every read and
`opencode_bash:*` the bridged shell:

```jsonc
{ "policies": [{ "action": "tool.use", "resource": "read:*", "effect": "deny" }] }
```

A denied check fails with `Blocked by configuration policy`, the model receives
it as a tool error, and the turn continues. Expect a refusal the model can route
around, not a wall — and not a content boundary, since `grep` can read what
`read` was refused.

`permissions` is the other form: per agent, ordered, last match wins, and able to
`ask`. In opencode's V2 vocabulary an MCP tool's action is `<server>_<tool>`, and
the bridge's server is named `opencode`, so the bridged shell is
`opencode_bash` — not `shell`, which is opencode's own tool:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "permissions": [
    { "action": "opencode_bash", "resource": "*", "effect": "deny" }
  ]
}
```

That blocks the bridged shell and leaves opencode's own tools alone. The same
rule with `opencode_edit` or `opencode_read` denies those too; all three together
leave Muse with no tools. Muse's permission profile is yours, not the plugin's:
the plugin pins none, so a session runs whatever your default is.

### A ceiling for an unattended run

The plugin adds no cap: a client-side one would fire after the spend it exists to
prevent. opencode has the knob, per agent:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agent": { "build": { "steps": 12 } }
}
```

`steps` is a positive maximum, unset by default, enforced in opencode's prompt
loop, and it counts a turn this plugin drives. One step is one model request, so
a turn with N tool calls needs N+1 steps. The smallest value is a trap: `steps: 1`
gives the model one request with no tools allowed and produces only the
"maximum steps reached" summary.

### Headless runs

`opencode run` works under two conditions: one entry for this package, and
`steps` above 1 if the turn has anything to do. Two entries for one package are a
trap: opencode loads one instance per package name and the first entry wins, so a
global install can shadow the checkout while the log still prints `loading
plugin`. Drop the package entry, or point `XDG_CONFIG_HOME` at a config that
lists only the checkout.

## What a turn looks like

One turn end to end. opencode draws the model label, latency, and throughput from
the provider, so the line under the reply is the plugin reporting back:

![a hello turn answered by Muse Ember, showing 5.5s and 72.0 tok/s](https://raw.githubusercontent.com/jond34/opencode-plugin-muse/v1.0.0/media/opencode-turn.png)

## Native history

`MUSE_NATIVE_HISTORY=1` turns on the compaction hook's native replacement
window; it is off by default and stays opt-in by policy. No value has been
measured in the unit the subscription bills: `muse usage` reports account-wide
percentages that a turn does not move, so the decision is policy, not a number.

The authority is deliberately split: opencode owns the loop, tools, permissions,
session ids, forks, rewinds, and the compaction decision; Muse owns the native
inference transcript between compactions. The native session is a cache. The
digest is the portable fallback and the summary too, so a model switch, a dropped
window, or a refused resume still has the facts. Nothing migrates or locks
history to Muse, and a dropped native session costs a reseed rather than the
conversation.

On disk, the plugin writes the usage ledger (`usage-*.jsonl` under
`$XDG_STATE_HOME/opencode-muse`, mode 0600) and, at most once per allowance
window, a notice beside it (`allowance-notice.json`) that the package's TUI part
shows as a toast and deletes. The ledger holds counts — tokens, model, reseed
reason — and no prompt text, tool output, or file contents. There is no
telemetry and no metrics export. Everything else is opencode's session jsonl,
which holds prompts and tool output under opencode's retention; the plugin
neither copies nor deletes it.

The ten-session smoke test showed 5/5 old sessions reseeding after compaction and
0/5 new ones. Gate A placed a vault past the digest's clip: the new arm recalled
it 5/5 with one native row and no reseed, while one old-arm control missed it.
Gate B added 29 sessions with 0 failures, a 9.81% one-sided upper bound on the
miss rate rather than a zero-rate claim. Gate design, numbers, and what they do
not show are in
[docs/native-history-evidence.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/native-history-evidence.md);
the wire contract is in
[docs/compatibility.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/compatibility.md).

## Install

```bash
opencode plugin add @jonathand34/opencode-plugin-muse@1.0.0
```

If that fails (some opencode builds currently error in their embedded installer
with `NpmInstallFailedError`), install the package yourself and point a plugin
file at it, which is what opencode loads:

```js
// ~/.config/opencode/plugins/muse.js
export { default } from "@jonathand34/opencode-plugin-muse";
```

Requirements: opencode 2.x (the plugin targets the V2 plugin API in
`@opencode/plugin`); Muse Code CLI 1.4.20 or newer, already logged in; Node >= 22
for the build and Bun >= 1.4.4 for the tests. Runtime dependencies are
`@ai-sdk/provider@3.0.8`, `@muse-code/sdk@1.4.24`, and `@opencode/plugin@2.3.2`.

If the CLI is missing or signed out, model discovery fails and the provider has
no models; the plugin logs `model discovery failed` with the reason. If you hold
a Meta Model API key and pay per token, this plugin buys you nothing: it needs a
signed-in `muse` CLI and adds a hop.

## This plugin, or `muse acp`?

Muse ships its own editor entry point. `muse acp` speaks the Agent Client
Protocol on stdio, so an ACP-capable editor can drive Muse directly: use it when
the editor owns the agent loop and you want Muse's own tools, prompt, and
approvals.

Use this plugin when you want Muse's models inside opencode — opencode keeps the
loop, tools, transcript, permissions, and history, and Muse supplies inference.
The two do not share state: `muse acp` runs Muse's own loop and tools, while this
plugin replaces both with opencode's. It is also one-directional, for now:
opencode ships the ACP agent side only. Six upstream requests for a client
(#28991, #5182, #24038, #18106, #35550, #51646) are closed without shipping, and
the PR attached to #28991 (#28994) did not land. An ACP client that drives
`opencode acp` therefore reaches these models through opencode's provider
registry, with opencode's loop, tools, transcript, and permissions.

There is a community workaround, `opencode-acp-client`
(`pi-is314/opencode-acp-client`, published 2026-11-21), that drives opencode v2's
TUI against any ACP agent. Its README states the shape:
`TUI ──HTTP+SSE──▶ shim ──ACP stdio──▶ agent`. The shim replaces opencode's
engine rather than borrowing it: opencode's tools, permission rules, and
transcript are not in the loop. It is `muse acp` wearing opencode's look, not a
thinner version of this plugin. It was not installed or measured for this
comparison; its own documentation is the source for the shape.

## Environment

The plugin reads these when it starts, so a change takes effect on the next
opencode start. `MUSE_CAPABILITIES` and `MUSE_REMINDERS` also appear in the
source as constant names, and `MUSE_NO_AUTO_UPDATE` is set by the plugin on its
child host; none of the three is a setting you can pass.

| Variable | Default | Effect |
|---|---|---|
| `MUSE_BIN` | `muse` | CLI the plugin spawns |
| `MUSE_PRESET` | private config dir; `empty` if it could not be written | preset the host runs with |
| `MUSE_CONTAINMENT` | `warn` | `strict` refuses to start on a critical containment failure; `off` skips the checks |
| `MUSE_CONTRIBUTOR_MODE` | off | `1`, `true`, or `on` restores Muse's contributor routing for this host |
| `MUSE_NATIVE_HISTORY` | off | same values; installs native compaction windows |
| `MUSE_STRICT_HOST` | off | `1` refuses a host whose schema drifted, including a CLI newer than the SDK pin |
| `MUSE_PROBE_PROMPT` | off | `1` probes developer-prompt delivery at startup |
| `MUSE_CONTEXT_LIMIT` | unset; then model field, table, 128k | when set it wins over the model's own field |
| `MUSE_OUTPUT_LIMIT` | unset; then model field, table, 8,192 | when set it wins over the model's own field |
| `MUSE_SESSIONS_ROOT` | host `museHome`, then `<XDG_DATA_HOME>/muse/sessions` | where the containment report reads the host's toolset record |
| `MUSE_DEBUG_CONTAINMENT` | off | `1` prints the containment report at startup |
| `MUSE_ALLOW_PROJECT_HOOKS` | off | `1` runs the repo's own `.muse/hooks.json` handlers for this run instead of refusing them |
| `MUSE_FIRST_BYTE_TIMEOUT_MS` | `900000` | how long a turn may go without its first frame; `0` disables |
| `MUSE_IDLE_TIMEOUT_MS` | `180000` | silence after frames start before the turn fails; suspended while a bridged tool call is in flight; `0` disables |
| `MUSE_IDLE_WARN_MS` | `90000` | silence before a warning is logged; `0` disables |
| `MUSE_TOOL_CEILING_MS` | `0` (off) | longest a single bridged tool call may run before the host is ended |
| `MUSE_RETRY_CAP_MS` | `600000` | most a provider retry may extend the idle clock; `0` keeps the normal reset |
| `MUSE_ALLOWANCE_WARN_PERCENT` | `90` | warn once per allowance window at or above this percentage; `0` disables |

`NODE_EXTRA_CA_CERTS` is not read by the plugin. The host is a child process that
inherits this environment, so a corporate CA works by setting it for opencode.

## Verify the build

```bash
bash scripts/repro.sh
```

It installs from the committed lockfile, compiles, and compares the resulting
`dist/` against the hash recorded in
[docs/provenance.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/provenance.md).
It prints `PASS` or exits non-zero. The reproducible build, package, and publish
gates are in
[docs/release.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/release.md).

```bash
npm run check:offline   # typecheck plus the offline test suite
bun run doctor          # versions, host, hooks, ledger
```

`npm run check:offline` runs the offline suite and needs no network or
credentials. `bun test` adds the live suites that spawn a real `muse serve` host;
all need a logged-in Muse Code CLI. The current platform frame and test counts are
in
[docs/platform-support.md](https://github.com/jond34/opencode-plugin-muse/blob/main/docs/platform-support.md).

`bun run doctor` spawns the host once (a handshake and an empty session, no
turn), then prints one row per check: versions and schema drift, containment
switches, plugin entries, installed hooks, the trust record, today's ledger, and
the allowance window. `--json` is the same report for a bug report and carries
`schemaVersion` and `pluginVersion`; home paths print as `~`, and no credential
or identity is read. The `plugins` row runs `opencode debug config` and reports
every config source that lists this package, and whether any is this checkout.
The config rows are a gate by default: the run exits 1 when the host refused a
file, when a policy statement was dropped, or when `opencode` did not answer.
`--no-strict` reports only; `--offline` skips the host and exits 1 unless
`--no-strict` is also given. `--trust-hooks` accepts this workspace's
`.muse/hooks.json`, and `--forget-hooks` revokes that.

## Verify the published package

The npm package is built and staged by `.github/workflows/publish.yml` on GitHub
Actions, then approved with 2FA before it becomes public. Every version carries a
provenance attestation. After installing, two checks tie the bytes you have to
that workflow:

```bash
npm audit signatures          # registry signatures and attestations
```

To match the tarball against the attestation yourself, compare the two digests.
The registry reports base64, the attestation reports hex:

```bash
npm view @jonathand34/opencode-plugin-muse@1.0.0 dist.integrity

curl -sS -A npm/11.19.1 \
  "https://registry.npmjs.org/-/npm/v1/attestations/@jonathand34%2fopencode-plugin-muse@1.0.0" \
  | jq -r '.attestations[] | select(.predicateType=="https://slsa.dev/provenance/v1")
      | .bundle.dsseEnvelope.payload' \
  | base64 -d | jq -r '.subject[0].digest.sha512'
```

The attestation establishes that the tarball was built by this repository's
`publish.yml` at `refs/heads/main` on a GitHub-hosted runner and names the
workflow run. That is SLSA Build Level 2: it shows where the bytes came from, not
that they are free of bugs. The endpoint needs an npm-style `User-Agent`; a bare
`curl` gets a 404.

## Layout

```text
src/        upstream source plus the patches in docs/provenance.md
test/       offline suite and public harness; live suites need Muse login
docs/       compatibility, provenance, release, approval, platform, policy,
            native-history evidence, claims, and this package's history
evidence/   inputs for the reproduction check (diffs, measurements)
scripts/    repro.sh, claims/docs checks, doctor.ts, native-history analysis
media/      README screenshots
```

Local-only records are kept out of this tree; see `AGENTS.md`.

## Licence

MIT, same as upstream. See `LICENSE` and
[CREDITS.md](https://github.com/jond34/opencode-plugin-muse/blob/main/CREDITS.md).
