# Egbe plugins for Claude, Gemini CLI, OpenClaw and Hermes

This repository is the [Claude plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
for **Egbe**, an AI co-founder's business stack. Its one plugin, [`egbe`](plugins/egbe),
connects Claude to the business you run with Egbe: hosting and databases, email,
analytics, payments, advertising, research, search and an LLM.

## Install

In Claude Code 2.0.20 or later (run `claude update` first if `claude plugin
install` isn't found):

```sh
claude plugin marketplace add egbe-ai/egbe-plugins
claude plugin install egbe@egbe
```

Then ask Claude to set up Egbe, or run `/egbe:egbe-setup`. You need an Egbe
account; the first time Claude needs Egbe, it opens Egbe's sign-in page or
gives you its link.

In claude.ai, the Claude app or Cowork, add this repository under **Customize →
Plugins → Add → Add marketplace → Add from a repository**, select **Sync**, then
**Add** on Egbe. Automatic updates need the Claude GitHub App granted access and
**Sync automatically** turned on.

There, and in Claude Code cloud sessions, adding the plugin doesn't sign you in:
open **Customize → Plugins → Egbe → Connectors** and select **Connect**. The
first time, keep the settings in **Add custom connector**, select **Add**, then
**Connect** again to sign in. Start a new conversation afterwards.

In Gemini CLI, this repository is also an extension:

```sh
gemini extensions install https://github.com/egbe-ai/egbe-plugins
```

Then ask Gemini to set up Egbe. The first time, run `/mcp auth egbe` to sign in.

In OpenClaw 2026.11.5 or later, install the native Egbe plugin from
[ClawHub](https://clawhub.ai/plugins/@egbe/openclaw):

```sh
openclaw plugins install @egbe/openclaw
```

or send `/plugins install @egbe/openclaw` in a chat with OpenClaw. OpenClaw
shows what the plugin can do and asks you to confirm it. This repository is the
plugin's source too (`openclaw plugins install git:github.com/egbe-ai/egbe-plugins`
installs the same plugin from here). Then
sign in once: in OpenClaw's Control UI (`openclaw dashboard`), find the `egbe`
MCP server under Settings, select **Sign in**, sign in to Egbe and approve the
connection. When OpenClaw runs on a server without a browser, the plugin's
`egbe` skill gives the terminal steps. Then ask OpenClaw to set up Egbe.

**Session logging is on by default.** By installing the OpenClaw plugin you
agree that Egbe records this OpenClaw's sessions in agent workspaces set up for
Egbe: your messages, model calls with usage, tool calls with their results, and
replies, sent after each run to `https://observe.hz.egbe.dev/telemetry` with the
workspace's Egbe key. The authorized Egbe team can read them; images and
attachments are not sent and secrets are redacted on a best-effort basis.
OpenClaw lets the plugin read conversations only after
`openclaw config set plugins.entries.egbe.hooks.allowConversationAccess true`,
which the agent runs during setup and OpenClaw may ask you to approve. To stop,
ask the agent to turn session logging off, or set `EGBE_SESSION_LOGGING=off` in
the workspace's `.env.local`.

In [Hermes Agent](https://hermes-agent.nousresearch.com), install the native
Egbe plugin from the [`hermes`](hermes) folder, then connect Egbe:

```sh
hermes plugins install egbe-ai/egbe-plugins/hermes --enable
hermes egbe connect
```

Hermes scans the plugin before installing it and asks you to confirm, since it
isn't from Hermes's own catalog. `hermes egbe connect` adds Egbe's MCP server to
the active Hermes profile (`hermes mcp add egbe --url https://os.hz.egbe.dev/mcp
--auth oauth`) and opens Egbe's sign-in page: sign in to Egbe and approve the
connection. Then start Hermes in your project folder and ask it to set up Egbe.
The Hermes plugin updates itself from the releases published here
(`hermes-release.json`) after checking each release's files, and restores the
previous version if a check fails. `hermes egbe status` shows the last check and
`hermes config set plugins.entries.egbe.settings.auto_update false` turns
automatic updates off.

**Session logging is on by default** in the Hermes plugin too. By installing it
you agree that Egbe records Hermes's sessions in project folders set up for
Egbe: your messages, model calls with usage, tool calls with their results, and
replies, sent after each turn to `https://observe.hz.egbe.dev/telemetry` with
the project's Egbe key, after Hermes's secret scrubber redacts them. The
authorized Egbe team can read them; images and attachments are not sent. To
stop, ask the agent to turn session logging off, or set
`EGBE_SESSION_LOGGING=off` in the project's `.env.local`.

Other agents that load [Agent Plugins](https://agent-plugins.org) packages,
such as Codex, Cursor and GitHub Copilot, use
[`plugins/egbe-portable`](plugins/egbe-portable): the same skills and connector
without Claude's hook. Install that folder the way your agent installs a plugin
from a repository; in Codex, run
`codex plugin marketplace add egbe-ai/egbe-plugins` and install Egbe from that
marketplace. Then ask your agent to set up Egbe and sign in when it asks.

In OpenCode (1.18.29 or later, or 2.x), add the native Egbe plugin,
[`@egbe-ai/opencode`](plugins/egbe-opencode), to `opencode.json`:
`"plugins": ["@egbe-ai/opencode"]` in OpenCode 2 (or
`opencode plugin add @egbe-ai/opencode`), `"plugin": ["@egbe-ai/opencode"]` in 1.x.
It adds Egbe's skills and the `egbe` MCP server. Sign in once with
`opencode mcp auth egbe` in a terminal (or `/mcps` in OpenCode 2), restart
OpenCode and ask it to set up Egbe. Until the package is on npm, clone this
repository and list the folder's absolute path instead of the package name.
Session logging is on by default here too: in project folders set up for
Egbe, the plugin sends each run's turn (your messages, model calls with usage,
tool calls with their results, and replies) to
`https://observe.hz.egbe.dev/telemetry` with the project's Egbe key. To stop,
ask OpenCode to turn it off or set `EGBE_SESSION_LOGGING=off` in the project's
`.env.local`; the plugin's [README](plugins/egbe-opencode/README.md) has the
details. The plugin updates itself from npm to verified new versions (the
`autoUpdate` option turns that off); a plugin loaded from a clone of this
repository updates with `git pull`.

The OpenClaw plugin updates itself from the releases published here.
`openclaw egbe status` shows its version and last check, and
`openclaw config set plugins.entries.egbe.config.autoUpdate false` turns
automatic updates off. Install this native plugin rather than the Claude
plugin above into OpenClaw: OpenClaw can't sign in to the Claude plugin's
connector.

The plugin's [README](plugins/egbe/README.md) describes what it contains, what it
sends where, and its session logging, which is on by default in project folders
set up for Egbe and can be turned off.

## About this repository

The contents are built and published automatically from Egbe's source, so pull
requests here are not accepted and changes made here would be overwritten.
For help, ask Claude to open an Egbe support ticket or see
<https://os.hz.egbe.dev/plugins/egbe/support>. To report a security issue, see
[SECURITY.md](SECURITY.md).
