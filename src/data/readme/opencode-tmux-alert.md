<div align="center">

# opencode-tmux-alert

**Tmux alert plugin for [OpenCode](https://opencode.ai). Get notified when your AI agent needs attention.**

[![npm](https://img.shields.io/npm/v/opencode-tmux-alert?style=flat&logo=npm)](https://www.npmjs.com/package/opencode-tmux-alert)
[![Licence](https://img.shields.io/github/license/undont/opencode-tmux-alert?style=flat&label=licence)](LICENCE)
[![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-green.svg?style=flat)](https://opencode.ai/v2/docs/cli/plugins/)

[Quick Start](#quick-start) · [How It Works](#how-it-works) · [Events](#events) · [Customisation](#customisation)

</div>

---

## Quick Start

Add the plugin to your CLI settings in `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["opencode-tmux-alert"]
}
```

Restart OpenCode. Requires OpenCode V2.1 or newer.

> **Upgrading from 1.x?** The plugin now runs in the terminal client instead of the OpenCode server. Remove `opencode-tmux-alert` from `plugins` in `opencode.json` and add it to `cli.json` as above. If you don't, alerts land on whichever tmux window started the OpenCode background service.

---

## How It Works

OpenCode V2 runs a shared background server, with one terminal client per window. This plugin runs in each terminal client, so it knows which tmux pane it lives in. It only reacts to the session that terminal is showing, including its subagents and any open tabs. Switching a terminal to another session hands its alerts over too; keep a session open in a tab to stay alerted for it.

When that session needs you (it finishes a turn, asks for permission or asks a question), the plugin runs an alert script. Once nothing is pending, it runs a clear script.

The bundled scripts do two things:

1. **Set a tmux user option** (`@opencode-alert`) on OpenCode's window, which you can reference in your window status formats. It stays on while any OpenCode pane in the window is waiting
2. **Ring the terminal bell**, which triggers tmux's built-in `monitor-bell` notification

They're deliberately minimal. You can replace them with your own (see [Bring your own scripts](#bring-your-own-scripts)).

---

## Events

| Event | Trigger | Action |
|-------|---------|--------|
| `permission.asked` | Agent needs permission to proceed | Alert |
| `form.created` | Agent asks you a question | Alert |
| `session.execution.succeeded` | Turn finished, agent waiting | Alert |
| `session.execution.failed` | Turn failed | Alert |
| `session.execution.interrupted` (inactivity) | Turn stalled | Alert |
| `permission.replied`, `form.replied`, `form.cancelled` | You answered | Clear once nothing else is pending |
| `session.execution.started` | You sent a message | Clear once nothing else is pending |

Subagent completions don't alert; only the main turn finishing does. Turns you interrupt yourself don't alert either.

---

## Customisation

### Window indicator

The bundled scripts set `@opencode-alert` on the window OpenCode runs in. Use it in your **window** status formats, which tmux evaluates for each window in the list:

```bash
# In tmux.conf: colour a window's name while its OpenCode needs attention
setw -g window-status-format '#{?@opencode-alert,#[fg=yellow],}#I:#W'
```

Don't put it in `status-left` / `status-right`. Those are evaluated for the window you're currently looking at, so they would only light up for the one OpenCode you can already see.

### Clear when you look at the window (optional)

With the bundled scripts, an alert stays until you act: answer the prompt or send a message. To clear it as soon as you switch to the window instead, add a tmux hook:

```bash
set-hook -g after-select-window 'set-option -w @opencode-alert 0'
```

The plugin raises the alert again the next time something new needs you. With several OpenCodes in one window, answering one also brings the alert back if another is still waiting.

### Agent state

Besides alerts, the plugin tracks what each OpenCode is doing and records it on its window as `@opencode-state`: `working`, `needs-input` (a permission request or question is open), `idle` or `error` (the last turn failed). The option is removed when OpenCode exits. Show it with a window format, for example a dot in front of each window name:

```bash
setw -g window-status-format '#{?#{==:#{@opencode-state},needs-input},#[fg=yellow]◐ ,#{?#{==:#{@opencode-state},working},#[fg=blue]● ,}}#[default]#I:#W'
```

To feed your own consumer instead (an instance picker, a state file), point the plugin at a script with the `stateScript` option or `OPENCODE_STATE_SCRIPT`. Options take precedence, and a leading `~/` is expanded. To turn state reporting off, set `"stateScript": false`.

```json
{
  "plugins": [
    {
      "package": "opencode-tmux-alert",
      "options": { "stateScript": "~/my-scripts/state.sh" }
    }
  ]
}
```

The state script runs only when the state changes and follows the same contract as the alert scripts (see below). It receives:

| Variable | Value |
|----------|-------|
| `OPENCODE_AGENT_STATE` | `working`, `needs-input`, `idle`, `error`, or `ended` when OpenCode exits |
| `OPENCODE_STATE_EVENT` | The event behind the change, `setup` or `cleanup` |
| `OPENCODE_SESSION_ID` | The root session the state refers to |
| `OPENCODE_DIRECTORY` | That session's directory |

`needs-input` wins while a permission request or question is open. Otherwise the state is `working` during a turn, `error` after a failed turn and `idle` after any other. There's no "stuck" state: OpenCode gives no reliable signal to tell a hang from a long, silent tool run.

### Bring your own scripts

The bundled scripts are a minimal default. To feed your own status bar, notification tool or multi-agent setup, replace them with your own scripts using plugin options in `cli.json`:

```json
{
  "plugins": [
    {
      "package": "opencode-tmux-alert",
      "options": {
        "alertScript": "~/my-scripts/alert.sh",
        "clearScript": "~/my-scripts/clear.sh"
      }
    }
  ]
}
```

Or with environment variables (options take precedence):

```bash
export OPENCODE_ALERT_SCRIPT="$HOME/my-scripts/alert.sh"
export OPENCODE_CLEAR_SCRIPT="$HOME/my-scripts/clear.sh"
```

A leading `~/` in either form is expanded to your home directory.

**The script contract:**

- **When they run:** the alert script runs each time something *new* needs you (a permission request, a question, a finished, failed or stalled turn), even if an alert is already showing. The clear script runs once nothing is pending any more, and when OpenCode exits with an alert still showing. The state script runs whenever the agent state changes (see [Agent state](#agent-state)).
- **Inputs:** no arguments. Scripts inherit the OpenCode process's environment, including `TMUX` and `TMUX_PANE`, the pane OpenCode runs in. Target that pane (e.g. `tmux set-option -w -t "$TMUX_PANE" …`) rather than the current window. The alert script also receives:

| Variable | Value |
|----------|-------|
| `OPENCODE_ALERT_REASON` | `permission`, `question`, `done` or `error` |
| `OPENCODE_SESSION_ID` | The root session that needs attention |

- **Don't read stdin.** The plugin leaves it open, so a script that reads it blocks until the 10-second timeout.
- **Output is ignored.** stdout and stderr are captured, so write a bell to `/dev/tty` rather than stdout. A non-zero exit or a timeout shows one warning toast; later runs carry on.
- **Order:** alert, clear and state runs share one queue, so they never overtake each other.

Custom scripts are also how you get indicators that span tmux sessions. Window formats only cover the current session's window list, so showing "something in another session needs you" in the status bar means scanning windows from a script.

For a full example, [undont/dotfiles](https://github.com/undont/dotfiles) feeds one shared, multi-agent status bar (OpenCode, Claude Code, Codex and Copilot) from scripts like these. See `scripts/hooks/wrappers/opencode-alert.sh` and `docs/AGENT-HOOKS.md` there.

### tmux bell monitoring

To use the bell-based alerts, enable monitoring in your `tmux.conf`:

```bash
set -g monitor-bell on
set -g visual-bell off    # optional, suppress the visual flash
```

---

## Requirements

- [OpenCode](https://opencode.ai) V2.1 or newer
- [tmux](https://github.com/tmux/tmux) 3.2 or newer (the plugin does nothing when OpenCode isn't running inside tmux)

---

## Licence

[MIT](LICENCE)
