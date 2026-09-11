# Veris plugins

Veris runs stateful twins of the external services an application calls. An
**environment** names a set of those services; a **sandbox** is one running
deployment of it. The `veris` CLI signs in, defines environments, starts
sandboxes, seeds them, and runs the application's own tests through them:
`veris run` reroutes the code's outbound HTTP(S) into a sandbox from outside the
process, so the code under test keeps its production hostnames, credentials and
client stack, and every run ends with a **receipt** of what the sandbox received.

For a CLI-owned workflow, install the CLI once on the controlling machine:

```
curl -LsSf https://raw.githubusercontent.com/veris-ai/veris-cli/main/scripts/install.sh | sh
veris login
```

An OpenCode sandbox plugin can instead own the session and its attached twin.
The same skills then use its remote application tools and current-run evidence;
local CLI installation and Docker are not prerequisites for that session path.
See the OpenCode configuration below.

## veris

Three commands an engineer invokes with a task. The skills use Veris during normal
development across CLI-owned and plugin-managed execution. A relevant application
test and its existing receipt can establish the change; there is no fixed run quota
or separate proof phase.

| command | what it does | completion |
|---|---|---|
| `setup` | verifies the current session or wires a CLI-owned workflow, identifies vendors, and proves one application run reaches the twin | evidence attributable to that run shows the required vendor calls and expected responses/state |
| `build <issue link \| prompt>` | answers relevant service questions and tests the new application behavior | applicable assertions pass through the intended caller, with current-run twin evidence and a concise result |
| `fix <issue link \| prompt>` | investigates the reported defect and tests the changed application behavior | applicable assertions pass through the affected caller, with current-run twin evidence and a concise result |

The reference set lives once in `veris/skills/veris-reference/`. Claude and Codex
ship that canonical tree; the OpenCode npm package bundles it and exposes its
files through `verisSkill`. References are loaded when a command needs them.

### Install

Claude Code:

```
/plugin marketplace add veris-ai/plugins
/plugin install veris@veris
```

Then, in a repository:

```
/veris:setup
/veris:build https://github.com/org/repo/issues/42
/veris:fix   "create_invoice duplicates the invoice when the response is lost"
```

Codex reads the same marketplace:

```
codex plugin marketplace add veris-ai/plugins
codex plugin add veris@veris
```

Codex names plugin commands after the plugin: `$veris:setup`,
`$veris:build <issue link or prompt>`, `$veris:fix <issue link or prompt>`.

For a CLI-owned container workflow, commands use `veris`, Docker and the control
plane from the shell. Codex's default sandbox has neither network nor the Docker socket, so start it with
`codex -s danger-full-access -a never` (or pre-approve `veris` and `docker` prefix
rules). Otherwise every command waits on an approval.

OpenCode uses the Veris skills package plus one selected sandbox plugin
(the renamed skills package needs its first release):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@veris-ai/veris-opencode@latest",
    "@veris-ai/daytona-opencode@latest"
  ]
}
```

For E2B replace the second entry with `@veris-ai/e2b-opencode@latest`. These are
OpenCode plugins configured in `opencode.json`, not `npx` commands. Set the
provider's host credentials and environment, restart OpenCode, then run
`/veris:setup`, `/veris:build` or `/veris:fix`. Setup verifies the attached session
before local CLI/Docker checks; the provider owns its twin and cleanup. Changes
return through `gitSync` to a local `opencode/N` branch; ignored evidence needs an
explicit handoff. Record the resolved published versions for reproducibility.

See [OpenCode installation and release prerequisites](veris/.opencode-plugin/README.md)
and the [provider differences](veris/skills/veris-reference/opencode.md). The
published `@veris-ai/veris-sim-opencode` 0.7.0 release predates this session path.
The next release uses `@veris-ai/veris-opencode`, matching the `veris` name in
Claude and Codex, with `veris/skills` as its canonical content. After that release,
replace the old package entry in your OpenCode config with the new one; install
only one skills package. It can also be installed alone for a CLI-owned workflow.

Any other agent, through the `skills` CLI:

```
npx skills add veris-ai/plugins --all
```

### The credential

In a plugin-managed OpenCode session, use the provider host variables described
[here](veris/skills/veris-reference/opencode.md#discovery-and-control-access).
The following login applies to CLI-owned workflows.

`veris login` pairs the machine once: it prints a code and a link, you approve in
the studio, and the key is saved under `~/.veris` with owner-only permissions. The
skills never see or print it. In CI, set `VERIS_API_KEY` instead; it beats the
saved profile on every command.

### Hosted execution

The hosted tier has provider recipes for
[Daytona](veris/skills/veris-reference/daytona.md) and
[E2B](veris/skills/veris-reference/e2b.md), with selection and evidence rules in
[hosted.md](veris/skills/veris-reference/hosted.md). Both use the provider's
published SDK as shipped — `@veris-ai/daytona`, a drop-in for `@daytona/sdk`,
and `@veris-ai/e2b` — through a task-local script: attach a separate
application-test box to the task's existing twin
(`create({ veris: { attachSandboxId } })`), upload the code, install
dependencies, run commands with the trust environment applied, and read the
receipt since a baseline. Neither package ships a CLI the skills depend on.
Each task resolves `latest` itself and lets `--save-exact` and the lockfile hold
it for that run, so a recorded version describes the evidence instead of
dictating the next run; `tests/skill_version_claims.sh` fails a skill document
that pins a specifier, records what `latest` resolved to, or names the removed
`veris-daytona` executable. A Daytona box running a Node application needs Node
24 or newer in the image: the SDK's proxy routing rests on `NODE_USE_ENV_PROXY`
and an `Agent` `proxyEnv` that Node 20 ignores, so there the canary and `curl`
still pass while every Node client fails DNS. The Daytona recipe spells out what the SDK sets for the
proxy and for trust, and what a Node process needs on top; provider-specific
setup and limits are in each recipe. OpenCode provider configuration and
session-owned sandboxes are a separate workflow.

### Versions

These entries describe the source plugin history. The old
`@veris-ai/veris-sim-opencode` npm 0.7.0 tarball predates the CLI migration below;
matching version numbers across that old distribution and this source do not
establish matching content.

0.8.0 — use Veris in the normal development loop. `build` and `fix` reuse a
relevant application test and its receipt instead of requiring a separate proof
phase. Extra probes, fault cases and repeated calls answer task-specific questions;
there is no mandatory two-run check, per-measurement falsifier or prompt hook.
Record/ledger helpers remain available for requested investigations, with the
existing full-SHA `--base` interface; optional recorded runs gain a timestamp.
Setup no longer requires staging those helpers, preserves artifact preferences,
and reuses an execution of the exact saved command. Provider identity, routing,
trust and current-run evidence requirements remain. Reduced instruction overhead
does not by itself establish faster tasks or unchanged correctness.

0.7.4 (unreleased) — the Daytona recipe is written around the `@veris-ai/daytona`
SDK as shipped (0.3.1 and later): the run is a sequence of SDK calls the
agent's own task-local script makes (attach to the task's twin, upload, install,
patch bundled CAs, baseline, run with the trust environment, receipt, delete),
with the SDK's README and typings as the reference rather than a reprinted script. It states what the SDK sets
for egress and trust and what a Node process needs beyond it: `NODE_USE_ENV_PROXY`,
`--use-openssl-ca`, and the Agent proxy preload for SDKs that build their own
`https.Agent` (stripe-node measured). Also: one organisation for the CLI and the SDK, `COPYFILE_DISABLE`
on macOS uploads, workspace packages staged as a copy, and the application's own
database inside the box until data planes are carried through. Run against a live
box on 2026-09-08 (Medusa's payment module through the Stripe provider).

0.7.3 (unreleased) — OpenCode commands load skills from the installed package in
Daytona and E2B sessions, reuse the attached twin, and require evidence attributable to each
application run. The plugin owns lifecycle; generated changes use its git sync.

0.7.2 — a hosted tier, with a Daytona provider recipe. `setup` can run tests remotely
when requested, or when the code needs redirection and Docker is unavailable.
`veris-reference/hosted.md` describes selection, remote workload preparation, trace
evidence, project notes and cleanup; `veris-reference/daytona.md` holds the commands
and provider limits. The flow is `veris up`, then `provision`, `push`, `exec` and
`teardown` through `veris-daytona`, with the twin's trace as the receipt. `build` and
`fix` reuse the recorded commands. The runner uses an exact published version through
`npx`; setup checks that release contains all four CLI verbs before creating resources.
Earlier Node/Stripe and Python/Stripe trials informed the guidance; these
documentation changes were not run against a live box.

0.7.1 — the skills adapters retired their MCP registration, alongside the
first-run lessons of two measured sessions. At that release they registered
commands only: `.mcp.json`, `.codex-mcp.json` and the OpenCode plugin's
injected server are gone, since every mechanism is a `veris` command and a machine
signed in with `veris login` has no `VERIS_API_KEY` for them to send. `record.sh` runs
the command after `--` as argv, never through `sh -c`, and treats a command that cannot
start as an error rather than a verdict; `ledger.sh` requires state read back on a
`REPOSITORY` row and refuses one that cites a stub. `setup` adopts only an environment
that is the project's, reads the twin's published key instead of inventing one, fixes
the image rather than the run line, and recognises the two `doctor` lines that mean
the agent is in a sandbox of its own.

0.7.0 — CLI-first. Most mechanisms formerly spelled out as HTTP calls, MCP tools
and shell scripts moved to `veris` commands: `login`, `doctor`, `services`,
`env create`, `up`, `sandbox data add|schema|get`, `sandbox services manual`,
`sandbox trace`, `sandbox clock`, `run`, `snapshot`, `baseline`, `down`. The skills
keep the gates and the judgment, in plain language: measure before designing,
reproduce before fixing, prove with a receipt. `preflight.sh` and `.veris/run.sh`
were retired; CLI environment configuration lives in `.veris/twin.yaml`, written by `veris env create`. Current setup also
writes `.veris/setup.json` for source/build facts and artifact policy, and keeps
the direct-tier reference. The container tier with
`--patch-bundled-cas` is the default for code under test.

0.6.9 — the clock is sandbox state, not a service choice.

0.6.8 — the coverage catalogue is the first door, not the last.

0.6.7 — the word *world* is gone: `veris-reference/worlds.md` is `state.md`.

0.6.5 — files: bytes go in through the twin's upload route, rows first, files second;
`setup` gains the files step.

0.6.4 — the manual is not a coverage catalogue; discovery runs cheapest-first.

0.4.3 — `build` and `fix` seed the world before they measure.

0.4.2 — Codex fixes measured in a clean box.

0.4.1 — `test` removed.

0.4.0 — `setup --direct`: a direct-connection tier for applications whose config
reads each service base URL from its `env_hint` variable.

0.3.0 — `test`: run one named test through the proxy with a per-test verdict.

0.2.1 — `setup` names the services it inferred when asking to create an environment.

0.2.0 — three commands (`setup`, `build`, `fix`) replace the 0.1 skills.
