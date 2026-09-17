# opencode-signal — opencode over Signal

An [opencode](https://opencode.ai) plugin. Start opencode as usual; while the plugin is enabled:

- **Finished tasks** — when a session finishes, its final reply is posted to a Signal group.
- **Questions** — when the AI uses the `question` tool, the question and its numbered options are posted; your reply answers it.
- **Permissions** — permission requests are posted; reply `y` (once), `a` (always), `n` (deny) or a reason (deny with feedback).
- **Prompts** — anything else you type in the group is sent to opencode as a prompt.

Answering in the terminal still works; the Signal side is told "Answered in opencode".

signal-cli runs as a **linked device on your own Signal account**, and the chat is a Signal group that contains only
you. Because the bridge's messages come from your own account, your phone does not ring for them — the optional
**ntfy** push provides the buzz.

## Install

### 1. Install signal-cli (one-time)

The native build needs no Java; it is a tarball on the [signal-cli releases page](https://github.com/AsamK/signal-cli/releases):

```bash
VER=0.14.8   # use the latest release
mkdir -p ~/.local/opt/signal-cli-${VER}
curl -L "https://github.com/AsamK/signal-cli/releases/download/v${VER}/signal-cli-${VER}-Linux-native.tar.gz" \
  | tar -xzf - -C ~/.local/opt/signal-cli-${VER}
ln -sf ~/.local/opt/signal-cli-${VER}/signal-cli ~/.local/bin/signal-cli
```

(Releases older than about three months may stop working with Signal's servers — see [Keep signal-cli updated](#keep-signal-cli-updated).)

### 2. Link signal-cli to your Signal account

Run this **in a real terminal window** — signal-cli only draws the QR code when it has a console:

```bash
signal-cli link -n opencode
```

On your phone: Signal → Settings → Linked devices → Link new device → scan the QR code.
The command ends with `Associated with: +<your number>`.

### 3. Create the chat group

On your phone: New group → **Skip** (add nobody) → name it **`opencode`** → Create. Send any message in it, e.g. `hi`.

Then let signal-cli pick up the group once:

```bash
signal-cli -a +<your number> receive
signal-cli -a +<your number> listGroups     # should list a group named opencode
```

### 4. (Optional) ntfy for the buzz

Install the ntfy app (Android/iOS) and subscribe to a topic nobody can guess — the topic is effectively a password:

```bash
echo "opencode-$(openssl rand -hex 12)"
```

Only `"<project> — open Signal"` and a title such as "opencode finished" are sent to ntfy; the content stays in Signal.

### 5. Enable the plugin

Add the package to the `plugin` array of your opencode config — global `~/.config/opencode/opencode.jsonc` or a
project `opencode.json` — with your number:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-signal",
      {
        "enabled": true,
        "account": "+<your number>",
        "groupName": "opencode",
        "ntfyTopic": "opencode-<random>"
      }
    ]
  ]
}
```

opencode installs the package from npm at startup (it is cached under `~/.cache/opencode/`) and starts the
`signal-cli daemon` for you. Restart opencode. The group receives `🟢 opencode connected — <project>`.

To turn it off: `"enabled": false` (or remove the entry) and restart opencode.

## Using it

| You send | What happens |
|---|---|
| any text | prompt to the current session (the one you last worked in); 👀 reaction = accepted |
| `/help` | command list |
| `/status` | project, current session, working/idle, how many answers are waiting |
| `/sessions` | recent sessions, numbered |
| `/use N` | switch to session N from `/sessions` |
| `/new [title]` | new session; your next message is its first prompt |
| `/abort` | stop the current task |
| `/skip` | dismiss the waiting question / deny the waiting permission |

While a question or permission request is waiting, your next non-command message answers it:

- question: `2`, or `1,3` for multi-select, or your own text (when the question allows it)
- permission: `y` · `a` · `n` · or a sentence (deny, and the AI sees your sentence as feedback)

Prompts from Signal reuse the agent and model of the session's last prompt.

## Options

| Option | Default | |
|---|---|---|
| `enabled` | `false` | nothing happens unless `true` |
| `account` | — | **required**, your number in `+<country><number>` form |
| `groupName` | `"opencode"` | the group used as the chat |
| `groupId` | from `groupName` | base64 group id, if you prefer to pin it |
| `ntfyTopic` | — | enables the push buzz |
| `ntfyServer` | `https://ntfy.sh` | self-hosted ntfy |
| `notify` | `"always"` | `"signal"` = only post replies to prompts that came from Signal |
| `forwardQuestions` | `true` | |
| `forwardPermissions` | `true` | |
| `maxReplyChars` | `6000` | longer replies are cut; signal-cli sends >2000-byte text as a "read more" attachment |
| `startDaemon` | `true` | start `signal-cli daemon` if it is not running; it is stopped within ~5 s of that opencode exiting, even if opencode is killed |
| `signalCli` | `~/.local/bin/signal-cli`, else `signal-cli` on the PATH | |
| `host` / `port` | `127.0.0.1` / `18351` | where the daemon's HTTP API listens |

## Several opencode windows

Every window posts its own notifications, questions and permission requests (each message starts with the project
name). **Only one window receives your Signal messages** — the first one started. When it closes, another window
takes over within about 15 seconds. `/status` tells you which project is listening.

## Files

- `~/.local/state/opencode-signal-bridge/bridge.log` — what the bridge did
- `~/.local/state/opencode-signal-bridge/signal-cli.log` — the daemon's output (message contents are not logged)
- `~/.local/state/opencode-signal-bridge/inbound.lock` — which opencode receives messages

## Keep signal-cli updated

signal-cli's README: releases older than about three months may stop working with Signal's servers. Update by
downloading the new `signal-cli-<version>-Linux-native.tar.gz` from
https://github.com/AsamK/signal-cli/releases into `~/.local/opt/signal-cli-<version>/` and re-pointing
`~/.local/bin/signal-cli`.

## Troubleshooting

- **Nothing arrives in Signal** — read `bridge.log`. `no Signal group named "opencode"` means step 3 did not sync yet:
  send a message in the group; the bridge also learns the group from the first message you send.
- **`signal-cli daemon is not reachable`** — read `signal-cli.log`. Check that `signal-cli -a +<number> receive` works
  on its own.
- **Your messages are ignored** — they must be sent in the `opencode` group from your own account (phone or Signal
  Desktop). Messages from anyone else, and Note to Self, are ignored.

## Development

```bash
git clone https://github.com/AhmedMoharam/signal-bridge.git opencode-signal
cd opencode-signal
npm install
npm run typecheck
```

To use a local checkout instead of the npm package, point the `plugin` entry at the file:

```jsonc
["/path/to/opencode-signal/signal-bridge.ts", { "enabled": true, "account": "+<your number>" }]
```
