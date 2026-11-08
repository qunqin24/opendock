<div align="center">

# agent-guard

**Run your coding agent yolo. Safely.**

English | [Русский](README.ru.md)

A guard for [OpenCode](https://opencode.ai) and [Claude Code](https://claude.com/claude-code):
a local model checks every shell command before it runs. Safe commands pass silently, unsafe ones
stop and ask you.

</div>

## Why

Permission prompts in coding agents are binary: either you click "Allow" all day, or you turn
everything off and hope. agent-guard adds the missing middle layer: a small local model reads each
command and decides: routine project work, or something that can wipe data, touch the system,
or leak secrets.

Pair it with an all-allowed agent and you get yolo UX with a guardian:

- safe command, allowed by rules -> runs instantly
- safe command, not covered by rules -> passes without a prompt
- unsafe command, allowed by rules -> escalates and shows you the classifier's reason

## Let your agent do it

Paste this into your OpenCode or Claude Code session and the agent will set everything up itself:

```text
Install agent-guard for me from https://github.com/safe-yolo/agent-guard, follow its README.
Pick the OpenCode plugin or the Claude Code hook, whichever agent you are. For OpenCode use mode
"shadow". Point it at a local classifier: a Jev / System One decision server (laya-serve or the
wrapper in examples/catshell), for OpenCode also any vLLM server with structured outputs. Check if
one is already running on this machine or my LAN, if not, set one up or ask me for the address.
Then run a harmless test command and show me what the guard decided.
```

## How it works

Both integrations run the same engine: hard rules first, then the classifier, then an optional
second opinion. The verdict is `safe` or `unsafe` with a short reason. Claude Code uses a
`PreToolUse` hook, see [Install](#claude-code).

The OpenCode plugin registers a `permission.evaluate` hook and has two modes:

- `shadow` mode only logs verdicts, changing nothing. Run it for a few days first.
- `enforce` mode escalates unsafe-but-allowed commands to `ask`, and auto-approves safe commands
  that would have prompted. Configured `deny` rules are never touched, the hook does not even
  fire for them.

Verdicts are cached per command, so repeats are free.

> **macOS note**: the request goes through `curl` instead of `fetch`. Bun, and therefore
> OpenCode, is often blocked from LAN hosts by macOS Local Network privacy (`EHOSTUNREACH`),
> while Apple's own `curl` is allowed.

## Install

Pin an exact version. The guard sits on the permission path of every shell command, so an update
must never land silently. To update: bump the version, read what changed, restart the agent.

### OpenCode

```jsonc title="opencode.json"
{
  "plugins": ["@safe-yolo/agent-guard@0.2.14"]
}
```

With options (for example, a classifier on another host):

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.14",
      "options": {
        "mode": "shadow",
        "url": "http://127.0.0.1:8000/v1/chat/completions",
        "model": "qwen3.6-35b"
      }
    }
  ]
}
```

To run from a local clone, point `package` at its directory.

Start in `shadow`, read the log for a few days, then switch to `enforce`.

If you previously enabled blanket auto-approve, turn it off in enforce mode: it would press
"Allow" on the very prompts safe-yolo escalates for your review.

### Claude Code

The hook is the `safe-yolo-guard` binary from the same package:

```sh
npm install -g @safe-yolo/agent-guard@0.2.14
```

Add it to your settings:

```json title="~/.claude/settings.json"
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "SAFE_YOLO_URL=http://127.0.0.1:8011/v1/systemone safe-yolo-guard"
          }
        ]
      }
    ]
  }
}
```

What happens to a command:

- safe -> runs without a prompt
- unsafe or a hard rule -> Claude Code asks you and shows the reason
- classifier down -> the hook stays silent and your Claude Code permission rules decide

The hook has no `shadow` mode, it acts from the first command. All settings are environment
variables:

| Variable | Default | What it does |
|---|---|---|
| `SAFE_YOLO_URL` | `http://127.0.0.1:8011/v1/systemone` | primary endpoint, systemone API only |
| `SAFE_YOLO_MODEL` | - | classifier model id |
| `SAFE_YOLO_API_KEY` | - | Bearer key for the primary endpoint |
| `SAFE_YOLO_THRESHOLD` | `0.8` | primary confidence below this escalates |
| `SAFE_YOLO_POLICY_FILE` | `~/.config/agent-guard/policy.md` | markdown file with your policy rules |
| `SAFE_YOLO_ESCALATE_URL` | - | second-opinion endpoint, openai API |
| `SAFE_YOLO_ESCALATE_MODEL` | `qwen3.6-35b` | model id for escalation |
| `SAFE_YOLO_ESCALATE_API_KEY` | - | Bearer key for escalation |
| `SAFE_YOLO_ESCALATE_API` | `openai` | `openai` (vLLM) or `zai` (Z.ai GLM) |
| `SAFE_YOLO_ESCALATE_SKIP_DIRS` | - | colon-separated dirs that never escalate |
| `SAFE_YOLO_SECRETS_FILE` | `~/.config/agent-guard/secrets.txt` | your secret patterns |
| `SAFE_YOLO_TIMEOUT_MS` | `4000` | per-request timeout; Z.ai needs more, about 8000 |
| `SAFE_YOLO_DEBUG` | - | `1` or a file path: log every decision |
| `SAFE_YOLO_LANG` | `ru` | language of the confirmation text: `ru` or `en` |

## Run a classifier locally

The plugin speaks two API shapes: `openai` (chat completions with structured outputs) and
`systemone` (the Jev / System One decision API). Pick whatever runs on your hardware:

**Cat Shell Risk Commander - the default pick, runs on CPU.** A purpose-built shell command
risk scorer (TF-IDF + linear model, 36K of weights, Apache-2.0): about 1 ms per command,
published metrics of 92.6% recall at 0.86% FPR. A ready Jev-compatible wrapper ships in
`examples/catshell/`:

```sh
cd examples/catshell && docker compose up --build -d
```

```jsonc title="opencode.json"
{
  "options": {
    "api": "systemone",
    "url": "http://127.0.0.1:8011/v1/systemone"
  }
}
```

**Laya - if your commands are heavily non-English.** Multilingual decision model (100+
languages), calibrated confidence, 200-450 ms per command on CPU. It also ships a Docker
quickstart with `laya-serve` in the image:

```sh
pip install "laya[serve]"
LAYA_PORT=8010 laya-serve
```

```jsonc title="opencode.json"
{
  "options": {
    "api": "systemone",
    "url": "http://127.0.0.1:8010/v1/systemone",
    "model": "multilingual"
  }
}
```

**Clef / Clef-flash - for GPU boxes.** Cloudflare's open decision models (Apache 2.0),
Jev-compatible, median 39 ms for clef-flash. Serve with SGLang per the model card and use
`api: "systemone"`, or run them through Workers AI or Ollama cloud with an `apiKey`.

**Any small LLM on vLLM - the generic path.** Heavier: gigabytes of weights and hundreds of ms
per command. But it answers with a verbal reason, which is what the cascade stage quotes back
to you. Configure it with `api: "openai"`.

## Cascade

Decision models are fast but sometimes unsure, and they answer in probabilities, not words.
Point `escalateUrl` at a stronger LLM and unsure commands get a second opinion:

- a `safe` primary verdict with confidence at or above `threshold` (default 0.8) is trusted
- anything else goes to the escalation endpoint: every `unsafe`, low confidence, a primary that
  is down. Its verdict and its verbal reason are what you see
- escalation failed -> the primary verdict stands
- both stages down -> configured permission rules decide, as before

Full example: catshell on a homelab box, an LLM on another host as the second opinion:

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.14",
      "options": {
        "mode": "shadow",
        "api": "systemone",
        "url": "http://127.0.0.1:8010/v1/systemone",
        "model": "multilingual",
        "threshold": 0.8,
        "escalateUrl": "http://llm.lan:8000/v1/chat/completions",
        "escalateModel": "qwen3.6-35b"
      }
    }
  ]
}
```

## Cloud escalation and secrets

`escalateApi: "zai"` talks to Z.ai GLM (for example
`https://api.z.ai/api/coding/paas/v4/chat/completions` with `glm-5.3-flash`). It is chat
completions in JSON mode: no vLLM-only fields, the schema goes into the system prompt and the
parser checks the answer.

Before a command, the agent's description or your request leaves for the escalation or explain
call, secrets in it are replaced with `<секрет:label>` (`<secret:label>` in English), the syntax
around stays. The local primary still sees raw text. Built-in detectors, always on: known token
formats (npm, GitHub, GitLab, `sk-`, Slack, AWS, JWT, private key blocks), values after
`Authorization:`, `Bearer`, `PRIVATE-TOKEN:`, `X-Api-Key:`, `password=`, `*_TOKEN=`/`*_KEY=`/
`*_SECRET=`/`*_PASSWORD=`, `--token`, `--api-key`, `--password`, `:_authToken=`, passwords in URLs,
and any random-looking run of 32+ letters and digits (git SHAs too). `$VAR`, `${VAR}` and
`$(secrets get name)` stay as they are. Redaction covers only what goes to the escalation and
explain endpoints: the local debug log (`SAFE_YOLO_DEBUG`) keeps the full command, so keep it local.

Your own patterns go into `~/.config/agent-guard/secrets.txt` (hook: `SAFE_YOLO_SECRETS_FILE`,
plugin: `secretsFile`), one per line. A `/regex/flags` line redacts the whole match, any other line
is a token prefix and redacts the prefix plus the token after it. It holds patterns, not values:

```text title="~/.config/agent-guard/secrets.txt"
# corp tokens
corp_
/fake-[0-9]{8}/i
```

Check a pattern:

```sh
bun -e 'import { parseSecretPatterns, redact } from "@safe-yolo/agent-guard/core"; import { readFileSync } from "node:fs"; console.log(redact(process.argv[1], parseSecretPatterns(readFileSync(`${process.env.HOME}/.config/agent-guard/secrets.txt`, "utf8")).patterns))' 'curl -H "X-Corp: corp_abc123" x'
```

`escalateSkipDirs` (hook: `SAFE_YOLO_ESCALATE_SKIP_DIRS`, colon-separated, `~` works) lists dirs
that never reach the escalation endpoint: no second opinion and no explain call there, the card
comes from the template. Put your corp repos there.

API keys go to curl through a config on stdin, so `ps` does not show them.

## Hard rules

These run before any model and no model can override them:

- `git push`
- downloaded code piped into a shell (`curl | sh`)
- `rm -rf` (also `\rm`, `/bin/rm`, `sudo rm`) outside the project and temp dirs. Paths are compared
  after resolving symlinks. The project is the git root of the working dir. No
  repo means no project, and a root that is `/`, your home or a parent of it never counts. Temp
  dirs include every Claude Code session's `/private/tmp/claude-<uid>/`

The OpenCode plugin denies them in any mode, because auto approval passes everything but an
explicit deny, so run such a command yourself. The Claude Code hook asks.

A relative `rm -rf` after `cd` or inside `ssh` counts as outside. So does a variable, unless the
command itself sets it to a plain literal before `rm` (`S=/x; rm -rf "$S"`) or to `$(mktemp -d)`.
`S=/x rm -rf "$S"` asks: the shell expands `$S` before that assignment. Values are never read from
the real environment.

## Confirmations

When the guard stops a command, you get a short card, at most 8 lines at 64 columns:

```text
💥 safe-yolo: удаление вне проекта
Репо: fake/app (git.example)
Где: rm -rf ~/projects/old-builds
Факт: 1240 файлов, 380 МБ
Чем грозит: удалит ~/projects/old-builds без корзины.
Твоя просьба: "почисти старые сборки" - совпадает
Разреши, только если ~/projects/old-builds не нужен.
Агент пишет: "Free disk space by removing old builds"
```

- title, risk and the fallback condition come from a fixed template per risk kind: delete, push or
  publish, secrets, download, foreign code, system or remote host, unclear. Hard rules pick the
  template themselves. Russian by default, `language: "en"` (or `SAFE_YOLO_LANG=en` for the hook)
  switches to English
- "Repo" names the repo a git command works on (`git -C`, `--git-dir`, `--work-tree`, a leading
  `cd`, else the working dir): owner/repo and a short host, never a password
- "Fact" is checked by code, read-only and capped: does the path exist, how many files, a dirty git
  tree, the push branch and new commits, hosts and a token in a request
- "Where" appears only for a hard rule and only when the matched part is short, like
  `git push origin main`. The card never quotes the rest of the command
- the escalation LLM only picks the template and the condition, in a separate call after the
  verdict, so it cannot change the verdict. A condition that argues for allowing is dropped.
  Without an openai-shaped endpoint you get the template alone
- intent check (Claude Code only): the hook reads your last message from the transcript and asks
  the LLM if the command fits it. It runs for stopped commands and for safe ones the primary was
  unsure about. It works one way: "no visible link" turns an allow into a question, a match never
  allows anything
- "Agent says" is the agent's own description, as is. Treat it as a claim, not a fact
- every line is one line with a length cap and no control chars, so a command cannot draw fake
  lines into the card, and the card never takes more than 8 rows

## Options

| Option | Default | What it does |
|---|---|---|
| `mode` | `shadow` | `shadow` logs only, `enforce` changes decisions |
| `api` | `openai` | `openai` or `systemone` |
| `url` | `http://127.0.0.1:8000/v1/chat/completions` | chat completions or systemone endpoint |
| `model` | `qwen3.6-35b` | classifier model id |
| `apiKey` | - | Bearer key when the endpoint needs one |
| `timeoutMs` | `6000` | per-classification curl timeout |
| `threshold` | `0.8` | primary confidence below this escalates |
| `policyFile` | `~/.config/opencode/safe-yolo-policy.md` | markdown file with your policy rules |
| `policyHint` | - | the same as a one-liner in the config |
| `disableDefaultPolicyHint` | `false` | drop the built-in rules: only your policyFile/policyHint goes to the classifier |
| `escalateUrl` | - | second-opinion endpoint |
| `escalateApi` | `openai` | API shape of the escalation endpoint: `openai`, `zai` or `systemone` |
| `escalateModel` | - | model id for the escalation endpoint |
| `escalateApiKey` | - | Bearer key for escalation |
| `escalateSkipDirs` | - | dirs where nothing goes to the escalation endpoint |
| `secretsFile` | `~/.config/agent-guard/secrets.txt` | your secret patterns |
| `language` | `ru` | language of the confirmation text: `ru` or `en` |

## Your policy

The classifier knows general security rules but not your setup. Teach it the specifics of your
environment - your hosts, your routines, your language - in a plain markdown file. Create
`~/.config/opencode/safe-yolo-policy.md` (or point `policyFile` elsewhere); the whole file is
appended to the classifier prompt on every call. A starter template lives in
`examples/policy.md`.

```md title="~/.config/opencode/safe-yolo-policy.md"
hosts nas-1 and home-server are the user's own machines administered over ssh:
managing their docker services and reading their logs is safe.
deploying to prod-1 requires an explicit ask.
```

Write it like an explanation to a new teammate: concrete hosts and workflows, what counts as
routine, what requires a human. Keep it short - every line costs attention on every
classification. The file stays on your machine; the plugin ships with a generic policy. After
editing, touch `opencode.json` or run `/reload` so the plugin re-reads it.

Prefer one line instead of a file? Put it in `policyHint` - both work, both are appended.
Want only your rules? `disableDefaultPolicyHint: true` drops the built-in policy, and your
file is all the classifier sees - keep the safe/unsafe semantics in it.

The Claude Code hook reads `~/.config/agent-guard/policy.md`, or the file in `SAFE_YOLO_POLICY_FILE`.

## Logs

Verdicts land in `~/.local/share/opencode/safe-yolo.log`:

```
2026-11-04T12:30:29.863Z mode=shadow effect=ask verdict=safe -> ask cmd=make build && go test ./... reason=Builds the project and runs tests
```

To audit the classifier: `grep 'verdict=unsafe' ~/.local/share/opencode/safe-yolo.log` and check
whether any safe commands were flagged.

Set `SAFE_YOLO_DEBUG=1` (or a file path) to log every decision with both stages, timings and
failures to `~/.local/share/opencode/safe-yolo-debug.jsonl`. Past 5 MB it moves to `.jsonl.1`, so
disk use stays around 10 MB. It holds full command text, so keep
it local.

The debug log shows both stages:

```
via=primary verdict=unsafe conf=61% -> via=escalate verdict=unsafe reason=curl pipes a remote script into sh
```

## What it is not

- Not a sandbox: the classifier is advisory, a determined agent can still do harm between
  verdicts. Keep real `deny` rules for catastrophic patterns.
- Not a prompt-injection defense: it judges the command text, not the intent behind it.

## License

[PolyForm Noncommercial 1.0.0](LICENSE).
