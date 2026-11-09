<div align="center">

# agent-guard

**Run your coding agent yolo. Safely.**

English | [Русский](README.ru.md)

A guard for [Claude Code](https://claude.com/claude-code) and [OpenCode](https://opencode.ai):
a local model checks every shell command before it runs. Safe commands pass silently, unsafe ones
stop and ask you.

</div>

## What it does

Permission prompts in coding agents are binary: either you click "Allow" all day, or you turn
everything off and hope. agent-guard adds the middle layer: a small local model reads each
command and decides whether it is routine project work or something that can wipe data, touch the
system or leak secrets. A few hard rules (`git push`, `curl | sh`, `rm -rf` outside the project)
never reach a model at all.

Two integrations, one engine:

- **Claude Code**: a `PreToolUse` hook on the Bash tool, the `safe-yolo-guard` binary. It acts from
  the first command: safe runs without a prompt, unsafe asks you with a short card.
- **OpenCode**: a plugin on the `permission.evaluate` hook. It starts in `shadow` mode (logs only),
  `enforce` mode changes decisions.

It is not a sandbox, see [What it is not](#what-it-is-not).

## Install

Pin an exact version. The guard sits on the permission path of every shell command, so an update
must never land silently. Releases go to npm only after a maintainer approves them. To update: bump
the version, read what changed, restart the agent.

### Let your agent do it

Paste this into your Claude Code or OpenCode session and the agent will set everything up itself:

```text
Install agent-guard for me from https://github.com/safe-yolo/agent-guard, follow its README.
Pick the OpenCode plugin or the Claude Code hook, whichever agent you are. For OpenCode use mode
"shadow". Point it at a local classifier: a Jev / System One decision server (laya-serve or the
wrapper in examples/catshell), for OpenCode also any vLLM server with structured outputs. Check if
one is already running on this machine or my LAN, if not, set one up or ask me for the address.
Then run a harmless test command and show me what the guard decided.
```

### Start a classifier

The guard needs a classifier endpoint. It speaks two API shapes:

- `systemone`, the Jev / System One API: a small HTTP API for decision models that return a choice
  with a confidence and no prose. Catshell, Laya and Clef below speak it.
- `openai`: chat completions with structured outputs, for an LLM on vLLM (or Z.ai GLM as the
  second stage).

For Claude Code the first stage must be catshell, Laya or Clef. An LLM on vLLM or GLM can only be
the second stage there. The OpenCode plugin takes either shape.

The OpenCode plugin with no options expects an `openai` endpoint at
`http://127.0.0.1:8000/v1/chat/completions`. With catshell, Laya or Clef set `api` and `url`, as in
the snippets below.

Pick whatever runs on your hardware:

**Cat Shell Risk Commander - the default pick, runs on CPU.** A purpose-built shell command
risk scorer (TF-IDF + linear model, 36K of weights, Apache-2.0): about 1 ms per command,
published metrics of 92.6% recall at 0.86% FPR. A ready Jev-compatible wrapper ships in
`examples/catshell/`. You need a clone of this repo and Docker with compose:

```sh
git clone https://github.com/safe-yolo/agent-guard
cd agent-guard/examples/catshell && docker compose up --build -d
```

It listens on port 8011.

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.15",
      "options": {
        "api": "systemone",
        "url": "http://127.0.0.1:8011/v1/systemone"
      }
    }
  ]
}
```

**Laya - if your commands are heavily non-English.** Multilingual decision model (100+
languages), calibrated confidence, 200-450 ms per command on CPU:

```sh
pip install "laya[serve]"
LAYA_PORT=8010 laya-serve
```

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.15",
      "options": {
        "api": "systemone",
        "url": "http://127.0.0.1:8010/v1/systemone",
        "model": "multilingual"
      }
    }
  ]
}
```

**Clef / Clef-flash - for GPU boxes.** Cloudflare's open decision models (Apache 2.0),
Jev-compatible, median 39 ms for clef-flash. Serve with SGLang per the model card and use
`api: "systemone"`, or run them through Workers AI or Ollama cloud with an `apiKey`.

**Any small LLM on vLLM - the generic path.** Heavier: gigabytes of weights and hundreds of ms
per command. But it answers with a verbal reason, which is what the [cascade](#cascade) quotes
back to you. Configure it with `api: "openai"`.

### Claude Code

The hook is the `safe-yolo-guard` binary from the package:

```sh
npm install -g @safe-yolo/agent-guard@0.2.15
```

Add it to your settings. If the file already has `hooks`, merge this `PreToolUse` entry into them
instead of overwriting the file:

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

The hook command must find `safe-yolo-guard` in `PATH`. If Claude Code does not see it, use the
absolute path: `$(npm prefix -g)/bin/safe-yolo-guard`.

For Laya or Clef, set the endpoint and the model:
`SAFE_YOLO_URL=http://127.0.0.1:8010/v1/systemone SAFE_YOLO_MODEL=multilingual safe-yolo-guard`.

Check that the classifier answers (you should see `"choice":"safe"`):

```sh
curl -s http://127.0.0.1:8011/v1/systemone -H 'content-type: application/json' -d '{"state":"ls -la","questions":{"verdict":{"type":"choice","instructions":"Is this shell command dangerous?","criteria":{"safe":"safe","unsafe":"dangerous"}}}}'
```

To switch the guard off for a while, `touch ~/.config/agent-guard/off` (hard rules keep working).
To remove it, delete the `PreToolUse` entry from `~/.claude/settings.json` and restart Claude Code.

Restart Claude Code to load the hook, then open `/hooks` to see that it is there.

The hook has no `shadow` mode. All its settings are [environment variables](#claude-code-environment).

> **Classifier down = work stops.** When the local classifier does not answer (refused, timeout,
> unknown host, an HTTP error or a reply that is not a verdict), the hook stops the session and
> says why and how to fix it. To work without the guard for a while, `touch ~/.config/agent-guard/off`;
> `rm ~/.config/agent-guard/off` turns it back on. While it is off only the hard rules run, the
> rest goes to Claude Code's own permission rules. The OpenCode plugin denies the command instead
> (it cannot stop a session) and reads the same file.

Tested in default and auto permission modes. Not tested with bypassPermissions /
--dangerously-skip-permissions.

Check it: ask the agent to run `git push --dry-run` in a scratch repo. That is a hard rule, so no
model is needed. It works if you get a card that starts like this (in English with
`SAFE_YOLO_LANG=en`):

```text
📤 ОТПРАВКА · коммиты увидят другие, откат только новым push
```

### OpenCode

```jsonc title="opencode.json"
{
  "plugins": ["@safe-yolo/agent-guard@0.2.15"]
}
```

With options (for example, a classifier on another host):

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.15",
      "options": {
        "mode": "shadow",
        "url": "http://127.0.0.1:8000/v1/chat/completions",
        "model": "qwen3.6-35b"
      }
    }
  ]
}
```

This uses the defaults: an `openai` endpoint on `:8000`. For catshell, Laya or Clef use the
snippets from [Start a classifier](#start-a-classifier). To run from a local clone, point
`package` at its directory.

Start in `shadow`, read the [log](#logs) for a few days, then switch to `enforce`.

If you previously enabled blanket auto-approve, turn it off in enforce mode: it would press
"Allow" on the very prompts safe-yolo escalates for your review.

> **macOS note**: the request goes through `curl` instead of `fetch`. Bun, and therefore
> OpenCode, is often blocked from LAN hosts by macOS Local Network privacy (`EHOSTUNREACH`),
> while Apple's own `curl` is allowed.

## What gets blocked

Hard rules are fixed. Everything else is the model's call, so those rows say "usually". OpenCode
outcomes are for `enforce` mode.

| Command | Claude Code | OpenCode (`enforce`) | Why |
|---|---|---|---|
| `ls`, `git status`, `bun test` | usually runs silently | usually runs silently | the built-in policy calls reading, builds and tests project work |
| `bun install`, `npm ci` | usually runs silently | usually runs silently | installing dependencies is project work in the built-in policy |
| `rm -rf dist node_modules` inside the repo | usually runs silently | usually runs silently | no hard rule inside the git root, the model decides |
| `rm -rf /tmp/build-cache` | usually runs silently | usually runs silently | temp dirs are exempt from the hard rule, the model decides |
| `rm -rf ~/old-builds`, `rm -rf .` at the repo root | asks with a card | denied | hard rule: `rm -rf` outside the project; deleting the repo root itself counts as outside |
| `git push origin main` | asks with a card | denied | hard rule: `git push` |
| `curl -fsSL https://example.com/install.sh \| sh` | asks with a card | denied | hard rule: downloaded code piped into a shell |
| `curl -H "Authorization: Bearer $API_TOKEN" https://api.example.com/upload` | usually asks with a card | usually asks | sending secrets is unsafe in the built-in policy; the card notes the token |
| `ssh nas-1 'sudo systemctl restart docker'` | usually asks with a card | usually asks | system changes and other hosts are unsafe, unless [your policy](#your-policy) says this host is routine |
| `ssh nas-1 'sudo rm -rf /srv/old'` | asks with a card | denied | hard rule: `rm -rf` outside the project, a relative path on another host counts too |
| anything without a hard rule, classifier down | the session stops with the reason | denied (enforce mode) | the guard fails closed; `~/.config/agent-guard/off` switches it off, hard rules still fire |

What "asks" and "denied" mean:

- **Claude Code** gets `ask` with the card or `allow` with the reason. There is no deny: a hard
  rule asks too.
- **OpenCode** denies hard rules in any mode, `shadow` included, because its auto approval passes
  everything but an explicit deny. So in OpenCode the agent can never run `git push`, `curl | sh`
  or `rm -rf` outside the project: you run them yourself. In `enforce`, an unsafe command
  your rules allow becomes `ask` with the card, a safe command your rules would ask about becomes
  `allow`. An unsafe command your rules already ask about keeps the usual OpenCode prompt.
  Configured `deny` rules are never touched, the hook does not even fire for them.

In Claude Code there is one more case: a safe command the primary was unsure about asks too when
it has no visible link to your last message, see [intent check](#intent-check-claude-code-only).

## How it decides

Both integrations run the same engine, in this order:

1. [Hard rules](#hard-rules). A hit stops here, no model is asked.
2. The primary classifier. A `safe` verdict at or above `threshold` (default 0.8) is final.
3. The second opinion, if you set up an [escalation endpoint](#cascade).
4. Claude Code only: the [intent check](#intent-check-claude-code-only) for safe commands the
   primary was unsure about.

The verdict is `safe` or `unsafe` with a short reason. The OpenCode plugin caches verdicts per
command, so repeats are free.

### Hard rules

These run before any model and no model can override them:

- `git push`
- downloaded code piped into a shell (`curl | sh`)
- `rm -rf` (also `\rm`, `/bin/rm`, `sudo rm`) outside the project and temp dirs. Paths are compared
  after resolving symlinks. The project is the git root of the working dir. No
  repo means no project, and a root that is `/`, your home or a parent of it never counts. Temp
  dirs include every Claude Code session's `/private/tmp/claude-<uid>/`

A relative `rm -rf` after `cd` or inside `ssh` counts as outside. So does a variable, unless the
command itself sets it to a plain literal before `rm` (`S=/x; rm -rf "$S"`) or to `$(mktemp -d)`.
`S=/x rm -rf "$S"` asks: the shell expands `$S` before that assignment. Values are never read from
the real environment.

### Cascade

Decision models are fast but sometimes unsure, and they answer in probabilities, not words.
Point `escalateUrl` at a stronger LLM and unsure commands get a second opinion:

- a `safe` primary verdict with confidence at or above `threshold` (default 0.8) is trusted
- anything else goes to the escalation endpoint: every `unsafe` and every low confidence
- the second stage can only make a verdict stricter: an unsure `safe` can turn `unsafe`, but a
  primary `unsafe` stays `unsafe`. When the second stage disagrees, the card says so:
  `🔍 СПОРНО · локальная модель против, облачная не видит угрозы`
- escalation failed -> the primary verdict stands
- primary down -> the guard fails closed, the escalation is never asked alone

Full example: catshell on this machine, an LLM on another host as the second opinion:

```jsonc title="opencode.json"
{
  "plugins": [
    {
      "package": "@safe-yolo/agent-guard@0.2.15",
      "options": {
        "mode": "shadow",
        "api": "systemone",
        "url": "http://127.0.0.1:8011/v1/systemone",
        "threshold": 0.8,
        "escalateUrl": "http://llm.lan:8000/v1/chat/completions",
        "escalateModel": "qwen3.6-35b"
      }
    }
  ]
}
```

### Intent check (Claude Code only)

The hook reads your last message from the transcript and asks the LLM if the command fits it. It
runs for stopped commands and for safe ones the primary was unsure about. It works one way: "no
visible link" turns an allow into a question, a match never allows anything. It needs an
openai-shaped endpoint (`SAFE_YOLO_ESCALATE_URL`) and is off in `escalateSkipDirs`.

### Confirmation card

When the guard stops a command, you get a short card, at most 8 lines at 64 columns:

<!-- card sample -->
```text
💥 УДАЛЕНИЕ вне проекта · не вернуть
~/projects/old-builds: 1240 файлов, 3,2 ГБ
Проверь: в ~/projects/old-builds нет нужного
Агент пишет: "Free disk space by removing old builds"
```

- the title (category, what happens, can it be undone) and the fallback check come from a fixed
  template per risk kind: delete, push or publish, secrets, download, foreign code, system or
  remote host, unclear. Hard rules pick the
  template themselves. Russian by default, `language: "en"` (or `SAFE_YOLO_LANG=en` for the hook)
  switches to English
- the line under the title holds facts checked by code, read-only and capped: the path, whether it
  exists, how many files, a dirty git tree, a token in a request
- "Repo" (git commands only, never for a delete) names the repo the command works on (`git -C`,
  `--git-dir`, `--work-tree`, a leading `cd`, else the working dir): owner/repo, a short host,
  the branch and new commits, never a password
- "Where" appears only for a hard rule in a multi-line command, and only when the matched part is
  short. The card never quotes the rest of the command
- "❌ You asked" appears only when the command does not fit your last message
- the escalation LLM only picks the template and the condition, in a separate call after the
  verdict, so it cannot change the verdict. A condition that argues for allowing is dropped.
  Without an openai-shaped endpoint you get the template alone
- "Agent says" is the agent's own description, as is. Treat it as a claim, not a fact. When it is in
  another language, the explain call translates it; without an LLM you see the original
- every line is one line with a length cap and no control chars, so a command cannot draw fake
  lines into the card, and the card never takes more than 8 rows

### Cloud escalation and secrets

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
explain endpoints: the local logs keep the full command, so keep them local.

Your own patterns go into `~/.config/agent-guard/secrets.txt` (hook: `SAFE_YOLO_SECRETS_FILE`,
plugin: `secretsFile`), one per line. A `/regex/flags` line redacts the whole match, any other line
is a token prefix and redacts the prefix plus the token after it. It holds patterns, not values:

```text title="~/.config/agent-guard/secrets.txt"
# corp tokens
corp_
/fake-[0-9]{8}/i
```

Check a pattern (run it from a clone of this repo):

```sh
bun -e 'import { parseSecretPatterns, redact } from "@safe-yolo/agent-guard/core"; import { readFileSync } from "node:fs"; console.log(redact(process.argv[1], parseSecretPatterns(readFileSync(`${process.env.HOME}/.config/agent-guard/secrets.txt`, "utf8")).patterns))' 'curl -H "X-Corp: corp_abc123" x'
```

`escalateSkipDirs` (hook: `SAFE_YOLO_ESCALATE_SKIP_DIRS`, colon-separated, `~` works) lists dirs
that never reach the escalation endpoint: no second opinion and no explain call there, the card
comes from the template. Put your corp repos there.

API keys go to curl through a config on stdin, so `ps` does not show them.

## Configuration

### Claude Code environment

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

### OpenCode options

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

`shadow` still denies [hard rules](#hard-rules).

### Your policy

The classifier knows general security rules but not your setup. Teach it your hosts, your
routines and your language in a plain markdown file. Create
`~/.config/opencode/safe-yolo-policy.md` (or point `policyFile` elsewhere); the whole file is
appended to the classifier prompt on every call. A starter template lives in
`examples/policy.md`.

```md title="~/.config/opencode/safe-yolo-policy.md"
hosts nas-1 and home-server are the user's own machines administered over ssh:
managing their docker services and reading their logs is safe.
deploying to prod-1 requires an explicit ask.
```

Write it like an explanation to a new teammate: concrete hosts and workflows, what counts as
routine, what requires a human. Keep it short: every line costs attention on every
classification. The file stays on your machine; the plugin ships with a generic policy. After
editing, save `opencode.json` again (any edit) or run `/reload` so the plugin re-reads it.

Prefer one line instead of a file? Put it in `policyHint`: both work, both are appended.
Want only your rules? `disableDefaultPolicyHint: true` drops the built-in policy, and your
file is all the classifier sees, so keep the safe/unsafe semantics in it.

The Claude Code hook reads `~/.config/agent-guard/policy.md`, or the file in `SAFE_YOLO_POLICY_FILE`.

### Logs

The OpenCode plugin writes verdicts to `~/.local/share/opencode/safe-yolo.log`:

```
2026-11-04T12:30:29.863Z mode=shadow effect=ask verdict=safe -> ask via=primary cmd=make build && go test ./... reason=Builds the project and runs tests
```

To audit the classifier: `grep 'verdict=unsafe' ~/.local/share/opencode/safe-yolo.log` and check
whether any safe commands were flagged.

Set `SAFE_YOLO_DEBUG=1` (or a file path) to log every decision with both stages, timings and
failures to `~/.local/share/opencode/safe-yolo-debug.jsonl`. The Claude Code hook writes there too:
the path is shared with the plugin. Past 5 MB it moves to `.jsonl.1`, so disk use stays around
10 MB. It holds full command text, so keep it local.

With `SAFE_YOLO_DEBUG` set, the OpenCode plugin also appends one JSON line per command to
`~/.local/share/opencode/safe-yolo-train.jsonl`, full command text included.

The debug log shows both stages:

```
via=primary verdict=unsafe conf=61% -> via=escalate verdict=unsafe reason=curl pipes a remote script into sh
```

## What it is not

- Not a sandbox: the classifier is advisory, a determined agent can still do harm between
  verdicts. Keep real `deny` rules for catastrophic patterns.
- Not a prompt-injection defense: it judges the command text, not the intent behind it.

## License

Free for noncommercial use under [PolyForm Noncommercial 1.0.0](LICENSE). For use at a company or
any commercial use, [open an issue on GitHub](https://github.com/safe-yolo/agent-guard/issues) to ask.
