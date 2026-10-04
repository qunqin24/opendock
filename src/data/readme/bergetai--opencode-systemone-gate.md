# opencode-systemone-gate

Stops your coding agent from running the bash command you'd regret.

Every bash command [opencode](https://opencode.ai) is about to execute is
scored by a small decision model first, in about 100 ms. If the command
destroys data, leaks a secret, or breaks a rule in your repo's
`guardrails.md`, the call is blocked and the agent is told why, so it can
pick another route.

```
SystemOne-gate: blocked command — destructive=0.98 > 0.7
  rm -rf ./important-data
Judged destructive/leaking on its own merits — named exceptions in
guardrails.md do not override this. If it is intended, your human
can run it directly, or restart opencode with SYSTEMONE_GATE=off
for a session that needs it. The agent must not edit guardrails.md
to work around this.
```

## When it helps

Two situations where a pattern list leaves you exposed.

Teams that work close to production. The agent runs `kubectl`, `helm` and
`git push` all day, and the difference between routine and incident is your
team's policy, not a filename pattern. The gate reads that policy from
`guardrails.md` and applies it to every command.

Background agents that read mail, tickets or forms. Their input is written
by strangers, and a crafted message can talk an agent into running
something harmful. No one is watching when it happens. The gate does not
promise that the agent cannot be persuaded — it promises that the boundary
holds anyway, because the gate judges the command and your rules, not the
conversation that led to it.

## Try it

Add the plugin to `opencode.json` (global or per project):

```json
{
  "plugin": ["@bergetai/opencode-systemone-gate"]
}
```

Set a key and restart opencode (plugins load at startup):

```sh
export BERGET_API_KEY=…
```

Keys come from [berget.ai](https://berget.ai). The free tier includes €5 of
credit, and a gate call is small enough that it lasts a long time. If you already use Berget Code
and are logged in through `@bergetai/opencode-auth`, skip the key: the gate
picks up your seat token. If you run your own System One-compatible endpoint,
point `BERGET_BASE_URL` at it instead.

## Why a model and not a regex

A deny-list of patterns knows `rm -rf`. It does not know that your team
forbids pushing to `main` but allows feature branches, or that `kubectl get`
is fine in prod while `kubectl apply` is not. Asking a second LLM to review
each command does know that, at the price of a full generation per command.

[System One](https://docs.typesafe.ai) is a decision model: it reads the command plus
your written rules and returns scores for a fixed set of questions in a
single forward pass. That makes two things possible.

The gate follows your policy. With the example guardrails below,
`git push origin HEAD:main` is a violation and `git push origin feature/x`
is not, even though both are a `git push`.

It also catches what the driving model shrugs at. An agent that prints a
`.env` file to "check the config" sees a harmless read. The gate sees
credentials leaving the file.

## How well it judges

berget/bev is fine-tuned on 221,759 judged decisions from real operations
traffic — privacy and risk calls, memory decisions, routing, evasion
attempts — with labels validated by a stronger model and human review.
Held-out accuracy, against the base model it is built on:

| Test | What it measures | Base model | berget/bev |
|---|---|---|---|
| Risk (16,902 questions) | credentials and destructive content in ops text | 93.5% | **97.0%** |
| Memory (7,456) | what is worth remembering | 64.6% | **90.7%** |
| Router (5,679) | routing decisions | 27.3% | **74.4%** |
| Evasion holdout (90) | evasion attempts never seen in training | 65.6% | **93.3%** |
| EU risk (43) | EU AI Act risk classification | 70% | **95%** |
| Red team (34) | adversarial commands | 53% | **74%** |
| Jev bench (1,200) | general Jev questions, outside our domain | 80.6% | **82.8%** |

Read the table with two caveats. The test splits come from the same
corpora as training, so they measure fit to this kind of traffic, not
performance on your traffic. And the weakest rows are the honest ones:
adversarial commands sit at 74%, which is why the gate is one layer and
not the whole defense.

## What it asks

| Question | Meaning |
|---|---|
| `destructive` | Does the command delete, overwrite, or irreversibly destroy data, databases, clusters, or infrastructure? |
| `credentials` | Does the command contain, print, or send credentials, secrets, API keys, or tokens? |
| `guardrails_violation` | Does the command violate the team's `guardrails.md`? Asked only when the file exists. |
| `policy_exception` | Does the guardrails text explicitly name this command as allowed? Vague permissions do not count. Asked only when the file exists. |

Each answer is a score between 0 and 1. Anything above the threshold
(default `0.7`) blocks the tool call before execution, and the error message
goes back to the agent. The four questions are not interchangeable, and the
difference matters:

- `guardrails_violation` is about your policy, and policy false positives
  are fixable in the policy: a command the guardrails text explicitly names
  as allowed passes. The exception must be precise — "may manage databases"
  does not unlock `rm -rf /var/lib/postgresql`.
- `destructive` and `credentials` are about the command's nature, and named
  exceptions do not override them. Those two are the backstop, and
  `guardrails.md` is agent-editable between sessions — a file line must not
  be able to switch the backstop off.

## Team guardrails

Write a `guardrails.md` in the repo root (or `.opencode/guardrails.md`).
Write it yourself — the value is in deciding what your team actually
allows, not in shipping a generic file. The example below is a starting
point for the shape:

```markdown
# Guardrails for agents in this repo

## The agent MUST NOT

- Edit this file (guardrails.md) itself — it is written and changed by humans, through review.
- Change anything in production — production changes reach production only through Git/CD.
- Push directly to the main branch — all changes go through pull request.
- Install software outside the project's declared dependencies.
- Send data to external services outside our approved list (docs/approved-domains.md).
- Run irreversible operations against shared systems — deletions, cleanup, resets.

## The agent MAY

- Inspect any environment read-only.
- Run tests, lint, and builds locally.
- Create branches and push feature branches.
- Read documentation from the approved sources in docs/approved-domains.md.
```

The gate reads the file once at session start, so restart opencode after
editing. Only the first 2000 characters are sent to the model, so keep the
file short and put the important rules first.
See [`guardrails.example.md`](guardrails.example.md).

## Overriding a block

The agent cannot disable the gate or un-block a command by retrying, and
there is no override file it could write. The one agent-reachable influence
left is the repo's `guardrails.md` itself — the gate reads it once at
session start, but an agent with edit access could still weaken its rules
for the *next* session. Treat `guardrails.md` changes as code review, and
unattended agents should treat the file as untrusted input. Your overrides:

- **Once:** restart opencode with `SYSTEMONE_GATE=off` and redo the step.
- **Tune:** raise `SYSTEMONE_THRESHOLD` if the gate is too jumpy for your
  taste.
- **Fix the policy:** if the block is a false positive against your rules,
  change `guardrails.md`. That is the durable fix, and since the file lives
  in the repo, the change goes through review like any other edit.

## Disclaimer

The gate is a trained model, not a deterministic rule engine. berget/bev
scores around 96% on our held-out test sets — high, but not 100%, and it
will occasionally judge a command wrong in both directions: blocking
something safe, or letting something risky through. Berget provides the
gate as a tool, not a guarantee, and accepts no liability for decisions it
gets wrong or for damage done by commands it let pass. Keep the override
and audit paths, and treat the gate as one layer among several — scoped
credentials, sandboxes and human review still matter.

## What it doesn't do

- It gates bash commands only. File edits and other tool calls pass
  through. Every argument that points to an existing file is read and
  judged together with the command — whatever tool would run it
  (`bash x.sh`, `perl x.pl`, `dotnet x.csx`, `awk -f x.awk`, a data
  file passed to anything). This closes the write-then-run bypass
  where an agent writes logic with the ungated edit tools and executes
  it with an innocuous command line, and it needs no interpreter
  blocklist — those are never complete. Inline code (`perl -e '…'`)
  is already part of the command text. One level deep, 4 kB per file,
  up to three files, binaries skipped: network-fetched payloads
  (`curl … | sh`) remain a gap, and a determined agent with write
  access can still be creative. This is one layer, not a sandbox.
- It fails closed. If the endpoint is unreachable the command is blocked
  until the endpoint responds again. That is deliberate: with fail-open, an
  agent could induce the failure itself — hammer the endpoint until it is
  rate-limited, or drain the account quota — and then run anything
  unchecked. Transient hiccups are absorbed by the SDK's retries with
  backoff; a persistent failure blocks, and the agent relays the error.
  Interactive users who prefer availability can set
  `SYSTEMONE_FAIL_OPEN=1`, knowingly.
- It sends every command to the endpoint to be judged. Berget
  has a zero data retention policy and operates under EU data protection
  law, so a command that contains something sensitive is scored and not
  stored. If you would still rather keep it in-house, run your own endpoint.
- It is one layer. The driving model's own refusals are another, and neither
  replaces scoped credentials or a sandbox.
- Earlier versions read an override file at
  `~/.cache/opencode/systemone-gate.allow`. That mechanism is removed — the
  agent could write the file itself — and the file is now ignored.
- It does not decode obfuscated payloads. A command like
  `echo <base64> | base64 -d | sh` is judged on its visible text, and in our
  testing an encoded `rm -rf` inside a base64 blob scored as harmless.
  Direct instruction injection aimed at the model — "ignore previous
  instructions", fake JSON answers, authority claims, prompts in other
  languages — did not move the verdict in any of eight tested cases, but
  encoding is a real gap. If your agents run untrusted input, treat encoded
  pipelines as blocked territory in `guardrails.md`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| (seat token) | auto | Berget Code seat auth via `@bergetai/opencode-auth` |
| `BERGET_API_KEY` | – | Bearer token for CI/headless (fallback: `TYPESAFE_API_KEY`) |
| `BERGET_BASE_URL` | `https://api.berget.ai` | Gateway root or full `/v1/systemone` URL (fallback: `TYPESAFE_BASE_URL`) |
| `BERGET_MODEL` | `berget/bev` | Model id as exposed by the gateway (fallback: `TYPESAFE_DEFAULT_MODEL`) |
| `SYSTEMONE_THRESHOLD` | `0.7` | Block threshold (0–1) |
| `SYSTEMONE_FAIL_OPEN` | – | Set to `1` to let commands run when the endpoint is unreachable (default is fail-closed) |
| `SYSTEMONE_GATE` | – | Set to `off` to disable the gate |
| `SYSTEMONE_LOG` | – | Set to `1` to write the audit log |

Credentials resolve per request: seat token, then `BERGET_API_KEY`, then
`TYPESAFE_API_KEY`. With no credential at all the gate logs one line and
stays inactive.

## Circumvention slows itself down

Every block doubles the wait before the next command is judged: 10 ms,
20 ms, 40 ms … with no ceiling. The first nine blocks are imperceptible —
a few false positives cost nothing. The first noticeable pause arrives
around block ten (5 s), by block twenty an attempt waits 1.5 hours, by
block twenty-five almost two days. An agent shopping for variants past
the gate runs out of time long before it runs out of ideas.

On top of that, the counter fades with quiet time — one block of memory
per 30 minutes — so early false positives heal instead of poisoning the
whole session. The fade is wall-clock: an agent cannot launder the
counter by interleaving allowed commands, and one that keeps hammering
refreshes the clock on every block, so escalation continues unchanged.

The wait is a visible cooldown, not a silent hang: the next command gets
an error saying exactly what is happening —

```
SystemOne-gate: cooling down after 3 blocked commands — next attempt in ~5 s.
The wait doubles with every block; restarting opencode resets it.
```

Retrying early returns the same message with the remaining time and does
not extend the cooldown. Restarting opencode resets the counter; the
audit log records the block count and cooldown with every verdict.

## Details

There is no fast path: every command is judged, including `git status` and
`ls`. Prefix allowlists are the classic seam an agent learns to exploit —
`ls` followed by a newline and `rm -rf`, or a harmless `echo` carrying a
destructive tail — so the gate does not have one, and neither does it have
an override file the agent could write to.

Every command costs one `POST /v1/systemone`. All questions are
answered in the same forward pass, so adding a question type costs
milliseconds and no extra round-trip. The questions use the `noul` type from
the System One contract; any endpoint that implements the contract works.

Nothing is written to disk unless you turn on the audit log. With
`SYSTEMONE_LOG=1`, every verdict is appended as JSONL to
`~/.cache/opencode/systemone-gate.log` with the full command and all scores.
Verdicts you disagree with can be reviewed there and fed back as training
data for the next fine-tune. The log holds whatever your commands hold, so
treat it as sensitive.

Manual install: copy [`index.ts`](index.ts) into
`~/.config/opencode/plugins/` (global) or `.opencode/plugins/` (per project)
and register `"plugin": ["./plugins/index.ts"]`. Manual installs need
`@typesafe-ai/sdk` resolvable (`npm install -g @typesafe-ai/sdk`); the npm
package brings it as a dependency.

## License

MIT
