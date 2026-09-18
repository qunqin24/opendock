# opencode-discord-notifier

> **This branch/version (2.x) targets OpenCode v2 (`opencode2`) only.**
> For OpenCode v1, use version `0.1.x` (npm dist-tag `legacy`) or the
> [`oc-v1`](../../tree/oc-v1) branch — the v1 and v2 plugin APIs are
> different enough that they don't share one codebase.

An OpenCode plugin that sends a Discord message when a running `opencode`
CLI session needs you — a permission request, a pending form, or the
session finishing a turn — and lets you answer a pending permission
request directly from Discord with **Once / Always / Reject** buttons,
without touching the keyboard.

Both notify-only and the interactive buttons are built and live-tested.

## What it notifies on

- **Permission requests** (`permission.asked`) — e.g. a bash command
  needing approval. Carries **Once / Always / Reject** buttons — click
  one to answer it from Discord.
- **Turn finished** (`session.execution.succeeded`) — the agent finished
  responding and is waiting for you. (v2 doesn't appear to emit v1's
  `session.idle` at all — confirmed live: 45+ seconds of genuine
  post-response idle, no `session.idle` ever arrived — so this fires at
  the same moment that notification was meant to catch.)
- **Pending forms** (`form.created` — v2's formalized version of v1's ad
  hoc "question" tool) — notify only, permanently. There is no API to
  answer these from outside the OpenCode process (confirmed by live
  testing, not assumed), so this one always has to be answered from the
  keyboard.

## Prerequisites

A Discord bot application and token. Setting one up is a standard Discord
Developer Portal flow — not covered here, plenty of existing guides for
it. This plugin only needs the `Guilds` intent; it doesn't read message
content, so the privileged Message Content intent is not required.

The bot needs to share at least one server with you — either invited to
a real server channel you want notifications posted in, or (for DM mode,
below) just a mutual server so it's allowed to DM you at all. Discord
blocks bots from cold-DMing someone with no server in common, so this is
required either way, even if you never post in that server's channels.

## Setup

1. Add the plugin to `opencode.json`:
   ```json
   { "plugin": ["opencode-discord-notifier"] }
   ```
   (Or an absolute local path instead of the package name, if you're
   developing against a local clone rather than the published package.)
2. Start `opencode` once so it fetches/loads the plugin.
3. Create the config file at:
   ```
   ~/.config/opencode/opencode-discord-notifier.json
   ```
   using `config.example.json` as the template:
   ```json
   {
     "discordBotToken": "your-bot-token",
     "discordChannelId": "123456789012345678",
     "allowedUserId": "123456789012345678"
   }
   ```
   **All fields present must be strings**, even though two of them look
   like numbers — Discord IDs are too large for JSON numbers to hold
   without losing precision.

   This lives directly in OpenCode's own config directory
   (`~/.config/opencode/`), named after this plugin so it's easy to tell
   apart from OpenCode's own config file and any other plugin's config
   sitting in the same directory. It's deliberately **not** inside
   wherever `opencode` installs/caches the plugin package itself (that
   location varies and isn't guaranteed to survive an update) — this is a
   fixed path independent of how the plugin got installed.

   **Want a DM instead of a server channel?** Just leave out
   `discordChannelId` entirely:
   ```json
   {
     "discordBotToken": "your-bot-token",
     "allowedUserId": "123456789012345678"
   }
   ```
   With no `discordChannelId` configured, every message goes as a direct
   message to `allowedUserId` instead — no separate DM-channel ID to look
   up, the bot creates the DM automatically the first time it sends. The
   bot still needs to share a server with you for that first DM to go
   through (see Prerequisites above) — it just doesn't need permission to
   post in any of that server's channels.

   Alternatives:
   - Set `DISCORD_BOT_TOKEN` and `DISCORD_ALLOWED_USER_ID` (plus
     `DISCORD_CHANNEL_ID` if you're not using DM mode) as environment
     variables instead of using a config file (checked first, before the
     file).
   - Point at a config file somewhere else with the
     `OPENCODE_DISCORD_NOTIFIER_CONFIG` environment variable.
4. Restart any running `opencode` process — plugins (and config) are only
   read at startup, so an edit while `opencode` is already running won't
   take effect until you restart it.
5. Confirm it worked by triggering a real permission prompt (e.g. asking
   the agent to run a shell command in a project where that needs
   approval) and checking that the Discord message arrives with buttons.

## Troubleshooting

If no Discord messages ever show up, check OpenCode's own log file
(`~/.local/share/opencode/log/opencode.log`) and grep it for
`opencode-discord-notifier` — a missing or malformed config, a bad bot
token, or a channel the bot can't see will show up there as a clear error
line, tagged with this plugin's name. A misconfigured install doesn't
crash or block the rest of OpenCode — it just logs the problem and
disables itself.

**This log check is only reliable for `opencode run`, not the interactive
TUI** — confirmed live: this plugin's own console output never reached
either the terminal or the log file when running inside the TUI's server
subprocess, but did show up correctly under `opencode run --standalone
--print-logs`. If you're debugging a silent failure in the interactive
TUI specifically, reproduce it with `opencode run --standalone
--print-logs --log-level debug "<prompt>"` instead and read the output
directly.

**Getting two Discord messages for one event, or a stray "permission not
found" on a button click that should have worked?** v2 boots a separate
plugin instance per directory ("location") a client connects from —
confirmed live: one `opencode` invocation can produce both a
project-directory location and a bare-home-directory location, and a
globally-configured plugin gets `setup()` called once per location. This
plugin guards against that with a module-level singleton (only the first
location to load actually connects to Discord), so this shouldn't happen
on a normal install — if it does anyway, it likely means two separate
plugin processes are running (e.g. a leftover background service from
before an update — restart it).

## Developing locally (not installing from npm)

`npm install && npm run build`, then reference this folder directly by
absolute path in `opencode.json`'s `plugin` array instead of a package
name — confirmed to correctly resolve this package's own `node_modules`
via normal Node module resolution, no bundling required.

