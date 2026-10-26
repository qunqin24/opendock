# opencode-apex

**A modular plugin for [OpenCode](https://opencode.ai) V2** that adds:
- secret redaction;
- event-driven automations (callbacks, webhooks, scheduled watchers that wake an agent up);
- AI-assisted permission decisions;
- per-agent meta-permissions;
- `browser.*` tools driven by your own Chromium.

> [!IMPORTANT]
> **OpenCode V2 only (OpenCode ≥ 2.1).** apex is written against the V2 plugin runtime
> (`Plugin.define` from `@opencode/plugin/effect`). It does **not** load in OpenCode V1, and
> versions of OpenCode V2 older than 2.1 are not supported. Check yours with
> `opencode --version`.

---

## Contents

- [What is this, in plain words](#what-is-this-in-plain-words)
- [Modules](#modules)
- [Requirements](#requirements)
- [Install](#install)
- [Update / reinstall](#update--reinstall)
- [Configuration](#configuration)
- [Automations: waking an agent from outside](#automations-waking-an-agent-from-outside)
- [Calling apex over RPC](#calling-apex-over-rpc)
- [Tools added to your agents](#tools-added-to-your-agents)
- [RPC reference](#rpc-reference)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

---

## What is this, in plain words

A few OpenCode terms used throughout these docs:

| Term | What it means |
| --- | --- |
| **OpenCode server** | OpenCode is a client/server app. The TUI, the desktop app and `opencode run` all talk to a local **server** process over HTTP. The desktop app starts it as a background *service*; `opencode serve` starts one by hand. |
| **Plugin** | A package the server loads to add features: new tools, agents, permission logic, skills… You list plugins in `opencode.json` and OpenCode installs them from npm. |
| **Session** | One conversation with an agent. |
| **Agent** | A configured assistant (`build`, `plan`, your own…) with its own model, prompt and permissions. |
| **Tool** | Something an agent can call: `read`, `shell`, `edit`, MCP tools, browser tools… |
| **Skill** | A Markdown guide an agent can load when a task needs it. apex ships one. |
| **RPC** | Here, an **authenticated HTTP POST to the OpenCode server** that runs a method a plugin registered: `POST <server>/api/rpc/apex/<method>`. It lets scripts and other programs talk to apex. |

apex is one plugin with five independent modules. Each one can be switched on or off.

## Modules

| Module | What it does | Default | Docs |
| --- | --- | --- | --- |
| **Redact** | Detects secrets (API keys, tokens, private keys…) in what the agent sees, encrypts them (AES-256-GCM) and replaces them with a readable marker. When the agent passes the marker back to a tool, the real value is restored. 41 bundles / 104 patterns. | on | [docs/REDACT.md](docs/REDACT.md) |
| **Events** | Lets programs outside OpenCode (scripts, cron jobs, webhooks, n8n…) notify an agent. **Subscriptions** decide which session receives what. `tools.run` lets those programs use OpenCode tools. | on | [docs/EVENTS.md](docs/EVENTS.md) |
| **Advisor** | When a tool call needs permission ("ask"), a small dedicated agent decides `allow` or `deny`, so you aren't asked about every step. | on | [docs/ADVISOR.md](docs/ADVISOR.md) |
| **Guard** | Meta-permissions per agent, tool and path, with a report of what was attempted and decided. | **off** | [docs/GUARD.md](docs/GUARD.md) |
| **Browser** | Serves OpenCode's `browser.*` tools against an **external** Chromium over CDP (local or remote). You can also switch to the desktop app's built-in browser. 45 actions. | on | [docs/BROWSER.md](docs/BROWSER.md) |

Turn modules on or off in `modules`. That is the only switch: there is no `<module>.enabled`.

```jsonc
"modules": { "redact": true, "events": true, "advisor": true, "guard": false, "browser": true }
```

## Requirements

- **OpenCode ≥ 2.1** (V2). Nothing else: OpenCode downloads the plugin and its dependencies
  itself.
- For the automation examples, a shell with `curl` and `sed`.
- Optional: Chromium/Chrome for the Browser module, and `bun` if you want to hack on apex.

## Install

Add apex to the `plugins` list of your OpenCode config:
- global: `~/.config/opencode/opencode.json`, applies to every project;
- project: `opencode.json` at the project root.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-apex",
      "options": {
        "modules": { "redact": true, "events": true, "advisor": true, "guard": false, "browser": true }
      }
    }
  ]
}
```

Restart OpenCode (close and reopen the desktop app, or `opencode service restart`). The first
time a project uses apex, OpenCode installs it from npm. That takes a few seconds; the first
request may fail while the install finishes, so retry it.

**Check that it loaded:** ask an agent to call `apex_callback_endpoint`, or see
[Calling apex over RPC](#calling-apex-over-rpc) → `apex/status`.

## Update / reinstall

OpenCode caches installed plugins and **does not refresh them on its own**. In OpenCode 2.1,
`opencode plugin update` only handles TUI plugins, so for apex:

1. Stop OpenCode (close the app, or `opencode service stop`).
2. Delete apex's cache entry: `rm -rf ~/.cache/opencode/npm/opencode-apex@*`
3. Start OpenCode again. It reinstalls the latest apex with matching dependencies.

Do this **after upgrading OpenCode** too. apex warns in the server log if its dependencies no
longer match the running OpenCode.

## Configuration

apex reads its settings from three places, merged in this order (later wins):

| # | Source | Scope |
| - | --- | --- |
| 1 | `~/.config/opencode/opencode-apex.jsonc` | global file |
| 2 | `options` of the plugin entry in `opencode.json` (OpenCode merges global + project) | inline |
| 3 | `<project>/.opencode/opencode-apex.jsonc` | project file |

- Comments are allowed: `//`, `/* */` and `#`.
- Environment variables can be referenced inside values. See [docs/CONFIG.md](docs/CONFIG.md)
  for the exact syntax, every key and its default.
- [`opencode-apex.jsonc`](opencode-apex.jsonc) is a fully commented template.

## Automations: waking an agent from outside

Typical request to an agent:

> *"Check every 5 minutes whether server X is up; if it goes down, diagnose it."*

With apex the agent sets this up itself:

```
cron / systemd timer ──▶ watcher script ──(needs an OpenCode tool? apex/tools.run)──▶ OpenCode
                              │
                              └─ condition met? ──(apex/events.ingest)──▶ subscription ──▶ agent wakes up
```

1. **Subscribe.** The agent calls `apex_subscribe`: "when an event of type `server.down`
   arrives, send this session a prompt: *diagnose it*".
2. **Watch.** The agent writes a small script and schedules it with a systemd timer or cron.
   The script checks the server. If the check needs something that only exists inside
   OpenCode (an MCP tool, the browser…), it calls `apex/tools.run`. No model is involved and
   no tokens are spent.
3. **Notify.** When the state changes, the script calls `apex/events.ingest`. The
   subscription delivers the prompt and the agent starts working.

Why the clock lives **outside** OpenCode: OpenCode unloads a project's plugins after **60
minutes without session activity**, and after a restart it doesn't load them until something
uses that project. A timer or HTTP listener inside a plugin would silently stop. An RPC call,
on the other hand, loads the project on demand. The first call after an idle period takes a
few seconds.

**Webhooks** work the same way, with one extra piece. A service such as GitHub or Stripe calls a
small **relay** (n8n, or the Node relay in the bundled skill). The relay turns that HTTP
call into `apex/events.ingest`. OpenCode itself doesn't expose a webhook URL.

The same idea covers any always-on event source: a relay keeps an outbound connection to a
chat app, a mailbox (IMAP IDLE), an SSE or WebSocket stream or a queue, and forwards what
matters.

apex registers a skill, **`apex-callbacks`**, that teaches agents the whole recipe:
- discovering the server URL;
- subscribing;
- designing a relay or watcher in any language and running it on any OS (systemd, launchd,
  Task Scheduler, Docker, pm2);
- calling OpenCode and MCP tools from relay code with `tools.run`, and its limits;
- reachability: why a relay behind NAT can't receive Internet webhooks, and the workarounds
  (outbound modes, Cloudflare/Tailscale/ngrok tunnels, reverse SSH, store-and-forward);
- copyable examples in sh, Python, Node and PowerShell, plus an n8n recipe.

Full reference: [docs/EVENTS.md](docs/EVENTS.md).

## Calling apex over RPC

Every apex RPC method is an HTTP POST to the OpenCode server:

```
POST <server-url>/api/rpc/apex/<method>?location[directory]=<project-path>
Authorization: Basic base64("opencode:<server-password>")
Content-Type: application/json

{"input": { ...method input... }}          →   {"output": { ...result... }}
```

- **`<server-url>`**: where your OpenCode server listens. For the background service it's the
  `url` field of `~/.local/state/opencode/service.json` (or `$XDG_STATE_HOME/opencode/`). For
  `opencode serve --port N` it's `http://127.0.0.1:N`.
- **`<server-password>`**: the user is always `opencode`; the password is:
  - for the service, the `password` field of that same file (mode 0600);
  - for `opencode serve`, `OPENCODE_SERVER_PASSWORD`, or the password printed at startup.
- **`location[directory]`**: the project whose apex should handle the call: its subscriptions,
  its MCP tools, its permissions. URL-encode it if the path contains spaces. In curl, write
  the brackets as `%5B` `%5D`.

You don't have to work this out by hand. The tool **`apex_callback_endpoint`**, or the RPC
`apex/server.info`, returns:
- the server URL;
- the ready-made method URLs for the current project;
- *where* the password is (never the password itself);
- copy-paste curl examples.

A first call from a terminal, against the background service:

```sh
STATE=~/.local/state/opencode/service.json
URL=$(sed -n 's/.*"url" *: *"\([^"]*\)".*/\1/p' "$STATE")
PW=$(sed -n 's/.*"password" *: *"\([^"]*\)".*/\1/p' "$STATE")

curl -sS -u "opencode:$PW" -H 'content-type: application/json' \
  -X POST "$URL/api/rpc/apex/status?location%5Bdirectory%5D=$PWD" -d '{"input":{}}'
# → {"output":{"modules":{...},"version":"0.2.x","uptimeMs":...,"endpoint":{...}}}
```

Run a tool from a script, here `read` in the current project:

```sh
curl -sS -u "opencode:$PW" -H 'content-type: application/json' \
  -X POST "$URL/api/rpc/apex/tools.run?location%5Bdirectory%5D=$PWD" \
  -d '{"input":{"tool":"read","input":{"path":"README.md"}}}'
# → {"output":{"ok":true,"tool":"read","agent":"build","content":"...","durationMs":14}}
```

## Tools added to your agents

| Tool | Module | What it does |
| --- | --- | --- |
| `apex_subscribe` | events | Creates an event subscription for the calling session (filters, prompt template, agent to switch to, delivery mode) |
| `apex_unsubscribe` | events | Removes a subscription by id. Subscriptions from config are read-only |
| `apex_list_subscriptions` | events | Lists subscriptions; config ones are marked read-only |
| `apex_callback_endpoint` | events | How an external program reaches this server: URL, RPC URLs for this project, auth, curl examples |
| `apex_set_callback_url` | events | Sets or clears the server's public URL (tunnel / reverse proxy), for senders on other machines |
| `apex_advisor_decide` | advisor | The advisor agent's only tool: `allow` / `deny` + reason |
| `apex_guard_report` | guard | Report of what each agent attempted and what was decided |
| `browser_target` | browser | Chooses which browser serves `browser.*`: `external` (CDP), `in-app` (desktop app) or `auto` |

apex also registers two hidden agents: `apex-advisor` for the Advisor and `apex-runner`, the
technical session behind `tools.run`.

## RPC reference

Namespace `apex`. Inputs and outputs go inside the `input` / `output` envelopes shown above.

| Method | Input | Output |
| --- | --- | --- |
| `ping` | `{ payload? }` | `{ pong, timestamp }` |
| `status` | `{}` | `{ modules, version, uptimeMs, endpoint }` |
| `server.info` | `{}` | same as the `apex_callback_endpoint` tool |
| `events.ingest` | `{ source, type?, payload, eventID? }` | `{ accepted, eventID, delivered[] }` |
| `tools.run` | `{ tool, input?, agent?, timeoutMs? }` | `{ ok, tool, agent, output?, content?, metadata?, error?, durationMs }` |
| `redact.process` | `{ text, mode? }` | `{ redacted, findings }` |

- `events.ingest`:
  - `delivered` lists the subscriptions that received the event. An empty list means none
    matched.
  - Re-sending the same `eventID` within 5 minutes is ignored, so retries are safe.
- `tools.run` runs **one** tool, with the permissions of the agent `events.tools.agent`
  (default `build`) or the `agent` you pass.
  - `events.tools.allow` / `deny` limit which tools can be run this way.
  - `question`, `subagent`, `execute` and the `apex_*` tools are denied by default.
  - Nobody is around to answer an "ask" permission: it waits for the Advisor, or until
    `timeoutMs` (default 120 s).

## Security notes

- **The server password is a full credential.** Anyone who has it can drive your agents
  through the OpenCode API. With `events.ingest` they can inject prompts; with `tools.run`
  they can run tools. Keep the file at mode 0600, and don't paste the password into scripts,
  unit files or chats: read it at run time, as the examples do.
- To receive webhooks from the Internet, expose the **relay**, protected by its own token.
  Never expose the OpenCode server itself.
- Redact encrypts with the key in `redact.key` (`env:VAR`, `file:/path`, `hex:…`, `base64:…`).
  Without one, it generates a key and keeps it in `~/.config/opencode/apex.key` (mode 0600).
  Back that key up: if you lose it, the markers already in your session history can't be
  restored.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). The most common cases:

| Symptom | Fix |
| --- | --- |
| `RPC is unavailable: apex` | apex isn't loaded in that project. Check `location[directory]` and the plugin entry, then retry (the first load installs it). |
| Plugin fails to load after an OpenCode upgrade | Reinstall it, see [Update / reinstall](#update--reinstall). |
| The automation stopped after an hour | Expected if it lived inside OpenCode. Move the clock outside (cron / systemd). |

## Development

```bash
git clone https://github.com/aorizondo/opencode-apex.git
cd opencode-apex && bun install
```

To run the local checkout instead of the npm package, point OpenCode at the directory:
`"plugins": [{ "package": "/path/to/opencode-apex" }]`.

```bash
bun test/events.test.ts                    # events, RPC, server discovery, tools.run, skills
bun test test/guard.test.ts                # guard
TEST_CDP_URL=9333 bun test test/browser.test.ts   # browser (needs Chromium with --remote-debugging-port=9333)
npm run typecheck                          # tsc --noEmit
npm run check:install                      # installs the package like OpenCode does; fails on duplicate `effect`
```

`npm publish` runs tests, typecheck and the install check first (`prepublishOnly`).

**Dependency rule.** OpenCode (≥ 2.1) serves `effect` and `@opencode/plugin` to plugins from
its own copy, so apex never pins `effect`: it is only an optional peer. The other `@opencode/*`
packages, such as `@opencode/schema`, do come from apex's own install and must match the host.
That's why `@opencode/plugin` is a `^2.1.1` dependency, and why apex is reinstalled after
upgrading OpenCode. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) before changing
dependencies.

```
opencode-apex/
├── index.ts              # entry point: Plugin.define, config loading, module registration
├── redact.ts · events.ts · advisor.ts · guard.ts · browser.ts   # the five modules
├── browser/              # CDP client, endpoint discovery, the 45 browser actions
├── core/
│   ├── config.ts         # config hierarchy, merge, comments, Zod schema
│   ├── rpc.ts            # the "apex" RPC namespace
│   ├── server-endpoint.ts# server URL + auth discovery for external programs
│   ├── tools-run.ts      # tools.run: allow/deny, permission agent, runner session
│   ├── skills.ts         # registers the skills shipped in skills/
│   ├── compat.ts         # load-time warnings when versions drift from OpenCode
│   └── …                 # redact engine, patterns, crypto, conditions, guard, advisor
├── skills/apex-callbacks/          # agent guide: SKILL.md + references/ (relays, reachability, run-anywhere, examples)
├── scripts/check-install.mjs        # pre-publish install check
├── test/                 # events, guard, browser suites
└── docs/                 # CONFIG · REDACT · EVENTS · ADVISOR · GUARD · BROWSER · TROUBLESHOOTING
```

Changes: [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
