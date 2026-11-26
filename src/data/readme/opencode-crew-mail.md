# opencode-crew-mail

[![CI](https://github.com/retretor/opencode-crew-mail/actions/workflows/ci.yml/badge.svg)](https://github.com/retretor/opencode-crew-mail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** · [简体中文](docs/i18n/README.zh-CN.md) · [日本語](docs/i18n/README.ja.md) · [한국어](docs/i18n/README.ko.md) · [Español](docs/i18n/README.es.md) · [Português (Brasil)](docs/i18n/README.pt-BR.md) · [Deutsch](docs/i18n/README.de.md) · [Français](docs/i18n/README.fr.md) · [Русский](docs/i18n/README.ru.md)

Direct messages between the subagents of one [opencode](https://opencode.ai) session, so that the lead agent does not have to carry every piece of information from one subagent to the next.

![Two background subagents: the coder sends a message with crew_send, the researcher reads it at its next step, and the lead gets a note too](docs/media/demo.gif)

*A scripted run against the real plugin in an isolated `opencode serve`.*

```
            lead (primary agent)
           /        |         \
       coder ---- tester ---- researcher      <- crew_send: straight from one to the other
```

Two subagents that work at the same time often need one fact from each other: the name of an interface one of them just created, a file the other must not touch, a finding that changes the other's step. Without this plugin that fact goes into a report, the lead reads it, and the lead starts or continues the other subagent with it: slow, and it fills the lead's context. With it, the coder tells the tester directly.

## What it adds

Two tools, available to every agent of a session tree:

| Tool | What it does |
|---|---|
| `crew_list` | Lists the team: the lead, the subagents the lead started, with a short name (`coder`, `coder-2`, `tester`...), their task and whether they still run. |
| `crew_send` | `{ to, text }`: puts a message into the inbox of one member (`to` = short name, session id, `lead`), or of every running subagent of the team (`to` = `all`). |

The recipient gets the message as a synthetic message at its **next step**. A running agent is never interrupted, and nobody waits for an answer, so two agents cannot block each other. The message is wrapped so that the model knows who wrote it and that it comes from another agent, not from the user:

```xml
<crew-message id="m1" from="coder" from-agent="coder" from-session="ses_..." to="tester">
The interface Store is in src/store.ts; the tests may use FakeStore from test/fakes.ts.
</crew-message>
This is a message from another agent of your team, not from the user. ...
```

Rules:

- A subagent that has **finished** gets no messages: a message would start it again and send its report to the lead a second time. The sender is told to write to `lead` or to put it in its report.
- A message to a lead that is **idle** (for example waiting for background subagents) waits in its inbox and is read when the lead runs next, usually when the next report wakes it. Set `wakeLead` to start it at once.
- Messages go only inside one tree: lead, its direct subagents. Another session on the same machine cannot be reached.

## Install

With the plugin manager of opencode (from npm, or straight from GitHub):

```sh
opencode plugin add opencode-crew-mail
opencode plugin add git+https://github.com/retretor/opencode-crew-mail.git
```

Or by hand: copy `crew-mail.js` into the plugin folder of your opencode configuration and restart opencode.

```sh
cp crew-mail.js ~/.config/opencode/plugins/                   # Linux, macOS
```

```powershell
Copy-Item crew-mail.js "$HOME\.config\opencode\plugins\"     # Windows
```

Then tell the agents about it. Every subagent already sees the tool descriptions; a line in the lead's prompt helps it brief them, for example:

> Subagents that run at the same time can write to each other with `crew_send` (see `crew_list`). Tell them in the brief which others work at the same time and on what.

The tools are most useful with subagents that run at the same time: several `subagent` calls in one message, or background subagents (`background: true`).

If another plugin of yours refuses unknown tools (an allowlist), add `crew_list` and `crew_send` to it; for [opencode-win-guard](https://github.com/retretor/opencode-win-guard) that is its `extraTools` setting. To deny the tools to an agent, use the usual permissions in its agent file, e.g. `{ action: crew_send, resource: "*", effect: deny }`, or the `agents` setting below.

## Settings

Optional file `crew-mail.json` next to `opencode.json` (see [crew-mail.example.json](crew-mail.example.json)). Read when the plugin loads.

| Key | Default | Meaning |
|---|---|---|
| `maxChars` | 4000 | Longest message. Longer ones are refused with a hint to write a file and send its path. |
| `maxPerSession` | 40 | Messages one session may send in all. |
| `maxPerPair` | 6 | Messages between two sessions, both directions together, within `pairWindowMinutes`. Stops ping-pong. |
| `pairWindowMinutes` | 10 | Window of `maxPerPair`. |
| `wakeLead` | false | `true`: a message to an idle lead starts it. |
| `copyToLead` | false | `true`: the lead gets a one-line copy of every message between subagents (costs context of the lead). |
| `agents` | null | `null`: all agents may use the tools; or a list of agent names. |
| `logText` | true | `false`: the log keeps sender, recipient and length only. |

Every message and every refusal is logged as one JSON line in `<data dir>/opencode/log/crew-mail.log` (`~/.local/share/opencode/log/` by default). The plugin makes no network connections.

## Safety

- A message is model output. An agent that read something malicious (a web page, a file) can pass instructions on to another agent. The envelope tells the recipient that the message is not from the user and does not change its task, but that is a hint to a model, not a barrier. Keep your other guards (permissions, sandbox) for every agent, not only for the lead.
- The lead does not see the messages between subagents unless `copyToLead` is on; the log does. Agents are told to put what matters in their reports anyway.

## Compatibility

- opencode 2.2 or newer (the V2 plugin API: `ctx.tool.transform`, `ctx.session.get/list/synthetic`). Tested with opencode 2.2.3 on Windows 10, Node 24.
- No dependencies, no build step. Only the default export of `crew-mail.js` is a plugin.

## Tests

```sh
npm test                        # pure parts, no opencode needed
CREW_MAIL_E2E=1 npm run test:e2e   # also end-to-end
```

The end-to-end test starts a real `opencode serve` in temporary folders with a scripted fake model (no provider, no account, no network) and checks that a running subagent reads a sibling's message at its next step, that a finished one is not woken, and that the lead gets its message on its next run. Your own opencode configuration and sessions are not touched. On Windows PowerShell set the variable with `$env:CREW_MAIL_E2E = "1"`.

## Related projects

- [opencode-win-guard](https://github.com/retretor/opencode-win-guard): a write sandbox and emergency stop for unattended agents on Windows, by the same author; works together with this plugin.
- [opencode-agent-intercom](https://github.com/feanor5555/opencode-agent-intercom): a control channel from the lead to its running subagents (messages, status, abort) and questions from a subagent to its caller; subagents cannot write to each other.
- [opencode-subagent-extension](https://github.com/Teogai/opencode-subagent-extension): subagents in other folders that report back to their caller.
- [Agent teams for opencode](https://dev.to/uenyioha/porting-claude-codes-agent-teams-to-opencode-4hol): peer messaging between "teammates" as changes to opencode itself; subagents started with the task tool are excluded.

## Contributing

Bug reports, ideas and pull requests are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Security problems: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
