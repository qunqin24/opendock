# opencode-unattended

Automated permission approval for OpenCode, so your agent keeps working while you're away.

When a request matches an `ask` rule, OpenCode stops and waits for you to respond. You can allow everything to get rid of the wait, but then nothing is checked. This plugin sends each `ask` to a second model, the reviewer, instead. It approves what is safe for the task at hand.

In one real-world log of 3,905 requests, permission rules handled 3,382, the reviewer judged 523, and only one reached the user. With Claude Haiku and no prompt caching, reviews cost about $0.30 per thousand.
## Install

Add the plugin to your OpenCode config, for example `~/.config/opencode/opencode.jsonc`. OpenCode fetches it from npm on the next start. It requires OpenCode 2.x and Bun.

```jsonc
{
  "plugins": [
    {
      "package": "opencode-unattended",
      "options": {
        "judge": {
          "provider": "openrouter",
          "model": "anthropic/claude-haiku-5.5"
        }
      }
    }
  ]
}
```

The reviewer is a model reached through `judge.provider`, and `judge.provider` and `judge.model` are required. Without them the plugin fails to load. `openrouter` needs nothing else. For any other OpenAI-compatible chat completions endpoint, such as a local llama.cpp or Ollama server, use `"provider": "openai-compatible"` and add `judge.baseURL`. The key comes from the `OPENCODE_UNATTENDED_API_KEY` environment variable and can be left out for a local server that needs none.

The reviewer only sees requests that end in `ask`, so send `shell`, `webfetch` and `external_directory` to it by default and add `allow` and `deny` rules for what you already know. The last matching rule wins, so exceptions follow the broad rule:

```jsonc
"permissions": [
  { "action": "*", "resource": "*", "effect": "ask" },
  { "action": "shell", "resource": "*", "effect": "ask" },
  { "action": "shell", "resource": "git status *", "effect": "allow" },
  { "action": "shell", "resource": "rm -rf *", "effect": "deny" },
  { "action": "shell", "resource": "sudo *", "effect": "deny" },
  { "action": "webfetch", "resource": "*", "effect": "ask" },
  { "action": "read", "resource": "*", "effect": "allow" },
  { "action": "grep", "resource": "*", "effect": "allow" },
  { "action": "glob", "resource": "*", "effect": "allow" },
  { "action": "edit", "resource": "*", "effect": "allow" },
  { "action": "external_directory", "resource": "*", "effect": "ask" },
  { "action": "*", "resource": "*.env", "effect": "ask" }
]
```

The last rule asks again for `.env` files, because it comes after the allows for `read` and `edit`. Add anything else you want pre-approved. `suggest` (below) finds more allow rules as you go.

## How it works

OpenCode checks the permission rules you've configured first. A request one of them allows or denies never reaches the reviewer.

The reviewer sees the request, your latest messages and the agent's recent tool calls. Your messages are the only instructions it takes. It allows or denies. A denied request goes back to the agent with the reason, and the agent reworks its approach or stops. If the reviewer fails or can't be reached, or denies several requests in a row, you are asked instead.

## Your rules over time

Every decision, yours and the reviewer's, goes to a local audit log, with the reviewer's one-sentence reason. Install the CLI with `bun add -g opencode-unattended`, or run its commands with `bunx opencode-unattended`.

`stats` shows how many requests your rules handled, what the reviewer allowed, turned back or failed on, and how long it took. For instance:

```
$ opencode-unattended stats
                                                % of requests
ACTION                  REQUESTS          CONFIG         JUDGED    PROMPTED
shell                       1811           75.4%          24.6%        0.1%
external_directory          1324           99.1%           0.9%        0.0%
edit                         392           99.0%           1.0%        0.0%
read                         220          100.0%           0.0%        0.0%
webfetch                      65            6.2%          93.8%        0.0%
grep                          46          100.0%           0.0%        0.0%
subagent                      35          100.0%           0.0%        0.0%
glob                           9          100.0%           0.0%        0.0%
websearch                      3          100.0%           0.0%        0.0%
TOTAL                       3905    86.6% (3382)    13.4% (523)    0.0% (1)

                                                % of judged
MODEL                         JUDGED  ALLOWED  DENIED  PROMPTED  FAILED     P50     P95
openrouter.ai
  anthropic/claude-haiku-5.5     516    97.1%    2.7%      0.2%    0.0%    2.8s    5.3s
```

`suggest` lists the shell commands and webfetch origins the reviewer keeps allowing, as candidates for permanent allow rules:

```
$ opencode-unattended suggest
[shell]
PATTERN              % OF JUDGED  % OF SESSIONS  EXAMPLE
git log --oneline *        19.4%          30.0%  git log --oneline -5
go test *                  16.7%          35.0%  go test ./pkg
git diff --stat *           8.3%          20.0%  git diff --stat
go vet *                    6.9%          15.0%  go vet ./cmd
go doc *                    5.6%          15.0%  go doc net/http

[webfetch]
PATTERN                      % OF JUDGED  % OF SESSIONS  EXAMPLE
https://pkg.go.dev/*               35.5%          53.8%  https://pkg.go.dev/net/http
https://go.dev/*                   19.4%          30.8%  https://go.dev/doc/effective_go
https://docs.python.org/*           9.7%          15.4%  https://docs.python.org/3/library/os.html
https://github.com/golang/*         9.7%          15.4%  https://github.com/golang/go/issues/12345
```

Every rule you add means one less request for the reviewer. `suggest` can't tell whether a rule is safe, so read each one before you paste it in.

The bundled `suggest-allow-rules` skill does that review for you. Ask your agent, for example, "which shell commands from the last week could become allow rules?" It checks each candidate and replies with rules to paste into your config, which it never edits itself. The CLI doesn't need to be installed.

## Options

- `judge.modality`: `completion` (the default) for a model that writes its answer, or `decision` for one that scores yes/no questions, such as `typesafe/jev-1.14` on `openrouter`. A decision model returns a probability and no text, so the audit log records its score and a denied request goes back to the agent without a reason. It allows at 0.5 or above. `promptCache` doesn't apply to it.
- `judge.timeout`: how long one review may take. Default `"30s"`.
- `judge.promptCache`: set to `{ "ttl": "1h" }` to have the endpoint cache the system prompt. `ttl` is a duration, and the provider decides which ones it accepts. Off unless set.
- `judge.escalateAfter`: how many requests in a row the reviewer may deny before you are asked. An allow starts the count again. Default 5.
- `auditLog.enabled`: `false` turns off the audit log, along with the suggestion tool and skill that read it. Default `true`.
- `dataDir`: where the plugin keeps its files, including the audit log. Default `~/.local/state/opencode-unattended`.
