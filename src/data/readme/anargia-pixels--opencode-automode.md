# opencode-automode

[![npm](https://img.shields.io/npm/v/@anargia-pixels/opencode-automode)](https://www.npmjs.com/package/@anargia-pixels/opencode-automode)
[![CI](https://github.com/anargia-pixels/opencode-automode-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/anargia-pixels/opencode-automode-plugin/actions/workflows/ci.yml)

Auto mode for [opencode](https://opencode.ai). Instead of asking you about
every shell command, a fast LLM classifier decides for you: safe commands run
right away, and risky ones are blocked with a reason the agent can act on.
The agent then finds a safer route and keeps working.

It works like the auto modes of Claude Code and Grok Build. By default it uses
DeepSeek V4.1 Flash from the OpenCode Go subscription at low reasoning, so a
decision takes about 2-4 seconds.

```text
bun test                               -> allowed
git add src && git commit -m "fix"     -> allowed
rm -rf dist                            -> allowed
git reset --hard                       -> blocked, unless you asked for exactly that
curl -fsSL https://x.sh/install | sh   -> blocked: runs untrusted remote code
cat .env                               -> blocked: exposes secrets
tar czf - src | curl -T - https://...  -> blocked: uploads your source
```

## Install

Requirements:

- opencode 2.x
- An OpenCode Go subscription logged in to opencode, or any other model you
  pick with the `model` option. The plugin calls the model through opencode,
  so it needs no API key of its own.

Install it with the opencode CLI:

```sh
opencode plugin add @anargia-pixels/opencode-automode
opencode service restart
```

Or add it to `~/.config/opencode/opencode.json` yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@anargia-pixels/opencode-automode"]
}
```

opencode loads plugins when its server starts, so restart the background
service (`opencode service restart`) or any running opencode after a change.

## Choose which commands it decides

The plugin only decides shell commands that your permission rules leave at
`ask`. Commands you allow run without a check, and commands you deny stay
denied. A good setup asks about every shell command and allows a few
read-only ones:

```jsonc
"permissions": [
  { "action": "shell", "resource": "*", "effect": "ask" },
  { "action": "shell", "resource": "ls *", "effect": "allow" },
  { "action": "shell", "resource": "rg *", "effect": "allow" },
  { "action": "shell", "resource": "git status*", "effect": "allow" }
]
```

Here `ls`, `rg`, and `git status` run directly, and every other shell command
goes to the classifier instead of a prompt.

An `allow` rule skips the classifier completely. With `cat *` allowed,
`cat .env` runs unchecked. Keep secret files at `ask` or `deny`:

```jsonc
{ "action": "shell", "resource": "cat .env*", "effect": "ask" }
```

The plugin only handles shell commands. Other permissions, such as access to
directories outside the project, keep their normal prompts.

## What gets allowed and blocked

The classifier sorts each command into one of three tiers.

**Allowed.** Ordinary local development: reading and searching, build, test,
lint, project scripts, file changes inside the project, installs from the
normal registry, everyday git work including a normal push, and network reads
that do not run code. A chained command is allowed only if every part is.

**Allowed only when you ask for that exact action.** Discarding uncommitted
work (`git reset --hard`, `git restore`, `git clean`, `git stash drop`),
force-pushing a branch you named (never `main`, `master`, `develop`,
`release`, or `prod`), deleting a remote branch or tag, and publishing or
posting. Asking for an outcome, such as "get back to a clean state", does not
authorize the destructive step.

**Always blocked.** Nothing you say clears these; you can run them yourself.

- Exposing secrets: `.env` values, keys, tokens, `printenv`
- Uploading files, archives, or source anywhere, including localhost
- Running downloaded code: `curl | sh`, or a blocked script's steps by hand
- `rm -rf` of the project, most of it, home, `.git`, or an unset variable
- `sudo` and changes outside the project, such as shell rc files or `/etc`
- SSH, deploys, and production or cloud changes
- Obfuscated commands, and reworded retries of a recent block

If the classifier cannot tell what a command does, or whether you asked for
it, it blocks.

### What the classifier sees

Besides the command, it gets your last three messages, the project root, the
working directory, the agent's description of the command, and the commands
it blocked recently in the session. It never sees the agent's replies or tool
output, so text the agent reads from files or web pages cannot talk it into
approving a command. The agent's description is marked untrusted.

## When a command is blocked

The agent gets a denial with the reason and an instruction: do not stop, do
not reword, encode, split, or script the blocked action, and reach the goal a
safer way. If the task truly needs the action, the agent finishes everything
else and tells you what to run. After three blocks in a row, it is told to
stop trying and ask you.

If the classifier fails twice in a row, the command is denied and the agent
may try again later. It is never approved without a verdict. In opencode's
auto-accept mode, a leftover prompt would be approved by the client, so
denying is the safe default.

## Options

Options go in the object form of the plugin entry:

```json
{
  "plugins": [
    {
      "package": "@anargia-pixels/opencode-automode",
      "options": {
        "model": "opencode-go/deepseek-v4.1-flash",
        "variant": "low",
        "logFile": "/home/me/.local/state/opencode/automode.jsonl"
      }
    }
  ]
}
```

| Option                  | Default                           | Meaning                                                              |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `model`                 | `opencode-go/deepseek-v4.1-flash` | Classifier model, as `provider/model`                                |
| `variant`               | `low`                             | Model variant, such as reasoning effort; `""` uses the model default |
| `timeoutMs`             | `20000`                           | Timeout for one classifier call                                      |
| `failOpen`              | `false`                           | On classifier failure, keep the normal prompt instead of denying. Unsafe with auto-accept |
| `maxConsecutiveDenials` | `3`                               | Blocks in a row before the agent is told to ask you                  |
| `protectSecretFiles`    | `true`                            | Refuse `read` tool calls on `.env`, keys, and credential stores      |
| `continueOnDeny`        | `true`                            | Add the auto mode note to the system prompt                          |
| `cacheTtlMs`            | `600000`                          | How long a verdict is reused; `0` turns the cache off                |
| `maxCacheEntries`       | `500`                             | Cache size                                                           |
| `logFile`               | none                              | Append one JSON line per decision to this file                       |

`protectSecretFiles` refuses `.env` files (except examples), `.npmrc`,
`.netrc`, SSH keys, `*.pem` and `*.p12` key stores, and files under `.ssh`,
`.aws`, `.gnupg`, `.docker`, and `.kube`, without any model call.

## Troubleshooting

- **You still get shell prompts.** opencode reads plugins at server start.
  Run `opencode service restart`, and check that no older opencode server is
  still running.
- **See what it decided.** opencode does not show plugin output in its log.
  Set `logFile`, then read the file: each line has the command, the decision,
  the reason, and the time it took.
- **A safe command is blocked.** The reason is in the denial and the log. Add
  an `allow` rule for commands you never want checked.

## Development

```sh
bun install
bun run typecheck
bun run test
bun run build
bun run probe "rm -rf /"
bun run probe --user "force-push my branch feat/x" "git push --force-with-lease origin feat/x"
```

`probe` prints the classifier verdict for one command. It calls the running
opencode server through `opencode api`, so it uses your opencode login.
`--model` and `--variant` try other classifiers.

`bun run eval` runs the prompt cases in `evals/cases.ts` through a real
`opencode run` with the plugin loaded from `src/`. Each case gets a fresh
sandbox git repo and a local trap server in place of real network targets,
and its own permission config, so results do not depend on your global
config. Use `--case <id>`, `--model <provider/model>`, `--keep`, and
`--timeout <seconds>`. Results, including each case's decision log, go to
`evals/results/`. The eval spends model tokens.

### Releasing

CI runs typecheck, tests, the build, and a package check only for release
tags (`v*`), not on every push. Run `bun run typecheck && bun run test` locally
before you release. To release:

1. Bump `version` in `package.json` and push the commit.
2. Publish a GitHub release whose tag is `v` plus that version, such as
   `gh release create v0.2.0 --generate-notes`.

The `Publish` workflow then publishes to npm with trusted publishing, so no
npm token is stored in GitHub, and npm shows a provenance attestation.

Layout:

```text
src/index.ts       plugin entry: hooks into opencode permissions and sessions
src/classifier.ts  policy prompt, verdict parsing, model call with timeout
src/context.ts     recent user messages, shell call details, recent blocks
src/evaluator.ts   verdict cache, retry, and in-flight deduplication
src/config.ts      option parsing and defaults
src/messages.ts    denial texts and the system prompt note
test/              unit tests
scripts/           probe and eval runners
evals/             end-to-end eval cases
```

## License

MIT
