# Veris plugins

Veris runs stateful twins of the external services an application calls. An
**environment** names a set of those services; a **sandbox** is one running
deployment of it; `veris-proxy` reroutes the application's outbound HTTP(S)
into a sandbox from outside the process, so the code under test keeps its
production hostnames, credentials and client stack, and ends each run with a
**receipt** of what the sandbox received.

## veris-sim

Three commands an engineer invokes with a task, plus the `veris` MCP server.

| command | what it does | not done until |
|---|---|---|
| `setup` | wires the repository to an environment, once: credential, environment, transport (proxy+docker, or `--direct` where the app's config carries the base URLs), and — when the app works with files — the state they live in, promoted with a yes | a smoke run's receipt — or, direct tier, the twin's trace — names the service |
| `build <issue link \| prompt>` | measures every vendor claim the task rests on against the twin before designing, implements, exercises the change through `veris-proxy` | every claim measured before the first source edit; a receipt from the changed flow; a PR stating what was verified and what is assumed |
| `fix <issue link \| prompt>` | reproduces the failure the issue describes through the repository's own code before designing, fixes it, proves the same failure closed | the failure reproduced before the first source edit; the same failure re-run green with a receipt; the PR as above |

The reference set lives once, in `veris-reference/` — a directory with a
`SKILL.md` nobody can invoke, so both installers copy it — and is read only
when a command names a file. `setup` also carries `scripts/preflight.sh`
and its own `reference/transport.md`. The sandbox API is called directly —
the `veris` MCP tools for lifecycle and clock control, `curl` against
`/veris/*` for the rest — with the exact calls in the references.

### Install

Claude Code:

```
/plugin marketplace add veris-ai/plugins
/plugin install veris-sim@veris
```

The plugin registers the `veris` MCP server; it reads `VERIS_API_KEY` from
your environment (`VERIS_API_BASE` defaults to `https://svc.api.veris.ai`).
Then, in a repository:

```
/veris-sim:setup
/veris-sim:build https://github.com/org/repo/issues/42
/veris-sim:fix   "create_invoice duplicates the invoice when the response is lost"
```

Codex reads the same marketplace (measured with Codex 0.149):

```
codex plugin marketplace add veris-ai/plugins
codex plugin add veris-sim@veris
```

That installs the commands and registers the `veris` MCP server from
`veris-sim/.codex-mcp.json`; the server reads `VERIS_API_KEY` from your
environment. Its URL is literal, because Codex expands no variables — for a
control plane other than production, override it in `~/.codex/config.toml`,
where a `[mcp_servers.veris]` block wins over the plugin's.
Codex names plugin commands after the plugin, so ask for them by name:
`$veris-sim:setup`, `$veris-sim:build <issue link or prompt>`,
`$veris-sim:fix <issue link or prompt>`. Installed through the `skills` CLI
instead, they are `$setup`, `$build …`, `$fix …`.

OpenCode installs the plugin from npm:

```
opencode plugin opencode-veris-sim -g
```

(equivalently, add `"opencode-veris-sim"` to the `plugin` array in
`~/.config/opencode/opencode.json`; upgrades pin a version:
`opencode plugin opencode-veris-sim@<version> -g -f`). Before the npm
release, clone this repository and put the absolute path of
`veris-sim/.opencode-plugin` in that `plugin` array instead. The plugin
registers the same three commands — `/veris-sim:setup`, `/veris-sim:build`,
`/veris-sim:fix` — and the `veris` MCP server, reading `VERIS_API_KEY` from
your environment at startup; `VERIS_API_BASE` is honored. The commands are
plain OpenCode commands, which only the engineer can start — OpenCode
ignores `disable-model-invocation`, and its skills are model-invoked, so
the skills are not installed as skills there. An unset key shows the server
as failed in `opencode mcp list`; export it and restart. An `mcp.veris` or
`command` entry in your own opencode config wins over the plugin's.

Any of 76+ agents, through the `skills` CLI:

```
npx skills add veris-ai/plugins --all
```

`--all` takes every skill without the picker; without it the command is
interactive. This path does not register the MCP server — add it to
`~/.codex/config.toml` (or your agent's equivalent) yourself:

```toml
[mcp_servers.veris]
url = "https://svc.api.veris.ai/mcp"
env_http_headers = { "X-API-Key" = "VERIS_API_KEY" }
```

### The credential

`setup` reads `VERIS_API_KEY` from the environment. If it is not set, it
gives you one command to run in your terminal (`echo 'export
VERIS_API_KEY=<key>' >> ~/.zshrc && source ~/.zshrc`), waits, and confirms
it is set. The skill writes the key nowhere; the MCP server reads the
environment at session start, so restart the agent after setting it.

### Versions

0.6.9 — the clock is sandbox state, not a service choice. The reference uses
`set_sandbox_clock` or the authenticated sandbox clock REST resource instead
of asking an agent to pick one service's `control_url` to move time for all of
them.

0.6.8 — the coverage catalogue is the first door, not the last. 0.6.4 read
`/veris/operations` as unpublished and sent agents to arm a fault per
operation instead; every service had opted in the day before, so the slow
door was the documented one. `GET {control_url}/veris/operations` now leads,
answers on every service, and reports every surface — `?surface=rest`,
`?surface=graphql` or `?surface=mcp`, with `mcp` naming the tools a service
actually resolves, which the vendor's verbatim `tools/list` cannot show.
Arming a fault stays what it is, a way to make a call fail; it is no longer
how coverage is looked up.

0.6.7 — the word *world* is gone: `veris-reference/worlds.md` is `state.md`,
and the commands say *state*. The team uses *world* for the twin plus the
actor service; the plugin used it for what a sandbox holds, so one word
carried two referents. Same steps, same endpoints, one file renamed.

0.6.5 — files. Bytes go in through `POST {control_url}/veris/files`, never
`/veris/data`; rows first (the owner the files hang off), files second;
a file's row shows the SHA-256 of its bytes, which is how an upload is
checked. `setup` gains step 7: when the app works with files, seed the
state once, ask, and promote, so no task loads the files again. `build`
and `fix` still never promote.

0.6.4 — the manual is not a coverage catalogue: `build` and `fix` said it
listed what a service does not implement, and named one service's refusal
code as if every service used it, so an agent read a short manual as an
absence. `/veris/operations` leaves both gates — no service publishes one.
A refusal that names itself unsupported settles the question; an ordinary
`400` or `404` does not, and is reported as uncertainty. Discovery runs
cheapest-first (manual, the bare `/veris/data` census, one projected table),
trace reads name their tier, and fault rows gain path templates, GraphQL
selectors and frozen clock mode.

0.4.3 — `build` and `fix` seed the world before they measure: neither command
named the write side of `/veris/data`, so the rows a code path needs were
nobody's step.

0.4.2 — Codex fixes measured in a clean box: the commands are listed to the
model (a skill Codex is told never to invoke implicitly is not shown at all,
so naming it did nothing), and Codex gets its own `.codex-mcp.json` — it
expands neither `${VAR:-default}` nor Claude's `headers` key, so the server
it registered from `.mcp.json` had an unreachable host and no API key.
`codex plugin marketplace add` is the install path.

0.4.1 — `test` removed: the suites it would run are mocked, so it reduced to
setup's smoke run; `build` and `fix` write the vendor-reaching test in their gate.

0.4.0 — `setup --direct`: a direct-connection tier for applications whose
config reads each service base URL from its `env_hint` variable — the
shipped path on platforms without docker (Replit, most PaaS). Trust anchor
becomes the twin's request trace instead of the proxy receipt;
`reference/direct.md` carries the contract. `setup` also accepts service
names to seed environment creation.

0.3.0 — `test`: run one named test, or every test that reaches the vendor,
through `veris-proxy`, with a per-test verdict on whether it reached the twin.

0.2.1 — `setup` names the services it inferred when asking to create an
environment; the reply may add or drop names.

0.2.0 — three commands (`setup`, `build`, `fix`) replace the 0.1 skills
(`setting-up-veris`, `discovering-vendor-behavior`, `integration-testing`).
The knowledge those carried is in `veris-reference/`.
