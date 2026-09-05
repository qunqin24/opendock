# Veris plugins

Veris runs stateful twins of the external services an application calls. An
**environment** names a set of those services; a **sandbox** is one running
deployment of it. The `veris` CLI signs in, defines environments, starts
sandboxes, seeds them, and runs the application's own tests through them:
`veris run` reroutes the code's outbound HTTP(S) into a sandbox from outside the
process, so the code under test keeps its production hostnames, credentials and
client stack, and every run ends with a **receipt** of what the sandbox received.

Install the CLI once, on any machine:

```
curl -LsSf https://raw.githubusercontent.com/veris-ai/veris-cli/main/scripts/install.sh | sh
veris login
```

## veris

Three commands an engineer invokes with a task. Every mechanism they use is a
`veris` command; the skills carry the judgment.

| command | what it does | not done until |
|---|---|---|
| `setup` | wires the repository to Veris, once: sign-in, the vendors the code calls, the environment, a test image, and one proving run | the run's receipt names each vendor with a count above zero |
| `build <issue link \| prompt>` | measures every vendor claim the task rests on against the twin before designing, implements, proves the change with `veris run` | every claim measured before the first source edit; a receipt from the changed flow; a PR stating what was verified and what is assumed |
| `fix <issue link \| prompt>` | reproduces the failure the issue describes through the repository's own code before designing, fixes it, proves the same failure closed | the failure reproduced before the first source edit; the same failure re-run green with a receipt; the PR as above |

The reference set lives once, in `veris-reference/`, a directory with a `SKILL.md`
nobody can invoke, so both installers copy it. It is read only when a command names
a file.

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

The commands run `veris`, `docker` and the control plane from the shell, and Codex's
default sandbox has neither network nor the Docker socket, so start it with
`codex -s danger-full-access -a never` (or pre-approve `veris` and `docker` prefix
rules). Otherwise every command waits on an approval.

OpenCode installs the plugin from npm:

```
opencode plugin opencode-veris -g
```

(equivalently, add `"opencode-veris"` to the `plugin` array in
`~/.config/opencode/opencode.json`). The plugin registers the same three commands.
The commands are plain OpenCode commands, which only the engineer can start.

Any other agent, through the `skills` CLI:

```
npx skills add veris-ai/plugins --all
```

### The credential

`veris login` pairs the machine once: it prints a code and a link, you approve in
the studio, and the key is saved under `~/.veris` with owner-only permissions. The
skills never see or print it. In CI, set `VERIS_API_KEY` instead; it beats the
saved profile on every command.

### Versions

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

0.7.1 — no MCP, and the first-run lessons of two measured sessions. The plugin
registers commands only: `.mcp.json`, `.codex-mcp.json` and the OpenCode plugin's
injected server are gone, since every mechanism is a `veris` command and a machine
signed in with `veris login` has no `VERIS_API_KEY` for them to send. `record.sh` runs
the command after `--` as argv, never through `sh -c`, and treats a command that cannot
start as an error rather than a verdict; `ledger.sh` requires state read back on a
`REPOSITORY` row and refuses one that cites a stub. `setup` adopts only an environment
that is the project's, reads the twin's published key instead of inventing one, fixes
the image rather than the run line, and recognises the two `doctor` lines that mean
the agent is in a sandbox of its own.

0.7.0 — CLI-first. Every mechanism the commands used to spell out as HTTP calls,
MCP tools and shell scripts is a `veris` command: `login`, `doctor`, `services`,
`env create`, `up`, `sandbox data add|schema|get`, `sandbox services manual`,
`sandbox trace`, `sandbox clock`, `run`, `snapshot`, `baseline`, `down`. The skills
keep the gates and the judgment, in plain language: measure before designing,
reproduce before fixing, prove with a receipt. `preflight.sh`, `.veris/run.sh`,
`.veris/setup.json` and the direct/transport references are gone; the project file
is `.veris/twin.yaml`, written by `veris env create`. The container tier with
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
