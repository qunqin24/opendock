# Tmux Agents Status

Show coding-agent activity in the tmux status bar, including active turns and unread results in other panes, windows or sessions.

- `•` working
- `?` waiting for input
- `✓` finished
- `!` failed or cancelled
- Unread results stay highlighted until you visit their pane

![Tmux status bar showing agent activity](assets/tmux-agents-status.png)

You can also [customize](#customize) the displayed glyphs. No background daemon is required. Agent adapters report lifecycle events to the tmux plugin only when state changes.

## Requirements

- tmux 3.1 or newer on Linux or macOS
- At least one supported agent, running directly inside a tmux pane:
  - [Pi](https://github.com/badlogic/pi-mono) 0.81.1+
  - [OpenCode](https://opencode.ai) 1.15.11+
  - [Claude Code](https://code.claude.com) 2.1.79+
  - [Codex](https://developers.openai.com/codex) 0.145.0+

## Install

Install the tmux plugin and the adapter for each agent you use.

### 1. Configure tmux

#### Install with TPM

Add this before TPM's `run` line in `~/.tmux.conf`:

```tmux
set -g @plugin 'hiback/tmux-agents-status'
```

Reload tmux, then press `prefix` + `I`.

#### Install without TPM

```sh
git clone https://github.com/hiback/tmux-agents-status.git "$HOME/.tmux/plugins/tmux-agents-status"
```

Add this to `~/.tmux.conf`:

```tmux
run-shell ~/.tmux/plugins/tmux-agents-status/tmux-agents-status.tmux
```

#### Add the status fragments

Loading the plugin does not change your status bar. Keep your existing formats and add these fragments once:

- Insert `#{E:@tmux-agents-status-window}` where you want agent glyphs in both `window-status-format` and `window-status-current-format`.
- Insert `#{E:@tmux-agents-status-other-sessions}` anywhere in `status-right`.

For example:

```tmux
set -g window-status-format '#I:#W#{E:@tmux-agents-status-window}'
set -g window-status-current-format '#I:#W#{E:@tmux-agents-status-window}'
set -g status-right '#{E:@tmux-agents-status-other-sessions}#S %H:%M'
```

Each nonempty fragment inherits the foreground, background, and text attributes
active at its insertion point, then restores them for following text. A style
configured below acts as a partial overlay, so an `fg`-only state style keeps the
enclosing background and attributes.

To select tmux's default style instead of the enclosing inline style, put
`#[default]` immediately before the fragment:

```tmux
set -g status-right '#[default]#{E:@tmux-agents-status-other-sessions}#S %H:%M'
```

Apply the configuration:

```sh
tmux source-file "$HOME/.tmux.conf"
```

### 2. Install your agent adapter

<details>
<summary><strong>Pi</strong></summary>

Install the published npm package:

```sh
pi install npm:tmux-agents-status-pi
```

Enter `/reload` in Pi or restart it.

```sh
# Update
pi update --extensions

# Uninstall
pi remove npm:tmux-agents-status-pi
```

</details>

<details>
<summary><strong>OpenCode</strong></summary>

Install the published npm package globally:

```sh
opencode plugin --global tmux-agents-status-opencode
```

Restart OpenCode after installation or update.

```sh
# Update
opencode plugin --global --force tmux-agents-status-opencode
```

OpenCode currently has no plugin removal command. To uninstall, remove only `tmux-agents-status-opencode` from the `plugin` array in your global `opencode.json` or `opencode.jsonc`.

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```sh
claude plugin marketplace add hiback/tmux-agents-status
claude plugin install tmux-agents-status@tmux-agents-status --scope user
```

Restart Claude Code after installation.

```sh
# Update
claude plugin update tmux-agents-status@tmux-agents-status --scope user

# Uninstall
claude plugin uninstall tmux-agents-status@tmux-agents-status --scope user
```

</details>

<details>
<summary><strong>Codex</strong></summary>

```sh
codex plugin marketplace add hiback/tmux-agents-status
codex plugin add tmux-agents-status@tmux-agents-status
```

Start Codex inside tmux and approve its hook review. You can also use `/hooks` to review and trust the exact `tmux-agents-status` hook. The adapter remains inactive until trusted.

```sh
# Update
codex plugin marketplace upgrade tmux-agents-status
codex plugin add tmux-agents-status@tmux-agents-status

# Uninstall
codex plugin remove tmux-agents-status@tmux-agents-status
```

</details>

Adapters run as your user. Install them only from sources you trust.

## Customize

Set options in `~/.tmux.conf` before the TPM `run` line or manual `run-shell` line:

```tmux
set -g @tmux-agents-status-running-glyph 'RUN'
set -g @tmux-agents-status-running-style 'fg=blue,bold'
set -g @tmux-agents-status-unread-style 'reverse,bold'
```

| Option | Default | Purpose |
| --- | --- | --- |
| `@tmux-agents-status-running-glyph` | `•` | Working |
| `@tmux-agents-status-running-style` | `fg=cyan` | Working style |
| `@tmux-agents-status-waiting-glyph` | `?` | Waiting |
| `@tmux-agents-status-waiting-style` | `fg=yellow` | Waiting style |
| `@tmux-agents-status-completed-glyph` | `✓` | Finished |
| `@tmux-agents-status-completed-style` | `fg=green` | Finished style |
| `@tmux-agents-status-failed-glyph` | `!` | Failed |
| `@tmux-agents-status-failed-style` | `fg=red` | Failed style |
| `@tmux-agents-status-unread-style` | `reverse,bold` | Unread-result style |

Set a glyph to an empty string to hide that state. Styles are literal,
single-line tmux 3.1 visual style lists without `#[...]`. Commas and ASCII spaces
separate terms. The accepted terms are:

- `default`, `none`, `fg=<colour>`, and `bg=<colour>`;
- `bright`, `bold`, `dim`, `underscore`, `blink`, `reverse`, `hidden`,
  `italics`, `strikethrough`, `overline`, `double-underscore`,
  `curly-underscore`, `dotted-underscore`, and `dashed-underscore`, plus each
  attribute's `no`-prefixed form such as `nobold`;
- tmux 3.1 literal colours: the eight named and eight bright named colours,
  aliases `0`–`7` and `90`–`97`, `colour0`–`colour255`, `default`, `terminal`,
  and six-digit `#RRGGBB` values.

Names are case-insensitive. Unknown terms and layout or default-scope controls
are ignored token by token. A style containing `#{...}`, `#(...)`, a short
format alias such as `#S`, or nested `#[...]` syntax is ignored in full.
Filtering affects rendering only and never rewrites the stored option.

## Behavior

The window fragment shows tracked agents in the current window. The other-session fragment shows active turns and unread results from other tmux sessions. Closing a pane clears its status.

| Agent | Working | Waiting | Finished | Failed |
| --- | --- | --- | --- | --- |
| Pi | yes | — | yes | yes |
| OpenCode | yes | yes | yes | yes |
| Claude Code | yes | yes | yes | API errors only |
| Codex | yes | approvals only | yes | — |

Unsupported states are not guessed. Adapters exchange lifecycle identifiers only; they do not inspect or store prompts, responses, transcripts, model text, tool arguments, or pane content.

## Update or uninstall the tmux plugin

With TPM, press `prefix` + `U` to update. For a manual installation:

```sh
git -C "$HOME/.tmux/plugins/tmux-agents-status" pull
tmux source-file "$HOME/.tmux.conf"
```

Before uninstalling, clean up plugin-owned tmux state:

```sh
~/.tmux/plugins/tmux-agents-status/scripts/uninstall
```

Then remove the printed configuration entries and uninstall through TPM or delete the clone. Agent adapters must be removed separately.

## Troubleshooting

If no status appears:

1. Confirm the tmux plugin and your agent adapter are both installed.
2. Confirm both fragment strings appear in `~/.tmux.conf` exactly once.
3. Run `tmux source-file "$HOME/.tmux.conf"`.
4. Reload or restart the agent. For Codex, also trust the hook in `/hooks`.
5. Start a turn inside tmux and allow about one second for the first update.

Adapters stay inactive outside tmux, when the core is missing or incompatible, and in Pi print, JSON, or RPC modes.

## Limitations

- One directly running main agent per pane is supported; subagents and background work do not own panes.
- The agent and tmux must run on the same host.
- Some agents do not expose every lifecycle state shown above.
- Nested tmux, SSH aggregation, and Windows are not supported.
- tmux 3.0 and older are unsupported; load, runtime, cleanup, and uninstall
  behavior on those versions is outside the compatibility contract.
- tmux has only one pushed-default slot, not a nestable style stack. If an
  enclosing format uses a later `default`, `push-default`, or `pop-default`, put
  the fragment at the end of that scope or explicitly reapply the desired style
  afterward.
